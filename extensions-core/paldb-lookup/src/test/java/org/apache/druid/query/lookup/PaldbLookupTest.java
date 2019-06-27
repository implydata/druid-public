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

import com.linkedin.paldb.api.PalDB;
import com.linkedin.paldb.api.StoreReader;
import com.linkedin.paldb.api.StoreWriter;
import org.apache.druid.collections.LightPool;
import org.junit.AfterClass;
import org.junit.Assert;
import org.junit.BeforeClass;
import org.junit.Test;

import java.io.File;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

public class PaldbLookupTest
{
  static PaldbLookupExtractor paldbLookup;

  @BeforeClass
  public static void setUpClass()
  {
    StoreWriter writer = PalDB.createWriter(new File("store.paldb"));
    long longKey1 = ((long) 16 << 32) | (long) 0;
    long longKey2 = ((long) 32 << 32) | (long) 1;
    long longKey3 = ((long) 48 << 32) | (long) 2;
    writer.put(longKey1, "foo");
    writer.put(longKey2, "bar");
    writer.put(longKey3, 5000);
    writer.close();
    LightPool<StoreReader> readerPool = new LightPool<>(new StoreReaderGenerator("store.paldb"));
    paldbLookup = new PaldbLookupExtractor(readerPool, 0, "string");
  }

  @AfterClass
  public static void tearDownClass()
  {
    File file = new File("store.paldb");
    file.delete();
  }

  @Test
  public void testApply() throws ExecutionException, InterruptedException
  {
    int key = 16;
    Callable<String> task = () -> paldbLookup.apply(String.valueOf(key));

    ExecutorService exec = Executors.newFixedThreadPool(5);
    List<Future<String>> results = new ArrayList<>();

    for (int i = 0; i < 100; i++) {
      results.add(exec.submit(task));
    }
    exec.shutdown();

    for (Future<String> result : results) {
      Assert.assertEquals("foo", result.get());
    }
  }

  @Test
  public void testUnApply() throws ExecutionException, InterruptedException
  {
    Callable<List<String>> task = () -> paldbLookup.unapply("foo");
    ExecutorService exec = Executors.newFixedThreadPool(5);
    List<Future<List<String>>> results = new ArrayList<>();

    for (int i = 0; i < 100; i++) {
      results.add(exec.submit(task));
    }
    exec.shutdown();
    List<String> list = new ArrayList<>();
    list.add("16");
    for (Future<List<String>> result : results) {
      Assert.assertEquals(list, result.get());
    }
  }

}
