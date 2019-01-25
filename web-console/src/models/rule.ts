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

export type RuleType = 'drop' | 'load';
export type RuleTime = 'forever' | 'byPeriod' | 'byInterval';

export interface RuleValue {
  type: RuleType;
  time: RuleTime;
  value?: string;
  tieredReplicants?: Record<string, string>;
}

export interface RuleJSLoadForever {
  type: 'loadForever';
  tieredReplicants: Record<string, number>;
}

export interface RuleJSDropForever {
  type: 'dropForever';
}

export interface RuleJSLoad {
  type: 'loadByPeriod' | 'loadByInterval';
  tieredReplicants: Record<string, number>;
}

export interface RuleJSDrop {
  type: 'dropByPeriod' | 'dropByInterval';
}

export interface RuleJSByPeriod {
  period: string;
}

export interface RuleJSByInterval {
  interval: string;
}

export type RuleJS = (RuleJSDropForever | RuleJSLoadForever) | ((RuleJSLoad | RuleJSDrop) & (RuleJSByInterval | RuleJSByPeriod));

export class Rule {
  type: RuleType;
  time: RuleTime;
  value?: string;
  tieredReplicants?: Record<string, string>;

  constructor(o: RuleValue) {
    this.type = o.type;
    this.time = o.time;
    this.value = o.value;
    this.tieredReplicants = o.tieredReplicants;
  }

  static fromJS(o: any) {
    const r: RuleValue = {
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

    return new Rule(r);
  }

  toJS(): RuleJS {
    const o: any = {
      type: this.type + this.time.charAt(0).toUpperCase() + this.time.slice(1)
    };

    switch (this.time) {
      case 'byInterval':
        o.interval = this.value;
        o.tieredReplicants = this.tieredReplicants;
        break;

      case 'byPeriod':
        o.period = this.value;
        o.tieredReplicants = this.tieredReplicants;
        break;
    }

    return o;
  }

  valueOf() {
    const o =  {...this};
    o.tieredReplicants = {...this.tieredReplicants};

    return o;
  }

  changeType(newType: RuleType) {
    const o = this.valueOf();
    o.type = newType;

    return new Rule(o);
  }

  changeTime(newTime: RuleTime) {
    const o = this.valueOf();
    o.time = newTime;

    return new Rule(o);
  }

  changeValue(newValue: string) {
    const o = this.valueOf();
    o.value = newValue;

    return new Rule(o);
  }

  changeTierValue(tierName: string, value: string | number) {
    const o = this.valueOf();

    if (!o.tieredReplicants) o.tieredReplicants = {};

    o.tieredReplicants[tierName] = '' + value;

    return new Rule(o);
  }

  changeTier(oldTierName: string, newTierName: string) {
    const o = this.valueOf();

    if (!o.tieredReplicants) o.tieredReplicants = {};

    o.tieredReplicants[newTierName] = o.tieredReplicants[oldTierName];
    delete o.tieredReplicants[oldTierName];

    return new Rule(o);
  }
}
