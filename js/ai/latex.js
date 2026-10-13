/* ============================================================
 * mathviz/js/ai/latex.js
 * LaTeX 数学块扫描 + 转换：AI 返回的解答里大量使用 LaTeX，
 * 这里把它转成 ① 可解析的表达式（用于画图）② 纯文本（用于识别几何条件）
 * ============================================================ */
(function (global) {
  'use strict';
  var MV = (global.MV = global.MV || {});

  var GREEK = {
    alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε', varepsilon: 'ε',
    zeta: 'ζ', eta: 'η', theta: 'θ', vartheta: 'θ', iota: 'ι', kappa: 'κ',
    lambda: 'λ', mu: 'μ', nu: 'ν', xi: 'ξ', pi: 'π', rho: 'ρ', sigma: 'σ',
    tau: 'τ', upsilon: 'υ', phi: 'φ', varphi: 'φ', chi: 'χ', psi: 'ψ', omega: 'ω',
    Gamma: 'Γ', Delta: 'Δ', Theta: 'Θ', Lambda: 'Λ', Xi: 'Ξ', Pi: 'Π',
    Sigma: 'Σ', Upsilon: 'Υ', Phi: 'Φ', Psi: 'Ψ', Omega: 'Ω'
  };
  var SYM = {
    cdot: '·', cdots: '⋯', ldots: '…', dots: '…', times: '×', div: '÷',
    pm: '±', mp: '∓', le: '≤', leq: '≤', ge: '≥', geq: '≥', ne: '≠', neq: '≠',
    approx: '≈', equiv: '≡', sim: '∼', propto: '∝', infty: '∞', angle: '∠',
    measuredangle: '∡', triangle: '△', perp: '⊥', parallel: '∥', in: '∈',
    notin: '∉', subset: '⊂', subseteq: '⊆', cup: '∪', cap: '∩', emptyset: '∅',
    rightarrow: '→', to: '→', Rightarrow: '⇒', leftarrow: '←',
    leftrightarrow: '↔', therefore: '∴', because: '∵', odot: '⊙',
    circ: '°', degree: '°', prime: '′', quad: ' ', qquad: '  ',
    ',': ' ', ';': ' ', '!': '', ' ': ' '
  };
  var FUNCS = {
    sin: 1, cos: 1, tan: 1, cot: 1, sec: 1, csc: 1, arcsin: 1, arccos: 1,
    arctan: 1, sinh: 1, cosh: 1, tanh: 1, ln: 1, lg: 1, log: 1, exp: 1,
    max: 1, min: 1, lim: 1, det: 1
  };
  /* 这些符号后面跟的一个空格在纯文本里要吞掉：\triangle ABC → △ABC */
  var DROP_SPACE_AFTER = {
    triangle: 1, angle: 1, measuredangle: 1, perp: 1, parallel: 1, odot: 1,
    circ: 1, degree: 1, therefore: 1, because: 1, sim: 1, propto: 1, equiv: 1,
    in: 1, notin: 1, subset: 1, cup: 1, cap: 1, oplus: 1, leftrightarrow: 1,
    to: 1, rightarrow: 1, Rightarrow: 1, approx: 1, le: 1, ge: 1, ne: 1,
    pm: 1, mp: 1, times: 1, div: 1, cdot: 1
  };

  /* 读一个分组：{...} 或单个记号 */
  function readGroup(s, i) {
    while (s[i] === ' ') i++;
    if (s[i] === '{') {
      var depth = 0, start = i + 1;
      for (var k = i; k < s.length; k++) {
        if (s[k] === '{') depth++;
        else if (s[k] === '}') {
          depth--;
          if (depth === 0) return { body: s.slice(start, k), next: k + 1 };
        }
      }
      return { body: s.slice(start), next: s.length };
    }
    if (s[i] === '\\') {
      var j = i + 1;
      if (/[A-Za-z]/.test(s[j] || '')) {
        while (j < s.length && /[A-Za-z]/.test(s[j])) j++;
        return { body: s.slice(i, j), next: j };
      }
      return { body: s.slice(i, j + 1), next: j + 1 };
    }
    if (/[0-9]/.test(s[i] || '')) {
      var k2 = i;
      while (k2 < s.length && /[0-9.]/.test(s[k2])) k2++;
      return { body: s.slice(i, k2), next: k2 };
    }
    return { body: s[i] === undefined ? '' : s[i], next: i + 1 };
  }

  function conv(s, mode) {
    var out = '', i = 0;
    while (i < s.length) {
      var ch = s[i];
      if (ch === '\\') {
        var name = '', j = i + 1;
        if (/[A-Za-z]/.test(s[j] || '')) { while (j < s.length && /[A-Za-z]/.test(s[j])) name += s[j++]; }
        else { name = s[j] || ''; j++; }

        if (name === 'frac' || name === 'dfrac' || name === 'tfrac') {
          var a = readGroup(s, j), b = readGroup(s, a.next);
          out += '(' + conv(a.body, mode) + ')/(' + conv(b.body, mode) + ')';
          i = b.next; continue;
        }
        if (name === 'sqrt') {
          var k = j, opt = null;
          if (s[k] === '[') { var e = s.indexOf(']', k); if (e > 0) { opt = s.slice(k + 1, e); k = e + 1; } }
          var g = readGroup(s, k);
          out += mode === 'expr'
            ? (opt ? '(' + conv(g.body, mode) + ')^(1/(' + conv(opt, mode) + '))' : 'sqrt(' + conv(g.body, mode) + ')')
            : '√(' + conv(g.body, mode) + ')';
          i = g.next; continue;
        }
        if (name === 'mathrm' || name === 'text' || name === 'mbox' ||
          name === 'operatorname' || name === 'textnormal' || name === 'textrm') {
          var gT = readGroup(s, j);
          out += mode === 'expr' ? conv(gT.body, 'plain') : conv(gT.body, 'plain');
          i = gT.next; continue;
        }
        if (name === 'mathbf' || name === 'boldsymbol' || name === 'bm' || name === 'vec' ||
          name === 'overrightarrow' || name === 'overline' || name === 'bar' ||
          name === 'widehat' || name === 'underline') {
          var gV = readGroup(s, j);
          var isArrow = (name === 'vec' || name === 'overrightarrow');
          out += (mode === 'plain' && isArrow ? '向量' : '') + conv(gV.body, mode);
          i = gV.next; continue;
        }
        if (name === 'log') {
          var kb = j, base = null;
          if (s[kb] === '_') { var gb = readGroup(s, kb + 1); base = gb.body; kb = gb.next; }
          if (base !== null) {
            var ga = readGroup(s, kb);
            out += mode === 'expr'
              ? '(ln(' + conv(ga.body, mode) + ')/ln(' + conv(base, mode) + '))'
              : 'log' + conv(base, mode) + '(' + conv(ga.body, mode) + ')';
            i = ga.next; continue;
          }
          out += 'log'; i = kb; continue;
        }
        if (name === 'left' || name === 'right' || name === 'big' || name === 'Big' ||
          name === 'bigg' || name === 'Bigg' || name === 'displaystyle' || name === 'textstyle' ||
          name === 'limits' || name === 'nolimits' || name === 'middle') {
          i = j; continue;
        }
        if (name === 'begin' || name === 'end') { var ge = readGroup(s, j); i = ge.next; continue; }
        if (name === 'over') { i = j; continue; }

        if (FUNCS[name]) {
          if (/[A-Za-z0-9]$/.test(out)) out += ' ';
          var kf = j, power = null, arg = null;
          if (s[kf] === '^') { var gp = readGroup(s, kf + 1); power = gp.body; kf = gp.next; }
          if (s[kf] === '{') { var g3 = readGroup(s, kf); arg = g3.body; kf = g3.next; }
          else if (s[kf] === '(') { /* 括号交给外层处理 */ }
          else if (s[kf] !== undefined && /[A-Za-z0-9\\]/.test(s[kf])) {
            var g4 = readGroup(s, kf); arg = g4.body; kf = g4.next;
          }
          var base = name + (arg !== null ? '(' + conv(arg, mode) + ')' : '');
          if (power !== null) base = '(' + base + ')^(' + conv(power, mode) + ')';
          out += base; i = kf; continue;
        }
        if (GREEK[name]) {
          out += (mode === 'expr') ? name : GREEK[name];
          i = j; continue;
        }
        if (SYM[name] !== undefined) {
          var sym = SYM[name];
          if (mode === 'expr') {
            if (name === 'cdot' || name === 'times') sym = '*';
            else if (name === 'div') sym = '/';
          }
          out += (mode === 'expr' && name === 'pi') ? 'pi' : sym;
          i = j;
          if (mode === 'plain' && DROP_SPACE_AFTER[name] && s[i] === ' ') i++;
          continue;
        }
        out += name; i = j; continue;
      }
      if (ch === '{') { var gb2 = readGroup(s, i); out += conv(gb2.body, mode); i = gb2.next; continue; }
      if (ch === '}') { i++; continue; }
      if (ch === '^') {
        var gp2 = readGroup(s, i + 1);
        out += (mode === 'expr') ? '^(' + conv(gp2.body, mode) + ')' : '^' + conv(gp2.body, mode);
        i = gp2.next; continue;
      }
      if (ch === '_') {
        var gs2 = readGroup(s, i + 1);
        out += (mode === 'expr') ? conv(gs2.body, mode) : '_' + conv(gs2.body, mode);
        i = gs2.next; continue;
      }
      if (ch === '&') { i++; continue; }
      if (ch === '~') { out += ' '; i++; continue; }
      if (ch === 'π' && mode === 'expr') { out += 'pi'; i++; continue; }
      out += ch; i++;
    }
    return out;
  }

  /* 主转换入口：mode = 'expr' | 'plain' */
  function tex(src, mode) {
    var s = String(src == null ? '' : src);
    s = s.replace(/\\begin\{[a-zA-Z*]+\}/g, ' ').replace(/\\end\{[a-zA-Z*]+\}/g, ' ');
    s = s.replace(/\\\\/g, ' ; ');
    s = s.replace(/\^\s*\{\s*\\circ\s*\}/g, '°').replace(/\^\s*\\circ/g, '°')
      .replace(/\\degree/g, '°').replace(/\\textdegree/g, '°');
    s = s.replace(/\\dfrac|\\tfrac/g, '\\frac');
    s = s.replace(/\\left|\\right/g, '');
    s = s.replace(/\\displaystyle|\\textstyle|\\limits|\\nolimits/g, '');
    s = s.replace(/\\[,;!]/g, ' ').replace(/\\quad|\\qquad/g, ' ');
    if (mode === 'expr') {
      // 60° 一律写成可以计算的弧度值
      s = s.replace(/(\d+(?:\.\d+)?)\s*°/g, '(($1)*pi/180)');
    }
    var out = conv(s, mode);
    if (mode === 'expr') {
      out = out.replace(/(\d+(?:\.\d+)?)\s*°/g, '(($1)*pi/180)');
    }
    return out.replace(/\s+/g, ' ').trim();
  }

  function toExpr(src) { return tex(src, 'expr'); }
  function toPlain(src) { return tex(src, 'plain'); }

  /* 扫描整段文本里的数学块 */
  var MATH_RE = /\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]|\\\(([\s\S]+?)\\\)|\$([^$\n]+?)\$/g;

  function segments(text) {
    var s = String(text == null ? '' : text);
    var segs = [], last = 0, m;
    MATH_RE.lastIndex = 0;
    while ((m = MATH_RE.exec(s)) !== null) {
      if (m.index > last) segs.push({ type: 'text', text: s.slice(last, m.index) });
      var display = (m[1] !== undefined || m[2] !== undefined);
      var body = m[1] !== undefined ? m[1] : (m[2] !== undefined ? m[2] : (m[3] !== undefined ? m[3] : m[4]));
      segs.push({
        type: 'math', display: display, tex: body,
        expr: tex(body, 'expr'), plain: tex(body, 'plain'), raw: m[0]
      });
      last = MATH_RE.lastIndex;
    }
    if (last < s.length) segs.push({ type: 'text', text: s.slice(last) });
    return segs;
  }

  /* 整段文本转纯文本（数学块内联成纯文本） */
  function textWithMathPlain(text) {
    return segments(text).map(function (g) {
      return g.type === 'math' ? g.plain : g.text;
    }).join('');
  }

  MV.Latex = {
    tex: tex, toExpr: toExpr, toPlain: toPlain,
    segments: segments, textWithMathPlain: textWithMathPlain,
    readGroup: readGroup, GREEK: GREEK, SYM: SYM
  };
})(typeof window !== 'undefined' ? window : globalThis);
