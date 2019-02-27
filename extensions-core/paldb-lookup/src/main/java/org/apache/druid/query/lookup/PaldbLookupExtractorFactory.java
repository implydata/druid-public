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

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonTypeName;
import com.google.common.base.Preconditions;
import com.linkedin.paldb.api.PalDB;
import com.linkedin.paldb.api.StoreReader;
import org.apache.druid.java.util.common.StringUtils;
import org.apache.druid.java.util.common.logger.Logger;

import javax.annotation.Nullable;
import java.io.File;
import java.nio.ByteBuffer;
import java.util.UUID;

@JsonTypeName("paldb")
public class PaldbLookupExtractorFactory implements LookupExtractorFactory
{
  private static final Logger LOG = new Logger(PaldbLookupExtractorFactory.class);

  private final String extractorID;
  @JsonProperty
  private final String filepath;
  @JsonProperty
  private final int index;
  private final LookupIntrospectHandler lookupIntrospectHandler;
  private final StoreReader reader;
  private static final byte[] CLASS_CACHE_KEY;

  static {
    final byte[] keyUtf8 = StringUtils.toUtf8(PaldbLookupExtractor.class.getCanonicalName());
    CLASS_CACHE_KEY = ByteBuffer.allocate(keyUtf8.length + 1).put(keyUtf8).put((byte) 0xFF).array();
  }

  @JsonCreator
  public PaldbLookupExtractorFactory(
      @JsonProperty("filepath") String filepath,
      @JsonProperty("index") int index
  )
  {
    this.filepath = Preconditions.checkNotNull(filepath, "filepath cannot be null");
    this.index = index;
    this.extractorID = StringUtils.format("paldb-factory-%s", UUID.randomUUID().toString());
    this.lookupIntrospectHandler = new PaldbLookupIntrospectHandler(this);
    //Configuration c = PalDB.newConfiguration();
    //c.set(Configuration.CACHE_ENABLED, "true");
    reader = PalDB.createReader(new File(filepath));
  }


  @JsonProperty
  public String getFilepath()
  {
    return filepath;
  }

  public int getIndex()
  {
    return index;
  }

  @Override
  public boolean start()
  {
    return true;
  }

  @Override
  public boolean close()
  {
    reader.close();
    return true;
  }

  @Override
  public boolean replaces(@Nullable LookupExtractorFactory other)
  {
    return !equals(other);
  }


  @Nullable
  @Override
  public LookupIntrospectHandler getIntrospectHandler()
  {
    return lookupIntrospectHandler;
  }

  @Override
  public LookupExtractor get()
  {
    return new PaldbLookupExtractor(reader, index)
    {
      @Override
      public byte[] getCacheKey()
      {
        final byte[] id = StringUtils.toUtf8(extractorID);
        return ByteBuffer
            .allocate(CLASS_CACHE_KEY.length + id.length + 1)
            .put(CLASS_CACHE_KEY)
            .put(id).put((byte) 0xFF)
            .array();
      }
    };
  }
}

