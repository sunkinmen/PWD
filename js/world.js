/* =====================================================================
 * world.js ── 3D 世界（Three.js r158）
 * 卡通描邊渲染（Toon + Outline）、五大工程處場景、動態物件、相機模式
 * 一般內容更新不需要改這個檔案；只有要新增／修改 3D 物件時才動它
 * ===================================================================== */
(function () {
  const T = THREE;
  const V3 = T.Vector3;

  /* ---------- 全域狀態 ---------- */
  const W = {
    renderer: null, scene: null, camera: null, clock: new T.Clock(),
    updaters: [],             // 每幀動畫函式 (t, dt)
    mode: 'overview',         // 'overview' | 'explore'
    quality: 'auto',
    season: 'spring',
    hitboxes: [],
    colliders: [],
    zones: {},
    listeners: { zoneClick: [], proximity: [], frame: [], modeChange: [], npc: [], splash: [] },
    move: { x: 0, y: 0 },     // 手機搖桿輸入
    keys: {},
    riverSamples: [],
    outlines: true
  };

  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || Math.min(innerWidth, innerHeight) < 600;
  const INK = 0x3b4466;

  /* ---------- 材質工具 ---------- */
  const gradMap = (() => {
    const d = new Uint8Array([120, 185, 230, 255]);
    const t = new T.DataTexture(d, 4, 1, T.RedFormat);
    t.minFilter = t.magFilter = T.NearestFilter; t.needsUpdate = true; return t;
  })();
  const matCache = {};
  function toon(color, extra) {
    const key = color + (extra ? JSON.stringify(extra) : '');
    if (!extra && matCache[key]) return matCache[key];
    const m = new T.MeshToonMaterial(Object.assign({ color, gradientMap: gradMap }, extra || {}));
    if (!extra) matCache[key] = m;
    return m;
  }
  const outlineMat = new T.MeshBasicMaterial({ color: INK, side: T.BackSide });
  const outlineList = [];

  // 外框線（Inverted Hull）：依物件尺寸逐軸放大，背面填深藍
  function outline(mesh, w = 0.12) {
    const g = mesh.geometry; g.computeBoundingBox();
    const bb = g.boundingBox, size = new V3(), c = new V3();
    bb.getSize(size); bb.getCenter(c);
    const sx = 1 + 2 * w / Math.max(size.x, 0.6), sy = 1 + 2 * w / Math.max(size.y, 0.6), sz = 1 + 2 * w / Math.max(size.z, 0.6);
    const o = new T.Mesh(g, outlineMat);
    o.scale.set(sx, sy, sz);
    o.position.set(c.x * (1 - sx), c.y * (1 - sy), c.z * (1 - sz));
    o.castShadow = false; o.receiveShadow = false;
    o.userData.isOutline = true;
    mesh.add(o); outlineList.push(o);
    return mesh;
  }

  function M(geo, color, o = {}) {
    const m = new T.Mesh(geo, o.mat || toon(color));
    m.position.set(o.x || 0, o.y || 0, o.z || 0);
    m.rotation.set(o.rx || 0, o.ry || 0, o.rz || 0);
    if (o.s) (typeof o.s === 'number') ? m.scale.setScalar(o.s) : m.scale.set(...o.s);
    m.castShadow = o.cast !== false; m.receiveShadow = o.recv !== false;
    if (o.ol !== 0) outline(m, o.ol || 0.12);
    (o.parent || W.scene).add(m);
    return m;
  }
  const G = (parent, x = 0, y = 0, z = 0) => { const g = new T.Group(); g.position.set(x, y, z); (parent || W.scene).add(g); return g; };
  const box = (w, h, d) => new T.BoxGeometry(w, h, d);
  const cyl = (rt, rb, h, s = 16) => new T.CylinderGeometry(rt, rb, h, s);
  const sph = (r, d = 1) => new T.IcosahedronGeometry(r, d);
  const facet = g => { const n = g.toNonIndexed(); n.computeVertexNormals(); return n; };
  let _dot; const dotTex = () => { if (_dot) return _dot; const c = document.createElement('canvas'); c.width = c.height = 32; const x = c.getContext('2d');
    const g = x.createRadialGradient(16, 16, 0, 16, 16, 15); g.addColorStop(0, '#fff'); g.addColorStop(.6, 'rgba(255,255,255,.9)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 32, 32); return (_dot = new T.CanvasTexture(c)); };
  const rnd = (a, b) => a + Math.random() * (b - a);

  /* ---------- 帶狀幾何（道路、河流） ---------- */
  function ribbon(curve, width, segs, yFn, uvScale = 1) {
    const pos = [], uv = [], idx = [];
    const len = curve.getLength();
    for (let i = 0; i <= segs; i++) {
      const t = i / segs, p = curve.getPointAt(t), tan = curve.getTangentAt(t);
      const n = new V3(-tan.z, 0, tan.x).normalize();
      const y = yFn ? yFn(t) : p.y;
      pos.push(p.x + n.x * width / 2, y, p.z + n.z * width / 2, p.x - n.x * width / 2, y, p.z - n.z * width / 2);
      const v = t * len / (width * uvScale);
      uv.push(0, v, 1, v);
      if (i < segs) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    g.setIndex(idx); g.computeVertexNormals();
    return g;
  }

  function roadTexture() {
    const c = document.createElement('canvas'); c.width = 64; c.height = 128;
    const x = c.getContext('2d');
    x.fillStyle = '#9a9fb3'; x.fillRect(0, 0, 64, 128);
    for (let i = 0; i < 300; i++) { x.fillStyle = `rgba(255,255,255,${Math.random() * .06})`; x.fillRect(Math.random() * 64, Math.random() * 128, 2, 2); }
    x.fillStyle = '#f4f1ea'; x.fillRect(3, 0, 3, 128); x.fillRect(58, 0, 3, 128);
    x.fillStyle = '#ffd98a'; x.fillRect(30, 10, 4, 52);
    const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.colorSpace = T.SRGBColorSpace;
    t.anisotropy = 4; return t;
  }

  /* ---------- 水面 Shader：fbm 波紋法線、菲涅耳天空反射、太陽高光、焦散、岸邊白浪、順流紋理 ---------- */
  const waterMats = [];
  const WATER_NOISE = `
    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
    float noise(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.-2.*f);
      return mix(mix(hash(i),hash(i+vec2(1.,0.)),u.x), mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),u.x), u.y); }
    float fbm(vec2 p){ float v=0., a=.5; for(int i=0;i<4;i++){ v+=a*noise(p); p*=2.03; a*=.5; } return v; }`;
  const WATER_VS = `
    varying vec2 vUv; varying vec3 vWorld;
    #include <fog_pars_vertex>
    void main(){ vUv = uv; vec4 wp = modelMatrix * vec4(position,1.); vWorld = wp.xyz;
      vec4 mvPosition = viewMatrix * wp; gl_Position = projectionMatrix * mvPosition;
      #include <fog_vertex>
    }`;
  function waterMaterial(base = '#8fd6ec', deep = '#3f9bd0', o = {}) {
    const m = new T.ShaderMaterial({
      fog: true, transparent: true, depthWrite: false,
      uniforms: T.UniformsUtils.merge([T.UniformsLib.fog, {
        uTime: { value: 0 }, uShallow: { value: new T.Color(base) }, uDeep: { value: new T.Color(deep) },
        uSky: { value: new T.Color('#dcecfb') }, uSunDir: { value: new V3(.5, .8, .4) },
        uRadial: { value: o.radial ? 1 : 0 }, uFlow: { value: o.flow ?? 1 }
      }]),
      vertexShader: WATER_VS,
      fragmentShader: `
        uniform float uTime, uRadial, uFlow; uniform vec3 uShallow, uDeep, uSky, uSunDir;
        varying vec2 vUv; varying vec3 vWorld;
        #include <fog_pars_fragment>
        ${WATER_NOISE}
        void main(){
          float edge = uRadial > .5 ? .5 - length(vUv - .5) : min(vUv.x, 1. - vUv.x);
          vec2 q = uRadial > .5 ? vWorld.xz*.35 + vec2(uTime*.05, uTime*.03) : vec2(vUv.x*2.5, vUv.y*.8 - uTime*.35*uFlow);
          float e = .04;
          float h0 = fbm(q*2.), hx = fbm(q*2. + vec2(e,0.)), hy = fbm(q*2. + vec2(0.,e));
          float h1 = fbm(vWorld.xz*.6 + vec2(-uTime*.12, uTime*.09));
          vec3 N = normalize(vec3((h0-hx)*9. + (h1-.5)*.3, 1., (h0-hy)*9.));
          vec3 V = normalize(cameraPosition - vWorld);
          float fres = pow(1. - clamp(dot(N, V), 0., 1.), 4.);
          float depth = smoothstep(0., .32, edge);
          vec3 col = mix(uShallow, uDeep, depth);
          col = mix(col, uSky, .16 + fres*.6);
          vec3 H = normalize(normalize(uSunDir) + V);
          col += pow(max(dot(N, H), 0.), 160.) * 1.3;
          col += smoothstep(.72, .78, fbm(q*6. + uTime*.4)) * .2 * depth;
          col += smoothstep(.5, .56, fbm(vWorld.xz*.9 + uTime*.15)) * (1. - depth) * .14;
          float fn = fbm(vec2(vUv.y*6. - uTime*.8*uFlow, vUv.x*14.) + vWorld.xz*.2);
          float foam = 1. - smoothstep(0., .06 + fn*.06, edge);
          col = mix(col, vec3(1.), foam*.88);
          float streak = smoothstep(.64, .7, fbm(vec2(vUv.x*5., vUv.y*1.4 - uTime*.6*uFlow))) * (1. - uRadial);
          col = mix(col, vec3(.96,.99,1.), streak*.28*depth);
          gl_FragColor = vec4(col, clamp(mix(.74, .96, depth) + foam*.2, 0., 1.));
          #include <colorspace_fragment>
          #include <fog_fragment>
        }`
    });
    waterMats.push(m); return m;
  }
  // 瀑布：往下流的水絲＋底部白沫
  function fallMaterial() {
    const m = new T.ShaderMaterial({
      fog: true, transparent: true, depthWrite: false, side: T.DoubleSide,
      uniforms: T.UniformsUtils.merge([T.UniformsLib.fog, { uTime: { value: 0 } }]),
      vertexShader: WATER_VS,
      fragmentShader: `
        uniform float uTime; varying vec2 vUv; varying vec3 vWorld;
        #include <fog_pars_fragment>
        ${WATER_NOISE}
        void main(){
          float s = fbm(vec2(vUv.x*9., vUv.y*2. + uTime*1.8));
          vec3 col = mix(vec3(.62,.86,.96), vec3(1.), smoothstep(.45,.75,s));
          float side = smoothstep(0.,.18,vUv.x)*smoothstep(1.,.82,vUv.x);
          float foam = smoothstep(.25,0.,vUv.y);
          col = mix(col, vec3(1.), foam);
          gl_FragColor = vec4(col, side*(.75 + .25*s));
          #include <colorspace_fragment>
          #include <fog_fragment>
        }`
    });
    waterMats.push(m); return m;
  }

  /* =====================================================================
   * 初始化
   * ===================================================================== */
  function init(container, opts = {}) {
    W.quality = opts.quality || 'auto';
    const hi = W.quality === 'high' || (W.quality === 'auto' && !isMobile);
    W.outlines = W.quality !== 'eco';

    const r = W.renderer = new T.WebGLRenderer({ antialias: !isMobile || hi, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(devicePixelRatio, hi ? 2 : 1.5));
    r.setSize(container.clientWidth, container.clientHeight);
    r.outputColorSpace = T.SRGBColorSpace;
    r.toneMapping = T.ACESFilmicToneMapping; r.toneMappingExposure = 1.05;
    r.shadowMap.enabled = true; r.shadowMap.type = T.PCFSoftShadowMap;
    container.appendChild(r.domElement);

    const s = W.scene = new T.Scene();
    s.fog = new T.Fog(0xeaf1fb, 160, 400);
    W.camera = new T.PerspectiveCamera(isMobile ? 62 : 50, container.clientWidth / container.clientHeight, 0.5, 1600);

    // 光：天空半球光＋暖色太陽
    s.add(new T.HemisphereLight(0xdcecff, 0xf4e6d6, 1.25));
    const sun = W.sun = new T.DirectionalLight(0xfff0dc, 1.7);
    sun.position.set(70, 120, 60);
    sun.castShadow = true;
    const sz = hi ? 2048 : 1024;
    sun.shadow.mapSize.set(sz, sz);
    Object.assign(sun.shadow.camera, { left: -130, right: 130, top: 130, bottom: -130, near: 10, far: 400 });
    sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.4;
    s.add(sun);

    buildSky(opts.skyImage);
    buildGround();
    buildRoads();
    buildRiver();
    buildHub();
    buildNCO();
    buildHEO();
    buildPKL();
    buildSSO();
    buildGEO();
    buildCityFiller();
    buildGroves();
    buildClouds();
    buildBirds();
    buildParticles();
    buildHitboxes();
    setSeason('spring');
    setOutlines(W.outlines);
    bindInput(r.domElement);
    addEventListener('resize', () => resize(container));
    resizeObserver(container);
    animate();
    return W;
  }

  function resizeObserver(c) { if ('ResizeObserver' in window) new ResizeObserver(() => resize(c)).observe(c); }
  function resize(c) {
    const w = c.clientWidth, h = c.clientHeight; if (!w || !h) return;
    W.renderer.setSize(w, h); W.camera.aspect = w / h;
    W.camera.fov = (w < h) ? 66 : (isMobile ? 58 : 50);
    W.camera.updateProjectionMatrix();
  }

  /* =====================================================================
   * 天空：漸層天球＋ Nano Banana 台北全景圓柱（找不到圖時程式繪製）
   * ===================================================================== */
  function buildSky(url) {
    const skyGeo = new T.SphereGeometry(900, 32, 16);
    const skyMat = W.skyMat = new T.ShaderMaterial({
      side: T.BackSide, depthWrite: false, fog: false,
      uniforms: { top: { value: new T.Color('#8fc4ef') }, mid: { value: new T.Color('#cfe6fb') }, bot: { value: new T.Color('#fde8ea') } },
      vertexShader: `varying vec3 vP; void main(){ vP=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);} `,
      fragmentShader: `uniform vec3 top; uniform vec3 mid; uniform vec3 bot; varying vec3 vP;
        void main(){ float h=vP.y; vec3 c = h>0.15 ? mix(mid,top,smoothstep(0.15,0.7,h)) : mix(bot,mid,smoothstep(-0.05,0.15,h)); gl_FragColor=vec4(c,1.);
#include <colorspace_fragment>
}`
    });
    W.scene.add(new T.Mesh(skyGeo, skyMat));

    // 全景圓柱
    const R = 380;
    const panoMat = W.panoMat = new T.ShaderMaterial({
      transparent: true, depthWrite: false, fog: false, side: T.BackSide,
      uniforms: { map: { value: null }, tint: { value: new T.Color('#ffffff') }, haze: { value: new T.Color('#eef3fb') } },
      vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);} `,
      fragmentShader: `uniform sampler2D map; uniform vec3 tint; uniform vec3 haze; varying vec2 vUv;
        void main(){ vec2 u = vec2(vUv.x*2.0, vUv.y); u.x = abs(mod(u.x+1.0,2.0)-1.0); u.x = 1.0-u.x;
          vec4 c = texture2D(map, u);
          float a = smoothstep(0.0,0.10,vUv.y) * (1.0 - smoothstep(0.88,1.0,vUv.y));
          vec3 col = mix(c.rgb*tint, haze, 0.18 + 0.25*(1.0-smoothstep(0.08,0.32,vUv.y)));
          gl_FragColor = vec4(col, a);
#include <colorspace_fragment>
}`
    });
    const setTex = (tex) => {
      tex.colorSpace = T.SRGBColorSpace; tex.minFilter = T.LinearMipmapLinearFilter; tex.anisotropy = 4;
      const img = tex.image, aspect = img.height / img.width;
      const H = (Math.PI * R) * aspect;      // 每張圖覆蓋半圈
      const geo = new T.CylinderGeometry(R, R, H, 96, 1, true);
      if (W.pano) { W.pano.geometry.dispose(); W.scene.remove(W.pano); }
      panoMat.uniforms.map.value = tex;
      const m = W.pano = new T.Mesh(geo, panoMat);
      m.position.y = H / 2 - H * 0.30;       // 讓圖中地平線落在場景地平線附近
      m.rotation.y = 0.7;
      m.renderOrder = -1;
      W.scene.add(m);
    };
    W.setSkyTexture = setTex;
    const fallback = () => setTex(new T.CanvasTexture(paintFallbackSky()));
    if (url) new T.TextureLoader().load(url, setTex, undefined, fallback); else fallback();
  }

  // 備用天空：程式繪製粉彩台北天際線
  function paintFallbackSky() {
    const c = document.createElement('canvas'); c.width = 2048; c.height = 868;
    const x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, 0, 868);
    g.addColorStop(0, '#9ccbf0'); g.addColorStop(.55, '#d9ecfb'); g.addColorStop(.75, '#fde3e6'); g.addColorStop(1, '#f3efe6');
    x.fillStyle = g; x.fillRect(0, 0, 2048, 868);
    const cloud = (cx, cy, s) => { x.fillStyle = 'rgba(255,255,255,.9)'; for (let i = 0; i < 7; i++) { x.beginPath(); x.arc(cx + (i - 3) * 40 * s, cy - Math.sin(i / 6 * Math.PI) * 50 * s, (50 + Math.sin(i * 2) * 15) * s, 0, 7); x.fill(); } };
    [[300, 260, 1.4], [900, 200, 1.1], [1500, 280, 1.6], [1850, 180, .9]].forEach(a => cloud(...a));
    const hills = (col, base, amp, f, ph) => { x.fillStyle = col; x.beginPath(); x.moveTo(0, 868); for (let i = 0; i <= 2048; i += 8) x.lineTo(i, base - Math.abs(Math.sin(i / f + ph)) * amp - Math.sin(i / (f * .37)) * amp * .2); x.lineTo(2048, 868); x.fill(); };
    hills('#b9d6cf', 640, 150, 260, 1); hills('#a9cdb2', 680, 90, 180, 2.2);
    x.fillStyle = '#c5cfe0';
    for (let i = 0; i < 2048; i += 22) { const h = 20 + Math.random() * 60; x.fillRect(i, 700 - h, 18, h + 10); }
    // 101 剪影
    x.fillStyle = '#a7c9c4'; const bx = 1024;
    for (let k = 0; k < 8; k++) { const y = 690 - k * 34; x.beginPath(); x.moveTo(bx - 20, y); x.lineTo(bx + 20, y); x.lineTo(bx + 25, y - 32); x.lineTo(bx - 25, y - 32); x.fill(); }
    x.fillRect(bx - 3, 690 - 8 * 34 - 60, 6, 60);
    x.fillStyle = '#f4f1ea'; x.fillRect(0, 720, 2048, 148);
    return c;
  }

  /* =====================================================================
   * 地面
   * ===================================================================== */
  function buildGround() {
    const far = new T.Mesh(new T.CircleGeometry(372, 64), toon('#dcebd0'));
    far.rotation.x = -Math.PI / 2; far.position.y = -0.05; far.receiveShadow = true; W.scene.add(far);
    const island = new T.Mesh(new T.CircleGeometry(112, 96), toon('#cfe8b5'));
    island.rotation.x = -Math.PI / 2; island.receiveShadow = true; W.scene.add(island);
    // 草地明暗斑塊
    for (let i = 0; i < 26; i++) {
      const r = rnd(30, 105), a = rnd(0, Math.PI * 2);
      const p = new T.Mesh(new T.CircleGeometry(rnd(6, 14), 20), toon(i % 2 ? '#c4e2a8' : '#d8eec0'));
      p.rotation.x = -Math.PI / 2; p.position.set(Math.cos(a) * r, 0.02, Math.sin(a) * r); p.receiveShadow = true; W.scene.add(p);
    }
    // 中央廣場
    const plaza = new T.Mesh(new T.CircleGeometry(15, 64), toon('#f3ece0'));
    plaza.rotation.x = -Math.PI / 2; plaza.position.y = 0.06; plaza.receiveShadow = true; W.scene.add(plaza);
    const ring = new T.Mesh(new T.RingGeometry(14.2, 15, 64), toon('#d9c9b0'));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.08; W.scene.add(ring);
  }

  /* =====================================================================
   * 道路：環狀路串連五處＋放射林蔭步道＋新工處跨河支線
   * ===================================================================== */
  const LOOP_R = 34;
  function buildRoads() {
    const tex = roadTexture();
    const roadMat = new T.MeshToonMaterial({ map: tex, gradientMap: gradMap });
    // 環狀道路
    const pts = []; for (let i = 0; i < 64; i++) { const a = i / 64 * Math.PI * 2; pts.push(new V3(Math.sin(a) * LOOP_R, 0, Math.cos(a) * LOOP_R)); }
    W.loop = new T.CatmullRomCurve3(pts, true);
    const loopMesh = new T.Mesh(ribbon(W.loop, 7, 256, () => 0.12, 1.6), roadMat);
    loopMesh.receiveShadow = true; W.scene.add(loopMesh);
    // 路緣
    const curbMat = toon('#f6efe2');
    [LOOP_R + 3.9, LOOP_R - 3.9].forEach(rr => { const m = new T.Mesh(new T.TorusGeometry(rr, 0.35, 6, 128), curbMat); m.rotation.x = Math.PI / 2; m.position.y = 0.15; m.receiveShadow = true; W.scene.add(m); });

    // 放射步道（工務局 → 各處）＋流動光帶（串連感）
    const pathMat = toon('#efe3cf');
    W.flowMats = [];
    window.ZONES.filter(z => z.id !== 'hub').forEach(z => {
      const [x, zz] = z.pos, len = Math.hypot(x, zz) - 16, ang = Math.atan2(x, zz);
      const g = G(null, 0, 0, 0); g.rotation.y = ang;
      const p = new T.Mesh(new T.PlaneGeometry(4.2, len), pathMat);
      p.rotation.x = -Math.PI / 2; p.position.set(0, 0.1, 15 + len / 2 - 2); p.receiveShadow = true; g.add(p);
      const fm = new T.ShaderMaterial({
        transparent: true, depthWrite: false,
        uniforms: { uTime: { value: 0 }, uCol: { value: new T.Color(z.color) } },
        vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);} `,
        fragmentShader: `uniform float uTime; uniform vec3 uCol; varying vec2 vUv;
          void main(){ float d = fract(vUv.y*6.0 - uTime*0.6); float a = smoothstep(0.0,0.15,d)*smoothstep(0.5,0.15,d);
            float side = smoothstep(0.0,0.3,vUv.x)*smoothstep(1.0,0.7,vUv.x); gl_FragColor=vec4(uCol*1.1, a*side*0.85);
#include <colorspace_fragment>
}`
      });
      W.flowMats.push(fm);
      const f = new T.Mesh(new T.PlaneGeometry(1.0, len), fm);
      f.rotation.x = -Math.PI / 2; f.position.set(0, 0.16, 15 + len / 2 - 2); g.add(f);
      // 步道路燈
      for (let d = 20; d < len + 10; d += 9) { streetLight(g, 2.8, d); streetLight(g, -2.8, d); }
      // 各處入口廣場
      const pl = new T.Mesh(new T.CircleGeometry(8, 40), toon(z.soft));
      pl.rotation.x = -Math.PI / 2; pl.position.set(x, 0.09, zz); pl.receiveShadow = true; W.scene.add(pl);
      const rg = new T.Mesh(new T.RingGeometry(7.4, 8, 40), toon(z.color));
      rg.rotation.x = -Math.PI / 2; rg.position.set(x, 0.11, zz); W.scene.add(rg);
    });

    // 新工處：跨河支線（含斜張橋段）
    const spur = W.spur = new T.CatmullRomCurve3([new V3(-22, 0, 26), new V3(-36, 0, 44), new V3(-42, 0, 62), new V3(-44, 0, 82), new V3(-48, 0, 104)]);
    W.spurY = t => { const d = Math.abs(t - .47), k = Math.min(1, Math.max(0, (d - .185) / .12)); return 0.12 + 2.6 * (1 - k * k * (3 - 2 * k)); };
    W.spurSamples = Array.from({ length: 161 }, (_, i) => { const p = spur.getPointAt(i / 160); p.t = i / 160; return p; });
    const sm = new T.Mesh(ribbon(spur, 6.5, 120, W.spurY, 1.6), roadMat); sm.receiveShadow = true; sm.castShadow = true; W.scene.add(sm);
  }

  function streetLight(parent, x, z, h = 4.2) {
    const g = G(parent, x, 0, z);
    M(cyl(0.12, 0.16, h, 8), '#5e6a8a', { y: h / 2, parent: g, ol: 0.05 });
    const head = M(sph(0.42, 1), '#fff6cf', { y: h + 0.2, parent: g, ol: 0.06, mat: new T.MeshBasicMaterial({ color: '#fff3c4' }) });
    head.castShadow = false;
    return g;
  }

  /* =====================================================================
   * 河流：從大地處山上發源 → 衛工處 → 水利處 → 繞過前方 → 新工處斜張橋
   * ===================================================================== */
  const RIVER_W = 11;
  function buildRiver() {
    const pts = [[16, -60], [28, -58], [44, -56], [66, -48], [76, -18], [74, 16], [66, 46], [38, 62], [0, 66], [-38, 62], [-72, 58], [-120, 64]]
      .map(([x, z]) => new V3(x, 0, z));
    const river = W.river = new T.CatmullRomCurve3(pts);
    const bank = new T.Mesh(ribbon(river, RIVER_W + 7, 220, () => 0.07), toon('#e9dcc0'));
    bank.receiveShadow = true; W.scene.add(bank);
    const bed = new T.Mesh(ribbon(river, RIVER_W, 220, () => 0.1), toon('#7fb9a8'));   // 河床（透出淺色）
    W.scene.add(bed);
    const water = new T.Mesh(ribbon(river, RIVER_W, 260, () => 0.22, 1), waterMaterial('#9fdcec', '#3e98cc'));
    water.renderOrder = 1; W.scene.add(water);
    for (let i = 0; i <= 300; i++) W.riverSamples.push(river.getPointAt(i / 300));
    buildFish();
  }

  /* ---------- 魚群躍出水面（水花＋音效） ---------- */
  function fishMesh(col) {
    const f = G(null);
    M(sph(.32, 2), col, { s: [.55, .7, 1.5], parent: f, ol: .03 });
    M(sph(.2, 1), '#f4f8ff', { y: -.08, z: .08, s: [.5, .5, 1.3], parent: f, ol: 0 });
    const tail = M(new T.ConeGeometry(.3, .45, 4), col, { z: -.62, rx: -Math.PI / 2, s: [.25, 1, 1], parent: f, ol: .02 });
    M(new T.ConeGeometry(.12, .3, 4), col, { y: .26, z: -.05, s: [.3, 1, 1], parent: f, ol: .02 });
    [-1, 1].forEach(s => M(sph(.05, 0), '#2c3554', { x: s * .14, y: .06, z: .36, parent: f, ol: 0 }));
    f.userData.tail = tail; f.visible = false; return f;
  }
  function buildFish() {
    const pool = [], splashes = [];
    for (let i = 0; i < 6; i++) pool.push(fishMesh(['#9ec9e8', '#f2b48a', '#b9c7d6'][i % 3]));
    const ringMat = new T.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: .8, depthWrite: false });
    const dropGeo = new T.BufferGeometry(), DN = 40, dp = new Float32Array(DN * 3); dropGeo.setAttribute('position', new T.BufferAttribute(dp, 3));
    function splash(p) {
      const r = new T.Mesh(new T.RingGeometry(.2, .45, 24), ringMat.clone()); r.rotation.x = -Math.PI / 2; r.position.set(p.x, .26, p.z); W.scene.add(r);
      const pts = new T.Points(dropGeo.clone(), new T.PointsMaterial({ color: '#f2fbff', size: .28, map: dotTex(), transparent: true, depthWrite: false }));
      const v = []; const a = pts.geometry.attributes.position.array;
      for (let i = 0; i < DN; i++) { a[i * 3] = p.x; a[i * 3 + 1] = .3; a[i * 3 + 2] = p.z; v.push([rnd(-1.6, 1.6), rnd(2.5, 5), rnd(-1.6, 1.6)]); }
      W.scene.add(pts); splashes.push({ r, pts, v, t: 0 });
      W.listeners.splash.forEach(f => f(p));
    }
    let next = 2;
    const jumps = [];
    W.updaters.push((t, dt) => {
      next -= dt;
      if (next <= 0) {
        next = rnd(2.5, 6);
        const u = rnd(.08, .95), c = W.river.getPointAt(u), tan = W.river.getTangentAt(u), n = new V3(-tan.z, 0, tan.x);
        const count = 1 + (Math.random() * 3 | 0);
        for (let k = 0; k < count; k++) {
          const f = pool.find(x => !x.visible); if (!f) break;
          const off = rnd(-3, 3), dir = Math.random() < .5 ? 1 : -1;
          const start = c.clone().addScaledVector(n, off).addScaledVector(tan, k * 1.2);
          jumps.push({ f, start, dir: tan.clone().multiplyScalar(dir), t: -k * .18, dur: rnd(.9, 1.2), h: rnd(1.6, 2.6), len: rnd(2.5, 3.8), s0: false, s1: false });
        }
      }
      for (let i = jumps.length - 1; i >= 0; i--) {
        const j = jumps[i]; j.t += dt; if (j.t < 0) continue;
        const k = j.t / j.dur; j.f.visible = k < 1;
        if (!j.s0) { j.s0 = true; splash(j.start); }
        const p = j.start.clone().addScaledVector(j.dir, j.len * k); p.y = .2 + 4 * j.h * k * (1 - k);
        j.f.position.copy(p); j.f.rotation.set(-(1 - 2 * k) * 1.1, Math.atan2(j.dir.x, j.dir.z), 0, 'YXZ');
        j.f.userData.tail.rotation.y = Math.sin(t * 30) * .5;
        if (k >= 1) { if (!j.s1) splash(p.setY(.2)); jumps.splice(i, 1); }
      }
      for (let i = splashes.length - 1; i >= 0; i--) {
        const s = splashes[i]; s.t += dt;
        s.r.scale.setScalar(1 + s.t * 5); s.r.material.opacity = Math.max(0, .8 - s.t * .8);
        const a = s.pts.geometry.attributes.position.array;
        s.v.forEach((v, k) => { v[1] -= 12 * dt; a[k * 3] += v[0] * dt; a[k * 3 + 1] = Math.max(.2, a[k * 3 + 1] + v[1] * dt); a[k * 3 + 2] += v[2] * dt; });
        s.pts.geometry.attributes.position.needsUpdate = true; s.pts.material.opacity = Math.max(0, 1 - s.t * 1.2);
        if (s.t > 1.1) { W.scene.remove(s.r, s.pts); s.r.geometry.dispose(); s.pts.geometry.dispose(); splashes.splice(i, 1); }
      }
    });
  }

  /* =====================================================================
   * 工務局：市府大樓＋臺北101＋全像連結環
   * ===================================================================== */
  function windowTex(base = '#f3eee6', win = '#a9cdee', cols = 8, rows = 6) {
    const c = document.createElement('canvas'); c.width = 128; c.height = 128; const x = c.getContext('2d');
    x.fillStyle = base; x.fillRect(0, 0, 128, 128);
    const cw = 128 / cols, rh = 128 / rows;
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) { x.fillStyle = win; x.fillRect(i * cw + cw * .2, j * rh + rh * .25, cw * .6, rh * .5); x.fillStyle = 'rgba(255,255,255,.55)'; x.fillRect(i * cw + cw * .2, j * rh + rh * .25, cw * .18, rh * .5); }
    const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.wrapS = t.wrapT = T.RepeatWrapping; return t;
  }

  function buildHub() {
    const g = W.zones.hub = G(null, 0, 0, 0);
    // ── 臺北市政府（雙十字平面）：米色石材立面＋深棕入口量體 ──
    const hall = G(g, 0, 0, -4);
    // 依實際尺寸設定窗格 UV：每格 = 一個開間 × 一層樓
    const bayTex = (base, win) => { const c = document.createElement('canvas'); c.width = 64; c.height = 64; const x = c.getContext('2d');
      x.fillStyle = base; x.fillRect(0, 0, 64, 64); x.fillStyle = 'rgba(0,0,0,.06)'; x.fillRect(0, 60, 64, 4); x.fillRect(0, 0, 3, 64);
      x.fillStyle = win; x.fillRect(16, 20, 32, 28); x.fillStyle = 'rgba(255,255,255,.35)'; x.fillRect(16, 20, 32, 5);
      const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = 4; return t; };
    const beigeTex = bayTex('#ead7c1', '#9d8b86');
    const beigeM = new T.MeshToonMaterial({ map: beigeTex, gradientMap: gradMap });
    const wbox = (w, h, d, uw = 1.6, uh = 1.05) => {
      const geo = box(w, h, d), uv = geo.attributes.uv;
      const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
      for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) { const i = f * 4 + k; uv.setXY(i, uv.getX(i) * dims[f][0] / uw, uv.getY(i) * dims[f][1] / uh); }
      return geo;
    };
    const beigeS = beigeM, beigeT = beigeM;
    const H = 11, HT = 14;
    // 東西向主翼（貫穿兩個十字）
    M(wbox(36, H, 8), null, { y: H / 2, parent: hall, mat: beigeS });
    // 兩條南北向翼（十字直劃）
    [-8, 8].forEach(x => M(wbox(7.5, H, 28), null, { x, y: H / 2, parent: hall, mat: beigeS }));
    // 十字交會處高塔
    [-8, 8].forEach(x => {
      M(wbox(9, HT, 9, 1.5, 1.05), null, { x, y: HT / 2, parent: hall, mat: beigeT });
      M(box(9.4, .5, 9.4), '#d6bfa6', { x, y: HT + .25, parent: hall, ol: .06 });
      M(box(3, 1.4, 3), '#d6bfa6', { x, y: HT + 1.2, parent: hall, ol: .05 });
    });
    // 各翼屋頂壓頂
    M(box(36.4, .4, 8.4), '#d6bfa6', { y: H + .2, parent: hall, ol: .05 });
    [-8, 8].forEach(x => M(box(7.9, .4, 28.4), '#d6bfa6', { x, y: H + .2, parent: hall, ol: .05 }));
    // 中央入口量體（深棕花崗岩）＋門廳柱列
    const ent = G(hall, 0, 0, 6);
    M(box(8.5, 6, 5), '#8f6f66', { y: 3, parent: ent });
    M(box(6.4, 3.6, .4), '#4e3c3a', { y: 1.8, z: 2.4, parent: ent, ol: 0 });
    [-2.4, -.8, .8, 2.4].forEach(x => M(box(.5, 3.6, .5), '#9c7b70', { x, y: 1.8, z: 2.65, parent: ent, ol: .03 }));
    M(box(6.8, .45, 1.2), '#7a5d55', { y: 3.75, z: 2.6, parent: ent, ol: .04 });
    // 正門招牌「臺北市政府 TAIPEI CITY HALL」（金色字，深棕石材底）
    const sc = document.createElement('canvas'); sc.width = 1024; sc.height = 300; const sx = sc.getContext('2d');
    sx.fillStyle = '#8f6f66'; sx.fillRect(0, 0, 1024, 300);
    sx.fillStyle = '#e9b866'; sx.strokeStyle = '#6b4a2c'; sx.lineWidth = 6; sx.textAlign = 'center'; sx.textBaseline = 'middle';
    sx.font = '900 150px "Noto Serif TC","Noto Sans TC","PMingLiU","MingLiU",serif';
    sx.strokeText('臺 北 市 政 府', 512, 110); sx.fillText('臺 北 市 政 府', 512, 110);
    sx.font = '800 72px "Outfit","Arial Black",sans-serif'; sx.lineWidth = 4;
    sx.strokeText('TAIPEI CITY HALL', 512, 232); sx.fillText('TAIPEI CITY HALL', 512, 232);
    const stex = new T.CanvasTexture(sc); stex.colorSpace = T.SRGBColorSpace; stex.anisotropy = 8;
    const sign = new T.Mesh(new T.PlaneGeometry(6.6, 1.95), new T.MeshBasicMaterial({ map: stex }));
    sign.position.set(0, 4.95, 2.52); ent.add(sign);
    W.redrawSign = () => { /* 字型載入後重繪 */ };
    if (document.fonts) document.fonts.ready.then(() => { sx.fillStyle = '#8f6f66'; sx.fillRect(0, 0, 1024, 300); sx.fillStyle = '#e9b866';
      sx.font = '900 150px "Noto Serif TC","Noto Sans TC","PMingLiU","MingLiU",serif'; sx.lineWidth = 6; sx.strokeText('臺 北 市 政 府', 512, 110); sx.fillText('臺 北 市 政 府', 512, 110);
      sx.font = '800 72px "Outfit","Arial Black",sans-serif'; sx.lineWidth = 4; sx.strokeText('TAIPEI CITY HALL', 512, 232); sx.fillText('TAIPEI CITY HALL', 512, 232); stex.needsUpdate = true; });
    const clockBar = M(box(3.2, .7, .2), '#2c2a33', { y: 6.5, z: 2.0, parent: ent, ol: .03 });
    const clockLed = M(box(2.8, .35, .05), '#ff5a4f', { y: 6.5, z: 2.13, parent: ent, ol: 0, mat: new T.MeshBasicMaterial({ color: '#ff6a5c' }) });
    W.updaters.push(t => { clockLed.scale.x = .85 + ((t | 0) % 2) * .15; });
    // 入口上方屋頂綠籬（柏樹列）
    M(box(8.2, .4, 1.2), '#7a5d55', { y: 6.2, z: .8, parent: ent, ol: .03 });                         // 屋頂植栽槽
    for (let i = -4; i <= 4; i++) M(new T.ConeGeometry(.42, 1.8, 7), i % 2 ? '#5f9f6c' : '#6fae7c', { x: i * .9, y: 7.3, z: .8, parent: ent, ol: .04 });
    // 中央量體頂部的國旗旗桿
    M(cyl(.05, .07, 4.1, 8), '#e8e8f0', { y: H + 2, z: 3.2, parent: hall, ol: .03 });
    // 中華民國國旗（依比例繪製：紅底、左上青天、十二道光芒白日）
    const fc = document.createElement('canvas'); fc.width = 768; fc.height = 512; const fx = fc.getContext('2d');
    fx.fillStyle = '#de0a17'; fx.fillRect(0, 0, 768, 512);
    fx.fillStyle = '#0d2a8a'; fx.fillRect(0, 0, 384, 256);
    const cx = 192, cy = 128, Ro = 96, Ri = 51, Rd = 48;          // 光芒外徑、內徑、白日半徑（含藍環）
    fx.fillStyle = '#ffffff'; fx.beginPath();
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2 - Math.PI / 2, a1 = a - Math.PI / 12, a2 = a + Math.PI / 12;
      fx.moveTo(cx + Math.cos(a1) * Ri, cy + Math.sin(a1) * Ri); fx.lineTo(cx + Math.cos(a) * Ro, cy + Math.sin(a) * Ro); fx.lineTo(cx + Math.cos(a2) * Ri, cy + Math.sin(a2) * Ri); }
    fx.fill();
    fx.beginPath(); fx.arc(cx, cy, Rd + 3.5, 0, Math.PI * 2); fx.fillStyle = '#0d2a8a'; fx.fill();
    fx.beginPath(); fx.arc(cx, cy, Rd, 0, Math.PI * 2); fx.fillStyle = '#ffffff'; fx.fill();
    const ftex = new T.CanvasTexture(fc); ftex.colorSpace = T.SRGBColorSpace; ftex.anisotropy = 8;
    const fgeo = new T.PlaneGeometry(2.1, 1.4, 16, 6); fgeo.translate(1.05, 0, 0);
    const fbase = fgeo.attributes.position.array.slice();
    const nflag = new T.Mesh(fgeo, new T.MeshToonMaterial({ map: ftex, gradientMap: gradMap, side: T.DoubleSide }));
    nflag.position.set(.06, H + 3.25, 3.2); nflag.castShadow = true; hall.add(nflag);
    M(sph(.12, 1), '#f3d9a8', { y: H + 4.05, z: 3.2, parent: hall, ol: .02 });                 // 旗桿頂球
    W.updaters.push(t => { const a = fgeo.attributes.position.array;
      for (let i = 0; i < a.length; i += 3) { const x = fbase[i], k = x / 2.1; a[i + 2] = Math.sin(x * 3 - t * 4) * .14 * k + Math.sin(fbase[i + 1] * 2 + t * 3) * .03 * k; }
      fgeo.attributes.position.needsUpdate = true; fgeo.computeVertexNormals(); });
    // 前廣場路燈（市府前 Y 形燈）
    [-1, 1].forEach(sx => [10, 15].forEach(z => {
      const l = G(hall, sx * 5, 0, z);
      M(cyl(.12, .16, 5.5, 8), '#f2f2f2', { y: 2.75, rz: sx * .12, parent: l, ol: .04 });
      M(box(1.6, .15, .3), '#f2f2f2', { x: sx * .9, y: 5.5, parent: l, ol: .03 });
    }));
    // 兩側綠籬
    [-1, 1].forEach(sx => M(box(1.4, 1, 8), '#7fbf88', { x: sx * 13, y: .5, z: 13, parent: hall, ol: .05 }));
    W.colliders.push({ x: 0, z: -4, r: 6 }, { x: -8, z: -4, r: 6 }, { x: 8, z: -4, r: 6 },
      { x: -8, z: 6, r: 4.5 }, { x: 8, z: 6, r: 4.5 }, { x: -8, z: -14, r: 4.5 }, { x: 8, z: -14, r: 4.5 },
      { x: -14, z: -4, r: 4.5 }, { x: 14, z: -4, r: 4.5 }, { x: 0, z: 3, r: 5 });

    // ── 臺北101（八節竹節造型，頂部塔冠連續無斷層）──
    const t101 = G(g, 24, 0, -4);   // 101 位於市政府東側（+x = 東，-z = 北）
    const glass = '#9fd3c9';
    M(box(7, 5, 7), '#e9e4da', { y: 2.5, parent: t101 });
    M(cyl(3.0, 4.2, 6, 4), glass, { y: 8, ry: Math.PI / 4, parent: t101 });
    let ty = 11;
    for (let k = 0; k < 8; k++) {
      M(cyl(3.6, 2.7, 4.4, 4), glass, { y: ty + 2.2, ry: Math.PI / 4, parent: t101, ol: 0.1 });
      M(cyl(3.75, 3.75, .3, 4), '#e8f4f0', { y: ty + 4.4, ry: Math.PI / 4, parent: t101, ol: 0.05 });
      ty += 4.4;
    }
    M(cyl(2.4, 2.9, 3.2, 4), glass, { y: ty + 1.6, ry: Math.PI / 4, parent: t101 });  ty += 3.2;   // 塔頂
    M(cyl(2.6, 2.6, .3, 4), '#e8f4f0', { y: ty + .15, ry: Math.PI / 4, parent: t101, ol: .04 }); ty += .3;
    M(cyl(1.3, 1.7, 2.6, 8), '#e8f4f0', { y: ty + 1.3, parent: t101 }); ty += 2.6;                 // 塔冠
    M(cyl(.9, 1.1, 1.4, 8), glass, { y: ty + .7, parent: t101, ol: .04 }); ty += 1.4;
    M(cyl(.12, .35, 8, 6), '#c9d3e6', { y: ty + 4, parent: t101, ol: 0.04 }); ty += 8;             // 天線
    const tip = M(sph(.35, 1), '#ff8fa3', { y: ty + .2, parent: t101, ol: 0, mat: new T.MeshBasicMaterial({ color: '#ff9fb1' }) });
    W.updaters.push(t => { tip.material.color.setHSL(.97, .9, .72 + Math.sin(t * 3) * .12); });
    W.colliders.push({ x: 24, z: -4, r: 4.8 });

    // 市府前彩虹步道（對應實景）
    const rb = G(g, 0, 0, 17);
    ['#e85d5d', '#f39a4a', '#f5d04f', '#5fbf73', '#4f9be0', '#8a6fd0'].forEach((c, i) => {
      const st = new T.Mesh(new T.PlaneGeometry(26, 1.15), toon(c));
      st.rotation.x = -Math.PI / 2; st.position.set(0, .13 + i * .001, -2.9 + i * 1.15); st.receiveShadow = true; rb.add(st);
    });
    for (let k = -2; k <= 2; k++) { const ln = new T.Mesh(new T.PlaneGeometry(.12, 6.9), toon('#ffffff'));
      ln.rotation.x = -Math.PI / 2; ln.position.set(k * 5.2, .14, 0); rb.add(ln); }
    // 廣場花盆列（實景的方形植栽盆）
    [-1, 1].forEach(sx => { for (let i = 0; i < 4; i++) { const pt = G(rb, sx * (6 + i * 2.6), 0, 5.2);
      M(cyl(.55, .4, .8, 6), '#4b4650', { y: .4, parent: pt, ol: .03 }); M(sph(.55, 1), '#7fbf88', { y: 1, parent: pt, ol: .03 }); } });
  }

  /* =====================================================================
   * 新建工程處：路平施工（壓路機）＋斜張橋
   * ===================================================================== */
  function buildNCO() {
    const [zx, zz] = zoneById('nco').pos;
    const g = W.zones.nco = G(null, zx, 0, zz);
    // 路平施工區：刨鋪中路面（新鋪黑亮、舊路面淺灰）
    const patch = new T.Mesh(new T.PlaneGeometry(16, 7), toon('#7a7f94'));
    patch.rotation.x = -Math.PI / 2; patch.position.set(0, 0.14, -4); patch.receiveShadow = true; g.add(patch);
    const done = new T.Mesh(new T.PlaneGeometry(16, 7), toon('#3f4356'));
    done.rotation.x = -Math.PI / 2; done.position.set(0, 0.15, -4); done.scale.x = .01; done.receiveShadow = true; g.add(done);
    const roller = W.roller = makeRoller(); roller.position.set(0, .15, -4); g.add(roller);
    let lastX = 0;
    W.updaters.push((t, dt) => {
      const p = Math.sin(t * .3); roller.position.x = p * 5.2;
      const v = (roller.position.x - lastX) / Math.max(dt, 1e-4); lastX = roller.position.x;
      roller.userData.drive(t, dt, v);
      const cover = (p + 1) / 2; done.scale.x = Math.max(.01, cover); done.position.x = -8 + 8 * cover;
    });
    // 交通錐、紐澤西護欄、施工看板、拒馬燈
    for (let i = 0; i < 6; i++) cone(g, -8 + i * 3.2, 0.2);
    for (let i = 0; i < 6; i++) cone(g, -8 + i * 3.2, -8.2);
    [-9.4, 9.4].forEach(x => { const b = G(g, x, 0, -4); b.rotation.y = Math.PI / 2;
      M(box(3, .9, .5), '#ffffff', { y: .45, parent: b, ol: .03 }); M(box(3.02, .25, .52), '#e0707e', { y: .65, parent: b, ol: 0 });
      const fl = M(sph(.14, 1), '#ffb84d', { y: 1.05, parent: b, ol: 0, mat: new T.MeshBasicMaterial({ color: '#ffb84d' }) }); W.updaters.push(t => (fl.visible = ((t * 2.5) | 0) % 2 === 0)); });
    const sign = G(g, 9.5, 0, 0.8);
    M(box(.15, 3, .15), '#5e6a8a', { x: -1.2, y: 1.5, parent: sign, ol: .03 }); M(box(.15, 3, .15), '#5e6a8a', { x: 1.2, y: 1.5, parent: sign, ol: .03 });
    const st = textTex(512, 320, (x, w, h) => { x.fillStyle = '#ffffff'; x.fillRect(0, 0, w, h); x.fillStyle = '#e0707e'; x.fillRect(0, 0, w, 80);
      x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = `900 46px ${FONT_TC}`; x.fillText('路平專案施工中', w / 2, 42);
      x.fillStyle = '#2c3554'; x.font = `700 30px ${FONT_TC}`; ['工程：道路刨鋪改善', '主辦：臺北市政府工務局', '　　　新建工程處', '造成不便 敬請見諒'].forEach((s, i) => x.fillText(s, w / 2, 120 + i * 50)); });
    const sp = new T.Mesh(new T.PlaneGeometry(2.9, 1.8), new T.MeshBasicMaterial({ map: st })); sp.position.set(0, 3.4, .09); sign.add(sp);
    M(box(3, 1.9, .15), '#ffffff', { y: 3.4, parent: sign, ol: .04 });
    buildZhongzheng();
  }
  function cone(parent, x, z) {
    const c = G(parent, x, 0, z);
    M(cyl(.05, .38, .9, 12), '#ff9e6b', { y: .45, parent: c, ol: .04 });
    M(cyl(.22, .29, .2, 12), '#ffffff', { y: .5, parent: c, ol: 0 });
    M(box(.8, .08, .8), '#3d4258', { y: .04, parent: c, ol: 0 });
  }

  /* ---------- 雙鋼輪震動壓路機（仿實物：前後鋼輪、鉸接車架、ROPS 頂棚、旋轉警示燈、灑水箱、排氣、新建工程處字樣）---------- */
  function makeRoller() {
    const r = G(null), Y = '#ffcf3f', Yd = '#e8b42a', K = '#2f3344', S = '#b9c0cf';
    const drums = [];
    [-1.75, 1.75].forEach(x => {
      const d = G(r, x, .78, 0);
      M(cyl(.76, .76, 2.15, 28), S, { rx: Math.PI / 2, parent: d, ol: .04 });
      [-1.09, 1.09].forEach(z => M(cyl(.6, .6, .04, 20), '#8d93a8', { z, rx: Math.PI / 2, parent: d, ol: 0 }));
      for (let i = 0; i < 6; i++) M(box(.05, .05, 2.17), '#a3aabb', { y: Math.cos(i) * .74, x: Math.sin(i) * .74, parent: d, ol: 0, cast: false });
      drums.push(d);
      // 鋼輪叉架（黃）＋刮泥板
      [-1.22, 1.22].forEach(z => M(box(1.7, 1.25, .16), Y, { x, y: 1.05, z, parent: r, ol: .03 }));
      M(box(.12, .14, 2.3), K, { x: x + Math.sign(x) * .84, y: .55, parent: r, ol: 0 });
      M(box(.5, .35, 2.4), Y, { x, y: 1.7, parent: r, ol: .03 });
    });
    // 中段機體（引擎蓋＋灑水箱）
    M(box(2.0, 1.15, 1.9), Y, { y: 1.9, parent: r });
    const hood = new T.Mesh(new T.CylinderGeometry(.95, .95, 2.0, 20, 1, false, 0, Math.PI), toon(Y)); hood.rotation.z = Math.PI / 2; hood.rotation.y = Math.PI / 2;
    hood.scale.set(1, 1, .35); hood.position.set(0, 2.47, 0); hood.castShadow = true; r.add(hood); outline(hood, .03);
    for (let i = 0; i < 6; i++) M(box(.06, .5, 1.5), K, { x: -.95 + i * .06 + .65, y: 1.95, z: 0, parent: r, ol: 0, cast: false });
    // 鉸接接頭
    M(cyl(.22, .22, .7, 12), K, { x: -1.0, y: 1.2, parent: r, ol: .02 });
    // 側面字樣「新建工程處」
    const deco = textTex(512, 128, (x, w, h) => { x.fillStyle = '#ffcf3f'; x.fillRect(0, 0, w, h);
      x.fillStyle = '#2f3344'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = `900 64px ${FONT_TC}`; x.fillText('新建工程處', w / 2, 52);
      x.font = `700 24px ${FONT_TC}`; x.fillText('臺北市政府工務局', w / 2, 104);
      for (let i = 0; i < 6; i++) { x.fillStyle = i % 2 ? '#2f3344' : '#ffcf3f'; } });
    [-1, 1].forEach(s => { const p = new T.Mesh(new T.PlaneGeometry(1.85, .46), new T.MeshBasicMaterial({ map: deco })); p.position.set(0, 1.95, s * .955); if (s < 0) p.rotation.y = Math.PI; r.add(p); });
    // 後方黃黑斜紋警示條
    const chev = textTex(256, 64, (x) => { x.fillStyle = '#ffcf3f'; x.fillRect(0, 0, 256, 64); x.fillStyle = '#2f3344'; for (let i = -64; i < 320; i += 40) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 20, 0); x.lineTo(i - 44, 64); x.lineTo(i - 64, 64); x.fill(); } });
    [-1, 1].forEach(s => { const c = new T.Mesh(new T.PlaneGeometry(2.3, .3), new T.MeshBasicMaterial({ map: chev })); c.position.set(s * 2.43, 1.75, 0); c.rotation.y = s * Math.PI / 2; r.add(c); });
    // 駕駛平台、座椅、方向盤、儀表
    M(box(1.6, .12, 1.9), K, { x: .2, y: 2.62, parent: r, ol: .02 });
    M(box(.6, .14, .6), '#3d4258', { x: -.2, y: 2.95, parent: r, ol: .02 }); M(box(.12, .7, .6), '#3d4258', { x: -.5, y: 3.25, parent: r, ol: .02 });
    M(cyl(.05, .05, .7, 6), K, { x: .55, y: 3.0, rz: .5, parent: r, ol: 0 });
    M(new T.TorusGeometry(.24, .04, 6, 18), K, { x: .4, y: 3.32, rz: Math.PI / 2 + .5, ry: Math.PI / 2, parent: r, ol: 0 });
    M(box(.3, .4, .7), '#3d4258', { x: .75, y: 2.9, parent: r, ol: .02 });
    // 駕駛員（反光背心、黃帽）
    const drv = makeNPC('road'); drv.scale.setScalar(.62); drv.position.set(-.2, 2.6, 0); drv.rotation.y = Math.PI / 2; r.add(drv);
    drv.userData.legs.forEach(l => (l.rotation.x = -1.4)); drv.position.y = 2.42;
    // ROPS 頂棚
    [[-.75, -.85], [-.75, .85], [.85, -.85], [.85, .85]].forEach(([x, z]) => M(box(.1, 1.9, .1), K, { x, y: 3.55, z, parent: r, ol: .02 }));
    M(box(1.9, .14, 2.0), Y, { y: 4.55, parent: r, ol: .03 });
    const beacon = G(r, 0, 4.75, 0); M(cyl(.16, .2, .25, 12), '#ff9e3d', { parent: beacon, ol: .02, mat: new T.MeshBasicMaterial({ color: '#ffb366' }) });
    const beam = new T.Mesh(new T.PlaneGeometry(1.4, .3), new T.MeshBasicMaterial({ color: '#ffb366', transparent: true, opacity: .35, depthWrite: false, side: T.DoubleSide, blending: T.AdditiveBlending }));
    beam.position.x = .7; beacon.add(beam);
    // 車燈、後照鏡、排氣管
    [-2.45, 2.45].forEach(x => [-.6, .6].forEach(z => M(box(.06, .16, .26), '#fff6c9', { x, y: 2.2, z, parent: r, ol: 0, mat: new T.MeshBasicMaterial({ color: '#fff6c9' }) })));
    [-1, 1].forEach(s => { M(cyl(.02, .02, .5, 4), K, { x: .9, y: 3.7, z: s * 1.05, rz: .3, parent: r, ol: 0 }); M(box(.05, .22, .16), K, { x: 1.05, y: 3.95, z: s * 1.1, parent: r, ol: 0 }); });
    M(cyl(.07, .07, .9, 8), '#3d4258', { x: -.8, y: 2.95, z: -.75, parent: r, ol: .02 });
    // 排氣煙
    const puffs = [];
    for (let i = 0; i < 6; i++) { const p = new T.Sprite(new T.SpriteMaterial({ map: dotTex(), color: '#dfe3ea', transparent: true, opacity: 0, depthWrite: false })); r.add(p); puffs.push({ p, t: i / 6 }); }
    r.userData.drive = (t, dt, v) => {
      drums.forEach(d => (d.rotation.z -= v * dt / .76));
      r.position.y = .15 + Math.sin(t * 60) * .012;                         // 振動
      beacon.rotation.y += dt * 6;
      puffs.forEach(o => { o.t = (o.t + dt * .6) % 1; o.p.position.set(-.8 - o.t * .6, 3.4 + o.t * 1.6, -.75); o.p.scale.setScalar(.3 + o.t * .9); o.p.material.opacity = .45 * (1 - o.t); });
    };
    r.userData.drivers = drv;
    return r;
  }

  /* ---------- 新中正橋（仿實體：跨距最大之三點式鋼拱橋，雙拱肋內傾、吊索、雙向車道＋人行自行車道）---------- */
  function tubeWithOutline(parent, curve, r, col, segs = 64) {
    const m = new T.Mesh(new T.TubeGeometry(curve, segs, r, 10, false), toon(col)); m.castShadow = true; parent.add(m);
    const o = new T.Mesh(new T.TubeGeometry(curve, segs, r + .08, 10, false), outlineMat); parent.add(o); outlineList.push(o);
    return m;
  }
  function buildZhongzheng() {
    const tB = W.bridgeT = 0.47, p = W.spur.getPointAt(tB), tan = W.spur.getTangentAt(tB);
    const bg = G(null, p.x, 0, p.z); bg.rotation.y = Math.atan2(tan.x, tan.z);
    const deckY = W.spurY(tB), L = 30, Hh = 11, half = L / 2 - 1;
    // 橋面版、邊梁、人行自行車道（綠色鋪面）
    M(box(10.2, .8, L), '#eceae4', { y: deckY - .45, parent: bg });
    [-5.15, 5.15].forEach(x => M(box(.5, 1.3, L), '#dfe6ee', { x, y: deckY - .3, parent: bg, ol: .04 }));
    [-4.25, 4.25].forEach(x => { const lane = new T.Mesh(new T.PlaneGeometry(1.5, L), toon('#8fcf9a')); lane.rotation.x = -Math.PI / 2; lane.position.set(x, deckY + .02, 0); bg.add(lane); });
    // 欄杆（立柱＋扶手）
    [-5.1, 5.1].forEach(x => { for (let z = -L / 2; z <= L / 2; z += 1.2) M(cyl(.04, .04, .9, 5), '#9aa3b5', { x, y: deckY + .45, z, parent: bg, ol: 0, cast: false });
      M(box(.08, .08, L), '#cfd6e2', { x, y: deckY + .92, parent: bg, ol: .01 }); });
    // 雙拱肋（內傾）＋橫撐＋吊索
    const rib = s => new T.CatmullRomCurve3(Array.from({ length: 25 }, (_, i) => { const u = i / 24, z = -half + u * 2 * half, y = deckY + .3 + Hh * (1 - Math.pow(z / half, 2)); return new V3(s * (4.3 - .22 * (y - deckY)), y, z); }));
    const ribs = [rib(-1), rib(1)];
    ribs.forEach(c => tubeWithOutline(bg, c, .42, '#f6f7fb'));
    for (let k = 0; k < 5; k++) { const u = .3 + k * .1, a = ribs[0].getPointAt(u), b = ribs[1].getPointAt(u); tube(bg, a, b, .2, '#e6ebf3', .03); }
    for (let i = 1; i < 14; i++) { const u = i / 14; [0, 1].forEach(s => { const a = ribs[s].getPointAt(u); tube(bg, a, new V3(s ? 4.05 : -4.05, deckY + .1, a.z), .045, '#7f8aa3', 0); }); }
    // 拱腳（橋台）與橋墩
    [-1, 1].forEach(sz => { M(box(10.6, deckY + .8, 2.8), '#d9d4c8', { y: (deckY - .4) / 2, z: sz * (L / 2 - 1), parent: bg, ol: .05 });
      [-1, 1].forEach(sx => M(box(1.4, 1.2, 1.4), '#cfc9bc', { x: sx * 4.3, y: deckY + .5, z: sz * (half + .1), parent: bg, ol: .03 })); });
    // 橋頭名柱「中正橋」
    const nt = textTex(128, 384, (x, w, h) => { x.fillStyle = '#efe9dc'; x.fillRect(0, 0, w, h); x.fillStyle = '#5b4632'; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.font = `900 84px "Noto Serif TC",${FONT_TC}`; ['中', '正', '橋'].forEach((c, i) => x.fillText(c, w / 2, 70 + i * 120)); });
    [-1, 1].forEach(sz => { const pl = G(bg, 6.2, deckY, sz * (L / 2 + .6)); M(box(1, 3, 1), '#efe9dc', { y: 1.5, parent: pl, ol: .04 });
      [0, Math.PI].forEach(r => { const f = new T.Mesh(new T.PlaneGeometry(.8, 2.4), new T.MeshBasicMaterial({ map: nt })); f.position.set(0, 1.5, .51 * Math.cos(r)); f.rotation.y = r; pl.add(f); }); });
    // 橋燈
    for (let z = -12; z <= 12; z += 6) [-1, 1].forEach(s => { const l = G(bg, s * 5.0, deckY, z);
      M(cyl(.06, .08, 3.2, 6), '#cfd6e2', { y: 1.6, parent: l, ol: .02 }); M(box(.7, .1, .2), '#cfd6e2', { x: -s * .3, y: 3.2, parent: l, ol: .02 });
      M(box(.3, .08, .18), '#fff6c9', { x: -s * .55, y: 3.13, parent: l, ol: 0, mat: new T.MeshBasicMaterial({ color: '#fff6c9' }) }); });
    // 舊川端橋（保留之歷史鋼桁架，緊鄰新橋下游側，人行自行車用）
    const old = G(bg, 9.5, 0, 0);
    M(box(3.4, .5, L - 2), '#c9b9a0', { y: deckY - .7, parent: old });
    [-1.6, 1.6].forEach(x => { M(box(.15, .15, L - 2), '#7a8a9c', { x, y: deckY + .8, parent: old, ol: 0 });
      for (let z = -13; z <= 13; z += 2) tube(old, new V3(x, deckY - .45, z), new V3(x, deckY + .8, z + 1), .05, '#7a8a9c', 0); });
    [-6, 0, 6].forEach(z => M(cyl(.5, .6, deckY, 10), '#cfc9bc', { y: deckY / 2 - .7, z, parent: old, ol: .03 }));
    W.bridgeCenter = new V3(p.x, deckY, p.z);
  }

  /* =====================================================================
   * 水利工程處：抽水站＋疏散門＋河濱自行車＋渡船
   * ===================================================================== */
  /* ---------- 文字貼圖（招牌） ---------- */
  function textTex(w, h, draw) {
    const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); draw(x, w, h);
    const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 8;
    if (document.fonts) document.fonts.ready.then(() => { x.clearRect(0, 0, w, h); draw(x, w, h); t.needsUpdate = true; });
    return t;
  }
  const FONT_TC = '"Noto Sans TC","Microsoft JhengHei",sans-serif';
  // 選用貼圖：assets/tex/ 有圖就用（Nano Banana 生成），沒有就用程式繪製
  function optTex(url, fallback, onload) {
    const t = fallback;
    new T.TextureLoader().load(url, img => { img.colorSpace = T.SRGBColorSpace; img.anisotropy = 8; img.wrapS = t.wrapS; img.wrapT = t.wrapT; img.repeat.copy(t.repeat); onload(img); }, undefined, () => {});
    return t;
  }

  /* =====================================================================
   * 水利工程處：抽水站（仿實體造型）＋堤防彩繪牆＋疏散門＋河濱自行車＋渡船
   * ===================================================================== */
  function buildHEO() {
    const [zx, zz] = zoneById('heo').pos;
    const g = W.zones.heo = G(null, zx, 0, zz);
    // ── 抽水站：主機房＋出水閘箱＋變電室 ──
    const st = G(null, 60, 0, 15); st.rotation.y = -Math.PI / 2 + .12;     // 正面朝市區、出水口朝河
    const concrete = '#eef0f2', blue = '#5f9fd6';
    // 主機房
    M(box(15, 7.5, 8), concrete, { y: 3.75, parent: st });
    // 立面垂直遮陽板＋帶狀玻璃
    for (let i = -6; i <= 6; i++) M(box(.35, 6.2, .5), '#dfe4ea', { x: i * 1.1, y: 3.6, z: 4.15, parent: st, ol: .02 });
    M(box(14.2, 1.6, .2), '#9fcbe8', { y: 4.6, z: 4.02, parent: st, ol: 0 });
    M(box(14.2, 1.1, .2), '#9fcbe8', { y: 2.2, z: 4.02, parent: st, ol: 0 });
    // 頂部藍色飾帶＋招牌
    M(box(15.6, 1.4, 8.6), blue, { y: 8.1, parent: st, ol: .06 });
    const signT = textTex(1024, 160, (x, w, h) => { x.fillStyle = '#5f9fd6'; x.fillRect(0, 0, w, h);
      x.fillStyle = '#ffffff'; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.font = `900 78px ${FONT_TC}`; x.fillText('河 濱 抽 水 站', w / 2, 62);
      x.font = `700 30px Outfit, ${FONT_TC}`; x.fillText('TAIPEI PUBLIC WORKS · PUMPING STATION', w / 2, 128); });
    const sign = new T.Mesh(new T.PlaneGeometry(13, 2.03), new T.MeshBasicMaterial({ map: signT })); sign.position.set(0, 8.1, 4.32); st.add(sign);
    // 入口雨庇與大門
    M(box(5, .3, 2), '#ffffff', { y: 3.1, z: 5, parent: st, ol: .04 });
    M(box(3.4, 2.9, .2), '#4b5d78', { y: 1.45, z: 4.12, parent: st, ol: .02 });
    const plate = textTex(512, 128, (x, w, h) => { x.fillStyle = '#ffffff'; x.fillRect(0, 0, w, h); x.fillStyle = '#2c3554'; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.font = `700 40px ${FONT_TC}`; x.fillText('臺北市政府工務局水利工程處', w / 2, 64); });
    const pl = new T.Mesh(new T.PlaneGeometry(4, 1), new T.MeshBasicMaterial({ map: plate })); pl.position.set(0, 3.7, 6.02); st.add(pl);
    // 屋頂設備
    [[-5, -2], [-2, -2], [3, -1]].forEach(([x, z]) => { M(box(2, 1, 2), '#d6dbe3', { x, y: 9.3, z, parent: st, ol: .03 });
      const fan = M(cyl(.7, .7, .1, 16), '#9aa3b5', { x, y: 9.85, z, parent: st, ol: 0 }); W.updaters.push((t, dt) => { fan.rotation.y += dt * 4; }); });
    M(cyl(.06, .06, 4, 6), '#9aa3b5', { x: 6, y: 10.8, z: 2, parent: st, ol: .02 });
    // 出水閘箱（往河側）＋四孔閘門＋出水水流
    const out = G(st, 0, 0, -6.5);
    M(box(13, 4.2, 5), '#e2e5e9', { y: 2.1, parent: out });
    M(box(13.4, .5, 5.4), blue, { y: 4.4, parent: out, ol: .04 });
    W.pumpJets = [];
    for (let i = 0; i < 4; i++) {
      const x = -4.5 + i * 3;
      M(box(2.2, 1.8, .3), '#38455e', { x, y: 1.3, z: -2.55, parent: out, ol: .02 });
      M(box(2.5, .25, .4), '#ffd166', { x, y: 3.6, z: -2.55, parent: out, ol: .02 });          // 閘門吊架
      [-1.15, 1.15].forEach(dx => M(box(.2, 3.4, .4), '#ffd166', { x: x + dx, y: 1.9, z: -2.55, parent: out, ol: .02 }));
      const jet = new T.Mesh(new T.PlaneGeometry(1.8, 3.2, 1, 1), fallMaterial());
      jet.position.set(x, .7, -3.6); jet.rotation.x = -1.15; out.add(jet); W.pumpJets.push(jet);
    }
    // 變電室
    M(box(4, 3, 4), '#f6f3ee', { x: -10.5, y: 1.5, z: 1, parent: st });
    M(box(4.4, .4, 4.4), blue, { x: -10.5, y: 3.2, z: 1, parent: st, ol: .03 });
    W.colliders.push({ x: 60, z: 15, r: 9 }, { x: 60, z: 4.5, r: 5 }, { x: 60, z: 25.5, r: 5 });

    // ── 堤防彩繪牆＋疏散門 ──
    const LX = 59.5, LZ = 36, LR = -.42; const lv = G(null, LX, 0, LZ); lv.rotation.y = LR;
    const muralFallback = textTex(2048, 256, (x, w, h) => {
      const gr = x.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#cfe8f7'); gr.addColorStop(1, '#eaf6ff'); x.fillStyle = gr; x.fillRect(0, 0, w, h);
      for (let i = 0; i < 3; i++) { x.fillStyle = ['#9fd3ea', '#7fc0e3', '#5fa9d8'][i]; x.beginPath(); x.moveTo(0, h);
        for (let k = 0; k <= w; k += 16) x.lineTo(k, h * (.55 + i * .13) + Math.sin(k / (90 - i * 20) + i) * 14); x.lineTo(w, h); x.fill(); }
      const fish = (cx, cy, s, c) => { x.fillStyle = c; x.beginPath(); x.ellipse(cx, cy, 34 * s, 16 * s, 0, 0, 7); x.fill(); x.beginPath(); x.moveTo(cx - 30 * s, cy); x.lineTo(cx - 54 * s, cy - 16 * s); x.lineTo(cx - 54 * s, cy + 16 * s); x.fill(); x.fillStyle = '#fff'; x.beginPath(); x.arc(cx + 18 * s, cy - 4 * s, 4 * s, 0, 7); x.fill(); };
      for (let i = 0; i < 14; i++) fish(100 + i * 140, 150 + Math.sin(i) * 40, .9 + (i % 3) * .2, ['#ffb38a', '#ffd166', '#ff9fb6', '#ffffff'][i % 4]);
      x.fillStyle = '#2c3554'; x.font = `900 46px ${FONT_TC}`; x.fillText('愛河護水・臺北水岸', 60, 70);
    });
    const muralMat = new T.MeshToonMaterial({ map: muralFallback, gradientMap: gradMap });
    optTex('assets/tex/levee-mural.jpg', muralFallback, t => { muralMat.map = t; muralMat.needsUpdate = true; });
    const L = 24, gap = 4.6;
    [-1, 1].forEach(s => {
      const len = (L - gap) / 2, w = M(box(1.4, 3.4, len), '#e6e2da', { y: 1.7, z: s * (gap / 2 + len / 2), parent: lv });
      const mural = new T.Mesh(new T.PlaneGeometry(len, 3), muralMat); mural.position.set(-.72, 1.7, s * (gap / 2 + len / 2)); mural.rotation.y = -Math.PI / 2;
      if (s > 0) { mural.material = muralMat; } lv.add(mural);
      M(box(1.8, .35, len), '#d0cbc0', { y: 3.55, z: s * (gap / 2 + len / 2), parent: lv, ol: .03 });
    });
    // 疏散門：黃黑斜紋滑動門＋門楣號碼＋警示燈
    const stripe = textTex(256, 256, (x) => { x.fillStyle = '#ffd166'; x.fillRect(0, 0, 256, 256); x.fillStyle = '#2c3554';
      for (let i = -256; i < 512; i += 64) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 32, 0); x.lineTo(i + 32 - 256, 256); x.lineTo(i - 256, 256); x.fill(); } });
    const gate = M(box(.6, 3.2, gap + .4), null, { y: 1.6, x: -.2, parent: lv, mat: new T.MeshToonMaterial({ map: stripe, gradientMap: gradMap }) });
    M(box(1.8, 1.2, gap + 1.2), '#5f9fd6', { y: 4.4, parent: lv, ol: .04 });
    const gNo = textTex(512, 128, (x, w, h) => { x.fillStyle = '#5f9fd6'; x.fillRect(0, 0, w, h); x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.font = `900 64px ${FONT_TC}`; x.fillText('疏散門  7 號', w / 2, 66); });
    const gs = new T.Mesh(new T.PlaneGeometry(gap + 1, 1.1), new T.MeshBasicMaterial({ map: gNo })); gs.position.set(-.92, 4.4, 0); gs.rotation.y = -Math.PI / 2; lv.add(gs);
    const lamps = [-1, 1].map(s => M(sph(.22, 1), '#ff9e5e', { x: -.95, y: 5.2, z: s * (gap / 2 + .3), parent: lv, ol: .02, mat: new T.MeshBasicMaterial({ color: '#ffb38a' }) }));
    M(box(.3, .3, gap + 6), '#9aa3b5', { y: .15, x: -.2, parent: lv, ol: 0 });                       // 軌道
    W.updaters.push(t => { const c = (t % 24) / 24, closing = c > .55 && c < .95, k = c < .55 ? 0 : c < .65 ? (c - .55) / .1 : c < .85 ? 1 : 1 - (c - .85) / .1;
      gate.position.z = (1 - k) * (gap + .6); lamps.forEach((l, i) => (l.visible = closing && ((t * 4 + i) | 0) % 2 === 0)); });
    W.colliders.push({ x: LX, z: LZ, r: 2 });
    for (let k = -12; k <= 12; k += 3) if (Math.abs(k) > 3) W.colliders.push({ x: LX + Math.sin(LR) * k, z: LZ + Math.cos(LR) * k, r: 1.6 });
    // 河濱花圃（向日葵）
    for (let i = 0; i < 18; i++) flower(g, rnd(-10, 0), rnd(-14, -6), '#ffd166', 1.2);

    // 河濱自行車（YouBike 風格）
    W.bikes = [];
    for (let i = 0; i < 3; i++) {
      const b = bike(['#ffb84d', '#ffb84d', '#8fd1a8'][i], ['#ffffff', '#8fc8ff', '#ff9fb1'][i]); W.bikes.push(b);
      const off = i * .11, dir = i % 2 ? -1 : 1;
      W.updaters.push(t => {
        let u = ((t * .012 * dir + off) % 1 + 1) % 1; u = .18 + u * .62;
        const p = W.river.getPointAt(u), tan = W.river.getTangentAt(u);
        const n = new V3(-tan.z, 0, tan.x);
        b.position.set(p.x + n.x * (RIVER_W / 2 + 2.2), .15, p.z + n.z * (RIVER_W / 2 + 2.2));
        b.rotation.y = Math.atan2(tan.x, tan.z) + (dir < 0 ? Math.PI : 0);
      });
      W.updaters.push((t, dt) => b.userData.ride(dt, 1.6));
    }
    // 渡船
    const boat = G(null);
    M(box(2.6, 1, 6), '#ffffff', { y: .6, parent: boat });
    M(box(2.2, 1.4, 2.6), '#bfe3f7', { y: 1.8, z: -.4, parent: boat, ol: .06 });
    M(box(2.8, .3, 3), '#6fb6e0', { y: 2.6, z: -.4, parent: boat, ol: .05 });
    W.updaters.push(t => {
      const u = .3 + (Math.sin(t * .05) * .5 + .5) * .55;
      const p = W.river.getPointAt(u), tan = W.river.getTangentAt(u);
      boat.position.set(p.x, .1 + Math.sin(t * 2) * .08, p.z);
      boat.rotation.y = Math.atan2(tan.x, tan.z) + (Math.cos(t * .05) < 0 ? Math.PI : 0);
      boat.rotation.z = Math.sin(t * 1.6) * .04;
    });
  }
  // 兩點間的圓管
  const UP = new V3(0, 1, 0);
  function tube(parent, a, b, r, col, ol = 0) {
    const d = new V3().subVectors(b, a), len = d.length();
    const m = M(cyl(r, r, len, 8), col, { parent, ol, cast: true });
    m.position.copy(a).addScaledVector(d, .5); m.quaternion.setFromUnitVectors(UP, d.normalize());
    return m;
  }
  function wheel(parent, z) {
    const w = G(parent, 0, .5, z);
    M(new T.TorusGeometry(.46, .065, 8, 28), '#3d4258', { ry: Math.PI / 2, parent: w, ol: 0 });
    M(new T.TorusGeometry(.4, .025, 4, 24), '#d9dde8', { ry: Math.PI / 2, parent: w, ol: 0, cast: false });
    for (let i = 0; i < 6; i++) M(box(.02, .8, .02), '#c7ccda', { rx: i * Math.PI / 6, parent: w, ol: 0, cast: false });
    M(cyl(.07, .07, .16, 10), '#8d93a8', { rz: Math.PI / 2, parent: w, ol: 0 });
    return w;
  }
  // YouBike 風格自行車＋騎士（踩踏、輪子轉動）
  function bike(col, shirt = '#ffffff') {
    const b = G(null), v = (x, y, z) => new V3(x, y, z);
    const R = v(0, .5, -.75), F = v(0, .5, .75), C = v(0, .42, 0), S = v(0, 1.08, -.22), Hd = v(0, 1.12, .52);
    const wr = wheel(b, -.75), wf = wheel(b, .75);
    [[R, C], [R, S], [C, S], [S, Hd], [C, Hd]].forEach(([a, c]) => tube(b, a, c, .055, col));
    tube(b, Hd, F, .045, '#9aa0b4');
    tube(b, v(0, 1.12, .52), v(0, 1.36, .45), .04, '#9aa0b4');
    tube(b, v(-.32, 1.36, .45), v(.32, 1.36, .45), .035, '#3d4258');
    M(box(.22, .08, .38), '#3d4258', { x: 0, y: 1.2, z: -.24, parent: b, ol: .02 });             // 座墊
    M(box(.46, .26, .34), col, { y: 1.12, z: .86, parent: b, ol: .03 });                         // 前籃
    M(box(.1, .1, .5), col, { y: 1, z: -.9, rx: -.4, parent: b, ol: 0 });                         // 後土除
    // 曲柄與踏板
    const crank = G(b, 0, .42, 0);
    [-1, 1].forEach(sx => { const arm = G(crank, sx * .14, 0, 0); arm.rotation.x = sx > 0 ? 0 : Math.PI;
      M(box(.04, .04, .32), '#8d93a8', { z: .16, parent: arm, ol: 0 }); M(box(.18, .05, .1), '#3d4258', { x: sx * .08, z: .32, parent: arm, ol: 0 }); });
    // 騎士
    const rider = G(b, 0, 0, 0);
    const hip = v(0, 1.32, -.2), sh = v(0, 1.98, .12);
    tube(rider, hip, sh, .2, shirt, .03);
    M(sph(.22, 1), shirt, { x: 0, y: hip.y, z: hip.z, parent: rider, ol: 0 });
    const head = G(rider, 0, 2.32, .2);
    M(sph(.24, 2), '#ffe2cc', { parent: head, ol: .03 });
    M(new T.SphereGeometry(.27, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), col, { y: .04, parent: head, ol: .03 });   // 安全帽
    [-1, 1].forEach(sx => { tube(rider, v(sx * .18, 1.92, .1), v(sx * .26, 1.38, .45), .07, '#ffe2cc', .02); });
    // 雙腿（兩段式，跟著曲柄踩）
    const legs = [-1, 1].map(sx => {
      const hipJ = G(rider, sx * .12, 1.3, -.18), thigh = M(new T.CapsuleGeometry(.09, .42, 3, 8), '#4d5b85', { y: -.28, parent: hipJ, ol: .02 });
      const knee = G(hipJ, 0, -.52, 0); M(new T.CapsuleGeometry(.08, .4, 3, 8), '#4d5b85', { y: -.26, parent: knee, ol: .02 });
      M(box(.12, .08, .22), '#3d4258', { y: -.52, z: .06, parent: knee, ol: 0 });
      return { hipJ, knee, ph: sx > 0 ? 0 : Math.PI };
    });
    b.userData.ride = (dt, speed) => {
      const a = (b.userData.a = (b.userData.a || 0) + dt * speed * 2.6);
      crank.rotation.x = a; wr.rotation.x = wf.rotation.x = a * 1.6;
      legs.forEach(l => { const s = Math.sin(a + l.ph); l.hipJ.rotation.x = -1.15 + s * .42; l.knee.rotation.x = 1.25 - s * .55; });
      rider.rotation.z = Math.sin(a) * .03;
    };
    return b;
  }

  /* =====================================================================
   * NPC：依各處業務穿著工程服裝，走近會轉身揮手（對話內容在 content.js）
   * ===================================================================== */
  W.npcs = [];
  const OUTFIT = {
    hub:   { shirt: '#eaf2ff', pants: '#4d5b85', vest: '#4a7fd4', hat: null, hair: '#3b2f2f' },
    road:  { shirt: '#f4f1ea', pants: '#4d5b85', vest: '#ff9e5e', stripe: '#fff3a0', hat: '#ffd166' },
    water: { shirt: '#6fb6e0', pants: '#3f6ea8', vest: '#8fd0f0', stripe: '#ffffff', hat: '#ffffff', boots: '#ffd166' },
    park:  { shirt: '#fff6e8', pants: '#6b8f5e', vest: '#7fbf88', straw: true },
    sewer: { shirt: '#3d4f7a', pants: '#3d4f7a', vest: '#3d4f7a', stripe: '#ffd166', hat: '#ff9e5e', lamp: true },
    geo:   { shirt: '#d8c49a', pants: '#8a7a5c', vest: '#b7a27a', ranger: true }
  };
  function makeNPC(outfit) {
    const o = OUTFIT[outfit] || OUTFIT.hub, p = G(null), v = (x, y, z) => new V3(x, y, z);
    p.scale.setScalar(1.08);
    // 腿與鞋
    const legs = [-1, 1].map(sx => { const leg = G(p, sx * .14, 1.0, 0);
      M(new T.CapsuleGeometry(.11, .7, 3, 8), o.pants, { y: -.45, parent: leg, ol: .025 });
      M(box(.22, .16, .36), o.boots || '#3d4258', { y: -.92, z: .06, parent: leg, ol: .02 }); return leg; });
    // 身體＋背心
    tube(p, v(0, 1.0, 0), v(0, 1.78, 0), .27, o.shirt, .03);
    M(sph(.27, 1), o.pants, { y: 1.0, parent: p, ol: 0 });
    const vest = M(cyl(.3, .3, .62, 14, 1, true), o.vest, { y: 1.45, parent: p, ol: .02 });
    if (o.stripe) [1.32, 1.56].forEach(y => M(cyl(.305, .305, .06, 14), o.stripe, { y, parent: p, ol: 0 }));
    if (outfit === 'hub') { M(box(.04, .3, .02), '#4a7fd4', { y: 1.62, z: .3, parent: p, ol: 0 }); M(box(.16, .2, .03), '#ffffff', { y: 1.42, z: .31, parent: p, ol: .01 }); }
    // 頭
    const head = G(p, 0, 2.15, 0);
    M(sph(.3, 2), '#ffe2cc', { parent: head, ol: .03 });
    [-1, 1].forEach(sx => { M(sph(.045, 0), '#2c3554', { x: sx * .11, y: .02, z: .28, parent: head, ol: 0 }); M(sph(.05, 0), '#ffb3c1', { x: sx * .18, y: -.07, z: .25, parent: head, ol: 0 }); });
    M(new T.SphereGeometry(.32, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2.1), o.hair || '#3b2f2f', { y: .03, z: -.03, parent: head, ol: 0 });
    if (o.hat) { M(new T.SphereGeometry(.35, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), o.hat, { y: .08, parent: head, ol: .03 });
      M(cyl(.38, .38, .05, 16), o.hat, { y: .1, z: .06, parent: head, ol: .02 }); }
    if (o.lamp) M(cyl(.07, .07, .08, 10), '#fff6c9', { y: .26, z: .3, rx: Math.PI / 2, parent: head, ol: 0, mat: new T.MeshBasicMaterial({ color: '#fff6c9' }) });
    if (o.straw) { M(cyl(.58, .58, .05, 20), '#f2d58e', { y: .14, parent: head, ol: .02 }); M(cyl(.26, .3, .22, 16), '#f2d58e', { y: .25, parent: head, ol: .02 }); M(cyl(.305, .305, .05, 16), '#ff9fb6', { y: .18, parent: head, ol: 0 }); }
    if (o.ranger) { M(cyl(.52, .52, .05, 20), '#8a7a5c', { y: .14, parent: head, ol: .02 }); M(cyl(.24, .3, .26, 16), '#8a7a5c', { y: .27, parent: head, ol: .02 }); }
    // 手臂（右手會揮）
    const armL = G(p, -.36, 1.72, 0); M(new T.CapsuleGeometry(.085, .55, 3, 8), o.shirt, { y: -.32, parent: armL, ol: .02 }); armL.rotation.z = -.12;
    const armR = G(p, .36, 1.72, 0); M(new T.CapsuleGeometry(.085, .55, 3, 8), o.shirt, { y: -.32, parent: armR, ol: .02 }); armR.rotation.z = .12;
    // 手持道具
    const hand = G(armL, 0, -.65, .05);
    if (outfit === 'road') { M(cyl(.05, .05, .8, 8), '#ff5a4f', { y: .3, rx: .4, parent: hand, ol: 0, mat: new T.MeshBasicMaterial({ color: '#ff6a5c' }) }); }
    if (outfit === 'water') M(box(.14, .3, .08), '#3d4258', { y: .08, parent: hand, ol: .02 });
    if (outfit === 'park') { M(box(.05, .45, .05), '#8d93a8', { y: .1, rz: .3, parent: hand, ol: 0 }); M(box(.05, .45, .05), '#8d93a8', { y: .1, rz: -.3, parent: hand, ol: 0 }); }
    if (outfit === 'sewer') M(box(.2, .26, .1), '#ffd166', { y: .05, parent: hand, ol: .02 });
    if (outfit === 'geo') { M(cyl(.04, .05, 1.7, 6), '#a8794f', { y: -.1, parent: hand, ol: .02 }); M(box(.5, .6, .26), '#7a9a6a', { y: 1.45 - 1.07, z: -.3, parent: p, ol: .02 }); }
    if (outfit === 'hub') M(box(.3, .4, .04), '#f3d9a8', { y: .1, rx: -.4, parent: hand, ol: .02 });
    p.userData = { legs, armR, armL, head };
    return p;
  }
  function buildNPCs() {
    (window.NPCS || []).forEach((n, i) => {
      let pos, obj = null, radius = 6.5;
      if (n.outfit === 'turtle') { const [zx, zz] = zoneById('sso').pos; pos = new V3(zx - 3, 1.6, zz + 6); radius = 7; }
      else if (n.outfit === 'god') { pos = new V3(0, 30, -96); radius = 15; }
      else {
        let x, z;
        if (n.zone === 'hub') { x = 7; z = 21; }
        else { const [zx, zz] = zoneById(n.zone).pos, L = Math.hypot(zx, zz), ux = zx / L, uz = zz / L;
          const cands = [[1, 10], [-1, 10], [1, 13], [-1, 13], [0, 14]].map(([s, d]) => [zx - ux * d + uz * 3.6 * s, zz - uz * d - ux * 3.6 * s]);
          [x, z] = cands.find(c => !W.colliders.some(k => Math.hypot(c[0] - k.x, c[1] - k.z) < k.r + 1.4)) || cands[4]; }
        obj = makeNPC(n.outfit); obj.position.set(x, .1 + hill(x, z), z); obj.rotation.y = Math.atan2(-x, -z) + Math.PI;
        pos = new V3(x, 0, z);
        W.colliders.push({ x, z, r: .7 });
      }
      const npc = { id: n.id, data: n, obj, pos, radius, wave: 0, ph: i * 1.7 };
      W.npcs.push(npc);
      if (obj) W.updaters.push((t, dt) => {
        const u = obj.userData, near = W.mode === 'explore' && W._npc === n.id;
        obj.position.y = .1 + hill(obj.position.x, obj.position.z) + Math.abs(Math.sin(t * 2 + npc.ph)) * .02;
        u.head.rotation.y = Math.sin(t * .7 + npc.ph) * .3;
        const goalYaw = near ? Math.atan2(cam.pos.x - obj.position.x, cam.pos.z - obj.position.z) : obj.userData.baseYaw ?? (obj.userData.baseYaw = obj.rotation.y);
        obj.rotation.y += (nearestAngle(obj.rotation.y, goalYaw) - obj.rotation.y) * Math.min(1, dt * 4);
        npc.wave = Math.max(0, npc.wave - dt);
        u.armR.rotation.z = npc.wave > 0 ? 2.5 + Math.sin(t * 10) * .35 : .12 + Math.sin(t * 1.5 + npc.ph) * .05;
        if (near) u.head.rotation.y = 0;
      });
    });
  }

  // 行人（沿放射步道散步）
  function person(shirt, pants) {
    const p = G(null), v = (x, y, z) => new V3(x, y, z);
    tube(p, v(0, 1.0, 0), v(0, 1.75, 0), .23, shirt, .03);
    M(sph(.24, 1), shirt, { y: 1.0, parent: p, ol: 0 });
    M(sph(.26, 2), '#ffe2cc', { y: 2.1, parent: p, ol: .03 });
    M(new T.SphereGeometry(.28, 14, 7, 0, Math.PI * 2, 0, Math.PI / 2.2), '#4b3a36', { y: 2.14, parent: p, ol: 0 });
    const limbs = [-1, 1].map(sx => {
      const leg = G(p, sx * .12, 1.0, 0); M(new T.CapsuleGeometry(.09, .72, 3, 8), pants, { y: -.46, parent: leg, ol: .02 });
      const arm = G(p, sx * .3, 1.7, 0); M(new T.CapsuleGeometry(.07, .55, 3, 8), '#ffe2cc', { y: -.32, parent: arm, ol: .02 });
      return { leg, arm, sx };
    });
    p.userData.walk = a => limbs.forEach(l => { l.leg.rotation.x = Math.sin(a) * .5 * l.sx; l.arm.rotation.x = -Math.sin(a) * .45 * l.sx; });
    return p;
  }
  function buildWalkers() {
    const shirts = ['#ff9fb1', '#8fc8ff', '#ffd166', '#a8e6cf', '#c6a8ff', '#ffb38a', '#ffffff', '#9be0e8'];
    const spokes = window.ZONES.filter(z => z.id !== 'hub');
    for (let i = 0; i < (isMobile ? 6 : 10); i++) {
      const z = spokes[i % spokes.length], [zx, zz] = z.pos, L = Math.hypot(zx, zz), ux = zx / L, uz = zz / L;
      const p = person(shirts[i % 8], i % 2 ? '#4d5b85' : '#6b5d55');
      const lat = (i % 2 ? 1 : -1) * 1.1, sp = rnd(.9, 1.4), ph = rnd(0, 100), d0 = 17, d1 = L - 9;
      W.updaters.push(t => {
        const span = d1 - d0, raw = ((t * sp + ph) % (span * 2)), fwd = raw < span, d = d0 + (fwd ? raw : span * 2 - raw);
        p.position.set(ux * d + uz * lat * (fwd ? 1 : -1), .1, uz * d - ux * lat * (fwd ? 1 : -1));
        p.rotation.y = Math.atan2(ux, uz) + (fwd ? 0 : Math.PI);
        p.userData.walk(t * sp * 5);
      });
    }
  }

  /* =====================================================================
   * 公園路燈處：花園、噴泉、搖曳樹、路燈、溜滑梯
   * ===================================================================== */
  W.leafMats = [toon('#f8bfd0'), toon('#a8dcae'), toon('#c9eab0')];
  W.trees = [];
  function tree(parent, x, z, s = 1, kind = 0) {
    const g = G(parent, x, 0, z); g.scale.setScalar(s);
    M(cyl(.25, .38, 3, 8), '#b08a6e', { y: 1.5, parent: g, ol: .06 });
    const crown = G(g, 0, 3.2, 0);
    const lm = W.leafMats[kind % 3];
    M(sph(1.8, 1), null, { y: .8, parent: crown, mat: lm, ol: .1 });
    M(sph(1.3, 1), null, { x: 1.1, y: .2, z: .4, parent: crown, mat: lm, ol: .1 });
    M(sph(1.2, 1), null, { x: -1, y: .3, z: -.3, parent: crown, mat: lm, ol: .1 });
    const ph = Math.random() * 6, sp = rnd(.8, 1.3);
    W.updaters.push(t => { crown.rotation.z = Math.sin(t * sp + ph) * .06; crown.rotation.x = Math.cos(t * sp * .8 + ph) * .04; });
    W.trees.push(g); return g;
  }
  function flower(parent, x, z, col, h = .6) {
    const g = G(parent, x, 0, z);
    M(cyl(.04, .05, h, 5), '#7cc08a', { y: h / 2, parent: g, ol: 0, cast: false });
    M(sph(.22 + h * .08, 0), col, { y: h, parent: g, ol: 0, cast: false });
    return g;
  }
  function buildPKL() {
    const [zx, zz] = zoneById('pkl').pos;
    const g = W.zones.pkl = G(null, zx, 0, zz);
    g.rotation.y = Math.atan2(-zx, -zz);                     // 區內 +z 朝向工務局（公園入口）
    const W2 = (x, z) => g.localToWorld(new V3(x, 0, z));
    g.updateMatrixWorld(true);
    // 草坪＋外圈林蔭步道
    const lawn = new T.Mesh(new T.CircleGeometry(22, 64), toon('#b9e0a0'));
    lawn.rotation.x = -Math.PI / 2; lawn.position.y = .05; lawn.receiveShadow = true; g.add(lawn);
    const ring = new T.Mesh(new T.RingGeometry(15.6, 17.4, 64), toon('#eadfc8'));
    ring.rotation.x = -Math.PI / 2; ring.position.y = .07; ring.receiveShadow = true; g.add(ring);
    const axis = new T.Mesh(new T.PlaneGeometry(2.6, 16), toon('#eadfc8')); axis.rotation.x = -Math.PI / 2; axis.position.set(0, .07, 9); g.add(axis);
    // 入口意象牆「大安森林公園」
    const gate = G(g, 0, 0, 18.8);
    [-1, 1].forEach(s => { M(box(3.2, 1.6, .8), '#e9e1d2', { x: s * 3.4, y: .8, parent: gate, ol: .04 }); M(box(3.4, .25, 1), '#7fbf88', { x: s * 3.4, y: 1.7, parent: gate, ol: .03 }); });
    const gt = textTex(512, 96, (x, w, h) => { x.fillStyle = '#e9e1d2'; x.fillRect(0, 0, w, h); x.fillStyle = '#3f6e4c'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = `900 52px ${FONT_TC}`; x.fillText('大安森林公園', w / 2, h / 2); });
    const gs = new T.Mesh(new T.PlaneGeometry(3, .56), new T.MeshBasicMaterial({ map: gt })); gs.position.set(3.4, 1, .41); gate.add(gs);
    const gs2 = gs.clone(); gs2.position.x = -3.4; gate.add(gs2);

    // ── 露天音樂台（白色貝殼弧頂）──
    const stage = G(g, 0, 0, -11);
    M(cyl(5.2, 5.4, .7, 40), '#e6e2da', { y: .35, parent: stage }); M(box(10.4, .7, 2.2), '#e6e2da', { y: .35, z: -1, parent: stage, ol: .04 });
    const shell = new T.Mesh(new T.SphereGeometry(7, 40, 20, -Math.PI / 2, Math.PI, 0, Math.PI / 2), toon('#ffffff', { side: T.DoubleSide }));
    shell.scale.set(.85, .85, .7); shell.position.set(0, .7, -1.2); shell.rotation.y = -Math.PI / 2; shell.castShadow = true; stage.add(shell); outline(shell, .14);
    for (let i = 1; i < 6; i++) { const rib = new T.Mesh(new T.TorusGeometry(5.98, .08, 6, 32, Math.PI / 2), toon('#e6edf5'));
      const piv = G(stage, 0, .7, -1.2); piv.scale.set(.85, .85, .7); piv.rotation.y = Math.PI / 2 + (i / 6) * Math.PI; rib.rotation.y = Math.PI / 2; piv.add(rib); }
    const arch = new T.Mesh(new T.TorusGeometry(5.95, .28, 10, 48, Math.PI), toon('#cfe3f5')); arch.position.set(0, .7, -1.2); arch.scale.set(.85, .85, 1); stage.add(arch); outline(arch, .05);
    const inner = new T.Mesh(new T.SphereGeometry(5.9, 32, 16, -Math.PI / 2, Math.PI, 0, Math.PI / 2), toon('#dcebfa', { side: T.BackSide })); inner.scale.set(.85, .85, .7); inner.position.set(0, .7, -1.25); inner.rotation.y = -Math.PI / 2; stage.add(inner);
    [-2.5, 0, 2.5].forEach(x => M(cyl(.08, .08, 1.3, 8), '#5e6a8a', { x, y: 1.35, z: 1.4, parent: stage, ol: .02 }));
    W.colliders.push(Object.assign({ r: 7.2 }, (p => ({ x: p.x, z: p.z }))(W2(0, -11.6))));

    // ── 生態池：水面、蘆葦、荷葉、木棧橋、白鷺鷥 ──
    const pond = G(g, -10, 0, -1);
    const pw = new T.Mesh(new T.CircleGeometry(5.6, 40), waterMaterial('#a6e0d6', '#4fa7b8', { radial: true }));
    pw.rotation.x = -Math.PI / 2; pw.position.y = .14; pw.scale.set(1, 1.35, 1); pw.renderOrder = 1; pond.add(pw);
    const rim = new T.Mesh(new T.RingGeometry(5.5, 6.2, 40), toon('#c9bfa8')); rim.rotation.x = -Math.PI / 2; rim.position.y = .1; rim.scale.set(1, 1.35, 1); pond.add(rim);
    for (let i = 0; i < 30; i++) { const a = rnd(0, 6.28), r = rnd(4.6, 5.6); const reed = G(pond, Math.cos(a) * r, 0, Math.sin(a) * r * 1.35);
      M(cyl(.03, .05, rnd(1.2, 2), 4), '#7fb36a', { y: .8, rz: rnd(-.15, .15), parent: reed, ol: 0, cast: false });
      W.updaters.push(t => { reed.rotation.z = Math.sin(t * 1.6 + a * 3) * .08; }); }
    for (let i = 0; i < 9; i++) { const a = rnd(0, 6.28), r = rnd(1, 3.8);
      M(cyl(rnd(.35, .6), rnd(.35, .6), .04, 12), '#79b866', { x: Math.cos(a) * r, y: .2, z: Math.sin(a) * r * 1.35, parent: pond, ol: .02, cast: false });
      if (i % 3 === 0) M(sph(.18, 1), '#ffb3c8', { x: Math.cos(a) * r, y: .38, z: Math.sin(a) * r * 1.35, parent: pond, ol: .02 }); }
    const bridge = G(pond, 0, 0, 0); bridge.rotation.y = .3;
    M(box(1.6, .2, 9), '#c99b77', { y: .55, parent: bridge, ol: .04 });
    for (let k = -4; k <= 4; k += 2) [-1, 1].forEach(s => M(cyl(.07, .07, .9, 6), '#a8794f', { x: s * .78, y: .95, z: k, parent: bridge, ol: .02 }));
    [-1, 1].forEach(s => M(box(.08, .08, 9), '#a8794f', { x: s * .78, y: 1.38, parent: bridge, ol: 0 }));
    [[-2.5, 3], [2.3, -3.6], [3.2, 2.4]].forEach(([x, z], i) => {
      const eg = egret(); eg.position.set(x, .15, z); eg.rotation.y = rnd(0, 6.28); pond.add(eg);
      W.updaters.push(t => { const k = (t * .5 + i * 1.7) % 6; eg.userData.neck.rotation.x = k < .6 ? Math.sin(k / .6 * Math.PI) * 1.1 : 0; });
    });
    W.colliders.push(Object.assign({ r: 5.5 }, (p => ({ x: p.x, z: p.z }))(W2(-10, -1))));

    // ── 共融遊戲場：軟墊、溜滑梯塔、鞦韆、蹺蹺板、攀爬網、搖搖馬 ──
    const pg = G(g, 10, 0, -1); pg.rotation.y = -Math.PI / 2;
    const mat = new T.Mesh(new T.CircleGeometry(7, 40), toon('#f7b9a8')); mat.rotation.x = -Math.PI / 2; mat.position.y = .1; mat.receiveShadow = true; pg.add(mat);
    [[2.4, 2, '#a8dcf0'], [-2.6, 1.6, '#ffe08a'], [0, -3, '#b9e6b0']].forEach(([x, z, c]) => { const d = new T.Mesh(new T.CircleGeometry(2, 28), toon(c)); d.rotation.x = -Math.PI / 2; d.position.set(x, .11, z); pg.add(d); });
    // 溜滑梯塔
    const tw = G(pg, -2.5, 0, -2.5);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([x, z]) => M(cyl(.12, .12, 3.4, 8), '#5f9fd6', { x, y: 1.7, z, parent: tw, ol: .02 }));
    M(box(2.3, .25, 2.3), '#ffd166', { y: 1.9, parent: tw, ol: .03 });
    M(new T.ConeGeometry(1.9, 1.3, 4), '#ff8f8f', { y: 4.1, ry: Math.PI / 4, parent: tw, ol: .04 });
    const slideC = new T.CatmullRomCurve3([new V3(1.1, 2, 0), new V3(2.6, 1.4, .4), new V3(3.6, .7, 1.6), new V3(4.2, .3, 3)]);
    const slide = new T.Mesh(new T.TubeGeometry(slideC, 24, .45, 10, false), toon('#8fd1f0', { side: T.DoubleSide })); slide.scale.set(1, 1, 1); slide.castShadow = true; tw.add(slide); outline(slide, .05);
    for (let k = 0; k < 5; k++) M(box(1, .08, .3), '#ffffff', { x: -1.1 - .1, y: .35 + k * .38, z: .6 + k * .25, parent: tw, ol: .01 });
    // 鞦韆（含小朋友擺盪）
    const sw = G(pg, 3, 0, -2.2);
    [-2.2, 2.2].forEach(x => { tube(sw, new V3(x, 0, -1.2), new V3(x, 3.2, 0), .1, '#ff9e5e', .02); tube(sw, new V3(x, 0, 1.2), new V3(x, 3.2, 0), .1, '#ff9e5e', .02); });
    tube(sw, new V3(-2.3, 3.2, 0), new V3(2.3, 3.2, 0), .1, '#ff9e5e', .02);
    [-1.1, 1.1].forEach((x, i) => { const piv = G(sw, x, 3.2, 0);
      [-.35, .35].forEach(dx => M(box(.03, 2.3, .03), '#9aa3b5', { x: dx, y: -1.15, parent: piv, ol: 0 }));
      M(box(.8, .08, .4), '#2c3554', { y: -2.3, parent: piv, ol: .02 });
      if (i === 0) { const kid = person('#ffb3c8', '#4d5b85'); kid.scale.setScalar(.6); kid.position.set(0, -2.9, 0); kid.rotation.y = Math.PI / 2; piv.add(kid); }
      W.updaters.push(t => { piv.rotation.x = Math.sin(t * 2.2 + i * 1.3) * (i === 0 ? .55 : .18); }); });
    // 蹺蹺板（兩個小朋友）
    const ss = G(pg, 2.8, 0, 3.4);
    M(box(.4, .7, .4), '#ffd166', { y: .35, parent: ss, ol: .02 });
    const beam = G(ss, 0, .75, 0);
    M(box(4.2, .15, .4), '#5fbf73', { parent: beam, ol: .03 });
    [-1, 1].forEach(s => { M(box(.08, .5, .3), '#2c3554', { x: s * 1.7, y: .3, parent: beam, ol: 0 });
      const kid = person(s > 0 ? '#8fc8ff' : '#ffd166', '#6b5d55'); kid.scale.setScalar(.55); kid.position.set(s * 1.9, -.4, 0); kid.rotation.y = s > 0 ? -Math.PI / 2 : Math.PI / 2; beam.add(kid); });
    W.updaters.push(t => { beam.rotation.z = Math.sin(t * 1.8) * .22; });
    // 攀爬網（彩色網格圓頂）
    const net = new T.LineSegments(new T.EdgesGeometry(new T.IcosahedronGeometry(1.8, 1)), new T.LineBasicMaterial({ color: '#e0707e' }));
    net.position.set(-3.2, 1.2, 2.6); net.scale.y = .75; pg.add(net);
    // 搖搖馬
    [[-.6, 4.8, '#c6a8ff'], [.9, 5.4, '#a8e6cf']].forEach(([x, z, c], i) => { const r = G(pg, x, 0, z);
      M(cyl(.08, .08, .6, 6), '#9aa3b5', { y: .3, parent: r, ol: 0 });
      const body = G(r, 0, .7, 0); M(sph(.45, 1), c, { s: [1.3, .9, .8], parent: body, ol: .03 }); M(sph(.3, 1), c, { x: .55, y: .35, parent: body, ol: .03 });
      W.updaters.push(t => { body.rotation.z = Math.sin(t * 3 + i) * .18; }); });
    // 跑跳的小朋友
    for (let i = 0; i < 2; i++) { const kid = person(['#ff9fb1', '#9be0e8'][i], '#4d5b85'); kid.scale.setScalar(.6); pg.add(kid);
      W.updaters.push(t => { const a = t * (.9 + i * .2) + i * 3; kid.position.set(Math.cos(a) * 4.8, .1 + Math.abs(Math.sin(t * 6 + i)) * .25, Math.sin(a) * 4.8); kid.rotation.y = -a; kid.userData.walk(t * 10); }); }
    W.playground = W2(10, -1);
    W.colliders.push(Object.assign({ r: 6.8 }, (p => ({ x: p.x, z: p.z }))(W.playground)));

    // ── 林木（樟樹、楓香等搖曳樹）＋杜鵑花叢＋路燈＋長椅 ──
    for (let i = 0; i < 30; i++) { const a = i / 30 * Math.PI * 2 + rnd(-.05, .05), r = i % 2 ? rnd(18.6, 21) : rnd(13, 14.5);
      if (Math.abs(Math.sin(a)) > .93 && Math.cos(a) * 0 === 0 && Math.sin(a) > 0) continue;   // 入口留空
      const p = [Math.cos(a) * r, Math.sin(a) * r]; if (Math.hypot(p[0] - 10, p[1] + 1) < 8 || Math.hypot(p[0] + 10, p[1] + 1) < 7.5 || Math.hypot(p[0], p[1] + 11) < 8) continue;
      tree(g, p[0], p[1], rnd(1, 1.45), i % 4 === 0 ? 0 : 1 + (i % 2)); }
    const azalea = ['#ff8fb3', '#ffb3cf', '#ffffff', '#f06f9a'];
    for (let i = 0; i < 26; i++) { const a = rnd(0, 6.28), r = rnd(15.8, 17.2) + (i % 2 ? 2 : -2.2);
      if (Math.sin(a) > .9) continue;
      const b = G(g, Math.cos(a) * r, 0, Math.sin(a) * r);
      M(sph(.8, 1), '#6fae6a', { y: .55, s: [1.2, .75, 1.2], parent: b, ol: .04 });
      for (let k = 0; k < 6; k++) M(sph(.16, 0), azalea[(i + k) % 4], { x: rnd(-.8, .8), y: rnd(.8, 1.05), z: rnd(-.7, .7), parent: b, ol: 0, cast: false }); }
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + .2; streetLight(g, Math.cos(a) * 17.9, Math.sin(a) * 17.9); }
    [[-4, 8, 0], [4, 8, Math.PI], [-6, -4, .8]].forEach(([x, z, r]) => { const b = G(g, x, 0, z); b.rotation.y = r;
      M(box(2.4, .2, .7), '#c99b77', { y: .7, parent: b, ol: .04 }); M(box(2.4, .7, .15), '#c99b77', { y: 1.1, z: -.35, parent: b, ol: .04 });
      [-1, 1].forEach(s => M(box(.15, .7, .6), '#5e6a8a', { x: s, y: .35, parent: b, ol: .02 })); });
  }
  function egret() {
    const e = G(null);
    M(sph(.32, 1), '#ffffff', { y: 1.1, s: [.8, .8, 1.4], parent: e, ol: .03 });
    [-.08, .08].forEach(x => M(cyl(.025, .025, .9, 4), '#2c3554', { x, y: .5, parent: e, ol: 0 }));
    const neck = G(e, 0, 1.25, .3); e.userData.neck = neck;
    M(cyl(.05, .07, .7, 6), '#ffffff', { y: .3, rx: .3, parent: neck, ol: .02 });
    M(sph(.12, 1), '#ffffff', { y: .65, z: .12, parent: neck, ol: .02 });
    M(new T.ConeGeometry(.04, .38, 6), '#ffd166', { y: .63, z: .4, rx: Math.PI / 2, parent: neck, ol: 0 });
    return e;
  }

  /* =====================================================================
   * 衛工處：水資源回收中心＋人孔＋烏龜工程師
   * ===================================================================== */
  function buildSSO() {
    const [zx, zz] = zoneById('sso').pos;
    const g = W.zones.sso = G(null, zx, 0, zz);
    // 圓形沉澱池（旋轉刮泥橋）
    [[6, -8, 4.2], [-4, -10, 3.4], [10, 2, 3.2]].forEach(([x, z, r], i) => {
      const tk = G(g, x, 0, z);
      M(cyl(r + .4, r + .5, 1.6, 32), '#f3ece0', { y: .8, parent: tk });
      const w = new T.Mesh(new T.CircleGeometry(r, 32), waterMaterial(i === 2 ? '#b5ecd6' : '#a8dcef', i === 2 ? '#5fc0a0' : '#4f9fcf', { radial: true }));
      w.rotation.x = -Math.PI / 2; w.position.y = 1.62; tk.add(w);
      const arm = G(tk, 0, 1.9, 0);
      M(box(r * 2, .3, .5), '#8a7fd8', { parent: arm, ol: .05 });
      M(cyl(.3, .3, .8, 10), '#ffffff', { y: .2, parent: arm, ol: .04 });
      W.updaters.push((t, dt) => { arm.rotation.y += dt * (.25 + i * .07); });
      W.colliders.push({ x: zx + x, z: zz + z, r: r + .8 });
    });
    // 管理大樓與管線
    M(box(6, 4, 4), '#efeaff', { x: -9, y: 2, z: 1, parent: g });
    M(box(6.6, .6, 4.6), '#8a7fd8', { x: -9, y: 4.3, z: 1, parent: g, ol: .05 });
    W.colliders.push({ x: zx - 9, z: zz + 1, r: 4.2 });
    M(cyl(.45, .45, 9, 12), '#b8b0f0', { x: 1, y: .9, z: -9, rz: Math.PI / 2, parent: g, ol: .05 });
    M(cyl(.45, .45, 9, 12), '#a8e6cf', { x: 7, y: .9, z: -2.5, rx: Math.PI / 2, parent: g, ol: .05 });

    // 人孔＋烏龜工程師
    const mh = G(g, -3, 0, 6);
    M(cyl(1.3, 1.3, .12, 24), '#4b5068', { y: .1, parent: mh, ol: 0 });
    const lid = G(mh, 0, 0, 0);
    M(cyl(1.15, 1.15, .18, 24), '#8d93a8', { y: .1, parent: lid, ol: .05 });
    M(box(1.6, .2, .12), '#6b7189', { y: .22, parent: lid, ol: 0 });
    const turtle = makeTurtle(); mh.add(turtle);
    W.updaters.push(t => {
      const c = (t % 10) / 10;                       // 10 秒一循環
      const up = c < .1 ? c / .1 : c < .75 ? 1 : c < .85 ? 1 - (c - .75) / .1 : 0;
      const e = up * up * (3 - 2 * up);
      turtle.position.y = -2.6 + e * 2.7;
      turtle.visible = e > .02;
      lid.position.set(e * 1.9, e * .25, 0); lid.rotation.z = -e * .35;
      turtle.rotation.y = Math.sin(t * .8) * .5;
      turtle.userData.arm.rotation.z = -1.9 + Math.sin(t * 7) * .45 * (c > .15 && c < .7 ? 1 : 0);
      turtle.userData.head.rotation.z = Math.sin(t * 2) * .12;
    });
  }
  function shellTex() {
    const c = document.createElement('canvas'); c.width = 512; c.height = 256; const x = c.getContext('2d');
    const gr = x.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#5fae7c'); gr.addColorStop(1, '#7cc795'); x.fillStyle = gr; x.fillRect(0, 0, 512, 256);
    const R = 34;
    for (let row = 0; row < 6; row++) for (let col = 0; col < 10; col++) {
      const cx = col * R * 1.6 + (row % 2) * R * .8, cy = row * R * 1.38 + 20;
      x.beginPath(); for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2 + Math.PI / 6; x.lineTo(cx + Math.cos(a) * R * .86, cy + Math.sin(a) * R * .86); } x.closePath();
      const hg = x.createRadialGradient(cx - 6, cy - 8, 2, cx, cy, R); hg.addColorStop(0, '#b4e6bf'); hg.addColorStop(1, '#6dbb88');
      x.fillStyle = hg; x.fill(); x.lineWidth = 5; x.strokeStyle = '#3c7a56'; x.stroke();
      x.lineWidth = 2; x.strokeStyle = 'rgba(255,255,255,.35)'; x.beginPath(); x.arc(cx - 4, cy - 6, R * .4, Math.PI, Math.PI * 1.6); x.stroke();
    }
    const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t;
  }
  // 烏龜工程師（遊戲角色精修：鱗甲紋龜殼、大眼睛會眨、安全帽頭燈、反光背心、手電筒）
  function makeTurtle() {
    const t = G(null); t.scale.setScalar(1.45);
    const skin = '#93d3a6', skinD = '#6fb889';
    // 腹甲（前）
    const bellyT = textTex(128, 256, (x) => { x.fillStyle = '#fff1cf'; x.fillRect(0, 0, 128, 256); x.strokeStyle = '#e2c98f'; x.lineWidth = 6;
      for (let y = 40; y < 256; y += 48) { x.beginPath(); x.moveTo(10, y); x.quadraticCurveTo(64, y + 12, 118, y); x.stroke(); } x.beginPath(); x.moveTo(64, 0); x.lineTo(64, 256); x.stroke(); });
    const body = M(sph(1.0, 3), null, { y: 1.0, s: [1, 1.18, .82], parent: t, mat: new T.MeshToonMaterial({ map: bellyT, gradientMap: gradMap }) });
    // 背甲
    const shell = new T.Mesh(new T.SphereGeometry(1.18, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2), new T.MeshToonMaterial({ map: shellTex(), gradientMap: gradMap }));
    shell.rotation.x = -Math.PI / 2; shell.scale.set(1.05, 1, 1.25); shell.position.set(0, 1.05, -.25); shell.castShadow = true; t.add(shell); outline(shell, .06);
    M(new T.TorusGeometry(1.2, .12, 10, 40), '#e8d69c', { y: 1.05, z: -.25, s: [1.05, 1.25, 1], parent: t, ol: .02 });
    // 反光背心
    const vest = M(cyl(1.02, 1.02, .9, 28, 1), '#ff9e5e', { y: .85, s: [1, 1, .84], parent: t, ol: .02 });
    [.62, 1.05].forEach(y => M(cyl(1.035, 1.035, .1, 28), '#fff6b0', { y, s: [1, 1, .85], parent: t, ol: 0 }));
    M(box(.34, .3, .08), '#ff8b4a', { x: .38, y: .78, z: .86, parent: t, ol: .015 });
    // 頭
    const head = G(t, 0, 2.3, .15); t.userData.head = head;
    M(sph(.82, 3), skin, { s: [1.05, .95, 1], parent: head });
    M(sph(.5, 2), '#c6ebcf', { y: -.25, z: .45, s: [1.2, .7, .7], parent: head, ol: 0 });       // 口鼻
    [-1, 1].forEach(s => M(sph(.035, 0), skinD, { x: s * .1, y: -.12, z: .8, parent: head, ol: 0 }));  // 鼻孔
    const mouth = new T.Mesh(new T.TorusGeometry(.2, .03, 6, 16, Math.PI), toon('#2c3554')); mouth.position.set(0, -.3, .76); mouth.rotation.z = Math.PI; head.add(mouth);
    const lids = [];
    [-1, 1].forEach(s => { const eye = G(head, s * .33, .14, .62);
      M(sph(.24, 2), '#ffffff', { s: [1, 1.15, .7], parent: eye, ol: .03 });
      M(sph(.15, 2), '#5b3a29', { z: .12, s: [1, 1.15, .6], parent: eye, ol: 0 });
      M(sph(.09, 1), '#1b1f2e', { z: .17, s: [1, 1.15, .6], parent: eye, ol: 0 });
      M(sph(.045, 0), '#ffffff', { x: .05, y: .07, z: .22, parent: eye, ol: 0 }); M(sph(.022, 0), '#ffffff', { x: -.05, y: -.05, z: .22, parent: eye, ol: 0 });
      const lid = M(new T.SphereGeometry(.255, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), skin, { s: [1, 1.2, .78], parent: eye, ol: 0 }); lid.scale.y = .01; lids.push(lid);
      M(sph(.13, 1), '#ffb3c1', { x: s * .25, y: -.3, z: .05, s: [1, .6, .5], parent: eye, ol: 0 }); });
    // 安全帽＋頭燈
    M(new T.SphereGeometry(.88, 32, 14, 0, Math.PI * 2, 0, Math.PI / 2), '#ffd166', { y: .2, parent: head, ol: .04 });
    M(box(.18, .5, 1.6), '#f5c24a', { y: .62, s: [1, .9, 1], parent: head, ol: .02 });
    M(cyl(1.0, 1.02, .07, 32), '#ffd166', { y: .22, z: .12, parent: head, ol: .02 });
    M(cyl(.14, .14, .14, 14), '#3d4258', { y: .45, z: .8, rx: Math.PI / 2 - .3, parent: head, ol: .02 });
    const lamp = M(cyl(.1, .1, .02, 14), '#fff6c9', { y: .47, z: .88, rx: Math.PI / 2 - .3, parent: head, ol: 0, mat: new T.MeshBasicMaterial({ color: '#fffbe0' }) });
    // 手臂（右手揮、左手拿手電筒）
    const arm = G(t, .95, 1.45, .1); t.userData.arm = arm;
    M(new T.CapsuleGeometry(.2, .7, 4, 10), skin, { y: .45, parent: arm, ol: .03 });
    M(sph(.24, 2), '#ffffff', { y: .95, parent: arm, ol: .03 });
    const armL = G(t, -.98, 1.5, .15); armL.rotation.set(.55, 0, -.85);
    M(new T.CapsuleGeometry(.2, .7, 4, 10), skin, { y: -.45, parent: armL, ol: .03 });
    M(sph(.24, 2), '#ffffff', { y: -.95, parent: armL, ol: .03 });
    M(cyl(.12, .12, .7, 12), '#3d4258', { y: -1.05, z: .25, rx: Math.PI / 2, parent: armL, ol: .02 });
    const beam = new T.Mesh(new T.ConeGeometry(.6, 2.6, 16, 1, true), new T.MeshBasicMaterial({ color: '#fff6c9', transparent: true, opacity: .22, depthWrite: false, side: T.DoubleSide }));
    beam.position.set(0, -1.05, 1.9); beam.rotation.x = -Math.PI / 2; armL.add(beam);
    // 眨眼
    W.updaters.push(tm => { const k = tm % 3.4; const b = k < .12 ? Math.sin(k / .12 * Math.PI) : 0; lids.forEach(l => (l.scale.y = .01 + b * 1.1)); });
    return t;
  }

  /* =====================================================================
   * 大地處：仿信義區象山——青翠山形、六巨石、石階登山步道、木造觀景平台、山頂涼亭、
   *         溪流瀑布、擋土牆與坡地監測站、騰雲飛行的山神爺爺
   * ===================================================================== */
  const MT = { x: 0, z: -96 };
  const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  function hill(x, z) {
    const dx = x - MT.x, dz = z - MT.z, d = Math.hypot(dx, dz);
    if (d > 47) return 0;
    const a = Math.atan2(dz, dx);
    let h = 30 * Math.exp(-Math.pow(d / 20, 2));
    h += 10 * Math.exp(-((dx - 14) ** 2 + (dz + 10) ** 2) / 140);       // 東側稜線（往 101 方向的觀景稜）
    h += 7 * Math.exp(-((dx + 17) ** 2 + (dz + 2) ** 2) / 170);
    h += 6 * Math.exp(-((dx - 4) ** 2 + (dz - 18) ** 2) / 120) * .6;
    h += (Math.sin(a * 5 + d * .25) * .9 + Math.sin(a * 9 - d * .4) * .5) * Math.min(1, d / 10) * Math.exp(-Math.pow(d / 30, 2)) * 1.4;
    return Math.max(0, h * (1 - smooth(38, 47, d)));
  }
  W.ground = (x, z) => hill(x, z);

  function buildGEO() {
    const g = W.zones.geo = G(null, 0, 0, 0);
    // ── 山體地形（頂點著色：山腳草綠→山腰深綠→山頂嫩綠，陡坡露岩）──
    const S = 110, N = isMobile ? 110 : 170;
    const geo = new T.PlaneGeometry(S, S, N, N); geo.rotateX(-Math.PI / 2); geo.translate(MT.x, 0, MT.z);
    const pos = geo.attributes.position, cols = new Float32Array(pos.count * 3), c = new T.Color();
    const c1 = new T.Color('#9fd884'), c2 = new T.Color('#4fa868'), c3 = new T.Color('#7fcc76'), rock = new T.Color('#b4b8a0'), soil = new T.Color('#c9dc9a');
    for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), z = pos.getZ(i), h = hill(x, z); pos.setY(i, h > 0 ? h : -.4); }
    geo.computeVertexNormals();
    const nrm = geo.attributes.normal;
    for (let i = 0; i < pos.count; i++) { const h = pos.getY(i), ny = nrm.getY(i), n = Math.sin(pos.getX(i) * .7) * Math.cos(pos.getZ(i) * .6) * .5 + .5;
      c.copy(c1).lerp(c2, smooth(2, 14, h)).lerp(c3, smooth(22, 34, h)); c.lerp(soil, (1 - smooth(0, 2, h)) * .5);
      c.lerp(rock, smooth(.6, .42, ny) * .7); c.offsetHSL(0, 0, (n - .5) * .05); cols.set([c.r, c.g, c.b], i * 3); }
    geo.setAttribute('color', new T.BufferAttribute(cols, 3));
    const terrain = new T.Mesh(geo, new T.MeshToonMaterial({ vertexColors: true, gradientMap: gradMap }));
    terrain.receiveShadow = true; terrain.castShadow = true; W.scene.add(terrain);

    // ── 登山步道（石階＋木扶手）──
    const trail = new T.CatmullRomCurve3([[3, -51], [8, -58], [2, -64], [9, -70], [5, -75], [13, -79], [15, -83], [9, -88], [4, -92], [0, -96]].map(([x, z]) => new V3(x, 0, z)));
    W.trail = trail;
    const stepN = 150, stepG = box(2.1, .28, .55), postG = cyl(.07, .08, 1.1, 6);
    const stepM = new T.InstancedMesh(stepG, toon('#ddd3c1'), stepN), postM = new T.InstancedMesh(postG, toon('#a8794f'), stepN * 2 / 3 | 0);
    const m4 = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(); let pi = 0; const rails = [[], []];
    for (let i = 0; i < stepN; i++) { const u = i / (stepN - 1), p = trail.getPointAt(u), tn = trail.getTangentAt(u), yaw = Math.atan2(tn.x, tn.z);
      const y = hill(p.x, p.z) + .14; q.setFromEuler(e.set(0, yaw, 0)); m4.compose(new V3(p.x, y, p.z), q, new V3(1, 1, 1)); stepM.setMatrixAt(i, m4);
      if (i % 3 === 0) [-1, 1].forEach((s, k) => { const px = p.x + Math.cos(yaw) * 1.2 * s, pz = p.z - Math.sin(yaw) * 1.2 * s, py = hill(px, pz);
        if (pi < postM.count) { m4.compose(new V3(px, py + .55, pz), q, new V3(1, 1, 1)); postM.setMatrixAt(pi++, m4); } rails[k].push(new V3(px, py + 1.08, pz)); }); }
    [stepM, postM].forEach(o => { o.castShadow = true; o.receiveShadow = true; W.scene.add(o); });
    rails.forEach(r => { if (r.length > 1) { const tg = new T.TubeGeometry(new T.CatmullRomCurve3(r), r.length * 3, .05, 5, false); const rm = new T.Mesh(tg, toon('#a8794f')); rm.castShadow = true; W.scene.add(rm); } });
    // 步道入口牌樓
    const gate = G(null, 3, 0, -50.5); gate.rotation.y = .5;
    [-1.6, 1.6].forEach(x => M(cyl(.18, .2, 3.2, 8), '#a8794f', { x, y: 1.6, parent: gate, ol: .03 }));
    M(box(4, .5, .5), '#a8794f', { y: 3.3, parent: gate, ol: .03 });
    const gt = textTex(512, 96, (x, w, h) => { x.fillStyle = '#7a5a3c'; x.fillRect(0, 0, w, h); x.fillStyle = '#fff3d6'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = `900 52px ${FONT_TC}`; x.fillText('象山親山步道', w / 2, h / 2); });
    const gs = new T.Mesh(new T.PlaneGeometry(3.4, .64), new T.MeshBasicMaterial({ map: gt, side: T.DoubleSide })); gs.position.set(0, 3.3, .27); gate.add(gs);

    // ── 觀景平台（木棧平台、欄杆、長椅、望遠鏡，面向 101）──
    const pp = trail.getPointAt(.62), ph = hill(pp.x, pp.z);
    const deck = G(null, pp.x + 2.5, ph, pp.z + 1); deck.rotation.y = Math.atan2(24 - deck.position.x, -4 - deck.position.z);
    W.platform = deck.position.clone();
    M(box(9, .35, 6), '#c99b77', { y: .9, parent: deck });
    for (let k = -4; k <= 4; k += 1) M(box(.06, .02, 6), '#b08460', { x: k, y: 1.08, parent: deck, ol: 0, cast: false });
    [[-4.3, -2.8], [4.3, -2.8], [-4.3, 2.8], [4.3, 2.8], [0, 2.8], [-2.2, 2.8], [2.2, 2.8]].forEach(([x, z]) => M(cyl(.12, .14, 3, 8), '#a8794f', { x, y: -.4, z, parent: deck, ol: .03 }));
    const railPts = [[-4.4, -2.9], [-4.4, 2.9], [4.4, 2.9], [4.4, -2.9]];
    for (let i = 0; i < 3; i++) { const [ax, az] = railPts[i], [bx, bz] = railPts[i + 1];
      tube(deck, new V3(ax, 2.05, az), new V3(bx, 2.05, bz), .07, '#a8794f', .02); tube(deck, new V3(ax, 1.55, az), new V3(bx, 1.55, bz), .04, '#a8794f', 0);
      const L = Math.hypot(bx - ax, bz - az); for (let k = 0; k <= L; k += 1.1) M(cyl(.05, .05, 1, 6), '#a8794f', { x: ax + (bx - ax) * k / L, y: 1.55, z: az + (bz - az) * k / L, parent: deck, ol: 0 }); }
    [-2, 2].forEach(x => { M(box(2, .15, .6), '#a8794f', { x, y: 1.55, z: -1.8, parent: deck, ol: .03 }); [-.8, .8].forEach(d => M(box(.12, .5, .5), '#7a5a3c', { x: x + d, y: 1.3, z: -1.8, parent: deck, ol: 0 })); });
    const scope = G(deck, 2.5, 1.05, 2); M(cyl(.08, .1, 1.1, 8), '#5e6a8a', { y: .55, parent: scope, ol: .02 }); M(cyl(.16, .2, .8, 10), '#4a7fd4', { y: 1.2, z: .1, rx: 1.2, parent: scope, ol: .02 });
    const sg = textTex(512, 128, (x, w, h) => { x.fillStyle = '#fbf3e0'; x.fillRect(0, 0, w, h); x.fillStyle = '#7a5a3c'; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.font = `900 46px ${FONT_TC}`; x.fillText('觀景平台', w / 2, 46); x.font = `700 28px ${FONT_TC}`; x.fillText('▸ 臺北 101・信義計畫區', w / 2, 96); });
    const sb = G(deck, -3.5, 1.05, -2.4); M(cyl(.06, .06, 1.6, 6), '#7a5a3c', { y: .8, parent: sb, ol: 0 });
    const sp = new T.Mesh(new T.PlaneGeometry(1.6, .4), new T.MeshBasicMaterial({ map: sg, side: T.DoubleSide })); sp.position.y = 1.7; sb.add(sp);
    // ── 六巨石 ──
    [[-6.5, -1, 1.7], [-8, 3, 1.4], [-3.5, -5, 1.3], [7, -4, 1.6], [8.5, .5, 1.2], [-5.5, 6, 1.1]].forEach(([x, z, r], i) => {
      const wp = deck.localToWorld(new V3(x, 0, z)), y = hill(wp.x, wp.z);
      M(facet(new T.DodecahedronGeometry(r, 0)), i % 2 ? '#c8c4b4' : '#b9b5a5', { x: wp.x, y: y + r * .55, z: wp.z, rx: i, ry: i * 2, s: [1, 1.25, .9], ol: .08 }); });
    // ── 山頂六角涼亭 ──
    const top = G(null, 0, hill(0, -96), -96);
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; M(cyl(.16, .18, 3.2, 8), '#c9573f', { x: Math.cos(a) * 2, y: 1.6, z: Math.sin(a) * 2, parent: top, ol: .03 }); }
    M(cyl(2.3, 2.3, .3, 6), '#e9e1d2', { y: .15, parent: top, ol: .03 });
    M(new T.ConeGeometry(3.4, 1.4, 6), '#4f8a9c', { y: 3.8, parent: top, ol: .06 });
    M(new T.ConeGeometry(2, 1.4, 6), '#4f8a9c', { y: 4.8, parent: top, ol: .05 });
    M(sph(.28, 1), '#ffd166', { y: 5.7, parent: top, ol: .03 });
    W.summit = top.position.clone();

    // ── 山林：密林（Instanced）──
    const pts = [];
    for (let k = 0; k < 2400 && pts.length < (isMobile ? 220 : 380); k++) {
      const a = rnd(0, 6.28), r = Math.sqrt(Math.random()) * 42, x = MT.x + Math.cos(a) * r, z = MT.z + Math.sin(a) * r, h = hill(x, z);
      if (h < .8) continue;
      let near = false; for (let u = 0; u <= 1; u += .02) { const p = trail.getPointAt(u); if (Math.hypot(p.x - x, p.z - z) < 2.6) { near = true; break; } }
      if (near || Math.hypot(x - W.platform.x, z - W.platform.z) < 9 || Math.hypot(x, z + 96) < 4.5) continue;
      pts.push([x, h, z, rnd(.75, 1.35), Math.random()]);
    }
    instTrees(pts);
    // ── 溪流＋瀑布（大地處的水流入河川）──
    const stream = new T.CatmullRomCurve3([[24, -86], [23, -79], [21, -72], [19, -66], [16, -60]].map(([x, z]) => new V3(x, 0, z)));
    const sm = new T.Mesh(ribbon(stream, 2.6, 80, u => { const p = stream.getPointAt(u); return hill(p.x, p.z) + .18; }, .6), waterMaterial('#b5e8f2', '#59b2d6', { flow: 1.6 }));
    sm.renderOrder = 1; W.scene.add(sm);
    const fp = stream.getPointAt(.12), fy = hill(fp.x, fp.z);
    const cliff = M(facet(new T.DodecahedronGeometry(3, 0)), '#b9b5a5', { x: fp.x + 1, y: fy + 1, z: fp.z - 2.5, s: [1.4, 1.2, .8], ol: .1 });
    const fall = new T.Mesh(new T.PlaneGeometry(2.2, 5), fallMaterial()); fall.position.set(fp.x, fy + 2.2, fp.z - .6); fall.rotation.y = .2; W.scene.add(fall);
    W.fallPos = new V3(fp.x, fy, fp.z);
    // ── 擋土牆（格框植生）＋坡地監測站 ──
    for (let i = 0; i < 7; i++) { const a = -Math.PI / 2 + .6 + i * .12, r = 37, x = Math.cos(a) * r + MT.x, z = Math.sin(a) * r + MT.z;
      const w = G(null, x, hill(x, z), z); w.rotation.y = -a + Math.PI / 2;
      M(box(5.2, 1.6, .8), '#d9d2c4', { y: .5, parent: w, ol: .04 });
      for (let k = -2; k <= 2; k++) M(box(.9, .5, .1), '#8fcf86', { x: k * 1.05, y: .6, z: .42, parent: w, ol: 0 }); }
    [[-14, -78], [12, -90], [-8, -88]].forEach(([x, z], i) => { const s = G(null, x, hill(x, z), z);
      M(cyl(.08, .1, 2.6, 6), '#5e6a8a', { y: 1.3, parent: s, ol: .03 }); M(box(.7, .5, .3), '#ffffff', { y: 2, parent: s, ol: .03 });
      M(box(.8, .05, .5), '#4a7fd4', { y: 2.7, rx: -.4, parent: s, ol: .02 });
      const led = M(sph(.16, 1), '#7cf0b0', { y: 2.4, z: .2, parent: s, ol: 0, mat: new T.MeshBasicMaterial({ color: '#7cf0b0' }) });
      W.updaters.push(t => { led.visible = ((t * 1.5 + i * .3) % 1) < .5; }); });

    // ── 山神爺爺：盤腿坐在大冠鷲背上盤旋；第一人稱靠近時降到玩家面前（約一人高）面對面，離開後飛回山上 ──
    const rider = W.godRider = G(null);
    const eagle = makeEagle(); rider.add(eagle);
    const god = W.god = makeMountainGod(); god.scale.setScalar(.72); god.position.set(0, 1.05, -.2); rider.add(god);
    god.userData.cloud.visible = false; god.userData.tail.visible = false;
    const spark = buildBlessing();
    let gp = new V3(20, 42, -96), ang = 0, scaleNow = 1.8, anchor = null, cooldown = 0, inside = false;
    W.updaters.push((t, dt) => {
      const pl = cam.pos, ex = W.mode === 'explore';
      const onMountain = ex && Math.hypot(pl.x - MT.x, pl.z - MT.z) < 44 && hill(pl.x, pl.z) > 5;
      cooldown = Math.max(0, cooldown - dt);
      // 進入山區時降落一次，停在「當下」玩家前方的固定點；玩家走開超過 14 公尺就飛回山上，不會一路跟隨
      if (onMountain && !inside && !anchor && cooldown === 0) {
        const fx = -Math.sin(cam.yaw), fz = -Math.cos(cam.yaw), tx = pl.x + fx * 5.5, tz = pl.z + fz * 5.5;
        anchor = new V3(tx, Math.max(pl.y - 2.75, hill(tx, tz) + .6), tz);
      }
      inside = onMountain;
      if (anchor && (!ex || Math.hypot(pl.x - anchor.x, pl.z - anchor.z) > 14)) { anchor = null; cooldown = 25; }
      const near = !!anchor;
      let target;
      if (near) target = anchor;
      else { ang += dt * .09; target = new V3(MT.x + Math.cos(ang) * 28, 42 + Math.sin(t * .5) * 3, MT.z + Math.sin(ang) * 24 + 6); }
      const prev = gp.clone(); gp.lerp(target, Math.min(1, dt * (near ? 1.6 : .7)));
      scaleNow += ((near ? .85 : 1.8) - scaleNow) * Math.min(1, dt * 1.5); rider.scale.setScalar(scaleNow);
      rider.position.set(gp.x, gp.y + Math.sin(t * 1.3) * (near ? .12 : .5), gp.z);
      const vel = gp.clone().sub(prev), speed = vel.length() / Math.max(dt, 1e-4);
      const face = near && speed < 6 ? Math.atan2(pl.x - gp.x, pl.z - gp.z) : Math.atan2(vel.x, vel.z);
      const dyaw = nearestAngle(rider.rotation.y, face) - rider.rotation.y;
      rider.rotation.y += dyaw * Math.min(1, dt * 2.2);
      rider.rotation.z += ((near ? 0 : -.28) - dyaw * .4 - rider.rotation.z) * Math.min(1, dt * 2);    // 盤旋時側傾
      eagle.userData.fly(t, dt, near ? 'hover' : 'glide');
      const u = god.userData;
      u.beard.rotation.x = Math.sin(t * 1.7) * .06; u.sleeveL.rotation.z = .25 + Math.sin(t * 1.4) * .06;
      const talking = ex && W._npc === 'god';
      u.handR.rotation.z = (talking || near) ? -2.0 + Math.sin(t * 3) * .25 : -.7 + Math.sin(t * 1.2) * .08;
      u.head.rotation.x = Math.sin(t * .8) * .06 + (talking ? Math.max(0, Math.sin(t * 2)) * .12 : 0);
      u.halo.rotation.z = t * .5; u.haloGlow.material.opacity = .35 + Math.sin(t * 2) * .1;
      spark(rider.position.clone().setY(rider.position.y + 2 * scaleNow), dt, near);
      const n = W.npcs.find(x => x.id === 'god'); if (n) { n.pos.copy(rider.position); n.radius = near ? 12 : 0; }
    });
  }

  // 大冠鷲（台灣特有亞種：深褐身體、白色斑點腹部、黃色臉部裸皮與腳、頭後短冠羽、翼與尾的寬白帶）
  function makeEagle() {
    const e = G(null), brown = '#5b3f2c', brownD = '#3e2a1d', yellow = '#ffc93c';
    const spotT = textTex(256, 128, x => { x.fillStyle = '#7a5538'; x.fillRect(0, 0, 256, 128);
      for (let i = 0; i < 90; i++) { x.fillStyle = 'rgba(255,248,230,.9)'; x.beginPath(); x.arc(Math.random() * 256, Math.random() * 128, 2 + Math.random() * 3, 0, 7); x.fill(); } });
    const wingT = textTex(512, 256, x => { const g = x.createLinearGradient(0, 0, 512, 0); g.addColorStop(0, '#5b3f2c'); g.addColorStop(1, '#4a3222'); x.fillStyle = g; x.fillRect(0, 0, 512, 256);
      x.fillStyle = '#f4efe2'; x.fillRect(0, 170, 512, 34);                      // 翼後緣寬白帶
      x.fillStyle = '#231710'; x.fillRect(0, 210, 512, 46);
      for (let i = 0; i < 30; i++) { x.fillStyle = 'rgba(255,255,255,.18)'; x.fillRect(i * 17, 40, 3, 120); } });
    // 身體
    M(sph(.8, 3), null, { y: .2, s: [.85, .75, 1.7], parent: e, mat: new T.MeshToonMaterial({ map: spotT, gradientMap: gradMap }) });
    M(sph(.8, 3), brown, { y: .45, z: -.1, s: [.88, .55, 1.6], parent: e, ol: .03 });
    // 頭、冠羽、黃色臉部、眼、鉤喙
    const head = G(e, 0, .75, 1.35); e.userData.head = head;
    M(sph(.45, 3), brownD, { s: [.9, .9, 1.05], parent: head });
    for (let i = 0; i < 5; i++) M(new T.ConeGeometry(.12, .5, 6), i % 2 ? '#f4efe2' : '#231710', { x: (i - 2) * .08, y: .25, z: -.35, rx: -1.9 + i * .05, parent: head, ol: .01 });
    [-1, 1].forEach(s => { M(sph(.17, 2), yellow, { x: s * .27, y: .05, z: .22, s: [.6, 1, 1.2], parent: head, ol: 0 });
      M(sph(.08, 2), '#ffe36b', { x: s * .33, y: .08, z: .27, parent: head, ol: 0 }); M(sph(.045, 1), '#111', { x: s * .37, y: .08, z: .3, parent: head, ol: 0 }); });
    M(sph(.16, 2), yellow, { y: -.02, z: .42, s: [1, .8, 1], parent: head, ol: .01 });
    M(new T.ConeGeometry(.12, .4, 8), '#5c6b80', { y: -.08, z: .62, rx: Math.PI / 2 + .5, parent: head, ol: .01 });
    // 翅膀（內翼＋外翼，翼尖分叉飛羽）
    const wings = [-1, 1].map(s => {
      const root = G(e, s * .55, .55, .1), inner = G(root, 0, 0, 0), outer = G(inner, s * 2.0, 0, 0);
      const wm = new T.MeshToonMaterial({ map: wingT, gradientMap: gradMap, side: T.DoubleSide });
      const iw = new T.Mesh(new T.BoxGeometry(2.1, .1, 1.4), wm); iw.position.x = s * 1.0; iw.castShadow = true; inner.add(iw); outline(iw, .03);
      const ow = new T.Mesh(new T.BoxGeometry(1.8, .08, 1.15), wm); ow.position.set(s * .85, 0, .05); ow.castShadow = true; outer.add(ow); outline(ow, .03);
      for (let k = 0; k < 5; k++) M(box(.7, .05, .2), '#231710', { x: s * (1.85 + k * .05), z: .45 - k * .23, ry: s * (-.15 + k * .1), parent: outer, ol: .01 });
      return { root, inner, outer, s };
    });
    // 尾羽（黑白寬帶）
    const tailT = textTex(128, 128, x => { x.fillStyle = '#231710'; x.fillRect(0, 0, 128, 128); x.fillStyle = '#f4efe2'; x.fillRect(0, 50, 128, 30); });
    const tail = new T.Mesh(new T.ConeGeometry(.7, 1.6, 3, 1, true), new T.MeshToonMaterial({ map: tailT, gradientMap: gradMap, side: T.DoubleSide }));
    tail.rotation.x = Math.PI / 2; tail.scale.set(1, 1, .18); tail.position.set(0, .35, -1.75); e.add(tail); outline(tail, .02);
    // 腳（收起）
    [-1, 1].forEach(s => M(cyl(.07, .08, .5, 6), yellow, { x: s * .25, y: -.4, z: -.3, rx: 1.1, parent: e, ol: .01 }));
    let flapT = 0;
    e.userData.fly = (t, dt, mode) => {
      flapT += dt;
      const flap = mode === 'hover' ? Math.sin(t * 5) * .55 : ((t % 7) < 1.6 ? Math.sin(t * 6) * .5 : .08 + Math.sin(t * .8) * .04);
      wings.forEach(w => { w.inner.rotation.z = w.s * flap; w.outer.rotation.z = w.s * flap * .6 - w.s * (mode === 'hover' ? .1 : 0); });
      head.rotation.y = Math.sin(t * .7) * .3;
      e.rotation.x = mode === 'hover' ? -.15 : .05;
    };
    return e;
  }

  // 祝福光點（金色、葉綠色光粒子從山神身上飄散）
  function buildBlessing() {
    const N = 120, geo = new T.BufferGeometry(), p = new Float32Array(N * 3), col = new Float32Array(N * 3), life = new Float32Array(N), vel = [];
    const ca = new T.Color('#ffe08a'), cb = new T.Color('#b9f5c8');
    for (let i = 0; i < N; i++) { life[i] = 0; vel.push(new V3()); const c = i % 3 ? ca : cb; col.set([c.r, c.g, c.b], i * 3); }
    geo.setAttribute('position', new T.BufferAttribute(p, 3)); geo.setAttribute('color', new T.BufferAttribute(col, 3));
    const pts = new T.Points(geo, new T.PointsMaterial({ size: .45, map: dotTex(), vertexColors: true, transparent: true, depthWrite: false, blending: T.AdditiveBlending }));
    pts.frustumCulled = false; W.scene.add(pts);
    let acc = 0, idx = 0;
    return (origin, dt, strong) => {
      acc += dt * (strong ? 60 : 18);
      while (acc > 1) { acc--; const i = idx++ % N; life[i] = 1;
        p.set([origin.x + rnd(-1.5, 1.5), origin.y + rnd(-.5, 3), origin.z + rnd(-1.5, 1.5)], i * 3);
        vel[i].set(rnd(-1, 1), strong ? rnd(-2.5, -.5) : rnd(-.3, .6), rnd(-1, 1)).multiplyScalar(strong ? 2 : 1); }
      for (let i = 0; i < N; i++) { if (life[i] <= 0) { p[i * 3 + 1] = -999; continue; } life[i] -= dt * .5;
        p[i * 3] += vel[i].x * dt; p[i * 3 + 1] += vel[i].y * dt; p[i * 3 + 2] += vel[i].z * dt; }
      geo.attributes.position.needsUpdate = true;
    };
  }

  // 山神爺爺（精修：玉綠外袍金邊、寬袖、慈眉長鬚、髮髻玉簪、葉冠、光環、虯曲木杖、祥雲座）
  function makeMountainGod() {
    const g = G(null); g.scale.setScalar(2.3);
    const robe = '#8fd0b2', robeD = '#6fb898', inner = '#fbf6ea', gold = '#e8c66a', skin = '#ffe2cc';
    // 祥雲
    const cloud = G(g, 0, -.2, 0); g.userData.cloud = cloud;
    [[0, 0, 0, 1.25], [1.15, -.1, .2, .9], [-1.15, -.1, .15, .95], [.5, -.2, 1, .75], [-.6, -.2, .95, .75], [0, -.25, -1, .85], [1.6, -.3, -.6, .6], [-1.7, -.3, -.5, .6]]
      .forEach(([x, y, z, r]) => M(sph(r, 3), '#ffffff', { x, y, z, parent: cloud, ol: .05, mat: toon('#ffffff', { emissive: '#eaf2ff', emissiveIntensity: .3 }) }));
    const curls = [];
    [[1.5, .35, .6, 0], [-1.5, .35, .5, Math.PI], [0, .3, -1.4, Math.PI / 2]].forEach(([x, y, z, r]) => {
      const c = new T.Mesh(new T.TorusGeometry(.45, .1, 8, 24, Math.PI * 1.5), toon('#dfeefc')); c.position.set(x, y, z); c.rotation.y = r; cloud.add(c); outline(c, .03); curls.push(c); });
    g.userData.curls = curls;
    const tail = M(sph(.6, 2), '#ffffff', { x: -.2, y: -.4, z: -2.1, s: [.7, .5, 1.6], parent: g, ol: .04 });
    g.userData.tail = tail;
    // 盤坐的下袍
    M(sph(1.15, 3), robe, { y: .65, s: [1.25, .55, 1.05], parent: g });
    M(new T.TorusGeometry(1.2, .07, 8, 40), gold, { y: .55, rx: Math.PI / 2, s: [1.18, 1, 1], parent: g, ol: 0 });
    // 上身（內白衣＋外袍交領）
    const torso = new T.LatheGeometry([[0, 0], [.95, 0], [.9, .5], [.78, 1.1], [.55, 1.55], [.35, 1.7], [0, 1.72]].map(([x, y]) => new T.Vector2(x, y)), 28);
    M(torso, robe, { y: .9, parent: g });
    const lap = new T.Mesh(new T.PlaneGeometry(.7, 1.3), toon(inner, { side: T.DoubleSide })); lap.position.set(0, 1.85, .72); lap.rotation.x = -.35; g.add(lap);
    [-1, 1].forEach(s => { tube(g, new V3(s * .55, 2.55, .45), new V3(s * .05, 1.3, .86), .07, gold, .01); });
    M(new T.TorusGeometry(.86, .1, 8, 30), '#e88a7a', { y: 1.42, rx: Math.PI / 2, parent: g, ol: .02 });      // 腰帶
    M(sph(.16, 1), '#e88a7a', { y: 1.4, z: .86, parent: g, ol: .02 });
    [-1, 1].forEach(s => M(box(.12, .55, .04), '#e88a7a', { x: s * .1, y: 1.1, z: .88, rz: s * .15, parent: g, ol: 0 }));
    // 寬袖手臂
    const sleeveL = G(g, -.75, 2.35, .1); g.userData.sleeveL = sleeveL; sleeveL.rotation.z = .25;
    M(cyl(.22, .55, 1.3, 18), robe, { y: -.6, rx: -.5, parent: sleeveL, ol: .03 }); M(new T.TorusGeometry(.53, .05, 6, 20), gold, { y: -1.2, z: .35, rx: Math.PI / 2 - .5, parent: sleeveL, ol: 0 });
    M(sph(.2, 2), skin, { y: -1.15, z: .55, parent: sleeveL, ol: .02 });
    const handR = G(g, .75, 2.35, .1); g.userData.handR = handR;
    M(cyl(.22, .5, 1.2, 18), robe, { y: -.55, parent: handR, ol: .03 }); M(new T.TorusGeometry(.48, .05, 6, 20), gold, { y: -1.12, rx: Math.PI / 2, parent: handR, ol: 0 });
    M(sph(.21, 2), skin, { y: -1.2, s: [1, 1.15, .6], parent: handR, ol: .02 });
    // 頭
    const head = G(g, 0, 3.25, .1); g.userData.head = head;
    M(sph(.82, 4), skin, { s: [1, 1.08, .98], parent: head });
    M(sph(.5, 3), skin, { y: .55, z: .1, s: [1.1, .8, .9], parent: head, ol: 0 });            // 壽星額
    [-1, 1].forEach(s => M(sph(.18, 2), skin, { x: s * .8, y: 0, s: [.5, 1, .8], parent: head, ol: .02 }));
    M(sph(.13, 2), '#ffc9b0', { y: -.08, z: .82, parent: head, ol: .01 });                  // 鼻
    [-1, 1].forEach(s => {
      const eye = new T.Mesh(new T.TorusGeometry(.13, .035, 6, 16, Math.PI), toon('#4a3a3a')); eye.position.set(s * .3, .12, .74); head.add(eye);
      const brow = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3([new V3(s * .1, .32, .8), new V3(s * .38, .38, .72), new V3(s * .62, .18, .55), new V3(s * .78, -.2, .4)]), 16, .07, 6), toon('#ffffff'));
      head.add(brow); outline(brow, .02);
      M(sph(.15, 1), '#ffb3c1', { x: s * .48, y: -.15, z: .64, s: [1, .6, .5], parent: head, ol: 0 });
      const mus = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3([new V3(0, -.24, .86), new V3(s * .25, -.28, .82), new V3(s * .48, -.42, .66), new V3(s * .6, -.68, .5)]), 16, .075, 6), toon('#ffffff'));
      head.add(mus); outline(mus, .02);
    });
    const smile = new T.Mesh(new T.TorusGeometry(.14, .025, 6, 14, Math.PI), toon('#b0645a')); smile.position.set(0, -.36, .8); smile.rotation.z = Math.PI; head.add(smile);
    // 長鬚（三綹，會隨風擺）
    const beard = G(head, 0, -.4, .55); g.userData.beard = beard;
    [[0, 1.5, .34], [-.24, 1.15, .24], [.24, 1.15, .24]].forEach(([x, h, r]) => M(new T.ConeGeometry(r, h, 12), '#ffffff', { x, y: -h / 2, z: .1, rx: Math.PI + .12, parent: beard, ol: .03 }));
    // 白髮與髮髻、玉簪、葉冠
    M(new T.SphereGeometry(.86, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2.6), '#f4f4f4', { y: .12, z: -.1, rx: -.35, parent: head, ol: .02 });
    M(sph(.32, 2), '#f4f4f4', { y: 1.0, z: -.2, parent: head, ol: .03 });
    M(cyl(.04, .04, 1.1, 6), '#7fd1b0', { y: 1.0, z: -.2, rz: Math.PI / 2, parent: head, ol: .02 });
    for (let i = 0; i < 9; i++) { const a = -Math.PI * .85 + i / 8 * Math.PI * .7 + Math.PI / 2;
      M(sph(.13, 1), i % 2 ? '#8fcf86' : '#a8e09a', { x: Math.cos(a) * .82, y: .55, z: Math.sin(a) * .82 - .05, s: [.6, 1.4, .35], ry: -a, rz: .3, parent: head, ol: .015 }); }
    // 光環
    const halo = new T.Mesh(new T.TorusGeometry(1.25, .05, 8, 48), new T.MeshBasicMaterial({ color: '#ffe08a' })); halo.position.set(0, .25, -.6); head.add(halo); g.userData.halo = halo;
    const gc = document.createElement('canvas'); gc.width = gc.height = 128; const gx = gc.getContext('2d'); const rg = gx.createRadialGradient(64, 64, 10, 64, 64, 64);
    rg.addColorStop(0, 'rgba(255,240,180,.9)'); rg.addColorStop(1, 'rgba(255,240,180,0)'); gx.fillStyle = rg; gx.fillRect(0, 0, 128, 128);
    const glow = new T.Sprite(new T.SpriteMaterial({ map: new T.CanvasTexture(gc), transparent: true, depthWrite: false, blending: T.AdditiveBlending, opacity: .4 }));
    glow.scale.set(3.4, 3.4, 1); glow.position.set(0, .25, -.7); head.add(glow); g.userData.haloGlow = glow;
    // 虯曲木杖＋葫蘆＋綵帶
    const staffC = new T.CatmullRomCurve3([new V3(-1.15, .2, .55), new V3(-1.25, 1.4, .6), new V3(-1.1, 2.6, .55), new V3(-1.3, 3.6, .5), new V3(-1.05, 4.3, .5), new V3(-.8, 4.5, .55)]);
    const staff = new T.Mesh(new T.TubeGeometry(staffC, 40, .08, 8), toon('#9c7048')); staff.castShadow = true; g.add(staff); outline(staff, .02);
    const gourd = G(g, -.85, 4.05, .6);
    M(sph(.2, 2), '#f2b04a', { parent: gourd, ol: .02 }); M(sph(.14, 2), '#f2b04a', { y: .26, parent: gourd, ol: .02 }); M(cyl(.15, .15, .04, 12), '#e04e4e', { y: .14, parent: gourd, ol: 0 });
    for (let i = 0; i < 4; i++) M(sph(.1, 1), '#8fcf86', { x: -.8 + Math.cos(i) * .18, y: 4.55, z: .55 + Math.sin(i) * .18, s: [.6, 1.3, .35], rz: i, parent: g, ol: .01 });
    const ribbon2 = new T.Mesh(new T.PlaneGeometry(.12, .9, 1, 6), toon('#e88a7a', { side: T.DoubleSide })); ribbon2.position.set(-.95, 3.7, .6); g.add(ribbon2);
    return g;
  }

  /* =====================================================================
   * 城市填充：低矮粉彩建築（避開道路、河流、各處）
   * ===================================================================== */
  function buildCityFiller() {
    const cols = ['#fbe3e8', '#e3eefc', '#fff1d6', '#e6f6ea', '#efe6ff', '#fde8d8'];
    const roofs = ['#e88a97', '#7fa7d9', '#e8b65f', '#78bf8e', '#9b8fe0', '#e89b72'];
    const zonesXY = window.ZONES.map(z => z.pos);
    let placed = 0, tries = 0;
    while (placed < 55 && tries < 2000) {
      tries++;
      const a = rnd(0, Math.PI * 2), r = rnd(46, 104), x = Math.sin(a) * r, z = Math.cos(a) * r;
      if (Math.abs(r - LOOP_R) < 7) continue;
      if (zonesXY.some(([zx, zz]) => Math.hypot(x - zx, z - zz) < 23)) continue;
      if (nearRiver(x, z) < RIVER_W / 2 + 7) continue;
      if (Math.hypot(x - MT.x, z - MT.z) < 50) continue;
      if (Math.hypot(x + 20, z + 14) < 10) continue;
      if (onSpokes(x, z)) continue;
      if (Math.abs(x - (-40)) < 9 && z > 30) continue;  // 支線
      const w = rnd(3.5, 6), d = rnd(3.5, 6), h = rnd(3, r < 50 ? 10 : 6), k = (Math.random() * cols.length) | 0;
      const b = G(null, x, 0, z); b.rotation.y = rnd(0, Math.PI);
      const wm = new T.MeshToonMaterial({ map: windowTex(cols[k], '#b9d7f2', 3, Math.max(2, Math.round(h / 2.5))), gradientMap: gradMap });
      M(box(w, h, d), null, { y: h / 2, parent: b, mat: wm });
      if (Math.random() < .5) M(new T.ConeGeometry(Math.max(w, d) * .75, 2, 4), roofs[k], { y: h + 1, ry: Math.PI / 4, s: [w / Math.max(w, d), 1, d / Math.max(w, d)], parent: b, ol: .08 });
      else M(box(w + .3, .5, d + .3), roofs[k], { y: h + .25, parent: b, ol: .06 });
      W.colliders.push({ x, z, r: Math.max(w, d) * .62 });
      if (Math.random() < .4) tree(null, x + rnd(-5, 5), z + rnd(-5, 5), rnd(.7, 1), 1 + (placed % 2));
      placed++;
    }
  }
  // 外圍樹林（Instanced 一次繪製，省效能）
  function buildGroves() {
    const N = isMobile ? 140 : 240, pts = [];
    let tries = 0;
    while (pts.length < N && tries < 6000) { tries++;
      const a = rnd(0, Math.PI * 2), r = rnd(60, 150), x = Math.sin(a) * r, z = Math.cos(a) * r;
      if (window.ZONES.some(({ pos: [zx, zz] }) => Math.hypot(x - zx, z - zz) < 24)) continue;
      if (nearRiver(x, z) < RIVER_W / 2 + 4) continue;
      if (Math.hypot(x - MT.x, z - MT.z) < 48) continue;
      if (Math.abs(x + 42) < 7 && z > 30) continue;
      if (W.colliders.some(c => Math.hypot(x - c.x, z - c.z) < c.r + 2)) continue;
      pts.push([x, 0, z, rnd(.8, 1.5), Math.random() * .7]);
    }
    instTrees(pts);
  }
  // Instanced 樹林：圓冠闊葉樹＋少量針葉樹，含描邊
  function instTrees(pts) {
    const round = pts.filter(p => p[4] < .8), pine = pts.filter(p => p[4] >= .8);
    const trunkG = cyl(.25, .38, 3, 6), crownG = sph(1.9, 1), coneG = new T.ConeGeometry(1.6, 4.2, 7);
    const q = new T.Quaternion(), m = new T.Matrix4();
    const tr = new T.InstancedMesh(trunkG, toon('#b08a6e'), pts.length);
    const cr = new T.InstancedMesh(crownG, W.leafMats[1], round.length), cr2 = new T.InstancedMesh(crownG, W.leafMats[2], round.length);
    const ol = new T.InstancedMesh(crownG, outlineMat, round.length * 2);
    const pn = new T.InstancedMesh(coneG, toon('#5f9f72'), Math.max(1, pine.length)), pol = new T.InstancedMesh(coneG, outlineMat, Math.max(1, pine.length));
    pn.count = pol.count = pine.length;
    pts.forEach(([x, y, z, s], i) => { m.compose(new V3(x, y + 1.5 * s, z), q, new V3(s, s, s)); tr.setMatrixAt(i, m); });
    round.forEach(([x, y, z, s], i) => {
      m.compose(new V3(x, y + 4.2 * s, z), q, new V3(s, s * .95, s)); cr.setMatrixAt(i, m);
      m.compose(new V3(x, y + 4.2 * s, z), q, new V3(s * 1.06, s * 1.01, s * 1.06)); ol.setMatrixAt(i * 2, m);
      m.compose(new V3(x + .9 * s, y + 3.4 * s, z + .5 * s), q, new V3(s * .65, s * .6, s * .65)); cr2.setMatrixAt(i, m);
      m.compose(new V3(x + .9 * s, y + 3.4 * s, z + .5 * s), q, new V3(s * .72, s * .66, s * .72)); ol.setMatrixAt(i * 2 + 1, m);
    });
    pine.forEach(([x, y, z, s], i) => { m.compose(new V3(x, y + 4.4 * s, z), q, new V3(s, s, s)); pn.setMatrixAt(i, m);
      m.compose(new V3(x, y + 4.4 * s, z), q, new V3(s * 1.08, s * 1.04, s * 1.08)); pol.setMatrixAt(i, m); });
    [tr, cr, cr2, pn].forEach(o => { o.castShadow = true; o.receiveShadow = true; W.scene.add(o); });
    [ol, pol].forEach(o => { W.scene.add(o); outlineList.push(o); });
  }
  function onSpokes(x, z) {
    return window.ZONES.some(zn => { if (zn.id === 'hub') return false;
      const [zx, zz] = zn.pos, L = Math.hypot(zx, zz), ux = zx / L, uz = zz / L;
      const proj = x * ux + z * uz; if (proj < 0 || proj > L) return false;
      return Math.abs(x * uz - z * ux) < 6; });
  }
  function nearRiver(x, z) { let m = 1e9; for (const p of W.riverSamples) { const d = Math.hypot(p.x - x, p.z - z); if (d < m) m = d; } return m; }

  /* =====================================================================
   * 車流：環狀道路車輛＋機車＋跨河支線
   * ===================================================================== */
  function car(col) {
    const c = G(null);
    M(box(2, 1, 3.8), col, { y: .8, parent: c });
    M(box(1.8, .9, 2), '#ffffff', { y: 1.7, z: -.2, parent: c, ol: .06 });
    M(box(1.82, .5, 2.02), '#bfe3f7', { y: 1.75, z: -.2, parent: c, ol: 0 });
    c.userData.wheels = [[-1, 1.2], [1, 1.2], [-1, -1.2], [1, -1.2]].map(([x, z]) => { const w = G(c, x, .4, z);
      M(cyl(.38, .38, .3, 12), '#4b5068', { rz: Math.PI / 2, parent: w, ol: 0 }); M(box(.32, .5, .12), '#c7ccda', { parent: w, ol: 0, cast: false }); return w; });
    M(box(.4, .2, .05), '#fff6c9', { x: -.6, y: .9, z: 1.92, parent: c, ol: 0 }); M(box(.4, .2, .05), '#fff6c9', { x: .6, y: .9, z: 1.92, parent: c, ol: 0 });
    return c;
  }
  function taxi() {
    const c = car('#ffd34d');
    M(box(.9, .35, .5), '#ffffff', { y: 2.35, z: -.2, parent: c, ol: .03 });
    M(box(2.02, .18, 3.82), '#3d4258', { y: .55, parent: c, ol: 0 });
    return c;
  }
  function bus() {
    const c = G(null);
    M(box(2.6, 2.6, 9), '#f6f4ee', { y: 1.7, parent: c });
    M(box(2.62, .5, 9.02), '#5cb87a', { y: .9, parent: c, ol: 0 });
    M(box(2.64, .8, 8), '#bfe3f7', { y: 2.3, z: -.2, parent: c, ol: 0 });
    M(box(2.2, .9, .05), '#bfe3f7', { y: 2.2, z: 4.52, parent: c, ol: 0 });
    M(box(1.6, .3, .06), '#ffb84d', { y: 2.85, z: 4.53, parent: c, ol: 0, mat: new T.MeshBasicMaterial({ color: '#ffb84d' }) });
    c.userData.wheels = [[-1.3, 3], [1.3, 3], [-1.3, -3], [1.3, -3]].map(([x, z]) => { const w = G(c, x, .5, z);
      M(cyl(.5, .5, .35, 14), '#4b5068', { rz: Math.PI / 2, parent: w, ol: 0 }); M(box(.36, .6, .14), '#c7ccda', { parent: w, ol: 0, cast: false }); return w; });
    return c;
  }
  function scooter(col) {
    const s = G(null);
    M(box(.6, .7, 1.7), col, { y: .7, parent: s, ol: .04 });
    M(cyl(.3, .3, .2, 10), '#4b5068', { y: .3, z: .7, rz: Math.PI / 2, parent: s, ol: 0 });
    M(cyl(.3, .3, .2, 10), '#4b5068', { y: .3, z: -.7, rz: Math.PI / 2, parent: s, ol: 0 });
    M(box(.6, .9, .45), '#fdf6ec', { y: 1.5, z: -.2, parent: s, ol: .03 });
    M(sph(.34, 1), col, { y: 2.2, z: -.15, parent: s, ol: .03 });
    return s;
  }
  function buildTraffic() {
    const cols = ['#ff9fb1', '#8fc8ff', '#ffd166', '#a8e6cf', '#c6a8ff', '#ffffff', '#ffb38a', '#9be0e8'];
    for (let i = 0; i < 10; i++) {
      const v = i === 0 ? bus() : i % 4 === 3 ? scooter(cols[i % cols.length]) : i % 3 === 1 ? taxi() : car(cols[i % cols.length]);
      const dir = i % 2 ? 1 : -1, lane = dir > 0 ? 1.75 : -1.75, sp = rnd(.012, .018), off = i / 10;
      W.updaters.push(t => {
        const u = ((t * sp * dir + off) % 1 + 1) % 1, p = W.loop.getPointAt(u), tan = W.loop.getTangentAt(u);
        const n = new V3(-tan.z, 0, tan.x).normalize();
        v.position.set(p.x + n.x * lane, .12, p.z + n.z * lane);
        v.rotation.y = Math.atan2(tan.x, tan.z) + (dir < 0 ? Math.PI : 0);
        if (v.userData.wheels) v.userData.wheels.forEach(w => (w.rotation.x = t * sp * 400));
      });
    }
    for (let i = 0; i < 3; i++) {
      const v = car(cols[(i + 3) % cols.length]); const ph = i * 2.1;
      W.updaters.push(t => {
        const raw = (t * .03 + ph / 6) % 2, fwd = raw < 1, u = fwd ? raw : 2 - raw;
        const p = W.spur.getPointAt(u), tan = W.spur.getTangentAt(u), n = new V3(-tan.z, 0, tan.x).normalize(), lane = fwd ? 1.6 : -1.6;
        v.position.set(p.x + n.x * lane, W.spurY(u), p.z + n.z * lane);
        v.rotation.y = Math.atan2(tan.x, tan.z) + (fwd ? 0 : Math.PI);
      });
    }
  }

  /* =====================================================================
   * 雲、鳥、季節粒子
   * ===================================================================== */
  function buildClouds() {
    W.clouds = [];
    for (let i = 0; i < 9; i++) {
      const c = G(null, rnd(-160, 160), rnd(55, 85), rnd(-170, 60));
      const n = 4 + (Math.random() * 3 | 0);
      for (let k = 0; k < n; k++) M(sph(rnd(4, 7), 2), '#ffffff', { x: (k - n / 2) * 5 + rnd(-1, 1), y: rnd(-1, 2.5), z: rnd(-2, 2), parent: c, ol: .25, cast: false, recv: false, mat: toon('#ffffff', { emissive: '#e8eef8', emissiveIntensity: .35 }) });
      const sp = rnd(1.2, 2.4);
      W.updaters.push((t, dt) => { c.position.x += dt * sp; if (c.position.x > 200) c.position.x = -200; });
    }
  }
  function buildBirds() {
    for (let i = 0; i < 7; i++) {
      const b = G(null);
      const wl = M(box(1.4, .08, .5), '#ffffff', { x: -.7, parent: b, ol: .04, cast: false });
      const wr = M(box(1.4, .08, .5), '#ffffff', { x: .7, parent: b, ol: .04, cast: false });
      M(sph(.32, 1), '#ffffff', { parent: b, ol: .04, cast: false });
      const r = 40 + i * 5, h = 28 + i * 2.5, sp = .14 + i * .015, ph = i * .5;
      W.updaters.push(t => {
        const a = t * sp + ph; b.position.set(Math.cos(a) * r, h + Math.sin(t + i) * 1.5, Math.sin(a) * r - 10);
        b.rotation.y = -a; const f = Math.sin(t * 9 + i) * .6; wl.rotation.z = f; wr.rotation.z = -f;
      });
    }
  }
  function buildParticles() {
    const N = isMobile ? 160 : 320;
    const geo = new T.BufferGeometry(), p = new Float32Array(N * 3), v = [];
    for (let i = 0; i < N; i++) { p[i * 3] = rnd(-110, 110); p[i * 3 + 1] = rnd(0, 50); p[i * 3 + 2] = rnd(-110, 110); v.push(rnd(.5, 1.5)); }
    geo.setAttribute('position', new T.BufferAttribute(p, 3));
    const c = document.createElement('canvas'); c.width = c.height = 32; const x = c.getContext('2d');
    x.fillStyle = '#fff'; x.beginPath(); x.ellipse(16, 16, 13, 8, .6, 0, 7); x.fill();
    const tex = new T.CanvasTexture(c);
    const mat = W.particleMat = new T.PointsMaterial({ size: .9, map: tex, transparent: true, alphaTest: .2, depthWrite: false, color: '#ffc4d4' });
    W.scene.add(new T.Points(geo, mat));
    W.updaters.push((t, dt) => {
      const fall = W.season === 'winter' ? 3 : 1.6;
      for (let i = 0; i < N; i++) { p[i * 3 + 1] -= dt * fall * v[i]; p[i * 3] += Math.sin(t + i) * dt * 1.2;
        if (p[i * 3 + 1] < 0) p[i * 3 + 1] = 50; }
      geo.attributes.position.needsUpdate = true;
    });
  }

  /* =====================================================================
   * 季節
   * ===================================================================== */
  const SEASONS = {
    spring: { leaf: ['#f8bfd0', '#a8dcae', '#c9eab0'], part: '#ffc4d4', fog: '#eef1fa', sky: ['#8fc4ef', '#cfe6fb', '#fde8ea'], ground: '#cfe8b5' },
    summer: { leaf: ['#8fd3a0', '#7fcf97', '#b5e59a'], part: '#fff6b8', fog: '#e8f4fb', sky: ['#7dbcf0', '#c4e4fb', '#eaf6ff'], ground: '#c4e6a6' },
    autumn: { leaf: ['#ffb38a', '#f6c96b', '#e8a07a'], part: '#ffb070', fog: '#f8efe6', sky: ['#9cc6ea', '#e3e9f3', '#ffe6d2'], ground: '#dfe6b4' },
    winter: { leaf: ['#e6eef7', '#cfe3d8', '#dfe9e4'], part: '#ffffff', fog: '#eef3f9', sky: ['#a9c9e8', '#dfeaf6', '#f4f2f8'], ground: '#e6eee4' }
  };
  function setSeason(k) {
    const s = SEASONS[k]; if (!s) return; W.season = k;
    W.leafMats.forEach((m, i) => m.color.set(s.leaf[i]));
    if (W.particleMat) W.particleMat.color.set(s.part);
    W.scene.fog.color.set(s.fog);
    waterMats.forEach(m => m.uniforms.uSky && m.uniforms.uSky.value.set(s.sky[1]));
    const u = W.skyMat.uniforms; u.top.value.set(s.sky[0]); u.mid.value.set(s.sky[1]); u.bot.value.set(s.sky[2]);
    W.panoMat.uniforms.haze.value.set(s.fog);
    W.panoMat.uniforms.tint.value.set(k === 'autumn' ? '#fff0e0' : k === 'winter' ? '#eef4ff' : '#ffffff');
  }

  function setOutlines(on) { W.outlines = on; outlineList.forEach(o => (o.visible = on)); }
  function setQuality(q) {
    W.quality = q; const hi = q === 'high' || (q === 'auto' && !isMobile);
    W.renderer.setPixelRatio(Math.min(devicePixelRatio, q === 'eco' ? 1 : hi ? 2 : 1.5));
    W.renderer.shadowMap.enabled = q !== 'eco';
    W.scene.traverse(o => { if (o.material && o.material.needsUpdate !== undefined) o.material.needsUpdate = true; });
    setOutlines(q !== 'eco');
  }

  /* =====================================================================
   * 點擊判定
   * ===================================================================== */
  function buildHitboxes() {
    buildTraffic();
    buildWalkers();
    buildNPCs();
    const mat = new T.MeshBasicMaterial({ visible: false });
    window.ZONES.forEach(z => {
      const [x, zz] = z.pos;
      const h = new T.Mesh(new T.SphereGeometry(z.id === 'geo' ? 22 : 15, 12, 8), mat);
      h.position.set(x, z.id === 'geo' ? 10 : 5, z.id === 'geo' ? zz - 22 : zz);
      if (z.id === 'hub') h.position.set(4, 7, -4);
      h.userData.zone = z.id; W.scene.add(h); W.hitboxes.push(h);
    });
  }
  const zoneById = id => window.ZONES.find(z => z.id === id);

  /* =====================================================================
   * 相機：總覽（環繞）與探索（第一人稱）
   * ===================================================================== */
  const cam = {
    // 總覽
    target: new V3(0, 6, -16), dist: 150, az: 0, el: .3,
    goal: null, auto: true, lastInteract: 0,
    // 第一人稱
    pos: new V3(0, 2.4, 50), yaw: 0, pitch: -.05, vel: new V3()
  };
  W.cam = cam;

  function flyTo(id) {
    const z = zoneById(id); if (!z) return;
    const [x, zz] = z.pos;
    if (W.mode === 'explore') {   // 探索模式：傳送到該處入口前
      const L = Math.hypot(x, zz) || 1, ux = x / L, uz = zz / L;
      const d = id === 'hub' ? 40 : 16;
      const px = id === 'hub' ? 0 : x - ux * d, pz = id === 'hub' ? 40 : zz - uz * d;
      cam.fp = { from: cam.pos.clone(), to: new V3(px, 2.4, pz), yawTo: Math.atan2(-(x - px), -(zz - pz)), t0: performance.now() };
      return;
    }
    let tgt, dist, az, el;
    if (id === 'hub') { tgt = new V3(6, 10, -2); dist = 82; az = -.12; el = .2; }
    else if (id === 'geo') { tgt = new V3(4, 18, -88); dist = 82; az = .25; el = .16; }
    else {
      tgt = new V3(x, 4, zz); dist = 46; el = .27;
      az = Math.atan2(-x, -zz);               // 相機在工務局側往外看（背景是台北全景）
    }
    cam.goal = { t0: performance.now(), dur: 1500, from: { target: cam.target.clone(), dist: cam.dist, az: cam.az, el: cam.el }, to: { target: tgt, dist, az: nearestAngle(cam.az, az), el } };
    cam.auto = false; cam.lastInteract = performance.now();
  }
  function nearestAngle(from, to) { let d = to - from; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return from + d; }
  function overviewHome() {
    cam.goal = { t0: performance.now(), dur: 1600, from: { target: cam.target.clone(), dist: cam.dist, az: cam.az, el: cam.el }, to: { target: new V3(0, 6, -16), dist: isPortrait() ? 200 : 150, az: nearestAngle(cam.az, 0), el: .3 } };
    cam.auto = true;
  }
  const isPortrait = () => innerHeight > innerWidth;

  function setMode(m) {
    if (m === W.mode) return;
    W.mode = m;
    if (m === 'explore') { cam.pos.set(0, 2.4, 50); cam.yaw = 0; cam.pitch = -.04; cam.fp = null; }
    else if (W._npc) { W._npc = null; W.listeners.npc.forEach(f => f(null)); }
    else overviewHome();
    W.listeners.modeChange.forEach(f => f(m));
  }

  /* ---------- 輸入 ---------- */
  function bindInput(el) {
    let down = null, moved = 0, pinch = null;
    const ptrs = new Map();
    el.addEventListener('pointerdown', e => { ptrs.set(e.pointerId, e); down = { x: e.clientX, y: e.clientY }; moved = 0; cam.lastInteract = performance.now(); cam.auto = false; el.setPointerCapture(e.pointerId); });
    el.addEventListener('pointermove', e => {
      if (!ptrs.has(e.pointerId)) { hover(e); return; }
      const prev = ptrs.get(e.pointerId); ptrs.set(e.pointerId, e);
      if (ptrs.size === 2) {
        const [a, b] = [...ptrs.values()]; const d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
        if (pinch) { if (W.mode === 'overview') { cam.dist = T.MathUtils.clamp(cam.dist * pinch / d, 25, 230); cam.goal = null; } } pinch = d; return;
      }
      const dx = e.clientX - prev.clientX, dy = e.clientY - prev.clientY; moved += Math.abs(dx) + Math.abs(dy);
      if (W.mode === 'overview') { cam.az -= dx * .005; cam.el = T.MathUtils.clamp(cam.el + dy * .003, .08, 1.25); cam.goal = null; }
      else { cam.yaw -= dx * .0045; cam.pitch = T.MathUtils.clamp(cam.pitch - dy * .0035, -1.0, .9); }
    });
    const up = e => { ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch = null; if (down && moved < 8 && e.type === 'pointerup') click(e); down = null; };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    el.addEventListener('wheel', e => { e.preventDefault(); cam.lastInteract = performance.now();
      if (W.mode === 'overview') { cam.dist = T.MathUtils.clamp(cam.dist * (1 + Math.sign(e.deltaY) * .08), 25, 230); cam.goal = null; } }, { passive: false });
    addEventListener('keydown', e => { if (e.target.tagName === 'INPUT') return; W.keys[e.code] = true; });
    addEventListener('keyup', e => { W.keys[e.code] = false; });
    addEventListener('blur', () => { W.keys = {}; });
  }
  const ray = new T.Raycaster(), ndc = new T.Vector2();
  function pick(e) {
    const r = W.renderer.domElement.getBoundingClientRect();
    ndc.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
    ray.setFromCamera(ndc, W.camera);
    const hit = ray.intersectObjects(W.hitboxes)[0]; return hit && hit.object.userData.zone;
  }
  function click(e) { const z = pick(e); if (z) W.listeners.zoneClick.forEach(f => f(z)); }
  let lastHover = 0;
  function hover(e) { const n = performance.now(); if (n - lastHover < 80) return; lastHover = n; W.renderer.domElement.style.cursor = pick(e) ? 'pointer' : 'grab'; }

  /* ---------- 第一人稱移動與碰撞 ---------- */
  function updateExplore(dt) {
    if (cam.fp) { // 傳送動畫
      const k = Math.min(1, (performance.now() - cam.fp.t0) / 1200), e = k * k * (3 - 2 * k);
      cam.pos.lerpVectors(cam.fp.from, cam.fp.to, e); cam.pos.y = 2.4 + hill(cam.pos.x, cam.pos.z) + Math.sin(e * Math.PI) * 18;
      cam.yaw = cam.yaw + (nearestAngle(cam.yaw, cam.fp.yawTo) - cam.yaw) * Math.min(1, dt * 5);
      if (k >= 1) cam.fp = null;
    } else {
      const k = W.keys;
      let fx = (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0) + W.move.y;
      let sx = (k.KeyD ? 1 : 0) - (k.KeyA ? 1 : 0) + W.move.x;
      if (k.ArrowLeft) cam.yaw += dt * 1.8; if (k.ArrowRight) cam.yaw -= dt * 1.8;
      const run = k.ShiftLeft || k.ShiftRight || Math.hypot(W.move.x, W.move.y) > .92 ? 2 : 1;
      const sp = 13 * run;
      const fwd = new V3(-Math.sin(cam.yaw), 0, -Math.cos(cam.yaw)), right = new V3(Math.cos(cam.yaw), 0, -Math.sin(cam.yaw));
      const want = fwd.multiplyScalar(fx).add(right.multiplyScalar(sx));
      if (want.lengthSq() > 1) want.normalize();
      cam.vel.lerp(want.multiplyScalar(sp), Math.min(1, dt * 8));
      const next = cam.pos.clone().addScaledVector(cam.vel, dt);
      resolveCollision(next);
      cam.pos.x = next.x; cam.pos.z = next.z;
      const speed = cam.vel.length();
      cam.bob = (cam.bob || 0) + dt * speed * .9;
      cam.pos.y = 2.4 + (W.reduced ? 0 : Math.sin(cam.bob) * .08) * Math.min(1, speed / 8) + bridgeLift(cam.pos) + hill(cam.pos.x, cam.pos.z);
    }
    W.camera.position.copy(cam.pos);
    const look = new V3(-Math.sin(cam.yaw) * Math.cos(cam.pitch), Math.sin(cam.pitch), -Math.cos(cam.yaw) * Math.cos(cam.pitch));
    W.camera.lookAt(cam.pos.clone().add(look));
    // 接近提示
    let near = null, nd = 1e9;
    window.ZONES.forEach(z => { const [x, zz] = z.pos; const d = Math.hypot(cam.pos.x - x, cam.pos.z - (z.id === 'geo' ? zz : zz)); const lim = z.id === 'hub' ? 26 : 17; if (d < lim && d < nd) { nd = d; near = z.id; } });
    if (near !== W._near) { W._near = near; W.listeners.proximity.forEach(f => f(near)); }
    let npc = null, best = 1e9;
    W.npcs.forEach(n => { const d = Math.hypot(cam.pos.x - n.pos.x, cam.pos.z - n.pos.z); if (d < n.radius && d < best) { best = d; npc = n.id; } });
    if (npc !== W._npc) { W._npc = npc; const n = W.npcs.find(x => x.id === npc); if (n) n.wave = 2.2; W.listeners.npc.forEach(f => f(npc)); }
  }
  function nearSpur(p) { let b = null, bd = 1e9; for (const s of W.spurSamples) { const d = Math.hypot(s.x - p.x, s.z - p.z); if (d < bd) { bd = d; b = s; } } return { d: bd, t: b.t }; }
  function bridgeLift(p) { const n = nearSpur(p); return n.d < 4.6 ? W.spurY(n.t) - .12 : 0; }
  function resolveCollision(p) {
    const r0 = Math.hypot(p.x, p.z); if (r0 > 104) { p.x *= 104 / r0; p.z *= 104 / r0; }
    for (const c of W.colliders) {
      const dx = p.x - c.x, dz = p.z - c.z, d = Math.hypot(dx, dz), rr = c.r + 1;
      if (d < rr && d > .001) { p.x = c.x + dx / d * rr; p.z = c.z + dz / d * rr; }
    }
    // 河流：只能從橋上通過
    const onBridge = nearSpur(p).d < 4.4;
    if (!onBridge) {
      let best = null, bd = 1e9; for (const s of W.riverSamples) { const d = Math.hypot(s.x - p.x, s.z - p.z); if (d < bd) { bd = d; best = s; } }
      const lim = RIVER_W / 2 + .6;
      if (bd < lim) { const dx = p.x - best.x, dz = p.z - best.z, d = Math.hypot(dx, dz) || 1; p.x = best.x + dx / d * lim; p.z = best.z + dz / d * lim; }
    }
  }

  // 讓主體避開左下資訊卡：總覽時把畫面中心往右（手機往上）偏移
  let viewShift = 0, viewShiftGoal = 0;
  function applyViewOffset(dt) {
    viewShift += (viewShiftGoal - viewShift) * Math.min(1, dt * 3);
    const c = W.renderer.domElement, w = c.clientWidth, h = c.clientHeight;
    if (Math.abs(viewShift) < .001) { if (W.camera.view && W.camera.view.enabled) { W.camera.clearViewOffset(); } return; }
    const portrait = h > w;
    W.camera.setViewOffset(w, h, portrait ? 0 : -w * viewShift, portrait ? h * viewShift * 1.1 : 0, w, h);
  }
  function updateOverview(dt, t) {
    if (cam.goal) {
      const k = Math.min(1, (performance.now() - cam.goal.t0) / cam.goal.dur), e = 1 - Math.pow(1 - k, 3);
      const f = cam.goal.from, to = cam.goal.to;
      cam.target.lerpVectors(f.target, to.target, e);
      cam.dist = f.dist + (to.dist - f.dist) * e; cam.az = f.az + (to.az - f.az) * e; cam.el = f.el + (to.el - f.el) * e;
      if (k >= 1) cam.goal = null;
    } else if (!W.reduced && (cam.auto || performance.now() - cam.lastInteract > 12000)) {
      cam.az += dt * .025;
    }
    const ce = Math.cos(cam.el);
    W.camera.position.set(cam.target.x + Math.sin(cam.az) * ce * cam.dist, cam.target.y + Math.sin(cam.el) * cam.dist, cam.target.z + Math.cos(cam.az) * ce * cam.dist);
    W.camera.lookAt(cam.target);
  }

  /* ---------- 主迴圈 ---------- */
  let frames = 0, fpsT = 0, lowCount = 0;
  function animate() {
    requestAnimationFrame(animate);
    if (document.hidden) return;
    const dt = Math.min(W.clock.getDelta(), .05), t = W.clock.elapsedTime;
    W.updaters.forEach(f => f(t, dt));
    waterMats.forEach(m => (m.uniforms.uTime.value = t));
    W.flowMats.forEach(m => (m.uniforms.uTime.value = t));
    if (W.mode === 'debug') { if (W.follow) { const o = W.follow, wp = o.getWorldPosition(new V3()), q = o.getWorldQuaternion(new T.Quaternion());
        W.camera.position.copy(wp).add(new V3(4.5, 2.6, 2.5).applyQuaternion(q)); W.camera.lookAt(wp.clone().add(new V3(0, 1.2, 0))); } }
    else if (W.mode === 'explore') updateExplore(dt); else updateOverview(dt, t);
    applyViewOffset(dt);
    W.renderer.render(W.scene, W.camera);
    W.listeners.frame.forEach(f => f());
    // 自動畫質：持續低於 30fps 改用省電
    frames++; fpsT += dt;
    if (fpsT > 2) { const fps = frames / fpsT; frames = 0; fpsT = 0;
      if (W.quality === 'auto' && fps < 30 && ++lowCount >= 3) { lowCount = 0; W.renderer.setPixelRatio(Math.max(1, W.renderer.getPixelRatio() - .5)); }
      W.fps = Math.round(fps); }
  }

  /* ---------- 標籤投影 ---------- */
  const tmp = new V3();
  function projectZones() {
    const out = [], w = W.renderer.domElement.clientWidth, h = W.renderer.domElement.clientHeight;
    window.ZONES.forEach(z => {
      const [x, zz] = z.pos;
      const y = z.id === 'hub' ? 22 : z.id === 'geo' ? 44 : 11;
      tmp.set(x, y, z.id === 'geo' ? -96 : zz).project(W.camera);
      const dist = W.camera.position.distanceTo(new V3(x, y, zz));
      out.push({ id: z.id, x: (tmp.x + 1) / 2 * w, y: (1 - tmp.y) / 2 * h, visible: tmp.z < 1 && tmp.z > -1, dist });
    });
    return out;
  }

  window.World = {
    init, flyTo, setMode, setSeason, setQuality, projectZones, overviewHome,
    setViewShift: v => { viewShiftGoal = v; },
    setReducedMotion: v => { W.reduced = v; if (W.particleMat) W.particleMat.visible = !v; },
    projectNPC: id => { const n = W.npcs.find(x => x.id === id); if (!n) return null;
      const h = n.obj ? 2.9 : n.data.outfit === 'god' ? 4.4 : 3.4; tmp.set(n.pos.x, n.pos.y + h, n.pos.z).project(W.camera);
      const c = W.renderer.domElement; return { x: (tmp.x + 1) / 2 * c.clientWidth, y: (1 - tmp.y) / 2 * c.clientHeight, visible: tmp.z < 1 }; },
    teleport: (x, z, yaw) => { cam.fp = null; cam.pos.set(x, 2.4, z); cam.yaw = yaw; cam.vel.set(0, 0, 0); },
    npcWave: id => { const n = W.npcs.find(x => x.id === id); if (n) n.wave = 1.6; },
    listenerPos: () => (W.mode === 'explore' ? cam.pos : cam.target),
    riverDistance: (x, z) => nearRiver(x, z),
    get rollerPos() { return W.roller && W.roller.getWorldPosition(new V3()); },
    get godPos() { return W.godRider && W.godRider.position; }, get godYaw() { return W.godRider ? W.godRider.rotation.y : 0; },
    get playgroundPos() { return W.playground; }, get fallPos() { return W.fallPos; },
    debugCam: (p, l) => { W.mode = 'debug'; W.follow = null; viewShiftGoal = 0; W.camera.position.copy(p); W.camera.lookAt(l); },
    debugFollowBike: () => { W.mode = 'debug'; viewShiftGoal = 0; W.follow = W.bikes[0]; },
    setMoveInput: (x, y) => { W.move.x = x; W.move.y = y; },
    setSkyImage: url => new T.TextureLoader().load(url, t => W.setSkyTexture(t)),
    on: (ev, f) => W.listeners[ev].push(f),
    get mode() { return W.mode; }, get fps() { return W.fps; }, get season() { return W.season; },
    get playerPos() { return cam.pos; }, get playerYaw() { return cam.yaw; },
    isMobile
  };
})();
