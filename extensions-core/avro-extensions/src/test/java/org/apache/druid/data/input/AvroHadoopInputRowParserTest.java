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

package org.apache.druid.data.input;

import com.fasterxml.jackson.databind.Module;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.avro.generic.GenericRecord;
import org.apache.druid.data.input.avro.AvroExtensionsModule;
import org.junit.Before;
import org.junit.Test;

import java.io.IOException;

import static org.apache.druid.data.input.AvroStreamInputRowParserTest.DIMENSIONS;
import static org.apache.druid.data.input.AvroStreamInputRowParserTest.PARSE_SPEC;
import static org.apache.druid.data.input.AvroStreamInputRowParserTest.assertInputRowCorrect;
import static org.apache.druid.data.input.AvroStreamInputRowParserTest.buildSomeAvroDatum;

public class AvroHadoopInputRowParserTest
{
  private final ObjectMapper jsonMapper = new ObjectMapper();

  @Before
  public void setUp()
  {
    for (Module jacksonModule : new AvroExtensionsModule().getJacksonModules()) {
      jsonMapper.registerModule(jacksonModule);
    }
  }

  @Test
  public void testParse() throws IOException
  {
    final GenericRecord record = buildSomeAvroDatum();
    AvroHadoopInputRowParser parser = new AvroHadoopInputRowParser(PARSE_SPEC);
    AvroHadoopInputRowParser parser2 = jsonMapper.readValue(
        jsonMapper.writeValueAsBytes(parser),
        AvroHadoopInputRowParser.class
    );
    InputRow inputRow = parser2.parseBatch(record).get(0);
    assertInputRowCorrect(inputRow, DIMENSIONS);
  }
}
