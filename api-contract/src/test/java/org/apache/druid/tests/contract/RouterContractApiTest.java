/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

package org.apache.druid.tests.contract;

import org.apache.druid.client.api.RouterApi;
import org.apache.druid.client.invoker.ApiClient;
import org.apache.druid.client.invoker.ApiException;
import org.apache.druid.client.invoker.ApiResponse;
import org.apache.druid.client.invoker.Configuration;
import org.apache.druid.client.model.DataSource;
import org.apache.druid.client.model.ServerStatus;
import org.apache.druid.tests.contract.util.DockerComposeUtil;
import org.apache.druid.tests.contract.util.SwaggerSpecUtil;
import org.junit.Assert;
import org.junit.BeforeClass;
import org.junit.Test;

import java.util.List;

public class RouterContractApiTest
{

  private static RouterApi routerApi;

  @BeforeClass
  public static void before()
  {
    DockerComposeUtil.startPrism();

    ApiClient defaultClient = Configuration.getDefaultApiClient();
    defaultClient.setBasePath("http://localhost:9000");

    routerApi = new RouterApi(defaultClient);
  }

  @Test
  public void testServerStatus() throws ApiException
  {
    ApiResponse<ServerStatus> serverStatusResponse = routerApi.getServerStatusWithHttpInfo();
    ServerStatus serverStatus = serverStatusResponse.getData();

    ServerStatus expectedServerStatus = SwaggerSpecUtil.getExampleServerStatus();

    Assert.assertEquals(200, serverStatusResponse.getStatusCode());
    Assert.assertEquals(expectedServerStatus, serverStatus);
  }

  @Test
  public void testDataSourcesNames() throws ApiException
  {
    ApiResponse<List<String>> dataSourcesNamesResponse = routerApi.getDataSourcesNamesWithHttpInfo();
    List<String> dataSources = dataSourcesNamesResponse.getData();

    List<String> expectedDataSourcesNames = SwaggerSpecUtil.getDataSourcesNames();

    Assert.assertEquals(200, dataSourcesNamesResponse.getStatusCode());
    Assert.assertEquals(expectedDataSourcesNames, dataSources);
  }

  @Test
  public void testGetDataSource() throws ApiException
  {
    ApiResponse<DataSource> dataSourceResponse = routerApi.getDataSourceWithHttpInfo(
        "test_ds_1",
        "2015-01-01/2016-01-02",
        null
    );
    DataSource dataSource = dataSourceResponse.getData();

    DataSource expectedDataSource = SwaggerSpecUtil.getDataSource();

    Assert.assertEquals(200, dataSourceResponse.getStatusCode());
    Assert.assertEquals(expectedDataSource, dataSource);
  }

  @Test
  public void testGetDataSourceMetrics() throws ApiException
  {
    ApiResponse<List<String>> dataSourceResponse = routerApi.getDataSourceMetricsWithHttpInfo(
        "test_ds_1",
        "2015-01-01/2016-01-02"
    );
    List<String> metrics = dataSourceResponse.getData();

    List<String> expectedMetrics = SwaggerSpecUtil.getDataSourceMetrics();

    Assert.assertEquals(200, dataSourceResponse.getStatusCode());
    Assert.assertEquals(expectedMetrics, metrics);
  }

  @Test
  public void testGetDataSourceDimensions() throws ApiException
  {
    ApiResponse<List<String>> dataSourceResponse = routerApi.getDataSourceDimensionsWithHttpInfo(
        "test_ds_1",
        "2015-01-01/2016-01-02"
    );
    List<String> dimensions = dataSourceResponse.getData();

    List<String> expectedDimensions = SwaggerSpecUtil.getDimensions();

    Assert.assertEquals(200, dataSourceResponse.getStatusCode());
    Assert.assertEquals(expectedDimensions, dimensions);
  }
}
