const { chromium } = require('playwright');
const S = process.env.LUMORA_OUT, FIX = process.env.LUMORA_FIXTURES, BASE = process.env.LUMORA_URL;
const SPANISH = /[áéíóúñ¿¡]|\b(foto|fotos|ajuste|ajustes|editar|editada|guardar|cancelar|cerrar|luz|recorte|recortar|libre|exportar|preparando|listo|seleccionar|importar|añadir|eliminar|borrar|todas|favorita|favoritas|biblioteca|deshacer|rehacer|enderezar|cantidad|intensidad|matiz|negros|blancos|sombras|altas|ninguno|nombre|nuevo|mi look|girar|voltear|proporción|tamaño|calidad|alta|media|ligera|idioma|apariencia|claro|oscuro|copiar|pegar|quitar|volver|dispositivo|solo en|abriendo|mantén|pellizca|elige|toca|peso|estimado|sin ubicación|antes|después|restablecer|preferencias|seguir editando|hoy|ayer|ejemplo|cálido|frío|mate|película|intenso|b\/n)\b/i;
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'es-ES', acceptDownloads: true });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { window.__toasts = []; new MutationObserver(() => { const t = document.getElementById('toast'); if (t && t.textContent) window.__toasts.push(t.textContent); }).observe(document, { subtree: true, childList: true, characterData: true }); });
  const found = new Map();
  const scan = async (where) => {
    const texts = await p.evaluate(() => {
      const out = [];
      const vis = (e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && !e.closest('[hidden]'); };
      const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      while (w.nextNode()) { const n = w.currentNode; const t = n.textContent.trim(); if (t && n.parentElement && vis(n.parentElement) && !n.parentElement.closest('script,style')) out.push(t); }
      for (const e of document.querySelectorAll('[aria-label],[alt],[title],[placeholder],[aria-valuetext]')) if (!e.closest('[hidden]')) for (const a of ['aria-label', 'alt', 'title', 'placeholder', 'aria-valuetext']) { const v = e.getAttribute(a); if (v) out.push(v); }
      for (const i of document.querySelectorAll('input')) if (i.value) out.push(i.value);
      out.push(document.title, document.documentElement.lang === 'en' ? '' : 'html lang=' + document.documentElement.lang);
      return [...out, ...window.__toasts];
    });
    for (const t of texts) if (t && SPANISH.test(t.replace(/Español/g, ''))) { if (!found.has(t)) found.set(t, where); }
  };
  await p.goto(BASE + '/index.html'); await p.waitForTimeout(900); await scan('onboarding');
  await p.click('text=Try the sample photo'); await p.waitForTimeout(2500); await scan('sample editor');
  await p.click('#moreBtn'); await p.waitForTimeout(500); await scan('sample more sheet'); await p.click('.as-btn.cancel'); await p.waitForTimeout(500);
  await p.click('#back'); await p.waitForTimeout(1200);
  await p.setInputFiles('#pick', [FIX + '/landscape.jpg', FIX + '/portrait.jpg', FIX + '/square.jpg', FIX + '/landscape.jpg']); await p.waitForTimeout(4000); await scan('library');
  await p.click('.tile >> nth=0'); await p.waitForTimeout(2500); await scan('editor light');
  const r = await p.locator('#ruler').boundingBox();
  await p.mouse.move(r.x + r.width / 2, r.y + 20); await p.mouse.down(); await p.mouse.move(r.x + r.width / 2 - 60, r.y + 20, { steps: 4 }); await p.mouse.up();
  await p.click('#autoBtn'); await p.waitForTimeout(400); await scan('auto');
  await p.click('#compareBtn'); await p.waitForTimeout(500); await scan('split'); await p.click('#compareBtn');
  await p.click('#fineBtn'); await scan('fine'); await p.click('#fineBtn');
  await p.click('#adjValue'); await scan('typing'); await p.keyboard.press('Escape');
  await p.click('#favBtn'); await scan('fav');
  for (const m of ['color', 'looks', 'crop']) { await p.click('#mode-' + m); await p.waitForTimeout(800); await scan('tab ' + m); }
  await p.click('#mode-looks'); await p.waitForTimeout(500);
  await p.click('.ptile.add'); await p.waitForTimeout(500); await scan('save look sheet');
  await p.click('.sheet-nav .btn.strong'); await p.waitForTimeout(800); await scan('look saved');
  await p.locator('.ptile[data-id^="u-"]').last().click(); await p.waitForTimeout(300); await scan('own look selected');
  await p.click('#manageBtn'); await p.waitForTimeout(500); await scan('manage look');
  await p.click('.as-btn >> nth=0'); await p.waitForTimeout(500); await scan('rename look'); await p.click('.sheet-nav .btn >> nth=0'); await p.waitForTimeout(500);
  await p.click('#mode-light'); await p.waitForTimeout(400);
  await p.click('#moreBtn'); await p.waitForTimeout(500); await scan('more sheet');
  await p.click('.as-btn >> text=Copy adjustments'); await p.waitForTimeout(500); await scan('copy sheet');
  await p.click('.sheet .btn.primary'); await p.waitForTimeout(600);
  await p.click('#moreBtn'); await p.waitForTimeout(500); await p.click('.as-btn >> text=Paste adjustments'); await p.waitForTimeout(500); await scan('paste');
  // premium screens
  await p.click('#mode-effects'); await p.waitForTimeout(400); await scan('effects');
  for (const k of ['texture', 'dehaze', 'vignette', 'grain', 'grainSize', 'sharpen', 'noise', 'lensVig', 'fringe', 'distortion', 'lensBlur']) { await p.click('#adj-' + k); await scan('effects ' + k); }
  await p.click('#mode-color'); await p.click('#open-mixer'); await p.waitForTimeout(300);
  for (let i = 0; i < 8; i++) { await p.click(`#mixSwatches .swatch >> nth=${i}`); for (const a of ['H', 'S', 'L']) { await p.click(`#mixAttr button[data-a="${a}"]`); await scan('mixer'); } }
  await p.click('#pane-mixer .sub-back'); await p.click('#open-grading'); await p.waitForTimeout(300);
  for (const r of ['Sh', 'Mid', 'Hi', 'Bal', 'Blend']) { await p.click(`#gradeRegions .chip[data-r="${r}"]`); await scan('grading'); }
  await p.click('#pane-grading .sub-back');
  await p.click('#mode-masks'); await p.waitForTimeout(300); await scan('masks list');
  for (const a of ['#addBrush', '#addLinear', '#addRadial']) { await p.click(a); await p.waitForTimeout(300); for (const b of await p.locator('#maskTools .mtool').all()) { await b.click(); await scan('mask edit'); } await p.click('#pane-maskedit .mask-back'); }
  await p.click('#openHeal'); await p.waitForTimeout(300); await scan('remove'); await p.click('#pane-heal .mask-back');
  await p.click('#mode-looks'); await p.waitForTimeout(800); await p.click('#presetRow .ptile.browse'); await p.waitForTimeout(800); await scan('looks recommended');
  await p.click('.sheet .seg button >> nth=1'); await p.waitForTimeout(800); await scan('looks categories');
  for (let i = 0; i < 13; i++) { await p.click(`.lb-row >> nth=${i}`); await p.waitForTimeout(300); await scan('looks category'); await p.click('.lb-head .btn'); await p.waitForTimeout(200); }
  await p.click('.sheet .seg button >> nth=2'); await scan('looks yours'); await p.click('.sheet-nav .btn.strong'); await p.waitForTimeout(500);
  await p.click('#mode-light'); await p.click('#quickBtn'); await p.waitForTimeout(800); await scan('quick actions');
  await p.click('.sheet .lb-tile >> nth=1'); await p.waitForTimeout(500); await scan('quick applied');
  await p.click('#mode-masks'); await p.waitForTimeout(300);
  for (let i = 0; i < 3; i++) { await p.click('#addRadial'); await p.waitForTimeout(250); if (await p.locator('#pane-maskedit .mask-back').isVisible()) await p.click('#pane-maskedit .mask-back'); }
  await scan('mask limit'); await p.click('#mode-light');
  await p.click('#exportBtn'); await p.waitForTimeout(2500); await scan('export sheet');
  await p.click('.sheet .btn.primary'); await p.waitForSelector('.ex-preview .done', { timeout: 30000 }); await scan('export done');
  await p.click('.sheet-nav .btn'); await p.waitForTimeout(600);
  await p.click('#back'); await p.waitForTimeout(2000); await scan('library after edit');
  for (const f of ['fav', 'edited', 'all']) { await p.click(`#filters button[data-filter="${f}"]`); await p.waitForTimeout(400); await scan('filter ' + f); }
  const t = p.locator('.tile >> nth=1'); const tb = await t.boundingBox();
  await p.mouse.move(tb.x + 30, tb.y + 30); await p.mouse.down(); await p.waitForTimeout(800); await p.mouse.up(); await p.waitForTimeout(400); await scan('photo quick actions'); await p.click('.as-btn.cancel'); await p.waitForTimeout(500);
  await p.click('#selectBtn'); await p.waitForTimeout(300); await scan('select mode'); await p.click('.tile >> nth=1'); await scan('selected');
  await p.click('#selPaste'); await p.waitForTimeout(3000); await scan('pasted');
  await p.click('#selectBtn'); await p.click('.tile >> nth=1'); await p.click('#selFav'); await p.waitForTimeout(600); await scan('fav selected');
  await p.click('#selectBtn'); await p.click('.tile >> nth=1'); await p.click('#selDelete'); await p.waitForTimeout(500); await scan('delete confirm');
  await p.click('.as-btn.danger'); await p.waitForTimeout(1000); await scan('deleted');
  await p.click('#settingsBtn'); await p.waitForTimeout(500); await scan('settings');
  await p.screenshot({ path: S + '/shots/english-settings.png' });
  const res = [['html lang is en', (await p.evaluate(() => document.documentElement.lang)) === 'en', ''],
    ['no Spanish on any screen', found.size === 0, [...found].map(([t, w]) => `[${w}] ${t}`).join(' | ')], ['no errors', errs.length === 0, errs.join(' / ')]];
  for (const [n, c, i] of res) console.log([c ? 'PASS' : 'FAIL', n, i].join('\t'));
  console.log(res.filter((r) => !r[1]).length, 'failed of', res.length);
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
