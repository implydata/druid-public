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

import { Button, ButtonGroup, Icon, Menu, MenuDivider, MenuItem, Popover } from '@blueprintjs/core';
import { IconNames } from '@blueprintjs/icons';
import { SqlAlias, SqlExpression, SqlPlaceholder, SqlQuery } from 'druid-query-toolkit';
import React, { useState } from 'react';

import { ColumnMetadata } from '../../../utils/column-metadata';

import { FilterDialog } from './filter-dialog/filter-dialog';

import './query-tools.scss';

function hasAncestorWithClass(element: Element, className: string): boolean {
  let el: Element | null = element;
  while (el) {
    if (el.classList.contains(className)) return true;
    el = el.parentElement;
  }
  return false;
}

export interface QueryToolsProps {
  query?: SqlQuery;
  onQueryChange: (query: SqlQuery, run?: boolean) => void;
  columnMetadata: readonly ColumnMetadata[] | undefined;
}

export const QueryTools = React.memo(function QueryTools(props: QueryToolsProps) {
  const { query, onQueryChange, columnMetadata } = props;
  const [filterDialogOpenOn, setFilterDialogOpenOn] = useState<SqlExpression | null>();
  const disabled = !query;

  let whereParts: readonly SqlExpression[] = [];
  let groupParts: readonly SqlAlias[] = [];
  let aggegates: readonly SqlAlias[] = [];
  let columnMetadataForTable: ColumnMetadata[] = [];
  if (query) {
    const whereExpression = query.getWhereExpression();
    if (whereExpression) {
      whereParts = whereExpression.decomposeViaAnd();
    }

    groupParts = query.getGroupedSelectExpressions();

    aggegates = query.getAggregateSelectExpressions();

    const schema = query.getFirstSchema() || 'druid';
    const table = query.getFirstTableName();
    columnMetadataForTable = (columnMetadata || []).filter(
      c => c.TABLE_SCHEMA === schema && c.TABLE_NAME === table,
    );
  }

  return (
    <div className="query-tools">
      <ButtonGroup vertical large>
        <Popover
          content={
            <Menu>
              <MenuDivider title="WHERE" />
              {whereParts.map((wherePart, i) => {
                return (
                  <MenuItem
                    key={i}
                    text={wherePart.toString()}
                    onClick={(e: any) => {
                      if (hasAncestorWithClass(e.target, 'bp3-menu-item-label')) return;
                      setFilterDialogOpenOn(wherePart);
                    }}
                    labelElement={
                      <Icon
                        className="remove-icon"
                        icon={IconNames.CROSS}
                        onClick={() => {
                          if (!query) return;
                          onQueryChange(
                            query.changeWhereExpression(
                              query
                                .getEffectiveWhereExpression()
                                .filterAnd(ex => !ex.equals(wherePart)),
                            ),
                            true,
                          );
                        }}
                      />
                    }
                  />
                );
              })}
              <MenuItem
                key="__add__"
                text="Add where clause"
                icon={IconNames.PLUS}
                onClick={() => {
                  setFilterDialogOpenOn(null);
                }}
              />
            </Menu>
          }
        >
          <Button icon={IconNames.FILTER} disabled={disabled} />
        </Popover>
        <Popover
          content={
            <Menu>
              <MenuDivider title="GROUP BY" />
              {groupParts.map((groupPart, i) => {
                return (
                  <MenuItem
                    key={i}
                    text={groupPart.toString()}
                    onClick={(e: any) => {
                      if (hasAncestorWithClass(e.target, 'bp3-menu-item-label')) return;
                      console.log(`${groupPart} clicked`, e.target);
                    }}
                    labelElement={
                      <Icon
                        className="remove-icon"
                        icon={IconNames.CROSS}
                        onClick={() => {
                          if (!query) return;
                          const selectIndex = query.selectExpressions.values.indexOf(groupPart);
                          if (selectIndex < 0) return;
                          onQueryChange(query.removeSelectIndex(selectIndex), true);
                        }}
                      />
                    }
                  />
                );
              })}
              <MenuItem key="__add__" text="Add group by" icon={IconNames.PLUS} />
            </Menu>
          }
        >
          <Button icon={IconNames.GROUP_OBJECTS} disabled={disabled} />
        </Popover>
        <Popover
          content={
            <Menu>
              <MenuDivider title="AGGREGATE" />
              {aggegates.map((aggregate, i) => {
                return (
                  <MenuItem
                    key={i}
                    text={aggregate.toString()}
                    onClick={(e: any) => {
                      if (hasAncestorWithClass(e.target, 'bp3-menu-item-label')) return;
                      console.log(`${aggregate} clicked`, e.target);
                    }}
                    labelElement={
                      <Icon
                        className="remove-icon"
                        icon={IconNames.CROSS}
                        onClick={() => {
                          if (!query) return;
                          const selectIndex = query.selectExpressions.values.indexOf(aggregate);
                          if (selectIndex < 0) return;
                          onQueryChange(query.removeSelectIndex(selectIndex), true);
                        }}
                      />
                    }
                  />
                );
              })}
              <MenuDivider />
              <MenuItem text="Revenue" icon={IconNames.PLUS} />
              <MenuItem text="Impressions" icon={IconNames.PLUS} />
              <MenuItem text="eCPM" icon={IconNames.PLUS} />
              <MenuDivider />
              <MenuItem key="__add__" text="Add custom" icon={IconNames.PLUS} />
            </Menu>
          }
        >
          <Button icon={IconNames.FUNCTION} disabled={disabled} />
        </Popover>
        {typeof filterDialogOpenOn !== 'undefined' && query && (
          <FilterDialog
            baseQuery={query}
            initFilter={filterDialogOpenOn}
            columnMetadata={columnMetadataForTable}
            onChange={filter => {
              if (!query) return;
              const existingFilter = filterDialogOpenOn || new SqlPlaceholder();
              const whereExpression = query.getWhereExpression();
              console.log(`${existingFilter} => ${filter}`);
              onQueryChange(
                query.changeWhereExpression(
                  SqlExpression.and(
                    ...(whereExpression ? whereExpression.decomposeViaAnd() : []).map(e =>
                      e.equals(existingFilter) ? filter : e,
                    ),
                  ),
                ),
                true,
              );
            }}
            onClose={() => setFilterDialogOpenOn(undefined)}
          />
        )}
      </ButtonGroup>
    </div>
  );
});
