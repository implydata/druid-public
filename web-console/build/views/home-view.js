"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var axios_1 = require("axios");
var React = require("react");
var core_1 = require("@blueprintjs/core");
var HomeView = (function (_super) {
    tslib_1.__extends(HomeView, _super);
    function HomeView(props, context) {
        var _this = _super.call(this, props, context) || this;
        _this.state = {
            statusLoading: true,
            status: null,
            statusError: null
        };
        axios_1.default.get('/status')
            .then(function (response) {
            _this.setState({
                statusLoading: false,
                status: response.data,
                statusError: null
            });
        })
            .catch(function (error) {
            _this.setState({
                statusLoading: false,
                status: null,
                statusError: error.message
            });
            console.log(error);
        });
        return _this;
    }
    HomeView.prototype.render = function () {
        var _a = this.state, status = _a.status, statusLoading = _a.statusLoading, statusError = _a.statusError;
        return React.createElement("div", { className: "home-view app-view" },
            React.createElement("a", { href: "/status" },
                React.createElement(core_1.Card, { interactive: true },
                    React.createElement(core_1.H5, null, "Status"),
                    React.createElement("p", null, statusLoading ? "Loading status..." : (statusError ? statusError : "Apache Druid is running version " + status.version)))),
            React.createElement("a", { href: "#datasources" },
                React.createElement(core_1.Card, { interactive: true },
                    React.createElement(core_1.H5, null, "Datasources"),
                    React.createElement("p", null, "12 datasources"))),
            React.createElement("a", { href: "#segments" },
                React.createElement(core_1.Card, { interactive: true },
                    React.createElement(core_1.H5, null, "Segments"),
                    React.createElement("p", null, "120 segments"),
                    React.createElement("p", null, "34 time chunks"))),
            React.createElement("a", { href: "#tasks" },
                React.createElement(core_1.Card, { interactive: true },
                    React.createElement(core_1.H5, null, "Tasks"),
                    React.createElement("p", null, "12 running tasks"),
                    React.createElement("p", null, "7 pending tasks"),
                    React.createElement("p", null, "5 recently completed tasks"))),
            React.createElement("a", { href: "#servers" },
                React.createElement(core_1.Card, { interactive: true },
                    React.createElement(core_1.H5, null, "Servers"),
                    React.createElement("p", null, "3 Data servers"),
                    React.createElement("p", null, "3 MiddleManagers"))));
    };
    return HomeView;
}(React.Component));
exports.HomeView = HomeView;
