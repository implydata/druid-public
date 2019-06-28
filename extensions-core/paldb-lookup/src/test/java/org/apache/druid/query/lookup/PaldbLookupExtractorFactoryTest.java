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

package org.apache.druid.query.lookup;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.common.collect.ImmutableList;
import com.google.common.collect.ImmutableMap;
import com.google.inject.Guice;
import com.google.inject.Injector;
import com.linkedin.paldb.api.PalDB;
import com.linkedin.paldb.api.StoreWriter;
import org.apache.druid.jackson.DefaultObjectMapper;
import org.apache.druid.java.util.common.config.Config;
import org.apache.druid.query.DruidProcessingConfig;
import org.apache.druid.utils.JvmUtils;
import org.apache.druid.utils.RuntimeInfo;
import org.junit.AfterClass;
import org.junit.Assert;
import org.junit.BeforeClass;
import org.junit.Ignore;
import org.junit.Test;
import org.skife.config.ConfigurationObjectFactory;

import java.io.File;
import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.Properties;

public class PaldbLookupExtractorFactoryTest
{
  private static final ObjectMapper jsonMapper = new DefaultObjectMapper();
  LookupExtractorFactoryContainer container;

  private static final long bufferSize = 1024L * 1024L * 1024L;
  private static final int numProcessors = 4;
  private static final long directSize = bufferSize * (3L + 2L + 1L);
  private static final long heapSize = bufferSize * 2L;

  private static Injector makeInjector(int numProcessors, long directMemorySize, long heapSize)
  {
    return makeInjector(numProcessors, directMemorySize, heapSize, new Properties(), null);
  }

  private static Injector makeInjector(
      int numProcessors,
      long directMemorySize,
      long heapSize,
      Properties props,
      Map<String, String> replacements
  )
  {
    return Guice.createInjector(
        binder -> {
          binder.bind(RuntimeInfo.class).toInstance(new MockRuntimeInfo(numProcessors, directMemorySize, heapSize));
          binder.requestStaticInjection(JvmUtils.class);
          ConfigurationObjectFactory factory = Config.createFactory(props);
          DruidProcessingConfig config;
          if (replacements != null) {
            config = factory.buildWithReplacements(
                DruidProcessingConfig.class,
                replacements
            );
          } else {
            config = factory.build(DruidProcessingConfig.class);
          }
          binder.bind(ConfigurationObjectFactory.class).toInstance(factory);
          binder.bind(DruidProcessingConfig.class).toInstance(config);
        }
    );
  }

  @BeforeClass
  public static void setUpClass()
  {
    StoreWriter writer = PalDB.createWriter(new File("store.paldb"));
    writer.put("foo", new String[]{"bar"});
    writer.put("foo1", new String[]{"baz"});
    writer.put("bat", new String[]{"abc", "xyz"});
    writer.close();
    jsonMapper.registerSubtypes(PaldbLookupExtractorFactory.class);
  }

  @AfterClass
  public static void tearDownClass()
  {
    File file = new File("store.paldb");
    file.delete();
  }

  @Test
  public void testSimpleStartStopStop()
  {
    Injector injector = makeInjector(numProcessors, directSize, heapSize);
    DruidProcessingConfig config = injector.getInstance(DruidProcessingConfig.class);
    final LookupExtractorFactory lookupFactory = new PaldbLookupExtractorFactory("store.paldb", 0, config);
    Assert.assertTrue(lookupFactory.start());
    Assert.assertTrue(lookupFactory.close());
    Assert.assertTrue(lookupFactory.close());
  }

  @Ignore
  @Test
  public void testIntrospectionHandler() throws Exception
  {
    final String str = "{ \"type\": \"paldb\", \"filepath\": \"store.paldb\" }";
    final LookupExtractorFactory lookupExtractorFactory = jsonMapper.readValue(str, LookupExtractorFactory.class);
    Assert.assertTrue(lookupExtractorFactory.start());
    try {
      final LookupIntrospectHandler handler = lookupExtractorFactory.getIntrospectHandler();
      Assert.assertNotNull(handler);
      final Class<? extends LookupIntrospectHandler> clazz = handler.getClass();
      Assert.assertNotNull(clazz.getMethod("getVersion").invoke(handler));
      //Assert.assertEquals(ImmutableSet.of("foo"), ((Response) clazz.getMethod("getKeys").invoke(handler)).getEntity());
    }
    finally {
      Assert.assertTrue(lookupExtractorFactory.close());
    }
  }

  @Test
  public void testGetKey()
  {
    Injector injector = makeInjector(numProcessors, directSize, heapSize);
    DruidProcessingConfig config = injector.getInstance(DruidProcessingConfig.class);
    final LookupExtractorFactory lookupExtractorFactory = new PaldbLookupExtractorFactory(
        "store.paldb",
        0,
        config
    );
    Assert.assertTrue(lookupExtractorFactory.start());
    LookupExtractor lookupExtractor = lookupExtractorFactory.get();
    String val = lookupExtractor.apply("foo");
    Assert.assertEquals("bar", val);
    Assert.assertTrue(lookupExtractorFactory.close());
  }

  @Test
  public void testGetBulk()
  {
    Injector injector = makeInjector(numProcessors, directSize, heapSize);
    DruidProcessingConfig config = injector.getInstance(DruidProcessingConfig.class);
    final LookupExtractorFactory lookupExtractorFactory = new PaldbLookupExtractorFactory(
        "store.paldb",
        0,
        config
    );
    Assert.assertTrue(lookupExtractorFactory.start());
    LookupExtractor lookupExtractor = lookupExtractorFactory.get();
    List<String> keys = ImmutableList.of("foo", "foo1");
    Map<String, String> values = lookupExtractor.applyAll(keys);
    Map<String, String> map = ImmutableMap.of("foo", "bar", "foo1", "baz");
    Assert.assertEquals(map, values);
    Assert.assertTrue(lookupExtractorFactory.close());
  }

  @Test
  public void testArrayValues()
  {
    Injector injector = makeInjector(numProcessors, directSize, heapSize);
    DruidProcessingConfig config = injector.getInstance(DruidProcessingConfig.class);
    final LookupExtractorFactory factory = new PaldbLookupExtractorFactory("store.paldb", 0, config);
    Assert.assertTrue(factory instanceof PaldbLookupExtractorFactory);
    Assert.assertTrue(factory.start());
    LookupExtractor lookupExtractor = factory.get();
    List<String> keys = ImmutableList.of("bat");
    Map<String, String> values = lookupExtractor.applyAll(keys);
    Map<String, String> map = ImmutableMap.of("bat", "abc");
    Assert.assertEquals(map, values);
  }

  @Test
  public void testConfig() throws IOException
  {
    Injector injector = makeInjector(numProcessors, directSize, heapSize);
    DruidProcessingConfig config = injector.getInstance(DruidProcessingConfig.class);
    final LookupExtractorFactory factory = new PaldbLookupExtractorFactory("store.paldb", 0, config);
    container = new LookupExtractorFactoryContainer("v0", factory);
    Assert.assertTrue(factory instanceof PaldbLookupExtractorFactory);
    final PaldbLookupExtractorFactory lookupFactory = (PaldbLookupExtractorFactory) factory;
    System.out.println(jsonMapper.writeValueAsString(factory));
    Assert.assertNotNull(jsonMapper.writeValueAsString(factory));
    Assert.assertEquals("store.paldb", lookupFactory.getFilepath());
  }

  static class MockRuntimeInfo extends RuntimeInfo
  {
    private final int availableProcessors;
    private final long maxHeapSize;
    private final long directSize;

    MockRuntimeInfo(int availableProcessors, long directSize, long maxHeapSize)
    {
      this.availableProcessors = availableProcessors;
      this.directSize = directSize;
      this.maxHeapSize = maxHeapSize;
    }

    @Override
    public int getAvailableProcessors()
    {
      return availableProcessors;
    }

    @Override
    public long getMaxHeapSizeBytes()
    {
      return maxHeapSize;
    }

    @Override
    public long getDirectMemorySizeBytes()
    {
      return directSize;
    }
  }

}


