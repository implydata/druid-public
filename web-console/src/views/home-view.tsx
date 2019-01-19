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
import ReactTable from "react-table";
import { Filter } from "react-table";

import {
  H1, H5,
  Card
} from "@blueprintjs/core";

export interface HomeViewProps extends React.Props<any> {
}

export interface HomeViewState {
  statusLoading: boolean;
  status: any;
  statusError: string | null;
}

export class HomeView extends React.Component<HomeViewProps, HomeViewState> {
  constructor(props: HomeViewProps, context: any) {
    super(props, context);
    this.state = {
      statusLoading: true,
      status: null,
      statusError: null
    };

    axios.get('/status')
      .then((response) => {
        this.setState({
          statusLoading: false,
          status: response.data,
          statusError: null
        });
      })
      .catch((error) => {
        this.setState({
          statusLoading: false,
          status: null,
          statusError: error.message
        });
        console.log(error);
      });
  }

  render() {
    const { status, statusLoading, statusError } = this.state;

    return <div className="home-view app-view">
      <a href="/status">
        <Card interactive={true}>
          <H5>Status</H5>
          <p>{statusLoading ? `Loading status...` : (statusError ? statusError : `Apache Druid is running version ${status.version}`)}</p>
        </Card>
      </a>
      <a href="#datasources">
        <Card interactive={true}>
          <H5>Datasources</H5>
          <p>12 datasources</p>
        </Card>
      </a>
      <a href="#segments">
        <Card interactive={true}>
          <H5>Segments</H5>
          <p>120 segments</p>
          <p>34 time chunks</p>
        </Card>
      </a>
      <a href="#tasks">
        <Card interactive={true}>
          <H5>Tasks</H5>
          <p>12 running tasks</p>
          <p>7 pending tasks</p>
          <p>5 recently completed tasks</p>
        </Card>
      </a>
      <a href="#servers">
        <Card interactive={true}>
          <H5>Servers</H5>
          <p>3 Data servers</p>
          <p>3 MiddleManagers</p>
        </Card>
      </a>
    </div>
  }
}

