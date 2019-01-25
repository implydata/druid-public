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

import axios from 'axios';
import * as React from 'react';
import * as classNames from 'classnames';
import ReactTable from "react-table";
import { Filter } from "react-table";
import {
  H1,
  InputGroup,
  Button,
  Intent, Checkbox
} from "@blueprintjs/core";
import { AsyncActionDialog } from '../dialogs/async-action-dialog';
import { addFilter, formatNumber, formatBytes, countBy, lookupBy, QueryManager, getErrorMessage } from "../utils";
import { RetentionDialog } from '../dialogs/retention-dialog';
import { Rule } from '../models';

import "./datasource-view.scss";

export interface DatasourcesViewProps extends React.Props<any> {
  goToSql: (initSql: string) => void;
  goToSegments: (datasource: string, onlyUnavailable?: boolean) => void;
}

interface Datasource {
  datasource: string;
  rules: Rule[]
  [key: string]: any;
}

export interface DatasourcesViewState {
  datasourcesLoading: boolean;
  datasources: Datasource[] | null;
  datasourcesError: string | null;
  datasourcesFilter: Filter[];

  showDisabled: boolean;
  retentionDialogOpenOn: string | null;
  dropDataDatasource: string | null;
  enableDatasource: string | null;
  killDatasource: string | null;
}

export class DatasourcesView extends React.Component<DatasourcesViewProps, DatasourcesViewState> {
  static DISABLED_COLOR = '#0a1500';
  static FULLY_AVAILABLE_COLOR = '#57d500';
  static PARTIALLY_AVAILABLE_COLOR = '#ffbf00';

  private datasourceQueryManager: QueryManager<string, any[]>;

  constructor(props: DatasourcesViewProps, context: any) {
    super(props, context);
    this.state = {
      datasourcesLoading: true,
      datasources: null,
      datasourcesError: null,
      datasourcesFilter: [],

      showDisabled: false,
      retentionDialogOpenOn: null,
      dropDataDatasource: null,
      enableDatasource: null,
      killDatasource: null
    };
  }

  componentDidMount(): void {
    this.datasourceQueryManager = new QueryManager({
      processQuery: async (query: string) => {
        let datasourcesResp: any;
        try {
          datasourcesResp = await axios.post("/druid/v2/sql", { query });
        } catch (e) {
          throw new Error(getErrorMessage(e));
        }
        const datasources: any = datasourcesResp.data;
        const seen = countBy(datasources, (x: any) => x.datasource);

        const disabledResp = await axios.get('/druid/coordinator/v1/metadata/datasources?includeDisabled');
        const disabled: string[] = disabledResp.data.filter((d: string) => !seen[d]);

        const rulesResp = await axios.get('/druid/coordinator/v1/rules');
        const rules = rulesResp.data;
        const defaultRules = rules['_default'];

        const compactionResp = await axios.get('/druid/coordinator/v1/config/compaction');
        const compaction = lookupBy(compactionResp.data.compactionConfigs, (c: any) => c.dataSource);

        const allDatasources = datasources.concat(disabled.map(d => ({ datasource: d, disabled: true })));
        allDatasources.forEach((ds: any) => {
          ds.rules = (rules[ds.datasource] || []).map(Rule.fromJS);
          ds.defaultRules = defaultRules;
          ds.compaction = compaction[ds.datasource];
        });

        return allDatasources;
      },
      onStateChange: ({ result, loading, error }) => {
        this.setState({
          datasources: result,
          datasourcesLoading: loading,
          datasourcesError: error
        });
      }
    });

    this.datasourceQueryManager.runQuery(`SELECT
  datasource,
  COUNT(*) AS num_segments,
  COUNT(*) FILTER(WHERE is_available = 1) AS num_available_segments,
  SUM("size") AS size,
  SUM("num_rows") AS num_rows
FROM sys.segments
GROUP BY 1`);
  }

  componentWillUnmount(): void {
    this.datasourceQueryManager.terminate();
  }

  renderDropDataAction() {
    const { dropDataDatasource } = this.state;

    return <AsyncActionDialog
      action={
        dropDataDatasource ? async () => {
          const resp = await axios.delete(`/druid/coordinator/v1/datasources/${dropDataDatasource}`, {})
          return resp.data;
        } : null
      }
      confirmButtonText="Drop data"
      successText="Data has been dropped"
      failText="Could not drop data"
      intent={Intent.DANGER}
      onClose={(success) => {
        this.setState({ dropDataDatasource: null });
        if (success) this.datasourceQueryManager.rerunLastQuery();
      }}
    >
      <p>
        {`Are you sure you want to drop all the data for datasource '${dropDataDatasource}'?`}
      </p>
    </AsyncActionDialog>;
  }

  renderEnableAction() {
    const { enableDatasource } = this.state;

    return <AsyncActionDialog
      action={
        enableDatasource ? async () => {
          const resp = await axios.post(`/druid/coordinator/v1/datasources/${enableDatasource}`, {})
          return resp.data;
        } : null
      }
      confirmButtonText="Enable datasource"
      successText="Datasource has been enabled"
      failText="Could not enable datasource"
      intent={Intent.PRIMARY}
      onClose={(success) => {
        this.setState({ enableDatasource: null });
        if (success) this.datasourceQueryManager.rerunLastQuery();
      }}
    >
      <p>
        {`Are you sure you want to enable datasource '${enableDatasource}'?`}
      </p>
    </AsyncActionDialog>;
  }

  renderKillAction() {
    const { killDatasource } = this.state;

    return <AsyncActionDialog
      action={
        killDatasource ? async () => {
          const resp = await axios.delete(`/druid/coordinator/v1/datasources/${killDatasource}?kill=true&interval=1000/3000`, {});
          return resp.data;
        } : null
      }
      confirmButtonText="Permanently delete data"
      successText="Kill task was issued. Datasource will be deleted"
      failText="Could not submit kill task"
      intent={Intent.DANGER}
      onClose={(success) => {
        this.setState({ killDatasource: null });
        if (success) this.datasourceQueryManager.rerunLastQuery();
      }}
    >
      <p>
        {`Are you sure you want to permanently delete the data in datasource '${killDatasource}'?`}
      </p>
      <p>
        This action can not be undone.
      </p>
    </AsyncActionDialog>;
  }

  saveRules(datasourceName: string, rules: Rule[], author: string, comment: string) {
    axios.post(`/druid/coordinator/v1/rules/${datasourceName}`, rules.map(r => r.toJS()), {
      headers:{
        "X-Druid-Author": author,
        "X-Druid-Comment": comment
      }
    });
  }

  renderRetentionDialog() {
    const { retentionDialogOpenOn, datasources } = this.state;

    const ds = (datasources || []).find(d => d.datasource === retentionDialogOpenOn);
    const close = () => this.setState({retentionDialogOpenOn: null});

    if (!retentionDialogOpenOn || !ds) return null;

    return <RetentionDialog
      isOpen
      rules={ds.rules}
      onSave={(rules: Rule[], author: string, comment: string) => this.saveRules(retentionDialogOpenOn, rules, author, comment)}
      onCancel={close}
    />;
  }

  renderDatasourceTable() {
    const { goToSegments } = this.props;
    const { datasources, datasourcesLoading, datasourcesError, datasourcesFilter, showDisabled } = this.state;

    let data = datasources || [];
    if (!showDisabled) {
      data = data.filter(d => !d.disabled)
    }

    return <>
      <ReactTable
        data={data}
        loading={datasourcesLoading}
        noDataText={!datasourcesLoading && datasources && !datasources.length ? 'No datasources' : (datasourcesError || '')}
        filterable={true}
        filtered={datasourcesFilter}
        onFilteredChange={(filtered, column) => {
          this.setState({ datasourcesFilter: filtered });
        }}
        columns={[
          {
            Header: "Datasource",
            accessor: "datasource",
            Cell: row => {
              const value = row.value;
              return <a onClick={() => { this.setState({ datasourcesFilter: addFilter(datasourcesFilter, 'datasource', value) }) }}>{value}</a>
            }
          },
          {
            Header: "Availability",
            id: "availability",
            filterable: false,
            accessor: (row) => row.num_available_segments / row.num_segments,
            Cell: (row) => {
              const { datasource, num_available_segments, num_segments, disabled } = row.original;

              if (disabled) {
                return <span>
                  <span style={{ color: DatasourcesView.DISABLED_COLOR }}>&#x25cf;&nbsp;</span>
                  Disabled
                </span>;
              }

              const segmentsEl = <a onClick={() => goToSegments(datasource)}>{`${formatNumber(num_segments)} segments`}</a>;
              if (num_available_segments === num_segments) {
                return <span>
                  <span style={{ color: DatasourcesView.FULLY_AVAILABLE_COLOR }}>&#x25cf;&nbsp;</span>
                  Fully available ({segmentsEl})
                </span>;

              } else {
                const percentAvailable = (Math.floor((num_available_segments / num_segments) * 1000) / 10).toFixed(1);
                const missing = num_segments - num_available_segments;
                const segmentsMissingEl = <a onClick={() => goToSegments(datasource, true)}>{`${formatNumber(missing)} segments unavailable`}</a>;
                return <span>
                  <span style={{ color: DatasourcesView.PARTIALLY_AVAILABLE_COLOR }}>&#x25cf;&nbsp;</span>
                  {percentAvailable}% available ({segmentsEl}, {segmentsMissingEl})
                </span>;

              }
            }
          },
          {
            Header: 'Retention',
            id: 'retention',
            accessor: (row) => row.rules.length,
            filterable: false,
            Cell: row => {
              const { rules } = row.original;
              let text: string;
              if (rules.length === 0) {
                text = 'Cluster default';
              } else if (rules.length === 1) {
                text = rules[0].type;
              } else {
                text = `${rules.length} rules`;
              }

              return <span>{text} <a onClick={() => this.setState({retentionDialogOpenOn: row.original.datasource})}>&#x270E;</a></span>;
            }
          },
          {
            Header: 'Compaction',
            id: 'compaction',
            accessor: (row) => Boolean(row.compaction),
            filterable: false,
            Cell: row => {
              const { compaction } = row.original;
              let text: string;
              if (compaction) {
                text = `Target: ${formatBytes(compaction.targetCompactionSizeBytes)}`;
              } else {
                text = 'None';
              }
              return <span>{text} <a onClick={() => alert('ToDo')}>&#x270E;</a></span>;
            }
          },
          {
            Header: 'Size',
            accessor: 'size',
            filterable: false,
            width: 100,
            Cell: (row) => formatBytes(row.value)
          },
          {
            Header: 'Num rows',
            accessor: 'num_rows',
            filterable: false,
            width: 100,
            Cell: (row) => formatNumber(row.value)
          },
          {
            Header: 'Actions',
            accessor: 'datasource',
            id: 'actions',
            width: 200,
            filterable: false,
            Cell: row => {
              const datasource = row.value;
              const { disabled } = row.original;
              if (disabled) {
                return <div>
                  <a onClick={() => this.setState({ enableDatasource: datasource })}>Enable</a>&nbsp;&nbsp;&nbsp;
                  <a onClick={() => this.setState({ killDatasource: datasource })}>Permanently delete</a>
                </div>
              } else {
                return <div>
                  <a onClick={() => this.setState({ dropDataDatasource: datasource })}>Drop data</a>
                </div>
              }
            }
          }
        ]}
        defaultPageSize={50}
        className="-striped -highlight"
      />
      {this.renderDropDataAction()}
      {this.renderEnableAction()}
      {this.renderKillAction()}
      {this.renderRetentionDialog()}
    </>;
  }

  render() {
    const { goToSql } = this.props;
    const { showDisabled } = this.state;

    return <div className="data-sources-view app-view">
      <div className="control-bar">
        <div className="control-label">Datasources</div>
        <Button
          icon="refresh"
          text="Refresh"
          onClick={() => this.datasourceQueryManager.rerunLastQuery()}
        />
        <Button
          icon="console"
          text="Go to SQL"
          onClick={() => goToSql(this.datasourceQueryManager.getLastQuery())}
        />
        <Checkbox checked={showDisabled} onChange={() => this.setState({ showDisabled: !showDisabled })}>Show disabled</Checkbox>
      </div>
      {this.renderDatasourceTable()}
    </div>
  }
}

