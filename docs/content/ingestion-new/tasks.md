---
layout: doc_page
title: "Task reference"
---

<!--
  ~ Licensed to the Apache Software Foundation (ASF) under one
  ~ or more contributor license agreements.  See the NOTICE file
  ~ distributed with this work for additional information
  ~ regarding copyright ownership.  The ASF licenses this file
  ~ to you under the Apache License, Version 2.0 (the
  ~ "License"); you may not use this file except in compliance
  ~ with the License.  You may obtain a copy of the License at
  ~
  ~   http://www.apache.org/licenses/LICENSE-2.0
  ~
  ~ Unless required by applicable law or agreed to in writing,
  ~ software distributed under the License is distributed on an
  ~ "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
  ~ KIND, either express or implied.  See the License for the
  ~ specific language governing permissions and limitations
  ~ under the License.
  -->

# Task reference

<a name="types"></a>

## Task types

<a name="locking"></a>

## Task locking and priority

### Locking

Once an Overlord process accepts a task, the task acquires locks for the data source and intervals specified in the task.

There are two lock types, i.e., _shared lock_ and _exclusive lock_.

- A task needs to acquire a shared lock before it reads segments of an interval. Multiple shared locks can be acquired for the same dataSource and interval. Shared locks are always preemptable, but they don't preempt each other.
- A task needs to acquire an exclusive lock before it writes segments for an interval. An exclusive lock is also preemptable except while the task is publishing segments.

Each task can have different lock priorities. The locks of higher-priority tasks can preempt the locks of lower-priority tasks. The lock preemption works based on _optimistic locking_. When a lock is preempted, it is not notified to the owner task immediately. Instead, it's notified when the owner task tries to acquire the same lock again. (Note that lock acquisition is idempotent unless the lock is preempted.) In general, tasks don't compete for acquiring locks because they usually targets different dataSources or intervals.

A task writing data into a dataSource must acquire exclusive locks for target intervals. Note that exclusive locks are still preemptable. That is, they also be able to be preempted by higher priority locks unless they are _publishing segments_ in a critical section. Once publishing segments is finished, those locks become preemptable again.

Tasks do not need to explicitly release locks, they are released upon task completion. Tasks may potentially release
locks early if they desire. Task ids are unique by naming them using UUIDs or the timestamp in which the task was created.
Tasks are also part of a "task group", which is a set of tasks that can share interval locks.

### Priority

Apache Druid (incubating)'s indexing tasks use locks for atomic data ingestion. Each lock is acquired for the combination of a dataSource and an interval. Once a task acquires a lock, it can write data for the dataSource and the interval of the acquired lock unless the lock is released or preempted. Please see [the below Locking section](#locking)

Each task has a priority which is used for lock acquisition. The locks of higher-priority tasks can preempt the locks of lower-priority tasks if they try to acquire for the same dataSource and interval. If some locks of a task are preempted, the behavior of the preempted task depends on the task implementation. Usually, most tasks finish as failed if they are preempted.

Tasks can have different default priorities depening on their types. Here are a list of default priorities. Higher the number, higher the priority.

|task type|default priority|
|---------|----------------|
|Realtime index task|75|
|Batch index task|50|
|Merge/Append/Compaction task|25|
|Other tasks|0|

You can override the task priority by setting your priority in the task context like below.

```json
"context" : {
  "priority" : 100
}
```

### Task context parameters

The task context is used for various task configuration parameters. The following locking-and-priority-related
parameters apply to all task types.

|property|default|description|
|--------|-------|-----------|
|taskLockTimeout|300000|task lock timeout in millisecond. For more details, see [Locking](#locking).|
|priority|Different based on task types. See [Priority](#priority).|Task priority|

<div class="note caution">
When a task acquires a lock, it sends a request via HTTP and awaits until it receives a response containing the lock acquisition result.
As a result, an HTTP timeout error can occur if `taskLockTimeout` is greater than `druid.server.http.maxIdleTime` of Overlords.
</div>

<a name="reports"></a>

## Task reports

### Completion Report

After a task completes, a report containing information about the number of rows ingested and any parse exceptions that occurred is available at:

```
http://<OVERLORD-HOST>:<OVERLORD-PORT>/druid/indexer/v1/task/<task-id>/reports
```

This reporting feature is supported by the non-parallel native batch tasks, the Hadoop batch task, and tasks created by the Kafka Indexing Service. Realtime tasks created by Tranquility do not provide completion reports.

An example output is shown below, along with a description of the fields:

```json
{
  "ingestionStatsAndErrors": {
    "taskId": "compact_twitter_2018-09-24T18:24:23.920Z",
    "payload": {
      "ingestionState": "COMPLETED",
      "unparseableEvents": {},
      "rowStats": {
        "determinePartitions": {
          "processed": 0,
          "processedWithError": 0,
          "thrownAway": 0,
          "unparseable": 0
        },
        "buildSegments": {
          "processed": 5390324,
          "processedWithError": 0,
          "thrownAway": 0,
          "unparseable": 0
        }
      },
      "errorMsg": null
    },
    "type": "ingestionStatsAndErrors"
  }
}
```

The `ingestionStatsAndErrors` report provides information about row counts and errors.

The `ingestionState` shows what step of ingestion the task reached. Possible states include:
* `NOT_STARTED`: The task has not begun reading any rows
* `DETERMINE_PARTITIONS`: The task is processing rows to determine partitioning
* `BUILD_SEGMENTS`: The task is processing rows to construct segments
* `COMPLETED`: The task has finished its work.

Only batch tasks have the DETERMINE_PARTITIONS phase. Realtime tasks such as those created by the Kafka Indexing Service do not have a DETERMINE_PARTITIONS phase.

`unparseableEvents` contains lists of exception messages that were caused by unparseable inputs. This can help with identifying problematic input rows. There will be one list each for the DETERMINE_PARTITIONS and BUILD_SEGMENTS phases. Note that the Hadoop batch task does not support saving of unparseable events.

the `rowStats` map contains information about row counts. There is one entry for each ingestion phase. The definitions of the different row counts are shown below:
* `processed`: Number of rows successfully ingested without parsing errors
* `processedWithError`: Number of rows that were ingested, but contained a parsing error within one or more columns. This typically occurs where input rows have a parseable structure but invalid types for columns, such as passing in a non-numeric String value for a numeric column.
* `thrownAway`: Number of rows skipped. This includes rows with timestamps that were outside of the ingestion task's defined time interval and rows that were filtered out with [Transform Specs](../ingestion/transform-spec.html).
* `unparseable`: Number of rows that could not be parsed at all and were discarded. This tracks input rows without a parseable structure, such as passing in non-JSON data when using a JSON parser.

The `errorMsg` field shows a message describing the error that caused a task to fail. It will be null if the task was successful.

## Live Reports

### Row stats

The non-parallel [Native Batch Task](../ingestion/native_tasks.html), the Hadoop batch task, and the tasks created by the Kafka Indexing Service support retrieval of row stats while the task is running.

The live report can be accessed with a GET to the following URL on a Peon running a task:

```
http://<middlemanager-host>:<worker-port>/druid/worker/v1/chat/<task-id>/rowStats
```

An example report is shown below. The `movingAverages` section contains 1 minute, 5 minute, and 15 minute moving averages of increases to the four row counters, which have the same definitions as those in the completion report. The `totals` section shows the current totals.

```
{
  "movingAverages": {
    "buildSegments": {
      "5m": {
        "processed": 3.392158326408501,
        "unparseable": 0,
        "thrownAway": 0,
        "processedWithError": 0
      },
      "15m": {
        "processed": 1.736165476881023,
        "unparseable": 0,
        "thrownAway": 0,
        "processedWithError": 0
      },
      "1m": {
        "processed": 4.206417693750045,
        "unparseable": 0,
        "thrownAway": 0,
        "processedWithError": 0
      }
    }
  },
  "totals": {
    "buildSegments": {
      "processed": 1994,
      "processedWithError": 0,
      "thrownAway": 0,
      "unparseable": 0
    }
  }
}
```

Note that this is only supported by the non-parallel [Native Batch Task](../ingestion/native_tasks.html), the Hadoop Batch task, and the tasks created by the Kafka Indexing Service.

For the Kafka Indexing Service, a GET to the following Overlord API will retrieve live row stat reports from each task being managed by the supervisor and provide a combined report.

```
http://<OVERLORD-HOST>:<OVERLORD-PORT>/druid/indexer/v1/supervisor/<supervisor-id>/stats
```

### Unparseable Events

Lists of recently-encountered unparseable events can be retrieved from a running task with a GET to the following Peon API:

```
http://<middlemanager-host>:<worker-port>/druid/worker/v1/chat/<task-id>/unparseableEvents
```

Note that this functionality is not supported by all task types. Currently, it is only supported by the
non-parallel [native batch task](../ingestion/native-batch.html) (type `index`) and the tasks created by the Kafka
and Kinesis indexing services.
