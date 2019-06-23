---
id: index
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


## Overview



### Datasources and segments

MOVED to design/index.html

#### Segment identifiers

MOVED to design/index.html

#### Segment versioning

MOVED to design/index.html

#### Segment states

MOVED to design/index.html

#### Indexing and handoff

MOVED to design/index.html

## Ingestion methods

MOVED to ingestion-new/index.html

## Partitioning

MOVED to ingestion-new/index.html

## Rollup

Druid is able to summarize raw data at ingestion time using a process we refer to as "roll-up".
Roll-up is a first-level aggregation operation over a selected set of "dimensions", where a set of "metrics" are aggregated.

Suppose we have the following raw data, representing total packet/byte counts in particular seconds for traffic between a source and destination. The `srcIP` and `dstIP` fields are dimensions, while `packets` and `bytes` are metrics.

```
timestamp                 srcIP         dstIP          packets     bytes
2018-01-01T01:01:35Z      1.1.1.1       2.2.2.2            100      1000
2018-01-01T01:01:51Z      1.1.1.1       2.2.2.2            200      2000
2018-01-01T01:01:59Z      1.1.1.1       2.2.2.2            300      3000
2018-01-01T01:02:14Z      1.1.1.1       2.2.2.2            400      4000
2018-01-01T01:02:29Z      1.1.1.1       2.2.2.2            500      5000
2018-01-01T01:03:29Z      1.1.1.1       2.2.2.2            600      6000
2018-01-02T21:33:14Z      7.7.7.7       8.8.8.8            100      1000
2018-01-02T21:33:45Z      7.7.7.7       8.8.8.8            200      2000
2018-01-02T21:35:45Z      7.7.7.7       8.8.8.8            300      3000
```

If we ingest this data into Druid with a `queryGranularity` of `minute` (which will floor timestamps to minutes), the roll-up operation is equivalent to the following pseudocode:

```
GROUP BY TRUNCATE(timestamp, MINUTE), srcIP, dstIP :: SUM(packets), SUM(bytes)
```

After the data above is aggregated during roll-up, the following rows will be ingested:

```
timestamp                 srcIP         dstIP          packets     bytes
2018-01-01T01:01:00Z      1.1.1.1       2.2.2.2            600      6000
2018-01-01T01:02:00Z      1.1.1.1       2.2.2.2            900      9000
2018-01-01T01:03:00Z      1.1.1.1       2.2.2.2            600      6000
2018-01-02T21:33:00Z      7.7.7.7       8.8.8.8            300      3000
2018-01-02T21:35:00Z      7.7.7.7       8.8.8.8            300      3000
```

The rollup granularity is the minimum granularity you will be able to explore data at and events are floored to this granularity. 
Hence, Druid ingestion specs define this granularity as the `queryGranularity` of the data. The lowest supported `queryGranularity` is millisecond.

The following links may be helpful in further understanding dimensions and metrics:

* [https://en.wikipedia.org/wiki/Dimension_(data_warehouse)](https://en.wikipedia.org/wiki/Dimension_(data_warehouse))

* [https://en.wikipedia.org/wiki/Measure_(data_warehouse)](https://en.wikipedia.org/wiki/Measure_(data_warehouse))

For tips on how to use rollup in your Druid schema designs, see the [schema design](schema-design.html#rollup) page.

### Roll-up modes

Druid supports two roll-up modes, i.e., _perfect roll-up_ and _best-effort roll-up_. In the perfect roll-up mode, Druid guarantees that input data are perfectly aggregated at ingestion time. Meanwhile, in the best-effort roll-up, input data might not be perfectly aggregated and thus there can be multiple segments holding the rows which should belong to the same segment with the perfect roll-up since they have the same dimension value and their timestamps fall into the same interval.

The perfect roll-up mode encompasses an additional preprocessing step to determine intervals and shardSpecs before actual data ingestion if they are not specified in the ingestionSpec. This preprocessing step usually scans the entire input data which might increase the ingestion time. The [Hadoop indexing task](../ingestion/hadoop.md) always runs with this perfect roll-up mode.

On the contrary, the best-effort roll-up mode doesn't require any preprocessing step, but the size of ingested data might be larger than that of the perfect roll-up. All types of [streaming indexing (e.g., kafka indexing service)](../ingestion/stream-ingestion.md) run with this mode.

Finally, the [native index task](../ingestion/native_tasks.md) supports both modes and you can choose either one which fits to your application.

## Data maintenance

### Inserts and overwrites

Druid can insert new data to an existing datasource by appending new segments to existing segment sets. It can also add new data by merging an existing set of segments with new data and overwriting the original set. 

Druid does not support single-record updates by primary key.

Updates are described further at [update existing data](../ingestion/update-existing-data.md).

### Compaction

Compaction is a type of overwrite operation, which reads an existing set of segments, combines them into a new set with larger but fewer segments, and overwrites the original set with the new compacted set, without changing the data that is stored.

For performance reasons, it is sometimes beneficial to compact a set of segments into a set of larger but fewer segments, as there is some per-segment processing and memory overhead in both the ingestion and querying paths.

For compaction documentation, please see [tasks](../ingestion/tasks.md).

### Retention and Tiering

Druid supports retention rules, which are used to define intervals of time where data should be preserved, and intervals where data should be discarded.

Druid also supports separating Historical processes into tiers, and the retention rules can be configured to assign data for specific intervals to specific tiers.

These features are useful for performance/cost management; a common use case is separating Historical processes into a "hot" tier and a "cold" tier.

For more information, please see [Load rules](../operations/rule-configuration.md).

### Deletes

Druid supports permanent deletion of segments that are in an "unused" state (see the [Segment states](#segment-states) section above).

The Kill Task deletes unused segments within a specified interval from metadata storage and deep storage.

For more information, please see [Kill Task](../ingestion/tasks.html#kill-task).
