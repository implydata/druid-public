"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var React = require("react");
var react_router_dom_1 = require("react-router-dom");
var core_1 = require("@blueprintjs/core");
var home_view_1 = require("./views/home-view");
var servers_view_1 = require("./views/servers-view");
var data_source_view_1 = require("./views/data-source-view");
var tasks_view_1 = require("./views/tasks-view");
var segments_view_1 = require("./views/segments-view");
var sql_view_1 = require("./views/sql-view");
var ConsoleApplication = (function (_super) {
    tslib_1.__extends(ConsoleApplication, _super);
    function ConsoleApplication(props, context) {
        var _this = _super.call(this, props, context) || this;
        _this.goToTask = function (taskId) {
            _this.taskId = taskId;
            window.location.hash = 'tasks';
        };
        _this.goToSegments = function (dataSource, onlyUnavailable) {
            if (onlyUnavailable === void 0) { onlyUnavailable = false; }
            _this.dataSource = dataSource;
            _this.onlyUnavailable = onlyUnavailable;
            window.location.hash = 'segments';
        };
        _this.goToSql = function (initSql) {
            _this.initSql = initSql;
            window.location.hash = 'sql';
        };
        _this.handleOpen = function () { return _this.setState({ aboutDialogOpen: true }); };
        _this.handleClose = function () { return _this.setState({ aboutDialogOpen: false }); };
        _this.state = {
            aboutDialogOpen: false
        };
        return _this;
    }
    ConsoleApplication.prototype.componentDidUpdate = function (prevProps, prevState, snapshot) {
        this.taskId = null;
        this.dataSource = null;
        this.onlyUnavailable = null;
        this.initSql = null;
    };
    ConsoleApplication.prototype.renderAboutDialog = function () {
        var aboutDialogOpen = this.state.aboutDialogOpen;
        return React.createElement(core_1.Dialog, { icon: "info-sign", onClose: this.handleClose, title: "Apache Druid console", isOpen: aboutDialogOpen, usePortal: true, canEscapeKeyClose: true },
            React.createElement("div", { className: core_1.Classes.DIALOG_BODY },
                React.createElement("p", null,
                    React.createElement("strong", null, "Blah")),
                React.createElement("p", null, "Hello"),
                React.createElement("p", null, "How are you.")),
            React.createElement("div", { className: core_1.Classes.DIALOG_FOOTER },
                React.createElement("div", { className: core_1.Classes.DIALOG_FOOTER_ACTIONS },
                    React.createElement(core_1.Tooltip, { content: "This button is hooked up to close the dialog." },
                        React.createElement(core_1.Button, { onClick: this.handleClose }, "Close")),
                    React.createElement(core_1.AnchorButton, { intent: core_1.Intent.PRIMARY, href: "http://druid.io", target: "_blank" }, "Visit Druid"))));
    };
    ConsoleApplication.prototype.render = function () {
        var _this = this;
        var legacyMenu = React.createElement(core_1.Menu, null,
            React.createElement(core_1.MenuItem, { icon: "graph", text: "Legacy coordinator console", href: "/legacy-coordinator-console.html", target: "_blank" }),
            React.createElement(core_1.MenuItem, { icon: "map", text: "Legacy overlord console", href: "/legacy-overlord-console.html", target: "_blank" }),
            React.createElement(core_1.MenuItem, { icon: "th", text: "Legacy coordinator console (old)", href: "/old-console/", target: "_blank" }));
        var helpMenu = React.createElement(core_1.Menu, null,
            React.createElement(core_1.MenuItem, { icon: "graph", text: "About", onClick: this.handleOpen }),
            React.createElement(core_1.MenuItem, { icon: "th", text: "Apache Druid docs", href: "http://druid.io/docs/latest", target: "_blank" }),
            React.createElement(core_1.MenuItem, { icon: "git-branch", text: "Apache Druid GitHub", href: "https://github.com/apache/incubator-druid", target: "_blank" }));
        return React.createElement(react_router_dom_1.HashRouter, { hashType: "noslash" },
            React.createElement("div", { className: "console-application" },
                React.createElement(core_1.Navbar, null,
                    React.createElement(core_1.NavbarGroup, { align: core_1.Alignment.LEFT },
                        React.createElement("a", { href: "#" },
                            React.createElement(core_1.NavbarHeading, null, "Druid Console")),
                        React.createElement(core_1.NavbarDivider, null),
                        React.createElement(core_1.AnchorButton, { className: core_1.Classes.MINIMAL, icon: "multi-select", text: "Datasources", href: "#datasources" }),
                        React.createElement(core_1.AnchorButton, { className: core_1.Classes.MINIMAL, icon: "full-stacked-chart", text: "Segments", href: "#segments" }),
                        React.createElement(core_1.AnchorButton, { className: core_1.Classes.MINIMAL, icon: "gantt-chart", text: "Tasks", href: "#tasks" }),
                        React.createElement(core_1.AnchorButton, { className: core_1.Classes.MINIMAL, icon: "database", text: "Servers", href: "#servers" }),
                        React.createElement(core_1.NavbarDivider, null),
                        React.createElement(core_1.AnchorButton, { className: core_1.Classes.MINIMAL, icon: "console", text: "SQL", href: "#sql" })),
                    React.createElement(core_1.NavbarGroup, { align: core_1.Alignment.RIGHT },
                        React.createElement(core_1.Popover, { content: legacyMenu, position: core_1.Position.BOTTOM_LEFT },
                            React.createElement(core_1.Button, { className: core_1.Classes.MINIMAL, icon: "share", text: "Legacy" })),
                        React.createElement(core_1.Popover, { content: helpMenu, position: core_1.Position.BOTTOM_LEFT },
                            React.createElement(core_1.Button, { className: core_1.Classes.MINIMAL, icon: "info-sign", text: "Help" })))),
                React.createElement("div", { className: "view-container" },
                    React.createElement(react_router_dom_1.Route, { path: "/", exact: true, component: home_view_1.HomeView }),
                    React.createElement(react_router_dom_1.Route, { path: "/datasources", component: function () { return React.createElement(data_source_view_1.DataSourcesView, { goToSql: _this.goToSql, goToSegments: _this.goToSegments }); } }),
                    React.createElement(react_router_dom_1.Route, { path: "/segments", component: function () { return React.createElement(segments_view_1.SegmentsView, { goToSql: _this.goToSql, dataSource: _this.dataSource, onlyUnavailable: _this.onlyUnavailable }); } }),
                    React.createElement(react_router_dom_1.Route, { path: "/tasks", component: function () { return React.createElement(tasks_view_1.TasksView, { taskId: _this.taskId, goToSql: _this.goToSql }); } }),
                    React.createElement(react_router_dom_1.Route, { path: "/servers", component: function () { return React.createElement(servers_view_1.ServersView, { goToSql: _this.goToSql, goToTask: _this.goToTask }); } }),
                    React.createElement(react_router_dom_1.Route, { path: "/sql", component: function () { return React.createElement(sql_view_1.SqlView, { initSql: _this.initSql }); } })),
                this.renderAboutDialog()));
    };
    return ConsoleApplication;
}(React.Component));
exports.ConsoleApplication = ConsoleApplication;
