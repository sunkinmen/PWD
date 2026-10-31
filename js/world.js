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
    listeners: { zoneClick: [], proximity: [], frame: [], modeChange: [] },
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

  /* ---------- 水面 Shader（流動條紋＋岸邊白浪） ---------- */
  const waterMats = [];
  function waterMaterial(base = '#86cfe9', deep = '#5fb3dc') {
    const m = new T.ShaderMaterial({
      fog: true,
      uniforms: T.UniformsUtils.merge([T.UniformsLib.fog, {
        uTime: { value: 0 }, uBase: { value: new T.Color(base) }, uDeep: { value: new T.Color(deep) }
      }]),
      vertexShader: `
        varying vec2 vUv; #include <fog_pars_vertex>
        void main(){ vUv=uv; vec4 mvPosition=modelViewMatrix*vec4(position,1.); gl_Position=projectionMatrix*mvPosition; #include <fog_vertex> }`.replace(/#include <fog_pars_vertex>/, '\n#include <fog_pars_vertex>\n').replace(/#include <fog_vertex>/, '\n#include <fog_vertex>\n'),
      fragmentShader: `
        uniform float uTime; uniform vec3 uBase; uniform vec3 uDeep; varying vec2 vUv;
        #include <fog_pars_fragment>
        void main(){
          float edge = smoothstep(0.0,0.14,vUv.x)*smoothstep(1.0,0.86,vUv.x);
          vec3 col = mix(uBase*1.08, uDeep, edge*0.55);
          float s = sin((vUv.y*2.2 - uTime*0.9) + sin(vUv.x*9.0+uTime*0.6)*0.8);
          float stripe = smoothstep(0.93,1.0,s) * edge;
          col = mix(col, vec3(1.0), stripe*0.55);
          float foam = 1.0 - smoothstep(0.0,0.06,min(vUv.x,1.0-vUv.x));
          col = mix(col, vec3(1.0), foam*0.75);
          gl_FragColor = vec4(col,1.0);
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

    // 放射步道（局本部 → 各處）＋流動光帶（串連感）
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
    W.spurY = t => 0.12 + 1.6 * Math.exp(-Math.pow((t - 0.47) / 0.13, 2));
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
    const pts = [[10, -66], [24, -60], [42, -56], [66, -48], [76, -18], [74, 16], [66, 46], [38, 62], [0, 66], [-38, 62], [-72, 58], [-120, 64]]
      .map(([x, z]) => new V3(x, 0, z));
    const river = W.river = new T.CatmullRomCurve3(pts);
    const bank = new T.Mesh(ribbon(river, RIVER_W + 7, 220, () => 0.07), toon('#ece0c4'));
    bank.receiveShadow = true; W.scene.add(bank);
    const water = new T.Mesh(ribbon(river, RIVER_W, 220, () => 0.2, 1), waterMaterial());
    W.scene.add(water);
    for (let i = 0; i <= 300; i++) W.riverSamples.push(river.getPointAt(i / 300));
  }

  /* =====================================================================
   * 局本部：市府大樓＋臺北101＋全像連結環
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
    M(wbox(40, H, 8), null, { y: H / 2, parent: hall, mat: beigeS });
    // 兩條南北向翼（十字直劃）
    [-8, 8].forEach(x => M(wbox(7.5, H, 28), null, { x, y: H / 2, parent: hall, mat: beigeS }));
    // 十字交會處高塔
    [-8, 8].forEach(x => {
      M(wbox(9, HT, 9, 1.5, 1.05), null, { x, y: HT / 2, parent: hall, mat: beigeT });
      M(box(9.4, .5, 9.4), '#d6bfa6', { x, y: HT + .25, parent: hall, ol: .06 });
      M(box(3, 1.4, 3), '#d6bfa6', { x, y: HT + 1.2, parent: hall, ol: .05 });
    });
    // 各翼屋頂壓頂
    M(box(40.4, .4, 8.4), '#d6bfa6', { y: H + .2, parent: hall, ol: .05 });
    [-8, 8].forEach(x => M(box(7.9, .4, 28.4), '#d6bfa6', { x, y: H + .2, parent: hall, ol: .05 }));
    // 中央入口量體（深棕花崗岩）＋門廳柱列
    const ent = G(hall, 0, 0, 6);
    M(box(8.5, 6, 5), '#8f6f66', { y: 3, parent: ent });
    M(box(6.4, 3.6, .4), '#4e3c3a', { y: 1.8, z: 2.4, parent: ent, ol: 0 });
    [-2.4, -.8, .8, 2.4].forEach(x => M(box(.5, 3.6, .5), '#9c7b70', { x, y: 1.8, z: 2.65, parent: ent, ol: .03 }));
    M(box(6.8, .45, 1.2), '#7a5d55', { y: 3.75, z: 2.6, parent: ent, ol: .04 });
    M(box(4.6, .7, .2), '#f3d9a8', { y: 5, z: 2.55, parent: ent, ol: 0 });              // 招牌
    const clockBar = M(box(3.2, .7, .2), '#2c2a33', { y: 6.5, z: 2.0, parent: ent, ol: .03 });
    const clockLed = M(box(2.8, .35, .05), '#ff5a4f', { y: 6.5, z: 2.13, parent: ent, ol: 0, mat: new T.MeshBasicMaterial({ color: '#ff6a5c' }) });
    W.updaters.push(t => { clockLed.scale.x = .85 + ((t | 0) % 2) * .15; });
    // 入口上方屋頂綠籬（柏樹列）
    for (let i = -4; i <= 4; i++) M(new T.ConeGeometry(.45, 1.8, 7), '#6fae7c', { x: i * 1.0, y: 6.9, z: 4.6, parent: ent, ol: .04 });
    // 中央量體頂部的國旗旗桿
    M(cyl(.06, .08, 4, 6), '#e8e8f0', { y: H + 2, z: 3.2, parent: hall, ol: .03 });
    const nflag = M(box(1.3, .85, .04), '#e86b6b', { x: .65, y: H + 3.5, z: 3.2, parent: hall, ol: .03 });
    W.updaters.push(t => { nflag.rotation.y = Math.sin(t * 2.2) * .3; });
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
      { x: -16, z: -4, r: 4.5 }, { x: 16, z: -4, r: 4.5 }, { x: 0, z: 3, r: 5 });

    // ── 臺北101（八節竹節造型，頂部塔冠連續無斷層）──
    const t101 = G(g, -16.5, 0, -18.5);
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
    W.colliders.push({ x: -16.5, z: -18.5, r: 4.8 });

    // 全像連結環：五色光段＋往五處的光柱
    const holo = G(g, 0, 0, 19);
    const ringBase = M(cyl(3.2, 3.6, .6, 32), '#ffffff', { y: .3, parent: holo, ol: 0.06 });
    const ringG = G(holo, 0, 2.4, 0);
    window.ZONES.filter(z => z.id !== 'hub').forEach((z, i) => {
      const seg = new T.Mesh(new T.TorusGeometry(2.4, .16, 8, 24, Math.PI * 2 / 5 - .12), new T.MeshBasicMaterial({ color: z.color }));
      seg.rotation.z = i * Math.PI * 2 / 5; ringG.add(seg);
    });
    ringG.rotation.x = Math.PI / 2;
    const core = M(sph(.7, 2), '#ffffff', { y: 2.4, parent: holo, ol: 0, mat: new T.MeshBasicMaterial({ color: '#eaf4ff' }) });
    W.updaters.push(t => { ringG.rotation.z = t * .6; core.position.y = 2.4 + Math.sin(t * 2) * .2; });
  }

  /* =====================================================================
   * 新建工程處：路平施工（壓路機）＋斜張橋
   * ===================================================================== */
  function buildNCO() {
    const [zx, zz] = zoneById('nco').pos;
    const g = W.zones.nco = G(null, zx, 0, zz);
    // 新鋪柏油區
    const patch = new T.Mesh(new T.PlaneGeometry(16, 7), toon('#6f748a'));
    patch.rotation.x = -Math.PI / 2; patch.position.set(0, 0.14, -4); patch.receiveShadow = true; g.add(patch);
    const done = new T.Mesh(new T.PlaneGeometry(16, 7), toon('#585d72'));
    done.rotation.x = -Math.PI / 2; done.position.set(0, 0.15, -4); done.scale.x = .01; g.add(done);
    // 壓路機
    const roller = G(g, 0, 0, -4);
    M(box(3.4, 1.6, 2.4), '#ffd166', { y: 1.5, parent: roller });
    M(box(1.6, 1.4, 2.0), '#fff1c2', { x: -.6, y: 3, parent: roller });
    M(box(2.0, .2, 2.4), '#ffd166', { x: -.6, y: 3.8, parent: roller, ol: 0.06 });
    const drum = M(cyl(1, 1, 2.6, 20), '#c9cfdc', { x: 2.2, y: 1, rx: Math.PI / 2, parent: roller });
    const wheel = M(cyl(.8, .8, 2.6, 16), '#4b5068', { x: -1.4, y: .8, rx: Math.PI / 2, parent: roller });
    const lamp = M(sph(.22, 1), '#ff9e5e', { x: -.6, y: 4.1, parent: roller, ol: 0, mat: new T.MeshBasicMaterial({ color: '#ffa86b' }) });
    W.updaters.push(t => {
      const p = Math.sin(t * .35); roller.position.x = p * 5.5;
      roller.rotation.y = Math.cos(t * .35) > 0 ? 0 : Math.PI;
      drum.rotation.y += .0; drum.rotation.x = Math.PI / 2; drum.rotation.y = -p * 6;
      done.scale.x = Math.max(.01, (p + 1) / 2); done.position.x = -8 + 8 * done.scale.x;
      lamp.visible = (t * 3 | 0) % 2 === 0;
    });
    // 三角錐與圍欄
    for (let i = 0; i < 6; i++) cone(g, -8 + i * 3.2, 0.2);
    for (let i = 0; i < 6; i++) cone(g, -8 + i * 3.2, -8.2);
    // 工程看板
    const sign = G(g, 9.5, 0, -1);
    M(box(.2, 3, .2), '#5e6a8a', { y: 1.5, parent: sign, ol: .04 });
    M(box(3, 2, .2), '#ffffff', { y: 3.4, parent: sign, ol: .06 });
    M(box(2.6, .4, .22), '#e0707e', { y: 4, parent: sign, ol: 0 });

    // 斜張橋（跨河支線上）
    const tBridge = 0.47, p = W.spur.getPointAt(tBridge), tan = W.spur.getTangentAt(tBridge);
    const bg = G(null, p.x, 0, p.z); bg.rotation.y = Math.atan2(tan.x, tan.z);
    const deckY = W.spurY(tBridge);
    M(box(7.6, .7, 26), '#f2eee6', { y: deckY - .4, parent: bg });
    [-3.9, 3.9].forEach(x => M(box(.3, .8, 26), '#ffb3bd', { x, y: deckY + .3, parent: bg, ol: .05 }));
    // 橋墩
    [-8, 8].forEach(z => M(cyl(.9, 1.1, deckY + .5, 12), '#e9e4da', { y: (deckY - .5) / 2, z, parent: bg, ol: .06 }));
    // A 字型主塔
    const towerH = 20;
    [-1, 1].forEach(sx => M(box(.9, towerH, .9), '#ffffff', { x: sx * 2.6, y: towerH / 2, rz: sx * .12, parent: bg }));
    M(box(4.6, .8, .9), '#ffb3bd', { y: towerH * .62, parent: bg, ol: .06 });
    M(box(2.2, 1.2, 1.2), '#ffb3bd', { y: towerH + .2, parent: bg, ol: .06 });
    // 鋼纜
    const cablePts = [];
    for (let k = 1; k <= 7; k++) for (const sz of [-1, 1]) for (const sx of [-1, 1]) {
      cablePts.push(new V3(sx * 1.6, towerH - .5 - k * .35, 0), new V3(sx * 3.4, deckY + .5, sz * k * 1.75));
    }
    const cg = new T.BufferGeometry().setFromPoints(cablePts);
    bg.add(new T.LineSegments(cg, new T.LineBasicMaterial({ color: '#d98a98' })));
  }
  function cone(parent, x, z) {
    const c = G(parent, x, 0, z);
    M(cyl(.05, .38, .9, 12), '#ff9e6b', { y: .45, parent: c, ol: .04 });
    M(cyl(.22, .29, .2, 12), '#ffffff', { y: .5, parent: c, ol: 0 });
  }

  /* =====================================================================
   * 水利工程處：抽水站＋疏散門＋河濱自行車＋渡船
   * ===================================================================== */
  function buildHEO() {
    const [zx, zz] = zoneById('heo').pos;
    const g = W.zones.heo = G(null, zx, 0, zz);
    // 抽水站
    const st = G(g, 6, 0, -6); st.rotation.y = -0.5;
    M(box(9, 5.5, 7), '#f7f4ee', { y: 2.75, parent: st });
    M(box(9.8, .9, 7.8), '#6fb6e0', { y: 5.9, parent: st });
    M(box(3, 2, .3), '#bfe3f7', { y: 3.6, z: 3.6, parent: st, ol: .05 });
    // 出水管
    [-2.5, 0, 2.5].forEach(x => M(cyl(.6, .6, 6, 14), '#9fc9e8', { x, y: 1, z: -5.5, rx: Math.PI / 2 - .25, parent: st, ol: .06 }));
    // 風扇（旋轉）
    const fan = G(st, 4.6, 3.4, 0);
    M(cyl(1.4, 1.4, .3, 24), '#ffffff', { rz: Math.PI / 2, parent: fan, ol: .05 });
    const blades = G(fan, .25, 0, 0);
    for (let i = 0; i < 4; i++) { const b = M(box(.1, 2.2, .45), '#6fb6e0', { parent: blades, ol: 0 }); b.rotation.x = i * Math.PI / 4; }
    W.updaters.push((t, dt) => { blades.rotation.x += dt * 6; });
    W.colliders.push({ x: zx + 6, z: zz - 6, r: 6.5 });
    // 堤防＋疏散門
    const lv = G(g, -6, 0, 7); lv.rotation.y = .2;
    M(box(12, 2.4, 1.2), '#e9e4da', { y: 1.2, parent: lv });
    M(box(3.6, .5, 1.6), '#6fb6e0', { y: 2.6, parent: lv, ol: .05 });
    const gate = M(box(3, 2.2, .5), '#ffd166', { y: 1.1, z: .4, parent: lv, ol: .06 });
    W.updaters.push(t => { gate.position.y = 1.1 + (Math.sin(t * .4) > .6 ? 2 : 0) * Math.min(1, (Math.sin(t * .4) - .6) * 6); });
    // 向日葵花圃
    for (let i = 0; i < 18; i++) flower(g, rnd(-10, 2), rnd(-12, -4), '#ffd166', 1.2);

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
    const lawn = new T.Mesh(new T.CircleGeometry(20, 48), toon('#bfe3a3'));
    lawn.rotation.x = -Math.PI / 2; lawn.position.y = .05; lawn.receiveShadow = true; g.add(lawn);
    // 噴泉
    const f = G(g, -4, 0, -4);
    M(cyl(3.2, 3.4, .8, 28), '#f3ece0', { y: .4, parent: f });
    const pool = new T.Mesh(new T.CircleGeometry(2.8, 28), waterMaterial('#9fdcf0', '#7cc7e6'));
    pool.rotation.x = -Math.PI / 2; pool.position.y = .82; f.add(pool);
    M(cyl(.4, .6, 2, 12), '#f3ece0', { y: 1.4, parent: f, ol: .06 });
    const dropN = 60, dg = new T.BufferGeometry(), dp = new Float32Array(dropN * 3), dv = [];
    for (let i = 0; i < dropN; i++) dv.push({ a: rnd(0, 6.28), s: rnd(.6, 1.2), o: rnd(0, 1) });
    dg.setAttribute('position', new T.BufferAttribute(dp, 3));
    const drops = new T.Points(dg, new T.PointsMaterial({ color: '#e8f7ff', size: .45, map: dotTex(), transparent: true, alphaTest: .3, depthWrite: false }));
    f.add(drops);
    W.updaters.push(t => {
      for (let i = 0; i < dropN; i++) { const d = dv[i], u = (t * .7 * d.s + d.o) % 1;
        dp[i * 3] = Math.cos(d.a) * u * 2.2; dp[i * 3 + 2] = Math.sin(d.a) * u * 2.2; dp[i * 3 + 1] = 2.4 + u * 4 * (1 - u) * 3.2 - u * 1.4; }
      dg.attributes.position.needsUpdate = true;
    });
    W.colliders.push({ x: zx - 4, z: zz - 4, r: 3.6 });
    // 樹木環繞
    for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2 + .2; tree(g, Math.cos(a) * 15 + rnd(-1, 1), Math.sin(a) * 15 + rnd(-1, 1), rnd(.9, 1.3), i % 3 === 0 ? 0 : (i % 3)); }
    // 花圃
    const cols = ['#ff9fb6', '#ffd166', '#c6a8ff', '#ffffff', '#ffb38a'];
    for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + .8;
      for (let i = 0; i < 14; i++) flower(g, Math.cos(a) * 8 + rnd(-1.6, 1.6), Math.sin(a) * 8 + rnd(-1.6, 1.6), cols[(k + i) % 5], rnd(.4, .8)); }
    // 長椅
    [[5, 4, .6], [-9, 5, -.4]].forEach(([x, z, r]) => { const b = G(g, x, 0, z); b.rotation.y = r;
      M(box(2.4, .2, .7), '#c99b77', { y: .7, parent: b, ol: .05 }); M(box(2.4, .7, .15), '#c99b77', { y: 1.1, z: -.35, parent: b, ol: .05 });
      [-1, 1].forEach(s => M(box(.15, .7, .6), '#5e6a8a', { x: s, y: .35, parent: b, ol: .03 })); });
    // 共融遊戲場（溜滑梯）
    const pg = G(g, 7, 0, -6); pg.rotation.y = -.6;
    M(box(2.4, 3, 2.4), '#ffd166', { y: 1.5, parent: pg });
    M(box(2.6, .3, 2.6), '#ff9fb6', { y: 3.1, parent: pg, ol: .05 });
    M(box(1.4, .2, 5), '#8fd1f0', { y: 1.6, z: 3.2, rx: .55, parent: pg, ol: .05 });
    // 路燈
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; streetLight(g, Math.cos(a) * 11, Math.sin(a) * 11); }
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
      const w = new T.Mesh(new T.CircleGeometry(r, 32), waterMaterial(i === 2 ? '#a8e6cf' : '#9fd0e8', i === 2 ? '#7fd3b4' : '#76b7d8'));
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
  function makeTurtle() {
    const t = G(null);
    t.scale.setScalar(1.5);
    M(sph(1.05, 2), '#fff3d6', { y: .9, s: [1, 1.15, .9], parent: t });                // 肚子
    const shell = M(sph(1.15, 1), '#7cc59a', { y: 1.0, z: -.35, s: [1.05, 1.15, .85], parent: t });
    // 殼紋
    for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; M(new T.CircleGeometry(.28, 6), '#5aa97b', { x: Math.cos(a) * .55, y: 1.2 + Math.sin(a) * .55, z: -1.32, ry: Math.PI, parent: t, ol: 0, cast: false }); }
    // 反光背心帶
    M(new T.TorusGeometry(1.0, .09, 6, 24), '#ffb84d', { y: .7, rx: Math.PI / 2, parent: t, ol: 0 });
    const head = G(t, 0, 2.25, .1); t.userData.head = head;
    M(sph(.75, 2), '#9bd6ad', { parent: head });
    [-1, 1].forEach(s => { M(sph(.16, 1), '#2c3554', { x: s * .28, y: .1, z: .62, parent: head, ol: 0 }); M(sph(.05, 0), '#ffffff', { x: s * .28 + .05, y: .16, z: .76, parent: head, ol: 0 }); M(sph(.12, 1), '#ffb3c1', { x: s * .48, y: -.15, z: .55, parent: head, ol: 0 }); });
    // 安全帽
    M(new T.SphereGeometry(.8, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), '#ffd166', { y: .18, parent: head, ol: .05 });
    M(cyl(.95, .95, .08, 24), '#ffd166', { y: .2, z: .12, parent: head, ol: .03 });
    M(box(.3, .2, .1), '#ffffff', { y: .55, z: .72, parent: head, ol: 0 });
    // 揮手手臂
    const arm = G(t, .95, 1.4, .1); t.userData.arm = arm;
    M(new T.CapsuleGeometry(.2, .8, 4, 8), '#9bd6ad', { y: .5, parent: arm, ol: .04 });
    M(new T.CapsuleGeometry(.2, .6, 4, 8), '#9bd6ad', { x: -.95, y: 1.3, rz: .5, parent: t, ol: .04 });
    return t;
  }

  /* =====================================================================
   * 大地處：梯田式山坡地＋步道＋涼亭＋瀑布＋山神爺爺＋監測站
   * ===================================================================== */
  function buildGEO() {
    const g = W.zones.geo = G(null, 0, 0, -58);
    const mt = G(null, 0, 0, -94);
    const layers = [[34, 7, '#b9dca0'], [27, 7, '#aed69a'], [20.5, 7, '#c3e3a8'], [14, 6.5, '#b4dba0'], [8, 5.5, '#cbe8b2']];
    let y = 0;
    layers.forEach(([r, h, c], i) => {
      M(facet(cyl(r - 2.8, r, h, 28 - i * 2)), c, { y: y + h / 2, parent: mt, ol: .16 });
      if (i < 4) { // 擋土牆
        const wall = new T.Mesh(new T.CylinderGeometry(r - 2.75, r - 2.75, .9, 28 - i * 2, 1, true, -.9, 1.8), toon('#d9d2c4', { side: T.DoubleSide }));
        wall.position.y = y + h + .2; wall.rotation.y = Math.PI; mt.add(wall);
      }
      y += h;
    });
    W.mtTop = y;
    W.colliders.push({ x: 0, z: -94, r: 34.5, mountain: true });
    // 山頂涼亭
    const pv = G(mt, 0, y, 0);
    [[-1.6, -1.6], [1.6, -1.6], [-1.6, 1.6], [1.6, 1.6]].forEach(([x, z]) => M(cyl(.18, .18, 3, 8), '#c9573f', { x, y: 1.5, z, parent: pv, ol: .04 }));
    M(new T.ConeGeometry(3.4, 1.8, 4), '#5c8fa8', { y: 3.9, ry: Math.PI / 4, parent: pv, ol: .08 });
    M(sph(.3, 1), '#ffd166', { y: 5, parent: pv, ol: .04 });
    // 樹林（山上）
    for (let i = 0; i < 26; i++) { const li = (Math.random() * 4) | 0, [r] = layers[li]; const a = rnd(-Math.PI, Math.PI);
      if (Math.abs(a - Math.PI / 2) < .35) continue;   // 正面留給步道
      const ly = layers.slice(0, li + 1).reduce((s, l) => s + l[1], 0);
      const rr = r - rnd(3.3, 5);
      const tr = tree(mt, Math.cos(a) * rr, Math.sin(a) * rr, rnd(.7, 1.1), 1 + (i % 2)); tr.position.y = ly - .1; }
    // 之字形步道（正面）
    for (let i = 0; i < 4; i++) { const ly = layers.slice(0, i + 1).reduce((s, l) => s + l[1], 0), r = layers[i][0] - 2.8 - .4;
      for (let k = 0; k < 6; k++) { const a = Math.PI / 2 + (k - 2.5) * .06 * (i % 2 ? -1 : 1);
        M(cyl(.45, .5, .2, 8), '#efe3cf', { x: Math.cos(a) * (r + 1.2 - k * .2), y: ly - (k * .9), z: Math.sin(a) * (r + 1.2 - k * .2), parent: mt, ol: 0, cast: false }); } }
    // 瀑布（溪源）
    const fall = new T.Mesh(new T.PlaneGeometry(3, 20, 1, 1), waterMaterial('#bfe9f7', '#8fd3ee'));
    fall.position.set(16, 10, 18); fall.rotation.y = .7; fall.rotation.x = -.15; mt.add(fall);
    // 山坡監測站（閃燈）
    [[-14, 7, 20], [12, 14, 14], [-6, 21, 12]].forEach(([x, yy, z], i) => {
      const s = G(mt, x, yy, z);
      M(cyl(.08, .1, 2.6, 6), '#5e6a8a', { y: 1.3, parent: s, ol: .03 });
      M(box(.6, .4, .3), '#ffffff', { y: 2, parent: s, ol: .03 });
      const led = M(sph(.18, 1), '#7cf0b0', { y: 2.7, parent: s, ol: 0, mat: new T.MeshBasicMaterial({ color: '#7cf0b0' }) });
      W.updaters.push(t => { led.visible = ((t * 1.5 + i * .3) % 1) < .5; });
    });
    // 山神爺爺（坐在雲上）
    const god = makeMountainGod();
    god.position.set(0, 15, -94 + 24.5);
    W.scene.add(god);
    W.updaters.push(t => {
      god.position.y = 15 + Math.sin(t * 1.1) * .45;
      god.rotation.y = Math.sin(t * .4) * .18;
      god.userData.staff.rotation.z = .15 + Math.sin(t * 1.3) * .08;
      const w = (t % 8) < 2.5; god.userData.hand.rotation.z = w ? 2.2 + Math.sin(t * 8) * .35 : .5;
      god.userData.cloud.children.forEach((c, i) => { c.position.y = Math.sin(t * 1.5 + i) * .12; });
    });
    // 兩側遠山
    [[-62, -122, 30, 16], [64, -120, 34, 20], [-118, -70, 28, 12], [122, -62, 30, 14], [-150, 10, 26, 10], [150, 20, 28, 11]].forEach(([x, z, r, h], i) =>
      M(facet(new T.SphereGeometry(1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2)), i % 2 ? '#b9d9a6' : '#a9d19a', { x, y: -.3, z, s: [r, h, r * .8], ol: .012 }));
  }
  function makeMountainGod() {
    const g = G(null); g.scale.setScalar(2.1);
    // 雲座
    const cloud = G(g, 0, 0, 0); g.userData.cloud = cloud;
    [[0, 0, 0, 1.6], [1.5, -.1, .3, 1.1], [-1.5, -.1, .2, 1.2], [.6, -.2, 1.2, .9], [-.8, -.2, 1.1, .9]].forEach(([x, y, z, r]) => M(sph(r, 2), '#ffffff', { x, y, z, parent: cloud, ol: .08 }));
    // 長袍身體
    M(cyl(.9, 1.6, 2.6, 20), '#d8cdf5', { y: 1.9, parent: g });
    M(new T.TorusGeometry(1.15, .16, 8, 24), '#c9984a', { y: 1.5, rx: Math.PI / 2, parent: g, ol: .03 });
    // 頭
    const head = G(g, 0, 3.75, 0);
    M(sph(.95, 2), '#ffe2cc', { parent: head });
    // 慈祥眉眼（彎彎閉眼）
    [-1, 1].forEach(s => {
      M(new T.TorusGeometry(.15, .04, 6, 12, Math.PI), '#2c3554', { x: s * .34, y: .05, z: .86, parent: head, ol: 0 });
      M(new T.CapsuleGeometry(.09, .32, 4, 8), '#ffffff', { x: s * .38, y: .32, z: .8, rz: s * 1.2, parent: head, ol: .02 });
      M(sph(.14, 1), '#ffb3c1', { x: s * .55, y: -.18, z: .72, parent: head, ol: 0 });
    });
    // 白鬍子
    M(new T.ConeGeometry(.75, 1.9, 16), '#ffffff', { y: -.95, z: .45, rx: Math.PI + .25, parent: head, ol: .05 });
    M(sph(.5, 1), '#ffffff', { y: -.35, z: .7, s: [1.4, .7, .8], parent: head, ol: .04 });
    // 頭巾帽
    M(new T.SphereGeometry(1.0, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2.4), '#8fbf7a', { y: .12, parent: head, ol: .05 });
    M(sph(.22, 1), '#ffd166', { y: 1.05, parent: head, ol: .03 });
    // 木杖＋葉子
    const staff = G(g, 1.6, 1.2, .4); g.userData.staff = staff;
    M(cyl(.09, .11, 4.6, 8), '#a8794f', { y: 1.6, parent: staff, ol: .03 });
    M(sph(.4, 1), '#8fd18a', { y: 4, s: [1.2, .8, 1], parent: staff, ol: .04 });
    M(sph(.28, 1), '#ffb84d', { x: .3, y: 3.5, parent: staff, ol: .03 });          // 葫蘆
    // 右手
    M(new T.CapsuleGeometry(.2, .9, 4, 8), '#efe6ff', { x: 1.15, y: 2.4, rz: -.8, parent: g, ol: .03 });
    // 揮手
    const hand = G(g, -1.0, 2.6, .1); g.userData.hand = hand;
    M(new T.CapsuleGeometry(.2, .9, 4, 8), '#efe6ff', { y: .55, parent: hand, ol: .03 });
    M(sph(.22, 1), '#ffe2cc', { y: 1.15, parent: hand, ol: .03 });
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
      if (Math.hypot(x, z + 94) < 40) continue;
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
      if (window.ZONES.some(({ pos: [zx, zz] }) => Math.hypot(x - zx, z - zz) < 22)) continue;
      if (nearRiver(x, z) < RIVER_W / 2 + 4) continue;
      if (Math.hypot(x, z + 94) < 36) continue;
      if (Math.abs(x + 42) < 7 && z > 30) continue;
      if (W.colliders.some(c => Math.hypot(x - c.x, z - c.z) < c.r + 2)) continue;
      pts.push([x, z, rnd(.8, 1.5)]);
    }
    const trunkG = cyl(.25, .38, 3, 6), crownG = sph(1.9, 1);
    const tr = new T.InstancedMesh(trunkG, toon('#b08a6e'), pts.length);
    const cr = new T.InstancedMesh(crownG, W.leafMats[1], pts.length);
    const cr2 = new T.InstancedMesh(crownG, W.leafMats[2], pts.length);
    const ol = new T.InstancedMesh(crownG, outlineMat, pts.length * 2);
    const m = new T.Matrix4(), q = new T.Quaternion();
    pts.forEach(([x, z, s], i) => {
      m.compose(new V3(x, 1.5 * s, z), q, new V3(s, s, s)); tr.setMatrixAt(i, m);
      m.compose(new V3(x, 4.2 * s, z), q, new V3(s, s * .95, s)); cr.setMatrixAt(i, m);
      m.compose(new V3(x, 4.2 * s, z), q, new V3(s * 1.06, s * 1.01, s * 1.06)); ol.setMatrixAt(i * 2, m);
      m.compose(new V3(x + .9 * s, 3.4 * s, z + .5 * s), q, new V3(s * .65, s * .6, s * .65)); cr2.setMatrixAt(i, m);
      m.compose(new V3(x + .9 * s, 3.4 * s, z + .5 * s), q, new V3(s * .72, s * .66, s * .72)); ol.setMatrixAt(i * 2 + 1, m);
    });
    [tr, cr, cr2].forEach(o => { o.castShadow = true; o.receiveShadow = true; W.scene.add(o); });
    W.scene.add(ol); outlineList.push(ol);
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
    const mat = new T.MeshBasicMaterial({ visible: false });
    window.ZONES.forEach(z => {
      const [x, zz] = z.pos;
      const h = new T.Mesh(new T.SphereGeometry(z.id === 'geo' ? 22 : 15, 12, 8), mat);
      h.position.set(x, z.id === 'geo' ? 10 : 5, z.id === 'geo' ? zz - 22 : zz);
      if (z.id === 'hub') h.position.set(-4, 7, -6);
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
    if (id === 'hub') { tgt = new V3(-6, 10, -6); dist = 80; az = .22; el = .2; }
    else if (id === 'geo') { tgt = new V3(0, 16, -84); dist = 74; az = 0; el = .14; }
    else {
      tgt = new V3(x, 4, zz); dist = 46; el = .27;
      az = Math.atan2(-x, -zz);               // 相機在局本部側往外看（背景是台北全景）
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
      cam.pos.lerpVectors(cam.fp.from, cam.fp.to, e); cam.pos.y = 2.4 + Math.sin(e * Math.PI) * 18;
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
      cam.pos.y = 2.4 + Math.sin(cam.bob) * .08 * Math.min(1, speed / 8) + bridgeLift(cam.pos);
    }
    W.camera.position.copy(cam.pos);
    const look = new V3(-Math.sin(cam.yaw) * Math.cos(cam.pitch), Math.sin(cam.pitch), -Math.cos(cam.yaw) * Math.cos(cam.pitch));
    W.camera.lookAt(cam.pos.clone().add(look));
    // 接近提示
    let near = null, nd = 1e9;
    window.ZONES.forEach(z => { const [x, zz] = z.pos; const d = Math.hypot(cam.pos.x - x, cam.pos.z - (z.id === 'geo' ? zz : zz)); const lim = z.id === 'hub' ? 26 : 17; if (d < lim && d < nd) { nd = d; near = z.id; } });
    if (near !== W._near) { W._near = near; W.listeners.proximity.forEach(f => f(near)); }
  }
  function bridgeLift(p) { const d = Math.hypot(p.x + 42, p.z - 62); return d < 8 ? 1.6 * (1 - d / 8) : 0; }
  function resolveCollision(p) {
    const r0 = Math.hypot(p.x, p.z); if (r0 > 104) { p.x *= 104 / r0; p.z *= 104 / r0; }
    for (const c of W.colliders) {
      const dx = p.x - c.x, dz = p.z - c.z, d = Math.hypot(dx, dz), rr = c.r + 1;
      if (d < rr && d > .001) { p.x = c.x + dx / d * rr; p.z = c.z + dz / d * rr; }
    }
    // 河流：只能從橋上通過
    const onBridge = Math.hypot(p.x + 42, p.z - 62) < 9 && Math.abs(p.x + 42) < 4.5;
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
    } else if (cam.auto || performance.now() - cam.lastInteract > 12000) {
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
      const y = z.id === 'hub' ? 22 : z.id === 'geo' ? 40 : 11;
      tmp.set(x, y, z.id === 'geo' ? -86 : zz).project(W.camera);
      const dist = W.camera.position.distanceTo(new V3(x, y, zz));
      out.push({ id: z.id, x: (tmp.x + 1) / 2 * w, y: (1 - tmp.y) / 2 * h, visible: tmp.z < 1 && tmp.z > -1, dist });
    });
    return out;
  }

  window.World = {
    init, flyTo, setMode, setSeason, setQuality, projectZones, overviewHome,
    setViewShift: v => { viewShiftGoal = v; },
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
