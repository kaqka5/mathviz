/* ============================================================
 * mathviz/js/render/plot3d.js
 * 三维绘图引擎：正交投影 + 凸体消隐（隐藏线虚线）+ 二面角弧 + 拖拽旋转
 * 场景数据格式见 README「场景数据结构」
 * ============================================================ */
(function (global) {
  'use strict';
  var MV = (global.MV = global.MV || {});
  var G = MV.G, V = MV.G.V;

  var THEME = {
    bg: '#ffffff',
    face: 'rgba(96,150,220,0.20)',
    faceBack: 'rgba(148,178,215,0.10)',
    faceStroke: 'rgba(31,78,140,0.35)',
    edge: '#1f4e8c',
    hidden: '#9fb2c9',
    point: '#12324f',
    label: '#0f172a',
    angle: '#b45309',
    angleFill: 'rgba(217,119,6,0.16)',
    highlight: '#dc2626',
    emphasis: '#0e9f6e'
  };

  function Plot3D(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.scene = null;
    this.view = { yaw: -0.62, pitch: 0.34, zoom: 1, panX: 0, panY: 0 };
  }

  Plot3D.prototype.setScene = function (scene, keepView) {
    this.scene = scene;
    if (!keepView) {
      var v = scene.view || {};
      this.view = {
        yaw: v.yaw !== undefined ? v.yaw : -0.62,
        pitch: v.pitch !== undefined ? v.pitch : 0.34,
        zoom: 1, panX: 0, panY: 0
      };
    }
    this.render();
  };

  Plot3D.prototype._layout = function () {
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
    return { w: w, h: h };
  };

  Plot3D.prototype._camera = function () {
    var yaw = this.view.yaw, pitch = this.view.pitch;
    var dir = [Math.cos(pitch) * Math.cos(yaw), Math.cos(pitch) * Math.sin(yaw), Math.sin(pitch)];
    var up = [0, 0, 1];
    var right = V.cross(dir, up);
    if (V.len(right) < 1e-6) right = [1, 0, 0];
    right = V.norm(right);
    var camUp = V.norm(V.cross(right, dir));
    return { dir: V.norm(dir), right: right, up: camUp };
  };

  Plot3D.prototype.render = function () {
    var size = this._layout();
    if (!size || !this.scene) return;
    var scene = this.scene, ctx = this.ctx;
    var theme = Object.assign({}, THEME, scene.theme || {});
    var P = scene.points || {};
    var cam = this._camera();

    // 场景中心
    var lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity], n = 0, sum = [0, 0, 0];
    Object.keys(P).forEach(function (k) {
      var p = P[k];
      for (var i = 0; i < 3; i++) { lo[i] = Math.min(lo[i], p[i]); hi[i] = Math.max(hi[i], p[i]); sum[i] += p[i]; }
      n++;
    });
    if (!n) { lo = [-1, -1, -1]; hi = [1, 1, 1]; }
    var center = scene.center || [0, 0, 0];
    if (!scene.center) {
      center = [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2];
      if (scene.groundCenter) center[2] = lo[2]; // 以底面为视觉中心
    }

    // 采样辅助点（用于自适应缩放）
    var samples = Object.keys(P).map(function (k) { return P[k]; });
    (scene.items || []).forEach(function (it) {
      if (it.t === 'circle3') {
        var c = P[it.c] || [0, 0, 0];
        var ex = it.axis === 'x' ? [1, 0, 0] : it.axis === 'y' ? [0, 1, 0] : [1, 0, 0];
        var ey = it.axis === 'x' ? [0, 0, 1] : it.axis === 'y' ? [0, 0, 1] : [0, 1, 0];
        for (var a = 0; a < 360; a += 30) {
          var t = G.deg2rad(a);
          samples.push(V.add(c, V.add(V.mul(ex, it.r * Math.cos(t)), V.mul(ey, it.r * Math.sin(t)))));
        }
      }
      if (it.t === 'sphere') {
        var cs = P[it.c] || [0, 0, 0];
        [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]].forEach(function (d) {
          samples.push(V.add(cs, V.mul(d, it.r)));
        });
      }
    });

    function camSpace(p) {
      var v = V.sub(p, center);
      return [V.dot(v, cam.right), V.dot(v, cam.up), V.dot(v, cam.dir)];
    }
    var cs = samples.map(camSpace);
    var xr = [Infinity, -Infinity], yr = [Infinity, -Infinity];
    cs.forEach(function (c) {
      xr[0] = Math.min(xr[0], c[0]); xr[1] = Math.max(xr[1], c[0]);
      yr[0] = Math.min(yr[0], c[1]); yr[1] = Math.max(yr[1], c[1]);
    });
    var sx = Math.max(xr[1] - xr[0], 1e-6), sy = Math.max(yr[1] - yr[0], 1e-6);
    var scale = Math.min(size.w * 0.80 / sx, size.h * 0.80 / sy) * this.view.zoom;
    var ox = size.w / 2 + this.view.panX, oy = size.h / 2 + this.view.panY;
    var cx0 = (xr[0] + xr[1]) / 2, cy0 = (yr[0] + yr[1]) / 2;

    function project(p) {
      var c = camSpace(p);
      return { x: ox + (c[0] - cx0) * scale, y: oy - (c[1] - cy0) * scale, z: c[2] };
    }
    var self = this;
    var projCache = {};
    function proj(name) {
      if (!projCache[name]) projCache[name] = project(P[name]);
      return projCache[name];
    }

    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, size.w, size.h);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    /* ---------- 面：可见性 + 邻接表 ---------- */
    var faces = [];
    (scene.items || []).forEach(function (it) {
      if (it.t !== 'face') return;
      var pts = it.pts.map(function (k) { return P[k]; }).filter(Boolean);
      if (pts.length < 3) return;
      // Newell 法线
      var nx = 0, ny = 0, nz = 0, cx = 0, cy = 0, cz = 0;
      for (var i = 0; i < pts.length; i++) {
        var a = pts[i], b = pts[(i + 1) % pts.length];
        nx += (a[1] - b[1]) * (a[2] + b[2]);
        ny += (a[2] - b[2]) * (a[0] + b[0]);
        nz += (a[0] - b[0]) * (a[1] + b[1]);
        cx += a[0]; cy += a[1]; cz += a[2];
      }
      cx /= pts.length; cy /= pts.length; cz /= pts.length;
      // 凸体消隐（与顶点绕向无关）：先把法线校正为"指向体外"，
      // 再看它与"中心→相机"方向是否同向
      var normal = [nx, ny, nz];
      if (V.len(normal) < 1e-12) return;
      normal = V.norm(normal);
      if (V.dot(normal, V.sub(center, [cx, cy, cz])) > 0) normal = V.mul(normal, -1);
      var front = V.dot(normal, cam.dir) > 0;
      if (it.invert) front = !front;
      faces.push({ item: it, pts: pts, keys: it.pts, front: front, depth: V.dot(V.sub([cx, cy, cz], center), cam.dir), centroid: [cx, cy, cz] });
    });

    var edgeFaces = {};
    faces.forEach(function (f, fi) {
      for (var i = 0; i < f.keys.length; i++) {
        var a = f.keys[i], b = f.keys[(i + 1) % f.keys.length];
        var key = a < b ? a + '|' + b : b + '|' + a;
        (edgeFaces[key] = edgeFaces[key] || []).push(fi);
      }
    });

    function pointVisible(p) {
      // 凸体近似：点在"朝向相机"的一半则可见
      var toEye2 = V.norm(V.sub(p, center));
      return V.dot(toEye2, cam.dir) > 0.002;
    }

    /* ---------- 1. 隐藏棱（虚线，先画） ---------- */
    var drawEdge = function (it, visible) {
      var a = P[it.a], b = P[it.b];
      if (!a || !b) return;
      var pa = project(a), pb = project(b);
      ctx.save();
      if (visible) {
        ctx.setLineDash(it.style === 'dashed' ? [7, 6] : []);
        ctx.strokeStyle = it.color || theme.edge;
        ctx.lineWidth = it.width || 2;
      } else {
        ctx.setLineDash(it.style === 'solid' ? [] : [5, 5]);
        ctx.strokeStyle = it.hiddenColor || theme.hidden;
        ctx.lineWidth = (it.width || 2) * 0.75;
      }
      ctx.beginPath();
      ctx.moveTo(pa.x, pa.y);
      ctx.lineTo(pb.x, pb.y);
      ctx.stroke();
      ctx.restore();
      if (it.label && (visible || it.labelHidden)) {
        var mx = (pa.x + pb.x) / 2, my = (pa.y + pb.y) / 2;
        var dirOut = [((pa.x - ox) + (pb.x - ox)) / 2, ((pa.y - oy) + (pb.y - oy)) / 2];
        var l = Math.hypot(dirOut[0], dirOut[1]) || 1;
        drawLabel(it.label, mx + dirOut[0] / l * 15, my + dirOut[1] / l * 15,
          it.labelColor || theme.label, it.labelSize || 14, 'italic');
      }
    };

    var edges = [], circles = [], circlesTop = [], spheres = [];
    (scene.items || []).forEach(function (it) {
      if (it.t === 'edge') edges.push(it);
      if (it.t === 'circle3') (it.onTop ? circlesTop : circles).push(it);
      if (it.t === 'sphere') spheres.push(it);
    });

    edges.forEach(function (it) {
      if (it.style === 'solid') return;
      var key = it.a < it.b ? it.a + '|' + it.b : it.b + '|' + it.a;
      var adj = edgeFaces[key];
      var visible;
      if (it.style === 'dashed') visible = false;
      else if (adj && adj.length) visible = adj.some(function (fi) { return faces[fi].front; });
      else {
        var mid = V.mul(V.add(P[it.a], P[it.b]), 0.5);
        visible = pointVisible(mid);
      }
      drawEdge(it, visible);
    });

    // 曲面上/底面圆环
    function drawCircle(it) {
      var c = P[it.c] || [0, 0, 0];
      var seg = it.segments || 72;
      var ex, ey;
      if (it.axis === 'x') { ex = [0, 1, 0]; ey = [0, 0, 1]; }
      else if (it.axis === 'y') { ex = [1, 0, 0]; ey = [0, 0, 1]; }
      else { ex = [1, 0, 0]; ey = [0, 1, 0]; }
      if (it.u) ex = it.u; if (it.v) ey = it.v;
      var prev = null, prevVisible = null;
      ctx.lineWidth = it.width || 1.8;
      for (var i = 0; i <= seg; i++) {
        var t = i / seg * Math.PI * 2;
        var p = V.add(c, V.add(V.mul(ex, it.r * Math.cos(t)), V.mul(ey, it.r * Math.sin(t))));
        var q = project(p);
        var vis = it.alwaysVisible ? true : pointVisible(p);
        if (prev) {
          ctx.save();
          if (vis && prevVisible) { ctx.setLineDash([]); ctx.strokeStyle = it.color || theme.edge; }
          else { ctx.setLineDash([5, 5]); ctx.strokeStyle = it.hiddenColor || theme.hidden; }
          ctx.beginPath(); ctx.moveTo(prev.x, prev.y); ctx.lineTo(q.x, q.y); ctx.stroke();
          ctx.restore();
        }
        prev = q; prevVisible = vis;
      }
    }
    circles.forEach(drawCircle);

    /* ---------- 球体：正交投影下就是圆，用径向渐变画出球感 ---------- */
    spheres.forEach(function (it) {
      var c = project(P[it.c] || [0, 0, 0]);
      var R = it.r * scale;
      var g = ctx.createRadialGradient(c.x - R * 0.36, c.y - R * 0.38, R * 0.08, c.x, c.y, R * 1.02);
      g.addColorStop(0, it.inner || 'rgba(228,241,255,0.55)');
      g.addColorStop(0.55, it.mid || 'rgba(178,208,238,0.55)');
      g.addColorStop(1, it.edge || 'rgba(126,170,214,0.72)');
      ctx.beginPath();
      ctx.arc(c.x, c.y, R, 0, Math.PI * 2);
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = it.stroke || '#7fa6cc';
      ctx.lineWidth = 1.3;
      ctx.stroke();
    });
    circlesTop.forEach(drawCircle);

    /* ---------- 2. 面（由远及近） ---------- */
    faces.slice().sort(function (a, b) { return a.depth - b.depth; }).forEach(function (f) {
      var it = f.item;
      var ps = f.pts.map(project);
      ctx.beginPath();
      ps.forEach(function (p, i) { i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); });
      ctx.closePath();
      var base = it.color || (f.front ? theme.face : theme.faceBack);
      ctx.fillStyle = base;
      ctx.fill();
      if (it.outline && f.front) {
        ctx.strokeStyle = it.outlineColor || theme.faceStroke;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    });

    /* ---------- 3. 可见棱 ---------- */
    edges.forEach(function (it) {
      if (it.style === 'dashed' && !it.forceDraw) return;
      var key = it.a < it.b ? it.a + '|' + it.b : it.b + '|' + it.a;
      var adj = edgeFaces[key];
      var visible;
      if (it.style === 'solid') visible = true;
      else if (adj && adj.length) visible = adj.some(function (fi) { return faces[fi].front; });
      else visible = pointVisible(V.mul(V.add(P[it.a], P[it.b]), 0.5));
      if (visible) drawEdge(it, true);
    });

    /* ---------- 4. 角 / 顶点 / 文字 ---------- */
    (scene.items || []).forEach(function (it) {
      if (it.t === 'angle') {
        var v = P[it.v], q1 = P[it.p1], q2 = P[it.p2];
        if (!v || !q1 || !q2) return;
        var u = V.norm(V.sub(q1, v)), w = V.norm(V.sub(q2, v));
        var dot = G.clamp(V.dot(u, w), -1, 1);
        var ang = Math.acos(dot);
        var e2 = V.sub(w, V.mul(u, V.dot(w, u)));
        if (V.len(e2) < 1e-9) return;
        e2 = V.norm(e2);
        var l1 = V.dist(q1, v), l2 = V.dist(q2, v);
        var rad = it.radius !== undefined ? it.radius : Math.min(l1, l2) * (it.radiusFrac || 0.3);
        rad = Math.min(rad, Math.min(l1, l2) * 0.85);
        var segs = 40;
        ctx.save();
        ctx.setLineDash([]);
        ctx.strokeStyle = it.color || theme.angle;
        ctx.lineWidth = it.width || 1.8;
        if (it.right) {
          var sq = rad * 0.6;
          var pA = V.add(v, V.mul(u, sq));
          var pC = V.add(v, V.add(V.mul(u, sq), V.mul(e2, sq)));
          var pB = V.add(v, V.mul(e2, sq));
          var ptsR = [pA, pC, pB].map(project);
          ctx.beginPath();
          ctx.moveTo(ptsR[0].x, ptsR[0].y);
          ctx.lineTo(ptsR[1].x, ptsR[1].y);
          ctx.lineTo(ptsR[2].x, ptsR[2].y);
          ctx.stroke();
        } else {
          ctx.beginPath();
          for (var i = 0; i <= segs; i++) {
            var t2 = ang * i / segs;
            var pp = V.add(v, V.add(V.mul(u, rad * Math.cos(t2)), V.mul(e2, rad * Math.sin(t2))));
            var q = project(pp);
            i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y);
          }
          if (it.fill !== false) {
            // 扇形填充
            var q0 = project(v);
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(q0.x, q0.y);
            for (var j = 0; j <= segs; j++) {
              var t3 = ang * j / segs;
              var pp2 = V.add(v, V.add(V.mul(u, rad * Math.cos(t3)), V.mul(e2, rad * Math.sin(t3))));
              var q2b = project(pp2);
              ctx.lineTo(q2b.x, q2b.y);
            }
            ctx.closePath();
            ctx.fillStyle = it.fillColor || theme.angleFill;
            ctx.fill();
            ctx.restore();
          }
          ctx.stroke();
        }
        if (it.label !== false && it.label !== undefined) {
          var mid = ang / 2;
          var lp = V.add(v, V.add(V.mul(u, rad * 1.5 * Math.cos(mid)), V.mul(e2, rad * 1.5 * Math.sin(mid))));
          var ql = project(lp);
          drawLabel(it.label, ql.x, ql.y, it.labelColor || theme.angle, it.labelSize || 14, 'italic');
        }
        ctx.restore();
      }
    });

    (scene.items || []).forEach(function (it) {
      if (it.t === 'point') {
        var p = project(P[it.at] || [0, 0, 0]);
        ctx.beginPath();
        ctx.arc(p.x, p.y, it.r || 3.2, 0, Math.PI * 2);
        ctx.fillStyle = it.color || theme.point;
        ctx.fill();
      }
    });

    (scene.items || []).forEach(function (it) {
      if (it.t === 'pointLabel' || (it.t === 'point' && it.label)) {
        var name = it.at;
        var p = P[name];
        if (!p) return;
        var q = project(p);
        var dx = q.x - ox, dy = q.y - oy;
        var l = Math.hypot(dx, dy) || 1;
        dx /= l; dy /= l;
        if (it.labelDir) { dx = it.labelDir[0]; dy = it.labelDir[1]; }
        var off = it.labelOffset || 16;
        drawLabel(it.label, q.x + dx * off, q.y + dy * off,
          it.labelColor || theme.label, it.labelSize || 16, 'point');
      }
      if (it.t === 'text3') {
        var q2 = project(it.at);
        drawLabel(it.text, q2.x + (it.dx || 0), q2.y + (it.dy || 0), it.color || theme.label, it.size || 14, it.font);
      }
    });

    function drawLabel(text, x, y, color, size, font, align) {
      if (text === undefined || text === null || text === '') return;
      text = MV.G.subNum(text);
      ctx.font = font === 'point'
        ? 'italic 700 ' + size + 'px "Times New Roman", Georgia, serif'
        : '600 ' + size + 'px system-ui, "Segoe UI", sans-serif';
      ctx.textAlign = align || 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 3.4;
      ctx.strokeStyle = 'rgba(255,255,255,0.95)';
      ctx.strokeText(String(text), x, y);
      ctx.fillStyle = color || '#0f172a';
      ctx.fillText(String(text), x, y);
    }

    /* 图例 */
    if (scene.legend && scene.legend.length) {
      ctx.font = '13.5px system-ui, sans-serif';
      var pad = 10, lh = 20;
      var wMax = 0;
      scene.legend.forEach(function (t) { wMax = Math.max(wMax, ctx.measureText(t).width); });
      var bw = wMax + pad * 2, bh = scene.legend.length * lh + pad * 1.4;
      var bx = size.w - bw - 12, by = 12;
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.strokeStyle = '#dbe4f0'; ctx.lineWidth = 1;
      ctx.beginPath();
      var r = 8;
      ctx.moveTo(bx + r, by);
      ctx.arcTo(bx + bw, by, bx + bw, by + bh, r);
      ctx.arcTo(bx + bw, by + bh, bx, by + bh, r);
      ctx.arcTo(bx, by + bh, bx, by, r);
      ctx.arcTo(bx, by, bx + bw, by, r);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#334155';
      ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      scene.legend.forEach(function (t, i) { ctx.fillText(t, bx + pad, by + pad * 0.7 + i * lh); });
    }

    this.transform = { project: project, scale: scale };
  };

  MV.Render3D = {
    create: function (canvas) { return new Plot3D(canvas); },
    THEME: THEME
  };
})(typeof window !== 'undefined' ? window : globalThis);
