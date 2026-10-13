/* ============================================================
 * mathviz/js/generators/helpers.js
 * 生成器公共工具
 * ============================================================ */
(function (global) {
  'use strict';
  var MV = (global.MV = global.MV || {});
  var G = MV.G;

  function P(key, label, min, max, step, value, unit, opts) {
    var o = { key: key, label: label, min: min, max: max, step: step, value: value, unit: unit || '' };
    if (opts) Object.assign(o, opts);
    return o;
  }

  /* 把 v 写成 m√k 的最简根式（能化简就化简） */
  function sqrtNice(v) {
    if (!(v >= 0)) return { exact: null, approx: NaN };
    if (v < 1e-12) return { exact: '0', approx: 0 };
    var best = 1;
    for (var m = 2; m <= 60; m++) {
      var q = v / (m * m);
      if (Math.abs(q - Math.round(q)) < 1e-9) best = m;
    }
    var k = v / (best * best);
    if (Math.abs(k - Math.round(k)) > 1e-6) return { exact: null, approx: Math.sqrt(v) };
    k = Math.round(k);
    var exact = k === 1 ? String(best) : (best === 1 ? '' : String(best)) + '√' + k;
    return { exact: exact, approx: Math.sqrt(v) };
  }

  /* 数值：整数就直接写，否则保留 4 位 */
  function n(v, d) { return G.fmt(v, d === undefined ? 4 : d); }

  /* 分数化简展示 */
  function fracOf(num, den) {
    if (Math.abs(den) < 1e-12) return String(num);
    var g = G.gcd(num, den);
    var a = num / g, b = den / g;
    if (b < 0) { a = -a; b = -b; }
    if (b === 1) return String(a);
    return '\\frac{' + a + '}{' + b + '}';
  }

  /* 二次根式化简展示： (m√k)/d */
  function radFrac(sq, d) {
    // sq = {exact, approx}; 展示 √v/d 化简
    var exact = sq.exact;
    if (!exact) return n(sq.approx, 4);
    var m = exact.match(/^(\d*)√(\d+)$/);
    if (!m) return exact;
    var a = m[1] === '' ? 1 : parseInt(m[1], 10), k = parseInt(m[2], 10);
    var g = G.gcd(G.gcd(a, d), 1);
    var g2 = G.gcd(a, d);
    var na = a / g2, nd = d / g2;
    if (nd === 1) return (na === 1 ? '' : na) + '√' + k;
    return '\\frac{' + (na === 1 ? '' : na) + '√' + k + '}{' + nd + '}';
  }

  /* 角度转"度分"或保留一位小数 */
  function ang(v, d) { return n(v, d === undefined ? 1 : d) + '°'; }

  /* 参数值打包成对象 */
  function values(params) {
    var o = {};
    params.forEach(function (p) { o[p.key] = p.value; });
    return o;
  }

  /* 随机重排参数（换一题） */
  function reroll(params, rng) {
    params.forEach(function (p) {
      if (p.fixed) return;
      var steps = Math.max(1, Math.round((p.max - p.min) / p.step));
      var k = Math.floor(rng() * (steps + 1));
      p.value = +(p.min + k * p.step).toFixed(6);
    });
    return params;
  }

  /* 由"参数定义" + "随机初值函数"创建生成器 */
  function def(cfg) {
    return {
      id: cfg.id,
      name: cfg.name,
      category: cfg.category,
      hint: cfg.hint || '',
      make: cfg.make,          // (rng) => params[]
      build: cfg.build         // (vals) => {statement, steps, answer, scene, readouts}
    };
  }

  /* 常用特殊角的精确三角函数值（用于展示化简过程） */
  var SIN = {
    0: '0', 30: '\\frac{1}{2}', 45: '\\frac{\\sqrt{2}}{2}', 60: '\\frac{\\sqrt{3}}{2}',
    90: '1', 120: '\\frac{\\sqrt{3}}{2}', 135: '\\frac{\\sqrt{2}}{2}', 150: '\\frac{1}{2}', 180: '0'
  };
  var COS = {
    0: '1', 30: '\\frac{\\sqrt{3}}{2}', 45: '\\frac{\\sqrt{2}}{2}', 60: '\\frac{1}{2}',
    90: '0', 120: '-\\frac{1}{2}', 135: '-\\frac{\\sqrt{2}}{2}', 150: '-\\frac{\\sqrt{3}}{2}', 180: '-1'
  };
  function sinStr(deg) {
    var d = ((deg % 360) + 360) % 360;
    if (d > 180) d = 360 - d;
    if (SIN[d] !== undefined) return SIN[d];
    if (d >= 90) return SIN[180 - d] !== undefined ? SIN[180 - d] : null;
    return null;
  }
  function cosStr(deg) {
    var d = ((deg % 360) + 360) % 360;
    if (d > 180) d = 360 - d;
    if (COS[d] !== undefined) return COS[d];
    return null;
  }

  MV.GenHelp = {
    P: P, sqrtNice: sqrtNice, n: n, fracOf: fracOf, radFrac: radFrac,
    ang: ang, values: values, reroll: reroll, def: def,
    sinStr: sinStr, cosStr: cosStr, piFrac: G.piFrac
  };
})(typeof window !== 'undefined' ? window : globalThis);
