"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var axios_1 = require("axios");
var React = require("react");
var react_table_1 = require("react-table");
var d3_array_1 = require("d3-array");
var core_1 = require("@blueprintjs/core");
var utils_1 = require("../utils");
function formatQueues(segmentsToLoad, segmentsToLoadSize, segmentsToDrop, segmentsToDropSize) {
    var queueParts = [];
    if (segmentsToLoad) {
        queueParts.push(segmentsToLoad + " segments to load (" + utils_1.formatBytesCompact(segmentsToLoadSize) + ")");
    }
    if (segmentsToDrop) {
        queueParts.push(segmentsToDrop + " segments to drop (" + utils_1.formatBytesCompact(segmentsToDropSize) + ")");
    }
    return queueParts.join(', ') || 'Empty queues';
}
var ServersView = (function (_super) {
    tslib_1.__extends(ServersView, _super);
    function ServersView(props, context) {
        var _this = _super.call(this, props, context) || this;
        _this.state = {
            serversLoading: true,
            servers: null,
            serverFilter: [],
            groupByTier: false,
            middleManagersLoading: true,
            middleManagers: null,
            middleManagerFilter: []
        };
        _this.serverQueryManager = new utils_1.QueryManager({
            processQuery: function (query) { return tslib_1.__awaiter(_this, void 0, void 0, function () {
                var serversResponse, loadQueueResponse, servers, loadQueues;
                return tslib_1.__generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4, axios_1.default.post("/druid/v2/sql", { query: query })];
                        case 1:
                            serversResponse = _a.sent();
                            return [4, axios_1.default.get("/druid/coordinator/v1/loadqueue?simple")];
                        case 2:
                            loadQueueResponse = _a.sent();
                            servers = serversResponse.data;
                            loadQueues = loadQueueResponse.data;
                            return [2, servers.map(function (s) {
                                    var loadQueueInfo = loadQueues[s.server];
                                    if (loadQueueInfo) {
                                        s = Object.assign(s, loadQueueInfo);
                                    }
                                    return s;
                                })];
                    }
                });
            }); },
            onStateChange: function (_a) {
                var result = _a.result, loading = _a.loading, error = _a.error;
                if (!_this.mounted)
                    return;
                _this.setState({
                    servers: result,
                    serversLoading: loading
                });
            }
        });
        _this.serverQueryManager.runQuery("SELECT\n  \"tier\", \"server\", \"host\", \"plaintext_port\", \"tls_port\", \"curr_size\", \"max_size\"\nFROM sys.servers\nWHERE \"server_type\" = 'historical'");
        _this.middleManagerQueryManager = new utils_1.QueryManager({
            processQuery: function (query) {
                return axios_1.default.get("/druid/indexer/v1/workers")
                    .then(function (response) { return response.data; });
            },
            onStateChange: function (_a) {
                var result = _a.result, loading = _a.loading, error = _a.error;
                if (!_this.mounted)
                    return;
                _this.setState({
                    middleManagers: result,
                    middleManagersLoading: loading
                });
            }
        });
        _this.middleManagerQueryManager.runQuery('dummy');
        return _this;
    }
    ServersView.prototype.componentDidMount = function () {
        this.mounted = true;
    };
    ServersView.prototype.componentWillUnmount = function () {
        this.mounted = false;
    };
    ServersView.prototype.renderServersTable = function () {
        var _this = this;
        var _a = this.state, servers = _a.servers, serversLoading = _a.serversLoading, serverFilter = _a.serverFilter, groupByTier = _a.groupByTier;
        var fillIndicator = function (value) {
            return React.createElement("div", { className: "fill-indicator", style: {
                    width: '100%',
                    height: '100%',
                    backgroundColor: '#dadada',
                    borderRadius: '2px'
                } },
                React.createElement("div", { style: {
                        width: value * 100 + "%",
                        height: '100%',
                        backgroundColor: '#85cc00',
                        borderRadius: '2px',
                        transition: 'all .2s ease-out'
                    } }));
        };
        return React.createElement(react_table_1.default, { data: servers || [], loading: serversLoading, filterable: true, filtered: serverFilter, onFilteredChange: function (filtered, column) {
                _this.setState({ serverFilter: filtered });
            }, pivotBy: groupByTier ? ["tier"] : [], columns: [
                {
                    Header: "Tier",
                    accessor: "tier",
                    Filter: utils_1.makeTextFilter(),
                    Cell: function (row) {
                        var value = row.value;
                        return React.createElement("a", { onClick: function () { _this.setState({ serverFilter: utils_1.addFilter(serverFilter, 'tier', value) }); } }, value);
                    }
                },
                {
                    Header: "Server",
                    accessor: "server",
                    width: 300,
                    Filter: utils_1.makeTextFilter()
                },
                {
                    Header: "Size",
                    id: 'size',
                    width: 100,
                    filterable: false,
                    accessor: function (row) { return row.max_size ? (row.curr_size / row.max_size) : null; },
                    Aggregated: function (row) {
                        var originals = row.subRows.map(function (r) { return r._original; });
                        var totalCurr = d3_array_1.sum(originals, function (s) { return s.currSize; });
                        var totalMax = d3_array_1.sum(originals, function (s) { return s.currMax; });
                        return fillIndicator(totalCurr / totalMax);
                    },
                    Cell: function (row) {
                        if (row.aggregated)
                            return '';
                        if (row.value === null)
                            return '';
                        return fillIndicator(row.value);
                    }
                },
                {
                    Header: "Load/drop queues",
                    id: 'queue',
                    width: 400,
                    filterable: false,
                    accessor: function (row) { return (row.segmentsToLoad || 0) + (row.segmentsToDrop || 0); },
                    Cell: (function (row) {
                        if (row.aggregated)
                            return '';
                        var _a = row.original, segmentsToLoad = _a.segmentsToLoad, segmentsToLoadSize = _a.segmentsToLoadSize, segmentsToDrop = _a.segmentsToDrop, segmentsToDropSize = _a.segmentsToDropSize;
                        return formatQueues(segmentsToLoad, segmentsToLoadSize, segmentsToDrop, segmentsToDropSize);
                    }),
                    Aggregated: function (row) {
                        var originals = row.subRows.map(function (r) { return r._original; });
                        var segmentsToLoad = d3_array_1.sum(originals, function (s) { return s.segmentsToLoad; });
                        var segmentsToLoadSize = d3_array_1.sum(originals, function (s) { return s.segmentsToLoadSize; });
                        var segmentsToDrop = d3_array_1.sum(originals, function (s) { return s.segmentsToDrop; });
                        var segmentsToDropSize = d3_array_1.sum(originals, function (s) { return s.segmentsToDropSize; });
                        return formatQueues(segmentsToLoad, segmentsToLoadSize, segmentsToDrop, segmentsToDropSize);
                    },
                },
                {
                    Header: "Host",
                    accessor: "host",
                    Filter: utils_1.makeTextFilter(),
                    Aggregated: function () { return ''; }
                },
                {
                    Header: "Port",
                    id: 'port',
                    Filter: utils_1.makeTextFilter(),
                    accessor: function (row) {
                        var ports = [];
                        if (row.plaintext_port !== -1) {
                            ports.push(row.plaintext_port + " (plain)");
                        }
                        if (row.tls_port !== -1) {
                            ports.push(row.tls_port + " (TLS)");
                        }
                        return ports.join(', ') || 'No port';
                    },
                    Aggregated: function () { return ''; }
                },
            ], defaultPageSize: 10, className: "-striped -highlight" });
    };
    ServersView.prototype.renderMiddleManagerTable = function () {
        var _this = this;
        var goToTask = this.props.goToTask;
        var _a = this.state, middleManagers = _a.middleManagers, middleManagersLoading = _a.middleManagersLoading, middleManagerFilter = _a.middleManagerFilter;
        return React.createElement(react_table_1.default, { data: middleManagers || [], loading: middleManagersLoading, filterable: true, filtered: middleManagerFilter, onFilteredChange: function (filtered, column) {
                _this.setState({ middleManagerFilter: filtered });
            }, columns: [
                {
                    Header: "Host",
                    id: "host",
                    accessor: function (row) { return row.worker.host; },
                    Filter: utils_1.makeTextFilter(),
                    Cell: function (row) {
                        var value = row.value;
                        return React.createElement("a", { onClick: function () { _this.setState({ middleManagerFilter: utils_1.addFilter(middleManagerFilter, 'host', value) }); } }, value);
                    }
                },
                {
                    Header: "Usage",
                    id: "usage",
                    accessor: function (row) { return row.currCapacityUsed + " / " + row.worker.capacity; },
                    filterable: false,
                    Filter: utils_1.makeTextFilter()
                },
                {
                    Header: "Availability groups",
                    id: "availabilityGroups",
                    accessor: function (row) { return row.availabilityGroups.length; },
                    filterable: false,
                    Filter: utils_1.makeTextFilter(),
                },
                {
                    Header: "Last completed task time",
                    accessor: "lastCompletedTaskTime",
                    Filter: utils_1.makeTextFilter()
                },
                {
                    Header: "Blacklisted until",
                    accessor: "blacklistedUntil",
                    Filter: utils_1.makeTextFilter()
                }
            ], defaultPageSize: 10, className: "-striped -highlight", SubComponent: function (rowInfo) {
                var runningTasks = rowInfo.original.runningTasks;
                return React.createElement("div", { style: { padding: "20px" } },
                    React.createElement("span", null, "Running tasks:"),
                    React.createElement("ul", null, runningTasks.map(function (t) { return React.createElement("li", { key: t },
                        React.createElement("a", { onClick: function () { return goToTask(t); } }, t)); })));
            } });
    };
    ServersView.prototype.render = function () {
        var _this = this;
        var goToSql = this.props.goToSql;
        var groupByTier = this.state.groupByTier;
        return React.createElement("div", { className: "servers-view app-view" },
            React.createElement("div", { className: "control-bar" },
                React.createElement(core_1.H1, null, "Data servers"),
                React.createElement(core_1.Button, { rightIcon: "refresh", text: "Refresh", onClick: function () { return _this.serverQueryManager.rerunLastQuery(); } }),
                React.createElement(core_1.Button, { rightIcon: "share", text: "Go to SQL", onClick: function () { return goToSql(_this.serverQueryManager.getLastQuery()); } }),
                React.createElement(core_1.Switch, { checked: groupByTier, label: "Group by tier", onChange: function () { return _this.setState({ groupByTier: !groupByTier }); } })),
            this.renderServersTable(),
            React.createElement("div", { className: "control-bar" },
                React.createElement(core_1.H1, null, "MiddleManagers"),
                React.createElement(core_1.Button, { rightIcon: "refresh", text: "Refresh", onClick: function () { return _this.middleManagerQueryManager.rerunLastQuery(); } })),
            this.renderMiddleManagerTable());
    };
    return ServersView;
}(React.Component));
exports.ServersView = ServersView;
