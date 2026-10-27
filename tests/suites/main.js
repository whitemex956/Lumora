const { chromium } = require('playwright');
const S = process.env.LUMORA_OUT, FIX = process.env.LUMORA_FIXTURES, BASE = process.env.LUMORA_URL, SH = S + '/shots/after';
const results = []; const ok = (name, cond, info = '') => { results.push([cond ? 'PASS' : 'FAIL', name, info]); };
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, colorScheme: 'dark', locale: 'es-ES', acceptDownloads: true });
  const p = await ctx.newPage();
  const errs = [], ext = [];
  p.on('console', m => m.type() === 'error' && errs.push(m.text())); p.on('pageerror', e => errs.push(e.message));
  p.on('request', r => { if (!r.url().startsWith(BASE) && !r.url().startsWith('blob:') && !r.url().startsWith('data:')) ext.push(r.url()); });
  // ---- 1. data written by Lumora 1.x
  await p.goto(BASE + '/old-test.html'); await p.waitForTimeout(700);
  await p.setInputFiles('#pick', [FIX + '/landscape.jpg', FIX + '/portrait.jpg', FIX + '/square.jpg']);
  await p.waitForTimeout(3000);
  await p.click('.tile >> nth=2'); await p.waitForTimeout(1500);   // oldest = landscape
  const rb = await p.locator('#ruler').boundingBox();
  await p.mouse.move(rb.x + rb.width / 2, rb.y + 20); await p.mouse.down(); await p.mouse.move(rb.x + rb.width / 2 - 80, rb.y + 20, { steps: 8 }); await p.mouse.up();
  const oldVal = await p.textContent('#adjValue');
  await p.click('#mode-presets'); await p.waitForTimeout(600);
  await p.click('.ptile.add'); await p.waitForTimeout(300); await p.fill('#presetName', 'Viejo'); await p.click('.sheet-nav .btn-text.strong'); await p.waitForTimeout(500);
  await p.click('#back'); await p.waitForTimeout(1500);
  // ---- open 2.0
  ext.length = 0;
  await p.goto(BASE + '/index.html'); await p.waitForTimeout(1500);
  const tiles = await p.locator('.tile').count();
  ok('1.x photos still listed after upgrade', tiles === 3, `${tiles} tiles`);
  const labels = await p.locator('.tile').evaluateAll(ts => ts.map(t => t.getAttribute('aria-label')));
  ok('1.x edit flag kept (editada)', labels.some(l => /edited/.test(l)), labels.join(' | '));
  await p.screenshot({ path: SH + '/02-library-dark.png' });
  // open the edited photo (landscape)
  const editedIdx = labels.findIndex(l => /edited/.test(l));
  await p.click(`.tile >> nth=${editedIdx}`); await p.waitForTimeout(2200);
  const newVal = await p.textContent('#adjValue');
  ok('1.x exposure value restored', parseFloat(newVal.replace(',', '.').replace('−', '-')) === parseFloat(oldVal.replace(',', '.').replace('−', '-')), `old ${oldVal} new ${newVal}`);
  await p.screenshot({ path: SH + '/03-editor-light.png' });
  // ---- ruler
  const r = await p.locator('#ruler').boundingBox(); const cy = r.y + r.height / 2;
  const v0 = +(await p.getAttribute('#ruler', 'aria-valuenow'));
  await p.mouse.move(r.x + r.width / 2, cy); await p.mouse.down(); await p.mouse.move(r.x + r.width / 2 - 80, cy, { steps: 10 }); await p.mouse.up();
  const v1 = +(await p.getAttribute('#ruler', 'aria-valuenow'));
  ok('ruler drag changes exposure', Math.abs(v1 - v0 - 1) < 0.06, `${v0} -> ${v1}`);
  await p.click('#fineBtn');
  await p.mouse.move(r.x + r.width / 2, cy); await p.mouse.down(); await p.mouse.move(r.x + r.width / 2 - 80, cy, { steps: 10 }); await p.mouse.up();
  const v2 = +(await p.getAttribute('#ruler', 'aria-valuenow'));
  ok('fine mode moves 5x slower', Math.abs(v2 - v1 - 0.2) < 0.06, `${v1} -> ${v2}`);
  ok('fine tag shown', (await p.locator('#adjValue .fine-tag').count()) === 1);
  await p.click('#fineBtn');
  await p.click('#undoBtn'); const u = +(await p.getAttribute('#ruler', 'aria-valuenow'));
  ok('undo', u === v1, `${u}`);
  await p.click('#redoBtn'); const rd = +(await p.getAttribute('#ruler', 'aria-valuenow'));
  ok('redo', rd === v2, `${rd}`);
  ok('reset button visible when edited', !(await p.locator('#resetBtn').evaluate(e => e.classList.contains('gone'))));
  await p.click('#resetBtn'); await p.waitForTimeout(100);
  ok('reset button resets to 0', +(await p.getAttribute('#ruler', 'aria-valuenow')) === 0);
  await p.mouse.move(r.x + r.width / 2, cy); await p.mouse.down(); await p.mouse.move(r.x + r.width / 2 - 40, cy, { steps: 6 }); await p.mouse.up(); await p.waitForTimeout(2500);
  await p.mouse.click(r.x + r.width / 2, cy); await p.mouse.click(r.x + r.width / 2, cy);
  ok('double-tap ruler resets', +(await p.getAttribute('#ruler', 'aria-valuenow')) === 0, await p.getAttribute('#ruler', 'aria-valuenow'));
  // snap to zero
  await p.mouse.move(r.x + r.width / 2, cy); await p.mouse.down(); await p.mouse.move(r.x + r.width / 2 - 3, cy, { steps: 3 }); await p.mouse.up();
  ok('detent snaps small moves to zero', +(await p.getAttribute('#ruler', 'aria-valuenow')) === 0);
  // tool selection + keyboard
  await p.click('#adj-contrast'); await p.waitForTimeout(500);
  ok('tap selects tool', (await p.textContent('#adjName')) === 'Contrast');
  await p.focus('#ruler'); await p.keyboard.press('ArrowRight'); await p.keyboard.press('ArrowRight'); await p.keyboard.up('ArrowRight');
  ok('keyboard adjusts value', +(await p.getAttribute('#ruler', 'aria-valuenow')) === 2);
  // Auto
  await p.click('#autoBtn'); await p.waitForTimeout(500);
  ok('Auto toggles on', (await p.getAttribute('#autoBtn', 'aria-pressed')) === 'true');
  await p.click('#autoBtn'); await p.waitForTimeout(400);
  ok('Auto toggles off', (await p.getAttribute('#autoBtn', 'aria-pressed')) === 'false');
  ok('light tab shows edited dot', await p.locator('#mode-light').evaluate(e => e.classList.contains('edited')));
  // ---- gestures
  const st = await p.locator('#view').boundingBox(); const sx = st.x + st.width / 2, sy = st.y + st.height / 2;
  await p.mouse.move(sx, sy); await p.mouse.down(); await p.waitForTimeout(450);
  ok('touch-and-hold shows original', await p.locator('#origBadge').isVisible());
  await p.screenshot({ path: SH + '/08-hold-compare.png' });
  await p.mouse.up(); await p.waitForTimeout(100);
  ok('release hides original', !(await p.locator('#origBadge').isVisible()));
  // type an exact value, then before/after split
  await p.click('#adj-exposure'); await p.waitForTimeout(400);
  await p.click('#adjValue'); await p.keyboard.press('Control+A'); await p.keyboard.type('1.5'); await p.keyboard.press('Enter'); await p.waitForTimeout(300);
  ok('typed exact value', +(await p.getAttribute('#ruler', 'aria-valuenow')) === 1.5, await p.getAttribute('#ruler', 'aria-valuenow'));
  await p.click('#adjValue'); await p.keyboard.press('Control+A'); await p.keyboard.type('99'); await p.keyboard.press('Enter'); await p.waitForTimeout(300);
  ok('typed value is clamped to range', +(await p.getAttribute('#ruler', 'aria-valuenow')) === 4);
  await p.click('#adjValue'); await p.keyboard.press('Control+A'); await p.keyboard.type('1.5'); await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  ok('Escape cancels typing', +(await p.getAttribute('#ruler', 'aria-valuenow')) === 4);
  await p.click('#adjValue'); await p.keyboard.press('Control+A'); await p.keyboard.type('1.5'); await p.keyboard.press('Enter'); await p.waitForTimeout(1500);
  const px = async (x, y) => { const b = await p.screenshot({ clip: { x, y, width: 1, height: 1 } }); const { PNG } = { PNG: null }; return b; };
  const sh0 = await p.screenshot();
  await p.click('#compareBtn'); await p.waitForTimeout(1500);
  ok('compare button shows split divider', await p.locator('#split').isVisible() && (await p.getAttribute('#compareBtn', 'aria-pressed')) === 'true');
  const lb = await p.locator('#split').boundingBox();
  await p.screenshot({ path: SH + '/20-split.png' });
  const sh1 = await p.screenshot();
  const fs0 = require('fs'); fs0.writeFileSync(S + '/sh0.png', sh0); fs0.writeFileSync(S + '/sh1.png', sh1);
  const lum = require('child_process').execSync(`python3 -c "
from PIL import Image
a=Image.open('${S}/sh0.png').convert('L'); b=Image.open('${S}/sh1.png').convert('L')
x1=int((${lb.x}+${lb.width}/2-50)*2); x2=int((${lb.x}+${lb.width}/2+50)*2); y=int((${lb.y}+${lb.height}*0.3)*2)
print(a.getpixel((x1,y)), b.getpixel((x1,y)), a.getpixel((x2,y)), b.getpixel((x2,y)))"`).toString().trim().split(' ').map(Number);
  ok('split: left of divider shows original, right stays edited', lum[1] < lum[0] - 8 && Math.abs(lum[3] - lum[2]) < 4, lum.join(','));
  const hb = await p.locator('#splitHandle').boundingBox();
  await p.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2); await p.mouse.down(); await p.mouse.move(hb.x + hb.width / 2 + 80, hb.y + hb.height / 2, { steps: 5 }); await p.mouse.up();
  const lb2 = await p.locator('#split').boundingBox();
  ok('drag divider', Math.abs(lb2.x - lb.x - 80) < 2, `${lb.x} -> ${lb2.x}`);
  ok('dragging divider did not trigger hold/zoom', !(await p.locator('#origBadge').isVisible()) && !(await p.locator('#zoomChip').isVisible()));
  await p.focus('#splitHandle'); await p.keyboard.press('Home');
  ok('divider keyboard Home', (await p.getAttribute('#splitHandle', 'aria-valuenow')) === '0');
  await p.click('#compareBtn'); await p.waitForTimeout(300);
  ok('compare button hides split', !(await p.locator('#split').isVisible()));
  // keyboard shortcuts
  await p.evaluate(() => document.activeElement.blur());
  await p.keyboard.press('2'); ok('shortcut 2 opens Color', (await p.getAttribute('#mode-color', 'aria-selected')) === 'true');
  await p.keyboard.press('1'); await p.keyboard.press(']'); await p.waitForTimeout(300);
  ok('shortcut ] next tool', (await p.textContent('#adjName')) === 'Contrast', await p.textContent('#adjName'));
  await p.keyboard.press('['); await p.waitForTimeout(300);
  await p.keyboard.down(' '); await p.waitForTimeout(100); ok('hold Space shows original', await p.locator('#origBadge').isVisible());
  await p.keyboard.up(' '); await p.waitForTimeout(100); ok('release Space', !(await p.locator('#origBadge').isVisible()));
  await p.keyboard.press('='); await p.waitForTimeout(600); ok('shortcut + zooms', await p.locator('#zoomChip').isVisible());
  await p.keyboard.press('0'); await p.waitForTimeout(600); ok('shortcut 0 fits', !(await p.locator('#zoomChip').isVisible()));
  await p.mouse.click(sx, sy); await p.waitForTimeout(80); await p.mouse.click(sx, sy); await p.waitForTimeout(600);
  ok('double-tap zooms in', await p.locator('#zoomChip').isVisible(), await p.textContent('#zoomChip'));
  const t0 = await p.locator('#clip').evaluate(e => e.style.transform);
  await p.mouse.move(sx, sy); await p.mouse.down(); await p.mouse.move(sx + 60, sy + 30, { steps: 6 }); await p.mouse.up();
  const t1 = await p.locator('#clip').evaluate(e => e.style.transform);
  ok('drag pans when zoomed', t0 !== t1, `${t0} -> ${t1}`);
  ok('drag while zoomed did not show original', !(await p.locator('#origBadge').isVisible()));
  await p.screenshot({ path: SH + '/09-zoomed.png' });
  await p.click('#zoomChip'); await p.waitForTimeout(600);
  ok('zoom chip fits back', !(await p.locator('#zoomChip').isVisible()));
  // pinch via CDP touch
  const cdp = await ctx.newCDPSession(p);
  const tp = (pts) => pts.map(([x, y], i) => ({ x, y, id: i }));
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: tp([[sx - 30, sy], [sx + 30, sy]]) });
  for (let i = 1; i <= 8; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: tp([[sx - 30 - i * 10, sy], [sx + 30 + i * 10, sy]]) });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await p.waitForTimeout(600);
  const pz = await p.textContent('#zoomChip');
  ok('pinch zooms', await p.locator('#zoomChip').isVisible() && parseFloat(pz.replace(',', '.')) > 2, pz);
  await p.click('#zoomChip'); await p.waitForTimeout(500);
  // swipe to next tool
  const before = await p.textContent('#adjName');
  await p.mouse.move(sx + 80, sy); await p.mouse.down(); await p.mouse.move(sx - 60, sy + 5, { steps: 5 }); await p.mouse.up(); await p.waitForTimeout(500);
  const after = await p.textContent('#adjName');
  ok('horizontal swipe on photo selects next tool', before !== after, `${before} -> ${after}`);
  // ---- color
  await p.click('#mode-color'); await p.waitForTimeout(500);
  ok('color tab shows temperature', (await p.textContent('#adjName')) === 'Temperature');
  await p.screenshot({ path: SH + '/04-editor-color.png' });
  // ---- looks
  await p.click('#mode-looks'); await p.waitForTimeout(900);
  const userTile = await p.locator('.ptile[data-id^="u-"]').count();
  ok('1.x custom preset preserved', userTile === 1);
  await p.click('#presetRow .ptile.browse'); await p.waitForTimeout(800); await p.click('.sheet .seg button >> text=Categories'); await p.waitForTimeout(600);
  await p.click('.lb-row >> text=Lumora Originals'); await p.waitForTimeout(600); await p.click('.sheet-nav .btn.strong'); await p.waitForTimeout(600);
  await p.click('.ptile[data-id="b-pelicula"]'); await p.waitForTimeout(500);
  ok('choose look', (await p.getAttribute('.ptile[data-id="b-pelicula"]', 'aria-pressed')) === 'true');
  const r2 = await p.locator('#ruler').boundingBox();
  await p.mouse.move(r2.x + r2.width / 2, r2.y + 20); await p.mouse.down(); await p.mouse.move(r2.x + r2.width / 2 + 64, r2.y + 20, { steps: 6 }); await p.mouse.up();
  ok('look strength adjusts', +(await p.getAttribute('#ruler', 'aria-valuenow')) === 80, await p.getAttribute('#ruler', 'aria-valuenow'));
  await p.screenshot({ path: SH + '/05-editor-looks.png' });
  await p.click('.ptile.add'); await p.waitForTimeout(500);
  await p.screenshot({ path: SH + '/10-save-look.png' });
  await p.fill('#presetName', 'Mine'); await p.click('.sheet-nav .btn.strong'); await p.waitForTimeout(800);
  ok('save new look', (await p.locator('.ptile[data-id^="u-"]').count()) === 2);
  const mine = p.locator('.ptile[data-id^="u-"]').last();
  await mine.click(); await p.waitForTimeout(300);
  ok('manage button for own look', await p.locator('#manageBtn').isVisible());
  await p.click('#manageBtn'); await p.waitForTimeout(500);
  await p.click('.as-btn >> text=Rename'); await p.waitForTimeout(500);
  await p.fill('#presetName', 'Mine 2'); await p.click('.sheet-nav .btn.strong'); await p.waitForTimeout(700);
  ok('rename look', (await p.locator('.ptile[data-id^="u-"]').last().textContent()).includes('Mine 2'));
  await p.click('#manageBtn'); await p.waitForTimeout(500);
  await p.click('.as-btn.danger'); await p.waitForTimeout(800);
  ok('delete look', (await p.locator('.ptile[data-id^="u-"]').count()) === 1);
  await p.click('.ptile[data-id="b-pelicula"]'); await p.waitForTimeout(300);
  // ---- crop
  await p.click('#mode-crop'); await p.waitForTimeout(700);
  ok('crop frame shown', await p.locator('#cropFrame').isVisible());
  await p.click('.chip >> text=1:1'); await p.waitForTimeout(400);
  const fb = await p.locator('#cropFrame').boundingBox();
  ok('1:1 aspect applied', Math.abs(fb.width - fb.height) < 2, `${fb.width}x${fb.height}`);
  const r3 = await p.locator('#ruler').boundingBox();
  await p.mouse.move(r3.x + r3.width / 2, r3.y + 20); await p.mouse.down(); await p.mouse.move(r3.x + r3.width / 2 - 50, r3.y + 20, { steps: 6 }); await p.mouse.up();
  ok('straighten', Math.abs(+(await p.getAttribute('#ruler', 'aria-valuenow')) - 7) < 0.2, await p.getAttribute('#ruler', 'aria-valuenow'));
  await p.click('#rotBtn'); await p.click('#flipBtn'); await p.waitForTimeout(400);
  await p.screenshot({ path: SH + '/06-editor-crop.png' });
  // drag crop handle
  const fb2 = await p.locator('#cropFrame').boundingBox();
  await p.mouse.move(fb2.x + fb2.width - 2, fb2.y + fb2.height - 2); await p.mouse.down(); await p.mouse.move(fb2.x + fb2.width - 50, fb2.y + fb2.height - 50, { steps: 5 }); await p.mouse.up();
  const fb3 = await p.locator('#cropFrame').boundingBox();
  ok('crop corner drag resizes (no compare/zoom conflict)', fb3.width < fb2.width - 20 && !(await p.locator('#origBadge').isVisible()), `${fb2.width} -> ${fb3.width}`);
  ok('crop tab edited dot', await p.locator('#mode-crop').evaluate(e => e.classList.contains('edited')));
  await p.click('#mode-light'); await p.waitForTimeout(500);
  await p.screenshot({ path: SH + '/07-editor-after-crop.png' });
  // ---- favorite
  await p.click('#favBtn'); ok('favorite toggles', (await p.getAttribute('#favBtn', 'aria-pressed')) === 'true');
  // ---- copy adjustments
  await p.click('#moreBtn'); await p.waitForTimeout(500);
  await p.screenshot({ path: SH + '/11-more-sheet.png' });
  await p.click('.as-btn >> text=Copy adjustments'); await p.waitForTimeout(600);
  await p.click('.sheet .btn.primary'); await p.waitForTimeout(600);
  // ---- export
  await p.click('#exportBtn'); await p.waitForTimeout(1500);
  const facts = await p.textContent('.sheet .facts.big');
  ok('export sheet shows output resolution', /\d+ × \d+ · .* MP · JPG/.test(facts), facts);
  await p.screenshot({ path: SH + '/12-export-options.png' });
  await p.waitForTimeout(1500); const est = await p.textContent('.sheet .facts.big');
  ok('export shows estimated size before export', /≈ [\d,]+ (KB|MB)/.test(est), est);
  await p.click('.seg button >> text=1080'); await p.waitForTimeout(800); const facts2 = await p.textContent('.sheet .facts.big');
  ok('size option updates resolution', /1080/.test(facts2), facts2);
  await p.click('.sheet .btn.primary'); await p.waitForSelector('.ex-preview .done', { timeout: 20000 });
  const facts3 = await p.textContent('.sheet .facts.big');
  ok('export result shows file size', /(KB|MB)/.test(facts3), facts3);
  await p.screenshot({ path: SH + '/13-export-done.png' });
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('.sheet a[download]')]);
  const dpath = await dl.path(); const fs = require('fs'); const buf = fs.readFileSync(dpath);
  ok('exported file is JPEG', buf[0] === 0xFF && buf[1] === 0xD8, `${buf.length} bytes, ${dl.suggestedFilename()}`);
  // drag-dismiss sheet
  const g = await p.locator('.sheet .grabber').boundingBox();
  await p.mouse.move(g.x + g.width / 2, g.y + 2); await p.mouse.down(); await p.mouse.move(g.x + g.width / 2, g.y + 300, { steps: 8 }); await p.mouse.up(); await p.waitForTimeout(600);
  ok('drag down dismisses sheet', await p.locator('#sheet').isHidden());
  // ---- back to library, persistence
  await p.click('#back');
  ok('return transition animates photo into its tile', await p.waitForSelector('.hero-img', { timeout: 8000 }).then(() => true, () => false));
  await p.waitForTimeout(1800);
  ok('return transition cleans up', (await p.locator('.hero-img').count()) === 0 && (await p.locator('.tile img').evaluateAll(a => a.every(i => i.style.opacity === ''))));
  await p.reload(); await p.waitForTimeout(1500);
  await p.click('#filters button[data-filter="fav"]'); await p.waitForTimeout(500);
  ok('favorites filter', (await p.locator('.tile').count()) === 1);
  await p.screenshot({ path: SH + '/14-favorites.png' });
  await p.click('#filters button[data-filter="all"]'); await p.waitForTimeout(500);
  await p.locator('.tile').filter({ hasNot: p.locator('.fav') }).first().waitFor();
  const favTile = p.locator('.tile', { has: p.locator('svg.fav') });
  await favTile.click(); await p.waitForTimeout(2000);
  ok('crop persisted after reload', await p.locator('#mode-crop').evaluate(e => e.classList.contains('edited')));
  ok('look persisted after reload', await p.locator('#mode-looks').evaluate(e => e.classList.contains('edited')));
  await p.click('#back'); await p.waitForTimeout(1500);
  // ---- select + paste
  await p.click('#selectBtn'); await p.waitForTimeout(300);
  const unedited = await p.locator('.tile').evaluateAll(ts => ts.map((t, i) => [i, t.getAttribute('aria-label')]).filter(([, l]) => !/edited/.test(l)).map(([i]) => i));
  for (const i of unedited) await p.click(`.tile >> nth=${i}`);
  await p.screenshot({ path: SH + '/15-select.png' });
  await p.click('#selPaste'); await p.waitForTimeout(4000);
  const labels2 = await p.locator('.tile').evaluateAll(ts => ts.map(t => t.getAttribute('aria-label')));
  ok('paste adjustments to selected photos', labels2.every(l => /edited/.test(l)), labels2.join(' | '));
  await p.screenshot({ path: SH + '/16-library-after-paste.png' });
  // ---- delete
  await p.click('#selectBtn'); await p.click('.tile >> nth=0'); await p.click('#selDelete'); await p.waitForTimeout(500);
  await p.screenshot({ path: SH + '/17-delete-confirm.png' });
  await p.click('.as-btn.danger'); await p.waitForTimeout(1200);
  ok('delete selected photo', (await p.locator('.tile').count()) === 2);
  // ---- language
  await p.click('#settingsBtn'); await p.waitForTimeout(500);
  await p.click('.seg button >> text=Español'); await p.waitForTimeout(500);
  ok('Spanish still selectable', (await p.textContent('#importBtn')).includes('Importar'));
  await p.click('.seg button >> text=English'); await p.waitForTimeout(500);
  await p.screenshot({ path: SH + '/18-settings-en.png' });
  ok('English UI', (await p.textContent('#importBtn')).includes('Import'));
  await p.click('.sheet-nav .btn.strong'); await p.waitForTimeout(500);
  await p.click('.tile >> nth=0'); await p.waitForTimeout(1800);
  ok('English editor labels', (await p.textContent('#mode-light')).trim() === 'Light' && (await p.textContent('#adjName')).length > 0, await p.textContent('#adjName'));
  await p.screenshot({ path: SH + '/19-editor-en.png' });
  ok('no console errors', errs.length === 0, errs.join(' / '));
  ok('no external network requests', ext.length === 0, ext.join(' '));
  for (const r of results) console.log(r.join('\t'));
  console.log(results.filter(r => r[0] === 'FAIL').length, 'failed of', results.length);
  await b.close();
})().catch(e => { console.error(e); for (const r of results) console.log(r.join('\t')); process.exit(1); });
