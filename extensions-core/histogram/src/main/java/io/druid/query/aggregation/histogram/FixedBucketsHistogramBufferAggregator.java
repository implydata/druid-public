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

import io.druid.query.aggregation.BufferAggregator;
import io.druid.query.monomorphicprocessing.RuntimeShapeInspector;
import io.druid.segment.BaseObjectColumnValueSelector;

import java.nio.ByteBuffer;

public class FixedBucketsHistogramBufferAggregator implements BufferAggregator
{
  private final BaseObjectColumnValueSelector selector;

  private FixedBucketsHistogram histogram;

  public FixedBucketsHistogramBufferAggregator(
      BaseObjectColumnValueSelector selector,
      double lowerLimit,
      double upperLimit,
      int numBuckets,
      FixedBucketsHistogram.OutlierHandlingMode outlierHandlingMode
  )
  {
    this.selector = selector;
    this.histogram = new FixedBucketsHistogram(
        lowerLimit,
        upperLimit,
        numBuckets,
        outlierHandlingMode
    );
  }

  @Override
  public void init(ByteBuffer buf, int position)
  {
    ByteBuffer mutationBuffer = buf.duplicate();
    mutationBuffer.position(position);

    mutationBuffer.put(histogram.toBytes());
  }

  @Override
  public void aggregate(ByteBuffer buf, int position)
  {
    ByteBuffer mutationBuffer = buf.duplicate();
    mutationBuffer.position(position);

    FixedBucketsHistogram h0 = FixedBucketsHistogram.fromBytes(mutationBuffer);

    Object val = selector.getObject();

    if (val instanceof FixedBucketsHistogram) {
      FixedBucketsHistogram otherFBH = (FixedBucketsHistogram) selector.getObject();
      h0.combineHistogram(otherFBH);
    } else {
      Float x = ((Number) val).floatValue();
      h0.add(x);
    }

    mutationBuffer.position(position);

    mutationBuffer.put(h0.toBytes());
  }

  @Override
  public Object get(ByteBuffer buf, int position)
  {
    ByteBuffer mutationBuffer = buf.duplicate();
    mutationBuffer.position(position);
    return FixedBucketsHistogram.fromBytes(mutationBuffer);
  }

  @Override
  public float getFloat(ByteBuffer buf, int position)
  {
    throw new UnsupportedOperationException("FixedBucketsHistogramBufferAggregator does not support getFloat()");
  }


  @Override
  public long getLong(ByteBuffer buf, int position)
  {
    throw new UnsupportedOperationException("FixedBucketsHistogramBufferAggregator does not support getLong()");
  }

  @Override
  public double getDouble(ByteBuffer buf, int position)
  {
    throw new UnsupportedOperationException("FixedBucketsHistogramBufferAggregator does not support getDouble()");
  }

  @Override
  public void close()
  {
    // no resources to cleanup
  }

  @Override
  public void inspectRuntimeShape(RuntimeShapeInspector inspector)
  {
    inspector.visit("selector", selector);
  }
}
