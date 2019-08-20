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

import com.google.common.base.Supplier;
import com.linkedin.paldb.api.PalDB;
import com.linkedin.paldb.api.StoreReader;
import org.apache.druid.java.util.common.logger.Logger;

import java.io.File;

public class StoreReaderGenerator implements Supplier<StoreReader>
{
  private static final Logger log = new Logger(StoreReaderGenerator.class);
  private final String filepath;

  public StoreReaderGenerator(String path)
  {
    this.filepath = path;
  }

  @Override
  public StoreReader get()
  {
    log.info("Allocating new store reader object for file %s", filepath);
    final File file = new File(filepath);
    if (!file.exists()) {
      throw new RuntimeException("File " + file + " not found");
    }
    if (file.isDirectory()) {
      throw new RuntimeException(("Expected paldb file, but found a directory at " + filepath));
    }
    return PalDB.createReader(new File(filepath));
  }
}
