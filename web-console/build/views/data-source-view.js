"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var axios_1 = require("axios");
var React = require("react");
var react_table_1 = require("react-table");
var core_1 = require("@blueprintjs/core");
var utils_1 = require("../utils");
var DataSourcesView = (function (_super) {
    tslib_1.__extends(DataSourcesView, _super);
    function DataSourcesView(props, context) {
        var _this = _super.call(this, props, context) || this;
        _this.state = {
            loadingDataSources: true,
            dataSources: null,
            dataSourceFilter: []
        };
        _this.dataSourceQueryManager = new utils_1.QueryManager({
            processQuery: function (query) {
                return axios_1.default.post("/druid/v2/sql", { query: query })
                    .then(function (response) { return response.data; });
            },
            onStateChange: function (_a) {
                var result = _a.result, loading = _a.loading, error = _a.error;
                if (!_this.mounted)
                    return;
                _this.setState({
                    dataSources: result,
                    loadingDataSources: loading
                });
            }
        });
        _this.dataSourceQueryManager.runQuery("SELECT\n  datasource,\n  COUNT(*) AS num_segments,\n  COUNT(*) FILTER(WHERE is_available = 1) AS num_available_segments,\n  SUM(\"size\") AS size,\n  SUM(\"num_rows\") AS num_rows \nFROM sys.segments\nGROUP BY 1");
        return _this;
    }
    DataSourcesView.prototype.componentDidMount = function () {
        this.mounted = true;
    };
    DataSourcesView.prototype.componentWillUnmount = function () {
        this.mounted = false;
    };
    DataSourcesView.prototype.renderDataSourceTable = function () {
        var _this = this;
        var goToSegments = this.props.goToSegments;
        var _a = this.state, dataSources = _a.dataSources, loadingDataSources = _a.loadingDataSources, dataSourceFilter = _a.dataSourceFilter;
        return React.createElement(react_table_1.default, { data: dataSources || [], loading: loadingDataSources, filterable: true, filtered: dataSourceFilter, onFilteredChange: function (filtered, column) {
                _this.setState({ dataSourceFilter: filtered });
            }, columns: [
                {
                    Header: "Data source",
                    accessor: "datasource",
                    Filter: utils_1.makeTextFilter(),
                    Cell: function (row) {
                        var value = row.value;
                        return React.createElement("a", { onClick: function () { _this.setState({ dataSourceFilter: utils_1.addFilter(dataSourceFilter, 'datasource', value) }); } }, value);
                    }
                },
                {
                    Header: "Availability",
                    id: "availability",
                    accessor: function (row) { return row.num_available_segments / row.num_segments; },
                    Filter: utils_1.makeTextFilter(),
                    Cell: function (row) {
                        var _a = row.original, datasource = _a.datasource, num_available_segments = _a.num_available_segments, num_segments = _a.num_segments;
                        var segmentsEl = React.createElement("a", { onClick: function () { return goToSegments(datasource); } }, num_segments + " segments");
                        if (num_available_segments === num_segments) {
                            return React.createElement("span", null,
                                "Fully available (",
                                segmentsEl,
                                ")");
                        }
                        else {
                            var percentAvailable = (Math.floor((num_available_segments / num_segments) * 1000) / 10).toFixed(1);
                            var missing = num_segments - num_available_segments;
                            var segmentsMissingEl = React.createElement("a", { onClick: function () { return goToSegments(datasource, true); } }, missing + " segments unavailable");
                            return React.createElement("span", null,
                                percentAvailable,
                                "% available (",
                                segmentsEl,
                                ", ",
                                segmentsMissingEl,
                                ")");
                        }
                    }
                },
                {
                    Header: 'Size',
                    accessor: 'size',
                    filterable: false,
                    width: 100,
                    Cell: function (row) { return utils_1.formatBytes(row.value); }
                },
                {
                    Header: 'Num rows',
                    accessor: 'num_rows',
                    filterable: false,
                    width: 100,
                    Cell: function (row) { return utils_1.formatNumber(row.value); }
                },
                {
                    Header: 'Actions',
                    accessor: 'datasource',
                    id: 'actions',
                    width: 300,
                    filterable: false,
                    Cell: function (row) {
                        var id = row.value;
                        return React.createElement("div", null,
                            React.createElement("a", { onClick: function () { return null; } }, "drop data"));
                    }
                }
            ], defaultPageSize: 50, className: "-striped -highlight" });
    };
    DataSourcesView.prototype.render = function () {
        var _this = this;
        var goToSql = this.props.goToSql;
        return React.createElement("div", { className: "data-sources-view app-view" },
            React.createElement("div", { className: "control-bar" },
                React.createElement(core_1.H1, null, "Datasources"),
                React.createElement(core_1.Button, { rightIcon: "refresh", text: "Refresh", onClick: function () { return _this.dataSourceQueryManager.rerunLastQuery(); } }),
                React.createElement(core_1.Button, { rightIcon: "share", text: "Go to SQL", onClick: function () { return goToSql(_this.dataSourceQueryManager.getLastQuery()); } })),
            this.renderDataSourceTable());
    };
    return DataSourcesView;
}(React.Component));
exports.DataSourcesView = DataSourcesView;
