/* ============================================================
 * mathviz/js/generators/solids.js
 * 立体几何题目生成器：正方体 / 长方体 / 正四棱锥 / 正三棱柱 /
 * 圆柱 / 圆锥 / 球 / 正四面体
 * ============================================================ */
(function (global) {
  'use strict';
  var MV = (global.MV = global.MV || {});
  var G = MV.G, H = MV.GenHelp, P = H.P, n = H.n;
  var PI = Math.PI;
  function rad(d) { return G.deg2rad(d); }
  function deg(r) { return G.rad2deg(r); }

  /* ---------- 正方体 ---------- */
  var cube = H.def({
    id: 'solid_cube',
    category: '立体几何',
    name: '正方体',
    hint: '表面积、体积、体对角线与异面直线所成角',
    make: function (rng) {
      return [P('a', '棱长 a', 1, 8, 0.5, rng.pick([2, 3, 4, 5, 6]))];
    },
    build: function (v) {
      var a = v.a;
      var S = 6 * a * a, V = a * a * a;
      var faceD = a * Math.SQRT2, bodyD = a * Math.sqrt(3);
      var sqA3 = H.sqrtNice(3 * a * a), sqA2 = H.sqrtNice(2 * a * a);
      var ang = 60; // AB₁ 与 BC₁ 恒为 60°
      var scene = MV.Solids.cube(a, {
        emphasis: [['A', 'B1', '#dc2626'], ['B', 'C1', '#0e9f6e']],
        view: { yaw: -0.62, pitch: 0.34 }
      });
      scene.legend = ['AB₁ 与 BC₁ 所成角固定为 60°', '体对角线 AC₁ = ' + n(bodyD, 4)];
      var steps = [{
        title: '第 1 步：表面积与体积',
        body: '正方体有 6 个全等的正方形面，表面积 $$S=6a^2=6\\times' + n(a) + '^2=' + n(S, 4) + '$$' +
          '体积 $$V=a^3=' + n(a) + '^3=' + n(V, 4) + '$$'
      }, {
        title: '第 2 步：面对角线与体对角线',
        body: '面对角线是正方形对角线：$d_1=\\sqrt{2}a' + (sqA2.exact ? '=' + sqA2.exact : '') + '\\approx' + n(faceD, 4) + '$。' +
          '体对角线用两次勾股定理：先求底面对角线 $AC=\\sqrt{2}a$，再在直角 $\\triangle ACC_1$ 中：' +
          '$$AC_1=\\sqrt{AC^2+CC_1^2}=\\sqrt{2a^2+a^2}=\\sqrt{3}a' + (sqA3.exact ? '=' + sqA3.exact : '') + '\\approx' + n(bodyD, 4) + '$$'
      }, {
        title: '第 3 步：用坐标法求 AB₁ 与 BC₁ 所成的角',
        body: '以 $A$ 为原点，$AB$、$AD$、$AA_1$ 所在直线为 $x,y,z$ 轴建立空间直角坐标系，则' +
          '$$A(0,0,0),\\ B(' + n(a) + ',0,0),\\ C(' + n(a) + ',' + n(a) + ',0),\\ B_1(' + n(a) + ',0,' + n(a) + '),\\ C_1(' + n(a) + ',' + n(a) + ',' + n(a) + ')$$' +
          '于是 $\\overrightarrow{AB_1}=(' + n(a) + ',0,' + n(a) + ')$，$\\overrightarrow{BC_1}=(0,' + n(a) + ',' + n(a) + ')$。'
      }, {
        title: '第 4 步：用夹角公式求值',
        body: '$$\\cos\\theta=\\frac{|\\overrightarrow{AB_1}\\cdot\\overrightarrow{BC_1}|}{|\\overrightarrow{AB_1}||\\overrightarrow{BC_1}|}' +
          '=\\frac{' + n(a * a, 4) + '}{' + n(Math.sqrt(2) * a, 4) + '\\times' + n(Math.sqrt(2) * a, 4) + '}=\\frac{1}{2}$$' +
          '所以异面直线 $AB_1$ 与 $BC_1$ 所成的角为 $60°$（异面直线所成角的范围是 $(0°,90°]$）。'
      }, {
        title: '第 5 步：外接球',
        body: '正方体的外接球直径等于体对角线：$2R=\\sqrt{3}a$，所以 $R=\\frac{\\sqrt{3}}{2}a\\approx' +
          n(bodyD / 2, 4) + '$，外接球表面积 $S=4\\pi R^2=3\\pi a^2\\approx' + n(3 * PI * a * a, 4) + '$。'
      }];
      return {
        statement: '已知正方体 $ABCD\\text{-}A_1B_1C_1D_1$ 的棱长为 $' + n(a) + '$（图中红色为 $AB_1$，绿色为 $BC_1$）。' +
          '求它的表面积、体积、体对角线长，以及异面直线 $AB_1$ 与 $BC_1$ 所成的角。',
        steps: steps,
        answer: '$S=' + n(S, 4) + '$，$V=' + n(V, 4) + '$，体对角线 $=\\sqrt{3}a\\approx' + n(bodyD, 4) +
          '$，$AB_1$ 与 $BC_1$ 所成角为 $60°$。',
        scene: scene,
        readouts: [
          { label: '表面积 S', value: n(S, 4) },
          { label: '体积 V', value: n(V, 4) },
          { label: '面对角线', value: n(faceD, 4) },
          { label: '体对角线', value: n(bodyD, 4) },
          { label: 'AB₁ 与 BC₁', value: '60°' },
          { label: '外接球半径', value: n(bodyD / 2, 4) }
        ]
      };
    }
  });

  /* ---------- 长方体 ---------- */
  var cuboid = H.def({
    id: 'solid_cuboid',
    category: '立体几何',
    name: '长方体',
    hint: '体对角线、外接球半径',
    make: function (rng) {
      return [
        P('a', '长 a', 2, 8, 0.5, rng.int(3, 7)),
        P('b', '宽 b', 1.5, 7, 0.5, rng.int(2, 6)),
        P('h', '高 h', 1.5, 7, 0.5, rng.int(2, 6))
      ];
    },
    build: function (v) {
      var a = v.a, b = v.b, h = v.h;
      var S = 2 * (a * b + b * h + a * h), V = a * b * h;
      var D = Math.sqrt(a * a + b * b + h * h);
      var scene = MV.Solids.cuboid(a, b, h, {
        emphasis: [['A', 'C1', '#dc2626']]
      });
      scene.legend = ['体对角线 AC₁ = ' + n(D, 4)];
      var steps = [{
        title: '第 1 步：表面积',
        body: '长方体三组对面分别全等，表面积' +
          '$$S=2(ab+bh+ah)=2(' + n(a) + '\\times' + n(b) + '+' + n(b) + '\\times' + n(h) + '+' + n(a) + '\\times' + n(h) +
          ')=2\\times' + n(a * b + b * h + a * h, 4) + '=' + n(S, 4) + '$$'
      }, {
        title: '第 2 步：体积',
        body: '$$V=abh=' + n(a) + '\\times' + n(b) + '\\times' + n(h) + '=' + n(V, 4) + '$$'
      }, {
        title: '第 3 步：体对角线',
        body: '先用勾股定理求底面对角线 $AC=\\sqrt{a^2+b^2}=\\sqrt{' + n(a * a + b * b, 4) + '}$，' +
          '再在 $\\mathrm{Rt}\\triangle ACC_1$ 中求体对角线：' +
          '$$AC_1=\\sqrt{a^2+b^2+h^2}=\\sqrt{' + n(a * a + b * b + h * h, 4) + '}\\approx' + n(D, 4) + '$$'
      }, {
        title: '第 4 步：外接球',
        body: '长方体的八个顶点都在外接球面上，球直径等于体对角线：$2R=\\sqrt{a^2+b^2+h^2}$，' +
          '所以 $R\\approx' + n(D / 2, 4) + '$，外接球表面积 $\\approx' + n(4 * PI * (D / 2) * (D / 2), 4) + '$。'
      }];
      return {
        statement: '已知长方体的长、宽、高分别为 $' + n(a) + '$、$' + n(b) + '$、$' + n(h) +
          '$（图中红色线段为体对角线 $AC_1$）。求它的表面积、体积、体对角线长和外接球半径。',
        steps: steps,
        answer: '$S=' + n(S, 4) + '$，$V=' + n(V, 4) + '$，体对角线 $=\\sqrt{' + n(a * a + b * b + h * h, 4) + '}\\approx' +
          n(D, 4) + '$，外接球半径 $\\approx' + n(D / 2, 4) + '$。',
        scene: scene,
        readouts: [
          { label: '表面积 S', value: n(S, 4) },
          { label: '体积 V', value: n(V, 4) },
          { label: '体对角线', value: n(D, 4) },
          { label: '外接球半径', value: n(D / 2, 4) }
        ]
      };
    }
  });

  /* ---------- 正四棱锥（二面角可调） ---------- */
  var pyramid = H.def({
    id: 'solid_pyramid',
    category: '立体几何',
    name: '正四棱锥（二面角可调）',
    hint: '拖动"侧面与底面所成角"，高、侧面积、体积实时变化',
    make: function (rng) {
      return [
        P('a', '底面边长 a', 2, 8, 0.5, rng.pick([2, 3, 4, 5])),
        P('theta', '侧面与底面所成角 θ', 20, 85, 1, rng.pick([30, 40, 45, 50, 60, 70]), '°')
      ];
    },
    build: function (v) {
      var a = v.a, th = v.theta;
      var h = (a / 2) * Math.tan(rad(th));
      var apo = a / 2;
      var slant = Math.hypot(h, apo);
      var lat = 4 * (a * slant / 2);
      var base = a * a;
      var V = base * h / 3;
      var edge = Math.hypot(h, a / Math.SQRT2);
      var edgeAng = deg(Math.atan2(h, a / Math.SQRT2));
      var scene = MV.Solids.pyramid4(a, h, {
        dihedralLabel: n(th, 0) + '°',
        showEdgeAngle: true,
        edgeAngleLabel: n(edgeAng, 1) + '°'
      });
      scene.legend = ['θ = ' + n(th, 0) + '°（侧面与底面）', '∠PAO = ' + n(edgeAng, 1) + '°（侧棱与底面）'];
      var steps = [{
        title: '第 1 步：由二面角求高',
        body: '设 $O$ 是底面中心，$M$ 是 $AB$ 的中点。因为 $OM\\perp AB$，$PM\\perp AB$，所以 $\\angle PMO$ 就是侧面 $PAB$ ' +
          '与底面所成二面角的平面角。在 $\\mathrm{Rt}\\triangle POM$ 中 $OM=\\frac{a}{2}=' + n(apo) + '$：' +
          '$$h=PO=OM\\cdot\\tan\\theta=' + n(apo) + '\\times\\tan' + n(th, 0) + '°\\approx' + n(h, 4) + '$$'
      }, {
        title: '第 2 步：求斜高与侧面积',
        body: '斜高 $PM=\\frac{OM}{\\cos\\theta}=\\frac{' + n(apo) + '}{\\cos' + n(th, 0) + '°}\\approx' + n(slant, 4) + '$，' +
          '侧面积由 4 个全等的等腰三角形组成：' +
          '$$S_{侧}=4\\times\\frac{1}{2}\\times a\\times PM=2\\times' + n(a) + '\\times' + n(slant, 4) + '\\approx' + n(lat, 4) + '$$' +
          '底面积 $S_{底}=a^2=' + n(base, 4) + '$，所以 $S_{表}\\approx' + n(lat + base, 4) + '$。'
      }, {
        title: '第 3 步：求体积',
        body: '$$V=\\frac{1}{3}S_{底}\\cdot h=\\frac{1}{3}\\times' + n(base, 4) + '\\times' + n(h, 4) + '\\approx' + n(V, 4) + '$$'
      }, {
        title: '第 4 步：侧棱长与侧棱与底面所成角',
        body: '底面外接圆半径 $OA=\\frac{\\sqrt{2}}{2}a\\approx' + n(a / Math.SQRT2, 4) + '$，侧棱' +
          '$$PA=\\sqrt{h^2+OA^2}=\\sqrt{' + n(h * h, 4) + '+' + n(a * a / 2, 4) + '}\\approx' + n(edge, 4) + '$$' +
          '侧棱与底面所成的角为 $\\angle PAO$：$\\tan\\angle PAO=\\frac{h}{OA}\\approx' + n(h / (a / Math.SQRT2), 4) +
          '$，所以 $\\angle PAO\\approx' + n(edgeAng, 2) + '°$。'
      }, {
        title: '第 5 步：观察规律',
        body: '拖动滑块改变 $\\theta$：$\\theta$ 越大，高 $h$ 越大、侧面积与体积越大；当 $\\theta\\to90°$ 时四棱锥越来越"高瘦"，' +
          '当 $\\theta\\to0°$ 时越来越"扁平"。这说明二面角的大小决定了棱锥的形状。'
      }];
      return {
        statement: '已知正四棱锥 $P\\text{-}ABCD$ 的底面边长为 $' + n(a) + '$，侧面与底面所成的二面角为 $' + n(th, 0) +
          '°$（图中 $\\theta$ 即为该二面角，绿色角为侧棱与底面所成角）。求它的高、斜高、侧面积、表面积、体积，' +
          '并求侧棱与底面所成角。',
        steps: steps,
        answer: '高 $h\\approx' + n(h, 4) + '$，斜高 $\\approx' + n(slant, 4) + '$，$S_{侧}\\approx' + n(lat, 4) +
          '$，$S_{表}\\approx' + n(lat + base, 4) + '$，$V\\approx' + n(V, 4) + '$，侧棱与底面所成角 $\\approx' + n(edgeAng, 2) + '°$。',
        scene: scene,
        readouts: [
          { label: '高 h', value: n(h, 4) },
          { label: '斜高', value: n(slant, 4) },
          { label: '侧面积', value: n(lat, 4) },
          { label: '表面积', value: n(lat + base, 4) },
          { label: '体积 V', value: n(V, 4) },
          { label: '侧棱长', value: n(edge, 4) },
          { label: '二面角 θ', value: n(th, 0) + '°' },
          { label: '侧棱与底面角', value: n(edgeAng, 2) + '°' }
        ]
      };
    }
  });

  /* ---------- 正三棱柱 ---------- */
  var prism = H.def({
    id: 'solid_prism',
    category: '立体几何',
    name: '正三棱柱',
    hint: '底面积、侧面积、体积与线面角',
    make: function (rng) {
      return [
        P('a', '底面边长 a', 2, 8, 0.5, rng.pick([2, 3, 4, 5])),
        P('h', '侧棱（高）h', 1, 8, 0.5, rng.pick([2, 3, 4, 5, 6]))
      ];
    },
    build: function (v) {
      var a = v.a, h = v.h;
      var base = Math.sqrt(3) / 4 * a * a;
      var lat = 3 * a * h;
      var S = lat + 2 * base;
      var V = base * h;
      var lineAng = deg(Math.atan2(h, a));   // AB₁ 与底面 ABC 所成角
      var scene = MV.Solids.prism3(a, h, { emphasis: [['A', 'B1', '#dc2626']] });
      scene.legend = ['AB₁ 与底面所成角 ' + n(lineAng, 1) + '°'];
      var steps = [{
        title: '第 1 步：求底面积',
        body: '底面是边长为 $' + n(a) + '$ 的正三角形：' +
          '$$S_{底}=\\frac{\\sqrt{3}}{4}a^2=\\frac{\\sqrt{3}}{4}\\times' + n(a * a, 4) + '\\approx' + n(base, 4) + '$$'
      }, {
        title: '第 2 步：求侧面积与表面积',
        body: '侧面是 3 个矩形：$S_{侧}=3ah=3\\times' + n(a) + '\\times' + n(h) + '=' + n(lat, 4) + '$，' +
          '所以 $S_{表}=S_{侧}+2S_{底}\\approx' + n(S, 4) + '$。'
      }, {
        title: '第 3 步：求体积',
        body: '$$V=S_{底}\\cdot h\\approx' + n(base, 4) + '\\times' + n(h) + '=' + n(V, 4) + '$$'
      }, {
        title: '第 4 步：求 AB₁ 与底面所成的角',
        body: '因为 $B_1B\\perp$ 底面，所以 $B$ 是 $B_1$ 在底面上的射影，$\\angle B_1AB$ 就是 $AB_1$ 与底面所成的角。' +
          '在 $\\mathrm{Rt}\\triangle ABB_1$ 中 $\\tan\\angle B_1AB=\\frac{BB_1}{AB}=\\frac{' + n(h) + '}{' + n(a) + '}\\approx' +
          n(h / a, 4) + '$，所以 $\\angle B_1AB\\approx' + n(lineAng, 2) + '°$。'
      }];
      return {
        statement: '已知正三棱柱 $ABC\\text{-}A_1B_1C_1$ 的底面边长为 $' + n(a) + '$，侧棱长为 $' + n(h) +
          '$（图中红色为 $AB_1$）。求它的底面积、侧面积、表面积、体积，以及直线 $AB_1$ 与底面 $ABC$ 所成的角。',
        steps: steps,
        answer: '$S_{底}\\approx' + n(base, 4) + '$，$S_{侧}=' + n(lat, 4) + '$，$S_{表}\\approx' + n(S, 4) + '$，$V\\approx' +
          n(V, 4) + '$，$AB_1$ 与底面所成角 $\\approx' + n(lineAng, 2) + '°$。',
        scene: scene,
        readouts: [
          { label: '底面积', value: n(base, 4) },
          { label: '侧面积', value: n(lat, 4) },
          { label: '表面积', value: n(S, 4) },
          { label: '体积 V', value: n(V, 4) },
          { label: 'AB₁ 与底面角', value: n(lineAng, 2) + '°' }
        ]
      };
    }
  });

  /* ---------- 圆柱 ---------- */
  var cylinder = H.def({
    id: 'solid_cylinder',
    category: '立体几何',
    name: '圆柱',
    hint: '侧面展开图是矩形',
    make: function (rng) {
      return [
        P('r', '底面半径 r', 1, 6, 0.5, rng.pick([1, 2, 3, 4])),
        P('h', '高 h', 1, 10, 0.5, rng.int(2, 8))
      ];
    },
    build: function (v) {
      var r = v.r, h = v.h;
      var lat = 2 * PI * r * h, base = PI * r * r, S = lat + 2 * base, V = base * h;
      var diag = Math.hypot(2 * r, h);
      var scene = MV.Solids.cylinder(r, h);
      scene.legend = ['展开图：矩形 ' + n(2 * PI * r, 3) + ' × ' + n(h, 3)];
      var steps = [{
        title: '第 1 步：侧面积（展开图法）',
        body: '把侧面沿一条母线剪开铺平，得到一个矩形：宽等于底面周长 $2\\pi r$，高等于 $h$。所以' +
          '$$S_{侧}=2\\pi rh=2\\pi\\times' + n(r) + '\\times' + n(h) + '\\approx' + n(lat, 4) + '$$'
      }, {
        title: '第 2 步：表面积',
        body: '上下两个底面圆面积共 $2\\pi r^2\\approx' + n(2 * base, 4) + '$，所以' +
          '$$S_{表}=2\\pi rh+2\\pi r^2\\approx' + n(S, 4) + '$$'
      }, {
        title: '第 3 步：体积',
        body: '$$V=\\pi r^2h=\\pi\\times' + n(r * r, 4) + '\\times' + n(h) + '\\approx' + n(V, 4) + '$$'
      }, {
        title: '第 4 步：轴截面',
        body: '过轴的截面是矩形，长为 $2r=' + n(2 * r) + '$，宽为 $h=' + n(h) + '$，其对角线长' +
          '$$\\sqrt{(2r)^2+h^2}=\\sqrt{' + n(4 * r * r + h * h, 4) + '}\\approx' + n(diag, 4) + '$$'
      }];
      return {
        statement: '已知圆柱的底面半径为 $' + n(r) + '$，高为 $' + n(h) +
          '$。求它的侧面积、表面积、体积，以及过轴截面的对角线长。',
        steps: steps,
        answer: '$S_{侧}\\approx' + n(lat, 4) + '$，$S_{表}\\approx' + n(S, 4) + '$，$V\\approx' + n(V, 4) +
          '$，轴截面对角线 $\\approx' + n(diag, 4) + '$。',
        scene: scene,
        readouts: [
          { label: '侧面积', value: n(lat, 4) },
          { label: '表面积', value: n(S, 4) },
          { label: '体积 V', value: n(V, 4) },
          { label: '展开矩形', value: n(2 * PI * r, 3) + ' × ' + n(h, 3) }
        ]
      };
    }
  });

  /* ---------- 圆锥 ---------- */
  var cone = H.def({
    id: 'solid_cone',
    category: '立体几何',
    name: '圆锥',
    hint: '侧面展开成扇形，圆心角 360°·r/l',
    make: function (rng) {
      return [
        P('r', '底面半径 r', 1, 6, 0.5, rng.pick([1, 2, 3, 4])),
        P('h', '高 h', 1, 10, 0.5, rng.int(2, 8))
      ];
    },
    build: function (v) {
      var r = v.r, h = v.h;
      var l = Math.hypot(r, h);
      var lat = PI * r * l, base = PI * r * r, S = lat + base, V = base * h / 3;
      var expand = 360 * r / l;
      var apex = 2 * deg(Math.atan2(r, h));
      var scene = MV.Solids.cone(r, h);
      scene.legend = ['母线 l = ' + n(l, 4), '展开扇形圆心角 ' + n(expand, 2) + '°'];
      var steps = [{
        title: '第 1 步：求母线长',
        body: '圆锥的轴、底面半径与母线构成直角三角形：' +
          '$$l=\\sqrt{r^2+h^2}=\\sqrt{' + n(r * r, 4) + '+' + n(h * h, 4) + '}\\approx' + n(l, 4) + '$$'
      }, {
        title: '第 2 步：侧面积（展开成扇形）',
        body: '侧面展开图是半径为 $l$、弧长为底面周长 $2\\pi r$ 的扇形：' +
          '$$S_{侧}=\\frac{1}{2}\\times(2\\pi r)\\times l=\\pi rl\\approx' + n(lat, 4) + '$$'
      }, {
        title: '第 3 步：表面积与体积',
        body: '$$S_{表}=\\pi rl+\\pi r^2\\approx' + n(S, 4) + ',\\qquad V=\\frac{1}{3}\\pi r^2h\\approx' + n(V, 4) + '$$'
      }, {
        title: '第 4 步：展开扇形的圆心角与轴截面顶角',
        body: '扇形弧长等于底面周长：$\\frac{n\\pi l}{180}=2\\pi r$，解得圆心角 $n=360°\\times\\frac{r}{l}\\approx' + n(expand, 2) + '°$。' +
          '轴截面是等腰三角形，底边 $2r=' + n(2 * r) + '$、高 $h=' + n(h) + '$，顶角 $2\\arctan\\frac{r}{h}\\approx' + n(apex, 2) + '°$。'
      }];
      return {
        statement: '已知圆锥的底面半径为 $' + n(r) + '$，高为 $' + n(h) +
          '$。求它的母线长、侧面积、表面积、体积，以及侧面展开图的圆心角。',
        steps: steps,
        answer: '$l\\approx' + n(l, 4) + '$，$S_{侧}\\approx' + n(lat, 4) + '$，$S_{表}\\approx' + n(S, 4) + '$，$V\\approx' +
          n(V, 4) + '$，展开扇形圆心角 $\\approx' + n(expand, 2) + '°$。',
        scene: scene,
        readouts: [
          { label: '母线 l', value: n(l, 4) },
          { label: '侧面积', value: n(lat, 4) },
          { label: '表面积', value: n(S, 4) },
          { label: '体积 V', value: n(V, 4) },
          { label: '展开扇形圆心角', value: n(expand, 2) + '°' },
          { label: '轴截面顶角', value: n(apex, 2) + '°' }
        ]
      };
    }
  });

  /* ---------- 球 ---------- */
  var sphere = H.def({
    id: 'solid_sphere',
    category: '立体几何',
    name: '球与内接正方体',
    hint: '表面积 4πr²、体积 (4/3)πr³',
    make: function (rng) {
      return [P('r', '球半径 r', 1, 6, 0.5, rng.pick([1, 2, 3, 4]))];
    },
    build: function (v) {
      var r = v.r;
      var S = 4 * PI * r * r, V = 4 / 3 * PI * r * r * r;
      var cubeSide = 2 * r / Math.sqrt(3);
      var cylinderV = 2 * PI * r * r * r, cylinderS = 6 * PI * r * r;
      var scene = MV.Solids.sphere(r, { inscribedCube: true });
      scene.legend = ['内接正方体棱长 ' + n(cubeSide, 4)];
      scene = addInscribedCube(scene, r);
      var steps = [{
        title: '第 1 步：球的表面积与体积',
        body: '$$S=4\\pi r^2=4\\pi\\times' + n(r * r, 4) + '\\approx' + n(S, 4) + '$$' +
          '$$V=\\frac{4}{3}\\pi r^3=\\frac{4}{3}\\pi\\times' + n(r * r * r, 4) + '\\approx' + n(V, 4) + '$$'
      }, {
        title: '第 2 步：球的内接正方体',
        body: '正方体内接于球时，球的直径等于正方体的体对角线：$2r=\\sqrt{3}a$，所以' +
          '$$a=\\frac{2r}{\\sqrt{3}}=\\frac{2\\sqrt{3}}{3}r\\approx' + n(cubeSide, 4) + '$$' +
          '这个正方体的体积为 $a^3\\approx' + n(cubeSide * cubeSide * cubeSide, 4) + '$，表面积 $6a^2\\approx' +
          n(6 * cubeSide * cubeSide, 4) + '$，都小于球本身的体积与表面积（因为正方体在球内部）。'
      }, {
        title: '第 3 步：球的外切圆柱（阿基米德）',
        body: '球的外切圆柱底面半径为 $r$、高为 $2r$：$S_{圆柱}=2\\pi r\\cdot2r+2\\pi r^2=6\\pi r^2\\approx' + n(cylinderS, 4) +
          '$，$V_{圆柱}=2\\pi r^3\\approx' + n(cylinderV, 4) + '$。' +
          '有趣的是 $\\frac{S_{球}}{S_{圆柱}}=\\frac{4\\pi r^2}{6\\pi r^2}=\\frac{2}{3}$，$\\frac{V_{球}}{V_{圆柱}}=\\frac{2}{3}$，' +
          '这正是阿基米德最引以为豪的结论。'
      }, {
        title: '第 4 步：用平面截球',
        body: '若用一个与球心距离为 $d$ 的平面去截球（$d<r$），截面是圆，其半径 $r\'=\\sqrt{r^2-d^2}$。' +
          '例如 $d=\\frac{r}{2}=' + n(r / 2, 3) + '$ 时，$r\'=\\sqrt{' + n(r * r - r * r / 4, 4) + '}\\approx' +
          n(Math.sqrt(r * r - r * r / 4), 4) + '$。'
      }];
      return {
        statement: '已知球的半径为 $' + n(r) + '$。求它的表面积与体积；再求这个球的内接正方体的棱长（图中虚线框为正内接正方体）。',
        steps: steps,
        answer: '$S=' + n(S, 4) + '$，$V=' + n(V, 4) + '$，内接正方体棱长 $=\\frac{2\\sqrt{3}}{3}r\\approx' + n(cubeSide, 4) + '$。',
        scene: scene,
        readouts: [
          { label: '表面积 S', value: n(S, 4) },
          { label: '体积 V', value: n(V, 4) },
          { label: '内接正方体棱长', value: n(cubeSide, 4) },
          { label: '外切圆柱体积', value: n(cylinderV, 4) }
        ]
      };
    }
  });

  /* 给球场景补上内接正方体（虚线） */
  function addInscribedCube(scene, r) {
    var a = 2 * r / Math.sqrt(3), s = a / 2;
    var P = scene.points;
    P.cA = [-s, -s, -s]; P.cB = [s, -s, -s]; P.cC = [s, s, -s]; P.cD = [-s, s, -s];
    P.cA1 = [-s, -s, s]; P.cB1 = [s, -s, s]; P.cC1 = [s, s, s]; P.cD1 = [-s, s, s];
    var pairs = [
      ['cA', 'cB'], ['cB', 'cC'], ['cC', 'cD'], ['cD', 'cA'],
      ['cA1', 'cB1'], ['cB1', 'cC1'], ['cC1', 'cD1'], ['cD1', 'cA1'],
      ['cA', 'cA1'], ['cB', 'cB1'], ['cC', 'cC1'], ['cD', 'cD1']
    ];
    pairs.forEach(function (p) {
      scene.items.push({ t: 'edge', a: p[0], b: p[1], style: 'auto', color: '#0e9f6e', width: 1.8, hiddenColor: '#b7cfc4' });
    });
    return scene;
  }

  /* ---------- 正四面体 ---------- */
  var tetra = H.def({
    id: 'solid_tetra',
    category: '立体几何',
    name: '正四面体',
    hint: '高、体积、对棱所成角与二面角',
    make: function (rng) {
      return [P('a', '棱长 a', 2, 8, 0.5, rng.pick([2, 3, 4, 5]))];
    },
    build: function (v) {
      var a = v.a;
      var h = Math.sqrt(6) / 3 * a;
      var S = Math.sqrt(3) * a * a;
      var V = Math.sqrt(2) / 12 * a * a * a;
      var R = Math.sqrt(6) / 4 * a, rr = Math.sqrt(6) / 12 * a;
      var dihedral = deg(Math.acos(1 / 3));
      var scene = MV.Solids.tetra(a);
      scene.legend = ['高 h = ' + n(h, 4), '二面角 ≈ ' + n(dihedral, 2) + '°'];
      var steps = [{
        title: '第 1 步：求高',
        body: '设底面正三角形 $ABC$ 的中心为 $O$，则 $A O=\\frac{\\sqrt{3}}{3}a$ 且 $DO\\perp$ 底面。' +
          '在 $\\mathrm{Rt}\\triangle AOD$ 中：' +
          '$$h=\\sqrt{a^2-\\left(\\frac{\\sqrt{3}}{3}a\\right)^2}=\\sqrt{\\frac{2}{3}}a=\\frac{\\sqrt{6}}{3}a\\approx' + n(h, 4) + '$$'
      }, {
        title: '第 2 步：表面积与体积',
        body: '四个面都是边长为 $a$ 的正三角形：$$S=4\\times\\frac{\\sqrt{3}}{4}a^2=\\sqrt{3}a^2\\approx' + n(S, 4) + '$$' +
          '$$V=\\frac{1}{3}S_{底}h=\\frac{1}{3}\\times\\frac{\\sqrt{3}}{4}a^2\\times\\frac{\\sqrt{6}}{3}a=\\frac{\\sqrt{2}}{12}a^3\\approx' + n(V, 4) + '$$'
      }, {
        title: '第 3 步：外接球与内切球',
        body: '正四面体的外接球半径 $R=\\frac{\\sqrt{6}}{4}a\\approx' + n(R, 4) + '$，内切球半径 $r=\\frac{\\sqrt{6}}{12}a\\approx' +
          n(rr, 4) + '$，且 $R:r=3:1$，球心把高分成 $3:1$ 的两段（球心到底面距离等于内切球半径，到顶点距离等于外接球半径）。'
      }, {
        title: '第 4 步：对棱所成角与二面角',
        body: '用坐标法可以证明：正四面体的对棱（如 $AB$ 与 $CD$）互相垂直，所成角为 $90°$。' +
          '相邻两个面所成的二面角 $\\theta$ 满足 $\\cos\\theta=\\frac{1}{3}$，所以 $\\theta\\approx' + n(dihedral, 2) + '°$。'
      }];
      return {
        statement: '已知正四面体 $ABCD$ 的棱长为 $' + n(a) + '$。求它的高、表面积、体积、外接球与内切球半径，' +
          '并说明对棱所成的角与相邻面所成的二面角。',
        steps: steps,
        answer: '$h=\\frac{\\sqrt{6}}{3}a\\approx' + n(h, 4) + '$，$S\\approx' + n(S, 4) + '$，$V\\approx' + n(V, 4) +
          '$，$R\\approx' + n(R, 4) + '$，$r\\approx' + n(rr, 4) + '$，对棱所成角 $90°$，二面角 $\\approx' + n(dihedral, 2) + '°$。',
        scene: scene,
        readouts: [
          { label: '高 h', value: n(h, 4) },
          { label: '表面积 S', value: n(S, 4) },
          { label: '体积 V', value: n(V, 4) },
          { label: '外接球 R', value: n(R, 4) },
          { label: '内切球 r', value: n(rr, 4) },
          { label: '二面角', value: n(dihedral, 2) + '°' }
        ]
      };
    }
  });

  MV.SolidGen = { list: [cube, cuboid, pyramid, prism, cylinder, cone, sphere, tetra] };
})(typeof window !== 'undefined' ? window : globalThis);
