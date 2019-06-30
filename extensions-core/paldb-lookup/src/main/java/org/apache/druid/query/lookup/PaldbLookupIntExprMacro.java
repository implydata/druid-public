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

package org.apache.druid.query.lookup;

import com.google.common.base.Preconditions;
import com.google.common.primitives.Ints;
import com.google.inject.Inject;
import org.apache.druid.java.util.common.IAE;
import org.apache.druid.math.expr.Expr;
import org.apache.druid.math.expr.ExprEval;
import org.apache.druid.math.expr.ExprMacroTable;
import org.apache.druid.segment.column.ValueType;

import javax.annotation.Nonnull;
import java.util.List;

public class PaldbLookupIntExprMacro implements ExprMacroTable.ExprMacro
{
  public static String FN_NAME = "paldb_lookup_int";
  private final LookupReferencesManager lookupReferencesManager;

  @Inject
  public PaldbLookupIntExprMacro(final LookupReferencesManager lookupReferencesManager)
  {
    this.lookupReferencesManager = lookupReferencesManager;
  }

  @Override
  public String name()
  {
    return FN_NAME;
  }

  @Override
  public Expr apply(final List<Expr> args)
  {
    if (args.size() != 3) {
      throw new IAE("Function[%s] must have 3 arguments", name());
    }

    final Expr arg = args.get(0);
    final Expr lookupExpr = args.get(1);
    final Expr typeExpr = args.get(2);

    if (!lookupExpr.isLiteral() || lookupExpr.getLiteralValue() == null) {
      throw new IAE("Function[%s] second argument must be a registered lookup name", name());
    }

    if (!typeExpr.isLiteral() || typeExpr.getLiteralValue() == null) {
      throw new IAE("Function[%s] third argument must be a type name", name());
    }

    final String lookupName = lookupExpr.getLiteralValue().toString();
    final ValueType valueType = ValueType.fromString(typeExpr.getLiteralValue().toString());

    class PaldbLookupIntExpr implements Expr
    {
      private volatile PaldbLookupExtractor extractor = null;

      @Nonnull
      @Override
      public ExprEval eval(final ObjectBinding bindings)
      {
        final int key = Ints.checkedCast(arg.eval(bindings).asLong());

        switch (valueType) {
          case LONG:
            return ExprEval.of(getExtractor().applyIntToLong(key));
          case STRING:
            return ExprEval.of(getExtractor().applyIntToString(key));
          default:
            throw new IAE("Cannot handle valueType[%s]", valueType);
        }
      }

      @Override
      public void visit(final Visitor visitor)
      {
        arg.visit(visitor);
        visitor.visit(this);
      }

      private PaldbLookupExtractor getExtractor()
      {
        if (null == extractor) {
          // http://www.javamex.com/tutorials/double_checked_locking.shtml
          synchronized (this) {
            if (null == extractor) {
              extractor = (PaldbLookupExtractor) Preconditions.checkNotNull(
                  lookupReferencesManager.get(lookupName),
                  "Lookup [%s] not found",
                  lookupName
              ).getLookupExtractorFactory().get();
            }
          }
        }

        return extractor;
      }
    }

    return new PaldbLookupIntExpr();
  }
}
