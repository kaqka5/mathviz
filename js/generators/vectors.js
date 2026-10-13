/* ============================================================
 * mathviz/js/generators/vectors.js
 * 平面向量题目生成器
 * ============================================================ */
(function (global) {
  'use strict';
  var MV = (global.MV = global.MV || {});
  var G = MV.G, H = MV.GenHelp, P = H.P, n = H.n;

  var dotGen = H.def({
    id: 'vec_dot',
    category: '平面向量',
    name: '向量的数量积与模',
    hint: '夹角公式、|a+b|、|a−b| 与平行四边形',
    make: function (rng) {
      return [
        P('m', '|a|', 1, 8, 0.5, rng.int(2, 7)),
        P('n2', '|b|', 1, 8, 0.5, rng.int(2, 7)),
        P('angle', '夹角 θ', 0, 180, 5, rng.pick([30, 45, 60, 90, 120, 135, 150]))
      ];
    },
    build: function (v) {
      var m = v.m, nn = v.n2, th = v.angle;
      var cos = Math.cos(G.deg2rad(th)), sin = Math.sin(G.deg2rad(th));
      var dot = m * nn * cos;
      var sumLen = Math.sqrt(m * m + nn * nn + 2 * dot);
      var diffLen = Math.sqrt(Math.max(0, m * m + nn * nn - 2 * dot));
      var cosWithA = (m * m + dot) / ((sumLen * m) || 1);
      var angWithA = G.rad2deg(Math.acos(G.clamp(cosWithA, -1, 1)));
      var cosThExact = H.cosStr(th), sinThExact = H.sinStr(th);
      var area = m * nn * Math.abs(sin);

      var scene = MV.Geo2D.vectors({
        m: m, n: nn, angle: th,
        showSum: true, showDiff: false,
        labelA: 'a', labelB: 'b', labelS: 'a+b',
        nameA: 'A', nameB: 'B', nameS: 'C',
        equations: ['a·b = ' + n(dot, 4), '|a+b| = ' + n(sumLen, 4)],
        readouts: [
          { label: 'a·b', value: n(dot, 4) },
          { label: '|a+b|', value: n(sumLen, 4) },
          { label: '|a−b|', value: n(diffLen, 4) }
        ]
      });

      var steps = [{
        title: '第 1 步：求数量积',
        body: '数量积的定义：$\\mathbf{a}\\cdot\\mathbf{b}=|\\mathbf{a}||\\mathbf{b}|\\cos\\theta$。' +
          '$$\\mathbf{a}\\cdot\\mathbf{b}=' + n(m) + '\\times' + n(nn) + '\\times' +
          (cosThExact ? '\\left(' + cosThExact + '\\right)' : n(cos, 5)) + '\\approx' + n(dot, 4) + '$$'
      }, {
        title: '第 2 步：求 |a+b|',
        body: '$$|\\mathbf{a}+\\mathbf{b}|^2=(\\mathbf{a}+\\mathbf{b})^2=|\\mathbf{a}|^2+2\\mathbf{a}\\cdot\\mathbf{b}+|\\mathbf{b}|^2' +
          '=' + n(m * m, 4) + '+' + n(2 * dot, 4) + '+' + n(nn * nn, 4) + '=' + n(m * m + nn * nn + 2 * dot, 4) + '$$' +
          '所以 $|\\mathbf{a}+\\mathbf{b}|\\approx' + n(sumLen, 4) + '$。'
      }, {
        title: '第 3 步：求 |a−b|',
        body: '$$|\\mathbf{a}-\\mathbf{b}|^2=|\\mathbf{a}|^2-2\\mathbf{a}\\cdot\\mathbf{b}+|\\mathbf{b}|^2=' +
          n(m * m + nn * nn - 2 * dot, 4) + '$$所以 $|\\mathbf{a}-\\mathbf{b}|\\approx' + n(diffLen, 4) + '$。'
      }, {
        title: '第 4 步：求 a+b 与 a 的夹角',
        body: '$$\\cos\\langle\\mathbf{a}+\\mathbf{b},\\mathbf{a}\\rangle=' +
          '\\frac{(\\mathbf{a}+\\mathbf{b})\\cdot\\mathbf{a}}{|\\mathbf{a}+\\mathbf{b}||\\mathbf{a}|}' +
          '=\\frac{' + n(m * m + dot, 4) + '}{' + n(sumLen, 4) + '\\times' + n(m) + '}\\approx' + n(cosWithA, 5) + '$$' +
          '所以夹角 $\\approx' + n(angWithA, 2) + '°$。'
      }, {
        title: '第 5 步：几何意义与特殊情况',
        body: '以 $\\mathbf{a}$、$\\mathbf{b}$ 为邻边的平行四边形面积 $S=|\\mathbf{a}||\\mathbf{b}|\\sin\\theta\\approx' + n(area, 4) + '$。' +
          (Math.abs(m - nn) < 1e-9 ? '本题中 $|\\mathbf{a}|=|\\mathbf{b}|$，此时 $\\mathbf{a}+\\mathbf{b}$ 与 $\\mathbf{a}-\\mathbf{b}$ 互相垂直（菱形的两条对角线垂直）。'
            : '当 $\\theta=90°$ 时 $\\mathbf{a}\\cdot\\mathbf{b}=0$，两向量垂直；当 $\\theta=180°$ 时数量积取最小值 $-' + n(m * nn) + '$。')
      }];

      return {
        statement: '已知 $|\\mathbf{a}|=' + n(m) + '$，$|\\mathbf{b}|=' + n(nn) + '$，$\\mathbf{a}$ 与 $\\mathbf{b}$ 的夹角 $\\theta=' + n(th) +
          '°$。求 $\\mathbf{a}\\cdot\\mathbf{b}$、$|\\mathbf{a}+\\mathbf{b}|$、$|\\mathbf{a}-\\mathbf{b}|$ 以及 $\\mathbf{a}+\\mathbf{b}$ 与 $\\mathbf{a}$ 的夹角。',
        steps: steps,
        answer: '$\\mathbf{a}\\cdot\\mathbf{b}\\approx' + n(dot, 4) + '$，$|\\mathbf{a}+\\mathbf{b}|\\approx' + n(sumLen, 4) +
          '$，$|\\mathbf{a}-\\mathbf{b}|\\approx' + n(diffLen, 4) + '$，$\\langle\\mathbf{a}+\\mathbf{b},\\mathbf{a}\\rangle\\approx' + n(angWithA, 2) + '°$。',
        scene: scene,
        readouts: [
          { label: '|a|', value: n(m, 3) },
          { label: '|b|', value: n(nn, 3) },
          { label: '夹角 θ', value: n(th) + '°' },
          { label: 'a·b', value: n(dot, 4) },
          { label: '|a+b|', value: n(sumLen, 4) },
          { label: '|a−b|', value: n(diffLen, 4) },
          { label: '角度 ⟨a+b, a⟩', value: n(angWithA, 2) + '°' }
        ]
      };
    }
  });

  MV.VectorGen = { list: [dotGen] };
})(typeof window !== 'undefined' ? window : globalThis);
