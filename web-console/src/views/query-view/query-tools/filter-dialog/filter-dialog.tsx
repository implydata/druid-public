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
  ButtonGroup,
  Classes,
  Dialog,
  FormGroup,
  InputGroup,
  Intent,
} from '@blueprintjs/core';
import { IconNames } from '@blueprintjs/icons';
import { SqlExpression, SqlQuery } from 'druid-query-toolkit';
import React, { useState } from 'react';

import { useGlobalEventListener } from '../../../../hooks';
import { ColumnMetadata } from '../../../../utils';

import { CustomControl } from './custom-control/custom-control';
import { CustomDecompose } from './custom-decompose/custom-decompose';
import { EqualControl } from './equal-control/equal-control';
import { EqualDecompose } from './equal-decompose/equal-decompose';
import { FILTER_TYPES, FilterDecompose } from './filter-decompose';

import './filter-dialog.scss';

export interface FilterDialogProps {
  baseQuery: SqlQuery;
  initFilter: SqlExpression | null;
  columnMetadata: readonly ColumnMetadata[];
  onChange: (filter: SqlExpression) => void;
  onClose: () => void;
}

export const FilterDialog = React.memo(function FilterDialog(props: FilterDialogProps) {
  const { initFilter, columnMetadata, onClose, onChange, baseQuery } = props;
  const [filterDecompose, setFilterDecompose] = useState<FilterDecompose>(() => {
    if (!initFilter) return new EqualDecompose({});
    const decompose = FilterDecompose.fromExpression(initFilter);
    if (decompose) return decompose;
    return new CustomDecompose({});
  });
  // const [columnQuery, setColumnQuery] = useState('');

  useGlobalEventListener('keydown', (e: KeyboardEvent) => {
    if (e.keyCode !== 13) return;
    handleGoClick();
  });

  function handleGoClick() {
    const ex = filterDecompose.toExpression();
    if (!ex) return;
    onChange(ex);
    onClose();
  }

  function renderEqual(): JSX.Element | undefined {
    if (!(filterDecompose instanceof EqualDecompose)) return;
    return (
      <EqualControl
        baseQuery={baseQuery}
        filterDecompose={filterDecompose}
        changeFilterDecompose={setFilterDecompose}
        columnMetadata={columnMetadata}
      />
    );
  }

  function renderIn() {
    if (1 !== 1 + 1) return;
    return (
      <>
        <FormGroup>
          <InputGroup placeholder="value1, value2, ..." autoFocus fill />
        </FormGroup>
        <FormGroup>
          <div className="helper-box">Loading values...</div>
        </FormGroup>
      </>
    );
  }

  function renderContains() {
    if (1 !== 1 + 1) return;
    return (
      <>
        <FormGroup>
          <InputGroup placeholder="search" autoFocus fill />
        </FormGroup>
        <FormGroup>
          <div className="helper-box">Loading preview...</div>
        </FormGroup>
      </>
    );
  }

  function renderRegexp() {
    if (1 !== 1 + 1) return;
    return (
      <>
        <FormGroup>
          <InputGroup placeholder="regexp" autoFocus fill />
        </FormGroup>
        <FormGroup>
          <div className="helper-box">Loading preview...</div>
        </FormGroup>
      </>
    );
  }

  function renderCustom() {
    if (!(filterDecompose instanceof CustomDecompose)) return;
    return (
      <CustomControl
        baseQuery={baseQuery}
        filterDecompose={filterDecompose}
        changeFilterDecompose={setFilterDecompose}
      />
    );
  }

  return (
    <Dialog
      className="filter-dialog"
      icon={IconNames.FILTER}
      onClose={onClose}
      title="Edit where clause"
      isOpen
      canEscapeKeyClose
    >
      <div className={Classes.DIALOG_BODY}>
        <FormGroup>
          <ButtonGroup fill>
            {FILTER_TYPES.map(filterType => (
              <Button
                text={filterType}
                key={filterType}
                onClick={() =>
                  setFilterDecompose(
                    FilterDecompose.convertToType(filterType, filterDecompose.toExpression()),
                  )
                }
                active={filterType === filterDecompose.type}
              />
            ))}
          </ButtonGroup>
        </FormGroup>
        {renderEqual()}
        {renderIn()}
        {renderContains()}
        {renderRegexp()}
        {renderCustom()}
      </div>
      <div className={Classes.DIALOG_FOOTER}>
        <div className={Classes.DIALOG_FOOTER_ACTIONS}>
          <Button text="Close" onClick={onClose} />
          <Button
            intent={Intent.PRIMARY}
            text="Go"
            onClick={handleGoClick}
            disabled={!filterDecompose.isValid()}
          />
        </div>
      </div>
    </Dialog>
  );
});
