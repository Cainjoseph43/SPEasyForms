﻿/*
 * SPEasyForms.visibilityRuleCollection - object to hold and manage all field visibility rules.
 *
 * @requires jQuery v1.11.1 
 * @copyright 2014 Joe McShea
 * @license under the MIT license:
 *    http://www.opensource.org/licenses/mit-license.php
 */
/* global spefjQuery */
(function ($, undefined) {

    ////////////////////////////////////////////////////////////////////////////
    // Enforcer of field visibility rules.
    ////////////////////////////////////////////////////////////////////////////
    $.spEasyForms.visibilityRuleCollection = {
        initialized: false,

        comparisonOperators: {
            equals: function (value, test) {
                return (value.toLowerCase() === test.toLowerCase());
            },
            matches: function (value, test) {
                var regex = new RegExp(test, "i");
                return regex.test(value);
            },
            notMatches: function (value, test) {
                var regex = new RegExp(test, "i");
                return !regex.test(value);
            }
        },

        stateHandlers: {
            hidden: function (options) {
                var opt = $.extend({}, $.spEasyForms.defaults, options);
                var row = opt.row;
                if (row.row.attr("data-visibilityhidden") !== "true") {
                    row.row.attr("data-visibilityhidden", "true").hide();
                }
            },
            readOnly: function (options) {
                var opt = $.extend({}, $.spEasyForms.defaults, options);
                var row = opt.row;
                var formType = visibilityRuleCollection.getFormType(opt);
                if (formType !== "display") {
                    var value = $.spEasyForms.sharePointFieldRows.value(opt);
                    if (!value) {
                        if (!opt.noRecurse) {
                            setTimeout(function () {
                                var o = $.extend({}, $.spEasyForms.defauts, opt);
                                o.row = row;
                                var v = $.spEasyForms.sharePointFieldRows.value(o);
                                $("#readOnly" + row.internalName).html(v);
                                opt.noRecurse = true;
                                visibilityRuleCollection.transform(opt);
                            }, 1000);
                        }
                        value = "&nbsp;";
                    }
                    var html = '<tr data-visibilityadded="true">' +
                        '<td valign="top" width="350px" ' +
                        'class="ms-formlabel">' +
                        '<h3 class="ms-standardheader"><nobr>' +
                        row.displayName +
                        '</nobr></h3></td><td class="ms-formbody">' +
                        '<span id="readOnly' + row.internalName + '" ">' + value + '</td></tr>';
                    if (row.row.find("td.ms-formbody h3.ms-standardheader").length > 0) {
                        html = '<tr data-visibilityadded="true">' +
                            '<td valign="top" ' +
                            'width="350px" class="ms-formbody">' +
                            '<h3 class="ms-standardheader"><nobr>' +
                            row.displayName + '</nobr></h3>' +
                            value + '</td></tr>';
                    }
                    if (row.row.attr("data-visibilityhidden") !== "true") {
                        row.row.attr("data-visibilityhidden", "true").hide();
                    }
                    if (row.row.next().attr("data-visibilityadded") !== "true") {
                        row.row.after(html);
                    }
                }
            },
            editable: function () { /*do nothing*/ }
        },

        siteGroups: [],

        scrubCollection: function (collection) {
            collection.each(function (idx, current) {
                if ($(current).attr("data-visibilityadded") === "true") {
                    $(current).remove();
                }
                else {
                    if ($(current).next().attr("data-visibilityadded") === "true") {
                        $(current).next().remove();
                    }
                    if ($(current).attr("data-visibilityhidden") === "true") {
                        $(current).attr("data-visibilityhidden", "false").show();
                    }
                    if ($(current).attr("data-visibilityclassadded")) {
                        $(current).removeClass($(current).attr("data-visibilityclassadded"));
                        $(current).attr("data-visibilityclassadded", "");
                    }
                    $(current).find("[data-visibilityadded='true']").remove();
                    $(current).find("[data-visibilityhidden='true']").attr("data-visibilityhidden", "false").show();
                    $(current).find("[data-visibilityclassadded!=''][data-visibilityclassadded]").each(function () {
                        var klass = $(this).attr("data-visibilityclassadded");
                        $(this).removeClass(klass).attr("data-visibilityclassadded", "");
                    });
                }
            });
        },

        /*********************************************************************
         * Transform the current form by hiding fields or makin them read-only
         * as required by the current configuration and the group membership
         * of the current user.
         *
         * @param {object} options - {
         *     config: {object}
         * }
         *********************************************************************/
        transform: function (options) {
            var opt = $.extend({}, $.spEasyForms.defaults, options);
            if (opt.currentConfig && opt.currentConfig.visibility && opt.currentConfig.visibility.def &&
                Object.keys(opt.currentConfig.visibility.def).length > 0) {
                $.each($.spEasyForms.containerCollection.rows, function (idx, row) {
                    opt.row = row;
                    if (row.internalName in opt.currentConfig.visibility.def) {
                        var ruleHandled = false;
                        $.each(opt.currentConfig.visibility.def[row.internalName], function (index, rule) {
                            opt.rule = rule;
                            if (!ruleHandled) {
                                var formMatch = visibilityRuleCollection.checkForm(opt);
                                var appliesMatch = visibilityRuleCollection.checkAppliesTo(opt);
                                var conditionalMatch = visibilityRuleCollection.checkConditionals(opt);
                                if (formMatch && appliesMatch && conditionalMatch) {
                                    var stateHandler = $.spEasyForms.utilities.jsCase(rule.state);
                                    if (stateHandler in visibilityRuleCollection.stateHandlers) {
                                        visibilityRuleCollection.scrubCollection(opt.row.row);
                                        visibilityRuleCollection.stateHandlers[stateHandler](opt);
                                        ruleHandled = true;
                                    }
                                }
                            }
                            if (rule.conditions) {
                                $.each(rule.conditions, function (idx, condition) {
                                    var tr = $.spEasyForms.containerCollection.rows[condition.name];
                                    if (tr === undefined) {
                                        tr = {
                                            displayName: condition.name,
                                            internalName: condition.name,
                                            spFieldType: condition.name,
                                            value: "",
                                            row: $("<tr><td class='ms-formlabel'><h3 class='ms-standardheader'></h3></td><td class='ms-formbody'></td></tr>"),
                                            fieldMissing: true
                                        };
                                    }
                                    if (!tr.fieldMissing && tr.row.attr("data-visibilitychangelistener") !== "true") {
                                        tr.row.find("input").change(function () {
                                            visibilityRuleCollection.transform(opt);
                                            $.spEasyForms.adapterCollection.transform(opt);
                                        });
                                        tr.row.find("select").change(function () {
                                            visibilityRuleCollection.transform(opt);
                                            $.spEasyForms.adapterCollection.transform(opt);
                                        });
                                        tr.row.find("textarea").change(function () {
                                            visibilityRuleCollection.transform(opt);
                                            $.spEasyForms.adapterCollection.transform(opt);
                                        });
                                        tr.row.attr("data-visibilitychangelistener", "true");
                                    }
                                });
                            }
                        });
                        if (!ruleHandled) {
                            visibilityRuleCollection.scrubCollection(opt.row.row);
                        }
                    }
                });
            }
        },

        /*********************************************************************
         * Convert the conditional visibility rules for the current config into
         * an editor.
         *
         * @param {object} options - {
         *     // see the definition of defaults for options
         * }
         *********************************************************************/
        toEditor: function (options) {
            var opt = $.extend({}, $.spEasyForms.defaults, options);
            if (!this.initialized) {
                this.wireDialogEvents(opt);
            }
            this.wireButtonEvents(opt);
            this.drawRuleTableTab(opt);
            this.initialized = true;

            if (!opt.verbose) {
                $("#staticVisibilityRules .speasyforms-fieldmissing").hide();
            }

            if ($("#staticVisibilityRules .speasyforms-fieldmissing").length > 0 && opt.verbose) {
                $("#visibilityTab").addClass("speasyforms-fieldmissing");
            }
            else {
                $("#visibilityTab").removeClass("speasyforms-fieldmissing");
            }
        },

        /*********************************************************************
         * Convert the editor back into a set of conditional visibility rules.
         *
         * @param {object} options - {
         *     // see the definition of defaults for options
         * }
         *********************************************************************/
        toConfig: function (options) {
            var opt = $.extend({}, $.spEasyForms.defaults, options);
            var rules = [];
            var fieldName = $("#conditionalVisibilityField").val();
            $("#conditionalVisibilityRules tr:not(:first)").each(function (idx, tr) {
                var tds = $(tr).find("td");
                var appliesTo = tds[1].innerHTML !== "Everyone" ? tds[1].innerHTML : "";
                var rule = {
                    state: tds[0].innerHTML,
                    appliesTo: appliesTo,
                    forms: tds[2].innerHTML,
                    conditions: []
                };
                $.each($(tds[3]).find("div.speasyforms-conditiondisplay"), function (idx, div) {
                    var conditionArray = $(div).text().split(";");
                    if (conditionArray.length === 3) {
                        var condition = {
                            name: conditionArray[0],
                            type: conditionArray[1],
                            value: conditionArray[2]
                        };
                        if (condition.name && condition.value) {
                            rule.conditions.push(condition);
                        }
                    }
                });
                rules.push(rule);
            });
            var config = $.spEasyForms.configManager.get(opt);
            config.visibility.def[fieldName] = rules;
            return config;
        },

        launchDialog: function (options) {
            var opt = $.extend({}, $.spEasyForms.defaults, options);
            var displayName = opt.fieldName;
            if (opt.fieldName in opt.currentListContext.fields) {
                displayName = opt.currentListContext.fields[opt.fieldName].displayName;
            }
            $("#conditionalVisibilityField").val(opt.fieldName);
            $('#conditionalVisibilityDialogHeader').text(
                "Rules for Column '" + displayName +
                "'");
            $("#conditonalVisibilityRulesDialog").dialog('open');
            opt.currentConfig.visibility = visibilityRuleCollection.getVisibility(opt);
            opt.stat = false;
            visibilityRuleCollection.drawRuleTable(opt);
        },

        /*********************************************************************
         * Draw a set of rules for a single field as a table. This function draws
         * the rules table for the conditional visibility dialog as well as all
         * the rule tables on the conditional visibility tab of the main editor.
         *
         * @param {object} options - {
         *     // see the definition of defaults for options
         * }
         *********************************************************************/
        drawRuleTable: function (options) {
            var opt = $.extend({}, $.spEasyForms.defaults, options);
            if (opt.currentConfig.visibility.def[opt.fieldName].length === 0) {
                $("#conditionalVisibilityRules").html(
                    "There are currently no rules for this field. Click " +
                    "the plus sign to add one.");
            } else {
                var klass = 'speasyforms-sortablerules';
                var id = 'conditionalVisibilityRulesTable';
                var table = "<center>";
                table += "<table id='" + id + "' " +
                    "class='" + klass + "'><tbody class='" + klass + "'><tr>" +
                    "<th class='" + klass + "'>State</th>" +
                    "<th class='" + klass + "'>Applies To</th>" +
                    "<th class='" + klass + "'>On Forms</th>" +
                    "<th class='" + klass + "'>And When</th></tr>";
                var conditionalFieldsMissing = [];
                $.each(opt.currentConfig.visibility.def[opt.fieldName], function (idx, rule) {
                    var conditions = "";
                    if (rule.conditions) {
                        $.each(rule.conditions, function (i, condition) {
                            conditions += "<div class='speasyforms-conditiondisplay'>" +
                                condition.name + ";" + condition.type + ";" +
                                condition.value + "</div>";
                            if (!$.spEasyForms.containerCollection.rows[condition.name] || $.spEasyForms.containerCollection.rows[condition.name].fieldMissing) {
                                conditionalFieldsMissing.push(condition.name);
                            }
                        });
                    } else {
                        conditions = "&nbsp;";
                    }
                    table += "<tr class='" + klass + "'>" +
                        "<td class='" + klass + "'>" + rule.state +
                        "</td>" +
                        "<td class='" + klass + "'>" +
                        (rule.appliesTo.length > 0 ? rule.appliesTo : "Everyone") +
                        "</td>" +
                        "<td class='" + klass + "'>" + rule.forms + "</td>" +
                        "<td class='" + klass + "'>" + conditions + "</td>";
                    table += "<td class='speasyforms-visibilityrulebutton'>" +
                        "<button id='addVisililityRuleButton" + idx +
                        "' >Edit Rule</button></td>" +
                        "<td class='speasyforms-visibilityrulebutton'>" +
                        "<button id='delVisililityRuleButton" + idx +
                        "' >Delete Rule</button></td>";
                    table += "</tr>";
                });
                table += "</tbody></table>";
                $("#conditionalVisibilityRules").html(table + "</center>");
                this.wireVisibilityRulesTable(opt);
            }
        },

        drawRuleTableTab: function (options) {
            var opt = $.extend({}, $.spEasyForms.defaults, options);
            $("#staticVisibilityRules").remove();
            var klass = 'speasyforms-staticrules';
            var table = "<table id='staticVisibilityRules' " +
                "class='" + klass + "'><tbody class='" + klass + "'><tr>" +
                "<th class='" + klass + "'>Display Name</th>" +
                "<th class='" + klass + " speasyforms-hidden' style='display:none'>Internal Name</th>" +
                "<th class='" + klass + "'>State</th>" +
                "<th class='" + klass + "'>Applies To</th>" +
                "<th class='" + klass + "'>On Forms</th>" +
                "<th class='" + klass + "'>And When</th></tr>";
            $.each(Object.keys(opt.currentConfig.visibility.def).sort(), function (idx, key) {
                $.each(opt.currentConfig.visibility.def[key], function (i, rule) {
                    var title = "";
                    klass = 'speasyforms-staticrules';
                    opt.index = idx;
                    opt.fieldName = key;
                    opt.fieldMissing = false;
                    if ($.spEasyForms.containerCollection.rows[key]) {
                        opt.displayName = $.spEasyForms.containerCollection.rows[key].displayName;
                    }
                    else {
                        opt.displayName = opt.fieldName;
                        $.spEasyForms.containerCollection.rows[key] = {
                            displayName: opt.fieldName,
                            internalName: opt.fieldName,
                            spFieldType: opt.fieldName,
                            value: "",
                            row: $("<tr><td class='ms-formlabel'><h3 class='ms-standardheader'></h3></td><td class='ms-formbody'></td></tr>"),
                            fieldMissing: true
                        };
                    }
                    if ($.spEasyForms.containerCollection.rows[key].fieldMissing) {
                        klass += ' speasyforms-fieldmissing';
                    }
                    var conditions = "";
                    var conditionalFieldsMissing = [];
                    if (rule.conditions && rule.conditions.length > 0) {
                        $.each(rule.conditions, function (i, condition) {
                            if (conditions.length > 0)
                                conditions += "<br />";
                            conditions += condition.name + ";" + condition.type +
                                ";" + condition.value;
                            if (!$.spEasyForms.containerCollection.rows[condition.name] || $.spEasyForms.containerCollection.rows[condition.name].fieldMissing) {
                                conditionalFieldsMissing.push(condition.name);
                                if (klass.indexOf('speasyforms-fieldmissing') < 0) {
                                    klass += ' speasyforms-fieldmissing';
                                }
                            }
                        });
                    }
                    if (conditionalFieldsMissing.length > 0) {
                        if (conditionalFieldsMissing.length === 1) {
                            title += 'This rule has conditions which use the field [' + conditionalFieldsMissing[0] +
                                '], which was not found in the form and may have been deleted.';
                        }
                        else {
                            title += 'This rule has conditions which use the fields [' + conditionalFieldsMissing.toString() +
                                '], which were not found in the form and may have been deleted.';
                        }
                    }
                    if ($.spEasyForms.containerCollection.rows[opt.fieldName].fieldMissing) {
                        title = 'This field was not found in the form and may have been deleted. ';
                    }
                    table += "<tr id='visibilityRule" + opt.index + "' title='" + title + "'" +
                        "class='" + klass + "' data-dialogtype='visibility' " +
                        "data-fieldname='" + opt.fieldName + "'>";
                    table += "<td title='" + title + "' class='" + klass + " speasyforms-dblclickdialog'>" + opt.displayName + "</td>";
                    table += "<td title='" + title + "' class='" + klass + " speasyforms-dblclickdialog speasyforms-hidden' style='display:none'>" + opt.fieldName + "</td>";
                    table += "<td title='" + title + "' class='" + klass + " speasyforms-dblclickdialog'>" + rule.state + "</td>";
                    table += "<td title='" + title + "' class='" + klass + " speasyforms-dblclickdialog'>" +
                        (rule.appliesTo.length > 0 ? rule.appliesTo : "Everyone") + "</td>";
                    table += "<td title='" + title + "' class='" + klass + " speasyforms-dblclickdialog'>" + rule.forms + "</td>";
                    table += "<td title='" + title + "' class='" + klass + " speasyforms-dblclickdialog'>" + conditions + "</td>";
                    table += "</tr>";
                });
            });
            table += "</table>";
            $("#tabs-min-visibility").append(table);
            if ($("tr.speasyforms-staticrules").length === 0) {
                $("#staticVisibilityRules").append("<td class='" +
                    klass +
                    "' colspan='5'>There are no conditional visibility rules for the current form.</td>");
            }
        },

        /*********************************************************************
         * Wire up the buttons for a rules table (only applicable to the conditional
         * visibility dialog since the rules tables on the main editor are static)
         *
         * @param {object} options - {
         *     // see the definition of defaults for options
         * }
         *********************************************************************/
        wireVisibilityRulesTable: function (options) {
            var opt = $.extend({}, $.spEasyForms.defaults, options);
            $("[id^='delVisililityRuleButton']").button({
                icons: {
                    primary: "ui-icon-closethick"
                },
                text: false
            }).click(function () {
                opt.index = this.id.replace("delVisililityRuleButton", "");
                opt.fieldName = $("#conditionalVisibilityField").val();
                opt.currentConfig = $.spEasyForms.configManager.get(opt);
                opt.currentConfig.visibility.def[opt.fieldName].splice(opt.index, 1);
                $.spEasyForms.configManager.set(opt);
                visibilityRuleCollection.drawRuleTable(opt);
                $.spEasyForms.containerCollection.toEditor(opt);
            });

            $("[id^='addVisililityRuleButton']").button({
                icons: {
                    primary: "ui-icon-gear"
                },
                text: false
            }).click(function () {
                visibilityRuleCollection.clearRuleDialog(opt);
                opt.index = this.id.replace("addVisililityRuleButton", "");
                $("#visibilityRuleIndex").val(opt.index);
                opt.fieldName = $("#conditionalVisibilityField").val();
                $("#addVisibilityRuleField").val(opt.fieldName);
                opt.currentConfig = $.spEasyForms.configManager.get(opt);
                var rule = opt.currentConfig.visibility.def[opt.fieldName][opt.index];
                $("#addVisibilityRuleState").val(rule.state);
                $.each(rule.appliesTo.split(';'), function (idx, entity) {
                    if (entity === "AUTHOR") {
                        $("#addVisibilityRuleApplyToAuthor")[0].checked = true;
                    } else if (entity.length > 0) {
                        var span = $("<span>").addClass("speasyforms-entity").
                        attr('title', entity).text(entity);
                        $("<a>").addClass("speasyforms-remove").attr({
                            "href": "#",
                            "title": "Remove " + entity
                        }).
                        text("x").appendTo(span);
                        $("#spEasyFormsEntityPicker").prepend(span);
                        $("#addVisibilityRuleApplyTo").val("").css("top", 2);
                        visibilityRuleCollection.siteGroups.splice($.inArray(entity,
                            visibilityRuleCollection.siteGroups), 1);
                    }
                });
                if (rule.forms.indexOf('New') >= 0) {
                    $("#addVisibilityRuleNewForm")[0].checked = true;
                } else if (rule.forms.indexOf('Edit') >= 0) {
                    $("#addVisibilityRuleEditForm")[0].checked = true;
                } else if (rule.forms.indexOf('Display') >= 0) {
                    $("#addVisibilityRuleDisplayForm")[0].checked = true;
                }
                if (rule.conditions) {
                    $.each(rule.conditions, function (index, condition) {
                        $("#conditionalField" + (index + 1)).val(condition.name);
                        $("#conditionalType" + (index + 1)).val(condition.type);
                        $("#conditionalValue" + (index + 1)).val(condition.value);
                        $("#condition" + (index + 1)).show();
                        if ($(".speasyforms-condition:hidden").length === 0) {
                            $("#spEasyFormsAddConditionalBtn").hide();
                        }
                    });
                }
                $('#addVisibilityRuleDialog').dialog("open");
                return false;
            });

            // make the visibility rules sortable sortable
            $("tbody.speasyforms-sortablerules").sortable({
                connectWith: ".speasyforms-rulestable",
                items: "> tr:not(:first)",
                helper: "clone",
                zIndex: 990,
                update: function (event) {
                    if (!event.handled) {
                        opt.currentConfig = visibilityRuleCollection.toConfig(opt);
                        $.spEasyForms.configManager.set(opt);
                        visibilityRuleCollection.drawRuleTable(opt);
                        $.spEasyForms.containerCollection.toEditor(opt);
                        event.handled = true;
                    }
                }
            });
        },

        /*********************************************************************
         * Wire up the conditional visibility dialog boxes.
         *
         * @param {object} options - {
         *     // see the definition of defaults for options
         * }
         *********************************************************************/
        wireDialogEvents: function (options) {
            var opt = $.extend({}, $.spEasyForms.defaults, options);

            // wire the conditional visilibity dialog
            var conditionalVisibilityOpts = {
                modal: true,
                buttons: {
                    "Ok": function () {
                        $('#conditonalVisibilityRulesDialog').dialog("close");
                        return false;
                    }
                },
                autoOpen: false,
                width: 750
            };
            $('#conditonalVisibilityRulesDialog').dialog(conditionalVisibilityOpts);

            // wire the add/edit visibility rule dialog
            var addVisibilityRuleOpts = {
                modal: true,
                buttons: {
                    "Ok": function () {
                        opt.state = $('#addVisibilityRuleState').val();
                        if (opt.state === '') {
                            $('#addVisibilityRuleStateError').text(
                                "You must select a value for state!");
                        } else {
                            opt.currentConfig = $.spEasyForms.configManager.get(opt);
                            opt.fieldName = $("#addVisibilityRuleField").val();
                            opt.currentConfig.visibility = visibilityRuleCollection.getVisibility(opt);
                            opt.index = $("#visibilityRuleIndex").val();
                            if (opt.index.length === 0) {
                                var newRule = visibilityRuleCollection.getRule(opt);
                                opt.currentConfig.visibility.def[opt.fieldName].push(newRule);
                            } else {
                                var rule = visibilityRuleCollection.getRule(opt);
                                opt.currentConfig.visibility.def[opt.fieldName][opt.index] = rule;
                            }
                            $.spEasyForms.configManager.set(opt);
                            $('#addVisibilityRuleDialog').dialog("close");
                            $("#conditonalVisibilityRulesDialog").dialog("open");
                            visibilityRuleCollection.drawRuleTable(opt);
                            $.spEasyForms.containerCollection.toEditor(opt);
                        }
                        return false;
                    },
                    "Cancel": function () {
                        $('#addVisibilityRuleDialog').dialog("close");
                        $("#conditonalVisibilityRulesDialog").dialog("open");
                        return false;
                    }
                },
                autoOpen: false,
                width: 750
            };
            $('#addVisibilityRuleDialog').dialog(addVisibilityRuleOpts);

            // wire the button to launch the add/edit rule dialog
            $("#addVisibilityRule").button({
                icons: {
                    primary: "ui-icon-plusthick"
                },
                text: false
            }).click(function () {
                $("#conditonalVisibilityRulesDialog").dialog("close");
                visibilityRuleCollection.clearRuleDialog(opt);
                $('#addVisibilityRuleDialog').dialog("open");
                return false;
            });

            // wire the button to launch the add/edit rule dialog
            $("#spEasyFormsAddConditionalBtn").button({
                icons: {
                    primary: "ui-icon-plusthick"
                },
                text: false
            }).click(function () {
                $(".speasyforms-condition:hidden").first().show();
                if ($(".speasyforms-condition:hidden").length === 0) {
                    $("#spEasyFormsAddConditionalBtn").hide();
                }
                return false;
            });

            // wire the entity picker on the add/edit rule dialog
            $("input.speasyforms-entitypicker").autocomplete({
                source: this.siteGroups.sort(),

                select: function (e, ui) {
                    var group = ui.item.value;
                    var span = $("<span>").addClass("speasyforms-entity").
                    attr('title', group).text(group);
                    $("<a>").addClass("speasyforms-remove").attr({
                        "href": "#",
                        "title": "Remove " + group
                    }).
                    text("x").appendTo(span);
                    span.insertBefore(this);
                    $(this).val("").css("top", 2);
                    visibilityRuleCollection.siteGroups.splice(
                        $.inArray(group, visibilityRuleCollection.siteGroups), 1);
                    $(this).autocomplete(
                        "option", "source", visibilityRuleCollection.siteGroups.sort());
                    return false;
                }
            });
            $(".speasyforms-entitypicker").click(function () {
                $(this).find("input").focus();
            });
            $("#spEasyFormsEntityPicker").on("click", ".speasyforms-remove", function () {
                visibilityRuleCollection.siteGroups.push($(this).parent().attr("title"));
                $(this).closest("div").find("input").
                autocomplete("option", "source", visibilityRuleCollection.siteGroups.sort()).
                focus();
                $(this).parent().remove();
            });
        },

        /*********************************************************************
         * Wire the add rule button and make the rules sortable.
         *
         * @param {object} options - {
         *     // see the definition of defaults for options
         * }
         *********************************************************************/
        wireButtonEvents: function (options) {
            var opt = $.extend({}, $.spEasyForms.defaults, options);
            $("tr.speasyforms-sortablefields").each(function () {
                var tds = $(this).find("td");
                if (tds.length > 0) {
                    var internalName = $(this).find("td")[1].innerHTML;
                    $(this).append(
                        "<td class='speasyforms-conditionalvisibility'><button id='" +
                        internalName +
                        "ConditionalVisibility' class='speasyforms-containerbtn " +
                        "speasyforms-conditionalvisibility'>" +
                        "Edit Conditional Visibility</button></td>");
                }
            });

            $("button.speasyforms-conditionalvisibility").button({
                icons: {
                    primary: "ui-icon-key"
                },
                text: false
            }).click(function () {
                opt.currentConfig = $.spEasyForms.configManager.get(opt);
                opt.fieldName = this.id.replace("ConditionalVisibility", "");
                visibilityRuleCollection.launchDialog(opt);
                $(".tabs-min").hide();
                $("#tabs-min-visibility").show();
                return false;
            });
        },

        /*********************************************************************
         * Get the current visibility rules.
         *
         * @param {object} options - {
         *     // see the definition of defaults for options
         * }
         *
         * @return {object} - the current visibility rules.
         *********************************************************************/
        getVisibility: function (options) {
            var opt = $.extend({}, $.spEasyForms.defaults, options);
            if (!opt.currentConfig.visibility) {
                opt.currentConfig.visibility = {
                    def: {}
                };
            }
            if (!opt.currentConfig.visibility.def[opt.fieldName]) {
                opt.currentConfig.visibility.def[opt.fieldName] = [];
            }
            return opt.currentConfig.visibility;
        },

        /*********************************************************************
         * Construct a rule from the add/edit rule dialog box.
         *
         * @param {object} options - {
         *     // see the definition of defaults for options
         * }
         *
         * @return {object} - the new rule.
         *********************************************************************/
        getRule: function (options) {
            var opt = $.extend({}, $.spEasyForms.defaults, options);
            var result = {};
            result.state = opt.state;
            result.forms = "";
            $(".speasyforms-formcb").each(function (idx, cb) {
                if (cb.checked) {
                    if (result.forms.length > 0) {
                        result.forms += ";";
                    }
                    result.forms += this.id.replace("addVisibilityRule", "").replace("Form", "");
                }
            });
            result.appliesTo = "";
            $('#spEasyFormsEntityPicker .speasyforms-entity').each(function (idx, span) {
                if (result.appliesTo.length > 0) {
                    result.appliesTo += ";";
                }
                result.appliesTo += $(span).attr("title");
            });
            var author = $("#addVisibilityRuleApplyToAuthor")[0].checked;
            if (author) {
                if (result.appliesTo.length > 0) {
                    result.appliesTo = ";" + result.appliesTo;
                }
                result.appliesTo = "AUTHOR" + result.appliesTo;
            }
            var conditions = $(".speasyforms-conditionalvalue");
            result.conditions = [];
            conditions.each(function () {
                if ($(this).val().length > 0 && $(this).prev().prev().val().length > 0) {
                    var newCondition = {};
                    newCondition.name = $(this).prev().prev().val();
                    newCondition.type = $(this).prev().val();
                    newCondition.value = $(this).val();
                    result.conditions.push(newCondition);
                }
            });
            return result;
        },

        /*********************************************************************
         * Reset the add/edit rule dialog box.
         *
         * @param {object} options - {
         *     // see the definition of defaults for options
         * }
         *********************************************************************/
        clearRuleDialog: function (options) {
            var opt = $.extend({}, $.spEasyForms.defaults, options);
            $("#addVisibilityRuleField").val($("#conditionalVisibilityField").val());
            $("#visibilityRuleIndex").val("");
            $('#addVisibilityRuleState').val('');
            $('#addVisibilityRuleStateError').text('');
            $('#addVisibilityRuleApplyToAuthor').attr('checked', false);
            $('#addVisibilityRuleApplyTo').val('');
            $('#spEasyFormsEntityPicker .speasyforms-entity').remove();
            $('#addVisibilityRuleNewForm').attr('checked', true);
            $('#addVisibilityRuleEditForm').attr('checked', true);
            $('#addVisibilityRuleDisplayForm').attr('checked', true);
            $(".speasyforms-conditionalvalue").val("").not(":first").parent().hide();
            $(".speasyforms-conditionalfield").val("");
            $("#spEasyFormsAddConditionalBtn").show();
            var siteGroups = $.spEasyForms.sharePointContext.getSiteGroups(opt);
            $.each(siteGroups, function (idx, group) {
                if ($.inArray(group.name, visibilityRuleCollection.siteGroups) < 0) {
                    visibilityRuleCollection.siteGroups.push(group.name);
                }
            });
        },

        /*********************************************************************
         * Get the current form type. This function looks for the word new, edit,
         * or display in the current page name (case insensative.
         *
         * @param {object} options - {
         *     // see the definition of defaults for options
         * }
         *
         * @return {string} - new, edit, display, or "".
         *********************************************************************/
        getFormType: function () {
            var result = "";
            var page = window.location.pathname;
            page = page.substring(page.lastIndexOf("/") + 1).toLowerCase();
            if (page === "start.aspx") {
                page = window.location.href.substring(
                    window.location.href.indexOf("#") + 1);
                page = page.substring(page.lastIndexOf("/") + 1,
                    page.indexOf("?")).toLowerCase();
            }
            if (page.indexOf("new") >= 0) {
                result = "new";
            } else if (page.indexOf("edit") >= 0 &&
                page.toLocaleLowerCase().indexOf("listedit.aspx") &&
                page.toLocaleLowerCase().indexOf("fldnew.aspx") &&
                page.toLocaleLowerCase().indexOf("fldedit.aspx")
                ) {
                result = "edit";
            } else if (page.indexOf("disp") >= 0 || page.indexOf("display") >= 0) {
                result = "display";
            }
            return result;
        },

        checkForm: function (options) {
            var opt = $.extend({}, $.spEasyForms.defaults, options);
            var formType = visibilityRuleCollection.getFormType(opt);
            var ruleForms = $(opt.rule.forms.split(';')).map(function () {
                return this.toLowerCase();
            });
            return $.inArray(formType, ruleForms) >= 0;
        },

        checkAppliesTo: function (options) {
            var opt = $.extend({}, $.spEasyForms.defaults, options);
            var appliesMatch = false;
            if (opt.rule.appliesTo.length === 0) {
                appliesMatch = true;
            } else {
                var appliesToGroups = opt.rule.appliesTo.split(';');
                var formType = visibilityRuleCollection.getFormType(opt);
                if (appliesToGroups[0] === "AUTHOR" && formType === "new") {
                    appliesMatch = true;
                } else {
                    if (appliesToGroups[0] === "AUTHOR") {
                        var authorHref = $("span:contains('Created  at')").
                            find("a.ms-subtleLink").attr("href");
                        if (!authorHref) {
                            authorHref = $("td.ms-descriptiontext span a").attr("href");
                        }
                        if (authorHref) {
                            var authorId = parseInt(
                                authorHref.substring(authorHref.indexOf("ID=") + 3), 10);
                            if (authorId === opt.currentContext.userId) {
                                appliesMatch = true;
                            }
                        }
                    }
                    if (!appliesMatch) {
                        var userGroups = $.spEasyForms.sharePointContext.getUserGroups(opt);
                        $.each(userGroups, function (i, group) {
                            if ($.inArray(group.name, appliesToGroups) >= 0) {
                                appliesMatch = true;
                                return false;
                            }
                        });
                    }
                }
            }
            return appliesMatch;
        },

        checkConditionals: function (options) {
            var opt = $.extend({}, $.spEasyForms.defaults, options);
            var result = false;
            if (!opt.rule.conditions || opt.rule.conditions.length === 0) {
                result = true;
            } else {
                result = true;
                $.each(opt.rule.conditions, function (idx, condition) {
                    opt.row = $.spEasyForms.containerCollection.rows[condition.name];
                    if (opt.row) {
                        var currentValue = $.spEasyForms.sharePointFieldRows.value(opt);
                        var type = $.spEasyForms.utilities.jsCase(condition.type);
                        var comparisonOperator = visibilityRuleCollection.comparisonOperators[type];
                        result = comparisonOperator(currentValue, condition.value);
                    }
                    else {
                        result = false;
                        return false;
                    }
                });
            }
            return result;
        }
    };
    var visibilityRuleCollection = $.spEasyForms.visibilityRuleCollection;

})(spefjQuery);
