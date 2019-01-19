"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var axios_1 = require("axios");
var React = require("react");
var react_table_1 = require("react-table");
var sql_control_1 = require("../components/sql-control");
var utils_1 = require("../utils");
var SqlView = (function (_super) {
    tslib_1.__extends(SqlView, _super);
    function SqlView(props, context) {
        var _this = _super.call(this, props, context) || this;
        _this.state = {
            loading: false,
            results: null
        };
        _this.sqlQueryManager = new utils_1.QueryManager({
            processQuery: function (query) {
                return axios_1.default.post("/druid/v2/sql", {
                    query: query,
                    resultFormat: "array",
                    header: true
                })
                    .then(function (response) { return response.data; });
            },
            onStateChange: function (_a) {
                var result = _a.result, loading = _a.loading, error = _a.error;
                if (!_this.mounted)
                    return;
                _this.setState({
                    results: result,
                    loading: loading
                });
            }
        });
        return _this;
    }
    SqlView.prototype.componentDidMount = function () {
        this.mounted = true;
    };
    SqlView.prototype.componentWillUnmount = function () {
        this.mounted = false;
    };
    SqlView.prototype.renderResultTable = function () {
        var _a = this.state, results = _a.results, loading = _a.loading;
        var header = (results && results.length) ? results[0] : [];
        return React.createElement(react_table_1.default, { data: results ? results.slice(1) : [], loading: loading, columns: header.map(function (h, i) { return ({ Header: h, accessor: String(i) }); }), defaultPageSize: 10, className: "-striped -highlight" });
    };
    SqlView.prototype.render = function () {
        var _this = this;
        var initSql = this.props.initSql;
        return React.createElement("div", { className: "sql-view app-view" },
            React.createElement(sql_control_1.SqlControl, { initSql: initSql, onRun: function (q) { return _this.sqlQueryManager.runQuery(q); } }),
            this.renderResultTable());
    };
    return SqlView;
}(React.Component));
exports.SqlView = SqlView;
