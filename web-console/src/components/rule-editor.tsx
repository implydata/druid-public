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
  ControlGroup,
  Card,
  Label,
  InputGroup,
  HTMLSelect,
  Popover,
  Menu, MenuItem,
  Position,
  Collapse,
} from "@blueprintjs/core";

import { IconNames } from "@blueprintjs/icons";

import { Rule, RuleTime, RuleType } from '../models';

import './rule-editor.scss';


export interface RuleEditorProps extends React.Props<any> {
  rule: Rule;
  tiers: any[];
  onChange: (newRule: Rule) => void;
  onDelete: () => void;
  moveUp?: () => void;
  moveDown?: () => void;
}

export interface RuleEditorState {
  isOpen: boolean;
}

export class RuleEditor extends React.Component<RuleEditorProps, RuleEditorState> {

  constructor(props: RuleEditorProps) {
    super(props);
    this.state = {
      isOpen: true
    }
  }

  renderTiers() {
    const { tiers, onChange, rule } = this.props;

    if (!rule) return null;

    if (rule.type === 'drop') return null;

    const changeTierValue = (tierName: string, value: string) => {
      onChange(rule.changeTierValue(tierName, value));
    };

    const changeTier = (oldTierName: string, newTierName: string) => {
      onChange(rule.changeTier(oldTierName, newTierName));
    };

    const keys = Object.keys(rule.tieredReplicants || {});
    const tierElements: JSX.Element[] = [];
    for (let key in rule.tieredReplicants) {
      tierElements.push(<ControlGroup key={key}>
        <Button minimal style={{pointerEvents: 'none'}}>Replicants:</Button>
        <InputGroup
          value={'' + rule.tieredReplicants[key]}
          onChange={(e: any) => changeTierValue(key, e.target.value)}
        />
        <Button minimal style={{pointerEvents: 'none'}}>Tier:</Button>
        <HTMLSelect value={rule.type} options={tiers} onChange={e => changeTier(key, e.target.value)}/>
        <Button disabled={keys.length === 1} onClick={() => this.removeTier(key)} icon={IconNames.TRASH}></Button>
      </ControlGroup>);
    }

    return tierElements;
  }

  getSummary() {
    const { type, time, value } = this.props.rule;

    return `${type} ${time === 'forever' ? 'forever' : value}`;
  }

  removeTier = (key: string) => {
    const { rule, onChange } = this.props;

    const newTierReplicants = Object.assign({}, rule.tieredReplicants);
    delete newTierReplicants[key];

    const newRule = Object.assign({}, rule, {tieredReplicants: newTierReplicants});
    onChange(newRule);
  }

  addTier = () => {
    const { rule, onChange, tiers } = this.props;

    let newTierName = tiers[0];

    if (rule.tieredReplicants) {
      for (let i = 0; i < tiers.length; i++) {
        if (rule.tieredReplicants[tiers[i]] === undefined) {
          newTierName = tiers[i];
          break;
        }
      }
    }

    onChange(rule.changeTierValue(newTierName, 1));
  }

  renderTierAdder() {
    const { rule, tiers } = this.props;

    if (Object.keys(rule.tieredReplicants || {}).length >= Object.keys(tiers).length) return null;

    return <FormGroup className="right">
      <Button onClick={this.addTier} minimal icon={IconNames.PLUS}>add a tier</Button>
    </FormGroup>;
  }

  render() {
    const { tiers, onChange, rule, onDelete, moveUp, moveDown } = this.props;
    const { isOpen } = this.state;

    if (!rule) return null;

    const ruleTypes: {label: string, value: RuleType}[] = [
      {label: 'Load', value: 'load'},
      {label: 'Drop', value: 'drop'}
    ];

    const ruleTime: {label: string, value: RuleTime}[] = [
      {label: 'by period', value: 'byPeriod'},
      {label: 'by interval', value: 'byInterval'},
      {label: 'forever', value: 'forever'}
    ];

    const change = (value: any, field: string) => {
      const newRule = Object.assign({}, rule, {[field]: value});
      onChange(newRule);
    };

    return <div className="rule-editor">

      <div className="title">
        <Button className="left" minimal rightIcon={isOpen ? IconNames.CARET_DOWN : IconNames.CARET_RIGHT} onClick={() => this.setState({isOpen: !isOpen})}>{this.getSummary()}</Button>
        <div className="spacer"/>
        {moveUp ? <Button minimal icon={IconNames.ARROW_UP} onClick={moveUp}/> : null}
        {moveDown ? <Button minimal icon={IconNames.ARROW_DOWN} onClick={moveDown}/> : null}
        <Button minimal icon={IconNames.TRASH} onClick={onDelete}/>
      </div>


      <Collapse isOpen={isOpen}>
        <Card>

          <FormGroup>
            <ControlGroup>
              <HTMLSelect value={rule.type} options={ruleTypes} onChange={e => change(e.target.value, 'type')}/>
              <HTMLSelect value={rule.time} options={ruleTime} onChange={e => change(e.target.value, 'time')}/>
              {rule.time !== 'forever' ? <InputGroup value={rule.value} onChange={(e: any) => change(e.target.value, 'value')}/> : null }
            </ControlGroup>
          </FormGroup>

          {rule.type === 'load'
            ? <FormGroup>
                { this.renderTiers() }
                { this.renderTierAdder()}
              </FormGroup>
            : null
          }

        </Card>

      </Collapse>

    </div>;
  }
}
