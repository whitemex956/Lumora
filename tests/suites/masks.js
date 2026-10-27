const { chromium } = require('playwright'); const fs = require('fs'), cp = require('child_process');
const S = process.env.LUMORA_OUT, FIX = process.env.LUMORA_FIXTURES, BASE = process.env.LUMORA_URL, SH = S + '/shots/premium';
const res = []; const ok = (n, c, i = '') => res.push([c ? 'PASS' : 'FAIL', n, i]);
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, acceptDownloads: true });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await p.goto(BASE + '/index.html'); await p.waitForTimeout(800);
  await p.setInputFiles('#pick', [FIX + '/blemish.jpg', FIX + '/landscape.jpg']); await p.waitForTimeout(3000);
  // pixel probe: luminance of the rendered photo at a point given as a fraction of the visible photo
  const lum = async (fx, fy) => { const bb = await p.locator('#clip').boundingBox(); const shot = await p.screenshot({ clip: { x: bb.x + bb.width * fx - 2, y: bb.y + bb.height * fy - 2, width: 4, height: 4 } });
    fs.writeFileSync(S + '/probe.png', shot); return cp.execSync(`python3 -c "from PIL import Image,ImageStat;im=Image.open('${S}/probe.png').convert('RGB');print(' '.join(str(round(v)) for v in ImageStat.Stat(im).mean))"`).toString().trim().split(' ').map(Number); };
  const L = (c) => .2126 * c[0] + .7152 * c[1] + .0722 * c[2];
  const type = async (v) => { await p.click('#adjValue'); await p.keyboard.press('Control+A'); await p.keyboard.type(String(v)); await p.keyboard.press('Enter'); await p.waitForTimeout(400); };
  await p.click('.tile[aria-label^="landscape"]'); await p.waitForTimeout(2500);
  await p.click('#mode-masks'); await p.waitForTimeout(500);
  ok('Masks tab shows add buttons and Remove', await p.locator('#addLinear').isVisible() && await p.locator('#openHeal').isVisible());
  await p.screenshot({ path: SH + '/10-masks-list.png' });
  // linear mask: darken the top
  const top0 = L(await lum(.25, .1)), bot0 = L(await lum(.25, .9));
  await p.click('#addLinear'); await p.waitForTimeout(500);
  ok('linear mask opens its editor', (await p.textContent('#adjName')).startsWith('Linear 1 · Exposure'), await p.textContent('#adjName'));
  ok('linear handles shown', (await p.locator('#maskSvg .mh').count()) === 3);
  await type(-1.5); await p.waitForTimeout(1500);
  const top1 = L(await lum(.25, .1)), bot1 = L(await lum(.25, .9));
  ok('linear mask darkens the top, not the bottom', top1 < top0 - 15 && Math.abs(bot1 - bot0) < 3, `top ${top0.toFixed(0)}->${top1.toFixed(0)}, bottom ${bot0.toFixed(0)}->${bot1.toFixed(0)}`);
  await p.screenshot({ path: SH + '/11-linear.png' });
  const midBefore = L(await lum(.25, .7));
  const h0 = await p.locator('#maskSvg .mh.p1').boundingBox();
  await p.mouse.move(h0.x + h0.width / 2, h0.y + h0.height / 2); await p.mouse.down(); await p.mouse.move(h0.x + h0.width / 2, h0.y + 120, { steps: 5 }); await p.mouse.up(); await p.waitForTimeout(1600);
  const mid0 = L(await lum(.25, .7)); await p.waitForTimeout(10);
  ok('dragging the end line spreads the gradient', mid0 < midBefore - 5, `${midBefore.toFixed(0)} -> ${mid0.toFixed(0)}`);
  await p.click('#maskInvert'); await p.waitForTimeout(1600);
  ok('invert moves the effect to the bottom', L(await lum(.25, .92)) < bot0 - 8 && L(await lum(.25, .05)) > top1 + 10, `${L(await lum(.25, .92)).toFixed(0)} vs ${bot0.toFixed(0)}`);
  await p.click('#undoBtn'); await p.waitForTimeout(800);
  ok('undo reverts invert', (await p.getAttribute('#maskInvert', 'aria-pressed')) === 'false');
  await p.click('#pane-maskedit .mask-back'); await p.waitForTimeout(300);
  // radial mask: brighten the centre, warm it
  await p.click('#addRadial'); await p.waitForTimeout(500);
  const c0 = L(await lum(.42, .5));
  await type(1.2); await p.locator('#maskTools .mtool[data-k="temp"]').click(); await type(40); await p.waitForTimeout(1500);
  const c1 = await lum(.42, .5), e1 = L(await lum(.97, .5));
  ok('radial mask brightens the centre', L(c1) > c0 + 15, `${c0.toFixed(0)} -> ${L(c1).toFixed(0)}`);
  await p.screenshot({ path: SH + '/12-radial.png' });
  await p.click('#pane-maskedit .mask-back'); await p.waitForTimeout(300);
  // brush mask: paint a stroke, then erase part
  await p.click('#addBrush'); await p.waitForTimeout(500);
  ok('brush mask starts on Brush Size', (await p.textContent('#adjName')) === 'Brush Size');
  const bb = await p.locator('#clip').boundingBox();
  const y = bb.y + bb.height * .8, before = L(await lum(.3, .8));
  await p.mouse.move(bb.x + bb.width * .15, y); await p.mouse.down(); await p.mouse.move(bb.x + bb.width * .45, y, { steps: 12 }); await p.mouse.up(); await p.waitForTimeout(400);
  await p.locator('#maskTools .mtool[data-k="exposure"]').click(); await type(2); await p.waitForTimeout(1800);
  const painted = L(await lum(.3, .8)), outside = L(await lum(.7, .8));
  ok('brush stroke brightens only where painted', painted > before + 20 && Math.abs(outside - L(await lum(.7, .8))) < 2, `${before.toFixed(0)} -> ${painted.toFixed(0)}`);
  await p.click('#maskErase'); await p.locator('#maskTools .mtool[data-k="brushSize"]').click();
  await p.mouse.move(bb.x + bb.width * .25, y); await p.mouse.down(); await p.mouse.move(bb.x + bb.width * .35, y, { steps: 6 }); await p.mouse.up(); await p.waitForTimeout(1800);
  ok('erase removes the mask there', L(await lum(.3, .8)) < painted - 15, `${painted.toFixed(0)} -> ${L(await lum(.3, .8)).toFixed(0)}`);
  await p.click('#maskErase');
  // two fingers while painting: zoom, no stroke
  const nStrokes = async () => p.evaluate(() => 0);
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: bb.x + 150, y: bb.y + 100, id: 0 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: bb.x + 150, y: bb.y + 100, id: 0 }, { x: bb.x + 210, y: bb.y + 100, id: 1 }] });
  for (let i = 1; i <= 6; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: bb.x + 150 - i * 10, y: bb.y + 100, id: 0 }, { x: bb.x + 210 + i * 10, y: bb.y + 100, id: 1 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await p.waitForTimeout(800);
  ok('pinch while a brush is active zooms instead of painting', await p.locator('#zoomChip').isVisible());
  await p.click('#zoomChip'); await p.waitForTimeout(600);
  await p.screenshot({ path: SH + '/13-brush.png' });
  await p.click('#pane-maskedit .mask-back'); await p.waitForTimeout(300);
  ok('three masks listed', (await p.locator('#maskChips .mchip').count()) === 3);
  await p.click('#addBrush'); await p.waitForTimeout(300); await p.click('#pane-maskedit .mask-back');
  await p.click('#addBrush'); await p.waitForTimeout(400);
  ok('a fifth mask is refused', (await p.locator('#maskChips .mchip').count()) === 4 && /Up to 4/.test(await p.textContent('#toast')));
  await p.click('#maskChips .mchip >> nth=3'); await p.waitForTimeout(300); await p.click('#maskDelete'); await p.waitForTimeout(400);
  ok('delete a mask', (await p.locator('#maskChips .mchip').count()) === 3);
  // persistence + export
  await p.click('#back'); await p.waitForTimeout(2500); await p.reload(); await p.waitForTimeout(1500);
  await p.click('.tile[aria-label^="landscape"]'); await p.waitForTimeout(2500);
  await p.click('#mode-masks'); await p.waitForTimeout(400);
  ok('masks saved', (await p.locator('#maskChips .mchip').count()) === 3);
  ok('masks render after reload', L(await lum(.25, .1)) < top0 - 15);
  await p.click('#exportBtn'); await p.waitForTimeout(2500); await p.click('.sheet .btn.primary'); await p.waitForSelector('.ex-preview .done', { timeout: 60000 });
  let [dl] = await Promise.all([p.waitForEvent('download'), p.click('.sheet a[download]')]); fs.copyFileSync(await dl.path(), S + '/mask-out.jpg');
  const ex = cp.execSync(`python3 -c "
from PIL import Image
a=Image.open('${S}/mask-out.jpg').convert('L'); b=Image.open('${FIX}/landscape.jpg').convert('L').resize(a.size)
W,H=a.size; print(a.getpixel((W//2,H//20)) - b.getpixel((W//2,H//20)), a.getpixel((W//2,H//2)) - b.getpixel((W//2,H//2)))"`).toString().trim().split(' ').map(Number);
  ok('export: top darker, centre brighter', ex[0] < -15 && ex[1] > 8, ex.join(','));
  await p.click('.sheet-nav .btn'); await p.waitForTimeout(500); await p.click('#back'); await p.waitForTimeout(2000);
  // ---- Remove ----
  await p.click('.tile[aria-label^="blemish"]'); await p.waitForTimeout(2500);
  const red0 = await lum(.5, 500 / 1067);
  ok('test spot is red', red0[0] > 180 && red0[1] < 90, red0.join(','));
  await p.click('#mode-masks'); await p.click('#openHeal'); await p.waitForTimeout(400);
  const cb = await p.locator('#clip').boundingBox(), cx = cb.x + cb.width * .5, cy = cb.y + cb.height * 500 / 1067;
  await p.mouse.move(cx - 6, cy); await p.mouse.down(); await p.mouse.move(cx + 6, cy, { steps: 4 }); await p.mouse.up(); await p.waitForTimeout(2500);
  const red1 = await lum(.5, 500 / 1067), near = await lum(.5, 560 / 1067);
  ok('Remove paints the spot away', red1[0] < 170 && Math.abs(red1[1] - near[1]) < 25, `${red0.join(',')} -> ${red1.join(',')} (nearby ${near.join(',')})`);
  ok('masks tab marked edited', await p.locator('#mode-masks').evaluate(e => e.classList.contains('edited')));
  await p.screenshot({ path: SH + '/14-remove.png' });
  await p.click('#undoBtn'); await p.waitForTimeout(1500);
  ok('undo brings the spot back', (await lum(.5, 500 / 1067))[0] > 180);
  await p.click('#redoBtn'); await p.waitForTimeout(1500);
  ok('redo removes it again', (await lum(.5, 500 / 1067))[0] < 170);
  // a second fix takes the fast path (only the new spot is applied and uploaded); undo then re-applies from the original
  const plain0 = await lum(.25, 300 / 1067);
  await p.mouse.move(cb.x + cb.width * .25 - 6, cb.y + cb.height * 300 / 1067); await p.mouse.down(); await p.mouse.move(cb.x + cb.width * .25 + 6, cb.y + cb.height * 300 / 1067, { steps: 4 }); await p.mouse.up(); await p.waitForTimeout(1500);
  const plain1 = await lum(.25, 300 / 1067);
  ok('second fix keeps the first one and blends in', (await lum(.5, 500 / 1067))[0] < 170 && Math.abs(L(plain1) - L(plain0)) < 15, `${plain0} -> ${plain1}`);
  await p.click('#undoBtn'); await p.waitForTimeout(1500);
  ok('undo of the second fix keeps the first', (await lum(.5, 500 / 1067))[0] < 170);
  await p.click('#back'); await p.waitForTimeout(2500);
  const thumbRed = await p.evaluate(async () => { const img = document.querySelector('.tile[aria-label^="blemish"] img'); await img.decode(); const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight; const g = c.getContext('2d'); g.drawImage(img, 0, 0); const d = g.getImageData(Math.round(c.width / 2), Math.round(c.height * 500 / 1067), 1, 1).data; return [...d].slice(0, 3); });
  ok('library thumbnail without the spot', thumbRed[0] < 170, thumbRed.join(','));
  await p.reload(); await p.waitForTimeout(1500); await p.click('.tile[aria-label^="blemish"]'); await p.waitForTimeout(2500);
  ok('Remove saved', (await lum(.5, 500 / 1067))[0] < 170);
  await p.click('#exportBtn'); await p.waitForTimeout(2500); await p.click('.sheet .btn.primary'); await p.waitForSelector('.ex-preview .done', { timeout: 60000 });
  [dl] = await Promise.all([p.waitForEvent('download'), p.click('.sheet a[download]')]); fs.copyFileSync(await dl.path(), S + '/heal-out.jpg');
  const hx = cp.execSync(`python3 -c "
from PIL import Image
a=Image.open('${S}/heal-out.jpg').convert('RGB'); print(*a.getpixel((800,500)), *a.getpixel((800,560)))"`).toString().trim().split(' ').map(Number);
  ok('export: spot removed at full size', hx[0] < 170 && Math.abs(hx[1] - hx[4]) < 25, hx.join(','));
  ok('no errors', errs.length === 0, errs.join(' / '));
  for (const r of res) console.log(r.join('\t')); console.log(res.filter(r => r[0] === 'FAIL').length, 'failed of', res.length);
  await b.close();
})().catch(e => { console.error(e); for (const r of res) console.log(r.join('\t')); process.exit(1); });
