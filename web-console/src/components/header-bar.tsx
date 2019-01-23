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

import * as React from 'react';
import {
  FormGroup,
  Button,
  InputGroup,
  Dialog,
  NumericInput,
  Classes,
  Tooltip,
  AnchorButton,
  TagInput,
  Intent,
  ButtonGroup,
  HTMLSelect, NavbarGroup, Alignment, NavbarHeading, NavbarDivider, Popover, Position, Navbar, Menu, MenuItem
} from "@blueprintjs/core";
import { AboutDialog } from "../dialogs/about-dialog";
import { RuntimePropertyDialog } from '../dialogs/runtime-property-dialog';
import "./header-bar.scss";

export type HeaderActiveTab = null | 'datasources' | 'segments' | 'tasks' | 'servers' | 'sql' | 'property';

export interface HeaderBarProps extends React.Props<any> {
  active: HeaderActiveTab;
}

export interface HeaderBarState {
  aboutDialogOpen: boolean;
  runtimePropertiesDialogOpen: boolean;
}

export class HeaderBar extends React.Component<HeaderBarProps, HeaderBarState> {
  constructor(props: HeaderBarProps) {
    super(props);
    this.state = {
      aboutDialogOpen: false,
      runtimePropertiesDialogOpen: false
    };
  }

  render() {
    const { active } = this.props;
    const { aboutDialogOpen, runtimePropertiesDialogOpen } = this.state;

    const legacyMenu = <Menu>
      <MenuItem icon="graph" text="Legacy coordinator console" href="/legacy-coordinator-console.html" target="_blank" />
      <MenuItem icon="map" text="Legacy overlord console" href="/legacy-overlord-console.html" target="_blank" />
      <MenuItem icon="th" text="Legacy coordinator console (old)" href="/old-console/" target="_blank" />
    </Menu>;

    const helpMenu  = <Menu>
      <MenuItem icon="graph" text="About" onClick={() => this.setState({ aboutDialogOpen: true })} />
      <MenuItem icon="th" text="Apache Druid docs" href="http://druid.io/docs/latest" target="_blank" />
      <MenuItem icon="git-branch" text="Apache Druid GitHub" href="https://github.com/apache/incubator-druid" target="_blank" />
    </Menu>;

    const configMenu = <Menu>
      <MenuItem text="Cluster config" onClick={() => this.setState({ runtimePropertiesDialogOpen: true })}/>
      <MenuItem text="Property" href="#property" active={active === 'property'} />
      <MenuItem text="Lookups"/>
    </Menu>

    return <Navbar className="header-bar">
      <NavbarGroup align={Alignment.LEFT}>
        <a href="#"><NavbarHeading>Druid Console</NavbarHeading></a>
        <NavbarDivider />
        <AnchorButton className={Classes.MINIMAL} icon="multi-select" text="Datasources" href="#datasources" active={active === 'datasources'} />
        <AnchorButton className={Classes.MINIMAL} icon="full-stacked-chart" text="Segments" href="#segments" active={active === 'segments'} />
        <AnchorButton className={Classes.MINIMAL} icon="gantt-chart" text="Tasks" href="#tasks" active={active === 'tasks'} />
        <AnchorButton className={Classes.MINIMAL} icon="database" text="Servers" href="#servers" active={active === 'servers'} />
        <NavbarDivider />
        <AnchorButton className={Classes.MINIMAL} icon="console" text="SQL" href="#sql" active={active === 'sql'} />
        <Popover content={configMenu} position={Position.BOTTOM_LEFT}>
          <Button className={Classes.MINIMAL} icon="settings" text="Config"/>
        </Popover>
      </NavbarGroup>
      <NavbarGroup align={Alignment.RIGHT}>
        <Popover content={legacyMenu} position={Position.BOTTOM_LEFT}>
          <Button className={Classes.MINIMAL} icon="share" text="Legacy" />
        </Popover>
        <Popover content={helpMenu} position={Position.BOTTOM_LEFT}>
          <Button className={Classes.MINIMAL} icon="info-sign" text="Help" />
        </Popover>
      </NavbarGroup>
      <AboutDialog
        isOpen={aboutDialogOpen}
        onClose={() => this.setState({ aboutDialogOpen: false })}
      />
      <RuntimePropertyDialog
        isOpen={runtimePropertiesDialogOpen}
        onClose={() => this.setState({ runtimePropertiesDialogOpen: false })}
      />
    </Navbar>;
  }
}
