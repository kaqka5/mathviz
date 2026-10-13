/* ============================================================
 * mathviz/js/math/geom.js
 * 数值格式化、随机数、二维/三维向量、解三角形与常用几何度量
 * ============================================================ */
(function (global) {
  'use strict';
  var MV = (global.MV = global.MV || {});

  var D2R = Math.PI / 180, R2D = 180 / Math.PI;

  /* ---------- 数值格式化 ---------- */
  function fmt(v, digits) {
    if (v === null || v === undefined || Number.isNaN(v)) return '—';
    if (!Number.isFinite(v)) return v > 0 ? '+∞' : '-∞';
    var d = digits === undefined ? 4 : digits;
    if (Math.abs(v) < 1e-12) v = 0;
    var s = v.toFixed(d);
    if (s.indexOf('.') >= 0) s = s.replace(/0+$/, '').replace(/\.$/, '');
    if (s === '-0') s = '0';
    return s;
  }
  // 约分后的分数（用于常见角度）
  function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { var t = a % b; a = b; b = t; } return a || 1; }
  function frac(n, d) {
    if (d === 0) return String(n);
    var g = gcd(n, d); n = n / g; d = d / g;
    if (d === 1) return String(n);
    return n + '/' + d;
  }
  // 把角度写成 nπ/d 的形式（用于 π 的倍数表示）
  function piFrac(deg) {
    var g = gcd(deg, 180);
    var n = deg / g, d = 180 / g;
    if (d < 0) { n = -n; d = -d; }
    var num = (n === 1 ? '' : n === -1 ? '-' : String(n));
    if (d === 1) return num + 'π';
    return num + 'π/' + d;
  }
  function deg2rad(d) { return d * D2R; }
  function rad2deg(r) { return r * R2D; }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

  /* ---------- 可复现随机数 ---------- */
  function rngFrom(seed) {
    var s = (seed >>> 0) || 1;
    function rnd() {
      s |= 0; s = (s + 0x6D2B79F5) | 0;
      var t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    rnd.int = function (a, b) { return a + Math.floor(rnd() * (b - a + 1)); };
    rnd.pick = function (arr) { return arr[Math.floor(rnd() * arr.length)]; };
    rnd.float = function (a, b, step) {
      var v = a + rnd() * (b - a);
      if (step) v = Math.round(v / step) * step;
      return v;
    };
    return rnd;
  }

  /* ---------- 向量 ---------- */
  var V = {
    sub: function (a, b) { return a.map(function (x, i) { return x - b[i]; }); },
    add: function (a, b) { return a.map(function (x, i) { return x + b[i]; }); },
    mul: function (a, k) { return a.map(function (x) { return x * k; }); },
    dot: function (a, b) { return a.reduce(function (s, x, i) { return s + x * b[i]; }, 0); },
    cross: function (a, b) {
      return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    },
    len: function (a) { return Math.sqrt(V.dot(a, a)); },
    norm: function (a) { var l = V.len(a) || 1; return a.map(function (x) { return x / l; }); },
    dist: function (a, b) { return V.len(V.sub(a, b)); }
  };

  /* ---------- 解三角形 ----------
   * 统一表示：A、B、C 为角度(度)，a、b、c 为对边长度
   * 顶点坐标：A 在原点，B 在 x 轴正方向，C 在 x 轴上方
   */
  function verticesFrom(Adeg, b, c) {
    // b = AC, c = AB, A = ∠BAC
    var A = deg2rad(Adeg);
    return {
      A: [0, 0],
      B: [c, 0],
      C: [b * Math.cos(A), b * Math.sin(A)]
    };
  }

  function anglesFromSides(a, b, c) {
    var A = rad2deg(Math.acos(clamp((b * b + c * c - a * a) / (2 * b * c), -1, 1)));
    var B = rad2deg(Math.acos(clamp((a * a + c * c - b * b) / (2 * a * c), -1, 1)));
    var C = 180 - A - B;
    return { A: A, B: B, C: C };
  }

  function pack(Adeg, b, c) {
    var pts = verticesFrom(Adeg, b, c);
    var a = V.dist(pts.B, pts.C);
    var ang = anglesFromSides(a, b, c);
    var area = 0.5 * b * c * Math.sin(deg2rad(Adeg));
    var s = (a + b + c) / 2;
    return {
      A: ang.A, B: ang.B, C: ang.C,
      a: a, b: b, c: c,
      area: area,
      semi: s,
      height: b * c * Math.sin(deg2rad(Adeg)) / (a || 1), // a 边上的高
      R: a / (2 * Math.sin(deg2rad(ang.A || 1e-9))),       // 外接圆半径
      r: area / (s || 1),                                  // 内切圆半径
      pts: pts
    };
  }

  // 已知三边
  function solveSSS(a, b, c) {
    if (a + b <= c || a + c <= b || b + c <= a) return null;
    return pack(anglesFromSides(a, b, c).A, b, c);
  }
  // 已知两边及夹角 (b、c 与 ∠A)
  function solveSAS(b, c, Adeg) {
    if (Adeg <= 0 || Adeg >= 180) return null;
    return pack(Adeg, b, c);
  }
  // 已知两角与一边：给定 A、B，边 c（AB）=> 余下
  function solveASA(Adeg, Bdeg, c) {
    if (Adeg <= 0 || Bdeg <= 0 || Adeg + Bdeg >= 180) return null;
    var Cdeg = 180 - Adeg - Bdeg;
    var k = c / Math.sin(deg2rad(Cdeg));      // 正弦定理比例
    var a = k * Math.sin(deg2rad(Adeg));
    var b = k * Math.sin(deg2rad(Bdeg));
    return pack(Adeg, b, c);
  }
  // 已知两边及其中一边的对角（SSA，可能两解），返回数组
  function solveSSA(a, b, Adeg) {
    var A = deg2rad(Adeg);
    var sinB = clamp(b * Math.sin(A) / a, -1, 1);
    var B1 = rad2deg(Math.asin(sinB));
    var out = [];
    [B1, 180 - B1].forEach(function (Bdeg) {
      var Cdeg = 180 - Adeg - Bdeg;
      if (Cdeg <= 1e-9 || Cdeg >= 180) return;
      var c = a * Math.sin(deg2rad(Cdeg)) / Math.sin(A);
      if (!(c > 0)) return;
      if (out.length && Math.abs(out[0].c - c) < 1e-9) return;
      out.push(pack(Adeg, b, c));
    });
    return out;
  }

  /* ---------- 二维辅助 ---------- */
  function angleAt(p, q, r) {
    // ∠pqr （q 为顶点），返回度数
    var u = V.sub(p, q), w = V.sub(r, q);
    var c = V.dot(u, w) / ((V.len(u) * V.len(w)) || 1);
    return rad2deg(Math.acos(clamp(c, -1, 1)));
  }
  function polyArea(pts) {
    var s = 0;
    for (var i = 0; i < pts.length; i++) {
      var p = pts[i], q = pts[(i + 1) % pts.length];
      s += p[0] * q[1] - q[0] * p[1];
    }
    return Math.abs(s) / 2;
  }

  /* ---------- 立体几何度量 ---------- */
  var Solid = {
    // 圆台/圆柱/圆锥体积、表面积等
    cylinder: function (r, h) {
      return { S侧: 2 * Math.PI * r * h, S表: 2 * Math.PI * r * h + 2 * Math.PI * r * r, V: Math.PI * r * r * h };
    },
    cone: function (r, h) {
      var l = Math.hypot(r, h);
      return { l: l, S侧: Math.PI * r * l, S表: Math.PI * r * (r + l), V: Math.PI * r * r * h / 3, expand: 360 * r / l };
    },
    sphere: function (r) {
      return { S: 4 * Math.PI * r * r, V: 4 / 3 * Math.PI * r * r * r };
    },
    prism: function (side, h, n) {
      var areaBase = n * side * side / (4 * Math.tan(Math.PI / n));
      return { areaBase: areaBase, S侧: n * side * h, S表: n * side * h + 2 * areaBase, V: areaBase * h };
    },
    pyramid: function (side, h, n) {
      var areaBase = n * side * side / (4 * Math.tan(Math.PI / n));
      var apo = side / (2 * Math.tan(Math.PI / n));   // 底面边心距
      var slant = Math.hypot(h, apo);                  // 斜高
      var lat = n * side * slant / 2;
      return {
        areaBase: areaBase, apo: apo, slant: slant,
        S侧: lat, S表: lat + areaBase, V: areaBase * h / 3,
        dihedral: rad2deg(Math.atan2(h, apo)),         // 侧面与底面所成二面角
        edgeAngle: rad2deg(Math.atan2(h, side / (2 * Math.sin(Math.PI / n)))) // 侧棱与底面所成角
      };
    }
  };

  /* 把 A1、x2 这样的标签写成下标形式 A₁、x₂ */
  var SUB_DIGITS = { '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉' };
  function subNum(t) {
    var s = String(t == null ? '' : t);
    if (!/^[A-Za-z]{1,2}[0-9]+$/.test(s)) return s;
    return s.replace(/[0-9]/g, function (d) { return SUB_DIGITS[d]; });
  }

  MV.G = {
    fmt: fmt, frac: frac, piFrac: piFrac, gcd: gcd, subNum: subNum,
    deg2rad: deg2rad, rad2deg: rad2deg, clamp: clamp,
    rngFrom: rngFrom, V: V,
    verticesFrom: verticesFrom, anglesFromSides: anglesFromSides, pack: pack,
    solveSSS: solveSSS, solveSAS: solveSAS, solveASA: solveASA, solveSSA: solveSSA,
    angleAt: angleAt, polyArea: polyArea, Solid: Solid
  };
})(typeof window !== 'undefined' ? window : globalThis);
