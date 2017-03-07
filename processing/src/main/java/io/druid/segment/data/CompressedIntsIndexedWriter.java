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

package io.druid.segment.data;

import com.google.common.primitives.Ints;
import io.druid.collections.ResourceHolder;
import io.druid.collections.StupidResourceHolder;
import io.druid.io.Channels;
import io.druid.segment.IndexIO;

import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.IntBuffer;
import java.nio.channels.WritableByteChannel;

/**
 * Streams array of integers out in the binary format described by CompressedIntsIndexedSupplier
 */
public class CompressedIntsIndexedWriter extends SingleValueIndexedIntsWriter
{
  private static final byte VERSION = CompressedIntsIndexedSupplier.VERSION;

  public static CompressedIntsIndexedWriter create(final CompressedObjectStrategy.CompressionStrategy compression)
  {
    return new CompressedIntsIndexedWriter(
        CompressedIntsIndexedSupplier.MAX_INTS_IN_BUFFER,
        IndexIO.BYTE_ORDER,
        compression
    );
  }

  private final int chunkFactor;
  private final CompressedObjectStrategy.CompressionStrategy compression;
  private final GenericIndexedWriter<ResourceHolder<IntBuffer>> flattener;
  private IntBuffer endBuffer;
  private int numInserted;

  CompressedIntsIndexedWriter(
      final int chunkFactor,
      final ByteOrder byteOrder,
      final CompressedObjectStrategy.CompressionStrategy compression
  )
  {
    this.chunkFactor = chunkFactor;
    this.compression = compression;
    this.flattener = new GenericIndexedWriter<>(
        CompressedIntBufferObjectStrategy.getBufferForOrder(byteOrder, compression, chunkFactor)
    );
    this.endBuffer = IntBuffer.allocate(chunkFactor);
    this.numInserted = 0;
  }

  @Override
  public void open() throws IOException
  {
    flattener.open();
  }

  @Override
  protected void addValue(int val) throws IOException
  {
    if (!endBuffer.hasRemaining()) {
      endBuffer.rewind();
      flattener.write(StupidResourceHolder.create(endBuffer));
      endBuffer = IntBuffer.allocate(chunkFactor);
    }
    endBuffer.put(val);
    numInserted++;
  }

  @Override
  public long getSerializedSize() throws IOException
  {
    writeEndBuffer();
    return metaSize() + flattener.getSerializedSize();
  }

  @Override
  public void writeTo(WritableByteChannel channel) throws IOException
  {
    writeEndBuffer();

    ByteBuffer meta = ByteBuffer.allocate(metaSize());
    meta.put(VERSION);
    meta.putInt(numInserted);
    meta.putInt(chunkFactor);
    meta.put(compression.getId());
    meta.flip();

    Channels.writeFully(channel, meta);
    flattener.writeTo(channel);
  }

  private void writeEndBuffer() throws IOException
  {
    if (endBuffer != null && numInserted > 0) {
      endBuffer.limit(endBuffer.position());
      endBuffer.rewind();
      flattener.write(StupidResourceHolder.create(endBuffer));
      endBuffer = null;
    }
  }

  private int metaSize()
  {
    return 1 +             // version
           Ints.BYTES +    // numInserted
           Ints.BYTES +    // chunkFactor
           1;              // compression id
  }
}
