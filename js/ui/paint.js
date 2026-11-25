'use strict';
// 수묵 산수 배경을 캔버스로 그린다 (그림 파일이 없을 때의 기본 무대, 그리고 지도·제목 배경)
(function () {
  const PAL = {
    1: { sky: ['#2b2230', '#7d5a52', '#d9b58a', '#ecd9b4'], ridge: ['#c9b597', '#9c8a73', '#6b5d4f', '#3d342c', '#1d1814'], mist: 'rgba(236,217,180,', moon: null, feature: 'village' },
    2: { sky: ['#1f2622', '#4b5a50', '#a7b19a', '#d5d8c4'], ridge: ['#b8bfaa', '#8a937e', '#5f6858', '#363d32', '#171b16'], mist: 'rgba(213,216,196,', moon: null, feature: 'pagoda' },
    3: { sky: ['#140d1a', '#3a2238', '#7a4a58', '#a8787a'], ridge: ['#7d6170', '#5c4556', '#3d2c3b', '#241a24', '#0e0a0e'], mist: 'rgba(168,120,122,', moon: '#e0806a', feature: 'lanterns' },
    0: { sky: ['#0d0a10', '#2a2236', '#5a4a5e', '#8a7a80'], ridge: ['#6a5e6a', '#4a404c', '#302830', '#1c171c', '#0b090b'], mist: 'rgba(160,140,150,', moon: '#f3ead2', feature: 'gate' },
  };
  function noise1(rng) {
    const waves = Array.from({ length: 6 }, (_, i) => ({ f: 0.0025 * Math.pow(2.03, i), a: 1 / Math.pow(1.85, i), p: rng.next() * 100 }));
    return (x) => waves.reduce((s, w) => s + Math.sin(x * w.f + w.p) * w.a, 0);
  }
  UI.paintScene = function (cv, act, seed) {
    const W = cv.width, H = cv.height;
    const ctx = cv.getContext('2d');
    const P = PAL[act > 3 ? JG.baseAct(act) : act] || PAL[1];
    const rng = JG.RNG('scene:' + act + ':' + (seed || ''));
    // 하늘
    const g = ctx.createLinearGradient(0, 0, 0, H * 0.75);
    P.sky.forEach((c, i) => g.addColorStop(i / (P.sky.length - 1), c));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // 종이 결
    const img = ctx.getImageData(0, 0, W, H);
    for (let i = 0; i < img.data.length; i += 4) { const n = (rng.next() - 0.5) * 10; img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n; }
    ctx.putImageData(img, 0, 0);
    // 달
    if (P.moon) {
      const mx = W * (act === 0 ? 0.72 : 0.78), my = H * (act === 0 ? 0.26 : 0.2), mr = act === 0 ? 92 : 46;
      const mg = ctx.createRadialGradient(mx, my, mr * 0.2, mx, my, mr * 3);
      mg.addColorStop(0, P.moon); mg.addColorStop(0.33, P.moon + 'cc'); mg.addColorStop(0.34, P.moon + '55'); mg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(mx, my, mr * 3, 0, Math.PI * 2); ctx.fill();
    } else if (act === 1) {
      // 사라진 달: 희미한 고리만
      ctx.strokeStyle = 'rgba(255,240,210,.18)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(W * 0.8, H * 0.18, 40, 0, Math.PI * 2); ctx.stroke();
    }
    // 산줄기
    const layers = P.ridge.length;
    for (let L = 0; L < layers; L++) {
      const n = noise1(rng);
      const base = H * (0.34 + L * 0.095);
      const amp = H * (0.16 - L * 0.018);
      ctx.beginPath();
      ctx.moveTo(0, H);
      for (let x = 0; x <= W; x += 4) {
        let y = base - Math.abs(n(x + L * 300)) * amp - n(x * 3.1) * amp * 0.12;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(W, H);
      ctx.closePath();
      const lg = ctx.createLinearGradient(0, base - amp, 0, base + 160);
      lg.addColorStop(0, P.ridge[L]);
      lg.addColorStop(1, P.ridge[Math.min(layers - 1, L + 1)]);
      ctx.fillStyle = lg;
      ctx.fill();
      // 붓 자국 같은 능선 선
      ctx.strokeStyle = 'rgba(20,15,12,' + (0.08 + L * 0.05) + ')';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      // 안개
      const mist = ctx.createLinearGradient(0, base - 30, 0, base + 70);
      mist.addColorStop(0, P.mist + '0)'); mist.addColorStop(0.5, P.mist + (0.32 - L * 0.04) + ')'); mist.addColorStop(1, P.mist + '0)');
      ctx.fillStyle = mist;
      ctx.fillRect(0, base - 30, W, 100);
      if (L === 2) feature(ctx, P.feature, W, H, base, rng);
    }
    // 소나무 (가까운 곳)
    if (act === 1 || act === 2) for (let i = 0; i < 3; i++) pine(ctx, rng.next() < 0.5 ? rng.int(20, 200) : rng.int(1080, 1260), H * 0.62 + rng.int(0, 40), 0.8 + rng.next() * 0.5, 'rgba(18,14,11,.85)', rng);
  };
  function pine(ctx, x, y, s, col, rng) {
    ctx.save();
    ctx.translate(x, y); ctx.scale(s, s);
    ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineCap = 'round';
    ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(6, -60, -10, -120, 4, -190); ctx.stroke();
    for (let k = 0; k < 6; k++) {
      const yy = -60 - k * 24, w = 70 - k * 9, dir = k % 2 ? 1 : -1;
      ctx.beginPath();
      ctx.ellipse(dir * w * 0.35, yy, w * 0.6, 9, dir * 0.08, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  function feature(ctx, kind, W, H, base, rng) {
    ctx.save();
    if (kind === 'village') {
      for (let i = 0; i < 5; i++) {
        const x = 120 + i * 230 + rng.int(-40, 40), y = base + 26 + rng.int(-6, 10);
        ctx.fillStyle = 'rgba(40,32,26,.75)';
        ctx.beginPath(); ctx.ellipse(x, y, 46, 18, 0, Math.PI, 0); ctx.fill();
        ctx.fillRect(x - 32, y, 64, 18);
        ctx.fillStyle = 'rgba(255,190,110,.55)'; ctx.fillRect(x - 6, y + 4, 9, 9);
      }
    } else if (kind === 'pagoda') {
      const x = W * 0.22, y = base + 40;
      ctx.fillStyle = 'rgba(40,44,38,.8)';
      for (let k = 0; k < 5; k++) { const w = 70 - k * 11, yy = y - k * 32; ctx.fillRect(x - w / 2, yy - 10, w, 10); ctx.fillRect(x - w / 3, yy - 32, w / 1.5, 22); }
      ctx.fillRect(x - 2, y - 190, 4, 30);
    } else if (kind === 'lanterns') {
      for (let i = 0; i < 14; i++) {
        const x = rng.int(0, W), y = base - rng.int(0, 120);
        const r = 3 + rng.next() * 4;
        const lg = ctx.createRadialGradient(x, y, 0, x, y, r * 5);
        lg.addColorStop(0, 'rgba(255,170,110,.9)'); lg.addColorStop(1, 'rgba(255,120,80,0)');
        ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(x, y, r * 5, 0, Math.PI * 2); ctx.fill();
      }
    } else if (kind === 'gate') {
      // 홍살문: 붉은 두 기둥, 가로대 위로 촘촘한 살, 가운데 태극
      const x = W * 0.72, y = base + 70;
      const red = 'rgba(120,28,22,.95)', dark = 'rgba(16,12,14,.92)';
      ctx.fillStyle = red;
      ctx.fillRect(x - 160, y - 250, 18, 250); ctx.fillRect(x + 142, y - 250, 18, 250);
      ctx.fillStyle = dark;
      ctx.fillRect(x - 170, y - 252, 340, 12);
      ctx.fillRect(x - 166, y - 196, 332, 9);
      ctx.strokeStyle = red; ctx.lineWidth = 4; ctx.lineCap = 'round';
      for (let k = -150; k <= 150; k += 15) { ctx.beginPath(); ctx.moveTo(x + k, y - 252); ctx.lineTo(x + k, y - 318 + Math.abs(k) * 0.08); ctx.stroke(); }
      ctx.fillStyle = red;
      for (let k = -150; k <= 150; k += 15) { ctx.beginPath(); ctx.moveTo(x + k - 4, y - 316 + Math.abs(k) * 0.08); ctx.lineTo(x + k, y - 330 + Math.abs(k) * 0.08); ctx.lineTo(x + k + 4, y - 316 + Math.abs(k) * 0.08); ctx.fill(); }
      // 태극
      const ty = y - 300, r = 22;
      ctx.fillStyle = 'rgba(30,40,110,.95)'; ctx.beginPath(); ctx.arc(x, ty, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(190,40,30,.98)'; ctx.beginPath(); ctx.arc(x, ty, r, Math.PI, 0); ctx.arc(x + r / 2, ty, r / 2, 0, Math.PI, true); ctx.arc(x - r / 2, ty, r / 2, 0, Math.PI, false); ctx.fill();
      ctx.fillStyle = 'rgba(240,220,180,.9)'; ctx.font = '900 20px "Yuji Boku", Gungsuh, serif'; ctx.textAlign = 'center'; ctx.fillText('冥 府', x, y - 205);
    }
    ctx.restore();
  }
  // 무대에 깔기: 그림 파일이 있으면 그 위에 덮는다
  UI.sceneLayer = function (act, imgId, cls) {
    const wrap = UI.h('div', { class: 'scene ' + (cls || '') });
    const cv = UI.h('canvas', { width: 1280, height: 720, style: { position: 'absolute', inset: '0', width: '100%', height: '100%' } });
    UI.paintScene(cv, act, UI.run ? UI.run.seed : '');
    wrap.appendChild(cv);
    if (imgId && UI.imgOk[imgId] !== false) {
      const im = UI.h('div', { style: Object.assign({ position: 'absolute', inset: '0', backgroundSize: 'cover', backgroundPosition: 'center' }, UI.bgStyle(imgId)) });
      wrap.appendChild(im);
    }
    return wrap;
  };
})();
