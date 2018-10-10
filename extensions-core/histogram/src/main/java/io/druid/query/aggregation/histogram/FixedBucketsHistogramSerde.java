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

import com.google.common.collect.Ordering;
import io.druid.data.input.InputRow;
import io.druid.segment.GenericColumnSerializer;
import io.druid.segment.column.ColumnBuilder;
import io.druid.segment.data.GenericIndexed;
import io.druid.segment.data.ObjectStrategy;
import io.druid.segment.serde.ComplexColumnPartSupplier;
import io.druid.segment.serde.ComplexMetricExtractor;
import io.druid.segment.serde.ComplexMetricSerde;
import io.druid.segment.serde.LargeColumnSupportedComplexColumnSerializer;
import io.druid.segment.writeout.SegmentWriteOutMedium;

import java.nio.ByteBuffer;

public class FixedBucketsHistogramSerde extends ComplexMetricSerde
{
  private static Ordering<FixedBucketsHistogram> comparator = new Ordering<FixedBucketsHistogram>()
  {
    @Override
    public int compare(
        FixedBucketsHistogram arg1, FixedBucketsHistogram arg2
    )
    {
      return FixedBucketsHistogramAggregator.COMPARATOR.compare(arg1, arg2);
    }
  }.nullsFirst();

  @Override
  public String getTypeName()
  {
    return "fixedBucketsHistogram";
  }

  @Override
  public ComplexMetricExtractor getExtractor()
  {
    return new ComplexMetricExtractor()
    {
      @Override
      public Class<FixedBucketsHistogram> extractedClass()
      {
        return FixedBucketsHistogram.class;
      }

      @Override
      public FixedBucketsHistogram extractValue(InputRow inputRow, String metricName)
      {
        Object rawValue = inputRow.getRaw(metricName);

        if (rawValue == null) {
          throw new UnsupportedOperationException("Null not supported yet.");
        } else if (rawValue instanceof FixedBucketsHistogram) {
          return (FixedBucketsHistogram) rawValue;
        } else {
          throw new UnsupportedOperationException("Unknown type: " + rawValue.getClass());
        }
      }
    };
  }

  @Override
  public void deserializeColumn(ByteBuffer buffer, ColumnBuilder builder)
  {
    final GenericIndexed column = GenericIndexed.read(buffer, getObjectStrategy(), builder.getFileMapper());
    builder.setComplexColumn(new ComplexColumnPartSupplier(getTypeName(), column));
  }

  @Override
  public ObjectStrategy getObjectStrategy()
  {
    return new ObjectStrategy<FixedBucketsHistogram>()
    {
      @Override
      public Class<? extends FixedBucketsHistogram> getClazz()
      {
        return FixedBucketsHistogram.class;
      }

      @Override
      public FixedBucketsHistogram fromByteBuffer(ByteBuffer buffer, int numBytes)
      {
        buffer.limit(buffer.position() + numBytes);
        return FixedBucketsHistogram.fromBytes(buffer);
      }

      @Override
      public byte[] toBytes(FixedBucketsHistogram h)
      {
        if (h == null) {
          return new byte[]{};
        }
        return h.toBytes();
      }

      @Override
      public int compare(FixedBucketsHistogram o1, FixedBucketsHistogram o2)
      {
        return comparator.compare(o1, o2);
      }
    };
  }

  @Override
  public GenericColumnSerializer getSerializer(
      SegmentWriteOutMedium segmentWriteOutMedium, String column
  )
  {
    return LargeColumnSupportedComplexColumnSerializer.create(segmentWriteOutMedium, column, this.getObjectStrategy());
  }
}
