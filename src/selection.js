(function (root) {
  'use strict';

  const inNode = typeof module !== 'undefined' && module.exports;
  const core = inNode ? require('./serialize.js') : root.GoodCopyCF;
  const { serialize, isMathScript, FORMULA_SELECTOR, HIDDEN_ATTRIBUTE } = core;

  // Контейнер условий, постов и комментариев на Codeforces.
  const CONTENT_SELECTOR = '.ttypography';
  const EDITABLE_SELECTOR = 'input, textarea, [contenteditable]:not([contenteditable="false"])';

  function elementOf(node) {
    return node.nodeType === 1 ? node : node.parentElement;
  }

  function isEditable(node) {
    const element = elementOf(node);
    return !!element && element.closest(EDITABLE_SELECTOR) !== null;
  }

  // Самая внешняя обёртка формулы, внутри которой лежит узел.
  function outermostFormula(node) {
    let found = null;
    for (let el = elementOf(node); el; el = el.parentElement) {
      if (el.matches(FORMULA_SELECTOR)) found = el;
    }
    return found;
  }

  function mathScriptAfter(frame) {
    const next = frame.nextElementSibling;
    return next && isMathScript(next) ? next : null;
  }

  // Видимый текст диапазона: без скрытой MathML-копии формулы.
  function visibleText(range) {
    const fragment = range.cloneContents();
    fragment.querySelectorAll('.MJX_Assistive_MathML, .MathJax_Preview').forEach((n) => n.remove());
    return fragment.textContent.trim();
  }

  function childAt(container, offset) {
    return container.nodeType === 1 ? container.childNodes[offset] || null : null;
  }

  // Исходный LaTeX лежит в script после отрисованной формулы. Если граница
  // выделения попала внутрь формулы, сдвигаем её так, чтобы формула вошла
  // целиком вместе со script — или не вошла вовсе, если видимой части нет.
  function expandRange(range) {
    const result = range.cloneRange();
    const doc = range.startContainer.ownerDocument || range.startContainer;

    const startFrame = outermostFormula(result.startContainer);
    if (startFrame) {
      const tail = doc.createRange();
      tail.setStart(result.startContainer, result.startOffset);
      tail.setEndAfter(startFrame);
      if (visibleText(tail)) result.setStartBefore(startFrame);
      else result.setStartAfter(mathScriptAfter(startFrame) || startFrame);
    }

    const endFrame = outermostFormula(result.endContainer);
    if (endFrame) {
      const head = doc.createRange();
      head.setStartBefore(endFrame);
      head.setEnd(result.endContainer, result.endOffset);
      if (visibleText(head)) result.setEndAfter(mathScriptAfter(endFrame) || endFrame);
      else result.setEndBefore(endFrame);
    }

    // Граница ровно между формулой и её script.
    const first = childAt(result.startContainer, result.startOffset);
    if (first && isMathScript(first)) result.setStartAfter(first);
    const next = childAt(result.endContainer, result.endOffset);
    if (next && isMathScript(next) && !result.collapsed) result.setEndAfter(next);

    return result;
  }

  // Клон выделения теряет стили страницы, поэтому элементы, скрытые таблицей
  // стилей, помечаются атрибутом до клонирования. Возвращает помеченные.
  function markHidden(range, ancestor) {
    const marked = [];
    const view = ancestor.ownerDocument.defaultView;
    if (!view) return marked;
    for (const element of ancestor.querySelectorAll('*')) {
      if (!range.intersectsNode(element)) continue;
      let hidden = false;
      try {
        hidden = view.getComputedStyle(element).display === 'none';
      } catch (error) {
        // Стиль не вычислился (например, для MathML) — считаем элемент видимым.
      }
      if (hidden) {
        element.setAttribute(HIDDEN_ATTRIBUTE, '');
        marked.push(element);
      }
    }
    return marked;
  }

  function cloneVisible(range, ancestor) {
    // Внутри условий скрытое задано инлайн-стилем или известным классом;
    // обход всех элементов нужен только для широких выделений (Ctrl+A).
    if (!ancestor || ancestor.closest(CONTENT_SELECTOR)) return range.cloneContents();
    const marked = markHidden(range, ancestor);
    try {
      return range.cloneContents();
    } finally {
      for (const element of marked) element.removeAttribute(HIDDEN_ATTRIBUTE);
    }
  }

  function selectionToText(selection) {
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return null;

    const parts = [];
    let relevant = false;
    for (let i = 0; i < selection.rangeCount; i++) {
      const range = expandRange(selection.getRangeAt(i));
      if (range.collapsed) continue;

      const ancestor = elementOf(range.commonAncestorContainer);
      if (ancestor && isEditable(ancestor)) return null;

      const fragment = cloneVisible(range, ancestor);
      if (
        (ancestor && ancestor.closest(CONTENT_SELECTOR)) ||
        fragment.querySelector(CONTENT_SELECTOR + ', script[type^="math/tex"]')
      ) {
        relevant = true;
      }

      const preformatted = !!(ancestor && ancestor.closest('pre'));
      parts.push(serialize(fragment, { preformatted }));
    }

    if (!relevant) return null;
    const text = parts.filter(Boolean).join('\n');
    return text || null;
  }

  const api = { expandRange, selectionToText, isEditable };
  if (inNode) module.exports = api;
  else Object.assign(root.GoodCopyCF, api);
})(globalThis);
