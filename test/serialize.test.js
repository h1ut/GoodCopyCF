'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { serialize, normalizeTex } = require('../src/serialize.js');
const { body, mj } = require('./helpers.js');

test('normalizeTex возвращает знаки сравнения и убирает лишние пробелы', () => {
  assert.equal(normalizeTex('p  \\gt  0'), 'p > 0');
  assert.equal(normalizeTex('a \\lt b'), 'a < b');
  assert.equal(normalizeTex('  1 \\le t \\le 10^4 '), '1 \\le t \\le 10^4');
});

test('normalizeTex не трогает команды, начинающиеся на \\gt и \\lt', () => {
  assert.equal(normalizeTex('a \\gtrsim b \\ltimes c'), 'a \\gtrsim b \\ltimes c');
});

test('строчные формулы и жирный текст', () => {
  const html =
    `<p>дробь ${mj('\\frac{p}{q}', 1)} равна <span class="tex-font-style-bf">по значению</span>` +
    ` дроби ${mj('\\frac{2}{3}', 2)}. Иначе</p>`;
  assert.equal(
    serialize(body(html)),
    'дробь $\\frac{p}{q}$ равна **по значению** дроби $\\frac{2}{3}$. Иначе'
  );
});

test('отрисованная формула и её MathML в текст не попадают', () => {
  const text = serialize(body(`<p>x ${mj('n')} y</p>`));
  assert.equal(text, 'x $n$ y');
});

test('выключная формула стоит отдельным абзацем', () => {
  const html =
    '<p>a</p>' +
    '<div class="MathJax_Display"><span class="MathJax">R</span></div>' +
    '<script type="math/tex; mode=display">x^2</script>' +
    '<p>b</p>';
  assert.equal(serialize(body(html)), 'a\n\n$$x^2$$\n\nb');
});

test('другие рендереры MathJax', () => {
  const chtml = 'x <span class="mjx-chtml MathJax_CHTML">R</span><script type="math/tex">a_i</script> y';
  const svg = 'x <span class="MathJax_SVG">R</span><script type="math/tex">a_i</script> y';
  assert.equal(serialize(body(chtml)), 'x $a_i$ y');
  assert.equal(serialize(body(svg)), 'x $a_i$ y');
});

test('абзацы разделяются пустой строкой, пробелы схлопываются', () => {
  assert.equal(serialize(body('<p>one\n   two</p>\n<p>three</p>')), 'one two\n\nthree');
});

test('жирный текст с пробелами по краям', () => {
  assert.equal(serialize(body('a<b> b </b>c')), 'a **b** c');
});

test('маркированный список', () => {
  const html =
    '<p>одно из двух:</p><ul> <li> уменьшить ' + mj('p') + ' на единицу; </li>' +
    '<li> уменьшить ' + mj('q', 2) + ' на единицу. </li></ul><p>Игра</p>';
  assert.equal(
    serialize(body(html)),
    'одно из двух:\n\n- уменьшить $p$ на единицу;\n- уменьшить $q$ на единицу.\n\nИгра'
  );
});

test('нумерованный список', () => {
  assert.equal(serialize(body('<ol><li>a</li><li>b</li></ol>')), '1. a\n2. b');
});

test('абзац внутри пункта списка не отрывается от маркера', () => {
  assert.equal(serialize(body('<ul><li><p>a</p></li><li><p>b</p></li></ul>')), '- a\n\n- b');
});

test('br даёт перевод строки', () => {
  assert.equal(serialize(body('a<br>b')), 'a\nb');
});

test('шапка задачи: двоеточие после названия свойства', () => {
  const html =
    '<div class="header"><div class="title">A. Игра с дробью</div>' +
    '<div class="time-limit"><div class="property-title">ограничение по времени на тест</div>2 секунды</div></div>';
  assert.equal(
    serialize(body(html)),
    'A. Игра с дробью\nограничение по времени на тест: 2 секунды'
  );
});

test('примеры: строки сохраняются, кнопка «Скопировать» пропускается', () => {
  const html =
    '<div class="sample-test"><div class="input"><div class="title">Входные данные' +
    '<div class="input-output-copier">Скопировать</div></div>' +
    '<pre><div class="test-example-line">6</div><div class="test-example-line">4 6</div></pre></div>' +
    '<div class="output"><div class="title">Выходные данные' +
    '<div class="input-output-copier">Скопировать</div></div>' +
    '<pre><div class="test-example-line">Bob</div></pre></div></div>';
  assert.equal(
    serialize(body(html)),
    'Входные данные\n\n6\n4 6\n\nВыходные данные\n\nBob'
  );
});

test('pre без вложенных div сохраняет пробелы и пустые строки', () => {
  assert.equal(serialize(body('<pre>1 2\n  3 4\n\n\n5\n</pre>')), '1 2\n  3 4\n\n\n5');
});

test('режим preformatted для выделения внутри pre', () => {
  const html = '<div class="test-example-line">4  6</div><div class="test-example-line">10 14</div>';
  assert.equal(serialize(body(html), { preformatted: true }), '4  6\n10 14');
});

test('скрытые элементы, стили и обычные скрипты пропускаются', () => {
  const html =
    '<p>a</p><div class="testCaseMarker" style="display: none;">4</div>' +
    '<div style="display:none">x</div><div hidden>y</div>' +
    '<style>p{}</style><script>var z = 1;</script>';
  assert.equal(serialize(body(html)), 'a');
});

test('скрытые элементы внутри pre пропускаются', () => {
  const html =
    '<pre><div class="test-example-line">1<span class="testCaseMarker" style="display:none">MARK</span></div>' +
    '<div class="test-example-line">2<div class="input-output-copier">Скопировать</div></div></pre>';
  assert.equal(serialize(body(html)), '1\n2');
});

test('пустая строка примера сохраняется', () => {
  const html =
    '<pre><div class="test-example-line">3</div><div class="test-example-line"></div>' +
    '<div class="test-example-line">1 2</div></pre>';
  assert.equal(serialize(body(html)), '3\n\n1 2');
  assert.equal(serialize(body(html).firstChild, { preformatted: true }), '3\n\n1 2');
});

test('код с нумерацией строк (pre > ol > li) не склеивается', () => {
  const html = '<pre class="prettyprint linenums"><ol class="linenums"><li>int a;</li><li>a++;</li></ol></pre>';
  assert.equal(serialize(body(html)), 'int a;\na++;');
});

test('элементы форм в текст не попадают', () => {
  const html =
    '<p>a</p><select><option>GNU C++17</option></select><textarea>my code</textarea>' +
    '<button>Send</button><input value="v">';
  assert.equal(serialize(body(html)), 'a');
});

test('старые условия без MathJax: степени и индексы', () => {
  const html =
    '<p><span class="tex-span">1 ≤ <i>a</i><sub class="lower-index"><i>i</i></sub> ≤ 10<sup class="upper-index">9</sup></span>,' +
    ' <span class="tex-span">10<sup class="upper-index">18</sup></span></p>';
  assert.equal(serialize(body(html)), '1 ≤ a_i ≤ 10^9, 10^{18}');
});
