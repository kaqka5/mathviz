/* ============================================================
 * mathviz/js/generators/index.js
 * 生成器注册表
 * ============================================================ */
(function (global) {
  'use strict';
  var MV = (global.MV = global.MV || {});

  var all = []
    .concat(MV.TriGen ? MV.TriGen.list : [])
    .concat(MV.FuncGen ? MV.FuncGen.list : [])
    .concat(MV.ConicGen ? MV.ConicGen.list : [])
    .concat(MV.AnalyticGen ? MV.AnalyticGen.list : [])
    .concat(MV.SolidGen ? MV.SolidGen.list : [])
    .concat(MV.VectorGen ? MV.VectorGen.list : []);

  var byId = {};
  all.forEach(function (g) { byId[g.id] = g; });

  var categories = [];
  all.forEach(function (g) {
    if (categories.indexOf(g.category) < 0) categories.push(g.category);
  });

  MV.Generators = {
    all: all,
    byId: byId,
    categories: categories,
    inCategory: function (cat) {
      return all.filter(function (g) { return g.category === cat; });
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
