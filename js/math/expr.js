/* ============================================================
 * mathviz/js/math/expr.js
 * 数学表达式：分词 / 语法分析 / 求值（不使用 eval）
 * ============================================================ */
(function (global) {
  'use strict';
  var MV = (global.MV = global.MV || {});

  var FUNCS = {
    sin: Math.sin, cos: Math.cos, tan: Math.tan,
    cot: function (x) { return 1 / Math.tan(x); },
    sec: function (x) { return 1 / Math.cos(x); },
    csc: function (x) { return 1 / Math.sin(x); },
    asin: Math.asin, acos: Math.acos, atan: Math.atan,
    arcsin: Math.asin, arccos: Math.acos, arctan: Math.atan,
    sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh,
    sqrt: Math.sqrt, cbrt: Math.cbrt, abs: Math.abs, exp: Math.exp,
    ln: Math.log, log: Math.log10, lg: Math.log10, log2: Math.log2, log10: Math.log10,
    floor: Math.floor, ceil: Math.ceil, round: Math.round, sign: Math.sign,
    max: Math.max, min: Math.min, pow: Math.pow, atan2: Math.atan2,
    mod: function (a, b) { return a % b; }
  };

  var CONSTS = {
    pi: Math.PI, PI: Math.PI, e: Math.E, tau: Math.PI * 2, inf: Infinity, infinity: Infinity
  };

  /* ---------- 预处理：把常见的中文/全角/数学符号统一成 ASCII ---------- */
  function normalize(src) {
    var s = String(src == null ? '' : src);
    var map = {
      '×': '*', '✕': '*', '✖': '*', '·': '*', '∙': '*', '⋅': '*', '＊': '*',
      '÷': '/', '／': '/', '−': '-', '–': '-', '—': '-', '－': '-', '＋': '+',
      '（': '(', '）': ')', '，': ',', '、': ',', '。': '.', '．': '.',
      '［': '[', '］': ']', '｛': '{', '｝': '}', '：': ':',
      '²': '^2', '³': '^3', '⁴': '^4', '⁰': '^0', '¹': '^1',
      'π': 'pi', 'Π': 'pi', 'τ': 'tau', 'θ': 'theta', 'α': 'alpha', 'β': 'beta',
      'γ': 'gamma', 'Δ': 'Delta', '∞': 'infinity',
      '√': '√', '∛': 'cbrt', '≤': '<=', '≥': '>=', '≠': '!=', '＝': '=', '≈': '~'
    };
    var out = '';
    for (var i = 0; i < s.length; i++) {
      var ch = s[i];
      out += (map[ch] !== undefined ? map[ch] : ch);
    }
    return out;
  }

  /* ---------- 分词 ---------- */
  var TOKEN_RE = new RegExp([
    '(\\d+(?:\\.\\d+)?(?:[eE][+-]?\\d+)?)',   // 1: 数字
    '([A-Za-z_][A-Za-z_0-9]*)',               // 2: 标识符
    '(\\*\\*|[-+*/%^(),])',                    // 3: 运算符
    '(√)',                                     // 4: 根号
    '(\\s+)'                                   // 5: 空白
  ].join('|'), 'g');

  function tokenize(src) {
    var s = normalize(src);
    var toks = [], m;
    TOKEN_RE.lastIndex = 0;
    var lastIndex = 0;
    while ((m = TOKEN_RE.exec(s)) !== null) {
      if (m.index !== lastIndex) {
        throw new SyntaxError('无法识别的字符“' + s.slice(lastIndex, m.index) + '”');
      }
      lastIndex = TOKEN_RE.lastIndex;
      if (m[1] !== undefined) toks.push({ type: 'num', value: parseFloat(m[1]) });
      else if (m[2] !== undefined) toks.push({ type: 'name', value: m[2] });
      else if (m[3] !== undefined) toks.push({ type: 'op', value: m[3] === '**' ? '^' : m[3] });
      else if (m[4] !== undefined) toks.push({ type: 'sqrt', value: '√' });
      /* 空白忽略 */
    }
    if (lastIndex !== s.length) {
      throw new SyntaxError('无法识别的字符“' + s.slice(lastIndex) + '”');
    }
    toks.push({ type: 'eof', value: '' });
    return toks;
  }

  /* ---------- 语法分析（Pratt / 优先级爬升） ---------- */
  function parse(src) {
    var toks = tokenize(src), i = 0;

    function peek(k) { return toks[i + (k || 0)]; }
    function next() { return toks[i++]; }
    function isOp(t, v) { return t.type === 'op' && (v === undefined || t.value === v); }
    function startsPrimary(t) {
      return t.type === 'num' || t.type === 'name' || t.type === 'sqrt' || isOp(t, '(');
    }

    function parseExpr(minBp) {
      var left = parseUnary();
      for (;;) {
        var t = peek(), op = null, bp = 0, implicit = false;
        if (isOp(t, '+') || isOp(t, '-')) { op = t.value; bp = 10; }
        else if (isOp(t, '*') || isOp(t, '/')) { op = t.value; bp = 20; }
        else if (isOp(t, '%')) { op = '%'; bp = 20; }
        else if (isOp(t, '^')) { op = '^'; bp = 30; }
        else if (startsPrimary(t)) { op = '*'; bp = 20; implicit = true; }
        else break;

        if (bp < minBp) break;
        if (!implicit) next();
        // 乘方右结合，其它左结合
        var nextMin = (op === '^') ? bp : bp + 1;
        var right = parseExpr(nextMin);
        left = { t: 'bin', op: op, l: left, r: right };
      }
      return left;
    }

    function parseUnary() {
      var t = peek();
      if (isOp(t, '-') || isOp(t, '+')) {
        next();
        var v = parseExpr(25);
        return t.value === '-' ? { t: 'neg', v: v } : v;
      }
      return parsePrimary();
    }

    // 函数参数（允许省略括号：sin x、√3 等）
    function parseFuncArg(tight) {
      var arg = parseExpr(tight ? 21 : 21);
      // 省略括号时把紧随其后的因子也吃进参数：sin 2x => sin(2x)
      while (startsPrimary(peek()) && !(peek().type === 'name' && isOp(toks[i + 1] || {}, '('))) {
        var f = parsePrimary();
        arg = { t: 'bin', op: '*', l: arg, r: f };
      }
      return arg;
    }

    function parsePrimary() {
      var t = next();
      if (t.type === 'num') return { t: 'num', v: t.value };
      if (t.type === 'sqrt') return { t: 'call', name: 'sqrt', args: [parseFuncArg(true)] };
      if (t.type === 'name') {
        var name = t.value;
        if (isOp(peek(), '(')) {
          next();
          var args = [];
          if (!isOp(peek(), ')')) {
            for (;;) {
              args.push(parseExpr(0));
              if (isOp(peek(), ',')) { next(); continue; }
              break;
            }
          }
          if (!isOp(peek(), ')')) throw new SyntaxError('缺少右括号');
          next();
          if (!FUNCS[name]) throw new SyntaxError('未知函数“' + name + '”');
          return { t: 'call', name: name, args: args };
        }
        if (FUNCS[name]) return { t: 'call', name: name, args: [parseFuncArg()] };
        if (CONSTS[name] !== undefined) return { t: 'num', v: CONSTS[name] };
        return { t: 'var', name: name };
      }
      if (isOp(t, '(')) {
        var e = parseExpr(0);
        if (!isOp(peek(), ')')) throw new SyntaxError('缺少右括号');
        next();
        return e;
      }
      throw new SyntaxError('表达式不完整或有多余符号：' + (t.value || '末尾'));
    }

    var ast = parseExpr(0);
    if (peek().type !== 'eof') throw new SyntaxError('表达式有多余内容：' + peek().value);
    return ast;
  }

  /* ---------- 求值 ---------- */
  function evaluate(node, scope) {
    scope = scope || {};
    switch (node.t) {
      case 'num': return node.v;
      case 'var': {
        if (Object.prototype.hasOwnProperty.call(scope, node.name)) return scope[node.name];
        if (CONSTS[node.name] !== undefined) return CONSTS[node.name];
        throw new ReferenceError('未知变量“' + node.name + '”');
      }
      case 'neg': return -evaluate(node.v, scope);
      case 'bin': {
        var a = evaluate(node.l, scope), b = evaluate(node.r, scope);
        switch (node.op) {
          case '+': return a + b;
          case '-': return a - b;
          case '*': return a * b;
          case '/': return a / b;
          case '%': return a % b;
          case '^': return Math.pow(a, b);
        }
        throw new SyntaxError('未知运算符 ' + node.op);
      }
      case 'call': {
        var f = FUNCS[node.name];
        var args = node.args.map(function (x) { return evaluate(x, scope); });
        return f.apply(null, args);
      }
    }
    throw new SyntaxError('未知节点 ' + node.t);
  }

  /* ---------- 变量收集 ---------- */
  function vars(node, bag) {
    bag = bag || {};
    if (node.t === 'var') bag[node.name] = true;
    else if (node.t === 'neg') vars(node.v, bag);
    else if (node.t === 'bin') { vars(node.l, bag); vars(node.r, bag); }
    else if (node.t === 'call') node.args.forEach(function (a) { vars(a, bag); });
    return bag;
  }

  /* ---------- 便捷接口 ---------- */
  function compile(src) {
    var ast = parse(src);
    return function (scope) { return evaluate(ast, scope); };
  }
  // 一元函数：f(x)
  function fn1(src, varName) {
    var v = varName || 'x';
    var ast = parse(src);
    return function (x) {
      var s = {}; s[v] = x;
      return evaluate(ast, s);
    };
  }
  function varNames(src) {
    return Object.keys(vars(parse(src), {}));
  }

  MV.Expr = {
    parse: parse,
    evaluate: evaluate,
    compile: compile,
    fn1: fn1,
    varNames: varNames,
    normalize: normalize,
    tokenize: tokenize,
    FUNCS: FUNCS,
    CONSTS: CONSTS
  };
})(typeof window !== 'undefined' ? window : globalThis);
