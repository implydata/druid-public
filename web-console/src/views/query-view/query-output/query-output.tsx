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

import { Popover } from '@blueprintjs/core';
import React from 'react';
import ReactTable from 'react-table';

import { HeaderRows } from '../../../utils';
import { basicActionsToMenu } from '../../../utils/basic-action';

import './query-output.scss';

export interface QueryOutputProps {
  loading: boolean;
  result: HeaderRows | null;
  error: string | null;
  handleSQLAction: (row: string, header: string, action: string, direction?: boolean) => void;
  sorted?: { id: string; desc: boolean }[];
}

export class QueryOutput extends React.PureComponent<QueryOutputProps> {
  constructor(props: QueryOutputProps, context: any) {
    super(props, context);
  }
  render() {
    const { result, loading, error, handleSQLAction, sorted } = this.props;
    return (
      <div className="query-output">
        <ReactTable
          data={result ? result.rows : []}
          loading={loading}
          noDataText={!loading && result && !result.rows.length ? 'No results' : error || ''}
          sortable={false}
          columns={(result ? result.header : []).map((h: any, i) => {
            return {
              Header: () => {
                const actions = basicActionsToMenu([
                  {
                    title: `Remove '${h}'`,
                    onAction: () => handleSQLAction('', h, 'exclude column'),
                  },
                  {
                    title: `Order by '${h}'`,
                    onAction: () => handleSQLAction('', h, 'order by'),
                  },
                ]);
                return (
                  <Popover className={'clickable-cell'} content={actions ? actions : <a>Filter</a>}>
                    <div>{h}</div>
                  </Popover>
                );
              },
              headerClassName: sorted
                ? sorted.map(sorted => {
                    if (sorted.id === h) {
                      return sorted.desc ? '-sort-desc' : '-sort-asc';
                    }
                    return '';
                  })[0]
                : undefined,
              accessor: String(i),
              Cell: row => {
                const value = row.value;
                const actions = basicActionsToMenu([
                  {
                    title: `Exclude  '${value}'`,
                    onAction: () => handleSQLAction(row.value, h, 'exclude'),
                  },
                  {
                    title: `Filter by '${h} = ${value}'`,
                    onAction: () => handleSQLAction(row.value, h, 'filter'),
                  },
                ]);
                const popover = (
                  <div>
                    <Popover content={actions ? actions : <a>Filter</a>}>
                      <div>{value}</div>
                    </Popover>
                  </div>
                );
                if (value) {
                  return popover;
                }
                return value;
              },
            };
          })}
        />
      </div>
    );
  }
}
