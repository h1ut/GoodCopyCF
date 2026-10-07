// Собирает архив для Chrome Web Store и addons.mozilla.org.
import AdmZip from 'adm-zip';
import { mkdirSync, readFileSync } from 'node:fs';

const manifest = JSON.parse(readFileSync('manifest.json', 'utf8'));
const zip = new AdmZip();
zip.addLocalFile('manifest.json');
zip.addLocalFolder('src', 'src');
zip.addLocalFolder('icons', 'icons');

mkdirSync('dist', { recursive: true });
const target = `dist/goodcopycf-${manifest.version}.zip`;
zip.writeZip(target);
console.log(target);
