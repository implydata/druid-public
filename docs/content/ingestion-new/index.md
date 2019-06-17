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

All data in Druid is organized into _segments_, which are data files that generally have up to a few million rows each.
Loading data in Druid is called _ingestion_ or _indexing_ and consists of reading data from a data source and creating
segments based on that data.

In most ingestion methods, the work of loading data is done by Druid MiddleManager processes. One exception is
Hadoop-based ingestion, where this work is instead done using a Hadoop MapReduce job on YARN (although MiddleManager
processes are still involved in starting and monitoring the Hadoop jobs). Once segments have been generated and stored
in [deep storage](../dependencies/deep-storage.html), they will be loaded by Historical processes. For more details on
how this works under the hood, see the [Storage design](../design/index.html#storage) section of Druid's design
documentation.

<a name="connect"></a>

## Ingestion methods

The table below lists Druid's most common data ingestion methods, along with comparisons to help you choose
the best one for your situation. Each ingestion method supports its own set of data sources. For details about how
each method works, as well as configuration properties specific to that method, check out its documentation page.

|Method|Task or supervisor?|How it works|Query data immediately (real-time)?|Supported by data loader in [web console](../operations/druid-console.html)?|
|------|-------------------|------------|-----------------------------------|----------------------------------------------------------------------------|
|[Native batch](native-batch.html)|Task type `index` or `index_parallel`|Druid loads data directly from S3, HTTP, NFS, or other networked storage.|No|Yes|
|[Hadoop-based](hadoop.html)|Task type `index_hadoop`|Druid launches Hadoop Map/Reduce jobs to load data files.|No|No|
|[Kafka indexing service](../development/extensions-core/kafka-ingestion.html)|Supervisor type `kafka`|Druid reads directly from Apache Kafka.|Yes|No|
|[Kinesis indexing service](../development/extensions-core/kinesis-ingestion.html)|Supervisor type `kinesis`|Druid reads directly from Amazon Kinesis.|Yes|No|

When loading from Kafka or Kinesis, you should use the appropriate supervisor-based indexing service.

When doing batch loads from files, you should use one-time tasks, and you have three options: `index` (native batch,
single-task), `index_parallel` (native batch, parallel), or `index_hadoop` (Hadoop-based). The following table compares
and contrasts the three batch ingestion options.

|   |index_hadoop|index_parallel|index|
|---|------------|--------------|-----|
| Category | Hadoop-based | Native batch | Native batch |
| Parallel indexing | Always parallel | Parallel if firehose is splittable | No |
| Supported indexing modes | Overwrite | Append or overwrite | Append or overwrite |
| External dependencies | Hadoop (it internally submits Map/Reduce jobs) | None | None |
| Supported [rollup modes](#rollup) | Perfect rollup | Best-effort rollup | Both perfect and best-effort rollup |
| Supported partitioning methods | [Both Hash-based and range partitioning](hadoop.html#partitioning-specification) | N/A | Hash-based partitioning (when `forceGuaranteedRollup` = true) |
| Supported input locations | All locations accessible via HDFS client or Druid dataSource | All implemented [firehoses](./firehose.html) | All implemented [firehoses](./firehose.html) |
| Supported file formats | All implemented Hadoop InputFormats | Currently text file formats (CSV, TSV, JSON) by default. Additional formats can be added though a [custom extension](../development/modules.html) implementing [`FiniteFirehoseFactory`](https://github.com/apache/incubator-druid/blob/master/core/src/main/java/org/apache/druid/data/input/FiniteFirehoseFactory.java) | Currently text file formats (CSV, TSV, JSON) by default. Additional formats can be added though a [custom extension](../development/modules.html) implementing [`FiniteFirehoseFactory`](https://github.com/apache/incubator-druid/blob/master/core/src/main/java/org/apache/druid/data/input/FiniteFirehoseFactory.java) |
| Saving parse exceptions in ingestion report | Currently not supported | Currently not supported | Supported |

TODO(gianm): Something about tranquility; mention it but generally downplay and link offsite

<a name="spec"></a>

## Ingestion specs

No matter what ingestion method you use, data is loaded into Druid using either one-time [tasks](tasks.html) or
ongoing [supervisors](supervisors.html). In any case, part of the task or supervisor definition is an
_ingestion spec_.

<details>
<summary>Example ingestion spec for task type "index" (native batch)</summary>
<pre>
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
</pre>
</details>

Ingestion specs consists of three main components:

- `dataSchema`, which configures the datasource name, input row parser, datasource schema, and treatment of the primary
   timestamp. For more information, see the [parser](#parser), [primary timestamp](#primary-timestamp),
   [transforms and filters](#transform), and [schema](#schema) sections on this page.
- `ioConfig`, which influences how data is read from the source system. For more information, see the
   documentation for each [ingestion method](#connect).
- `tuningConfig`, which controls various tuning parameters. For more information, see the [tuning](#tuning) and
  [partitioning](#partitioning) sections on this page.

The specific options supported by these sections will depend on the [ingestion method](#connect) you have chosen.
For more examples, refer to the documentation for each ingestion method.

You can also load data visually, without the need to write an ingestion spec, using the "Load data" functionality
available in Druid's [web console](../operations/druid-console.html). Currently, Druid's visual data loader only
supports [native batch](native-batch.html) mode. We intend to expand it to support more ingestion methods in the future.

<a name="parse"></a>

## Parser

The `parser` is part of the `dataSchema` section of the ingestion spec.

<a name="timestamp"></a>

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

<a name="transform"></a>

## Transforms and filters

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

### Transforms

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

The `expression` is a [Druid query expression](../misc/math-expr.html).

### Filter

The `filter` conditionally filters input rows during ingestion. Only rows that pass the filter will be
ingested. Any of Druid's standard [query filters](../querying/filters.html) can be used. Note that within a
`transformSpec`, the `transforms` are applied before the `filter`, so the filter can refer to a transform.

<a name="schema"></a>

## Schema

<a name="tune"></a>

## Tuning

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
|[Kafka indexing service](../development/extensions-core/kafka-ingestion.html)|[Kafka tuning](../development/extensions-core/kafka-ingestion.html#tuning)|
|[Kinesis indexing service](../development/extensions-core/kinesis-ingestion.html)|[Kinesis tuning](../development/extensions-core/kinesis-ingestion.html#tuning)|

<a name="partitioning"></a>

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

<div class="note info">
Note that Druid always sorts rows within a segment by timestamp first, even before the first dimension listed in your
dimensionsSpec. This can affect storage footprint and data locality. If you want to truly sort by a dimension, you can
work around this by setting queryGranularity equal to segmentGranularity in your ingestion spec, which will
set all timestamps within the segment to the same value. After doing this, you can still access a finer-granularity
timestamp by ingesting your timestamp as a separate long-typed dimension. See
<a href="schema-design.html#secondary-timestamps">Secondary timestamps</a> in the schema design documentation for more
information. This limitation may be removed in a future version of Druid.
</div>

Not all ingestion methods support an explicit partitioning configuration, and not all have equivalent levels of
flexibility. As of current Druid versions, If you are doing initial ingestion through a less-flexible method (like
Kafka) then you can use [reindexing techniques](data-management.html#reindexing) to repartition your data after it
is initially ingested. This is a powerful technique: you can use it to ensure that any data older than a certain
threshold is optimally partitioned, even as you continuously add new data from a stream.

|Method|How it works|
|------|------------|
|[Native batch](native-batch.html)|`index` (non-parallel) tasks partition input files based on the `partitionDimensions` and `forceGuaranteedRollup` tuning configs. `index_parallel` tasks do not currently support user-defined partitioning.|
|[Hadoop](hadoop.html)|Many options are available through the [partitionsSpec](hadoop.html#partitions-spec) setting.|
|[Kafka indexing service](../development/extensions-core/kafka-ingestion.html)|Partitioning in Druid is guided by how your Kafka topic is partitioned.|
|[Kinesis indexing service](../development/extensions-core/kinesis-ingestion.html)|Partitioning in Druid is guided by how your Kinesis stream is sharded.|
