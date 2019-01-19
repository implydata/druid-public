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
  Button
} from "@blueprintjs/core";

import { addFilter, makeTextFilter, makeBooleanFilter, QueryManager, formatBytes, formatNumber } from "../utils";

export interface SegmentsViewProps extends React.Props<any> {
  goToSql: (initSql: string) => void;
  dataSource: string | null;
  onlyUnavailable: boolean | null;
}

export interface SegmentsViewState {
  loading: boolean;
  segments: any[] | null;
  segmentFilter: Filter[];
}

interface QueryAndSkip {
  query: string;
  skip: number;
}

export class SegmentsView extends React.Component<SegmentsViewProps, SegmentsViewState> {
  private mounted: boolean;
  private segmentsQueryManager: QueryManager<QueryAndSkip, any[]>;

  constructor(props: SegmentsViewProps, context: any) {
    super(props, context);

    const segmentFilter: Filter[] = [];
    if (props.dataSource) segmentFilter.push({ id: 'datasource', value: props.dataSource });
    if (props.onlyUnavailable) segmentFilter.push({ id: 'is_available', value: 'false' });

    this.state = {
      loading: true,
      segments: null,
      segmentFilter
    };

    this.segmentsQueryManager = new QueryManager({
      processQuery: (query: QueryAndSkip) => {
        return axios.post("/druid/v2/sql", { query: query.query })
          .then((response) => response.data.slice(query.skip));
      },
      onStateChange: ({ result, loading, error }) => {
        if (!this.mounted) return;
        this.setState({
          segments: result,
          loading
        });
      }
    })
  }

  componentDidMount(): void {
    this.mounted = true;
  }

  componentWillUnmount(): void {
    this.mounted = false;
  }

  private fetchData = (state: any, instance: any) => {
    const { page, pageSize, filtered, sorted } = state;
    const totalQuerySize = (page + 1) * pageSize;

    let queryParts = [
      `SELECT "segment_id", "datasource", "start", "end", "size", "version", "partition_num", "num_replicas", "num_rows", "is_published", "is_available", "is_realtime", "payload"`,
      `FROM sys.segments`
    ];

    const whereParts = filtered.map((f: Filter) => {
      if (f.id.startsWith('is_')) {
        if (f.value === 'all') return null;
        return `${JSON.stringify(f.id)} = ${f.value === 'true' ? 1 : 0}`;
      } else {
        return `${JSON.stringify(f.id)} LIKE '${f.value}%'`;
      }
    }).filter(Boolean);

    if (whereParts.length) {
      queryParts.push('WHERE ' + whereParts.join(' AND '))
    }

    if (sorted.length) {
      const sort = sorted[0];
      queryParts.push(`ORDER BY ${JSON.stringify(sort.id)} ${sort.desc ? 'DESC' : 'ASC'}`);
    }

    queryParts.push(`LIMIT ${totalQuerySize}`);

    const query = queryParts.join('\n');

    this.segmentsQueryManager.runQuery({
      query,
      skip: totalQuerySize - pageSize
    });
  }

  renderSegmentsTable() {
    const { segments, loading, segmentFilter } = this.state;

    return <ReactTable
      data={segments || []}
      pages={10}
      loading={loading}
      manual
      filterable
      filtered={segmentFilter}
      defaultSorted={[{id: "start", desc: true}]}
      onFilteredChange={(filtered, column) => {
        this.setState({ segmentFilter: filtered });
      }}
      onFetchData={this.fetchData}
      columns={[
        {
          Header: "Segment ID",
          accessor: "segment_id",
          width: 300,
          Filter: makeTextFilter()
        },
        {
          Header: "Data Source",
          accessor: "datasource",
          Filter: makeTextFilter(),
          Cell: row => {
            const value = row.value;
            return <a onClick={() => { this.setState({ segmentFilter: addFilter(segmentFilter, 'datasource', value) }) }}>{value}</a>
          }
        },
        {
          Header: "Start",
          accessor: "start",
          Filter: makeTextFilter(),
          Cell: row => {
            const value = row.value;
            return <a onClick={() => { this.setState({ segmentFilter: addFilter(segmentFilter, 'start', value) }) }}>{value}</a>
          }
        },
        {
          Header: "End",
          accessor: "end",
          Filter: makeTextFilter(),
          Cell: row => {
            const value = row.value;
            return <a onClick={() => { this.setState({ segmentFilter: addFilter(segmentFilter, 'end', value) }) }}>{value}</a>
          }
        },
        {
          Header: "Size",
          accessor: "size",
          filterable: false,
          Cell: row => formatBytes(row.value)
        },
        {
          Header: "Num rows",
          accessor: "num_rows",
          filterable: false,
          Cell: row => formatNumber(row.value)
        },
        {
          Header: "Num replicas",
          accessor: "num_replicas",
          filterable: false
        },
        {
          Header: "Is published",
          id: "is_published",
          accessor: (row) => String(Boolean(row.is_published)),
          Filter: makeBooleanFilter()
        },
        {
          Header: "IS realtime",
          id: "is_realtime",
          accessor: (row) => String(Boolean(row.is_realtime)),
          Filter: makeBooleanFilter()
        },
        {
          Header: "Is available",
          id: "is_available",
          accessor: (row) => String(Boolean(row.is_available)),
          Filter: makeBooleanFilter()
        }
      ]}
      defaultPageSize={50}
      className="-striped -highlight"
      SubComponent={rowInfo => {
        const payload = JSON.parse(rowInfo.original.payload);
        return <div style={{ padding: "20px" }}>
          <H5>Dimensions</H5>
          <div>{payload.dimensions}</div>
          <H5>Metrics</H5>
          <div>{payload.metrics}</div>
        </div>;
      }}
    />;
  }

  render() {
    const { goToSql } = this.props;

    return <div className="segments-view app-view">
      <div className="control-bar">
        <H1>Segments</H1>
        <Button
          rightIcon="refresh"
          text="Refresh"
          onClick={() => this.segmentsQueryManager.rerunLastQuery()}
        />
        <Button
          rightIcon="share"
          text="Go to SQL"
          onClick={() => goToSql(this.segmentsQueryManager.getLastQuery().query)}
        />
      </div>
      {this.renderSegmentsTable()}
    </div>
  }
}
