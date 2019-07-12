Query =
  "SELECT"i _ selectParts:SelectParts _ from: From? _ InnerJoin: InnerJoin* _ where: Where? _ groupby: GroupBy? _ having:Having? _ orderBy: OrderBy? _ limit: Limit? _ unionAll:UnionAll? _";"?_{
    return {
      type: 'query',
      queryType: "SELECT",
      selectParts: selectParts,
      from: from,
      where: where,
      groupby: groupby,
      having: having,
      orderBy: orderBy,
      limit: limit,
      unionAll: unionAll
    }
   }
SelectParts =
  (SelectPart:SelectPart)+

SelectPart =
  _  !"FROM"  "("? distinct:"DISTINCT"i? _ selectPart:(!"AS" (Case/Variable/Function/Constant/star)) ")"?_ alias:alias?","? {
    return{
      type: "selectPart",
      distinct: distinct ? true : false,
      expr: selectPart,
      alias: alias
    }
  }

From =
	 "FROM" _ "("? value:(Query/table) ")"?_ {
    	return {
        	type: 'From',
            value: value
        }
    }
InnerJoin =
	"INNER JOIN"i _ table:table _ "ON"i _ expr: (Expression/BinaryExpression){
    	return{
        type: 'InnerJoin',
        table: table,
        on: expr
        }
    }
Where =
	"WHERE"i _ binaryExpression: (BinaryExpression/Expression) {
    	return binaryExpression
    }

GroupBy =
	"GROUP BY"i _ value:(Integer/Variable/Constant)+ {
    	return value
     }
Having =
	"HAVING" _ expr:(Expression/BinaryExpression) _ {
    	return expr
        }
OrderBy =
	"ORDER BY"i _ orderByParts:(OrderByPart)+ {
    	return orderByParts
     }

OrderByPart =
	expr:(Function/Variable/Constant)+ _ direction:("DESC"/"ASC")?","? _ {
    	return {
          type: "orderByPart",
          expr: expr,
          direction: direction
        }
    }

Limit =
	"LIMIT"i _ value: Integer{
      return {
          value
      }
    }
UnionAll =
	"UNION ALL"i _ newQuery: Query {
    	return newQuery
    }

Case =
	"("? _ "CASE" _ caseValue:(!"WHEN"( Variable/Constant))? _ whenClause: whenClause+ _ "ELSE"i? _ elseValue:(Integer/BinaryExpression/Expression)? _ "END"? ")"? _{
    return {
    type: "case",
    caseValue: caseValue,
    when: whenClause,
    ElseValue: elseValue

    }
    }

whenClause =
	_ "WHEN"i _ when:(BinaryExpression/Expression/Variable/Constant/Integer) _  "THEN"i _ then:(!"ELSE"i(Integer/Case/BinaryExpression/Expression/Variable)){
    	return {
        	when: when,
            then: then
        }
    }

BinaryExpression =
	"("?lhs:(!BinaryOperator (Expression/Function/TimeStamp/Variable/Constant/Integer))? _ BinaryOperator: BinaryOperator _ rhs: (BinaryExpression/Function/TimeStamp/Expression/Variable/Constant/Integer)")"?{
    	return {
        	type: "binaryExpression",
            operator: BinaryOperator,
            lhs: lhs,
            rhs: rhs
        }
    }

Expression =
	lhs:(Function/TimeStamp/Variable/Constant/Integer) _ operator: Operator _ rhs: (Function/TimeStamp/Interval/Variable/Constant/Integer){
    	return {
        	type: "Expression",
            operator: operator,
            lhs: lhs,
            rhs: rhs
        }
    }

Function = functionCall:Functions "(" distinct:"DISTINCT"i? argument:([^()]+)")"{
  return {
    type: "function",
    distinct: distinct ? true : false,
    functionCall: functionCall,
    arguments: Array.isArray(argument) ? argument.join("") : argument
  }
}

Variable =
  ("\""/"\'")value:([a-zA-Z_0-9]+)("\""/"\'") {
    return {
      type: "variable",
      value: value.join("")
    }
  }

Constant =
	value: ([a-zA-Z_]+) {
    return {
      type: "Constant",
      value: value.join("")
    }
  }

Integer =
	value:([0-9]+){
    return {
      type: "Integer",
      value: value.join("")
    }
  }

TimeStamp =
	"TIMESTAMP"i _ "\'"timeStamp:[0-9" ":-]+"\'"{
    	return{
        	type: "timestamp",
            value: timeStamp.join("")
            }
        }

Operator =
	"+"/
    "-"/
    "/"/
    "*"/
    "="

Interval =
	"INTERVAL"i _ value: ("/'"([0-9]+)"/'"/Variable) _ constant: Constant {
    	return {
        	type: "interval",
            value: value,
            constant: constant
        }
    }

alias =
	"AS"i _ "\""?value:[a-zA-Z_]+"\""? {
    	return value.join("");
	}
Functions =
   "MIN"i
  /"MAX"i
  /"COUNT"i
  /"AVG"i
  /"SUM"i
  /"APPROX_COUNT_DISTINCT"i
  /"APPROX_COUNT_DISTINCT_DS_THETA"i
  /"APPROX_QUANTILE"i
  /"APPROX_QUANTILE_DS"i
  /"APPROX_QUANTILE_FIXED_BUCKETS"i
  /"BLOOM_FILTER"i
  /"ABS"i
  /"CEIL"i
  /"EXP"i
  /"FLOOR"i
  /"LN"i
  /"LOG10"i
  /"POWER"i
  /"SQRT"i
  /"TRUNCATE"i
  /"TRUNCATE"i
  /"TRUNCATE"i
  /"MOD"i
  /"SIN"i
  /"COS"i
  /"TAN"i
  /"COT"i
  /"ASIN"i
  /"ACOS"i
  /"ATAN"i
  /"DEGREES"i
  /"RADIANS"i
  /"CONCAT"i
  /"TEXTCAT"i
  /"STRING_FORMAT"i
  /"LENGTH"i
  /"CHAR_LENGTH"i
  /"STRLEN"i
  /"LOOKUP"i
  /"LOWER"i
  /"PARSE_LONG"i
  /"POSITION"i
  /"REGEXP_EXTRACT"i
  /"REPLACE"i
  /"STRPOS"i
  /"SUBSTRING"i
  /"RIGHT"i
  /"LEFT"i
  /"SUBSTR"i
  /"TRIM"i
  /"BTRIM"i
  /"LTRIM"i
  /"RTRIM"i
  /"UPPER"i
  /"REVERSE"i
  /"REPEAT"i
  /"LPAD"i
  /"RPAD"i
  /"CAST"i
  /"NULLIF"i
  /"COALESCE"i
  /"BLOOM_FILTER_TEST"i
  /"DATE_TRUNC"i
  /"TIME_FLOOR"i
  /"TIME_SHIFT"i
  /"TIME_EXTRACT"i
  /"TIME_PARSE"i
  /"TIME_FORMAT"i
  /"MILLIS_TO_TIMESTAMP"i
  /"TIMESTAMPADD"i


BinaryOperator =
    ">="/
    ">"/
    "=<"/
    "="/
    "<"/
    "<>"/
    "BETWEEN "i/
    "NOT BETWEEN "i/
    "NOT LIKE "i/
    "LIKE"i/
    "IS NULL"i/
    "IS NOT NULL"i/
    "IS TRUE"i/
    "IS NOT TRUE"i/
    "IS FALSE"i/
    "IN"i/
    "NOT IN"i/
    "NOT IN"i/
    "OR "i/
    "AND "i/
    "NOT "i



_ "whitespace"
  = [ \t\n\r]*

table =
	_ schema:([a-zA-Z_]+ ".")?"\""? table:([a-zA-Z_])+"\""?{
    return {
    	type: 'table',
        schema: schema,
        table: table.join("")
    }
  }

star =
	"*" {
		return {
         type: "star",
        }
     }



SELECT
  "task_id", "type", "datasource", "created_time", "location", "duration", "error_msg",
  CASE WHEN "status" = 'RUNNING' THEN "runner_status" ELSE "status" END AS "status",
  (
    CASE WHEN "status" = 'RUNNING' THEN
     (CASE "runner_status" WHEN 'RUNNING' THEN 4 WHEN 'PENDING' THEN 3 ELSE 2 END)
    ELSE 1
    END
  ) AS "rank"
FROM sys.tasks
ORDER BY "rank" DESC, "created_time" DESC
