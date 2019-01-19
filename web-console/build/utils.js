"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var core_1 = require("@blueprintjs/core");
var numeral = require("numeral");
var React = require("react");
function addFilter(filters, id, value) {
    var currentFilter = filters.find(function (f) { return f.id === id; });
    if (currentFilter) {
        filters = filters.filter(function (f) { return f.id !== id; });
        if (currentFilter.value !== value) {
            filters = filters.concat({ id: id, value: value });
        }
    }
    else {
        filters = filters.concat({ id: id, value: value });
    }
    return filters;
}
exports.addFilter = addFilter;
function makeTextFilter(placeholder) {
    if (placeholder === void 0) { placeholder = ''; }
    return function (_a) {
        var filter = _a.filter, onChange = _a.onChange, key = _a.key;
        var filterValue = filter ? filter.value : '';
        return React.createElement(core_1.InputGroup, { key: key, onChange: function (e) { return onChange(e.target.value); }, value: filterValue, rightElement: filterValue ? React.createElement(core_1.Button, { icon: "cross", intent: core_1.Intent.NONE, minimal: true, onClick: function () { return onChange(''); } }) : undefined, placeholder: placeholder });
    };
}
exports.makeTextFilter = makeTextFilter;
function makeBooleanFilter() {
    return function (_a) {
        var filter = _a.filter, onChange = _a.onChange, key = _a.key;
        var filterValue = filter ? filter.value : '';
        return React.createElement(core_1.HTMLSelect, { key: key, style: { width: '100%' }, onChange: function (event) { return onChange(event.target.value); }, value: filterValue || "all", fill: true },
            React.createElement("option", { value: "all" }, "Show all"),
            React.createElement("option", { value: "true" }, "true"),
            React.createElement("option", { value: "false" }, "false"));
    };
}
exports.makeBooleanFilter = makeBooleanFilter;
function formatNumber(n) {
    return numeral(n).format('0,0');
}
exports.formatNumber = formatNumber;
function formatBytes(n) {
    return numeral(n).format('0.00 b');
}
exports.formatBytes = formatBytes;
function formatBytesCompact(n) {
    return numeral(n).format('0.00b');
}
exports.formatBytesCompact = formatBytesCompact;
var QueryManager = (function () {
    function QueryManager(options) {
        this.state = {
            result: null,
            loading: false,
            error: null
        };
        this.currentQueryId = 0;
        this.processQuery = options.processQuery;
        this.onStateChange = options.onStateChange;
    }
    QueryManager.prototype.setState = function (queryState) {
        this.state = queryState;
        if (this.onStateChange)
            this.onStateChange(queryState);
    };
    QueryManager.prototype.runQuery = function (query) {
        var _this = this;
        this.currentQueryId++;
        var myQueryId = this.currentQueryId;
        this.setState({
            result: null,
            loading: true,
            error: null
        });
        this.lastQuery = query;
        this.processQuery(query)
            .then(function (result) {
            if (_this.currentQueryId !== myQueryId)
                return;
            _this.setState({
                result: result,
                loading: false,
                error: null
            });
        }, function (e) {
            if (_this.currentQueryId !== myQueryId)
                return;
            _this.setState({
                result: null,
                loading: false,
                error: e.message
            });
        });
    };
    QueryManager.prototype.getLastQuery = function () {
        return this.lastQuery;
    };
    QueryManager.prototype.getState = function () {
        return this.state;
    };
    QueryManager.prototype.rerunLastQuery = function () {
        this.runQuery(this.lastQuery);
    };
    return QueryManager;
}());
exports.QueryManager = QueryManager;
