---
id: tutorial-query
title: "Tutorial: Querying data"
sidebar_label: "Querying data"
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


This tutorial will demonstrate how to query data in Apache Druid (incubating), with examples for Druid SQL and Druid's native query format.

The tutorial assumes that you've already completed one of the 4 ingestion tutorials, as we will be querying the sample koalastothemax.com usage analytics data.

* [Tutorial: Loading a file](../tutorials/tutorial-batch.md)
* [Tutorial: Loading stream data from Kafka](../tutorials/tutorial-kafka.md)
* [Tutorial: Loading a file using Hadoop](../tutorials/tutorial-batch-hadoop.md)

Druid queries are sent over HTTP.
The Druid console includes a view to issue queries to Druid and nicely format the results.

## Druid SQL queries

Druid supports a dialect of SQL for querying.

This query retrieves the 10 koalas loaded_images with the most views on 2019-08-22.

```sql
SELECT loaded_images, COUNT(*) AS views
FROM koalas
WHERE "__time" BETWEEN TIMESTAMP '2019-08-21 00:00:00' AND TIMESTAMP '2019-08-22 00:00:00'
GROUP BY loaded_image ORDER BY views DESC
LIMIT 10
```

Let's look at the different ways to issue this query.

### Query SQL via the console

You can issue the above query from the console.

![Query autocomplete](../assets/tutorial-query-01.png "Query autocomplete")

The console query view provides autocomplete together with inline function documentation.
You can also configure extra context flags to be sent with the query from the more options menu.

![Query options](../assets/tutorial-query-02.png "Query options")

Note that the console will by default wrap your SQL queries in a limit so that you can issue queries like `SELECT * FROM koalas` without much hesitation - you can turn off this behaviour.

### Query SQL via dsql

For convenience, the Druid package includes a SQL command-line client, located at `bin/dsql` from the Druid package root.

Let's now run `bin/dsql`; you should see the following prompt:

```bash
Welcome to dsql, the command-line client for Druid SQL.
Type "\h" for help.
dsql>
```

To submit the query, paste it to the `dsql` prompt and press enter:

```bash
dsql> SELECT loaded_image, COUNT(*) AS views FROM koalas WHERE "__time" BETWEEN TIMESTAMP '2019-08-21 00:00:00' AND TIMESTAMP '2019-08-22 00:00:00' GROUP BY loaded_image ORDER BY views DESC LIMIT 10;
┌───────────────────────────────────────────────┬───────┐
│ loaded_image                                  │ views │
├───────────────────────────────────────────────┼───────┤
│ http://www.koalastothemax.com/img/koalas3.jpg │ 18022 │
│ http://www.koalastothemax.com/img/koalas.jpg  │ 17635 │
│ http://www.koalastothemax.com/img/koalas1.jpg │ 16626 │
│ http://www.koalastothemax.com/img/koalas2.jpg │ 16493 │
│ https://koalastothemax.com/img/koalas.jpg     │ 14184 │
│ https://koalastothemax.com/img/koalas1.jpg    │ 12795 │
│ Custom image                                  │ 12765 │
│ https://koalastothemax.com/img/koalas2.jpg    │ 12491 │
│ https://koalastothemax.com/img/koalas3.jpg    │ 12290 │
│ http://koalastothemax.com/img/koalas3.jpg     │  2240 │
└───────────────────────────────────────────────┴───────┘
Retrieved 10 rows in 0.06s.
```


### Query SQL over HTTP

The SQL queries are submitted as JSON over HTTP.

The tutorial package includes an example file that contains the SQL query shown above at `quickstart/tutorial/koalas-top-images-sql.json`. Let's submit that query to the Druid Broker:

```bash
curl -X 'POST' -H 'Content-Type:application/json' -d @quickstart/tutorial/koalas-top-images-sql.json http://localhost:8888/druid/v2/sql
```

The following results should be returned:

```json
[
  {"loaded_image":"http://www.koalastothemax.com/img/koalas3.jpg","views":18022},
  {"loaded_image":"http://www.koalastothemax.com/img/koalas.jpg","views":17635},
  {"loaded_image":"http://www.koalastothemax.com/img/koalas1.jpg","views":16626},
  {"loaded_image":"http://www.koalastothemax.com/img/koalas2.jpg","views":16493},
  {"loaded_image":"https://koalastothemax.com/img/koalas.jpg","views":14184},
  {"loaded_image":"https://koalastothemax.com/img/koalas1.jpg","views":12795},
  {"loaded_image":"Custom image","views":12765},
  {"loaded_image":"https://koalastothemax.com/img/koalas2.jpg","views":12491},
  {"loaded_image":"https://koalastothemax.com/img/koalas3.jpg","views":12290},
  {"loaded_image":"http://koalastothemax.com/img/koalas3.jpg","views":2240}
]
```

### More Druid SQL examples

Here is a collection of queries to try out:

#### Query over time

```sql
SELECT FLOOR(__time to HOUR) AS HourTime, SUM(session_time) AS total_session_time
FROM koalas WHERE "__time" BETWEEN TIMESTAMP '2019-08-21 00:00:00' AND TIMESTAMP '2019-08-22 00:00:00'
GROUP BY 1
```

![Query example](../assets/tutorial-query-03.png "Query example")

#### General group by

```sql
SELECT browser, loaded_image, SUM(session_time)
FROM koalas WHERE "__time" BETWEEN TIMESTAMP '2019-08-21 00:00:00' AND TIMESTAMP '2019-08-22 00:00:00'
GROUP BY browser, loaded_image
ORDER BY SUM(added) DESC
```

![Query example](../assets/tutorial-query-04.png "Query example")

#### Select raw data

```sql
SELECT browser, loaded_image
FROM koalas WHERE "__time" BETWEEN TIMESTAMP '2019-08-21 02:00:00' AND TIMESTAMP '2019-08-21 03:00:00'
LIMIT 5
```

![Query example](../assets/tutorial-query-05.png "Query example")

### Explain query plan

Druid SQL has the ability to explain the query plan for a given query.
In the console this functionality is accessible from the `...` button.

![Explain query](../assets/tutorial-query-06.png "Explain query")

If you are querying in other ways you can get the plan by prepending `EXPLAIN PLAN FOR ` to a Druid SQL query.

Using a query from an example above:

`EXPLAIN PLAN FOR SELECT loaded_image, COUNT(*) AS views FROM koalas WHERE "__time" BETWEEN TIMESTAMP '2019-08-21 00:00:00' AND TIMESTAMP '2019-08-22 00:00:00' GROUP BY loaded_image ORDER BY views DESC LIMIT 10;`

```bash
dsql> EXPLAIN PLAN FOR SELECT loaded_image, COUNT(*) AS views FROM koalas WHERE "__time" BETWEEN TIMESTAMP '2019-08-21 00:00:00' AND TIMESTAMP '2019-08-22 00:00:00' GROUP BY loaded_image ORDER BY views DESC LIMIT 10;
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ PLAN                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ DruidQueryRel(query=[{"queryType":"topN","dataSource":{"type":"table","name":"koalas"},"virtualColumns":[],"dimension":{"type":"default","dimension":"loaded_image","outputName":"d0","outputType":"STRING"},"metric":{"type":"numeric","metric":"a0"},"threshold":10,"intervals":{"type":"intervals","intervals":["2019-08-21T00:00:00.000Z/2019-08-22T00:00:00.001Z"]},"filter":null,"granularity":{"type":"all"},"aggregations":[{"type":"count","name":"a0"}],"postAggregations":[],"context":{},"descending":false}], signature=[{d0:STRING, a0:LONG}])
 │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
Retrieved 1 row in 0.03s.
```


## Native JSON queries

Druid's native query format is expressed in JSON.

### Native query via the console

You can issue native Druid queries from the console's Query view.

Here is a query that retrieves the 10 koalas images with the most views on 2019-08-21.

```json
{
  "queryType" : "topN",
  "dataSource" : "koalas",
  "intervals" : ["2019-08-21/2019-08-22"],
  "granularity" : "all",
  "dimension" : "os",
  "metric" : "count",
  "threshold" : 10,
  "aggregations" : [
    {
      "type" : "count",
      "name" : "count"
    }
  ]
}
```

Simply paste it into the console to switch the editor into JSON mode.

![Native query](../assets/tutorial-query-07.png "Native query")


### Native queries over HTTP

We have included a sample native TopN query under `quickstart/tutorial/koalas-top-views.json`:

Let's submit this query to Druid:

```bash
curl -X 'POST' -H 'Content-Type:application/json' -d @quickstart/tutorial/koalas-top-views.json http://localhost:8888/druid/v2?pretty
```

You should see the following query results:

```json
[ {
  "timestamp" : "2019-08-21T00:00:00.169Z",
  "result" : [ {
    "count" : 18022,
    "loaded_image" : "http://www.koalastothemax.com/img/koalas3.jpg"
  }, {
    "count" : 17635,
    "loaded_image" : "http://www.koalastothemax.com/img/koalas.jpg"
  }, {
    "count" : 16626,
    "loaded_image" : "http://www.koalastothemax.com/img/koalas1.jpg"
  }, {
    "count" : 16493,
    "loaded_image" : "http://www.koalastothemax.com/img/koalas2.jpg"
  }, {
    "count" : 14184,
    "loaded_image" : "https://koalastothemax.com/img/koalas.jpg"
  }, {
    "count" : 12795,
    "loaded_image" : "https://koalastothemax.com/img/koalas1.jpg"
  }, {
    "count" : 12765,
    "loaded_image" : "Custom image"
  }, {
    "count" : 12491,
    "loaded_image" : "https://koalastothemax.com/img/koalas2.jpg"
  }, {
    "count" : 12290,
    "loaded_image" : "https://koalastothemax.com/img/koalas3.jpg"
  }, {
    "count" : 2240,
    "loaded_image" : "http://koalastothemax.com/img/koalas3.jpg"
  } ]
} ]
```


## Further reading

The [Queries documentation](../querying/querying.md) has more information on Druid's native JSON queries.

The [Druid SQL documentation](../querying/sql.md) has more information on using Druid SQL queries.
