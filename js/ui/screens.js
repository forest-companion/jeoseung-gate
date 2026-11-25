'use strict';
// 전투 밖 화면들: 타이틀, 캐릭터 선택, 지도, 보상, 장터, 주막, 사건, 보물, 보스 신물, 결과, 도감·업적·기록·설정
(function () {
  const D = JG.D;
  const R = JG.R;
  const h = UI.h;
  const S = UI.screens = UI.screens || {};
  const settings = () => JG.Meta.data.settings;

  // ═════════ 타이틀 ═════════
  S.title = function () {
    UI.audio.setMood('title');
    const scr = h('div', { class: 'screen title-screen fade-in' });
    scr.appendChild(UI.sceneLayer(0, null, 'bg'));
    const dust = h('canvas', { class: 'moon-dust', width: 1280, height: 720 });
    scr.appendChild(dust);
    scr.appendChild(h('div', { class: 'logo' },
      h('div', { class: 'big' }, '저승문'),
      h('div', { class: 'seal' }, '符'),
      h('div', { class: 'tag' }, '오행 부적 로그라이크')));
    const saved = JG.Meta.loadRun();
    const menu = h('div', { class: 'menu' });
    const item = (hz, label, fn, cls) => h('button', { class: 'btn ' + (cls || ''), onclick: () => { UI.sfx('click'); fn(); } }, h('span', { class: 'hz' }, hz), label);
    if (saved && saved.room && saved.room.type !== 'victory' && saved.room.type !== 'defeat') {
      const ch = D.chars[saved.char];
      menu.appendChild(item('續', `이어하기 · ${ch ? ch.name : ''} ${saved.act}막 ${saved.floor}층`, () => { UI.run = saved; UI.flow(); }, 'gold'));
    }
    menu.appendChild(item('始', '새 여정', async () => {
      if (saved && saved.room && !['victory', 'defeat'].includes(saved.room.type)) {
        const ok = await UI.confirm('새 여정', '진행 중인 여정이 있습니다. 새로 시작하면 지금 여정은 포기한 것으로 기록됩니다.', '새로 시작', '취소');
        if (!ok) return;
        UI.run = saved; JG.R.finish(saved, false); saved.room.by = ['포기']; JG.Meta.onRunEnd(saved, false); UI.run = null;
      }
      UI.go('charSelect');
    }));
    menu.appendChild(item('日', '일일 도전', () => UI.go('daily')));
    menu.appendChild(item('鑑', '도감', () => UI.go('dex')));
    menu.appendChild(item('功', '업적', () => UI.go('achievements')));
    menu.appendChild(item('錄', '기록', () => UI.go('records')));
    menu.appendChild(item('道', '도움말', () => UI.go('help')));
    menu.appendChild(item('設', '설정', () => UI.go('settings')));
    scr.appendChild(menu);
    const st = JG.Meta.data.stats;
    scr.appendChild(h('div', { class: 'foot' }, `v${JG.VERSION} · 여정 ${st.runs}번 · 승리 ${st.wins}번 · 소리는 화면을 한 번 누르면 켜집니다`));
    UI.stage.appendChild(scr);
    // 달빛 먼지
    const ctx = dust.getContext('2d');
    const motes = Array.from({ length: 46 }, () => ({ x: Math.random() * 1280, y: Math.random() * 720, r: 0.6 + Math.random() * 1.8, s: 0.1 + Math.random() * 0.35, a: Math.random() * Math.PI * 2 }));
    let alive = true;
    const loop = () => {
      if (!alive) return;
      ctx.clearRect(0, 0, 1280, 720);
      for (const m of motes) {
        m.y -= m.s; m.a += 0.01; m.x += Math.sin(m.a) * 0.3;
        if (m.y < -5) { m.y = 725; m.x = Math.random() * 1280; }
        ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 236, 190, ${0.25 + 0.25 * Math.sin(m.a * 2)})`;
        ctx.fill();
      }
      requestAnimationFrame(loop);
    };
    loop();
    UI.cleanup = () => { alive = false; };
  };

  // ═════════ 캐릭터 선택 ═════════
  S.charSelect = function (daily) {
    UI.audio.setMood('title');
    const scr = h('div', { class: 'screen charsel fade-in' });
    scr.appendChild(h('div', { class: 'heading' }, h('h2', { class: 'title-h' }, '누가 길을 나설까'), h('div', { class: 'sub-h', style: { marginTop: '6px' } }, '저승문을 닫으러 떠날 부적사를 고르세요')));
    const row = h('div', { class: 'chars' });
    const order = ['yeonhwa', 'doyun', 'dudu'];
    let sel = 'yeonhwa';
    let asc = 0;
    const cards = {};
    for (const id of order) {
      const ch = D.chars[id];
      const unlocked = ch && JG.Meta.isUnlocked(id);
      const card = h('div', { class: 'charcard brass-frame' + (unlocked ? '' : ' locked') });
      const paint = h('div', { class: 'paint' });
      if (ch) paint.appendChild(UI.portrait(ch.img, ch.name[0]).firstChild || h('div'));
      card.appendChild(paint);
      if (ch) card.appendChild(h('div', { class: 'meta' }, h('div', { class: 'nm' }, h('small', null, ch.title), ch.name), h('p', null, ch.blurb), h('p', { style: { color: 'var(--brass)', fontSize: '12.5px' } }, `체력 ${ch.hp} · ${ch.style}`)));
      if (!unlocked) card.appendChild(h('div', { class: 'lock' }, ch && ch.unlockText ? ch.unlockText : '아직 길을 나설 수 없습니다.'));
      if (unlocked) card.addEventListener('click', () => { sel = id; UI.sfx('select'); upd(); });
      cards[id] = card;
      row.appendChild(card);
    }
    scr.appendChild(row);
    const ascLv = h('div', { class: 'lv' }, '0');
    const ascDesc = h('div', { class: 'desc' });
    const minus = h('button', { class: 'btn small', onclick: () => { asc = Math.max(0, asc - 1); UI.sfx('click'); upd(); } }, '◀');
    const plus = h('button', { class: 'btn small', onclick: () => { asc = Math.min(JG.Meta.maxAsc(sel), asc + 1); UI.sfx('click'); upd(); } }, '▶');
    const ascBox = h('div', { class: 'ascbox lacq brass-frame' }, h('span', { class: 'sub-h' }, '업보'), minus, ascLv, plus, ascDesc);
    UI.setTip(ascBox, '<div class="tt-h">업보 (난이도)</div>한 단계로 승리할 때마다 다음 단계가 열립니다. 높은 단계는 낮은 단계의 규칙을 모두 포함합니다.');
    let endless = false;
    const canEndless = JG.Meta.data.stats.wins > 0;
    const modeBtn = h('button', { class: 'btn small', disabled: canEndless ? null : true, onclick: () => { endless = !endless; UI.sfx('click'); modeBtn.textContent = endless ? '무한 저승 ✔' : '무한 저승'; modeBtn.classList.toggle('gold', endless); } }, '무한 저승');
    UI.setTip(modeBtn, canEndless ? '<div class="tt-h">무한 저승</div>흑운귀왕을 쓰러뜨린 뒤에도 끝없이 내려갑니다. 막을 거듭할수록 요괴가 강해집니다.' : '<div class="tt-h">무한 저승</div>한 번 승리하면 열립니다.');
    const seedIn = h('input', { id: 'seed-input', type: 'text', maxlength: 24, placeholder: '씨앗(비우면 무작위)', style: { width: '150px', height: '32px', padding: '0 8px', background: 'rgba(0,0,0,.4)', border: '1px solid var(--brass-dim)', color: 'var(--paper)', fontFamily: 'var(--f-ui)', borderRadius: '3px' } });
    UI.setTip(seedIn, '<div class="tt-h">씨앗</div>같은 씨앗을 넣으면 같은 지도·같은 보상으로 시작합니다. 친구와 같은 판을 겨뤄 보세요.');
    const go = h('button', { class: 'btn red', style: { minWidth: '180px', minHeight: '52px', fontSize: '21px' }, onclick: () => { UI.sfx('click'); const sd = seedIn.value.trim(); UI.newRun({ char: sel, asc, mode: endless ? 'endless' : 'normal', seed: sd || undefined }); } }, '길을 나선다');
    scr.appendChild(h('div', { class: 'bottom' }, h('button', { class: 'btn', onclick: () => UI.go('title') }, '돌아가기'), ascBox, h('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px' } }, modeBtn, seedIn), go));
    function upd() {
      for (const id of order) cards[id].classList.toggle('sel', id === sel);
      asc = Math.min(asc, JG.Meta.maxAsc(sel));
      ascLv.textContent = asc;
      ascDesc.textContent = asc ? JG.ASC_TEXT[asc] + (asc > 1 ? ' (이전 단계 포함)' : '') : '기본 난이도. 승리하면 업보 1이 열립니다.';
      minus.disabled = asc <= 0;
      plus.disabled = asc >= JG.Meta.maxAsc(sel);
    }
    upd();
    UI.stage.appendChild(scr);
  };

  // ═════════ 일일 도전 ═════════
  S.daily = function () {
    const d = new Date();
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const cfg = R.dailyConfig(date);
    const ch = D.chars[cfg.char];
    const best = JG.Meta.data.daily[date];
    const scr = h('div', { class: 'screen info-screen fade-in' });
    scr.appendChild(h('div', { class: 'info-head' }, h('h2', null, '일일 도전'), h('span', { class: 'sub-h' }, date), h('button', { class: 'btn', onclick: () => UI.go('title') }, '돌아가기')));
    const body = h('div', { class: 'info-body', style: { display: 'flex', gap: '30px', justifyContent: 'center', paddingTop: '50px' } });
    const left = h('div', { class: 'charcard brass-frame', style: { cursor: 'default' } }, h('div', { class: 'paint' }, UI.portrait(ch.img, ch.name[0]).firstChild || h('div')), h('div', { class: 'meta' }, h('div', { class: 'nm' }, h('small', null, ch.title), ch.name), h('p', null, '오늘의 부적사')));
    const right = h('div', { class: 'lacq brass-frame', style: { width: '520px', padding: '26px' } },
      h('div', { class: 'sub-h' }, '오늘의 변칙'),
      ...cfg.mods.map((id) => { const m = JG.DAILY_MODS.find((x) => x.id === id); return h('div', { style: { margin: '14px 0' } }, h('div', { style: { fontFamily: 'var(--f-card)', fontWeight: 700, fontSize: '20px', color: 'var(--brass-hi)' } }, m.name), h('div', { style: { color: 'var(--paper-2)', marginTop: '4px' } }, m.desc)); }),
      h('p', { style: { color: 'var(--paper-2)', lineHeight: 1.6 } }, '모두에게 같은 지도와 같은 보상이 나옵니다. 점수는 오를 때만 기록됩니다.'),
      best ? h('p', { style: { color: 'var(--brass-hi)' } }, `오늘 최고 점수: ${best.score} (${best.won ? '승리' : best.floor + '층'})`) : null,
      h('button', { class: 'btn red', style: { marginTop: '10px', minWidth: '200px' }, onclick: () => { if (!JG.Meta.isUnlocked(cfg.char)) JG.Meta.data.unlocked[cfg.char] = JG.Meta.data.unlocked[cfg.char] || false; UI.newRun({ char: cfg.char, seed: cfg.seed, mode: 'daily', daily: cfg }); } }, '도전한다'));
    body.append(left, right);
    scr.appendChild(body);
    UI.stage.appendChild(scr);
  };

  // ═════════ 지도 ═════════
  const NODE_HZ = { fight: '戰', elite: '鬼', event: '?', rest: '酒', shop: '市', treasure: '寶', boss: '王' };
  const NODE_TIP = { fight: '전투 — 평범한 요괴와 싸웁니다.', elite: '강적 — 강한 요괴. 이기면 신물을 얻습니다.', event: '사건 — 무슨 일이 일어날지 모릅니다.', rest: '주막 — 쉬거나 카드를 강화합니다.', shop: '장터 — 엽전으로 물건을 사고 카드를 없앱니다.', treasure: '보물 — 신물이 든 상자.', boss: '보스' };
  UI.buildMap = function (root, readOnly) {
    const run = UI.run;
    const m = run.map;
    const ROW_H = 80, TOP = 290, BOTTOM = 90;
    const H = TOP + 12 * ROW_H + BOTTOM;
    const W = 820;
    const scroll = h('div', { class: 'scroll' });
    const paper = h('div', { class: 'paper', style: { height: H + 'px' } });
    const jitter = (r, c) => { const s = JG.hashSeed(run.seed + ':' + run.act + ':' + r + ':' + c); return [((s[0] % 1000) / 1000 - 0.5) * 34, ((s[1] % 1000) / 1000 - 0.5) * 22]; };
    const pos = (r, c) => { const j = jitter(r, c); return { x: 80 + c * 110 + j[0], y: H - BOTTOM - r * ROW_H + j[1] }; };
    // 선
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'edges'); svg.setAttribute('width', W); svg.setAttribute('height', H);
    const visited = new Set();
    let cr = null, cc = null;
    for (const l of run.log) if (l.act === run.act && l.row !== undefined) visited.add(l.row + ':' + l.col);
    if (run.pos && run.pos.row <= 12) { cr = run.pos.row; cc = run.pos.col; }
    const path = run.path && run.path[run.act] ? run.path[run.act] : [];
    const pathSet = new Set(path.map((p) => p.row + ':' + p.col));
    for (const row of m.rows) for (const n of row) {
      if (!n) continue;
      const a = pos(n.row, n.col);
      for (const nc of n.next) {
        const b = pos(n.row + 1, nc);
        const line = document.createElementNS(NS, 'path');
        const mx = (a.x + b.x) / 2 + (((n.row * 7 + nc * 3) % 5) - 2) * 3;
        line.setAttribute('d', `M${a.x} ${a.y - 18} Q${mx} ${(a.y + b.y) / 2} ${b.x} ${b.y + 18}`);
        const walked = pathSet.has(n.row + ':' + n.col) && pathSet.has((n.row + 1) + ':' + nc);
        line.setAttribute('stroke', walked ? '#b3301f' : 'rgba(40, 32, 26, .55)');
        line.setAttribute('stroke-width', walked ? '3.5' : '2.2');
        line.setAttribute('stroke-dasharray', walked ? '' : '6 7');
        line.setAttribute('stroke-linecap', 'round');
        line.setAttribute('fill', 'none');
        svg.appendChild(line);
      }
      if (n.row === 12) {
        const line = document.createElementNS(NS, 'path');
        line.setAttribute('d', `M${a.x} ${a.y - 18} L${W / 2} ${TOP - 40}`);
        line.setAttribute('stroke', 'rgba(40, 32, 26, .35)'); line.setAttribute('stroke-width', '2'); line.setAttribute('stroke-dasharray', '3 8'); line.setAttribute('fill', 'none');
        svg.appendChild(line);
      }
    }
    paper.appendChild(svg);
    const avail = readOnly ? [] : R.available(run);
    const availSet = new Set(avail.map((n) => n.row + ':' + n.col));
    for (const row of m.rows) for (const n of row) {
      if (!n) continue;
      const p = pos(n.row, n.col);
      const isAvail = availSet.has(n.row + ':' + n.col);
      const el = h('div', { class: `mnode t-${n.type}${pathSet.has(n.row + ':' + n.col) ? ' visited' : ''}${isAvail ? ' avail' : ''}${cr === n.row && cc === n.col ? ' cur' : ''}`, style: { left: p.x + 'px', top: p.y + 'px' } }, NODE_HZ[n.type]);
      UI.setTip(el, `<div class="tt-h">${JG.NODE[n.type].name}</div>${NODE_TIP[n.type]}<div class="tt-sub">${n.row + 1}층</div>`);
      if (isAvail) el.addEventListener('click', () => UI.enterNode(n));
      paper.appendChild(el);
    }
    // 보스
    const bd = D.enemies[m.boss];
    const bossAvail = availSet.has('13:3');
    const boss = h('div', { class: 'mboss' + (bossAvail ? ' avail' : '') }, h('div', { class: 'art' }, UI.portrait(bd.img, '王').firstChild || h('div')), h('div', { class: 'nm' }, bd.name));
    UI.setTip(boss, `<div class="tt-h">보스 · ${bd.name}</div>${bd.desc || ''}`);
    if (bossAvail) boss.querySelector('.art').addEventListener('click', () => UI.enterNode(avail.find((n) => n.row === 13)));
    paper.appendChild(boss);
    scroll.appendChild(paper);
    root.appendChild(h('div', { class: 'rod', style: { top: '70px' } }));
    root.appendChild(scroll);
    // 옆 설명
    const act = JG.actInfo(run.act);
    root.appendChild(h('div', { class: 'side l' }, h('div', { class: 'lacq brass-frame legend' },
      h('div', { class: 'sub-h' }, act.title), h('div', { style: { fontFamily: 'var(--f-title)', fontSize: '26px', margin: '4px 0 10px' } }, act.name),
      ...['fight', 'elite', 'event', 'rest', 'shop', 'treasure'].map((t) => h('div', { class: 'li' }, h('span', { class: 'mk', style: t === 'event' ? { fontFamily: 'var(--f-num)' } : null }, NODE_HZ[t]), JG.NODE[t].name)))));
    // 스크롤 위치: 현재 줄이 보이게
    requestAnimationFrame(() => {
      const curRow = run.pos ? Math.min(12, run.pos.row) : 0;
      const target = H - BOTTOM - curRow * ROW_H - 420;
      scroll.scrollTop = Math.max(0, target);
    });
    return scroll;
  };
  UI.enterNode = function (n) {
    const run = UI.run;
    if (UI.entering) return;
    UI.entering = true;
    UI.sfx('stamp');
    run.path = run.path || {};
    (run.path[run.act] = run.path[run.act] || []).push({ row: n.row, col: n.col });
    R.enter(run, n.row, n.col);
    setTimeout(() => { UI.entering = false; UI.flow(); }, 220 / UI.speed());
  };
  S.map = function () {
    const run = UI.run;
    UI.audio.setMood('map');
    const scr = h('div', { class: 'screen mapscreen fade-in', style: { background: 'radial-gradient(ellipse at 50% 30%, #2b201a, #0f0b09 75%)' } });
    UI.stage.appendChild(scr);
    UI.topbar();
    UI.buildMap(scr, false);
    const tipBox = h('div', { class: 'side r' }, h('div', { class: 'lacq brass-frame legend' },
      h('div', { class: 'sub-h' }, '길잡이'),
      h('p', { style: { fontSize: '13.5px', lineHeight: 1.6, color: 'var(--paper-2)', margin: '6px 0 0' } }, run.pos ? '빛나는 칸 중 하나를 골라 나아가세요. 강적을 이기면 신물을, 주막에서는 쉬거나 카드를 강화할 수 있습니다.' : '맨 아래 빛나는 칸에서 여정을 시작합니다.'),
      h('div', { style: { marginTop: '10px', fontSize: '13px', color: 'var(--brass)' } }, `덱 ${run.deck.length}장 · 신물 ${run.relics.length}개`)));
    scr.appendChild(tipBox);
    if (!run.prologueShown) {
      run.prologueShown = true;
      JG.Meta.saveRun(run);
      const ch = D.chars[run.char];
      const box = h('div', { class: 'story-back' }, h('div', { class: 'story lacq brass-frame' },
        h('div', { class: 'story-art' }, UI.portrait(ch.img, ch.name[0]).firstChild || h('div')),
        h('div', { class: 'story-body' },
          h('div', { class: 'sub-h' }, run.mode === 'endless' ? '무한 저승' : run.mode === 'daily' ? '일일 도전' : '서장'),
          h('h2', { class: 'title-h', style: { fontSize: '34px', margin: '6px 0 14px' } }, `${ch.title} ${ch.name}`),
          h('p', null, ch.prologue || ''),
          h('button', { class: 'btn red', onclick: () => { UI.sfx('stamp'); box.remove(); } }, '길을 나선다'))));
      scr.appendChild(box);
    } else if (run.room.actIntro) {
      const act = JG.actInfo(run.act);
      scr.appendChild(h('div', { class: 'actintro' }, h('div', { class: 't' }, h('div', { class: 'a' }, act.title), h('div', { class: 'n' }, act.name), run.room.healed ? h('div', { style: { fontSize: '18px', color: '#8ef08a', marginTop: '14px' } }, `체력 ${run.room.healed} 회복`) : null)));
      delete run.room.actIntro;
      UI.sfx('cycle');
    }
  };

  // ═════════ 보상 ═════════
  S.reward = function () {
    const run = UI.run;
    const rm = run.room;
    UI.audio.setMood('calm');
    const scr = h('div', { class: 'screen fade-in' });
    scr.appendChild(UI.sceneLayer(run.act, JG.actInfo(run.act).bg, 'room-bg'));
    UI.stage.appendChild(scr);
    UI.topbar();
    const panel = h('div', { class: 'panel reward-panel lacq brass-frame' });
    const title = rm.kind === 'boss' ? '대요괴를 물리쳤다!' : rm.kind === 'elite' ? '강적을 물리쳤다!' : '전리품';
    panel.appendChild(h('h2', { class: 'panel-title' }, title));
    const list = h('div', { class: 'reward-list' });
    const render = () => {
      UI.clear(list);
      rm.items.forEach((it, i) => {
        let icon = '', label = '', tip = '';
        if (it.type === 'gold') { icon = '🪙'; label = `엽전 ${Math.round(it.n * (1 + R.mod(run, 'goldMul')))}`; }
        else if (it.type === 'potion') { const p = D.potions[it.id]; icon = p.icon; label = p.name; tip = `<div class="tt-h">${p.name}</div>${UI.kwHtml(p.desc)}`; }
        else if (it.type === 'relic') { const r = D.relics[it.id]; icon = r.icon; label = r.name; tip = UI.relicTip(it.id); }
        else if (it.type === 'card') { icon = '符'; label = it.skipped ? '카드 (넘김)' : it.picked !== undefined ? `카드 — ${D.cards[it.cards[it.picked].id].name}` : '카드 한 장 고르기'; }
        const b = h('button', { class: 'reward-item' + (it.taken ? ' done' : '') }, h('span', { class: 'ri' }, icon), h('span', null, label));
        if (tip) UI.setTip(b, tip);
        b.addEventListener('click', () => {
          if (it.type === 'card') { UI.cardPick(it, i); return; }
          const res = R.takeReward(run, i);
          if (!res.ok) { UI.sfx('error'); UI.toast(res.reason || '받을 수 없습니다.'); return; }
          UI.sfx(it.type === 'gold' ? 'gold' : it.type === 'relic' ? 'relic' : 'potion');
          UI.refreshTop();
          JG.Meta.saveRun(run);
          render();
        });
        list.appendChild(b);
      });
    };
    render();
    panel.appendChild(list);
    const cont = h('button', { class: 'btn gold', style: { minWidth: '200px' }, onclick: async () => {
      const left = rm.items.filter((x) => !x.taken && x.type !== 'card');
      if (left.length) { const ok = await UI.confirm('그냥 갈까요?', '아직 받지 않은 보상이 있습니다.', '두고 간다', '돌아가기'); if (!ok) return; }
      UI.sfx('click');
      R.leaveReward(run);
      UI.flow();
    } }, '계속 나아가기');
    panel.appendChild(h('div', { class: 'foot' }, cont));
    scr.appendChild(panel);
    UI.renderRewards = render;
  };
  UI.cardPick = function (it, idx) {
    const run = UI.run;
    const wrap = h('div', { class: 'cardpick' });
    wrap.appendChild(h('h2', { class: 'panel-title' }, '부적 한 장을 고르세요'));
    wrap.appendChild(h('div', { class: 'sub-h', style: { marginTop: '6px' } }, `지금 덱 ${run.deck.length}장`));
    const row = h('div', { class: 'cards' });
    let preview = false;
    const draw = () => {
      UI.clear(row);
      it.cards.forEach((c, i) => {
        const el = UI.cardEl({ id: c.id, up: preview ? 1 : c.up, uid: 'pick' + i }, { static: true });
        el.addEventListener('click', () => {
          R.takeReward(run, idx, i);
          UI.sfx('card');
          JG.Meta.saveRun(run);
          wrap.remove();
          UI.renderRewards && UI.renderRewards();
          UI.refreshTop();
        });
        row.appendChild(el);
      });
    };
    draw();
    wrap.appendChild(row);
    const upBtn = h('button', { class: 'btn', onclick: () => { preview = !preview; upBtn.classList.toggle('gold', preview); upBtn.textContent = preview ? '원래 모습 보기' : '강화된 모습 보기'; UI.sfx('click'); draw(); } }, '강화된 모습 보기');
    wrap.appendChild(h('div', { class: 'row', style: { display: 'flex', gap: '14px' } },
      upBtn,
      h('button', { class: 'btn', onclick: () => wrap.remove() }, '나중에'),
      h('button', { class: 'btn', onclick: () => { R.takeReward(run, idx, 'skip'); wrap.remove(); UI.renderRewards && UI.renderRewards(); JG.Meta.saveRun(run); } }, '넘기기')));
    UI.stage.appendChild(wrap);
  };

  // ═════════ 보스 신물 ═════════
  S.bossRelic = function () {
    const run = UI.run;
    UI.audio.setMood('calm');
    const scr = h('div', { class: 'screen fade-in' });
    scr.appendChild(UI.sceneLayer(run.act, JG.actInfo(run.act).bg, 'room-bg'));
    UI.stage.appendChild(scr);
    UI.topbar();
    const box = h('div', { class: 'bossrelic' }, h('h2', { class: 'panel-title' }, '대요괴가 남긴 보물'), h('div', { class: 'sub-h', style: { marginTop: '6px' } }, '하나만 가져갈 수 있습니다'));
    const opts = h('div', { class: 'opts' });
    run.room.choices.forEach((id, i) => {
      const rd = D.relics[id];
      const o = h('div', { class: 'opt lacq brass-frame' }, h('div', { class: 'big' }, rd.icon), h('div', { class: 't' }, rd.name), h('div', { class: 'd', html: UI.kwHtml(rd.desc) }));
      o.addEventListener('click', () => { UI.sfx('relic'); R.takeBossRelic(run, i); UI.flow(); });
      opts.appendChild(o);
    });
    box.appendChild(opts);
    box.appendChild(h('button', { class: 'btn', style: { marginTop: '26px' }, onclick: () => { R.takeBossRelic(run, -1); UI.flow(); } }, '아무것도 가져가지 않는다'));
    scr.appendChild(box);
  };

  // ═════════ 장터 ═════════
  const SHOP_LINES = ['“구경은 공짜요. 천천히 보시오.”', '“저승 가는 길엔 노잣돈이 두둑해야 하는 법이지.”', '“이 부적은 산 너머 큰무당이 그린 것이오.”', '“부정 탄 카드는 내가 씻어 드리리다.”', '“값은 흥정 없소. 대신 물건은 확실하지.”'];
  S.shop = function () {
    const run = UI.run;
    const st = run.room.stock;
    UI.audio.setMood('calm');
    const scr = h('div', { class: 'screen fade-in' });
    scr.appendChild(UI.sceneLayer(run.act, 'ev_peddler', 'room-bg'));
    UI.stage.appendChild(scr);
    UI.topbar();
    const wrap = h('div', { class: 'shop-wrap' });
    const main = h('div', { class: 'shop-main lacq brass-frame scroll-y' });
    const side = h('div', { class: 'shop-side lacq brass-frame' });
    const say = h('div', { class: 'say' }, SHOP_LINES[R.rng(run, 'misc').int(0, SHOP_LINES.length - 1)]);
    const render = () => {
      UI.clear(main);
      main.appendChild(h('div', { class: 'sub-h', style: { marginBottom: '8px' } }, '부적'));
      const cards = h('div', { class: 'shop-cards' });
      st.cards.forEach((it, i) => {
        const el = UI.cardEl({ id: it.id, up: it.up, uid: 'shop' + i }, { static: false });
        const slot = h('div', { class: 'slot' + (it.sold ? ' sold' : '') }, h('div', { class: 'cardbox' }, el), h('div', { class: 'price' + (run.gold < it.price ? ' no' : '') + (it.sale ? ' sale' : '') }, '🪙 ', String(it.price)));
        el.addEventListener('click', () => buy('cards', i));
        cards.appendChild(slot);
      });
      main.appendChild(cards);
      const row = h('div', { class: 'shop-row' });
      st.relics.forEach((it, i) => {
        const rd = D.relics[it.id];
        const s = h('div', { class: 'shop-item slot' + (it.sold ? ' sold' : '') }, h('div', { class: 'big' }, rd.icon), h('div', { class: 'nm' }, rd.name), h('div', { class: 'price' + (run.gold < it.price ? ' no' : '') }, '🪙 ', String(it.price)));
        UI.setTip(s, UI.relicTip(it.id));
        s.addEventListener('click', () => buy('relics', i));
        row.appendChild(s);
      });
      row.appendChild(h('div', { style: { width: '24px' } }));
      st.potions.forEach((it, i) => {
        const pd = D.potions[it.id];
        const s = h('div', { class: 'shop-item slot' + (it.sold ? ' sold' : '') }, h('div', { class: 'big' }, pd.icon), h('div', { class: 'nm' }, pd.name), h('div', { class: 'price' + (run.gold < it.price ? ' no' : '') }, '🪙 ', String(it.price)));
        UI.setTip(s, `<div class="tt-h">${pd.name}</div>${UI.kwHtml(pd.desc)}`);
        s.addEventListener('click', () => buy('potions', i));
        row.appendChild(s);
      });
      row.appendChild(h('div', { style: { width: '24px' } }));
      const cost = R.removeCost(run);
      const rm = h('div', { class: 'shop-item slot' + (st.removeUsed ? ' sold' : '') }, h('div', { class: 'big', style: { fontFamily: 'var(--f-hanja)', fontWeight: 900, color: 'var(--cinnabar)' } }, '祓'), h('div', { class: 'nm' }, '카드 없애기'), h('div', { class: 'price' + (run.gold < cost ? ' no' : '') }, '🪙 ', String(cost)));
      UI.setTip(rm, '<div class="tt-h">부정 씻기</div>덱에서 카드 1장을 없앱니다. 장터마다 한 번, 쓸 때마다 값이 오릅니다.');
      rm.addEventListener('click', async () => {
        if (st.removeUsed) return;
        if (run.gold < cost) { UI.sfx('error'); say.textContent = '“엽전이 모자라오.”'; return; }
        const picked = await UI.pickFromDeck({ title: '없앨 카드', filter: R.deckFilter('remove'), confirm: '없앤다' });
        if (!picked || !picked.length) return;
        const res = R.shopRemove(run, picked[0]);
        if (res.ok) { UI.sfx('gold'); say.textContent = '“깨끗이 씻어 드렸소.”'; JG.Meta.saveRun(run); UI.refreshTop(); render(); }
      });
      row.appendChild(rm);
      main.appendChild(row);
    };
    const buy = (kind, i) => {
      const res = R.buy(run, kind, i);
      if (!res.ok) { UI.sfx('error'); say.textContent = res.reason === '엽전이 모자랍니다.' ? '“엽전이 모자라오. 다음에 오시오.”' : `“${res.reason || '그건 안 되오.'}”`; return; }
      UI.sfx('gold');
      say.textContent = ['“좋은 물건 고르셨소.”', '“잘 쓰시오.”', '“거래 감사하오!”'][Math.floor(Math.random() * 3)];
      JG.Meta.saveRun(run);
      UI.refreshTop();
      render();
    };
    render();
    const keeper = h('div', { class: 'keeper', style: UI.bgStyle('ev_peddler') }, UI.imgOk.ev_peddler ? '' : '商');
    side.append(h('div', { class: 'sub-h' }, '보부상'), keeper, say, h('div', { style: { flex: 1 } }), h('button', { class: 'btn gold', style: { minWidth: '200px' }, onclick: () => { UI.sfx('click'); run.room = { type: 'map' }; UI.flow(); } }, '장터를 떠난다'));
    wrap.append(main, side);
    scr.appendChild(wrap);
  };

  // ═════════ 주막 ═════════
  S.rest = function () {
    const run = UI.run;
    const rm = run.room;
    UI.audio.setMood('calm');
    const scr = h('div', { class: 'screen fade-in' });
    scr.appendChild(UI.sceneLayer(run.act, 'ev_inn', 'room-bg'));
    UI.stage.appendChild(scr);
    UI.topbar();
    const wrap = h('div', { class: 'rest-wrap' });
    wrap.appendChild(h('h2', { class: 'panel-title' }, '주막'));
    wrap.appendChild(h('div', { class: 'sub-h', style: { marginTop: '6px' } }, rm.done ? '하룻밤을 묵었다' : '하룻밤 묵어 갈 수 있다'));
    const opts = h('div', { class: 'rest-opts' });
    const noRest = R.mod(run, 'noRest');
    const heal = R.restHealAmount(run);
    const restO = h('div', { class: 'rest-opt lacq brass-frame' + (rm.done || noRest ? ' off' : '') }, h('div', { class: 'hz' }, '休'), h('div', { class: 't' }, '쉬기'), h('div', { class: 'd' }, noRest ? '「해와 달」 때문에 쉴 수 없다' : `체력 ${heal} 회복 (${run.hp}/${run.maxHp})`));
    const smithO = h('div', { class: 'rest-opt lacq brass-frame' + (rm.done ? ' off' : '') }, h('div', { class: 'hz' }, '鍊'), h('div', { class: 't' }, '정련'), h('div', { class: 'd' }, '부적 1장을 강화한다'));
    restO.addEventListener('click', () => {
      if (rm.done || noRest) return;
      R.rest(run, 'rest');
      UI.sfx('heal');
      JG.Meta.saveRun(run);
      UI.flow();
    });
    smithO.addEventListener('click', async () => {
      if (rm.done) return;
      const picked = await UI.pickFromDeck({ title: '강화할 부적', sub: '강화된 모습으로 보여 줍니다', filter: (c) => R.canUpgrade(c), preview: 'upgrade', confirm: '정련한다' });
      if (!picked || !picked.length) return;
      R.rest(run, 'smith', picked[0]);
      UI.sfx('metal');
      JG.Meta.saveRun(run);
      UI.flow();
    });
    opts.append(restO, smithO);
    wrap.appendChild(opts);
    if (rm.done) {
      wrap.appendChild(h('p', { style: { marginTop: '24px', fontFamily: 'var(--f-card)', fontSize: '17px', color: 'var(--paper-2)' } }, rm.done === 'rest' ? `푹 쉬었다. 체력 ${rm.healed} 회복.` : '등잔불 아래서 부적을 정성껏 다시 그렸다.'));
      wrap.appendChild(h('button', { class: 'btn gold', style: { marginTop: '10px', minWidth: '200px' }, onclick: () => { run.room = { type: 'map' }; UI.flow(); } }, '길을 나선다'));
    }
    scr.appendChild(wrap);
  };

  // ═════════ 보물 ═════════
  S.treasure = function () {
    const run = UI.run;
    const rm = run.room;
    UI.audio.setMood('calm');
    const scr = h('div', { class: 'screen fade-in' });
    scr.appendChild(UI.sceneLayer(run.act, JG.actInfo(run.act).bg, 'room-bg'));
    UI.stage.appendChild(scr);
    UI.topbar();
    const wrap = h('div', { class: 'treasure-wrap' });
    wrap.appendChild(h('h2', { class: 'panel-title' }, '숨겨진 보물'));
    const chest = h('div', { class: 'chest' + (rm.opened ? ' opened' : ''), style: UI.bgStyle('ev_chest') });
    const info = h('div', { style: { minHeight: '90px', fontFamily: 'var(--f-card)', fontSize: '18px' } });
    const showGot = () => {
      const rd = D.relics[rm.relic];
      UI.clear(info);
      info.appendChild(h('div', { class: 'has-tip', style: { fontSize: '40px' } }, rd.icon));
      info.appendChild(h('div', { style: { color: 'var(--brass-hi)' } }, `신물 「${rd.name}」${rm.gold ? ` · 엽전 ${rm.gold}` : ''}`));
      info.appendChild(h('div', { style: { color: 'var(--paper-2)', fontSize: '15px', marginTop: '4px' }, html: UI.kwHtml(rd.desc) }));
    };
    if (rm.opened) showGot();
    else info.appendChild(h('div', { style: { color: 'var(--paper-2)' } }, '상자를 눌러 여세요.'));
    chest.addEventListener('click', () => {
      if (rm.opened) return;
      R.openTreasure(run);
      UI.sfx('relic'); UI.sfx('gold');
      chest.classList.add('opened');
      showGot();
      UI.refreshTop();
      JG.Meta.saveRun(run);
      leave.classList.remove('hidden');
    });
    const leave = h('button', { class: 'btn gold' + (rm.opened ? '' : ' hidden'), style: { minWidth: '200px' }, onclick: () => { run.room = { type: 'map' }; UI.flow(); } }, '길을 나선다');
    wrap.append(chest, info, leave);
    scr.appendChild(wrap);
  };

  // ═════════ 사건 ═════════
  S.event = function () {
    const run = UI.run;
    UI.audio.setMood('calm');
    const view = R.eventView(run);
    const scr = h('div', { class: 'screen fade-in' });
    scr.appendChild(UI.sceneLayer(run.act, view.img, 'room-bg'));
    UI.stage.appendChild(scr);
    UI.topbar();
    const wrap = h('div', { class: 'event-wrap' });
    const img = h('div', { class: 'event-img', style: UI.bgStyle(view.img) });
    const left = h('div', null, img, h('div', { class: 'sub-h', style: { marginTop: '14px', textAlign: 'center' } }, '— 사건 —'));
    const right = h('div', { class: 'event-text lacq brass-frame' });
    right.appendChild(h('h2', null, view.title));
    right.appendChild(h('div', { class: 'body scroll-y', html: UI.kwHtml(view.text) }));
    const choices = h('div', { class: 'event-choices' });
    view.choices.forEach((ch, i) => {
      const b = h('button', { class: 'choice', disabled: ch.disabled ? true : null }, h('span', { class: 'lb' }, ch.label), ch.hint ? h('span', { class: 'hint', html: UI.kwHtml(ch.hint) }) : null);
      b.addEventListener('click', async () => {
        UI.sfx('click');
        const res = R.eventChoose(run, i);
        if (!res) return;
        if (res.dead) { UI.flow(); return; }
        if (res.deck) {
          const pd = res.deck;
          const picked = await UI.pickFromDeck({ title: pd.title || '카드 고르기', filter: R.deckFilter(pd.mode), preview: pd.mode === 'upgrade' ? 'upgrade' : null, count: pd.count, canCancel: false, confirm: '확인' });
          R.eventDeckDone(run, picked || []);
        }
        UI.flow();
      });
      choices.appendChild(b);
    });
    right.appendChild(choices);
    wrap.append(left, right);
    scr.appendChild(wrap);
  };

  // ═════════ 결과 ═════════
  S.result = function (run, won, res) {
    UI.audio.setMood(null);
    UI.sfx(won ? 'victory' : 'defeat');
    const scr = h('div', { class: 'screen result-screen fade-in' + (won ? ' win' : '') });
    if (won) { const bg = UI.sceneLayer(0, null, 'room-bg'); bg.style.filter = 'brightness(.4) saturate(.85)'; scr.appendChild(bg); }
    const box = h('div', { class: 'result-box' });
    box.appendChild(h('h1', { class: 'big ' + (won ? 'win' : 'lose') }, won ? '봉인' : '쓰러짐'));
    const by = run.room && run.room.by ? run.room.by.map((id) => (D.enemies[id] ? D.enemies[id].name : id)).join(', ') : '';
    box.appendChild(h('div', { class: 'sub-h', style: { fontSize: '17px' } }, won ? '저승문이 다시 닫혔다. 달이 돌아온다.' : `${run.act}막 ${run.floor}층에서 쓰러졌다${by ? ' — ' + by : ''}`));
    if (won && D.chars[run.char] && D.chars[run.char].ending) box.appendChild(h('div', { class: 'ending-text' }, D.chars[run.char].ending));
    const s = run.stats;
    const stat = (v, k) => h('div', { class: 's lacq' }, h('div', { class: 'v' }, String(v)), h('div', { class: 'k' }, k));
    box.appendChild(h('div', { class: 'result-stats' },
      stat(res.score, '점수'), stat(run.floor, '오른 층'), stat(s.kills, '물리친 요괴'),
      stat(s.cycles, '오행순환'), stat(s.maxHit, '최대 일격'), stat(UI.fmtTime((s.endedAt || Date.now()) - s.startedAt), '걸린 시간')));
    const ul = h('div', { class: 'unlock-list' });
    for (const u of res.unlocks) {
      if (u.kind === 'char') ul.appendChild(h('div', { class: 'unlock' }, `새 부적사 해금: ${D.chars[u.char].title} ${D.chars[u.char].name}`));
      if (u.kind === 'asc') ul.appendChild(h('div', { class: 'unlock' }, `${D.chars[u.char].name} — 업보 ${u.level} 해금: ${JG.ASC_TEXT[u.level]}`));
    }
    for (const id of JG.Meta.popNew()) { const a = JG.ACH.find((x) => x.id === id); if (a) ul.appendChild(h('div', { class: 'unlock' }, `업적 달성: ${a.name} — ${a.desc}`)); }
    box.appendChild(ul);
    // 이번 여정 요약: 신물과 덱
    const relicRow = h('div', { class: 'res-relics' }, ...run.relics.map((r) => { const rd = D.relics[r.id]; const el = h('span', { class: 'relic' }, rd ? rd.icon : '?'); if (rd) UI.setTip(el, () => UI.relicTip(r.id, r)); return el; }));
    const deckBtn = h('button', { class: 'btn small', onclick: () => {
      const wrap = h('div', { class: 'deckview' });
      const grid = h('div', { class: 'cardgrid' });
      for (const c of run.deck.slice().sort((a, b) => D.cards[a.id].type.localeCompare(D.cards[b.id].type))) grid.appendChild(UI.staticCard(c));
      wrap.append(h('div', { class: 'dv-head' }, h('h3', null, `마지막 덱 ${run.deck.length}장`)), h('div', { class: 'dv-body scroll-y' }, grid), h('div', { class: 'dv-foot' }, h('button', { class: 'btn', onclick: () => wrap.remove() }, '닫기')));
      UI.stage.appendChild(wrap);
    } }, `마지막 덱 보기 (${run.deck.length}장)`);
    box.appendChild(h('div', { class: 'res-summary' }, relicRow, deckBtn));
    box.appendChild(h('div', { style: { display: 'flex', gap: '14px', justifyContent: 'center' } },
      h('button', { class: 'btn', onclick: () => UI.go('title') }, '처음 화면'),
      h('button', { class: 'btn red', onclick: () => UI.go('charSelect') }, '다시 길을 나선다')));
    scr.appendChild(box);
    UI.stage.appendChild(scr);
  };

  // ═════════ 정보 화면 공통 ═════════
  function infoScreen(title, tabs, renderBody) {
    const scr = h('div', { class: 'screen info-screen fade-in' });
    const body = h('div', { class: 'info-body scroll-y' });
    let cur = 0;
    const tabEl = h('div', { class: 'tabs' });
    tabs.forEach((t, i) => tabEl.appendChild(h('button', { class: 'tab' + (i === 0 ? ' on' : ''), onclick: () => { cur = i; tabEl.querySelectorAll('.tab').forEach((x, j) => x.classList.toggle('on', j === i)); UI.clear(body); renderBody(body, cur); } }, t)));
    scr.appendChild(h('div', { class: 'info-head' }, h('h2', null, title), tabs.length > 1 ? tabEl : null, h('button', { class: 'btn', onclick: () => UI.go('title') }, '돌아가기')));
    scr.appendChild(body);
    UI.stage.appendChild(scr);
    renderBody(body, 0);
  }

  UI.infoScreen = infoScreen;
  // 도감
  S.dex = function () {
    const seen = JG.Meta.data.seen;
    const chars = Object.values(D.chars);
    const tabs = [...chars.map((c) => `${c.name}의 부적`), '공용 부적', '신물', '약', '요괴', '사건'];
    infoScreen('도감', tabs, (body, i) => {
      if (i < chars.length + 1) {
        const owner = i < chars.length ? chars[i].id : 'neutral';
        const list = Object.values(D.cards).filter((d) => d.char === owner).sort((a, b) => (['basic', 'common', 'uncommon', 'rare'].indexOf(a.rar) - ['basic', 'common', 'uncommon', 'rare'].indexOf(b.rar)) || JG.EL.indexOf(a.el) - JG.EL.indexOf(b.el));
        const got = list.filter((d) => seen.cards[d.id] || d.rar === 'basic').length;
        body.appendChild(h('div', { class: 'sub-h', style: { marginBottom: '6px' } }, `발견 ${got} / ${list.length} · 카드에 마우스를 올리면 강화된 모습`));
        const grid = h('div', { class: 'cardgrid' });
        for (const d of list) {
          const known = seen.cards[d.id] || d.rar === 'basic';
          const el = UI.cardEl({ id: d.id, up: 0, uid: 'dex' + d.id }, { static: true });
          if (!known) { el.style.filter = 'brightness(.2) grayscale(1)'; el._tip = '<div class="tt-h">???</div>아직 만나지 못한 부적'; }
          else el.addEventListener('mouseenter', () => { const up = UI.cardEl({ id: d.id, up: 1, uid: 'x' }, { static: true }); el.replaceChildren(...up.childNodes); el.classList.add('up'); });
          grid.appendChild(el);
        }
        body.appendChild(grid);
        return;
      }
      const k = i - chars.length - 1;
      const grid = h('div', { class: 'dex-grid' });
      if (k === 0) {
        const order = ['starter', 'common', 'uncommon', 'rare', 'boss', 'shop', 'event'];
        const list = Object.values(D.relics).sort((a, b) => order.indexOf(a.rar) - order.indexOf(b.rar));
        body.appendChild(h('div', { class: 'sub-h', style: { marginBottom: '10px' } }, `발견 ${list.filter((r) => seen.relics[r.id]).length} / ${list.length}`));
        for (const r of list) { const ok = seen.relics[r.id]; grid.appendChild(h('div', { class: 'dex-item' + (ok ? '' : ' unseen') }, h('div', { class: 'ic' }, ok ? r.icon : '?'), h('div', null, h('div', { class: 't' }, ok ? r.name : '???'), h('div', { class: 'd', html: ok ? UI.kwHtml(r.desc) : '' })))); }
      } else if (k === 1) {
        for (const p of Object.values(D.potions)) { const ok = seen.potions[p.id]; grid.appendChild(h('div', { class: 'dex-item' + (ok ? '' : ' unseen') }, h('div', { class: 'ic' }, ok ? p.icon : '?'), h('div', null, h('div', { class: 't' }, ok ? p.name : '???'), h('div', { class: 'd', html: ok ? UI.kwHtml(p.desc) : '' })))); }
      } else if (k === 2) {
        const list = Object.values(D.enemies).sort((a, b) => (a.act - b.act) || (['normal', 'elite', 'boss'].indexOf(a.type) - ['normal', 'elite', 'boss'].indexOf(b.type)));
        for (const e of list) {
          const ok = seen.enemies[e.id];
          const ic = h('div', { class: 'ic', style: { background: '#e9dcbd' } });
          if (ok) ic.appendChild(UI.portrait(e.img, e.name[0]).firstChild || h('span'));
          else ic.textContent = '?';
          const tl = { normal: '', elite: '강적 · ', boss: '보스 · ' }[e.type];
          grid.appendChild(h('div', { class: 'dex-item' + (ok ? '' : ' unseen') }, ic, h('div', null, h('div', { class: 't' }, ok ? e.name : '???'), h('div', { class: 'd' }, ok ? `${tl}${e.act}막 · ${JG.ELINFO[e.el || 'none'].name}(${JG.ELINFO[e.el || 'none'].hanja})${e.desc ? ' — ' + e.desc : ''}` : `${e.act}막`))));
        }
      } else {
        for (const ev of Object.values(D.events)) { const ok = seen.events[ev.id]; grid.appendChild(h('div', { class: 'dex-item' + (ok ? '' : ' unseen') }, h('div', { class: 'ic', style: ok ? Object.assign(UI.bgStyle(ev.img), { backgroundSize: 'cover', backgroundPosition: 'center' }) : null }, ok ? '' : '?'), h('div', null, h('div', { class: 't' }, ok ? ev.name : '???'), h('div', { class: 'd' }, (ev.acts || []).map((a) => a + '막').join(' · '))))); }
      }
      body.appendChild(grid);
    });
  };

  // 업적
  S.achievements = function () {
    infoScreen('업적', [], (body) => {
      const got = JG.Meta.data.ach;
      body.appendChild(h('div', { class: 'sub-h', style: { marginBottom: '10px' } }, `달성 ${JG.ACH.filter((a) => got[a.id]).length} / ${JG.ACH.length}`));
      const grid = h('div', { class: 'dex-grid' });
      for (const a of JG.ACH) grid.appendChild(h('div', { class: 'dex-item ach-item' + (got[a.id] ? ' got' : '') }, h('div', { class: 'ic', style: { fontFamily: 'var(--f-hanja)', fontWeight: 900 } }, got[a.id] ? '功' : '·'), h('div', null, h('div', { class: 't' }, a.name), h('div', { class: 'd' }, a.desc + (got[a.id] ? ` · ${new Date(got[a.id]).toLocaleDateString('ko-KR')}` : '')))));
      body.appendChild(grid);
    });
  };

  // 기록
  S.records = function () {
    infoScreen('기록', [], (body) => {
      const s = JG.Meta.data.stats;
      const stat = (v, k) => h('div', { class: 's lacq' }, h('div', { class: 'v' }, String(v)), h('div', { class: 'k' }, k));
      body.appendChild(h('div', { class: 'stat-grid' },
        stat(s.runs, '여정'), stat(s.wins, '승리'), stat(s.runs ? Math.round(s.wins / s.runs * 100) + '%' : '-', '승률'), stat(s.bestFloor, '최고 층'),
        stat(s.kills, '물리친 요괴'), stat(s.cycles, '오행순환'), stat(s.maxHit, '최대 일격'), stat(s.bestScore, '최고 점수'),
        stat(s.fastestWin ? UI.fmtTime(s.fastestWin) : '-', '가장 빠른 승리'), stat(UI.fmtTime(s.playMs), '총 여정 시간'),
        stat(Object.values(s.bosses).reduce((a, b) => a + b, 0), '보스 처치'), stat(Object.keys(JG.Meta.data.ach).length, '업적')));
      const t = h('table', { class: 'hist' }, h('tr', null, ...['날짜', '부적사', '결과', '층', '업보', '점수', '쓰러뜨린 이'].map((x) => h('th', null, x))));
      for (const r of JG.Meta.data.history) {
        const ch = D.chars[r.char];
        t.appendChild(h('tr', null, h('td', null, new Date(r.at).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })), h('td', null, ch ? ch.name : r.char), h('td', { style: { color: r.won ? 'var(--brass-hi)' : 'var(--paper-2)' } }, r.won ? '봉인 성공' : '쓰러짐'), h('td', null, `${r.act}막 ${r.floor}층`), h('td', null, String(r.asc)), h('td', null, String(r.score)), h('td', null, r.by ? r.by.map((id) => (D.enemies[id] ? D.enemies[id].name : id)).join(', ') : '')));
      }
      if (!JG.Meta.data.history.length) t.appendChild(h('tr', null, h('td', { colspan: 7, style: { color: 'var(--ink-3)', textAlign: 'center', padding: '30px' } }, '아직 기록이 없습니다.')));
      body.appendChild(t);
    });
  };

  // 설정
  function settingsBody(onChange) {
    const st = settings();
    const list = h('div', { class: 'settings-list' });
    const slider = (key, label) => {
      const val = h('span', { class: 'val' }, Math.round(st[key] * 100));
      const inp = h('input', { type: 'range', min: 0, max: 100, value: Math.round(st[key] * 100), id: 'set-' + key });
      inp.addEventListener('input', () => { st[key] = inp.value / 100; val.textContent = inp.value; UI.audio.applyVolumes(); JG.Meta.save(); });
      inp.addEventListener('change', () => UI.sfx('click'));
      return h('div', { class: 'set-row' }, h('label', { for: 'set-' + key }, label), inp, val);
    };
    const toggle = (key, label, sub) => {
      const t = h('button', { class: 'toggle' + (st[key] ? ' on' : ''), 'aria-pressed': st[key] ? 'true' : 'false' });
      t.addEventListener('click', () => { st[key] = !st[key]; t.classList.toggle('on', st[key]); JG.Meta.save(); UI.sfx('click'); onChange && onChange(); });
      return h('div', { class: 'set-row' }, h('label', null, label, sub ? h('div', { style: { fontSize: '12.5px', color: 'var(--ink-3)' } }, sub) : null), t);
    };
    const seg = h('div', { class: 'seg' });
    [1, 1.5, 2, 3].forEach((v) => seg.appendChild(h('button', { class: st.speed === v ? 'on' : '', onclick: (e) => { st.speed = v; seg.querySelectorAll('button').forEach((b) => b.classList.remove('on')); e.target.classList.add('on'); JG.Meta.save(); UI.sfx('click'); } }, `×${v}`)));
    list.append(slider('master', '전체 소리'), slider('sfx', '효과음'), slider('music', '배경 음악'),
      h('div', { class: 'set-row' }, h('label', null, '연출 속도'), seg),
      toggle('shake', '화면 흔들림'), toggle('tips', '처음 하는 사람 안내', '전투 규칙 설명을 보여 줍니다'),
      toggle('confirmEnd', '턴 종료 확인', '쓸 수 있는 카드가 남았는데 턴을 끝내려 할 때 묻습니다'));
    return list;
  }
  UI.settingsBody = settingsBody;
  UI.settingsModal = function () { UI.modal({ title: '설정', body: h('div', { style: { width: '620px', textAlign: 'left', marginBottom: '16px' } }, settingsBody()), buttons: [{ label: '닫기', cls: 'gold', value: true }] }); };
  S.settings = function () {
    infoScreen('설정', [], (body) => {
      body.appendChild(settingsBody());
      const reset = h('button', { class: 'btn red', style: { marginTop: '24px' }, onclick: async () => {
        const ok = await UI.confirm('기록 지우기', '모든 기록·업적·해금·진행 중인 여정이 지워집니다. 정말 지울까요?', '모두 지운다', '취소');
        if (ok) { JG.Meta.reset(); UI.toast('모든 기록을 지웠습니다.'); UI.go('title'); }
      } }, '모든 기록 지우기');
      body.appendChild(h('div', { style: { textAlign: 'center' } }, reset));
      body.appendChild(h('p', { style: { textAlign: 'center', color: 'var(--ink-3)', fontSize: '13px', marginTop: '24px', lineHeight: 1.7 } },
        '조작: 카드를 눌러 고른 뒤 적을 누르거나 끌어다 놓기 · 숫자키 1~0 카드 고르기 · ←→/Tab 대상 바꾸기 · Enter 사용 · E 턴 종료 · D 덱 · M 지도 · Esc 메뉴'));
    });
  };
})();
