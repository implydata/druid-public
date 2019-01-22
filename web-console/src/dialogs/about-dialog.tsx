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
      title="Apache Druid console"
      isOpen={isOpen}
      usePortal={true}
      canEscapeKeyClose={true}
    >
      <div className={Classes.DIALOG_BODY}>
        <p>
          <strong>
            Blah
          </strong>
        </p>
        <p>
          Hello
        </p>
        <p>How are you.</p>
      </div>
      <div className={Classes.DIALOG_FOOTER}>
        <div className={Classes.DIALOG_FOOTER_ACTIONS}>
          <Tooltip content="This button is hooked up to close the dialog.">
            <Button onClick={onClose}>Close</Button>
          </Tooltip>
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
