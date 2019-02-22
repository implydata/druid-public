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

package org.apache.druid.query.movingaverage.averagers;

import com.google.common.collect.ImmutableMap;
import org.junit.Assert;
import org.junit.Test;

public class CumulativeLongSumAveragerTest
{
  @Test
  public void test1()
  {
    final CumulativeLongSumAverager averager = new CumulativeLongSumAverager("testName", "testField");

    averager.addElement(ImmutableMap.of("testField", 1L), ImmutableMap.of());
    Assert.assertEquals(1L, averager.computeResult().longValue());

    averager.addElement(ImmutableMap.of("testField", 3L), ImmutableMap.of());
    Assert.assertEquals(4L, averager.computeResult().longValue());

    averager.addElement(ImmutableMap.of("testField", 5L), ImmutableMap.of());
    Assert.assertEquals(9L, averager.computeResult().longValue());

    averager.addElement(ImmutableMap.of("testField", 1L), ImmutableMap.of());
    Assert.assertEquals(10L, averager.computeResult().longValue());
  }

  @Test
  public void test2()
  {
    final CumulativeLongSumAverager averager = new CumulativeLongSumAverager("testName", "testField");

    averager.addElement(ImmutableMap.of("testField", 1L), ImmutableMap.of());
    Assert.assertEquals(1L, averager.computeResult().longValue());

    averager.addElement(ImmutableMap.of("testField", -3L), ImmutableMap.of());
    Assert.assertEquals(-2L, averager.computeResult().longValue());

    averager.addElement(ImmutableMap.of("testField", 5L), ImmutableMap.of());
    Assert.assertEquals(3L, averager.computeResult().longValue());

    averager.addElement(ImmutableMap.of("testField", 1L), ImmutableMap.of());
    Assert.assertEquals(4L, averager.computeResult().longValue());
  }
}
