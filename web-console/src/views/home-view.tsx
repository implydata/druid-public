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
import "./home-view.scss";
import { QueryManager } from '../utils';

export interface HomeViewProps extends React.Props<any> {
}


interface DataCount {
  dataSourceCount: number,
  segmentCount: number,
  runningTaskCount: number,
  pendingTaskCount: number,
  completeTaskCount: number,
  serverCount: number,
  middleManagerCount: number
}

export interface HomeViewState {
  statusLoading: boolean;
  status: any;
  statusError: string | null;
  dataCount: Partial<DataCount>;
}

export class HomeView extends React.Component<HomeViewProps, HomeViewState> {
  private statusQueryManager: QueryManager<string, any>;
  private countQueryManager: QueryManager<string[],any>;

  constructor(props: HomeViewProps, context: any) {
    super(props, context);
    this.state = {
      statusLoading: true,
      status: null,
      statusError: null,
      dataCount: {}
    };
  }

  componentDidMount(): void {
    this.statusQueryManager = new QueryManager({
      processQuery: async (query) => {
        const statusResp = await axios.get('/status');
        return statusResp.data;
      },
      onStateChange: ({ result, loading, error }) => {
        this.setState({
          status: result,
          statusLoading: loading,
          statusError: error
        });
      }
    });

    this.countQueryManager = new QueryManager({
      processQuery: async (queries) => {
        const dataSourceResp = await axios.post("/druid/v2/sql", { query: queries[0] });
        const segmentResp = await axios.post("/druid/v2/sql", { query: queries[1] });
        const taskResp = await axios.post("/druid/v2/sql", { query: queries[2] });
        const serverResp = await axios.post("/druid/v2/sql", { query: queries[3] });
        const workerResp = await axios.get("/druid/indexer/v1/workers");
        const dataSourceCount = dataSourceResp.data.length;
        const segmentCount = segmentResp.data[0].EXPR$0;
        let successTaskCount = 0;
        let failedTaskCount = 0;
        let runningTaskCount = 0;
        for (let status of taskResp.data) {
          if (status.status === "SUCCESS") {
            successTaskCount++;
          } else if (status.status === "FAILED") {
            failedTaskCount++;
          } else {
            runningTaskCount++;
          }
        }
        const serverCount = serverResp.data[0].EXPR$0;
        const workerCount = workerResp.data.length;
        const dataCount: DataCount = {
          dataSourceCount: dataSourceCount,
          segmentCount: segmentCount,
          runningTaskCount: runningTaskCount,
          pendingTaskCount: failedTaskCount,
          completeTaskCount: successTaskCount,
          serverCount: serverCount,
          middleManagerCount: workerCount
        }
        console.log("1",dataSourceResp);
        console.log("2",segmentResp);
        console.log("3",taskResp);
        console.log("4", serverResp);
        console.log("5",workerResp);
        return dataCount;
      },
      onStateChange: ({ result, loading, error }) => {
        this.setState({
          dataCount: result
        });
      }
    })

    const dataSourceQuery:string = `SELECT datasource FROM sys.segments GROUP BY 1`;
    // const dataSourceQuery:string = `SELECT COUNT (DISTINCT datasource) FROM sys.segments`;
    const segmentQuery:string = `SELECT COUNT(*) FROM sys.segments`;
    const taskQuery:string = `SELECT status FROM sys.tasks`;
    const serverQuery: string = `SELECT COUNT(*) FROM sys.servers WHERE "server_type" = 'historical'`;

    const queries: string[] = [dataSourceQuery, segmentQuery, taskQuery, serverQuery];

    this.statusQueryManager.runQuery("dummy");
    this.countQueryManager.runQuery(queries);
  }

  componentWillUnmount(): void {
    this.statusQueryManager.terminate();
  }

  render() {
    const { status, statusLoading, statusError, dataCount } = this.state;

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
          <p>{dataCount == null ? "Loading..." : `${dataCount.dataSourceCount} datasources`}</p>
        </Card>
      </a>
      <a href="#segments">
        <Card interactive={true}>
          <H5>Segments</H5>
          <p>{dataCount == null ? "Loading..." : `${dataCount.segmentCount} segments`}</p>
        </Card>
      </a>
      <a href="#tasks">
        <Card interactive={true}>
          <H5>Tasks</H5>
          <p>{dataCount == null ? "Loading..." : `${dataCount.runningTaskCount} running tasks`}</p>
          <p>{dataCount == null ? "Loading..." : `${dataCount.pendingTaskCount} pending tasks`}</p>
          <p>{dataCount == null ? "Loading..." : `${dataCount.completeTaskCount} completed tasks`}</p>
        </Card>
      </a>
      <a href="#servers">
        <Card interactive={true}>
          <H5>Servers</H5>
          <p>{dataCount == null ? "Loading..." : `${dataCount.serverCount} data servers`}</p>
          <p>{dataCount == null ? "Loading..." : `${dataCount.middleManagerCount} middle managers`}</p>
        </Card>
      </a>
    </div>
  }
}

