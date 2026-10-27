#!/usr/bin/env node
// Runs Lumora's browser test suites against this checkout.
//   node tests/run.js              all suites
//   node tests/run.js main masks   only these
// Needs Node 18+ and Playwright with Chromium (npm i -D playwright && npx playwright install chromium).
// Starts its own static server; screenshots and temporary files go to tests/.out (not committed).
const http = require('http'), fs = require('fs'), path = require('path'), zlib = require('zlib'), { spawn } = require('child_process');
const ROOT = path.join(__dirname, '..'), FIX = path.join(__dirname, 'fixtures'), OUT = path.join(__dirname, '.out');
const ALL = ['engine', 'main', 'effects', 'masks', 'looks', 'png', 'large-png', 'backup', 'english', 'layout'];
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.jpg': 'image/jpeg' };

// large transparent PNGs for the import test, made here rather than stored (a dark frame, a violet ellipse, a blue edge stripe)
function writePng(file, W, H) {
  if (fs.existsSync(file)) return;
  const raw = Buffer.alloc((W * 4 + 1) * H);
  for (let y = 0; y < H; y++) {
    const row = y * (W * 4 + 1);
    for (let x = 0; x < W; x++) {
      const i = row + 1 + x * 4, ex = (x / W - .5) / .2, ey = (y / H - .5) / .25;
      let c = null;
      if (x < W * .05) c = [125, 211, 252]; else if (ex * ex + ey * ey <= 1) c = [167, 139, 250];
      else if (x > W * .1 && x < W * .9 && y > H * .1 && y < H * .9) c = [31, 34, 40];
      if (c) { raw[i] = c[0]; raw[i + 1] = c[1]; raw[i + 2] = c[2]; raw[i + 3] = 255; }
    }
  }
  const crc = (b) => { let c = ~0; for (const v of b) { c ^= v; for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xEDB88320 : c >>> 1; } return ~c >>> 0; };
  const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 6;
  fs.writeFileSync(file, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 1 })), chunk('IEND', Buffer.alloc(0))]));
}

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const file = p === '/old-test.html' ? path.join(FIX, 'lumora-1x.html') : path.join(ROOT, p === '/' ? 'index.html' : p);
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' }); fs.createReadStream(file).pipe(res);
});
server.listen(0, '127.0.0.1', async () => {
  const url = `http://localhost:${server.address().port}`;
  const want = process.argv.slice(2).length ? process.argv.slice(2) : ALL;
  for (const d of ['', 'shots', 'shots/after', 'shots/premium', 'shots/vp']) fs.mkdirSync(path.join(OUT, d), { recursive: true });
  if (want.includes('large-png')) { writePng(path.join(OUT, 'big24mp.png'), 6000, 4000); writePng(path.join(OUT, 'huge48mp.png'), 8000, 6000); }
  const summary = []; let bad = 0;
  for (const name of want) {
    if (!ALL.includes(name)) { console.error('unknown suite', name); bad++; continue; }
    const t0 = Date.now();
    const out = await new Promise((resolve) => {
      let text = '';
      const ch = spawn(process.execPath, [path.join(__dirname, 'suites', name + '.js')], { env: { ...process.env, LUMORA_URL: url, LUMORA_FIXTURES: FIX, LUMORA_OUT: OUT } });
      ch.stdout.on('data', (d) => { text += d; }); ch.stderr.on('data', (d) => { text += d; });
      ch.on('close', (code) => resolve({ text, code }));
    });
    const last = /(\d+) failed of (\d+)/.exec(out.text);
    const ok = out.code === 0 && last && last[1] === '0';
    if (!ok) { bad++; console.log(out.text.split('\n').filter((l) => !l.startsWith('PASS')).join('\n')); }
    summary.push(`${ok ? 'ok  ' : 'FAIL'}  ${name.padEnd(10)} ${last ? `${last[2] - last[1]}/${last[2]} passed` : 'did not finish'}  (${Math.round((Date.now() - t0) / 1000)} s)`);
    console.log(summary[summary.length - 1]);
  }
  console.log('\n' + summary.join('\n'));
  server.close(); process.exit(bad ? 1 : 0);
});
