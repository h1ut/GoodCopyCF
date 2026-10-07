(function (root) {
  'use strict';

  // Обёртки отрисованных формул для всех рендереров MathJax 2.
  const FORMULA_SELECTOR =
    '.MathJax, .MathJax_Display, .MathJax_SVG, .MathJax_SVG_Display, .MathJax_CHTML, .MJXc-display';
  const SKIP_SELECTOR =
    FORMULA_SELECTOR +
    ', .MathJax_Preview, .MJX_Assistive_MathML, .input-output-copier, .testCaseMarker';
  const SKIP_TAGS = new Set([
    'style', 'img', 'noscript', 'template', 'svg', 'canvas', 'iframe', 'head',
    'select', 'option', 'textarea', 'button', 'input',
  ]);
  // Строки внутри pre: строки примеров и код с нумерацией (pre > ol > li).
  const PRE_LINE_TAGS = new Set(['div', 'li', 'p', 'tr']);
  // Ставится в selection.js на элементы, скрытые таблицей стилей.
  const HIDDEN_ATTRIBUTE = 'data-goodcopycf-hidden';
  const BOLD_SELECTOR = 'b, strong, .tex-font-style-bf';
  const PARAGRAPH_TAGS = new Set(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'table']);
  const LINE_TAGS = new Set([
    'div', 'tr', 'section', 'article', 'header', 'footer', 'center', 'dl', 'dt', 'dd', 'figure', 'figcaption',
  ]);

  function isMathScript(node) {
    return (
      node.nodeType === 1 &&
      node.tagName.toLowerCase() === 'script' &&
      /^math\/tex/.test(node.getAttribute('type') || '')
    );
  }

  // Codeforces подставляет \gt и \lt вместо знаков, которые написал автор.
  function normalizeTex(tex) {
    return tex
      .replace(/\\gt(?![a-zA-Z])/g, '>')
      .replace(/\\lt(?![a-zA-Z])/g, '<')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function isHidden(node) {
    return (
      node.hasAttribute('hidden') ||
      node.hasAttribute(HIDDEN_ATTRIBUTE) ||
      (node.style && node.style.display === 'none')
    );
  }

  function isSkipped(node, tag) {
    return tag === 'script' || SKIP_TAGS.has(tag) || node.matches(SKIP_SELECTOR) || isHidden(node);
  }

  // Накапливает текст. Разрывы между блоками откладываются до следующего
  // содержимого, поэтому пустые блоки не оставляют лишних пустых строк.
  function createWriter() {
    let out = '';
    let pending = 0; // 1 — новая строка, 2 — пустая строка
    let fresh = false; // сразу после маркера списка разрыв не нужен

    function flush() {
      if (pending && out) {
        out = out.replace(/[ \t]+$/, '');
        const have = /\n*$/.exec(out)[0].length;
        out += '\n'.repeat(Math.max(0, pending - have));
      }
      pending = 0;
    }

    return {
      block(level) {
        if (!fresh && level > pending) pending = level;
      },
      lineBreak() {
        if (fresh || !out) return;
        flush();
        out = out.replace(/[ \t]+$/, '') + '\n';
      },
      text(value) {
        let s = value.replace(/\s+/g, ' ');
        if (pending || !out || /\s$/.test(out)) s = s.replace(/^ /, '');
        if (!s) return;
        flush();
        out += s;
        fresh = false;
      },
      raw(value) {
        if (!value) return;
        flush();
        out += value;
        fresh = false;
      },
      prefix(value) {
        flush();
        out += value;
        fresh = true;
      },
      endPrefix() {
        fresh = false;
      },
      result() {
        return out.replace(/^\n+/, '').replace(/\s+$/, '');
      },
    };
  }

  // Текст pre без изменений; вложенные блоки (строки примеров) — отдельные строки.
  function preText(node) {
    let s = '';
    for (const child of node.childNodes) {
      if (child.nodeType === 3) {
        s += child.nodeValue;
      } else if (child.nodeType === 1) {
        const tag = child.tagName.toLowerCase();
        if (isSkipped(child, tag)) continue;
        if (tag === 'br') {
          s += '\n';
        } else if (PRE_LINE_TAGS.has(tag)) {
          if (s && !s.endsWith('\n')) s += '\n';
          const line = preText(child);
          s += line;
          if (!line.endsWith('\n')) s += '\n';
        } else {
          s += preText(child);
        }
      }
    }
    return s;
  }

  function trimPre(text) {
    return text.replace(/\r\n?/g, '\n').replace(/\n+$/, '');
  }

  function writeFormula(node, w) {
    const tex = normalizeTex(node.textContent);
    if (!tex) return;
    if (/mode=display/.test(node.getAttribute('type'))) {
      w.block(2);
      w.raw('$$' + tex + '$$');
      w.block(2);
    } else {
      w.raw('$' + tex + '$');
    }
  }

  function writeBold(node, w, list) {
    const inner = createWriter();
    walkChildren(node, inner, list);
    const text = inner.result();
    if (!text || text.includes('\n')) {
      // Пустой или многострочный жирный блок: разметка только помешает.
      walkChildren(node, w, list);
      return;
    }
    const source = node.textContent;
    if (/^\s/.test(source)) w.text(' ');
    w.raw('**' + text + '**');
    if (/\s$/.test(source)) w.text(' ');
  }

  function walkChildren(node, w, list) {
    for (const child of node.childNodes) walk(child, w, list);
  }

  function walk(node, w, list) {
    if (node.nodeType === 3) {
      w.text(node.nodeValue);
      return;
    }
    if (node.nodeType === 11) {
      walkChildren(node, w, list);
      return;
    }
    if (node.nodeType !== 1) return;

    const tag = node.tagName.toLowerCase();
    if (tag === 'script') {
      if (isMathScript(node)) writeFormula(node, w);
      return;
    }
    if (SKIP_TAGS.has(tag) || node.matches(SKIP_SELECTOR) || isHidden(node)) return;

    if (tag === 'br') {
      w.lineBreak();
      return;
    }
    if (tag === 'pre') {
      w.block(2);
      w.raw(trimPre(preText(node)));
      w.block(2);
      return;
    }
    if (tag === 'ul' || tag === 'ol') {
      const level = list ? 1 : 2;
      w.block(level);
      walkChildren(node, w, { ordered: tag === 'ol', index: 0, depth: list ? list.depth + 1 : 0 });
      w.block(level);
      return;
    }
    if (tag === 'li') {
      w.endPrefix();
      w.block(1);
      if (list) {
        list.index += 1;
        w.prefix('  '.repeat(list.depth) + (list.ordered ? list.index + '. ' : '- '));
      } else {
        w.prefix('- ');
      }
      walkChildren(node, w, list);
      w.endPrefix();
      w.block(1);
      return;
    }
    if (node.matches('.property-title')) {
      walkChildren(node, w, list);
      w.raw(': ');
      return;
    }
    if (node.matches(BOLD_SELECTOR)) {
      writeBold(node, w, list);
      return;
    }
    if (node.matches('sup.upper-index, sub.lower-index')) {
      // Степени и индексы в старых условиях без MathJax.
      const inner = createWriter();
      walkChildren(node, inner, list);
      const text = inner.result();
      if (text) w.raw((tag === 'sup' ? '^' : '_') + (text.length > 1 ? '{' + text + '}' : text));
      return;
    }
    if (tag === 'td' || tag === 'th') {
      walkChildren(node, w, list);
      w.text(' ');
      return;
    }

    let level = 0;
    if (PARAGRAPH_TAGS.has(tag) || node.matches('.section-title')) level = 2;
    else if (LINE_TAGS.has(tag)) level = 1;
    if (level) w.block(level);
    walkChildren(node, w, list);
    if (level) w.block(level);
  }

  // options.preformatted — фрагмент целиком лежит внутри pre.
  function serialize(node, options) {
    if (options && options.preformatted) return trimPre(preText(node));
    const w = createWriter();
    walk(node, w, null);
    return w.result();
  }

  const api = { serialize, normalizeTex, isMathScript, FORMULA_SELECTOR, HIDDEN_ATTRIBUTE };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GoodCopyCF = Object.assign(root.GoodCopyCF || {}, api);
})(globalThis);
