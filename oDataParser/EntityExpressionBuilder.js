﻿$data.Class.define('$data.oDataParser.EntityExpressionBuilder', null, null, {
    constructor: function (scopeContext) {
        Guard.requireValue("scopeContext", scopeContext);
        this.scopeContext = scopeContext;
        this.lambdaTypes = [];

    },
    supportedParameters: {
        value: [
            { name: 'expand', expType: $data.Expressions.IncludeExpression },
            { name: 'filter', expType: $data.Expressions.FilterExpression },
            { name: 'orderby', expType: $data.Expressions.OrderExpression },
            { name: 'skip', expType: $data.Expressions.PagingExpression },
            { name: 'top', expType: $data.Expressions.PagingExpression },
            { name: 'select', expType: $data.Expressions.ProjectionExpression },
            { name: 'count', expType: $data.Expressions.CountExpression }
        ]
    },
    buildExpression: function (queryParams) {
        ///<param name="queryParams" type="Object">{ filter: expression, orderby: [{}], entitySetName: string}</param>

        var req = new $data.oDataParser.QueryRequest();
        $data.typeSystem.extend(req, queryParams);
        var parser = new $data.oDataParser.RequestParser();
        parser.parse(req);

        var expression = this.createRootExpression(queryParams.entitySetName);
        this.lambdaTypes.push(expression);

        for (var i = 0; i < this.supportedParameters.length; i++) {
            var paramName = this.supportedParameters[i].name;
            var funcName = paramName + 'Converter';
            if (typeof this[funcName] === 'function' && req[paramName]) {
                expression = this[funcName].call(this, req[paramName], expression);
            }
        }

        if (queryParams.count === true) {
            expression = new $data.Expressions.CountExpression(expression);
        } else {
            expression = new $data.Expressions.ToArrayExpression(expression);
        }

        return expression;
    },
    createRootExpression: function (setName) {
        var ec = Container.createEntityContextExpression(this.scopeContext);
        var memberdef = this.scopeContext.getType().getMemberDefinition(setName);
        var es = Container.createEntitySetExpression(ec,
            Container.createMemberInfoExpression(memberdef), null,
            this.scopeContext[setName]);

        return es;
    },
    filterConverter: function (expr, rootExpr) {
        var converter = new $data.Expressions.CodeToEntityConverter(this.scopeContext);
        var entityExpressionTree = converter.Visit(expr, { queryParameters: [], lambdaParameters: this.lambdaTypes });

        var pqExp = Container.createParametricQueryExpression(entityExpressionTree, converter.parameters);
        var expression = new $data.Expressions.FilterExpression(rootExpr, pqExp);
        return expression;
    },
    orderbyConverter: function (exprObjArray, rootExpr) {
        var converter = new $data.Expressions.CodeToEntityConverter(this.scopeContext);

        for (var i = 0; i < exprObjArray.length; i++) {
            var expConf = exprObjArray[i];
            var entityExpressionTree = converter.Visit(expConf.expression, { queryParameters: [], lambdaParameters: this.lambdaTypes });

            var pqExp = Container.createParametricQueryExpression(entityExpressionTree, converter.parameters);
            rootExpr = new $data.Expressions.OrderExpression(rootExpr, pqExp, $data.Expressions.ExpressionType[expConf.nodeType]);
        }
        return rootExpr;
    },
    selectConverter: function (expr, rootExpr) {
        var converter = new $data.Expressions.CodeToEntityConverter(this.scopeContext);
        var entityExpressionTree = converter.Visit(expr, { queryParameters: [], lambdaParameters: this.lambdaTypes });

        var pqExp = Container.createParametricQueryExpression(entityExpressionTree, converter.parameters);
        var expression = new $data.Expressions.ProjectionExpression(rootExpr, pqExp);
        return expression;
    },
    skipConverter: function (expr, rootExpr) {
        var skipExp = new $data.Expressions.ConstantExpression(expr, 'number');
        var expression = new $data.Expressions.PagingExpression(rootExpr, skipExp, $data.Expressions.ExpressionType.Skip);
        return expression;
    },
    topConverter: function (expr, rootExpr) {
        var topExp = new $data.Expressions.ConstantExpression(expr, 'number');
        var expression = new $data.Expressions.PagingExpression(rootExpr, topExp, $data.Expressions.ExpressionType.Take);
        return expression;
    },
    expandConverter: function (exprObjArray, rootExpr) {
        for (var i = 0; i < exprObjArray.length; i++) {
            var expConf = exprObjArray[i];
            var expression = new $data.Expressions.IncludeExpression(rootExpr, expConf.expression, $data.Expressions.ExpressionType[expConf.nodeType]);
        }
        return expression;
    }
});