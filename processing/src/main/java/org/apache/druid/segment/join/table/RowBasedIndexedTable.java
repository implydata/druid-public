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

package org.apache.druid.segment.join.table;

import com.google.common.collect.Maps;
import com.google.common.primitives.Ints;
import it.unimi.dsi.fastutil.ints.IntArrayList;
import it.unimi.dsi.fastutil.ints.IntList;
import it.unimi.dsi.fastutil.ints.IntLists;
import it.unimi.dsi.fastutil.longs.Long2ObjectMap;
import it.unimi.dsi.fastutil.longs.Long2ObjectOpenHashMap;
import org.apache.druid.java.util.common.IAE;
import org.apache.druid.java.util.common.ISE;
import org.apache.druid.segment.DimensionHandlerUtils;
import org.apache.druid.segment.RowAdapter;
import org.apache.druid.segment.column.ValueType;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * An IndexedTable composed of a List-based table and Map-based indexes. The implementation is agnostic to the
 * specific row type; it uses a {@link RowAdapter} to work with any sort of object.
 */
public class RowBasedIndexedTable<RowType> implements IndexedTable
{
  private final List<RowType> table;
  private final List<Map<Object, IntList>> objectIndices;
  private final List<Long2ObjectMap<IntList>> longIndices;
  private final Map<String, ValueType> rowSignature;
  private final List<String> columns;
  private final List<ValueType> columnTypes;
  private final List<Function<RowType, Object>> columnFunctions;
  private final Set<String> keyColumns;

  public RowBasedIndexedTable(
      final List<RowType> table,
      final RowAdapter<RowType> rowAdapter,
      final Map<String, ValueType> rowSignature,
      final Set<String> keyColumns
  )
  {
    this.table = table;
    this.rowSignature = rowSignature;
    this.columns = rowSignature.keySet().stream().sorted().collect(Collectors.toList());
    this.columnTypes = new ArrayList<>(columns.size());
    this.columnFunctions = columns.stream().map(rowAdapter::columnFunction).collect(Collectors.toList());
    this.keyColumns = keyColumns;

    if (new HashSet<>(keyColumns).size() != keyColumns.size()) {
      throw new ISE("keyColumns[%s] must not contain duplicates", keyColumns);
    }

    if (!rowSignature.keySet().containsAll(keyColumns)) {
      throw new ISE(
          "keyColumns[%s] must all be contained in rowSignature[%s]",
          String.join(", ", keyColumns),
          String.join(", ", rowSignature.keySet())
      );
    }

    objectIndices = new ArrayList<>(columns.size());
    longIndices = new ArrayList<>(columns.size());

    for (int i = 0; i < columns.size(); i++) {
      final String column = columns.get(i);
      final Map<Object, IntList> objectIndexMap;
      final Long2ObjectMap<IntList> longIndexMap;
      final ValueType columnType = rowSignature.get(column);

      columnTypes.add(columnType);

      if (keyColumns.contains(column)) {
        final Function<RowType, Object> columnFunction = columnFunctions.get(i);

        // TODO: for primary keys, we can cheat here and pre-size the hashmap to reduce collisions
        if (columnType == ValueType.LONG) {
          objectIndexMap = null;
          longIndexMap = new Long2ObjectOpenHashMap<>(capacityForFastUtilMap(table.size()));
        } else {
          objectIndexMap = Maps.newHashMapWithExpectedSize(table.size());
          longIndexMap = null;
        }
        for (int j = 0; j < table.size(); j++) {
          final RowType row = table.get(j);
          if (columnType == ValueType.LONG) {
            final Long key = DimensionHandlerUtils.convertObjectToLong(columnFunction.apply(row));
            if (key != null) {
              final IntList array = longIndexMap.computeIfAbsent(key.longValue(), k -> new IntArrayList());
              array.add(j);
            }
          } else {
            final Object key = DimensionHandlerUtils.convertObjectToType(columnFunction.apply(row), columnType);
            if (key != null) {
              final IntList array = objectIndexMap.computeIfAbsent(key, k -> new IntArrayList());
              array.add(j);
            }
          }
        }
      } else {
        objectIndexMap = null;
        longIndexMap = null;
      }

      objectIndices.add(objectIndexMap);
      longIndices.add(longIndexMap);
    }
  }

  @Override
  public Set<String> keyColumns()
  {
    return keyColumns;
  }

  @Override
  public List<String> allColumns()
  {
    return columns;
  }

  @Override
  public Map<String, ValueType> rowSignature()
  {
    return rowSignature;
  }

  @Override
  public Index columnIndex(int column)
  {
    final ValueType columnType = columnTypes.get(column);

    if (columnType == ValueType.LONG) {
      final Long2ObjectMap<IntList> indexMap = longIndices.get(column);

      if (indexMap == null) {
        throw new IAE("Column[%d] is not a key column", column);
      }
      return key -> {
        final Long convertedKey = DimensionHandlerUtils.convertObjectToLong(key);

        if (convertedKey != null) {
          final IntList found = indexMap.get(convertedKey.longValue());
          if (found != null) {
            return found;
          } else {
            return IntLists.EMPTY_LIST;
          }
        } else {
          return IntLists.EMPTY_LIST;
        }
      };
    } else {
      final Map<Object, IntList> indexMap = objectIndices.get(column);

      if (indexMap == null) {
        throw new IAE("Column[%d] is not a key column", column);
      }

      return key -> {
        final Object convertedKey = DimensionHandlerUtils.convertObjectToType(key, columnType, false);

        if (convertedKey != null) {
          final IntList found = indexMap.get(convertedKey);
          if (found != null) {
            return found;
          } else {
            return IntLists.EMPTY_LIST;
          }
        } else {
          return IntLists.EMPTY_LIST;
        }
      };
    }
  }

  @Override
  public Reader columnReader(int column)
  {
    final Function<RowType, Object> columnFn = columnFunctions.get(column);

    if (columnFn == null) {
      throw new IAE("Column[%d] is not a valid column", column);
    }

    return row -> columnFn.apply(table.get(row));
  }

  @Override
  public int numRows()
  {
    return table.size();
  }

  /**
   * copied form {@link Maps#capacity(int)}
   * @param expectedSize
   * @return
   */
  private static int capacityForFastUtilMap(int expectedSize)
  {
    if (expectedSize < 3) {
      if (expectedSize < 0) {
        throw new IAE("expectedSize for map should be greater than 0");
      }
      return expectedSize + 1;
    }
    if (expectedSize < Ints.MAX_POWER_OF_TWO) {
      return expectedSize + expectedSize / 3;
    }
    return Integer.MAX_VALUE; // any large value
  }
}
