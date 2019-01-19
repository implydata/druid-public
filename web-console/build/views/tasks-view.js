"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var axios_1 = require("axios");
var React = require("react");
var react_table_1 = require("react-table");
var core_1 = require("@blueprintjs/core");
var utils_1 = require("../utils");
function statusToColor(status) {
    switch (status) {
        case 'RUNNING': return '#2167d5';
        case 'PENDING': return '#ffbf00';
        case 'SUCCESS': return '#57d500';
        case 'FAILED': return '#d5100a';
        default: return '#0a1500';
    }
}
var TasksView = (function (_super) {
    tslib_1.__extends(TasksView, _super);
    function TasksView(props, context) {
        var _this = _super.call(this, props, context) || this;
        _this.state = {
            loadingSupervisors: true,
            supervisors: [],
            loadingTasks: true,
            tasks: null,
            taskFilter: props.taskId ? [{ id: 'task_id', value: props.taskId }] : []
        };
        _this.supervisorQueryManager = new utils_1.QueryManager({
            processQuery: function (query) {
                return axios_1.default.get("/druid/indexer/v1/supervisor?full")
                    .then(function (response) { return response.data; });
            },
            onStateChange: function (_a) {
                var result = _a.result, loading = _a.loading, error = _a.error;
                if (!_this.mounted)
                    return;
                _this.setState({
                    supervisors: result,
                    loadingSupervisors: loading
                });
            }
        });
        _this.supervisorQueryManager.runQuery('dummy');
        _this.taskQueryManager = new utils_1.QueryManager({
            processQuery: function (query) {
                return axios_1.default.post("/druid/v2/sql", { query: query })
                    .then(function (response) { return response.data; });
            },
            onStateChange: function (_a) {
                var result = _a.result, loading = _a.loading, error = _a.error;
                if (!_this.mounted)
                    return;
                _this.setState({
                    tasks: result,
                    loadingTasks: loading
                });
            }
        });
        _this.taskQueryManager.runQuery("SELECT\n  \"task_id\", \"type\", \"datasource\", \"created_time\", \"status\", \"runner_status\"\nFROM sys.tasks");
        return _this;
    }
    TasksView.prototype.componentDidMount = function () {
        this.mounted = true;
    };
    TasksView.prototype.componentWillUnmount = function () {
        this.mounted = false;
    };
    TasksView.prototype.killTask = function (taskId) {
        alert("Killing task " + taskId);
    };
    TasksView.prototype.renderSupervisorTable = function () {
        var _this = this;
        var _a = this.state, supervisors = _a.supervisors, loadingSupervisors = _a.loadingSupervisors;
        return React.createElement(react_table_1.default, { data: supervisors || [], loading: loadingSupervisors, filterable: true, columns: [
                {
                    Header: "Data source",
                    accessor: "id",
                    id: 'datasource',
                    width: 300,
                    Filter: utils_1.makeTextFilter()
                },
                {
                    Header: "Status",
                    id: 'status',
                    accessor: function (row) { return row.spec.suspended ? 'suspended' : 'running'; },
                    Filter: utils_1.makeTextFilter(),
                    Cell: function (row) {
                        var value = row.value;
                        return React.createElement("span", { style: { color: value === 'suspended' ? '#d58512' : '#2167d5' } }, value);
                    }
                },
                {
                    Header: 'Actions',
                    id: 'actions',
                    accessor: 'id',
                    width: 300,
                    filterable: false,
                    Cell: function (row) {
                        var id = row.value;
                        return React.createElement("div", null,
                            React.createElement("a", { href: "/druid/indexer/v1/supervisor/" + id, target: "_blank" }, "payload"),
                            "\u00A0\u00A0\u00A0",
                            React.createElement("a", { href: "/druid/indexer/v1/supervisor/" + id + "/status", target: "_blank" }, "status"),
                            "\u00A0\u00A0\u00A0",
                            React.createElement("a", { href: "/druid/indexer/v1/supervisor/" + id + "/history", target: "_blank" }, "history"),
                            "\u00A0\u00A0\u00A0",
                            React.createElement("a", { onClick: function () { return _this.killTask(id); } }, "kill"));
                    }
                }
            ], defaultPageSize: 10, className: "-striped -highlight" });
    };
    TasksView.prototype.renderTaskTable = function () {
        var _this = this;
        var _a = this.state, tasks = _a.tasks, loadingTasks = _a.loadingTasks, taskFilter = _a.taskFilter;
        return React.createElement(react_table_1.default, { data: tasks || [], loading: loadingTasks, filterable: true, filtered: taskFilter, onFilteredChange: function (filtered, column) {
                _this.setState({ taskFilter: filtered });
            }, columns: [
                {
                    Header: "Task ID",
                    accessor: "task_id",
                    width: 300,
                    Filter: utils_1.makeTextFilter()
                },
                {
                    Header: "Type",
                    accessor: "type",
                    Filter: utils_1.makeTextFilter(),
                    Cell: function (row) {
                        var value = row.value;
                        return React.createElement("a", { onClick: function () { _this.setState({ taskFilter: utils_1.addFilter(taskFilter, 'type', value) }); } }, value);
                    }
                },
                {
                    Header: "Data source",
                    accessor: "datasource",
                    Filter: utils_1.makeTextFilter(),
                    Cell: function (row) {
                        var value = row.value;
                        return React.createElement("a", { onClick: function () { _this.setState({ taskFilter: utils_1.addFilter(taskFilter, 'datasource', value) }); } }, value);
                    }
                },
                {
                    Header: "Created time",
                    accessor: "created_time",
                    Filter: utils_1.makeTextFilter()
                },
                {
                    Header: "Status",
                    accessor: "status",
                    Filter: utils_1.makeTextFilter(),
                    Cell: function (row) {
                        var value = row.value;
                        return React.createElement("a", { onClick: function () { _this.setState({ taskFilter: utils_1.addFilter(taskFilter, 'status', value) }); } },
                            React.createElement("span", { style: { color: statusToColor(value) } }, "\u25CF\u00A0"),
                            value);
                    }
                },
                {
                    Header: "Runner status",
                    accessor: "runner_status",
                    Filter: utils_1.makeTextFilter()
                },
                {
                    Header: 'Actions',
                    id: 'actions',
                    accessor: 'task_id',
                    width: 300,
                    filterable: false,
                    Cell: function (row) {
                        var id = row.value;
                        return React.createElement("div", null,
                            React.createElement("a", { href: "/druid/indexer/v1/task/" + id, target: "_blank" }, "payload"),
                            "\u00A0\u00A0\u00A0",
                            React.createElement("a", { href: "/druid/indexer/v1/task/" + id + "/status", target: "_blank" }, "status"),
                            "\u00A0\u00A0\u00A0",
                            React.createElement("a", { href: "/druid/indexer/v1/task/" + id + "/log", target: "_blank" }, "log (all)"),
                            "\u00A0\u00A0\u00A0",
                            React.createElement("a", { href: "/druid/indexer/v1/task/" + id + "/log?offset=-8192", target: "_blank" }, "log (last 8kb)"),
                            "\u00A0\u00A0\u00A0",
                            React.createElement("a", { onClick: function () { return _this.killTask(id); } }, "kill"));
                    }
                }
            ], defaultPageSize: 20, className: "-striped -highlight" });
    };
    TasksView.prototype.render = function () {
        var _this = this;
        var goToSql = this.props.goToSql;
        return React.createElement("div", { className: "tasks-view app-view" },
            React.createElement("div", { className: "control-bar" },
                React.createElement(core_1.H1, null, "Supervisors"),
                React.createElement(core_1.Button, { rightIcon: "refresh", text: "Refresh", onClick: function () { return _this.supervisorQueryManager.rerunLastQuery(); } })),
            this.renderSupervisorTable(),
            React.createElement("div", { className: "control-bar" },
                React.createElement(core_1.H1, null, "Tasks"),
                React.createElement(core_1.Button, { rightIcon: "refresh", text: "Refresh", onClick: function () { return _this.taskQueryManager.rerunLastQuery(); } }),
                React.createElement(core_1.Button, { rightIcon: "share", text: "Go to SQL", onClick: function () { return goToSql(_this.taskQueryManager.getLastQuery()); } })),
            this.renderTaskTable());
    };
    return TasksView;
}(React.Component));
exports.TasksView = TasksView;
