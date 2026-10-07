'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.join(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(rootDir, 'manifest.json'), 'utf8'));

test('манифест: MV3, только Codeforces, без прав', () => {
  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.permissions, undefined);
  assert.equal(manifest.host_permissions, undefined);
  assert.deepEqual(manifest.content_scripts[0].matches, [
    'https://codeforces.com/*',
    'https://*.codeforces.com/*',
  ]);
});

test('манифест: скрипты существуют и идут в порядке зависимостей', () => {
  const scripts = manifest.content_scripts[0].js;
  assert.deepEqual(scripts, ['src/serialize.js', 'src/selection.js', 'src/content.js']);
  for (const file of scripts) assert.ok(fs.existsSync(path.join(rootDir, file)), file);
});

test('манифест: версия совпадает с package.json', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
  assert.equal(manifest.version, pkg.version);
});
