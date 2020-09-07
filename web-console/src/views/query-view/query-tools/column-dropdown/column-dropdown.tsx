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

import { Button, MenuItem } from '@blueprintjs/core';
import { IconNames } from '@blueprintjs/icons';
import { Select } from '@blueprintjs/select';
import React from 'react';

import { ColumnMetadata } from '../../../../utils';

import './column-dropdown.scss';

const ColumnSelect = Select.ofType<ColumnMetadata>();

function escapeRegExpChars(text: string) {
  return text.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, '\\$1');
}

function highlightText(text: string, query: string) {
  let lastIndex = 0;
  const words = query
    .split(/\s+/)
    .filter(word => word.length > 0)
    .map(escapeRegExpChars);
  if (words.length === 0) {
    return [text];
  }
  const regexp = new RegExp(words.join('|'), 'gi');
  const tokens: React.ReactNode[] = [];
  while (true) {
    const match = regexp.exec(text);
    if (!match) {
      break;
    }
    const length = match[0].length;
    const before = text.slice(lastIndex, regexp.lastIndex - length);
    if (before.length > 0) {
      tokens.push(before);
    }
    lastIndex = regexp.lastIndex;
    tokens.push(<strong key={lastIndex}>{match[0]}</strong>);
  }
  const rest = text.slice(lastIndex);
  if (rest.length > 0) {
    tokens.push(rest);
  }
  return tokens;
}

export interface ColumnDropdownProps {
  columnMetadata: readonly ColumnMetadata[];
  columnName: string | undefined;
  onChangeColumnName: (columnName: string) => void;
}

export const ColumnDropdown = React.memo(function ColumnDropdown(props: ColumnDropdownProps) {
  const { columnMetadata, columnName, onChangeColumnName } = props;

  return (
    <ColumnSelect
      className="column-dropdown"
      itemsEqual={(a, b) => a.COLUMN_NAME === b.COLUMN_NAME}
      // we may customize the default filmSelectProps.items by
      // adding newly created items to the list, so pass our own
      filterable={false}
      items={columnMetadata as ColumnMetadata[]}
      itemRenderer={(item, { handleClick, modifiers, query }) => {
        if (!modifiers.matchesPredicate) return null;
        return (
          <MenuItem
            key={item.COLUMN_NAME}
            text={highlightText(item.COLUMN_NAME, query)}
            label={item.DATA_TYPE}
            active={modifiers.active}
            disabled={modifiers.disabled}
            onClick={handleClick}
          />
        );
      }}
      itemPredicate={(query, item, _index, exactMatch) => {
        const normalizedTitle = item.COLUMN_NAME.toLowerCase();
        const normalizedQuery = query.toLowerCase();

        if (exactMatch) {
          return normalizedTitle === normalizedQuery;
        } else {
          return normalizedTitle.includes(normalizedQuery);
        }
      }}
      // initialContent={initialContent}
      noResults={<MenuItem disabled text="No results." />}
      onItemSelect={item => {
        onChangeColumnName(item.COLUMN_NAME);
      }}
      popoverProps={{ minimal: true, portalClassName: 'column-dropdown-portal' }}
      // query={columnQuery}
      // onQueryChange={setColumnQuery}
    >
      <Button rightIcon={IconNames.CARET_DOWN} text={columnName || '(No column)'} fill />
    </ColumnSelect>
  );
});
