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
import { SqlQuery } from 'druid-query-toolkit';
import React from 'react';

import { CustomDecompose } from '../custom-decompose/custom-decompose';

import './custom-control.scss';

export interface CustomControlProps {
  baseQuery: SqlQuery;
  filterDecompose: CustomDecompose;
  changeFilterDecompose: (filterDecompose: CustomDecompose) => void;
}

export const CustomControl = React.memo(function CustomControl(props: CustomControlProps) {
  const { filterDecompose, changeFilterDecompose } = props;

  return (
    <FormGroup className="custom-control">
      <InputGroup
        placeholder="SQL"
        autoFocus
        fill
        value={filterDecompose.getSql()}
        onChange={(e: any) => {
          changeFilterDecompose(filterDecompose.changeSql(e.target.value));
        }}
      />
    </FormGroup>
  );
});
