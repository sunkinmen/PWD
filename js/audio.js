/* =====================================================================
 * audio.js ── 環境音景（全部即時合成，不需音檔）＋ NPC 語音
 *  ● 流水：靠近河邊變大聲
 *  ● 風吹樹葉、各種鳥鳴（三種叫聲、左右聲道隨機）
 *  ● 蟲鳴：蟋蟀（全年）＋夏秋蟬聲，靠近山區、公園較明顯
 *  ● 孩童嬉戲聲：靠近公園遊戲場與市府廣場時出現
 *  ● NPC 語音：優先播放 content.js 指定的 mp3（如 ElevenLabs），否則用瀏覽器內建「中文（台灣）」語音
 * ===================================================================== */
(function () {
  let ac = null, master = null, on = false, timers = [], lv = { water: .3, birds: .6, insects: .4, kids: 0 };
  const gains = {};
  const rnd = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function ctx() { if (!ac) { ac = new (window.AudioContext || window.webkitAudioContext)(); master = ac.createGain(); master.gain.value = .9; master.connect(ac.destination); } if (ac.state === 'suspended') ac.resume(); return ac; }
  function noiseBuf(type) {
    const len = ac.sampleRate * 4, b = ac.createBuffer(1, len, ac.sampleRate), d = b.getChannelData(0);
    let last = 0, b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1;
      if (type === 'brown') { last = (last + .02 * w) / 1.02; d[i] = last * 3.2; }
      else if (type === 'pink') { b0 = .997 * b0 + w * .029; b1 = .985 * b1 + w * .032; b2 = .95 * b2 + w * .048; d[i] = (b0 + b1 + b2 + w * .02) * .5; }
      else d[i] = w * .5; }
    return b;
  }
  function loop(type, filterType, freq, q, gainKey) {
    const s = ac.createBufferSource(); s.buffer = noiseBuf(type); s.loop = true;
    const f = ac.createBiquadFilter(); f.type = filterType; f.frequency.value = freq; f.Q.value = q;
    const g = ac.createGain(); g.gain.value = 0; s.connect(f).connect(g).connect(master); s.start();
    gains[gainKey] = g; return { s, f, g };
  }
  function pan(node, p) { if (!ac.createStereoPanner) return node; const sp = ac.createStereoPanner(); sp.pan.value = p; node.connect(sp); return sp; }
  function every(fn, min, max) { let id; const tick = () => { if (on) fn(); id = setTimeout(tick, rnd(min, max)); timers.push(id); }; id = setTimeout(tick, rnd(min, max)); timers.push(id); }

  /* ---------- 鳥鳴 ---------- */
  function bird() {
    if (Math.random() > lv.birds) return;
    const t = ac.currentTime, g = ac.createGain(), o = ac.createOscillator(); o.type = 'sine';
    pan(g, rnd(-.8, .8)).connect(master);
    const vol = .025 * lv.birds, kind = Math.random();
    if (kind < .35) {            // 兩音口哨
      const f = rnd(2600, 3400); o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 1.25, t + .12);
      o.frequency.setValueAtTime(f * .9, t + .2); o.frequency.exponentialRampToValueAtTime(f * .8, t + .34);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .03); g.gain.linearRampToValueAtTime(0, t + .14); g.gain.linearRampToValueAtTime(vol, t + .22); g.gain.linearRampToValueAtTime(0, t + .36);
      o.connect(g); o.start(t); o.stop(t + .4);
    } else if (kind < .7) {      // 顫音
      const f = rnd(3600, 4600), n = 6 + (Math.random() * 6 | 0);
      o.frequency.value = f; const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = 40; lg.gain.value = 300; lfo.connect(lg).connect(o.frequency); lfo.start(t); lfo.stop(t + n * .07 + .1);
      g.gain.setValueAtTime(0, t); for (let i = 0; i < n; i++) { g.gain.linearRampToValueAtTime(vol * .8, t + i * .07 + .02); g.gain.linearRampToValueAtTime(0, t + i * .07 + .06); }
      o.connect(g); o.start(t); o.stop(t + n * .07 + .1);
    } else {                     // 婉轉長鳴
      const f = rnd(2200, 3000); o.frequency.setValueAtTime(f, t);
      o.frequency.linearRampToValueAtTime(f * 1.5, t + .25); o.frequency.linearRampToValueAtTime(f * 1.1, t + .45); o.frequency.linearRampToValueAtTime(f * 1.4, t + .6);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .05); g.gain.setValueAtTime(vol, t + .5); g.gain.linearRampToValueAtTime(0, t + .65);
      o.connect(g); o.start(t); o.stop(t + .7);
    }
  }
  /* ---------- 蟋蟀 ---------- */
  function cricket() {
    if (Math.random() > lv.insects) return;
    const t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = rnd(4300, 4900);
    pan(g, rnd(-.9, .9)).connect(master); const vol = .012 * lv.insects;
    g.gain.setValueAtTime(0, t);
    for (let k = 0; k < 3; k++) for (let i = 0; i < 4; i++) { const s = t + k * .32 + i * .035; g.gain.setValueAtTime(vol, s); g.gain.setValueAtTime(0, s + .02); }
    o.connect(g); o.start(t); o.stop(t + 1.1);
  }
  /* ---------- 孩童嬉戲（合成笑聲＋歡呼） ---------- */
  function kids() {
    if (lv.kids < .05 || Math.random() > lv.kids + .1) return;
    const t0 = ac.currentTime, out = ac.createGain(); out.gain.value = .07 * lv.kids; pan(out, rnd(-.6, .6)).connect(master);
    const f1 = ac.createBiquadFilter(), f2 = ac.createBiquadFilter(); f1.type = f2.type = 'bandpass'; f1.frequency.value = rnd(850, 1000); f2.frequency.value = rnd(1500, 1900); f1.Q.value = f2.Q.value = 4;
    f1.connect(out); f2.connect(out);
    if (Math.random() < .7) {   // 哈哈哈
      const n = 4 + (Math.random() * 4 | 0), base = rnd(380, 520);
      for (let i = 0; i < n; i++) {
        const t = t0 + i * rnd(.13, .16), o = ac.createOscillator(), g = ac.createGain(); o.type = 'sawtooth';
        o.frequency.setValueAtTime(base * (1.05 - i * .03), t); o.frequency.linearRampToValueAtTime(base * (.95 - i * .03), t + .09);
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(1, t + .015); g.gain.exponentialRampToValueAtTime(.01, t + .1);
        o.connect(g); g.connect(f1); g.connect(f2); o.start(t); o.stop(t + .12);
      }
    } else {                    // 「哇～」歡呼
      const o = ac.createOscillator(), g = ac.createGain(); o.type = 'triangle';
      o.frequency.setValueAtTime(rnd(500, 650), t0); o.frequency.linearRampToValueAtTime(rnd(900, 1100), t0 + .25); o.frequency.linearRampToValueAtTime(700, t0 + .55);
      g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(.8, t0 + .06); g.gain.linearRampToValueAtTime(0, t0 + .6);
      o.connect(g); g.connect(f1); g.connect(f2); o.start(t0); o.stop(t0 + .65);
    }
  }

  /* ---------- 魚躍水花聲（依距離衰減） ---------- */
  function splash(p) {
    if (!on || !World.listenerPos) return;
    const l = World.listenerPos(), d = Math.hypot(l.x - p.x, l.z - p.z), vol = clamp(1 - d / 70, 0, 1) * .35;
    if (vol < .01) return;
    const t = ac.currentTime, s = ac.createBufferSource(); s.buffer = noiseBuf('white');
    const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.setValueAtTime(2600, t); f.frequency.exponentialRampToValueAtTime(700, t + .3); f.Q.value = 1.2;
    const g = ac.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + .35);
    s.connect(f).connect(g); pan(g, clamp((p.x - l.x) / 40, -1, 1)).connect(master); s.start(t); s.stop(t + .4);
    const o = ac.createOscillator(), og = ac.createGain(); o.frequency.setValueAtTime(520, t); o.frequency.exponentialRampToValueAtTime(140, t + .12);
    og.gain.setValueAtTime(vol * .6, t); og.gain.exponentialRampToValueAtTime(.001, t + .14); o.connect(og).connect(master); o.start(t); o.stop(t + .15);
  }
  let splashBound = false;

  /* ---------- 依位置調整音量 ---------- */
  function updateLevels() {
    if (!on || !window.World || !World.listenerPos) return;
    const p = World.listenerPos(), Z = id => window.ZONES.find(z => z.id === id).pos;
    const dist = (a) => Math.hypot(p.x - a[0], p.z - a[1]);
    const river = World.riverDistance(p.x, p.z);
    const pg = World.playgroundPos || { x: Z('pkl')[0], z: Z('pkl')[1] }, park = dist([pg.x, pg.z]), hub = dist([0, 17]), mt = dist([0, -90]);
    const fp = World.fallPos; lv.fall = fp ? clamp(1 - dist([fp.x, fp.z]) / 30, 0, 1) : 0;
    const season = World.season;
    lv.water = clamp(1 - (river - 6) / 45, .06, 1);
    lv.birds = clamp(.45 + (1 - park / 50) * .4 + (1 - mt / 60) * .3, .3, 1) * (season === 'winter' ? .5 : 1);
    lv.insects = clamp(.3 + (1 - mt / 55) * .5 + (1 - park / 45) * .3, .2, 1) * (season === 'winter' ? .15 : 1);
    lv.kids = clamp((1 - park / 40) * .9, 0, 1) + clamp((1 - hub / 30) * .45, 0, .45);
    const t = ac.currentTime, set = (k, v) => gains[k] && gains[k].gain.setTargetAtTime(v, t, .6);
    set('water', .32 * lv.water + .25 * lv.fall);
    const rp = World.rollerPos; set('engine', rp ? .3 * clamp(1 - dist([rp.x, rp.z]) / 28, 0, 1) ** 1.5 : 0);
    set('wind', .05 + .03 * Math.sin(t * .2));
    set('cicada', (season === 'summer' ? .03 : season === 'autumn' ? .015 : 0) * lv.insects);
  }

  function start() {
    ctx(); if (on) return; on = true;
    if (!splashBound && window.World && World.on) { World.on('splash', splash); splashBound = true; }
    loop('brown', 'lowpass', 800, .7, 'water');
    const wind = loop('pink', 'bandpass', 1300, .6, 'wind');
    // 蟬聲：帶通白噪音＋振幅調變
    const cs = ac.createBufferSource(); cs.buffer = noiseBuf('white'); cs.loop = true;
    const cf = ac.createBiquadFilter(); cf.type = 'bandpass'; cf.frequency.value = 5200; cf.Q.value = 4;
    const amNode = ac.createGain(); amNode.gain.value = .5; const am = ac.createOscillator(), amg = ac.createGain(); am.frequency.value = 55; amg.gain.value = .5; am.connect(amg).connect(amNode.gain); am.start();
    const cg = ac.createGain(); cg.gain.value = 0; cs.connect(cf).connect(amNode).connect(cg).connect(master); cs.start(); gains.cicada = cg;
    // 壓路機柴油引擎聲＋振動輪低頻（靠近新工處施工區才聽得到）
    const eng = ac.createGain(); eng.gain.value = 0; eng.connect(master); gains.engine = eng;
    const lp2 = ac.createBiquadFilter(); lp2.type = 'lowpass'; lp2.frequency.value = 420; const am2 = ac.createGain(); am2.gain.value = .65; lp2.connect(am2).connect(eng);
    [[38, 'sawtooth', .5], [76, 'square', .18], [29, 'sine', .6]].forEach(([f, type, v]) => { const o = ac.createOscillator(), og = ac.createGain(); o.type = type; o.frequency.value = f; og.gain.value = v; o.connect(og).connect(lp2); o.start(); });
    const rum = ac.createBufferSource(); rum.buffer = noiseBuf('brown'); rum.loop = true; const rg = ac.createGain(); rg.gain.value = .9; rum.connect(rg).connect(lp2); rum.start();
    const putt = ac.createOscillator(), pg = ac.createGain(); putt.frequency.value = 11; pg.gain.value = .35; putt.connect(pg).connect(am2.gain); putt.start();
    every(bird, 700, 2600); every(bird, 1500, 4200);
    every(cricket, 900, 2200);
    every(kids, 1800, 4500);
    timers.push(setInterval(updateLevels, 400)); updateLevels();
  }
  function stop() { on = false; timers.forEach(clearTimeout); timers.forEach(clearInterval); timers = []; Object.values(gains).forEach(g => g.gain.setTargetAtTime(0, ac.currentTime, .2)); setTimeout(() => { if (!on && ac) { ac.close(); ac = null; } }, 600); }
  function blip(f = 600) { if (!ac || !on) return; const o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = f;
    g.gain.setValueAtTime(.05, ac.currentTime); g.gain.exponentialRampToValueAtTime(.0001, ac.currentTime + .12); o.connect(g).connect(master); o.start(); o.stop(ac.currentTime + .13); }


  /* ---------- 轉場音效（每個世界一段專屬三音和弦）／蓋章／慶祝 ---------- */
  const STING = { hub: [523, 659, 784], nco: [440, 554, 659], heo: [392, 494, 587], pkl: [587, 740, 880], sso: [349, 440, 523], geo: [330, 415, 494] };
  function note(f, t0, dur, type = 'triangle', vol = .06) {
    const o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + .02); g.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
    o.connect(g).connect(master); o.start(t0); o.stop(t0 + dur + .05);
  }
  function stinger(id) { if (!ac || !on) return; const t = ac.currentTime + .02; (STING[id] || STING.hub).forEach((f, i) => { note(f, t + i * .085, .5); note(f * 2, t + i * .085, .25, 'sine', .02); });
    // 輕柔「咻」：濾波白噪音掃頻
    const b = ac.createBuffer(1, ac.sampleRate * .6, ac.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(); s.buffer = b; f.type = 'bandpass'; f.Q.value = 2;
    f.frequency.setValueAtTime(400, t); f.frequency.exponentialRampToValueAtTime(3200, t + .5); g.gain.value = .05; s.connect(f).connect(g).connect(master); s.start(t); }
  function stamp() { if (!ac || !on) return; const t = ac.currentTime; note(140, t, .18, 'sine', .25); note(90, t, .25, 'sine', .2); note(1320, t + .12, .3, 'triangle', .03); }
  function fanfare() { if (!ac || !on) return; const t = ac.currentTime + .05;
    [[523, 0], [659, .14], [784, .28], [1047, .42], [784, .62], [1047, .76]].forEach(([f, d]) => { note(f, t + d, .45, 'triangle', .07); note(f / 2, t + d, .45, 'sine', .04); }); }


  /* ---------- 101 電梯／煙火音效 ---------- */
  let lift = null;
  function elevator(onOff) {
    if (!ac || !on) return;
    if (onOff && !lift) { const o = ac.createOscillator(), o2 = ac.createOscillator(), g = ac.createGain(), f = ac.createBiquadFilter();
      o.type = 'sawtooth'; o.frequency.value = 55; o2.type = 'sine'; o2.frequency.value = 110; f.type = 'lowpass'; f.frequency.value = 260;
      g.gain.value = 0; o.connect(f); o2.connect(f); f.connect(g).connect(master); o.start(); o2.start(); g.gain.setTargetAtTime(.05, ac.currentTime, .6);
      lift = { o, o2, g, f, t0: ac.currentTime }; }
    if (!onOff && lift) { const l = lift; lift = null; l.g.gain.setTargetAtTime(0, ac.currentTime, .3); setTimeout(() => { l.o.stop(); l.o2.stop(); }, 1200); }
  }
  function liftPitch(u) { if (lift) { lift.o.frequency.setTargetAtTime(55 + u * 30, ac.currentTime, .2); lift.f.frequency.setTargetAtTime(260 + u * 300, ac.currentTime, .2); } }
  function ding() { if (!ac || !on) return; const t = ac.currentTime; note(1318, t, 1.2, 'sine', .08); note(1046, t + .28, 1.4, 'sine', .08); }
  function noiseBurst(dur, freq, vol, t0) {
    const b = ac.createBuffer(1, ac.sampleRate * dur, ac.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2.5);
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(); s.buffer = b; f.type = 'lowpass'; f.frequency.value = freq; g.gain.value = vol;
    s.connect(f).connect(g).connect(master); s.start(t0);
  }
  function boom(dist = 60) { if (!ac || !on) return; const t = ac.currentTime + Math.min(.6, dist / 340), v = Math.min(.5, 18 / Math.max(10, dist));
    noiseBurst(1.4, 420, v, t); noiseBurst(.25, 3000, v * .5, t);
    for (let k = 0; k < 6; k++) noiseBurst(.06, 5000, v * .25, t + .35 + Math.random() * .7); }       // 劈啪聲
  function whistle() { if (!ac || !on) return; const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime; o.type = 'sine';
    o.frequency.setValueAtTime(900, t); o.frequency.exponentialRampToValueAtTime(2200, t + 1.1); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.025, t + .1); g.gain.exponentialRampToValueAtTime(.0001, t + 1.2);
    o.connect(g).connect(master); o.start(t); o.stop(t + 1.25); }

  /* ---------- NPC 語音 ---------- */
  let voices = [], voiceOn = true, current = null;
  const loadVoices = () => { voices = ('speechSynthesis' in window) ? speechSynthesis.getVoices() : []; };
  if ('speechSynthesis' in window) { loadVoices(); speechSynthesis.onvoiceschanged = loadVoices; }
  const FEMALE = /hsiaochen|hsiaoyu|yating|hanhan|mei-?jia|female|女/i, MALE = /zhiwei|yunjhe|male|男/i;
  function pickVoice(prefer) {
    const tw = voices.filter(v => /zh[-_]TW|Taiwan|臺灣|台灣/i.test(v.lang + ' ' + v.name));
    const pool = tw.length ? tw : voices.filter(v => /^zh|^cmn/i.test(v.lang));
    if (!pool.length) return null;
    const score = v => (/natural|online|neural/i.test(v.name) ? 4 : 0) + (prefer === 'female' && FEMALE.test(v.name) ? 3 : 0) + (prefer === 'male' && MALE.test(v.name) ? 3 : 0) + (/google/i.test(v.name) ? 1 : 0);
    return pool.slice().sort((a, b) => score(b) - score(a))[0];
  }
  function say(line, cfg = {}) {
    stopVoice(); if (!voiceOn) return;
    const text = typeof line === 'string' ? line : line.text, audio = typeof line === 'object' && line.audio;
    const file = audio || (cfg.key && window.SITE && SITE.voiceFiles ? `assets/voice/${cfg.key}.mp3` : null);
    if (file) { const a = current = new Audio(file); a.onerror = () => tts(text, cfg); a.play().catch(() => tts(text, cfg)); return; }
    tts(text, cfg);
  }
  function tts(text, cfg) {
    if (!('speechSynthesis' in window) || !voiceOn) return;
    const en = cfg.lang === 'en';
    const u = new SpeechSynthesisUtterance(text); u.lang = en ? 'en-US' : 'zh-TW';
    const v = en ? (voices.filter(x => /^en/i.test(x.lang)).sort((a, b) => (/natural|online/i.test(b.name) ? 1 : 0) - (/natural|online/i.test(a.name) ? 1 : 0))[0] || null) : pickVoice(cfg.prefer); if (v) u.voice = v;
    // 同一個聲音用音高區分男女
    const sameVoice = v && !(cfg.prefer === 'female' ? FEMALE : MALE).test(v.name);
    u.pitch = clamp((cfg.pitch || 1) * (sameVoice ? (cfg.prefer === 'male' ? .82 : 1.12) : 1), .1, 2);
    u.rate = cfg.rate || 1; u.volume = 1;
    if (gains.water) gains.water.gain.setTargetAtTime(.08 * lv.water, ac.currentTime, .3);   // 說話時壓低水聲
    speechSynthesis.speak(u);
  }
  function stopVoice() { if (current) { current.pause(); current = null; } if ('speechSynthesis' in window) speechSynthesis.cancel(); }

  window.Sound = { start, stop, blip, stinger, stamp, fanfare, elevator, liftPitch, ding, boom, whistle, say, stopVoice, get on() { return on; }, setVoice: v => { voiceOn = v; if (!v) stopVoice(); }, get voiceOn() { return voiceOn; } };
})();
