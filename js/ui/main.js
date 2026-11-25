'use strict';
// 시작, 화면 전환, 진행 흐름, 상단 막대, 덱 보기, 약 메뉴, 단축키
(function () {
  const D = JG.D;
  const h = UI.h;
  UI.screens = UI.screens || {};
  UI.run = null;

  // ── 화면 전환 ──
  UI.go = function (name, ...args) {
    UI.hideTip();
    UI.cleanup && UI.cleanup();
    UI.cleanup = null;
    UI.modalOpen = null;
    UI.clear(UI.stage);
    UI.cur = name;
    UI.curArgs = args;
    const fn = UI.screens[name];
    if (!fn) throw new Error('no screen ' + name);
    fn(...args);
  };

  // 진행 상태에 맞는 화면으로
  UI.flow = function () {
    const run = UI.run;
    if (!run) { UI.go('title'); return; }
    const t = run.room.type;
    if (t === 'victory' || t === 'defeat') { UI.endRun(t === 'victory'); return; }
    JG.Meta.saveRun(run);
    JG.Meta.onRunState(run);
    UI.showNewAch();
    const map = { map: 'map', combat: 'combat', reward: 'reward', event: 'event', shop: 'shop', rest: 'rest', treasure: 'treasure', bossRelic: 'bossRelic' };
    UI.go(map[t] || 'map');
  };
  UI.endRun = function (won) {
    const run = UI.run;
    run.stats.endedAt = run.stats.endedAt || Date.now();
    const res = JG.Meta.onRunEnd(run, won);
    UI.run = null;
    UI.go('result', run, won, res);
  };
  UI.newRun = function (opts) {
    UI.run = JG.R.newRun(opts);
    JG.Meta.saveRun(UI.run);
    UI.flow();
  };
  UI.showNewAch = function () {
    for (const id of JG.Meta.popNew()) {
      const a = JG.ACH.find((x) => x.id === id);
      if (a) { UI.toast(`<span style="color:var(--brass-hi)">업적 달성</span> · <b>${a.name}</b>`, 3200); UI.sfx('relic'); }
    }
  };

  // ── 상단 막대 ──
  UI.topbar = function (opts) {
    opts = opts || {};
    const run = UI.run;
    const ch = D.chars[run.char];
    const bar = h('div', { class: 'topbar' });
    const face = h('div', { class: 'face', style: UI.bgStyle(ch.img) });
    bar.appendChild(h('div', { class: 'who' }, face, h('span', null, `${ch.title} ${ch.name}`)));
    const hp = h('div', { class: 'tb-stat tb-hp has-tip' }, h('span', { class: 'ic' }, '❤'), h('span', { class: 'num v' }, `${run.hp}/${run.maxHp}`));
    UI.setTip(hp, '<div class="tt-h">체력</div>0이 되면 여정이 끝납니다.');
    const gold = h('div', { class: 'tb-stat tb-gold has-tip' }, h('span', { class: 'ic' }, '🪙'), h('span', { class: 'num v' }, String(run.gold)));
    UI.setTip(gold, '<div class="tt-h">엽전</div>장터에서 카드·신물·약을 사거나 카드를 없앨 때 씁니다.');
    const pots = h('div', { class: 'potions' });
    run.potions.forEach((id, i) => {
      const slot = h('div', { class: 'potion-slot' + (id ? ' full' : '') }, id ? D.potions[id].icon : '');
      slot.dataset.slot = i;
      if (id) {
        UI.setTip(slot, `<div class="tt-h">${D.potions[id].icon} ${D.potions[id].name}</div>${UI.kwHtml(D.potions[id].desc)}`);
        slot.addEventListener('click', (e) => { e.stopPropagation(); UI.potionMenu(i, slot); });
      } else UI.setTip(slot, '<div class="tt-h">빈 약 자리</div>');
      pots.appendChild(slot);
    });
    const act = JG.actInfo(run.act);
    const where = h('div', { class: 'tb-where', html: `<b>${act.title}</b> · ${act.name} — ${run.floor ? run.floor + '층' : '출발'}${run.asc ? ` · <span style="color:#ff8d7a">업보 ${run.asc}</span>` : ''}${run.mode === 'daily' ? ' · 일일 도전' : ''}${run.mode === 'endless' ? ' · 무한 저승' : ''}` });
    const btns = h('div', { class: 'tb-btns' });
    const mapBtn = h('button', { class: 'icon-btn', onclick: () => UI.mapOverlay() }, '圖');
    UI.setTip(mapBtn, '<div class="tt-h">지도 (M)</div>');
    const deckBtn = h('button', { class: 'icon-btn', onclick: () => UI.deckView() }, '牌', h('span', { class: 'badge' }, String(run.deck.length)));
    UI.setTip(deckBtn, '<div class="tt-h">덱 보기 (D)</div>');
    const menuBtn = h('button', { class: 'icon-btn', onclick: () => UI.gameMenu() }, '☰');
    UI.setTip(menuBtn, '<div class="tt-h">메뉴 (Esc)</div>');
    if (opts.noMap) mapBtn.disabled = true;
    btns.append(mapBtn, deckBtn, menuBtn);
    bar.append(hp, gold, pots, where, btns);
    UI.stage.appendChild(bar);
    UI.stage.appendChild(UI.relicBar());
    UI.tb = { bar, hp: hp.querySelector('.v'), gold: gold.querySelector('.v'), pots };
    return bar;
  };
  UI.refreshTop = function (g) {
    if (!UI.tb || !UI.run) return;
    const run = UI.run;
    const hp = g ? g.p.hp : run.hp, max = g ? g.p.maxHp : run.maxHp;
    UI.tb.hp.textContent = `${hp}/${max}`;
    UI.tb.gold.textContent = String(run.gold);
    UI.tb.pots.querySelectorAll('.potion-slot').forEach((slot, i) => {
      const id = run.potions[i];
      slot.className = 'potion-slot' + (id ? ' full' : '');
      slot.textContent = id ? D.potions[id].icon : '';
      UI.setTip(slot, id ? `<div class="tt-h">${D.potions[id].icon} ${D.potions[id].name}</div>${UI.kwHtml(D.potions[id].desc)}` : '<div class="tt-h">빈 약 자리</div>');
      slot.onclick = id ? (e) => { e.stopPropagation(); UI.potionMenu(i, slot); } : null;
    });
    const rb = UI.$('.relicbar');
    if (rb) rb.replaceWith(UI.relicBar());
  };
  UI.relicTip = function (id, r) {
    const rd = D.relics[id];
    const tier = { starter: '시작', common: '일반', uncommon: '고급', rare: '희귀', boss: '보스', shop: '장터', event: '사건' }[rd.rar] || '';
    return `<div class="tt-h">${rd.icon} ${rd.name}</div>${UI.kwHtml(rd.desc)}<div class="tt-sub" style="margin-top:4px">${tier} 신물${r && r.used ? ' · 사용함' : ''}</div>`;
  };
  UI.relicBar = function () {
    const run = UI.run;
    const rb = h('div', { class: 'relicbar' });
    for (const r of run.relics) {
      const rd = D.relics[r.id];
      if (!rd) continue;
      const el = h('div', { class: 'relic' + (r.used ? ' used' : '') }, rd.icon);
      el.dataset.relic = r.id;
      if ((r.id === 'r_bamboo_flute' || r.id === 'r_seven_star' || r.id === 'r_shaman_knife') && r.n) el.appendChild(h('span', { class: 'cnt' }, String(r.id === 'r_bamboo_flute' ? r.n % 3 : r.c || 0)));
      UI.setTip(el, () => UI.relicTip(r.id, r));
      rb.appendChild(el);
    }
    return rb;
  };
  UI.flashRelic = function (id) {
    const el = UI.$(`.relic[data-relic="${id}"]`);
    if (el) { el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); }
    UI.sfx('relic');
  };

  // ── 약 메뉴 ──
  UI.potionMenu = function (slot, anchor) {
    const run = UI.run;
    const id = run.potions[slot];
    if (!id) return;
    const pd = D.potions[id];
    const inCombat = UI.cur === 'combat' && UI.combat && UI.combat.g && !UI.combat.g.over;
    const canUse = inCombat ? UI.combat.g.canUsePotion(slot) && !UI.combat.busy : !!pd.useOut;
    const body = h('div', { style: { fontSize: '15px', color: 'var(--paper-2)', marginBottom: '16px', lineHeight: '1.5' }, html: UI.kwHtml(pd.desc) });
    UI.modal({ title: `${pd.icon} ${pd.name}`, body, buttons: [
      { label: '버리기', value: 'drop' },
      { label: '닫기', value: null },
      ...(canUse ? [{ label: '사용', cls: 'gold', value: 'use' }] : []),
    ] }).then((v) => {
      if (v === 'drop') { JG.R.discardPotion(run, slot); UI.refreshTop(inCombat ? UI.combat.g : null); JG.Meta.saveRun(run); }
      else if (v === 'use') {
        if (inCombat) UI.combat.usePotion(slot);
        else { JG.R.usePotionOut(run, slot); UI.sfx('potion'); UI.refreshTop(); JG.Meta.saveRun(run); UI.toast(`${pd.name} 사용`); }
      }
    });
  };

  // ── 덱 보기 ── (전투 중이면 더미별)
  UI.deckView = function (startTab) {
    if (UI.$('.deckview')) { UI.$('.deckview').remove(); return; }
    const run = UI.run;
    const g = UI.cur === 'combat' && UI.combat ? UI.combat.g : null;
    const wrap = h('div', { class: 'deckview' });
    const tabs = h('div', { class: 'tabs' });
    const body = h('div', { class: 'dv-body scroll-y' });
    const sortCards = (arr) => arr.slice().sort((a, b) => {
      const da = D.cards[a.id], db = D.cards[b.id];
      const to = { atk: 0, skill: 1, power: 2, status: 3, curse: 4 };
      return (to[da.type] - to[db.type]) || (JG.EL.indexOf(da.el) - JG.EL.indexOf(db.el)) || da.name.localeCompare(db.name);
    });
    const sets = g ? [
      ['덱 전체', () => sortCards(run.deck)],
      [`뽑을 더미 (${g.pile.draw.length})`, () => sortCards(g.pile.draw)],
      [`버린 더미 (${g.pile.discard.length})`, () => g.pile.discard.slice().reverse()],
      [`소멸 (${g.pile.exhaust.length})`, () => g.pile.exhaust.slice()],
    ] : [['덱 전체', () => sortCards(run.deck)]];
    let cur = startTab || 0;
    const render = () => {
      UI.clear(body);
      tabs.querySelectorAll('.tab').forEach((t, i) => t.classList.toggle('on', i === cur));
      const list = sets[cur][1]();
      const grid = h('div', { class: 'cardgrid' });
      if (!list.length) grid.appendChild(h('div', { style: { color: 'var(--ink-3)', padding: '60px' } }, '비어 있습니다.'));
      for (const c of list) grid.appendChild(UI.staticCard(c));
      body.appendChild(grid);
    };
    sets.forEach((s, i) => tabs.appendChild(h('button', { class: 'tab', onclick: () => { cur = i; render(); } }, s[0])));
    const counts = {};
    for (const c of run.deck) { const t = D.cards[c.id].type; counts[t] = (counts[t] || 0) + 1; }
    const sum = `공격 ${counts.atk || 0} · 술법 ${counts.skill || 0} · 비전 ${counts.power || 0}${counts.curse ? ' · 저주 ' + counts.curse : ''}`;
    wrap.append(h('div', { class: 'dv-head' }, h('h3', null, `덱 ${run.deck.length}장`), h('span', { style: { color: 'var(--paper-2)' } }, sum), tabs),
      body, h('div', { class: 'dv-foot' }, h('button', { class: 'btn', onclick: () => wrap.remove() }, '닫기 ', h('span', { class: 'key' }, 'Esc'))));
    UI.stage.appendChild(wrap);
    render();
  };

  // 덱에서 카드 고르기 (강화·제거·변화 등) → Promise(uid 배열 | null)
  UI.pickFromDeck = function (o) {
    return new Promise((resolve) => {
      const run = UI.run;
      const wrap = h('div', { class: 'deckview' });
      const body = h('div', { class: 'dv-body scroll-y' });
      const grid = h('div', { class: 'cardgrid' });
      const cands = run.deck.filter(o.filter || (() => true));
      let picked = [];
      const confirmBtn = h('button', { class: 'btn gold', disabled: true }, o.confirm || '확인');
      for (const c of cands) {
        const show = o.preview === 'upgrade' ? Object.assign({}, c, { up: 1 }) : c;
        const el = UI.staticCard(show, () => {
          UI.sfx('select');
          if (picked.includes(c.uid)) picked = picked.filter((u) => u !== c.uid);
          else { if (picked.length >= (o.count || 1)) picked.shift(); picked.push(c.uid); }
          grid.querySelectorAll('.card').forEach((x) => x.classList.toggle('picked', picked.includes(x.dataset.uid)));
          confirmBtn.disabled = picked.length < (o.count || 1);
        });
        el.dataset.uid = c.uid;
        grid.appendChild(el);
      }
      if (!cands.length) grid.appendChild(h('div', { style: { color: 'var(--ink-3)', padding: '60px' } }, '고를 수 있는 카드가 없습니다.'));
      body.appendChild(grid);
      confirmBtn.onclick = () => { wrap.remove(); resolve(picked); };
      const cancel = o.canCancel === false ? null : h('button', { class: 'btn', onclick: () => { wrap.remove(); resolve(null); } }, '취소');
      wrap.append(h('div', { class: 'dv-head' }, h('h3', null, o.title || '카드 고르기'), h('span', { style: { color: 'var(--paper-2)' } }, o.sub || '')),
        body, h('div', { class: 'dv-foot' }, cancel, confirmBtn));
      if (!cands.length) { confirmBtn.disabled = false; confirmBtn.textContent = '넘어가기'; }
      UI.stage.appendChild(wrap);
    });
  };

  // ── 게임 메뉴 ──
  UI.gameMenu = async function () {
    if (UI.modalOpen && UI.modalOpen.isConnected) return;
    const v = await UI.modal({ title: '메뉴', text: UI.run ? `씨앗: <b style="user-select:text">${UI.run.seed}</b>` : '', buttons: [
      { label: '설정', value: 'settings' },
      { label: '여정 포기', value: 'abandon' },
      { label: '저장하고 나가기', value: 'quit' },
      { label: '계속하기', cls: 'gold', value: null },
    ] });
    if (v === 'settings') UI.settingsModal();
    else if (v === 'quit') { if (UI.run) JG.Meta.saveRun(UI.run); UI.run = null; UI.audio.setMood('title'); UI.go('title'); }
    else if (v === 'abandon') {
      const ok = await UI.confirm('여정 포기', '이번 여정을 포기하고 결과를 기록합니다. 되돌릴 수 없습니다.', '포기한다', '취소');
      if (ok && UI.run) { JG.R.finish(UI.run, false); UI.run.room.by = ['포기']; UI.endRun(false); }
    }
  };

  // ── 지도 겹쳐 보기 ──
  UI.mapOverlay = function () {
    if (UI.cur === 'map') return;
    if (UI.$('.map-overlay')) { UI.$('.map-overlay').remove(); return; }
    const wrap = h('div', { class: 'map-overlay deckview' });
    const inner = h('div', { class: 'mapscreen', style: { position: 'absolute', inset: '0' } });
    UI.buildMap(inner, true);
    wrap.appendChild(inner);
    wrap.appendChild(h('button', { class: 'btn', style: { position: 'absolute', right: '30px', bottom: '24px', zIndex: 10 }, onclick: () => wrap.remove() }, '닫기 ', h('span', { class: 'key' }, 'M')));
    UI.stage.appendChild(wrap);
  };

  // ── 단축키 ──
  document.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    const k = e.key;
    if (k === 'Escape') {
      const top = UI.$('.deckview') || UI.$('.modal-back');
      if (top) { top.remove(); UI.modalOpen = null; return; }
      if (UI.combat && UI.cur === 'combat' && UI.combat.cancelSelect && UI.combat.selected) { UI.combat.cancelSelect(); return; }
      if (UI.run && UI.cur !== 'title') UI.gameMenu();
      return;
    }
    if (UI.$('.modal-back') || UI.$('.choose-panel')) return;
    if (!UI.run) return;
    if ((k === 'd' || k === 'D' || k === 'ㅇ') && !UI.$('.map-overlay')) { UI.deckView(); return; }
    if ((k === 'm' || k === 'M' || k === 'ㅡ') && !UI.$('.deckview:not(.map-overlay)')) { UI.mapOverlay(); return; }
    if (UI.cur === 'combat' && UI.combat && UI.combat.onKey) UI.combat.onKey(e);
  });

  // ── 화면 방향 전환(가로↔세로) ──
  UI.onOrient = function () {
    if (!UI.cur) return;
    if (UI.cur === 'combat' && UI.combat && UI.combat.g) { UI.combat.relayout(); return; }
    const keep = ['title', 'charSelect', 'daily', 'dex', 'achievements', 'records', 'settings', 'help', 'result'];
    if (UI.run && UI.cur !== 'result') { UI.flow(); return; }
    if (keep.includes(UI.cur)) UI.go(UI.cur, ...(UI.curArgs || []));
  };

  // ── 시작 ──
  UI.boot = function () {
    JG.Meta.load();
    UI.installDefs();
    UI.fit();
    const ids = Object.values(D.enemies).map((e) => e.img).concat(Object.values(D.chars).map((c) => c.img), Object.values(D.events).map((e) => e.img), ['bg_title', 'bg_act1', 'bg_act2', 'bg_act3', 'ev_peddler', 'ev_inn', 'ev_chest']);
    UI.preload([...new Set(ids)]).then(() => {});
    UI.go('title');
    if (location.search.includes('test')) setTimeout(() => UI.selfTest && UI.selfTest(), 300);
  };
  window.addEventListener('DOMContentLoaded', UI.boot);
  window.addEventListener('beforeunload', () => { if (UI.run && UI.cur !== 'combat') JG.Meta.saveRun(UI.run); });
})();
