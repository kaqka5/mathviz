/* ============================================================
 * mathviz/js/generators/functions.js
 * 函数图像类题目生成器：y=A sin(ωx+φ)+k、二次函数、指数/对数、极坐标曲线
 * ============================================================ */
(function (global) {
  'use strict';
  var MV = (global.MV = global.MV || {});
  var G = MV.G, H = MV.GenHelp, P = H.P, n = H.n;

  var PI = Math.PI;
  function rad(d) { return G.deg2rad(d); }
  function twoPi() { return 2 * PI; }

  /* ---------- 1. 正弦型函数 ---------- */
  var sinGen = H.def({
    id: 'func_sin',
    category: '函数图像',
    name: '正弦型函数 y=A·sin(ωx+φ)+k',
    hint: '振幅、周期、初相、单调区间、最值，图像实时联动',
    make: function (rng) {
      return [
        P('A', '振幅系数 A', 0.5, 3, 0.5, rng.pick([1, 1.5, 2, 2.5, 3])),
        P('w', '角频率 ω', 0.5, 3, 0.5, rng.pick([0.5, 1, 1.5, 2, 2.5])),
        P('phi', '初相 φ（度）', -180, 180, 15, rng.pick([0, 30, 45, 60, 90, -30, -45, -60, 120])),
        P('k', '上下平移 k', -2, 2, 0.5, rng.pick([-1, 0, 0.5, 1, 2]))
      ];
    },
    build: function (v) {
      var A = v.A, w = v.w, phiDeg = v.phi, k = v.k;
      var phi = rad(phiDeg);
      var T = twoPi() / w;
      var src = '(' + A + ')*sin((' + w + ')*x+(' + phi + '))+(' + k + ')';
      var xMin = -2 * twoPi(), xMax = 2 * twoPi();
      var phiPretty2 = H.piFrac(phiDeg);
      var xStart = (-PI / 2 - phi) / w;   // 第一个最低点之后递增起点
      var incL = (2 * 0 - PI / 2 - phi) / w, incR = (2 * 0 + PI / 2 - phi) / w;
      var maxX = (PI / 2 - phi) / w, minX = (-PI / 2 - phi) / w;

      var pts = [];
      for (var kk = -2; kk <= 2; kk++) {
        var xm = (PI / 2 + 2 * PI * kk - phi) / w;
        if (xm >= xMin && xm <= xMax) pts.push({ x: xm, y: k + Math.abs(A), label: '最大值', hollow: true, color: '#dc2626' });
        var xn = (-PI / 2 + 2 * PI * kk - phi) / w;
        if (xn >= xMin && xn <= xMax) pts.push({ x: xn, y: k - Math.abs(A), label: '最小值', hollow: true, color: '#1d4ed8' });
      }

      var scene = MV.Graph2D.func({
        curves: [{ src: src, color: '#c2410c', width: 2.4 }],
        xRange: [xMin, xMax],
        yRange: [Math.min(k - A, k + A) - 1.2, Math.max(k - A, k + A) + 1.2],
        hlines: [
          { y: k, color: '#94a3b8', style: 'dashed' },
          { y: k + A, color: '#dc2626', style: 'dotted' },
          { y: k - A, color: '#1d4ed8', style: 'dotted' }
        ],
        points: pts,
        equations: ['y = ' + n(A) + 'sin(' + n(w) + 'x + ' + n(phi, 3) + ') + ' + n(k)],
        readouts: [
          { label: '振幅 |A|', value: n(Math.abs(A), 3) },
          { label: '周期 T', value: n(T, 3) },
          { label: '初相 φ', value: n(phi, 3) + ' rad' },
          { label: '最大值', value: n(k + A, 3) },
          { label: '最小值', value: n(k - A, 3) }
        ]
      });

      var steps = [{
        title: '第 1 步：振幅与值域',
        body: '函数 $y=A\\sin(\\omega x+\\varphi)+k$ 中 $A=' + n(A) + '$，所以振幅为 $|A|=' + n(Math.abs(A)) + '$。' +
          '因为 $-1\\le\\sin(\\omega x+\\varphi)\\le1$，所以值域为 $[' + n(k - A, 3) + ',' + n(k + A, 3) + ']$。'
      }, {
        title: '第 2 步：周期',
        body: '最小正周期 $T=\\frac{2\\pi}{\\omega}=\\frac{2\\pi}{' + n(w) + '}=' + (Math.abs(w - 1) < 1e-9 ? '2\\pi' :
          (Math.abs(2 / w - Math.round(2 / w)) < 1e-9 ? Math.round(2 / w) + '\\pi' : '\\frac{2\\pi}{' + n(w) + '}')) +
          '\\approx' + n(T, 4) + '$。'
      }, {
        title: '第 3 步：初相与"五点法"起点',
        body: '初相 $\\varphi=' + n(phiDeg) + '°=' + phiPretty2 + '$（弧度）。令相位 $\\omega x+\\varphi=0$，得 $x=' +
          n(-phi / w, 4) + '$，这是图像由"上升穿过平衡位置"经过的点，可作为五点法作图的起点。'
      }, {
        title: '第 4 步：单调区间',
        body: '令 $-\\frac{\\pi}{2}+2k\\pi\\le\\omega x+\\varphi\\le\\frac{\\pi}{2}+2k\\pi$，解得单调递增区间：' +
          '$$\\left[\\frac{-\\frac{\\pi}{2}-\\varphi+2k\\pi}{\\omega},\\ \\frac{\\frac{\\pi}{2}-\\varphi+2k\\pi}{\\omega}\\right],\\ k\\in\\mathbf{Z}$$' +
          '当 $k=0$ 时约为 $[' + n(incL, 3) + ',\\ ' + n(incR, 3) + ']$（弧度）。'
      }, {
        title: '第 5 步：最值点',
        body: '当 $\\omega x+\\varphi=\\frac{\\pi}{2}+2k\\pi$ 时取最大值 $' + n(k + A, 3) + '$，此时 $x=\\frac{\\frac{\\pi}{2}-\\varphi+2k\\pi}{\\omega}$；' +
          '当 $\\omega x+\\varphi=-\\frac{\\pi}{2}+2k\\pi$ 时取最小值 $' + n(k - A, 3) + '$。'
      }];

      return {
        statement: '已知函数 $y=' + n(A) + '\\sin\\left(' + n(w) + 'x' + (phiDeg >= 0 ? '+' : '-') +
          (phiDeg === 0 ? '0' : phiPretty2) + '\\right)' + (k >= 0 ? '+' : '') + n(k) +
          '$。求它的振幅、最小正周期、初相、单调递增区间与最值，并画出图像。',
        steps: steps,
        answer: '振幅 $' + n(Math.abs(A)) + '$，周期 $T\\approx' + n(T, 4) + '$，初相 $\\varphi=' + n(phiDeg) + '°=' + phiPretty2 +
          '$，最大值 $' + n(k + A, 3) + '$，最小值 $' + n(k - A, 3) + '$。',
        scene: scene,
        readouts: [
          { label: '振幅', value: n(Math.abs(A), 3) },
          { label: '周期 T', value: n(T, 4) },
          { label: '初相 φ', value: n(phiDeg) + '°' },
          { label: '相位起点 x₀', value: n(-phi / w, 4) },
          { label: '最大值', value: n(k + A, 3) },
          { label: '最小值', value: n(k - A, 3) }
        ]
      };
    }
  });

  /* ---------- 2. 二次函数 ---------- */
  var quad = H.def({
    id: 'func_quad',
    category: '函数图像',
    name: '二次函数 y=ax²+bx+c',
    hint: '顶点、对称轴、判别式、根、最值',
    make: function (rng) {
      return [
        P('a', '二次项系数 a', -2, 2, 0.5, rng.pick([-1.5, -1, -0.5, 0.5, 1, 1.5, 2])),
        P('b', '一次项系数 b', -6, 6, 1, rng.int(-5, 5)),
        P('c', '常数项 c', -6, 6, 1, rng.int(-4, 5))
      ];
    },
    build: function (v) {
      var a = v.a, b = v.b, c = v.c;
      if (Math.abs(a) < 1e-9) {
        return {
          statement: '若 $a=0$，函数 $y=ax^2+bx+c$ 就变成了什么？',
          steps: [{ title: '注意', body: '二次项系数 $a\\ne0$ 才叫二次函数。当前 $a=0$，函数退化为一次函数 $y=' + n(b) + 'x+' + n(c) + '$。请拖动滑块使 $a\\ne0$。' }],
          answer: '此时不是二次函数，请调整 a。',
          scene: { kind: '2d', grid: true, axes: true, points: { O: [0, 0] }, items: [{ t: 'text', at: 'O', text: 'a 不能为 0', size: 17, color: '#dc2626' }] },
          readouts: []
        };
      }
      var vx = -b / (2 * a), vy = (4 * a * c - b * b) / (4 * a);
      var D = b * b - 4 * a * c;
      var src = '(' + a + ')*x*x+(' + b + ')*x+(' + c + ')';
      var roots = [];
      if (D > 1e-9) {
        roots = [(-b - Math.sqrt(D)) / (2 * a), (-b + Math.sqrt(D)) / (2 * a)].sort(function (p, q) { return p - q; });
      } else if (Math.abs(D) <= 1e-9) {
        roots = [vx];
      }
      var pts = [{ x: vx, y: vy, label: '顶点', hollow: true, color: '#dc2626' }];
      roots.forEach(function (r, i) {
        pts.push({ x: r, y: 0, label: D > 1e-9 ? 'x' + (i + 1) : '切点', hollow: true, color: '#1d4ed8' });
      });

      var scene = MV.Graph2D.func({
        curves: [{ src: src, color: '#c2410c', width: 2.4 }],
        xRange: [vx - 6, vx + 6],
        vlines: [{ x: vx, color: '#0e9f6e', style: 'dashed', label: 'x=' + n(vx, 3) }],
        points: pts,
        equations: ['y = ' + n(a) + 'x² ' + (b >= 0 ? '+' : '−') + ' ' + n(Math.abs(b)) + 'x ' + (c >= 0 ? '+' : '−') + ' ' + n(Math.abs(c))],
        readouts: [
          { label: '对称轴 x', value: n(vx, 4) },
          { label: '顶点', value: '(' + n(vx, 3) + ', ' + n(vy, 3) + ')' },
          { label: '判别式 Δ', value: n(D, 4) },
          { label: a > 0 ? '最小值' : '最大值', value: n(vy, 4) }
        ]
      });

      var steps = [{
        title: '第 1 步：判断开口与对称轴',
        body: '$a=' + n(a) + (a > 0 ? '>0$，抛物线开口向上；' : '<0$，抛物线开口向下；') +
          '对称轴 $x=-\\frac{b}{2a}=-\\frac{' + n(b) + '}{2\\times' + n(a) + '}=' + n(vx, 4) + '$。'
      }, {
        title: '第 2 步：求顶点坐标',
        body: '把 $x=' + n(vx, 4) + '$ 代回函数式得顶点纵坐标，或用公式 $y=\\frac{4ac-b^2}{4a}$：' +
          '$$y=\\frac{4\\times' + n(a) + '\\times' + n(c) + '-(' + n(b) + ')^2}{4\\times' + n(a) + '}=' + n(vy, 4) + '$$' +
          '所以顶点为 $(' + n(vx, 4) + ',\\ ' + n(vy, 4) + ')$' + (a > 0 ? '，函数在此处取得最小值 ' + n(vy, 4) + '。' : '，函数在此处取得最大值 ' + n(vy, 4) + '。')
      }, {
        title: '第 3 步：判别式与零点',
        body: '$\\Delta=b^2-4ac=(' + n(b) + ')^2-4\\times' + n(a) + '\\times' + n(c) + '=' + n(D, 4) + '$。' +
          (D > 1e-9 ? '因为 $\\Delta>0$，抛物线与 x 轴有两个交点：$$x_{1,2}=\\frac{-b\\pm\\sqrt{\\Delta}}{2a}=\\frac{' + n(-b) +
            '\\pm' + n(Math.sqrt(D), 4) + '}{' + n(2 * a) + '}$$即 $x_1\\approx' + n(roots[0], 4) + '$，$x_2\\approx' + n(roots[1], 4) + '$。'
            : Math.abs(D) <= 1e-9 ? '因为 $\\Delta=0$，抛物线与 x 轴相切，只有一个公共点 $x=' + n(vx, 4) + '$。'
              : '因为 $\\Delta<0$，抛物线与 x 轴没有交点，函数值恒' + (a > 0 ? '大于' : '小于') + '0。')
      }, {
        title: '第 4 步：单调性',
        body: a > 0
          ? '开口向上：在 $\\left(-\\infty,\\ ' + n(vx, 4) + '\\right]$ 上单调递减，在 $\\left[' + n(vx, 4) + ',\\ +\\infty\\right)$ 上单调递增。'
          : '开口向下：在 $\\left(-\\infty,\\ ' + n(vx, 4) + '\\right]$ 上单调递增，在 $\\left[' + n(vx, 4) + ',\\ +\\infty\\right)$ 上单调递减。'
      }];

      var ans = '对称轴 $x=' + n(vx, 4) + '$，顶点 $(' + n(vx, 4) + ',\\ ' + n(vy, 4) + ')$，$\\Delta=' + n(D, 4) + '$，' +
        (D > 1e-9 ? '零点 $x\\approx' + n(roots[0], 4) + '$ 与 $x\\approx' + n(roots[1], 4) + '$，'
          : Math.abs(D) <= 1e-9 ? '与 x 轴相切于 $x=' + n(vx, 4) + '$，' : '与 x 轴无交点，') +
        (a > 0 ? '最小值 ' : '最大值 ') + n(vy, 4) + '。';

      return {
        statement: '已知二次函数 $y=' + n(a) + 'x^2' + (b >= 0 ? '+' : '') + n(b) + 'x' + (c >= 0 ? '+' : '') + n(c) +
          '$。求它的开口方向、对称轴、顶点坐标、判别式、与 x 轴的交点以及最值，并画出图像。',
        steps: steps,
        answer: ans,
        scene: scene,
        readouts: [
          { label: '对称轴', value: 'x = ' + n(vx, 4) },
          { label: '顶点', value: '(' + n(vx, 3) + ', ' + n(vy, 3) + ')' },
          { label: 'Δ = b²−4ac', value: n(D, 4) },
          { label: '开口', value: a > 0 ? '向上' : '向下' }
        ]
      };
    }
  });

  /* ---------- 3. 指数函数与对数函数 ---------- */
  var explog = H.def({
    id: 'func_exp_log',
    category: '函数图像',
    name: '指数函数与对数函数',
    hint: '互为反函数，图像关于 y=x 对称',
    make: function (rng) {
      return [P('a', '底数 a', 0.2, 3, 0.1, rng.pick([0.3, 0.5, 1.5, 2, 2.5, 3]))];
    },
    build: function (v) {
      var a = v.a;
      if (Math.abs(a - 1) < 1e-9 || a <= 0) {
        return {
          statement: '底数 $a$ 必须满足 $a>0$ 且 $a\\ne1$。',
          steps: [{ title: '注意', body: '当 $a=1$ 时 $y=1^x=1$ 是常函数，$y=\\log_1 x$ 没有意义。请调整滑块。' }],
          answer: '请使 a>0 且 a≠1。',
          scene: { kind: '2d', grid: true, axes: true, points: { O: [0, 0] }, items: [{ t: 'text', at: 'O', text: '底数 a 需 >0 且 ≠1', size: 16, color: '#dc2626' }] },
          readouts: []
        };
      }
      var srcExp = '(' + a + ')^x';
      var srcLog = 'ln(x)/ln(' + a + ')';
      var scene = MV.Graph2D.func({
        curves: [
          { src: srcExp, color: '#c2410c', width: 2.4 },
          { src: srcLog, color: '#1d4ed8', width: 2.4 }
        ],
        xRange: [-3.2, 6.5],
        yRange: [-3.2, 6.5],
        hlines: [{ y: 0, color: '#cbd5e1', style: 'solid', width: 1 }],
        segments: [{ a: [-3, -3], b: [6, 6], color: '#94a3b8', style: 'dashed', width: 1.4, label: 'y=x' }],
        points: [
          { x: 0, y: 1, label: '(0,1)', hollow: true, color: '#c2410c' },
          { x: 1, y: a, label: '(1,' + n(a, 2) + ')', hollow: true, color: '#c2410c' },
          { x: 1, y: 0, label: '(1,0)', hollow: true, color: '#1d4ed8' },
          { x: a, y: 1, label: '(' + n(a, 2) + ',1)', hollow: true, color: '#1d4ed8' }
        ],
        equations: ['y = ' + n(a) + '^x', 'y = log' + n(a, 2) + ' x'],
        readouts: [
          { label: '单调性', value: a > 1 ? '两者都递增' : '两者都递减' },
          { label: '公共点', value: '(0,1) 与 (1,0)' }
        ]
      });
      var mono = a > 1 ? '单调递增' : '单调递减';
      var steps = [{
        title: '第 1 步：定义域与值域',
        body: '指数函数 $y=' + n(a) + '^x$ 的定义域为 $\\mathbf{R}$，值域为 $(0,+\\infty)$；' +
          '对数函数 $y=\\log_{' + n(a) + '}x$ 的定义域为 $(0,+\\infty)$，值域为 $\\mathbf{R}$。两者定义域与值域恰好互换。'
      }, {
        title: '第 2 步：单调性',
        body: '因为底数 $a=' + n(a) + (a > 1 ? '>1' : '\\in(0,1)') + '$，所以 $y=' + n(a) + '^x$ 与 $y=\\log_{' + n(a) +
          '}x$ 在各自定义域上都' + mono + '。'
      }, {
        title: '第 3 步：定点',
        body: '无论底数是多少，$' + n(a) + '^0=1$，所以指数函数图像恒过点 $(0,1)$；' +
          '$\\log_{' + n(a) + '}1=0$，所以对数函数图像恒过点 $(1,0)$。'
      }, {
        title: '第 4 步：互为反函数',
        body: '$y=' + n(a) + '^x$ 与 $y=\\log_{' + n(a) + '}x$ 互为反函数，图像关于直线 $y=x$ 对称：' +
          '把 $(0,1)$ 关于 $y=x$ 对称就得到 $(1,0)$' + (Math.abs(a - 1 / a) < 1e-9 ? '' : '，把 $(1,' + n(a, 3) + ')$ 对称得到 $(' + n(a, 3) + ',1)$') + '。'
      }];
      return {
        statement: '已知函数 $y=' + n(a) + '^x$ 与 $y=\\log_{' + n(a) + '}x$。比较它们的定义域、值域、单调性与所过的定点，并说明两个图像之间的关系。',
        steps: steps,
        answer: '定义域与值域互换；两者都' + mono + '；分别过定点 $(0,1)$ 与 $(1,0)$；两图像关于直线 $y=x$ 对称。',
        scene: scene,
        readouts: [
          { label: '底数 a', value: n(a, 3) },
          { label: '单调性', value: mono },
          { label: '对称轴', value: 'y = x' }
        ]
      };
    }
  });

  /* ---------- 4. 极坐标曲线 ---------- */
  var polar = H.def({
    id: 'func_polar',
    category: '函数图像',
    name: '极坐标曲线 r=a·cos(kθ)',
    hint: '玫瑰线：花瓣数、对称性与数值积分求面积',
    make: function (rng) {
      return [
        P('a', '系数 a', 1, 5, 0.5, rng.pick([2, 3, 4, 5])),
        P('k', '频率 k', 1, 6, 1, rng.pick([2, 3, 4, 5]))
      ];
    },
    build: function (v) {
      var a = v.a, k = v.k;
      var src = '(' + a + ')*cos((' + k + ')*theta)';
      // 数值积分求面积 S = 1/2 ∫ r² dθ
      var N = 4000, sum = 0, dth = 2 * PI / N;
      for (var i = 0; i < N; i++) {
        var t0 = i * dth, t1 = (i + 1) * dth, tm = (t0 + t1) / 2;
        var r0 = a * Math.cos(k * t0), r1 = a * Math.cos(k * t1), rm = a * Math.cos(k * tm);
        sum += (r0 * r0 + 4 * rm * rm + r1 * r1) / 6 * dth;
      }
      var S = sum / 2;
      var leaves = k % 2 === 1 ? k : 2 * k;
      var scene = MV.Graph2D.func({
        polar: [{ src: src, tMin: 0, tMax: 2 * PI, color: '#c2410c', width: 2.4 }],
        xRange: [-a * 1.15, a * 1.15],
        yRange: [-a * 1.15, a * 1.15],
        points: [{ x: a, y: 0, label: '(a,0) 最远点', hollow: true, color: '#dc2626' }],
        equations: ['r = ' + n(a) + 'cos(' + n(k) + 'θ)'],
        readouts: [
          { label: '最大极径 r_max', value: n(a, 3) },
          { label: '花瓣数', value: String(leaves) },
          { label: '面积（数值积分）', value: n(S, 4) }
        ]
      });
      var steps = [{
        title: '第 1 步：确定曲线类型',
        body: '极坐标方程 $r=' + n(a) + '\\cos(' + n(k) + '\\theta)$ 表示玫瑰线。' +
          (k % 2 === 1 ? '当 $k=' + k + '$ 为奇数时，曲线有 $k=' + k + '$ 个花瓣。' : '当 $k=' + k + '$ 为偶数时，曲线有 $2k=' + (2 * k) + '$ 个花瓣。')
      }, {
        title: '第 2 步：最大极径与范围',
        body: '因为 $-1\\le\\cos(k\\theta)\\le1$，所以 $-' + n(a) + '\\le r\\le' + n(a) + '$，最大极径为 $r_{max}=' + n(a) +
          '$，此时 $\\cos(k\\theta)=1$，即 $\\theta=\\frac{2m\\pi}{' + k + '}$。图像完全落在以极点为圆心、半径 ' + n(a) + ' 的圆内。'
      }, {
        title: '第 3 步：对称性',
        body: '因为 $\\cos(-k\\theta)=\\cos(k\\theta)$，曲线关于极轴（x 轴）对称；' +
          (k % 2 === 1 ? '且周期为 $\\pi$，在 $[0,\\pi]$ 上就画完了整条曲线。' : '且周期为 $2\\pi$，需在 $[0,2\\pi]$ 上作图。')
      }, {
        title: '第 4 步：求面积',
        body: '极坐标下曲边扇形面积 $S=\\frac{1}{2}\\int_{\\alpha}^{\\beta}r^2\\,\\mathrm{d}\\theta$，' +
          '这里用数值积分（辛普森法，4000 段）得 $S\\approx' + n(S, 4) + '$。' +
          '（$k$ 为奇数时也可以用公式 $S=\\frac{\\pi a^2}{4}$ 验证：$\\frac{\\pi\\times' + n(a * a, 3) + '}{4}\\approx' + n(PI * a * a / 4, 4) + '$。）'
      }];
      return {
        statement: '已知极坐标方程 $r=' + n(a) + '\\cos(' + n(k) + '\\theta)$。判断它是什么曲线，求花瓣数、最大极径、对称性并计算曲线围成的面积。',
        steps: steps,
        answer: '这是 $' + leaves + '$ 瓣玫瑰线，最大极径 $' + n(a) + '$，面积 $S\\approx' + n(S, 4) + '$。',
        scene: scene,
        readouts: [
          { label: 'r_max', value: n(a, 3) },
          { label: '花瓣数', value: String(leaves) },
          { label: '面积', value: n(S, 4) }
        ]
      };
    }
  });

  MV.FuncGen = { list: [sinGen, quad, explog, polar] };
})(typeof window !== 'undefined' ? window : globalThis);
