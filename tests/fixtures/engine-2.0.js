// The 2.0 rendering engine, kept to check that new effects at 0 render existing edits pixel-identical.
const VS = `#version 300 es
in vec2 p; out vec2 uv;
void main() { uv = vec2(p.x * .5 + .5, .5 - p.y * .5); gl_Position = vec4(p, 0., 1.); }`;
const FS = `#version 300 es
precision highp float;
in vec2 uv; out vec4 o;
uniform sampler2D img; uniform bool orig;
uniform vec4 split;  // screen-space before/after divider: cos, sin of the on-screen rotation, flip, offset in px (huge negative = off)
uniform vec2 size;   // image size in px
uniform float ev;    // exposure, stops
uniform float con;   // contrast, -0.6..0.6
uniform vec4 tone;   // highlights, shadows, whites, blacks, each -1..1
uniform vec2 wb;     // temperature, tint, each -1..1
uniform vec2 col;    // vibrance, saturation, each -1..1
const vec3 LW = vec3(.2126, .7152, .0722);
vec3 toLinear(vec3 c) { return mix(c / 12.92, pow((c + .055) / 1.055, vec3(2.4)), step(.04045, c)); }
vec3 toSrgb(vec3 c) { c = clamp(c, 0., 1.); return mix(c * 12.92, 1.055 * pow(c, vec3(1. / 2.4)) - .055, step(.0031308, c)); }
void main() {
  vec4 t = texture(img, uv);
  if (orig || split.z * (uv.x - .5) * size.x * split.x - (uv.y - .5) * size.y * split.y < split.w) { o = vec4(t.rgb, 1.); return; }
  vec3 l = toLinear(t.rgb);

  // white balance: warm = more red, less blue; tint + = magenta (less green). Gains keep brightness.
  vec3 g = vec3(exp2(.35 * wb.x + .12 * wb.y), exp2(-.30 * wb.y), exp2(-.35 * wb.x + .12 * wb.y));
  l *= g / dot(g, LW);

  l *= exp2(ev);                                             // exposure in stops
  l = .18 * pow(max(l, vec3(1e-6)) / .18, vec3(1. + con));   // contrast pivots on middle grey

  // tone on luminance in a perceptual space, then scale RGB by the change (keeps hue)
  float y = max(dot(l, LW), 1e-6);
  float p = pow(min(y, 4.), 1. / 2.2);
  float q = clamp(p, 0., 1.);
  p += tone.x * .30 * smoothstep(.40, 1., q);                                   // highlights
  p += tone.y * .30 * q * (1. - smoothstep(0., .65, q)) * 2.5;                  // shadows
  p += tone.z * .12 * smoothstep(.60, 1., q);                                   // whites
  p += tone.w * .10 * (1. - smoothstep(0., .35, q));                            // blacks
  l *= pow(max(p, 0.), 2.2) / y;

  // vibrance boosts muted colours more than saturated ones; saturation is uniform
  float mx = max(max(l.r, l.g), l.b), mn = min(min(l.r, l.g), l.b);
  float s = mx > 1e-5 ? (mx - mn) / mx : 0.;
  float Y = dot(l, LW);
  l = mix(vec3(Y), l, 1. + col.x * (1. - s));
  l = mix(vec3(Y), l, 1. + col.y);
  o = vec4(toSrgb(max(l, 0.)), 1.);
}`;
class Renderer {
  constructor(canvas, keep = false) {
    const gl = canvas.getContext('webgl2', { premultipliedAlpha: false, preserveDrawingBuffer: keep, antialias: false, alpha: false });
    if (!gl) throw new Error('webgl');
    this.gl = gl; this.canvas = canvas;
    const sh = (type, src) => {
      const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    };
    const pr = gl.createProgram();
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS));
    gl.bindAttribLocation(pr, 0, 'p'); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
    gl.useProgram(pr);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    this.u = Object.fromEntries(['ev', 'con', 'tone', 'wb', 'col', 'orig', 'split', 'size'].map((n) => [n, gl.getUniformLocation(pr, n)]));
    gl.uniform1i(gl.getUniformLocation(pr, 'img'), 0);
    this.tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE);
  }
  setImage(src) {
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
    this.canvas.width = src.width; this.canvas.height = src.height;
    gl.viewport(0, 0, src.width, src.height);
    gl.uniform2f(this.u.size, src.width, src.height);
  }
  draw(s, orig = false, split = null) {
    const gl = this.gl;
    const v = (k) => (s[k] || 0) / 100;
    gl.uniform1f(this.u.ev, s.exposure || 0);
    gl.uniform1f(this.u.con, v('contrast') * 0.6);
    gl.uniform4f(this.u.tone, v('highlights'), v('shadows'), v('whites'), v('blacks'));
    gl.uniform2f(this.u.wb, v('temp'), v('tint'));
    gl.uniform2f(this.u.col, v('vibrance'), v('saturation'));
    gl.uniform1i(this.u.orig, orig ? 1 : 0);
    gl.uniform4f(this.u.split, ...(split || [1, 0, 1, -1e9]));
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  dispose() { const ext = this.gl.getExtension('WEBGL_lose_context'); if (ext) ext.loseContext(); }
}
