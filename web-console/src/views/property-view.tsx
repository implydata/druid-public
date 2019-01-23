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
} from "@blueprintjs/core";
import "./property-view.css";

export interface PropertyViewProps extends React.Props<any> {

}

export interface PropertyViewState {
  propertyValuePairs: {}[]
}

export class PropertyView extends React.Component<PropertyViewProps, PropertyViewState> {
  constructor(props: PropertyViewProps, context: any) {
    super(props, context);
    this.state = {
      propertyValuePairs: []
    }
  }

  async getStatusProperty() {
    let resp: any;
    try {
      resp = await axios.get("/status/properties");
      resp = resp.data
    } catch (error) {
      console.error(error)
    }
    let propValPairs = [];
    for (let property in resp) {
      propValPairs.push({
        property: property,
        value: resp[property]
      })
    }
    this.setState({propertyValuePairs: propValPairs} );
  }

  componentDidMount(): void {
    this.getStatusProperty();
  }

  renderDataSourceTable() {
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
        <H1>Druid Status Property</H1>
      </div>
      {this.renderDataSourceTable()}
    </div>
  }
}

