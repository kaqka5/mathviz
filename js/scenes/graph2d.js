/* ============================================================
 * mathviz/js/scenes/graph2d.js
 * 函数图像场景：显函数 y=f(x)、极坐标 r(θ)、关键点/辅助线
 * ============================================================ */
(function (global) {
  'use strict';
  var MV = (global.MV = global.MV || {});

  /* cfg: {
   *   curves: [{src:'sin(x)', color, width, style, label}],
   *   polar:  [{src:'2cos(3theta)', tMin, tMax, color, label}],   // 变量名 theta
   *   xRange, yRange,
   *   points: [{x, y, label, hollow, color, dx, dy}],
   *   vlines: [{x, color, style, label}],
   *   hlines: [{y, color, style, label}],
   *   segments: [{a:[x,y], b:[x,y], color, style, width, label}],
   *   equations: ['y = ...'],
   *   readouts: [{label, value}],
   *   grid, axes
   * }
   */
  function func(cfg) {
    cfg = cfg || {};
    var P = {};
    var items = [];
    var sc = {
      kind: '2d',
      points: P,
      items: items,
      grid: cfg.grid !== false,
      axes: cfg.axes !== false
    };
    // 函数图像不强制横纵等比例（极坐标曲线要保持等比例，否则圆会变形）
    var hasPolar = (cfg.polar || []).length > 0;
    sc.equalAspect = cfg.equalAspect !== undefined ? cfg.equalAspect : !!hasPolar;
    if (cfg.xRange) sc.xRange = cfg.xRange;
    if (cfg.yRange) sc.yRange = cfg.yRange;

    (cfg.curves || []).forEach(function (c, i) {
      var f;
      try {
        if (c.scope) {
          var g = MV.Expr.compile(c.src);
          var sc = c.scope;
          f = function (x) {
            var s2 = {};
            for (var k in sc) s2[k] = sc[k];
            s2[c.varName || 'x'] = x;
            return g(s2);
          };
        } else {
          f = MV.Expr.fn1(c.src, c.varName || 'x');
        }
      } catch (e) { return; }
      items.push({
        t: 'func', f: f, color: c.color || (i === 0 ? '#c2410c' : '#7c3aed'),
        width: c.width || 2.2, style: c.style,
        xMin: c.xMin !== undefined ? c.xMin : cfg.xRange && cfg.xRange[0],
        xMax: c.xMax !== undefined ? c.xMax : cfg.xRange && cfg.xRange[1],
        samples: c.samples || 600,
        yClip: c.yClip
      });
    });

    (cfg.polar || []).forEach(function (c, i) {
      var f;
      try {
        if (c.scope) {
          var g2 = MV.Expr.compile(c.src);
          var sc2 = c.scope;
          f = function (t) {
            var s3 = {};
            for (var k in sc2) s3[k] = sc2[k];
            s3[c.varName || 'theta'] = t;
            return g2(s3);
          };
        } else {
          f = MV.Expr.fn1(c.src, c.varName || 'theta');
        }
      } catch (e) { return; }
      items.push({
        t: 'polar', r: f, tMin: c.tMin, tMax: c.tMax,
        color: c.color || (i === 0 ? '#0e9f6e' : '#7c3aed'), width: c.width || 2.2, samples: c.samples || 900
      });
    });

    (cfg.vlines || []).forEach(function (l) {
      items.push({
        t: 'segment', a: [l.x, (cfg.yRange ? cfg.yRange[0] : -1e4)], b: [l.x, (cfg.yRange ? cfg.yRange[1] : 1e4)],
        color: l.color || '#94a3b8', style: l.style || 'dashed', width: l.width || 1.4, label: l.label
      });
    });
    (cfg.hlines || []).forEach(function (l) {
      items.push({
        t: 'segment', a: [(cfg.xRange ? cfg.xRange[0] : -1e4), l.y], b: [(cfg.xRange ? cfg.xRange[1] : 1e4), l.y],
        color: l.color || '#94a3b8', style: l.style || 'dashed', width: l.width || 1.4, label: l.label
      });
    });
    (cfg.segments || []).forEach(function (s) {
      items.push({
        t: 'segment', a: s.a, b: s.b, color: s.color || '#0e9f6e',
        style: s.style || 'dashed', width: s.width || 1.6, label: s.label, labelSize: 13
      });
    });

    (cfg.points || []).forEach(function (p, i) {
      var key = 'K' + i;
      P[key] = [p.x, p.y];
      items.push({
        t: 'point', at: key, label: p.label, r: p.hollow ? 3.8 : 3.2,
        hollow: p.hollow, color: p.color || '#dc2626', labelSize: 13.5, labelOffset: 16
      });
    });

    if (cfg.equations) sc.equations = cfg.equations;
    if (cfg.readouts) sc.readouts = cfg.readouts;
    return sc;
  }

  MV.Graph2D = { func: func };
})(typeof window !== 'undefined' ? window : globalThis);
