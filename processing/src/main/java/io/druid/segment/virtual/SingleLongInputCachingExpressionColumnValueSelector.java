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

package io.druid.segment.virtual;

import com.google.common.base.Preconditions;
import io.druid.java.util.common.ISE;
import io.druid.math.expr.Expr;
import io.druid.math.expr.ExprEval;
import io.druid.math.expr.Parser;
import io.druid.query.monomorphicprocessing.RuntimeShapeInspector;
import io.druid.segment.ColumnValueSelector;
import it.unimi.dsi.fastutil.longs.Long2ObjectLinkedOpenHashMap;

import javax.annotation.Nonnull;
import javax.annotation.Nullable;

/**
 * Like {@link ExpressionColumnValueSelector}, but caches the most recently computed value and re-uses it in the case
 * of runs in the underlying column. This is especially useful for the __time column, where we expect runs.
 */
public class SingleLongInputCachingExpressionColumnValueSelector implements ColumnValueSelector<ExprEval>
{
  private static final int CACHE_SIZE = 1000;

  private final ColumnValueSelector selector;
  private final Expr expression;
  private final SingleInputBindings bindings = new SingleInputBindings();

  @Nullable
  private final LruEvalCache lruEvalCache;

  // Last read input value.
  private long lastInput;

  // Last computed output value, or null if there is none.
  @Nullable
  private ExprEval lastOutput;

  public SingleLongInputCachingExpressionColumnValueSelector(
      final ColumnValueSelector selector,
      final Expr expression,
      final boolean useLruCache
  )
  {
    // Verify expression has just one binding.
    if (Parser.findRequiredBindings(expression).size() != 1) {
      throw new ISE("WTF?! Expected expression with just one binding");
    }

    this.selector = Preconditions.checkNotNull(selector, "selector");
    this.expression = Preconditions.checkNotNull(expression, "expression");
    this.lruEvalCache = useLruCache ? new LruEvalCache() : null;
  }

  @Override
  public void inspectRuntimeShape(final RuntimeShapeInspector inspector)
  {
    inspector.visit("selector", selector);
    inspector.visit("expression", expression);
  }

  @Override
  public double getDouble()
  {
    return getObject().asDouble();
  }

  @Override
  public float getFloat()
  {
    return (float) getObject().asDouble();
  }

  @Override
  public long getLong()
  {
    return getObject().asLong();
  }

  @Nonnull
  @Override
  public ExprEval getObject()
  {
    // No assert for null handling, as the delegate selector already has it.
    final long input = selector.getLong();
    final boolean cached = input == lastInput && lastOutput != null;

    if (!cached) {
      if (lruEvalCache == null) {
        bindings.set(input);
        lastOutput = expression.eval(bindings);
      } else {
        lastOutput = lruEvalCache.compute(input);
      }

      lastInput = input;
    }

    return lastOutput;
  }

  @Override
  public Class<ExprEval> classOfObject()
  {
    return ExprEval.class;
  }

  public class LruEvalCache
  {
    private final Long2ObjectLinkedOpenHashMap<ExprEval> m = new Long2ObjectLinkedOpenHashMap<>();

    public ExprEval compute(final long n)
    {
      ExprEval value = m.getAndMoveToFirst(n);

      if (value == null) {
        bindings.set(n);
        value = expression.eval(bindings);
        m.putAndMoveToFirst(n, value);

        if (m.size() > CACHE_SIZE) {
          m.removeLast();
        }
      }

      return value;
    }
  }
}
