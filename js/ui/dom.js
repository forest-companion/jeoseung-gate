'use strict';
// 화면 공용 도구: 요소 만들기, 무대 맞춤, 툴팁, 토스트, 모달, 대기, 그림 경로, 키워드 강조
(function () {
  const UI = window.UI = {};
  UI.stage = document.getElementById('stage');
  UI.scale = 1;

  UI.h = function (tag, attrs, ...kids) {
    const el = document.createElement(tag);
    if (attrs) {
      for (const k in attrs) {
        const v = attrs[k];
        if (v === undefined || v === null || v === false) continue;
        if (k === 'class') el.className = v;
        else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
        else if (k === 'html') el.innerHTML = v;
        else if (k === 'text') el.textContent = v;
        else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
        else if (k === 'dataset') Object.assign(el.dataset, v);
        else el.setAttribute(k, v === true ? '' : v);
      }
    }
    for (const kid of kids.flat()) {
      if (kid === null || kid === undefined || kid === false) continue;
      el.appendChild(typeof kid === 'string' || typeof kid === 'number' ? document.createTextNode(String(kid)) : kid);
    }
    return el;
  };
  UI.$ = (sel, root) => (root || document).querySelector(sel);
  UI.$$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  UI.clear = (el) => { while (el.firstChild) el.removeChild(el.firstChild); };

  // ── 무대 맞춤 ──
  // 세로 화면(폰 세로)이면 720×1280 무대, 아니면 1280×720
  UI.vert = false;
  UI.W = 1280; UI.H = 720;
  UI.fit = function () {
    const vw = window.innerWidth, vh = window.innerHeight;
    const portrait = vh > vw * 1.05;
    const changed = portrait !== UI.vert;
    UI.vert = portrait;
    const prevH = UI.H;
    UI.W = portrait ? 720 : 1280;
    UI.H = portrait ? Math.round(Math.min(1560, Math.max(1180, 720 * vh / vw))) : 720;
    UI.stage.style.width = UI.W + 'px'; UI.stage.style.height = UI.H + 'px';
    UI.stage.style.setProperty('--H', UI.H + 'px');
    UI.stage.style.setProperty('--dy', (UI.H - 1280) + 'px');
    UI.stage.classList.toggle('portrait', portrait);
    const s = Math.min(vw / UI.W, vh / UI.H);
    UI.scale = s;
    UI.stage.style.transform = `scale(${s})`;
    if ((changed || (portrait && prevH !== UI.H)) && UI.onOrient) UI.onOrient();
  };
  window.addEventListener('resize', UI.fit);
  window.addEventListener('orientationchange', () => setTimeout(UI.fit, 120));
  UI.toStage = function (cx, cy) {
    const r = UI.stage.getBoundingClientRect();
    return { x: (cx - r.left) / UI.scale, y: (cy - r.top) / UI.scale };
  };
  UI.rectOf = function (el) {
    const r = el.getBoundingClientRect();
    const s = UI.stage.getBoundingClientRect();
    return { x: (r.left - s.left) / UI.scale, y: (r.top - s.top) / UI.scale, w: r.width / UI.scale, h: r.height / UI.scale,
      get cx() { return this.x + this.w / 2; }, get cy() { return this.y + this.h / 2; } };
  };

  // ── 시간 ──
  UI.speed = () => (JG.Meta.data.settings.speed || 1);
  UI.wait = (ms) => new Promise((res) => setTimeout(res, ms / UI.speed()));
  UI.anim = function (el, frames, opts) {
    if (!el || !el.animate) return Promise.resolve();
    const o = Object.assign({}, typeof opts === 'number' ? { duration: opts } : opts);
    o.duration = (o.duration || 300) / UI.speed();
    if (o.fill === undefined) o.fill = 'forwards';
    try { return el.animate(frames, o).finished.catch(() => {}); } catch (e) { return Promise.resolve(); }
  };

  // ── 그림 ──
  UI.IMG_EXT = { portrait: 'webp', other: 'jpg' };
  UI.imgSrc = (id) => id ? `assets/img/${id}.${/^(ch_|en_)/.test(id) ? 'webp' : 'jpg'}` : '';
  UI.imgOk = {};
  UI.preload = function (ids) {
    return Promise.all(ids.map((id) => new Promise((res) => {
      const im = new Image();
      im.onload = () => { UI.imgOk[id] = true; res(); };
      im.onerror = () => { UI.imgOk[id] = false; res(); };
      im.src = UI.imgSrc(id);
    })));
  };
  // 그림이 없으면 한자 도장으로 대신
  UI.portrait = function (id, fallbackChar, cls) {
    const wrap = UI.h('div', { class: cls || '' });
    if (UI.imgOk[id] === false) { wrap.appendChild(UI.h('div', { class: 'fallback' }, fallbackChar || '鬼')); return wrap; }
    const im = UI.h('img', { src: UI.imgSrc(id), alt: '', draggable: 'false' });
    im.onerror = () => { UI.imgOk[id] = false; im.replaceWith(UI.h('div', { class: 'fallback' }, fallbackChar || '鬼')); };
    wrap.appendChild(im);
    return wrap;
  };
  UI.bgStyle = (id) => (UI.imgOk[id] === false ? {} : { backgroundImage: `url(${UI.imgSrc(id)})` });

  // ── 붓 느낌 필터(SVG) ──
  UI.installDefs = function () {
    const svg = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
      <filter id="brush" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="2.6" xChannelSelector="R" yChannelSelector="G"/></filter>
      <filter id="inkEdge"><feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="3" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="5"/></filter>
    </defs></svg>`;
    document.body.insertAdjacentHTML('afterbegin', svg);
  };

  // ── 키워드 설명 ──
  UI.KW = {
    '연계': '직전에 쓴 카드 원소의 상생 다음 원소 카드를 쓰면 연계가 이어지고, 카드의 「연계:」 효과가 발동합니다. 목→화→토→금→수→목',
    '오행순환': '한 턴에 연계를 5단계까지 이으면 기력 +1, 카드 1장, 모든 적에게 피해 6.',
    '오색': '어떤 원소든 이어 주는 카드. 연계를 잇는 다음 원소로 취급됩니다.',
    '약점': '공격 원소가 적의 원소를 이기면(상극) 피해 1.5배. 목극토 · 토극수 · 수극화 · 화극금 · 금극목',
    '소멸': '사용하면 이번 전투에서 사라집니다.',
    '보존': '턴이 끝나도 버려지지 않고 손에 남습니다.',
    '휘발': '손에 든 채로 턴이 끝나면 소멸합니다.',
    '선천': '전투 첫 손패에 반드시 들어옵니다.',
    '새싹': '0비용 목(木) 공격: 피해 4, 재생 1, 소멸.',
    '방어': '다음 내 턴이 시작될 때까지 피해를 먼저 막아 줍니다.',
    '마무리': '기세를 모두 써서 위력이 커지는 기술. 기세는 공격 카드를 쓸 때마다 쌓입니다.',
  };
  UI.statusTip = function (id, n) {
    const sd = JG.D.statuses[id];
    if (!sd) return '';
    return `<div class="tt-h">${sd.icon} ${sd.name}${sd.flag ? '' : ' ' + n}</div>${sd.desc(n)}`;
  };
  const kwNames = () => {
    if (UI._kwRe) return UI._kwRe;
    const names = Object.keys(UI.KW).concat(Object.values(JG.D.statuses).map((s) => s.name));
    const uniq = [...new Set(names)].sort((a, b) => b.length - a.length);
    UI._kwRe = new RegExp('(' + uniq.map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')', 'g');
    return UI._kwRe;
  };
  UI.kwHtml = function (text) {
    return String(text).replace(kwNames(), (m) => `<span class="kw" data-kw="${m}">${m}</span>`);
  };
  UI.kwTip = function (name) {
    if (UI.KW[name]) return `<div class="tt-h">${name}</div>${UI.KW[name]}`;
    const sd = Object.values(JG.D.statuses).find((s) => s.name === name);
    if (sd) return `<div class="tt-h">${sd.icon} ${sd.name}</div>${sd.desc('N')}`;
    return '';
  };

  // ── 툴팁 ──
  let tipEl = null, tipFor = null;
  UI.tipLayer = function () {
    if (!tipEl || !tipEl.isConnected) { tipEl = UI.h('div', { id: 'tooltip', class: 'hidden' }); UI.stage.appendChild(tipEl); }
    return tipEl;
  };
  function tipContent(el) {
    if (el.dataset.kw) return UI.kwTip(el.dataset.kw);
    if (el._tip) return typeof el._tip === 'function' ? el._tip() : el._tip;
    if (el.dataset.tip) return el.dataset.tip;
    return '';
  }
  UI.setTip = (el, html) => { el._tip = html; el.classList.add('has-tip'); return el; };
  function placeTip(cx, cy) {
    const t = UI.tipLayer();
    const p = UI.toStage(cx, cy);
    const w = t.offsetWidth, hh = t.offsetHeight;
    let x = p.x + 18, y = p.y + 18;
    if (x + w > UI.W - 10) x = Math.max(6, p.x - w - 14);
    if (y + hh > UI.H - 10) y = Math.max(8, p.y - hh - 14);
    t.style.left = Math.max(6, x) + 'px';
    t.style.top = y + 'px';
  }
  UI.hideTip = () => { const t = UI.tipLayer(); t.classList.add('hidden'); tipFor = null; };
  document.addEventListener('pointermove', (ev) => {
    if (ev.pointerType === 'touch') return;
    const el = ev.target.closest && ev.target.closest('[data-kw], .has-tip, [data-tip]');
    const t = UI.tipLayer();
    if (!el || UI.noTips) { if (tipFor) UI.hideTip(); return; }
    if (el !== tipFor) {
      const html = tipContent(el);
      if (!html) { UI.hideTip(); return; }
      t.innerHTML = html;
      t.classList.remove('hidden');
      tipFor = el;
    }
    placeTip(ev.clientX, ev.clientY);
  });
  // 터치: 길게 누르면 툴팁
  let pressTimer = null;
  document.addEventListener('pointerdown', (ev) => {
    if (ev.pointerType !== 'touch') return;
    const el = ev.target.closest && ev.target.closest('[data-kw], .has-tip, [data-tip]');
    clearTimeout(pressTimer);
    if (!el) { UI.hideTip(); return; }
    pressTimer = setTimeout(() => {
      const html = tipContent(el);
      if (!html) return;
      const t = UI.tipLayer(); t.innerHTML = html; t.classList.remove('hidden'); tipFor = el; placeTip(ev.clientX, ev.clientY);
    }, 420);
  });
  document.addEventListener('pointerup', () => clearTimeout(pressTimer));

  // 카드 길게 누르기(터치) → 크게 보기
  let zoomTimer = null, zoomEl = null, zoomStart = null;
  document.addEventListener('pointerdown', (ev) => {
    if (ev.pointerType !== 'touch') return;
    const card = ev.target.closest && ev.target.closest('.card');
    if (!card) return;
    zoomStart = { x: ev.clientX, y: ev.clientY };
    clearTimeout(zoomTimer);
    zoomTimer = setTimeout(() => {
      zoomEl = UI.h('div', { class: 'card-zoom' });
      const cl = card.cloneNode(true);
      cl.style.transform = 'none'; cl.style.left = '0'; cl.style.top = '0'; cl.style.position = 'relative';
      cl.classList.remove('hover', 'selected', 'dragging');
      zoomEl.appendChild(cl);
      UI.stage.appendChild(zoomEl);
      UI.zoomed = true;
    }, 450);
  }, true);
  document.addEventListener('pointermove', (ev) => {
    if (zoomStart && Math.hypot(ev.clientX - zoomStart.x, ev.clientY - zoomStart.y) > 10) { clearTimeout(zoomTimer); zoomStart = null; }
  }, true);
  document.addEventListener('pointerup', () => {
    clearTimeout(zoomTimer); zoomStart = null;
    if (zoomEl) { zoomEl.remove(); zoomEl = null; setTimeout(() => { UI.zoomed = false; }, 50); }
  }, true);
  document.addEventListener('click', (ev) => { if (UI.zoomed) { ev.stopPropagation(); ev.preventDefault(); UI.zoomed = false; } }, true);

  // ── 토스트 ──
  UI.toast = function (text, ms) {
    let box = UI.$('#toast');
    if (!box || !box.isConnected) { box = UI.h('div', { id: 'toast' }); UI.stage.appendChild(box); }
    const t = UI.h('div', { class: 'toast', html: text });
    box.appendChild(t);
    while (box.children.length > 4) box.removeChild(box.firstChild);
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 320); }, ms || 1800);
  };

  // ── 모달 ── buttons: [{label, cls, value}]  → Promise(value)
  UI.modal = function (o) {
    return new Promise((resolve) => {
      const back = UI.h('div', { class: 'modal-back' });
      const box = UI.h('div', { class: 'modal lacq brass-frame' },
        o.title ? UI.h('h3', null, o.title) : null,
        o.text ? UI.h('p', { html: o.text }) : null,
        o.body || null,
        UI.h('div', { class: 'row' }, (o.buttons || [{ label: '확인', value: true }]).map((b) => UI.h('button', { class: 'btn ' + (b.cls || ''), onclick: () => { back.remove(); UI.sfx('click'); resolve(b.value); } }, b.label))));
      back.appendChild(box);
      if (o.dismiss !== false) back.addEventListener('pointerdown', (e) => { if (e.target === back) { back.remove(); resolve(null); } });
      UI.stage.appendChild(back);
      UI.modalOpen = back;
      const first = box.querySelector('.btn:last-child');
      if (first) first.focus();
    });
  };
  UI.confirm = (title, text, yes, no) => UI.modal({ title, text, buttons: [{ label: no || '아니오', value: false }, { label: yes || '예', cls: 'red', value: true }] });

  // ── 숫자 굴리기 ──
  UI.countTo = function (el, to, ms) {
    const from = parseInt(el.textContent, 10) || 0;
    if (from === to) { el.textContent = to; return; }
    const t0 = performance.now();
    const dur = (ms || 400) / UI.speed();
    const step = (t) => { const k = Math.min(1, (t - t0) / dur); el.textContent = Math.round(from + (to - from) * k); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  };

  UI.fmtTime = function (ms) {
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
    return h ? `${h}시간 ${m}분` : `${m}분 ${s % 60}초`;
  };
  UI.sfx = function () { /* audio.js 가 덮어씀 */ };
})();
