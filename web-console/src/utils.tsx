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

import { Button, InputGroup, Intent, HTMLSelect } from '@blueprintjs/core';
import * as numeral from "numeral";
import * as React from 'react';
import { Filter, FilterRender } from 'react-table';

export function addFilter(filters: Filter[], id: string, value: string): Filter[] {
  let currentFilter = filters.find(f => f.id === id);
  if (currentFilter) {
    filters = filters.filter(f => f.id !== id);
    if (currentFilter.value !== value) {
      filters = filters.concat({ id, value });
    }
  } else {
    filters = filters.concat({ id, value });
  }
  return filters;
}

export function makeTextFilter(placeholder: string = ''): FilterRender {
  return ({ filter, onChange, key }) => {
    const filterValue = filter ? filter.value : '';
    return <InputGroup
      key={key}
      onChange={(e: any) => onChange(e.target.value)}
      value={filterValue}
      rightElement={filterValue ? <Button icon="cross" intent={Intent.NONE} minimal={true} onClick={() => onChange('')} /> : undefined}
      placeholder={placeholder}
    />
  }
}

export function makeBooleanFilter(): FilterRender {
  return ({ filter, onChange, key }) => {
    const filterValue = filter ? filter.value : '';
    return <HTMLSelect
      key={key}
      style={{ width: '100%' }}
      onChange={event => onChange(event.target.value)}
      value={filterValue || "all"}
      fill={true}
    >
      <option value="all">Show all</option>
      <option value="true">true</option>
      <option value="false">false</option>
    </HTMLSelect>;
  }
}

export function formatNumber(n: number): string {
  return numeral(n).format('0,0');
}

export function formatBytes(n: number): string {
  return numeral(n).format('0.00 b');
}

export function formatBytesCompact(n: number): string {
  return numeral(n).format('0.00b');
}

// ----------------------------------

export interface QueryState<R> {
  result: R | null;
  loading: boolean;
  error: string | null;
}

export interface QueryManagerOptions<Q, R> {
  processQuery: (query: Q) => Promise<R>;
  onStateChange?: (queryResolve: QueryState<R>) => void;
}

export class QueryManager<Q, R> {
  private processQuery: (query: Q) => Promise<R>;
  private onStateChange?: (queryResolve: QueryState<R>) => void;


  private lastQuery: Q;
  private state: QueryState<R> = {
    result: null,
    loading: false,
    error: null
  };
  private currentQueryId = 0;

  constructor(options: QueryManagerOptions<Q, R>) {
    this.processQuery = options.processQuery;
    this.onStateChange = options.onStateChange;
  }

  private setState(queryState: QueryState<R>) {
    this.state = queryState;
    if (this.onStateChange) this.onStateChange(queryState);
  }

  public runQuery(query: Q): void {
    this.currentQueryId++;
    let myQueryId = this.currentQueryId;

    this.setState({
      result: null,
      loading: true,
      error: null
    });

    this.lastQuery = query;
    this.processQuery(query)
      .then(
        (result) => {
          if (this.currentQueryId !== myQueryId) return;
          this.setState({
            result,
            loading: false,
            error: null
          });
        },
        (e: Error) => {
          if (this.currentQueryId !== myQueryId) return;
          this.setState({
            result: null,
            loading: false,
            error: e.message
          })
        }
      )
  }

  public getLastQuery(): Q {
    return this.lastQuery;
  }

  public getState(): QueryState<R> {
    return this.state;
  }

  public rerunLastQuery(): void {
    this.runQuery(this.lastQuery);
  }
}
