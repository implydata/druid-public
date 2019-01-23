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
  Button,
  H1,
} from "@blueprintjs/core";
import "./property-view.css";
import {QueryManager} from "../utils";

export interface PropertyViewProps extends React.Props<any> {

}

export interface PropertyViewState {
  propertyValuePairs: {}[]
}

export class PropertyView extends React.Component<PropertyViewProps, PropertyViewState> {
  private propertyQueryManager: QueryManager<string, any[]>;

  constructor(props: PropertyViewProps, context: any) {
    super(props, context);
    this.state = {
      propertyValuePairs: []
    }
  }

  componentDidMount(): void {
    this.propertyQueryManager = new QueryManager({
      processQuery: async (query: string) => {
        const statusPropertiesResp: any = await axios.get("/status/properties");
        const statusProperties: any = statusPropertiesResp.data;
        const propValPairs: {}[] = Object.keys(statusProperties).sort().map(
          property => ({ property, value: statusProperties[property] })
        );
        return propValPairs;
      },
      onStateChange: ({ result, loading, error }) => {
        if (result === null) return;
        this.setState({
           propertyValuePairs: result
        });
      }
    });

    this.propertyQueryManager.runQuery("dummy");
  }

  componentWillUnmount(): void {
    this.propertyQueryManager.terminate();
  }

  renderPropertyTable() {
    const { propertyValuePairs } = this.state;

    return <>
      <ReactTable
        data={propertyValuePairs}
        filterable={true}
        columns={[
          {
            Header: 'Property',
            accessor: 'property',
            width: 300,
            filterable: true,
            Cell: (row) => row.value
          },
          {
            Header: 'Value',
            accessor: 'value',
            filterable: true,
            Cell: (row) => row.value
          }
        ]}
        defaultPageSize={100}
        className="-striped -highlight"
      />
    </>;
  }

  render() {
    return <div className="property-view app-view">
      <div className="control-bar">
        <H1>Druid status property</H1>
        <Button
          icon="refresh"
          text="Refresh"
          onClick={() => this.propertyQueryManager.rerunLastQuery()}
        />
      </div>
      {this.renderPropertyTable()}
    </div>
  }
}

