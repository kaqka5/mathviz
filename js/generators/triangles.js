/* ============================================================
 * mathviz/js/generators/triangles.js
 * 解三角形题目生成器
 * ============================================================ */
(function (global) {
  'use strict';
  var MV = (global.MV = global.MV || {});
  var G = MV.G, H = MV.GenHelp, P = H.P, n = H.n;

  function rad(d) { return G.deg2rad(d); }
  function invalidScene(msg) {
    return {
      kind: '2d', grid: false, axes: false,
      points: { O: [0, 0] },
      items: [
        { t: 'text', at: 'O', text: msg, size: 17, color: '#dc2626', dy: -6 },
        { t: 'text', at: 'O', text: '请拖动参数滑块，使两边之和大于第三边', size: 13.5, color: '#64748b', dy: 20 }
      ]
    };
  }
  function readoutsOf(tri) {
    return [
      { label: 'a = BC', value: n(tri.a, 4) },
      { label: 'b = CA', value: n(tri.b, 4) },
      { label: 'c = AB', value: n(tri.c, 4) },
      { label: '∠A', value: n(tri.A, 1) + '°' },
      { label: '∠B', value: n(tri.B, 1) + '°' },
      { label: '∠C', value: n(tri.C, 1) + '°' },
      { label: '面积 S', value: n(tri.area, 4) },
      { label: '周长', value: n(tri.a + tri.b + tri.c, 4) },
      { label: '内切圆半径 r', value: n(tri.r, 4) },
      { label: '外接圆半径 R', value: n(tri.R, 4) }
    ];
  }

  /* ---------- 1. 两边及夹角 (SAS) ---------- */
  var sas = H.def({
    id: 'tri_sas',
    category: '解三角形',
    name: '已知两边及夹角',
    hint: '余弦定理求第三边，再求面积与其余两角',
    make: function (rng) {
      return [
        P('A', '夹角 ∠A', 15, 165, 1, rng.pick([30, 45, 60, 75, 90, 105, 120, 135]), '°'),
        P('b', '边 AC = b', 3, 12, 0.5, rng.int(4, 10)),
        P('c', '边 AB = c', 3, 12, 0.5, rng.int(4, 10))
      ];
    },
    build: function (v) {
      var A = v.A, b = v.b, c = v.c;
      var tri = G.solveSAS(b, c, A);
      var a2 = b * b + c * c - 2 * b * c * Math.cos(rad(A));
      var sq = H.sqrtNice(a2);
      var S = tri.area;
      var sinA = H.sinStr(A), cosA = H.cosStr(A);
      var cosATxt = cosA || n(Math.cos(rad(A)), 4);
      var sinATxt = sinA || n(Math.sin(rad(A)), 4);

      var steps = [{
        title: '第 1 步：用余弦定理求 BC',
        body: '在 △ABC 中，已知两边 b、c 及其夹角 A，用余弦定理：$$a^2=b^2+c^2-2bc\\cos A$$' +
          '代入数据：$$a^2=' + n(b) + '^2+' + n(c) + '^2-2\\times' + n(b) + '\\times' + n(c) +
          '\\times\\left(' + cosATxt + '\\right)=' + n(a2, 4) + '$$' +
          '所以 $a=BC=\\sqrt{' + n(a2, 4) + '}' + (sq.exact ? '=' + sq.exact : '') + '\\approx' + n(sq.approx, 4) + '$。'
      }, {
        title: '第 2 步：求面积',
        body: '已知两边及夹角，面积公式 $S=\\frac{1}{2}bc\\sin A$：$$S=\\frac{1}{2}\\times' + n(b) + '\\times' + n(c) +
          '\\times' + sinATxt + '=' + n(S, 4) + '$$'
      }, {
        title: '第 3 步：用正弦定理求 ∠B',
        body: '由正弦定理 $\\frac{a}{\\sin A}=\\frac{b}{\\sin B}$ 得 $\\sin B=\\frac{b\\sin A}{a}$：' +
          '$$\\sin B=\\frac{' + n(b) + '\\times' + sinATxt + '}{' + n(tri.a, 4) + '}\\approx' + n(Math.sin(rad(tri.B)), 4) + '$$' +
          '因为 $b' + (b < c ? '<' : b > c ? '>' : '=') + 'c$，所以 $B' + (b < c ? '<' : b > c ? '>' : '=') + 'C$，' +
          '∠B 取锐角或由余弦定理确认：$\\angle B\\approx' + n(tri.B, 2) + '°$。'
      }, {
        title: '第 4 步：求 ∠C 并检验',
        body: '$$\\angle C=180°-\\angle A-\\angle B=180°-' + n(A) + '°-' + n(tri.B, 2) + '°\\approx' + n(tri.C, 2) + '°$$' +
          '检验：$' + n(tri.A, 2) + '°+' + n(tri.B, 2) + '°+' + n(tri.C, 2) + '°=180°$，符合三角形内角和。'
      }];

      var scene = MV.Geo2D.triangleFromABC(A, b, c, {
        sideLabels: { b: true, c: true },
        angleLabels: { A: n(A) + '°' },
        readouts: [
          { label: 'BC = a', value: n(tri.a, 3) },
          { label: '∠B', value: n(tri.B, 1) + '°' },
          { label: '∠C', value: n(tri.C, 1) + '°' },
          { label: 'S', value: n(S, 3) }
        ]
      });
      scene.equations = ['a = ' + n(tri.a, 3), 'S = ' + n(S, 3)];

      return {
        statement: '在 $\\triangle ABC$ 中，已知 $AB=' + n(c) + '$，$AC=' + n(b) + '$，$\\angle A=' + n(A) + '°$。' +
          '求 $BC$ 的长、$\\triangle ABC$ 的面积以及 $\\angle B$、$\\angle C$。',
        steps: steps,
        answer: '$BC=\\sqrt{' + n(a2, 4) + '}' + (sq.exact ? '=' + sq.exact : '') + '\\approx' + n(sq.approx, 4) +
          '$，$S\\approx' + n(S, 4) + '$，$\\angle B\\approx' + n(tri.B, 2) + '°$，$\\angle C\\approx' + n(tri.C, 2) + '°$。',
        scene: scene,
        readouts: readoutsOf(tri)
      };
    }
  });

  /* ---------- 2. 已知三边 (SSS) ---------- */
  var sss = H.def({
    id: 'tri_sss',
    category: '解三角形',
    name: '已知三边',
    hint: '余弦定理求最大角，海伦公式求面积',
    make: function (rng) {
      var pool = [[3, 4, 5], [6, 8, 10], [5, 5, 6], [7, 8, 9], [5, 12, 13], [4, 5, 6], [6, 7, 8], [8, 8, 9], [9, 10, 11], [5, 6, 7], [3, 5, 7], [10, 12, 15]];
      var t = rng.pick(pool);
      return [
        P('a', '边 a = BC', 2, 16, 1, t[0]),
        P('b', '边 b = CA', 2, 16, 1, t[1]),
        P('c', '边 c = AB', 2, 16, 1, t[2])
      ];
    },
    build: function (v) {
      var a = v.a, b = v.b, c = v.c;
      if (a + b <= c || a + c <= b || b + c <= a) {
        return {
          statement: '三条线段 $a=' + n(a) + '$、$b=' + n(b) + '$、$c=' + n(c) + '$ 能否构成三角形？',
          steps: [{
            title: '判断三角形三边关系',
            body: '任意两边之和必须大于第三边：$a+b=' + n(a + b) + '$ 与 $c=' + n(c) + '$，$a+c=' + n(a + c) + '$ 与 $b=' + n(b) +
              '$，$b+c=' + n(b + c) + '$ 与 $a=' + n(a) + '$。' +
              (a + b <= c ? '$a+b\\le c$，' : '') + (a + c <= b ? '$a+c\\le b$，' : '') + (b + c <= a ? '$b+c\\le a$，' : '') +
              '所以这三条线段不能组成三角形。'
          }],
          answer: '不能构成三角形（不满足两边之和大于第三边）。',
          scene: invalidScene('这三条边不能构成三角形'),
          readouts: [{ label: 'a + b', value: n(a + b) }, { label: 'c', value: n(c) }]
        };
      }
      var tri = G.solveSSS(a, b, c);
      var s = (a + b + c) / 2;
      var S = Math.sqrt(Math.max(0, s * (s - a) * (s - b) * (s - c)));
      var maxSide = Math.max(a, b, c);
      var maxAng = maxSide === a ? tri.A : maxSide === b ? tri.B : tri.C;
      var maxName = maxSide === a ? 'A' : maxSide === b ? 'B' : 'C';
      var opp = { A: [b, c, a], B: [a, c, b], C: [a, b, c] }[maxName];
      var cosMax = (opp[0] * opp[0] + opp[1] * opp[1] - opp[2] * opp[2]) / (2 * opp[0] * opp[1]);

      var steps = [{
        title: '第 1 步：找出最大角',
        body: '三角形中大边对大角。三边中最大的是 $' + n(maxSide) + '$（边 $' + maxName.toLowerCase() + '$），' +
          '所以最大角是 $\\angle ' + maxName + '$，它与边 $' + maxName.toLowerCase() + '$ 相对。'
      }, {
        title: '第 2 步：用余弦定理求最大角',
        body: '$$\\cos ' + maxName + '=\\frac{' + n(opp[0]) + '^2+' + n(opp[1]) + '^2-' + n(opp[2]) + '^2}{2\\times' +
          n(opp[0]) + '\\times' + n(opp[1]) + '}=\\frac{' + n(opp[0] * opp[0] + opp[1] * opp[1] - opp[2] * opp[2]) + '}{' +
          n(2 * opp[0] * opp[1]) + '}\\approx' + n(cosMax, 5) + '$$' +
          '所以 $\\angle ' + maxName + '\\approx' + n(maxAng, 2) + '°$' + (Math.abs(cosMax) < 1e-9 ? '（直角）' : cosMax < 0 ? '（钝角）' : '（锐角）') + '。'
      }, {
        title: '第 3 步：求第二个角',
        body: '再用余弦定理求另一个角，例如 $\\cos B=\\frac{a^2+c^2-b^2}{2ac}=\\frac{' +
          n(a * a + c * c - b * b) + '}{' + n(2 * a * c) + '}\\approx' + n(Math.cos(rad(tri.B)), 5) + '$，' +
          '所以 $\\angle B\\approx' + n(tri.B, 2) + '°$，$\\angle ' + (maxName === 'C' ? 'A' : 'C') + '\\approx' + n(maxName === 'C' ? tri.A : tri.C, 2) + '°$。'
      }, {
        title: '第 4 步：用海伦公式求面积',
        body: '半周长 $p=\\frac{a+b+c}{2}=\\frac{' + n(a + b + c) + '}{2}=' + n(s) + '$，' +
          '$$S=\\sqrt{p(p-a)(p-b)(p-c)}=\\sqrt{' + n(s) + '\\times' + n(s - a) + '\\times' + n(s - b) + '\\times' + n(s - c) +
          '}=\\sqrt{' + n(s * (s - a) * (s - b) * (s - c), 4) + '}\\approx' + n(S, 4) + '$$'
      }];

      var scene = MV.Geo2D.triangle(tri, {
        sideLabels: { a: true, b: true, c: true },
        angleLabels: { A: n(tri.A, 1) + '°', B: n(tri.B, 1) + '°', C: n(tri.C, 1) + '°' },
        readouts: [
          { label: '最大角 ∠' + maxName, value: n(maxAng, 1) + '°' },
          { label: '面积 S', value: n(S, 3) },
          { label: '半周长 p', value: n(s, 3) }
        ]
      });
      scene.equations = ['cos ' + maxName + ' = ' + n(cosMax, 4)];

      return {
        statement: '在 $\\triangle ABC$ 中，已知三边 $a=BC=' + n(a) + '$，$b=CA=' + n(b) + '$，$c=AB=' + n(c) +
          '$。求这个三角形的最大角、其余两个角以及面积。',
        steps: steps,
        answer: '最大角 $\\angle ' + maxName + '\\approx' + n(maxAng, 2) + '°$，另外两角分别约为 $' + n(tri.A, 2) + '°$、$' +
          n(tri.B, 2) + '°$、$' + n(tri.C, 2) + '°$ 中的其余两个，面积 $S\\approx' + n(S, 4) + '$。',
        scene: scene,
        readouts: readoutsOf(tri)
      };
    }
  });

  /* ---------- 3. 两角及一边 (AAS/ASA) ---------- */
  var aas = H.def({
    id: 'tri_aas',
    category: '解三角形',
    name: '已知两角及一边',
    hint: '正弦定理逐步求出其余边',
    make: function (rng) {
      return [
        P('A', '角 ∠A', 20, 100, 1, rng.pick([30, 40, 45, 50, 60, 70, 75]), '°'),
        P('B', '角 ∠B', 20, 100, 1, rng.pick([35, 45, 50, 55, 65, 80]), '°'),
        P('c', '边 AB = c', 3, 14, 1, rng.int(4, 12))
      ];
    },
    build: function (v) {
      var A = v.A, B = v.B, c = v.c;
      var C = 180 - A - B;
      if (C <= 0) {
        return {
          statement: '已知 $\\angle A=' + n(A) + '°$，$\\angle B=' + n(B) + '°$，$AB=' + n(c) + '$，能否解这个三角形？',
          steps: [{
            title: '先检查内角和',
            body: '$\\angle A+\\angle B=' + n(A + B) + '°\\ge180°$，两个角之和已经不小于 180°，' +
              '不存在这样的三角形。请调整滑块使 $A+B<180°$。'
          }],
          answer: '不存在满足条件的三角形。',
          scene: invalidScene('∠A + ∠B 已经不小于 180°'),
          readouts: [{ label: '∠A + ∠B', value: n(A + B) + '°' }]
        };
      }
      var tri = G.solveASA(A, B, c);
      var k = c / Math.sin(rad(C));
      var sinA = H.sinStr(A) || n(Math.sin(rad(A)), 4);
      var sinB = H.sinStr(B) || n(Math.sin(rad(B)), 4);
      var sinC = H.sinStr(C) || n(Math.sin(rad(C)), 4);
      var S = tri.area;

      var steps = [{
        title: '第 1 步：求第三个角',
        body: '$$\\angle C=180°-\\angle A-\\angle B=180°-' + n(A) + '°-' + n(B) + '°=' + n(C) + '°$$'
      }, {
        title: '第 2 步：写出正弦定理的比例',
        body: '$$\\frac{a}{\\sin A}=\\frac{b}{\\sin B}=\\frac{c}{\\sin C}$$' +
          '先求比例系数：$\\frac{c}{\\sin C}=\\frac{' + n(c) + '}{' + sinC + '}\\approx' + n(k, 4) + '$。'
      }, {
        title: '第 3 步：求 a 与 b',
        body: '$$a=\\frac{c\\sin A}{\\sin C}=\\frac{' + n(c) + '\\times' + sinA + '}{' + sinC + '}\\approx' + n(tri.a, 4) + '$$' +
          '$$b=\\frac{c\\sin B}{\\sin C}=\\frac{' + n(c) + '\\times' + sinB + '}{' + sinC + '}\\approx' + n(tri.b, 4) + '$$'
      }, {
        title: '第 4 步：求面积',
        body: '$S=\\frac{1}{2}ac\\sin B=\\frac{1}{2}\\times' + n(tri.a, 4) + '\\times' + n(c) + '\\times' +
          (H.sinStr(B) || n(Math.sin(rad(B)), 4)) + '\\approx' + n(S, 4) + '$。'
      }];

      var scene = MV.Geo2D.triangle(tri, {
        sideLabels: { c: true },
        angleLabels: { A: n(A) + '°', B: n(B) + '°', C: n(C) + '°' },
        readouts: [
          { label: 'a = BC', value: n(tri.a, 3) },
          { label: 'b = CA', value: n(tri.b, 3) },
          { label: 'S', value: n(S, 3) }
        ]
      });

      return {
        statement: '在 $\\triangle ABC$ 中，已知 $\\angle A=' + n(A) + '°$，$\\angle B=' + n(B) + '°$，$AB=' + n(c) +
          '$。求 $\\angle C$、边 $BC$、$CA$ 以及三角形的面积。',
        steps: steps,
        answer: '$\\angle C=' + n(C) + '°$，$a=BC\\approx' + n(tri.a, 4) + '$，$b=CA\\approx' + n(tri.b, 4) + '$，$S\\approx' + n(S, 4) + '$。',
        scene: scene,
        readouts: readoutsOf(tri)
      };
    }
  });

  MV.TriGen = { list: [sas, sss, aas] };
})(typeof window !== 'undefined' ? window : globalThis);
