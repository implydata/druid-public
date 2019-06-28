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

import com.fasterxml.jackson.annotation.JacksonInject;
import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonTypeName;
import com.google.common.base.Preconditions;
import com.google.common.base.Throwables;
import com.linkedin.paldb.api.StoreReader;
import org.apache.druid.collections.LightPool;
import org.apache.druid.java.util.common.StringUtils;
import org.apache.druid.java.util.common.logger.Logger;
import org.apache.druid.query.DruidProcessingConfig;

import javax.annotation.Nullable;
import java.nio.ByteBuffer;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.locks.Lock;
import java.util.concurrent.locks.ReadWriteLock;
import java.util.concurrent.locks.ReentrantReadWriteLock;

@JsonTypeName("paldb")
public class PaldbLookupExtractorFactory implements LookupExtractorFactory
{
  private static final Logger LOG = new Logger(PaldbLookupExtractorFactory.class);

  private final String extractorID;
  @JsonProperty
  private final String filepath;
  @JsonProperty
  private final int index;
  private LightPool<StoreReader> readerPool;
  private final ReadWriteLock startStopSync = new ReentrantReadWriteLock();
  private final AtomicBoolean started = new AtomicBoolean(false);
  private final DruidProcessingConfig processingConfig;

  private static final byte[] CLASS_CACHE_KEY;

  static {
    final byte[] keyUtf8 = StringUtils.toUtf8(PaldbLookupExtractor.class.getCanonicalName());
    CLASS_CACHE_KEY = ByteBuffer.allocate(keyUtf8.length + 1).put(keyUtf8).put((byte) 0xFF).array();
  }

  @JsonCreator
  public PaldbLookupExtractorFactory(
      @JsonProperty("filepath") String filepath,
      @JsonProperty("index") int index,
      @JacksonInject DruidProcessingConfig processingConfig
  )
  {
    this.filepath = Preconditions.checkNotNull(filepath);
    this.index = index;
    this.extractorID = StringUtils.format("paldb-factory-%s", UUID.randomUUID().toString());
    this.processingConfig = processingConfig;
    //this.lookupIntrospectHandler = new PaldbLookupIntrospectHandler(this);
    //Configuration c = PalDB.newConfiguration();
    //c.set(Configuration.CACHE_ENABLED, "true");
  }


  @JsonProperty
  public String getFilepath()
  {
    return filepath;
  }

  @JsonProperty
  public int getIndex()
  {
    return index;
  }

  @Override
  public boolean start()
  {
    final Lock writeLock = startStopSync.writeLock();
    try {
      writeLock.lockInterruptibly();
      try {
        if (!started.get()) {
          LOG.info("starting paldb lookup");
          readerPool = new LightPool<>(new StoreReaderGenerator(filepath));
          started.set(true);
        }
        return started.get();
      }
      finally {
        writeLock.unlock();
      }
    }
    catch (InterruptedException e) {
      throw Throwables.propagate(e);
    }
  }

  @Override
  public boolean close()
  {
    final Lock writeLock = startStopSync.writeLock();
    try {
      writeLock.lockInterruptibly();
      try {
        if (started.getAndSet(false)) {
          LOG.info("closing paldb lookup");
          if (readerPool != null) {
            readerPool.close();
          }
        }
        return !started.get();
      }
      finally {
        writeLock.unlock();
      }
    }
    catch (InterruptedException e) {
      throw Throwables.propagate(e);
    }
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
    throw new UnsupportedOperationException();
  }

  @Override
  public LookupExtractor get()
  {
    final Lock readLock = startStopSync.readLock();
    try {
      readLock.lockInterruptibly();
    }
    catch (InterruptedException e) {
      throw Throwables.propagate(e);
    }
    try {
      return new PaldbLookupExtractor(readerPool, index)
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
    finally {
      readLock.unlock();
    }
  }
}

