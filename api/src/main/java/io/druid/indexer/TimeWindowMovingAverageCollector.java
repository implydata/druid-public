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

import com.google.common.collect.Maps;
import io.druid.java.util.common.DateTimes;
import io.druid.java.util.common.concurrent.Execs;
import io.druid.java.util.common.concurrent.ScheduledExecutors;
import io.druid.utils.CircularBuffer;
import org.joda.time.DateTime;
import org.joda.time.Duration;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ScheduledExecutorService;

public class TimeWindowMovingAverageCollector
{
  public static final Map<String, Double> STOP_SIGNAL = Maps.newHashMap();

  private long windowSizeMillis; // milliseconds
  private int totalNumWindows;
  private CircularBuffer<Map<String, Double>> statsBuffer;
  private ScheduledExecutorService scheduledExecutorService;
  private DateTime startTime;
  private DateTime stopTime;
  private TaskMetricsGetter metricsGetter;

  public TimeWindowMovingAverageCollector(
      long windowSizeMillis,
      int totalNumWindows,
      TaskMetricsGetter metricsGetter
  )
  {
    this.windowSizeMillis = windowSizeMillis;
    this.totalNumWindows = totalNumWindows;
    this.metricsGetter = metricsGetter;
    this.statsBuffer = new CircularBuffer<>(totalNumWindows);
    this.scheduledExecutorService = Execs.scheduledSingleThreaded("TimeWindowMovingAverageCollector-Exec--%d");
  }

  public void start()
  {
    ScheduledExecutors.scheduleWithFixedDelay(
        scheduledExecutorService,
        new Duration(windowSizeMillis),
        new Duration(windowSizeMillis),
        new Runnable()
        {
          @Override
          @SuppressWarnings("ObjectEquality")
          public void run()
          {
            if (stopTime != null) {
              return;
            }
            Map<String, Double> metrics = metricsGetter.getMetrics();
            if (metrics == STOP_SIGNAL) {
              stop();
            } else {
              statsBuffer.add(metrics);
            }
          }
        }
    );
    startTime = DateTimes.nowUtc();
  }

  public void stop()
  {
    stopTime = DateTimes.nowUtc();
    scheduledExecutorService.shutdown();
  }

  public DateTime getStartTime()
  {
    return startTime;
  }

  public DateTime getStopTime()
  {
    return stopTime;
  }

  public long getWindowSizeMillis()
  {
    return windowSizeMillis;
  }

  public int getTotalNumWindows()
  {
    return totalNumWindows;
  }

  public Map<String, Double> getAverages(int numWindows)
  {
    if (numWindows > statsBuffer.size()) {
      return null;
    }

    List<String> statKeys = metricsGetter.getKeys();
    double[] counts = new double[statKeys.size()];
    for (int i = 0; i < counts.length; i++) {
      counts[i] = 0;
    }

    if (statsBuffer.size() > 0) {
      int effectiveNumWindows = Math.min(numWindows, statsBuffer.size());
      for (int i = 0; i < effectiveNumWindows; i++) {
        Map<String, Double> statSnapshot = statsBuffer.getLatest(i);
        for (int j = 0; j < statKeys.size(); j++) {
          counts[j] += statSnapshot.get(statKeys.get(j));
        }
      }

      for (int i = 0; i < counts.length; i++) {
        counts[i] = counts[i] / numWindows;
      }
    }

    Map<String, Double> averageMap = Maps.newHashMap();
    for (int i = 0; i < statKeys.size(); i++) {
      averageMap.put(statKeys.get(i), counts[i]);
    }

    return averageMap;
  }
}

