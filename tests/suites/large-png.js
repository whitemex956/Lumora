const { chromium } = require('playwright');
const fs = require('fs'), cp = require('child_process');
const S = process.env.LUMORA_OUT, FIX = process.env.LUMORA_FIXTURES, BASE = process.env.LUMORA_URL, F = FIX + '/';
const res = []; const ok = (n, c, i = '') => res.push([c ? 'PASS' : 'FAIL', n, i]);
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, acceptDownloads: true });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(BASE + '/index.html'); await p.waitForTimeout(800);
  const t0 = Date.now();
  await p.setInputFiles('#pick', [S + '/big24mp.png', S + '/huge48mp.png']);
  await p.waitForFunction(() => document.querySelectorAll('.tile').length === 2, null, { timeout: 120000 });
  ok('two large PNGs imported', true, `${((Date.now() - t0) / 1000).toFixed(1)} s for both in this container`);
  const stored = await p.evaluate(() => new Promise((res) => { const r = indexedDB.open('revelado'); r.onsuccess = () => { const q = r.result.transaction('photos').objectStore('photos').getAll(); q.onsuccess = async () => res(await Promise.all(q.result.map(async (x) => { const bb = new Uint8Array(await x.original.slice(0, 3).arrayBuffer()); return { name: x.fileName, mime: x.mime, jpg: bb[0] === 0xFF && bb[1] === 0xD8, w: x.width, h: x.height, kb: Math.round(x.original.size / 1024) }; }))); }; }));
  for (const s of stored) {
    ok(`${s.name}: stored as JPEG`, s.mime === 'image/jpeg' && s.jpg, JSON.stringify(s));
    ok(`${s.name}: under Safari's 16.7 MP canvas limit, aspect kept`, s.w * s.h <= 16777216 && Math.abs(s.w / s.h - (s.name.startsWith('big') ? 1.5 : 4 / 3)) < .01, `${s.w}×${s.h} = ${(s.w * s.h / 1e6).toFixed(1)} MP`);
  }
  for (const name of ['big24mp.jpg', 'huge48mp.jpg']) {
    await p.click(`.tile[aria-label^="${name}"]`); await p.waitForTimeout(3000);
    ok(`${name}: opens in editor`, await p.locator('#view').isVisible());
    await p.click('#exportBtn'); await p.waitForTimeout(2500);
    const est = await p.textContent('.sheet .facts.big');
    await p.click('.sheet .btn.primary'); await p.waitForSelector('.ex-preview .done', { timeout: 120000 });
    const act = await p.textContent('.sheet .facts.big');
    const [dl] = await Promise.all([p.waitForEvent('download'), p.click('.sheet a[download]')]);
    const out = `${S}/big-out-${name}`; fs.copyFileSync(await dl.path(), out);
    const py = cp.execSync(`python3 -c "
from PIL import Image
im=Image.open('${out}'); W,H=im.size
print(im.format, W, H, im.getpixel((W//2,H//2)), im.getpixel((int(W*.07),int(H*.05))), im.getpixel((int(W*.02),H//2)))"`).toString().trim();
    const [fmt, W, H] = py.split(' ');
    const m = py.match(/\((\d+), (\d+), (\d+)\) \((\d+), (\d+), (\d+)\) \((\d+), (\d+), (\d+)\)$/).slice(1).map(Number);
    ok(`${name}: export is a JPEG at the stored size`, fmt === 'JPEG' && act.includes(`${W} × ${H}`), `${dl.suggestedFilename()} · ${act} · estimate was: ${est.split('·').pop().trim()}`);
    ok(`${name}: transparent area white`, m.slice(3, 6).every(v => v > 245), py);
    ok(`${name}: violet centre and blue edge stripe kept`, m[2] > 200 && m[0] > 130 && m[8] > 200 && m[7] > 180, py);
    await p.click('.sheet-nav .btn'); await p.waitForTimeout(500);
    await p.click('#back'); await p.waitForTimeout(2500);
  }
  ok('no errors', errs.length === 0, errs.join(' / '));
  await p.screenshot({ path: S + '/shots/after/26-big-png-library.png' });
  for (const r of res) console.log(r.join('\t'));
  console.log(res.filter(r => r[0] === 'FAIL').length, 'failed of', res.length);
  await b.close();
})().catch(e => { console.error(e); for (const r of res) console.log(r.join('\t')); process.exit(1); });
