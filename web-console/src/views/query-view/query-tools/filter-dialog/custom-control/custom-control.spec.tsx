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

import { render } from '@testing-library/react';
import { SqlQuery, SqlRef } from 'druid-query-toolkit';
import React from 'react';

import { CustomDecompose } from '../custom-decompose/custom-decompose';

import { CustomControl } from './custom-control';

describe('custom control', () => {
  it('matches snapshot', () => {
    const customControl = (
      <CustomControl
        baseQuery={SqlQuery.create(SqlRef.table('wikipedia'))}
        filterDecompose={new CustomDecompose({})}
        changeFilterDecompose={() => {}}
      />
    );

    const { container } = render(customControl);
    expect(container.firstChild).toMatchSnapshot();
  });
});
