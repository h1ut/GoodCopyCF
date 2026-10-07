// Рисует иконки расширения без внешних зависимостей: синий скруглённый
// квадрат с двумя листами («копирование»).
import { deflateSync, crc32 } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';

function chunk(type, data) {
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const out = Buffer.alloc(body.length + 8);
  out.writeUInt32BE(data.length, 0);
  body.copy(out, 4);
  out.writeUInt32BE(crc32(body), body.length + 4);
  return out;
}

function inRoundRect(u, v, x0, y0, x1, y1, r) {
  if (u < x0 || u > x1 || v < y0 || v > y1) return false;
  const cx = Math.min(Math.max(u, x0 + r), x1 - r);
  const cy = Math.min(Math.max(v, y0 + r), y1 - r);
  return (u - cx) ** 2 + (v - cy) ** 2 <= r * r;
}

// Цвет точки (u, v) в единичном квадрате: [r, g, b, a].
function sample(u, v) {
  if (!inRoundRect(u, v, 0, 0, 1, 1, 0.2)) return [0, 0, 0, 0];
  if (inRoundRect(u, v, 0.2, 0.36, 0.62, 0.84, 0.05)) return [255, 255, 255, 255];
  if (inRoundRect(u, v, 0.38, 0.16, 0.8, 0.64, 0.05)) return [158, 197, 247, 255];
  return [31, 111, 235, 255];
}

function png(size) {
  const grid = 4; // сглаживание: 4x4 точки на пиксель
  const stride = size * 4 + 1;
  const raw = Buffer.alloc(size * stride);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < grid; sy++) {
        for (let sx = 0; sx < grid; sx++) {
          const [pr, pg, pb, pa] = sample((x + (sx + 0.5) / grid) / size, (y + (sy + 0.5) / grid) / size);
          r += pr * pa; g += pg * pa; b += pb * pa; a += pa;
        }
      }
      const offset = y * stride + 1 + x * 4;
      if (a > 0) {
        raw[offset] = Math.round(r / a);
        raw[offset + 1] = Math.round(g / a);
        raw[offset + 2] = Math.round(b / a);
      }
      raw[offset + 3] = Math.round(a / (grid * grid));
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // бит на канал
  header[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync('icons', { recursive: true });
for (const size of [16, 48, 128]) {
  writeFileSync(`icons/icon-${size}.png`, png(size));
  console.log(`icons/icon-${size}.png`);
}
