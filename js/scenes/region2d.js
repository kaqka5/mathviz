/* ============================================================
 * mathviz/js/scenes/region2d.js
 * 平面区域（二重积分的积分区域）：
 *   菱形 |x|+|y|≤a、圆盘 x²+y²≤R²、椭圆域 x²/A+y²/B≤1、矩形 a≤x≤b,c≤y≤d
 *   附：区域内数值二重积分、被积项奇偶性判断
 * ============================================================ */
(function (global) {
  'use strict';
  var MV = (global.MV = global.MV || {});
  var G = MV.G, PI = Math.PI;
  function n(v, d) { return G.fmt(v, d === undefined ? 4 : d); }

  /* ---------------- 区域形状 ---------------- */
  function diamond(a) {
    return {
      type: 'diamond', name: '菱形', a: a,
      bbox: { x0: -a, x1: a, y0: -a, y1: a },
      inside: function (x, y) { return Math.abs(x) + Math.abs(y) <= a + 1e-12; },
      polygon: [[a, 0], [0, a], [-a, 0], [0, -a]],
      area: 2 * a * a,
      desc: 'D = {(x,y) | |x| + |y| ≤ ' + n(a, 3) + '}',
      areaFormula: '2a²'
    };
  }
  function disk(R) {
    var pts = [], N = 320;
    for (var i = 0; i < N; i++) {
      var t = i / N * 2 * PI;
      pts.push([R * Math.cos(t), R * Math.sin(t)]);
    }
    return {
      type: 'disk', name: '圆盘', R: R,
      bbox: { x0: -R, x1: R, y0: -R, y1: R },
      inside: function (x, y) { return x * x + y * y <= R * R + 1e-12; },
      polygon: pts, curve: true,
      area: PI * R * R,
      desc: 'D = {(x,y) | x² + y² ≤ ' + n(R * R, 4) + '}',
      areaFormula: 'πR²'
    };
  }
  function ellipseRegion(a, b) {
    var pts = [], N = 320;
    for (var i = 0; i < N; i++) {
      var t = i / N * 2 * PI;
      pts.push([a * Math.cos(t), b * Math.sin(t)]);
    }
    return {
      type: 'ellipse', name: '椭圆域', a: a, b: b,
      bbox: { x0: -a, x1: a, y0: -b, y1: b },
      inside: function (x, y) { return (x * x) / (a * a) + (y * y) / (b * b) <= 1 + 1e-12; },
      polygon: pts, curve: true,
      area: PI * a * b,
      desc: 'D = {(x,y) | x²/' + n(a * a, 4) + ' + y²/' + n(b * b, 4) + ' ≤ 1}',
      areaFormula: 'πab'
    };
  }
  function rect(x0, x1, y0, y1) {
    return {
      type: 'rect', name: '矩形', x0: x0, x1: x1, y0: y0, y1: y1,
      bbox: { x0: x0, x1: x1, y0: y0, y1: y1 },
      inside: function (x, y) { return x >= x0 - 1e-12 && x <= x1 + 1e-12 && y >= y0 - 1e-12 && y <= y1 + 1e-12; },
      polygon: [[x0, y0], [x1, y0], [x1, y1], [x0, y1]],
      area: (x1 - x0) * (y1 - y0),
      desc: 'D = {(x,y) | ' + n(x0, 3) + ' ≤ x ≤ ' + n(x1, 3) + ', ' + n(y0, 3) + ' ≤ y ≤ ' + n(y1, 3) + '}',
      areaFormula: '(b−a)(d−c)'
    };
  }

  /* ---------------- 区域上的二重积分 ----------------
   * 做法：逐行扫出区域内部的 x 区间（二分细化端点），再在每段上用辛普森公式
   * 对 x 积分、对 y 用中点法累加。对多项式/光滑函数精度远高于简单网格采样。
   */
  function bisectEdge(region, y, xa, xb, wantInsideRight) {
    for (var k = 0; k < 26; k++) {
      var m = (xa + xb) / 2;
      var ins = region.inside(m, y);
      if (wantInsideRight) { if (ins) xb = m; else xa = m; }
      else { if (ins) xa = m; else xb = m; }
    }
    return (xa + xb) / 2;
  }
  function simpsonX(fn, a, b, y, N) {
    if (!(b > a)) return 0;
    var h = (b - a) / N, s = 0;
    for (var i = 0; i <= N; i++) {
      var v = fn(a + i * h, y);
      if (!Number.isFinite(v)) v = 0;
      s += ((i === 0 || i === N) ? 1 : (i % 2 ? 4 : 2)) * v;
    }
    return s * h / 3;
  }
  function integrate(fn, region, opts) {
    opts = opts || {};
    var rows = opts.rows || 220;
    var K = opts.scan || 96;
    var bb = region.bbox;
    var dy = (bb.y1 - bb.y0) / rows;
    var dx = (bb.x1 - bb.x0) / K;
    var total = 0, runs = 0;
    for (var j = 0; j < rows; j++) {
      var y = bb.y0 + (j + 0.5) * dy;
      var segs = [], cur = null;
      for (var i = 0; i <= K; i++) {
        var x = bb.x0 + i * dx;
        if (region.inside(x, y)) {
          if (!cur) { cur = { i0: i, i1: i }; }
          else cur.i1 = i;
        } else if (cur) { segs.push(cur); cur = null; }
      }
      if (cur) segs.push(cur);
      var rowSum = 0;
      for (var s2 = 0; s2 < segs.length; s2++) {
        var r = segs[s2];
        var xl = (r.i0 <= 0) ? bb.x0 : bisectEdge(region, y, bb.x0 + (r.i0 - 1) * dx, bb.x0 + r.i0 * dx, true);
        var xr = (r.i1 >= K) ? bb.x1 : bisectEdge(region, y, bb.x0 + r.i1 * dx, bb.x0 + (r.i1 + 1) * dx, false);
        rowSum += simpsonX(fn, xl, xr, y, 24);
        runs++;
      }
      total += rowSum * dy;
    }
    return { value: total, rows: rows, runs: runs };
  }

  /* 区域面积（同一个积分器，被积函数取 1） */
  function area(region, N) {
    return integrate(function () { return 1; }, region, { rows: N || 400, scan: 128 }).value;
  }

  /* ---------------- 奇偶性数值判断（用来解释"奇函数积分为 0"） ---------------- */
  function symmetry(fn, region) {
    var bb = region.bbox;
    var R = G.rngFrom(20250808);
    var ok = { ox: true, oy: true, ex: true, ey: true }, cnt = 0;
    for (var k = 0; k < 500; k++) {
      var x = bb.x0 + (bb.x1 - bb.x0) * R();
      var y = bb.y0 + (bb.y1 - bb.y0) * R();
      if (!region.inside(x, y)) continue;
      if (!region.inside(-x, y)) { ok.ex = false; ok.ox = false; }
      if (!region.inside(x, -y)) { ok.ey = false; ok.oy = false; }
      var f = fn(x, y);
      if (!Number.isFinite(f) || Math.abs(f) < 1e-9) continue;
      cnt++;
      var fx = region.inside(-x, y) ? fn(-x, y) : NaN;
      var fy = region.inside(x, -y) ? fn(x, -y) : NaN;
      var tol = 1e-6 * Math.max(1, Math.abs(f));
      if (Number.isFinite(fx) && Math.abs(fx + f) > tol) ok.ox = false;
      if (Number.isFinite(fy) && Math.abs(fy + f) > tol) ok.oy = false;
      if (Number.isFinite(fx) && Math.abs(fx - f) > tol) ok.ex = false;
      if (Number.isFinite(fy) && Math.abs(fy - f) > tol) ok.ey = false;
    }
    return {
      oddInX: ok.ox && cnt > 5, oddInY: ok.oy && cnt > 5,
      evenInX: ok.ex && cnt > 5, evenInY: ok.ey && cnt > 5, tested: cnt
    };
  }

  /* ---------------- 画出区域 ---------------- */
  function scene(region, opts) {
    opts = opts || {};
    var bb = region.bbox;
    var pad = Math.max(bb.x1 - bb.x0, bb.y1 - bb.y0) * 0.35;
    var P = {
      O: [0, 0],
      D: [(bb.x0 + bb.x1) / 2, (bb.y0 + bb.y1) / 2 + (bb.y1 - bb.y0) * 0.12],
      RX: [bb.x1, 0], LX: [bb.x0, 0], TY: [0, bb.y1], BY: [0, bb.y0]
    };
    var items = [
      { t: 'polygon', pts: region.polygon, fill: 'rgba(64,132,220,0.18)',
        strokeColor: '#1f4e8c', width: 2.4 }
    ];
    // 对称轴
    items.push({ t: 'segment', a: 'LX', b: 'RX', color: '#94a3b8', style: 'dashed', width: 1.3 });
    items.push({ t: 'segment', a: 'BY', b: 'TY', color: '#94a3b8', style: 'dashed', width: 1.3 });
    items.push({ t: 'point', at: 'O', label: 'O', labelSize: 14, r: 2.6 });
    items.push({ t: 'text', at: 'D', text: 'D', size: 20, color: '#1f4e8c', font: 'point' });

    // 关键点：菱形四个顶点 / 矩形四个角
    if (region.type === 'diamond') {
      P.A = [region.a, 0]; P.B = [0, region.a]; P.C = [-region.a, 0]; P.E = [0, -region.a];
      [['A', 'A'], ['B', 'B'], ['C', 'C'], ['E', 'E']].forEach(function (pr) {
        items.push({ t: 'point', at: pr[0], label: pr[1], r: 3, labelSize: 14 });
      });
    }
    if (region.type === 'disk' || region.type === 'ellipse') {
      P.R = [region.type === 'disk' ? region.R : region.a, 0];
      items.push({ t: 'point', at: 'R', label: 'R', r: 3, labelSize: 14 });
      items.push({ t: 'segment', a: 'O', b: 'R', color: '#0e9f6e', width: 1.8, style: 'solid' });
    }

    var sc = MV.Geo2D.scene(P, items);
    sc.grid = true; sc.axes = true;
    sc.padding = 0.78;
    if (opts.equations) sc.equations = opts.equations;
    if (opts.readouts) sc.readouts = opts.readouts;
    return sc;
  }

  MV.Region2D = {
    diamond: diamond, disk: disk, ellipse: ellipseRegion, rect: rect,
    integrate: integrate, area: area, symmetry: symmetry, scene: scene
  };
})(typeof window !== 'undefined' ? window : globalThis);
