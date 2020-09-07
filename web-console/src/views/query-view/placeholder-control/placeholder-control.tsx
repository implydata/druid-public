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

import {
  Button,
  ControlGroup,
  FormGroup,
  H5,
  InputGroup,
  Menu,
  MenuItem,
  NumericInput,
  Popover,
} from '@blueprintjs/core';
import { IconNames } from '@blueprintjs/icons';
import {
  QueryParameter,
  SqlComparison,
  SqlExpression,
  SqlFunction,
  SqlPlaceholder,
  SqlQuery,
} from 'druid-query-toolkit';
import React from 'react';

import { HighlightText } from '../../../components';
import { useQueryManager } from '../../../hooks';
import { queryDruidSqlFirstColumn } from '../../../utils';
import { dataTypeToIcon } from '../query-utils';

import './placeholder-control.scss';

const DUMMY_PLACEHOLDER = SqlPlaceholder.PLACEHOLDER.changeCustomPlaceholder('<__dummy__>');
const DUMMY_PLACEHOLDER_STRING = String(DUMMY_PLACEHOLDER);

function removeIndex<T>(xs: readonly T[], i: number): T[] {
  const newXs = xs.slice();
  newXs.splice(i, 1);
  return newXs;
}

function getContextExpression(ex: SqlExpression): SqlExpression | undefined {
  if (ex instanceof SqlComparison) {
    if (!(ex.lhs instanceof SqlPlaceholder)) return ex.lhs;
    if (ex.rhs instanceof SqlExpression && !(ex.rhs instanceof SqlPlaceholder)) return ex.rhs;
  }
  return;
}

interface SuggestionMenuProps {
  baseQuery: SqlQuery;
  parameters: QueryParameter[];
  splitExpression: SqlExpression;
  searchText?: string;
  onValueSelect: (v: string) => void;
}

function SuggestionMenu(props: SuggestionMenuProps) {
  const { baseQuery, parameters, splitExpression, searchText, onValueSelect } = props;

  const [valuesState] = useQueryManager<SqlExpression, string[]>({
    processQuery: async splitExpression => {
      if (!baseQuery.fromClause) return [];

      let newWhereExpression: SqlExpression | undefined;
      const whereExpression = baseQuery.getWhereExpression();
      if (whereExpression) {
        newWhereExpression = whereExpression.filterAnd(ex => !ex.some(b => b === splitExpression));
      }

      if (searchText) {
        newWhereExpression = SqlExpression.and(
          newWhereExpression,
          splitExpression.like(`%${searchText}%`),
        );
      }

      const query = SqlQuery.create(baseQuery.fromClause)
        .changeWhereExpression(newWhereExpression)
        .changeSelectExpressions([splitExpression.as('v')])
        .addFirstColumnToGroupBy()
        .changeOrderByExpression(SqlFunction.COUNT_STAR.toOrderByPart('DESC'))
        .changeLimitValue(100);

      console.log('q:', query.toString());

      return await queryDruidSqlFirstColumn(query, parameters);
    },
    initQuery: splitExpression,
  });

  return (
    <Menu>
      {valuesState.loading && <MenuItem key="loading" text="Loading..." />}
      {valuesState.error && <MenuItem key="error" text={valuesState.error} />}
      {(valuesState.data || []).map((v, i) => (
        <MenuItem key={i} text={v} onClick={() => onValueSelect(v)} />
      ))}
    </Menu>
  );
}

interface PlaceholderContext {
  wrapperExpression: SqlExpression;
  containerQuery: SqlQuery;
}

export interface PlaceholderControlProps {
  query: SqlQuery;
  parameters: QueryParameter[];
  onChangeParameters: (parameters: QueryParameter[], run?: boolean) => void;
}

export const PlaceholderControl = React.memo(function PlaceholderControl(
  props: PlaceholderControlProps,
) {
  const { query, parameters, onChangeParameters } = props;

  const placeholderContexts: PlaceholderContext[] = [];
  if (query) {
    query.walk((ex, context) => {
      if (ex instanceof SqlPlaceholder) {
        context = context.filter(t => !t.isHelper());
        const contextExpression = context[0];
        const myDummyRef = DUMMY_PLACEHOLDER.changeParens(ex.getParens());
        placeholderContexts.push({
          wrapperExpression: contextExpression.walk(x =>
            x === ex ? myDummyRef : x,
          ) as SqlExpression,
          containerQuery: (context.find(b => b instanceof SqlQuery) as SqlQuery) || query,
        });
      }
      return ex;
    });
  }

  return (
    <div className="placeholder-control">
      <H5>Parameter values</H5>
      {placeholderContexts.map(({ wrapperExpression, containerQuery }, i) => {
        const parameter = parameters[i] || { type: 'VARCHAR', value: '' };
        const otherParameters = removeIndex(parameters, i);
        const contextExpression = getContextExpression(wrapperExpression);

        function changeToParameter(newParameter: QueryParameter, run?: boolean) {
          const newParameters = parameters.slice(0, placeholderContexts.length);
          newParameters[i] = Object.assign({}, parameter, newParameter);
          onChangeParameters(newParameters, run);
        }

        return (
          <FormGroup
            key={i}
            label={
              <HighlightText
                text={String(wrapperExpression)}
                find={DUMMY_PLACEHOLDER_STRING}
                replace="?"
              />
            }
          >
            <ControlGroup fill>
              <Popover
                content={
                  <Menu>
                    <MenuItem
                      icon={dataTypeToIcon('VARCHAR')}
                      text="VARCHAR"
                      onClick={() =>
                        changeToParameter({ type: 'VARCHAR', value: String(parameter.value) })
                      }
                    />
                    <MenuItem
                      icon={dataTypeToIcon('FLOAT')}
                      text="FLOAT"
                      onClick={() =>
                        changeToParameter({ type: 'FLOAT', value: Number(parameter.value) })
                      }
                    />
                  </Menu>
                }
              >
                <Button icon={dataTypeToIcon(parameter.type)} />
              </Popover>
              {parameter.type === 'VARCHAR' && (
                <InputGroup
                  value={String(parameter.value)}
                  onChange={(e: any) =>
                    changeToParameter({ type: parameter.type, value: e.target.value })
                  }
                  placeholder="?"
                  fill
                  rightElement={
                    contextExpression && (
                      <Popover
                        content={
                          <SuggestionMenu
                            baseQuery={containerQuery}
                            parameters={otherParameters}
                            splitExpression={contextExpression}
                            searchText={String(parameter.value)}
                            onValueSelect={v =>
                              changeToParameter({ type: parameter.type, value: v }, true)
                            }
                          />
                        }
                      >
                        <Button icon={IconNames.CARET_DOWN} minimal />
                      </Popover>
                    )
                  }
                />
              )}
              {parameter.type === 'FLOAT' && (
                <NumericInput
                  value={Number(parameter.value)}
                  onValueChange={v => changeToParameter({ type: parameter.type, value: v })}
                  placeholder="?"
                  fill
                  selectAllOnFocus
                />
              )}
            </ControlGroup>
          </FormGroup>
        );
      })}
    </div>
  );
});
