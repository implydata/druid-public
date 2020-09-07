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

import { SqlComparison, SqlExpression, SqlLiteral, SqlRef } from 'druid-query-toolkit';

import { FilterDecompose, FilterDecomposeValue, FilterType } from '../filter-decompose';

export interface EqualDecomposeValue extends FilterDecomposeValue {
  value?: SqlLiteral;
}

export class EqualDecompose extends FilterDecompose {
  static type: FilterType = 'equal';

  static fromExpression(ex: SqlExpression, _force = false): EqualDecompose | undefined {
    if (ex instanceof SqlComparison && ex.getEffectiveOp() === '=' && !ex.notKeyword) {
      if (ex.lhs instanceof SqlRef && ex.rhs instanceof SqlLiteral) {
        return new EqualDecompose({ column: ex.lhs, value: ex.rhs });
      }
      if (ex.rhs instanceof SqlRef && ex.lhs instanceof SqlLiteral) {
        return new EqualDecompose({ column: ex.rhs, value: ex.lhs });
      }
    }
    return;
  }

  public value?: SqlLiteral;

  constructor(options: EqualDecomposeValue) {
    super(options, EqualDecompose.type);
    this.value = options.value;
  }

  changeValue(newValue: SqlLiteral) {
    const value = this.valueOf() as EqualDecomposeValue;
    value.value = newValue;
    return new EqualDecompose(value);
  }

  getStringValue(): string {
    const { value } = this;
    if (!value) return '';
    return value.value as string; // ToDo: better type check please
  }

  changeStringValue(stringValue: string): EqualDecompose {
    return this.changeValue(SqlLiteral.create(stringValue));
  }

  toExpression(): SqlExpression | undefined {
    if (!this.column || !this.value) return;
    return this.column.equal(this.value);
  }
}

FilterDecompose.register(EqualDecompose);
