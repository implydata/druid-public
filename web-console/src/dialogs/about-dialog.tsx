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

import * as React from 'react';
import {
  FormGroup,
  Button,
  InputGroup,
  Dialog,
  NumericInput,
  Classes,
  Tooltip,
  AnchorButton,
  TagInput,
  Intent,
  ButtonGroup,
  HTMLSelect
} from "@blueprintjs/core";

export interface AboutDialogProps extends React.Props<any> {
  isOpen: boolean,
  onClose: () => void
}

export interface AboutDialogState {
}

export class AboutDialog extends React.Component<AboutDialogProps, AboutDialogState> {
  constructor(props: AboutDialogProps) {
    super(props);
    this.state = {};
  }

  render() {
    const { isOpen, onClose } = this.props;

    return <Dialog
      icon="info-sign"
      onClose={onClose}
      title="Apache Druid"
      isOpen={isOpen}
      usePortal={true}
      canEscapeKeyClose={true}
    >
      <div className={Classes.DIALOG_BODY}>
        <p>
          <strong>
            Apache Druid (incubating) is a high performance real-time analytics database.
          </strong>
        </p>
        <p>
          Druid is an open source distributed data store.
          Druid’s core design combines ideas from OLAP/analytic databases, timeseries databases, and search systems to create a unified system for operational analytics. Druid merges key characteristics of each of the 3 systems into its ingestion layer, storage format, querying layer, and core architecture.
        </p>
      </div>
      <div className={Classes.DIALOG_FOOTER}>
        <div className={Classes.DIALOG_FOOTER_ACTIONS}>
          <Button onClick={onClose}>Close</Button>
          <AnchorButton
            intent={Intent.PRIMARY}
            href="http://druid.io"
            target="_blank"
          >
            Visit Druid
          </AnchorButton>
        </div>
      </div>
    </Dialog>;
  }
}
