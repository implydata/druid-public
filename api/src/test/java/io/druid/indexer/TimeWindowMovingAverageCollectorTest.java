/*
 * Licensed to Metamarkets Group Inc. (Metamarkets) under one
 * or more contributor license agreements. See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership. Metamarkets licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License. You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

package io.druid.indexer;

import com.google.common.collect.ImmutableMap;
import org.junit.Assert;
import org.junit.Test;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

public class TimeWindowMovingAverageCollectorTest
{
  @Test
  public void testCollection() throws Exception
  {
    final TimeWindowMovingAverageCollector collector = new TimeWindowMovingAverageCollector(
        1,
        10,
        new TaskMetricsGetter()
        {
          final List<String> keys = Arrays.asList("a", "b", "c");
          int counter;

          @Override
          public List<String> getKeys()
          {
            return keys;
          }

          @Override
          public Map<String, Double> getMetrics()
          {
            synchronized (this) {
              if (counter > 20) {
                return TimeWindowMovingAverageCollector.STOP_SIGNAL;
              }

              Map<String, Double> ret = ImmutableMap.of(
                  "a", (double) counter,
                  "b", (double) (counter * 2),
                  "c", (double) (counter * 3)
              );
              counter += 1;
              return ret;
            }
          }
        }
    );

    collector.start();

    while (collector.getStopTime() == null) {
      Thread.sleep(1000);
    }

    Assert.assertEquals(1, collector.getWindowSizeMillis());
    Assert.assertEquals(10, collector.getTotalNumWindows());

    Map<String, Double> averages = collector.getAverages(1);
    Assert.assertEquals(
        ImmutableMap.of(
            "a", 20.0d,
            "b", 40.0d,
            "c", 60.0d
        ),
        averages
    );

    averages = collector.getAverages(5);
    Assert.assertEquals(
        ImmutableMap.of(
            "a", 18.0d,
            "b", 36.0d,
            "c", 54.0d
        ),
        averages
    );

    averages = collector.getAverages(10);
    Assert.assertEquals(
        ImmutableMap.of(
            "a", 15.5d,
            "b", 31.0d,
            "c", 46.5d
        ),
        averages
    );
  }
}
