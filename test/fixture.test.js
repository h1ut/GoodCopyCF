'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { serialize } = require('../src/serialize.js');
const { body } = require('./helpers.js');

function read(name) {
  return fs.readFileSync(path.join(__dirname, 'fixtures', name), 'utf8');
}

test('условие задачи копируется целиком и без потерь', () => {
  const expected = read('statement.expected.txt').replace(/\r\n/g, '\n').replace(/\n+$/, '');
  const actual = serialize(body(read('statement.html')));
  assert.equal(actual, expected);
});

test('в тексте условия нет служебных надписей и скрытых маркеров', () => {
  const actual = serialize(body(read('statement.html')));
  assert.ok(!actual.includes('Скопировать'));
  assert.ok(!/\n{3,}/.test(actual));
});
