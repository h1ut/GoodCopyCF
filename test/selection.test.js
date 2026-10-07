'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');
const { selectionToText, isEditable } = require('../src/selection.js');
const { mj } = require('./helpers.js');

function page(html) {
  const window = new JSDOM('<!DOCTYPE html><body>' + html + '</body>').window;
  return { window, document: window.document };
}

// Выделяет от (startNode, startOffset) до (endNode, endOffset).
function select(window, startNode, startOffset, endNode, endOffset) {
  const range = window.document.createRange();
  range.setStart(startNode, startOffset);
  range.setEnd(endNode, endOffset);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
  return selection;
}

function selectAll(window, element) {
  return select(window, element, 0, element, element.childNodes.length);
}

// Текстовый узел отрисованной формулы ("RENDERED").
function renderedText(document, index = 0) {
  return document.querySelectorAll('.MathJax .math')[index].firstChild;
}

test('выделенный абзац условия', () => {
  const { window, document } = page(
    `<div class="ttypography"><p id="p">дробь ${mj('\\frac{p}{q}')} равна</p></div>`
  );
  const selection = selectAll(window, document.getElementById('p'));
  assert.equal(selectionToText(selection), 'дробь $\\frac{p}{q}$ равна');
});

test('выделение внутри формулы берёт формулу целиком', () => {
  const { window, document } = page(`<div class="ttypography"><p>a ${mj('\\frac{p}{q}')} b</p></div>`);
  const node = renderedText(document);
  assert.equal(selectionToText(select(window, node, 2, node, 4)), '$\\frac{p}{q}$');
});

test('выделение от середины формулы до конца абзаца', () => {
  const { window, document } = page(`<div class="ttypography"><p id="p">a ${mj('x')} b</p></div>`);
  const p = document.getElementById('p');
  const selection = select(window, renderedText(document), 3, p.lastChild, p.lastChild.length);
  assert.equal(selectionToText(selection), '$x$ b');
});

test('выделение, начатое сразу после формулы, её не захватывает', () => {
  const { window, document } = page(`<div class="ttypography"><p id="p">a ${mj('x')} b</p></div>`);
  const p = document.getElementById('p');
  const node = renderedText(document);
  const selection = select(window, node, node.length, p.lastChild, p.lastChild.length);
  assert.equal(selectionToText(selection), 'b');
});

test('выделение, законченное прямо перед формулой, её не захватывает', () => {
  const { window, document } = page(`<div class="ttypography"><p id="p">a ${mj('x')} b</p></div>`);
  const p = document.getElementById('p');
  const selection = select(window, p.firstChild, 0, renderedText(document), 0);
  assert.equal(selectionToText(selection), 'a');
});

test('граница между формулой и её script: формула выделена — script берётся', () => {
  const { window, document } = page(`<div class="ttypography"><p id="p">a ${mj('x')} b</p></div>`);
  const p = document.getElementById('p');
  const scriptIndex = Array.from(p.childNodes).indexOf(p.querySelector('script'));
  assert.equal(selectionToText(select(window, p.firstChild, 0, p, scriptIndex)), 'a $x$');
});

test('граница между формулой и её script: начало после формулы — script не берётся', () => {
  const { window, document } = page(`<div class="ttypography"><p id="p">a ${mj('x')} b</p></div>`);
  const p = document.getElementById('p');
  const scriptIndex = Array.from(p.childNodes).indexOf(p.querySelector('script'));
  assert.equal(selectionToText(select(window, p, scriptIndex, p.lastChild, p.lastChild.length)), 'b');
});

test('выделение внутри блока примера сохраняет строки', () => {
  const { window, document } = page(
    '<div class="ttypography"><pre>' +
      '<div class="test-example-line">4  6</div><div class="test-example-line">10 14</div>' +
      '<div class="test-example-line">15 15</div></pre></div>'
  );
  const lines = document.querySelectorAll('.test-example-line');
  const selection = select(window, lines[0].firstChild, 0, lines[1].firstChild, 5);
  assert.equal(selectionToText(selection), '4  6\n10 14');
});

test('вне условия и без формул расширение не вмешивается', () => {
  const { window, document } = page('<div id="menu">Главная</div><div class="ttypography"><p>x</p></div>');
  assert.equal(selectionToText(selectAll(window, document.getElementById('menu'))), null);
});

test('формула вне .ttypography всё равно обрабатывается', () => {
  const { window, document } = page(`<div id="c">сложность ${mj('O(n)')}</div>`);
  assert.equal(selectionToText(selectAll(window, document.getElementById('c'))), 'сложность $O(n)$');
});

test('редактируемые элементы не трогаются', () => {
  const { window, document } = page(
    '<div class="ttypography"><div id="e" contenteditable="true">текст</div></div>'
  );
  assert.equal(selectionToText(selectAll(window, document.getElementById('e'))), null);
});

test('пустое выделение', () => {
  const { window, document } = page('<div class="ttypography"><p id="p">x</p></div>');
  const p = document.getElementById('p');
  assert.equal(selectionToText(select(window, p.firstChild, 0, p.firstChild, 0)), null);
  assert.equal(selectionToText(null), null);
});

test('isEditable', () => {
  const { document } = page('<textarea id="t"></textarea><input id="i"><p id="p">x</p>');
  assert.equal(isEditable(document.getElementById('t')), true);
  assert.equal(isEditable(document.getElementById('i')), true);
  assert.equal(isEditable(document.getElementById('p').firstChild), false);
  assert.equal(isEditable(document), false);
});

test('скрытое таблицей стилей не копируется при широком выделении', () => {
  const { window, document } = page(
    '<style>.h{display:none}</style><div id="all"><div>Меню</div><div class="h">HIDDEN</div>' +
      '<div class="ttypography"><p>a</p></div></div>'
  );
  const all = document.getElementById('all');
  assert.equal(selectionToText(selectAll(window, all)), 'Меню\n\na');
  assert.equal(document.querySelector('[data-goodcopycf-hidden]'), null);
});
