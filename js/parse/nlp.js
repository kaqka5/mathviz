/* ============================================================
 * mathviz/js/parse/nlp.js
 * 自定义题目解析：把用户输入的文字题目解析成
 * 「参数 + build(vals)」形式，与内置生成器完全同构，
 * 因此同样支持滑块实时调节、自动出解题过程与图形。
 * ============================================================ */
(function (global) {
  'use strict';
  var MV = (global.MV = global.MV || {});
  var G = MV.G, H = MV.GenHelp, P = H.P, n = H.n;
  var PI = Math.PI;

  /* ---------------- 文本规范化 ---------------- */
  function normalize(t) {
    var s = String(t || '');
    var map = {
      '，': ',', '。': '.', '：': ':', '；': ';', '、': ',', '（': '(', '）': ')',
      '＝': '=', '＋': '+', '－': '-', '－': '-', '×': '*', '÷': '/', '−': '-', '–': '-',
      '度': '°', 'π': 'pi', '²': '^2', '³': '^3', '∠': '∠', '△': '△',
      '｛': '{', '｝': '}', '［': '[', '］': ']', '　': ' '
    };
    var out = '';
    for (var i = 0; i < s.length; i++) out += (map[s[i]] !== undefined ? map[s[i]] : s[i]);
    return out.replace(/\s+/g, ' ').trim();
  }

  function stripTags(h) { return String(h).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(); }

  function note(text) { return '<div class="notice">' + text + '</div>'; }

  /* ---------------- 1. 立体几何 ---------------- */
  var SOLIDS = [
    { id: 'solid_cube', name: '正方体', re: /正方体|立方体/ },
    { id: 'solid_cuboid', name: '长方体', re: /长方体/ },
    { id: 'solid_prism', name: '正三棱柱', re: /正三棱柱|三棱柱/ },
    { id: 'solid_pyramid', name: '正四棱锥', re: /正四棱锥|四棱锥|正三棱锥|三棱锥|棱锥/ },
    { id: 'solid_tetra', name: '正四面体', re: /正四面体|四面体/ },
    { id: 'solid_cylinder', name: '圆柱', re: /圆柱/ },
    { id: 'solid_cone', name: '圆锥', re: /圆锥/ },
    { id: 'solid_sphere', name: '球', re: /球体|球的|球面|球/ }
  ];

  function num(re, s, group) {
    var m = s.match(re);
    if (!m) return undefined;
    var v = parseFloat(m[group || 1]);
    return Number.isFinite(v) ? v : undefined;
  }
  function letters(s) {
    var out = {};
    // 要求等号左边的字母前面不是数字/字母，避免把 "2R=2" 里的 R 当成参数
    var re = /(^|[^A-Za-z0-9])([a-zA-Z])\s*=\s*(-?\d+(?:\.\d+)?)/g, m;
    while ((m = re.exec(s)) !== null) out[m[2].toLowerCase()] = parseFloat(m[3]);
    return out;
  }

  /* 关键词命中：排除"外接球/内切球/外接圆柱"这类别的形体的附属 */
  function keywordHit(s, re) {
    var rx = new RegExp(re.source, 'g'), m;
    while ((m = rx.exec(s)) !== null) {
      var before = s.slice(Math.max(0, m.index - 2), m.index);
      if (/接|切/.test(before)) continue;
      return true;
    }
    return false;
  }

  function trySolid(s, raw) {
    var kind = null;
    for (var i = 0; i < SOLIDS.length; i++) {
      if (SOLIDS[i].re && keywordHit(s, SOLIDS[i].re)) { kind = SOLIDS[i]; break; }
    }
    if (!kind) return null;
    var L = letters(s);
    var found = {};
    var a = num(/(?:棱长|棱|边长|底边|边)\s*(?:为|是|=\s*)?\s*(\d+(?:\.\d+)?)/, s) ||
      num(/a\s*=\s*(\d+(?:\.\d+)?)/, s) || L.a;
    var r = num(/(?:底面)?半径\s*(?:为|是|=\s*)?\s*(\d+(?:\.\d+)?)/, s) || L.r;
    var h = num(/(?:侧棱长|侧棱|高)\s*(?:为|是|=\s*)?\s*(\d+(?:\.\d+)?)/, s) || L.h;
    var len = num(/长\s*(?:为|是|=\s*)?\s*(\d+(?:\.\d+)?)/, s) || L.a;
    var wid = num(/宽\s*(?:为|是|=\s*)?\s*(\d+(?:\.\d+)?)/, s) || L.b;
    var theta = num(/(?:二面角|侧面与底面所成角|所成角)\s*(?:为|是|=\s*)?\s*(\d+(?:\.\d+)?)/, s) || L.theta;
    var triple = s.match(/(\d+(?:\.\d+)?)\s*(?:[×*x]|,|,)\s*(\d+(?:\.\d+)?)\s*(?:[×*x]|,|,)\s*(\d+(?:\.\d+)?)/);

    if (kind.id === 'solid_cube' || kind.id === 'solid_tetra') { if (a !== undefined) found.a = a; }
    if (kind.id === 'solid_cuboid') {
      if (triple) { found.a = parseFloat(triple[1]); found.b = parseFloat(triple[2]); found.h = parseFloat(triple[3]); }
      else {
        if (len !== undefined) found.a = len;
        if (wid !== undefined) found.b = wid;
        if (h !== undefined) found.h = h;
      }
    }
    if (kind.id === 'solid_prism') {
      if (a !== undefined) found.a = a;
      if (h !== undefined) found.h = h;
    }
    if (kind.id === 'solid_pyramid') {
      if (a !== undefined) found.a = a;
      if (theta !== undefined) found.theta = theta;
    }
    if (kind.id === 'solid_cylinder' || kind.id === 'solid_cone') {
      if (r !== undefined) found.r = r;
      if (h !== undefined) found.h = h;
    }
    if (kind.id === 'solid_sphere') { if (r !== undefined) found.r = r; }

    var gen = MV.Generators.byId[kind.id];
    var params = gen.make(G.rngFrom(7));
    var used = [];
    params.forEach(function (p) {
      if (found[p.key] !== undefined) {
        p.value = Math.min(p.max, Math.max(p.min, found[p.key]));
        used.push(p.label + ' = ' + p.value + (p.unit || ''));
      }
    });
    return {
      ok: true,
      kind: 'solid',
      // 题目里没读到任何尺寸时，画出来的只是默认图形
      synthetic: used.length === 0,
      title: '立体几何 · ' + gen.name,
      params: params,
      notice: '识别为「' + gen.name + '」' + (used.length ? '，已按题目读取：' + used.join('、') : '，参数使用默认值，可拖动滑块调整') + '。',
      build: function (vals) {
        var res = gen.build(vals);
        var live = params.map(function (p) { return p.label + '=' + n(vals[p.key], 3) + (p.unit || ''); }).join('，');
        res.quote = raw;
        res.derived = '当前参数：' + live;
        return res;
      }
    };
  }

  /* ---------------- 2. 三角形 ---------------- */
  function tryTriangle(s, raw) {
    if (!/三角形|△/.test(s)) return null;
    var names = ['A', 'B', 'C'];
    var nm = s.match(/(?:三角形|△)\s*([A-Z])\s*([A-Z])\s*([A-Z])/);
    var renamed = '';
    if (nm) {
      names = [nm[1], nm[2], nm[3]];
      if (names.join('') !== 'ABC') renamed = '（已把 ' + names.join('、') + ' 依次对应为图中的 A、B、C）';
    }
    var idx = {}; names.forEach(function (L, i) { idx[L] = 'ABC'[i]; });

    var sideRaw = {}, angRaw = {};
    var re1 = /([A-Z])([A-Z])\s*=\s*(\d+(?:\.\d+)?)/g, m;
    while ((m = re1.exec(s)) !== null) {
      var p = idx[m[1]], q = idx[m[2]];
      if (!p || !q || p === q) continue;
      sideRaw[[p, q].sort().join('')] = parseFloat(m[3]);
    }
    var reLow = /\b([abc])\s*=\s*(\d+(?:\.\d+)?)/g;
    while ((m = reLow.exec(s)) !== null) {
      var map = { a: 'BC', b: 'CA', c: 'AB' };
      if (map[m[1]]) sideRaw[map[m[1]]] = parseFloat(m[2]);
    }
    var re2 = /[∠角]\s*([A-Z](?:[A-Z][A-Z])?)\s*=?\s*(\d+(?:\.\d+)?)/g;
    while ((m = re2.exec(s)) !== null) {
      var lettersIn = m[1];
      var v = parseFloat(m[2]);
      var vertex = lettersIn.length === 1 ? lettersIn : lettersIn[1];
      var canon = idx[vertex] || vertex;
      angRaw[canon] = v;
    }
    var S = { AB: sideRaw.AB, AC: sideRaw.AC, BC: sideRaw.BC };
    var A = { A: angRaw.A, B: angRaw.B, C: angRaw.C };
    var nSides = ['AB', 'AC', 'BC'].filter(function (k) { return S[k] !== undefined; }).length;
    var nAngles = ['A', 'B', 'C'].filter(function (k) { return A[k] !== undefined; }).length;

    var genId, vals = {}, mode, synthetic = false;
    if (nSides >= 3) {
      genId = 'tri_sss'; mode = '已知三边';
      vals = { a: S.BC, b: S.AC, c: S.AB };
    } else if (S.AB !== undefined && S.AC !== undefined && A.A !== undefined) {
      genId = 'tri_sas'; mode = '已知两边及夹角';
      vals = { A: A.A, b: S.AC, c: S.AB };
    } else if (nAngles >= 2 && nSides >= 1) {
      genId = 'tri_aas'; mode = '已知两角及一边';
      var known = ['A', 'B', 'C'].filter(function (k) { return A[k] !== undefined; });
      var a1 = known[0], a2 = known[1];
      var third = ['A', 'B', 'C'].filter(function (k) { return k !== a1 && k !== a2; })[0];
      var sideKeys = ['AB', 'AC', 'BC'].filter(function (k) { return S[k] !== undefined; });
      var sk = sideKeys[0] || 'AB';
      var opp = { AB: 'C', AC: 'B', BC: 'A' }[sk];   // 该边所对的角（原始标号）
      var sideVal = S[sk] !== undefined ? S[sk] : 6;
      var Zdeg = 180 - A[a1] - A[a2];                 // 第三个角
      var cVal = sideVal;
      if (opp !== third && Zdeg > 0) {
        cVal = sideVal * Math.sin(G.deg2rad(Zdeg)) / Math.sin(G.deg2rad(A[opp]));
      }
      vals = { A: A[a1], B: A[a2], c: cVal };
    } else if (nSides >= 1 && nAngles >= 1) {
      genId = 'tri_sas'; mode = '两边及夹角（条件不完整）'; synthetic = true;
      vals = {
        A: A.A !== undefined ? A.A : (A.B !== undefined ? A.B : (A.C !== undefined ? A.C : 60)),
        b: S.AC !== undefined ? S.AC : (S.BC !== undefined ? S.BC : 5),
        c: S.AB !== undefined ? S.AB : 6
      };
    } else {
      genId = 'tri_sas'; mode = '三角形（条件不足）'; synthetic = true;
      vals = {
        A: A.A !== undefined ? A.A : 60,
        b: S.AC !== undefined ? S.AC : 5,
        c: S.AB !== undefined ? S.AB : 6
      };
    }
    var gen = MV.Generators.byId[genId];
    var params = gen.make(G.rngFrom(11));
    params.forEach(function (p) {
      if (vals[p.key] !== undefined && Number.isFinite(vals[p.key])) {
        p.value = Math.min(p.max, Math.max(p.min, +vals[p.key].toFixed(4)));
      }
    });
    var conds = [];
    Object.keys(sideRaw).forEach(function (k) { conds.push(k + '=' + n(sideRaw[k])); });
    Object.keys(angRaw).forEach(function (k) { conds.push('∠' + k + '=' + n(angRaw[k]) + '°'); });
    return {
      ok: true,
      kind: 'triangle',
      synthetic: synthetic,
      title: '解三角形 · ' + mode,
      params: params,
      notice: '识别为「' + mode + '」' + (conds.length ? '，读到的条件：' + conds.join('、') : '') + renamed +
        '。拖动滑块可以改变条件，图形、解题过程与答案会同时更新。',
      build: function (v) {
        var res = gen.build(v);
        var live = params.map(function (p) { return p.label + '=' + n(v[p.key], 3) + (p.unit || ''); }).join('，');
        res.quote = raw;
        res.derived = '当前条件：' + live;
        return res;
      }
    };
  }

  /* 只识别到一个圆时：画圆本身（不再随便配一条直线） */
  function circleOnlyProblem(rv, raw) {
    var params = [P('r', '半径 r', 0.5, 14, 0.5, +rv.toFixed(4))];
    return {
      ok: true,
      kind: 'circle',
      title: '解析几何 · 圆',
      params: params,
      notice: '识别到圆的方程，滑块对应半径 r。把直线也写进题目里（例如：直线 y=2x+1），图形会自动画出交点、弦长与圆心距。',
      build: function (v) {
        var r = v.r;
        var scene = MV.Geo2D.scene({ O: [0, 0], X: [r, 0], Y: [0, r] }, [
          { t: 'circle', c: 'O', r: r, color: '#1f4e8c', width: 2.2 },
          { t: 'segment', a: 'O', b: 'X', color: '#0e9f6e', width: 2, label: 'r=' + G.fmt(r, 3), labelSize: 13 },
          { t: 'segment', a: 'O', b: 'Y', color: '#94a3b8', width: 1.6, style: 'dashed' },
          { t: 'point', at: 'O', label: 'O', labelSize: 15 },
          { t: 'point', at: 'X', label: 'A', labelSize: 14 },
          { t: 'point', at: 'Y', label: 'B', labelSize: 14 }
        ]);
        scene.grid = true; scene.axes = true;
        scene.equations = ['x² + y² = ' + G.fmt(r * r, 4)];
        var ro = [
          { label: '半径 r', value: G.fmt(r, 4) },
          { label: '周长 2πr', value: G.fmt(2 * Math.PI * r, 4) },
          { label: '面积 πr²', value: G.fmt(Math.PI * r * r, 4) },
          { label: '直径 2r', value: G.fmt(2 * r, 4) }
        ];
        scene.readouts = ro;
        return {
          quote: raw,
          statement: '圆 $C:\\ x^2+y^2=' + G.fmt(r * r, 4) + '$，它的圆心在原点 $O(0,0)$、半径为 $' + G.fmt(r, 4) + '$。',
          steps: [{
            title: '第 1 步：写出圆心与半径',
            body: '方程 $x^2+y^2=' + G.fmt(r * r, 4) + '$ 是圆的标准方程 $x^2+y^2=r^2$ 的形式，' +
              '所以圆心 $O(0,0)$，半径 $r=\\sqrt{' + G.fmt(r * r, 4) + '}=' + G.fmt(r, 4) + '$。'
          }, {
            title: '第 2 步：周长与面积',
            body: '周长 $C=2\\pi r=' + G.fmt(2 * Math.PI * r, 4) + '$，面积 $S=\\pi r^2=' + G.fmt(Math.PI * r * r, 4) + '$。'
          }, {
            title: '第 3 步：拖动半径看变化',
            body: '拖动滑块的半径 $r$，圆的周长按 $2\\pi r$ 线性增长，面积按 $\\pi r^2$ 平方增长：' +
              '半径变成 2 倍时，周长变 2 倍，面积变 4 倍。'
          }],
          answer: '圆心 $O(0,0)$，半径 $' + G.fmt(r, 4) + '$，周长 $\\approx' + G.fmt(2 * Math.PI * r, 4) +
            '$，面积 $\\approx' + G.fmt(Math.PI * r * r, 4) + '$。',
          scene: scene,
          readouts: ro
        };
      }
    };
  }

  /* ---------------- 3.5 圆锥曲线（椭圆 / 双曲线 / 抛物线） ---------------- */
  function tryConic(s, raw) {
    // 椭圆 / 双曲线：(x^2)/A ± (y^2)/B = 1（也兼容 x^2/A 的写法）
    var m = s.match(/\(?\s*x\s*\^\s*2\s*\)?\s*\/\s*\(?\s*(\d+(?:\.\d+)?)\s*\)?\s*([+\-−])\s*\(?\s*y\s*\^\s*2\s*\)?\s*\/\s*\(?\s*(\d+(?:\.\d+)?)\s*\)?\s*=\s*1/);
    if (m) {
      var A = parseFloat(m[1]), B = parseFloat(m[3]);
      var isHyper = (m[2] === '-' || m[2] === '−');
      var a = Math.sqrt(A), b = Math.sqrt(B);
      if (!(a > 0) || !(b > 0)) return null;
      if (isHyper) {
        var hp = [P('a', '实半轴 a', 0.5, 10, 0.5, +a.toFixed(4)), P('b', '虚半轴 b', 0.5, 10, 0.5, +b.toFixed(4))];
        return {
          ok: true, kind: 'hyperbola', title: '圆锥曲线 · 双曲线', params: hp,
          notice: '识别到双曲线方程，拖动实半轴/虚半轴滑块，焦点、渐近线、离心率会实时变化。',
          build: function (v) {
            var scene = MV.Conic2D.hyperbola(v.a, v.b);
            var c = Math.sqrt(v.a * v.a + v.b * v.b), e = c / v.a;
            return {
              quote: raw,
              statement: '双曲线 $\\frac{x^2}{' + n(v.a * v.a, 4) + '}-\\frac{y^2}{' + n(v.b * v.b, 4) + '}=1$。',
              steps: [{
                title: '第 1 步：读出 a、b',
                body: '标准方程为 $\\frac{x^2}{a^2}-\\frac{y^2}{b^2}=1$，所以 $a=' + n(v.a, 4) + '$，$b=' + n(v.b, 4) + '$。'
              }, {
                title: '第 2 步：求 c 与焦点',
                body: '双曲线满足 $c^2=a^2+b^2$，所以 $c=\\sqrt{' + n(v.a * v.a + v.b * v.b, 4) + '}\\approx' + n(c, 4) +
                  '$，焦点为 $F_1(-' + n(c, 4) + ',0)$、$F_2(' + n(c, 4) + ',0)$。'
              }, {
                title: '第 3 步：渐近线与离心率',
                body: '渐近线 $y=\\pm\\frac{b}{a}x=\\pm' + n(v.b / v.a, 4) + 'x$，离心率 $e=\\frac{c}{a}\\approx' + n(e, 4) +
                  '$（双曲线 $e>1$）。'
              }, {
                title: '第 4 步：拖动滑块看形状',
                body: '$b$ 越接近 $a$，渐近线越接近 $y=\\pm x$（等轴双曲线，此时 $e=\\sqrt{2}$）；$b$ 越大，开口越"张开"。'
              }],
              answer: '$a=' + n(v.a, 4) + '$，$b=' + n(v.b, 4) + '$，$c\\approx' + n(c, 4) + '$，$e\\approx' + n(e, 4) +
                '$，渐近线 $y=\\pm' + n(v.b / v.a, 4) + 'x$。',
              scene: scene, readouts: scene.readouts
            };
          }
        };
      }
      var ep = [P('a', '长半轴 a', 0.5, 10, 0.5, +a.toFixed(4)), P('b', '短半轴 b', 0.5, 10, 0.5, +b.toFixed(4))];
      return {
        ok: true, kind: 'ellipse', title: '圆锥曲线 · 椭圆', params: ep,
        notice: '识别到椭圆方程，拖动长/短半轴滑块，焦点、离心率、准线会实时变化。',
        build: function (v) {
          var aa = Math.max(v.a, v.b), bb = Math.min(v.a, v.b);
          var scene = MV.Conic2D.ellipse(aa, bb);
          var c = Math.sqrt(Math.max(0, aa * aa - bb * bb)), e = c / aa;
          return {
            quote: raw,
            statement: '椭圆 $\\frac{x^2}{' + n(aa * aa, 4) + '}+\\frac{y^2}{' + n(bb * bb, 4) + '}=1$。',
            steps: [{
              title: '第 1 步：读出 a、b',
              body: '标准方程 $\\frac{x^2}{a^2}+\\frac{y^2}{b^2}=1$（$a>b>0$，焦点在 x 轴），所以 $a=' + n(aa, 4) +
                '$，$b=' + n(bb, 4) + '$。'
            }, {
              title: '第 2 步：求 c 与焦点',
              body: '椭圆满足 $c^2=a^2-b^2$，所以 $c=\\sqrt{' + n(aa * aa, 4) + '-' + n(bb * bb, 4) + '}\\approx' + n(c, 4) +
                '$，焦点 $F_1(-' + n(c, 4) + ',0)$、$F_2(' + n(c, 4) + ',0)$。'
            }, {
              title: '第 3 步：离心率与准线',
              body: '离心率 $e=\\frac{c}{a}\\approx' + n(e, 4) + '$（$0<e<1$，$e$ 越接近 1 椭圆越扁）；' +
                '准线 $x=\\pm\\frac{a^2}{c}=\\pm' + n(aa * aa / c, 4) + '$。'
            }, {
              title: '第 4 步：拖动滑块看形状',
              body: '固定 $a$ 增大 $b$，椭圆越来越接近圆；当 $a=b$ 时 $c=0$、$e=0$，椭圆退化成圆。'
            }],
            answer: '$a=' + n(aa, 4) + '$，$b=' + n(bb, 4) + '$，$c\\approx' + n(c, 4) + '$，$e\\approx' + n(e, 4) + '$。',
            scene: scene, readouts: scene.readouts
          };
        }
      };
    }
    // 抛物线 y² = 2px
    var mp = s.match(/y\s*\^\s*2\s*=\s*(-?\d*\.?\d*)\s*[×*]?\s*\(?\s*(\d+(?:\.\d+)?)?\s*\)?\s*x/);
    if (mp) {
      var coef = mp[1] !== '' && mp[1] !== undefined ? parseFloat(mp[1]) : 1;
      if (mp[2]) coef = coef * parseFloat(mp[2]);
      if (!(coef > 0)) return null;
      var pv = coef / 2;
      var pp = [P('p', '焦准距 p', 0.5, 12, 0.5, +pv.toFixed(4))];
      return {
        ok: true, kind: 'parabola', title: '圆锥曲线 · 抛物线', params: pp,
        notice: '识别到抛物线方程，拖动 p 可以看到焦点、准线与开口大小的变化。',
        build: function (v) {
          var scene = MV.Conic2D.parabola(v.p);
          return {
            quote: raw,
            statement: '抛物线 $y^2=' + n(2 * v.p, 4) + 'x$。',
            steps: [{
              title: '第 1 步：化为标准形式',
              body: '把方程写成 $y^2=2px$，可得 $2p=' + n(2 * v.p, 4) + '$，所以 $p=' + n(v.p, 4) + '$，开口向右。'
            }, {
              title: '第 2 步：焦点与准线',
              body: '焦点 $F\\left(\\frac{p}{2},0\\right)=(' + n(v.p / 2, 4) + ',0)$，准线 $x=-\\frac{p}{2}=' + n(-v.p / 2, 4) + '$。'
            }, {
              title: '第 3 步：抛物线的定义',
              body: '抛物线上任意一点 $M$ 到焦点 $F$ 的距离等于它到准线的距离（图中绿色的 $MF$ 与 $d$），这就是抛物线的定义；' +
                '离心率恒为 $e=1$。'
            }, {
              title: '第 4 步：拖动滑块看变化',
              body: '$p$ 越大，焦点离顶点越远，抛物线开口越"宽"；$p$ 越小开口越"窄"。通径长为 $2p=' + n(2 * v.p, 4) + '$。'
            }],
            answer: '$p=' + n(v.p, 4) + '$，焦点 $(' + n(v.p / 2, 4) + ',0)$，准线 $x=' + n(-v.p / 2, 4) + '$。',
            scene: scene, readouts: scene.readouts
          };
        }
      };
    }
    return null;
  }

  /* ---------------- 3. 直线与圆 ---------------- */
  function tryCircleLine(s, raw) {
    var circle = s.match(/x\s*\^?2\s*\+\s*y\s*\^?2\s*=\s*(\d+(?:\.\d+)?)/);
    if (!circle) return null;
    var lineM = s.match(/y\s*=\s*(-?\d*(?:\.\d+)?)\s*x\s*([+-]\s*\d+(?:\.\d+)?)?/);

    var rv = Math.sqrt(parseFloat(circle[1]));
    if (!lineM) return circleOnlyProblem(rv, raw);
    var kv = 1, bv = 0, hasLine = false;
    hasLine = true;
    kv = lineM[1] === '' || lineM[1] === '-' ? (lineM[1] === '-' ? -1 : 1) : parseFloat(lineM[1]);
    bv = lineM[2] ? parseFloat(lineM[2].replace(/\s+/g, '')) : 0;
    var gen = MV.Generators.byId['line_circle'];
    var params = gen.make(G.rngFrom(5));
    params.forEach(function (p) {
      if (p.key === 'r') p.value = Math.min(p.max, Math.max(p.min, +rv.toFixed(4)));
      if (p.key === 'k' && hasLine) p.value = Math.min(p.max, Math.max(p.min, kv));
      if (p.key === 'b' && hasLine) p.value = Math.min(p.max, Math.max(p.min, bv));
    });
    return {
      ok: true,
      kind: 'circle-line',
      title: '解析几何 · 直线与圆',
      params: params,
      notice: hasLine ? '识别到圆与直线，滑块分别对应半径 r、斜率 k 与截距 b。'
        : '识别到圆的方程，可拖动半径滑块；也可以把直线也写进题目里（例如：直线 y=2x+1），图形会自动画出交点与弦。',
      build: function (v) {
        var res = gen.build(v);
        var live = 'r=' + n(v.r, 3) + '，直线 y=' + n(v.k, 3) + 'x' + (v.b >= 0 ? '+' : '') + n(v.b, 3);
        res.quote = raw;
        res.derived = '当前条件：' + live;
        return res;
      }
    };
  }

  /* ---------------- 4. 函数图像 ---------------- */
  /* 把表达式里的数字/字母换成可调参数 */
  function parameterize(src, opts) {
    opts = opts || {};
    var varName = opts.varName || 'x';
    var toks;
    try { toks = MV.Expr.tokenize(src); } catch (e) { return null; }
    var DEFAULTS = { a: 1, b: 1, c: 1, k: 1, m: 1, n: 1, w: 1, phi: 0, t: 1 };
    var params = [], pieces = [], pcount = 0, dupCount = {};
    var nums = toks.filter(function (t) { return t.type === 'num'; });
    var useNums = nums.length <= 4;
    // 标出所有"指数位置"的数字：x^(2) 里的 2 不该变成滑块
    var inExp = {};
    for (var ei = 0; ei < toks.length; ei++) {
      if (toks[ei].type === 'op' && toks[ei].value === '^') {
        var j = ei + 1;
        if (toks[j] && toks[j].type === 'op' && toks[j].value === '(') {
          var depth = 0;
          for (var k = j; k < toks.length; k++) {
            if (toks[k].type === 'op' && toks[k].value === '(') depth++;
            else if (toks[k].type === 'op' && toks[k].value === ')') { depth--; if (depth === 0) break; }
            inExp[k] = true;
          }
        } else if (toks[j]) inExp[j] = true;
      }
    }

    // 可参数化的数字（指数位置的不算）
    var usableNums = [];
    toks.forEach(function (t, i) {
      if (t.type === 'num' && !inExp[i]) usableNums.push(t.value);
    });

    toks.forEach(function (t, i) {
      if (t.type === 'eof') return;
      if (t.type === 'num') {
        if (useNums && !inExp[i]) {
          var key = 'p' + pcount++;
          dupCount[t.value] = (dupCount[t.value] || 0) + 1;
          var total = usableNums.filter(function (v) { return v === t.value; }).length;
          var label = '系数 ' + t.value + (total > 1 ? ' #' + dupCount[t.value] : '');
          var span = Math.max(2, Math.abs(t.value));
          params.push(P(key, label, t.value - span, t.value + span, 0.5, t.value));
          pieces.push('(' + key + ')');
        } else {
          pieces.push('(' + t.value + ')');
        }
        return;
      }
      if (t.type === 'name') {
        var nm = t.value;
        if (nm === varName || nm === 'pi' || nm === 'e' || MV.Expr.FUNCS[nm]) { pieces.push(nm); return; }
        if (nm === 'theta' || nm === 'θ') { pieces.push(nm); return; }
        var key2 = 'v_' + nm;
        if (!params.some(function (p) { return p.key === key2; })) {
          var def = DEFAULTS[nm.toLowerCase()] !== undefined ? DEFAULTS[nm.toLowerCase()] : 1;
          var lo = -5, hi = 5, st = 0.5;
          if (nm === 'w' || nm === 'ω') { lo = 0.25; hi = 4; st = 0.25; }
          if (nm === 'phi' || nm === 'φ') { lo = -3.2; hi = 3.2; st = 0.1; }
          params.push(P(key2, '参数 ' + nm, lo, hi, st, def));
        }
        pieces.push('(' + key2 + ')');
        return;
      }
      pieces.push(t.value);
    });
    return { src: pieces.join(' '), params: params };
  }

  /* 数值分析：零点、极值、单调区间 */
  function analyze(f, x0, x1, N) {
    N = N || 1200;
    var pts = [], i;
    for (i = 0; i <= N; i++) {
      var x = x0 + (x1 - x0) * i / N, y;
      try { y = f(x); } catch (e) { y = NaN; }
      pts.push([x, Number.isFinite(y) ? y : NaN]);
    }
    var zeros = [], ext = [];
    for (i = 1; i < pts.length; i++) {
      var p = pts[i - 1], q = pts[i];
      if (!Number.isFinite(p[1]) || !Number.isFinite(q[1])) continue;
      if (p[1] === 0) zeros.push(p[0]);
      else if (p[1] * q[1] < 0) {
        var lo = p[0], hi = q[0], flo = p[1];
        for (var k = 0; k < 60; k++) {
          var mid = (lo + hi) / 2, fm;
          try { fm = f(mid); } catch (e) { fm = NaN; }
          if (!Number.isFinite(fm)) break;
          if (flo * fm <= 0) { hi = mid; } else { lo = mid; flo = fm; }
        }
        zeros.push((lo + hi) / 2);
      }
      if (i > 1 && i < pts.length - 1) {
        var a = pts[i - 1], b = pts[i], c = pts[i + 1];
        if (Number.isFinite(a[1]) && Number.isFinite(b[1]) && Number.isFinite(c[1])) {
          if (b[1] > a[1] && b[1] >= c[1]) ext.push([b[0], b[1], '极大']);
          else if (b[1] < a[1] && b[1] <= c[1]) ext.push([b[0], b[1], '极小']);
        }
      }
    }
    // 单调区间（按极值点切分）
    var mono = [];
    var cuts = [x0].concat(ext.map(function (e) { return e[0]; })).concat([x1]);
    for (i = 0; i < cuts.length - 1; i++) {
      var m0 = cuts[i] + (cuts[i + 1] - cuts[i]) * 0.3, m1 = cuts[i] + (cuts[i + 1] - cuts[i]) * 0.7;
      var y0, y1;
      try { y0 = f(m0); y1 = f(m1); } catch (e) { continue; }
      if (!Number.isFinite(y0) || !Number.isFinite(y1)) continue;
      mono.push([cuts[i], cuts[i + 1], y1 > y0 ? '递增' : '递减']);
    }
    return { zeros: zeros, extrema: ext, mono: mono, pts: pts };
  }

  /* 自适应横轴范围：让图像把"有意思的部分"填满画布，
     避免 x^3 这类两端爆炸的函数被压成一条线 */
  function chooseXRange(f) {
    function maxAbs(R) {
      var m = 0;
      for (var i = 0; i <= 64; i++) {
        var x = -R + 2 * R * i / 64, y;
        try { y = f(x); } catch (e) { continue; }
        if (Number.isFinite(y)) m = Math.max(m, Math.abs(y));
      }
      return m;
    }
    var ref = 1;
    try {
      var y0 = f(0);
      if (Number.isFinite(y0)) ref = Math.max(1, Math.abs(y0));
    } catch (e) { }
    var R = 4;
    for (var k = 0; k < 9; k++) {
      if (maxAbs(R) <= 30 * ref) break;
      R *= 0.72;
      if (R <= 1) { R = 1; break; }
    }
    for (var j = 0; j < 3; j++) {
      if (maxAbs(R) > 1) break;
      R *= 1.8;
    }
    return Math.max(1, Math.round(R * 100) / 100);
  }

  /* 去掉从 AI 文本里带出来的中文尾巴与多余标点 */
  function cleanCurve(s) {
    return String(s || '')
      .replace(/[\u4e00-\u9fff][\s\S]*$/, '')
      .replace(/[，。；、）】]+$/, '')
      .replace(/^[\s:：=]+/, '')
      .trim();
  }

  function tryFunction(s, raw) {
    // 极坐标
    var pol = s.match(/\br\s*=\s*([^,;，；]+)/);
    var curves = [], m;
    // 支持 y=…、f(x)=…、y'=…、f'(x)=…
    var reY = /(?:y|f\s*['′]?\s*\(\s*x\s*\))\s*['′]?\s*=\s*([^,;，；=]+)/g;
    while ((m = reY.exec(s)) !== null) {
      var lhs = m[0].slice(0, m[0].indexOf('=')).replace(/\s+/g, '') || 'y';
      var src = cleanCurve(m[1]);
      if (src && /x/i.test(src)) curves.push({ src: src, lhs: lhs });
    }
    if (pol && /theta|θ/i.test(pol[1])) {
      var pr = parameterize(cleanCurve(pol[1]), { varName: 'theta' });
      if (pr) return polarProblem(pr, raw);
    }
    if (!curves.length) {
      var t = cleanCurve(s.replace(/^画(出)?(函数|图像)?[:：]?/, '').replace(/的图像|图像|图象|曲线/g, ''));
      if (t && /^[0-9xXa-zA-Z+\-*/^().,\s√]+$/.test(t) && /x/.test(t)) curves.push({ src: t, lhs: 'y' });
    }
    if (!curves.length) return null;

    var compiled = [], allParams = [], lhsList = [];
    curves.forEach(function (cv) {
      var pr2 = parameterize(cv.src, { varName: 'x' });
      if (!pr2) return;
      var vars;
      try { MV.Expr.parse(pr2.src); vars = MV.Expr.varNames(pr2.src); } catch (e) { return; }
      // 只保留"能画成函数"的式子：变量只能是 x、可调参数（p0…、v_*）
      var bad = vars.filter(function (v) { return !/^(p\d+|v_[A-Za-z]+|x|theta)$/.test(v); });
      if (bad.length) return;
      compiled.push(pr2.src);
      lhsList.push(cv.lhs);
      pr2.params.forEach(function (p) {
        if (!allParams.some(function (q) { return q.key === p.key; })) allParams.push(p);
      });
    });
    if (!compiled.length) return null;
    if (!allParams.length) allParams = [P('view', '显示半宽', 2, 20, 1, 8)];

    return {
      ok: true,
      kind: 'function',
      title: '函数图像',
      // 用于"同一个函数不要重复出图"的判重
      figSources: curves.map(function (c) {
        return c.src.replace(/\s+/g, '').replace(/[()]/g, '');
      }),
      params: allParams,
      notice: '识别为函数图像：' + curves.map(function (c, i) {
        return (c.lhs || 'y') + ' = ' + c.src;
      }).join('；') + '。数字与字母都已变成可拖动的参数。',
      build: function (vals) {
        var scene = { kind: '2d', grid: true, axes: true, points: {}, items: [] };
        var scope = {};
        allParams.forEach(function (p) { scope[p.key] = vals[p.key]; });
        var colors = ['#c2410c', '#1d4ed8', '#0e9f6e', '#7c3aed'];
        // 根据函数本身决定横轴范围
        var R = 0;
        compiled.forEach(function (src) {
          var g = MV.Expr.compile(src);
          var f = function (x) {
            var sc = {}; for (var k in scope) sc[k] = scope[k];
            sc.x = x;
            try { return g(sc); } catch (e) { return NaN; }
          };
          R = Math.max(R, chooseXRange(f));
        });
        if (!(R > 0)) R = 4;
        scene = MV.Graph2D.func({
          curves: compiled.map(function (src, i) {
            return { src: src, scope: scope, color: colors[i % colors.length], width: 2.4 };
          }),
          xRange: [-R, R]
        });
        var f0 = MV.Expr.compile(compiled[0]);
        var f = function (x) {
          var sc = {}; for (var k in scope) sc[k] = scope[k];
          sc.x = x;
          try { return f0(sc); } catch (e) { return NaN; }
        };
        var an = analyze(f, -R, R, 1200);
        var zeros = an.zeros.slice(0, 6), ext = an.extrema.slice(0, 6);
        scene.points = scene.points || {};
        zeros.forEach(function (z, i) {
          var key = 'Z' + i;
          scene.points[key] = [z, 0];
          scene.items.push({ t: 'point', at: key, label: n(z, 3), hollow: true, color: '#dc2626', labelSize: 12 });
        });
        ext.forEach(function (e, i) {
          var key = 'E' + i;
          scene.points[key] = [e[0], e[1]];
          scene.items.push({ t: 'point', at: key, label: e[2] + n(e[1], 3), hollow: true, color: '#0e9f6e', labelSize: 12 });
          scene.items.push({ t: 'segment', a: [e[0], 0], b: [e[0], e[1]], style: 'dotted', color: '#94a3b8', width: 1.2 });
        });
        scene.equations = compiled.map(function (c, i) { return (lhsList[i] || 'y') + ' = ' + curves[i].src; });
        var steps = [{
          title: '第 1 步：看清表达式',
          body: '函数式：' + curves.map(function (c, i) { return '$' + (c.lhs || 'y') + '=' + c.src.replace(/\s+/g, '') + '$'; }).join('，') +
            '。下面用 $x\\in[' + n(-R, 3) + ',' + n(R, 3) + ']$ 的取值描点连线得到图像。'
        }, {
          title: '第 2 步：函数值与特殊点（数值计算）',
          body: '在区间内取样 1200 个点计算结果并连线。' +
            (zeros.length ? '零点（$y=0$）的近似位置：' + zeros.map(function (z) { return '$x\\approx' + n(z, 4) + '$'; }).join('，') + '。'
              : '在 $[' + n(-R, 3) + ',' + n(R, 3) + ']$ 内没有发现零点。')
        }, {
          title: '第 3 步：极值与单调性（数值判断）',
          body: (ext.length ? ext.map(function (e) {
            return '在 $x\\approx' + n(e[0], 4) + '$ 处取得' + e[2] + '值 $y\\approx' + n(e[1], 4) + '$';
          }).join('；') + '。' : '在此区间内没有发现极值点。') +
            (an.mono.length ? '单调性：' + an.mono.slice(0, 4).map(function (mm) {
              return '在 $[' + n(mm[0], 3) + ',\\ ' + n(mm[1], 3) + ']$ 上单调' + mm[2];
            }).join('，') + '。' : '')
        }, {
          title: '第 4 步：图像特征',
          body: '拖动参数滑块可以看到函数式的系数变化如何影响图像：系数变大图像变陡，常数项让图像上下平移，' +
            '负号会让图像关于 x 轴翻折或开口反向。'
        }];
        var readouts = [];
        if (zeros.length) readouts.push({ label: '零点（前 6 个）', value: zeros.map(function (z) { return n(z, 3); }).join(', ') });
        if (ext.length) readouts.push({ label: '极值点', value: ext.map(function (e) { return e[2] + '(' + n(e[0], 2) + ', ' + n(e[1], 2) + ')'; }).join('; ') });
        return {
          quote: raw,
          derived: '当前函数：' + curves.map(function (c) { return (c.lhs || 'y') + ' = ' + c.src; }).join('；'),
          statement: '',
          steps: steps,
          answer: '图像见右侧；' + (zeros.length ? '零点约为 ' + zeros.map(function (z) { return n(z, 3); }).join('、') + '；' : '') +
            (ext.length ? '极值为 ' + ext.map(function (e) { return e[2] + ' ' + n(e[1], 3); }).join('、') + '。' : ''),
          scene: scene,
          readouts: readouts
        };
      }
    };
  }

  function polarProblem(pr, raw) {
    return {
      ok: true, kind: 'polar', title: '极坐标曲线', params: pr.params,
      figSources: [pr.src.replace(/\s+/g, '').replace(/[()]/g, '')],
      notice: '识别为极坐标方程 r = ' + pr.src + '。',
      build: function (vals) {
        var scope = {};
        pr.params.forEach(function (p) { scope[p.key] = vals[p.key]; });
        var rf = MV.Expr.compile(pr.src);
        var rmax = 1;
        for (var i = 0; i <= 360; i++) {
          var t = i / 360 * 2 * PI, rv;
          var sc = {}; for (var k in scope) sc[k] = scope[k];
          sc.theta = t;
          try { rv = Math.abs(rf(sc)); } catch (e) { rv = NaN; }
          if (Number.isFinite(rv)) rmax = Math.max(rmax, rv);
        }
        var R = Math.max(1, Math.ceil(rmax * 1.2 * 10) / 10);
        var scene = MV.Graph2D.func({
          polar: [{ src: pr.src, scope: scope, tMin: 0, tMax: 2 * PI, color: '#c2410c', width: 2.4 }],
          xRange: [-R, R], yRange: [-R, R]
        });
        var steps = [{
          title: '第 1 步：极坐标方程',
          body: '极坐标方程 $r=' + pr.src.replace(/\s+/g, '') + '$。作图时以极点为原点、极轴为 $x$ 轴，' +
            '对每个 $\\theta$ 算出 $r$，再按 $(x,y)=(r\\cos\\theta,\\ r\\sin\\theta)$ 描点连线。'
        }, {
          title: '第 2 步：r 可以为负',
          body: '当 $r<0$ 时，点画在角 $\\theta$ 的反向延长线上，这会让曲线自动补出对称的花瓣，这是极坐标作图与直角坐标作图最大的不同。'
        }, {
          title: '第 3 步：拖动参数看变化',
          body: '改变系数 $a$ 只改变图形大小；改变频率 $k$ 会改变花瓣数目与形状。'
        }];
        return {
          quote: raw,
          derived: '当前方程：r = ' + pr.src,
          statement: '',
          steps: steps,
          answer: '图像见右侧，拖动参数即可看到花瓣数量与形状的变化。',
          scene: scene,
          readouts: []
        };
      }
    };
  }

  /* ---------------- 总入口 ---------------- */
  function parse(text) {
    var raw = String(text || '').trim();
    if (!raw) return { ok: false, message: '请输入题目内容。' };
    var s = normalize(raw);
    var fns = [trySolid, tryTriangle, tryCircleLine, tryConic, tryFunction];
    for (var i = 0; i < fns.length; i++) {
      var r = null;
      try { r = fns[i](s, raw); } catch (e) { r = null; }
      if (r && r.ok) return r;
    }
    return {
      ok: false,
      message: '暂时没能从这段文字里识别出可以作图的数学结构。可以试试下面这些写法：\n' +
        '· 三角形：在△ABC中，AB=5，AC=7，∠A=60°\n' +
        '· 三边：△ABC的三边为 a=3，b=4，c=5\n' +
        '· 函数：y = 2sin(x) 或 y = x^2 - 2x + 1\n' +
        '· 极坐标：r = 3cos(3theta)\n' +
        '· 直线与圆：圆 x^2+y^2=25 与直线 y=2x+1\n' +
        '· 立体：正方体棱长为3、正四棱锥底面边长4，侧面与底面所成角60°、圆柱底面半径2高5、球半径3'
    };
  }

  MV.CustomParser = { parse: parse, normalize: normalize, analyze: analyze };
})(typeof window !== 'undefined' ? window : globalThis);
