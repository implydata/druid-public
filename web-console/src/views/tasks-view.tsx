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
  Button,
  H1
} from "@blueprintjs/core";

import { addFilter, makeTextFilter, QueryManager } from "../utils";

export interface TasksViewProps extends React.Props<any> {
  taskId: string | null;
  goToSql: (initSql: string) => void;
}

export interface TasksViewState {
  loadingSupervisors: boolean;
  supervisors: any[];

  loadingTasks: boolean;
  tasks: any[] | null;
  taskFilter: Filter[];
}

function statusToColor(status: string): string {
  switch (status) {
    case 'RUNNING': return '#2167d5';
    case 'PENDING': return '#ffbf00';
    case 'SUCCESS': return '#57d500';
    case 'FAILED': return '#d5100a';
    default: return '#0a1500';
  }
}

export class TasksView extends React.Component<TasksViewProps, TasksViewState> {
  private mounted: boolean;
  private supervisorQueryManager: QueryManager<string, any[]>;
  private taskQueryManager: QueryManager<string, any[]>;

  constructor(props: TasksViewProps, context: any) {
    super(props, context);
    this.state = {
      loadingSupervisors: true,
      supervisors: [],

      loadingTasks: true,
      tasks: null,
      taskFilter: props.taskId ? [{ id: 'task_id', value: props.taskId }] : []
    };

    this.supervisorQueryManager = new QueryManager({
      processQuery: (query: string) => {
        return axios.get("/druid/indexer/v1/supervisor?full")
          .then((response) => response.data);
      },
      onStateChange: ({ result, loading, error }) => {
        if (!this.mounted) return;
        this.setState({
          supervisors: result,
          loadingSupervisors: loading
        });
      }
    });

    this.supervisorQueryManager.runQuery('dummy');

    this.taskQueryManager = new QueryManager({
      processQuery: (query: string) => {
        return axios.post("/druid/v2/sql", { query })
          .then((response) => response.data);
      },
      onStateChange: ({ result, loading, error }) => {
        if (!this.mounted) return;
        this.setState({
          tasks: result,
          loadingTasks: loading
        });
      }
    });

    this.taskQueryManager.runQuery(`SELECT
  "task_id", "type", "datasource", "created_time", "status", "runner_status"
FROM sys.tasks`);
  }

  componentDidMount(): void {
    this.mounted = true;
  }

  componentWillUnmount(): void {
    this.mounted = false;
  }

  killTask(taskId: string) {
    alert(`Killing task ${taskId}`);
  }

  renderSupervisorTable() {
    const { supervisors, loadingSupervisors } = this.state;

    // onClick={() => { this.setState({ taskFilter: addFilter(taskFilter, 'status', value) }) }}

    return <ReactTable
      data={supervisors || []}
      loading={loadingSupervisors}
      filterable={true}
      columns={[
        {
          Header: "Data source",
          accessor: "id",
          id: 'datasource',
          width: 300,
          Filter: makeTextFilter()
        },
        {
          Header: "Status",
          id: 'status',
          accessor: (row) => row.spec.suspended ? 'suspended' : 'running',
          Filter: makeTextFilter(),
          Cell: row => {
            const value = row.value;
            return <span
              style={{ color: value === 'suspended' ? '#d58512' : '#2167d5' }}
            >{value}</span>
          }
        },
        {
          Header: 'Actions',
          id: 'actions',
          accessor: 'id',
          width: 300,
          filterable: false,
          Cell: row => {
            const id = row.value;
            return <div>
              <a href={`/druid/indexer/v1/supervisor/${id}`} target="_blank">payload</a>&nbsp;&nbsp;&nbsp;
              <a href={`/druid/indexer/v1/supervisor/${id}/status`} target="_blank">status</a>&nbsp;&nbsp;&nbsp;
              <a href={`/druid/indexer/v1/supervisor/${id}/history`} target="_blank">history</a>&nbsp;&nbsp;&nbsp;
              <a onClick={() => this.killTask(id)}>kill</a>
            </div>
          }
        }
      ]}
      defaultPageSize={10}
      className="-striped -highlight"
    />;
  }

  renderTaskTable() {
    const { tasks, loadingTasks, taskFilter } = this.state;

    return <ReactTable
      data={tasks || []}
      loading={loadingTasks}
      filterable={true}
      filtered={taskFilter}
      onFilteredChange={(filtered, column) => {
        this.setState({ taskFilter: filtered });
      }}
      columns={[
        {
          Header: "Task ID",
          accessor: "task_id",
          width: 300,
          Filter: makeTextFilter()
        },
        {
          Header: "Type",
          accessor: "type",
          Filter: makeTextFilter(),
          Cell: row => {
            const value = row.value;
            return <a onClick={() => { this.setState({ taskFilter: addFilter(taskFilter, 'type', value) }) }}>{value}</a>
          }
        },
        {
          Header: "Data source",
          accessor: "datasource",
          Filter: makeTextFilter(),
          Cell: row => {
            const value = row.value;
            return <a onClick={() => { this.setState({ taskFilter: addFilter(taskFilter, 'datasource', value) }) }}>{value}</a>
          }
        },
        {
          Header: "Created time",
          accessor: "created_time",
          Filter: makeTextFilter()
        },
        {
          Header: "Status",
          accessor: "status",
          Filter: makeTextFilter(),
          Cell: row => {
            const value = row.value;
            return <a onClick={() => { this.setState({ taskFilter: addFilter(taskFilter, 'status', value) }) }}>
              <span
                style={{ color: statusToColor(value) }}
              >&#x25cf;&nbsp;</span>
              {value}
            </a>;
          }
        },
        {
          Header: "Runner status",
          accessor: "runner_status",
          Filter: makeTextFilter()
        },
        {
          Header: 'Actions',
          id: 'actions',
          accessor: 'task_id',
          width: 300,
          filterable: false,
          Cell: row => {
            const id = row.value;
            return <div>
              <a href={`/druid/indexer/v1/task/${id}`} target="_blank">payload</a>&nbsp;&nbsp;&nbsp;
              <a href={`/druid/indexer/v1/task/${id}/status`} target="_blank">status</a>&nbsp;&nbsp;&nbsp;
              <a href={`/druid/indexer/v1/task/${id}/log`} target="_blank">log (all)</a>&nbsp;&nbsp;&nbsp;
              <a href={`/druid/indexer/v1/task/${id}/log?offset=-8192`} target="_blank">log (last 8kb)</a>&nbsp;&nbsp;&nbsp;
              <a onClick={() => this.killTask(id)}>kill</a>
            </div>
          }
        }
      ]}
      defaultPageSize={20}
      className="-striped -highlight"
    />;
  }

  render() {
    const { goToSql } = this.props;

    return <div className="tasks-view app-view">
      <div className="control-bar">
        <H1>Supervisors</H1>
        <Button
          rightIcon="refresh"
          text="Refresh"
          onClick={() => this.supervisorQueryManager.rerunLastQuery()}
        />
      </div>
      {this.renderSupervisorTable()}

      <div className="control-bar">
        <H1>Tasks</H1>
        <Button
          rightIcon="refresh"
          text="Refresh"
          onClick={() => this.taskQueryManager.rerunLastQuery()}
        />
        <Button
          rightIcon="share"
          text="Go to SQL"
          onClick={() => goToSql(this.taskQueryManager.getLastQuery())}
        />
      </div>
      {this.renderTaskTable()}
    </div>
  }
}

