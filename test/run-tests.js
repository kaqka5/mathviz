/* ============================================================
 * mathviz/test/run-tests.js
 * Node 单元测试：数学正确性 + 生成器/解析器 + AI 流程 + 渲染器冒烟
 * 运行： node test/run-tests.js
 * ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const sandbox = { console };
vm.createContext(sandbox);
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
sandbox.devicePixelRatio = 1;

function load(rel) {
  const code = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  vm.runInContext(code, sandbox, { filename: rel });
}

const FILES = [
  'js/math/expr.js', 'js/math/geom.js', 'js/ui/mathfmt.js', 'js/ui/markdown.js',
  'js/render/plot2d.js', 'js/render/plot3d.js',
  'js/scenes/solid3d.js', 'js/scenes/geometry2d.js', 'js/scenes/graph2d.js', 'js/scenes/conic2d.js',
  'js/generators/helpers.js', 'js/generators/triangles.js', 'js/generators/functions.js',
  'js/generators/conics.js', 'js/generators/analytic.js', 'js/generators/solids.js',
  'js/generators/vectors.js', 'js/generators/index.js', 'js/parse/nlp.js',
  'js/ai/latex.js', 'js/ai/extract.js', 'js/ai/client.js', 'js/ai/samples.js'
];
FILES.forEach(load);

const MV = sandbox.MV;
const G = MV.G;

/* ---------------- 迷你测试框架 ---------------- */
let pass = 0, fail = 0;
const failures = [];
function ok(cond, name, extra) {
  if (cond) { pass++; }
  else { fail++; failures.push(name + (extra ? '  →  ' + extra : '')); }
}
function eq(a, b, name, tol) {
  const good = (tol === undefined) ? a === b : Math.abs(a - b) <= tol;
  ok(good, name, 'got ' + a + ', want ' + b);
}
function near(a, b, tol, name) { eq(a, b, name, tol === undefined ? 1e-6 : tol); }
function section(t) { console.log('\n—— ' + t + ' ——'); }

/* ---------------- 1. 表达式 ---------------- */
section('数学表达式解析/求值');
const cases = [
  ['2x+1', { x: 3 }, 7],
  ['2*x^2-3x+1', { x: 2 }, 3],
  ['sin(pi/2)', {}, 1],
  ['√3/2', {}, Math.sqrt(3) / 2],
  ['√(9)', {}, 3],
  ['2sin(x)', { x: Math.PI / 2 }, 2],
  ['-x^2', { x: 3 }, -9],
  ['2^-1', {}, 0.5],
  ['log(100)', {}, 2],
  ['ln(e)', {}, 1],
  ['abs(-3)+max(1,5)', {}, 8],
  ['3×4÷2', {}, 6],
  ['pi', {}, Math.PI]
];
cases.forEach(([src, scope, want]) => {
  let got;
  try { got = MV.Expr.evaluate(MV.Expr.parse(src), scope); }
  catch (e) { got = 'ERR:' + e.message; }
  near(got, want, 1e-9, '表达式 ' + src + ' = ' + want);
});
ok((() => { try { MV.Expr.parse('2+*3'); return false; } catch (e) { return true; } })(), '非法表达式应报错');
ok(MV.Expr.varNames('a*x^2+b').sort().join(',') === 'a,b,x', '变量收集');

/* ---------------- 2. 几何库 ---------------- */
section('几何计算');
const t345 = G.solveSSS(3, 4, 5);
near(t345.C, 90, 1e-9, '3-4-5 直角在 C');
near(t345.area, 6, 1e-9, '3-4-5 面积 = 6');
near(t345.r, 1, 1e-9, '3-4-5 内切圆半径 = 1');
near(t345.R, 2.5, 1e-9, '3-4-5 外接圆半径 = 2.5');
const sas = G.solveSAS(7, 5, 60);
near(sas.a * sas.a, 49 + 25 - 2 * 7 * 5 * 0.5, 1e-9, '余弦定理 a² = b²+c²-2bc·cosA');
near(sas.area, 0.5 * 7 * 5 * Math.sin(Math.PI / 3), 1e-9, 'SAS 面积');
const asa = G.solveASA(30, 60, 4);
near(asa.C, 90, 1e-9, 'ASA 第三角');
near(asa.c, 4, 1e-9, 'ASA 已知边保持');
near(asa.a / Math.sin(G.deg2rad(30)), asa.b / Math.sin(G.deg2rad(60)), 1e-9, '正弦定理比例一致');
near(asa.a, 2, 1e-9, '30-60-90 中 a=2');
ok(G.solveSSS(1, 2, 5) === null, '不满足三边关系返回 null');
eq(G.piFrac(-60), '-π/3', 'π 分数化简');
eq(G.piFrac(90), 'π/2', 'π 分数化简 90°');
eq(MV.GenHelp.sqrtNice(12).exact, '2√3', '根式化简 12');
eq(MV.GenHelp.sqrtNice(39).exact, '√39', '根式化简 39');
eq(MV.GenHelp.sqrtNice(144).exact, '12', '根式化简 144');
near(G.angleAt([1, 0], [0, 0], [0, 1]), 90, 1e-9, '向量夹角');
eq(G.subNum('A1'), 'A₁', '下标美化');

/* ---------------- 3. 公式排版 ---------------- */
section('公式排版');
ok(MV.Fmt.render('\\frac{a}{b}').indexOf('class="frac"') >= 0, '\\frac 生成分数结构');
ok(MV.Fmt.render('\\sqrt{3}').indexOf('radical') >= 0, '\\sqrt 生成根号结构');
ok(MV.Fmt.inline('已知 $x^2$ 的值').indexOf('<sup>2</sup>') >= 0, '行内公式上标');
ok(MV.Fmt.inline('**重点**').indexOf('<b>重点</b>') >= 0, '加粗');
ok(MV.Fmt.inline('a < b').indexOf('&lt;') >= 0, 'HTML 转义');
ok(MV.Fmt.render('\\overrightarrow{AB_1}').indexOf('class="vec"') >= 0, '向量箭头');

/* ---------------- 4. 渲染器桩 ---------------- */
section('渲染器冒烟测试');
function makeCtx() {
  const stat = { calls: 0 };
  const ctx = {
    canvas: null, stat,
    setTransform() { stat.calls++; }, clearRect() { }, fillRect() { stat.calls++; },
    beginPath() { }, moveTo() { }, lineTo() { }, arc() { stat.calls++; }, arcTo() { },
    closePath() { }, fill() { stat.calls++; }, stroke() { stat.calls++; },
    save() { }, restore() { }, setLineDash() { }, clip() { },
    fillText() { stat.calls++; }, strokeText() { },
    measureText(t) { return { width: String(t).length * 7 }; },
    createRadialGradient() { stat.calls++; return { addColorStop() { } }; },
    createLinearGradient() { return { addColorStop() { } }; },
    translate() { }, rotate() { }, scale() { }
  };
  return ctx;
}
function makeCanvas() {
  const ctx = makeCtx();
  return { clientWidth: 960, clientHeight: 640, width: 0, height: 0, ctx, getContext() { return ctx; } };
}
function renderScene(scene) {
  const canvas = makeCanvas();
  if (scene.kind === '3d') {
    const r = MV.Render3D.create(canvas);
    r.setScene(scene, false);
    r.render();
  } else {
    const r = MV.Render2D.create(canvas);
    r.setScene(scene, false);
    r.render();
  }
  return canvas.ctx.stat.calls;
}

/* ---------------- 5. 生成器 ---------------- */
section('题目生成器');
let genCount = 0, sceneCount = 0, drawCalls = 0;
MV.Generators.all.forEach(gen => {
  genCount++;
  const paramSets = [];
  for (let i = 0; i < 3; i++) paramSets.push(gen.make(G.rngFrom(1000 + i * 37 + gen.id.length)));
  const base = gen.make(G.rngFrom(9));
  base.forEach((p, idx) => {
    [{ v: p.min }, { v: p.max }].forEach(mod => {
      const ps = base.map(q => Object.assign({}, q));
      ps[idx].value = mod.v;
      paramSets.push(ps);
    });
  });
  paramSets.push(base.map(q => Object.assign({}, q, { value: (q.min + q.max) / 2 })));

  paramSets.forEach((ps, si) => {
    const vals = {};
    ps.forEach(p => { vals[p.key] = p.value; });
    let res;
    try { res = gen.build(vals); }
    catch (e) { ok(false, gen.id + ' 参数组#' + si + ' build 抛错', e.message); return; }
    ok(!!res && typeof res === 'object', gen.id + ' 返回结果');
    ok(typeof res.statement === 'string' && res.statement.length > 4, gen.id + ' 题干存在');
    ok(Array.isArray(res.steps) && res.steps.length >= 1, gen.id + ' 有解题步骤');
    ok(res.steps.every(s => typeof s.body === 'string' && s.body.length > 2), gen.id + ' 步骤内容完整');
    ok(typeof res.answer === 'string' && res.answer.length > 1, gen.id + ' 有答案');
    ok(res.scene && Array.isArray(res.scene.items), gen.id + ' 有图形场景');
    if (!res.scene) return;
    sceneCount++;
    const allText = [res.statement, res.answer].concat(res.steps.map(s => s.title + s.body)).join('\n');
    const dollars = (allText.match(/\$/g) || []).length;
    ok(dollars % 2 === 0, gen.id + ' 数学公式 $ 成对', '共 ' + dollars + ' 个 $');
    try { drawCalls += renderScene(res.scene); }
    catch (e) { ok(false, gen.id + ' 渲染抛错', e.message); }
    const missing = [];
    res.scene.items.forEach(it => {
      ['a', 'b', 'c', 'v', 'p1', 'p2', 'at', 'from'].forEach(k => {
        const v = it[k];
        if (typeof v === 'string' && res.scene.points && !res.scene.points[v]) missing.push(it.t + '.' + k + '=' + v);
      });
      if (it.t === 'polygon') it.pts.forEach(k => { if (!res.scene.points[k]) missing.push('polygon:' + k); });
    });
    ok(missing.length === 0, gen.id + ' 图形引用的点都存在', missing.join(','));
  });
});
console.log('   生成器 ' + genCount + ' 个，场景 ' + sceneCount + ' 个，绘图调用 ' + drawCalls + ' 次');
ok(drawCalls > 2000, '渲染器确实画出了内容');

/* ---------------- 6. 关键数值复核 ---------------- */
section('关键结论复核');
function valsOfGen(id, over) {
  const gen = MV.Generators.byId[id];
  const ps = gen.make(G.rngFrom(3)).map(p => Object.assign({}, p));
  const v = {};
  ps.forEach(p => { v[p.key] = over && over[p.key] !== undefined ? over[p.key] : p.value; });
  return gen.build(v);
}
function readoutOf(res, label) {
  const hit = res.readouts.filter(r => r.label === label)[0];
  if (!hit) return NaN;
  return parseFloat(String(hit.value).replace(/[^0-9.\-]/g, ''));
}
let ro;
let r1 = valsOfGen('solid_cube', { a: 2 });
near(readoutOf(r1, '体对角线'), 2 * Math.sqrt(3), 1e-4, '正方体体对角线 = √3·a');
near(readoutOf(r1, '体积 V'), 8, 1e-4, '正方体体积 = a³');
near(readoutOf(r1, '表面积 S'), 24, 1e-4, '正方体表面积 = 6a²');

let r2 = valsOfGen('solid_pyramid', { a: 4, theta: 45 });
near(readoutOf(r2, '高 h'), 2, 1e-3, '二面角 45° 时 h = a/2');
near(readoutOf(r2, '体积 V'), 16 * 2 / 3, 1e-2, '正四棱锥体积');

let r3 = valsOfGen('solid_cone', { r: 3, h: 4 });
near(readoutOf(r3, '母线 l'), 5, 1e-4, '圆锥母线 3-4-5');
near(readoutOf(r3, '侧面积'), 15 * Math.PI, 1e-3, '圆锥侧面积 πrl');
near(readoutOf(r3, '展开扇形圆心角'), 360 * 3 / 5, 1e-3, '展开扇形圆心角');

let r4 = valsOfGen('solid_sphere', { r: 1 });
near(readoutOf(r4, '表面积 S'), 4 * Math.PI, 1e-3, '球表面积 4πr²');
near(readoutOf(r4, '体积 V'), 4 * Math.PI / 3, 1e-3, '球体积 4πr³/3');
near(readoutOf(r4, '内接正方体棱长'), 2 / Math.sqrt(3), 1e-3, '球内接正方体棱长');

let r5 = valsOfGen('line_circle', { r: 5, k: 0.75, b: 0 });
near(readoutOf(r5, '弦长 |AB|'), 10, 1e-3, '过圆心时弦长 = 直径');
let r5b = valsOfGen('line_circle', { r: 5, k: 0, b: 3 });
near(readoutOf(r5b, '圆心距 d'), 3, 1e-6, '圆心到 y=3 的距离');
near(readoutOf(r5b, '弦长 |AB|'), 8, 1e-3, 'd=3,r=5 时弦长 8');

let r6 = valsOfGen('circle_circle', { r1: 3, r2: 3, d: 6 });
eq(r6.readouts.filter(x => x.label === '位置关系')[0].value, '外切', 'r1=r2=3,d=6 外切');
eq(r6.readouts.filter(x => x.label === '公切线条数')[0].value, '3', '外切有 3 条公切线');

let r7 = valsOfGen('vec_dot', { m: 3, n2: 4, angle: 90 });
near(readoutOf(r7, 'a·b'), 0, 1e-9, '垂直向量数量积为 0');
near(readoutOf(r7, '|a+b|'), 5, 1e-6, '勾股定理 |a+b|=5');

let r8 = valsOfGen('func_sin', { A: 2, w: 2, phi: 0, k: 0 });
near(readoutOf(r8, '周期 T'), Math.PI, 1e-3, '周期 T=2π/ω');
near(readoutOf(r8, '最大值'), 2, 1e-9, '最大值 A+k');

let r9 = valsOfGen('func_quad', { a: 1, b: -4, c: 3 });
near(readoutOf(r9, '对称轴'), 2, 1e-6, '对称轴 x=2');
near(readoutOf(r9, 'Δ = b²−4ac'), 4, 1e-6, '判别式 Δ=4');
near(parseFloat(r9.readouts.filter(x => x.label === '顶点')[0].value.replace(/[()]/g, '').split(',')[1]), -1, 1e-6, '顶点纵坐标 -1');

let r10 = valsOfGen('func_polar', { a: 2, k: 2 });
near(readoutOf(r10, '面积'), Math.PI * 4 / 2, 0.05, 'r=2cos2θ 面积 ≈ πa²/2');

// 椭圆 / 双曲线 / 抛物线
let r11 = valsOfGen('conic_ellipse', { a: 5, b: 3 });
near(readoutOf(r11, 'c = √(a²−b²)'), 4, 1e-6, '椭圆 c=4');
near(readoutOf(r11, '离心率 e = c/a'), 0.8, 1e-6, '椭圆 e=0.8');
let r12 = valsOfGen('conic_hyperbola', { a: 3, b: 4 });
near(readoutOf(r12, 'c = √(a²+b²)'), 5, 1e-6, '双曲线 c=5');
near(readoutOf(r12, '离心率 e = c/a'), 5 / 3, 1e-3, '双曲线 e=5/3');
function firstNum(s) {
  const m = String(s).match(/\d+(?:\.\d+)?/);
  return m ? parseFloat(m[0]) : NaN;
}
let r13 = valsOfGen('conic_parabola', { p: 4 });
near(firstNum(r13.readouts.filter(x => x.label === '焦点 F')[0].value), 2, 1e-6, '抛物线焦点 |x| = p/2');
near(firstNum(r13.readouts.filter(x => x.label === '准线')[0].value), 2, 1e-6, '抛物线准线 |x| = p/2');

/* ---------------- 7. 自定义题目解析 ---------------- */
section('自定义题目解析');
const customCases = [
  ['在△ABC中，AB=5，AC=7，∠A=60°，求BC的长和三角形的面积。', 'triangle', 'tri_sas'],
  ['△ABC的三边为 a=3，b=4，c=5，求最大角和面积。', 'triangle', 'tri_sss'],
  ['在三角形ABC中，∠A=45°，∠B=60°，AB=6，求其余边。', 'triangle', 'tri_aas'],
  ['y = 2sin(x) + 1', 'function', null],
  ['y = x^2 - 2x - 3', 'function', null],
  ['画出函数 y = x^3 - 3x', 'function', null],
  ['r = 3cos(3theta)', 'polar', null],
  ['圆 x^2+y^2=25 与直线 y=2x+1', 'circle-line', 'line_circle'],
  ['圆 x^2+y^2=16', 'circle', null],
  ['椭圆 x^2/25+y^2/9=1', 'ellipse', null],
  ['双曲线 x^2/16-y^2/9=1', 'hyperbola', null],
  ['抛物线 y^2=8x', 'parabola', null],
  ['正方体棱长为3', 'solid', 'solid_cube'],
  ['长方体长4宽3高2', 'solid', 'solid_cuboid'],
  ['正三棱柱底面边长为4，高为6', 'solid', 'solid_prism'],
  ['正四棱锥底面边长4，侧面与底面所成角60°', 'solid', 'solid_pyramid'],
  ['圆柱底面半径2，高5，求侧面积和体积', 'solid', 'solid_cylinder'],
  ['圆锥底面半径3，高4', 'solid', 'solid_cone'],
  ['球半径2，求表面积与体积', 'solid', 'solid_sphere'],
  ['正四面体棱长为6', 'solid', 'solid_tetra']
];
let customOk = 0;
customCases.forEach(([text, kind, genId]) => {
  const prob = MV.CustomParser.parse(text);
  ok(prob.ok, '能识别：' + text, prob.message || '');
  if (!prob.ok) return;
  customOk++;
  eq(prob.kind, kind, '识别类型：' + text);
  const vals = {};
  prob.params.forEach(p => { vals[p.key] = p.value; });
  let res;
  try { res = prob.build(vals); }
  catch (e) { ok(false, '自定义题 build 抛错：' + text, e.message); return; }
  ok(res.scene && res.scene.items.length > 0, '自定义题有图形：' + text);
  ok((res.steps || []).length >= 1, '自定义题有步骤：' + text);
  try { renderScene(res.scene); }
  catch (e) { ok(false, '自定义题渲染抛错：' + text, e.message); }
  prob.params.forEach(p => {
    [p.min, p.max].forEach(v => {
      const vv = Object.assign({}, vals); vv[p.key] = v;
      try { renderScene(prob.build(vv).scene); }
      catch (e) { ok(false, '自定义题参数极值抛错：' + text + ' / ' + p.label + '=' + v, e.message); }
    });
  });
});
ok(customOk === customCases.length, '全部自定义样例识别成功', customOk + '/' + customCases.length);
const bad = MV.CustomParser.parse('今天天气不错');
ok(!bad.ok && typeof bad.message === 'string', '无效输入返回友好提示');

/* ---------------- 8. 数值一致性抽查 ---------------- */
section('解三角形一致性抽查');
let consistent = true;
for (let i = 0; i < 200; i++) {
  const A = 10 + (i * 7) % 160;
  const b = 2 + (i % 9);
  const c = 2 + ((i * 3) % 9);
  const tri = G.solveSAS(b, c, A);
  if (!tri) continue;
  if (Math.abs(tri.A + tri.B + tri.C - 180) > 1e-6) { consistent = false; break; }
  const want = b * b + c * c - 2 * b * c * Math.cos(G.deg2rad(A));
  if (Math.abs(tri.a * tri.a - want) > 1e-6) { consistent = false; break; }
}
ok(consistent, '200 组随机三角形内角和与余弦定理一致');

/* ---------------- 9. LaTeX 转换（AI 返回的公式） ---------------- */
section('LaTeX → 表达式 / 纯文本');
const LT = [
  ['\\frac{1}{2}bc\\sin A', 'expr', '(1)/(2)bc sin A'],
  ['\\sqrt{39}', 'expr', 'sqrt(39)'],
  ['\\sin\\left(2x+\\frac{\\pi}{3}\\right)', 'expr', 'sin(2x+(pi)/(3))'],
  ['\\cos 60^{\\circ}', 'expr', 'cos ((60)*pi/180)'],
  ['f\'(x)=3x^{2}-6x', 'expr', "f'(x)=3x^(2)-6x"],
  ['y=2\\sin\\left(2x+\\frac{\\pi}{3}\\right)', 'expr', 'y=2 sin(2x+(pi)/(3))'],
  ['x^{2}+y^{2}=25', 'plain', 'x^2+y^2=25'],
  ['\\triangle ABC', 'plain', '△ABC'],
  ['\\angle A=60^{\\circ}', 'plain', '∠A=60°'],
  ['\\overrightarrow{AB_{1}}=(2,0,2)', 'plain', '向量AB_1=(2,0,2)'],
  ['\\dfrac{\\sqrt{3}}{2}', 'plain', '(√(3))/(2)'],
  ['\\log_{2}8', 'expr', '(ln(8)/ln(2))']
];
LT.forEach(([src, mode, want]) => {
  const got = MV.Latex.tex(src, mode);
  ok(got === want, 'LaTeX ' + mode + ' ' + src, 'got「' + got + '」want「' + want + '」');
});
const EXPR_OK = [
  'a^{2}=b^{2}+c^{2}-2bc\\cos A', 'S=\\frac{1}{2}bc\\sin A', 'V=\\frac{1}{3}\\pi r^{2}h',
  'y=2\\sin\\left(2x+\\frac{\\pi}{3}\\right)', 'f\'(x)=3x^{2}-6x', '\\sqrt{r^{2}-d^{2}}',
  'l=\\sqrt{3^{2}+4^{2}}', 'n=360^{\\circ}\\times\\frac{3}{5}', '\\frac{x^{2}}{25}+\\frac{y^{2}}{9}=1'
];
EXPR_OK.forEach(src => {
  const e = MV.Latex.tex(src, 'expr');
  const rhs = e.indexOf('=') >= 0 ? e.slice(e.indexOf('=') + 1) : e;
  let good = true, msg = '';
  try { MV.Expr.parse(rhs); } catch (err) { good = false; msg = err.message; }
  ok(good, '表达式可解析：' + src, '→ ' + e + ' ' + msg);
});
const segs = MV.Latex.segments('已知 $x^2$ 与 $$y=x^3$$ 以及 \\(z=1\\)');
ok(segs.filter(x => x.type === 'math').length === 3, '数学块扫描');
ok(MV.Latex.textWithMathPlain('由 $\\frac{1}{2}bc\\sin A$ 得').indexOf('(1)/(2)bc sin A') > 0, '数学块内联成纯文本');

/* ---------------- 10. AI 返回内容 → 题目 + 图形 ---------------- */
section('AI 解答 → 题目与可调图形');
const S = MV.AISamples.all;
const EXPECT = {
  triangle: { figs: 1, kind: 'triangle', check: f => f.params.filter(p => p.key === 'A')[0].value === 60 && f.params.filter(p => p.key === 'b')[0].value === 7 && f.params.filter(p => p.key === 'c')[0].value === 5 },
  derivative: { figs: 2, kind: 'function', check: () => true },
  solid: { figs: 1, kind: 'solid', check: f => f.params.filter(p => p.key === 'a')[0].value === 2 },
  circle: { figs: 1, kind: 'circle-line', check: f => f.params.filter(p => p.key === 'r')[0].value === 5 && f.params.filter(p => p.key === 'k')[0].value === 2 && f.params.filter(p => p.key === 'b')[0].value === 1 },
  cone: { figs: 1, kind: 'solid', check: f => f.params.filter(p => p.key === 'r')[0].value === 3 && f.params.filter(p => p.key === 'h')[0].value === 4 },
  functionGraph: { figs: 1, kind: 'function', check: () => true },
  conic: { figs: 1, kind: 'ellipse', check: f => f.params.filter(p => p.key === 'a')[0].value === 5 && f.params.filter(p => p.key === 'b')[0].value === 3 }
};
Object.keys(S).forEach(key => {
  const r = MV.AIExtract.parse(S[key]);
  const exp = EXPECT[key];
  ok(r.ok, '解析成功：' + key);
  ok(r.statement && r.statement.length > 5, '解析出题干：' + key);
  ok(r.steps.length >= 2, '解析出多个步骤：' + key, 'steps=' + r.steps.length);
  ok(r.answer && r.answer.length > 1, '解析出答案：' + key);
  ok(r.figures.length === exp.figs, '图形数量 ' + key, 'got ' + r.figures.length + ' want ' + exp.figs);
  if (exp.kind && r.figures[0]) {
    ok(r.figures[0].kind === exp.kind, '图形类型 ' + key, 'got ' + r.figures[0].kind + ' want ' + exp.kind);
  }
  r.figures.forEach(f => {
    ok(exp.check(f), '图形参数正确 ' + key + ' / ' + f.title);
    const vals = {};
    f.params.forEach(p => { vals[p.key] = p.value; });
    try {
      const res = f.build(vals);
      ok(!!res.scene && res.scene.items.length > 0, '图形有内容 ' + key + ' / ' + f.title);
      renderScene(res.scene);
    } catch (e) { ok(false, '图形构建失败 ' + key + ' / ' + f.title, e.message); }
    f.params.forEach(p => {
      [p.min, p.max].forEach(v => {
        const vv = Object.assign({}, vals); vv[p.key] = v;
        try { renderScene(f.build(vv).scene); }
        catch (e) { ok(false, '参数极值渲染失败 ' + key + ' / ' + f.title + ' / ' + p.label + '=' + v, e.message); }
      });
    });
  });
});
const dup = MV.AIExtract.parse(S.triangle);
ok(dup.figures.length === 1, '重复条件只出一张图');
// 坐标范围要自适应，不能把图像压成一条线
const dfig = MV.AIExtract.parse(S.derivative).figures[0];
const dvals = {}; dfig.params.forEach(p => { dvals[p.key] = p.value; });
const dscene = dfig.build(dvals).scene;
ok(Math.abs(dscene.xRange[0]) <= 8, '函数横轴范围自适应', 'xRange=' + dscene.xRange);
// AI 明确给出 figures 代码块时应优先采用
const withFence = [
  '### 题目', '已知函数 $y=x^{2}-4x+3$，求顶点与零点。', '',
  '### 解答', '#### 第 1 步：配方', '$y=(x-2)^{2}-1$，顶点 $(2,-1)$。', '',
  '### 答案', '顶点 $(2,-1)$，零点 $x=1,3$。', '',
  '```figures', '[{"title":"抛物线","text":"y=x^2-4x+3"}]', '```'
].join('\n');
const rf = MV.AIExtract.parse(withFence);
ok(rf.ok && rf.figures.length >= 1, '带 figures 代码块的返回');
ok(rf.statement.indexOf('figures') < 0 && rf.statement.indexOf('```') < 0, '代码块不会出现在题干里');
const jsonAns = JSON.stringify({
  statement: '在△ABC中，AB=3，AC=4，∠A=90°，求BC。',
  steps: [{ title: '第 1 步：勾股定理', body: '$BC=\\sqrt{3^2+4^2}=5$' }],
  answer: '$BC=5$'
});
const rj = MV.AIExtract.parse(jsonAns);
ok(rj.ok && rj.steps.length === 1 && rj.figures.length === 1, 'JSON 结构的返回', 'figs=' + rj.figures.length);
ok(!MV.AIExtract.parse('').ok, '空内容返回失败');

/* ---------------- 11. Markdown 渲染 ---------------- */
section('Markdown 渲染');
const md = MV.MD.render('### 标题\n\n- 第一项\n- 第二项\n\n**重点** 与 $x^2$ 与 `code`\n\n1. 甲\n2. 乙');
ok(md.indexOf('<h3') >= 0, 'Markdown 标题');
ok(md.indexOf('<ul>') >= 0 && md.indexOf('<li>第一项</li>') >= 0, 'Markdown 无序列表');
ok(md.indexOf('<ol>') >= 0, 'Markdown 有序列表');
ok(md.indexOf('<b>重点</b>') >= 0, 'Markdown 粗体');
ok(md.indexOf('<sup>2</sup>') >= 0, 'Markdown 里的公式');
ok(md.indexOf('<code>code</code>') >= 0, 'Markdown 行内代码');
ok(MV.MD.render('a < b & c').indexOf('&lt;') >= 0, 'Markdown 转义');
ok(MV.MD.render('$$x^2+y^2=1$$').indexOf('mathblock') >= 0, 'Markdown 独立公式');

/* ---------------- 12. AI 客户端（模拟接口） ---------------- */
section('AI 客户端');
sandbox.localStorage = {
  _s: {},
  getItem(k) { return this._s[k] === undefined ? null : this._s[k]; },
  setItem(k, v) { this._s[k] = String(v); },
  removeItem(k) { delete this._s[k]; }
};
ok(MV.AIClient.chatUrl('https://api.deepseek.com/v1') === 'https://api.deepseek.com/v1/chat/completions', '补全 chat/completions');
ok(MV.AIClient.chatUrl('https://x/v1/chat/completions') === 'https://x/v1/chat/completions', '已是完整地址则不重复拼接');
ok(MV.AIClient.pickContent({ choices: [{ message: { content: '你好' } }] }) === '你好', '读取返回文本');
ok(MV.AIClient.pickContent({ choices: [{ message: { content: [{ type: 'text', text: '分段' }] } }] }) === '分段', '读取分段文本');
ok(MV.AIClient.buildFullPrompt({ topic: '导数' }).indexOf('导数') > 0, '提示词包含知识点');
ok(MV.AIClient.buildFullPrompt({ topic: '导数' }).indexOf('```figures') > 0, '提示词要求给出 figures 代码块');
ok(MV.AIClient.PRESETS.length >= 5, '内置服务商预设');

function mockResponse(status, bodyText) {
  return Promise.resolve({ ok: status >= 200 && status < 300, status, text: () => Promise.resolve(bodyText) });
}

async function aiAsyncTests() {
  let captured = null;
  const fetchOk = (url, init) => {
    captured = { url, init };
    return mockResponse(200, JSON.stringify({ choices: [{ message: { content: '### 题目\n$1+1=2$' } }] }));
  };
  const r = await MV.AIClient.callAI({
    topic: '解三角形', difficulty: '中等',
    settings: { baseUrl: 'https://api.deepseek.com/v1', apiKey: 'sk-test', model: 'deepseek-chat' },
    fetch: fetchOk
  });
  ok(r.text.indexOf('### 题目') === 0, '拿到 AI 文本');
  ok(captured.url === 'https://api.deepseek.com/v1/chat/completions', '请求地址正确');
  ok(captured.init.headers.Authorization === 'Bearer sk-test', '带上密钥');
  const body = JSON.parse(captured.init.body);
  ok(body.model === 'deepseek-chat', '请求里带模型名');
  ok(body.messages[0].role === 'system' && body.messages[0].content.indexOf('figures') > 0, 'system 提示词完整');
  ok(body.messages[1].content.indexOf('解三角形') >= 0, '用户提示词包含知识点');

  let msg401 = '';
  try {
    await MV.AIClient.callAI({
      topic: 'x', settings: { baseUrl: 'https://api.deepseek.com/v1', apiKey: 'bad', model: 'm' },
      fetch: () => mockResponse(401, JSON.stringify({ error: { message: 'Invalid API key' } }))
    });
  } catch (e) { msg401 = e.message; }
  ok(/401/.test(msg401) && /密钥无效/.test(msg401), '401 给出可读提示', msg401);

  let msgNet = '';
  try {
    await MV.AIClient.callAI({
      topic: 'x', settings: { baseUrl: 'https://api.deepseek.com/v1', apiKey: 'k', model: 'm' },
      fetch: () => Promise.reject(new Error('Failed to fetch'))
    });
  } catch (e) { msgNet = e.message; }
  ok(/复制提示词/.test(msgNet), '网络/跨域失败给出替代方案', msgNet);

  let msgNoKey = '';
  try {
    await MV.AIClient.callAI({ topic: 'x', settings: { baseUrl: 'https://api.deepseek.com/v1', apiKey: '' } });
  } catch (e) { msgNoKey = e.message; }
  ok(/密钥/.test(msgNoKey), '没填密钥时提示', msgNoKey);

  let okLocal = false;
  try {
    await MV.AIClient.callAI({
      topic: 'x', settings: { baseUrl: 'http://localhost:11434/v1', apiKey: '', model: 'qwen' },
      fetch: () => mockResponse(200, JSON.stringify({ choices: [{ message: { content: '本地模型' } }] }))
    });
    okLocal = true;
  } catch (e) { okLocal = false; }
  ok(okLocal, '本地地址不强制要密钥');

  // 端到端：把 AI 返回的内容喂给提取器
  const e2e = MV.AIExtract.parse(MV.AISamples.all.triangle);
  ok(e2e.figures.length === 1 && e2e.steps.length === 3, '端到端：AI 文本 → 题目 + 可调图形');

  MV.AIClient.saveSettings({ preset: 'openai', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini', apiKey: 'sk-1' });
  const back = MV.AIClient.loadSettings();
  ok(back.model === 'gpt-4o-mini' && back.apiKey === 'sk-1', '设置能存能读');
}

/* ---------------- 汇总 ---------------- */
function finish() {
  console.log('\n========================================');
  console.log('通过 ' + pass + ' 项，失败 ' + fail + ' 项');
  if (failures.length) {
    console.log('\n失败明细：');
    failures.slice(0, 40).forEach(f => console.log(' ✗ ' + f));
    process.exitCode = 1;
  } else {
    console.log('✅ 全部测试通过');
  }
}

aiAsyncTests().catch(e => {
  ok(false, '异步测试异常', e && e.message);
}).then(finish);
