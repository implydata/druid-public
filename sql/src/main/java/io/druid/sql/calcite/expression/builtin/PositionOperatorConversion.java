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

package io.druid.sql.calcite.expression.builtin;

import com.google.common.collect.ImmutableList;
import io.druid.java.util.common.StringUtils;
import io.druid.sql.calcite.expression.DruidExpression;
import io.druid.sql.calcite.expression.OperatorConversions;
import io.druid.sql.calcite.expression.SqlOperatorConversion;
import io.druid.sql.calcite.planner.PlannerContext;
import io.druid.sql.calcite.table.RowSignature;
import org.apache.calcite.rex.RexNode;
import org.apache.calcite.sql.SqlOperator;
import org.apache.calcite.sql.fun.SqlStdOperatorTable;

public class PositionOperatorConversion implements SqlOperatorConversion
{
  private static final DruidExpression ZERO = DruidExpression.fromExpression("0");

  @Override
  public SqlOperator calciteOperator()
  {
    return SqlStdOperatorTable.POSITION;
  }

  @Override
  public DruidExpression toDruidExpression(
      final PlannerContext plannerContext,
      final RowSignature rowSignature,
      final RexNode rexNode
  )
  {
    return OperatorConversions.convertCall(
        plannerContext,
        rowSignature,
        rexNode,
        druidExpressions -> {
          final DruidExpression fromIndexExpression;
          if (druidExpressions.size() > 2) {
            fromIndexExpression = DruidExpression.fromExpression(
                StringUtils.format("(%s - 1)", druidExpressions.get(2).getExpression())
            );
          } else {
            fromIndexExpression = ZERO;
          }

          return DruidExpression.fromExpression(
              StringUtils.format(
                  "(%s + 1)",
                  DruidExpression.functionCall(
                      "strpos",
                      ImmutableList.of(druidExpressions.get(1), druidExpressions.get(0), fromIndexExpression)
                  )
              )
          );
        }
    );
  }
}
