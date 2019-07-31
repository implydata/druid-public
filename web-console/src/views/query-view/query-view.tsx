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

import { Intent } from '@blueprintjs/core';
import axios from 'axios';
import classNames from 'classnames';
import Hjson from 'hjson';
import React from 'react';
import SplitterLayout from 'react-splitter-layout';

import { SqlQuery } from '../../../../../druid-sql-parser/src/ast/index';
import { sqlParserFactory } from '../../../../../druid-sql-parser/src/parser/druidsql';
import { QueryPlanDialog } from '../../dialogs';
import { AppToaster } from '../../singletons/toaster';
import {
  BasicQueryExplanation,
  decodeRune,
  downloadFile,
  getDruidErrorMessage,
  HeaderRows,
  localStorageGet,
  LocalStorageKeys,
  localStorageSet,
  parseQueryPlan,
  queryDruidSql,
  QueryManager,
  SemiJoinQueryExplanation,
} from '../../utils';
import { ColumnMetadata } from '../../utils/column-metadata';
import { isEmptyContext, QueryContext } from '../../utils/query-context';

import { ColumnTree } from './column-tree/column-tree';
import { QueryExtraInfo, QueryExtraInfoData } from './query-extra-info/query-extra-info';
import { QueryInput } from './query-input/query-input';
import { QueryOutput } from './query-output/query-output';
import { RunButton } from './run-button/run-button';

import './query-view.scss';

const parser = sqlParserFactory([
  'COUNT',
  'SUM',
  'MIN',
  'MAX',
  'AVG',
  'APPROX_COUNT_DISTINCT',
  'APPROX_COUNT_DISTINCT_DS_HLL',
  'APPROX_COUNT_DISTINCT_DS_THETA',
  'APPROX_QUANTILE',
  'APPROX_QUANTILE_DS',
  'APPROX_QUANTILE_FIXED_BUCKETS',
  'BLOOM_FILTER',
  'ABS',
  'CEIL',
  'EXP',
  'FLOOR',
  'LN',
  'LOG10',
  'POWER',
  'SQRT',
  'TRUNCATE',
  'TRUNC',
  'ROUND',
  'MOD',
  'SIN',
  'COS',
  'TAN',
  'COT',
  'ASIN',
  'ACOS',
  'ATAN',
  'ATAN2',
  'DEGREES',
  'RADIANS',
  'CONCAT',
  'TEXTCAT',
  'STRING_FORMAT',
  'LENGTH',
  'CHAR_LENGTH',
  'CHARARACTER_LENGTH',
  'STRLEN',
  'LOOKUP',
  'LOWER',
  'PARSE_LONG',
  'POSITION',
  'REGEXP_EXTRACT',
  'REPLACE',
  'STRPOS',
  'SUBSTRING',
  'RIGHT',
  'LEFT',
  'SUBSTR',
  'TRIM',
  'BTRIM',
  'LTRIM',
  'RTRIM',
  'UPPER',
  'REVERSE',
  'REPEAT',
  'LPAD',
  'RPAD',
  'CURRENT_TIMESTAMP',
  'CURRENT_DATE',
  'DATE_TRUNC',
  'TIME_FLOOR',
  'TIME_SHIFT',
  'TIME_EXTRACT',
  'TIME_PARSE',
  'TIME_FORMAT',
  'MILLIS_TO_TIMESTAMP',
  'TIMESTAMP_TO_MILIS',
  'EXTRACT',
  'FLOOR',
  'CEIL',
  'TIMESTAMPADD',
  'timestamp_expr',
  'CAST',
  'NULLIF',
  'COALESCE',
  'BLOOM_FILTER_TEST',
]);

interface QueryWithContext {
  queryString: string;
  queryContext: QueryContext;
  wrapQuery?: boolean;
}

export interface QueryViewProps {
  initQuery: string | undefined;
}

export interface QueryViewState {
  queryString: string;
  queryContext: QueryContext;

  columnMetadataLoading: boolean;
  columnMetadata: ColumnMetadata[] | null;
  columnMetadataError: string | null;

  loading: boolean;
  result: HeaderRows | null;
  queryExtraInfo: QueryExtraInfoData | null;
  error: string | null;

  explainDialogOpen: boolean;
  explainResult: BasicQueryExplanation | SemiJoinQueryExplanation | string | null;
  loadingExplain: boolean;
  explainError: Error | null;

  defaultSchema?: string;
  defaultTable?: string;
  ast?: SqlQuery;
}

interface QueryResult {
  queryResult: HeaderRows;
  queryExtraInfo: QueryExtraInfoData;
  parsedQuery?: SqlQuery;
}

export class QueryView extends React.PureComponent<QueryViewProps, QueryViewState> {
  static trimSemicolon(query: string): string {
    // Trims out a trailing semicolon while preserving space (https://bit.ly/1n1yfkJ)
    return query.replace(/;+((?:\s*--[^\n]*)?\s*)$/, '$1');
  }

  static isRune(queryString: string): boolean {
    return queryString.trim().startsWith('{');
  }

  static validRune(queryString: string): boolean {
    try {
      Hjson.parse(queryString);
      return true;
    } catch {
      return false;
    }
  }

  static formatStr(s: string | number, format: 'csv' | 'tsv') {
    if (format === 'csv') {
      // remove line break, single quote => double quote, handle ','
      return `"${String(s)
        .replace(/(?:\r\n|\r|\n)/g, ' ')
        .replace(/"/g, '""')}"`;
    } else {
      // tsv
      // remove line break, single quote => double quote, \t => ''
      return String(s)
        .replace(/(?:\r\n|\r|\n)/g, ' ')
        .replace(/\t/g, '')
        .replace(/"/g, '""');
    }
  }

  private metadataQueryManager: QueryManager<null, ColumnMetadata[]>;
  private sqlQueryManager: QueryManager<QueryWithContext, QueryResult>;
  private explainQueryManager: QueryManager<
    QueryWithContext,
    BasicQueryExplanation | SemiJoinQueryExplanation | string
  >;

  constructor(props: QueryViewProps, context: any) {
    super(props, context);

    this.state = {
      queryString: props.initQuery || localStorageGet(LocalStorageKeys.QUERY_KEY) || '',
      queryContext: {},

      columnMetadataLoading: false,
      columnMetadata: null,
      columnMetadataError: null,

      loading: false,
      result: null,
      queryExtraInfo: null,
      error: null,

      explainDialogOpen: false,
      loadingExplain: false,
      explainResult: null,
      explainError: null,
    };

    this.metadataQueryManager = new QueryManager({
      processQuery: async () => {
        return await queryDruidSql<ColumnMetadata>({
          query: `SELECT TABLE_SCHEMA, TABLE_NAME, COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS`,
        });
      },
      onStateChange: ({ result, loading, error }) => {
        if (error) {
          AppToaster.show({
            message: 'Could not load SQL metadata',
            intent: Intent.DANGER,
          });
        }
        this.setState({
          columnMetadataLoading: loading,
          columnMetadata: result,
          columnMetadataError: error,
        });
      },
    });

    this.sqlQueryManager = new QueryManager({
      processQuery: async (queryWithContext: QueryWithContext): Promise<QueryResult> => {
        const { queryString, queryContext, wrapQuery } = queryWithContext;
        let queryId: string | null = null;
        let sqlQueryId: string | null = null;
        let wrappedLimit: number | undefined;
        let ast: SqlQuery | undefined;
        let queryResult: HeaderRows;
        const startTime = new Date();
        let endTime: Date;

        try {
          ast = parser(queryString);
        } catch (e) {}

        if (QueryView.isRune(queryString)) {
          // Secret way to issue a native JSON "rune" query
          const runeQuery = Hjson.parse(queryString);

          if (!isEmptyContext(queryContext)) runeQuery.context = queryContext;
          let runeResult: any[];
          try {
            const runeResultResp = await axios.post('/druid/v2', runeQuery);
            endTime = new Date();
            runeResult = runeResultResp.data;
            queryId = runeResultResp.headers['x-druid-query-id'];
          } catch (e) {
            throw new Error(getDruidErrorMessage(e));
          }

          queryResult = decodeRune(runeQuery, runeResult);
        } else {
          const actualQuery = wrapQuery
            ? `SELECT * FROM (${QueryView.trimSemicolon(queryString)}\n) LIMIT 1000`
            : queryString;

          if (wrapQuery) wrappedLimit = 1000;

          const queryPayload: Record<string, any> = {
            query: actualQuery,
            resultFormat: 'array',
            header: true,
          };

          if (!isEmptyContext(queryContext)) queryPayload.context = queryContext;
          let sqlResult: any[];
          try {
            const sqlResultResp = await axios.post('/druid/v2/sql', queryPayload);
            endTime = new Date();
            sqlResult = sqlResultResp.data;
            sqlQueryId = sqlResultResp.headers['x-druid-sql-query-id'];
          } catch (e) {
            throw new Error(getDruidErrorMessage(e));
          }

          queryResult = {
            header: sqlResult && sqlResult.length ? sqlResult[0] : [],
            rows: sqlResult && sqlResult.length ? sqlResult.slice(1) : [],
          };
        }
        console.log('updating');
        return {
          queryResult,
          queryExtraInfo: {
            queryId,
            sqlQueryId,
            startTime,
            endTime,
            numResults: queryResult.rows.length,
            wrappedLimit,
          },
          parsedQuery: ast,
        };
      },
      onStateChange: ({ result, loading, error }) => {
        this.setState({
          result: result ? result.queryResult : null,
          queryExtraInfo: result ? result.queryExtraInfo : null,
          loading,
          error,
          ast: result ? result.parsedQuery : undefined,
        });
      },
    });

    this.explainQueryManager = new QueryManager({
      processQuery: async (queryWithContext: QueryWithContext) => {
        const { queryString, queryContext } = queryWithContext;
        const explainPayload: Record<string, any> = {
          query: `EXPLAIN PLAN FOR (${QueryView.trimSemicolon(queryString)}\n)`,
          resultFormat: 'object',
        };

        if (!isEmptyContext(queryContext)) explainPayload.context = queryContext;
        const result = await queryDruidSql(explainPayload);

        return parseQueryPlan(result[0]['PLAN']);
      },
      onStateChange: ({ result, loading, error }) => {
        this.setState({
          explainResult: result,
          loadingExplain: loading,
          explainError: error !== null ? new Error(error) : null,
        });
      },
    });
  }

  componentDidMount(): void {
    this.metadataQueryManager.runQuery(null);
  }

  componentWillUnmount(): void {
    this.metadataQueryManager.terminate();
    this.sqlQueryManager.terminate();
    this.explainQueryManager.terminate();
  }

  handleDownload = (filename: string, format: string) => {
    const { result } = this.state;
    if (!result) return;
    let lines: string[] = [];
    let separator: string = '';

    if (format === 'csv' || format === 'tsv') {
      separator = format === 'csv' ? ',' : '\t';
      lines.push(result.header.map(str => QueryView.formatStr(str, format)).join(separator));
      lines = lines.concat(
        result.rows.map(r => r.map(cell => QueryView.formatStr(cell, format)).join(separator)),
      );
    } else {
      // json
      lines = result.rows.map(r => {
        const outputObject: Record<string, any> = {};
        for (let k = 0; k < r.length; k++) {
          const newName = result.header[k];
          if (newName) {
            outputObject[newName] = r[k];
          }
        }
        return JSON.stringify(outputObject);
      });
    }

    const lineBreak = '\n';
    downloadFile(lines.join(lineBreak), format, filename);
  };

  renderExplainDialog() {
    const { explainDialogOpen, explainResult, loadingExplain, explainError } = this.state;
    if (!loadingExplain && explainDialogOpen) {
      return (
        <QueryPlanDialog
          explainResult={explainResult}
          explainError={explainError}
          onClose={() => this.setState({ explainDialogOpen: false })}
        />
      );
    }
    return null;
  }

  renderMainArea() {
    const {
      queryString,
      queryContext,
      loading,
      result,
      queryExtraInfo,
      error,
      columnMetadata,
      ast,
    } = this.state;
    const runeMode = QueryView.isRune(queryString);

    return (
      <SplitterLayout
        vertical
        percentage
        secondaryInitialSize={
          Number(localStorageGet(LocalStorageKeys.QUERY_VIEW_PANE_SIZE) as string) || 60
        }
        primaryMinSize={30}
        secondaryMinSize={30}
        onSecondaryPaneSizeChange={this.handleSecondaryPaneSizeChange}
      >
        <div className="control-pane">
          <QueryInput
            queryString={queryString}
            onQueryStringChange={this.handleQueryStringChange}
            runeMode={runeMode}
            columnMetadata={columnMetadata}
          />
          <div className="control-bar">
            <RunButton
              runeMode={runeMode}
              queryContext={queryContext}
              onQueryContextChange={this.handleQueryContextChange}
              onRun={this.handleRun}
              onExplain={this.handleExplain}
            />
            {queryExtraInfo && (
              <QueryExtraInfo queryExtraInfo={queryExtraInfo} onDownload={this.handleDownload} />
            )}
          </div>
        </div>
        <QueryOutput
          aggregateColumns={ast ? ast.getAggregateColumns() : undefined}
          disabled={!ast}
          sorted={ast ? ast.getSorted() : undefined}
          handleSQLAction={this.handleSqlAction}
          loading={loading}
          result={result}
          error={error}
        />
      </SplitterLayout>
    );
  }

  private handleQueryStringChange = (queryString: string): void => {
    this.setState({ queryString });
  };

  // private insertExpression(row: string, header: string, operator: string) {
  //   const { queryString } = this.state;
  //   const ast = parser(queryString);
  //   const excludeExpr = {
  //     type: 'expression',
  //     operator: {
  //       type: 'operator',
  //       spacing: [' '],
  //       operator: operator,
  //     },
  //     lhs: {
  //       type: 'variable',
  //       value: header,
  //       spacing: [' '],
  //       quote: '"',
  //     },
  //     rhs: {
  //       type: 'variable',
  //       value: row,
  //       spacing: [' '],
  //       quote: "'",
  //     },
  //     spacing: [''],
  //   };
  //   let found: boolean = false;
  //   if (ast.where) {
  //     let node = ast.where.expr;
  //     let parent = null;
  //     do {
  //       if (node.lhs.value === header && node.operator.operator === operator) {
  //         found = true;
  //         break;
  //       }
  //       parent = node;
  //       node = node.rhs;
  //     } while (node.type === 'expression');
  //     if (found) {
  //       if (node.rhs.type === 'expression') {
  //         node.rhs.lhs.value = row;
  //       } else {
  //         node.rhs.value = row;
  //       }
  //     } else {
  //       const temp = parent.rhs;
  //       parent.rhs = {
  //         type: 'expression',
  //         operator: {
  //           type: 'operator',
  //           spacing: [' '],
  //           operator: 'AND',
  //         },
  //         lhs: temp,
  //         rhs: excludeExpr,
  //         spacing: [''],
  //       };
  //     }
  //   } else {
  //     ast.where = {
  //       type: 'where',
  //       spacing: ['\n'],
  //       expr: excludeExpr,
  //       syntax: 'WHERE',
  //     };
  //   }
  //   this.setState({ queryString: toString(ast) });
  //
  private handleSqlAction = (row: string, header: string, action: string): void => {
    let ast: SqlQuery | undefined = this.state.ast;
    if (ast) {
      switch (action) {
        case 'order by': {
          const direction = ast.getDirection(header) === 'ASC' ? 'DESC' : 'ASC';
          ast = ast.orderBy(header, direction);
          this.setState({
            queryString: ast.toString(),
          });
          break;
        }
        case 'exclude column': {
          console.log(ast);
          ast = ast.excludeColumn(header);
          console.log(ast);
          this.setState({
            queryString: ast.toString(),
          });
          break;
        }
        case 'exclude': {
          ast = ast.excludeRow(header, row, '!=');
          this.setState({
            queryString: ast.toString(),
          });
          break;
        }
        case 'filter': {
          ast = ast.excludeRow(header, row, '=');
          this.setState({
            queryString: ast.toString(),
          });
          break;
        }
      }
      this.handleRun(true, ast.toString());
    }
  };
  // switch (action) {
  //   case 'exclude':
  //     this.insertExpression(row, header, '!=');
  //     break;
  //   case 'exclude column':
  //     console.log(ast);
  //     const parts: any[] = [];
  //     let spacing: string[] | null = null;
  //     ast.selectParts.map((part: any, index: number) => {
  //       if (part.expr.value !== header) {
  //         if (part.alias) {
  //           if (part.alias.value.value !== header) {
  //             parts.push(part);
  //             if (spacing && index === 1) {
  //               part.spacing = spacing;
  //             }
  //           }
  //         } else {
  //           parts.push(part);
  //           if (spacing && index === 1) {
  //             part.spacing = spacing;
  //           }
  //         }
  //       } else if (index === 0) {
  //         spacing = part.spacing;
  //       }
  //     });
  //     ast.selectParts = parts;
  //     this.setState({ queryString: toString(ast) });
  //     break;
  //   case 'filter':
  //     this.insertExpression(row, header, '=');
  //     break;
  //   case 'order by':
  //     if (header.search(/[._]/)) {
  //       header = '"' + header + '"';
  //     }
  //     let direction: string = 'ASC';
  //     if (ast.orderBy) {
  //       ast.orderBy.orderByParts.map((part: any) => {
  //         if (part.expr[0].value.value === header) {
  //           if (part.direction) {
  //             direction = part.direction.direction === 'DESC' ? 'ASC' : 'DESC';
  //           }
  //         }
  //       });
  //     }
  //     ast.orderBy = {
  //       type: 'orderBy',
  //       orderByParts: [
  //         {
  //           type: 'orderByPart',
  //           expr: [
  //             {
  //               type: 'exprPart',
  //               value: {
  //                 type: 'variable',
  //                 value: header,
  //                 spacing: [],
  //                 quote: "'",
  //               },
  //               spacing: [],
  //             },
  //           ],
  //           direction: {
  //             type: 'direction',
  //             direction: direction,
  //             spacing: [' '],
  //           },
  //           spacing: [' '],
  //         },
  //       ],
  //       spacing: ['\n'],
  //       syntax: 'ORDER BY',
  //     };
  //     this.setState({
  //       sorted: [{ id: header, desc: direction === 'DESC' ? true : false }],
  //       queryString: toString(ast),
  //     });
  //     this.handleRun(true);
  //     break;
  // }
  // }

  private handleQueryContextChange = (queryContext: QueryContext) => {
    this.setState({ queryContext });
  };

  private handleRun = (wrapQuery: boolean, customQueryString?: string) => {
    const { queryString, queryContext } = this.state;
    if (!customQueryString) {
      customQueryString = queryString;
    }
    if (QueryView.isRune(customQueryString) && !QueryView.validRune(customQueryString)) return;

    localStorageSet(LocalStorageKeys.QUERY_KEY, customQueryString);
    this.sqlQueryManager.runQuery({ queryString: customQueryString, queryContext, wrapQuery });
  };

  private handleExplain = () => {
    const { queryString, queryContext } = this.state;
    this.setState({ explainDialogOpen: true });
    this.explainQueryManager.runQuery({ queryString, queryContext });
  };

  private handleSecondaryPaneSizeChange = (secondaryPaneSize: number) => {
    localStorageSet(LocalStorageKeys.QUERY_VIEW_PANE_SIZE, String(secondaryPaneSize));
  };

  render() {
    const {
      columnMetadata,
      columnMetadataLoading,
      columnMetadataError,
      ast,
      queryString,
    } = this.state;
    if (ast) {
      console.log(ast.getAggregateColumns());
    }
    let tempAst: SqlQuery | undefined;
    if (!ast) {
      try {
        tempAst = parser(queryString);
      } catch (e) {}
    }
    return (
      <div
        className={classNames('query-view app-view', { 'hide-column-tree': columnMetadataError })}
      >
        {!columnMetadataError && (
          <ColumnTree
            defaultSchema={
              ast ? ast.getFromNameSpace() : tempAst ? tempAst.getFromNameSpace() : undefined
            }
            defaultTable={ast ? ast.getFromName() : tempAst ? tempAst.getFromName() : undefined}
            columnMetadataLoading={columnMetadataLoading}
            columnMetadata={columnMetadata}
            onQueryStringChange={this.handleQueryStringChange}
          />
        )}
        {this.renderMainArea()}
        {this.renderExplainDialog()}
      </div>
    );
  }
}
