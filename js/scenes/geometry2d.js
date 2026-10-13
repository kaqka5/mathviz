/* ============================================================
 * mathviz/js/scenes/geometry2d.js
 * 平面图形场景构造：三角形（含高/中线/角平分线/外接圆等辅助线）、
 * 平面向量、直线与圆
 * ============================================================ */
(function (global) {
  'use strict';
  var MV = (global.MV = global.MV || {});
  var G = MV.G, V = MV.G.V;

  function scene(points, items, extra) {
    var s = { kind: '2d', points: points, items: items, grid: false, axes: false };
    if (extra) Object.assign(s, extra);
    return s;
  }

  function baseItems(tri) {
    var items = [{ t: 'polygon', pts: ['A', 'B', 'C'], fill: 'rgba(64,132,220,0.10)' }];
    items.push({ t: 'segment', a: 'A', b: 'B' });
    items.push({ t: 'segment', a: 'B', b: 'C' });
    items.push({ t: 'segment', a: 'C', b: 'A' });
    return items;
  }

  /* 三角形场景
   * tri: MV.G.pack 的结果
   * opts: {
   *   sideLabels: {a:true,b:true,c:true} 或 {a:'5.83'}   显示边长
   *   angleLabels: {A:'60°',...}                         显示角度
   *   tickSides: [['a','b'], ...]                        等边标记（同一数组表示相等的一组）
   *   aux: [{type:'altitude'|'median'|'bisector'|'circumcircle'|'incircle', from:'C', to:'AB'}]
   *   rays: [['O','A']]                                  额外线段（如延长线）
   *   highlight: [['A','B']]                             高亮边
   * }
   */
  function triangle(tri, opts) {
    opts = opts || {};
    var P = { A: tri.pts.A.slice(), B: tri.pts.B.slice(), C: tri.pts.C.slice() };
    var items = baseItems(tri);
    var names = { a: 'BC', b: 'CA', c: 'AB' };
    var sideOf = { a: ['B', 'C'], b: ['C', 'A'], c: ['A', 'B'] };

    // 边长标注
    var sl = opts.sideLabels || {};
    Object.keys(sl).forEach(function (k) {
      if (!sl[k]) return;
      var pair = sideOf[k];
      if (!pair) return;
      var txt = typeof sl[k] === 'string' ? sl[k] : G.fmt(tri[k], 3);
      items.push({ t: 'segment', a: pair[0], b: pair[1], label: txt, labelSize: 15, labelOffset: 15 });
    });

    // 角度标注
    var al = opts.angleLabels || {};
    Object.keys(al).forEach(function (k) {
      if (!al[k]) return;
      var others = { A: ['B', 'C'], B: ['A', 'C'], C: ['A', 'B'] }[k];
      if (!others) return;
      var right = typeof al[k] === 'number' ? Math.abs(al[k] - 90) < 1e-6 : false;
      items.push({
        t: 'angle', v: k, p1: others[0], p2: others[1],
        label: typeof al[k] === 'string' ? al[k] : (G.fmt(al[k], 1) + '°'),
        right: right
      });
    });

    // 等长标记
    (opts.tickSides || []).forEach(function (grp) {
      grp.forEach(function (k) {
        var pair = sideOf[k];
        if (pair) items.push({ t: 'ticks', a: pair[0], b: pair[1], n: grp.n || 1 });
      });
    });

    // 辅助线
    (opts.aux || []).forEach(function (a) {
      var from = a.from || 'C';
      var to = a.to || 'AB';
      var p1 = P[from];
      var target = P[to[0]], target2 = P[to[1]];
      var foot = null;
      if (a.type === 'altitude') {
        var d = V.sub(target2, target), t = V.dot(V.sub(p1, target), d) / (V.dot(d, d) || 1);
        foot = V.add(target, V.mul(d, t));
      } else if (a.type === 'median') {
        foot = V.mul(V.add(target, target2), 0.5);
      } else if (a.type === 'bisector') {
        // 角平分线与对边交点（用角平分线定理）
        var l1 = V.dist(p1, target), l2 = V.dist(p1, target2);
        foot = V.add(V.mul(target, l2 / (l1 + l2)), V.mul(target2, l1 / (l1 + l2)));
      }
      if (!foot) return;
      var key = a.name || (from + '_' + to);
      P[key] = foot;
      items.push({
        t: 'segment', a: from, b: key, style: a.style || 'dashed',
        color: a.color || '#0e9f6e', width: 1.8, label: a.label, labelSize: 14
      });
      items.push({ t: 'point', at: key, label: a.pointLabel || '', r: 2.6, labelSize: 13 });
      if (a.type === 'altitude') {
        items.push({ t: 'angle', v: key, p1: from, p2: (V.dist(foot, target) < V.dist(foot, target2) ? to[0] : to[1]), right: true });
      }
    });

    (opts.rays || []).forEach(function (r) {
      items.push({ t: 'segment', a: r[0], b: r[1], style: r[2] || 'dashed', color: r[3] || '#94a3b8', width: 1.6 });
    });
    (opts.highlight || []).forEach(function (h) {
      items.push({ t: 'segment', a: h[0], b: h[1], color: h[2] || '#dc2626', width: 2.6 });
    });

    // 外接圆 / 内切圆
    (opts.circles || []).forEach(function (c) {
      if (c.type === 'circum') {
        var cx = (P.A[0] + P.B[0] + P.C[0]) / 3; // 占位（真正圆心在建场景时给出）
      }
    });

    items.push({ t: 'point', at: 'A', label: 'A', labelSize: 16 });
    items.push({ t: 'point', at: 'B', label: 'B', labelSize: 16 });
    items.push({ t: 'point', at: 'C', label: 'C', labelSize: 16 });

    if (opts.circumcircle) {
      var cc = circumcenter(P.A, P.B, P.C);
      P.O = cc;
      items.unshift({ t: 'circle', c: 'O', r: V.dist(cc, P.A), color: '#94a3b8', width: 1.4, style: 'dashed' });
      items.push({ t: 'point', at: 'O', label: 'O', r: 2.6, labelSize: 14 });
    }

    var sc = scene(P, items);
    if (opts.equations) sc.equations = opts.equations;
    return sc;
  }

  function circumcenter(A, B, C) {
    var d = 2 * (A[0] * (B[1] - C[1]) + B[0] * (C[1] - A[1]) + C[0] * (A[1] - B[1]));
    if (Math.abs(d) < 1e-12) return [(A[0] + B[0] + C[0]) / 3, (A[1] + B[1] + C[1]) / 3];
    var ux = ((A[0] * A[0] + A[1] * A[1]) * (B[1] - C[1]) + (B[0] * B[0] + B[1] * B[1]) * (C[1] - A[1]) + (C[0] * C[0] + C[1] * C[1]) * (A[1] - B[1])) / d;
    var uy = ((A[0] * A[0] + A[1] * A[1]) * (C[0] - B[0]) + (B[0] * B[0] + B[1] * B[1]) * (A[0] - C[0]) + (C[0] * C[0] + C[1] * C[1]) * (B[0] - A[0])) / d;
    return [ux, uy];
  }

  /* 解三角形通用场景：直接给出 A、b、c */
  function triangleFromABC(Adeg, b, c, opts) {
    var tri = G.solveSAS(b, c, Adeg);
    if (!tri) return null;
    return triangle(tri, opts);
  }

  /* 平面向量场景
   * opts: {m, n, angle}  两个向量 a、b 的模与夹角
   */
  function vectors(opts) {
    var m = opts.m, n = opts.n, ang = G.deg2rad(opts.angle);
    var A = [m, 0], B = [n * Math.cos(ang), n * Math.sin(ang)];
    var S = V.add(A, B);
    var P = { O: [0, 0], A: A, B: B, S: S };
    var items = [
      { t: 'polygon', pts: ['O', 'A', 'S', 'B'], fill: 'rgba(64,132,220,0.07)', stroke: false },
      { t: 'segment', a: 'O', b: 'A', color: '#1f4e8c', width: 2.6, arrow: true, label: opts.labelA || 'a', labelSize: 16, labelOffset: 16 },
      { t: 'segment', a: 'O', b: 'B', color: '#0e9f6e', width: 2.6, arrow: true, label: opts.labelB || 'b', labelSize: 16, labelOffset: 16 },
      { t: 'segment', a: 'A', b: 'S', style: 'dashed', color: '#94a3b8', width: 1.4 },
      { t: 'segment', a: 'B', b: 'S', style: 'dashed', color: '#94a3b8', width: 1.4 }
    ];
    if (opts.showSum !== false) {
      items.push({ t: 'segment', a: 'O', b: 'S', color: '#dc2626', width: 2.6, arrow: true, label: opts.labelS || 'a+b', labelSize: 15, labelOffset: 18 });
    }
    if (opts.showDiff) {
      items.push({ t: 'segment', a: 'B', b: 'A', color: '#b45309', width: 2.4, arrow: true, label: opts.labelD || 'a−b', labelSize: 15, labelOffset: 16 });
    }
    items.push({ t: 'angle', v: 'O', p1: 'A', p2: 'B', label: G.fmt(opts.angle, 1) + '°', radiusFrac: 0.22 });
    items.push({ t: 'point', at: 'O', label: 'O', labelSize: 15 });
    items.push({ t: 'point', at: 'A', label: opts.nameA || 'A', labelSize: 15 });
    items.push({ t: 'point', at: 'B', label: opts.nameB || 'B', labelSize: 15 });
    if (opts.showSum !== false) items.push({ t: 'point', at: 'S', label: opts.nameS || 'C', labelSize: 15, r: 3 });
    var sc = scene(P, items);
    if (opts.equations) sc.equations = opts.equations;
    if (opts.readouts) sc.readouts = opts.readouts;
    return sc;
  }

  /* 直线与圆：圆 x²+y²=r² 与直线 y=kx+b */
  function circleLine(opts) {
    var r = opts.r, k = opts.k, b = opts.b;
    var d = Math.abs(b) / Math.sqrt(k * k + 1);
    var P = { O: [0, 0] };
    var items = [{ t: 'circle', c: 'O', r: r, color: '#1f4e8c', width: 2.2 }];
    var rel = d > r + 1e-9 ? '相离' : (Math.abs(d - r) < 1e-9 ? '相切' : '相交');
    var inter = [];
    if (!(k * k + 1 === 0)) {
      var A = 1 + k * k, Bq = 2 * k * b, Cq = b * b - r * r;
      var disc = Bq * Bq - 4 * A * Cq;
      if (disc >= 0) {
        var sq = Math.sqrt(disc);
        var xs = disc === 0 ? [-Bq / (2 * A)] : [(-Bq - sq) / (2 * A), (-Bq + sq) / (2 * A)];
        inter = xs.map(function (x) { return [x, k * x + b]; });
      }
    }
    var foot = [-k * b / (1 + k * k), b / (1 + k * k)];
    P.H = foot;
    items.push({ t: 'line', k: k, b: b, color: '#c2410c', width: 2.2 });
    var dTiny = d < 0.12 * r;   // 弦几乎过圆心时，垂足与圆心几乎重合，避免标注挤在一起
    items.push({
      t: 'segment', a: 'O', b: 'H', style: 'dashed', color: '#0e9f6e', width: 1.8,
      label: dTiny ? undefined : 'd=' + G.fmt(d, 3), labelSize: 13, labelOffset: 26
    });
    if (inter.length) {
      var nearest = inter[0][0] !== undefined && inter.length === 1 ? foot : null;
      inter.forEach(function (p, i) {
        var key = 'I' + (i + 1);
        P[key] = p;
        items.push({ t: 'point', at: key, label: key, r: 3.6, hollow: true, color: '#dc2626', labelSize: 14 });
        items.push({ t: 'segment', a: 'O', b: key, color: '#94a3b8', width: 1.5, style: 'dashed' });
      });
      if (inter.length === 2) {
        items.push({ t: 'segment', a: 'I1', b: 'I2', color: '#dc2626', width: 2.6 });
      }
    }
    if (rel === '相切' && inter.length === 1) {
      // 切点处：切线方向与半径垂直，标记直角
      P.T = inter[0];
      P.Q = [inter[0][0] + 1, inter[0][1] + k];
      items.push({ t: 'angle', v: 'T', p1: 'O', p2: 'Q', right: true });
    } else if (inter.length === 2) {
      // 圆心到弦的垂足处为直角
      items.push({ t: 'angle', v: 'H', p1: 'O', p2: 'I1', right: true });
    }
    items.push({ t: 'point', at: 'O', label: 'O', labelSize: 15 });
    if (!dTiny) items.push({ t: 'point', at: 'H', label: 'H', r: 2.6, labelSize: 13 });
    var sc = scene(P, items);
    sc.equations = opts.equations;
    sc.readouts = opts.readouts;
    sc.grid = true;
    sc.axes = true;
    return sc;
  }

  /* 两圆位置关系：C1(0,0) r1 与 C2(d,0) r2 */
  function twoCircles(opts) {
    var r1 = opts.r1, r2 = opts.r2, d = opts.d;
    var P = { O1: [0, 0], O2: [d, 0] };
    var items = [
      { t: 'circle', c: 'O1', r: r1, color: '#1f4e8c', width: 2.2 },
      { t: 'circle', c: 'O2', r: r2, color: '#c2410c', width: 2.2 },
      { t: 'point', at: 'O1', label: 'O₁', labelSize: 14 },
      { t: 'point', at: 'O2', label: 'O₂', labelSize: 14 },
      { t: 'segment', a: 'O1', b: 'O2', style: 'dashed', color: '#94a3b8', width: 1.5, label: 'd=' + G.fmt(d, 3), labelSize: 13 }
    ];
    var relation;
    var dd = Math.abs(r1 - r2);
    if (d < 1e-9) {
      relation = Math.abs(r1 - r2) < 1e-9 ? '重合' : '同心圆';
    } else if (d > r1 + r2 + 1e-9) relation = '外离';
    else if (Math.abs(d - (r1 + r2)) <= 1e-9) relation = '外切';
    else if (d < dd - 1e-9) relation = r1 > r2 ? '内含（小圆在大圆内）' : '内含（小圆在大圆内）';
    else if (Math.abs(d - dd) <= 1e-9) relation = '内切';
    else relation = '相交';

    if (relation === '相交') {
      var a = (d * d + r1 * r1 - r2 * r2) / (2 * d);
      var h = Math.sqrt(Math.max(0, r1 * r1 - a * a));
      P.I1 = [a, h]; P.I2 = [a, -h];
      items.push({ t: 'segment', a: 'I1', b: 'I2', color: '#dc2626', width: 2.4, label: '公共弦' });
      items.push({ t: 'point', at: 'I1', label: 'A', hollow: true, r: 3.6, color: '#dc2626', labelSize: 14 });
      items.push({ t: 'point', at: 'I2', label: 'B', hollow: true, r: 3.6, color: '#dc2626', labelSize: 14 });
      items.push({ t: 'segment', a: 'O1', b: 'I1', color: '#94a3b8', style: 'dashed', width: 1.4 });
      P.H = [a, 0];
      items.push({ t: 'point', at: 'H', label: 'H', r: 2.6, labelSize: 13 });
      items.push({ t: 'angle', v: 'H', p1: 'O1', p2: 'I1', right: true });
    } else if (relation === '外切') {
      P.T = [r1, 0];
      items.push({ t: 'point', at: 'T', label: '外切点', hollow: true, color: '#dc2626', labelSize: 13 });
      items.push({ t: 'angle', v: 'T', p1: 'O1', p2: 'O2', right: true });
    } else if (relation === '内切') {
      P.T = [r1 >= r2 ? r1 : -r1, 0];
      items.push({ t: 'point', at: 'T', label: '内切点', hollow: true, color: '#dc2626', labelSize: 13 });
    }
    var sc = scene(P, items);
    sc.grid = true; sc.axes = true;
    sc.equations = opts.equations;
    sc.readouts = opts.readouts;
    return sc;
  }

  MV.Geo2D = {
    scene: scene,
    triangle: triangle,
    triangleFromABC: triangleFromABC,
    vectors: vectors,
    circleLine: circleLine,
    twoCircles: twoCircles,
    circumcenter: circumcenter
  };
})(typeof window !== 'undefined' ? window : globalThis);
