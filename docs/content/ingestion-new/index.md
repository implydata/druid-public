---
layout: doc_page
title: "Ingestion"
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

# Loading data

<a name="spec" />

## Ingestion specs



<a name="connect" />

## Ingestion methods and sources

All data in Druid is organized into _segments_, which are data files that generally have up to a few million rows each.
Loading data in Druid is called _ingestion_ or _indexing_ and consists of reading data from a data source and creating
segments based on that data.

In most ingestion methods, the work of loading data is done by Druid MiddleManager processes. One exception is
Hadoop-based ingestion, where this work is instead done using a Hadoop MapReduce job on YARN (although MiddleManager
processes are still involved in starting and monitoring the Hadoop jobs). Once segments have been generated and stored
in [deep storage](../dependencies/deep-storage.html), they will be loaded by Historical processes. For more details on
how this works under the hood, see the [Storage design](../design/index.html#storage) section of Druid's design
documentation.

The table below lists Druid's most common data ingestion methods, along with comparisons to help you choose
the best one for your situation.

|Method|How it works|Task or supervisor?|Can append and overwrite?|Can handle late data?|Exactly-once ingestion?|Query data immediately (real-time)?|
|------|------------|-------------------|-------------------------|---------------------|-----------------------|-----------------------------------|
|[Native batch](native-batch.html)|[Task](tasks.html) type `index` or `index_parallel`|Druid loads data directly from S3, HTTP, NFS, or other networked storage.|Append or overwrite|Yes|Yes|No|
|[Hadoop](hadoop.html)|[Task](tasks.html) type `index_hadoop`|Druid launches Hadoop Map/Reduce jobs to load data files.|Overwrite|Yes|Yes|No|
|[Kafka indexing service](../development/extensions-core/kafka-ingestion.html)|[Supervisor](supervisors.html) type `kafka`|Druid reads directly from Apache Kafka.|Append only|Yes|Yes|Yes|
|[Kinesis indexing service](../development/extensions-core/kinesis-ingestion.html)|[Supervisor](supervisors.html) type `kinesis`|Druid reads directly from Amazon Kinesis.|Append only|Yes|Yes|Yes|

<!-- TODO(gianm): Something about tranquility; mention it but generally link offsite -->

<a name="parse" />

## Parsing data

<a name="timestamp" />

## Parsing timestamps

<a name="transform" />

## Transforming and filtering

<a name="schema" />

## Configuring data schemas

<a name="partitioning" />

## Partitioning

Optimal partitioning and sorting of your data can have substantial impact on footprint and performance.

Druid datasources are always partitioned by time into _time chunks_, and each time chunk contains one or more segments.
This partitioning happens for all ingestion methods, and is based on the `segmentGranularity` parameter of your
ingestion spec's `dataSchema`. The way you configure further partitioning is different depending on the ingestion
method you use (see the table below).

The segments within a particular time chunk may also be partitioned further, using options that vary based on the
ingestion method you have chosen. In general, doing this secondary partitioning using a particular dimension will
improve locality, meaning that rows with the same value for that dimension are stored together and can be accessed
quickly.

You will usually get the best performance and smallest overall footprint by partitioning your data on some "natural"
dimension that you often filter by, if one exists. If you do have a dimension like this, you should also place it first
in the `dimensions` list of your `dimensionsSpec`, which tells Druid to sort data segments by that column.

<div class="note info">
Note that Druid always sorts rows within a segment by timestamp first, even before the first dimension listed in your
dimensionsSpec. This can affect storage footprint and data locality. If you want to truly sort by a dimension, you can
work around this by setting `queryGranularity` equal to `segmentGranularity` in your ingestion spec, which will
set all timestamps within the segment to the same value. After doing this, you can still access a finer-granularity
timestamp by ingesting your timestamp as a separate long-typed dimension. See
<a href="schema-design.html#secondary-timestamps>Secondary timestamps</a> in the schema design documentation for more
information. This limitation may be removed in a future version of Druid.
</div>

Not all ingestion methods support an explicit partitioning configuration, and not all have equivalent levels of
flexibility. As of current Druid versions, If you are doing initial ingestion through a less-flexible method (like
Kafka) then you can use [compaction or reindexing](data-management.html#reindexing) to repartition your data after it
is initially ingested. This is a powerful technique: you can use it to ensure that any data older than a certain
threshold is optimally partitioned, even as you continuously add new data from a stream.

|Method|How it works|
|------|------------|
|[Native batch](native-batch.html)|`index` (non-parallel) tasks partition input files based on the `partitionDimensions` and `forceGuaranteedRollup` tuning configs. `index_parallel` tasks do not currently support user-defined partitioning.|
|[Hadoop](hadoop.html)|Many options are available through the [partitionsSpec](hadoop.html#partitions-spec) setting.|
|[Kafka indexing service](../development/extensions-core/kafka-ingestion.html)|Partitioning in Druid is guided by how your Kafka topic is partitioned.|
|[Kinesis indexing service](../development/extensions-core/kinesis-ingestion.html)|Partitioning in Druid is guided by how your Kinesis stream is sharded.|

## Tuning

Tuning properties are specified in the `tuningConfig` section of an ingestion spec.

Beyond these common ones, each ingestion method has its own specific tuning properties.

|Method|Tuning properties|
|------|-----------------|
|[Native batch](native-batch.html)|[Native batch tuning](native-batch.html#tuning)|
|[Hadoop](hadoop.html)|[Hadoop tuning](hadoop.html#tuning)|
|[Kafka indexing service](../development/extensions-core/kafka-ingestion.html)|[Kafka tuning](../development/extensions-core/kafka-ingestion.html#tuning)|
|[Kinesis indexing service](../development/extensions-core/kinesis-ingestion.html)|[Kinesis tuning](../development/extensions-core/kinesis-ingestion.html#tuning)|
