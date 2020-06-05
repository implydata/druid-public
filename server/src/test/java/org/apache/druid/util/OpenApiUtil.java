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

package org.apache.druid.util;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.PathItem;
import io.swagger.v3.parser.OpenAPIV3Parser;
import org.apache.commons.io.FileUtils;

import java.io.File;
import java.io.IOException;

public class OpenApiUtil
{
  public static OpenAPI getSpecificationYml(String swaggerYamlPath) throws IOException
  {
    File file = new File(swaggerYamlPath);
    String specYaml = FileUtils.readFileToString(file, "UTF-8");

    OpenAPI openApi = new OpenAPIV3Parser().readContents(specYaml).getOpenAPI();

    return openApi;
  }

  public static boolean isApiEndpointExists(OpenAPI openAPI, String path)
  {
    PathItem pathItem = openAPI.getPaths().get(path);

    if (pathItem == null) {
      return false;
    }

    return true;
  }
}
