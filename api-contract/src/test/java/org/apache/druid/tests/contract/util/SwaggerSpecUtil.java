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

package org.apache.druid.tests.contract.util;

import org.apache.druid.client.model.DataSource;
import org.apache.druid.client.model.ServerStatus;
import org.testcontainers.shaded.com.fasterxml.jackson.databind.ObjectMapper;

import java.io.File;
import java.io.IOException;
import java.util.List;

public class SwaggerSpecUtil
{
  private static final String EXAMPLES_PATH = "src/main/resources/schema/examples";

  private static final String GET_SERVER_STATUS = "get-server-status.json";
  private static final String GET_DATA_SOURCES_DIMENSIONS = "get-data-source-dimensions.json";
  private static final String GET_DATA_SOURCES_METRICS = "get-data-source-metrics.json";
  private static final String GET_DATA_SOURCES_NAMES = "get-data-sources-names.json";
  private static final String GET_DATA_SOURCE = "get-data-source.json";

  public static ServerStatus getExampleServerStatus()
  {
    return parseJsonValue(ServerStatus.class, GET_SERVER_STATUS);
  }

  public static List<String> getDataSourcesNames()
  {
    return parseJsonValues(String.class, GET_DATA_SOURCES_NAMES);
  }

  public static DataSource getDataSource()
  {
    return parseJsonValue(DataSource.class, GET_DATA_SOURCE);
  }

  public static List<String> getDataSourceMetrics()
  {
    return parseJsonValues(String.class, GET_DATA_SOURCES_METRICS);
  }

  public static List<String> getDimensions()
  {
    return parseJsonValues(String.class, GET_DATA_SOURCES_DIMENSIONS);
  }

  private static <T> T parseJsonValue(Class<T> clazz, String jsonFileName)
  {
    try {
      return new ObjectMapper().readValue(new File(EXAMPLES_PATH + File.separator + jsonFileName), clazz);
    }
    catch (IOException e) {
      throw new RuntimeException(e);
    }
  }

  private static <T> List<T> parseJsonValues(Class<T> clazz, String jsonFileName)
  {
    ObjectMapper objectMapper = new ObjectMapper();
    try {
      return objectMapper.readValue(
          new File(EXAMPLES_PATH + File.separator + jsonFileName),
          objectMapper.getTypeFactory().constructCollectionType(List.class, clazz)
      );
    }
    catch (IOException e) {
      throw new RuntimeException(e);
    }
  }
}
