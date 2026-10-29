// The hero's live film grain: a small WebGL shader behind the title. The grain is denser and a faint red light
// gathers wherever the pointer is (or the last touch, on phones), and quick movement stirs it a little.
// Runs at 24 frames a second like film, only while the hero is on screen and the tab is visible.
// Not started under reduced motion, without WebGL or on a software renderer: the still gradient in home.css stays.

const VERT = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
const FRAG = `precision mediump float;
uniform vec2 r;uniform vec2 m;uniform float t;uniform float e;
float h(vec2 p){p=fract(p*vec2(443.897,441.423));p+=dot(p,p.yx+19.19);return fract((p.x+p.y)*p.x);}
void main(){
  vec2 f=gl_FragCoord.xy;vec2 uv=f/r;
  float d=length((f-m)/r.y);
  float light=exp(-d*d*4.2);
  float haze=exp(-pow(length((uv-vec2(.12,.95))*vec2(1.4,1.)),2.)*5.);
  float g=h(floor(f)+fract(t*7.13)*517.)-.5;
  vec3 col=vec3(1.,.27,.21)*light*(.16+.08*e)+vec3(.56,.89,1.)*haze*.05;
  col+=g*(.045+.09*light+.05*e);
  col*=smoothstep(1.25,.25,length(uv-vec2(.5,.45)));
  gl_FragColor=vec4(max(col,0.),1.);
}`;

export function startGrain(canvas) {
  if (!canvas || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false, powerPreference: 'low-power' });
  if (!gl) return;
  // A software renderer (no GPU, as in some headless and locked-down browsers) would draw every frame on the CPU
  const info = gl.getExtension('WEBGL_debug_renderer_info');
  if (info && /swiftshader|llvmpipe|software/i.test(gl.getParameter(info.UNMASKED_RENDERER_WEBGL))) return;
  const shader = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
  const prog = gl.createProgram();
  gl.attachShader(prog, shader(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FRAG));
  gl.bindAttribLocation(prog, 0, 'p');
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
  gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const u = Object.fromEntries(['r', 'm', 't', 'e'].map((k) => [k, gl.getUniformLocation(prog, k)]));

  // One pixel of grain per CSS pixel: crisp, and cheap on high-density phones
  let w = 0, h = 0;
  const size = () => {
    w = Math.max(1, Math.round(canvas.clientWidth)); h = Math.max(1, Math.round(canvas.clientHeight));
    canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h);
  };
  size();
  new ResizeObserver(size).observe(canvas);

  // The light eases toward the pointer; it starts low and right, behind the buttons
  const target = { x: 0.72, y: 0.38 }, pos = { ...target };
  let energy = 0, lastX = 0, lastY = 0;
  const host = canvas.closest('.hero') ?? canvas;
  host.addEventListener('pointermove', (ev) => {
    const b = canvas.getBoundingClientRect();
    target.x = (ev.clientX - b.left) / b.width; target.y = 1 - (ev.clientY - b.top) / b.height;
    energy = Math.min(1, energy + Math.hypot(ev.clientX - lastX, ev.clientY - lastY) / 400);
    lastX = ev.clientX; lastY = ev.clientY;
  }, { passive: true });

  let visible = true, raf = 0, last = 0;
  const frame = (now) => {
    raf = 0;
    if (!visible || document.hidden) return;
    raf = requestAnimationFrame(frame);
    if (now - last < 1000 / 24) return;
    last = now;
    pos.x += (target.x - pos.x) * 0.12; pos.y += (target.y - pos.y) * 0.12;
    energy *= 0.9;
    gl.uniform2f(u.r, w, h); gl.uniform2f(u.m, pos.x * w, pos.y * h);
    gl.uniform1f(u.t, now / 1000); gl.uniform1f(u.e, energy);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
  const run = () => { if (!raf && visible && !document.hidden) raf = requestAnimationFrame(frame); };
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; run(); }).observe(canvas);
  document.addEventListener('visibilitychange', run);
  run();
  requestAnimationFrame(() => canvas.classList.add('on'));
}
