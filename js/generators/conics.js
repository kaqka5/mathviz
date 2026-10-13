/* ============================================================
 * mathviz/js/generators/conics.js
 * 圆锥曲线题目生成器：椭圆 / 双曲线 / 抛物线
 * ============================================================ */
(function (global) {
  'use strict';
  var MV = (global.MV = global.MV || {});
  var G = MV.G, H = MV.GenHelp, P = H.P, n = H.n;
  var PI = Math.PI;

  var ellipse = H.def({
    id: 'conic_ellipse',
    category: '圆锥曲线',
    name: '椭圆',
    hint: '长/短半轴可调，焦点、离心率、准线实时变化',
    make: function (rng) {
      var a = rng.int(3, 8);
      var b = rng.int(2, a - 1);
      return [
        P('a', '长半轴 a', 2, 10, 0.5, a),
        P('b', '短半轴 b', 1, 10, 0.5, b)
      ];
    },
    build: function (v) {
      var a = Math.max(v.a, v.b), b = Math.min(v.a, v.b);
      var c = Math.sqrt(Math.max(0, a * a - b * b));
      var e = c / a;
      var scene = MV.Conic2D.ellipse(a, b);
      var steps = [{
        title: '第 1 步：写出标准方程',
        body: '焦点在 x 轴上的椭圆标准方程为 $\\frac{x^2}{a^2}+\\frac{y^2}{b^2}=1\\ (a>b>0)$。' +
          '代入得 $\\frac{x^2}{' + n(a * a, 4) + '}+\\frac{y^2}{' + n(b * b, 4) + '}=1$。'
      }, {
        title: '第 2 步：求 c 与焦点坐标',
        body: '椭圆中 $a^2=b^2+c^2$，所以' +
          '$$c=\\sqrt{a^2-b^2}=\\sqrt{' + n(a * a, 4) + '-' + n(b * b, 4) + '}=\\sqrt{' + n(a * a - b * b, 4) +
          '}\\approx' + n(c, 4) + '$$' +
          '焦点为 $F_1(-' + n(c, 4) + ',0)$、$F_2(' + n(c, 4) + ',0)$。'
      }, {
        title: '第 3 步：离心率与准线',
        body: '$$e=\\frac{c}{a}=\\frac{' + n(c, 4) + '}{' + n(a, 4) + '}\\approx' + n(e, 4) + '$$' +
          '因为 $0<e<1$，所以曲线是椭圆；准线为 $x=\\pm\\frac{a^2}{c}=\\pm' + n(a * a / c, 4) + '$。'
      }, {
        title: '第 4 步：顶点与轴长',
        body: '长轴顶点 $A_1(-' + n(a, 4) + ',0)$、$A_2(' + n(a, 4) + ',0)$，短轴顶点 $B_1(0,-' + n(b, 4) + ')$、$B_2(0,' + n(b, 4) + ')$；' +
          '长轴长 $2a=' + n(2 * a, 4) + '$，短轴长 $2b=' + n(2 * b, 4) + '$。'
      }, {
        title: '第 5 步：观察 e 的几何意义',
        body: '保持 $a$ 不变、把 $b$ 拖小：$c$ 变大、$e$ 变大，椭圆变"扁"；把 $b$ 拖到等于 $a$：$c=0$、$e=0$，椭圆变成圆。' +
          '所以 $e$ 描述的是椭圆的"扁平程度"。'
      }];
      return {
        statement: '已知椭圆 $\\frac{x^2}{' + n(a * a, 4) + '}+\\frac{y^2}{' + n(b * b, 4) +
          '}=1$。求它的焦点坐标、离心率、准线方程以及长轴、短轴的长。',
        steps: steps,
        answer: '$c\\approx' + n(c, 4) + '$，焦点 $F_1(-' + n(c, 4) + ',0)$、$F_2(' + n(c, 4) + ',0)$，$e\\approx' + n(e, 4) +
          '$，准线 $x=\\pm' + n(a * a / c, 4) + '$，长轴长 $' + n(2 * a, 4) + '$，短轴长 $' + n(2 * b, 4) + '$。',
        scene: scene,
        readouts: scene.readouts
      };
    }
  });

  var hyperbola = H.def({
    id: 'conic_hyperbola',
    category: '圆锥曲线',
    name: '双曲线',
    hint: '渐近线、焦点、离心率',
    make: function (rng) {
      return [
        P('a', '实半轴 a', 1, 8, 0.5, rng.int(2, 5)),
        P('b', '虚半轴 b', 1, 8, 0.5, rng.int(2, 5))
      ];
    },
    build: function (v) {
      var a = v.a, b = v.b;
      var c = Math.sqrt(a * a + b * b);
      var e = c / a;
      var scene = MV.Conic2D.hyperbola(a, b);
      var steps = [{
        title: '第 1 步：标准方程',
        body: '焦点在 x 轴上的双曲线标准方程为 $\\frac{x^2}{a^2}-\\frac{y^2}{b^2}=1$，代入得' +
          '$\\frac{x^2}{' + n(a * a, 4) + '}-\\frac{y^2}{' + n(b * b, 4) + '}=1$。'
      }, {
        title: '第 2 步：求 c 与焦点',
        body: '双曲线中 $c^2=a^2+b^2$：' +
          '$$c=\\sqrt{' + n(a * a, 4) + '+' + n(b * b, 4) + '}\\approx' + n(c, 4) + '$$' +
          '焦点 $F_1(-' + n(c, 4) + ',0)$、$F_2(' + n(c, 4) + ',0)$。'
      }, {
        title: '第 3 步：渐近线与离心率',
        body: '渐近线 $y=\\pm\\frac{b}{a}x=\\pm' + n(b / a, 4) + 'x$，离心率' +
          '$$e=\\frac{c}{a}\\approx' + n(e, 4) + '$$双曲线的 $e>1$，$e$ 越大开口越"张开"。'
      }, {
        title: '第 4 步：等轴双曲线',
        body: '当 $a=b=' + n(a, 4) + '$ 时，渐近线是 $y=\\pm x$（两条渐近线互相垂直），此时 $e=\\sqrt{2}\\approx1.414$，' +
          '这样的双曲线叫等轴双曲线。拖动滑块让 $a=b$ 观察。'
      }];
      return {
        statement: '已知双曲线 $\\frac{x^2}{' + n(a * a, 4) + '}-\\frac{y^2}{' + n(b * b, 4) +
          '}=1$。求它的焦点坐标、渐近线方程与离心率。',
        steps: steps,
        answer: '$c\\approx' + n(c, 4) + '$，焦点 $F_1(-' + n(c, 4) + ',0)$、$F_2(' + n(c, 4) + ',0)$，渐近线 $y=\\pm' +
          n(b / a, 4) + 'x$，$e\\approx' + n(e, 4) + '$。',
        scene: scene,
        readouts: scene.readouts
      };
    }
  });

  var parabola = H.def({
    id: 'conic_parabola',
    category: '圆锥曲线',
    name: '抛物线',
    hint: '焦点、准线与定义（MF = d）',
    make: function (rng) {
      return [P('p', '焦准距 p', 1, 12, 0.5, rng.pick([1, 2, 3, 4, 6, 8]))];
    },
    build: function (v) {
      var p = v.p;
      var scene = MV.Conic2D.parabola(p);
      var steps = [{
        title: '第 1 步：化为标准形式',
        body: '方程 $y^2=' + n(2 * p, 4) + 'x$ 已经是 $y^2=2px$ 的形式，所以 $2p=' + n(2 * p, 4) + '$，$p=' + n(p, 4) +
          '$，抛物线开口向右。'
      }, {
        title: '第 2 步：焦点与准线',
        body: '焦点在 x 轴正半轴上：$F\\left(\\frac{p}{2},0\\right)=\\left(' + n(p / 2, 4) + ',0\\right)$；' +
          '准线 $x=-\\frac{p}{2}=' + n(-p / 2, 4) + '$。'
      }, {
        title: '第 3 步：用定义验证',
        body: '取抛物线上一点 $M$，它到焦点的距离 $|MF|=x_M+\\frac{p}{2}$，到准线的距离 $d=x_M+\\frac{p}{2}$，两者恒相等' +
          '（图中绿色线段），这正是抛物线的定义，也是 $e=1$ 的含义。'
      }, {
        title: '第 4 步：通径与开口',
        body: '过焦点且垂直于对称轴的弦叫通径，长为 $2p=' + n(2 * p, 4) + '$。拖动滑块：$p$ 越大，焦点越远、开口越宽。'
      }];
      return {
        statement: '已知抛物线的标准方程为 $y^2=' + n(2 * p, 4) + 'x$。求它的焦点坐标、准线方程与通径长，' +
          '并用抛物线的定义说明它的几何意义。',
        steps: steps,
        answer: '焦点 $\\left(' + n(p / 2, 4) + ',0\\right)$，准线 $x=' + n(-p / 2, 4) + '$，通径长 $' + n(2 * p, 4) + '$，离心率 $e=1$。',
        scene: scene,
        readouts: scene.readouts
      };
    }
  });

  MV.ConicGen = { list: [ellipse, hyperbola, parabola] };
})(typeof window !== 'undefined' ? window : globalThis);
