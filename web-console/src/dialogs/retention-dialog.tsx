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
import axios from 'axios';
import {
  FormGroup,
  Button,
} from "@blueprintjs/core";
import { IconNames } from "@blueprintjs/icons";

import { RuleEditor } from '../components/rule-editor';
import { SnitchDialog } from './snitch-dialog';

import "./retention-dialog.scss"

type RuleType = 'drop' | 'load';
type RuleTime = 'forever' | 'byPeriod' | 'byInterval';

interface Rule {
  type: RuleType;
  time: RuleTime;
  value?: string;
  tieredReplicants?: Record<string, number>;
}

function inflateRule(o: any) {
  if (!o) return null;

  const r: Rule = {
    type: 'drop',
    time: 'forever'
  };

  if (o.type.match(/^load/)) r.type = 'load';
  r.time = o.type.replace(r.type, '');
  r.time = r.time.charAt(0).toLowerCase() + r.time.slice(1) as RuleTime;

  if (r.time !== 'forever') {
    r.value = r.time === 'byInterval' ? o['interval'] : o['period'];
  }

  r.tieredReplicants = o.tieredReplicants;

  return r;
}

function deflateRule(r: Rule) {
  const o: any = {
    type: r.type + r.time.charAt(0).toUpperCase() + r.time.slice(1) as RuleTime
  };

  switch (r.time) {
    case 'byInterval':
      o.interval = r.value;
      o.tieredReplicants = r.tieredReplicants;
      break;

    case 'byPeriod':
      o.period = r.value;
      o.tieredReplicants = r.tieredReplicants;
      break;
  }

  return o;
}

export interface RetentionDialogProps extends React.Props<any> {
  dataSource: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export interface RetentionDialogState {
  rules: Rule[];
  originalRules: Rule[];
  tiers: any[];
}

export class RetentionDialog extends React.Component<RetentionDialogProps, RetentionDialogState> {
  constructor(props: RetentionDialogProps) {
    super(props);
    this.state = {
      originalRules: [],
      rules: [],
      tiers: []
    }
  }

  async getClusterConfig() {
    const { dataSource } = this.props;

    let resp: any;
    try {
      resp = await axios.get(`/druid/coordinator/v1/rules/${dataSource}`);
      resp = resp.data
    } catch (error) {
      console.error(error)
    }

    const tiers = await axios.get('/druid/coordinator/v1/tiers')

    const rules = resp.map(inflateRule);
    this.setState({
      rules,
      originalRules: rules,
      tiers: tiers.data
    });
  }

  save = (author: string, comment: string) => {
    const { onClose, dataSource } = this.props;
    const { rules } = this.state;

    const deflatedRules = rules.map(deflateRule);

    axios.post(`/druid/coordinator/v1/rules/${dataSource}`, deflatedRules, {
      headers:{
        "X-Druid-Author": author,
        "X-Druid-Comment": comment
      }
    });

    onClose();
  }

  changeRule = (newRule: Rule, index: number) => {
    const { rules } = this.state;

    const newRules = rules.map((r, i) => {
      if (i === index) return newRule;
      return r;
    });

    this.setState({
      rules: newRules
    });
  }

  onDeleteRule = (index: number) => {
    const { rules } = this.state;

    const newRules = rules.filter((r, i) => i !== index);

    this.setState({
      rules: newRules
    });
  }

  renderRule = (rule: Rule, index: number) => {
    const { tiers, rules } = this.state;

    return <RuleEditor
      rule={rule}
      tiers={tiers}
      key={index}
      onChange={r => this.changeRule(r, index)}
      onDelete={() => this.onDeleteRule(index)}
    />
  }

  reset = () => {
    const { originalRules } = this.state;

    this.setState({
      rules: originalRules
    });
  }

  addRule = () => {
    const { rules } = this.state;

    rules.push({
      type: 'load',
      time: 'forever'
    });

    this.setState({
      rules
    });
  }

  render() {
    const { isOpen, onClose } = this.props;
    const { rules } = this.state;

    return <SnitchDialog
      className="retention-dialog"
      saveDisabled={false}
      isOpen={ isOpen }
      onOpening={ () => {this.getClusterConfig();}}
      onClose={ onClose }
      title="Edit retention rules"
      onReset={this.reset}
      onSave={this.save}
    >
      <FormGroup>
        {rules.map(this.renderRule)}
      </FormGroup>

      <FormGroup className="right">
        <Button icon={IconNames.PLUS} onClick={this.addRule}>New rule</Button>
      </FormGroup>

    </SnitchDialog>
  }
}
