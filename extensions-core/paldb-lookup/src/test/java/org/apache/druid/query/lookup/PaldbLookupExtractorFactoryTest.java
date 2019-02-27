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
import com.linkedin.paldb.api.PalDB;
import com.linkedin.paldb.api.StoreWriter;
import org.apache.druid.jackson.DefaultObjectMapper;
import org.junit.AfterClass;
import org.junit.Assert;
import org.junit.BeforeClass;
import org.junit.Test;

import java.io.File;
import java.io.IOException;
import java.util.List;
import java.util.Map;

public class PaldbLookupExtractorFactoryTest
{

  private static final ObjectMapper jsonMapper = new DefaultObjectMapper();
  LookupExtractorFactoryContainer container;

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
  public void testSerde() throws IOException
  {

    final String str = "{ \"type\": \"paldb\", \"filepath\": \"store.paldb\" }";
    final LookupExtractorFactory factory = jsonMapper.readValue(str, LookupExtractorFactory.class);
    Assert.assertTrue(factory instanceof PaldbLookupExtractorFactory);
    final PaldbLookupExtractorFactory lookupFactory = (PaldbLookupExtractorFactory) factory;
    Assert.assertNotNull(jsonMapper.writeValueAsString(factory));
    Assert.assertEquals("store.paldb", lookupFactory.getFilepath());
  }

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
  public void testGetKey() throws IOException
  {
    final String str = "{ \"type\": \"paldb\", \"filepath\": \"store.paldb\" }";
    final LookupExtractorFactory lookupExtractorFactory = jsonMapper.readValue(str, LookupExtractorFactory.class);
    LookupExtractor lookupExtractor = lookupExtractorFactory.get();
    String val = lookupExtractor.apply("foo");
    Assert.assertEquals("bar", val);
  }

  @Test
  public void testGetBulk() throws IOException
  {
    final String str = "{ \"type\": \"paldb\", \"filepath\": \"store.paldb\" }";
    final LookupExtractorFactory lookupExtractorFactory = jsonMapper.readValue(str, LookupExtractorFactory.class);
    LookupExtractor lookupExtractor = lookupExtractorFactory.get();
    List<String> keys = ImmutableList.of("foo", "foo1");
    Map<String, String> values = lookupExtractor.applyAll(keys);
    Map<String, String> map = ImmutableMap.of("foo", "bar", "foo1", "baz");
    Assert.assertEquals(map, values);
  }

  @Test
  public void testArrayValues()
  {
    final LookupExtractorFactory factory = new PaldbLookupExtractorFactory("store.paldb", 1);
    Assert.assertTrue(factory instanceof PaldbLookupExtractorFactory);
    LookupExtractor lookupExtractor = factory.get();
    List<String> keys = ImmutableList.of("bat");
    Map<String, String> values = lookupExtractor.applyAll(keys);
    Map<String, String> map = ImmutableMap.of("bat", "xyz");
    Assert.assertEquals(map, values);
  }

  @Test
  public void testConfig() throws IOException
  {
    final LookupExtractorFactory factory = new PaldbLookupExtractorFactory("store.paldb", 0);
    container = new LookupExtractorFactoryContainer("v0", factory);
    Assert.assertTrue(factory instanceof PaldbLookupExtractorFactory);
    final PaldbLookupExtractorFactory lookupFactory = (PaldbLookupExtractorFactory) factory;
    Assert.assertNotNull(jsonMapper.writeValueAsString(factory));
    Assert.assertEquals("store.paldb", lookupFactory.getFilepath());
  }

}


