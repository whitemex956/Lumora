const { chromium } = require('playwright');
const fs = require('fs'), cp = require('child_process');
const S = process.env.LUMORA_OUT, FIX = process.env.LUMORA_FIXTURES, BASE = process.env.LUMORA_URL, F = FIX + '/';
const res = []; const ok = (n, c, i = '') => res.push([c ? 'PASS' : 'FAIL', n, i]);
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, acceptDownloads: true });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(BASE + '/index.html'); await p.waitForTimeout(800);
  ok('file picker accepts PNG', /image\/png/.test(await p.getAttribute('#pick', 'accept')) && /\.png/.test(await p.getAttribute('#pick', 'accept')));
  ok('empty state mentions PNG', (await p.textContent('#libNotice')).includes('PNG'), await p.textContent('#libNotice'));
  await p.setInputFiles('#pick', [F + 'opaque.png', F + 'transparent.png', F + 'gray16.png']); await p.waitForTimeout(5000);
  ok('3 PNGs imported', (await p.locator('.tile').count()) === 3, await p.textContent('#toast'));
  await p.screenshot({ path: S + '/shots/after/24-png-library.png' });
  const labels = await p.locator('.tile').evaluateAll(ts => ts.map(t => t.getAttribute('aria-label')));
  ok('PNG names become .jpg on import', ['opaque.jpg', 'transparent.jpg', 'gray16.jpg'].every(n => labels.some(l => l.startsWith(n))), labels.join(' | '));
  const stored = await p.evaluate(() => new Promise((res) => { const r = indexedDB.open('revelado'); r.onsuccess = () => { const q = r.result.transaction('photos').objectStore('photos').getAll(); q.onsuccess = async () => res(await Promise.all(q.result.map(async (x) => { const b = new Uint8Array(await x.original.slice(0, 3).arrayBuffer()); return [x.fileName, x.mime, x.original.type, b[0] === 0xFF && b[1] === 0xD8, x.width + 'x' + x.height]; }))); }; }));
  ok('stored originals are JPEG data, not PNG', stored.every(([, m, t2, jpg]) => m === 'image/jpeg' && t2 === 'image/jpeg' && jpg), JSON.stringify(stored));
  ok('full size kept', stored.some(s => s[4] === '1800x2400') && stored.some(s => s[4] === '1200x900') && stored.some(s => s[4] === '1600x1000'));
  const exp = async (name, idx, edit) => {
    await p.click(`.tile[aria-label^="${name}"]`); await p.waitForTimeout(2500);
    if (edit) { await p.click('#adjValue'); await p.keyboard.press('Control+A'); await p.keyboard.type('0.5'); await p.keyboard.press('Enter'); await p.waitForTimeout(300); }
    await p.screenshot({ path: S + `/shots/after/25-png-editor-${idx}.png` });
    await p.click('#moreBtn'); await p.waitForTimeout(400);
    const info = await p.textContent('.sheet .msg'); await p.click('.as-btn.cancel'); await p.waitForTimeout(500);
    await p.click('#exportBtn'); await p.waitForTimeout(2500);
    await p.click('.sheet .btn.primary'); await p.waitForSelector('.ex-preview .done', { timeout: 60000 });
    const [dl] = await Promise.all([p.waitForEvent('download'), p.click('.sheet a[download]')]);
    const path = S + `/png-out-${idx}.jpg`; fs.copyFileSync(await dl.path(), path);
    await p.click('.sheet-nav .btn'); await p.waitForTimeout(500);
    await p.click('#back'); await p.waitForTimeout(2000);
    return { info, path, file: dl.suggestedFilename() };
  };
  const o = await exp('opaque.jpg', 1, true);
  ok('imported PNG now shows as JPG', /· JPG$/.test(o.info), o.info);
  ok('opaque PNG exports as .jpg', /opaque-lumora\.jpg$/.test(o.file), o.file);
  const t = await exp('transparent.jpg', 2, false);
  ok('transparent PNG exports as .jpg', /transparent-lumora\.jpg$/.test(t.file), t.file);
  const g = await exp('gray16.jpg', 3, false);
  ok('16-bit grayscale PNG exports as .jpg', /gray16-lumora\.jpg$/.test(g.file), g.file);
  const py = cp.execSync(`python3 -c "
from PIL import Image
for f in ['${o.path}','${t.path}','${g.path}']:
    im=Image.open(f); print(im.format, im.mode, im.size, im.getpixel((5,5)), im.getpixel((im.width//2, im.height//2)))"`).toString().trim().split('\n');
  ok('outputs are real JPEGs', py.every(l => l.startsWith('JPEG')), py.join(' / '));
  const corner = py[1].match(/\((\d+), (\d+), (\d+)\) \((\d+), (\d+), (\d+)\)$/).slice(1).map(Number);
  ok('transparent area becomes white, not black', corner.slice(0, 3).every(v => v > 245), py[1]);
  ok('opaque content kept (violet circle)', corner[3] > 140 && corner[5] > 200 && corner[4] < corner[5], py[1]);
  ok('transparent PNG thumbnail is white, not black', await p.evaluate(async () => {
    const img = [...document.querySelectorAll('.tile')].find(t => t.getAttribute('aria-label').startsWith('transparent.jpg')).querySelector('img');
    await img.decode(); const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0); const d = g.getImageData(3, 3, 1, 1).data; return d[0] > 240 && d[1] > 240 && d[2] > 240; }));
  await p.reload(); await p.waitForTimeout(1500);
  ok('PNGs persist after reload', (await p.locator('.tile').count()) === 3);
  ok('no errors', errs.length === 0, errs.join(' / '));
  for (const r of res) console.log(r.join('\t'));
  console.log(res.filter(r => r[0] === 'FAIL').length, 'failed of', res.length);
  await b.close();
})().catch(e => { console.error(e); for (const r of res) console.log(r.join('\t')); process.exit(1); });
