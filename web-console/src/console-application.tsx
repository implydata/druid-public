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
import { DatasourcesView } from './views/datasource-view';
import { TasksView } from './views/tasks-view';
import { SegmentsView } from './views/segments-view';
import { SqlView } from './views/sql-view';
import "./console-application.scss";

export interface ConsoleApplicationProps extends React.Props<any> {
  version: string;
}

export interface ConsoleApplicationState {
  aboutDialogOpen: boolean;
}

export class ConsoleApplication extends React.Component<ConsoleApplicationProps, ConsoleApplicationState> {
  private taskId: string | null;
  private datasource: string | null;
  private onlyUnavailable: boolean | null;
  private initSql: string | null;
  private middleManager: string | null;

  constructor(props: ConsoleApplicationProps, context: any) {
    super(props, context);
    this.state = {
      aboutDialogOpen: false
    };
  }

  private resetInitialsDelay() {
    setTimeout(() => {
      this.taskId = null;
      this.datasource = null;
      this.onlyUnavailable = null;
      this.initSql = null;
      this.middleManager = null;
    }, 50);
  }

  private goToTask = (taskId: string) => {
    this.taskId = taskId;
    window.location.hash = 'tasks';
    this.resetInitialsDelay();
  }

  private goToSegments = (datasource: string, onlyUnavailable = false) => {
    this.datasource = datasource;
    this.onlyUnavailable = onlyUnavailable;
    window.location.hash = 'segments';
    this.resetInitialsDelay();
  }

  private goToMiddleManager = (middleManager: string) => {
    this.middleManager = middleManager;
    window.location.hash = 'servers';
    this.resetInitialsDelay();
  }

  private goToSql = (initSql: string) => {
    this.initSql = initSql;
    window.location.hash = 'sql';
    this.resetInitialsDelay();
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
            return wrapInViewContainer('datasources', <DatasourcesView goToSql={this.goToSql} goToSegments={this.goToSegments}/>);
          }} />
          <Route path="/segments" component={() => {
            return wrapInViewContainer('segments', <SegmentsView goToSql={this.goToSql} datasource={this.datasource} onlyUnavailable={this.onlyUnavailable}/>);
          }} />
          <Route path="/tasks" component={() => {
            return wrapInViewContainer('tasks', <TasksView taskId={this.taskId} goToSql={this.goToSql} goToMiddleManager={this.goToMiddleManager}/>);
          }} />
          <Route path="/servers" component={() => {
            return wrapInViewContainer('servers', <ServersView goToSql={this.goToSql} goToTask={this.goToTask}/>);
          }} />
          <Route path="/sql" component={() => {
            return wrapInViewContainer('sql', <SqlView initSql={this.initSql}/>);
          }} />
          <Route component={() => {
            return wrapInViewContainer(null, <HomeView/>)
          }} />
        </Switch>
      </div>
    </HashRouter>
  }
}

