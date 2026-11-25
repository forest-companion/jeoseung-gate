'use strict';
// ─────────────────────────────────────────────────────────────
// 전투 화면: 손패·대상 지정(누르기/끌기/키보드)·적·오행 바퀴·연출 재생
// 엔진(g)은 즉시 계산하고 g.fx 에 연출 목록을 쌓는다 → 여기서 차례대로 재생
// ─────────────────────────────────────────────────────────────
(function () {
  const D = JG.D;
  const h = UI.h;
  const NS = 'http://www.w3.org/2000/svg';
  const INTENT_SVG = {
    atk: '<svg viewBox="0 0 24 24"><path d="M21 2.5 L22 3.5 L10.5 15.5 L8.5 13.5 Z" fill="#f6e6d6" stroke="#7a2416" stroke-width="1"/><path d="M6.5 11.5 L12.5 17.5" stroke="#d9a84a" stroke-width="2.6" stroke-linecap="round"/><path d="M8.6 15.4 L3.5 20.5" stroke="#8a3a26" stroke-width="3" stroke-linecap="round"/></svg>',
    def: '<svg viewBox="0 0 24 24"><path d="M12 2 L20 5 L19 13 C18 18 15 20 12 22 C9 20 6 18 5 13 L4 5 Z" fill="#4a6f96" stroke="#d8e6f5" stroke-width="1.6"/></svg>',
    buff: '<svg viewBox="0 0 24 24"><path d="M12 3 L20 13 H15 V21 H9 V13 H4 Z" fill="#5c9e5a" stroke="#d2f2c8" stroke-width="1.4" stroke-linejoin="round"/></svg>',
    debuff: '<svg viewBox="0 0 24 24"><path d="M12 21 L4 11 H9 V3 H15 V11 H20 Z" fill="#8e4aa8" stroke="#ecd0f5" stroke-width="1.4" stroke-linejoin="round"/></svg>',
    magic: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="#3d2a58" stroke="#e4c6ff" stroke-width="1.6"/><path d="M12 6 L13.5 10.5 L18 12 L13.5 13.5 L12 18 L10.5 13.5 L6 12 L10.5 10.5 Z" fill="#e4c6ff"/></svg>',
    summon: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="#2c3a2a" stroke="#cfe8c0" stroke-width="1.6"/><path d="M12 7 V17 M7 12 H17" stroke="#cfe8c0" stroke-width="2.4"/></svg>',
    escape: '<svg viewBox="0 0 24 24"><path d="M4 12 H18 M13 6 L19 12 L13 18" stroke="#e8d9a0" stroke-width="2.6" fill="none" stroke-linecap="round"/></svg>',
    charge: '<svg viewBox="0 0 24 24"><path d="M7 3 H17 L13 10 H18 L8 21 L11 12 H6 Z" fill="#d9a514" stroke="#fff0b0" stroke-width="1.2" stroke-linejoin="round"/></svg>',
    unknown: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="#3a3030" stroke="#ccc" stroke-width="1.6"/><text x="12" y="17" font-size="13" text-anchor="middle" fill="#eee">?</text></svg>',
  };
  const IT_TEXT = { atk: '공격', def: '방어', buff: '강화', debuff: '약화', atkdef: '공격 + 방어', atkbuff: '공격 + 강화', atkdebuff: '공격 + 약화', defbuff: '방어 + 강화', defdebuff: '방어 + 약화', buffdebuff: '강화 + 약화', magic: '특수', summon: '소환', escape: '도주', charge: '기 모으기', sleep: '잠' };
  const intentIcons = (it) => {
    const parts = [];
    if (it.startsWith('atk')) parts.push('atk');
    if (it.includes('def')) parts.push('def');
    if (it.includes('buff') && !it.includes('debuff')) parts.push('buff');
    if (it.includes('debuff')) { if (it.replace('debuff', '').includes('buff')) parts.push('buff'); parts.push('debuff'); }
    if (['magic', 'summon', 'escape', 'charge'].includes(it)) parts.push(it);
    return parts.length ? parts : ['unknown'];
  };

  const C = UI.combat = { g: null, busy: false, selected: null, target: null, els: {} };

  UI.screens.combat = function () {
    const run = UI.run;
    const rm = run.room;
    const g = JG.R.makeCombat(run);
    C.g = g; C.busy = false; C.selected = null; C.target = null; C.handEls = new Map(); C.entEls = new Map(); C.dispHand = [];
    const kind = rm.kind;
    UI.audio.setMood(kind === 'boss' ? 'boss' : kind === 'elite' ? 'elite' : 'combat');
    for (const e of g.enemies) JG.Meta.seeEnemy(e.id);
    const act = JG.actInfo(run.act);
    const scr = h('div', { class: 'screen combat fade-in' });
    C.scr = scr;
    const scene = UI.sceneLayer(run.act, act.bg, run.act === 3 ? 'act3' : '');
    scr.appendChild(scene);
    scr.appendChild(h('div', { class: 'ground' }));
    C.field = h('div', { class: 'field', style: { position: 'absolute', inset: 0 } });
    scr.appendChild(C.field);
    // 오행 바퀴
    C.wheel = buildWheel();
    scr.appendChild(C.wheel.el);
    // 기력
    C.energy = h('div', { class: 'energy has-tip' }, h('div', { class: 'v' }, '3'), h('div', { class: 'lbl' }, '기력'));
    UI.setTip(C.energy, '<div class="tt-h">기력</div>카드를 쓰는 데 필요합니다. 매 턴 다시 차오릅니다.');
    scr.appendChild(C.energy);
    // 더미
    C.drawPile = h('div', { class: 'pile draw' }, h('div', { class: 'stack' }), h('div', { class: 'n' }, '0'), h('div', { class: 'lbl' }, '뽑을 더미'));
    C.discardPile = h('div', { class: 'pile discard' }, h('div', { class: 'stack' }), h('div', { class: 'n' }, '0'), h('div', { class: 'lbl' }, '버린 더미'));
    C.exhaustPile = h('div', { class: 'pile exhaust has-tip' }, h('div', { class: 'n' }, ''));
    UI.setTip(C.exhaustPile, '<div class="tt-h">소멸</div>이번 전투에서 사라진 카드');
    C.drawPile.addEventListener('click', () => UI.deckView(1));
    C.discardPile.addEventListener('click', () => UI.deckView(2));
    C.exhaustPile.addEventListener('click', () => UI.deckView(3));
    scr.append(C.drawPile, C.discardPile, C.exhaustPile);
    // 턴 종료
    C.endBtn = h('button', { class: 'btn gold endturn' }, '턴 종료');
    C.endBtn.addEventListener('click', () => C.endTurn());
    scr.appendChild(C.endBtn);
    // 추천 수 (봇이 생각한 다음 한 수를 반짝여 보여 줌)
    const hintBtn = h('button', { class: 'btn small hintbtn' }, '추천 수');
    UI.setTip(hintBtn, '<div class="tt-h">추천 수 (H)</div>자동 플레이 봇이 고른 다음 카드를 반짝여 보여 줍니다. 따를지는 자유!');
    hintBtn.addEventListener('click', () => C.showHint());
    scr.appendChild(hintBtn);
    // 손패
    C.hand = h('div', { class: 'hand' });
    scr.appendChild(C.hand);
    C.hint = h('div', { class: 'hand-hint hidden' });
    scr.appendChild(C.hint);
    C.arrow = document.createElementNS(NS, 'svg');
    C.arrow.setAttribute('class', 'target-arrow');
    C.arrow.setAttribute('width', UI.W); C.arrow.setAttribute('height', UI.H);
    scr.appendChild(C.arrow);
    C.fx = h('div', { class: 'fx-layer' });
    scr.appendChild(C.fx);
    UI.stage.appendChild(scr);
    UI.topbar();
    // 플레이어
    buildPlayer();
    layoutEnemies(true);
    scr.addEventListener('pointerdown', onBackgroundDown);
    scr.addEventListener('contextmenu', (e) => { e.preventDefault(); C.cancelSelect(); });
    UI.cleanup = () => { C.g = null; window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    // 시작 (보스·강적은 등장 대사부터)
    const introE = g.enemies.find((e) => D.enemies[e.id].intro && (D.enemies[e.id].type !== 'normal'));
    const begin = () => { g.start(); C.play(true).then(() => { if (JG.Meta.data.settings.tips && !JG.Meta.data.tutorial.combat) UI.tutorial(); }); };
    if (introE) {
      const bi = h('div', { class: 'bossintro' }, h('div', { class: 'bar' }, h('div', { class: 'nm' }, introE.name), h('div', { class: 'ln' }, D.enemies[introE.id].intro)));
      C.busy = true;
      scr.appendChild(bi);
      UI.sfx('enemyturn');
      let done = false;
      const go = () => { if (done) return; done = true; bi.remove(); begin(); };
      bi.addEventListener('click', go);
      setTimeout(go, 3200 / Math.max(1, UI.speed() / 1.5));
    } else begin();
  };

  // ── 배치값: 가로(1280×720) / 세로(720×1280) ──
  function LAY() {
    if (UI.vert) {
      const dy = UI.H - 1280, H = UI.H;
      return { pl: { left: 14, top: 516 + dy, w: 210, artH: 222 }, eBase: 432 + Math.round(dy * 0.55), ex0: 10, ex1: 710, eSlot: 236, artK: 0.9 + Math.min(0.12, dy / 2000),
        hand: { cx: 360, maxW: 450, maxW8: 450, y: H - 248, hovY: H - 262, selY: H - 280, sc: 1.22, hsc: 1.5, ssc: 1.42 }, commitY: H - 430, drawFrom: [440, 716 + dy], discardTo: [560, 716 + dy] };
    }
    return { pl: { left: 170, top: 150, w: 240, artH: 270 }, eBase: 420, ex0: 560, ex1: 1250, eSlot: 240, artK: 1,
      hand: { cx: 690, maxW: 660, maxW8: 600, y: 488, hovY: 452, selY: 440 }, commitY: 470, drawFrom: [30, 620], discardTo: [1160, 600] };
  }
  C.LAY = LAY;
  // 화면 방향이 바뀌면 전투 요소를 다시 배치
  C.relayout = function () {
    const g = C.g;
    if (!g || !C.scr) return;
    const run = UI.run;
    const act = JG.actInfo(run.act);
    const oldScene = C.scr.querySelector('.scene');
    if (oldScene) oldScene.replaceWith(UI.sceneLayer(run.act, act.bg, run.act === 3 ? 'act3' : ''));
    C.arrow.setAttribute('width', UI.W); C.arrow.setAttribute('height', UI.H);
    UI.clear(C.field);
    C.entEls.clear();
    buildPlayer();
    layoutEnemies(true);
    refreshIntents();
    positionHand();
    refreshHud();
  };

  // ── 플레이어·적 요소 ──
  function buildPlayer() {
    const g = C.g;
    const ch = D.chars[UI.run.char];
    const L = LAY().pl;
    const el = h('div', { class: 'ent player', style: { left: L.left + 'px', top: L.top + 'px', width: L.w + 'px' } });
    const art = h('div', { class: 'art', style: { height: L.artH + 'px', width: L.w + 'px' } });
    art.appendChild(h('div', { class: 'shadow' }));
    const p = UI.portrait(ch.img, ch.name[0]);
    while (p.firstChild) art.appendChild(p.firstChild);
    el.appendChild(art);
    const info = buildInfo(g.p, ch.name);
    el.appendChild(info.box);
    C.incoming = h('div', { class: 'incoming' });
    UI.setTip(C.incoming, () => '<div class="tt-h">들어올 피해</div>적들이 이번 차례에 공격하겠다고 보여 준 피해의 합입니다. 방어로 막을 수 있습니다.');
    info.hp.parentNode.appendChild(C.incoming);
    C.field.appendChild(el);
    C.entEls.set('p', { el, art, ...info, ent: g.p });
    refreshEnt('p', g.snap(g.p));
  }
  function buildInfo(ent, name) {
    const nm = h('div', { class: 'nm' }, name);
    const hp = h('div', { class: 'hpbar' }, h('div', { class: 'lag' }), h('div', { class: 'burnfill' }), h('div', { class: 'fill' }), h('div', { class: 'preview' }), h('div', { class: 'txt' }), h('div', { class: 'blockbadge' }));
    const sts = h('div', { class: 'sts' });
    const box = h('div', { class: 'info' }, nm, h('div', { style: { position: 'relative' } }, hp), sts);
    return { box, nm, hp, sts };
  }
  function enemyArtSize(e) {
    const d = D.enemies[e.id];
    return Math.round((d.type === 'boss' ? 300 : d.type === 'elite' ? 260 : 215) * LAY().artK);
  }
  function buildEnemy(e) {
    const ed = D.enemies[e.id];
    const size = enemyArtSize(e);
    const el = h('div', { class: 'ent enemy', style: { top: (LAY().eBase - size) + 'px', width: '210px' } });
    const art = h('div', { class: 'art', style: { height: size + 'px', width: '210px' } });
    art.appendChild(h('div', { class: 'shadow' }));
    const p = UI.portrait(e.data.img || ed.img, e.name[0]);
    while (p.firstChild) art.appendChild(p.firstChild);
    art.appendChild(h('div', { class: 'weakmark' }, '약점!'));
    art.appendChild(h('div', { class: 'dmgpreview' }));
    el.appendChild(art);
    const intent = h('div', { class: 'intent' });
    art.appendChild(intent);
    const info = buildInfo(e, e.name);
    el.appendChild(info.box);
    const seal = h('span', { class: 'elseal' });
    info.nm.prepend(seal);
    el.addEventListener('pointerenter', () => { if (C.selected && C.g.needsTarget(C.selected)) setTarget(e.uid); });
    el.addEventListener('click', (ev) => { ev.stopPropagation(); onEnemyClick(e.uid); });
    UI.setTip(info.nm, () => enemyTip(e));
    C.field.appendChild(el);
    const rec = { el, art, intent, seal, ...info, ent: e };
    C.entEls.set(e.uid, rec);
    return rec;
  }
  function enemyTip(e) {
    const ed = D.enemies[e.id];
    const el = e.el || 'none';
    const info = JG.ELINFO[el];
    const weak = el !== 'none' ? JG.beatenBy(el) : null;
    let s = `<div class="tt-h">${e.name}</div>`;
    s += `<div>원소: <b style="color:${info.color}">${info.name}(${info.hanja})</b>${weak ? ` · 약점: <b style="color:${JG.ELINFO[weak].color}">${JG.ELINFO[weak].name}(${JG.ELINFO[weak].hanja})</b> 공격 1.5배` : ''}</div>`;
    if (ed.desc) s += `<div class="tt-sec">${UI.kwHtml(ed.desc)}</div>`;
    return s;
  }
  function layoutEnemies(first) {
    const g = C.g;
    const list = g.enemies.filter((e) => !e.dead && !e.escaped || C.entEls.has(e.uid) && C.entEls.get(e.uid).dying);
    const vis = g.enemies.filter((e) => (!e.dead && !e.escaped));
    for (const e of vis) if (!C.entEls.has(e.uid)) buildEnemy(e);
    const n = vis.length;
    const LA = LAY();
    const x0 = LA.ex0, x1 = LA.ex1;
    const slot = n ? Math.min(LA.eSlot, (x1 - x0) / n) : LA.eSlot;
    const start = x0 + ((x1 - x0) - slot * n) / 2;
    vis.forEach((e, i) => {
      const rec = C.entEls.get(e.uid);
      const cx = start + slot * i + slot / 2;
      rec.el.style.left = (cx - 105) + 'px';
      if (first) rec.el.style.transition = 'none';
      requestAnimationFrame(() => { rec.el.style.transition = ''; });
    });
    for (const e of vis) refreshEnt(e.uid, g.snap(e));
    void list;
  }

  // 체력·방어·상태 다시 그리기 (snap: 그 순간 값)
  function refreshEnt(uid, snap) {
    const rec = C.entEls.get(uid);
    if (!rec || !snap) return;
    const pct = (v) => Math.max(0, Math.min(100, v / snap.maxHp * 100));
    rec.hp.querySelector('.fill').style.width = pct(snap.hp) + '%';
    rec.hp.querySelector('.lag').style.width = pct(snap.hp) + '%';
    const burn = snap.st.burn || 0;
    const bf = rec.hp.querySelector('.burnfill');
    if (burn) { const b = Math.min(burn, snap.hp); bf.style.left = pct(snap.hp - b) + '%'; bf.style.width = (pct(snap.hp) - pct(snap.hp - b)) + '%'; bf.style.display = ''; }
    else bf.style.display = 'none';
    rec.hp.querySelector('.txt').textContent = `${Math.max(0, snap.hp)}/${snap.maxHp}`;
    const bb = rec.hp.querySelector('.blockbadge');
    bb.textContent = snap.block || '';
    rec.hp.classList.toggle('has-block', snap.block > 0);
    // 상태
    const want = Object.keys(snap.st).filter((k) => snap.st[k] && D.statuses[k]);
    UI.clear(rec.sts);
    for (const k of want) {
      const sd = D.statuses[k];
      const n = snap.st[k];
      const neg = (k === 'sharp' || k === 'sturdy') && n < 0;
      const cls = sd.kind === 'power' ? 'power' : (sd.kind === 'debuff' || neg) ? 'debuff' : 'buff';
      const st = h('div', { class: 'st ' + cls }, sd.icon, sd.flag ? null : h('b', null, String(n)));
      UI.setTip(st, UI.statusTip(k, n));
      rec.sts.appendChild(st);
    }
    if (uid !== 'p') {
      const e = rec.ent;
      const el = e.el || 'none';
      rec.seal.textContent = JG.ELINFO[el].hanja;
      rec.seal.style.setProperty('--elc', JG.ELINFO[el].color);
      rec.seal.className = 'elseal ' + el;
      if (rec.nm.lastChild && rec.nm.lastChild.nodeType === 3) rec.nm.lastChild.textContent = e.name;
    }
  }
  function popStatus(uid, id) {
    const rec = C.entEls.get(uid);
    if (!rec) return;
    const sd = D.statuses[id];
    const idx = Array.from(rec.sts.children).find((x) => x.textContent.startsWith(sd.icon));
    if (idx) { idx.classList.remove('pop'); void idx.offsetWidth; idx.classList.add('pop'); }
  }
  function refreshIncoming() {
    const g = C.g;
    if (!g || !C.incoming) return;
    let inc = 0;
    for (const e of g.alive()) { const it = g.intentOf(e); if (it && it.dmg !== undefined && !it.stunned) inc += it.dmg * (it.hits || 1); }
    C.incoming.classList.toggle('on', inc > 0 && g.phase === 'player');
    const left = Math.max(0, inc - g.p.block);
    C.incoming.classList.toggle('safe', left === 0);
    C.incoming.innerHTML = left === 0 ? `⚔ ${inc} 막음` : `⚔ ${inc}${g.p.block ? ` → ${left}` : ''}`;
  }
  function refreshIntents() {
    const g = C.g;
    refreshIncoming();
    for (const e of g.enemies) {
      const rec = C.entEls.get(e.uid);
      if (!rec || e.dead || e.escaped) continue;
      const it = g.intentOf(e);
      if (!it) { rec.intent.classList.add('hidden'); continue; }
      rec.intent.classList.remove('hidden');
      const icons = intentIcons(it.it);
      let html = icons.map((k) => INTENT_SVG[k]).join('');
      let total = 0;
      if (it.dmg !== undefined) { html += `<span>${it.dmg}${it.hits > 1 ? '×' + it.hits : ''}</span>`; total = it.dmg * (it.hits || 1); }
      if (it.stunned) html = '<span style="color:#ffe08a">기절</span>';
      rec.intent.innerHTML = html;
      rec.intent.className = 'intent' + (it.dmg !== undefined ? ' atk' : '') + (total >= 25 ? ' big' : '');
      UI.setTip(rec.intent, `<div class="tt-h">${it.name}</div>${IT_TEXT[it.it] || ''}${it.dmg !== undefined ? ` — ${it.dmg} 피해${it.hits > 1 ? ' × ' + it.hits + '번' : ''}` : ''}${it.stunned ? '<br>기절해서 이번에는 행동하지 못합니다.' : ''}`);
    }
  }

  // ── 오행 바퀴 ──
  function buildWheel() {
    const el = h('div', { class: 'wheel has-tip' });
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '-82 -82 164 164');
    const pos = JG.EL.map((e, i) => { const a = -Math.PI / 2 + i * 2 * Math.PI / 5; return { x: Math.cos(a) * 58, y: Math.sin(a) * 58 }; });
    // 상극 별(옅게)
    const star = document.createElementNS(NS, 'path');
    star.setAttribute('d', [0, 2, 4, 1, 3, 0].map((k, i) => (i ? 'L' : 'M') + pos[k].x + ' ' + pos[k].y).join(' '));
    star.setAttribute('stroke', 'rgba(195,58,41,.28)'); star.setAttribute('stroke-width', '1.2'); star.setAttribute('fill', 'none'); star.setAttribute('stroke-dasharray', '3 4');
    svg.appendChild(star);
    // 상생 고리
    const arcs = [];
    for (let i = 0; i < 5; i++) {
      const a = pos[i], b = pos[(i + 1) % 5];
      const p = document.createElementNS(NS, 'path');
      const mx = (a.x + b.x) / 2 * 1.22, my = (a.y + b.y) / 2 * 1.22;
      p.setAttribute('d', `M${a.x} ${a.y} Q${mx} ${my} ${b.x} ${b.y}`);
      p.setAttribute('stroke', 'rgba(240,214,138,.25)'); p.setAttribute('stroke-width', '3'); p.setAttribute('fill', 'none');
      svg.appendChild(p);
      arcs.push(p);
    }
    const nodes = JG.EL.map((e, i) => {
      const g = document.createElementNS(NS, 'g');
      g.setAttribute('class', 'node');
      const c = document.createElementNS(NS, 'circle');
      c.setAttribute('cx', pos[i].x); c.setAttribute('cy', pos[i].y); c.setAttribute('r', 15);
      c.setAttribute('fill', '#1c1512'); c.setAttribute('stroke', JG.ELINFO[e].color); c.setAttribute('stroke-width', 2.5);
      const t = document.createElementNS(NS, 'text');
      t.setAttribute('x', pos[i].x); t.setAttribute('y', pos[i].y + 6); t.setAttribute('text-anchor', 'middle');
      t.setAttribute('font-size', '16'); t.setAttribute('font-weight', '900'); t.setAttribute('font-family', 'Noto Serif KR, Gungsuh, serif');
      t.setAttribute('fill', JG.ELINFO[e].color);
      t.textContent = JG.ELINFO[e].hanja;
      g.append(c, t);
      svg.appendChild(g);
      return { g, c, t };
    });
    el.appendChild(svg);
    const count = h('div', { class: 'chaincount' }, '');
    const label = h('div', { class: 'chainlabel' }, '연계');
    el.append(count, label);
    UI.setTip(el, () => {
      const g = C.g;
      const nx = g ? g.nextNeeded() : null;
      return `<div class="tt-h">오행 연계</div>목(木) → 화(火) → 토(土) → 금(金) → 수(水) → 목… 순서로 카드를 내면 연계가 이어집니다. 2단계부터 카드의 「연계:」 효과가 발동하고, 5단계에서 <span class="kw">오행순환</span>(기력 +1, 카드 1장, 모든 적에게 피해 6).<div class="tt-sec">지금 연계: ${g ? g.chain.n : 0}단계${nx ? ` · 다음: <b>${nx === 'any' ? '아무 원소' : JG.ELINFO[nx].name + '(' + JG.ELINFO[nx].hanja + ')'}</b>` : ''}${g && g.flags.reverse ? '<br><b style="color:#ff9c86">역류 중: 수→금→토→화→목 순서</b>' : ''}</div><div class="tt-sec tt-sub">점선 별: 상극(이기는 관계) — 목극토 · 토극수 · 수극화 · 화극금 · 금극목</div>`;
    });
    return { el, nodes, arcs, count, label };
  }
  function refreshWheel(chain, cycleFlash) {
    const g = C.g;
    const w = C.wheel;
    const ch = chain || g.chain;
    const nx = g.nx ? (ch.n ? (ch.last === 'wild' ? 'any' : g.nx(ch.last)) : null) : null;
    JG.EL.forEach((e, i) => {
      const nd = w.nodes[i];
      const isLast = ch.last === e && ch.n > 0;
      const isNext = nx === 'any' || nx === e;
      nd.c.setAttribute('r', isLast ? 19 : isNext ? 17 : 15);
      nd.c.setAttribute('fill', isLast ? JG.ELINFO[e].color : isNext ? 'rgba(255,230,160,.18)' : '#1c1512');
      nd.t.setAttribute('fill', isLast ? '#fff' : JG.ELINFO[e].color);
      nd.c.setAttribute('stroke-width', isNext ? 4 : 2.5);
      nd.c.style.filter = isNext ? `drop-shadow(0 0 6px ${JG.ELINFO[e].color})` : '';
    });
    w.arcs.forEach((a, i) => {
      const from = JG.EL[i];
      const lit = ch.n >= 2 && ch.last && (ch.last === JG.EL[(i + 1) % 5]) && !g.flags.reverse;
      a.setAttribute('stroke', lit ? '#ffd76b' : 'rgba(240,214,138,.25)');
      void from;
    });
    w.count.textContent = ch.n ? String(ch.n) : '';
    w.label.textContent = ch.n ? (ch.n >= 5 ? '순환!' : '연계') : '연계';
    w.el.classList.toggle('reverse', !!g.flags.reverse);
  }

  // ── 손패 ──
  const CARD_W = 158, CARD_H = 222;
  function handLayout(n) {
    const out = [];
    const HL = LAY().hand;
    const maxW = n >= 8 ? HL.maxW8 : HL.maxW;
    const gap = n > 1 ? Math.min(CARD_W * 0.86, maxW / (n - 1)) : 0;
    const total = gap * (n - 1);
    const cx = HL.cx;
    for (let i = 0; i < n; i++) {
      const off = i - (n - 1) / 2;
      const x = cx - total / 2 + gap * i - CARD_W / 2;
      const rot = off * Math.min(3.5, 16 / Math.max(n, 1));
      const y = HL.y + Math.abs(off) * Math.abs(off) * 1.6;
      out.push({ x, y, rot });
    }
    return out;
  }
  function cardRecFor(c) {
    let el = C.handEls.get(c.uid);
    if (!el) {
      el = UI.cardEl(c, { g: C.g });
      el.style.left = '0px'; el.style.top = '0px';
      el.addEventListener('pointerdown', (ev) => onCardDown(ev, c.uid));
      el.addEventListener('pointerenter', () => { if (!C.drag) { el.classList.add('hover'); positionHand(); UI.sfx('hover'); } });
      el.addEventListener('pointerleave', () => { el.classList.remove('hover'); positionHand(); });
      C.handEls.set(c.uid, el);
      C.hand.appendChild(el);
    }
    return el;
  }
  function cardByUid(uid) { return C.g.pile.hand.find((x) => x.uid === uid) || C.g.findCard(uid); }
  function positionHand() {
    const list = C.dispHand.map((uid) => C.handEls.get(uid)).filter(Boolean);
    const lay = handLayout(list.length);
    list.forEach((el, i) => {
      const L = lay[i];
      if (C.drag && C.drag.el === el) return;
      const sel = C.selected && el.dataset.uid === C.selected.uid;
      const hov = el.classList.contains('hover') && !C.selected;
      let y = L.y, rot = L.rot, sc = 1;
      const HL2 = LAY().hand;
      if (HL2.sc) sc = HL2.sc;
      if (sel) { y = HL2.selY; rot = 0; sc = HL2.ssc || 1.18; }
      else if (hov) { y = HL2.hovY; rot = 0; sc = HL2.hsc || 1.24; }
      el.style.zIndex = sel ? 55 : hov ? 50 : 10 + i;
      el.style.transform = `translate(${L.x}px, ${y}px) rotate(${rot}deg) scale(${sc})`;
    });
  }
  function syncHand(fromPile) {
    const g = C.g;
    const want = g.pile.hand.map((c) => c.uid);
    // 없어진 카드 제거
    for (const [uid, el] of C.handEls) if (!want.includes(uid) && !C.flying.has(uid)) { el.remove(); C.handEls.delete(uid); }
    // 새 카드: 뽑을 더미에서 날아오는 연출
    for (const c of g.pile.hand) {
      const isNew = !C.handEls.has(c.uid);
      const el = cardRecFor(c);
      if (isNew && fromPile !== false) {
        el.style.transition = 'none';
        el.style.transform = `translate(${LAY().drawFrom[0]}px, ${LAY().drawFrom[1]}px) rotate(-20deg) scale(.35)`;
        el.style.opacity = '0';
        void el.offsetWidth;
        el.style.transition = '';
        el.style.opacity = '1';
      }
    }
    C.dispHand = want.slice();
    positionHand();
    refreshCards();
  }
  C.flying = new Set();
  function refreshCards() {
    const g = C.g;
    for (const c of g.pile.hand) {
      const el = C.handEls.get(c.uid);
      if (el) UI.updateCardEl(el, c, g, C.selected && C.selected.uid === c.uid ? (C.target ? g.byUid(C.target) : null) : null);
    }
  }
  function refreshHud() {
    const g = C.g;
    C.energy.querySelector('.v').innerHTML = `${g.p.energy}<small>/${g.p.emax}</small>`;
    C.energy.classList.toggle('empty', g.p.energy <= 0);
    C.drawPile.querySelector('.n').textContent = g.pile.draw.length;
    C.discardPile.querySelector('.n').textContent = g.pile.discard.length;
    C.exhaustPile.querySelector('.n').textContent = g.pile.exhaust.length ? g.pile.exhaust.length : '';
    C.exhaustPile.style.display = g.pile.exhaust.length ? '' : 'none';
    const playable = g.pile.hand.some((c) => g.canPlay(c));
    C.endBtn.classList.toggle('pulse', g.phase === 'player' && !playable && !g.over);
    C.endBtn.classList.toggle('enemy-phase', g.phase !== 'player' || C.busy);
    refreshIncoming();
    refreshWheel();
    UI.refreshTop(g);
  }
  function fullRefresh() {
    const g = C.g;
    if (!g) return;
    refreshEnt('p', g.snap(g.p));
    for (const e of g.enemies) if (!e.dead && !e.escaped) refreshEnt(e.uid, g.snap(e));
    refreshIntents();
    syncHand();
    refreshHud();
  }

  // ── 카드 고르기·대상·끌기 ──
  function setHint(t) { if (!t) C.hint.classList.add('hidden'); else { C.hint.textContent = t; C.hint.classList.remove('hidden'); } }
  C.select = function (uid) {
    const g = C.g;
    const c = g.pile.hand.find((x) => x.uid === uid);
    if (!c || C.busy) return;
    if (!g.canPlay(c)) {
      UI.sfx('error');
      const d = D.cards[c.id];
      const why = d.unplayable ? '사용할 수 없는 카드입니다.' : (g.cost(c) > g.p.energy ? '기력이 모자랍니다.' : '지금은 쓸 수 없습니다.');
      UI.toast(why, 1200);
      const el = C.handEls.get(uid);
      if (el) UI.anim(el.querySelector('.face'), [{ transform: 'translateX(0)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'translateX(0)' }], 220);
      return;
    }
    C.selected = c;
    C.target = null;
    UI.sfx('select');
    for (const el of C.handEls.values()) el.classList.toggle('selected', el.dataset.uid === uid);
    if (g.needsTarget(c)) {
      setHint('대상을 고르세요 (우클릭·Esc: 취소)');
      markWeak(c);
      const alive = g.alive();
      if (alive.length === 1 || C.keyMode) setTarget(alive[0].uid);
      for (const rec of C.entEls.values()) if (rec.ent !== g.p) rec.el.classList.add('targetable');
    } else {
      setHint('한 번 더 누르거나 위로 끌어 사용 · Enter');
      markWeak(c);
    }
    positionHand();
    refreshCards();
  };
  C.cancelSelect = function () {
    C.selected = null; C.target = null; C.keyMode = false;
    for (const el of C.handEls.values()) el.classList.remove('selected');
    for (const rec of C.entEls.values()) { rec.el.classList.remove('targetable', 'targeted', 'weak-now'); const dp = rec.art && rec.art.querySelector('.dmgpreview'); if (dp) dp.classList.remove('on'); const pv = rec.hp.querySelector('.preview'); pv.style.width = '0'; }
    clearArrow();
    setHint(null);
    positionHand();
    refreshCards();
  };
  function markWeak(c) {
    const d = D.cards[c.id];
    for (const [uid, rec] of C.entEls) {
      if (uid === 'p') continue;
      const e = rec.ent;
      const weak = d.type === 'atk' && d.el && e.el && JG.beats(d.el === 'wild' ? null : d.el, e.el);
      rec.el.classList.toggle('weak-now', !!weak);
    }
  }
  function setTarget(uid) {
    const g = C.g;
    if (!C.selected) return;
    C.target = uid;
    for (const [u, rec] of C.entEls) {
      if (u === 'p') continue;
      const on = u === uid;
      rec.el.classList.toggle('targeted', on);
      const dp = rec.art.querySelector('.dmgpreview');
      const pv = rec.hp.querySelector('.preview');
      if (on && D.cards[C.selected.id].type === 'atk') {
        const est = estimateDamage(C.selected, rec.ent);
        if (est !== null) {
          dp.textContent = est > 0 ? `-${est}` : '0'; dp.classList.add('on');
          const e = rec.ent;
          const afterBlock = Math.max(0, est - e.block);
          const lost = Math.min(e.hp, afterBlock);
          pv.style.left = Math.max(0, (e.hp - lost) / e.maxHp * 100) + '%';
          pv.style.width = (lost / e.maxHp * 100) + '%';
        } else { dp.classList.remove('on'); pv.style.width = '0'; }
      } else { dp.classList.remove('on'); pv.style.width = '0'; }
    }
    refreshCards();
  }
  // 실제로 한 번 해 보고 되돌려 예상 피해를 잰다(정확)
  function estimateDamage(c, e) {
    const g = C.g;
    try {
      const sn = JG.Bot.snap(g);
      const before = e.hp + e.block;
      const card = g.pile.hand.find((x) => x.uid === c.uid);
      const tgt = g.enemies.find((x) => x.uid === e.uid);
      const uidBefore = JG.uidCounter;
      g.play(card, tgt);
      JG.Bot.resolvePending(g);
      const t2 = g.enemies.find((x) => x.uid === e.uid);
      const after = t2.dead ? 0 : t2.hp + t2.block;
      JG.Bot.restore(g, sn);
      JG.uidCounter = uidBefore;
      // 복원으로 객체가 바뀌었으니 참조 갱신
      relinkAfterRestore();
      return Math.max(0, before - after);
    } catch (err) { console.warn(err); return null; }
  }
  function relinkAfterRestore() {
    const g = C.g;
    for (const [uid, rec] of C.entEls) rec.ent = uid === 'p' ? g.p : (g.enemies.find((x) => x.uid === uid) || rec.ent);
    if (C.selected) C.selected = g.pile.hand.find((x) => x.uid === C.selected.uid) || null;
  }
  function onEnemyClick(uid) {
    const g = C.g;
    if (!C.selected || C.busy) return;
    if (g.needsTarget(C.selected)) { setTarget(uid); C.commit(); }
  }
  function onBackgroundDown(ev) {
    if (C.busy || ev.button === 2) return;
    if (ev.target.closest('.card, .ent.enemy, .btn, .icon-btn, .potion-slot, .pile, .relic, .wheel, .energy')) return;
    if (C.selected && !C.g.needsTarget(C.selected)) {
      const p = UI.toStage(ev.clientX, ev.clientY);
      if (p.y < LAY().commitY) { C.commit(); return; }
    }
    if (C.selected) C.cancelSelect();
  }
  function onCardDown(ev, uid) {
    if (C.busy || ev.button === 2) return;
    ev.stopPropagation();
    const g = C.g;
    const c = g.pile.hand.find((x) => x.uid === uid);
    if (!c) return;
    const p = UI.toStage(ev.clientX, ev.clientY);
    C.press = { uid, x: p.x, y: p.y, t: performance.now(), wasSelected: C.selected && C.selected.uid === uid };
  }
  function onMove(ev) {
    if (!C.g) return;
    const p = UI.toStage(ev.clientX, ev.clientY);
    if (C.press && !C.drag) {
      if (Math.hypot(p.x - C.press.x, p.y - C.press.y) > 12) {
        const c = C.g.pile.hand.find((x) => x.uid === C.press.uid);
        if (c && C.g.canPlay(c)) {
          if (!C.selected || C.selected.uid !== c.uid) C.select(c.uid);
          if (C.selected) {
            const el = C.handEls.get(c.uid);
            C.drag = { el, uid: c.uid, needsT: C.g.needsTarget(c) };
            UI.dragging = true; UI.hideTip();
            if (!C.drag.needsT) el.classList.add('dragging');
          }
        } else if (c) { C.select(c.uid); C.press = null; }
      }
    }
    if (C.drag) {
      if (C.drag.needsT) {
        drawArrow(C.drag.el, p);
        const over = enemyAt(p);
        if (over && over !== C.target) setTarget(over);
        if (!over && C.target) { C.target = null; for (const rec of C.entEls.values()) rec.el.classList.remove('targeted'); refreshCards(); }
      } else {
        C.drag.el.style.transform = `translate(${p.x - CARD_W / 2}px, ${p.y - CARD_H / 2}px) scale(1.1)`;
      }
    } else if (C.selected && C.g.needsTarget(C.selected) && !C.keyMode) {
      const el = C.handEls.get(C.selected.uid);
      if (el) drawArrow(el, p);
    }
  }
  function onUp(ev) {
    if (!C.g) return;
    if (UI.zoomed) { C.press = null; C.drag = null; UI.dragging = false; positionHand(); return; }
    const p = UI.toStage(ev.clientX, ev.clientY);
    if (C.drag) {
      const d = C.drag;
      C.drag = null; UI.dragging = false;
      d.el.classList.remove('dragging');
      if (d.needsT) {
        const over = enemyAt(p);
        if (over) { setTarget(over); C.commit(); }
        else { clearArrow(); }
      } else if (p.y < LAY().commitY - 30) C.commit();
      else positionHand();
      C.press = null;
      return;
    }
    if (C.press) {
      const pr = C.press;
      C.press = null;
      if (pr.wasSelected) {
        const c = C.g.pile.hand.find((x) => x.uid === pr.uid);
        if (c && (!C.g.needsTarget(c) || (C.target && C.g.alive().length === 1))) C.commit();
        else C.cancelSelect();
      } else C.select(pr.uid);
    }
  }
  function enemyAt(p) {
    for (const [uid, rec] of C.entEls) {
      if (uid === 'p' || rec.ent.dead) continue;
      const r = UI.rectOf(rec.el);
      if (p.x >= r.x - 10 && p.x <= r.x + r.w + 10 && p.y >= r.y - 50 && p.y <= r.y + r.h + 10) return uid;
    }
    return null;
  }
  function drawArrow(fromEl, p) {
    const r = UI.rectOf(fromEl);
    const sx = r.cx, sy = r.y + 20;
    const mx = (sx + p.x) / 2, my = Math.min(sy, p.y) - 120;
    C.arrow.innerHTML = `<defs><marker id="ah" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="#ffd76b"/></marker></defs>
      <path d="M${sx} ${sy} Q${mx} ${my} ${p.x} ${p.y}" stroke="rgba(30,10,5,.6)" stroke-width="11" fill="none" stroke-linecap="round"/>
      <path d="M${sx} ${sy} Q${mx} ${my} ${p.x} ${p.y}" stroke="${C.target ? '#ffd76b' : '#f3e5c0'}" stroke-width="5" fill="none" stroke-dasharray="14 9" stroke-linecap="round" marker-end="url(#ah)"/>`;
  }
  function clearArrow() { C.arrow.innerHTML = ''; }

  // 실제로 카드 쓰기
  C.commit = async function () {
    const g = C.g;
    const c = C.selected;
    if (!c || C.busy) return;
    let t = null;
    if (g.needsTarget(c)) { t = C.target ? g.byUid(C.target) : null; if (!t || t.dead) { UI.sfx('error'); return; } }
    const el = C.handEls.get(c.uid);
    C.cancelSelect();
    C.busy = true;
    const ok = g.play(c, t);
    if (!ok) { C.busy = false; UI.sfx('error'); fullRefresh(); return; }
    await C.play();
  };
  C.usePotion = async function (slot) {
    const g = C.g;
    const id = UI.run.potions[slot];
    const pd = D.potions[id];
    if (C.busy || !g.canUsePotion(slot)) return;
    let t = null;
    if (pd.target === 'enemy') {
      const alive = g.alive();
      if (alive.length > 1) {
        setHint('약을 쓸 적을 누르세요 (Esc: 취소)');
        t = await new Promise((res) => {
          const handler = (ev) => { const rec = [...C.entEls.values()].find((r) => r.el.contains(ev.target)); cleanup(); res(rec && rec.ent !== g.p ? rec.ent : null); };
          const esc = (ev) => { if (ev.key === 'Escape') { cleanup(); res(null); } };
          const cleanup = () => { C.scr.removeEventListener('click', handler, true); document.removeEventListener('keydown', esc, true); setHint(null); };
          C.scr.addEventListener('click', handler, true);
          document.addEventListener('keydown', esc, true);
        });
        if (!t) return;
      } else t = alive[0];
    }
    C.busy = true;
    g.usePotion(slot, t);
    UI.sfx('potion');
    await C.play();
  };
  C.endTurn = async function () {
    const g = C.g;
    if (C.busy || g.phase !== 'player' || g.over) return;
    if (JG.Meta.data.settings.confirmEnd && g.pile.hand.some((c) => g.canPlay(c) && JG.cdef(c).cost !== 'X' && (g.cost(c) || 0) <= g.p.energy) && g.p.energy > 0 && !C.skipConfirm) {
      const ok = await UI.confirm('턴을 끝낼까요?', '아직 쓸 수 있는 카드와 기력이 남아 있습니다.', '턴 종료', '돌아가기');
      if (!ok) return;
    }
    C.cancelSelect();
    C.busy = true;
    C.endBtn.classList.add('enemy-phase');
    g.endTurn();
    await C.play();
  };

  C.showHint = function () {
    const g = C.g;
    if (!g || C.busy || g.phase !== 'player') return;
    let plan = [];
    try { plan = JG.Bot.planTurn(g, 4, 6); } catch (e) { plan = []; }
    relinkAfterRestore();
    syncHand(false);
    const mv = plan[0];
    if (!mv) { UI.toast('지금은 턴을 끝내는 게 좋겠습니다.', 1600); C.endBtn.classList.add('pulse'); return; }
    const el = C.handEls.get(mv.uid);
    if (el) { el.classList.remove('hinted'); void el.offsetWidth; el.classList.add('hinted'); setTimeout(() => el.classList.remove('hinted'), 1800); }
    if (mv.tuid) { const rec = C.entEls.get(mv.tuid); if (rec) { rec.el.classList.add('hinted'); setTimeout(() => rec.el.classList.remove('hinted'), 1800); } }
    const c = g.pile.hand.find((x) => x.uid === mv.uid);
    UI.toast(`추천: 「${c ? D.cards[c.id].name : '?'}」${mv.tuid ? ' → ' + (g.byUid(mv.tuid) || {}).name : ''}`, 1800);
  };
  // ── 키보드 ──
  C.onKey = function (e) {
    const g = C.g;
    if (!g || C.busy) return;
    const k = e.key;
    if (k === 'e' || k === 'E' || k === 'ㄷ') { C.endTurn(); return; }
    if (k === 'h' || k === 'H' || k === 'ㅗ') { C.showHint(); return; }
    const num = '1234567890'.indexOf(k);
    if (num >= 0) {
      const uid = C.dispHand[num];
      if (!uid) return;
      if (C.selected && C.selected.uid === uid && (!g.needsTarget(C.selected) || C.target)) { if (g.needsTarget(C.selected) && !C.target) setTarget(g.alive()[0].uid); C.commit(); return; }
      C.keyMode = true;
      C.select(uid);
      return;
    }
    if (C.selected && g.needsTarget(C.selected) && (k === 'ArrowLeft' || k === 'ArrowRight' || k === 'Tab')) {
      e.preventDefault();
      const alive = g.alive();
      let i = alive.findIndex((x) => x.uid === C.target);
      i = (i + (k === 'ArrowLeft' ? -1 : 1) + alive.length) % alive.length;
      setTarget(alive[i].uid);
      return;
    }
    if ((k === 'Enter' || k === ' ') && C.selected) {
      e.preventDefault();
      if (g.needsTarget(C.selected) && !C.target) setTarget(g.alive()[0].uid);
      C.commit();
    }
  };

  // ── 연출 재생 ──
  const W = (ms) => UI.wait(ms);
  function anchorOf(uid) {
    const rec = C.entEls.get(uid);
    if (!rec) return { x: UI.W / 2, y: UI.H * 0.4 };
    const r = UI.rectOf(rec.art);
    return { x: r.cx, y: r.y + r.h * 0.55, top: r.y };
  }
  function floatText(uid, text, cls, dy) {
    const a = anchorOf(uid);
    const el = h('div', { class: 'floatnum ' + (cls || '') , style: { left: (a.x + (Math.random() * 40 - 20)) + 'px', top: (a.y + (dy || 0)) + 'px' } }, text);
    C.fx.appendChild(el);
    UI.anim(el, [{ transform: 'translate(-50%,-50%) scale(1.5)', opacity: 0 }, { transform: 'translate(-50%,-50%) scale(1)', opacity: 1, offset: 0.15 }, { transform: 'translate(-50%,-150%) scale(1)', opacity: 1, offset: 0.7 }, { transform: 'translate(-50%,-220%) scale(.9)', opacity: 0 }], { duration: 1100, easing: 'ease-out' }).then(() => el.remove());
  }
  function stamp(uid, text) {
    const a = anchorOf(uid);
    const el = h('div', { class: 'weakstamp', style: { left: a.x + 40 + 'px', top: a.y - 60 + 'px' } }, text);
    C.fx.appendChild(el);
    UI.anim(el, [{ transform: 'translate(-50%,-50%) rotate(-8deg) scale(2)', opacity: 0 }, { transform: 'translate(-50%,-50%) rotate(-8deg) scale(1)', opacity: 1, offset: 0.2 }, { opacity: 1, offset: 0.75 }, { opacity: 0 }], { duration: 900 }).then(() => el.remove());
  }
  function burst(x, y, color, n) {
    for (let i = 0; i < (n || 10); i++) {
      const b = h('div', { class: 'burst', style: { left: x + 'px', top: y + 'px', background: color } });
      C.fx.appendChild(b);
      const ang = Math.random() * Math.PI * 2, dist = 40 + Math.random() * 70;
      UI.anim(b, [{ transform: 'translate(-50%,-50%) scale(1)', opacity: 1 }, { transform: `translate(calc(-50% + ${Math.cos(ang) * dist}px), calc(-50% + ${Math.sin(ang) * dist}px)) scale(.2)`, opacity: 0 }], { duration: 500 + Math.random() * 300, easing: 'ease-out' }).then(() => b.remove());
    }
  }
  function glyphStamp(ch, at, color) {
    const el = h('div', { class: 'glyphstamp', style: { left: at.x + 'px', top: (at.y - 40) + 'px', color } }, ch);
    C.fx.appendChild(el);
    UI.anim(el, [{ transform: 'translate(-50%,-50%) scale(2.2) rotate(-12deg)', opacity: 0 }, { transform: 'translate(-50%,-50%) scale(1) rotate(-6deg)', opacity: 0.85, offset: 0.18 }, { transform: 'translate(-50%,-50%) scale(1.05) rotate(-6deg)', opacity: 0.6, offset: 0.6 }, { transform: 'translate(-50%,-50%) scale(1.25) rotate(-6deg)', opacity: 0 }], { duration: 700, easing: 'ease-out' }).then(() => el.remove());
  }
  function wispFly(a, b) {
    const el = h('div', { class: 'burst', style: { left: a.x + 'px', top: (a.y - 120) + 'px', width: '18px', height: '18px', background: 'radial-gradient(circle, #e8fbff, #5fb8ff 45%, rgba(60,120,255,0) 70%)' } });
    C.fx.appendChild(el);
    UI.anim(el, [{ transform: 'translate(-50%,-50%) scale(1)', opacity: 1 }, { transform: `translate(calc(-50% + ${b.x - a.x}px), calc(-50% + ${b.y - a.y + 120}px)) scale(1.6)`, opacity: 0.2 }], { duration: 260, easing: 'ease-in' }).then(() => el.remove());
    UI.sfx('fire');
  }
  function shake(big) {
    if (!JG.Meta.data.settings.shake) return;
    C.scr.classList.remove('screen-shake'); void C.scr.offsetWidth;
    if (big) C.scr.classList.add('screen-shake');
  }
  function entAnim(uid, cls, ms) {
    const rec = C.entEls.get(uid);
    if (!rec) return;
    rec.el.classList.remove(cls); void rec.el.offsetWidth; rec.el.classList.add(cls);
    setTimeout(() => rec.el.classList.remove(cls), ms || 450);
  }
  async function banner(text, enemy) {
    const b = h('div', { class: 'banner' + (enemy ? ' enemy' : '') }, h('span', null, text));
    C.scr.appendChild(b);
    await UI.anim(b, [{ opacity: 0, transform: 'scaleY(.3)' }, { opacity: 1, transform: 'scaleY(1)', offset: 0.2 }, { opacity: 1, offset: 0.7 }, { opacity: 0 }], { duration: 900 });
    b.remove();
  }
  async function flyCardTo(uid, target, el) {
    const cardEl = C.handEls.get(uid) || el;
    if (!cardEl) return;
    C.flying.add(uid);
    C.handEls.delete(uid);
    const r = UI.rectOf(cardEl);
    const clone = cardEl;
    clone.classList.remove('hover', 'selected', 'chainable');
    clone.style.transition = 'none';
    clone.style.zIndex = 80;
    const tx = target ? target.x - CARD_W / 2 : UI.W / 2 - CARD_W / 2;
    const ty = target ? target.y - CARD_H / 2 - 30 : UI.H * 0.36;
    const from = `translate(${r.x}px, ${r.y}px) scale(1)`;
    const mid = `translate(${(r.x + tx) / 2}px, ${Math.min(r.y, ty) - 60}px) scale(1.05) rotate(-4deg)`;
    const to = `translate(${tx}px, ${ty}px) scale(.55) rotate(8deg)`;
    await UI.anim(clone, [{ transform: from, opacity: 1 }, { transform: mid, opacity: 1 }, { transform: to, opacity: 0.0 }], { duration: 330, easing: 'cubic-bezier(.3,.6,.4,1)' });
    clone.remove();
    C.flying.delete(uid);
  }
  function elementSfx(el) { if (el && ['wood', 'fire', 'earth', 'metal', 'water', 'wild'].includes(el)) UI.sfx(el); else UI.sfx('card'); }
  async function cycleFx() {
    UI.sfx('cycle');
    const box = h('div', { class: 'cycle-fx' }, h('div', { class: 'ring' }), h('div', { class: 'word' }, '오행순환'));
    C.scr.appendChild(box);
    const ring = box.querySelector('.ring');
    UI.anim(ring, [{ transform: 'scale(.2) rotate(0deg)', opacity: 1 }, { transform: 'scale(6) rotate(200deg)', opacity: 0 }], { duration: 1200, easing: 'ease-out' });
    await UI.anim(box.querySelector('.word'), [{ transform: 'scale(2.2)', opacity: 0, letterSpacing: '1em' }, { transform: 'scale(1)', opacity: 1, letterSpacing: '.25em', offset: 0.25 }, { opacity: 1, offset: 0.75 }, { opacity: 0 }], { duration: 1300 });
    box.remove();
  }

  // 엔진이 쌓은 연출을 차례대로 재생
  C.play = async function (initial) {
    const g = C.g;
    C.busy = true;
    refreshHud();
    let guard = 0;
    while (g.fx.length && guard++ < 2000) {
      const ev = g.fx.shift();
      if (!C.g) return;
      await handle(ev, initial);
    }
    if (!C.g) return;
    // 끝난 뒤 정리
    layoutEnemies();
    fullRefresh();
    C.busy = false;
    refreshHud();
    if (g.pending) { await C.choose(); return; }
    if (g.over) { await C.finish(); return; }
    UI.showNewAch();
  };
  async function handle(ev, initial) {
    const g = C.g;
    switch (ev.t) {
      case 'begin': break;
      case 'turn': {
        refreshIntents();
        if (!initial || ev.n > 1) { UI.sfx('turn'); await banner(ev.n === 1 ? '전투 시작' : '나의 차례'); }
        else { UI.sfx('turn'); await banner('전투 시작'); }
        break;
      }
      case 'enemyPhase': UI.sfx('enemyturn'); await banner('적의 차례', true); break;
      case 'energy': {
        C.energy.querySelector('.v').innerHTML = `${ev.v}<small>/${g.p.emax}</small>`;
        if (ev.gain > 0) { C.energy.classList.remove('gain'); void C.energy.offsetWidth; C.energy.classList.add('gain'); UI.sfx('energy'); }
        break;
      }
      case 'draw': {
        for (const uid of ev.uids) if (!C.dispHand.includes(uid)) C.dispHand.push(uid);
        const g2 = C.g;
        for (const uid of ev.uids) {
          const c = cardByUid(uid);
          if (!c) continue;
          const el = cardRecFor(c);
          el.style.transition = 'none';
          el.style.transform = `translate(${LAY().drawFrom[0]}px, ${LAY().drawFrom[1]}px) rotate(-20deg) scale(.35)`;
          el.style.opacity = '0';
        }
        void C.hand.offsetWidth;
        for (const uid of ev.uids) { const el = C.handEls.get(uid); if (el) { el.style.transition = ''; el.style.opacity = '1'; } }
        positionHand();
        for (const uid of ev.uids) { const el = C.handEls.get(uid); const c = cardByUid(uid); if (el && c) UI.updateCardEl(el, c, g2, null); }
        UI.sfx('draw');
        C.drawPile.querySelector('.n').textContent = Math.max(0, parseInt(C.drawPile.querySelector('.n').textContent, 10) - ev.uids.length);
        await W(Math.min(260, 80 * ev.uids.length + 60));
        break;
      }
      case 'shuffle': UI.sfx('shuffle'); C.drawPile.querySelector('.n').textContent = ev.n; C.discardPile.querySelector('.n').textContent = 0; await W(250); break;
      case 'play': {
        const tgt = ev.target ? anchorOf(ev.target) : null;
        C.dispHand = C.dispHand.filter((u) => u !== ev.uid);
        elementSfx(ev.el);
        const p = flyCardTo(ev.uid, tgt);
        positionHand();
        if (ev.chain && ev.chained) { UI.chainNote(ev.chain, ev.el); }
        else if (ev.chain === 1) UI.chainNote(1, ev.el);
        if (ev.broke) floatText('p', '연계 끊김', 'txt', -80);
        refreshWheel({ n: ev.chain || g.chain.n, last: ev.chain ? (ev.el === 'wild' ? (ev.asEl || 'wild') : ev.el) : g.chain.last });
        if (ev.chain) { C.wheel.el.classList.remove('bump'); void C.wheel.el.offsetWidth; C.wheel.el.classList.add('bump'); }
        await p;
        if (tgt) burst(tgt.x, tgt.y - 30, UI.elColor(ev.el), 8);
        glyphStamp(D.cards[ev.id] ? (D.cards[ev.id].art || '符') : '符', tgt || anchorOf('p'), UI.elColor(ev.el));
        break;
      }
      case 'chain': floatText('p', `연계 ${ev.n}!`, 'txt', -110); break;
      case 'cycle': await cycleFx(); break;
      case 'dmg': {
        const rec = C.entEls.get(ev.who);
        if (!rec) break;
        refreshEnt(ev.who, ev.snap);
        if (ev.kind === 'burn') { floatText(ev.who, `-${ev.amount}`, 'burn'); UI.sfx('burn'); entAnim(ev.who, 'hit', 320); await W(260); break; }
        if (ev.kind === 'wisp') { const a = anchorOf('p'); const b = anchorOf(ev.who); wispFly(a, b); await W(160); }
        if (ev.amount > 0) {
          floatText(ev.who, `-${ev.amount}`, ev.weak ? 'weak' : 'dmg');
          if (ev.weak) { stamp(ev.who, '약점!'); UI.sfx('weak'); }
          UI.sfx(ev.amount >= 20 ? 'bighit' : 'hit');
          entAnim(ev.who, 'hit', 340);
          if (ev.who === 'p') { UI.sfx('hurt'); shake(true); const f = h('div', { class: 'redflash' }); C.scr.appendChild(f); setTimeout(() => f.remove(), 520); }
          else if (ev.amount >= 25) shake(true);
        } else if (ev.blocked > 0) { floatText(ev.who, '막음', 'blocked'); UI.sfx('blocked'); }
        if (ev.blocked > 0 && ev.amount > 0) floatText(ev.who, `(${ev.blocked} 막음)`, 'blocked', 40);
        await W(ev.kind === 'thorns' || ev.kind === 'reflect' ? 160 : 240);
        break;
      }
      case 'block': {
        refreshEnt(ev.who, ev.snap);
        if (ev.amount > 0) { floatText(ev.who, `+${ev.amount}`, 'block', 30); UI.sfx('block'); await W(150); }
        break;
      }
      case 'status': {
        refreshEnt(ev.who, ev.snap);
        const sd = D.statuses[ev.id];
        if (ev.n && sd) {
          const neg = sd.kind === 'debuff' || ev.n < 0;
          floatText(ev.who, `${sd.name} ${ev.n > 0 ? '+' + ev.n : ev.n}`, 'st ' + (neg ? 'debuff' : 'buff'), -40);
          popStatus(ev.who, ev.id);
          UI.sfx(neg ? 'debuff' : 'buff');
          if (ev.id === 'stun') UI.sfx('stun');
          await W(130);
        }
        break;
      }
      case 'immune': floatText(ev.who, '면역', 'txt', -40); await W(150); break;
      case 'heal': refreshEnt(ev.who, ev.snap); floatText(ev.who, `+${ev.amount}`, 'heal'); UI.sfx('heal'); await W(200); break;
      case 'snap': refreshEnt(ev.who, ev.snap); break;
      case 'discard': {
        for (const uid of ev.uids) {
          const el = C.handEls.get(uid);
          C.dispHand = C.dispHand.filter((u) => u !== uid);
          if (!el) continue;
          C.handEls.delete(uid);
          el.style.transition = 'transform .3s ease, opacity .3s';
          el.style.transform = `translate(${LAY().discardTo[0]}px, ${LAY().discardTo[1]}px) rotate(25deg) scale(.3)`;
          el.style.opacity = '0';
          setTimeout(() => el.remove(), 320);
        }
        if (ev.uids.length) { positionHand(); await W(ev.endTurn ? 300 : 120); }
        C.discardPile.querySelector('.n').textContent = g.pile.discard.length;
        break;
      }
      case 'exhaust': {
        const el = C.handEls.get(ev.uid);
        C.dispHand = C.dispHand.filter((u) => u !== ev.uid);
        if (el) {
          C.handEls.delete(ev.uid);
          el.style.transition = 'transform .45s ease, opacity .45s, filter .45s';
          el.style.filter = 'brightness(2) sepia(1) hue-rotate(-20deg) blur(2px)';
          el.style.opacity = '0';
          el.style.transform += ' translateY(-60px) scale(.9)';
          setTimeout(() => el.remove(), 460);
          positionHand();
          UI.sfx('burn');
          await W(200);
        }
        break;
      }
      case 'power': UI.sfx('buff'); floatText('p', '비전', 'txt', -100); break;
      case 'toHand': case 'addCard': {
        const uids = ev.uids || [ev.uid];
        if (ev.t === 'addCard' && ev.where !== 'hand') { floatText('p', `+${D.cards[ev.id].name}`, 'txt', -60); await W(120); break; }
        for (const uid of uids) if (!C.dispHand.includes(uid)) C.dispHand.push(uid);
        for (const uid of uids) { const c = cardByUid(uid); if (c) cardRecFor(c); }
        positionHand();
        await W(150);
        break;
      }
      case 'toDraw': break;
      case 'overdraw': floatText('p', '손패가 가득 찼다', 'txt', -60); break;
      case 'eaten': {
        const el = C.handEls.get(ev.uid);
        C.dispHand = C.dispHand.filter((u) => u !== ev.uid);
        if (el) { C.handEls.delete(ev.uid); const a = anchorOf(ev.who); el.style.transition = 'transform .45s ease-in, opacity .45s'; el.style.transform = `translate(${a.x - 79}px, ${a.y - 111}px) scale(.2)`; el.style.opacity = '0'; setTimeout(() => el.remove(), 470); positionHand(); }
        floatText(ev.who, `「${D.cards[ev.id].name}」 삼킴`, 'txt', -90);
        await W(300);
        break;
      }
      case 'act': {
        const rec = C.entEls.get(ev.who);
        if (!rec) break;
        const mv = h('div', { class: 'movename' }, ev.name);
        rec.art.appendChild(mv);
        setTimeout(() => mv.remove(), 1100 / UI.speed());
        rec.intent.classList.add('hidden');
        if (ev.it && ev.it.startsWith('atk')) { entAnim(ev.who, 'lunge-l', 420); await W(220); }
        else { entAnim(ev.who, 'buffing', 500); await W(280); }
        break;
      }
      case 'stunned': floatText(ev.who, '기절!', 'txt', -50); UI.sfx('stun'); refreshEnt(ev.who, ev.snap); await W(350); break;
      case 'die': {
        const rec = C.entEls.get(ev.who);
        if (rec && ev.who !== 'p') {
          rec.dying = true;
          rec.el.classList.add('dying', 'dead');
          rec.intent.classList.add('hidden');
          UI.sfx('die');
          const a = anchorOf(ev.who);
          burst(a.x, a.y - 40, '#1c1915', 16);
          await W(450);
          setTimeout(() => { rec.el.remove(); C.entEls.delete(ev.who); }, 900);
        }
        break;
      }
      case 'revive': refreshEnt(ev.who, ev.snap); floatText(ev.who, '되살아남!', 'txt', -60); UI.sfx('heal'); await W(400); break;
      case 'spawn': layoutEnemies(); UI.sfx('buff'); await W(300); break;
      case 'escape': {
        const rec = C.entEls.get(ev.who);
        if (rec) { floatText(ev.who, '달아났다!', 'txt', -50); UI.anim(rec.el, [{ transform: 'translateX(0)', opacity: 1 }, { transform: 'translateX(300px)', opacity: 0 }], 600).then(() => { rec.el.remove(); C.entEls.delete(ev.who); }); await W(400); }
        break;
      }
      case 'transform': {
        const rec = C.entEls.get(ev.who);
        if (rec) {
          rec.el.remove(); C.entEls.delete(ev.who);
          const e = g.enemies.find((x) => x.uid === ev.who);
          if (e) { layoutEnemies(); const r2 = C.entEls.get(ev.who); if (r2) { UI.anim(r2.art, [{ filter: 'brightness(3) blur(8px)', transform: 'scale(1.3)' }, { filter: 'none', transform: 'scale(1)' }], 900); } }
          shake(true); UI.sfx('cycle');
          await W(700);
        }
        break;
      }
      case 'elchange': { const rec = C.entEls.get(ev.who); if (rec) { refreshEnt(ev.who, g.snap(rec.ent)); floatText(ev.who, `둔갑: ${JG.ELINFO[ev.el].name}(${JG.ELINFO[ev.el].hanja})`, 'txt', -70); } break; }
      case 'intents': refreshIntents(); break;
      case 'relic': UI.flashRelic(ev.id); await W(120); break;
      case 'potion': UI.refreshTop(g); break;
      case 'msg': { UI.toast(ev.text, ev.big ? 2600 : 1600); if (ev.gold !== undefined) UI.refreshTop(g); await W(ev.big ? 500 : 120); break; }
      case 'choose': break;
      case 'win': case 'lose': break;
      default: break;
    }
  }

  // 전투 중 카드 고르기 창
  C.choose = function () {
    const g = C.g;
    const pd = g.pending;
    return new Promise((resolve) => {
      const wrap = h('div', { class: 'choose-panel' });
      wrap.appendChild(h('h3', null, pd.title));
      wrap.appendChild(h('div', { class: 'hint' }, pd.max > 1 ? `${pd.min === pd.max ? pd.max : pd.min + '~' + pd.max}장 고르세요` : '1장 고르세요'));
      const grid = h('div', { class: 'cardgrid', style: { maxWidth: '1100px' } });
      let picked = [];
      const ok = h('button', { class: 'btn gold', disabled: pd.min > 0 }, '확인');
      for (const c of pd.cands) {
        const el = UI.staticCard(c, () => {
          UI.sfx('select');
          if (picked.includes(c.uid)) picked = picked.filter((u) => u !== c.uid);
          else { if (picked.length >= pd.max) picked.shift(); picked.push(c.uid); }
          grid.querySelectorAll('.card').forEach((x) => x.classList.toggle('picked', picked.includes(x.dataset.uid)));
          ok.disabled = picked.length < pd.min;
          if (pd.max === 1 && pd.min === 1) done();
        });
        el.dataset.uid = c.uid;
        grid.appendChild(el);
      }
      const done = async () => { wrap.remove(); g.resolve(picked); resolve(); await C.play(); };
      ok.addEventListener('click', done);
      wrap.append(grid, h('div', { style: { display: 'flex', gap: '12px' } }, pd.canSkip ? h('button', { class: 'btn', onclick: () => { picked = []; done(); } }, '고르지 않음') : null, pd.max > 1 || pd.min === 0 ? ok : null));
      C.scr.appendChild(wrap);
    });
  };

  // 전투 끝
  C.finish = async function () {
    const g = C.g;
    const run = UI.run;
    C.busy = true;
    JG.Meta.onCombat(run, g);
    JG.R.combatOver(run, g);
    await W(500);
    if (g.result === 'win') {
      UI.sfx('victory');
      await banner(run.room.kind === 'boss' ? '대요괴 퇴치' : '승리');
    } else {
      UI.sfx('defeat');
      await banner('쓰러졌다…', true);
    }
    C.g = null;
    UI.flow();
  };

  // ── 첫 전투 안내 ──
  UI.tutorial = async function () {
    const steps = [
      { at: [470, 300], text: '<b>부적 카드</b>를 눌러 고른 뒤 <b>적</b>을 누르면 사용합니다. 끌어다 놓아도 됩니다. 카드 왼쪽 위 붉은 숫자는 드는 <b>기력</b>입니다.' },
      { at: [200, 330], text: '<b>오행 연계</b> — 목→화→토→금→수→목 순서로 카드를 내면 연계가 이어지고 카드의 <b>「연계:」</b> 효과가 터집니다. 이어질 카드는 손패에서 <b>금빛으로 빛납니다</b>.' },
      { at: [200, 330], text: '한 턴에 다섯 원소를 모두 이으면 <b>오행순환</b>! 기력 +1, 카드 1장, 모든 적에게 피해 6. 왼쪽 아래 오각형이 지금 연계를 보여 줍니다.' },
      { at: [640, 120], text: '적 머리 위 표시는 <b>다음 행동</b>입니다. 칼 그림과 숫자는 공격 피해. 공격이 오면 <b>결계(방어)</b> 카드로 막으세요.' },
      { at: [640, 120], text: '적 이름 옆 동그라미는 <b>원소</b>입니다. 그 원소를 이기는 원소(상극)로 공격하면 <b>약점! 1.5배</b>. 목극토 · 토극수 · 수극화 · 화극금 · 금극목.' },
      { at: [930, 450], text: '할 일을 마쳤으면 <b>턴 종료</b>(E). 남은 손패는 버려지고 다음 턴에 새로 5장을 뽑습니다. 행운을 빕니다!' },
    ];
    for (let i = 0; i < steps.length; i++) {
      const s = steps[i];
      const ok = await new Promise((res) => {
        const dim = h('div', { class: 'coach-dim' });
        const box = h('div', { class: 'coach', style: UI.vert ? { left: '195px', top: (i === 0 ? 640 : i < 3 ? 520 : 140) + 'px' } : { left: s.at[0] + 'px', top: s.at[1] + 'px' } },
          h('div', { class: 'step' }, `안내 ${i + 1} / ${steps.length}`), h('div', { html: s.text }),
          h('div', { class: 'row' }, h('button', { class: 'btn small', onclick: () => { dim.remove(); box.remove(); res(false); } }, '그만 보기'), h('button', { class: 'btn small gold', onclick: () => { dim.remove(); box.remove(); res(true); } }, i === steps.length - 1 ? '시작!' : '다음')));
        UI.stage.append(dim, box);
      });
      if (!ok) break;
    }
    JG.Meta.data.tutorial.combat = true;
    JG.Meta.save();
  };
})();
