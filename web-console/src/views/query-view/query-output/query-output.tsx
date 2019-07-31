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

import { Intent, Popover } from '@blueprintjs/core';
import copy from 'copy-to-clipboard';
import React from 'react';
import ReactTable from 'react-table';

import { AppToaster } from '../../../singletons/toaster';
import { HeaderRows } from '../../../utils';
import { basicActionsToMenu } from '../../../utils/basic-action';

import './query-output.scss';

export interface QueryOutputProps {
  aggregateColumns?: string[];
  disabled: boolean;
  loading: boolean;
  handleSQLAction: (row: string, header: string, action: string, direction?: boolean) => void;
  sorted?: { id: string; desc: boolean }[];
  result?: HeaderRows;
  error?: string;
}

export class QueryOutput extends React.PureComponent<QueryOutputProps> {
  render(): JSX.Element {
    const { result, loading, error } = this.props;
    console.log(this.props.sorted);
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
                return (
                  <Popover className={'clickable-cell'} content={this.getHeaderActions(h)}>
                    <div>{h}</div>
                  </Popover>
                );
              },
              headerClassName: this.getHeaderClassName(h),
              accessor: String(i),
              Cell: row => {
                const value = row.value;
                const popover = (
                  <div>
                    <Popover content={this.getRowActions(value, h)}>
                      <div>{value}</div>
                    </Popover>
                  </div>
                );
                if (value) {
                  return popover;
                }
                return value;
              },
              className: this.props.aggregateColumns
                ? this.props.aggregateColumns.indexOf(h) > -1
                  ? 'aggregate-column'
                  : undefined
                : undefined,
            };
          })}
        />
      </div>
    );
  }

  getHeaderActions(h: string) {
    const { disabled, handleSQLAction } = this.props;
    let actionsMenu;
    if (disabled) {
      actionsMenu = basicActionsToMenu([
        {
          title: `Copy '${h}'`,
          onAction: () => {
            copy(h, { format: 'text/plain' });
            AppToaster.show({
              message: `${h}' copied to clipboard`,
              intent: Intent.SUCCESS,
            });
          },
        },
        {
          title: `Copy 'Order BY ${h} ASC`,
          onAction: () => {
            copy(`Order BY '${h}' ASC`, { format: 'text/plain' });
            AppToaster.show({
              message: `'Order BY '${h}' ASC' copied to clipboard`,
              intent: Intent.SUCCESS,
            });
          },
        },
        {
          title: `Copy 'Order BY '${h}' DESC`,
          onAction: () => {
            copy(`Order BY '${h}' DESC`, { format: 'text/plain' });
            AppToaster.show({
              message: `'Order BY '${h}' DESC' copied to clipboard`,
              intent: Intent.SUCCESS,
            });
          },
        },
      ]);
    } else {
      actionsMenu = basicActionsToMenu([
        {
          title: `Remove '${h}'`,
          onAction: () => handleSQLAction('', h, 'exclude column'),
        },
        {
          title: `Order by '${h}'`,
          onAction: () => handleSQLAction('', h, 'order by'),
        },
      ]);
    }
    return actionsMenu ? actionsMenu : undefined;
  }

  getRowActions(row: string, header: string) {
    const { disabled, handleSQLAction } = this.props;
    let actionsMenu;
    if (disabled) {
      actionsMenu = basicActionsToMenu([
        {
          title: `Copy '${row}'`,
          onAction: () => {
            copy(row, { format: 'text/plain' });
            AppToaster.show({
              message: `${row} copied to clipboard`,
              intent: Intent.SUCCESS,
            });
          },
        },
        {
          title: `Copy 'WHERE '${header}' = '${row}'`,
          onAction: () => {
            copy(`WHERE '${header}' = ${row}`, { format: 'text/plain' });
            AppToaster.show({
              message: `WHERE '${header}' = '${row}' copied to clipboard`,
              intent: Intent.SUCCESS,
            });
          },
        },
        {
          title: `Copy 'WHERE '${header}' != '${row}'`,
          onAction: () => {
            copy(`WHERE '${header}' != '${row}'`, { format: 'text/plain' });
            AppToaster.show({
              message: `WHERE '${header}' != '${row}' copied to clipboard`,
              intent: Intent.SUCCESS,
            });
          },
        },
      ]);
    } else {
      actionsMenu = basicActionsToMenu([
        {
          title: `Exclude  '${header}'`,
          onAction: () => handleSQLAction(row, header, 'exclude'),
        },
        {
          title: `Filter by '${header} = ${row}'`,
          onAction: () => handleSQLAction(row, header, 'filter'),
        },
      ]);
    }
    return actionsMenu ? actionsMenu : undefined;
  }

  getHeaderClassName(h: string) {
    const { sorted } = this.props;
    const className = [];
    className.push(
      sorted
        ? sorted.map(sorted => {
            if (sorted.id === h) {
              return sorted.desc ? '-sort-desc' : '-sort-asc';
            }
            return '';
          })[0]
        : undefined,
    );
    return className.join(' ');
  }
}
