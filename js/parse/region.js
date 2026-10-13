/* ============================================================
 * mathviz/js/parse/region.js
 * 识别「平面区域 + 二重积分」类题目：
 *   D = {(x,y) | |x|+|y| ≤ 1}
 *   I₁ = ∬_D (2x² + tan(xy²))dxdy,  I₂ = …, I₃ = …
 *   选项 (A) I₃ > I₂ > I₁ …
 * 输出：区域图形（尺寸可拖）+ 各积分的数值 + 大小关系 + 自动匹配选项
 * ============================================================ */
(function (global) {
  'use strict';
  var MV = (global.MV = global.MV || {});
  var G = MV.G, P = MV.GenHelp.P, n = MV.GenHelp.n;

  /* 把 |expr| 变成 abs(expr) */
  function absify(s) {
    return String(s).replace(/\|([^|]+)\|/g, 'abs($1)');
  }

  /* 数学里 "xy" 表示 x·y，但表达式解析器会当成一个变量名 —— 这里拆开 */
  function splitVars(s) {
    return String(s).replace(/[A-Za-z]{2,}/g, function (w) {
      if (MV.Expr.FUNCS[w]) return w;
      if (MV.Expr.CONSTS[w] !== undefined) return w;
      if (/^[xy]+$/.test(w)) return w.split('').join('*');
      return w;
    });
  }

  /* 去掉最外层成对的括号 */
  function stripOuterParens(s) {
    s = String(s).trim();
    while (s[0] === '(' && s[s.length - 1] === ')') {
      var d = 0, ok = true;
      for (var i = 0; i < s.length; i++) {
        if (s[i] === '(') d++;
        else if (s[i] === ')') { d--; if (d === 0 && i < s.length - 1) { ok = false; break; } }
      }
      if (!ok) break;
      s = s.slice(1, -1).trim();
    }
    return s;
  }

  /* 机器可读形式（给表达式解析器用） */
  function cleanIntegrand(s) {
    return splitVars(absify(stripOuterParens(String(s)
      .replace(/[{}]/g, '')
      .replace(/\\[a-zA-Z]+/g, ' ')
      .replace(/[，。；、]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim())));
  }

  /* 显示用的漂亮形式（纯文本）：abs(xy) → |xy|，x^2 → x²，* → · */
  function prettyDisp(s) {
    return String(s)
      .replace(/abs\(([^()]*)\)/g, '|$1|')
      .replace(/\^2(?![0-9])/g, '²').replace(/\^3(?![0-9])/g, '³')
      .replace(/\s*\*\s*/g, '·')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function fn2(src) {
    var code = absify(src);
    var ast, vars;
    try { ast = MV.Expr.parse(code); vars = MV.Expr.varNames(code); } catch (e) { return null; }
    if (vars.some(function (v) { return v !== 'x' && v !== 'y'; })) return null;
    return function (x, y) { return MV.Expr.evaluate(ast, { x: x, y: y }); };
  }

  /* 把被积函数按加减号拆成若干「项」：奇偶性必须逐项判断 */
  function astStr(node) {
    if (!node) return '?';
    switch (node.t) {
      case 'num': return String(node.v);
      case 'var': return node.name;
      case 'neg': return '-' + astStr(node.v);
      case 'call': return node.name + '(' + node.args.map(astStr).join(', ') + ')';
      case 'bin':
        var l = astStr(node.l), r = astStr(node.r);
        if (node.op === '+' || node.op === '-') return l + ' ' + node.op + ' ' + r;
        if (node.op === '*') {
          if (/[+\-]/.test(l)) l = '(' + l + ')';
          if (/[+\-]/.test(r)) r = '(' + r + ')';
          return l + r;
        }
        if (node.op === '^') return l + '^' + r;
        return l + ' ' + node.op + ' ' + r;
    }
    return '?';
  }
  function termsOf(src) {
    var code = absify(src), ast;
    try { ast = MV.Expr.parse(code); } catch (e) { return null; }
    var out = [];
    (function walk(node, sign) {
      if (node.t === 'bin' && node.op === '+') { walk(node.l, sign); walk(node.r, sign); return; }
      if (node.t === 'bin' && node.op === '-') { walk(node.l, sign); walk(node.r, -sign); return; }
      out.push({
        sign: sign,
        str: (sign < 0 ? '-' : '') + prettyDisp(astStr(node)),
        fn: (function (nd, sg) {
          return function (x, y) { return sg * MV.Expr.evaluate(nd, { x: x, y: y }); };
        })(node, sign)
      });
    })(ast, 1);
    return out;
  }

  /* ---------------- 识别区域 D ---------------- */
  function parseRegion(s) {
    var m;
    // 菱形 |x| + |y| ≤ a
    m = s.match(/\|\s*x\s*\|\s*\+\s*\|\s*y\s*\|\s*(?:≤|<=|<)\s*(\d+(?:\.\d+)?)/);
    if (m) return MV.Region2D.diamond(parseFloat(m[1]));
    // 圆盘 x² + y² ≤ R² / R
    m = s.match(/x\s*\^?\s*2\s*\+\s*y\s*\^?\s*2\s*(?:≤|<=|<)\s*(\d+(?:\.\d+)?)\s*(\^?\s*2)?/);
    if (m) {
      var v = parseFloat(m[1]);
      return MV.Region2D.disk(m[2] ? v : Math.sqrt(v));
    }
    // 椭圆域 x²/A + y²/B ≤ 1
    m = s.match(/x\s*\^?\s*2\s*\/\s*(\d+(?:\.\d+)?)\s*\+\s*y\s*\^?\s*2\s*\/\s*(\d+(?:\.\d+)?)\s*(?:≤|<=|<)\s*1/);
    if (m) return MV.Region2D.ellipse(Math.sqrt(parseFloat(m[1])), Math.sqrt(parseFloat(m[2])));
    // 矩形 a ≤ x ≤ b, c ≤ y ≤ d
    var mx = s.match(/(-?\d+(?:\.\d+)?)\s*(?:≤|<=|<)\s*x\s*(?:≤|<=|<)\s*(-?\d+(?:\.\d+)?)/);
    var my = s.match(/(-?\d+(?:\.\d+)?)\s*(?:≤|<=|<)\s*y\s*(?:≤|<=|<)\s*(-?\d+(?:\.\d+)?)/);
    if (mx && my) return MV.Region2D.rect(parseFloat(mx[1]), parseFloat(mx[2]), parseFloat(my[1]), parseFloat(my[2]));
    return null;
  }

  /* ---------------- 识别各个积分 I_k = ∬_D (…) dxdy ---------------- */
  function parseIntegrals(s) {
    var out = [];
    var re = /([IⅠi]\s*[_^]?\s*\{?\s*(\d)\s*\}?)\s*=\s*(?:∬|∫∫|iint)\s*[_^]?\s*\{?\s*([A-Za-z])\s*\}?\s*([^=]*?)\s*d\s*x\s*d\s*y/g;
    var m;
    while ((m = re.exec(s)) !== null) {
      var disp = stripOuterParens(m[4]).replace(/\s+/g, ' ').trim();
      out.push({
        label: 'I' + m[2],
        tex: disp,
        plain: prettyDisp(disp),
        raw: m[0],
        integrand: cleanIntegrand(m[4])
      });
    }
    return out;
  }

  /* ---------------- 识别选项：(C) I₂ > I₁ > I₃ ---------------- */
  function parseOptions(s) {
    var out = [];
    var re = /\(\s*([A-Da-d])\s*\)\s*([^()]{0,80}?)(?=\(\s*[A-Da-d]\s*\)|$)/g;
    var m;
    while ((m = re.exec(s)) !== null) {
      var expr = m[2].trim().replace(/[，。;；]+$/, '');
      var labels = (expr.match(/I\s*[_^]?\s*\{?\s*(\d)\s*\}?/g) || []).map(function (t) {
        return 'I' + t.replace(/[^0-9]/g, '');
      });
      var ops = (expr.match(/[<>=≤≥]+/g) || []).map(function (o) {
        return o.replace(/≤/g, '<').replace(/≥/g, '>');
      });
      if (labels.length >= 2 && ops.length >= labels.length - 1) {
        out.push({ letter: m[1].toUpperCase(), labels: labels, ops: ops.slice(0, labels.length - 1), expr: expr });
      }
    }
    return out;
  }

  /* ---------------- 主入口 ---------------- */
  function tryRegion(s, raw) {
    if (!/(∬|∫∫|iint)/.test(s)) return null;
    var region = parseRegion(s);
    if (!region) return null;
    var integrals = parseIntegrals(s);
    if (!integrals.length) return null;
    var options = parseOptions(s);

    var integrands = integrals.map(function (it) {
      return { label: it.label, tex: it.tex, plain: it.plain, machine: it.integrand, fn: fn2(it.integrand) };
    });
    if (!integrands.some(function (i) { return i.fn; })) return null;

    // 参数：区域尺度（可拖）
    var params = [];
    if (region.type === 'diamond') params.push(P('a', '|x|+|y| ≤ a', 0.2, 4, 0.1, region.a));
    else if (region.type === 'disk') params.push(P('R', '圆盘半径 R', 0.2, 4, 0.1, region.R));
    else if (region.type === 'ellipse') {
      params.push(P('a', '半轴 a', 0.2, 4, 0.1, region.a));
      params.push(P('b', '半轴 b', 0.2, 4, 0.1, region.b));
    } else if (region.type === 'rect') {
      params.push(P('x1', 'x 上界', 0.2, 6, 0.1, region.x1));
      params.push(P('y1', 'y 上界', 0.2, 6, 0.1, region.y1));
    }

    function regionOf(v) {
      if (region.type === 'diamond') return MV.Region2D.diamond(v.a);
      if (region.type === 'disk') return MV.Region2D.disk(v.R);
      if (region.type === 'ellipse') return MV.Region2D.ellipse(v.a, v.b);
      if (region.type === 'rect') return MV.Region2D.rect(region.x0, v.x1, region.y0, v.y1);
      return region;
    }

    return {
      ok: true,
      kind: 'region',
      title: '二重积分 · 平面区域上的比较',
      params: params,
      notice: '识别为「平面区域上的二重积分」：图中是积分区域 D（滑块可改大小），下方给出各积分的数值与大小关系' +
        (options.length ? '，并自动匹配选项。' : '。'),
      build: function (v) {
        var reg = regionOf(v);
        var areaNum = MV.Region2D.area(reg, 300);
        var parts = [];
        integrands.forEach(function (it) {
          if (!it.fn) { parts.push({ label: it.label, value: NaN, sym: {}, tex: it.tex, plain: it.plain }); return; }
          var r = MV.Region2D.integrate(it.fn, reg, { rows: 220, scan: 96 });
          var terms = termsOf(it.machine);
          if (terms) {
            terms.forEach(function (t) { t.sym = MV.Region2D.symmetry(t.fn, reg); });
          }
          parts.push({
            label: it.label, value: r.value, tex: it.tex, plain: it.plain,
            terms: terms, sym: MV.Region2D.symmetry(it.fn, reg)
          });
        });
        var ok = parts.filter(function (p) { return Number.isFinite(p.value); });

        // 大小关系
        var sorted = ok.slice().sort(function (p, q) { return q.value - p.value; });
        var orderTxtEq = sorted.map(function (p, i) {
          if (i === 0) return p.label;
          var prev = sorted[i - 1];
          return (Math.abs(prev.value - p.value) < 1e-3 ? ' = ' : ' > ') + p.label;
        }).join('');

        // 匹配选项
        var matched = [];
        options.forEach(function (op) {
          var val = {};
          ok.forEach(function (p) { val[p.label] = p.value; });
          if (op.labels.some(function (L) { return val[L] === undefined; })) return;
          var good = true;
          for (var i = 0; i < op.ops.length; i++) {
            var a = val[op.labels[i]], b = val[op.labels[i + 1]];
            var tol = 1e-3 * Math.max(1, Math.abs(a), Math.abs(b));
            var o = op.ops[i];
            if (o === '>') { if (!(a > b + tol)) good = false; }
            else if (o === '<') { if (!(a < b - tol)) good = false; }
            else { if (Math.abs(a - b) > tol) good = false; }
          }
          if (good) matched.push(op.letter);
        });

        var readouts = [
          { label: '区域 D 面积（数值）', value: n(areaNum, 4) },
          { label: '面积公式 ' + region.areaFormula, value: n(reg.area, 4) }
        ].concat(ok.map(function (p) {
          return { label: p.label + ' = ∬_D (' + p.plain + ')dxdy', value: n(p.value, 5) };
        }));
        if (matched.length) readouts.push({ label: '匹配选项', value: matched.join('、') });

        var scene = MV.Region2D.scene(reg, {
          equations: [reg.desc, '大小关系：' + orderTxtEq],
          readouts: [{ label: '面积', value: n(areaNum, 3) }].concat(ok.map(function (p) {
            return { label: p.label, value: n(p.value, 4) };
          }))
        });

        var steps = [];
        steps.push({
          title: '第 1 步：画出积分区域 D，看它的对称性',
          body: '区域 $' + reg.desc.replace(/^D = /, '') + '$ 已经画在图上：它**关于 x 轴、y 轴、原点都对称**，' +
            '面积按公式为 $' + region.areaFormula + '=' + n(reg.area, 4) + '$（数值积分核对：$' + n(areaNum, 4) + '$）。' +
            '对称性正是解决这类比较题的关键。'
        });
        steps.push({
          title: '第 2 步：逐项用奇偶性，把会变成 0 的项划掉',
          body: '区域 $D$ 关于 $x$ 轴、$y$ 轴都对称，所以在它上面，被积函数中关于 $x$（或 $y$）为**奇函数**的项，二重积分一定是 $0$。' +
            '注意必须**逐项**判断 —— 一个和式整体看往往既不奇也不偶：\n' +
            parts.map(function (p) {
              if (!p.terms || !p.terms.length) return '';
              var kept = [], killed = [];
              p.terms.forEach(function (t) {
                if (t.sym.oddInX) killed.push(t.str + '（关于 $x$ 为奇函数）');
                else if (t.sym.oddInY) killed.push(t.str + '（关于 $y$ 为奇函数）');
                else kept.push(t.str);
              });
              var line = '$' + p.label + ' = ' + p.tex + '$：';
              if (killed.length) line += '其中 ' + killed.join('、') + '的积分为 $0$，直接消去；';
              else line += '各项都不是奇函数，消不掉；';
              line += kept.length
                ? '剩下 $' + kept.join(' + ') + '$ 需要算。'
                : '于是 $' + p.label + ' = 0$。';
              return line;
            }).filter(Boolean).join('\n')
        });
        steps.push({
          title: '第 3 步：把剩下的积分算出来（数值验证）',
          body: '在区域 $D$ 上做数值二重积分（逐行定出 x 区间 + 辛普森公式，纵向 220 行；边界用二分法精确到 $10^{-6}$）：\n' +
            ok.map(function (p) { return '$' + p.label + '\\approx' + n(p.value, 5) + '$'; }).join('，') + '。' +
            '这个精度足以判断大小关系。'
        });
        steps.push({
          title: '第 4 步：比较大小' + (options.length ? '并匹配选项' : ''),
          body: '按数值从大到小排列：$' + orderTxtEq + '$。' +
            (options.length
              ? (matched.length
                ? '把四个选项逐一对照，只有 **(' + matched.join(')、(') + ')** 与算出来的关系一致，所以选 **(' + matched.join('、') + ')**。'
                : '四个选项没有一个与算出来的关系完全一致，请检查题目是否抄错（特别是 $I_1,I_2,I_3$ 的表达式）。')
              : '')
        });
        if (options.length) {
          steps.push({
            title: '第 5 步：四个选项的逐个检验',
            body: options.map(function (op) {
              var val = {};
              ok.forEach(function (p) { val[p.label] = p.value; });
              var good = true;
              for (var i = 0; i < op.ops.length; i++) {
                var a = val[op.labels[i]], b = val[op.labels[i + 1]];
                if (a === undefined || b === undefined) { good = false; break; }
                var tol = 1e-3 * Math.max(1, Math.abs(a), Math.abs(b));
                var o = op.ops[i];
                var one = o === '>' ? (a > b + tol) : (o === '<' ? (a < b - tol) : (Math.abs(a - b) <= tol));
                if (!one) good = false;
              }
              return '(' + op.letter + ') $' + op.expr + '$ ' + (good ? '✅ 成立' : '❌ 不成立');
            }).join('\n')
          });
        }

        return {
          statement: '设区域 $' + reg.desc.replace(/^D = /, '') + '$，记 ' +
            integrands.map(function (it) {
              return '$' + it.label + '=\\iint\\limits_D \\left(' + it.tex + '\\right)\\,dx\\,dy$';
            }).join('，') + '，比较 $' + ok.map(function (p) { return p.label; }).join('、') + '$ 的大小。',
          steps: steps,
          answer: '$' + orderTxtEq + '$' + (matched.length ? '，因此选 **(' + matched.join(')、(') + ')**。' : '。'),
          scene: scene,
          readouts: readouts
        };
      }
    };
  }

  MV.RegionParser = {
    try: tryRegion, parseRegion: parseRegion, parseIntegrals: parseIntegrals,
    parseOptions: parseOptions, prettyDisp: prettyDisp
  };
})(typeof window !== 'undefined' ? window : globalThis);
