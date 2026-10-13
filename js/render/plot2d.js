/* ============================================================
 * mathviz/js/render/plot2d.js
 * 二维绘图引擎：坐标系 / 函数曲线 / 几何图形 / 角度弧 / 标注
 * 场景数据格式见 README「场景数据结构」
 * ============================================================ */
(function (global) {
  'use strict';
  var MV = (global.MV = global.MV || {});
  var G = MV.G, V = MV.G.V;

  var THEME = {
    bg: '#ffffff',
    grid: '#e8eef7',
    gridStrong: '#d3deee',
    axis: '#8fa3bf',
    axisText: '#7d8ea6',
    seg: '#1f4e8c',
    segDash: '#7f9dbe',
    fill: 'rgba(64,132,220,0.10)',
    fillStrong: 'rgba(64,132,220,0.20)',
    circle: '#1f4e8c',
    curve: '#c2410c',
    angle: '#b45309',
    angleFill: 'rgba(217,119,6,0.14)',
    label: '#0f172a',
    point: '#12324f',
    aux: '#94a3b8',
    highlight: '#dc2626'
  };

  function niceStep(range, target) {
    var raw = Math.abs(range) / (target || 9);
    if (!(raw > 1e-12)) return 1;                 // 防止算出 0 步长导致死循环
    var mag = Math.pow(10, Math.floor(Math.log10(raw)));
    var norm = raw / mag;
    var mult = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
    return mag * mult;
  }

  function Plot2D(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.scene = null;
    this.view = { zoom: 1, panX: 0, panY: 0 };
    this.transform = null;
  }

  Plot2D.prototype.setScene = function (scene, keepView) {
    this.scene = scene;
    if (!keepView) this.view = { zoom: 1, panX: 0, panY: 0 };
    this.render();
  };

  Plot2D.prototype._layout = function () {
    var c = this.canvas;
    var dpr = global.devicePixelRatio || 1;
    var w = c.clientWidth || c.width, h = c.clientHeight || c.height;
    if (!w || !h) return null;
    if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) {
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
    }
    var ctx = this.ctx;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    try { c.dataset.size = Math.round(w) + 'x' + Math.round(h) + '@' + dpr; } catch (e) { }
    return { w: w, h: h };
  };

  /* 采样函数曲线（自动跳过间断点） */
  Plot2D.prototype._sampleFunc = function (item, bbox) {
    var n = item.samples || 480;
    var xMin = item.xMin !== undefined ? item.xMin : bbox.x0;
    var xMax = item.xMax !== undefined ? item.xMax : bbox.x1;
    var spans = [], cur = [];
    var yLo = Infinity, yHi = -Infinity;
    var yClip = item.yClip || (function () {
      var span = Math.max(Math.abs(bbox.y1 - bbox.y0), 1);
      return { lo: bbox.y0 - span * 6, hi: bbox.y1 + span * 6 };
    })();
    for (var i = 0; i <= n; i++) {
      var x = xMin + (xMax - xMin) * i / n;
      var y;
      try { y = item.f(x); } catch (e) { y = NaN; }
      if (!Number.isFinite(y) || y < yClip.lo || y > yClip.hi) {
        if (cur.length > 1) spans.push(cur);
        cur = [];
        continue;
      }
      if (cur.length) {
        var prev = cur[cur.length - 1];
        var dy = Math.abs(y - prev[1]);
        var dx = Math.abs(x - prev[0]);
        if (dx > 0 && dy / dx > 60) { // 竖直渐近线附近断开
          spans.push(cur); cur = [];
        }
      }
      cur.push([x, y]);
      if (y < yLo) yLo = y;
      if (y > yHi) yHi = y;
    }
    if (cur.length > 1) spans.push(cur);
    return { spans: spans, yLo: yLo, yHi: yHi };
  };

  Plot2D.prototype._samplePolar = function (item) {
    var n = item.samples || 720;
    var t0 = item.tMin !== undefined ? item.tMin : 0;
    var t1 = item.tMax !== undefined ? item.tMax : Math.PI * 2;
    var pts = [];
    for (var i = 0; i <= n; i++) {
      var t = t0 + (t1 - t0) * i / n;
      var r;
      try { r = item.r(t); } catch (e) { r = NaN; }
      if (!Number.isFinite(r)) continue;
      pts.push([r * Math.cos(t), r * Math.sin(t)]);
    }
    return pts;
  };

  /* 计算数据包围盒 */
  Plot2D.prototype._bbox = function (scene) {
    var self = this;
    var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    function add(x, y) {
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
    var P = scene.points || {};
    function pt(ref) {
      if (Array.isArray(ref)) return ref;
      return P[ref] || null;
    }
    scene.items.forEach(function (it) {
      if (it.t === 'segment' || it.t === 'ticks' || it.t === 'dim') {
        var a = pt(it.a), b = pt(it.b);
        if (a) add(a[0], a[1]); if (b) add(b[0], b[1]);
      } else if (it.t === 'polygon') {
        it.pts.forEach(function (r) { var p = pt(r); if (p) add(p[0], p[1]); });
      } else if (it.t === 'circle') {
        var c = pt(it.c); if (c) { add(c[0] - it.r, c[1] - it.r); add(c[0] + it.r, c[1] + it.r); }
      } else if (it.t === 'arc') {
        var c2 = pt(it.c);
        if (c2) { add(c2[0] - it.r, c2[1] - it.r); add(c2[0] + it.r, c2[1] + it.r); }
      } else if (it.t === 'point') {
        var p2 = pt(it.at); if (p2) add(p2[0], p2[1]);
      } else if (it.t === 'text') {
        var p3 = pt(it.at); if (p3) add(p3[0], p3[1]);
      } else if (it.t === 'angle') {
        ['v', 'p1', 'p2'].forEach(function (k) { var p = pt(it[k]); if (p) add(p[0], p[1]); });
      } else if (it.t === 'curve') {
        it.pts.forEach(function (p) { add(p[0], p[1]); });
      } else if (it.t === 'func') {
        var r = self._sampleFunc(it, { x0: it.xMin !== undefined ? it.xMin : -10, x1: it.xMax !== undefined ? it.xMax : 10, y0: -10, y1: 10 });
        it._cache = r;
        if (Number.isFinite(r.yLo)) { add(it.xMin, r.yLo); add(it.xMax, r.yHi); }
      } else if (it.t === 'polar') {
        var pts = self._samplePolar(it);
        it._cachePts = pts;
        pts.forEach(function (p) { add(p[0], p[1]); });
      }
    });
    if (scene.pointsExtra) scene.pointsExtra.forEach(function (p) { add(p[0], p[1]); });
    if (!Number.isFinite(x0)) { x0 = -5; x1 = 5; y0 = -5; y1 = 5; }
    if (scene.xRange) { x0 = scene.xRange[0]; x1 = scene.xRange[1]; }
    if (scene.yRange) { y0 = scene.yRange[0]; y1 = scene.yRange[1]; }
    if (scene.axes || scene.grid) { // 坐标系场景：保证原点附近可见
      var pad = Math.max(x1 - x0, y1 - y0) * 0.06;
      x0 -= pad; x1 += pad; y0 -= pad; y1 += pad;
    }
    return { x0: x0, x1: x1, y0: y0, y1: y1 };
  };

  Plot2D.prototype.render = function () {
    var size = this._layout();
    if (!size || !this.scene) return;
    var scene = this.scene, ctx = this.ctx;
    var theme = Object.assign({}, THEME, scene.theme || {});
    var bbox = this._bbox(scene);

    var spanX = bbox.x1 - bbox.x0;
    var spanY = bbox.y1 - bbox.y0;
    // 退化场景（只有一个点/一段文字）给一个正常坐标系范围，避免坐标轴被放大到天文数字
    if (!(spanX > 1e-3)) spanX = 10;
    if (!(spanY > 1e-3)) spanY = 10;
    // 极端比例（例如常函数）先把比例限制在合理范围
    var ratio = spanY / spanX;
    if (!(ratio > 1e-4)) spanY = spanX * 1e-4;
    else if (ratio > 1e4) spanX = spanY * 1e-4;
    var padFrac = scene.padding === undefined ? 0.86 : scene.padding;
    var equal = scene.equalAspect !== false;
    var sx, sy;
    if (equal) {
      sx = sy = Math.min(size.w / spanX, size.h / spanY) * padFrac * this.view.zoom;
    } else {
      // 函数图像不强制等比例：横纵轴各自铺满，图像才不会被"拉扁"
      sx = size.w / spanX * padFrac * this.view.zoom;
      sy = size.h / spanY * padFrac * this.view.zoom;
    }
    var scale = Math.min(sx, sy);
    var cx = (bbox.x0 + bbox.x1) / 2, cy = (bbox.y0 + bbox.y1) / 2;
    var ox = size.w / 2 + this.view.panX, oy = size.h / 2 + this.view.panY;
    var X = function (x) { return ox + (x - cx) * sx; };
    var Y = function (y) { return oy - (y - cy) * sy; };
    var invX = function (s) { return cx + (s - ox) / sx; };
    var invY = function (s) { return cy - (s - oy) / sy; };
    this.transform = { X: X, Y: Y, scale: scale, sx: sx, sy: sy, invX: invX, invY: invY };

    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, size.w, size.h);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    var P = scene.points || {};
    function pt(ref) { return Array.isArray(ref) ? ref : (P[ref] || [0, 0]); }
    function isNamed(ref) { return typeof ref === 'string'; }

    // 图形中心（用于标签自动避让）
    var cen = [0, 0], cenN = 0;
    Object.keys(P).forEach(function (k) { cen[0] += P[k][0]; cen[1] += P[k][1]; cenN++; });
    if (cenN) { cen[0] /= cenN; cen[1] /= cenN; } else { cen = [cx, cy]; }

    /* ---------- 网格与坐标轴 ---------- */
    if (scene.grid !== false) {
      var stepX = niceStep(invX(size.w) - invX(0), 9);
      var stepY = niceStep(invY(0) - invY(size.h), 9);
      var lx0 = Math.ceil(invX(0) / stepX) * stepX;
      var ly0 = Math.ceil(invY(size.h) / stepY) * stepY;
      ctx.lineWidth = 1;
      ctx.strokeStyle = theme.grid;
      ctx.beginPath();
      var guard = 0;
      for (var gx = lx0; gx <= invX(size.w) + 1e-9 && guard < 200; gx += stepX, guard++) {
        var gpx = Math.round(X(gx)) + 0.5;
        ctx.moveTo(gpx, 0); ctx.lineTo(gpx, size.h);
      }
      guard = 0;
      for (var gy = ly0; gy <= invY(0) + 1e-9 && guard < 200; gy += stepY, guard++) {
        var gpy = Math.round(Y(gy)) + 0.5;
        ctx.moveTo(0, gpy); ctx.lineTo(size.w, gpy);
      }
      ctx.stroke();

      if (scene.axes !== false) {
        var ax = G.clamp(X(0), 26, size.w - 12);
        var ay = G.clamp(Y(0), 14, size.h - 22);
        ctx.strokeStyle = theme.axis; ctx.fillStyle = theme.axis;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(0, Math.round(ay) + 0.5); ctx.lineTo(size.w - 4, Math.round(ay) + 0.5);
        ctx.moveTo(Math.round(ax) + 0.5, size.h); ctx.lineTo(Math.round(ax) + 0.5, 4);
        ctx.stroke();
        // 箭头
        function arrow(x, y, dx, dy) {
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x - dx * 8 - dy * 4, y - dy * 8 - dx * 4);
          ctx.lineTo(x - dx * 8 + dy * 4, y - dy * 8 + dx * 4);
          ctx.closePath(); ctx.fill();
        }
        arrow(size.w - 4, ay, 1, 0);
        arrow(ax, 4, 0, -1);
        ctx.font = 'italic 15px "Times New Roman", Georgia, serif';
        ctx.textAlign = 'right'; ctx.textBaseline = 'top';
        ctx.fillText('x', size.w - 6, ay + 6);
        ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText('y', ax + 7, 4);
        ctx.font = '12px system-ui, sans-serif';
        ctx.textAlign = 'right'; ctx.textBaseline = 'top';
        ctx.fillText('O', ax - 5, ay + 5);
        // 刻度数字
        ctx.font = '12px system-ui, sans-serif';
        ctx.fillStyle = theme.axisText;
        var limit = 26;
        ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        var g1 = 0;
        for (var tx = lx0; tx <= invX(size.w) + 1e-9 && g1 < 200; tx += stepX, g1++) {
          if (Math.abs(tx) < 1e-9) continue;
          var sx2 = X(tx);
          if (sx2 < limit || sx2 > size.w - 6) continue;
          ctx.beginPath(); ctx.moveTo(sx2, ay - 3); ctx.lineTo(sx2, ay + 3);
          ctx.strokeStyle = theme.axis; ctx.lineWidth = 1; ctx.stroke();
          ctx.fillText(G.fmt(tx, 4), sx2, ay + 5);
        }
        ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        var g2 = 0;
        for (var ty = ly0; ty <= invY(0) + 1e-9 && g2 < 200; ty += stepY, g2++) {
          if (Math.abs(ty) < 1e-9) continue;
          var sy2 = Y(ty);
          if (sy2 < 12 || sy2 > size.h - 20) continue;
          ctx.beginPath(); ctx.moveTo(ax - 3, sy2); ctx.lineTo(ax + 3, sy2);
          ctx.strokeStyle = theme.axis; ctx.lineWidth = 1; ctx.stroke();
          ctx.fillText(G.fmt(ty, 4), ax - 6, sy2);
        }
      }
    }

    /* ---------- 逐层绘制 ---------- */
    var order = ['polygon', 'circle', 'arc', 'line', 'ray', 'func', 'polar', 'curve', 'segment', 'dim', 'ticks', 'angle', 'point', 'text'];
    var items = scene.items.slice().sort(function (a, b) {
      return order.indexOf(a.t) - order.indexOf(b.t);
    });

    // 让"辅助/高亮"元素最后画
    items.forEach(function (it) {
      if (it.layer === 'top') items = items; // 占位（保持顺序稳定）
    });

    items.forEach(function (it) {
      var color = it.color || theme.seg;
      var lw = it.width || 2;
      ctx.lineWidth = lw;
      ctx.setLineDash(it.style === 'dashed' ? [7, 6] : (it.style === 'dotted' ? [2, 4] : []));
      ctx.strokeStyle = color;

      switch (it.t) {
        case 'polygon': {
          var ps = it.pts.map(pt);
          ctx.beginPath();
          ps.forEach(function (p, i) { i ? ctx.lineTo(X(p[0]), Y(p[1])) : ctx.moveTo(X(p[0]), Y(p[1])); });
          ctx.closePath();
          ctx.fillStyle = it.fill || theme.fill;
          ctx.fill();
          if (it.stroke !== false) { ctx.strokeStyle = it.strokeColor || color; ctx.stroke(); }
          break;
        }
        case 'circle': {
          var c = pt(it.c);
          ctx.beginPath();
          ctx.arc(X(c[0]), Y(c[1]), Math.max(0.5, it.r * scale), 0, Math.PI * 2);
          if (it.fill) { ctx.fillStyle = it.fill; ctx.fill(); }
          ctx.stroke();
          break;
        }
        case 'arc': {
          var c2 = pt(it.c);
          ctx.beginPath();
          ctx.arc(X(c2[0]), Y(c2[1]), Math.max(0.5, it.r * scale),
            -G.deg2rad(it.to), -G.deg2rad(it.from), true);
          ctx.stroke();
          break;
        }
        case 'line': {
          var k, b;
          if (it.k !== undefined) { k = it.k; b = it.b || 0; }
          else {
            var p1 = pt(it.through[0]), p2 = pt(it.through[1]);
            k = (p2[1] - p1[1]) / ((p2[0] - p1[0]) || 1e-9);
            b = p1[1] - k * p1[0];
          }
          var xa = invX(0), xb = invX(size.w);
          ctx.beginPath();
          ctx.moveTo(X(xa), Y(k * xa + b));
          ctx.lineTo(X(xb), Y(k * xb + b));
          ctx.stroke();
          break;
        }
        case 'ray': {
          var rp = pt(it.from), tp = pt(it.through);
          var d = [tp[0] - rp[0], tp[1] - rp[1]];
          var L = V.len(d) || 1;
          var big = (spanX + spanY) * 3 / L;
          ctx.beginPath();
          ctx.moveTo(X(rp[0]), Y(rp[1]));
          ctx.lineTo(X(rp[0] + d[0] * big), Y(rp[1] + d[1] * big));
          ctx.stroke();
          break;
        }
        case 'func': {
          var s = it._cache || this._sampleFunc(it, bbox);
          ctx.strokeStyle = it.color || theme.curve;
          ctx.lineWidth = it.width || 2.2;
          s.spans.forEach(function (sp) {
            ctx.beginPath();
            sp.forEach(function (p, i) { i ? ctx.lineTo(X(p[0]), Y(p[1])) : ctx.moveTo(X(p[0]), Y(p[1])); });
            ctx.stroke();
          });
          break;
        }
        case 'polar': {
          var pp = it._cachePts || this._samplePolar(it);
          ctx.strokeStyle = it.color || theme.curve;
          ctx.lineWidth = it.width || 2.2;
          ctx.beginPath();
          pp.forEach(function (p, i) { i ? ctx.lineTo(X(p[0]), Y(p[1])) : ctx.moveTo(X(p[0]), Y(p[1])); });
          ctx.stroke();
          break;
        }
        case 'curve': {
          ctx.strokeStyle = it.color || theme.curve;
          ctx.lineWidth = it.width || 2.2;
          ctx.beginPath();
          it.pts.forEach(function (p, i) { i ? ctx.lineTo(X(p[0]), Y(p[1])) : ctx.moveTo(X(p[0]), Y(p[1])); });
          ctx.stroke();
          break;
        }
        case 'segment': {
          var a = pt(it.a), bb = pt(it.b);
          ctx.strokeStyle = color;
          ctx.beginPath(); ctx.moveTo(X(a[0]), Y(a[1])); ctx.lineTo(X(bb[0]), Y(bb[1])); ctx.stroke();
          if (it.arrow || it.arrowBoth) {
            var pts2 = it.arrowBoth ? [a, bb] : [bb];
            var froms = it.arrowBoth ? [bb, a] : [a];
            ctx.setLineDash([]);
            pts2.forEach(function (tip, idx) {
              var base = froms[idx];
              var dx = X(tip[0]) - X(base[0]), dy = Y(tip[1]) - Y(base[1]);
              var L = Math.hypot(dx, dy) || 1;
              dx /= L; dy /= L;
              var size = it.arrowSize || 11;
              ctx.beginPath();
              ctx.moveTo(X(tip[0]), Y(tip[1]));
              ctx.lineTo(X(tip[0]) - dx * size - dy * size * 0.42, Y(tip[1]) - dy * size + dx * size * 0.42);
              ctx.lineTo(X(tip[0]) - dx * size + dy * size * 0.42, Y(tip[1]) - dy * size - dx * size * 0.42);
              ctx.closePath();
              ctx.fillStyle = color;
              ctx.fill();
            });
          }
          if (it.label) {
            var mx = (a[0] + bb[0]) / 2, my = (a[1] + bb[1]) / 2;
            var nx = -(bb[1] - a[1]), ny = (bb[0] - a[0]);
            var nl = Math.hypot(nx, ny) || 1;
            nx /= nl; ny /= nl;
            if ((mx - cen[0]) * nx + (my - cen[1]) * ny < 0) { nx = -nx; ny = -ny; }
            var off = it.labelOffset === undefined ? 16 : it.labelOffset;
            drawLabel(it.label, X(mx) + nx * off, Y(my) - ny * off, it.labelColor || theme.label, it.labelSize || 14, it.labelFont);
          }
          break;
        }
        case 'dim': { // 尺寸线（带箭头）
          var a1 = pt(it.a), b1 = pt(it.b);
          ctx.strokeStyle = it.color || theme.aux;
          ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.moveTo(X(a1[0]), Y(a1[1])); ctx.lineTo(X(b1[0]), Y(b1[1])); ctx.stroke();
          break;
        }
        case 'ticks': {
          var t1 = pt(it.a), t2 = pt(it.b);
          var n = it.n || 1;
          var mxx = (t1[0] + t2[0]) / 2, myy = (t1[1] + t2[1]) / 2;
          var dx = t2[0] - t1[0], dy = t2[1] - t1[1];
          var dl = Math.hypot(dx, dy) || 1;
          var px = -dy / dl, py = dx / dl;
          var tickLen = it.len || (spanX * 0.018 + spanY * 0.018) / 2;
          ctx.strokeStyle = it.color || theme.seg; ctx.lineWidth = 1.6;
          ctx.beginPath();
          for (var k2 = 0; k2 < n; k2++) {
            var cxT = mxx + px * (k2 - (n - 1) / 2) * tickLen * 0.7;
            var cyT = myy + py * (k2 - (n - 1) / 2) * tickLen * 0.7;
            ctx.moveTo(X(cxT - px * tickLen), Y(cyT - py * tickLen));
            ctx.lineTo(X(cxT + px * tickLen), Y(cyT + py * tickLen));
          }
          ctx.stroke();
          break;
        }
        case 'angle': {
          var v = pt(it.v), q1 = pt(it.p1), q2 = pt(it.p2);
          var u1 = [q1[0] - v[0], q1[1] - v[1]], u2 = [q2[0] - v[0], q2[1] - v[1]];
          var l1 = V.len(u1) || 1, l2 = V.len(u2) || 1;
          var rad = (it.radius !== undefined ? it.radius : Math.min(l1, l2) * (it.radiusFrac || 0.28));
          rad = Math.min(rad, Math.min(l1, l2) * 0.85);
          var a1d = Math.atan2(u1[1], u1[0]), a2d = Math.atan2(u2[1], u2[0]);
          var diff = a2d - a1d;
          while (diff <= -Math.PI) diff += Math.PI * 2;
          while (diff > Math.PI) diff -= Math.PI * 2;
          var aStart = a1d, aEnd = a1d + diff;
          ctx.strokeStyle = it.color || theme.angle;
          ctx.lineWidth = it.width || 1.6;
          ctx.setLineDash([]);
          if (it.right) {
            var sq = rad * 0.55;
            var p1 = [v[0] + Math.cos(aStart) * sq, v[1] + Math.sin(aStart) * sq];
            var p3 = [p1[0] + Math.cos(aEnd) * sq, p1[1] + Math.sin(aEnd) * sq];
            var p2 = [v[0] + Math.cos(aEnd) * sq, v[1] + Math.sin(aEnd) * sq];
            ctx.beginPath();
            ctx.moveTo(X(p1[0]), Y(p1[1]));
            ctx.lineTo(X(p3[0]), Y(p3[1]));
            ctx.lineTo(X(p2[0]), Y(p2[1]));
            ctx.stroke();
          } else {
            if (it.fill !== false) {
              ctx.beginPath();
              ctx.moveTo(X(v[0]), Y(v[1]));
              ctx.arc(X(v[0]), Y(v[1]), rad * scale, -aStart, -aEnd, diff > 0);
              ctx.closePath();
              ctx.fillStyle = it.fillColor || theme.angleFill;
              ctx.fill();
            }
            ctx.beginPath();
            ctx.arc(X(v[0]), Y(v[1]), rad * scale, -aStart, -aEnd, diff > 0);
            ctx.stroke();
          }
          if (it.label !== false && it.label !== undefined) {
            var mid = aStart + diff / 2;
            var lr = rad * (it.right ? 1.75 : 1.42);
            drawLabel(it.label, X(v[0] + Math.cos(mid) * lr), Y(v[1] + Math.sin(mid) * lr),
              it.labelColor || theme.angle, it.labelSize || 14, 'italic');
          }
          break;
        }
        case 'point': {
          var p = pt(it.at);
          var px2 = X(p[0]), py2 = Y(p[1]);
          var rr = it.r || 3.4;
          ctx.beginPath();
          ctx.arc(px2, py2, rr, 0, Math.PI * 2);
          if (it.hollow) { ctx.fillStyle = '#fff'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = it.color || theme.highlight; ctx.stroke(); }
          else { ctx.fillStyle = it.color || theme.point; ctx.fill(); }
          if (it.label) {
            var dir = [p[0] - cen[0], p[1] - cen[1]];
            if (V.len(dir) < 1e-9) dir = [0, 1];
            dir = V.norm(dir);
            if (it.labelDir) dir = it.labelDir;
            var off2 = it.labelOffset === undefined ? 15 : it.labelOffset;
            drawLabel(it.label, px2 + dir[0] * off2, py2 - dir[1] * off2,
              it.labelColor || theme.label, it.labelSize || 16, 'point');
          }
          break;
        }
        case 'text': {
          var p3 = pt(it.at);
          var dx3 = (it.dx || 0), dy3 = (it.dy || 0);
          drawLabel(it.text, X(p3[0]) + dx3, Y(p3[1]) + dy3, it.color || theme.label, it.size || 14, it.font, it.align);
          break;
        }
      }
    });
    ctx.setLineDash([]);

    /* 图例 / 公式框 */
    if (scene.equations && scene.equations.length) {
      ctx.font = '14px system-ui, sans-serif';
      var pad = 10, lh = 21;
      var wMax = 0;
      scene.equations.forEach(function (eq) { wMax = Math.max(wMax, ctx.measureText(eq).width); });
      var bw = wMax + pad * 2, bh = scene.equations.length * lh + pad * 1.4;
      var bx = size.w - bw - 12, by = 12;
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.strokeStyle = '#dbe4f0';
      ctx.lineWidth = 1;
      roundRect(ctx, bx, by, bw, bh, 8);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#334155';
      ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      scene.equations.forEach(function (eq, i) {
        ctx.fillText(eq, bx + pad, by + pad * 0.7 + i * lh);
      });
    }

    /* 实时读数框 */
    if (scene.readouts && scene.readouts.length) {
      ctx.font = '13.5px system-ui, sans-serif';
      var pad2 = 10, lh2 = 20;
      var wMax2 = 0;
      scene.readouts.forEach(function (r) { wMax2 = Math.max(wMax2, ctx.measureText(r.label + '  ' + r.value).width); });
      var bw2 = wMax2 + pad2 * 2, bh2 = scene.readouts.length * lh2 + pad2 * 1.4;
      var bx2 = 12, by2 = 12;
      ctx.fillStyle = 'rgba(255,255,255,0.94)';
      ctx.strokeStyle = '#dbe4f0'; ctx.lineWidth = 1;
      roundRect(ctx, bx2, by2, bw2, bh2, 8);
      ctx.fill(); ctx.stroke();
      ctx.textBaseline = 'top';
      scene.readouts.forEach(function (r, i) {
        var yy = by2 + pad2 * 0.7 + i * lh2;
        ctx.fillStyle = '#64748b'; ctx.textAlign = 'left';
        ctx.fillText(r.label, bx2 + pad2, yy);
        ctx.fillStyle = r.color || '#0f172a'; ctx.textAlign = 'right';
        ctx.fillText(r.value, bx2 + bw2 - pad2, yy);
      });
    }

    function roundRect(ctx, x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    }

    function drawLabel(text, x, y, color, size, font, align) {
      if (text === undefined || text === null || text === '') return;
      text = MV.G.subNum(text);
      var f = font === 'point'
        ? 'italic 700 ' + size + 'px "Times New Roman", Georgia, serif'
        : (font === 'italic' ? 'italic ' + size + 'px "Times New Roman", Georgia, serif'
          : '600 ' + size + 'px system-ui, "Segoe UI", sans-serif');
      ctx.font = f;
      ctx.textAlign = align || 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 3.4;
      ctx.strokeStyle = 'rgba(255,255,255,0.95)';
      ctx.strokeText(String(text), x, y);
      ctx.fillStyle = color || '#0f172a';
      ctx.fillText(String(text), x, y);
    }
  };

  MV.Render2D = { create: function (canvas) { return new Plot2D(canvas); }, THEME: THEME, niceStep: niceStep };
})(typeof window !== 'undefined' ? window : globalThis);
