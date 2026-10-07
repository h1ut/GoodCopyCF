'use strict';

const { JSDOM } = require('jsdom');

// Возвращает <body> нового документа с заданной разметкой.
function body(html) {
  return new JSDOM('<!DOCTYPE html><body>' + html + '</body>').window.document.body;
}

// Формула в том виде, в каком её оставляет в DOM MathJax 2 на Codeforces.
function mj(tex, id = 1) {
  return (
    '<span class="MathJax_Preview"></span>' +
    `<span class="MathJax" id="MathJax-Element-${id}-Frame">` +
    '<nobr aria-hidden="true"><span class="math">RENDERED</span></nobr>' +
    '<span class="MJX_Assistive_MathML"><math><mi>ASSIST</mi></math></span>' +
    '</span>' +
    `<script type="math/tex" id="MathJax-Element-${id}">${tex}</script>`
  );
}

module.exports = { body, mj };
