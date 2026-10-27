const { chromium } = require('playwright');
const S = process.env.LUMORA_OUT, FIX = process.env.LUMORA_FIXTURES, BASE = process.env.LUMORA_URL, OUT = S + '/shots/vp';
const fs = require('fs'); fs.mkdirSync(S + '/shots/vp', { recursive: true });
const res = [];
const sizes = [['se', 375, 667, true], ['375', 375, 812, true], ['430', 430, 932, true], ['ipad', 820, 1180, true]];
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
  for (const [name, w, h, mobile] of sizes) for (const scheme of (name === '390' || name === 'se' ? ['dark', 'light'] : ['dark'])) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: mobile, hasTouch: mobile, colorScheme: scheme, locale: 'es-ES',
      reducedMotion: name === 'se' ? 'reduce' : 'no-preference' });
    const p = await ctx.newPage(); const errs = [];
    p.on('pageerror', e => errs.push(e.message));
    await p.goto(BASE + '/index.html'); await p.waitForTimeout(700);
    const tag = `${name}-${scheme}`;
    await p.screenshot({ path: `${OUT}/${tag}-0-empty.png` });
    await p.setInputFiles('#pick', [FIX + '/landscape.jpg', FIX + '/portrait.jpg', FIX + '/square.jpg', FIX + '/landscape.jpg']);
    await p.waitForTimeout(3500);
    await p.click('.tile >> nth=1'); await p.waitForTimeout(2000);   // portrait
    const r = await p.locator('#ruler').boundingBox();
    await p.mouse.move(r.x + r.width / 2, r.y + 20); await p.mouse.down(); await p.mouse.move(r.x + r.width / 2 - 60, r.y + 20, { steps: 4 }); await p.mouse.up();
    await p.waitForTimeout(600);
    await p.screenshot({ path: `${OUT}/${tag}-2-editor.png` });
    const check = await p.evaluate(() => {
      const issues = []; const W = innerWidth, H = innerHeight;
      if (document.documentElement.scrollWidth > W) issues.push('horizontal overflow');
      const vis = (e) => e.offsetParent !== null || getComputedStyle(e).position === 'fixed';
      const btns = [...document.querySelectorAll('#edTop button, #tabbar .tab, .p-head button:not(.gone)')].filter(vis).filter(e => !e.hidden);
      for (const e of btns) { const r = e.getBoundingClientRect(); if (r.left < 0 || r.right > W + .5 || r.top < 0 || r.bottom > H) issues.push('offscreen ' + (e.id || e.className)); if ((r.width < 36 || r.height < 36) && e.id !== 'adjValue') issues.push('small target ' + (e.id || e.textContent)); }
      const tops = [...document.querySelectorAll('#edTop > *')].filter(e => !e.hidden && e.className !== 'spacer').map(e => e.getBoundingClientRect());
      for (let i = 1; i < tops.length; i++) if (tops[i].left < tops[i - 1].right - .5) issues.push('top bar overlap');
      const clip = document.getElementById('clip').getBoundingClientRect(), top = document.getElementById('edTop').getBoundingClientRect(), bot = document.getElementById('edBottom').getBoundingClientRect();
      if (clip.top < top.bottom || clip.bottom > bot.top) issues.push('photo under chrome');
      if (clip.height < 120) issues.push('photo too small ' + clip.height);
      for (const e of document.querySelectorAll('.adj-name, .tab span, .adj-value')) if (e.scrollWidth > e.clientWidth + 1) issues.push('clipped text ' + e.textContent);
      return { issues, photo: Math.round(clip.width) + 'x' + Math.round(clip.height) };
    });
    await p.click('#mode-looks'); await p.waitForTimeout(800);
    await p.screenshot({ path: `${OUT}/${tag}-3-looks.png` });
    await p.click('#mode-crop'); await p.waitForTimeout(600);
    const cropOk = await p.evaluate(() => { const f = document.getElementById('cropFrame').getBoundingClientRect(), top = document.getElementById('edTop').getBoundingClientRect(), bot = document.getElementById('edBottom').getBoundingClientRect(); return f.top >= top.bottom && f.bottom <= bot.top; });
    if (!cropOk) check.issues.push('crop frame under chrome');
    await p.screenshot({ path: `${OUT}/${tag}-4-crop.png` });
    await p.click('#exportBtn'); await p.waitForTimeout(1500);
    const sheetOk = await p.evaluate(() => { const s = document.getElementById('sheet').getBoundingClientRect(); return s.top >= 0 && s.right <= innerWidth + .5; });
    if (!sheetOk) check.issues.push('export sheet off screen');
    await p.screenshot({ path: `${OUT}/${tag}-5-export.png` });
    await p.click('.sheet-nav .btn'); await p.waitForTimeout(500);
    await p.click('#back'); await p.waitForTimeout(1500);
    await p.screenshot({ path: `${OUT}/${tag}-1-library.png` });
    const libIss = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth || [...document.querySelectorAll('.dock')].some(d => !d.hidden && d.getBoundingClientRect().right > innerWidth));
    if (libIss) check.issues.push('library overflow');
    res.push([check.issues.length || errs.length ? 'FAIL' : 'PASS', `${tag} layout (photo ${check.photo})`, [...new Set(check.issues), ...errs].join('; ')]);
    await ctx.close();
  }
  await b.close();
  for (const r of res) console.log(r.join('\t')); console.log(res.filter((r) => r[0] === 'FAIL').length, 'failed of', res.length);
})().catch((e) => { console.error(e); process.exit(1); });
