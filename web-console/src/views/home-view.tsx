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

interface DataCount {
  datasourceCount: number;
  segmentCount: number;
  runningTaskCount: number;
  pendingTaskCount: number;
  successTaskCount: number;
  failedTaskCount: number;
  waitingTaskCount: number;
  dataServerCount: number;
  middleManagerCount: number;
}

interface DataCountLoading {
  datasourceCountLoading: boolean;
  segmentCountLoading: boolean;
  taskCountLoading: boolean;
  dataServerCountLoading: boolean;
  middleManagerCountLoading: boolean;
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
  private datasourceQueryManager: QueryManager<string, any>;
  private segmentQueryManager: QueryManager<string, any>;
  private taskQueryManager: QueryManager<string, any>;
  private dataServerQueryManager: QueryManager<string, any>;
  private middleManagerQueryManager: QueryManager<string, any>;

  constructor(props: HomeViewProps, context: any) {
    super(props, context);
    this.state = {
      statusLoading: false,
      status: null,
      statusError: null,

      dataCount: {},
      dataCountLoading: {
        datasourceCountLoading: true,
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
          statusLoading: loading,
          status: result,
          statusError: error
        });
      }
    });

    this.statusQueryManager.runQuery(`dummy`);

    // -------------------------

    this.datasourceQueryManager = new QueryManager({
      processQuery: async (query) => {
        const datasourceResp = await axios.post("/druid/v2/sql", { query: query });
        const datasourceCount: number = datasourceResp.data.length;
        return datasourceCount;
      },
      onStateChange: ({ result, loading, error }) => {
        this.setState({
            dataCount: {
              ...this.state.dataCount,
              datasourceCount: result
            },
            dataCountLoading: {
              ...this.state.dataCountLoading,
              datasourceCountLoading: loading
            }
          }
        )
      }
    });

    this.datasourceQueryManager.runQuery(`SELECT datasource FROM sys.segments GROUP BY 1`);

    // -------------------------

    this.segmentQueryManager = new QueryManager({
      processQuery: async (query) => {
        const segmentResp = await axios.post("/druid/v2/sql", { query });
        const segmentCount: number = segmentResp.data[0].count;
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

    this.segmentQueryManager.runQuery(`SELECT COUNT(*) as "count" FROM sys.segments`);

    // -------------------------

    this.taskQueryManager = new QueryManager({
      processQuery: async (query) => {
        const taskResp = await axios.post("/druid/v2/sql", { query });
        let taskCounts = {
          successTaskCount: 0,
          failedTaskCount: 0,
          runningTaskCount: 0,
          waitingTaskCount: 0,
          pendingTaskCount: 0
        };
        for (let dataStatus of taskResp.data) {
          if (dataStatus.status === "SUCCESS") {
            taskCounts.successTaskCount = dataStatus.count;
          } else if (dataStatus.status === "FAILED") {
            taskCounts.failedTaskCount = dataStatus.count;
          } else if (dataStatus.status === "RUNNING") {
            taskCounts.runningTaskCount = dataStatus.count;
          } else if (dataStatus.status === "WAITING") {
            taskCounts.waitingTaskCount = dataStatus.count;
          } else {
            taskCounts.pendingTaskCount = dataStatus.count;
          }
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

    // -------------------------

    this.taskQueryManager.runQuery(`SELECT
  CASE WHEN "status" = 'RUNNING' THEN "runner_status" ELSE "status" END AS "status",
  COUNT (*) AS "count"
FROM sys.tasks
GROUP BY 1`);

    this.dataServerQueryManager = new QueryManager({
      processQuery: async (query) => {
        const dataServerResp = await axios.post("/druid/v2/sql", { query });
        const dataServerCount: number = dataServerResp.data[0].count;
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

    this.dataServerQueryManager.runQuery(`SELECT COUNT(*) as "count" FROM sys.servers WHERE "server_type" = 'historical'`);

    this.middleManagerQueryManager = new QueryManager({
      processQuery: async (query) => {
        const middleManagerResp = await axios.get("/druid/indexer/v1/workers");
        const middleManagerCount: number = middleManagerResp.data.length;
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

    this.middleManagerQueryManager.runQuery(`dummy`);
  }

  componentWillUnmount(): void {
    this.statusQueryManager.terminate();
    this.datasourceQueryManager.terminate();
    this.segmentQueryManager.terminate();
    this.taskQueryManager.terminate();
    this.dataServerQueryManager.terminate();
    this.middleManagerQueryManager.terminate();
  }

  renderTaskCounts(): JSX.Element {
    const { dataCount, dataCountLoading } = this.state;
    let renderedElement: JSX.Element;
    if (dataCountLoading.taskCountLoading) {
      renderedElement = <p>Loading...</p>
    } else {
      renderedElement = <>
        { Boolean(dataCount.runningTaskCount) && <p>{`${dataCount.runningTaskCount} running tasks`}</p> }
        { Boolean(dataCount.pendingTaskCount) && <p>{`${dataCount.pendingTaskCount} pending tasks`}</p> }
        { Boolean(dataCount.successTaskCount) && <p>{`${dataCount.successTaskCount} success tasks`}</p> }
        { Boolean(dataCount.waitingTaskCount) && <p>{`${dataCount.waitingTaskCount} waiting tasks`}</p> }
        { Boolean(dataCount.failedTaskCount) && <p>{`${dataCount.failedTaskCount} failed tasks`}</p> }
      </>
    }
    return renderedElement;
  }

  render() {
    const { status, statusLoading, statusError, dataCount, dataCountLoading } = this.state;

    return <div className="home-view app-view">
      <a href="/status">
        <Card interactive={true}>
          <H5>Status</H5>
          <p>{statusLoading ? `Loading...` : (statusError ? statusError : `Apache Druid is running version ${status.version}`)}</p>
        </Card>
      </a>
      <a href="#datasources">
        <Card interactive={true}>
          <H5>Datasources</H5>
          <p>{dataCountLoading.datasourceCountLoading ? `Loading...` : `${dataCount.datasourceCount} datasources`}</p>
        </Card>
      </a>
      <a href="#segments">
        <Card interactive={true}>
          <H5>Segments</H5>
          <p>{dataCountLoading.segmentCountLoading ? `Loading...` : `${dataCount.segmentCount} segments`}</p>
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
          <H5>Data servers</H5>
          <p>{dataCountLoading.dataServerCountLoading ? `Loading...` : `${dataCount.dataServerCount} Historicals`}</p>
          <p>{dataCountLoading.middleManagerCountLoading ? `Loading...` : `${dataCount.middleManagerCount} MiddleManagers`}</p>
        </Card>
      </a>
    </div>
  }
}

