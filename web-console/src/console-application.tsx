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
import { HashRouter, Route, Link } from "react-router-dom";

import {
  Alignment,
  Button,
  Classes,
  Menu,
  MenuItem,
  Navbar,
  NavbarDivider,
  NavbarGroup,
  NavbarHeading,
  Popover,
  AnchorButton,
  Position,
  Dialog,
  Tooltip,
  Intent
} from "@blueprintjs/core";

import { HomeView } from './views/home-view';
import { ServersView } from './views/servers-view';
import { DataSourcesView } from './views/data-source-view';
import { TasksView } from './views/tasks-view';
import { SegmentsView } from './views/segments-view';
import { SqlView } from './views/sql-view';

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

  private handleOpen = () => this.setState({ aboutDialogOpen: true });
  private handleClose = () => this.setState({ aboutDialogOpen: false });

  renderAboutDialog() {
    const { aboutDialogOpen } = this.state;

    return <Dialog
      icon="info-sign"
      onClose={this.handleClose}
      title="Apache Druid console"
      isOpen={aboutDialogOpen}
      usePortal={true}
      canEscapeKeyClose={true}
    >
      <div className={Classes.DIALOG_BODY}>
        <p>
          <strong>
            Blah
          </strong>
        </p>
        <p>
          Hello
        </p>
        <p>How are you.</p>
      </div>
      <div className={Classes.DIALOG_FOOTER}>
        <div className={Classes.DIALOG_FOOTER_ACTIONS}>
          <Tooltip content="This button is hooked up to close the dialog.">
            <Button onClick={this.handleClose}>Close</Button>
          </Tooltip>
          <AnchorButton
            intent={Intent.PRIMARY}
            href="http://druid.io"
            target="_blank"
          >
            Visit Druid
          </AnchorButton>
        </div>
      </div>
    </Dialog>;
  }

  render() {
    const legacyMenu = <Menu>
      <MenuItem icon="graph" text="Legacy coordinator console" href="/legacy-coordinator-console.html" target="_blank" />
      <MenuItem icon="map" text="Legacy overlord console" href="/legacy-overlord-console.html" target="_blank" />
      <MenuItem icon="th" text="Legacy coordinator console (old)" href="/old-console/" target="_blank" />
    </Menu>;

    const helpMenu  = <Menu>
      <MenuItem icon="graph" text="About" onClick={this.handleOpen} />
      <MenuItem icon="th" text="Apache Druid docs" href="http://druid.io/docs/latest" target="_blank" />
      <MenuItem icon="git-branch" text="Apache Druid GitHub" href="https://github.com/apache/incubator-druid" target="_blank" />
    </Menu>;

    // Dark mode class: bp3-dark
    return <HashRouter hashType="noslash">
      <div className="console-application">
        <Navbar>
          <NavbarGroup align={Alignment.LEFT}>
            <a href="#"><NavbarHeading>Druid Console</NavbarHeading></a>
            <NavbarDivider />
            <AnchorButton className={Classes.MINIMAL} icon="multi-select" text="Datasources" href="#datasources" />
            <AnchorButton className={Classes.MINIMAL} icon="full-stacked-chart" text="Segments" href="#segments" />
            <AnchorButton className={Classes.MINIMAL} icon="gantt-chart" text="Tasks" href="#tasks" />
            <AnchorButton className={Classes.MINIMAL} icon="database" text="Servers" href="#servers" />
            <NavbarDivider />
            <AnchorButton className={Classes.MINIMAL} icon="console" text="SQL" href="#sql" />
          </NavbarGroup>
          <NavbarGroup align={Alignment.RIGHT}>
            <Popover content={legacyMenu} position={Position.BOTTOM_LEFT}>
              <Button className={Classes.MINIMAL} icon="share" text="Legacy" />
            </Popover>
            <Popover content={helpMenu} position={Position.BOTTOM_LEFT}>
              <Button className={Classes.MINIMAL} icon="info-sign" text="Help" />
            </Popover>
          </NavbarGroup>
        </Navbar>
        <div className="view-container">
          <Route path="/" exact component={HomeView} />
          <Route path="/datasources" component={() => <DataSourcesView goToSql={this.goToSql} goToSegments={this.goToSegments}/>} />
          <Route path="/segments" component={() => <SegmentsView goToSql={this.goToSql} dataSource={this.dataSource} onlyUnavailable={this.onlyUnavailable}/>} />
          <Route path="/tasks" component={() => <TasksView taskId={this.taskId} goToSql={this.goToSql}/>} />
          <Route path="/servers" component={() => <ServersView goToSql={this.goToSql} goToTask={this.goToTask}/>} />
          <Route path="/sql" component={() => <SqlView initSql={this.initSql}/>} />
        </div>
        {this.renderAboutDialog()}
      </div>
    </HashRouter>
  }
}

