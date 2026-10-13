/* ============================================================
 * mathviz/js/ui/mathfmt.js
 * 轻量公式排版：把 \frac{}{}、\sqrt{}、^、_ 和常用符号
 * 转成 HTML（无需联网、无需 KaTeX）
 * ============================================================ */
(function (global) {
  'use strict';
  var MV = (global.MV = global.MV || {});

  var SYMBOLS = {
    pi: 'π', alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', Delta: 'Δ',
    theta: 'θ', phi: 'φ', varphi: 'φ', lambda: 'λ', mu: 'μ', omega: 'ω',
    Omega: 'Ω', Sigma: 'Σ', sigma: 'σ', rho: 'ρ', tau: 'τ', eta: 'η', xi: 'ξ',
    angle: '∠', triangle: '△', measuredangle: '∡', parallel: '∥', perp: '⊥',
    cdot: '·', cdots: '⋯', times: '×', div: '÷', pm: '±', mp: '∓',
    le: '≤', leq: '≤', ge: '≥', geq: '≥', ne: '≠', neq: '≠', approx: '≈',
    equiv: '≡', sim: '∼', propto: '∝', infty: '∞', therefore: '∴', because: '∵',
    rightarrow: '→', to: '→', Rightarrow: '⇒', leftarrow: '←', leftrightarrow: '↔',
    in: '∈', notin: '∉', subset: '⊂', cup: '∪', cap: '∩', emptyset: '∅',
    circ: '°', degree: '°', odot: '⊙', oplus: '⊕', prime: '′',
    sin: 'sin', cos: 'cos', tan: 'tan', cot: 'cot', sec: 'sec', csc: 'csc',
    arcsin: 'arcsin', arccos: 'arccos', arctan: 'arctan',
    log: 'log', ln: 'ln', lg: 'lg', lim: 'lim', max: 'max', min: 'min',
    quad: '\u2003', qquad: '\u2003\u2003', ';': '\u2009', ',': '\u2009', ' ': ' ', '!': ''
  };

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /* 这些符号后面的一个空格会被吞掉（\triangle ABC => △ABC） */
  var SPACE_DROP = {
    triangle: 1, angle: 1, measuredangle: 1, perp: 1, parallel: 1, odot: 1, circ: 1,
    degree: 1, therefore: 1, because: 1, in: 1, notin: 1, subset: 1, cup: 1, cap: 1,
    emptyset: 1, oplus: 1, equiv: 1, sim: 1, propto: 1, pm: 1, mp: 1, times: 1,
    div: 1, cdot: 1, cdots: 1, le: 1, leq: 1, ge: 1, geq: 1, ne: 1, neq: 1,
    approx: 1, to: 1, rightarrow: 1, Rightarrow: 1, leftarrow: 1, leftrightarrow: 1,
    prime: 1, pi: 1, alpha: 1, beta: 1, gamma: 1, theta: 1, lambda: 1, mu: 1,
    omega: 1, Omega: 1, Sigma: 1, sigma: 1, rho: 1, tau: 1, eta: 1, xi: 1, Delta: 1
  };
  /* 函数名：前面若是字母/数字要补一个空格 */
  var FUNC_NAMES = {
    sin: 1, cos: 1, tan: 1, cot: 1, sec: 1, csc: 1, arcsin: 1, arccos: 1, arctan: 1,
    ln: 1, lg: 1, log: 1, lim: 1, max: 1, min: 1
  };

  function readGroup(s, i) {
    // 从 s[i] === '{' 开始读平衡括号，返回 {body, next}
    if (s[i] !== '{') {
      // 单字符（或单个命令）作为组
      if (s[i] === '\\') {
        var j = i + 1;
        while (j < s.length && /[A-Za-z]/.test(s[j])) j++;
        return { body: s.slice(i, j), next: j };
      }
      return { body: s[i] || '', next: i + 1 };
    }
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

  function render(src) {
    var s = String(src == null ? '' : src);
    var out = '', buf = '', i = 0;

    function flush() { if (buf) { out += esc(buf); buf = ''; } }

    while (i < s.length) {
      var ch = s[i];
      if (ch === '\\') {
        var j = i + 1, name = '';
        if (/[A-Za-z]/.test(s[j] || '')) {
          while (j < s.length && /[A-Za-z]/.test(s[j])) { name += s[j]; j++; }
        } else {
          name = s[j] || ''; j++;
        }
        var cmd = name;
        if (cmd === 'frac' || cmd === 'dfrac' || cmd === 'tfrac') {
          var g1 = readGroup(s, j);
          var g2 = readGroup(s, g1.next);
          flush();
          out += '<span class="frac"><span class="num">' + render(g1.body) +
            '</span><span class="den">' + render(g2.body) + '</span></span>';
          i = g2.next;
          continue;
        }
        if (cmd === 'sqrt') {
          var idx = null, k = j;
          if (s[k] === '[') {
            var close = s.indexOf(']', k);
            if (close > 0) { idx = s.slice(k + 1, close); k = close + 1; }
          }
          var g = readGroup(s, k);
          flush();
          out += '<span class="radical">' + (idx ? '<span class="rootidx">' + render(idx) + '</span>' : '') +
            '√<span class="radicand">' + render(g.body) + '</span></span>';
          i = g.next;
          continue;
        }
        if (cmd === 'text' || cmd === 'mathrm' || cmd === 'operatorname') {
          var gt = readGroup(s, j);
          flush();
          out += '<span class="upright">' + esc(gt.body) + '</span>';
          i = gt.next;
          continue;
        }
        if (cmd === 'mathbf' || cmd === 'boldsymbol' || cmd === 'bm' || cmd === 'textbf') {
          var gb = readGroup(s, j);
          flush();
          out += '<span class="mbf">' + render(gb.body) + '</span>';
          i = gb.next;
          continue;
        }
        if (cmd === 'vec' || cmd === 'overrightarrow' || cmd === 'overline' || cmd === 'bar' || cmd === 'widehat') {
          var gv = readGroup(s, j);
          flush();
          var cls = (cmd === 'vec' || cmd === 'overrightarrow') ? 'vec' : 'ovl';
          out += '<span class="' + cls + '">' + render(gv.body) + '</span>';
          i = gv.next;
          continue;
        }
        if (cmd === 'left' || cmd === 'right' || cmd === 'displaystyle' || cmd === 'limits' || cmd === 'big' || cmd === 'Big') {
          i = j;
          continue;
        }
        if (cmd === 'begin' || cmd === 'end') {
          var ge = readGroup(s, j);
          i = ge.next;
          continue;
        }
        if (cmd === 'over') { // a \over b 的简化支持（不常见，忽略）
          i = j; continue;
        }
        if (SYMBOLS[cmd] !== undefined) {
          if (FUNC_NAMES[cmd] && /[A-Za-z0-9]$/.test(buf)) buf += ' ';
          buf += SYMBOLS[cmd];
          i = j;
          if (SPACE_DROP[cmd] && s[i] === ' ') i++;
          continue;
        }
        buf += cmd;
        i = j;
        continue;
      }
      if (ch === '^' || ch === '_') {
        var gs = readGroup(s, i + 1);
        flush();
        out += ch === '^' ? '<sup>' + render(gs.body) + '</sup>' : '<sub>' + render(gs.body) + '</sub>';
        i = gs.next;
        continue;
      }
      buf += ch;
      i++;
    }
    flush();
    return out;
  }

  function plain(src) {
    var html = render(src);
    return html
      .replace(/<span class="frac"><span class="num">([\s\S]*?)<\/span><span class="den">([\s\S]*?)<\/span><\/span>/g, '($1)/($2)')
      .replace(/<[^>]+>/g, '')
      .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  }

  /* 行内混排：普通文字 + $公式$ / $$公式$$，文字里 **加粗** 会变成 <b> */
  function inline(src) {
    var s = String(src == null ? '' : src);
    var out = '', last = 0, m;
    var re = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g;
    function text(t) { return esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>'); }
    while ((m = re.exec(s)) !== null) {
      out += text(s.slice(last, m.index));
      if (m[1] !== undefined) out += '<span class="mathblock">' + render(m[1]) + '</span>';
      else out += '<span class="math">' + render(m[2]) + '</span>';
      last = re.lastIndex;
    }
    out += text(s.slice(last));
    return out;
  }

  MV.Fmt = { render: render, plain: plain, inline: inline, esc: esc };
})(typeof window !== 'undefined' ? window : globalThis);
