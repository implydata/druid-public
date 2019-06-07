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

import com.linkedin.paldb.api.StoreReader;
import org.apache.druid.collections.ReferenceCountingResourceHolder;
import org.apache.druid.collections.StoreReaderPool;
import org.apache.druid.common.config.NullHandling;
import org.apache.druid.java.util.common.logger.Logger;

import javax.annotation.Nullable;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Map;

public class PaldbLookupExtractor extends LookupExtractor
{
  private static final Logger LOG = new Logger(PaldbLookupExtractor.class);

  private final StoreReaderPool readerPool;
  private final int index;

  public PaldbLookupExtractor(
      StoreReaderPool readerPool,
      int index
  )
  {
    this.readerPool = readerPool;
    this.index = index;
  }

  @Nullable
  @Override
  public String apply(@Nullable String key)
  {
    String keyEquivalent = NullHandling.nullToEmptyIfNeeded(key);
    if (keyEquivalent == null) {
      return null;
    }
    final String[] arr;
    try (final ReferenceCountingResourceHolder<StoreReader> reader = readerPool.take()) {
      arr = reader.get().get(keyEquivalent);
    }
    if (arr == null) {
      LOG.debug("value array is null for key  " + keyEquivalent);
      return null;
    }
    int len = arr.length;
    if (index >= len) {
      throw new ArrayIndexOutOfBoundsException("passed index ["
                                               + index
                                               + "] is greater than or equal to array length ["
                                               + len
                                               + "] for key ["
                                               + keyEquivalent
                                               + "]");
    }
    final String str = arr[index];
    return NullHandling.emptyToNullIfNeeded(str);
  }

  @Override
  public List<String> unapply(@Nullable String value)
  {
    String valueToLookup = NullHandling.nullToEmptyIfNeeded(value);
    if (valueToLookup == null) {
      return Collections.emptyList();
    }
    final List<String> keys = new ArrayList<>();
    try (final ReferenceCountingResourceHolder<StoreReader> reader = readerPool.take()) {
      Iterable<Map.Entry<String, String[]>> list = reader.get().iterable();
      for (Map.Entry<String, String[]> entry : list) {
        String[] val = entry.getValue();
        if (Arrays.asList(val).contains(valueToLookup)) {
          keys.add(entry.getKey());
        }
      }
    }
    return keys;
  }

  @Override
  public byte[] getCacheKey()
  {
    return new byte[0];
  }

}
