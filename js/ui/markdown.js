/* ============================================================
 * mathviz/js/ui/markdown.js
 * 轻量 Markdown 渲染（给 AI 返回的解答用）：
 * 标题 / 粗体 / 行内代码 / 有序无序列表 / 引用 / 分割线 / 代码块，
 * 其中的 $...$ 公式交给 MV.Fmt 处理
 * ============================================================ */
(function (global) {
  'use strict';
  var MV = (global.MV = global.MV || {});

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function inline(text) {
    var codes = [];
    var t = String(text).replace(/`([^`]+)`/g, function (_, c) {
      codes.push(c);
      return '\u0000' + (codes.length - 1) + '\u0000';
    });
    var html = MV.Fmt.inline(t);
    html = html.replace(/\u0000(\d+)\u0000/g, function (_, i) {
      return '<code>' + esc(codes[+i]) + '</code>';
    });
    return html;
  }

  function render(text) {
    var lines = String(text == null ? '' : text).replace(/\r\n?/g, '\n').split('\n');
    var out = [], para = [], list = null, quote = [], inCode = false, codeBuf = [];

    function flushPara() {
      if (para.length) { out.push('<p>' + para.map(inline).join('<br>') + '</p>'); para = []; }
    }
    function flushList() {
      if (list) {
        out.push('<' + list.tag + '>' + list.items.map(function (t) { return '<li>' + inline(t) + '</li>'; }).join('') + '</' + list.tag + '>');
        list = null;
      }
    }
    function flushQuote() {
      if (quote.length) { out.push('<blockquote>' + quote.map(inline).join('<br>') + '</blockquote>'); quote = []; }
    }
    function flushAll() { flushPara(); flushList(); flushQuote(); }

    lines.forEach(function (line) {
      if (/^\s*```/.test(line)) {
        if (inCode) {
          out.push('<pre class="codeblock">' + esc(codeBuf.join('\n')) + '</pre>');
          codeBuf = []; inCode = false;
        } else {
          flushAll();
          inCode = true;
        }
        return;
      }
      if (inCode) { codeBuf.push(line); return; }

      if (!line.trim()) { flushAll(); return; }

      var m;
      if ((m = line.match(/^\s*(#{1,6})\s+(.*)$/))) {
        flushAll();
        var lvl = Math.min(Math.max(m[1].length, 3), 5);
        out.push('<h' + lvl + ' class="md-h">' + inline(m[2]) + '</h' + lvl + '>');
        return;
      }
      if (/^\s*([-*_])\1{2,}\s*$/.test(line)) { flushAll(); out.push('<hr class="md-hr">'); return; }
      if ((m = line.match(/^\s*>\s?(.*)$/))) { flushPara(); flushList(); quote.push(m[1]); return; }
      if ((m = line.match(/^\s*[-*+]\s+(.*)$/))) {
        flushPara(); flushQuote();
        if (!list || list.tag !== 'ul') { flushList(); list = { tag: 'ul', items: [] }; }
        list.items.push(m[1]);
        return;
      }
      if ((m = line.match(/^\s*\d+[.)]\s+(.*)$/))) {
        flushPara(); flushQuote();
        if (!list || list.tag !== 'ol') { flushList(); list = { tag: 'ol', items: [] }; }
        list.items.push(m[1]);
        return;
      }
      flushList(); flushQuote();
      para.push(line.trim());
    });
    if (inCode && codeBuf.length) out.push('<pre class="codeblock">' + esc(codeBuf.join('\n')) + '</pre>');
    flushAll();
    return out.join('\n');
  }

  MV.MD = { render: render, inline: inline, esc: esc };
})(typeof window !== 'undefined' ? window : globalThis);
