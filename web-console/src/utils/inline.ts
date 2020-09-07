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
  SqlAlias,
  SqlBase,
  SqlExpression,
  SqlFunction,
  SqlLiteral,
  SqlQuery,
} from 'druid-query-toolkit';

export function getOnlyStringArg(ex: SqlFunction): string {
  const { args } = ex;
  if (!args) {
    throw new Error(`must have an argument in ${ex}`);
  }

  if (args.length() !== 1) {
    throw new Error(`must have exactly one argument in ${ex}`);
  }

  const firstArg = args.first();
  if (!(firstArg instanceof SqlLiteral) || typeof firstArg.value !== 'string') {
    throw new Error(`must have a literal string argument in ${ex}`);
  }

  return firstArg.value;
}

export function getReplace(
  ex: SqlBase,
  replacements: Record<string, Record<string, SqlExpression>>,
): SqlAlias | undefined {
  if (ex instanceof SqlFunction) {
    const replacement = replacements[ex.getEffectiveFunctionName()];
    if (!replacement) return;

    const key = getOnlyStringArg(ex);
    const replace: SqlBase = replacement[key];
    if (!(replace instanceof SqlExpression)) {
      throw new Error(`Could not find thing referenced in ${ex}`);
    }
    return replace.as(key);
  }
  return;
}

export function inlineReplacements(
  query: SqlQuery,
  replacements: Record<string, Record<string, SqlExpression>>,
): string | SqlQuery {
  return query.walk(ex => {
    if (ex instanceof SqlAlias && !ex.alias) {
      return getReplace(ex.expression, replacements) || ex;
    } else {
      const r = getReplace(ex, replacements);
      return r ? r.expression : ex;
    }
  }) as SqlQuery;
}
