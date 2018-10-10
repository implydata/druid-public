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

package io.druid.query.aggregation.histogram;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonValue;
import io.druid.java.util.common.ISE;
import io.druid.java.util.common.StringUtils;
import io.druid.java.util.common.logger.Logger;
import org.apache.curator.shaded.com.google.common.base.Preconditions;

import java.nio.ByteBuffer;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;
import java.util.Objects;

public class FixedBucketsHistogram
{
  private static final Logger log = new Logger(FixedBucketsHistogram.class);

  public enum OutlierHandlingMode
  {
    OVERFLOW,
    IGNORE,
    CLIP;

    @JsonValue
    @Override
    public String toString()
    {
      return StringUtils.toLowerCase(this.name());
    }

    @JsonCreator
    public static OutlierHandlingMode fromString(String name)
    {
      return valueOf(StringUtils.toUpperCase(name));
    }

    public byte[] getCacheKey()
    {
      return new byte[] {(byte) this.ordinal()};
    }
  }

  private double lowerLimit;
  private double upperLimit;
  private int numBuckets;

  private long upperOutlierCount = 0;
  private long lowerOutlierCount = 0;
  private long missingValueCount = 0;
  private long[] histogram;
  private double bucketSize;
  private OutlierHandlingMode outlierHandlingMode;

  private long count = 0;
  private double max = Double.NEGATIVE_INFINITY;
  private double min = Double.POSITIVE_INFINITY;

  public FixedBucketsHistogram(
      double lowerLimit,
      double upperLimit,
      int numBuckets,
      OutlierHandlingMode outlierHandlingMode
  )
  {
    Preconditions.checkArgument(upperLimit > lowerLimit, "Upper limit must be greater than lower limit.");
    Preconditions.checkArgument(numBuckets > 0, "Must have a positive number of buckets.");
    this.lowerLimit = lowerLimit;
    this.upperLimit = upperLimit;
    this.numBuckets = numBuckets;
    this.outlierHandlingMode = outlierHandlingMode;

    this.histogram = new long[numBuckets];
    this.bucketSize = (upperLimit - lowerLimit) / numBuckets;
  }

  private FixedBucketsHistogram(
      double lowerLimit,
      double upperLimit,
      int numBuckets,
      OutlierHandlingMode outlierHandlingMode,
      long[] histogram,
      long count,
      double max,
      double min,
      long lowerOutlierCount,
      long upperOutlierCount,
      long missingValueCount
  )
  {
    this.lowerLimit = lowerLimit;
    this.upperLimit = upperLimit;
    this.numBuckets = numBuckets;
    this.outlierHandlingMode = outlierHandlingMode;
    this.histogram = histogram;
    this.count = count;
    this.max = max;
    this.min = min;
    this.upperOutlierCount = upperOutlierCount;
    this.lowerOutlierCount = lowerOutlierCount;
    this.missingValueCount = missingValueCount;

    this.bucketSize = (upperLimit - lowerLimit) / numBuckets;
  }

  private void handleOutlier(boolean exceededMax, double value)
  {
    switch (outlierHandlingMode) {
      case CLIP:
        if (exceededMax) {
          histogram[histogram.length - 1] += 1;
        } else {
          histogram[0] += 1;
        }
        count += 1;
        if (value > max) {
          max = value;
        }
        if (value < min) {
          min = value;
        }
        break;
      case OVERFLOW:
        if (exceededMax) {
          upperOutlierCount += 1;
        } else {
          lowerOutlierCount += 1;
        }
        break;
      case IGNORE:
        break;
      default:
        throw new ISE("Unknown outlier handling mode: " + outlierHandlingMode);
    }
  }

  public void incrementMissing()
  {
    missingValueCount++;
  }

  public void add(
      double value
  )
  {
    if (value < lowerLimit) {
      handleOutlier(false, value);
      return;
    }

    if (value > upperLimit) {
      handleOutlier(true, value);
      return;
    }

    count += 1;
    if (value > max) {
      max = value;
    }
    if (value < min) {
      min = value;
    }

    double valueRelativeToRange = value - lowerLimit;
    int targetBucket = (int) (valueRelativeToRange / bucketSize);

    if (targetBucket >= histogram.length) {
      targetBucket = histogram.length - 1;
    }
    histogram[targetBucket] += 1;
  }

  @JsonProperty
  public double getLowerLimit()
  {
    return lowerLimit;
  }

  @JsonProperty
  public double getUpperLimit()
  {
    return upperLimit;
  }

  @JsonProperty
  public int getNumBuckets()
  {
    return numBuckets;
  }

  @JsonProperty
  public long getUpperOutlierCount()
  {
    return upperOutlierCount;
  }

  @JsonProperty
  public long getLowerOutlierCount()
  {
    return lowerOutlierCount;
  }

  @JsonProperty
  public long getMissingValueCount()
  {
    return missingValueCount;
  }

  @JsonProperty
  public long[] getHistogram()
  {
    return histogram;
  }

  @JsonProperty
  public double getBucketSize()
  {
    return bucketSize;
  }

  @JsonProperty
  public long getCount()
  {
    return count;
  }

  @JsonProperty
  public double getMax()
  {
    return max;
  }

  @JsonProperty
  public double getMin()
  {
    return min;
  }

  @JsonProperty
  public OutlierHandlingMode getOutlierHandlingMode()
  {
    return outlierHandlingMode;
  }

  public FixedBucketsHistogram combineHistogram(FixedBucketsHistogram otherHistogram)
  {
    if (otherHistogram == null) {
      return this;
    }

    Preconditions.checkArgument(numBuckets == otherHistogram.getNumBuckets(), "bucket count must match");
    Preconditions.checkArgument(lowerLimit == otherHistogram.getLowerLimit(), "lower limits must match");
    Preconditions.checkArgument(upperLimit == otherHistogram.getUpperLimit(), "upper limits must match");

    long[] otherHistogramArray = otherHistogram.getHistogram();
    for (int i = 0; i < numBuckets; i++) {
      histogram[i] += otherHistogramArray[i];
    }

    count += otherHistogram.getCount();
    max = Math.max(max, otherHistogram.getMax());
    min = Math.min(min, otherHistogram.getMin());
    lowerOutlierCount += otherHistogram.getLowerOutlierCount();
    upperOutlierCount += otherHistogram.getUpperOutlierCount();
    missingValueCount += otherHistogram.getMissingValueCount();

    return this;
  }

  /*
  public float[] getQuantiles(float[] probabilities)
  {
    float[] quantileThresholds = new float[probabilities.length];
    float[] quantiles = new float[probabilities.length];
    for (int i = 0; i < probabilities.length; i++) {
      quantileThresholds[i] = count * probabilities[i];
    }
    int quantileThresholdIndex = 0;
    int currentBucket = 0;
    int currentCount = 0;
    while (quantileThresholdIndex < probabilities.length) {
      if (currentBucket >= histogram.length) {
        for (int i = quantileThresholdIndex; i < probabilities.length; i++) {
          quantiles[i] = (float) (currentBucket * bucketSize + lowerLimit);
        }
      }
      int previousCount = currentCount;
      currentCount += histogram[currentBucket];
      if (currentCount > quantileThresholds[quantileThresholdIndex]) {
        float intrabucketDiff = quantileThresholds[quantileThresholdIndex] - previousCount;
        float bucketFraction = (float) ((intrabucketDiff / histogram[currentBucket]) * bucketSize);
        //float bucketFraction = 0;
        quantiles[quantileThresholdIndex] = (float) (currentBucket * bucketSize + lowerLimit + bucketFraction);
        quantileThresholdIndex += 1;
      }
      currentBucket += 1;
    }
    return quantiles;
  }
  */

  // Based off PercentileBuckets code from Netflix Spectator: https://github.com/Netflix/spectator
  /*
  public double[] percentiles(double[] pcts)
  {
    double[] results = new double[pcts.length];
    long total = count;

    int pctIdx = 0;

    long prev = 0;
    double prevP = 0.0;
    double prevB = lowerLimit;
    for (int i = 0; i <  numBuckets; ++i) {
      long next = prev + histogram[i];
      double nextP = 100.0 * next / total;
      double nextB = (i + 1) * bucketSize + lowerLimit;
      while (pctIdx < pcts.length && nextP >= pcts[pctIdx]) {
        double f = (pcts[pctIdx] - prevP) / (nextP - prevP);
        results[pctIdx] = f * (nextB - prevB) + prevB;
        ++pctIdx;
      }
      if (pctIdx >= pcts.length) break;
      prev = next;
      prevP = nextP;
      prevB = nextB;
    }

    double nextP = 100.0;
    //CHECKSTYLE.OFF: Regexp
    double nextB = Double.MAX_VALUE;
    //CHECKSTYLE.ON: Regexp
    while (pctIdx < pcts.length) {
      double f = (pcts[pctIdx] - prevP) / (nextP - prevP);
      results[pctIdx] = f * (nextB - prevB) + prevB;
      ++pctIdx;
    }
    return results;
  }
  */

  // Based off PercentileBuckets code from Netflix Spectator: https://github.com/Netflix/spectator
  public float[] percentilesFloat(double[] pcts)
  {
    float[] results = new float[pcts.length];
    long total = count;

    int pctIdx = 0;

    long prev = 0;
    double prevP = 0.0;
    double prevB = lowerLimit;
    for (int i = 0; i < numBuckets; ++i) {
      long next = prev + histogram[i];
      double nextP = 100.0 * next / total;
      double nextB = (i + 1) * bucketSize + lowerLimit;
      while (pctIdx < pcts.length && nextP >= pcts[pctIdx]) {
        double f = (pcts[pctIdx] - prevP) / (nextP - prevP);
        results[pctIdx] = (float) (f * (nextB - prevB) + prevB);
        ++pctIdx;
      }
      if (pctIdx >= pcts.length) {
        break;
      }
      prev = next;
      prevP = nextP;
      prevB = nextB;
    }

    double nextP = 100.0;
    //CHECKSTYLE.OFF: Regexp
    double nextB = Double.MAX_VALUE;
    //CHECKSTYLE.ON: Regexp
    while (pctIdx < pcts.length) {
      double f = (pcts[pctIdx] - prevP) / (nextP - prevP);
      results[pctIdx] = (float) (f * (nextB - prevB) + prevB);
      ++pctIdx;
    }
    return results;
  }

  @JsonValue
  public byte[] toBytes()
  {
    ByteBuffer buf = ByteBuffer.allocate(getFullStorageSize(numBuckets));
    toBytes(buf);
    return buf.array();
  }

  private void toBytes(ByteBuffer buf)
  {
    buf.putDouble(lowerLimit);
    buf.putDouble(upperLimit);
    buf.putInt(numBuckets);
    buf.putInt(outlierHandlingMode.ordinal());

    buf.putLong(count);
    buf.putLong(lowerOutlierCount);
    buf.putLong(upperOutlierCount);
    buf.putLong(missingValueCount);

    buf.putDouble(max);
    buf.putDouble(min);

    buf.asLongBuffer().put(histogram);
    buf.position(buf.position() + Long.BYTES * histogram.length);
  }

  public static int getFullStorageSize(int numBuckets)
  {
    return Double.BYTES +
           Double.BYTES +
           Integer.BYTES +
           Integer.BYTES +
           Long.BYTES * 4 +
           Double.BYTES * 2 +
           Long.BYTES * numBuckets;
  }

  public static FixedBucketsHistogram fromBytes(byte[] bytes)
  {
    ByteBuffer buf = ByteBuffer.wrap(bytes);
    return fromBytes(buf);
  }

  /**
   * Constructs an ApproximateHistogram object from the given dense byte-buffer representation
   *
   * @param buf ByteBuffer to construct an ApproximateHistogram from
   *
   * @return ApproximateHistogram constructed from the given ByteBuffer
   */
  public static FixedBucketsHistogram fromBytes(ByteBuffer buf)
  {
    double lowerLimit = buf.getDouble();
    double upperLimit = buf.getDouble();
    int numBuckets = buf.getInt();
    OutlierHandlingMode outlierHandlingMode = OutlierHandlingMode.values()[buf.getInt()];

    long count = buf.getLong();
    long lowerOutlierCount = buf.getLong();
    long upperOutlierCount = buf.getLong();
    long missingValueCount = buf.getLong();

    double max = buf.getDouble();
    double min = buf.getDouble();

    long histogram[] = new long[numBuckets];
    buf.asLongBuffer().get(histogram);
    buf.position(buf.position() + Long.BYTES * histogram.length);

    return new FixedBucketsHistogram(
        lowerLimit,
        upperLimit,
        numBuckets,
        outlierHandlingMode,
        histogram,
        count,
        max,
        min,
        lowerOutlierCount,
        upperOutlierCount,
        missingValueCount
    );
  }

  public Map<String, Object> finalizedForm()
  {
    Map<String, Object> mymap = new HashMap<>();
    mymap.put("lowerLimit", lowerLimit);
    mymap.put("upperLimit", upperLimit);
    mymap.put("numBuckets", numBuckets);
    mymap.put("upperOutlierCount", upperOutlierCount);
    mymap.put("lowerOutlierCount", lowerOutlierCount);
    mymap.put("missingValueCount", missingValueCount);
    mymap.put("histogram", histogram);
    mymap.put("outlierHandlingMode", outlierHandlingMode);
    mymap.put("count", count);
    mymap.put("max", max);
    mymap.put("min", min);
    return mymap;
  }

  @Override
  public String toString()
  {
    return "{" +
           "lowerLimit=" + lowerLimit +
           ", upperLimit=" + upperLimit +
           ", numBuckets=" + numBuckets +
           ", upperOutlierCount=" + upperOutlierCount +
           ", lowerOutlierCount=" + lowerOutlierCount +
           ", missingValueCount=" + missingValueCount +
           ", histogram=" + Arrays.toString(histogram) +
           ", outlierHandlingMode=" + outlierHandlingMode +
           ", count=" + count +
           ", max=" + max +
           ", min=" + min +
           '}';
  }

  @Override
  public boolean equals(Object o)
  {
    if (this == o) {
      return true;
    }
    if (o == null || getClass() != o.getClass()) {
      return false;
    }
    FixedBucketsHistogram that = (FixedBucketsHistogram) o;
    return Double.compare(that.getLowerLimit(), getLowerLimit()) == 0 &&
           Double.compare(that.getUpperLimit(), getUpperLimit()) == 0 &&
           getNumBuckets() == that.getNumBuckets() &&
           getUpperOutlierCount() == that.getUpperOutlierCount() &&
           getLowerOutlierCount() == that.getLowerOutlierCount() &&
           getMissingValueCount() == that.getMissingValueCount() &&
           Double.compare(that.getBucketSize(), getBucketSize()) == 0 &&
           getCount() == that.getCount() &&
           Double.compare(that.max, max) == 0 &&
           Double.compare(that.min, min) == 0 &&
           Arrays.equals(getHistogram(), that.getHistogram()) &&
           getOutlierHandlingMode() == that.getOutlierHandlingMode();
  }

  @Override
  public int hashCode()
  {
    return Objects.hash(
        getLowerLimit(),
        getUpperLimit(),
        getNumBuckets(),
        getUpperOutlierCount(),
        getLowerOutlierCount(),
        getMissingValueCount(),
        Arrays.hashCode(getHistogram()),
        getBucketSize(),
        getOutlierHandlingMode(),
        getCount(),
        max,
        min
    );
  }
}
