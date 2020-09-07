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

import { FormGroup, InputGroup } from '@blueprintjs/core';
import { SqlFunction, SqlQuery } from 'druid-query-toolkit';
import React from 'react';

import { Loader } from '../../../../../components';
import { useQueryManager } from '../../../../../hooks';
import { queryDruidSqlFirstColumn } from '../../../../../utils';
import { ColumnMetadata } from '../../../../../utils/column-metadata';
import { ColumnDropdown } from '../../column-dropdown/column-dropdown';
import { EqualDecompose } from '../equal-decompose/equal-decompose';

import './equal-control.scss';

export interface EqualControlProps {
  baseQuery: SqlQuery;
  filterDecompose: EqualDecompose;
  changeFilterDecompose: (filterDecompose: EqualDecompose) => void;
  columnMetadata: readonly ColumnMetadata[];
}

export const EqualControl = React.memo(function EqualControl(props: EqualControlProps) {
  const { baseQuery, filterDecompose, changeFilterDecompose, columnMetadata } = props;

  const [valuesState] = useQueryManager<EqualDecompose, string[]>({
    processQuery: async filterDecompose => {
      if (!filterDecompose.column) throw new Error('select a column');
      if (!baseQuery.fromClause) return [];

      const query = SqlQuery.create(baseQuery.fromClause)
        .changeSelectExpressions([filterDecompose.column.as('v')])
        .addFirstColumnToGroupBy()
        .changeOrderByExpression(SqlFunction.COUNT_STAR.toOrderByPart('DESC'))
        .changeLimitValue(100);

      console.log('q:', query.toString());

      return await queryDruidSqlFirstColumn(query);
    },
    query: filterDecompose,
  });

  return (
    <>
      <FormGroup>
        <ColumnDropdown
          columnMetadata={columnMetadata}
          columnName={filterDecompose.getColumnName()}
          onChangeColumnName={columnName => {
            changeFilterDecompose(filterDecompose.changeColumnName(columnName));
          }}
        />
      </FormGroup>
      <FormGroup>
        <InputGroup
          placeholder="value"
          autoFocus
          fill
          value={filterDecompose.getStringValue()}
          onChange={(e: any) => {
            changeFilterDecompose(filterDecompose.changeStringValue(e.target.value));
          }}
        />
      </FormGroup>
      <FormGroup>
        <div className="value-box helper-box">
          {valuesState.error && <div>{valuesState.error.message}</div>}
          {valuesState.loading && <Loader />}
          {valuesState.data &&
            valuesState.data.map((v, i) => {
              return <div key={i}>{v}</div>;
            })}
        </div>
      </FormGroup>
    </>
  );
});
