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

let sqlString: string[] = [];

function toString(ast: any) {
  sqlString = [];
  typeToValue(ast);
  return sqlString.join('');
}

function typeToValue(value: any) {
  if (value.spacing) {
    value.spacing.map((spacing: string) => {
      sqlString.push(spacing);
    });
  }
  switch (value.type) {
    case 'expressionOnly':
      typeToValue(value.expression);
      value.endSpacing.map((spacing: string) => {
        sqlString.push(spacing);
      });
      break;
    case 'query':
      sqlString.push(value.syntax);
      value.selectParts.map((selectpart: any) => {
        typeToValue(selectpart);
      });
      typeToValue(value.from);
      if (value.where) {
        typeToValue(value.where);
      }
      if (value.groupby) {
        typeToValue(value.groupby);
      }
      if (value.having) {
        typeToValue(value.having);
      }
      if (value.orderBy) {
        typeToValue(value.orderBy);
      }
      if (value.limit) {
        typeToValue(value.limit);
      }
      if (value.unionAll) {
        typeToValue(value.limit);
      }
      value.endSpacing.map((spacing: string) => {
        sqlString.push(spacing);
      });
      break;
    case 'where':
      sqlString.push(value.syntax);
      typeToValue(value.expr);
      break;
    case 'having':
      sqlString.push(value.syntax);
      typeToValue(value.expr);
      break;
    case 'innerJoin':
      sqlString.push(value.syntax);
      typeToValue(value.expr);
      break;
    case 'limit':
      sqlString.push(value.syntax);
      typeToValue(value.value);
      break;
    case 'orderBy':
      sqlString.push(value.syntax);
      value.orderByParts.map((orderByPart: any) => {
        typeToValue(orderByPart);
      });
      break;
    case 'selectPart':
      if (value.paren) {
        sqlString.push('(');
      }
      if (value.distinct) {
        typeToValue(value.distinct);
      }
      typeToValue(value.expr);
      if (value.alias) {
        typeToValue(value.alias);
      }
      if (value.paren) {
        sqlString.push(')');
      }
      break;
    case 'variable':
      sqlString.push(value.quote + value.value + value.quote);
      break;
    case 'Constant':
      sqlString.push(value.value);
      break;
    case 'star':
      sqlString.push('*');
      break;
    case 'function':
      sqlString.push(value.functionCall + '(');
      value.arguments.map((argument: any) => {
        typeToValue(argument);
      });
      sqlString.push(')');
      break;
    case 'from':
      sqlString.push(value.syntax);
      typeToValue(value.value);
      break;
    case 'table':
      if (value.table.type) {
        typeToValue(value.table);
      } else {
        sqlString.push(value.schema ? value.schema + '.' + value.table : value.table);
      }
      break;
    case 'argument':
      if (value.distinct) {
        typeToValue(value.distinct);
      }
      typeToValue(value.argumentValue);
      break;
    case 'argumentValue':
      if (value.argument.type) {
        typeToValue(value.argument);
      } else {
        sqlString.push(value.argument);
      }
      break;
    case 'distinct':
      sqlString.push(value.distinct);
      break;
    case 'groupBy':
      sqlString.push(value.syntax);
      value.groupByParts.map((groupByPart: any) => {
        typeToValue(groupByPart);
      });
      break;
    case 'orderByPart':
      value.expr.map((expr: any) => {
        typeToValue(expr);
      });
      if (value.direction) {
        typeToValue(value.direction);
      }
      break;
    case 'direction':
      sqlString.push(value.direction);
      break;
    case 'exprPart':
      typeToValue(value.value);
      break;
    case 'Integer':
      sqlString.push(value.value);
      break;
    case 'Interval':
      sqlString.push(value.value);
      break;
    case 'expression':
      typeToValue(value.lhs);
      typeToValue(value.operator);
      typeToValue(value.rhs);
      break;
    case 'operator':
      sqlString.push(value.operator);
      break;
    case 'timestamp':
      sqlString.push('TIMESTAMP ' + "'" + value.value + "'");
      break;
    case 'case':
      sqlString.push(value.syntax);
      if (value.caseValue) {
        typeToValue(value.caseValue);
      }
      value.when.map((when: any) => {
        typeToValue(when);
      });
      if (value.elseValue) {
        typeToValue(value.elseValue);
      }
      typeToValue(value.end);
      break;
    case 'caseValue':
      typeToValue(value.caseValue);
      break;
    case 'when':
      sqlString.push(value.syntax);
      typeToValue(value.when);
      typeToValue(value.then);
      break;
    case 'elseValue':
      sqlString.push(value.syntax);
      typeToValue(value.elseValue);
      break;
    case 'end':
      sqlString.push(value.syntax);
      break;
    case 'alias':
      sqlString.push(value.syntax);
      typeToValue(value.value);
      break;
    case 'then':
      sqlString.push(value.syntax);
      typeToValue(value.then);
      break;
  }
}

export { toString };
