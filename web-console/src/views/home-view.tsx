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
import {render} from "react-dom";

interface DataCount {
  dataSourceCount: number,
  segmentCount: number,
  runningTaskCount: number,
  pendingTaskCount: number,
  successTaskCount: number,
  failedTaskCount: number,
  waitingTaskCount: number,
  dataServerCount: number,
  middleManagerCount: number
}

interface DataCountLoading {
  dataSourceCountLoading: boolean,
  segmentCountLoading: boolean,
  taskCountLoading: boolean,
  dataServerCountLoading: boolean,
  middleManagerCountLoading: boolean
}

export interface HomeViewProps extends React.Props<any> {
}

export interface HomeViewState {
  statusLoading: boolean;
  status: any;
  statusError: string | null;
  dataCount: Partial<DataCount>;
  dataCountLoading: DataCountLoading;
}

export class HomeView extends React.Component<HomeViewProps, HomeViewState> {
  private statusQueryManager: QueryManager<string, any>;
  private dataSourceQueryManager: QueryManager<string, any>;
  private segmentQueryManager: QueryManager<string, any>;
  private taskQueryManager: QueryManager<string, any>;
  private dataServerQueryManager: QueryManager<string, any>;
  private middleManagerQueryManager: QueryManager<string, any>;

  constructor(props: HomeViewProps, context: any) {
    super(props, context);
    this.state = {
      statusLoading: true,
      status: null,
      statusError: null,
      dataCount: {},
      dataCountLoading: {
        dataSourceCountLoading: true,
        segmentCountLoading: true,
        taskCountLoading: true,
        dataServerCountLoading: true,
        middleManagerCountLoading: true
      }
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

    this.statusQueryManager.runQuery("dummy");

    this.dataSourceQueryManager = new QueryManager({
      processQuery: async (query) => {
        const dataSourceResp = await axios.post("/druid/v2/sql", { query: query });
        const dataSourceCount = dataSourceResp.data.length;
        return dataSourceCount;
      },
      onStateChange: ({ result, loading, error }) => {
        this.setState({
            dataCount: {
              ...this.state.dataCount,
              dataSourceCount: result
            },
            dataCountLoading: {
              ...this.state.dataCountLoading,
              dataSourceCountLoading: loading
            }
          }
        )
      }
    });

    this.dataSourceQueryManager.runQuery("SELECT datasource FROM sys.segments GROUP BY 1");

    this.segmentQueryManager = new QueryManager({
      processQuery: async (query) => {
        const segmentResp = await axios.post("/druid/v2/sql", { query });
        const segmentCount = segmentResp.data[0].EXPR$0;
        return segmentCount;
      },
      onStateChange: ({ result, loading, error }) => {
        this.setState({
            dataCount: {
              ...this.state.dataCount,
              segmentCount: result
            },
            dataCountLoading: {
              ...this.state.dataCountLoading,
              segmentCountLoading: loading
            }
          }
        )
      }
    });

    this.segmentQueryManager.runQuery("SELECT COUNT(*) FROM sys.segments");

    this.taskQueryManager = new QueryManager({
      processQuery: async (query) => {
        const taskResp = await axios.post("/druid/v2/sql", { query });
        let successTaskCount = 0;
        let failedTaskCount = 0;
        let runningTaskCount = 0;
        let pendingTaskCount = 0;
        let waitingTaskCount = 0;
        for (let dataStatus of taskResp.data) {
          if (dataStatus.status === "SUCCESS") {
            successTaskCount++;
          } else if (dataStatus.status === "FAILED") {
            failedTaskCount++;
          } else if (dataStatus.status === "RUNNING") {
            runningTaskCount++;
          } else if (dataStatus.status === "WAITING") {
            waitingTaskCount++;
          } else {
            pendingTaskCount++;
          }
        }
        const taskCounts = {
          successTaskCount: successTaskCount,
          failedTaskCount: failedTaskCount,
          runningTaskCount: runningTaskCount,
          pendingTaskCount: pendingTaskCount,
          waitingTaskCount: waitingTaskCount
        }
        return taskCounts;
      },
      onStateChange: ({ result, loading, error }) => {
        if (result === null) return;
        this.setState({
            dataCount: {
              ...this.state.dataCount,
              successTaskCount: result.successTaskCount,
              failedTaskCount: result.failedTaskCount,
              runningTaskCount: result.runningTaskCount,
              pendingTaskCount: result.pendingTaskCount,
              waitingTaskCount: result.waitingTaskCount
            },
            dataCountLoading: {
              ...this.state.dataCountLoading,
              taskCountLoading: loading
            }
          }
        )
      }
    });

    this.taskQueryManager.runQuery("SELECT status FROM sys.tasks");

    this.dataServerQueryManager = new QueryManager({
      processQuery: async (query) => {
        const dataServerResp = await axios.post("/druid/v2/sql", { query });
        const dataServerCount = dataServerResp.data[0].EXPR$0;
        return dataServerCount;
      },
      onStateChange: ({ result, loading, error }) => {
        this.setState({
          dataCount: {
            ...this.state.dataCount,
            dataServerCount: result
          },
          dataCountLoading: {
            ...this.state.dataCountLoading,
            dataServerCountLoading: loading
          }
        });
      }
    });

    this.dataServerQueryManager.runQuery(`SELECT COUNT(*) FROM sys.servers WHERE "server_type" = 'historical'`);

    this.middleManagerQueryManager = new QueryManager({
      processQuery: async (query) => {
        const middleManagerResp = await axios.get("/druid/indexer/v1/workers");
        const middleManagerCount = middleManagerResp.data.length;
        return middleManagerCount;
      },
      onStateChange: ({ result, loading, error }) => {
        this.setState({
          dataCount: {
            ...this.state.dataCount,
            middleManagerCount: result
          },
          dataCountLoading: {
            ...this.state.dataCountLoading,
            middleManagerCountLoading: loading
          }
        });
      }
    });

    this.middleManagerQueryManager.runQuery("dummy");
  }

  componentWillUnmount(): void {
    this.statusQueryManager.terminate();
    this.dataSourceQueryManager.terminate();
    this.segmentQueryManager.terminate();
    this.taskQueryManager.terminate();
    this.dataServerQueryManager.terminate();
    this.middleManagerQueryManager.terminate();
  }

  renderTaskCounts(): JSX.Element {
    const { dataCount, dataCountLoading } = this.state;
    let renderedElement: JSX.Element;
    if (dataCountLoading.taskCountLoading) {
      renderedElement = <p>Loading status...</p>
    } else {
      let buffer: JSX.Element[] = [];
      if (dataCount.runningTaskCount != 0) {
        buffer.push(<p key={"runningtaskcount"}>{`${dataCount.runningTaskCount} running tasks`}</p>);
      }
      if (dataCount.pendingTaskCount != 0) {
        buffer.push(<p key={"pendingtaskcount"}>{`${dataCount.pendingTaskCount} pending tasks`}</p>);
      }
      if (dataCount.successTaskCount != 0) {
        buffer.push(<p key={"successtaskcount"}>{`${dataCount.successTaskCount} success tasks`}</p>);
      }
      if (dataCount.waitingTaskCount != 0) {
        buffer.push(<p key={"waitingtaskcount"}>{`${dataCount.waitingTaskCount} waiting tasks`}</p>);
      }
      if (dataCount.failedTaskCount != 0) {
        buffer.push(<p key={"failedtaskcount"}>{`${dataCount.failedTaskCount} failed tasks`}</p>);
      }
      renderedElement = <div>{buffer}</div>
    }
    return renderedElement;
  }

  render() {
    const { status, statusLoading, statusError, dataCount, dataCountLoading } = this.state;

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
          <p>{dataCountLoading.dataSourceCountLoading ? `Loading status...` : `${dataCount.dataSourceCount} datasources`}</p>
        </Card>
      </a>
      <a href="#segments">
        <Card interactive={true}>
          <H5>Segments</H5>
          <p>{dataCountLoading.segmentCountLoading ? `Loading status...` : `${dataCount.segmentCount} segments`}</p>
        </Card>
      </a>
      <a href="#tasks">
        <Card interactive={true}>
          <H5>Tasks</H5>
          {this.renderTaskCounts()}
        </Card>
      </a>
      <a href="#servers">
        <Card interactive={true}>
          <H5>Servers</H5>
          <p>{dataCountLoading.dataServerCountLoading ? `Loading status...` : `${dataCount.dataServerCount} data servers`}</p>
          <p>{dataCountLoading.middleManagerCountLoading ? `Loading status...` : `${dataCount.middleManagerCount} middle managers`}</p>
        </Card>
      </a>
    </div>
  }
}

