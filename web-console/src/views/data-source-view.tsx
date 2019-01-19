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
  H1,
  InputGroup,
  Button,
  Intent
} from "@blueprintjs/core";

import { addFilter, makeTextFilter, formatNumber, formatBytes, QueryManager } from "../utils";

export interface DataSourcesViewProps extends React.Props<any> {
  goToSql: (initSql: string) => void;
  goToSegments: (dataSource: string, onlyUnavailable?: boolean) => void;
}

export interface DataSourcesViewState {
  loadingDataSources: boolean;
  dataSources: any[] | null;
  dataSourceFilter: Filter[];
}

export class DataSourcesView extends React.Component<DataSourcesViewProps, DataSourcesViewState> {
  private mounted: boolean;
  private dataSourceQueryManager: QueryManager<string, any[]>;

  constructor(props: DataSourcesViewProps, context: any) {
    super(props, context);
    this.state = {
      loadingDataSources: true,
      dataSources: null,
      dataSourceFilter: []
    };

    this.dataSourceQueryManager = new QueryManager({
      processQuery: (query: string) => {
        return axios.post("/druid/v2/sql", { query })
          .then((response) => response.data);
      },
      onStateChange: ({ result, loading, error }) => {
        if (!this.mounted) return;
        this.setState({
          dataSources: result,
          loadingDataSources: loading
        });
      }
    });

    this.dataSourceQueryManager.runQuery(`SELECT
  datasource,
  COUNT(*) AS num_segments,
  COUNT(*) FILTER(WHERE is_available = 1) AS num_available_segments,
  SUM("size") AS size,
  SUM("num_rows") AS num_rows 
FROM sys.segments
GROUP BY 1`);
  }

  componentDidMount(): void {
    this.mounted = true;
  }

  componentWillUnmount(): void {
    this.mounted = false;
  }

  renderDataSourceTable() {
    const { goToSegments } = this.props;
    const { dataSources, loadingDataSources, dataSourceFilter } = this.state;

    return <ReactTable
      data={dataSources || []}
      loading={loadingDataSources}
      filterable={true}
      filtered={dataSourceFilter}
      onFilteredChange={(filtered, column) => {
        this.setState({ dataSourceFilter: filtered });
      }}
      columns={[
        {
          Header: "Data source",
          accessor: "datasource",
          Filter: makeTextFilter(),
          Cell: row => {
            const value = row.value;
            return <a onClick={() => { this.setState({ dataSourceFilter: addFilter(dataSourceFilter, 'datasource', value) }) }}>{value}</a>
          }
        },
        {
          Header: "Availability",
          id: "availability",
          accessor: (row) => row.num_available_segments / row.num_segments,
          Filter: makeTextFilter(),
          Cell: (row) => {
            const { datasource, num_available_segments, num_segments } = row.original;
            const segmentsEl = <a onClick={() => goToSegments(datasource)}>{`${num_segments} segments`}</a>;
            if (num_available_segments === num_segments) {
              return <span>Fully available ({segmentsEl})</span>;
            } else {
              const percentAvailable = (Math.floor((num_available_segments / num_segments) * 1000) / 10).toFixed(1);
              const missing = num_segments - num_available_segments;
              const segmentsMissingEl = <a onClick={() => goToSegments(datasource, true)}>{`${missing} segments unavailable`}</a>;
              return <span>{percentAvailable}% available ({segmentsEl}, {segmentsMissingEl})</span>;
            }
          }
        },
        {
          Header: 'Size',
          accessor: 'size',
          filterable: false,
          width: 100,
          Cell: (row) => formatBytes(row.value)
        },
        {
          Header: 'Num rows',
          accessor: 'num_rows',
          filterable: false,
          width: 100,
          Cell: (row) => formatNumber(row.value)
        },
        {
          Header: 'Actions',
          accessor: 'datasource',
          id: 'actions',
          width: 300,
          filterable: false,
          Cell: row => {
            const id = row.value;
            return <div>
              <a onClick={() => null}>drop data</a>
            </div>
          }
        }
      ]}
      defaultPageSize={50}
      className="-striped -highlight"
    />;
  }

  render() {
    const { goToSql } = this.props;

    return <div className="data-sources-view app-view">
      <div className="control-bar">
        <H1>Datasources</H1>
        <Button
          rightIcon="refresh"
          text="Refresh"
          onClick={() => this.dataSourceQueryManager.rerunLastQuery()}
        />
        <Button
          rightIcon="share"
          text="Go to SQL"
          onClick={() => goToSql(this.dataSourceQueryManager.getLastQuery())}
        />
      </div>
      {this.renderDataSourceTable()}
    </div>
  }
}

