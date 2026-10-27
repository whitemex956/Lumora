// Existing edits must render exactly as in 2.0: draw the same photo and settings with the 2.0 engine
// (fixtures/engine-2.0.js) and the current one (from index.html), in the same browser, and compare every pixel.
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const S = process.env.LUMORA_OUT, FIX = process.env.LUMORA_FIXTURES, BASE = process.env.LUMORA_URL;
const html = fs.readFileSync(path.join(__dirname, '../../index.html'), 'utf8');
const a = html.indexOf('const VS = `'), b = html.indexOf('\n}\n', html.indexOf('class Renderer {')) + 3;
const current = "const clamp = (v, a, b) => Math.min(b, Math.max(a, v));\nconst MIX_COLORS = ['Red', 'Orange', 'Yellow', 'Green', 'Aqua', 'Blue', 'Purple', 'Magenta'];\n" + html.slice(a, b);
const old = fs.readFileSync(FIX + '/engine-2.0.js', 'utf8');
const CASES = [{}, { exposure: 1.2, contrast: 30 }, { highlights: -60, shadows: 50, whites: 20, blacks: -30 }, { temp: 40, tint: -25, vibrance: 50, saturation: -30 },
  { exposure: -0.8, contrast: -40, temp: -60, saturation: 80, shadows: 70 }];
(async () => {
  const br = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await br.newPage(); await p.goto(BASE + '/index.html');
  const img = 'data:image/jpeg;base64,' + fs.readFileSync(FIX + '/noisy.jpg').toString('base64');
  const diffs = await p.evaluate(async ({ current, old, img, CASES }) => {
    const im = new Image(); im.src = img; await im.decode();
    const c = document.createElement('canvas'); c.width = 800; c.height = 533; c.getContext('2d').drawImage(im, 0, 0, 800, 533);
    const render = (src) => { const R = new Function(src + '; return Renderer;')(); const r = new R(document.createElement('canvas'), true); r.setImage(c);
      return CASES.map((s) => { r.draw(s); const px = new Uint8Array(800 * 533 * 4); r.gl.readPixels(0, 0, 800, 533, r.gl.RGBA, r.gl.UNSIGNED_BYTE, px); return px; }); };
    const A = render(old), B = render(current);
    return A.map((x, i) => { let d = 0; for (let k = 0; k < x.length; k++) d = Math.max(d, Math.abs(x[k] - B[i][k])); return d; });
  }, { current, old, img, CASES });
  const res = diffs.map((d, i) => [d === 0 ? 'PASS' : 'FAIL', `case ${i} renders as in 2.0 ${JSON.stringify(CASES[i])}`, d ? `max difference ${d}` : '']);
  for (const r of res) console.log(r.join('\t')); console.log(res.filter((r) => r[0] === 'FAIL').length, 'failed of', res.length);
  await br.close();
})().catch((e) => { console.error(e); process.exit(1); });
