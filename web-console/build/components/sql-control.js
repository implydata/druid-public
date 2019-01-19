"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var React = require("react");
var core_1 = require("@blueprintjs/core");
var SqlControl = (function (_super) {
    tslib_1.__extends(SqlControl, _super);
    function SqlControl(props, context) {
        var _this = _super.call(this, props, context) || this;
        _this.handleChange = function (e) {
            _this.setState({
                query: e.target.value
            });
        };
        _this.state = {
            query: props.initSql || ''
        };
        return _this;
    }
    SqlControl.prototype.render = function () {
        var onRun = this.props.onRun;
        var query = this.state.query;
        return React.createElement("div", { className: "sql-control" },
            React.createElement(core_1.TextArea, { className: "bp3-fill", large: true, intent: core_1.Intent.PRIMARY, onChange: this.handleChange, value: query }),
            React.createElement("div", { className: "buttons" },
                React.createElement(core_1.Button, { icon: "caret-right", onClick: function () { return onRun(query); } }, "Run")));
    };
    return SqlControl;
}(React.Component));
exports.SqlControl = SqlControl;
