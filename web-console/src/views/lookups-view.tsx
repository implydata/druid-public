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
  Button
} from "@blueprintjs/core";
import { addFilter, QueryManager } from "../utils";

import "./lookups-view.scss";

export interface LookupsViewProps extends React.Props<any> {

}

export interface LookupsViewState {
  lookups: {}[],
  loadingLookups: boolean
}

export class LookupsView extends React.Component<LookupsViewProps, LookupsViewState> {
  private lookupsQueryManager: QueryManager<string, any[]>;

  constructor(props: LookupsViewProps, context: any) {
    super(props, context);
    this.state = {
      lookups: [],
      loadingLookups: true
    };
  }

  componentDidMount(): void {
    this.lookupsQueryManager = new QueryManager({
      processQuery: async (query: string) => {
        let lookupEntries: {}[] = [];
        const lookupTiersResp = await axios.get("/druid/coordinator/v1/lookups/config");
        const lookupTiers: string[] = lookupTiersResp.data;
        for (let tier of lookupTiers) {
          const lookupIdsResp = await axios.get(`/druid/coordinator/v1/lookups/config/${tier}`);
          const lookupIds: string[] = lookupIdsResp.data;
          for (let id of lookupIds) {
            const lookupResp = await axios.get(`/druid/coordinator/v1/lookups/config/${tier}/${id}`);
            const lookup: any = lookupResp.data;
            lookupEntries.push({id: id, lookupExtractorFactory: lookup.lookupExtractorFactory});
          }
        }
        console.log("resp",lookupEntries);
        return lookupEntries;
      },
      onStateChange: ({ result, loading, error }) => {
        if (result === null) return;
        this.setState({
          lookups: result,
          loadingLookups: loading
        });
      }
    });

    this.lookupsQueryManager.runQuery("dummy");
  }

  componentWillUnmount(): void {
    this.lookupsQueryManager.terminate();
  }


  renderLookupsTable() {
    const { lookups, loadingLookups} = this.state;
    return <>
      <ReactTable
        data={lookups}
        loading={loadingLookups}
        filterable={true}
        columns={[
          {
            Header: "Lookups",
            accessor: "id",
            filterable: false,
            Cell: (row) => {
              return row.value
            }
          },
          {
            Header: "Type",
            accessor: "lookupExtractorFactory",
            filterable: false,
            Cell: row => {
              return row.value.type;
            }
          },
          {
            Header: "Config",
            accessor: "config",
            filterable: false,
            Cell: row => {
              return <div><Button icon={"edit"} minimal={true}/> <Button icon={"delete"} minimal={true} /></div>
            }
          }
        ]}
        defaultPageSize={50}
        className="-striped -highlight"
      />
    </>;
  }

  render() {
    return <div className="lookups-view app-view">
      <div className="control-bar">
        <H1>Lookups</H1>
        <Button
          icon="refresh"
          text="Refresh"
          onClick={() => this.lookupsQueryManager.rerunLastQuery()}
        />
      </div>
      {this.renderLookupsTable()}
    </div>
  }
}

