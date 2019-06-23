---
id: tasks
title: "Tasks Overview"
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


Apache Druid (incubating) tasks are run on MiddleManagers and always operate on a single data source.

Tasks are submitted using POST requests to the Overlord. Please see [Overlord Task API](../operations/api-reference.html#overlord-tasks) for API details.

There are several different types of tasks.

## Segment Creation Tasks

### Hadoop Index Task

See [batch ingestion](../ingestion/hadoop.md).

### Native Index Tasks

Druid provides a native index task which doesn't need any dependencies on other systems.
See [native index tasks](./native_tasks.md) for more details.

> Please check [Hadoop-based Batch Ingestion VS Native Batch Ingestion](./hadoop-vs-native-batch.md) for differences between native batch ingestion and Hadoop-based ingestion.

### Kafka Indexing Tasks

Kafka Indexing tasks are automatically created by a Kafka Supervisor and are responsible for pulling data from Kafka streams. These tasks are not meant to be created/submitted directly by users. See [Kafka Indexing Service](../development/extensions-core/kafka-ingestion.md) for more details.

### Stream Push Tasks (Tranquility)

Tranquility Server automatically creates "realtime" tasks that receive events over HTTP using an [EventReceiverFirehose](../ingestion/firehose.html#eventreceiverfirehose). These tasks are not meant to be created/submitted directly by users. See [Tranquility Stream Push](../ingestion/stream-push.md) for more info.

## Compaction Tasks

Compaction tasks merge all segments of the given interval. Please see [Compaction](../ingestion/compaction.md) for details.

## Segment Merging Tasks

> The documentation for the Append Task, Merge Task, and Same Interval Merge Task has been moved to [Miscellaneous Tasks](../ingestion/misc-tasks.md).

## Kill Task

Kill tasks delete all information about a segment and removes it from deep storage. 

Please see [Deleting Data](../ingestion/delete-data.md) for details.

## Misc. Tasks

Please see [Miscellaneous Tasks](../ingestion/misc-tasks.md).

## Task Locking and Priority

Please see [Task Locking and Priority](../ingestion/locking-and-priority.md).
