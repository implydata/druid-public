---
id: extensions
title: "extensions"
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


Druid implements an extension system that allows for adding functionality at runtime. Extensions
are commonly used to add support for deep storages (like HDFS and S3), metadata stores (like MySQL
and PostgreSQL), new aggregators, new input formats, and so on.

Production clusters will generally use at least two extensions; one for deep storage and one for a
metadata store. Many clusters will also use additional extensions.

## Including extensions

Please see [here](../operations/including-extensions.md).

## Core extensions

Core extensions are maintained by Druid committers.

|Name|Description|Docs|
|----|-----------|----|
|druid-avro-extensions|Support for data in Apache Avro data format.|[link](../development/extensions-core/avro.md)|
|druid-basic-security|Support for Basic HTTP authentication and role-based access control.|[link](../development/extensions-core/druid-basic-security.md)|
|druid-bloom-filter|Support for providing Bloom filters in druid queries.|[link](../development/extensions-core/bloom-filter.md)|
|druid-caffeine-cache|A local cache implementation backed by Caffeine.|[link](../configuration/index.html#cache-configuration)|
|druid-datasketches|Support for approximate counts and set operations with [DataSketches](https://datasketches.github.io/).|[link](../development/extensions-core/datasketches-extension.md)|
|druid-hdfs-storage|HDFS deep storage.|[link](../development/extensions-core/hdfs.md)|
|druid-histogram|Approximate histograms and quantiles aggregator. Deprecated, please use the [DataSketches quantiles aggregator](../development/extensions-core/datasketches-quantiles.md) from the `druid-datasketches` extension instead.|[link](../development/extensions-core/approximate-histograms.md)|
|druid-kafka-eight|Kafka ingest firehose (high level consumer) for realtime nodes(deprecated).|[link](../development/extensions-core/kafka-eight-firehose.md)|
|druid-kafka-extraction-namespace|Kafka-based namespaced lookup. Requires namespace lookup extension.|[link](../development/extensions-core/kafka-extraction-namespace.md)|
|druid-kafka-indexing-service|Supervised exactly-once Kafka ingestion for the indexing service.|[link](../development/extensions-core/kafka-ingestion.md)|
|druid-kinesis-indexing-service|Supervised exactly-once Kinesis ingestion for the indexing service.|[link](../development/extensions-core/kinesis-ingestion.md)|
|druid-kerberos|Kerberos authentication for druid processes.|[link](../development/extensions-core/druid-kerberos.md)|
|druid-lookups-cached-global|A module for [lookups](../querying/lookups.md) providing a jvm-global eager caching for lookups. It provides JDBC and URI implementations for fetching lookup data.|[link](../development/extensions-core/lookups-cached-global.md)|
|druid-lookups-cached-single| Per lookup caching module to support the use cases where a lookup need to be isolated from the global pool of lookups |[link](../development/extensions-core/druid-lookups.md)|
|druid-orc-extensions|Support for data in Apache Orc data format.|[link](../development/extensions-core/orc.md)|
|druid-parquet-extensions|Support for data in Apache Parquet data format. Requires druid-avro-extensions to be loaded.|[link](../development/extensions-core/parquet.md)|
|druid-protobuf-extensions| Support for data in Protobuf data format.|[link](../development/extensions-core/protobuf.md)|
|druid-s3-extensions|Interfacing with data in AWS S3, and using S3 as deep storage.|[link](../development/extensions-core/s3.md)|
|druid-ec2-extensions|Interfacing with AWS EC2 for autoscaling middle managers|UNDOCUMENTED|
|druid-stats|Statistics related module including variance and standard deviation.|[link](../development/extensions-core/stats.md)|
|mysql-metadata-storage|MySQL metadata store.|[link](../development/extensions-core/mysql.md)|
|postgresql-metadata-storage|PostgreSQL metadata store.|[link](../development/extensions-core/postgresql.md)|
|simple-client-sslcontext|Simple SSLContext provider module to be used by Druid's internal HttpClient when talking to other Druid processes over HTTPS.|[link](../development/extensions-core/simple-client-sslcontext.md)|


> Community extensions are not maintained by Druid committers, although we accept patches from community members using these extensions. They may not have been as extensively tested as the core extensions.

A number of community members have contributed their own extensions to Druid that are not packaged with the default Druid tarball.
If you'd like to take on maintenance for a community extension, please post on [dev@druid.apache.org](https://lists.apache.org/list.html?dev@druid.apache.org) to let us know!

All of these community extensions can be downloaded using [pull-deps](../operations/pull-deps.html) while specifying a `-c` coordinate option to pull `org.apache.druid.extensions.contrib:{EXTENSION_NAME}:{DRUID_VERSION}`.

|Name|Description|Docs|
|----|-----------|----|
|ambari-metrics-emitter|Ambari Metrics Emitter |[link](../development/extensions-contrib/ambari-metrics-emitter.md)|
|druid-azure-extensions|Microsoft Azure deep storage.|[link](../development/extensions-contrib/azure.md)|
|druid-cassandra-storage|Apache Cassandra deep storage.|[link](../development/extensions-contrib/cassandra.md)|
|druid-cloudfiles-extensions|Rackspace Cloudfiles deep storage and firehose.|[link](../development/extensions-contrib/cloudfiles.md)|
|druid-distinctcount|DistinctCount aggregator|[link](../development/extensions-contrib/distinctcount.md)|
|druid-kafka-eight-simpleConsumer|Kafka ingest firehose (low level consumer)(deprecated).|[link](../development/extensions-contrib/kafka-simple.md)|
|druid-rabbitmq|RabbitMQ firehose.|[link](../development/extensions-contrib/rabbitmq.md)|
|druid-redis-cache|A cache implementation for Druid based on Redis.|[link](../development/extensions-contrib/redis-cache.md)|
|druid-rocketmq|RocketMQ firehose.|[link](../development/extensions-contrib/rocketmq.md)|
|druid-time-min-max|Min/Max aggregator for timestamp.|[link](../development/extensions-contrib/time-min-max.md)|
|druid-google-extensions|Google Cloud Storage deep storage.|[link](../development/extensions-contrib/google.md)|
|sqlserver-metadata-storage|Microsoft SqlServer deep storage.|[link](../development/extensions-contrib/sqlserver.md)|
|graphite-emitter|Graphite metrics emitter|[link](../development/extensions-contrib/graphite.md)|
|statsd-emitter|StatsD metrics emitter|[link](../development/extensions-contrib/statsd.md)|
|kafka-emitter|Kafka metrics emitter|[link](../development/extensions-contrib/kafka-emitter.md)|
|druid-thrift-extensions|Support thrift ingestion |[link](../development/extensions-contrib/thrift.md)|
|druid-opentsdb-emitter|OpenTSDB metrics emitter |[link](../development/extensions-contrib/opentsdb-emitter.md)|
|druid-moving-average-query|Support for [Moving Average](https://en.wikipedia.org/wiki/Moving_average) and other Aggregate [Window Functions](https://en.wikibooks.org/wiki/Structured_Query_Language/Window_functions) in Druid queries.|[link](../development/extensions-contrib/moving-average-query.md)|
|druid-influxdb-emitter|InfluxDB metrics emitter|[link](../development/extensions-contrib/influxdb-emitter.md)|
|druid-momentsketch|Support for approximate quantile queries using the [momentsketch](https://github.com/stanford-futuredata/momentsketch) library|[link](../development/extensions-contrib/momentsketch-quantiles.md)|
|druid-tdigestsketch|Support for approximate sketch aggregators based on [T-Digest](https://github.com/tdunning/t-digest)|[link](../development/extensions-contrib/tdigestsketch-quantiles.md)|

## Promoting Community Extension to Core Extension

Please post on [dev@druid.apache.org](https://lists.apache.org/list.html?dev@druid.apache.org) if you'd like an extension to be promoted to core.
If we see a community extension actively supported by the community, we can promote it to core based on community feedback.


For information how to create your own extension, please see [here](../development/modules.md).
