---
id: data-management
title: "Data management"
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




## Schema changes



## Compaction and reindexing

Compaction is a type of overwrite operation, which reads an existing set of segments, combines them into a new set with larger but fewer segments, and overwrites the original set with the new compacted set, without changing the data that is stored.

For performance reasons, it is sometimes beneficial to compact a set of segments into a set of larger but fewer segments, as there is some per-segment processing and memory overhead in both the ingestion and querying paths.

Compaction tasks merge all segments of the given interval. The syntax is:

```json
{
    "type": "compact",
    "id": <task_id>,
    "dataSource": <task_datasource>,
    "interval": <interval to specify segments to be merged>,
    "dimensions" <custom dimensionsSpec>,
    "segmentGranularity": <segment granularity after compaction>,
    "targetCompactionSizeBytes": <target size of compacted segments>
    "tuningConfig" <index task tuningConfig>,
    "context": <task context>
}
```

|Field|Description|Required|
|-----|-----------|--------|
|`type`|Task type. Should be `compact`|Yes|
|`id`|Task id|No|
|`dataSource`|DataSource name to be compacted|Yes|
|`interval`|Interval of segments to be compacted|Yes|
|`dimensionsSpec`|Custom dimensionsSpec. Compaction task will use this dimensionsSpec if exist instead of generating one. See below for more details.|No|
|`metricsSpec`|Custom metricsSpec. Compaction task will use this metricsSpec if specified rather than generating one.|No|
|`segmentGranularity`|If this is set, compactionTask will change the segment granularity for the given interval. See [segmentGranularity of Uniform Granularity Spec](./ingestion-spec.html#uniform-granularity-spec) for more details. See the below table for the behavior.|No|
|`targetCompactionSizeBytes`|Target segment size after comapction. Cannot be used with `maxRowsPerSegment`, `maxTotalRows`, and `numShards` in tuningConfig.|No|
|`tuningConfig`|[Index task tuningConfig](../ingestion/native_tasks.html#tuningconfig)|No|
|`context`|[Task context](../ingestion/locking-and-priority.html#task-context)|No|


An example of compaction task is

```json
{
  "type" : "compact",
  "dataSource" : "wikipedia",
  "interval" : "2017-01-01/2018-01-01"
}
```

This compaction task reads _all segments_ of the interval `2017-01-01/2018-01-01` and results in new segments.
Since `segmentGranularity` is null, the original segment granularity will be remained and not changed after compaction.
To control the number of result segments per time chunk, you can set [maxRowsPerSegment](../configuration/index.html#compaction-dynamic-configuration) or [numShards](../ingestion/native_tasks.html#tuningconfig).
Please note that you can run multiple compactionTasks at the same time. For example, you can run 12 compactionTasks per month instead of running a single task for the entire year.

A compaction task internally generates an `index` task spec for performing compaction work with some fixed parameters.
For example, its `firehose` is always the [ingestSegmentFirehose](./firehose.html#ingestsegmentfirehose), and `dimensionsSpec` and `metricsSpec`
include all dimensions and metrics of the input segments by default.

Compaction tasks will exit with a failure status code, without doing anything, if the interval you specify has no
data segments loaded in it (or if the interval you specify is empty).

The output segment can have different metadata from the input segments unless all input segments have the same metadata.

- Dimensions: since Apache Druid (incubating) supports schema change, the dimensions can be different across segments even if they are a part of the same dataSource.
If the input segments have different dimensions, the output segment basically includes all dimensions of the input segments.
However, even if the input segments have the same set of dimensions, the dimension order or the data type of dimensions can be different. For example, the data type of some dimensions can be
changed from `string` to primitive types, or the order of dimensions can be changed for better locality.
In this case, the dimensions of recent segments precede that of old segments in terms of data types and the ordering.
This is because more recent segments are more likely to have the new desired order and data types. If you want to use
your own ordering and types, you can specify a custom `dimensionsSpec` in the compaction task spec.
- Roll-up: the output segment is rolled up only when `rollup` is set for all input segments.
See [Roll-up](../ingestion/index.html#rollup) for more details. 
You can check that your segments are rolled up or not by using [Segment Metadata Queries](../querying/segmentmetadataquery.html#analysistypes).



## Adding new data

Druid can insert new data to an existing datasource by appending new segments to existing segment sets. It can also add new data by merging an existing set of segments with new data and overwriting the original set. 

Druid does not support single-record updates by primary key.

Updates are described further at [update existing data](../ingestion/update-existing-data.md).

## Updating existing data

TODO(gianm): This was copy/pasted from the old doc, and needs adjusting

Once you ingest some data in a dataSource for an interval and create Apache Druid (incubating) segments, you might want to make changes to 
the ingested data. There are several ways this can be done.

##### Updating Dimension Values

If you have a dimension where values need to be updated frequently, try first using [lookups](../querying/lookups.md). A 
classic use case of lookups is when you have an ID dimension stored in a Druid segment, and want to map the ID dimension to a 
human-readable String value that may need to be updated periodically.

##### Rebuilding Segments (Reindexing)

If lookups are not sufficient, you can entirely rebuild Druid segments for specific intervals of time. Rebuilding a segment 
is known as reindexing the data. For example, if you want to add or remove columns from your existing segments, or you want to 
change the rollup granularity of your segments, you will have to reindex your data.

We recommend keeping a copy of your raw data around in case you ever need to reindex your data.

##### Dealing with Delayed Events (Delta Ingestion)

If you have a batch ingestion pipeline and have delayed events come in and want to append these events to existing 
segments and avoid the overhead of rebuilding new segments with reindexing, you can use delta ingestion.

### Reindexing and Delta Ingestion with Hadoop Batch Ingestion

This section assumes the reader understands how to do batch ingestion using Hadoop. See 
[Hadoop batch ingestion](./hadoop.md) for more information. Hadoop batch-ingestion can be used for reindexing and delta ingestion.

Druid uses an `inputSpec` in the `ioConfig` to know where the data to be ingested is located and how to read it. 
For simple Hadoop batch ingestion, `static` or `granularity` spec types allow you to read data stored in deep storage.

There are other types of `inputSpec` to enable reindexing and delta ingestion.

#### `dataSource`

This is a type of `inputSpec` that reads data already stored inside Druid. This is used to allow "re-indexing" data and for "delta-ingestion" described later in `multi` type inputSpec.

|Field|Type|Description|Required|
|-----|----|-----------|--------|
|type|String.|This should always be 'dataSource'.|yes|
|ingestionSpec|JSON object.|Specification of Druid segments to be loaded. See below.|yes|
|maxSplitSize|Number|Enables combining multiple segments into single Hadoop InputSplit according to size of segments. With -1, druid calculates max split size based on user specified number of map task(mapred.map.tasks or mapreduce.job.maps). By default, one split is made for one segment. maxSplitSize is specified in bytes.|no|
|useNewAggs|Boolean|If "false", then list of aggregators in "metricsSpec" of hadoop indexing task must be same as that used in original indexing task while ingesting raw data. Default value is "false". This field can be set to "true" when "inputSpec" type is "dataSource" and not "multi" to enable arbitrary aggregators while reindexing. See below for "multi" type support for delta-ingestion.|no|

Here is what goes inside `ingestionSpec`:

|Field|Type|Description|Required|
|-----|----|-----------|--------|
|dataSource|String|Druid dataSource name from which you are loading the data.|yes|
|intervals|List|A list of strings representing ISO-8601 Intervals.|yes|
|segments|List|List of segments from which to read data from, by default it is obtained automatically. You can obtain list of segments to put here by making a POST query to Coordinator at url /druid/coordinator/v1/metadata/datasources/segments?full with list of intervals specified in the request paylod e.g. ["2012-01-01T00:00:00.000/2012-01-03T00:00:00.000", "2012-01-05T00:00:00.000/2012-01-07T00:00:00.000"]. You may want to provide this list manually in order to ensure that segments read are exactly same as they were at the time of task submission, task would fail if the list provided by the user does not match with state of database when the task actually runs.|no|
|filter|JSON|See [Filters](../querying/filters.md)|no|
|dimensions|Array of String|Name of dimension columns to load. By default, the list will be constructed from parseSpec. If parseSpec does not have an explicit list of dimensions then all the dimension columns present in stored data will be read.|no|
|metrics|Array of String|Name of metric columns to load. By default, the list will be constructed from the "name" of all the configured aggregators.|no|
|ignoreWhenNoSegments|boolean|Whether to ignore this ingestionSpec if no segments were found. Default behavior is to throw error when no segments were found.|no|

For example

```json
"ioConfig" : {
  "type" : "hadoop",
  "inputSpec" : {
    "type" : "dataSource",
    "ingestionSpec" : {
      "dataSource": "wikipedia",
      "intervals": ["2014-10-20T00:00:00Z/P2W"]
    }
  },
  ...
}
```

#### `multi`

This is a composing inputSpec to combine other inputSpecs. This inputSpec is used for delta ingestion. You can also use a `multi` inputSpec to combine data from multiple dataSources. However, each particular dataSource can only be specified one time.
Note that, "useNewAggs" must be set to default value false to support delta-ingestion.

|Field|Type|Description|Required|
|-----|----|-----------|--------|
|children|Array of JSON objects|List of JSON objects containing other inputSpecs.|yes|

For example:

```json
"ioConfig" : {
  "type" : "hadoop",
  "inputSpec" : {
    "type" : "multi",
    "children": [
      {
        "type" : "dataSource",
        "ingestionSpec" : {
          "dataSource": "wikipedia",
          "intervals": ["2012-01-01T00:00:00.000/2012-01-03T00:00:00.000", "2012-01-05T00:00:00.000/2012-01-07T00:00:00.000"],
          "segments": [
            {
              "dataSource": "test1",
              "interval": "2012-01-01T00:00:00.000/2012-01-03T00:00:00.000",
              "version": "v2",
              "loadSpec": {
                "type": "local",
                "path": "/tmp/index1.zip"
              },
              "dimensions": "host",
              "metrics": "visited_sum,unique_hosts",
              "shardSpec": {
                "type": "none"
              },
              "binaryVersion": 9,
              "size": 2,
              "identifier": "test1_2000-01-01T00:00:00.000Z_3000-01-01T00:00:00.000Z_v2"
            }
          ]
        }
      },
      {
        "type" : "static",
        "paths": "/path/to/more/wikipedia/data/"
      }
    ]  
  },
  ...
}
```

It is STRONGLY RECOMMENDED to provide list of segments in `dataSource` inputSpec explicitly so that your delta ingestion task is idempotent. You can obtain that list of segments by making following call to the Coordinator.
POST `/druid/coordinator/v1/metadata/datasources/{dataSourceName}/segments?full`
Request Body: [interval1, interval2,...] for example ["2012-01-01T00:00:00.000/2012-01-03T00:00:00.000", "2012-01-05T00:00:00.000/2012-01-07T00:00:00.000"]


### Reindexing with Native Batch Ingestion

This section assumes the reader understands how to do batch ingestion without Hadoop using [Native Batch Indexing](../ingestion/native_tasks.md),
which uses a "firehose" to know where and how to read the input data. [IngestSegmentFirehose](firehose.html#ingestsegmentfirehose) 
can be used to read data from segments inside Druid. Note that IndexTask is to be used for prototyping purposes only as 
it has to do all processing inside a single process and can't scale. Please use Hadoop batch ingestion for production 
scenarios dealing with more than 1GB of data.

## Deleting data

Druid supports permanent deletion of segments that are in an "unused" state (see the [Segment states](#segment-states) section above).

The Kill Task deletes unused segments within a specified interval from metadata storage and deep storage.

For more information, please see [Kill Task](../ingestion/tasks.html#kill-task).

Permanent deletion of a segment in Apache Druid (incubating) has two steps:

1. The segment must first be marked as "unused". This occurs when a segment is dropped by retention rules, and when a user manually disables a segment through the Coordinator API.
2. After segments have been marked as "unused", a Kill Task will delete any "unused" segments from Druid's metadata store as well as deep storage.

For documentation on retention rules, please see [Data Retention](../operations/rule-configuration.md).

For documentation on disabling segments using the Coordinator API, please see [Coordinator Delete API](../operations/api-reference.html#coordinator-delete)

A data deletion tutorial is available at [Tutorial: Deleting data](../tutorials/tutorial-delete-data.md)

## Kill Task

Kill tasks delete all information about a segment and removes it from deep storage. Segments to kill must be unused (used==0) in the Druid segment table. The available grammar is:

```json
{
    "type": "kill",
    "id": <task_id>,
    "dataSource": <task_datasource>,
    "interval" : <all_segments_in_this_interval_will_die!>,
    "context": <task context>
}
```

## Retention

Druid supports retention rules, which are used to define intervals of time where data should be preserved, and intervals where data should be discarded.

Druid also supports separating Historical processes into tiers, and the retention rules can be configured to assign data for specific intervals to specific tiers.

These features are useful for performance/cost management; a common use case is separating Historical processes into a "hot" tier and a "cold" tier.

For more information, please see [Load rules](../operations/rule-configuration.md).
