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
import { SqlControl } from '../components/sql-control';
import { QueryManager } from '../utils';

export interface SqlViewProps extends React.Props<any> {
  initSql: string | null;
}

export interface SqlViewState {
  loading: boolean;
  results: any[] | null;
}

export class SqlView extends React.Component<SqlViewProps, SqlViewState> {
  private mounted: boolean;
  private sqlQueryManager: QueryManager<string, any[][]>;

  constructor(props: SqlViewProps, context: any) {
    super(props, context);
    this.state = {
      loading: false,
      results: null
    };

    this.sqlQueryManager = new QueryManager({
      processQuery: (query: string) => {
        return axios.post("/druid/v2/sql", {
          query,
          resultFormat: "array",
          header: true
        })
          .then((response) => response.data);
      },
      onStateChange: ({ result, loading, error }) => {
        if (!this.mounted) return;
        this.setState({
          results: result,
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

  renderResultTable() {
    const { results, loading } = this.state;

    const header: string[] = (results && results.length) ? results[0] : [];

    return <ReactTable
      data={results ? results.slice(1) : []}
      loading={loading}
      columns={header.map((h, i) => ({ Header: h, accessor: String(i) }))}
      defaultPageSize={10}
      className="-striped -highlight"
    />;
  }

  render() {
    const { initSql } = this.props;

    return <div className="sql-view app-view">
      <SqlControl initSql={initSql} onRun={q => this.sqlQueryManager.runQuery(q)} />
      {this.renderResultTable()}
    </div>
  }
}

