const { chromium } = require('playwright'); const fs = require('fs'), cp = require('child_process');
const S = process.env.LUMORA_OUT, FIX = process.env.LUMORA_FIXTURES, BASE = process.env.LUMORA_URL, SH = S + '/shots/premium'; fs.mkdirSync(SH, { recursive: true });
const res = []; const ok = (n, c, i = '') => res.push([c ? 'PASS' : 'FAIL', n, i]);
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, acceptDownloads: true });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await p.goto(BASE + '/index.html'); await p.waitForTimeout(800);
  await p.setInputFiles('#pick', [FIX + '/noisy.jpg', FIX + '/portrait.jpg']); await p.waitForTimeout(3000);
  await p.click('.tile[aria-label^="noisy"]'); await p.waitForTimeout(2500);
  const val = async () => +(await p.getAttribute('#ruler', 'aria-valuenow'));
  const drag = async (dx) => { const r = await p.locator('#ruler').boundingBox(); await p.mouse.move(r.x + r.width / 2, r.y + 20); await p.mouse.down(); await p.mouse.move(r.x + r.width / 2 + dx, r.y + 20, { steps: 6 }); await p.mouse.up(); await p.waitForTimeout(300); };
  const type = async (v) => { await p.click('#adjValue'); await p.keyboard.press('Control+A'); await p.keyboard.type(String(v)); await p.keyboard.press('Enter'); await p.waitForTimeout(300); };
  ok('six tabs', (await p.locator('#tabbar .tab').count()) === 6, (await p.locator('#tabbar .tab').allTextContents()).join(' | '));
  await p.click('#mode-effects'); await p.waitForTimeout(600);
  const tools = await p.locator('#row-effects .tool[data-key]').evaluateAll(a => a.map(x => x.dataset.key));
  ok('Effects tools', tools.join(',') === 'clarity,texture,dehaze,vignette,grain,grainSize,sharpen,noise,lensVig,fringe,distortion,lensBlur', tools.join(','));
  ok('Effects opens on Clarity', (await p.textContent('#adjName')) === 'Clarity');
  await drag(-160); ok('ruler sets Clarity', (await val()) === 50, String(await val()));
  ok('Effects tab marked edited', await p.locator('#mode-effects').evaluate(e => e.classList.contains('edited')));
  for (const [k, v] of [['dehaze', 30], ['vignette', -40], ['grain', 35], ['sharpen', 40], ['noise', 50]]) { await p.click('#adj-' + k); await p.waitForTimeout(250); await type(v); }
  ok('typed values on several effects', (await val()) === 50 && (await p.textContent('#adjName')) === 'Noise Reduction');
  await p.screenshot({ path: SH + '/01-effects.png' });
  // lens blur
  await p.click('#adj-lensBlur'); await p.waitForTimeout(500);
  ok('focus control appears for Lens Blur', await p.locator('#focus').isVisible());
  await type(80);
  const f0 = await p.locator('#focus').boundingBox();
  await p.mouse.move(f0.x + f0.width / 2, f0.y + f0.height / 2); await p.mouse.down(); await p.mouse.move(f0.x + f0.width / 2 + 60, f0.y + f0.height / 2 + 40, { steps: 5 }); await p.mouse.up(); await p.waitForTimeout(300);
  const f1 = await p.locator('#focus').boundingBox();
  ok('drag moves the focus point', Math.abs(f1.x - f0.x - 60) < 3 && Math.abs(f1.y - f0.y - 40) < 3, `${f0.x},${f0.y} -> ${f1.x},${f1.y}`);
  await p.mouse.move(f1.x + f1.width - 2, f1.y + f1.height / 2); await p.mouse.down(); await p.mouse.move(f1.x + f1.width + 40, f1.y + f1.height / 2, { steps: 5 }); await p.mouse.up(); await p.waitForTimeout(300);
  const f2 = await p.locator('#focus').boundingBox();
  ok('drag the ring resizes the focus area', f2.width > f1.width + 30, `${f1.width} -> ${f2.width}`);
  await p.screenshot({ path: SH + '/02-lens-blur.png' });
  await p.click('#undoBtn'); await p.waitForTimeout(300);
  ok('undo covers focus changes', Math.abs((await p.locator('#focus').boundingBox()).width - f1.width) < 2);
  await p.click('#redoBtn'); await p.waitForTimeout(300);
  await p.click('#adj-clarity'); await p.waitForTimeout(300);
  ok('focus control hides for other tools', !(await p.locator('#focus').isVisible()));
  // color mixer
  await p.click('#mode-color'); await p.waitForTimeout(500);
  await p.click('#open-mixer'); await p.waitForTimeout(500);
  ok('Mixer panel opens', await p.locator('#pane-mixer').evaluate(e => !e.classList.contains('out')));
  ok('Mixer starts on Red · Hue', (await p.textContent('#adjName')) === 'Red · Hue', await p.textContent('#adjName'));
  await p.click('#mixSwatches .swatch >> nth=5'); await p.click('#mixAttr button[data-a="S"]'); await p.waitForTimeout(200);
  ok('pick Blue · Saturation', (await p.textContent('#adjName')) === 'Blue · Saturation');
  await type(-80);
  await p.click('#mixSwatches .swatch >> nth=1'); await p.click('#mixAttr button[data-a="H"]'); await type(40);
  ok('edited swatches marked', (await p.locator('#mixSwatches .swatch.edited').count()) === 2);
  await p.screenshot({ path: SH + '/03-mixer.png' });
  await p.click('#pane-mixer .sub-back'); await p.waitForTimeout(400);
  ok('back returns to Color tools', (await p.textContent('#adjName')) === 'Temperature' && await p.locator('#row-color').evaluate(e => !e.classList.contains('out')));
  // grading
  await p.click('#open-grading'); await p.waitForTimeout(400);
  ok('Grading opens on Shadows · Hue', (await p.textContent('#adjName')) === 'Shadows · Hue', await p.textContent('#adjName'));
  await type(200); await p.click('#gradeAttr button[data-a="S"]'); await type(60);
  await p.click('#gradeRegions .chip[data-r="Hi"]'); await p.click('#gradeAttr button[data-a="H"]'); await type(35);
  await p.click('#gradeAttr button[data-a="S"]'); await type(50);
  await p.click('#gradeRegions .chip[data-r="Bal"]'); await p.waitForTimeout(200);
  ok('Balance has no hue/sat switch', (await p.locator('#gradeAttr').evaluate(e => getComputedStyle(e).visibility)) === 'hidden' && (await p.textContent('#adjName')) === 'Balance');
  await p.click('#gradeRegions .chip[data-r="Sh"]'); await p.click('#gradeAttr button[data-a="H"]'); await p.waitForTimeout(200);
  ok('hue value shown in degrees', (await p.textContent('#adjValue')).trim() === '200°', await p.textContent('#adjValue'));
  await p.screenshot({ path: SH + '/04-grading.png' });
  // persistence
  await p.click('#back'); await p.waitForTimeout(2500); await p.reload(); await p.waitForTimeout(1500);
  await p.click('.tile[aria-label^="noisy"]'); await p.waitForTimeout(2500);
  ok('Effects edits saved', await p.locator('#mode-effects').evaluate(e => e.classList.contains('edited')));
  await p.click('#mode-color'); await p.click('#open-mixer'); await p.click('#mixSwatches .swatch >> nth=5'); await p.click('#mixAttr button[data-a="S"]'); await p.waitForTimeout(300);
  ok('Mixer edits saved', (await val()) === -80);
  await p.click('#pane-mixer .sub-back');
  await p.click('#mode-effects'); await p.click('#adj-lensBlur'); await p.waitForTimeout(500);
  ok('Lens blur focus saved', Math.abs((await p.locator('#focus').boundingBox()).x - f2.x) < 3);
  // export contains the effects
  await p.click('#exportBtn'); await p.waitForTimeout(2500); await p.click('.sheet .btn.primary'); await p.waitForSelector('.ex-preview .done', { timeout: 60000 });
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('.sheet a[download]')]); fs.copyFileSync(await dl.path(), S + '/premium-out.jpg');
  const diff = cp.execSync(`python3 -c "
from PIL import Image, ImageChops, ImageStat
a=Image.open('${S}/premium-out.jpg').convert('RGB'); b=Image.open('${FIX}/noisy.jpg').convert('RGB').resize(a.size)
print(round(sum(ImageStat.Stat(ImageChops.difference(a,b)).mean)/3,1))"`).toString().trim();
  ok('export carries the new effects', +diff > 8, 'mean diff ' + diff);
  await p.click('.sheet-nav .btn'); await p.waitForTimeout(500);
  // copy/paste effects to the other photo
  await p.click('#moreBtn'); await p.waitForTimeout(400); await p.click('.as-btn >> text=Copy adjustments'); await p.waitForTimeout(500);
  ok('copy sheet has Effects', await p.locator('#cpEffects').isVisible());
  await p.click('.sheet .btn.primary'); await p.waitForTimeout(500);
  await p.click('#back'); await p.waitForTimeout(2500);
  await p.click('.tile[aria-label^="portrait"]'); await p.waitForTimeout(2500);
  await p.click('#moreBtn'); await p.waitForTimeout(400); await p.click('.as-btn >> text=Paste adjustments'); await p.waitForTimeout(500);
  await p.click('#mode-effects'); await p.waitForTimeout(400); await p.click('#adj-clarity'); await p.waitForTimeout(300);
  ok('paste brings Effects to another photo', (await val()) === 50 && await p.locator('#mode-effects').evaluate(e => e.classList.contains('edited')));
  await p.click('#mode-color'); await p.click('#open-grading'); await p.waitForTimeout(300);
  ok('paste brings Grading too', (await p.textContent('#adjValue')).trim() === '200°');
  await p.screenshot({ path: SH + '/05-pasted.png' });
  // keyboard: 3 = Effects
  await p.click('#pane-grading .sub-back'); await p.evaluate(() => document.activeElement.blur()); await p.keyboard.press('3'); await p.waitForTimeout(300);
  ok('shortcut 3 opens Effects', (await p.getAttribute('#mode-effects', 'aria-selected')) === 'true');
  ok('no errors', errs.length === 0, errs.join(' / '));
  for (const r of res) console.log(r.join('\t')); console.log(res.filter(r => r[0] === 'FAIL').length, 'failed of', res.length);
  await b.close();
})().catch(e => { console.error(e); for (const r of res) console.log(r.join('\t')); process.exit(1); });
