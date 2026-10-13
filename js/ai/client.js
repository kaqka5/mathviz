/* ============================================================
 * mathviz/js/ai/client.js
 * AI 出题客户端：
 *   · 提示词模板（要求 AI 输出结构化解答 + 关键式子清单）
 *   · OpenAI 兼容接口调用（DeepSeek / OpenAI / 通义 / 月之暗面 / Ollama …）
 *   · 免密钥方案：复制提示词 → 到任意 AI 里问 → 把回答粘回来
 * 密钥只存在浏览器 localStorage，直接发给所选服务商，不经过任何中间服务器。
 * ============================================================ */
(function (global) {
  'use strict';
  var MV = (global.MV = global.MV || {});

  var STORE_KEY = 'mathviz.ai.settings';

  var PRESETS = [
    { id: 'deepseek', name: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-flash' },
    { id: 'openai', name: 'OpenAI', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
    { id: 'moonshot', name: '月之暗面 Kimi', baseUrl: 'https://api.moonshot.cn/v1', model: 'moonshot-v1-8k' },
    { id: 'dashscope', name: '阿里通义千问', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-plus' },
    { id: 'zhipu', name: '智谱 GLM', baseUrl: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-4-flash' },
    { id: 'siliconflow', name: '硅基流动', baseUrl: 'https://api.siliconflow.cn/v1', model: 'deepseek-ai/DeepSeek-V3' },
    { id: 'ollama', name: '本地 Ollama', baseUrl: 'http://localhost:11434/v1', model: 'qwen2.5:7b' },
    { id: 'custom', name: '自定义（OpenAI 兼容）', baseUrl: '', model: '' }
  ];

  var SYSTEM_PROMPT = [
    '你是一位经验丰富的数学老师。请根据用户的要求出一道数学题，并给出完整、严谨、分步的解答。',
    '',
    '【输出格式】严格遵守下面的 Markdown 结构：',
    '',
    '### 题目',
    '（题干。公式用 $...$ 包裹；几何题必须写清图形名称与每个已知量）',
    '',
    '### 解答',
    '#### 第 1 步：这一步要做什么',
    '（说明文字。关键公式单独成行，用 $$...$$ 包裹）',
    '#### 第 2 步：……',
    '……',
    '',
    '### 答案',
    '（最终结果）',
    '',
    '```figures',
    '[{"title": "图名", "text": "可直接作图的式子或条件"}]',
    '```',
    '',
    '【硬性要求】',
    '1. 所有数学式子必须写成 LaTeX 并用 $ 或 $$ 包裹，不要用中文括号或纯文字代替公式。',
    '2. 解析式必须写成标准形式：函数写成 y=… 或 f(x)=…；圆写成 x^2+y^2=… 或 (x-a)^2+(y-b)^2=r^2；直线写成 y=kx+b。',
    '3. 几何题要在题目里写清楚图形名称和每个已知量，例如“正方体 ABCD-A_1B_1C_1D_1 的棱长为 2”“在△ABC中，AB=5，AC=7，∠A=60°”“圆锥底面半径为 3，高为 4”。这些条件会被自动用来画图。',
    '4. 每题最多 6 个步骤，每步只解决一个要点，步骤标题写清"做什么"。',
    '5. 数值结果保留 4 位小数；根式、分数能化简就化简（如 \\sqrt{39}、\\frac{1}{2}、2\\pi）。',
    '6. 最后的 ```figures 代码块是给作图程序读的，必须是合法 JSON 数组，元素的 text 字段要写成"能直接画出来"的形式：',
    '   - 函数：{"title":"函数图像","text":"y=x^3-3x^2+2"}',
    '   - 极坐标：{"title":"玫瑰线","text":"r=3cos(3theta)"}',
    '   - 圆与直线：{"title":"直线与圆","text":"圆 x^2+y^2=25 与直线 y=2x+1"}',
    '   - 三角形：{"title":"三角形","text":"在△ABC中，AB=5，AC=7，∠A=60°"}',
    '   - 立体图形：{"title":"圆锥","text":"圆锥底面半径3，高4"}',
    '   只列真正需要画图的关键式子（最多 4 条）；如果这道题不需要画图，就完全不要输出这个代码块。'
  ].join('\n');

  /* 让 AI「解用户给的题」用的提示词（与出题模式不同：不许改题） */
  var SOLVE_SYSTEM_PROMPT = [
    '你是一位经验丰富的数学老师。用户会给你一道题目，请你**解这道题**——不要改题目、不要换数字、不要另出一道题。',
    '',
    '【输出格式】严格遵守下面的 Markdown 结构：',
    '',
    '### 题目',
    '（把用户给的题目规范地重述一遍，公式用 $...$；几何题写清图形名称与每个已知量）',
    '',
    '### 解答',
    '#### 第 1 步：这一步要做什么',
    '（说明文字。关键公式单独成行，用 $$...$$ 包裹）',
    '#### 第 2 步：……',
    '……',
    '',
    '### 答案',
    '（最终结果）',
    '',
    '```figures',
    '[{"title": "图名", "text": "可直接作图的条件或式子"}]',
    '```',
    '',
    '【硬性要求】',
    '1. 所有数学式子必须写成 LaTeX 并用 $ 或 $$ 包裹，不要用中文括号或纯文字代替公式。',
    '2. 解析式写成标准形式：函数 y=… 或 f(x)=…；圆 x^2+y^2=… 或 (x-a)^2+(y-b)^2=r^2；直线 y=kx+b。',
    '3. 如果题目涉及几何图形，重述题目时必须写清图形名称和所有已知量，例如“正方体 ABCD-A_1B_1C_1D_1 的棱长为 2”“在△ABC中，AB=5，AC=7，∠A=60°”“区域 D={(x,y)||x|+|y|≤1}”。这些条件会被自动用来画图。',
    '4. 如果用户给的题目文字不完整或有笔误，按最合理的理解补全，并在第 1 步里说明你的理解。',
    '5. 最多 8 个步骤，每步只解决一个要点，标题写清“做什么”；数值结果保留 4 位小数，根式与分数能化简就化简。',
    '6. 最后的 ```figures 代码块是给作图程序读的，必须是合法 JSON 数组，元素的 text 要写成“能直接画出来”的形式：',
    '   - 函数：{"title":"函数图像","text":"y=x^3-3x^2+2"}',
    '   - 圆与直线：{"title":"直线与圆","text":"圆 x^2+y^2=25 与直线 y=2x+1"}',
    '   - 三角形：{"title":"三角形","text":"在△ABC中，AB=5，AC=7，∠A=60°"}',
    '   - 立体图形：{"title":"圆锥","text":"圆锥底面半径3，高4"}',
    '   - 积分区域：{"title":"积分区域","text":"D={(x,y)||x|+|y|≤1}"}',
    '   只列真正需要画图的关键式子（最多 4 条）；如果这道题不需要画图，就完全不要输出这个代码块。'
  ].join('\n');

  /* ---------------- 设置读写 ---------------- */
  function loadSettings() {
    // 默认不发送 temperature：部分模型（推理类）不接受该参数，模型自带采样已足够随机
    var s = { preset: 'deepseek', baseUrl: PRESETS[0].baseUrl, model: PRESETS[0].model, apiKey: '' };
    try {
      var raw = global.localStorage && global.localStorage.getItem(STORE_KEY);
      if (raw) s = Object.assign(s, JSON.parse(raw));
    } catch (e) { }
    return s;
  }
  function saveSettings(s) {
    try {
      if (global.localStorage) global.localStorage.setItem(STORE_KEY, JSON.stringify(s));
      return true;
    } catch (e) { return false; }
  }

  /* ---------------- 提示词 ---------------- */
  function buildPrompt(opts) {
    opts = opts || {};
    var topic = (opts.topic || '任意中学数学知识点').trim();
    var diff = opts.difficulty || '中等';
    var extra = (opts.extra || '').trim();
    var lines = [];
    lines.push('请出一道数学题，知识点：' + topic + '。难度：' + diff + '。');
    if (opts.language === 'en') lines.push('Please answer in English.');
    if (extra) lines.push('额外要求：' + extra);
    lines.push('题目要有具体数值（不要全是字母），并且适合用图形来理解。');
    return lines.join('\n');
  }

  function buildFullPrompt(opts) {
    return SYSTEM_PROMPT + '\n\n=====================\n\n' + buildPrompt(opts);
  }

  /* 解题模式：把用户给的题目原文交给 AI */
  function buildSolvePrompt(problemText) {
    var t = String(problemText == null ? '' : problemText).trim();
    return '请解下面这道题（保持题目不变，给出完整的分步解答）：\n\n' +
      '—————— 题目开始 ——————\n' + t + '\n—————— 题目结束 ——————';
  }
  function buildFullSolvePrompt(problemText) {
    return SOLVE_SYSTEM_PROMPT + '\n\n=====================\n\n' + buildSolvePrompt(problemText);
  }

  /* ---------------- 调用（OpenAI 兼容） ---------------- */
  function chatUrl(baseUrl) {
    var b = String(baseUrl || '').trim().replace(/\/+$/, '');
    if (!b) return '';
    if (/\/chat\/completions$/.test(b)) return b;
    return b + '/chat/completions';
  }

  function callAI(opts) {
    var s = opts.settings || loadSettings();
    var url = chatUrl(s.baseUrl);
    if (!url) return Promise.reject(new Error('还没有填写 API 地址。'));
    if (!s.apiKey && !/localhost|127\.0\.0\.1/.test(s.baseUrl)) {
      return Promise.reject(new Error('还没有填写 API 密钥。'));
    }
    var model = s.model || 'deepseek-chat';
    var solving = opts.mode === 'solve';
    if (solving && !String(opts.problem || '').trim()) {
      return Promise.reject(new Error('还没有输入要解的题目。'));
    }
    var body = {
      model: model,
      messages: [
        { role: 'system', content: solving ? SOLVE_SYSTEM_PROMPT : SYSTEM_PROMPT },
        { role: 'user', content: solving ? buildSolvePrompt(opts.problem) : buildPrompt(opts) }
      ]
    };
    // temperature 只在明确设置时才发送（推理类模型不接受该参数）
    if (typeof s.temperature === 'number' && !/reasoner|reasoning|thinking|o1|o3|r1/i.test(model)) {
      body.temperature = s.temperature;
    }
    var headers = { 'Content-Type': 'application/json' };
    if (s.apiKey) headers.Authorization = 'Bearer ' + s.apiKey;

    var f = opts.fetch || global.fetch;
    if (!f) return Promise.reject(new Error('当前浏览器不支持 fetch。'));

    return f(url, { method: 'POST', headers: headers, body: JSON.stringify(body) })
      .then(function (res) {
        return res.text().then(function (text) {
          if (!res.ok) {
            var msg = 'HTTP ' + res.status;
            try {
              var j = JSON.parse(text);
              if (j && j.error && (j.error.message || j.error.code)) msg += '：' + (j.error.message || j.error.code);
            } catch (e) { msg += '：' + String(text).slice(0, 200); }
            if (res.status === 401) msg += '（密钥无效或权限不足）';
            if (res.status === 404) msg += '（接口地址或模型名不对）';
            throw new Error(msg);
          }
          var data;
          try { data = JSON.parse(text); } catch (e) { throw new Error('返回内容不是合法 JSON。'); }
          var content = pickContent(data);
          if (!content) throw new Error('没有从返回结果里读到文本内容。');
          return { text: content, raw: data };
        });
      })
      .catch(function (err) {
        if (err && /Failed to fetch|NetworkError|load failed/i.test(err.message || '')) {
          throw new Error('无法连接该接口（可能是网络问题，或该服务不允许浏览器直接调用 / CORS 限制）。' +
            '可以改用"复制提示词 → 粘贴 AI 回答"的方式，同样能出图。');
        }
        throw err;
      });
  }

  function pickContent(data) {
    try {
      var ch = data.choices && data.choices[0];
      if (!ch) return '';
      if (ch.message) {
        if (typeof ch.message.content === 'string' && ch.message.content.trim()) return ch.message.content;
        if (Array.isArray(ch.message.content)) {
          var joined = ch.message.content.map(function (p) { return p.text || ''; }).join('');
          if (joined.trim()) return joined;
        }
        // 推理模型：正文在 reasoning_content 里时兜底取用
        if (typeof ch.message.reasoning_content === 'string' && ch.message.reasoning_content.trim()) {
          return ch.message.reasoning_content;
        }
      }
      if (typeof ch.text === 'string') return ch.text;
      if (data.output && data.output.text) return data.output.text;
    } catch (e) { }
    return '';
  }

  MV.AIClient = {
    PRESETS: PRESETS,
    SYSTEM_PROMPT: SYSTEM_PROMPT,
    SOLVE_SYSTEM_PROMPT: SOLVE_SYSTEM_PROMPT,
    loadSettings: loadSettings,
    saveSettings: saveSettings,
    buildPrompt: buildPrompt,
    buildFullPrompt: buildFullPrompt,
    buildSolvePrompt: buildSolvePrompt,
    buildFullSolvePrompt: buildFullSolvePrompt,
    chatUrl: chatUrl,
    callAI: callAI,
    pickContent: pickContent
  };
})(typeof window !== 'undefined' ? window : globalThis);
