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

import { SqlExpression, SqlRef } from 'druid-query-toolkit';

export type FilterType = 'base' | 'equal' | 'in' | 'contains' | 'regexp' | 'custom';

export const FILTER_TYPES: FilterType[] = ['equal', 'in', 'contains', 'regexp', 'custom'];
export const IMPLEMENTED_FILTER_TYPES: FilterType[] = ['equal', 'custom']; // ToDo: remove this

export interface FilterDecomposeValue {
  type?: FilterType;
  column?: SqlRef;
  columnType?: string;
}

export abstract class FilterDecompose {
  static type: FilterType = 'base';

  static fromExpression(ex: SqlExpression, force = false): FilterDecompose | undefined {
    for (const type of IMPLEMENTED_FILTER_TYPES) {
      const decompose = FilterDecompose.classMap[type].fromExpression(ex, force);
      if (decompose) return decompose;
    }
    return;
  }

  static classMap: Record<string, typeof FilterDecompose> = {};
  static register(ex: typeof FilterDecompose): void {
    FilterDecompose.classMap[ex.type] = ex;
  }

  static getConstructorFor(type: FilterType): typeof FilterDecompose {
    const ClassFn = FilterDecompose.classMap[type];
    if (!ClassFn) throw new Error(`unsupported expression type '${type}'`);
    return ClassFn;
  }

  static fromValue(parameters: FilterDecomposeValue): any {
    const { type } = parameters;
    if (!type) throw new Error(`must set 'type' to use fromValue`);
    const ClassFn = FilterDecompose.getConstructorFor(type) as any;
    return new ClassFn(parameters);
  }

  static convertToType(type: FilterType, expression: SqlExpression | undefined): FilterDecompose {
    if (expression) {
      const decompose = FilterDecompose.classMap[type].fromExpression(expression, true);
      if (decompose) return decompose;
    }
    return this.fromValue({ type });
  }

  public type: FilterType;
  public column?: SqlRef;
  public columnType?: string;

  constructor(options: FilterDecomposeValue, typeOverride: FilterType) {
    const type = typeOverride || options.type;
    if (!type) throw new Error(`could not determine type`);
    this.type = type;
    this.column = options.column;
    this.columnType = options.columnType;
  }

  public valueOf() {
    const value: FilterDecomposeValue = { type: this.type };
    if (this.column) {
      value.column = this.column;
      value.columnType = this.columnType;
    }
    return value;
  }

  public changeColumn(column: SqlRef): this {
    const value = this.valueOf();
    value.column = column;
    return FilterDecompose.fromValue(value);
  }

  public getColumnName(): string | undefined {
    const { column } = this;
    if (!column) return;
    return column.column;
  }

  public changeColumnName(columnName: string): this {
    const { column } = this;
    return this.changeColumn(column ? column.changeColumn(columnName) : SqlRef.column(columnName));
  }

  abstract toExpression(): SqlExpression | undefined;

  public isValid(): boolean {
    return Boolean(this.toExpression());
  }
}
