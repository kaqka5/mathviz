/* ============================================================
 * mathviz/js/ui/app.js
 * 页面交互：
 *   · 三种模式：题库生成 / 自定义题目 / AI 出题
 *   · 每个图形一张卡片，卡片内自带参数滑块、读数、视角操作
 *   · 解题过程可选择显示、逐步展开
 * ============================================================ */
(function (global) {
  'use strict';
  var MV = global.MV;
  var Fmt = MV.Fmt;
  var $ = function (id) { return document.getElementById(id); };

  var state = {
    mode: 'gen',
    genId: null,
    problem: null,
    figures: [],
    showSteps: false,
    showAnswer: false,
    revealed: 0,
    totalSteps: 0,
    lastSteps: [],
    aiBusy: false
  };

  var rngSeed = (Date.now() ^ 0x9e3779b9) >>> 0;
  function newRng() {
    rngSeed = (rngSeed * 1664525 + 1013904223) >>> 0;
    return MV.G.rngFrom(rngSeed);
  }
  function esc(s) { return Fmt.esc(s); }
  function valsOf(params) {
    var o = {};
    params.forEach(function (p) { o[p.key] = p.value; });
    return o;
  }
  function cloneParams(ps) { return (ps || []).map(function (p) { return Object.assign({}, p); }); }
  function el(tag, cls, html) {
    var d = document.createElement(tag);
    if (cls) d.className = cls;
    if (html !== undefined) d.innerHTML = html;
    return d;
  }

  /* ==================== 题目卡 ==================== */
  function updateProblemCard(res) {
    if (!res) return;
    var html = '';
    if (res.quote) html += '<div class="user-quote">' + esc(res.quote) + '</div>';
    if (res.derived) html += '<div class="derived">' + esc(res.derived) + '</div>';
    if (res.statement) html += MV.MD.render(res.statement);
    if (state.problem && state.problem.notice && state.mode !== 'ai') {
      html += '<div class="notice">' + esc(state.problem.notice) + '</div>';
    }
    $('statement').innerHTML = html;
    $('probTitle').textContent = (state.problem && state.problem.title) || '题目';
    $('probTag').textContent = (state.problem && state.problem.tag) || '';

    var ans = $('answerBox');
    ans.innerHTML = res.answer ? MV.MD.render(res.answer) : '';
    ans.classList.toggle('hidden', !state.showAnswer || !res.answer);

    renderSteps(res.steps || []);
  }

  function renderSteps(steps) {
    state.lastSteps = steps;
    state.totalSteps = steps.length;
    var ol = $('steps');
    ol.innerHTML = '';
    steps.forEach(function (s, i) {
      var li = el('li', 'step' + (i >= state.revealed ? ' hidden-step' : ''));
      var h = el('span', 'step-title', Fmt.inline(s.title || ('第 ' + (i + 1) + ' 步')));
      var b = el('div', 'step-body', MV.MD.render(s.body || ''));
      li.appendChild(h); li.appendChild(b);
      ol.appendChild(li);
    });
    ol.classList.toggle('hidden', !state.showSteps);
    $('stepsCount').textContent = steps.length ? '共 ' + steps.length + ' 步' : '';
    var btn = $('stepsToggle');
    btn.textContent = state.showSteps ? '▾ 隐藏解题过程' : '▸ 显示解题过程';
    btn.classList.toggle('active', state.showSteps);
    $('chkSteps').checked = state.showSteps;
  }

  /* ==================== 图形卡片 ==================== */
  function clearFigures() {
    state.figures.forEach(function (f) {
      if (f.spinHandle) global.cancelAnimationFrame(f.spinHandle);
    });
    state.figures = [];
    $('figures').innerHTML = '';
    $('figEmpty').classList.add('hidden');
  }

  function addFigure(fig) {
    state.figures.push(fig);
    buildFigureDom(fig);
    updateFigure(fig, false);
  }

  function buildFigureDom(fig) {
    var card = el('div', 'figure-block');
    var head = el('div', 'fb-head');
    var n = state.figures.length;
    head.appendChild(el('span', 'fb-title', '<b>' + n + '</b> ' + esc(fig.title || '图形')));
    if (fig.origin) head.appendChild(el('span', 'fb-origin', esc(fig.origin)));
    var tools = el('span', 'fb-tools');
    var bReset = el('button', 'btn tiny', '重置视角');
    var bSpin = el('button', 'btn tiny', '自动旋转');
    var bPng = el('button', 'btn tiny', '导出 PNG');
    tools.appendChild(bReset); tools.appendChild(bSpin); tools.appendChild(bPng);
    head.appendChild(tools);
    card.appendChild(head);

    if (fig.source) {
      card.appendChild(el('div', 'fb-source', '关键式子：<code>' + esc(String(fig.source).slice(0, 160)) + '</code>'));
    }

    var wrap = el('div', 'canvas-wrap');
    var canvas = document.createElement('canvas');
    wrap.appendChild(canvas);
    var empty = el('div', 'fig-empty hidden', '暂无图形');
    wrap.appendChild(empty);
    card.appendChild(wrap);

    var paramsEl = el('div', 'params');
    card.appendChild(paramsEl);
    var readoutsEl = el('div', 'readouts');
    card.appendChild(readoutsEl);
    var noteEl = el('div', 'fb-note', fig.note ? esc(fig.note) : '');
    card.appendChild(noteEl);

    $('figures').appendChild(card);

    fig.el = card;
    fig.canvas = canvas;
    fig.paramsEl = paramsEl;
    fig.readoutsEl = readoutsEl;
    fig.noteEl = noteEl;
    fig.emptyEl = empty;
    fig.r2 = null; fig.r3 = null; fig.viewKind = null;

    renderFigureParams(fig);
    attachCanvas(fig);

    bReset.addEventListener('click', function () { resetView(fig); });
    bSpin.addEventListener('click', function () { toggleSpin(fig, bSpin); });
    bPng.addEventListener('click', function () { exportPng(fig); });
  }

  function renderFigureParams(fig) {
    fig.paramsEl.innerHTML = '';
    if (!fig.params || !fig.params.length) {
      fig.paramsEl.appendChild(el('p', 'hint', '这个图形没有可调参数。'));
      return;
    }
    fig.params.forEach(function (p) {
      var wrap = el('div', 'param');
      var head = el('div', 'ph');
      head.appendChild(el('span', 'pl', esc(p.label)));
      var val = el('span', 'pv', MV.G.fmt(fig.vals[p.key], 3) + (p.unit || ''));
      head.appendChild(val);
      var input = document.createElement('input');
      input.type = 'range';
      input.min = p.min; input.max = p.max; input.step = p.step; input.value = fig.vals[p.key];
      input.setAttribute('aria-label', p.label);
      input.addEventListener('input', function () {
        var v = parseFloat(input.value);
        fig.vals[p.key] = v;
        val.textContent = MV.G.fmt(v, 3) + (p.unit || '');
        updateFigure(fig, true);
      });
      wrap.appendChild(head); wrap.appendChild(input);
      fig.paramsEl.appendChild(wrap);
      p._input = input; p._valEl = val;
    });
  }

  function updateFigure(fig, keepView) {
    var res;
    try {
      res = fig.build(fig.vals);
    } catch (e) {
      fig.noteEl.textContent = '计算出错：' + (e.message || e);
      console.error(e);
      return;
    }
    if (res.scene) {
      fig.emptyEl.classList.add('hidden');
      drawScene(fig, res.scene, keepView);
    } else {
      fig.emptyEl.classList.remove('hidden');
    }
    renderReadoutsInto(fig.readoutsEl, res.readouts || []);
    if (global.__MV_DEBUG) {
      var t = fig.r2 && fig.r2.transform;
      fig.noteEl.textContent = (fig.note || '') + ' ［调试］画布 ' + fig.canvas.clientWidth + '×' + fig.canvas.clientHeight +
        (t ? '，sx=' + t.sx.toFixed(2) + ' sy=' + t.sy.toFixed(2) : '');
    }
    if (fig.updatesProblem) updateProblemCard(res);
  }

  function renderReadoutsInto(box, list) {
    box.innerHTML = '';
    list.forEach(function (r) {
      var d = el('div', 'readout');
      d.appendChild(el('div', 'rk', esc(r.label)));
      d.appendChild(el('div', 'rv', esc(r.value)));
      box.appendChild(d);
    });
  }

  function drawScene(fig, scene, keepView) {
    if (scene.kind === '3d') {
      if (!fig.r3) fig.r3 = MV.Render3D.create(fig.canvas);
      fig.viewKind = '3d';
      fig.r3.setScene(scene, !!keepView);
    } else {
      if (!fig.r2) fig.r2 = MV.Render2D.create(fig.canvas);
      fig.viewKind = '2d';
      fig.r2.setScene(scene, !!keepView);
    }
    fig.scene = scene;
  }

  function redraw(fig) {
    if (fig.viewKind === '3d' && fig.r3) fig.r3.render();
    else if (fig.r2) fig.r2.render();
  }

  function resetView(fig) {
    if (fig.viewKind === '3d' && fig.r3) {
      var v = (fig.scene && fig.scene.view) || {};
      fig.r3.view.yaw = v.yaw !== undefined ? v.yaw : -0.62;
      fig.r3.view.pitch = v.pitch !== undefined ? v.pitch : 0.34;
      fig.r3.view.zoom = 1; fig.r3.view.panX = 0; fig.r3.view.panY = 0;
    } else if (fig.r2) {
      fig.r2.view = { zoom: 1, panX: 0, panY: 0 };
    }
    redraw(fig);
  }

  function toggleSpin(fig, btn) {
    if (fig.viewKind !== '3d') return;
    fig.spinning = !fig.spinning;
    btn.classList.toggle('active', fig.spinning);
    if (fig.spinning) {
      (function loop() {
        if (!fig.spinning) return;
        if (fig.r3) { fig.r3.view.yaw += 0.012; fig.r3.render(); }
        fig.spinHandle = global.requestAnimationFrame(loop);
      })();
    } else if (fig.spinHandle) {
      global.cancelAnimationFrame(fig.spinHandle);
      fig.spinHandle = null;
    }
  }

  function exportPng(fig) {
    try {
      var a = document.createElement('a');
      a.href = fig.canvas.toDataURL('image/png');
      a.download = 'math-figure-' + Date.now() + '.png';
      a.click();
    } catch (e) { alert('导出失败：' + e.message); }
  }

  function attachCanvas(fig) {
    var dragging = false, lx = 0, ly = 0;
    fig.canvas.addEventListener('pointerdown', function (e) {
      dragging = true; lx = e.clientX; ly = e.clientY;
      fig.canvas.setPointerCapture(e.pointerId);
    });
    fig.canvas.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var dx = e.clientX - lx, dy = e.clientY - ly;
      lx = e.clientX; ly = e.clientY;
      if (fig.viewKind === '3d' && fig.r3) {
        fig.r3.view.yaw -= dx * 0.009;
        fig.r3.view.pitch = MV.G.clamp(fig.r3.view.pitch + dy * 0.008, -1.45, 1.45);
      } else if (fig.r2) {
        fig.r2.view.panX += dx; fig.r2.view.panY += dy;
      }
      redraw(fig);
    });
    function up(e) {
      dragging = false;
      try { fig.canvas.releasePointerCapture(e.pointerId); } catch (err) { }
    }
    fig.canvas.addEventListener('pointerup', up);
    fig.canvas.addEventListener('pointercancel', up);
    fig.canvas.addEventListener('wheel', function (e) {
      e.preventDefault();
      var k = Math.exp(-e.deltaY * 0.0012);
      if (fig.viewKind === '3d' && fig.r3) fig.r3.view.zoom = MV.G.clamp(fig.r3.view.zoom * k, 0.25, 5);
      else if (fig.r2) fig.r2.view.zoom = MV.G.clamp(fig.r2.view.zoom * k, 0.25, 6);
      redraw(fig);
    }, { passive: false });
    fig.canvas.addEventListener('dblclick', function () { resetView(fig); });
  }

  /* ============ 自定义题目 → 让 AI 解题 ============ */
  function customText() {
    return ($('customInput').value || '').trim();
  }
  function copySolvePrompt(showPaste) {
    var text = customText();
    var msg = $('parseMsg');
    if (!text) { msg.className = 'parse-msg error'; msg.textContent = '请先把题目粘到上面的框里。'; return; }
    if (showPaste) $('aiSolvePasteWrap').classList.remove('hidden');
    var full = MV.AIClient.buildFullSolvePrompt(text);
    function done(okFlag) {
      msg.className = 'parse-msg' + (okFlag ? '' : ' error');
      msg.innerHTML = okFlag
        ? '✅ 已复制「<b>解题提示词</b>」（里面已经包含你刚输入的题目）。<br>' +
          '把它贴到任意 AI（DeepSeek / ChatGPT / Kimi 网页版）→ 再把 AI 的完整回答粘到下面的框里 → 点「🔍 解析并自动作图」。'
        : '复制失败，请手动复制下面的提示词：<textarea class="textarea" rows="6">' + esc(full) + '</textarea>';
    }
    if (global.navigator && global.navigator.clipboard) {
      global.navigator.clipboard.writeText(full).then(function () { done(true); }, function () { done(false); });
    } else done(false);
  }

  function aiSolveCustom() {
    var text = customText();
    var msg = $('parseMsg');
    if (!text) { msg.className = 'parse-msg error'; msg.textContent = '请先把题目粘到上面的框里。'; return; }
    var s = MV.AIClient.loadSettings();
    if (!s.apiKey && !/localhost|127\.0\.0\.1/.test(s.baseUrl)) {
      // 没配密钥 → 走免密钥：复制解题提示词 + 打开粘贴框
      copySolvePrompt(true);
      return;
    }
    if (state.aiBusy) return;
    state.aiBusy = true;
    var btn = $('aiSolveBtn'), old = btn.textContent;
    btn.disabled = true;
    btn.textContent = '⏳ AI 正在解题…';
    msg.className = 'parse-msg';
    msg.textContent = '正在把题目发给 ' + s.baseUrl + ' …';
    MV.AIClient.callAI({ mode: 'solve', problem: text, settings: s })
      .then(function (r) {
        $('aiSolvePasteBox').value = r.text;
        msg.textContent = 'AI 已返回解答，正在提取关键式子并作图…';
        loadAIAnswer(r.text, {
          keepPane: true, originalText: text, title: 'AI 解题',
          statusEl: 'parseMsg'
        });
      })
      .catch(function (e) {
        msg.className = 'parse-msg error';
        msg.textContent = '❌ ' + (e.message || String(e)) + '（也可以点「📋 复制解题提示词」走免密钥方式）';
      })
      .then(function () {
        state.aiBusy = false;
        btn.disabled = false;
        btn.textContent = old;
      });
  }

  /* ==================== 三种模式的载入 ==================== */
  function loadGen(id) {
    var gen = MV.Generators.byId[id];
    if (!gen) return;
    state.mode = 'gen';
    state.genId = id;
    var params = cloneParams(gen.make(newRng()));
    state.problem = {
      title: gen.name,
      tag: gen.category,
      notice: gen.hint ? '提示：' + gen.hint + '。拖动图形下方的滑块，题干、图形与解题过程会同时更新。' : '',
      params: params,
      build: gen.build
    };
    clearFigures();
    addFigure({
      title: gen.name,
      origin: '题库生成',
      params: params,
      vals: valsOf(params),
      build: gen.build,
      updatesProblem: true
    });
    state.revealed = 0;
    markActiveGen();
    setMode('gen');
  }

  function loadCustom(text) {
    var prob = MV.CustomParser.parse(text);
    var msg = $('parseMsg');
    if (!prob.ok) {
      msg.className = 'parse-msg error';
      msg.textContent = prob.message;
      return false;
    }
    msg.className = 'parse-msg';
    msg.textContent = prob.notice || '识别成功。';
    state.mode = 'custom';
    var params = cloneParams(prob.params);
    state.problem = {
      title: prob.title,
      tag: '自定义',
      notice: prob.notice || '',
      params: params,
      build: prob.build
    };
    clearFigures();
    addFigure({
      title: prob.title,
      origin: '自定义题目',
      params: params,
      vals: valsOf(params),
      build: prob.build,
      updatesProblem: true
    });
    state.revealed = 0;
    return true;
  }

  /* 把 AI 返回的解答变成题目 + 若干可调图形
   * opts: { title, keepPane, originalText, statusEl } */
  function loadAIAnswer(text, opts) {
    opts = opts || {};
    var res = MV.AIExtract.parse(text, { maxFigures: opts.maxFigures || 6 });
    var status = $(opts.statusEl || 'aiStatus');
    if (!res.ok || (!res.statement && !res.steps.length)) {
      status.className = 'parse-msg error';
      status.textContent = res.message || '没能从这段内容里解析出题目。';
      return false;
    }
    if (!opts.keepPane) state.mode = 'ai';
    state.problem = {
      title: opts.title || 'AI 生成题目',
      tag: opts.originalText ? 'AI 解题' : 'AI 出题',
      notice: '',
      params: [],
      build: null
    };
    clearFigures();
    updateProblemCard({
      quote: opts.originalText || '',
      statement: res.statement,
      steps: res.steps,
      answer: res.answer
    });
    state.revealed = state.showSteps ? res.steps.length : 0;
    renderSteps(res.steps);

    if (!res.figures.length) {
      $('figEmpty').classList.remove('hidden');
      $('figEmpty').textContent = '这道题里没有找到可以自动作图的式子（例如纯代数、数列、概率题）。';
    }
    res.figures.forEach(function (f) {
      addFigure({
        title: f.title,
        origin: f.origin,
        source: f.source,
        note: f.note,
        params: f.params,
        vals: valsOf(f.params),
        build: f.build,
        updatesProblem: false
      });
    });
    status.className = 'parse-msg';
    status.innerHTML = '✅ 已解析：题目 1 道、步骤 ' + res.steps.length + ' 步、可调图形 <b>' + res.figures.length +
      '</b> 个。<br><span class="muted">' + esc(res.log.join('；')) + '</span>';
    if (!opts.keepPane) setMode('ai');
    return true;
  }

  function setMode(mode) {
    state.mode = mode;
    var tabs = { gen: 'gen', custom: 'custom', ai: 'ai' };
    document.querySelectorAll('.tab').forEach(function (t) {
      t.classList.toggle('active', t.dataset.mode === tabs[mode]);
    });
    $('paneGen').classList.toggle('hidden', mode !== 'gen');
    $('paneCustom').classList.toggle('hidden', mode !== 'custom');
    $('paneAI').classList.toggle('hidden', mode !== 'ai');
  }

  /* ==================== 生成器列表 ==================== */
  function buildCategories() {
    var sel = $('catSel');
    sel.innerHTML = '';
    MV.Generators.categories.forEach(function (c) {
      var o = document.createElement('option');
      o.value = c; o.textContent = c;
      sel.appendChild(o);
    });
    sel.addEventListener('change', function () {
      renderGenList(sel.value);
      var first = MV.Generators.inCategory(sel.value)[0];
      if (first) loadGen(first.id);
    });
  }

  function renderGenList(cat) {
    cat = cat || $('catSel').value || MV.Generators.categories[0];
    var box = $('genList');
    box.innerHTML = '';
    MV.Generators.inCategory(cat).forEach(function (g) {
      var b = el('button', 'gen-item' + (g.id === state.genId ? ' active' : ''));
      b.dataset.id = g.id;
      b.innerHTML = '<span class="name">' + esc(g.name) + '</span>' +
        (g.hint ? '<span class="hint">' + esc(g.hint) + '</span>' : '');
      b.addEventListener('click', function () { loadGen(g.id); });
      box.appendChild(b);
    });
  }

  function markActiveGen() {
    document.querySelectorAll('.gen-item').forEach(function (it) {
      it.classList.toggle('active', it.dataset.id === state.genId);
    });
    var gen = MV.Generators.byId[state.genId];
    if (gen) $('catSel').value = gen.category;
  }

  /* ==================== AI 面板 ==================== */
  function aiSettingsToForm() {
    var s = MV.AIClient.loadSettings();
    $('aiPreset').innerHTML = '';
    MV.AIClient.PRESETS.forEach(function (p) {
      var o = document.createElement('option');
      o.value = p.id; o.textContent = p.name;
      $('aiPreset').appendChild(o);
    });
    $('aiPreset').value = s.preset || 'deepseek';
    $('aiBase').value = s.baseUrl || '';
    $('aiModel').value = s.model || '';
    $('aiKey').value = s.apiKey || '';
  }

  function aiReadSettings() {
    var id = $('aiPreset').value;
    var preset = MV.AIClient.PRESETS.filter(function (p) { return p.id === id; })[0];
    var s = {
      preset: id,
      baseUrl: ($('aiBase').value || '').trim() || (preset ? preset.baseUrl : ''),
      model: ($('aiModel').value || '').trim() || (preset ? preset.model : ''),
      apiKey: $('aiKey').value.trim(),
      temperature: 0.6
    };
    MV.AIClient.saveSettings(s);
    return s;
  }

  function aiStatus(msg, isError) {
    var s = $('aiStatus');
    s.className = 'parse-msg' + (isError ? ' error' : '');
    s.innerHTML = msg;
  }

  function aiGenerate() {
    if (state.aiBusy) return;
    var s = aiReadSettings();
    if (!s.apiKey && !/localhost|127\.0\.0\.1/.test(s.baseUrl)) {
      aiStatus('请先在下方「AI 接口设置」里填入 API 密钥；或者点「📋 复制提示词」，把提示词贴到任意 AI 里，' +
        '再把它的回答用「📥 粘贴 AI 回答」贴回来（这种方式不需要密钥）。', true);
      $('aiSettings').open = true;
      return;
    }
    state.aiBusy = true;
    $('aiGenBtn').disabled = true;
    $('aiGenBtn').textContent = '⏳ 正在让 AI 出题…';
    aiStatus('正在请求 ' + s.baseUrl + ' …');
    MV.AIClient.callAI({
      topic: $('aiTopic').value,
      difficulty: $('aiDiff').value,
      extra: $('aiExtra').value,
      settings: s
    }).then(function (r) {
      $('aiPasteBox').value = r.text;
      loadAIAnswer(r.text, { title: 'AI 出题：' + ($('aiTopic').value || '数学') });
    }).catch(function (e) {
      aiStatus('❌ ' + esc(e.message || String(e)), true);
    }).then(function () {
      state.aiBusy = false;
      $('aiGenBtn').disabled = false;
      $('aiGenBtn').textContent = '⚡ 用 AI 生成题目';
    });
  }

  function copyPrompt() {
    var text = MV.AIClient.buildFullPrompt({
      topic: $('aiTopic').value,
      difficulty: $('aiDiff').value,
      extra: $('aiExtra').value
    });
    function done(okFlag) {
      aiStatus(okFlag
        ? '提示词已复制。把它粘贴到任意 AI（DeepSeek / ChatGPT / Kimi / 通义 …），再把 AI 的完整回答用下面的「📥 粘贴 AI 回答」贴回来即可自动出图。'
        : '复制失败，请手动复制下面的提示词：<textarea class="textarea" rows="6">' + esc(text) + '</textarea>');
      $('aiPasteWrap').classList.remove('hidden');
    }
    if (global.navigator && global.navigator.clipboard) {
      global.navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(false); });
    } else done(false);
  }

  /* ==================== 事件 ==================== */
  function bindEvents() {
    document.querySelectorAll('.tab').forEach(function (t) {
      t.addEventListener('click', function () { setMode(t.dataset.mode); });
    });

    $('rerollBtn').addEventListener('click', function () {
      if (state.genId) loadGen(state.genId);
    });

    $('chkSteps').addEventListener('change', function () {
      state.showSteps = $('chkSteps').checked;
      if (state.showSteps && state.revealed === 0) state.revealed = state.totalSteps;
      renderSteps(state.lastSteps);
    });
    $('stepsToggle').addEventListener('click', function () {
      state.showSteps = !state.showSteps;
      if (state.showSteps && state.revealed === 0) state.revealed = state.totalSteps;
      renderSteps(state.lastSteps);
    });
    $('revealBtn').addEventListener('click', function () {
      state.showSteps = true;
      state.revealed = Math.min(Math.max(state.revealed, 0) + 1, state.totalSteps) || 1;
      renderSteps(state.lastSteps);
    });
    $('revealAll').addEventListener('click', function () {
      state.showSteps = true;
      state.revealed = state.totalSteps;
      renderSteps(state.lastSteps);
    });
    $('revealNone').addEventListener('click', function () {
      state.showSteps = false;
      state.revealed = 0;
      renderSteps(state.lastSteps);
    });
    $('chkAnswer').addEventListener('change', function () {
      state.showAnswer = $('chkAnswer').checked;
      $('answerBox').classList.toggle('hidden', !state.showAnswer);
    });

    $('parseBtn').addEventListener('click', function () {
      var t = $('customInput').value;
      if (!t.trim()) { $('parseMsg').className = 'parse-msg error'; $('parseMsg').textContent = '请先输入题目内容。'; return; }
      loadCustom(t);
    });
    $('aiSolveBtn').addEventListener('click', aiSolveCustom);
    $('aiSolveCopy').addEventListener('click', function () { copySolvePrompt(true); });
    $('aiSolvePaste').addEventListener('click', function () {
      $('aiSolvePasteWrap').classList.toggle('hidden');
    });
    $('aiSolveParse').addEventListener('click', function () {
      var t = $('aiSolvePasteBox').value;
      if (!t.trim()) { $('parseMsg').className = 'parse-msg error'; $('parseMsg').textContent = '请先把 AI 的解答粘贴进来。'; return; }
      loadAIAnswer(t, {
        keepPane: true, originalText: customText(), title: 'AI 解题', statusEl: 'parseMsg'
      });
    });
    document.querySelectorAll('.chip').forEach(function (c) {
      c.addEventListener('click', function () {
        $('customInput').value = c.dataset.ex;
        loadCustom(c.dataset.ex);
      });
    });

    // AI 面板
    document.querySelectorAll('.ai-chip').forEach(function (c) {
      c.addEventListener('click', function () { $('aiTopic').value = c.dataset.topic; });
    });
    $('aiGenBtn').addEventListener('click', aiGenerate);
    $('aiCopyBtn').addEventListener('click', copyPrompt);
    $('aiPasteToggle').addEventListener('click', function () {
      $('aiPasteWrap').classList.toggle('hidden');
    });
    $('aiParseBtn').addEventListener('click', function () {
      var t = $('aiPasteBox').value;
      if (!t.trim()) { aiStatus('请先把 AI 的回答粘贴进来。', true); return; }
      loadAIAnswer(t, { title: 'AI 出题：' + ($('aiTopic').value || '粘贴内容') });
    });
    $('aiDemoBtn').addEventListener('click', function () {
      var keys = Object.keys(MV.AISamples.all);
      var k = keys[Math.floor(Math.random() * keys.length)];
      $('aiPasteBox').value = MV.AISamples.all[k];
      $('aiPasteWrap').classList.remove('hidden');
      loadAIAnswer(MV.AISamples.all[k], { title: '示例：' + MV.AISamples.names[k] });
    });
    $('aiPreset').addEventListener('change', function () {
      var p = MV.AIClient.PRESETS.filter(function (x) { return x.id === $('aiPreset').value; })[0];
      if (p) { $('aiBase').value = p.baseUrl; $('aiModel').value = p.model; }
    });
    $('aiSave').addEventListener('click', function () {
      aiReadSettings();
      aiStatus('设置已保存在本机浏览器里。');
    });

    global.addEventListener('resize', function () {
      setTimeout(function () { state.figures.forEach(redraw); }, 60);
    });
  }

  /* ==================== URL 参数 ==================== */
  function parseQuery() {
    var q = {};
    String(global.location.search || '').replace(/^\?/, '').split('&').forEach(function (kv) {
      if (!kv) return;
      var i = kv.indexOf('=');
      var k = i < 0 ? kv : kv.slice(0, i);
      var v = i < 0 ? '' : decodeURIComponent(kv.slice(i + 1).replace(/\+/g, ' '));
      q[k] = v;
    });
    return q;
  }

  function handleUrl() {
    var q = parseQuery();
    if (q.seed) rngSeed = (parseInt(q.seed, 10) || 1) >>> 0;
    if (q.dbg === '1') global.__MV_DEBUG = true;
    if (q.steps === '1') { state.showSteps = true; $('chkSteps').checked = true; }
    if (q.answer === '1') { state.showAnswer = true; $('chkAnswer').checked = true; }

    if (q.aiDemo && MV.AISamples.all[q.aiDemo]) {
      setMode('ai');
      $('aiPasteBox').value = MV.AISamples.all[q.aiDemo];
      loadAIAnswer(MV.AISamples.all[q.aiDemo], { title: '示例：' + MV.AISamples.names[q.aiDemo] });
    } else if (q.solve) {
      // 分享/验证用：?solve=<AI 的解答>&orig=<自己输入的题目>
      setMode('custom');
      if (q.orig) $('customInput').value = q.orig;
      $('aiSolvePasteBox').value = q.solve;
      $('aiSolvePasteWrap').classList.remove('hidden');
      loadAIAnswer(q.solve, {
        keepPane: true, originalText: q.orig || '', title: 'AI 解题', statusEl: 'parseMsg'
      });
    } else if (q.ai) {
      setMode('ai');
      $('aiPasteBox').value = q.ai;
      loadAIAnswer(q.ai, { title: 'AI 出题：粘贴内容' });
    } else if (q.gen && MV.Generators.byId[q.gen]) {
      loadGen(q.gen);
    } else if (q.q) {
      setMode('custom');
      $('customInput').value = q.q;
      loadCustom(q.q);
    } else {
      // 默认首页：直接演示"AI 出题 → 自动提取关键式子作图"的完整流程
      var demoKey = 'triangle';
      setMode('ai');
      $('aiPasteBox').value = MV.AISamples.all[demoKey];
      $('aiTopic').value = MV.AISamples.names[demoKey];
      loadAIAnswer(MV.AISamples.all[demoKey], { title: '示例：' + MV.AISamples.names[demoKey] });
      var st = $('aiStatus');
      st.className = 'parse-msg';
      st.innerHTML = '上面这道题是<b>示例</b>（相当于把 AI 的回答粘了进来）。填好下方接口设置后，点「⚡ 用 AI 生成题目并作图」' +
        '就能让 AI 现场出一道全新的题；没有密钥的话，用「📋 复制提示词」+「📥 粘贴 AI 回答」也一样。';
    }

    if (state.mode !== 'ai' && q.params && state.figures[0]) {
      var fig = state.figures[0];
      q.params.split(',').forEach(function (pair) {
        var kv = pair.split(':');
        if (kv.length === 2 && fig.vals[kv[0]] !== undefined) {
          fig.vals[kv[0]] = parseFloat(kv[1]);
          var p = fig.params.filter(function (x) { return x.key === kv[0]; })[0];
          if (p && p._input) { p._input.value = fig.vals[kv[0]]; p._valEl.textContent = MV.G.fmt(fig.vals[kv[0]], 3) + (p.unit || ''); }
        }
      });
      updateFigure(fig, true);
    }
    if (state.showSteps && state.revealed === 0) {
      state.revealed = state.totalSteps;
      renderSteps(state.lastSteps);
    }
    if (q.aiTopic) $('aiTopic').value = q.aiTopic;
  }

  /* ==================== 启动 ==================== */
  function boot() {
    buildCategories();
    renderGenList(MV.Generators.categories[0]);
    aiSettingsToForm();
    bindEvents();
    handleUrl();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  MV.App = {
    state: state,
    loadGen: loadGen,
    loadCustom: loadCustom,
    loadAIAnswer: loadAIAnswer,
    setMode: setMode
  };
})(typeof window !== 'undefined' ? window : globalThis);
