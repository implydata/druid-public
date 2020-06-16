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

import org.apache.druid.server.swagger.model.RestEndpoint;
import org.reflections.Reflections;
import org.reflections.util.ConfigurationBuilder;

import javax.ws.rs.DELETE;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.PUT;
import javax.ws.rs.Path;
import java.lang.reflect.Method;
import java.net.MalformedURLException;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;

public class ReflectionUtil
{

  public static Map<String, RestEndpoint> getBackendEndpoints(String path) throws MalformedURLException
  {
    Map<String, RestEndpoint> endpoints = new HashMap<>();

    Reflections reflections = new Reflections(new ConfigurationBuilder().addUrls(Paths.get(path).toUri().toURL()));

    Set<Class<?>> resourcesClasses = reflections.getTypesAnnotatedWith(Path.class);
    String endpointPath;

    for (Class<?> resourceClass : resourcesClasses) {
      if (!resourceClass.isAnnotationPresent(Path.class)) {
        continue;
      }

      Path basePath = resourceClass.getAnnotationsByType(Path.class)[0];
      for (Method declaredMethod : resourceClass.getDeclaredMethods()) {
        if (!isEndpointMethod(declaredMethod)) {
          continue;
        }
        endpointPath = getEndpointPath(basePath, declaredMethod);

        endpoints.put(endpointPath, new RestEndpoint(resourceClass, declaredMethod, endpointPath));
      }
    }

    return endpoints;
  }

  private static boolean isEndpointMethod(Method declaredMethod)
  {
    if (!declaredMethod.isAnnotationPresent(Path.class) ||
        declaredMethod.isAnnotationPresent(GET.class) ||
        declaredMethod.isAnnotationPresent(POST.class) ||
        declaredMethod.isAnnotationPresent(PUT.class) ||
        declaredMethod.isAnnotationPresent(DELETE.class)) {
      return true;
    }

    return false;
  }

  private static String getEndpointPath(Path basePath, Method declaredMethod)
  {
    if (!declaredMethod.isAnnotationPresent(Path.class)) {
      return basePath.value();
    }

    Path methodPath = declaredMethod.getAnnotation(Path.class);

    return basePath.value() + methodPath.value();
  }
}
