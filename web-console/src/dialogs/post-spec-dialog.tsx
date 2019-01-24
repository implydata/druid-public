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

import * as React from "react";
import axios from 'axios';
import {Button, Classes, Dialog, Intent, EditableText} from "@blueprintjs/core";
import "./post-spec-dialog.scss"
import {QueryManager} from "../utils";

export interface PostSpecDialogProps extends React.Props<any> {
  isOpen: boolean,
  postEndpoint: string,
  onClose: () => void
}

export interface PostSpecDialogState {
  spec: string;
}

export class PostSpecDialog extends React.Component<PostSpecDialogProps, PostSpecDialogState> {
  private postSpecQueryManager: QueryManager<string, any[]>;

  constructor(props: PostSpecDialogProps) {
    super(props);
    this.state = {
      spec: ""
    }
  }

  componentDidMount(): void {
    const { postEndpoint } = this.props;
    const { spec } = this.state;

    this.postSpecQueryManager = new QueryManager({
      processQuery: async (query: string) => {
        const resp = await axios.post(postEndpoint, JSON.parse(spec) );
        return resp.data;
      }
    })
  }

  componentWillUnmount(): void {
    this.postSpecQueryManager.terminate();
  }

  private postSpec(): void {
    const { onClose } = this.props;

    this.postSpecQueryManager.runQuery("dummy");
    onClose();
  }

  render() {
    const { isOpen, onClose } = this.props;

    return <Dialog
      className={"post-spec-dialog"}
      isOpen={ isOpen }
      onClose={ onClose }
      title={"Post spec"}
    >
      <EditableText
        className={"post-spec-dialog-textarea"}
        multiline={true}
        minLines={30}
        maxLines={30}
        placeholder={"Enter the specifications to post"}
        onChange={ (e) => {this.setState({ spec: e })}}
      />
      <div className={Classes.DIALOG_FOOTER}>
        <div className={Classes.DIALOG_FOOTER_ACTIONS}>
          <Button
            text="Close"
            onClick={onClose}
          />
          <Button
            text="Submit"
            intent={Intent.PRIMARY}
            onClick={() => this.postSpec()}
          />
        </div>
      </div>
    </Dialog>;
  }
}
