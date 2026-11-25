'use strict';
// 소리: 모두 WebAudio로 합성. 원소별 효과음(목탁·불길·북·징·물방울), 연계음(5음계), 가야금풍 절차 생성 음악.
(function () {
  const A = UI.audio = { ctx: null, ready: false, music: null, mood: null };
  const S = () => JG.Meta.data.settings;
  // 평조 5음 (황·태·중·임·남) 근사: C D F G A
  const PENTA = [0, 2, 5, 7, 9];
  const midiHz = (m) => 440 * Math.pow(2, (m - 69) / 12);

  A.init = function () {
    if (A.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    A.ctx = new AC();
    const c = A.ctx;
    A.master = c.createGain();
    A.comp = c.createDynamicsCompressor();
    A.comp.threshold.value = -14; A.comp.ratio.value = 4;
    A.master.connect(A.comp); A.comp.connect(c.destination);
    A.sfxBus = c.createGain(); A.sfxBus.connect(A.master);
    A.musBus = c.createGain(); A.musBus.connect(A.master);
    // 공간감: 짧은 잔향
    A.verb = c.createConvolver();
    A.verb.buffer = A.impulse(2.2, 2.6);
    A.verbGain = c.createGain(); A.verbGain.gain.value = 0.22;
    A.verb.connect(A.verbGain); A.verbGain.connect(A.master);
    A.noiseBuf = A.makeNoise(2);
    A.applyVolumes();
    A.ready = true;
  };
  A.applyVolumes = function () {
    if (!A.ctx) return;
    const s = S();
    A.master.gain.value = s.master;
    A.sfxBus.gain.value = s.sfx;
    A.musBus.gain.value = s.music * 0.55;
  };
  A.unlock = function () {
    A.init();
    if (A.ctx && A.ctx.state === 'suspended') A.ctx.resume();
    if (A.pendingMood) { const m = A.pendingMood; A.pendingMood = null; A.setMood(m); }
  };
  ['pointerdown', 'keydown'].forEach((ev) => window.addEventListener(ev, A.unlock, { capture: true }));

  A.impulse = function (sec, decay) {
    const c = A.ctx, len = Math.floor(c.sampleRate * sec);
    const buf = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  };
  A.makeNoise = function (sec) {
    const c = A.ctx, len = Math.floor(c.sampleRate * sec);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  };
  // 가야금풍 뜯는 소리 (Karplus-Strong 미리 계산)
  const ksCache = {};
  A.pluckBuf = function (midi, bright) {
    const key = midi + ':' + (bright || 0);
    if (ksCache[key]) return ksCache[key];
    const c = A.ctx, sr = c.sampleRate;
    const f = midiHz(midi);
    const N = Math.max(2, Math.round(sr / f));
    const len = Math.floor(sr * 2.4);
    const buf = c.createBuffer(1, len, sr);
    const d = buf.getChannelData(0);
    const ring = new Float32Array(N);
    for (let i = 0; i < N; i++) ring[i] = (Math.random() * 2 - 1) * (i < N / 2 ? 1 : 0.6);
    let idx = 0, prev = 0;
    const damp = 0.4968 + (bright || 0) * 0.002;
    for (let i = 0; i < len; i++) {
      const cur = ring[idx];
      const nxt = ring[(idx + 1) % N];
      const v = damp * (cur + nxt);
      ring[idx] = v * 0.996 + prev * 0.004;
      prev = v;
      d[i] = cur;
      idx = (idx + 1) % N;
    }
    ksCache[key] = buf;
    return buf;
  };

  // ── 기본 소리 조각 ──
  function env(g, t, a, peak, dec, sus) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, sus || 0.0001), t + a + dec);
  }
  function out(node, wet) {
    node.connect(A.sfxBus);
    if (wet) { const w = A.ctx.createGain(); w.gain.value = wet; node.connect(w); w.connect(A.verb); }
  }
  A.tone = function (o) {
    const c = A.ctx, t = c.currentTime + (o.at || 0);
    const osc = c.createOscillator();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(o.f, t);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(o.f2, t + (o.slide || o.dur || 0.2));
    const g = c.createGain();
    env(g, t, o.a || 0.005, o.vol || 0.3, o.dur || 0.2);
    osc.connect(g);
    let last = g;
    if (o.lp) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lp; g.connect(f); last = f; }
    out(last, o.wet);
    osc.start(t); osc.stop(t + (o.a || 0.005) + (o.dur || 0.2) + 0.05);
  };
  A.noise = function (o) {
    const c = A.ctx, t = c.currentTime + (o.at || 0);
    const src = c.createBufferSource();
    src.buffer = A.noiseBuf;
    const f = c.createBiquadFilter();
    f.type = o.ft || 'bandpass';
    f.frequency.setValueAtTime(o.f || 1000, t);
    if (o.f2) f.frequency.exponentialRampToValueAtTime(o.f2, t + (o.dur || 0.2));
    f.Q.value = o.q || 1;
    const g = c.createGain();
    env(g, t, o.a || 0.005, o.vol || 0.3, o.dur || 0.2);
    src.connect(f); f.connect(g);
    out(g, o.wet);
    src.start(t, Math.random()); src.stop(t + (o.a || 0.005) + (o.dur || 0.2) + 0.05);
  };
  A.pluck = function (midi, o) {
    o = o || {};
    const c = A.ctx, t = c.currentTime + (o.at || 0);
    const src = c.createBufferSource();
    src.buffer = A.pluckBuf(midi, o.bright);
    const g = c.createGain();
    g.gain.setValueAtTime(o.vol || 0.35, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + (o.dur || 2.2));
    // 농현(떨림)
    if (o.vib) {
      const lfo = c.createOscillator(); const lg = c.createGain();
      lfo.frequency.value = 5.5; lg.gain.value = o.vib;
      lfo.connect(lg); lg.connect(src.playbackRate);
      lfo.start(t + 0.25); lfo.stop(t + (o.dur || 2.2));
    }
    if (o.bend) { src.playbackRate.setValueAtTime(1 / Math.pow(2, o.bend / 12), t); src.playbackRate.linearRampToValueAtTime(1, t + 0.12); }
    src.connect(g);
    g.connect(o.bus || A.sfxBus);
    const w = c.createGain(); w.gain.value = o.wet === undefined ? 0.5 : o.wet; g.connect(w); w.connect(A.verb);
    src.start(t); src.stop(t + (o.dur || 2.2));
  };
  A.bell = function (f, o) {
    o = o || {};
    const ratios = [1, 2.76, 5.4, 8.93];
    ratios.forEach((r, i) => A.tone({ f: f * r, type: 'sine', vol: (o.vol || 0.18) / (i + 1), dur: (o.dur || 1.6) / (1 + i * 0.6), at: o.at, wet: 0.6 }));
  };
  A.drum = function (f, o) {
    o = o || {};
    A.tone({ f: f * 1.8, f2: f, slide: 0.08, type: 'sine', vol: o.vol || 0.6, dur: o.dur || 0.35, at: o.at, wet: 0.15 });
    A.noise({ f: 500, ft: 'lowpass', vol: (o.vol || 0.6) * 0.35, dur: 0.06, at: o.at });
  };

  // ── 효과음 표 ──
  const SFX = {
    click() { A.tone({ f: 1400, f2: 900, type: 'triangle', vol: 0.08, dur: 0.05 }); },
    hover() { A.tone({ f: 2200, type: 'sine', vol: 0.025, dur: 0.03 }); },
    card() { A.noise({ f: 2500, f2: 900, q: 0.8, vol: 0.22, dur: 0.16 }); },
    draw() { A.noise({ f: 3200, f2: 1800, q: 1.2, vol: 0.07, dur: 0.07 }); },
    shuffle() { for (let i = 0; i < 6; i++) A.noise({ f: 2800, f2: 1500, q: 1, vol: 0.06, dur: 0.05, at: i * 0.05 }); },
    wood() { A.tone({ f: 820, f2: 760, type: 'sine', vol: 0.4, dur: 0.12, wet: 0.2 }); A.tone({ f: 1650, type: 'triangle', vol: 0.08, dur: 0.05 }); },
    fire() { A.noise({ f: 600, f2: 2400, q: 0.7, vol: 0.28, dur: 0.3, a: 0.04 }); for (let i = 0; i < 5; i++) A.noise({ f: 3000 + Math.random() * 3000, q: 4, vol: 0.06, dur: 0.02, at: 0.05 + Math.random() * 0.3 }); },
    earth() { A.drum(70, { vol: 0.7, dur: 0.45 }); },
    metal() { A.bell(620, { vol: 0.16, dur: 1.1 }); },
    water() { A.tone({ f: 500, f2: 1300, slide: 0.08, type: 'sine', vol: 0.3, dur: 0.12 }); A.tone({ f: 900, f2: 1700, slide: 0.06, type: 'sine', vol: 0.12, dur: 0.1, at: 0.07 }); },
    wild() { [0, 2, 5, 7, 9].forEach((s, i) => A.tone({ f: midiHz(72 + s), type: 'sine', vol: 0.07, dur: 0.25, at: i * 0.03, wet: 0.5 })); },
    hit() { A.noise({ f: 900, f2: 200, ft: 'lowpass', vol: 0.5, dur: 0.16 }); A.tone({ f: 140, f2: 60, type: 'sine', vol: 0.45, dur: 0.18 }); },
    bighit() { A.noise({ f: 1200, f2: 120, ft: 'lowpass', vol: 0.7, dur: 0.3 }); A.tone({ f: 110, f2: 40, type: 'sine', vol: 0.7, dur: 0.35 }); A.bell(220, { vol: 0.08, dur: 0.6 }); },
    weak() { A.bell(880, { vol: 0.12, dur: 0.5 }); },
    blocked() { A.tone({ f: 420, f2: 300, type: 'square', vol: 0.06, dur: 0.08, lp: 1500 }); A.noise({ f: 1800, q: 2, vol: 0.12, dur: 0.06 }); },
    block() { A.tone({ f: 300, f2: 520, type: 'triangle', vol: 0.16, dur: 0.14 }); A.noise({ f: 4000, q: 3, vol: 0.05, dur: 0.08 }); },
    hurt() { A.tone({ f: 200, f2: 70, type: 'sawtooth', vol: 0.18, dur: 0.25, lp: 700 }); A.noise({ f: 600, ft: 'lowpass', vol: 0.35, dur: 0.18 }); },
    burn() { for (let i = 0; i < 4; i++) A.noise({ f: 2500 + Math.random() * 2500, q: 5, vol: 0.07, dur: 0.03, at: i * 0.04 }); A.noise({ f: 800, f2: 300, ft: 'lowpass', vol: 0.12, dur: 0.25 }); },
    heal() { [0, 4, 7].forEach((s, i) => A.tone({ f: midiHz(79 + s), type: 'sine', vol: 0.1, dur: 0.4, at: i * 0.06, wet: 0.6 })); },
    buff() { A.tone({ f: 330, f2: 660, slide: 0.18, type: 'triangle', vol: 0.12, dur: 0.22, wet: 0.3 }); },
    debuff() { A.tone({ f: 500, f2: 180, slide: 0.25, type: 'triangle', vol: 0.14, dur: 0.28, wet: 0.3 }); },
    energy() { A.tone({ f: 660, f2: 990, slide: 0.1, type: 'sine', vol: 0.12, dur: 0.18, wet: 0.4 }); },
    gold() { for (let i = 0; i < 3; i++) A.bell(1800 + i * 240, { vol: 0.05, dur: 0.25, at: i * 0.06 }); },
    die() { A.noise({ f: 300, f2: 2400, q: 0.6, vol: 0.25, dur: 0.6, a: 0.25 }); A.drum(55, { vol: 0.5, dur: 0.6, at: 0.2 }); },
    turn() { A.drum(90, { vol: 0.5 }); A.tone({ f: 380, f2: 330, type: 'triangle', vol: 0.12, dur: 0.1, at: 0.12 }); },
    enemyturn() { A.drum(60, { vol: 0.6, dur: 0.5 }); A.drum(60, { vol: 0.35, dur: 0.4, at: 0.22 }); },
    relic() { A.bell(1320, { vol: 0.07, dur: 0.5 }); },
    potion() { A.tone({ f: 300, f2: 700, slide: 0.1, type: 'sine', vol: 0.25, dur: 0.12 }); A.tone({ f: 350, f2: 800, slide: 0.1, type: 'sine', vol: 0.2, dur: 0.12, at: 0.12 }); },
    error() { A.tone({ f: 160, type: 'square', vol: 0.07, dur: 0.14, lp: 600 }); },
    select() { A.tone({ f: 980, type: 'triangle', vol: 0.08, dur: 0.06 }); },
    stun() { A.bell(1500, { vol: 0.08, dur: 0.4 }); A.bell(1900, { vol: 0.06, dur: 0.4, at: 0.1 }); },
    cycle() { A.bell(196, { vol: 0.35, dur: 3 }); [0, 2, 5, 7, 9, 12].forEach((s, i) => A.pluck(67 + s, { at: 0.05 + i * 0.07, vol: 0.28, dur: 2, bright: 1 })); A.noise({ f: 6000, q: 0.5, vol: 0.06, dur: 1.4, a: 0.3, wet: 0.8 }); },
    victory() { [0, 2, 5, 7, 9, 12, 14, 17].forEach((s, i) => A.pluck(60 + s, { at: i * 0.11, vol: 0.3, dur: 2.4 })); A.bell(262, { vol: 0.2, dur: 3, at: 0.9 }); },
    defeat() { A.bell(98, { vol: 0.35, dur: 4 }); [9, 7, 5, 2, 0].forEach((s, i) => A.pluck(57 + s, { at: 0.4 + i * 0.35, vol: 0.22, dur: 2.5, vib: 0.01 })); },
    stamp() { A.drum(140, { vol: 0.35, dur: 0.12 }); A.noise({ f: 1500, q: 1, vol: 0.12, dur: 0.05 }); },
    step() { A.tone({ f: 600, f2: 400, type: 'triangle', vol: 0.12, dur: 0.08 }); },
  };
  UI.sfx = function (name, opt) {
    if (!A.ready || !A.ctx || A.ctx.state !== 'running') return;
    try { const f = SFX[name]; if (f) f(opt); } catch (e) { /* 소리는 실패해도 게임은 계속 */ }
  };
  // 연계 n단계: 5음계가 한 음씩 올라간다
  UI.chainNote = function (n, el) {
    if (!A.ready || !A.ctx || A.ctx.state !== 'running') return;
    const k = Math.max(0, n - 1);
    const midi = 62 + PENTA[k % 5] + 12 * Math.floor(k / 5);
    A.pluck(midi, { vol: 0.32, dur: 1.8, bright: 1, bend: n >= 2 ? 1 : 0, vib: n >= 3 ? 0.008 : 0 });
  };

  // ── 음악: 상황별 분위기 ──
  // mood: title | map | combat | elite | boss | calm | none
  const MOODS = {
    title: { bpm: 54, root: 45, scale: [0, 3, 5, 7, 10], density: 0.35, drum: 0, drone: 0.05, oct: 1 },
    map: { bpm: 66, root: 50, scale: [0, 2, 5, 7, 9], density: 0.45, drum: 0.5, drone: 0.035, oct: 1 },
    calm: { bpm: 58, root: 48, scale: [0, 2, 5, 7, 9], density: 0.4, drum: 0.25, drone: 0.04, oct: 1 },
    combat: { bpm: 92, root: 45, scale: [0, 3, 5, 7, 10], density: 0.55, drum: 1, drone: 0.04, oct: 1 },
    elite: { bpm: 100, root: 44, scale: [0, 3, 5, 7, 10], density: 0.6, drum: 1.2, drone: 0.05, oct: 1 },
    boss: { bpm: 108, root: 40, scale: [0, 1, 5, 7, 10], density: 0.65, drum: 1.4, drone: 0.06, oct: 0 },
  };
  A.setMood = function (mood) {
    if (!A.ready || !A.ctx || A.ctx.state !== 'running') { A.pendingMood = mood; return; }
    if (A.mood === mood) return;
    A.mood = mood;
    if (A.music) { A.music.stop(); A.music = null; }
    if (mood && MOODS[mood]) A.music = A.makeMusic(MOODS[mood]);
  };
  A.makeMusic = function (M) {
    const c = A.ctx;
    const bus = c.createGain();
    bus.gain.setValueAtTime(0.0001, c.currentTime);
    bus.gain.exponentialRampToValueAtTime(1, c.currentTime + 2.5);
    bus.connect(A.musBus);
    // 드론 (낮게 깔리는 소리)
    const drone = [];
    if (M.drone) {
      [0, 7].forEach((iv, i) => {
        const o = c.createOscillator(); o.type = 'triangle'; o.frequency.value = midiHz(M.root - 12 + iv);
        o.detune.value = i ? 4 : -3;
        const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 420;
        const lfo = c.createOscillator(); lfo.frequency.value = 0.07 + i * 0.03;
        const lg = c.createGain(); lg.gain.value = 160; lfo.connect(lg); lg.connect(f.frequency);
        const g = c.createGain(); g.gain.value = M.drone;
        o.connect(f); f.connect(g); g.connect(bus);
        o.start(); lfo.start();
        drone.push(o, lfo);
      });
    }
    const beat = 60 / M.bpm / 3; // 3분박(굿거리·세마치 느낌)
    let next = c.currentTime + 0.3;
    let step = 0;
    let pos = 2; // 음계 위치
    let motif = [];
    const scaleNote = (p) => { const n = M.scale.length; const o = Math.floor(p / n); return M.root + 12 * (o + M.oct) + M.scale[((p % n) + n) % n]; };
    let stopped = false;
    const tick = () => {
      if (stopped) return;
      while (next < c.currentTime + 0.25) {
        const bar = step % 12;
        // 장구: 덩(강) · 쿵(북편) · 덕(채편)
        if (M.drum) {
          if (bar === 0) { drumAt(next, 70, 0.32 * M.drum); tak(next, 0.12 * M.drum); }
          else if (bar === 6) drumAt(next, 75, 0.2 * M.drum);
          else if (bar === 9 || bar === 3) tak(next, 0.1 * M.drum);
          else if (M.drum > 1 && (bar === 10 || bar === 11)) tak(next, 0.06 * M.drum);
        }
        // 가락: 마디마다 짧은 동기를 만들고 변형해 반복
        if (bar === 0 && (step / 12) % 4 === 0) motif = [];
        if (step % 3 === 0 && Math.random() < M.density) {
          let p;
          const mi = (step / 3) % 4;
          if (motif.length > mi && Math.random() < 0.55) p = motif[mi] + (Math.random() < 0.3 ? (Math.random() < 0.5 ? 1 : -1) : 0);
          else { pos += Math.round((Math.random() - 0.5) * 3.2); pos = Math.max(0, Math.min(9, pos)); p = pos; motif[mi] = p; }
          const midi = scaleNote(p);
          const t = next;
          A.pluckAt(midi, t, bus, 0.22, 1.9, Math.random() < 0.35 ? 1 : 0, Math.random() < 0.4 ? 0.01 : 0);
          if (Math.random() < 0.15) A.pluckAt(scaleNote(p - 2), t + beat, bus, 0.12, 1.4, 0, 0);
        }
        next += beat;
        step++;
      }
    };
    function drumAt(t, f, v) {
      const o = c.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(f * 1.7, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.08);
      const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
      o.connect(g); g.connect(bus); o.start(t); o.stop(t + 0.5);
    }
    function tak(t, v) {
      const s = c.createBufferSource(); s.buffer = A.noiseBuf;
      const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2400; f.Q.value = 2;
      const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
      s.connect(f); f.connect(g); g.connect(bus); s.start(t, Math.random()); s.stop(t + 0.08);
    }
    const iv = setInterval(tick, 80);
    tick();
    return {
      stop() {
        stopped = true; clearInterval(iv);
        const t = c.currentTime;
        bus.gain.cancelScheduledValues(t);
        bus.gain.setValueAtTime(bus.gain.value || 0.5, t);
        bus.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
        setTimeout(() => { drone.forEach((o) => { try { o.stop(); } catch (e) { /* */ } }); bus.disconnect(); }, 1400);
      },
    };
  };
  A.pluckAt = function (midi, t, bus, vol, dur, bend, vib) {
    const c = A.ctx;
    const src = c.createBufferSource();
    src.buffer = A.pluckBuf(midi);
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    if (bend) { src.playbackRate.setValueAtTime(Math.pow(2, -1 / 12), t); src.playbackRate.linearRampToValueAtTime(1, t + 0.14); }
    if (vib) { const lfo = c.createOscillator(); const lg = c.createGain(); lfo.frequency.value = 5; lg.gain.value = vib; lfo.connect(lg); lg.connect(src.playbackRate); lfo.start(t + 0.3); lfo.stop(t + dur); }
    src.connect(g); g.connect(bus);
    const w = c.createGain(); w.gain.value = 0.45; g.connect(w); w.connect(A.verb);
    src.start(t); src.stop(t + dur);
  };
})();
