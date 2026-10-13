/* ============================================================
 * mathviz/js/ai/extract.js
 * 把 AI 返回的解答（Markdown + LaTeX）解析成
 *   { 题目, 分步过程, 答案, figures:[可实时调节的图形] }
 * 关键思路：先在解答里定位"重要式子/几何条件"，
 * 再把它们还原成一句规范题目，交给已有的 MV.CustomParser 生成图形与滑块。
 * ============================================================ */
(function (global) {
  'use strict';
  var MV = (global.MV = global.MV || {});
  var L = MV.Latex;

  var CN_NUM = { '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9, '十': 10 };

  function cloneParams(ps) {
    return (ps || []).map(function (p) { return Object.assign({}, p); });
  }
  function valsOf(ps) {
    var o = {};
    (ps || []).forEach(function (p) { o[p.key] = p.value; });
    return o;
  }

  /* ---------------- 1. 切分：题目 / 解答 / 答案 ---------------- */
  function headingKind(line) {
    var m = line.match(/^\s*#{1,6}\s*(.+?)\s*$/) || line.match(/^\s*\*\*(.+?)\*\*\s*[:：]?\s*$/);
    if (!m) return null;
    var t = m[1].replace(/[:：]\s*$/, '');
    if (/答案|结论|最终结果|结果/.test(t)) return { kind: 'answer', title: t };
    if (/题目|问题|题干|已知条件/.test(t)) return { kind: 'statement', title: t };
    if (/解答|解析|解题|过程|步骤|证明|分析/.test(t)) return { kind: 'solution', title: t };
    return { kind: 'sub', title: t };
  }

  function splitSections(text) {
    var lines = String(text || '').split('\n');
    var buf = { statement: [], solution: [], answer: [] };
    var cur = 'statement';
    lines.forEach(function (line) {
      var h = headingKind(line);
      if (h) {
        if (h.kind === 'statement' || h.kind === 'answer' || h.kind === 'solution') cur = h.kind;
        else { buf[cur].push('#### ' + h.title); }
        return;
      }
      buf[cur].push(line);
    });
    return {
      statement: buf.statement.join('\n').trim(),
      solution: buf.solution.join('\n').trim(),
      answer: buf.answer.join('\n').trim()
    };
  }

  /* ---------------- 2. 把解答切成若干步 ---------------- */
  function stepTitleOf(line) {
    var m;
    if ((m = line.match(/^\s*#{1,6}\s*(.+?)\s*$/))) return m[1].replace(/[:：]\s*$/, '');
    if ((m = line.match(/^\s*\*\*(.+?)\*\*\s*[:：]?\s*$/))) return m[1];
    if ((m = line.match(/^\s*第\s*([0-9]+|[一二三四五六七八九十]+)\s*步\s*[:：、.]?\s*(.*)$/))) {
      var n = /[0-9]/.test(m[1]) ? m[1] : (CN_NUM[m[1]] || m[1]);
      return '第 ' + n + ' 步' + (m[2] ? '：' + m[2] : '');
    }
    if ((m = line.match(/^\s*(\d+)[.)、]\s*(.*)$/))) return '第 ' + m[1] + ' 步：' + (m[2] || '');
    if ((m = line.match(/^\s*步骤\s*([0-9]+)\s*[:：、.]?\s*(.*)$/))) return '第 ' + m[1] + ' 步：' + (m[2] || '');
    return null;
  }

  function splitSteps(solution) {
    var lines = String(solution || '').split('\n');
    var steps = [], cur = null;
    lines.forEach(function (line) {
      var title = stepTitleOf(line);
      if (title) {
        if (cur) steps.push(cur);
        cur = { title: title, body: [] };
        return;
      }
      if (!cur) {
        if (!line.trim()) return;
        cur = { title: '解答', body: [] };
      }
      cur.body.push(line);
    });
    if (cur) steps.push(cur);
    steps.forEach(function (s) {
      s.body = s.body.join('\n').trim();
      if (!s.body) s.body = s.title;
    });
    // 没有识别出任何步骤时，按空行分段
    if (steps.length <= 1) {
      var paras = String(solution || '').split(/\n\s*\n/).map(function (t) { return t.trim(); }).filter(Boolean);
      if (paras.length > 1) {
        steps = paras.map(function (p, i) { return { title: '第 ' + (i + 1) + ' 步', body: p }; });
      }
    }
    return steps.slice(0, 14);
  }

  /* ---------------- 3. 识别几何/函数条件 ---------------- */
  function numList(s) {
    var m = String(s).match(/\d+(?:\.\d+)?/g) || [];
    return m.map(parseFloat).sort(function (a, b) { return a - b; }).join(',');
  }

  /* 从一段文字里还原出"三角形条件" */
  function triangleTextFrom(plain) {
    if (!plain) return null;
    if (/三角形|△/.test(plain)) return plain;
    var sides = {}, angles = {}, m;
    var reSide = /([A-Z])\s*([A-Z])\s*=\s*(\d+(?:\.\d+)?)/g;
    while ((m = reSide.exec(plain)) !== null) {
      var key = [m[1], m[2]].sort().join('');
      if ('AB' === key || 'AC' === key || 'BC' === key) sides[key] = parseFloat(m[3]);
    }
    var reLow = /\b([abc])\s*=\s*(\d+(?:\.\d+)?)/g;
    while ((m = reLow.exec(plain)) !== null) {
      var map = { a: 'BC', b: 'AC', c: 'AB' };
      if (!sides[map[m[1]]]) sides[map[m[1]]] = parseFloat(m[2]);
    }
    var reAng = /[∠角]\s*([A-Z])\s*=?\s*(\d+(?:\.\d+)?)/g;
    while ((m = reAng.exec(plain)) !== null) angles[m[1]] = parseFloat(m[2]);
    if (!Object.keys(sides).length && !Object.keys(angles).length) {
      // 余弦定理代入式： b²+c²-2bc·cos A
      var reCos = /(\d+(?:\.\d+)?)\s*\^?\s*2?\s*\+\s*(\d+(?:\.\d+)?)\s*\^?\s*2?\s*-\s*2\s*[*·×]?\s*(\d+(?:\.\d+)?)\s*[*·×]\s*(\d+(?:\.\d+)?)\s*[*·×]?\s*(?:cos|\\cos)\s*\(?\s*(\d+(?:\.\d+)?)/;
      var mc = String(plain).match(reCos);
      if (mc) {
        return '在△ABC中，AB=' + mc[2] + '，AC=' + mc[1] + '，∠A=' + mc[5] + '°';
      }
      return null;
    }
    var parts = [];
    Object.keys(sides).forEach(function (k) { parts.push(k + '=' + sides[k]); });
    Object.keys(angles).forEach(function (k) { parts.push('∠' + k + '=' + angles[k] + '°'); });
    if (parts.length < 3) return null;   // 信息太少，画不出确定的三角形
    return '在△ABC中，' + parts.join('，');
  }

  /* 识别解答中的"重要式子"，转成可以交给 CustomParser 的候选串 */
  function candidatesFromUnit(text) {
    var out = [];
    var whole = L.textWithMathPlain(text);
    if (whole.trim()) out.push({ text: whole, source: whole, ctx: true });
    var tri = triangleTextFrom(whole);
    if (tri) out.push({ text: tri, source: tri, ctx: true });

    L.segments(text).forEach(function (g) {
      if (g.type !== 'math') return;
      // 解析式（函数 / 极坐标 / 直线与圆 / 圆锥曲线）
      if (g.expr) {
        var e = cleanExpr(g.expr);
        if (e) out.push({ text: e, source: g.plain || g.tex, expr: true });
      }
      // 纯文本形式（可能带中文语境，如"正方体…棱长为2"）
      if (g.plain) {
        out.push({ text: cleanExpr(g.plain) || g.plain, source: g.plain });
        var t2 = triangleTextFrom(g.plain);
        if (t2) out.push({ text: t2, source: g.plain, ctx: true });
      }
    });
    return out;
  }

  /* 去掉解析式里混进来的中文尾巴 */
  function cleanExpr(s) {
    return String(s || '')
      .replace(/[\u4e00-\u9fff][\s\S]*$/, '')
      .replace(/[，。；、）】]+$/, '')
      .trim();
  }

  /* ---------------- 4. 主流程 ---------------- */
  function takeFiguresFence(text) {
    var specs = [], out = String(text || '');
    var re = /```(?:figures?|json)\s*([\s\S]*?)```/gi, m;
    var removed = [];
    while ((m = re.exec(out)) !== null) {
      var body = m[1].trim();
      var parsed = null;
      try { parsed = JSON.parse(body); } catch (e) { parsed = null; }
      if (parsed) {
        var arr = Array.isArray(parsed) ? parsed : (parsed.figures || parsed.scenes || null);
        if (Array.isArray(arr)) {
          arr.forEach(function (it) {
            if (typeof it === 'string') specs.push({ text: it, title: '' });
            else if (it && (it.text || it.expr || it.equation)) {
              specs.push({ text: it.text || it.expr || it.equation, title: it.title || '' });
            }
          });
          removed.push(m[0]);
        }
      }
    }
    removed.forEach(function (r) { out = out.replace(r, ''); });
    return { text: out, specs: specs };
  }

  function parseJsonAnswer(text) {
    var t = String(text || '').trim();
    if (t[0] !== '{') return null;
    var obj = null;
    try { obj = JSON.parse(t); } catch (e) { return null; }
    if (!obj || (!obj.statement && !obj.problem && !obj.steps)) return null;
    var steps = (obj.steps || []).map(function (s, i) {
      if (typeof s === 'string') return { title: '第 ' + (i + 1) + ' 步', body: s };
      return { title: s.title || ('第 ' + (i + 1) + ' 步'), body: s.body || s.content || s.detail || '' };
    });
    return {
      statement: obj.statement || obj.problem || '',
      steps: steps,
      answer: obj.answer || obj.result || '',
      specs: (obj.figures || []).map(function (f) {
        return typeof f === 'string' ? { text: f, title: '' } : { text: f.text || f.expr || '', title: f.title || '' };
      })
    };
  }

  function parse(answerText, opts) {
    opts = opts || {};
    var maxFigures = opts.maxFigures || 6;
    var log = [];
    var raw = String(answerText == null ? '' : answerText).trim();
    if (!raw) return { ok: false, message: '内容为空。' };

    var json = parseJsonAnswer(raw);
    var fence = { text: raw, specs: [] };
    var sec;
    if (json) {
      sec = { statement: json.statement, solution: '', answer: json.answer, steps: json.steps };
      fence.specs = json.specs;
      log.push('按 JSON 结构解析');
    } else {
      fence = takeFiguresFence(raw);
      sec = splitSections(fence.text);
      sec.steps = splitSteps(sec.solution);
      log.push('按 Markdown 结构解析，共 ' + sec.steps.length + ' 个步骤');
    }
    if (!sec.statement) {
      // 没有"题目"标题时，取正文最前面的一段
      var first = (sec.solution || fence.text).split(/\n\s*\n/)[0] || '';
      if (first.trim()) { sec.statement = first.trim(); }
    }

    var figures = [], seen = {}, srcSets = [], fallbackFigures = [];

    function signatureOf(probCand) {
      if (probCand.kind === 'function' || probCand.kind === 'polar') {
        return probCand.kind + '|' + (probCand.figSources || []).slice().sort().join('+');
      }
      if (probCand.kind === 'triangle') {
        return 'triangle|' + (probCand.params || []).map(function (p) { return Number(p.value) || 0; })
          .sort(function (a, b) { return a - b; }).map(function (v) { return v.toFixed(3); }).join(',');
      }
      return probCand.kind + '|' + (probCand.params || []).map(function (p) {
        return p.key + '=' + (Number(p.value) || 0).toFixed(4);
      }).sort().join('&');
    }
    function isCovered(probCand) {
      if (probCand.kind !== 'function' && probCand.kind !== 'polar') return false;
      var srcs = probCand.figSources || [];
      if (!srcs.length) return false;
      return srcs.every(function (s) {
        return srcSets.some(function (set) { return set.indexOf(s) >= 0; });
      });
    }
    function makeFigure(probCand, title, source, origin) {
      return {
        id: 'fig' + (figures.length + fallbackFigures.length),
        title: title || '图形',
        source: source || '',
        origin: origin || '',
        kind: probCand.kind,
        note: probCand.notice || '',
        params: cloneParams(probCand.params),
        build: probCand.build
      };
    }
    function addFigure(probCand, title, source, origin) {
      if (!probCand || !probCand.ok) return;
      var sig = signatureOf(probCand);
      if (seen[sig] || isCovered(probCand)) return;
      seen[sig] = true;
      if (probCand.figSources) srcSets.push(probCand.figSources.slice());
      // 条件不足、只是"默认图形"的先放一边，实在没有别的图形时才用
      if (probCand.synthetic) { fallbackFigures.push(makeFigure(probCand, title, source, origin)); return; }
      figures.push(makeFigure(probCand, title, source, origin));
    }
    function tryOne(text) {
      if (!text) return null;
      var c = String(text).trim();
      if (c.length < 4) return null;
      if (!/\d/.test(c)) return null;      // 没有具体数值的式子画不出有意义的图
      try { return MV.CustomParser.parse(c); } catch (e) { return null; }
    }
    function collect(unitText, title, origin) {
      if (!unitText) return;
      if (figures.length >= maxFigures) return;
      var cands = candidatesFromUnit(unitText);
      // 一个题干/一个步骤只保留"最能说明问题"的一张图：
      // 优先整段（信息最全，例如"正方体棱长为2"），其次才是逐个式子
      for (var i = 0; i < cands.length; i++) {
        var prob = tryOne(cands[i].text);
        if (prob && prob.ok && !prob.synthetic) {
          var before = figures.length;
          addFigure(prob, title, cands[i].source, origin);
          if (figures.length > before) return;
        }
      }
      // 没有真实条件的图形时，允许用默认图形兜底
      for (var j = 0; j < cands.length; j++) {
        var p2 = tryOne(cands[j].text);
        if (p2 && p2.ok) addFigure(p2, title, cands[j].source, origin);
      }
    }

    // ① AI 明确给出的图形说明
    fence.specs.forEach(function (s) {
      if (figures.length >= maxFigures) return;
      var prob = tryOne(s.text);
      if (prob) addFigure(prob, s.title || '题目指定图形', s.text, 'AI 指定');
    });
    log.push('AI 指定图形 ' + fence.specs.length + ' 个');

    // ② 题干
    collect(sec.statement, '题目条件图', '题干');
    // ③ 每一步
    sec.steps.forEach(function (st, i) {
      var before = figures.length;
      collect(st.body, st.title || ('第 ' + (i + 1) + ' 步'), '第 ' + (i + 1) + ' 步');
      if (figures.length > before) log.push('第 ' + (i + 1) + ' 步提取到 ' + (figures.length - before) + ' 个图形');
    });
    // ④ 兜底：整篇
    if (!figures.length) collect(fence.text, '整体图形', '解答全文');
    // ⑤ 还是没有 → 用"条件不足"的默认图形兜底
    if (!figures.length && fallbackFigures.length) {
      figures = fallbackFigures.slice(0, maxFigures);
      log.push('未找到完整条件，改用 ' + figures.length + ' 个默认图形');
    }

    log.push('共生成 ' + figures.length + ' 个可调图形');
    return {
      ok: true,
      statement: sec.statement,
      steps: sec.steps,
      answer: sec.answer,
      figures: figures,
      log: log
    };
  }

  MV.AIExtract = {
    parse: parse,
    splitSections: splitSections,
    splitSteps: splitSteps,
    triangleTextFrom: triangleTextFrom,
    candidatesFromUnit: candidatesFromUnit,
    cleanExpr: cleanExpr
  };
})(typeof window !== 'undefined' ? window : globalThis);
