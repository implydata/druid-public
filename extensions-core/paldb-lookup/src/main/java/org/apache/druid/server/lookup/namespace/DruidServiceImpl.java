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

package org.apache.druid.server.lookup.namespace;

import com.google.inject.Inject;
import com.google.inject.Injector;
import com.google.inject.Key;
import com.google.inject.Provider;
import com.google.inject.name.Names;
import org.apache.druid.java.util.common.logger.Logger;

public class DruidServiceImpl implements Provider<DruidService>
{

  private static final Logger LOG = new Logger(DruidServiceImpl.class);
  final Injector injector;

  @Inject
  public DruidServiceImpl(Injector injector)
  {
    this.injector = injector;
  }

  @Override
  public DruidService get()
  {
    String serviceName;
    try {
      serviceName = injector.getInstance(Key.get(String.class, Names.named("serviceName")));
      LOG.info("service[%s] registered", serviceName);
      return new DruidServiceType(serviceName);
    }
    catch (Exception e) {
      LOG.error("Failed to register service");
      throw new RuntimeException(e);
      //return false;
    }
  }

  class DruidServiceType implements DruidService
  {
    final String str;

    public DruidServiceType(String s)
    {
      this.str = s;
    }

    @Override
    public String getServiceName()
    {
      return str;
    }
  }
}
