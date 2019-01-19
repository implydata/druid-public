"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("es6-shim/es6-shim");
require("es7-shim");
var React = require("react");
var ReactDOM = require("react-dom");
var console_application_1 = require("./console-application");
var container = document.getElementsByClassName('app-container')[0];
if (!container)
    throw new Error('container not found');
ReactDOM.render(React.createElement(console_application_1.ConsoleApplication, {
    version: '0.0.1'
}), container);
