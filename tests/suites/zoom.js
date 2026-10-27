// Sharper zoom: past 1.6x the editor reloads the photo larger; the look must not change
const { chromium } = require('playwright'); const fs = require('fs'), cp = require('child_process');
const S = process.env.LUMORA_OUT, FIX = process.env.LUMORA_FIXTURES, BASE = process.env.LUMORA_URL, SH = S + '/shots/premium';
const res = []; const ok = (n, c, i = '') => res.push([c ? 'PASS' : 'FAIL', n, i]);
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message + ' @ ' + (e.stack || '').split('\n').slice(1, 4).join(' | '))); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await p.goto(BASE + '/index.html'); await p.waitForTimeout(800);
  await p.setInputFiles('#pick', [FIX + '/landscape.jpg', FIX + '/blemish.jpg']); await p.waitForTimeout(3000);
  const rgb = async (sx, sy) => { const shot = await p.screenshot({ clip: { x: sx - 2, y: sy - 2, width: 4, height: 4 } }); fs.writeFileSync(S + '/probe-z.png', shot);
    return cp.execSync(`python3 -c "from PIL import Image,ImageStat;print(' '.join(str(round(v)) for v in ImageStat.Stat(Image.open('${S}/probe-z.png').convert('RGB')).mean))"`).toString().trim().split(' ').map(Number); };
  const width = () => p.evaluate(() => document.getElementById('view').width);
  await p.click('.tile[aria-label^="landscape"]'); await p.waitForTimeout(2500);
  ok('opens at the 2048 px editing size', (await width()) === 2048, String(await width()));
  // an edit, a radial mask and a Remove fix, so the switch has something to keep
  await p.click('#adjValue'); await p.keyboard.press('Control+A'); await p.keyboard.type('0.6'); await p.keyboard.press('Enter');
  await p.click('#mode-masks'); await p.click('#addRadial'); await p.waitForTimeout(300);
  await p.click('#adjValue'); await p.keyboard.press('Control+A'); await p.keyboard.type('-1'); await p.keyboard.press('Enter'); await p.waitForTimeout(300);
  await p.click('#pane-maskedit .mask-back'); await p.click('#openHeal');
  const cb = await p.locator('#clip').boundingBox(), hx = cb.x + cb.width * .3, hy = cb.y + cb.height * .8;
  await p.mouse.move(hx - 5, hy); await p.mouse.down(); await p.mouse.move(hx + 5, hy, { steps: 3 }); await p.mouse.up(); await p.waitForTimeout(1500);
  await p.click('#pane-heal .mask-back'); await p.click('#mode-light'); await p.waitForTimeout(800);
  // double tap at the centre: 2.5x around it; compare the same photo point before and after the switch
  const cx = cb.x + cb.width / 2, cy = cb.y + cb.height / 2;
  await p.mouse.click(cx, cy); await p.waitForTimeout(80); await p.mouse.click(cx, cy); await p.waitForTimeout(700);
  const before = await rgb(cx + 30, cy + 20);
  await p.waitForFunction(() => document.getElementById('view').width > 2048, null, { timeout: 15000 }).catch(() => {});
  await p.waitForTimeout(1500);
  ok('zooming past 1.6x loads the full 3024 px photo', (await width()) === 3024, String(await width()));
  const after = await rgb(cx + 30, cy + 20);
  ok('the look does not change', before.every((v, i) => Math.abs(v - after[i]) < 8), `${before} -> ${after}`);
  await p.screenshot({ path: SH + '/50-zoom-detail.png' });
  await p.click('#zoomChip'); await p.waitForTimeout(600);
  await p.waitForFunction(() => document.getElementById('view').width === 2048, null, { timeout: 15000 }).catch(() => {});
  ok('back to fit returns to 2048 px', (await width()) === 2048, String(await width()));
  await p.click('#mode-masks'); await p.waitForTimeout(300);
  ok('mask and Remove fix kept through the switches', (await p.locator('#maskChips .mchip').count()) === 1 && /1 Remove fix/.test(await p.textContent('#maskChips')));
  await p.click('#mode-light');
  // a photo no larger than the editing size never switches
  await p.click('#back'); await p.waitForTimeout(2000); await p.click('.tile[aria-label^="blemish"]'); await p.waitForTimeout(2500);
  const bb = await p.locator('#clip').boundingBox();
  await p.mouse.click(bb.x + bb.width / 2, bb.y + bb.height / 2); await p.waitForTimeout(80); await p.mouse.click(bb.x + bb.width / 2, bb.y + bb.height / 2); await p.waitForTimeout(2500);
  ok('small photos stay as they are', (await width()) === 1600, String(await width()));
  ok('no errors', errs.length === 0, errs.join(' / '));
  for (const r of res) console.log(r.join('\t')); console.log(res.filter((r) => r[0] === 'FAIL').length, 'failed of', res.length);
  await b.close();
})().catch((e) => { console.error(e); for (const r of res) console.log(r.join('\t')); process.exit(1); });
