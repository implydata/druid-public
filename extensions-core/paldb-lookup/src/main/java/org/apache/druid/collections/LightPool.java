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

package org.apache.druid.collections;

import com.google.common.base.Supplier;
import org.apache.druid.java.util.common.logger.Logger;

import java.io.Closeable;
import java.io.IOException;
import java.util.Queue;
import java.util.concurrent.ConcurrentLinkedQueue;

public class LightPool<T> implements Closeable
{
  private static final Logger log = new Logger(LightPool.class);

  private final Supplier<T> generator;
  private final Queue<T> objects = new ConcurrentLinkedQueue<>();

  public LightPool(Supplier<T> generator)
  {
    this.generator = generator;
  }

  public T take()
  {
    T object;

    if ((object = objects.poll()) == null) {
      object = generator.get();
    }

    return object;
  }

  public void giveBack(final T object)
  {
    objects.add(object);
  }

  @Override
  public void close()
  {
    T object;
    while ((object = objects.poll()) != null) {
      if (object instanceof Closeable) {
        try {
          ((Closeable) object).close();
        }
        catch (IOException e) {
          log.warn("Could not close pooled object: [%s]", object);
        }
      }
    }
  }
}
