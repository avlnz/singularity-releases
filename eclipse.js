// The eclipse behind Singularity's public pages: a dark disc in front of a bright one, the
// light bent round it. From the Flow design reference's stylised eclipse (WebGL), dark only,
// warmed so nothing reads blue, and placed to the right of the text on wide screens and above
// it on narrow ones. <canvas class="eclipse" data-state="ready|quiet"> picks the mood.
(function () {
  var canvas = document.querySelector("canvas.eclipse");
  if (!canvas) return;
  var gl = canvas.getContext("webgl", { alpha: false, antialias: false, depth: false });
  if (!gl) return;

  var STATES = {
    ready: { moon: [-0.085, 0.006], tot: 0.62, lens: 0.5, intensity: 0.8, sun: [1.0, 0.97, 0.86], corona: [0.17, 0.88, 0.41], sky: [0.012, 0.026, 0.019] },
    quiet: { moon: [-0.02, 0.003], tot: 0.9, lens: 0.62, intensity: 0.55, sun: [0.98, 0.96, 0.86], corona: [0.14, 0.74, 0.35], sky: [0.011, 0.022, 0.016] }
  };
  var state = STATES[canvas.getAttribute("data-state")] || STATES.ready;

  var VERT = "attribute vec2 p; void main(){ gl_Position = vec4(p,0.,1.); }";
  var FRAG = [
    "precision highp float;",
    "uniform vec2 u_res; uniform float u_time; uniform vec2 u_ptr; uniform vec2 u_center; uniform float u_zoom;",
    "uniform vec3 u_sun; uniform vec3 u_corona; uniform vec3 u_sky;",
    "uniform vec2 u_moon; uniform float u_tot; uniform float u_lens; uniform float u_intensity;",
    "float hash(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }",
    "float noise(vec2 p){ vec2 i=floor(p),f=fract(p); vec2 u=f*f*(3.-2.*f);",
    "  return mix(mix(hash(i),hash(i+vec2(1,0)),u.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x),u.y); }",
    "float fbm(vec2 p){ float v=0.,a=.5; mat2 m=mat2(1.62,1.21,-1.21,1.62);",
    "  for(int i=0;i<4;i++){ v+=a*noise(p); p=m*p+.17; a*=.52; } return v; }",
    "void main(){",
    "  vec2 uv = gl_FragCoord.xy / u_res;",
    "  float aspect = u_res.x / max(u_res.y,1.0);",
    "  vec2 q = vec2((uv.x-0.5)*aspect, uv.y-0.5);",
    "  vec2 p = q * u_zoom;",
    "  vec2 par = (u_ptr-0.5);",
    "  vec2 sunC  = u_center + par*vec2(0.05,-0.035);",
    "  vec2 moonC = sunC + u_moon + par*vec2(0.085,-0.06);",
    "  float Rs = 0.265; float Rm = 0.285;",
    "  float dS = length(p - sunC); float dM = length(p - moonC);",
    "  vec2 toM = p - moonC; float lr = max(length(toM), 0.0008);",
    "  float bend = u_lens * 0.045 / (lr*lr + 0.018);",
    "  vec2 warp = p - (toM/lr) * bend;",
    "  vec3 col = mix(u_sky*0.4, u_sky, uv.y*0.7 + 0.15);",
    "  vec2 sp = warp * 2.0;",
    "  for (int k=0;k<2;k++){",
    "    vec2 g = floor(sp * (62.0 + float(k)*43.0));",
    "    float h = hash(g + float(k)*19.0);",
    "    if (h > 0.972) {",
    "      vec2 cell = (fract(sp*(62.0+float(k)*43.0))-0.5);",
    "      float tw = 0.5 + 0.5*sin(u_time*(0.6+h*2.0) + h*40.0);",
    "      float s = smoothstep(0.5, 0.0, length(cell)) * tw;",
    "      col += vec3(0.96,0.95,0.88) * s * 0.5;",
    "    }",
    "  }",
    "  vec2 sd = warp - sunC; float ang = atan(sd.y, sd.x); float sr = length(sd);",
    "  float streak = fbm(vec2(ang*3.0, sr*4.0 - u_time*0.04)) * 0.6 + fbm(vec2(ang*7.0 + u_time*0.02, sr*2.0)) * 0.4;",
    "  float corona = exp(-max(sr - Rs, 0.0) * 7.5) * (0.55 + 0.55*streak);",
    "  corona += exp(-max(sr - Rs, 0.0) * 2.4) * 0.34;",
    "  col += u_corona * corona * 1.95 * u_intensity;",
    "  float sunDisk = smoothstep(Rs, Rs-0.012, dS);",
    "  float insideMoon = smoothstep(Rm, Rm-0.006, dM);",
    "  float sunVis = sunDisk * (1.0 - insideMoon);",
    "  col = mix(col, u_sun*2.1, sunVis);",
    "  col += u_sun * pow(sunVis, 0.45) * 1.8;",
    "  float er = exp(-abs(dM - Rm*1.05) * 42.0) * u_lens;",
    "  col += u_corona * er * (0.45 + u_tot*0.85);",
    "  float moon = smoothstep(Rm+0.004, Rm-0.004, dM);",
    "  float crater = fbm((p-moonC)*11.0 + 3.1);",
    "  col = mix(col, mix(u_sky*0.10, u_sky*0.22, crater), moon*0.985);",
    "  float limb = exp(-abs(dM - Rm) * 46.0);",
    "  col += u_corona * limb * (0.28 + u_tot*0.6) * (0.6 + 0.4*streak);",
    "  float g = (hash(gl_FragCoord.xy + u_time) - 0.5);",
    "  col += g * 0.028;",
    "  col = col / (1.0 + 0.28 * max(col.r, max(col.g, col.b)));",
    "  float vig = smoothstep(1.15, 0.2, length(q));",
    "  col *= 0.5 + vig*0.78;",
    "  gl_FragColor = vec4(col, 1.0);",
    "}"
  ].join("\n");

  function compile(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
  }
  var vs = compile(gl.VERTEX_SHADER, VERT), fs = compile(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return;
  var prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
  gl.useProgram(prog);
  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  var loc = gl.getAttribLocation(prog, "p");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  var u = {};
  ["u_res", "u_time", "u_ptr", "u_center", "u_zoom", "u_sun", "u_corona", "u_sky", "u_moon", "u_tot", "u_lens", "u_intensity"].forEach(function (n) {
    u[n] = gl.getUniformLocation(prog, n);
  });
  canvas.classList.add("on");

  var still = window.matchMedia("(prefers-reduced-motion: reduce)");
  var ptr = [0.5, 0.5], ptrT = [0.5, 0.5], t0 = performance.now(), raf = 0;
  window.addEventListener("pointermove", function (e) { ptrT = [e.clientX / window.innerWidth, 1 - e.clientY / window.innerHeight]; });

  function frame() {
    var scale = Math.min(window.devicePixelRatio || 1, 2) * 0.7;
    var w = Math.max(1, Math.floor(canvas.clientWidth * scale)), h = Math.max(1, Math.floor(canvas.clientHeight * scale));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); }
    var aspect = w / h;
    // Right of the text on a wide screen; above it, and smaller in the frame, on a narrow one.
    // On a narrow screen the disc is sized from the width (a third of it), not the height.
    var wide = aspect > 1.15;
    var zoom = wide ? 1.0 : 0.265 / (0.34 * aspect);
    var center = wide ? [0.21 * aspect, 0.04] : [0.0, 0.23 * zoom];
    ptr[0] += (ptrT[0] - ptr[0]) * 0.05;
    ptr[1] += (ptrT[1] - ptr[1]) * 0.05;
    gl.uniform2f(u.u_res, w, h);
    gl.uniform1f(u.u_time, still.matches ? 0 : (performance.now() - t0) / 1000);
    gl.uniform2f(u.u_ptr, ptr[0], ptr[1]);
    gl.uniform2f(u.u_center, center[0], center[1]);
    gl.uniform1f(u.u_zoom, zoom);
    gl.uniform3fv(u.u_sun, state.sun);
    gl.uniform3fv(u.u_corona, state.corona);
    gl.uniform3fv(u.u_sky, state.sky);
    gl.uniform2fv(u.u_moon, state.moon);
    gl.uniform1f(u.u_tot, state.tot);
    gl.uniform1f(u.u_lens, state.lens);
    gl.uniform1f(u.u_intensity, state.intensity);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  function loop() {
    frame();
    raf = still.matches || document.hidden ? 0 : requestAnimationFrame(loop);
  }
  window.addEventListener("resize", function () { if (!raf) frame(); });
  document.addEventListener("visibilitychange", function () { if (!document.hidden && !raf) loop(); });
  loop();
})();
