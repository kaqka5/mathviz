/* ============================================================
 * mathviz/js/generators/analytic.js
 * 解析几何题目生成器：直线与圆、圆与圆的位置关系
 * ============================================================ */
(function (global) {
  'use strict';
  var MV = (global.MV = global.MV || {});
  var G = MV.G, H = MV.GenHelp, P = H.P, n = H.n;

  /* ---------- 直线与圆 ---------- */
  var lineCircle = H.def({
    id: 'line_circle',
    category: '解析几何',
    name: '直线与圆的位置关系',
    hint: '圆心到直线的距离与半径比较，弦长公式',
    make: function (rng) {
      return [
        P('r', '圆的半径 r', 1, 8, 0.5, rng.pick([2, 3, 4, 5])),
        P('k', '直线斜率 k', -3, 3, 0.5, rng.pick([0.5, 1, 1.5, 2, -1, -0.5])),
        P('b', '直线截距 b', -8, 8, 0.5, rng.int(-7, 7))
      ];
    },
    build: function (v) {
      var r = v.r, k = v.k, b = v.b;
      var d = Math.abs(b) / Math.sqrt(k * k + 1);
      var rel = d > r + 1e-9 ? '相离' : (Math.abs(d - r) <= 1e-9 ? '相切' : '相交');
      var A = 1 + k * k, Bq = 2 * k * b, Cq = b * b - r * r;
      var disc = Bq * Bq - 4 * A * Cq;
      var inter = [];
      if (disc >= 0) {
        var sq = Math.sqrt(disc);
        var xs = disc === 0 ? [-Bq / (2 * A)] : [(-Bq - sq) / (2 * A), (-Bq + sq) / (2 * A)];
        inter = xs.map(function (x) { return [x, k * x + b]; });
      }
      var chord = rel === '相交' ? 2 * Math.sqrt(Math.max(0, r * r - d * d)) : 0;
      var foot = [-k * b / (1 + k * k), b / (1 + k * k)];

      var steps = [{
        title: '第 1 步：写出圆心与半径',
        body: '圆的方程 $x^2+y^2=' + n(r * r, 4) + '$ 表示圆心 $O(0,0)$、半径 $r=' + n(r) + '$ 的圆；' +
          '直线 $l:\\ y=' + n(k) + 'x' + (b >= 0 ? '+' : '') + n(b) + '$，即 $' + n(k) + 'x-y' + (b >= 0 ? '+' : '') + n(b) + '=0$。'
      }, {
        title: '第 2 步：求圆心到直线的距离',
        body: '点 $O(0,0)$ 到直线 $' + n(k) + 'x-y' + (b >= 0 ? '+' : '') + n(b) + '=0$ 的距离：' +
          '$$d=\\frac{|' + n(k) + '\\times0-0' + (b >= 0 ? '+' : '') + n(b) + '|}{\\sqrt{' + n(k) + '^2+(-1)^2}}' +
          '=\\frac{' + n(Math.abs(b)) + '}{\\sqrt{' + n(A) + '}}\\approx' + n(d, 4) + '$$'
      }, {
        title: '第 3 步：用 d 与 r 判断位置关系',
        body: '比较 $d\\approx' + n(d, 4) + '$ 与 $r=' + n(r) + '$：' +
          (rel === '相离' ? '$d>r$，直线与圆**相离**，圆上的点到直线的最短距离为 $d-r\\approx' + n(d - r, 4) + '$。'
            : rel === '相切' ? '$d=r$，直线与圆**相切**，切点为 $(' + n(inter[0][0], 4) + ',\\ ' + n(inter[0][1], 4) + ')$。'
              : '$d<r$，直线与圆**相交**，有两个公共点。')
      }];

      if (rel === '相交') {
        steps.push({
          title: '第 4 步：求弦长',
          body: '垂径定理：弦长 $|AB|=2\\sqrt{r^2-d^2}=2\\sqrt{' + n(r * r, 4) + '-' + n(d * d, 4) + '}' +
            '=2\\sqrt{' + n(r * r - d * d, 4) + '}\\approx' + n(chord, 4) + '$。'
        });
        steps.push({
          title: '第 5 步：求交点坐标（联立方程）',
          body: '把 $y=' + n(k) + 'x' + (b >= 0 ? '+' : '') + n(b) + '$ 代入 $x^2+y^2=' + n(r * r, 4) + '$：' +
            '$$' + n(A) + 'x^2' + (Bq >= 0 ? '+' : '') + n(Bq) + 'x' + (Cq >= 0 ? '+' : '') + n(Cq) + '=0$$' +
            '解得 $x_1\\approx' + n(inter[0][0], 4) + '$，$x_2\\approx' + n(inter[1][0], 4) + '$，' +
            '对应 $y_1\\approx' + n(inter[0][1], 4) + '$，$y_2\\approx' + n(inter[1][1], 4) + '$。'
        });
        steps.push({
          title: '第 6 步：验证垂直关系',
          body: '设弦 $AB$ 的中点为 $H(' + n(foot[0], 4) + ',\\ ' + n(foot[1], 4) + ')$，则 $OH\\perp AB$，' +
            '且 $|OH|=d\\approx' + n(d, 4) + '$、$|AH|=\\frac{|AB|}{2}\\approx' + n(chord / 2, 4) + '$，' +
            '在 $\\mathrm{Rt}\\triangle OHA$ 中 $|OA|^2=|OH|^2+|AH|^2$，与 $r=' + n(r) + '$ 一致。'
        });
      } else if (rel === '相切') {
        steps.push({
          title: '第 4 步：切线性质',
          body: '切点 $T$ 满足 $OT\\perp l$，所以 $|OT|=d=r=' + n(r) + '$。切点坐标 $T(' + n(inter[0][0], 4) + ',\\ ' +
            n(inter[0][1], 4) + ')$。'
        });
      } else {
        steps.push({
          title: '第 4 步：最值',
          body: '圆上一点到直线 $l$ 的距离最大值为 $d+r\\approx' + n(d + r, 4) + '$，最小值为 $d-r\\approx' + n(d - r, 4) + '$。'
        });
      }

      var scene = MV.Geo2D.circleLine({
        r: r, k: k, b: b,
        equations: ['x² + y² = ' + n(r * r, 4), 'y = ' + n(k) + 'x ' + (b >= 0 ? '+ ' : '− ') + n(Math.abs(b))],
        readouts: [
          { label: '圆心距 d', value: n(d, 4) },
          { label: '位置关系', value: rel },
          { label: '弦长 |AB|', value: rel === '相交' ? n(chord, 4) : '—' }
        ]
      });

      return {
        statement: '已知圆 $C:\\ x^2+y^2=' + n(r * r, 4) + '$ 与直线 $l:\\ y=' + n(k) + 'x' + (b >= 0 ? '+' : '') + n(b) +
          '$。判断直线与圆的位置关系；若相交，求弦长与交点坐标。',
        steps: steps,
        answer: '圆心距 $d\\approx' + n(d, 4) + '$，' + (rel === '相离' ? '$d>r$，相离。'
          : rel === '相切' ? '$d=r$，相切于 $(' + n(inter[0][0], 4) + ',\\ ' + n(inter[0][1], 4) + ')$。'
            : '$d<r$，相交，弦长 $|AB|\\approx' + n(chord, 4) + '$，交点 $(' + n(inter[0][0], 4) + ',\\ ' + n(inter[0][1], 4) +
            ')$ 与 $(' + n(inter[1][0], 4) + ',\\ ' + n(inter[1][1], 4) + ')$。'),
        scene: scene,
        readouts: [
          { label: '圆心距 d', value: n(d, 4) },
          { label: '半径 r', value: n(r, 3) },
          { label: '位置关系', value: rel },
          { label: '弦长 |AB|', value: rel === '相交' ? n(chord, 4) : '—' },
          { label: 'r² − d²', value: n(r * r - d * d, 4) }
        ]
      };
    }
  });

  /* ---------- 两圆位置关系 ---------- */
  var circleCircle = H.def({
    id: 'circle_circle',
    category: '解析几何',
    name: '两圆的位置关系',
    hint: '比较圆心距与 |r₁−r₂|、r₁+r₂',
    make: function (rng) {
      return [
        P('r1', '圆 C₁ 半径 r₁', 1, 7, 0.5, rng.pick([2, 3, 4, 5])),
        P('r2', '圆 C₂ 半径 r₂', 1, 7, 0.5, rng.pick([1.5, 2, 3, 4])),
        P('d', '圆心距 d', 0.5, 12, 0.5, rng.int(2, 11))
      ];
    },
    build: function (v) {
      var r1 = v.r1, r2 = v.r2, d = v.d;
      var dd = Math.abs(r1 - r2), sum = r1 + r2;
      var rel;
      if (d > sum + 1e-9) rel = '外离';
      else if (Math.abs(d - sum) <= 1e-9) rel = '外切';
      else if (d < dd - 1e-9) rel = '内含';
      else if (Math.abs(d - dd) <= 1e-9) rel = '内切';
      else rel = '相交';
      var inter = [];
      if (rel === '相交') {
        var a = (d * d + r1 * r1 - r2 * r2) / (2 * d);
        var h = Math.sqrt(Math.max(0, r1 * r1 - a * a));
        inter = [[a, h], [a, -h]];
      }
      var chord = rel === '相交' ? 2 * Math.sqrt(Math.max(0, r1 * r1 - ((d * d + r1 * r1 - r2 * r2) / (2 * d)) *
        ((d * d + r1 * r1 - r2 * r2) / (2 * d)))) : 0;
      var tangents = rel === '外离' ? 4 : rel === '外切' ? 3 : rel === '相交' ? 2 : rel === '内切' ? 1 : 0;

      var steps = [{
        title: '第 1 步：写出圆心距',
        body: '$C_1:(x)^2+y^2=' + n(r1 * r1, 4) + '$，圆心 $O_1(0,0)$，半径 $r_1=' + n(r1) + '$；' +
          '$C_2:(x-' + n(d) + ')^2+y^2=' + n(r2 * r2, 4) + '$，圆心 $O_2(' + n(d) + ',0)$，半径 $r_2=' + n(r2) + '$。' +
          '圆心距 $d=|O_1O_2|=' + n(d) + '$。'
      }, {
        title: '第 2 步：计算两个临界值',
        body: '$$r_1+r_2=' + n(sum) + ',\\qquad |r_1-r_2|=' + n(dd) + '$$'
      }, {
        title: '第 3 步：比较大小并判断',
        body: (rel === '外离' ? '$d>r_1+r_2$' : rel === '外切' ? '$d=r_1+r_2$' : rel === '相交' ? '$|r_1-r_2|<d<r_1+r_2$'
          : rel === '内切' ? '$d=|r_1-r_2|$' : '$d<|r_1-r_2|$') + '，所以两圆**' + rel + '**。' +
          '公切线条数：$' + tangents + '$ 条。'
      }];
      if (rel === '相交') {
        steps.push({
          title: '第 4 步：求公共弦长与交点',
          body: '设公共弦 $AB$ 与 $O_1O_2$ 交于 $H$，由 $|O_1H|=\\frac{d^2+r_1^2-r_2^2}{2d}=' + n((d * d + r1 * r1 - r2 * r2) / (2 * d), 4) +
            '$ 与 $|AH|=\\sqrt{r_1^2-|O_1H|^2}$ 得公共弦长 $|AB|\\approx' + n(chord, 4) + '$；' +
            '交点坐标为 $(' + n(inter[0][0], 4) + ',\\ ' + n(inter[0][1], 4) + ')$、$(' + n(inter[1][0], 4) + ',\\ ' + n(inter[1][1], 4) + ')$。'
        });
      } else if (rel === '外切' || rel === '内切') {
        steps.push({
          title: '第 4 步：切点位置',
          body: rel === '外切' ? '两圆外切，切点在线段 $O_1O_2$ 上，坐标为 $(' + n(r1) + ',\\ 0)$。'
            : '两圆内切，切点在两圆心的连线上，坐标为 $(' + n(r1 >= r2 ? r1 : -r1) + ',\\ 0)$。'
        });
      } else if (rel === '外离') {
        steps.push({
          title: '第 4 步：最值',
          body: '两圆外离时，圆上两点间距离的最大值为 $d+r_1+r_2=' + n(d + r1 + r2) + '$，最小值为 $d-r_1-r_2=' + n(d - r1 - r2) + '$。'
        });
      } else {
        steps.push({
          title: '第 4 步：内含时的最值',
          body: '小圆在大圆内部，圆上两点间距离的最大值为 $d+\\max(r_1,r_2)-\\min(r_1,r_2)=' + n(d + Math.abs(r1 - r2)) +
            '$（当大圆包含小圆时最小值为 $\\max(r_1,r_2)-\\min(r_1,r_2)-d=' + n(dd - d) + '$）。'
        });
      }

      var scene = MV.Geo2D.twoCircles({
        r1: r1, r2: r2, d: d,
        equations: ['C₁: x² + y² = ' + n(r1 * r1, 4), 'C₂: (x−' + n(d) + ')² + y² = ' + n(r2 * r2, 4)],
        readouts: [
          { label: 'r₁ + r₂', value: n(sum, 3) },
          { label: '|r₁ − r₂|', value: n(dd, 3) },
          { label: '圆心距 d', value: n(d, 3) },
          { label: '位置关系', value: rel }
        ]
      });

      return {
        statement: '已知圆 $C_1:\\ x^2+y^2=' + n(r1 * r1, 4) + '$ 与圆 $C_2:\\ (x-' + n(d) + ')^2+y^2=' + n(r2 * r2, 4) +
          '$。判断两圆的位置关系，说明公切线的条数' + (rel === '相交' ? '并求公共弦长。' : '。'),
        steps: steps,
        answer: '因为 $d=' + n(d) + '$，$r_1+r_2=' + n(sum) + '$，$|r_1-r_2|=' + n(dd) + '$，所以两圆' + rel +
          '，公切线 $' + tangents + '$ 条' + (rel === '相交' ? '，公共弦长 $\\approx' + n(chord, 4) + '$。' : '。'),
        scene: scene,
        readouts: [
          { label: 'r₁ + r₂', value: n(sum, 3) },
          { label: '|r₁ − r₂|', value: n(dd, 3) },
          { label: '圆心距 d', value: n(d, 3) },
          { label: '位置关系', value: rel },
          { label: '公切线条数', value: String(tangents) },
          { label: '公共弦长', value: rel === '相交' ? n(chord, 4) : '—' }
        ]
      };
    }
  });

  MV.AnalyticGen = { list: [lineCircle, circleCircle] };
})(typeof window !== 'undefined' ? window : globalThis);
