/* ============================================================
 * mathviz/js/scenes/solid3d.js
 * 立体图形场景构造：正方体 / 长方体 / 正三棱柱 / 正四棱锥 /
 * 正四面体 / 圆柱 / 圆锥 / 球
 * ============================================================ */
(function (global) {
  'use strict';
  var MV = (global.MV = global.MV || {});
  var G = MV.G, V = MV.G.V;

  var FACE = 'rgba(114,168,228,0.20)';
  var FACE_HL = 'rgba(220,120,60,0.22)';

  function base(points, items, view) {
    return { kind: '3d', points: points, items: items, view: view || { yaw: -0.62, pitch: 0.34 } };
  }

  function polyhedronFaces(names) {
    // names: [[...],[...]] 返回面元素
    return names.map(function (f) { return { t: 'face', pts: f, color: FACE, outline: false }; });
  }

  function edgeList(pairs, style, color, width) {
    return pairs.map(function (p) {
      return { t: 'edge', a: p[0], b: p[1], style: style || 'auto', color: color, width: width };
    });
  }

  function vertices(names, points, size) {
    return names.map(function (k) {
      return { t: 'point', at: k, label: k, r: 3.0, labelSize: size || 15 };
    });
  }

  function namedBox(a, b, h) {
    // 底面在 z=0，中心在原点上方，A 在 (-a/2,-b/2,0)
    return {
      A: [-a / 2, -b / 2, 0], B: [a / 2, -b / 2, 0], C: [a / 2, b / 2, 0], D: [-a / 2, b / 2, 0],
      A1: [-a / 2, -b / 2, h], B1: [a / 2, -b / 2, h], C1: [a / 2, b / 2, h], D1: [-a / 2, b / 2, h]
    };
  }

  var Solids = {
    /* ---------- 正方体 ---------- */
    cube: function (a, opts) {
      opts = opts || {};
      var P = namedBox(a, a, a);
      var items = polyhedronFaces([
        ['A', 'B', 'C', 'D'], ['A1', 'B1', 'C1', 'D1'],
        ['A', 'B', 'B1', 'A1'], ['B', 'C', 'C1', 'B1'],
        ['C', 'D', 'D1', 'C1'], ['D', 'A', 'A1', 'D1']
      ]);
      items = items.concat(edgeList([
        ['A', 'B'], ['B', 'C'], ['C', 'D'], ['D', 'A'],
        ['A1', 'B1'], ['B1', 'C1'], ['C1', 'D1'], ['D1', 'A1'],
        ['A', 'A1'], ['B', 'B1'], ['C', 'C1'], ['D', 'D1']
      ], 'auto'));
      if (opts.emphasis) {
        opts.emphasis.forEach(function (e) {
          items.push({ t: 'edge', a: e[0], b: e[1], style: 'auto', color: e[2] || '#dc2626', width: 2.8 });
        });
      }
      if (opts.angles) {
        opts.angles.forEach(function (an) {
          items.push({ t: 'angle', v: an[0], p1: an[1], p2: an[2], label: an[3], radiusFrac: 0.3, radius: an[4] });
        });
      }
      return base(P, items.concat(vertices(['A', 'B', 'C', 'D', 'A1', 'B1', 'C1', 'D1'], P)), opts.view);
    },

    /* ---------- 长方体 ---------- */
    cuboid: function (a, b, h, opts) {
      opts = opts || {};
      var P = namedBox(a, b, h);
      var items = polyhedronFaces([
        ['A', 'B', 'C', 'D'], ['A1', 'B1', 'C1', 'D1'],
        ['A', 'B', 'B1', 'A1'], ['B', 'C', 'C1', 'B1'],
        ['C', 'D', 'D1', 'C1'], ['D', 'A', 'A1', 'D1']
      ]);
      items = items.concat(edgeList([
        ['A', 'B'], ['B', 'C'], ['C', 'D'], ['D', 'A'],
        ['A1', 'B1'], ['B1', 'C1'], ['C1', 'D1'], ['D1', 'A1'],
        ['A', 'A1'], ['B', 'B1'], ['C', 'C1'], ['D', 'D1']
      ], 'auto'));
      if (opts.emphasis) {
        opts.emphasis.forEach(function (e) {
          items.push({ t: 'edge', a: e[0], b: e[1], style: 'auto', color: e[2] || '#dc2626', width: 2.8 });
        });
      }
      return base(P, items.concat(vertices(['A', 'B', 'C', 'D', 'A1', 'B1', 'C1', 'D1'], P)), opts.view);
    },

    /* ---------- 正三棱柱 ---------- */
    prism3: function (side, h, opts) {
      opts = opts || {};
      var R = side / Math.sqrt(3);      // 外接圆半径
      var P = {};
      ['A', 'B', 'C'].forEach(function (k, i) {
        var t = G.deg2rad(90 + i * 120);
        P[k] = [R * Math.cos(t), R * Math.sin(t), 0];
      });
      ['A1', 'B1', 'C1'].forEach(function (k, i) {
        var s = P['ABC'[i]];
        P[k] = [s[0], s[1], h];
      });
      var items = polyhedronFaces([
        ['A', 'B', 'C'], ['A1', 'B1', 'C1'],
        ['A', 'B', 'B1', 'A1'], ['B', 'C', 'C1', 'B1'], ['C', 'A', 'A1', 'C1']
      ]);
      items = items.concat(edgeList([
        ['A', 'B'], ['B', 'C'], ['C', 'A'],
        ['A1', 'B1'], ['B1', 'C1'], ['C1', 'A1'],
        ['A', 'A1'], ['B', 'B1'], ['C', 'C1']
      ], 'auto'));
      if (opts.emphasis) {
        opts.emphasis.forEach(function (e) {
          items.push({ t: 'edge', a: e[0], b: e[1], style: 'auto', color: e[2] || '#dc2626', width: 2.8 });
        });
      }
      return base(P, items.concat(vertices(['A', 'B', 'C', 'A1', 'B1', 'C1'], P)), opts.view);
    },

    /* ---------- 正四棱锥 ---------- */
    pyramid4: function (a, h, opts) {
      opts = opts || {};
      var P = {
        A: [-a / 2, -a / 2, 0], B: [a / 2, -a / 2, 0],
        C: [a / 2, a / 2, 0], D: [-a / 2, a / 2, 0],
        P: [0, 0, h], O: [0, 0, 0], M: [0, -a / 2, 0]
      };
      var items = [
        { t: 'face', pts: ['A', 'B', 'C', 'D'], color: FACE },
        { t: 'face', pts: ['P', 'A', 'B'], color: FACE },
        { t: 'face', pts: ['P', 'B', 'C'], color: FACE },
        { t: 'face', pts: ['P', 'C', 'D'], color: FACE },
        { t: 'face', pts: ['P', 'D', 'A'], color: FACE }
      ];
      items = items.concat(edgeList([
        ['A', 'B'], ['B', 'C'], ['C', 'D'], ['D', 'A'],
        ['P', 'A'], ['P', 'B'], ['P', 'C'], ['P', 'D']
      ], 'auto'));
      items.push({ t: 'edge', a: 'P', b: 'O', style: 'dashed', color: '#7f9dbe', width: 1.8, label: 'h' });
      items.push({ t: 'point', at: 'O', label: 'O', labelSize: 14, r: 2.6 });
      if (opts.showDihedral !== false) {
        items.push({
          t: 'angle', v: 'M', p1: 'P', p2: 'O',
          label: opts.dihedralLabel, radius: Math.min(a) * 0.22
        });
        items.push({ t: 'point', at: 'M', label: 'M', labelSize: 13, r: 2.4, labelDir: [-0.4, 0.9] });
        items.push({ t: 'edge', a: 'M', b: 'O', style: 'dashed', color: '#94a3b8', width: 1.4 });
      }
      if (opts.showEdgeAngle) {
        items.push({
          t: 'angle', v: 'A', p1: 'P', p2: 'O',
          label: opts.edgeAngleLabel, radius: Math.min(a) * 0.26, color: '#0e9f6e'
        });
      }
      items = items.concat(vertices(['A', 'B', 'C', 'D', 'P'], P));
      return base(P, items, opts.view);
    },

    /* ---------- 正四面体 ---------- */
    tetra: function (a, opts) {
      opts = opts || {};
      var R = a / Math.sqrt(3);
      var P = {};
      ['A', 'B', 'C'].forEach(function (k, i) {
        var t = G.deg2rad(90 + i * 120);
        P[k] = [R * Math.cos(t), R * Math.sin(t), 0];
      });
      P.D = [0, 0, a * Math.sqrt(2 / 3)];
      var items = polyhedronFaces([['A', 'B', 'C'], ['A', 'B', 'D'], ['B', 'C', 'D'], ['C', 'A', 'D']]);
      items = items.concat(edgeList([
        ['A', 'B'], ['B', 'C'], ['C', 'A'], ['A', 'D'], ['B', 'D'], ['C', 'D']
      ], 'auto'));
      return base(P, items.concat(vertices(['A', 'B', 'C', 'D'], P)), opts.view);
    },

    /* ---------- 圆柱 ---------- */
    cylinder: function (r, h, opts) {
      opts = opts || {};
      var N = opts.segments || 56;
      var P = {}, items = [], rimB = [], rimT = [];
      for (var i = 0; i < N; i++) {
        var t = i / N * Math.PI * 2;
        var x = r * Math.cos(t), y = r * Math.sin(t);
        P['b' + i] = [x, y, 0];
        P['t' + i] = [x, y, h];
        rimB.push('b' + i); rimT.push('t' + i);
      }
      for (var j = 0; j < N; j++) {
        var k = (j + 1) % N;
        items.push({ t: 'face', pts: ['b' + j, 'b' + k, 't' + k, 't' + j], color: 'rgba(114,168,228,0.16)' });
      }
      items.push({ t: 'face', pts: rimT, color: 'rgba(114,168,228,0.30)' });
      items.push({ t: 'face', pts: rimB.slice().reverse(), color: 'rgba(114,168,228,0.22)' });
      items.push({ t: 'circle3', c: 'o1', r: r, axis: 'z', color: '#1f4e8c', width: 2 });
      items.push({ t: 'circle3', c: 'o2', r: r, axis: 'z', color: '#1f4e8c', width: 2 });
      P.o1 = [0, 0, 0]; P.o2 = [0, 0, h];
      // 轴线
      items.push({ t: 'edge', a: 'o1', b: 'o2', style: 'dashed', color: '#94a3b8', width: 1.5 });
      items.push({ t: 'edge', a: 'o1', b: 'b0', style: 'auto', color: '#0e9f6e', width: 2, label: 'r' });
      items.push({ t: 'point', at: 'o1', label: 'O', r: 2.4, labelSize: 13 });
      P.b0 = [r, 0, 0];
      return base(P, items, opts.view);
    },

    /* ---------- 圆锥 ---------- */
    cone: function (r, h, opts) {
      opts = opts || {};
      var N = opts.segments || 56;
      var P = { P: [0, 0, h], O: [0, 0, 0] }, items = [], rim = [];
      for (var i = 0; i < N; i++) {
        var t = i / N * Math.PI * 2;
        P['b' + i] = [r * Math.cos(t), r * Math.sin(t), 0];
        rim.push('b' + i);
      }
      for (var j = 0; j < N; j++) {
        var k = (j + 1) % N;
        items.push({ t: 'face', pts: ['P', 'b' + j, 'b' + k], color: 'rgba(114,168,228,0.16)' });
      }
      items.push({ t: 'face', pts: rim.slice().reverse(), color: 'rgba(114,168,228,0.22)' });
      items.push({ t: 'circle3', c: 'O', r: r, axis: 'z', color: '#1f4e8c', width: 2 });
      items.push({ t: 'edge', a: 'O', b: 'P', style: 'dashed', color: '#94a3b8', width: 1.5, label: 'h' });
      P.b0 = [r, 0, 0];
      items.push({ t: 'edge', a: 'O', b: 'b0', style: 'auto', color: '#0e9f6e', width: 2, label: 'r' });
      items.push({ t: 'edge', a: 'P', b: 'b0', style: 'auto', color: '#c2410c', width: 2.2, label: 'l' });
      items.push({ t: 'point', at: 'P', label: 'P', r: 3, labelSize: 15 });
      items.push({ t: 'point', at: 'O', label: 'O', r: 2.6, labelSize: 13 });
      return base(P, items, opts.view);
    },

    /* ---------- 球 ---------- */
    sphere: function (r, opts) {
      opts = opts || {};
      var P = { O: [0, 0, 0], T: [0, 0, r] };
      var items = [{ t: 'sphere', c: 'O', r: r }];
      // 大圆明确轮廓（画在球体之上）
      items.push({ t: 'circle3', c: 'O', r: r, axis: 'z', color: '#5f83ad', width: 1.7, onTop: true });
      items.push({ t: 'circle3', c: 'O', r: r, axis: 'x', color: '#8fa8c6', width: 1.3, onTop: true });
      items.push({ t: 'circle3', c: 'O', r: r, axis: 'y', color: '#a9bdd6', width: 1.1, onTop: true });
      // 半径
      items.push({ t: 'edge', a: 'O', b: 'T', style: 'solid', color: '#0e9f6e', width: 2, label: 'r' });
      items.push({ t: 'point', at: 'O', label: 'O', r: 2.6, labelSize: 13 });
      items.push({ t: 'point', at: 'T', label: 'T', r: 2.2, labelSize: 13 });
      return base(P, items, opts.view);
    }
  };

  MV.Solids = Solids;
})(typeof window !== 'undefined' ? window : globalThis);
