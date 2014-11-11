﻿/*
 * SPEasyForms.configManager - Object that encapsulates getting, setting, and saving the SPEasyForms
 * configuration file for the current list.
 *
 * @requires jQuery v1.11.1 
 * @copyright 2014 Joe McShea
 * @license under the MIT license:
 *    http://www.opensource.org/licenses/mit-license.php
 */
/* global spefjQuery */
(function ($, undefined) {

    var defaultFormContainer = $.spEasyForms.defaultFormContainer;

    ////////////////////////////////////////////////////////////////////////////
    // Object that encapsulates getting, setting, and saving the SPEasyForms
    // configuration file for the current list.
    ////////////////////////////////////////////////////////////////////////////
    $.spEasyForms.configManager = {
        undoBuffer: [],

        redoBuffer: [],

        /*********************************************************************
         * Get the configuration file for the current list.
         *
         * @param {object} options - {
         *     // see the definition of defaults for options
         * }
         *
         * @return {object} - the configuration object, in the form:
         *
         * {
         *     "layout": { // configuration of containers
         *         "def": [ // the default layout, later there will be other
         *             // layouts for other content types the default form
         *          // container has any fields not placed on another container,
         *             // this is not necessarily the first container
         *             {
         *                 "containerType": "DefaultForm",
         *                 "index": "d"
         *             },
         *             // each additional property is another container
         *             {
         *                 // the type is used to find the implementation
         *                 "containerType": "Tabs",
         *                 // this is an immutable index that is set at the time the container
         *                 // was added to the configuration, and is used to find it as things
         *                 // are moved around through drag and drop, the actual value is
         *                 // not important, just that it is unique
         *                 "index": "1",
         *                 // technically, the rest of the container configuration is implementation
         *                 // specific, but all of the built-in container implemenations have an
         *                 // array of field collections; for tabs, one field collection equals one tab, for
         *                 // accordion one content area, etc.
         *                 "fieldCollections": [
         *                     {
         *                         // the name of the field collection, how theis is used is container
         *                         // specific; for tabs this is the tab header, for columns this
         *                         // isn't used at all when transforming the form, only in the
         *                         // editor
         *                         "name": "one",
         *                         // an array of field internal names
         *                         "fields": [
         *                             {
         *                                 "fieldInternalName": "FirstName"
         *                             },
         *                             {
         *                                 "fieldInternalName": "FullName"
         *                             }
         *                         ]
         *                     },
         *                     {
         *                         "name": "two",
         *                         "fields": [
         *                             {
         *                                 "fieldInternalName": "Email"
         *                             },
         *                             {
         *                                 "fieldInternalName": "Company"
         *                             }
         *                         ]
         *                     }
         *                 ]
         *             },
         *             {
         *                 "containerType": "Columns",
         *                 "index": "2",
         *                 "fieldCollections": [
         *                     {
         *                         "name": "1",
         *                         "fields": [
         *                             {
         *                                 "fieldInternalName": "JobTitle"
         *                             },
         *                             {
         *                                 "fieldInternalName": "WorkPhone"
         *                             }
         *                         ]
         *                     },
         *                     {
         *                         "name": "2",
         *                         "fields": [
         *                             {
         *                                 "fieldInternalName": "HomePhone"
         *                             },
         *                             {
         *                                 "fieldInternalName": "CellPhone"
         *                             }
         *                         ]
         *                     }
         *                 ]
         *             }
         *         ]
         *     },
         *     "visibility": { the conditional visibility rules
         *         "def": { // the default rule set, again, there could be
         *             // multiples in the future for multiple content types
         *             // the field internal name is the key to an array of
         *             // rules, the first rule that matches
         *             // the current user is the only one executed
         *             "FirstName": [
         *                 {
         *                     // Hidden, ReadOnly, or Editable; Editable really
         *                     // does nothing to the form, but stops processing
         *                     "state": "Editable",
         *                     // rules can be written for specific forms,
         *                     // the default is all forms
         *                     "forms": "New;Edit;Display",
         *                     // rules can be applied to specific SharePoint
         *                     // groups and/or the original author of the
         *                     // current item, the default is applies to everyone
         *                     "appliesTo": "Joe McShea - Dev Site Members"
         *                 },
         *                 {
         *                     "state": "ReadOnly",
         *                     "forms": "New;Edit;Display",
         *                     "appliesTo": "Joe McShea - Dev Site Visitors"
         *                 },
         *                 {
         *                     "state": "Hidden",
         *                     "forms": "New;Edit;Display",
         *                     "appliesTo": ""
         *                 }
         *             ],
         *             "Email": [
         *                 {
         *                     "state": "Editable",
         *                     "forms": "New;Edit;Display",
         *                     "appliesTo": "Joe McShea - Dev Site Members"
         *                 },
         *                 {
         *                     "state": "ReadOnly",
         *                     "forms": "New;Edit;Display",
         *                     "appliesTo": "Joe McShea - Dev Site Visitors"
         *                 },
         *                 {
         *                     "state": "Hidden",
         *                     "forms": "New;Edit;Display",
         *                     "appliesTo": ""
         *                 }
         *             ]
         *         }
         *     }
         * }
         *********************************************************************/
        get: function (options) {
            var opt = $.extend({}, $.spEasyForms.defaults, options);
            var currentConfig;
            if ($("#spEasyFormsJson pre").text().length > 0) {
                currentConfig = $.spEasyForms.utilities.parseJSON($("#spEasyFormsJson pre").text());
            } else {
                currentConfig = $.spEasyForms.sharePointContext.getConfig(opt);
                $("#spEasyFormsJson pre").text(JSON.stringify(currentConfig, null, 4));
            }
            if (currentConfig === undefined) {
                $("#spEasyFormsExportButton img").addClass("speasyforms-buttonimgdisabled");
                $("#spEasyFormsExportButton div").addClass("speasyforms-buttontextdisabled");
                currentConfig = {
                    layout: {
                        def: [{
                            "containerType": defaultFormContainer.containerType
                        }]
                    },
                    visibility: {
                        def: {}
                    },
                    adapters: {
                        def: {}
                    }
                };
                $("#spEasyFormsJson pre").text(JSON.stringify(currentConfig, null, 4));
            }
            options.layout = currentConfig.layout.def;
            $.each(options.layout, function (idx, container) {
                if (container.fieldGroups) {
                    container.fieldCollections = container.fieldGroups;
                    delete container.fieldGroups;
                }
            });
            return currentConfig;
        },

        /*********************************************************************
         * Set the current configuration.  This stores it in a control on the
         * page, it does not write it back to the server.  Use save to write it
         * back to the server. The save button is also enabled by this function.
         *
         * @param {object} options - {
         *     config: {object}  // the configuration object to be set
         * }
         *********************************************************************/
        set: function (options) {
            var opt = $.extend({}, $.spEasyForms.defaults, options);
            opt.currentConfig.version = "2014.01.p";
            var newConfig = JSON.stringify(opt.currentConfig, null, 4);
            var oldConfig = $("#spEasyFormsJson pre").text();
            if (newConfig !== oldConfig) {
                $("#spEasyFormsJson pre").text(newConfig);
                $("#spEasyFormsSaveButton img").removeClass("speasyforms-buttonimgdisabled");
                $("#spEasyFormsSaveButton div").removeClass("speasyforms-buttontextdisabled");
                $("#spEasyFormsExportButton img").addClass("speasyforms-buttonimgdisabled");
                $("#spEasyFormsExportButton div").addClass("speasyforms-buttontextdisabled");
                $("#spEasyFormsImportButton img").addClass("speasyforms-buttonimgdisabled");
                $("#spEasyFormsImportButton div").addClass("speasyforms-buttontextdisabled");
                this.undoBuffer.push(oldConfig);
                $("#spEasyFormsUndoButton img").removeClass("speasyforms-buttonimgdisabled");
                $("#spEasyFormsUndoButton").removeClass("speasyforms-buttontextdisabled");
            }
        },

        /*********************************************************************
         * Write the configuration back to a file in the SiteAssets library. The
         * save button is also disabled by this function, since there are no
         * changes to be saved.
         *
         * @param {object} options - {
         *     // see the definition of defaults for options
         * }
         *********************************************************************/
        save: function (options) {
            var opt = $.extend({}, $.spEasyForms.defaults, options);
            var listId = $.spEasyForms.sharePointContext.getCurrentListId(opt);
            $.ajax({
                url: $.spEasyForms.utilities.webRelativePathAsAbsolutePath("/SiteAssets") +
                    "/spef-layout-" +
                    listId.replace("{", "").replace("}", "") + ".txt",
                type: "PUT",
                headers: {
                    "Content-Type": "text/plain",
                    "Overwrite": "T"
                },
                data: $("#spEasyFormsJson pre").text(),
                success: function () {
                    opt.listId = listId;
                    opt.currentConfig = $.spEasyForms.utilities.parseJSON($("#spEasyFormsJson pre").text());
                    $.spEasyForms.sharePointContext.setConfig(opt);
                    $("#spEasyFormsSaveButton img").addClass("speasyforms-buttonimgdisabled");
                    $("#spEasyFormsSaveButton div").addClass("speasyforms-buttontextdisabled");
                    $("#spEasyFormsExportButton img").removeClass("speasyforms-buttonimgdisabled");
                    $("#spEasyFormsExportButton div").removeClass("speasyforms-buttontextdisabled");
                    $("#spEasyFormsImportButton img").removeClass("speasyforms-buttonimgdisabled");
                    $("#spEasyFormsImportButton div").removeClass("speasyforms-buttontextdisabled");
                },
                error: function (xhr, ajaxOptions, thrownError) {
                    if (opt.verbose) {
                        if (xhr.status === 409) {
                            alert("The web service returned 409 - CONFLICT. " +
                                "This most likely means you do not have a 'Site Assets' " +
                                "library in the current site with a URL of SiteAssets. " +
                                "This is required before you can load and save " +
                                "SPEasyForms configuration files.");
                        } else {
                            alert("Error uploading configuration.\nStatus: " + xhr.status +
                                "\nStatus Text: " + thrownError);
                        }
                    }
                }
            });
        }
    };

})(spefjQuery);
