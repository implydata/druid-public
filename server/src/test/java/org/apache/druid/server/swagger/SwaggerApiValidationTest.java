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

package org.apache.druid.server.swagger;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.Paths;
import org.apache.druid.java.util.common.logger.Logger;
import org.apache.druid.server.swagger.model.RestEndpoint;
import org.apache.druid.util.OpenApiUtil;
import org.apache.druid.util.ReflectionUtil;
import org.junit.Assert;
import org.junit.Before;
import org.junit.Test;

import java.io.IOException;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

public class SwaggerApiValidationTest
{

  private static final Logger log = new Logger(SwaggerApiValidationTest.class);

  private Map<String, RestEndpoint> restEndpoints;
  private OpenAPI openAPI;

  @Before
  public void init() throws IOException
  {
    restEndpoints = ReflectionUtil.getBackendEndpoints("./target/classes");
    excludeTodoPaths(restEndpoints);
    openAPI = OpenApiUtil.getSpecificationYml("./../api-contract/src/main/resources/schema/druid-api.yml");
  }

  @Test
  public void verifyRestAPIPathsCoveredByOpenApiYaml()
  {
    for (RestEndpoint restEndpoint : restEndpoints.values()) {
      if (!OpenApiUtil.isApiEndpointExists(openAPI, restEndpoint.getPath())) {
        Assert.fail("Open api error. Missed endpoint in druid-api.yml: " + restEndpoint.getPath());
      }
    }
  }

  @Test
  public void verifyOpenApiYamlContainsOnlyDruidRestEnpoints()
  {
    Paths paths = openAPI.getPaths();

    for (String path : paths.keySet()) {
      if (restEndpoints.get(path) == null) {
        Assert.fail("Open api error. Server doesn't have endpoint for path: " + path);
      }
    }
  }

  private void excludeTodoPaths(Map<String, RestEndpoint> restEndpoints)
  {
    // TODO: 6/4/20  remove exlude paths when they will be covered by openapi yaml
    List<String> todoExludePaths = Arrays.asList(
        "/druid/coordinator/v1/cluster",
        "/druid/broker/v1/readiness",
        "/druid-internal/v1/httpServerInventoryView",
        "/druid/coordinator/v1/servers/{serverName}",
        "/druid/coordinator/v1/tiers",
        "/druid/coordinator/v1/metadata/datasources/{dataSourceName}/segments",
        "/druid/listen/v1/lookups",
        "/druid/v2//candidates",
        "/druid/coordinator/v1/loadqueue",
        "/druid/coordinator/v1/lookups/status",
        "/druid/coordinator/v1/lookups",
        "/druid/historical/v1/loadstatus",
        "/status/health",
        "/druid/coordinator/v1/config/compaction",
        "/druid/coordinator/v1/datasources/{dataSourceName}/intervals/{interval}",
        "/druid/coordinator/v1/lookups/nodeStatus",
        "/druid/coordinator/v1/datasources/{dataSourceName}/handoffComplete",
        "/druid/v2/",
        "/druid/broker/v1",
        "/druid/coordinator/v1",
        "/druid/worker/v1/chat",
        "/druid/v1/lookups/introspect",
        "/druid/historical/v1",
        "/druid/coordinator/v1/datasources/{dataSourceName}/intervals",
        "/druid/coordinator/v1/intervals/{interval}",
        "/druid/coordinator/v1/config/history",
        "/druid/coordinator/v1/lookups/config/all",
        "/druid/coordinator/v1/datasources/{dataSourceName}/markUsed",
        "/druid/coordinator/v1/loadstatus",
        "/druid/coordinator/v1/lookups/nodeStatus/{tier}",
        "/druid/coordinator/v1/datasources/{dataSourceName}/intervals/{interval}/serverview",
        "/druid/historical/v1/readiness",
        "/druid/coordinator/v1/lookups/config",
        "/druid/coordinator/v1/intervals",
        "/druid/broker/v1/loadstatus",
        "/druid/v2/{id}",
        "/druid/coordinator/v1/metadata",
        "/druid/coordinator/v1/datasources/{dataSourceName}/tiers",
        "/druid/coordinator/v1/servers/{serverName}/segments",
        "/druid/coordinator/v1/tiers/{tierName}",
        "/druid/coordinator/v1/datasources/{dataSourceName}/markUnused",
        "/druid/coordinator/v1/lookups/config/{tier}/{lookup}",
        "/status/selfDiscovered",
        "/druid/coordinator/v1/rules",
        "/druid/coordinator/v1/lookups/config/{tier}",
        "/druid-internal/v1/segments/",
        "/druid/coordinator/v1/metadata/datasources",
        "/druid/coordinator/v1/lookups/nodeStatus/{tier}/{hostAndPort}",
        "/druid/coordinator/v1/config",
        "/druid/coordinator/v1/rules/{dataSourceName}",
        "/druid-internal/v1/segments//changeRequests",
        "/druid/coordinator/v1/datasources",
        "/druid/coordinator/v1/config/compaction/taskslots",
        "/druid/coordinator/v1/lookups/status/{tier}/{lookup}",
        "/druid/coordinator/v1/servers",
        "/druid/router/v1/brokers",
        "/druid/coordinator/v1/cluster/{nodeRole}",
        "/druid/coordinator/v1/metadata/datasources/{dataSourceName}",
        "/druid/coordinator/v1/rules/history",
        "/druid/coordinator/v1/leader",
        "/status/selfDiscovered/status",
        "/status/properties",
        "/druid/coordinator/v1/metadata/datasources/{dataSourceName}/segments/{segmentId}",
        "/druid/coordinator/v1/servers/{serverName}/segments/{segmentId}",
        "/druid/coordinator/v1/datasources/{dataSourceName}/segments/{segmentId}",
        "/druid/coordinator/v1/lookups/status/{tier}",
        "/druid/coordinator/v1/config/compaction/{dataSource}",
        "/druid/coordinator/v1/rules/{dataSourceName}/history",
        "/druid/coordinator/v1/isLeader",
        "/druid/router/v1",
        "/druid/coordinator/v1/datasources/{dataSourceName}/segments",
        "/druid/coordinator/v1/metadata/segments",
        "/druid/coordinator/v1/remainingSegmentSizeForCompaction",
        "/druid/coordinator/v1/datasources/{dataSourceName}"
    );

    todoExludePaths.forEach(restEndpoints::remove);
  }
}
