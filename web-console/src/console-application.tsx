/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import axios from 'axios';
import * as React from 'react';
import * as classNames from 'classnames';
import { HashRouter, Route, Switch } from "react-router-dom";
import { HeaderBar, HeaderActiveTab } from './components/header-bar';
import { HomeView } from './views/home-view';
import { ServersView } from './views/servers-view';
import { DataSourcesView } from './views/data-source-view';
import { TasksView } from './views/tasks-view';
import { SegmentsView } from './views/segments-view';
import { SqlView } from './views/sql-view';
import { PropertyView } from "./views/property-view";
import "./console-application.scss";

export interface ConsoleApplicationProps extends React.Props<any> {
  version: string;
}

export interface ConsoleApplicationState {
  aboutDialogOpen: boolean;
}

export class ConsoleApplication extends React.Component<ConsoleApplicationProps, ConsoleApplicationState> {
  private taskId: string | null;
  private dataSource: string | null;
  private onlyUnavailable: boolean | null;
  private initSql: string | null;

  constructor(props: ConsoleApplicationProps, context: any) {
    super(props, context);
    this.state = {
      aboutDialogOpen: false
    };
  }

  componentDidUpdate(prevProps: Readonly<ConsoleApplicationProps>, prevState: Readonly<ConsoleApplicationState>, snapshot?: any): void {
    this.taskId = null;
    this.dataSource = null;
    this.onlyUnavailable = null;
    this.initSql = null;
  }

  private goToTask = (taskId: string) => {
    this.taskId = taskId;
    window.location.hash = 'tasks';
  }

  private goToSegments = (dataSource: string, onlyUnavailable = false) => {
    this.dataSource = dataSource;
    this.onlyUnavailable = onlyUnavailable;
    window.location.hash = 'segments';
  }

  private goToSql = (initSql: string) => {
    this.initSql = initSql;
    window.location.hash = 'sql'
  }

  render() {
    const wrapInViewContainer = (active: HeaderActiveTab, el: JSX.Element) => {
      return <>
        <HeaderBar active={active}/>
        <div className="view-container">{el}</div>
      </>;
    };

    return <HashRouter hashType="noslash">
      <div className="console-application">
        <Switch>
          <Route path="/datasources" component={() => {
            return wrapInViewContainer('datasources', <DataSourcesView goToSql={this.goToSql} goToSegments={this.goToSegments}/>);
          }} />
          <Route path="/segments" component={() => {
            return wrapInViewContainer('segments', <SegmentsView goToSql={this.goToSql} dataSource={this.dataSource} onlyUnavailable={this.onlyUnavailable}/>);
          }} />
          <Route path="/tasks" component={() => {
            return wrapInViewContainer('tasks', <TasksView taskId={this.taskId} goToSql={this.goToSql}/>);
          }} />
          <Route path="/servers" component={() => {
            return wrapInViewContainer('servers', <ServersView goToSql={this.goToSql} goToTask={this.goToTask}/>);
          }} />
          <Route path="/sql" component={() => {
            return wrapInViewContainer('sql', <SqlView initSql={this.initSql}/>);
          }} />
          <Route path="/property" component={() => {
            return wrapInViewContainer( 'property', <PropertyView />);
          }} />
          <Route component={() => {
            return wrapInViewContainer(null, <HomeView/>)
          }} />
        </Switch>
      </div>
    </HashRouter>
  }
}

