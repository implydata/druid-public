"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var axios_1 = require("axios");
var React = require("react");
var react_table_1 = require("react-table");
var core_1 = require("@blueprintjs/core");
var utils_1 = require("../utils");
var SegmentsView = (function (_super) {
    tslib_1.__extends(SegmentsView, _super);
    function SegmentsView(props, context) {
        var _this = _super.call(this, props, context) || this;
        _this.fetchData = function (state, instance) {
            var page = state.page, pageSize = state.pageSize, filtered = state.filtered, sorted = state.sorted;
            var totalQuerySize = (page + 1) * pageSize;
            var queryParts = [
                "SELECT \"segment_id\", \"datasource\", \"start\", \"end\", \"size\", \"version\", \"partition_num\", \"num_replicas\", \"num_rows\", \"is_published\", \"is_available\", \"is_realtime\", \"payload\"",
                "FROM sys.segments"
            ];
            var whereParts = filtered.map(function (f) {
                if (f.id.startsWith('is_')) {
                    if (f.value === 'all')
                        return null;
                    return JSON.stringify(f.id) + " = " + (f.value === 'true' ? 1 : 0);
                }
                else {
                    return JSON.stringify(f.id) + " LIKE '" + f.value + "%'";
                }
            }).filter(Boolean);
            if (whereParts.length) {
                queryParts.push('WHERE ' + whereParts.join(' AND '));
            }
            if (sorted.length) {
                var sort = sorted[0];
                queryParts.push("ORDER BY " + JSON.stringify(sort.id) + " " + (sort.desc ? 'DESC' : 'ASC'));
            }
            queryParts.push("LIMIT " + totalQuerySize);
            var query = queryParts.join('\n');
            _this.segmentsQueryManager.runQuery({
                query: query,
                skip: totalQuerySize - pageSize
            });
        };
        var segmentFilter = [];
        if (props.dataSource)
            segmentFilter.push({ id: 'datasource', value: props.dataSource });
        if (props.onlyUnavailable)
            segmentFilter.push({ id: 'is_available', value: 'false' });
        _this.state = {
            loading: true,
            segments: null,
            segmentFilter: segmentFilter
        };
        _this.segmentsQueryManager = new utils_1.QueryManager({
            processQuery: function (query) {
                return axios_1.default.post("/druid/v2/sql", { query: query.query })
                    .then(function (response) { return response.data.slice(query.skip); });
            },
            onStateChange: function (_a) {
                var result = _a.result, loading = _a.loading, error = _a.error;
                if (!_this.mounted)
                    return;
                _this.setState({
                    segments: result,
                    loading: loading
                });
            }
        });
        return _this;
    }
    SegmentsView.prototype.componentDidMount = function () {
        this.mounted = true;
    };
    SegmentsView.prototype.componentWillUnmount = function () {
        this.mounted = false;
    };
    SegmentsView.prototype.renderSegmentsTable = function () {
        var _this = this;
        var _a = this.state, segments = _a.segments, loading = _a.loading, segmentFilter = _a.segmentFilter;
        return React.createElement(react_table_1.default, { data: segments || [], pages: 10, loading: loading, manual: true, filterable: true, filtered: segmentFilter, defaultSorted: [{ id: "start", desc: true }], onFilteredChange: function (filtered, column) {
                _this.setState({ segmentFilter: filtered });
            }, onFetchData: this.fetchData, columns: [
                {
                    Header: "Segment ID",
                    accessor: "segment_id",
                    width: 300,
                    Filter: utils_1.makeTextFilter()
                },
                {
                    Header: "Data Source",
                    accessor: "datasource",
                    Filter: utils_1.makeTextFilter(),
                    Cell: function (row) {
                        var value = row.value;
                        return React.createElement("a", { onClick: function () { _this.setState({ segmentFilter: utils_1.addFilter(segmentFilter, 'datasource', value) }); } }, value);
                    }
                },
                {
                    Header: "Start",
                    accessor: "start",
                    Filter: utils_1.makeTextFilter(),
                    Cell: function (row) {
                        var value = row.value;
                        return React.createElement("a", { onClick: function () { _this.setState({ segmentFilter: utils_1.addFilter(segmentFilter, 'start', value) }); } }, value);
                    }
                },
                {
                    Header: "End",
                    accessor: "end",
                    Filter: utils_1.makeTextFilter(),
                    Cell: function (row) {
                        var value = row.value;
                        return React.createElement("a", { onClick: function () { _this.setState({ segmentFilter: utils_1.addFilter(segmentFilter, 'end', value) }); } }, value);
                    }
                },
                {
                    Header: "Size",
                    accessor: "size",
                    filterable: false,
                    Cell: function (row) { return utils_1.formatBytes(row.value); }
                },
                {
                    Header: "Num rows",
                    accessor: "num_rows",
                    filterable: false,
                    Cell: function (row) { return utils_1.formatNumber(row.value); }
                },
                {
                    Header: "Num replicas",
                    accessor: "num_replicas",
                    filterable: false
                },
                {
                    Header: "Is published",
                    id: "is_published",
                    accessor: function (row) { return String(Boolean(row.is_published)); },
                    Filter: utils_1.makeBooleanFilter()
                },
                {
                    Header: "IS realtime",
                    id: "is_realtime",
                    accessor: function (row) { return String(Boolean(row.is_realtime)); },
                    Filter: utils_1.makeBooleanFilter()
                },
                {
                    Header: "Is available",
                    id: "is_available",
                    accessor: function (row) { return String(Boolean(row.is_available)); },
                    Filter: utils_1.makeBooleanFilter()
                }
            ], defaultPageSize: 50, className: "-striped -highlight", SubComponent: function (rowInfo) {
                var payload = JSON.parse(rowInfo.original.payload);
                return React.createElement("div", { style: { padding: "20px" } },
                    React.createElement(core_1.H5, null, "Dimensions"),
                    React.createElement("div", null, payload.dimensions),
                    React.createElement(core_1.H5, null, "Metrics"),
                    React.createElement("div", null, payload.metrics));
            } });
    };
    SegmentsView.prototype.render = function () {
        var _this = this;
        var goToSql = this.props.goToSql;
        return React.createElement("div", { className: "segments-view app-view" },
            React.createElement("div", { className: "control-bar" },
                React.createElement(core_1.H1, null, "Segments"),
                React.createElement(core_1.Button, { rightIcon: "refresh", text: "Refresh", onClick: function () { return _this.segmentsQueryManager.rerunLastQuery(); } }),
                React.createElement(core_1.Button, { rightIcon: "share", text: "Go to SQL", onClick: function () { return goToSql(_this.segmentsQueryManager.getLastQuery().query); } })),
            this.renderSegmentsTable());
    };
    return SegmentsView;
}(React.Component));
exports.SegmentsView = SegmentsView;
