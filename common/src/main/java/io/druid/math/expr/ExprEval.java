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

package io.druid.math.expr;

import com.google.common.base.Preconditions;
import com.google.common.base.Strings;
import com.google.common.primitives.Doubles;
import io.druid.common.guava.GuavaUtils;
import io.druid.java.util.common.IAE;

import javax.annotation.Nullable;

/**
 */
public abstract class ExprEval<T>
{
  // Cached String values. Protected so they can be used by subclasses.
  private boolean stringValueValid = false;
  private String stringValue;

  public static ExprEval ofLong(Number longValue)
  {
    return new LongExprEval(longValue);
  }

  public static ExprEval of(long longValue)
  {
    return new LongExprEval(longValue);
  }

  public static ExprEval ofDouble(Number doubleValue)
  {
    return new DoubleExprEval(doubleValue);
  }

  public static ExprEval of(double doubleValue)
  {
    return new DoubleExprEval(doubleValue);
  }

  public static ExprEval of(String stringValue)
  {
    return new StringExprEval(stringValue);
  }

  public static ExprEval of(boolean value, ExprType type)
  {
    switch (type) {
      case DOUBLE:
        return ExprEval.of(Evals.asDouble(value));
      case LONG:
        return ExprEval.of(Evals.asLong(value));
      case STRING:
        return ExprEval.of(String.valueOf(value));
      default:
        throw new IllegalArgumentException("invalid type " + type);
    }
  }

  public static ExprEval bestEffortOf(Object val)
  {
    if (val instanceof ExprEval) {
      return (ExprEval) val;
    }
    if (val instanceof Number) {
      if (val instanceof Float || val instanceof Double) {
        return new DoubleExprEval((Number) val);
      }
      return new LongExprEval((Number) val);
    }
    return new StringExprEval(val == null ? null : String.valueOf(val));
  }

  final T value;

  private ExprEval(@Nullable T value)
  {
    this.value = value;
  }

  public abstract ExprType type();

  public Object value()
  {
    return value;
  }

  public boolean isNull()
  {
    return value == null;
  }

  public abstract int asInt();

  public abstract long asLong();

  public abstract double asDouble();

  public String asString()
  {
    if (!stringValueValid) {
      if (value == null) {
        stringValue = null;
      } else {
        stringValue = String.valueOf(value);
      }

      stringValueValid = true;
    }

    return stringValue;
  }

  public abstract boolean asBoolean();

  public abstract ExprEval castTo(ExprType castTo);

  public abstract Expr toExpr();

  private static abstract class NumericExprEval extends ExprEval<Number>
  {

    private NumericExprEval(Number value)
    {
      super(value);
    }

    @Override
    public final int asInt()
    {
      return value.intValue();
    }

    @Override
    public final long asLong()
    {
      return value.longValue();
    }

    @Override
    public final double asDouble()
    {
      return value.doubleValue();
    }
  }

  private static class DoubleExprEval extends NumericExprEval
  {
    private DoubleExprEval(Number value)
    {
      super(Preconditions.checkNotNull(value, "value"));
    }

    @Override
    public final ExprType type()
    {
      return ExprType.DOUBLE;
    }

    @Override
    public final boolean asBoolean()
    {
      return Evals.asBoolean(asDouble());
    }

    @Override
    public final ExprEval castTo(ExprType castTo)
    {
      switch (castTo) {
        case DOUBLE:
          return this;
        case LONG:
          return ExprEval.of(asLong());
        case STRING:
          return ExprEval.of(asString());
      }
      throw new IAE("invalid type " + castTo);
    }

    @Override
    public Expr toExpr()
    {
      return new DoubleExpr(value.doubleValue());
    }
  }

  private static class LongExprEval extends NumericExprEval
  {
    private LongExprEval(Number value)
    {
      super(Preconditions.checkNotNull(value, "value"));
    }

    @Override
    public final ExprType type()
    {
      return ExprType.LONG;
    }

    @Override
    public final boolean asBoolean()
    {
      return Evals.asBoolean(asLong());
    }

    @Override
    public final ExprEval castTo(ExprType castTo)
    {
      switch (castTo) {
        case DOUBLE:
          return ExprEval.of(asDouble());
        case LONG:
          return this;
        case STRING:
          return ExprEval.of(asString());
      }
      throw new IAE("invalid type " + castTo);
    }

    @Override
    public Expr toExpr()
    {
      return new LongExpr(value.longValue());
    }
  }

  private static class StringExprEval extends ExprEval<String>
  {
    // Cached primitive values.
    private boolean intValueValid = false;
    private boolean longValueValid = false;
    private boolean doubleValueValid = false;
    private boolean booleanValueValid = false;
    private int intValue;
    private long longValue;
    private double doubleValue;
    private boolean booleanValue;

    private Number numericVal;

    private StringExprEval(String value)
    {
      super(Strings.emptyToNull(value));
    }

    @Override
    public final ExprType type()
    {
      return ExprType.STRING;
    }

    @Override
    public int asInt()
    {
      if (!intValueValid) {
        intValue = computeInt();
        intValueValid = true;
      }

      return intValue;
    }

    @Override
    public long asLong()
    {
      if (!longValueValid) {
        longValue = computeLong();
        longValueValid = true;
      }

      return longValue;
    }

    @Override
    public double asDouble()
    {
      if (!doubleValueValid) {
        doubleValue = computeDouble();
        doubleValueValid = true;
      }

      return doubleValue;
    }

    @Nullable
    @Override
    public String asString()
    {
      return value;
    }

    private int computeInt()
    {
      return computeNumber().intValue();
    }

    private long computeLong()
    {
      return computeNumber().longValue();
    }

    private double computeDouble()
    {
      return computeNumber().doubleValue();
    }

    private Number computeNumber()
    {
      if (value == null) {
        return 0.0d;
      }
      if (numericVal != null) {
        // Optimization for non-null case.
        return numericVal;
      }
      Number rv;
      Long v = GuavaUtils.tryParseLong(value);
      // Do NOT use ternary operator here, because it makes Java to convert Long to Double
      if (v != null) {
        rv = v;
      } else {
        rv = Doubles.tryParse(value);
      }

      if (rv == null) {
        numericVal = 0.0d;
      } else {
        numericVal = rv;
      }

      return numericVal;
    }

    @Override
    public final boolean asBoolean()
    {
      if (!booleanValueValid) {
        booleanValue = Evals.asBoolean(value);
        booleanValueValid = true;
      }

      return booleanValue;
    }

    @Override
    public final ExprEval castTo(ExprType castTo)
    {
      switch (castTo) {
        case DOUBLE:
          return ExprEval.ofDouble(computeNumber());
        case LONG:
          return ExprEval.ofLong(computeNumber());
        case STRING:
          return this;
      }
      throw new IAE("invalid type " + castTo);
    }

    @Override
    public Expr toExpr()
    {
      return new StringExpr(value);
    }
  }
}
