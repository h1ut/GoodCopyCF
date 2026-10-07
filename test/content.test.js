'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');
const { handleCopy } = require('../src/content.js');
const { mj } = require('./helpers.js');

function setup(html, selectId) {
  const window = new JSDOM('<!DOCTYPE html><body>' + html + '</body>').window;
  const target = window.document.getElementById(selectId);
  const range = window.document.createRange();
  range.selectNodeContents(target);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
  return { target, selection };
}

function fakeEvent(target) {
  const event = {
    target,
    data: {},
    prevented: false,
    clipboardData: { setData: (type, value) => { event.data[type] = value; } },
    preventDefault: () => { event.prevented = true; },
  };
  return event;
}

test('подменяет текст в буфере и отменяет обычное копирование', () => {
  const { target, selection } = setup(`<div class="ttypography"><p id="p">a ${mj('10^4')}</p></div>`, 'p');
  const event = fakeEvent(target);
  assert.equal(handleCopy(event, selection), true);
  assert.deepEqual(event.data, { 'text/plain': 'a $10^4$' });
  assert.equal(event.prevented, true);
});

test('не вмешивается вне условий', () => {
  const { target, selection } = setup('<div id="menu">Главная</div>', 'menu');
  const event = fakeEvent(target);
  assert.equal(handleCopy(event, selection), false);
  assert.deepEqual(event.data, {});
  assert.equal(event.prevented, false);
});

test('не вмешивается, если копируют из поля ввода', () => {
  const { selection } = setup(
    `<div class="ttypography"><p id="p">a ${mj('x')}</p></div><textarea id="t"></textarea>`,
    'p'
  );
  const textarea = selection.anchorNode.ownerDocument.getElementById('t');
  const event = fakeEvent(textarea);
  assert.equal(handleCopy(event, selection), false);
  assert.equal(event.prevented, false);
});

test('при ошибке остаётся обычное копирование', (t) => {
  const warn = t.mock.method(console, 'warn', () => {});
  const broken = {
    get rangeCount() {
      throw new Error('boom');
    },
  };
  const event = fakeEvent(null);
  assert.equal(handleCopy(event, broken), false);
  assert.equal(event.prevented, false);
  assert.equal(warn.mock.callCount(), 1);
});
