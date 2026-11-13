// The drifting smoke behind Singularity's public pages: Intangle's signed-out background
// (web/src/components/fluid-background.tsx, dark preset), as plain WebGL with no framework.
// A canvas.smoke element is drawn into; with no WebGL the page keeps its plain dark base.
(function () {
  var canvas = document.querySelector("canvas.smoke");
  if (!canvas) return;
  var gl = canvas.getContext("webgl", { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: "low-power", premultipliedAlpha: false });
  if (!gl) return;

  var PRESET = { liquid: 2, vapor: 2, contrast: 1, speed: 1, base: "#030406", liquidColor: "#035d35", sheen: "#0a8c52", vaporColor: "#0a4630" };

  var VERTEX = "attribute vec2 a_position; varying vec2 v_uv; void main() { v_uv = a_position * 0.5 + 0.5; gl_Position = vec4(a_position, 0.0, 1.0); }";
  var FRAGMENT = [
    "precision highp float;",
    "varying vec2 v_uv;",
    "uniform vec2 u_resolution; uniform float u_time; uniform float u_liquid_strength; uniform float u_vapor_strength; uniform float u_contrast;",
    "uniform vec3 u_base_color; uniform vec3 u_liquid_color; uniform vec3 u_sheen_color; uniform vec3 u_vapor_color;",
    "float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }",
    "float noise(vec2 p) {",
    "  vec2 i = floor(p); vec2 f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);",
    "  float a = hash(i); float b = hash(i + vec2(1.0, 0.0)); float c = hash(i + vec2(0.0, 1.0)); float d = hash(i + vec2(1.0, 1.0));",
    "  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);",
    "}",
    "mat2 rotate2d(float angle) { float s = sin(angle); float c = cos(angle); return mat2(c, -s, s, c); }",
    "float fbm(vec2 p) {",
    "  float value = 0.0; float amplitude = 0.5;",
    "  for (int i = 0; i < 6; i++) { value += amplitude * noise(p); p = rotate2d(0.55) * p * 2.03 + vec2(18.7, 9.4); amplitude *= 0.54; }",
    "  return value;",
    "}",
    "void main() {",
    "  vec2 uv = v_uv; vec2 p = uv - 0.5; p.x *= u_resolution.x / u_resolution.y;",
    "  float t = u_time; vec2 slowDrift = vec2(t * 0.16, -t * 0.08);",
    "  float baseField = fbm(p * 1.45 + slowDrift);",
    "  vec2 warp = vec2(fbm(p * 2.15 + vec2(-t * 0.22, t * 0.11) + baseField), fbm(p * 2.4 + vec2(t * 0.14, -t * 0.19) - baseField));",
    "  vec2 liquidSpace = p + (warp - 0.5) * 0.62;",
    "  vec2 vaporSpace = rotate2d(0.34) * p + (warp - 0.5) * 0.24;",
    "  float liquidField = fbm(liquidSpace * 2.9 + vec2(t * 0.22, -t * 0.14));",
    "  float liquidDetail = fbm(liquidSpace * 5.8 - vec2(t * 0.28, t * 0.07));",
    "  float vaporField = fbm(vaporSpace * 3.9 + vec2(-t * 0.06, t * 0.11));",
    "  float vaporWisps = fbm(vaporSpace * 7.2 + vec2(t * 0.16, -t * 0.09));",
    "  float denseBody = smoothstep(0.62, 0.88, liquidField + baseField * 0.14);",
    "  float sheen = smoothstep(0.64, 0.9, liquidDetail) * denseBody;",
    "  float vapor = smoothstep(0.5, 0.82, vaporField + vaporWisps * 0.12) * (1.0 - denseBody * 0.88);",
    "  float liquidMask = smoothstep(1.02, -0.18, p.y + 0.1 * sin(t * 0.22));",
    "  liquidMask *= smoothstep(1.42, 0.2, length(vec2(p.x * 0.84, p.y * 1.08)));",
    "  float vaporMask = smoothstep(1.24, -0.5, p.y + 0.18 * sin(t * 0.18));",
    "  vaporMask *= smoothstep(1.62, 0.12, length(vec2(p.x * 0.94, p.y * 1.14)));",
    "  float edgeFade = smoothstep(1.48, 0.2, length(vec2(p.x * 0.92, p.y * 1.16)));",
    "  vec3 baseColor = u_base_color; vec3 color = baseColor;",
    "  color += denseBody * u_liquid_color * 0.42 * liquidMask * u_liquid_strength;",
    "  color += sheen * u_sheen_color * 0.18 * liquidMask * u_liquid_strength;",
    "  color += vapor * u_vapor_color * 0.18 * vaporMask * u_vapor_strength;",
    "  color += vaporWisps * mix(u_vapor_color, u_sheen_color, 0.5) * 0.05 * vaporMask * u_vapor_strength;",
    "  color = mix(baseColor * 0.94, color, edgeFade * 0.82 + 0.18);",
    "  color = baseColor + (color - baseColor) * u_contrast;",
    "  gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);",
    "}"
  ].join("\n");

  function shader(type, source) {
    var s = gl.createShader(type);
    gl.shaderSource(s, source);
    gl.compileShader(s);
    return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
  }
  function rgb(hex) {
    return new Float32Array([parseInt(hex.slice(1, 3), 16) / 255, parseInt(hex.slice(3, 5), 16) / 255, parseInt(hex.slice(5, 7), 16) / 255]);
  }

  var vs = shader(gl.VERTEX_SHADER, VERTEX);
  var fs = shader(gl.FRAGMENT_SHADER, FRAGMENT);
  if (!vs || !fs) return;
  var program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;

  var quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  var at = gl.getAttribLocation(program, "a_position");
  var u = {};
  ["u_resolution", "u_time", "u_liquid_strength", "u_vapor_strength", "u_contrast", "u_base_color", "u_liquid_color", "u_sheen_color", "u_vapor_color"].forEach(function (n) {
    u[n] = gl.getUniformLocation(program, n);
  });

  var still = window.matchMedia("(prefers-reduced-motion: reduce)");
  var start = performance.now();
  var frame = 0;

  function resize() {
    var rect = canvas.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    var w = Math.max(1, Math.round(rect.width * dpr));
    var h = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  function draw(now) {
    resize();
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.enableVertexAttribArray(at);
    gl.vertexAttribPointer(at, 2, gl.FLOAT, false, 0, 0);
    gl.uniform2f(u.u_resolution, canvas.width, canvas.height);
    gl.uniform1f(u.u_time, still.matches ? 0 : (now - start) * 0.00012 * PRESET.speed);
    gl.uniform1f(u.u_liquid_strength, PRESET.liquid);
    gl.uniform1f(u.u_vapor_strength, PRESET.vapor);
    gl.uniform1f(u.u_contrast, PRESET.contrast);
    gl.uniform3fv(u.u_base_color, rgb(PRESET.base));
    gl.uniform3fv(u.u_liquid_color, rgb(PRESET.liquidColor));
    gl.uniform3fv(u.u_sheen_color, rgb(PRESET.sheen));
    gl.uniform3fv(u.u_vapor_color, rgb(PRESET.vaporColor));
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  function loop(now) {
    draw(now);
    if (!still.matches && !document.hidden) frame = requestAnimationFrame(loop);
  }
  function restart() {
    if (frame) { cancelAnimationFrame(frame); frame = 0; }
    if (still.matches) draw(start); else frame = requestAnimationFrame(loop);
  }
  window.addEventListener("resize", function () { if (still.matches) draw(start); });
  document.addEventListener("visibilitychange", function () { if (!document.hidden) restart(); });
  if (still.addEventListener) still.addEventListener("change", restart);
  restart();
})();
