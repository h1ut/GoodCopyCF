(function (root) {
  'use strict';

  const inNode = typeof module !== 'undefined' && module.exports;
  const { selectionToText, isEditable } = inNode ? require('./selection.js') : root.GoodCopyCF;

  // Возвращает true, если текст в буфере подменён. При любой ошибке ничего
  // не отменяет, и браузер копирует как обычно.
  function handleCopy(event, selection) {
    try {
      if (event.target && isEditable(event.target)) return false;
      const text = selectionToText(selection);
      if (text === null || !event.clipboardData) return false;
      event.clipboardData.setData('text/plain', text);
      event.preventDefault();
      return true;
    } catch (error) {
      console.warn('GoodCopyCF: не удалось обработать копирование', error);
      return false;
    }
  }

  if (inNode) {
    module.exports = { handleCopy };
  } else {
    document.addEventListener('copy', (event) => handleCopy(event, window.getSelection()), true);
  }
})(globalThis);
