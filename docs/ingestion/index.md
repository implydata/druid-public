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

All data in Druid is organized into _segments_, which are data files that generally have up to a few million rows each.
Loading data in Druid is called _ingestion_ or _indexing_ and consists of reading data from a data source and creating
segments based on that data.

In most ingestion methods, the work of loading data is done by Druid MiddleManager processes. One exception is
Hadoop-based ingestion, where this work is instead done using a Hadoop MapReduce job on YARN (although MiddleManager
processes are still involved in starting and monitoring the Hadoop jobs). Once segments have been generated and stored
in [deep storage](../dependencies/deep-storage.md), they will be loaded by Historical processes. For more details on
how this works under the hood, see the [Storage design](../design/index.html#storage) section of Druid's design
documentation.

## Ingestion methods

The table below lists Druid's most common data ingestion methods, along with comparisons to help you choose
the best one for your situation. Each ingestion method supports its own set of data sources. For details about how
each method works, as well as configuration properties specific to that method, check out its documentation page.

### Streaming

|Method|How it works|Exactly-once?|
|------|------------|-------------|
|[Kafka indexing service](../development/extensions-core/kafka-ingestion.md)|Supervisor type `kafka`|Druid reads directly from Apache Kafka.|Yes|No|
|[Kinesis indexing service](../development/extensions-core/kinesis-ingestion.md)|Supervisor type `kinesis`|Druid reads directly from Amazon Kinesis.|Yes|No|
|[Tranquility](../development/extensions-core/kinesis-ingestion.md)|Supervisor type `kinesis`|Druid reads directly from Amazon Kinesis.|Yes|No|
|[Realtime nodes](realtime-node.md) (deprecated)|Supervisor type `kinesis`|Druid reads directly from Amazon Kinesis.|Yes|No|

When loading from Kafka or Kinesis, you should use the appropriate supervisor-based indexing service.

TODO(gianm): Fix up table

### Batch

When doing batch loads from files, you should use one-time tasks, and you have three options: `index` (native batch,
single-task), `index_parallel` (native batch, parallel), or `index_hadoop` (Hadoop-based). The following table compares
and contrasts the three batch ingestion options.

|   |Task type `index_hadoop`|Task type `index_parallel`|Task type `index`|
|---|------------|--------------|-----|
| **Category** | [Hadoop-based](hadoop.html) | [Native batch](native-batch.html) | [Native batch](native-batch.html) |
| **Parallel?** | Always parallel | Parallel if firehose is splittable | No |
| **Append or overwrite?** | Overwrite only | Both supported | Both supported |
| **External dependencies** | Hadoop (it internally submits Map/Reduce jobs) | None | None |
| **Supported input locations** | Any Hadoop filesystem or Druid dataSource | Any [firehose](native-batch.md#firehoses) | Any [firehose](native-batch.md#firehoses) |
| **Supported file formats** | Any Hadoop InputFormat | Currently text file formats (CSV, TSV, JSON) by default. Additional formats can be added though a [custom extension](../development/modules.md) implementing [`FiniteFirehoseFactory`](https://github.com/apache/incubator-druid/blob/master/core/src/main/java/org/apache/druid/data/input/FiniteFirehoseFactory.java) | Currently text file formats (CSV, TSV, JSON) by default. Additional formats can be added though a [custom extension](../development/modules.md) implementing [`FiniteFirehoseFactory`](https://github.com/apache/incubator-druid/blob/master/core/src/main/java/org/apache/druid/data/input/FiniteFirehoseFactory.java) |
| **Supported [rollup modes](#rollup)** | Perfect rollup | Best-effort rollup | Both perfect and best-effort rollup |
| **Supported partitioning methods** | [Hash-based or range partitioning](hadoop.html#partitioning-specification) | N/A | Hash-based partitioning (when `forceGuaranteedRollup` = true) |
| **Saving parse exceptions in ingestion report** | Currently not supported | Currently not supported | Supported |

## Primary timestamp

The primary timestamp is parsed based on the `timestampSpec`, which is contained in the `parseSpec`, within the
`parser`, within the `dataSchema` of the ingestion spec. The `granularitySpec` within the `dataSchema` controls
other important operations that are based on the primary timestamp.

Druid schemas must always include a primary timestamp. The primary timestamp is used for
[partitioning and sorting](#partitioning) your data. Druid queries are able to rapidly identify and retrieve data
corresponding to time ranges of the primary timestamp column. Druid is also able to use the primary timestamp column
for time-based [data management operations](data-management.html) such as dropping time chunks, overwriting time chunks,
and time-based retention rules.

An example of a timestampSpec and granularitySpec within a dataSchema:

```
"dataSchema": {
  ...
  "parser": {
    ...
    "parseSpec": {
      ...,
      "timestampSpec": {
        "column": "timestamp",
        "format": "auto"
      }
    }
  },
  "granularitySpec": {
    "segmentGranularity": "day",
    "queryGranularity": "none",
    "rollup": true,
    "intervals" : [ "2013-08-31/2013-09-01" ]
  }
}
```

The `timestampSpec` has two parameters:

|Field|Description|Default|
|-----|-----------|-------|
|column|Input row field to read the primary timestamp from.|timestamp|
|format|Timestamp format. Options are: <ul><li>`iso`: ISO8601 with 'T' separator, like "2000-01-01T01:02:03.456"</li><li>`posix`: seconds since epoch</li><li>`millis`: milliseconds since epoch</li><li>`micro`: microseconds since epoch</li><li>`nano`: nanoseconds since epoch</li><li>`auto`: automatically detects iso (either 'T' or space separator) or millis format</li><li>any [Joda DateTimeFormat string](http://joda-time.sourceforge.net/apidocs/org/joda/time/format/DateTimeFormat.html)</li></ul>|auto|

The `granularitySpec` has five possible parameters:

|Field|Description|Default|
|-----|-----------|-------|
|segmentGranularity||day|
|queryGranularity||none|
|rollup||true|
|intervals||null|
|type||uniform|

## Schema

TODO(gianm)

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

## Partitioning

Optimal partitioning and sorting of your data can have substantial impact on footprint and performance.

Druid datasources are always partitioned by time into _time chunks_, and each time chunk contains one or more segments.
This partitioning happens for all ingestion methods, and is based on the `segmentGranularity` parameter of your
ingestion spec's `dataSchema`. The way you configure further partitioning is different depending on the ingestion
method you use (see the table below), and typically involves editing properties in the `tuningConfig`.

The segments within a particular time chunk may also be partitioned further, using options that vary based on the
ingestion method you have chosen. In general, doing this secondary partitioning using a particular dimension will
improve locality, meaning that rows with the same value for that dimension are stored together and can be accessed
quickly.

You will usually get the best performance and smallest overall footprint by partitioning your data on some "natural"
dimension that you often filter by, if one exists. This tends to improve compression — users have reported up to a
threefold storage size decrease — and it also tends to reduce the sizes of dictionaries and indexes. If you do have a
dimension like this, you should also place it first in the `dimensions` list of your `dimensionsSpec`, which tells
Druid to sort data segments by that column.

> Note that Druid always sorts rows within a segment by timestamp first, even before the first dimension listed in your
> dimensionsSpec. This can affect storage footprint and data locality. If you want to truly sort by a dimension, you can
> work around this by setting queryGranularity equal to segmentGranularity in your ingestion spec, which will
> set all timestamps within the segment to the same value. After doing this, you can still access a finer-granularity
> timestamp by ingesting your timestamp as a separate long-typed dimension. See
> [Secondary timestamps](schema-design.md#secondary-timestamps) in the schema design documentation for more
> information. This limitation may be removed in a future version of Druid.

Not all ingestion methods support an explicit partitioning configuration, and not all have equivalent levels of
flexibility. As of current Druid versions, If you are doing initial ingestion through a less-flexible method (like
Kafka) then you can use [reindexing techniques](data-management.html#reindexing) to repartition your data after it
is initially ingested. This is a powerful technique: you can use it to ensure that any data older than a certain
threshold is optimally partitioned, even as you continuously add new data from a stream.

|Method|How it works|
|------|------------|
|[Native batch](native-batch.html)|`index` (non-parallel) tasks partition input files based on the `partitionDimensions` and `forceGuaranteedRollup` tuning configs. `index_parallel` tasks do not currently support user-defined partitioning.|
|[Hadoop](hadoop.html)|Many options are available through the [partitionsSpec](hadoop.html#partitions-spec) setting.|
|[Kafka indexing service](../development/extensions-core/kafka-ingestion.md)|Partitioning in Druid is guided by how your Kafka topic is partitioned.|
|[Kinesis indexing service](../development/extensions-core/kinesis-ingestion.md)|Partitioning in Druid is guided by how your Kinesis stream is sharded.|


## Ingestion specs

No matter what ingestion method you use, data is loaded into Druid using either one-time [tasks](tasks.html) or
ongoing [supervisors](supervisors.html). In any case, part of the task or supervisor definition is an
_ingestion spec_.

Ingestion specs consists of three main components:

- `dataSchema`, which configures the datasource name, input row parser, datasource schema, and treatment of the primary
   timestamp. For more information, see the [parser](#parser), [primary timestamp](#primary-timestamp),
   [transforms and filters](#transform), and [schema](#schema) sections on this page.
- `ioConfig`, which influences how data is read from the source system. For more information, see the
   documentation for each [ingestion method](#connect).
- `tuningConfig`, which controls various tuning parameters. For more information, see the [tuning](#tuning) and
  [partitioning](#partitioning) sections on this page.

Example ingestion spec for task type "index" (native batch):

```
{
  "type": "index",
  "spec": {
    "dataSchema": {
      "dataSource": "wikipedia",
      "parser": {
        "type": "string",
        "parseSpec": {
          "format": "json",
          "timestampSpec": {
            "column": "timestamp",
            "format": "auto"
          },
          "dimensionsSpec": {
            "dimensions": [
              { "type": "string", "page" },
              { "type": "string", "language" }
            ]
          }
        }
      },
      "metricsSpec": [
        {
          "type": "count",
          "name": "count"
        },
        {
          "type": "doubleSum",
          "name": "bytes_added_sum",
          "fieldName": "bytes_added"
        },
        {
          "type": "doubleSum",
          "name": "bytes_deleted_sum",
          "fieldName": "bytes_deleted"
        }
      ],
      "granularitySpec": {
        "segmentGranularity": "day",
        "queryGranularity": "none",
        "intervals": [
          "2013-08-31/2013-09-01"
        ]
      }
    },
    "ioConfig": {
      "type": "index",
      "firehose": {
        "type": "local",
        "baseDir": "examples/indexing/",
        "filter": "wikipedia_data.json"
      }
    },
    "tuningConfig": {
      "type": "index"
    }
  }
}
```

The specific options supported by these sections will depend on the [ingestion method](#connect) you have chosen.
For more examples, refer to the documentation for each ingestion method.

You can also load data visually, without the need to write an ingestion spec, using the "Load data" functionality
available in Druid's [web console](../operations/druid-console.md). Currently, Druid's visual data loader only
supports [native batch](native-batch.html) mode. We intend to expand it to support more ingestion methods in the future.

### `dataSource`

### `parser`

The `parser` is part of the `dataSchema` section of the ingestion spec.

### `parseSpec`

### `timestampSpec`

### `dimensionsSpec`

| Field | Type | Description | Required |
|-------|------|-------------|----------|
| dimensions | JSON array | A list of [dimension schema](#dimension-schema) objects or dimension names. Providing a name is equivalent to providing a String-typed dimension schema with the given name. If this is an empty array, Druid will treat all non-timestamp, non-metric columns that do not appear in "dimensionExclusions" as String-typed dimension columns. | yes |
| dimensionExclusions | JSON String array | The names of dimensions to exclude from ingestion. | no (default == []) |
| spatialDimensions | JSON Object array | An array of [spatial dimensions](../development/geo.md) | no (default == []) |

#### Inclusions and exclusions

Druid will interpret dimensions, dimension exclusions, and metrics in the following order:

* Any column listed in the list of dimensions is treated as a dimension.
* Any column listed in the list of dimension exclusions is excluded as a dimension.
* The timestamp column and columns/fieldNames required by metrics are excluded by default.
* If a metric is also listed as a dimension, the metric must have a different name than the dimension name.

#### Dimension Schema
A dimension schema specifies the type and name of a dimension to be ingested.

For string columns, the dimension schema can also be used to enable or disable bitmap indexing by setting the
`createBitmapIndex` boolean. By default, bitmap indexes are enabled for all string columns. Only string columns can have
bitmap indexes; they are not supported for numeric columns.

For example, the following `dimensionsSpec` section from a `dataSchema` ingests one column as Long (`countryNum`), two
columns as Float (`userLatitude`, `userLongitude`), and the other columns as Strings, with bitmap indexes disabled
for the `comment` column.

```json
"dimensionsSpec" : {
  "dimensions": [
    "page",
    "language",
    "user",
    "unpatrolled",
    "newPage",
    "robot",
    "anonymous",
    "namespace",
    "continent",
    "country",
    "region",
    "city",
    {
      "type": "string",
      "name": "comment",
      "createBitmapIndex": false
    },
    {
      "type": "long",
      "name": "countryNum"
    },
    {
      "type": "float",
      "name": "userLatitude"
    },
    {
      "type": "float",
      "name": "userLongitude"
    }
  ],
  "dimensionExclusions" : [],
  "spatialDimensions" : []
}
```

### `flattenSpec`

Druid has a flat data model, but can ingest data formats that support nesting, such as JSON, Avro, etc. To bridge the gap,
Druid offers a `flattenSpec` configuration that you can specify as part of the `dataSchema`. Flattening is only supported for
[parseSpec](#parseSpec) types corresponding to data formats that support nesting, including `avro`, `json`, `orc`, and
`parquet`. Flattening is _not_ supported for the `timeAndDims` parseSpec type.

Conceptually, flattening occurs before fields are interpreted as timestamps (by the [timestampSpec](#timestampSpec)), dimensions
(by the [dimensionsSpec](#dimensionsSpec)), or metrics (by the [metricsSpec](#metricsSpec)). Flattening also occurs before
transforming and filtering (by the [transformSpec](#transformSpec)).

| Field | Description | Default |
|-------|-------------|---------|
| useFieldDiscovery | Boolean | If true, interpret all fields with singular values (not a map or list) and flat lists (lists of singular values) at the root level as columns. If false, all  | `true` |
| fields | JSON Object array | Specifies the fields of interest and how they are accessed. See below | `[]` |

Defining the JSON Flatten Spec allows nested JSON fields to be flattened during ingestion time. Only parseSpecs of types "json" or ["avro"](../development/extensions-core/avro.md) support flattening.

`fields` is a list of JSON Objects, describing the field names and how the fields are accessed:

| Field | Type | Description | Required |
|-------|------|-------------|----------|
| type | String | Type of the field, "root", "path" or "jq". | yes |
| name | String | This string will be used as the column name when the data has been ingested.  | yes |
| expr | String | Defines an expression for accessing the field within the JSON object, using [JsonPath](https://github.com/jayway/JsonPath) notation for type "path", and [jackson-jq](https://github.com/eiiches/jackson-jq) for type "jq". This field is only used for type "path" and "jq", otherwise ignored. | only for type "path" or "jq" |

Suppose the event JSON has the following form:

```json
{
 "timestamp": "2015-09-12T12:10:53.155Z",
 "dim1": "qwerty",
 "dim2": "asdf",
 "dim3": "zxcv",
 "ignore_me": "ignore this",
 "metrica": 9999,
 "foo": {"bar": "abc"},
 "foo.bar": "def",
 "nestmet": {"val": 42},
 "hello": [1.0, 2.0, 3.0, 4.0, 5.0],
 "mixarray": [1.0, 2.0, 3.0, 4.0, {"last": 5}],
 "world": [{"hey": "there"}, {"tree": "apple"}],
 "thing": {"food": ["sandwich", "pizza"]}
}
```

The column "metrica" is a Long metric column, "hello" is an array of Double metrics, and "nestmet.val" is a nested Long metric. All other columns are dimensions.

To flatten this JSON, the parseSpec could be defined as follows:

```json
"parseSpec": {
  "format": "json",
  "flattenSpec": {
    "useFieldDiscovery": true,
    "fields": [
      {
        "type": "root",
        "name": "dim1"
      },
      "dim2",
      {
        "type": "path",
        "name": "foo.bar",
        "expr": "$.foo.bar"
      },
      {
        "type": "root",
        "name": "foo.bar"
      },
      {
        "type": "path",
        "name": "path-metric",
        "expr": "$.nestmet.val"
      },
      {
        "type": "path",
        "name": "hello-0",
        "expr": "$.hello[0]"
      },
      {
        "type": "path",
        "name": "hello-4",
        "expr": "$.hello[4]"
      },
      {
        "type": "path",
        "name": "world-hey",
        "expr": "$.world[0].hey"
      },
      {
        "type": "path",
        "name": "worldtree",
        "expr": "$.world[1].tree"
      },
      {
        "type": "path",
        "name": "first-food",
        "expr": "$.thing.food[0]"
      },
      {
        "type": "path",
        "name": "second-food",
        "expr": "$.thing.food[1]"
      },
      {
        "type": "jq",
        "name": "first-food-by-jq",
        "expr": ".thing.food[1]"
      },
      {
        "type": "jq",
        "name": "hello-total",
        "expr": ".hello | sum"
      }
    ]
  },
  "dimensionsSpec" : {
   "dimensions" : [],
   "dimensionsExclusions": ["ignore_me"]
  },
  "timestampSpec" : {
   "format" : "auto",
   "column" : "timestamp"
  }
}
```

Fields "dim3", "ignore_me", and "metrica" will be automatically discovered because 'useFieldDiscovery' is true, so they have been omitted from the field spec list.

"ignore_me" will be automatically discovered but excluded as specified by dimensionsExclusions.

Aggregators should use the metric column names as defined in the flattenSpec. Using the example above:

```json
"metricsSpec" : [
{
  "type" : "longSum",
  "name" : "path-metric-sum",
  "fieldName" : "path-metric"
},
{
  "type" : "doubleSum",
  "name" : "hello-0-sum",
  "fieldName" : "hello-0"
},
{
  "type" : "longSum",
  "name" : "metrica-sum",
  "fieldName" : "metrica"
}
]
```

Note that:

* For convenience, when defining a root-level field, it is possible to define only the field name, as a string, shown with "dim2" above.
* Enabling 'useFieldDiscovery' will only autodetect fields at the root level with a single value (not a map or list), as well as fields referring to a list of single values. In the example above, "dim1", "dim2", "dim3", "ignore_me", "metrica", and "foo.bar" (at the root) would be automatically detected as columns. The "hello" field is a list of Doubles and will be autodiscovered, but note that the example ingests the individual list members as separate fields. The "world" field must be explicitly defined because its value is a map. The "mixarray" field, while similar to "hello", must also be explicitly defined because its last value is a map.
* Duplicate field definitions are not allowed, an exception will be thrown.
* If auto field discovery is enabled, any discovered field with the same name as one already defined in the field specs will be skipped and not added twice.
* The JSON input must be a JSON object at the root, not an array. e.g., {"valid": "true"} and {"valid":[1,2,3]} are supported but [{"invalid": "true"}] and [1,2,3] are not.
* [http://jsonpath.herokuapp.com/](http://jsonpath.herokuapp.com/) is useful for testing the path expressions.
* jackson-jq supports subset of [./jq](https://stedolan.github.io/jq/) syntax.  Please refer jackson-jq document.

### `metricsSpec`

The `metricsSpec` is a list of [aggregators](../querying/aggregations.md). If `rollup` is false in the granularity spec, the metrics spec should be an empty list and all columns should be defined in the `dimensionsSpec` instead (without rollup, there isn't a real distinction between dimensions and metrics at ingestion time). This is optional, however.

### `granularitySpec`

GranularitySpec is to define how to partition a dataSource into [time chunks](../design/index.html#datasources-and-segments).
The default granularitySpec is `uniform`, and can be changed by setting the `type` field.
Currently, `uniform` and `arbitrary` types are supported.

#### Uniform Granularity Spec

This spec is used to generated segments with uniform intervals.

| Field | Type | Description | Required |
|-------|------|-------------|----------|
| segmentGranularity | string | The granularity to create time chunks at. Multiple segments can be created per time chunk. For example, with 'DAY' `segmentGranularity`, the events of the same day fall into the same time chunk which can be optionally further partitioned into multiple segments based on other configurations and input size. See [Granularity](../querying/granularities.md) for supported granularities.| no (default == 'DAY') |
| queryGranularity | string | The minimum granularity to be able to query results at and the granularity of the data inside the segment. E.g. a value of "minute" will mean that data is aggregated at minutely granularity. That is, if there are collisions in the tuple (minute(timestamp), dimensions), then it will aggregate values together using the aggregators instead of storing individual rows. A granularity of 'NONE' means millisecond granularity. See [Granularity](../querying/granularities.md) for supported granularities.| no (default == 'NONE') |
| rollup | boolean | rollup or not | no (default == true) |
| intervals | JSON string array | A list of intervals for the raw data being ingested. Ignored for real-time ingestion. | no. If specified, Hadoop and native non-parallel batch ingestion tasks may skip determining partitions phase which results in faster ingestion; native parallel ingestion tasks can request all their locks up-front instead of one by one. Batch ingestion will thrown away any data not in the specified intervals. |

#### Arbitrary Granularity Spec

This spec is used to generate segments with arbitrary intervals (it tries to create evenly sized segments). This spec is not supported for real-time processing.

| Field | Type | Description | Required |
|-------|------|-------------|----------|
| queryGranularity | string | The minimum granularity to be able to query results at and the granularity of the data inside the segment. E.g. a value of "minute" will mean that data is aggregated at minutely granularity. That is, if there are collisions in the tuple (minute(timestamp), dimensions), then it will aggregate values together using the aggregators instead of storing individual rows. A granularity of 'NONE' means millisecond granularity. See [Granularity](../querying/granularities.md) for supported granularities.| no (default == 'NONE') |
| rollup | boolean | rollup or not | no (default == true) |
| intervals | JSON string array | A list of intervals for the raw data being ingested. Ignored for real-time ingestion. | no. If specified, Hadoop and native non-parallel batch ingestion tasks may skip determining partitions phase which results in faster ingestion; native parallel ingestion tasks can request all their locks up-front instead of one by one. Batch ingestion will thrown away any data not in the specified intervals. |

### `transformSpec`

Druid can transform and filter records during ingestion using a `transformSpec`, which is part of the `dataSchema`
section of an ingestion spec.

An example of a transformSpec within a dataSchema:

```
"dataSchema": {
  ...
  "transformSpec": {
    "transforms: [
      { "type": "expression", "name": "countryUpper", "expression": "upper(country)" }
    ],
    "filter": {
      "type": "selector",
      "dimension": "country",
      "value": "San Serriffe"
    }
  }
}
```

#### Transforms

The `transforms` list allows you to specify a set of expressions to evaluate on top of input data. Each transform has a
"name" which can be referred to by your `dimensionsSpec`, `metricsSpec`, etc.

If a transform has the same name as a field in an input row, then it will shadow the original field. Transforms that
shadow fields may still refer to the fields they shadow. This can be used to transform a field "in-place".

Transforms do have some limitations. They can only refer to fields present in the actual input rows; in particular,
they cannot refer to other transforms. And they cannot remove fields, only add them. However, they can shadow a field
with another field containing all nulls, which will act similarly to removing the field.

Transforms can refer to the [timestamp](#timestamp) of an input row by referring to `__time` as part of the expression.
They can also _replace_ the timestamp if you set their "name" to `__time`. In both cases, `__time` should be treated as
a millisecond timestamp (number of milliseconds since Jan 1, 1970 at midnight UTC). Transforms are applied _after_ the
`timestampSpec`.

Druid currently includes one kind of builtin transform, the expression transform. It has the following syntax:

```
{
  "type": "expression",
  "name": "<output name>",
  "expression": "<expr>"
}
```

The `expression` is a [Druid query expression](../misc/math-expr.md).

#### Filter

The `filter` conditionally filters input rows during ingestion. Only rows that pass the filter will be
ingested. Any of Druid's standard [query filters](../querying/filters.md) can be used. Note that within a
`transformSpec`, the `transforms` are applied before the `filter`, so the filter can refer to a transform.

### `ioConfig`

### `tuningConfig`

Tuning properties are specified in a `tuningConfig`, which goes at the top level of an ingestion spec.

Some tuning properties can apply to any ingestion methods. An example tuningConfig that sets all of these global
properties to their defaults is:

```
"tuningConfig": {
  "type": "<ingestion-method-specific type code>",
  "maxRowsInMemory": 1000000,
  "maxBytesInMemory": <one-sixth of JVM memory>,
  "indexSpec": {
    "bitmap": { "type": "concise" },
    "dimensionCompression": "lz4",
    "metricCompression": "lz4",
    "longEncoding": "longs"
  },
  ... possible ingestion-method-specific tunings ...
}
```

|Field|Description|Default|
|-----|-----------|-------|
|type|Each ingestion method has its own tuning type code. You must specify the type code that matches your ingestion method. Options are `index`, `hadoop`, `kafka`, and `kinesis`.||
|maxRowsInMemory|The maximum number of records to store in memory before persisting to disk. Note that this is the number of rows post-rollup, and so it may not be equal to the number of input records. Ingested records will be persisted to disk when either `maxRowsInMemory` or `maxBytesInMemory` are reached (whichever happens first).|1000000|
|maxBytesInMemory|The maximum aggregate size of records, in bytes, to store in the JVM heap before persisting. This is based on a rough estimate of memory usage. Ingested records will be persisted to disk when either `maxRowsInMemory` or `maxBytesInMemory` are reached (whichever happens first).<br /><br />Setting maxBytesInMemory to -1 disables this check, meaning Druid will rely entirely on maxRowsInMemory to control memory usage. Setting it to zero means the default value will be used (one-sixth of JVM heap size).<br /><br />Note that the estimate of memory usage is designed to be an overestimate, and can be especially high when using complex ingest-time aggregators, including sketches. If this causes your indexing workloads to persist to disk too often, you can set maxBytesInMemory to -1 and rely on maxRowsInMemory instead.|One-sixth of max JVM heap size|
|indexSpec|Tune how data is indexed. See below for more information.|See table below|

The `indexSpec` object can include the following properties:

|Field|Description|Default|
|-----|-----------|-------|
|bitmap|Compression format for bitmap indexes. Should be a JSON object with `type` set to `concise` or `roaring`. For type `roaring`, the boolean property `compressRunOnSerialization` (defaults to true) controls whether or not run-length encoding will be used when it is determined to be more space-efficient.|`{"type": "concise"}`|
|dimensionCompression|Compression format for dimension columns. Options are `lz4`, `lzf`, or `uncompressed`.|lz4|
|metricCompression|Compression format for metric columns. Options are `lz4`, `lzf`, `uncompressed`, or `none` (which is more efficient than `uncompressed`, but not supported by older versions of Druid).|lz4|
|longEncoding|Encoding format for long-typed columns. Applies regardless of whether they are dimensions or metrics. Options are `auto` or `longs`. `auto` encodes the values using offset or lookup table depending on column cardinality, and store them with variable size. `longs` stores the value as-is with 8 bytes each.|longs|

Beyond these properties, each ingestion method has its own specific tuning properties. See the documentation for each
ingestion method (below) for details.

|Method|Tuning properties|
|------|-----------------|
|[Native batch](native-batch.html)|[Native batch tuning](native-batch.html#tuning)|
|[Hadoop](hadoop.html)|[Hadoop tuning](hadoop.html#tuning)|
|[Kafka indexing service](../development/extensions-core/kafka-ingestion.md)|[Kafka tuning](../development/extensions-core/kafka-ingestion.html#tuning)|
|[Kinesis indexing service](../development/extensions-core/kinesis-ingestion.md)|[Kinesis tuning](../development/extensions-core/kinesis-ingestion.html#tuning)|


