// Tone Curve (Light > Curve) and the histogram
const { chromium } = require('playwright'); const fs = require('fs'), cp = require('child_process');
const S = process.env.LUMORA_OUT, FIX = process.env.LUMORA_FIXTURES, BASE = process.env.LUMORA_URL, SH = S + '/shots/premium';
const res = []; const ok = (n, c, i = '') => res.push([c ? 'PASS' : 'FAIL', n, i]);
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, acceptDownloads: true });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await p.goto(BASE + '/index.html'); await p.waitForTimeout(800);
  await p.setInputFiles('#pick', [FIX + '/landscape.jpg', FIX + '/portrait.jpg']); await p.waitForTimeout(3000);
  await p.click('.tile[aria-label^="landscape"]'); await p.waitForTimeout(2500);
  const lum = async (fx, fy) => { const bb = await p.locator('#clip').boundingBox(); const shot = await p.screenshot({ clip: { x: bb.x + bb.width * fx - 2, y: bb.y + bb.height * fy - 2, width: 4, height: 4 } });
    fs.writeFileSync(S + '/probe-c.png', shot); return +cp.execSync(`python3 -c "from PIL import Image,ImageStat;print(round(ImageStat.Stat(Image.open('${S}/probe-c.png').convert('L')).mean[0]))"`).toString(); };
  ok('Curve button in the Light row', await p.locator('#open-curve').isVisible());
  const mid0 = await lum(.25, .35);
  await p.click('#open-curve'); await p.waitForTimeout(800);
  ok('curve editor opens over the photo', await p.locator('#curveBox').isVisible() && (await p.textContent('#adjName')) === 'Tone Curve');
  ok('ruler hidden, hint shown', await p.locator('#ruler').evaluate((e) => e.classList.contains('off')) && /Tap to add a point/.test(await p.textContent('#rulerHint')));
  const box = await p.locator('#curveCv').boundingBox(), pad = box.width * .04, iw = box.width - 2 * pad;
  const at = (x, y) => [box.x + pad + x * iw, box.y + pad + (1 - y) * iw];
  // lift the midtones: tap the curve at 0.5, drag up to 0.7
  let [x, y] = at(.5, .5); await p.mouse.move(x, y); await p.mouse.down(); [x, y] = at(.5, .7); await p.mouse.move(x, y, { steps: 6 }); await p.mouse.up(); await p.waitForTimeout(1500);
  ok('point readout', /^\d+ → \d+/.test((await p.textContent('#adjValue')).trim()), await p.textContent('#adjValue'));
  await p.screenshot({ path: SH + '/40-curve.png' });
  await p.click('#pane-curve .sub-back'); await p.waitForTimeout(800);
  const mid1 = await lum(.25, .35);
  ok('lifting the curve brightens the midtones', mid1 > mid0 + 15, `${mid0} -> ${mid1}`);
  ok('Curve button marked edited', await p.locator('#open-curve .arc').evaluate((e) => e.style.visibility === 'visible'));
  ok('Light tab marked edited', await p.locator('#mode-light').evaluate((e) => e.classList.contains('edited')));
  // remove a point by dragging it off the box
  await p.click('#open-curve'); await p.waitForTimeout(500);
  [x, y] = at(.5, .7); await p.mouse.move(x, y); await p.mouse.down(); await p.mouse.move(x, box.y + box.height + 60, { steps: 6 }); await p.mouse.up(); await p.waitForTimeout(1200);
  await p.click('#pane-curve .sub-back'); await p.waitForTimeout(800);
  const mid2 = await lum(.25, .35);
  ok('dragging a point off removes it', Math.abs(mid2 - mid0) < 8, `${mid0} / ${mid2}`);
  await p.click('#undoBtn'); await p.waitForTimeout(1200);
  ok('undo brings the point back', (await lum(.25, .35)) > mid0 + 15);
  // red channel: pull red down
  await p.click('#open-curve'); await p.waitForTimeout(500); await p.click('#curveCh button[data-ch="r"]');
  [x, y] = at(.6, .6); await p.mouse.move(x, y); await p.mouse.down(); [x, y] = at(.6, .4); await p.mouse.move(x, y, { steps: 5 }); await p.mouse.up(); await p.waitForTimeout(1200);
  await p.screenshot({ path: SH + '/41-curve-red.png' });
  await p.click('#pane-curve .sub-back'); await p.waitForTimeout(800);
  // export and reload
  await p.click('#exportBtn'); await p.waitForTimeout(2500); await p.click('.sheet .btn.primary'); await p.waitForSelector('.ex-preview .done', { timeout: 60000 });
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('.sheet a[download]')]); fs.copyFileSync(await dl.path(), S + '/curve-out.jpg');
  const d = cp.execSync(`python3 -c "
from PIL import Image
a=Image.open('${S}/curve-out.jpg').convert('L'); b=Image.open('${FIX}/landscape.jpg').convert('L').resize(a.size)
W,H=a.size; print(a.getpixel((W//4,int(H*.35))) - b.getpixel((W//4,int(H*.35))))"`).toString().trim();
  ok('export carries the curve', +d > 12, 'brighter by ' + d);
  await p.click('.sheet-nav .btn'); await p.waitForTimeout(500);
  await p.click('#back'); await p.waitForTimeout(2500); await p.reload(); await p.waitForTimeout(1500);
  await p.click('.tile[aria-label^="landscape"]'); await p.waitForTimeout(2500);
  ok('curve saved', (await lum(.25, .35)) > mid0 + 15);
  // histogram
  await p.click('#moreBtn'); await p.waitForTimeout(400); await p.click('.as-btn >> text=Show Histogram'); await p.waitForTimeout(1500);
  ok('histogram shows', await p.locator('#histo').isVisible());
  const hb = await p.locator('#histo').boundingBox(), cb = await p.locator('#clip').boundingBox();
  ok('histogram sits inside the photo area', hb.x >= cb.x - 1 && hb.y >= cb.y - 1, JSON.stringify(hb));
  const lit = await p.evaluate(() => { const c = document.getElementById('histo'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 40) n++; return n; });
  ok('histogram drawn', lit > 500, lit + ' px');
  await p.screenshot({ path: SH + '/42-histogram.png' });
  await p.click('#mode-crop'); await p.waitForTimeout(400);
  ok('histogram hidden while cropping', !(await p.locator('#histo').isVisible()));
  await p.click('#mode-light'); await p.waitForTimeout(400);
  await p.evaluate(() => document.activeElement.blur()); await p.keyboard.press('h'); await p.waitForTimeout(300);
  ok('H hides it', !(await p.locator('#histo').isVisible()));
  await p.click('#back'); await p.waitForTimeout(2000); await p.click('.tile[aria-label^="portrait"]'); await p.waitForTimeout(2000);
  ok('histogram preference kept off', !(await p.locator('#histo').isVisible()));
  ok('no errors', errs.length === 0, errs.join(' / '));
  for (const r of res) console.log(r.join('\t')); console.log(res.filter((r) => r[0] === 'FAIL').length, 'failed of', res.length);
  await b.close();
})().catch((e) => { console.error(e); for (const r of res) console.log(r.join('\t')); process.exit(1); });
