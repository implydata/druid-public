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
import "./data-source-view.css";

export interface DruidStatusPropertyViewProps extends React.Props<any> {

}

export interface DruidStatusPropertyViewState {
  propertyValuePairs: {}[]
}

export class DruidStatusPropertyView extends React.Component<DruidStatusPropertyViewProps, DruidStatusPropertyViewState> {
  constructor(props: DruidStatusPropertyViewProps, context: any) {
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
    console.log(resp);
    let propValPairs = [];
    for (let property in resp) {
      propValPairs.push({
        property: property,
        value: resp[property]
      })
    }
    console.log(propValPairs)
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
        columns={[
          {
            Header: 'Property',
            accessor: 'property',
            filterable: false,
            width: 300,
            Cell: (row) => row.value
          },
          {
            Header: 'Value',
            accessor: 'value',
            filterable: false,
            // width: 300,
            Cell: (row) => row.value
          }
        ]}
        defaultPageSize={50}
        className="-striped -highlight"
      />
    </>;
  }

  render() {
    return <div className="data-sources-view app-view">
      <div className="control-bar">
        <H1>Druid Status Property</H1>
        {/*<Button*/}
          {/*rightIcon="refresh"*/}
          {/*text="Refresh"*/}
          {/*onClick={() => this.dataSourceQueryManager.rerunLastQuery()}*/}
        {/*/>*/}
        {/*<Button*/}
          {/*rightIcon="share"*/}
          {/*text="Go to SQL"*/}
          {/*onClick={() => goToSql(this.dataSourceQueryManager.getLastQuery())}*/}
        {/*/>*/}
        {/*<Checkbox checked={showDisabled} onChange={() => this.setState({ showDisabled: !showDisabled })}>Show disabled</Checkbox>*/}
      </div>
      {this.renderDataSourceTable()}
    </div>
  }
}

