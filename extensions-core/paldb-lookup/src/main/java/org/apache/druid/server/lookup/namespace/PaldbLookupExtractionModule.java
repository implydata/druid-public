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

import com.fasterxml.jackson.databind.Module;
import com.fasterxml.jackson.databind.module.SimpleModule;
import com.google.common.collect.ImmutableList;
import com.google.common.collect.ImmutableSet;
import com.google.inject.Binder;
import com.google.inject.Provider;
import org.apache.druid.guice.ExpressionModule;
import org.apache.druid.initialization.DruidModule;
import org.apache.druid.java.util.common.logger.Logger;
import org.apache.druid.query.lookup.PaldbLookupExtractorFactory;
import org.apache.druid.query.lookup.PaldbLookupIntExprMacro;
import org.apache.druid.query.lookup.PaldbLookupIntOperatorConversion;
import org.apache.druid.sql.guice.SqlBindings;

import java.util.List;

public class PaldbLookupExtractionModule implements DruidModule
{

  private static final Logger LOG = new Logger(PaldbLookupExtractionModule.class);

  @Override
  public List<? extends Module> getJacksonModules()
  {
    return ImmutableList.<Module>of(
        new SimpleModule("DruidNamespacedPaldbLookupExtractionModule")
            .registerSubtypes(PaldbLookupExtractorFactory.class)
    );
  }

  @Override
  public void configure(Binder binder)
  {
    SqlBindings.addOperatorConversion(binder, PaldbLookupIntOperatorConversion.class);
    binder.bind(DruidService.class).toProvider(DruidServiceImpl.class).asEagerSingleton();
    Provider<DruidServiceImpl> provider = binder.getProvider(DruidServiceImpl.class);
    DruidServiceImpl druidService = provider.get(); //
    LOG.info("druidServiceImpl [%s]", druidService);
    String name = druidService.get().getServiceName();
    if (isEnabled(name)) {
      ExpressionModule.addExprMacro(binder, PaldbLookupIntExprMacro.class);
    }
  }

  /*
  @Provides
  public DruidService getServiceName(Injector injector)
  {
    String serviceName;
    try {
      LOG.info("Registering service with [%s]", Key.get(String.class, Names.named("serviceName")));
      serviceName = injector.getInstance(Key.get(String.class, Names.named("serviceName")));
      LOG.info("servicename[%s]", serviceName);
      return new test(serviceName);
    }
    catch (Exception e) {
      LOG.error("Failed to register service");
      throw new RuntimeException(e);
      //return false;
    }
  } */

  private boolean isEnabled(String serviceName)
  {
    if (ImmutableSet.of("druid/broker", "druid/historical").contains(serviceName)) {
      return true;
    } else {
      return false;
    }
  }

}
