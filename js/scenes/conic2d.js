/* ============================================================
 * mathviz/js/scenes/conic2d.js
 * 圆锥曲线：椭圆 / 双曲线 / 抛物线（带焦点、准线、渐近线、离心率）
 * ============================================================ */
(function (global) {
  'use strict';
  var MV = (global.MV = global.MV || {});
  var G = MV.G, V = MV.G.V, PI = Math.PI;
  function n(v, d) { return G.fmt(v, d === undefined ? 4 : d); }

  function sceneOf(points, items, readouts, equations) {
    var sc = MV.Geo2D.scene(points, items);
    sc.grid = true; sc.axes = true;
    if (readouts) sc.readouts = readouts;
    if (equations) sc.equations = equations;
    return sc;
  }

  /* ---------------- 椭圆 x²/a² + y²/b² = 1（焦点在 x 轴，a>b>0） ---------------- */
  function ellipse(a, b) {
    if (b >= a) { var t = a; a = b; b = t; }   // 保证 a 是长半轴
    var c = Math.sqrt(Math.max(0, a * a - b * b));
    var e = c / a;
    var pts = [];
    for (var i = 0; i <= 360; i++) {
      var th = i / 360 * 2 * PI;
      pts.push([a * Math.cos(th), b * Math.sin(th)]);
    }
    var P = {
      O: [0, 0],
      A1: [-a, 0], A2: [a, 0], B1: [0, -b], B2: [0, b],
      F1: [-c, 0], F2: [c, 0],
      D1: [-a * a / c, -b], D2: [-a * a / c, b],
      D3: [a * a / c, -b], D4: [a * a / c, b]
    };
    var items = [
      { t: 'curve', pts: pts, color: '#c2410c', width: 2.4 },
      { t: 'segment', a: 'A1', b: 'A2', color: '#94a3b8', style: 'dashed', width: 1.4 },
      { t: 'segment', a: 'B1', b: 'B2', color: '#94a3b8', style: 'dashed', width: 1.4 },
      { t: 'segment', a: 'D1', b: 'D2', color: '#7c3aed', style: 'dotted', width: 1.4 },
      { t: 'segment', a: 'D3', b: 'D4', color: '#7c3aed', style: 'dotted', width: 1.4 },
      { t: 'point', at: 'F1', label: 'F₁', r: 3.4, color: '#dc2626', labelSize: 14 },
      { t: 'point', at: 'F2', label: 'F₂', r: 3.4, color: '#dc2626', labelSize: 14 },
      { t: 'point', at: 'A1', label: 'A₁', labelSize: 14, r: 3 },
      { t: 'point', at: 'A2', label: 'A₂', labelSize: 14, r: 3 },
      { t: 'point', at: 'B1', label: 'B₁', labelSize: 14, r: 3 },
      { t: 'point', at: 'B2', label: 'B₂', labelSize: 14, r: 3 },
      { t: 'point', at: 'O', label: 'O', labelSize: 14, r: 2.6 }
    ];
    items.push({ t: 'text', at: 'D2', text: '准线', dx: 0, dy: -14, size: 12, color: '#7c3aed' });
    var readouts = [
      { label: 'a（长半轴）', value: n(a, 4) },
      { label: 'b（短半轴）', value: n(b, 4) },
      { label: 'c = √(a²−b²)', value: n(c, 4) },
      { label: '离心率 e = c/a', value: n(e, 4) },
      { label: '焦点', value: '(±' + n(c, 3) + ', 0)' },
      { label: '准线', value: 'x = ±' + n(a * a / c, 4) },
      { label: '长轴长 2a', value: n(2 * a, 4) },
      { label: '短轴长 2b', value: n(2 * b, 4) }
    ];
    return sceneOf(P, items, readouts, ['x²/' + n(a * a, 4) + ' + y²/' + n(b * b, 4) + ' = 1']);
  }

  /* ---------------- 双曲线 x²/a² − y²/b² = 1 ---------------- */
  function hyperbola(a, b) {
    var c = Math.sqrt(a * a + b * b);
    var e = c / a;
    var upper = [], lower = [];
    for (var i = -180; i <= 180; i += 3) {
      var t = i / 60;                      // -3 .. 3
      var x = a * Math.cosh(t), y = b * Math.sinh(t);
      upper.push([x, y]); lower.push([-x, y]);
    }
    var T = Math.max(a, b) * 1.9;
    var P = {
      O: [0, 0],
      A1: [-a, 0], A2: [a, 0], F1: [-c, 0], F2: [c, 0],
      S1: [-T, -(b / a) * T], S2: [T, (b / a) * T],
      D1: [-a * a / c, -T], D2: [-a * a / c, T],
      D3: [a * a / c, -T], D4: [a * a / c, T]
    };
    var items = [
      { t: 'curve', pts: upper, color: '#c2410c', width: 2.4 },
      { t: 'curve', pts: lower, color: '#c2410c', width: 2.4 },
      { t: 'line', through: ['S1', 'S2'], color: '#94a3b8', style: 'dashed', width: 1.4 },
      { t: 'line', through: ['S1', 'O'], color: '#94a3b8', style: 'dashed', width: 1.4 },
      { t: 'segment', a: 'A1', b: 'A2', color: '#0e9f6e', width: 2 },
      { t: 'segment', a: 'D1', b: 'D2', color: '#7c3aed', style: 'dotted', width: 1.4 },
      { t: 'segment', a: 'D3', b: 'D4', color: '#7c3aed', style: 'dotted', width: 1.4 },
      { t: 'point', at: 'F1', label: 'F₁', r: 3.4, color: '#dc2626', labelSize: 14 },
      { t: 'point', at: 'F2', label: 'F₂', r: 3.4, color: '#dc2626', labelSize: 14 },
      { t: 'point', at: 'A1', label: 'A₁', labelSize: 14, r: 3 },
      { t: 'point', at: 'A2', label: 'A₂', labelSize: 14, r: 3 },
      { t: 'point', at: 'O', label: 'O', labelSize: 14, r: 2.6 }
    ];
    items.push({ t: 'text', at: 'S2', text: '渐近线', dx: -34, dy: -12, size: 12, color: '#64748b' });
    var readouts = [
      { label: 'a（实半轴）', value: n(a, 4) },
      { label: 'b（虚半轴）', value: n(b, 4) },
      { label: 'c = √(a²+b²)', value: n(c, 4) },
      { label: '离心率 e = c/a', value: n(e, 4) },
      { label: '焦点', value: '(±' + n(c, 3) + ', 0)' },
      { label: '渐近线', value: 'y = ±' + n(b / a, 4) + 'x' },
      { label: '准线', value: 'x = ±' + n(a * a / c, 4) },
      { label: '实轴长 2a', value: n(2 * a, 4) }
    ];
    return sceneOf(P, items, readouts, ['x²/' + n(a * a, 4) + ' − y²/' + n(b * b, 4) + ' = 1']);
  }

  /* ---------------- 抛物线 y² = 2px（p>0 开口向右） ---------------- */
  function parabola(p) {
    var T = Math.max(2 * p, 1.5);
    var yMax = T;
    var pts = [];
    for (var i = -60; i <= 60; i++) {
      var y = yMax * i / 60;
      pts.push([y * y / (2 * p), y]);
    }
    var yM = yMax * 0.62;
    var P = {
      O: [0, 0],
      F: [p / 2, 0],
      D1: [-p / 2, -yMax], D2: [-p / 2, yMax],
      M: [yM * yM / (2 * p), yM],      // 抛物线上的点
      MD: [-p / 2, yM]                 // 它到准线的垂足
    };
    var items = [
      { t: 'curve', pts: pts, color: '#c2410c', width: 2.4 },
      { t: 'segment', a: 'D1', b: 'D2', color: '#7c3aed', style: 'dashed', width: 1.6 },
      { t: 'segment', a: 'M', b: 'F', color: '#0e9f6e', width: 2, label: 'MF', labelSize: 12 },
      { t: 'segment', a: 'M', b: 'MD', color: '#0e9f6e', width: 2, style: 'dotted', label: 'd', labelSize: 12 },
      { t: 'angle', v: 'MD', p1: 'M', p2: [0, yM], right: true },
      { t: 'point', at: 'F', label: 'F', r: 3.4, color: '#dc2626', labelSize: 14 },
      { t: 'point', at: 'M', label: 'M', r: 3, color: '#0e9f6e', labelSize: 14 },
      { t: 'point', at: 'O', label: 'O', labelSize: 14, r: 2.6 }
    ];
    items.push({ t: 'text', at: 'D2', text: '准线', dx: -6, dy: -12, size: 12, color: '#7c3aed' });
    var readouts = [
      { label: 'p', value: n(p, 4) },
      { label: '焦点 F', value: '(' + n(p / 2, 4) + ', 0)' },
      { label: '准线', value: 'x = −' + n(p / 2, 4) },
      { label: '通径长 2p', value: n(2 * p, 4) },
      { label: '顶点', value: 'O(0, 0)' },
      { label: '离心率 e', value: '1' }
    ];
    return sceneOf(P, items, readouts, ['y² = ' + n(2 * p, 4) + 'x']);
  }

  MV.Conic2D = { ellipse: ellipse, hyperbola: hyperbola, parabola: parabola };
})(typeof window !== 'undefined' ? window : globalThis);
