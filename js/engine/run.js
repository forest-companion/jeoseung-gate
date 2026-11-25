'use strict';
// ─────────────────────────────────────────────────────────────
// 한 판(여정)의 진행: 지도, 방 입장, 보상, 장터, 주막, 사건, 막 이동, 저장용 직렬화. (DOM 없음)
// run.room.type: map | combat | reward | event | shop | rest | treasure | bossRelic | victory | defeat
// ─────────────────────────────────────────────────────────────
(function () {
  const D = JG.D;
  const R = JG.R = {};

  JG.ACTS = {
    1: { name: '달 없는 마을', title: '1막', bg: 'bg_act1', tint: '#e9dcc0' },
    2: { name: '안개 숲 폐사찰', title: '2막', bg: 'bg_act2', tint: '#d8dccb' },
    3: { name: '황천길', title: '3막', bg: 'bg_act3', tint: '#cfc6d6' },
  };
  JG.ENC = {
    1: {
      easy: [['wisp', 'wisp'], ['imp'], ['snake'], ['rat', 'rat']],
      normal: [['boar'], ['eggghost', 'wisp'], ['waterghost', 'rat'], ['imp', 'imp'], ['wisp', 'wisp', 'wisp'], ['snake', 'wisp'], ['eggghost', 'imp'], ['boar', 'rat']],
      elite: [['jangsan'], ['dueok'], ['wisp', 'bulyeou', 'wisp']],
      boss: ['gumiho', 'bulgasari'],
    },
    2: {
      easy: [['geuseundae'], ['mangryang', 'mangryang'], ['puppet', 'puppet']],
      normal: [['imae'], ['yagwang', 'mangryang'], ['statue'], ['monk', 'puppet'], ['puppet', 'puppet', 'puppet'], ['geuseundae', 'mangryang'], ['imae', 'yagwang'], ['statue', 'monk']],
      elite: [['haechi'], ['samdu'], ['gangcheol']],
      boss: ['imugi', 'agwi'],
    },
    3: {
      easy: [['mangja', 'mangja', 'mangja'], ['okjol'], ['crow', 'crow']],
      normal: [['mirror'], ['ferryman'], ['skeleton', 'skeleton'], ['okjol', 'mangja'], ['crow', 'skeleton'], ['mirror', 'mangja', 'mangja'], ['ferryman', 'crow'], ['okjol', 'crow']],
      elite: [['chasa'], ['yacha'], ['wonhon']],
      boss: ['heukun'],
    },
  };
  // 무한 저승: 4막부터는 1~3막을 되풀이하며 적이 강해진다
  JG.baseAct = (act) => ((act - 1) % 3) + 1;
  JG.loopOf = (act) => Math.floor((act - 1) / 3);
  JG.actInfo = function (act) {
    const b = JG.ACTS[JG.baseAct(act)];
    if (act <= 3) return b;
    return Object.assign({}, b, { title: `${act}막`, name: b.name + ' · 깊은 곳 ' + JG.loopOf(act) });
  };
  JG.NODE = {
    fight: { name: '전투', icon: '⚔' },
    elite: { name: '강적', icon: '鬼' },
    event: { name: '사건', icon: '?' },
    rest: { name: '주막', icon: '酒' },
    shop: { name: '장터', icon: '市' },
    treasure: { name: '보물', icon: '寶' },
    boss: { name: '보스', icon: '王' },
  };

  // ── 신물 진행 효과 합산 ──
  R.mod = function (run, key) {
    let s = 0;
    for (const r of run.relics) { const rd = D.relics[r.id]; if (rd && rd.runMod && rd.runMod[key]) s += rd.runMod[key]; }
    if (key === 'priceMul' && run.asc >= 7) s += 0.1;
    if (run.mods && run.mods[key]) s += run.mods[key];
    return s;
  };
  R.energyBonus = (run) => R.mod(run, 'energy');

  // ── 난수 (흐름별로 따로) ──
  R.rng = function (run, k) {
    if (!run._r) Object.defineProperty(run, '_r', { value: {}, enumerable: false, writable: true });
    if (!run._r[k]) run._r[k] = JG.RNG(run.rng && run.rng[k] ? run.rng[k] : run.seed + ':' + k);
    return run._r[k];
  };
  R.syncRng = function (run) {
    if (!run._r) return;
    run.rng = run.rng || {};
    for (const k of Object.keys(run._r)) run.rng[k] = run._r[k].state();
  };

  // ── 새 여정 ──
  R.newRun = function (o) {
    const ch = D.chars[o.char];
    const seed = o.seed || String(Date.now() % 1e9) + '-' + Math.floor(Math.random() * 1e6);
    const run = {
      v: 1, char: o.char, asc: o.asc || 0, seed, mode: o.mode || 'normal', mods: o.mods || {},
      hp: ch.hp, maxHp: ch.hp, gold: ch.gold, deck: [], relics: [], potions: [null, null, null],
      act: 1, floor: 0, map: null, pos: null, rng: {}, pity: 0, potionChance: 40, removes: 0,
      seenEvents: [], actFights: 0, lastEnc: [], lastElite: null, room: { type: 'map' }, bossRelicTaken: false,
      stats: { kills: 0, elites: 0, bosses: 0, goldGained: 0, cardsAdded: 0, maxHit: 0, cycles: 0, cardsPlayed: 0, turns: 0, dmgTaken: 0, startedAt: Date.now(), floorsByAct: [] },
      log: [],
      score: 0,
    };
    for (const id of ch.deck) R.addCard(run, id, false, true);
    R.addRelic(run, ch.relic, true);
    if (run.asc >= 5) { run.maxHp -= 6; run.hp = run.maxHp; }
    if (run.asc >= 6) R.addCard(run, 'x_karma', false, true);
    if (o.daily) R.applyDaily(run, o.daily);
    R.newAct(run, 1);
    return run;
  };

  R.newAct = function (run, act) {
    run.act = act;
    run.actFights = 0;
    run.pos = null;
    run.map = R.genMap(R.rng(run, 'map'), act, run);
    run.room = { type: 'map' };
  };

  // ── 지도 만들기 ──
  const ROWS = 13, COLS = 7;
  R.genMap = function (rng, act, run) {
    const rows = [];
    for (let r = 0; r < ROWS; r++) rows.push(new Array(COLS).fill(null));
    const ensure = (r, c) => rows[r][c] || (rows[r][c] = { row: r, col: c, type: null, next: [], prev: [] });
    const starts = [];
    for (let p = 0; p < 6; p++) {
      let c = rng.int(0, COLS - 1);
      if (p === 1) { let tries = 0; while (c === starts[0] && tries++ < 20) c = rng.int(0, COLS - 1); }
      starts.push(c);
      for (let r = 0; r < ROWS; r++) {
        const n = ensure(r, c);
        if (r === ROWS - 1) break;
        let cands = [c - 1, c, c + 1].filter((x) => x >= 0 && x < COLS);
        cands = cands.filter((nc) => {
          if (nc === c + 1) { const side = rows[r][c + 1]; if (side && side.next.includes(c)) return false; }
          if (nc === c - 1) { const side = rows[r][c - 1]; if (side && side.next.includes(c)) return false; }
          return true;
        });
        const nc = rng.pick(cands.length ? cands : [c]);
        if (!n.next.includes(nc)) n.next.push(nc);
        const m = ensure(r + 1, nc);
        if (!m.prev.includes(c)) m.prev.push(c);
        c = nc;
      }
    }
    // 종류 정하기
    const W = { fight: 45, event: 22, elite: 9, rest: 11, shop: 7 };
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const n = rows[r][c];
        if (!n) continue;
        if (r === 0) { n.type = 'fight'; continue; }
        if (r === 6) { n.type = 'treasure'; continue; }
        if (r === ROWS - 1) { n.type = 'rest'; continue; }
        const parents = n.prev.map((pc) => rows[r - 1][pc]).filter(Boolean);
        const parentTypes = new Set(parents.map((p) => p.type));
        const opts = Object.keys(W).filter((t) => {
          if ((t === 'elite' || t === 'rest') && r < 4) return false;
          if (t === 'rest' && r === ROWS - 2) return false;
          if (t === 'shop' && r < 2) return false;
          if (['elite', 'rest', 'shop'].includes(t) && parentTypes.has(t)) return false;
          return true;
        });
        n.type = rng.weighted(opts, (t) => W[t] * (act >= 2 && t === 'elite' ? 1.15 : 1));
      }
    }
    // 장터가 하나도 없으면 하나 만들기
    const all = rows.flat().filter(Boolean);
    if (!all.some((n) => n.type === 'shop')) {
      const cand = all.filter((n) => n.row >= 3 && n.row <= 10 && n.type === 'fight');
      if (cand.length) rng.pick(cand).type = 'shop';
    }
    if (all.filter((n) => n.type === 'elite').length < 2) {
      const cand = all.filter((n) => n.row >= 5 && n.row <= 11 && n.type === 'fight');
      for (let i = 0; i < 2 && cand.length; i++) { const x = rng.pick(cand); x.type = 'elite'; cand.splice(cand.indexOf(x), 1); }
    }
    const boss = rng.pick(JG.ENC[JG.baseAct(act)].boss);
    return { act, rows, boss, cols: COLS };
  };
  R.node = (run, row, col) => (run.map.rows[row] || [])[col] || null;
  R.available = function (run) {
    if (run.room.type !== 'map') return [];
    if (!run.pos) return run.map.rows[0].filter(Boolean);
    if (run.pos.row === ROWS - 1) return [{ row: ROWS, col: 3, type: 'boss', next: [], prev: [] }];
    const cur = R.node(run, run.pos.row, run.pos.col);
    return cur ? cur.next.map((c) => R.node(run, run.pos.row + 1, c)).filter(Boolean) : [];
  };

  // ── 방 들어가기 ──
  R.enter = function (run, row, col) {
    const avail = R.available(run);
    const node = avail.find((n) => n.row === row && n.col === col);
    if (!node) return false;
    run.pos = { row, col };
    run.floor++;
    let type = node.type;
    if (type === 'event') {
      const rng = R.rng(run, 'event');
      const x = rng.next();
      if (x < 0.12) type = 'fight';
      else if (x < 0.15) type = 'shop';
    }
    run.log.push({ floor: run.floor, act: run.act, type });
    if (type === 'fight' || type === 'elite' || type === 'boss') R.setupCombat(run, type === 'fight' ? 'normal' : type);
    else if (type === 'event') R.setupEvent(run);
    else if (type === 'shop') run.room = { type: 'shop', stock: R.genShop(run) };
    else if (type === 'rest') run.room = { type: 'rest', done: false };
    else if (type === 'treasure') R.setupTreasure(run);
    return true;
  };

  R.setupCombat = function (run, kind, enemies, extra) {
    const rng = R.rng(run, 'enc');
    if (!enemies) {
      const E = JG.ENC[JG.baseAct(run.act)];
      if (kind === 'boss') enemies = [run.map.boss];
      else if (kind === 'elite') {
        let pool = E.elite.filter((x) => x.join() !== run.lastElite);
        enemies = rng.pick(pool).slice();
        run.lastElite = enemies.join();
      } else {
        const pool0 = run.actFights < 3 ? E.easy : E.normal;
        let pool = pool0.filter((x) => !run.lastEnc.includes(x.join()));
        if (!pool.length) pool = pool0;
        enemies = rng.pick(pool).slice();
        run.lastEnc.push(enemies.join());
        if (run.lastEnc.length > 2) run.lastEnc.shift();
        run.actFights++;
      }
    }
    run.room = Object.assign({ type: 'combat', kind, enemies, seed: run.seed + ':c' + run.floor + ':' + rng.int(0, 1e9) }, extra || {});
  };

  R.makeCombat = function (run) {
    const rm = run.room;
    const loop = JG.loopOf(run.act);
    const hpMul = (run.mods && run.mods.enemyHp ? 1 + run.mods.enemyHp : 1) * (1 + 0.6 * loop);
    const g = JG.Combat(run, { enemies: rm.enemies, kind: rm.kind, seed: rm.seed, act: run.act, asc: run.asc, hpMul, dmgMul: 1 + 0.3 * loop });
    g.p.emax = 3 + R.energyBonus(run);
    return g;
  };

  // 전투가 끝났을 때 (g.result 가 정해진 뒤 호출)
  R.combatOver = function (run, g) {
    const st = run.stats;
    st.cardsPlayed += g.stats.cards;
    st.cycles += g.stats.cycles;
    st.turns += g.turn;
    st.maxHit = Math.max(st.maxHit, g.stats.maxHit);
    st.dmgTaken += g.cnt.hpLost;
    st.kills += g.enemies.filter((e) => e.dead).length;
    run.lastCombat = { turns: g.turn, hpLost: g.cnt.hpLost, cycles: g.stats.cycles, maxHit: g.stats.maxHit, kind: run.room.kind, enemies: run.room.enemies.slice() };
    if (g.result !== 'win') {
      run.hp = 0;
      run.room = { type: 'defeat', by: run.room.enemies.slice(), kind: run.room.kind };
      return;
    }
    run.hp = Math.min(g.p.hp, run.maxHp);
    run.maxHp = Math.max(run.maxHp, g.p.maxHp);
    const kind = run.room.kind;
    if (kind === 'elite') st.elites++;
    if (kind === 'boss') st.bosses++;
    const after = run.room.after || null;
    run.room = { type: 'reward', kind, items: R.genRewards(run, kind, after), after };
  };

  // ── 보상 ──
  R.goldGain = function (run, n) {
    n = Math.round(n * (1 + R.mod(run, 'goldMul')));
    run.gold += n;
    run.stats.goldGained += n;
    return n;
  };
  R.genRewards = function (run, kind, after) {
    const rng = R.rng(run, 'reward');
    const items = [];
    if (kind !== 'event' || (after && after.gold)) {
      let g = kind === 'elite' ? rng.int(25, 35) : kind === 'boss' ? rng.int(95, 105) : rng.int(10, 20);
      if (after && after.gold) g = after.gold;
      items.push({ type: 'gold', n: g });
    }
    if (kind !== 'boss') {
      if (rng.int(1, 100) <= run.potionChance || (after && after.potion)) { run.potionChance = Math.max(0, run.potionChance - 10); items.push({ type: 'potion', id: R.randomPotion(run) }); }
      else run.potionChance = Math.min(100, run.potionChance + 10);
    }
    if (after && after.relicId) items.push({ type: 'relic', id: run.relics.some((r) => r.id === after.relicId) ? R.randomRelic(run, 'common') : after.relicId });
    else if (kind === 'elite' || (after && after.relic)) items.push({ type: 'relic', id: R.randomRelic(run, R.rollRelicTier(rng)) });
    if (!(after && after.noCard)) items.push({ type: 'card', cards: R.cardChoices(run, kind === 'boss' ? 'boss' : kind) });
    if (kind === 'elite' && after && after.extraCard) items.push({ type: 'card', cards: R.cardChoices(run, kind) });
    return items;
  };
  R.rollRelicTier = (rng) => { const x = rng.int(1, 100); return x <= 50 ? 'common' : x <= 83 ? 'uncommon' : 'rare'; };

  // 이 캐릭터가 얻을 수 있는 카드들
  JG.cardPool = function (char, filter) {
    const out = [];
    for (const id in D.cards) {
      const d = D.cards[id];
      if (d.char !== char) continue;
      if (d.rar === 'special' || d.rar === 'curse') continue;
      if (filter && !filter(d)) continue;
      out.push(d);
    }
    return out;
  };
  R.rollRarity = function (run, kind, rng) {
    if (kind === 'boss') return 'rare';
    const rareP = (kind === 'elite' ? 10 : 3) + run.pity + R.mod(run, 'rareBonus');
    const x = rng.next() * 100;
    if (x < rareP) { run.pity = 0; return 'rare'; }
    if (x < rareP + 37) return 'uncommon';
    run.pity = Math.min(run.pity + 1, 40);
    return 'common';
  };
  R.cardChoices = function (run, kind) {
    const rng = R.rng(run, 'card');
    const n = Math.max(1, 3 + R.mod(run, 'cardChoices'));
    const out = [];
    const used = new Set();
    let guard = 0;
    while (out.length < n && guard++ < 100) {
      const rar = R.rollRarity(run, kind, rng);
      const pool = JG.cardPool(run.char, (d) => d.rar === rar && !used.has(d.id));
      if (!pool.length) continue;
      const d = rng.pick(pool);
      used.add(d.id);
      const upP = (run.act === 2 ? 0.15 : run.act === 3 ? 0.3 : run.act > 3 ? 0.5 : 0) + R.mod(run, 'upChance');
      out.push({ id: d.id, up: d.rar !== 'rare' && rng.next() < upP ? 1 : 0 });
    }
    return out;
  };
  R.randomPotion = function (run) {
    const rng = R.rng(run, 'potion');
    const x = rng.int(1, 100);
    const rar = x <= 65 ? 'common' : x <= 90 ? 'uncommon' : 'rare';
    const pool = Object.values(D.potions).filter((p) => p.rar === rar);
    return rng.pick(pool).id;
  };
  R.randomRelic = function (run, tier) {
    const rng = R.rng(run, 'relic');
    const have = new Set(run.relics.map((r) => r.id));
    const order = tier === 'rare' ? ['rare', 'uncommon', 'common'] : tier === 'uncommon' ? ['uncommon', 'common', 'rare'] : [tier, 'common', 'uncommon', 'rare'];
    for (const t of order) {
      const pool = Object.values(D.relics).filter((r) => r.rar === t && !have.has(r.id) && (!r.char || r.char === run.char));
      if (pool.length) return rng.pick(pool).id;
    }
    return 'r_lucky_pouch';
  };
  R.bossRelicChoices = function (run) {
    const rng = R.rng(run, 'relic');
    const have = new Set(run.relics.map((r) => r.id));
    const pool = Object.values(D.relics).filter((r) => r.rar === 'boss' && !have.has(r.id));
    rng.shuffle(pool);
    return pool.slice(0, 3).map((r) => r.id);
  };

  R.takeReward = function (run, idx, pick) {
    const rm = run.room;
    if (rm.type !== 'reward') return { ok: false };
    const it = rm.items[idx];
    if (!it || it.taken) return { ok: false };
    if (it.type === 'gold') { R.goldGain(run, it.n); it.taken = true; }
    else if (it.type === 'potion') {
      if (!R.addPotion(run, it.id)) return { ok: false, reason: '약 주머니가 가득 찼습니다.' };
      it.taken = true;
    } else if (it.type === 'relic') { R.addRelic(run, it.id); it.taken = true; }
    else if (it.type === 'card') {
      if (pick === 'skip') { it.taken = true; it.skipped = true; }
      else { const c = it.cards[pick]; if (!c) return { ok: false }; R.addCard(run, c.id, c.up); it.taken = true; it.picked = pick; }
    }
    return { ok: true };
  };

  R.leaveReward = function (run) {
    const rm = run.room;
    if (rm.kind === 'boss') {
      if (run.act >= 3 && run.mode !== 'endless') { R.finish(run, true); return; }
      run.room = { type: 'bossRelic', choices: R.bossRelicChoices(run) };
      return;
    }
    run.room = { type: 'map' };
  };
  R.takeBossRelic = function (run, idx) {
    if (run.room.type !== 'bossRelic') return false;
    const id = run.room.choices[idx];
    if (id) R.addRelic(run, id);
    R.nextAct(run);
    return true;
  };
  R.nextAct = function (run) {
    run.stats.floorsByAct.push(run.floor);
    const heal = Math.ceil((run.maxHp - run.hp) * (run.asc >= 4 ? 0.6 : 0.75));
    run.hp = Math.min(run.maxHp, run.hp + heal);
    R.newAct(run, run.act + 1);
    run.room = { type: 'map', actIntro: true, healed: heal };
  };
  R.finish = function (run, won) {
    run.room = { type: won ? 'victory' : 'defeat' };
    run.stats.endedAt = Date.now();
  };

  // ── 덱·신물·약 다루기 ──
  R.addCard = function (run, id, up, silent) {
    const d = D.cards[id];
    if (!d) throw new Error('unknown card ' + id);
    if (d.rar === 'basic' && run.relics.some((r) => r.id === 'r_millstone')) up = 1;
    const c = { uid: 'd' + JG.uid() + '-' + Math.floor(Math.random() * 1e6), id, up: up ? 1 : 0 };
    run.deck.push(c);
    if (!silent) run.stats.cardsAdded++;
    if (JG.Meta && JG.Meta.seeCard) JG.Meta.seeCard(id);
    return c;
  };
  R.removeCard = function (run, uid) {
    const i = run.deck.findIndex((c) => c.uid === uid);
    if (i >= 0) return run.deck.splice(i, 1)[0];
    return null;
  };
  R.canUpgrade = (c) => !c.up && D.cards[c.id].type !== 'curse' && D.cards[c.id].type !== 'status' && D.cards[c.id].rar !== 'curse';
  R.upgradeCard = function (run, uid) {
    const c = run.deck.find((x) => x.uid === uid);
    if (!c || !R.canUpgrade(c)) return false;
    c.up = 1;
    return true;
  };
  R.transformCard = function (run, uid) {
    const old = R.removeCard(run, uid);
    if (!old) return null;
    const rng = R.rng(run, 'misc');
    const pool = JG.cardPool(run.char, (d) => d.id !== old.id && d.rar !== 'basic');
    const d = rng.pick(pool);
    return R.addCard(run, d.id, old.up);
  };
  R.addRelic = function (run, id, silent) {
    if (run.relics.some((r) => r.id === id)) return false;
    const rd = D.relics[id];
    if (!rd) throw new Error('unknown relic ' + id);
    const r = { id, n: 0 };
    run.relics.push(r);
    if (rd.pickup) rd.pickup(run, r);
    if (JG.Meta && JG.Meta.seeRelic) JG.Meta.seeRelic(id);
    return true;
  };
  R.addPotion = function (run, id) {
    const i = run.potions.indexOf(null);
    if (i < 0) return false;
    run.potions[i] = id;
    if (JG.Meta && JG.Meta.seePotion) JG.Meta.seePotion(id);
    return true;
  };
  R.discardPotion = function (run, slot) { run.potions[slot] = null; };
  R.usePotionOut = function (run, slot) {
    const id = run.potions[slot];
    const pd = id && D.potions[id];
    if (!pd || !pd.useOut) return false;
    pd.useOut(run, run.relics.some((r) => r.id === 'r_gourd_big') ? 2 : 1);
    run.potions[slot] = null;
    return true;
  };
  R.loseHp = function (run, n) {
    run.hp = Math.max(0, run.hp - n);
    run.stats.dmgTaken += n;
    if (run.hp <= 0) {
      const herb = run.relics.find((r) => (r.id === 'r_immortal_herb' || r.id === 'r_bari_flower') && !r.used);
      if (herb) { herb.used = true; run.hp = Math.floor(run.maxHp * (herb.id === 'r_immortal_herb' ? 0.5 : 0.3)); }
      else R.finish(run, false);
    }
  };
  R.heal = function (run, n) { run.hp = Math.min(run.maxHp, run.hp + n); };

  // ── 장터 ──
  R.price = function (run, base) { return Math.max(1, Math.round(base * (1 + R.mod(run, 'priceMul')))); };
  R.genShop = function (run) {
    const rng = R.rng(run, 'shop');
    const cards = [];
    const used = new Set();
    const types = ['atk', 'atk', 'skill', 'skill', 'power'];
    for (const ty of types) {
      let d = null;
      for (let t = 0; t < 30 && !d; t++) {
        const rar = R.rollRarity(run, 'shop', rng);
        const pool = JG.cardPool(run.char, (x) => x.type === ty && x.rar === rar && !used.has(x.id));
        if (pool.length) d = rng.pick(pool);
      }
      if (!d) continue;
      used.add(d.id);
      const base = d.rar === 'rare' ? rng.int(135, 165) : d.rar === 'uncommon' ? rng.int(68, 82) : rng.int(45, 55);
      cards.push({ id: d.id, up: rng.next() < R.mod(run, 'upChance') ? 1 : 0, price: R.price(run, base) });
    }
    const neutral = JG.cardPool('neutral');
    for (let i = 0; i < 2; i++) {
      const pool = neutral.filter((x) => !used.has(x.id));
      if (!pool.length) break;
      const d = rng.pick(pool);
      used.add(d.id);
      const base = d.rar === 'rare' ? rng.int(160, 180) : d.rar === 'uncommon' ? rng.int(80, 95) : rng.int(55, 65);
      cards.push({ id: d.id, up: 0, price: R.price(run, base) });
    }
    if (cards.length) { const s = rng.int(0, Math.min(4, cards.length - 1)); cards[s].price = Math.round(cards[s].price / 2); cards[s].sale = true; }
    const relics = [];
    const have = new Set(run.relics.map((r) => r.id));
    for (let i = 0; i < 3; i++) {
      const tier = i === 2 ? 'shop' : R.rollRelicTier(rng);
      const pool = Object.values(D.relics).filter((r) => r.rar === tier && !have.has(r.id) && (!r.char || r.char === run.char));
      if (!pool.length) continue;
      const rd = rng.pick(pool);
      have.add(rd.id);
      const base = tier === 'rare' ? rng.int(270, 310) : tier === 'uncommon' ? rng.int(220, 260) : rng.int(140, 165);
      relics.push({ id: rd.id, price: R.price(run, base) });
    }
    const potions = [];
    for (let i = 0; i < 3; i++) {
      const id = R.randomPotion(run);
      const rar = D.potions[id].rar;
      const base = rar === 'rare' ? rng.int(95, 105) : rar === 'uncommon' ? rng.int(70, 80) : rng.int(46, 54);
      potions.push({ id, price: R.price(run, base) });
    }
    return { cards, relics, potions, removeUsed: false };
  };
  R.removeCost = function (run) {
    const fixed = R.mod(run, 'fixedRemove');
    if (fixed) return fixed;
    return R.price(run, 75 + 25 * run.removes);
  };
  R.buy = function (run, kind, idx) {
    const st = run.room.stock;
    const it = st[kind][idx];
    if (!it || it.sold) return { ok: false };
    if (run.gold < it.price) return { ok: false, reason: '엽전이 모자랍니다.' };
    if (kind === 'potions' && run.potions.indexOf(null) < 0) return { ok: false, reason: '약 주머니가 가득 찼습니다.' };
    run.gold -= it.price;
    if (kind === 'cards') R.addCard(run, it.id, it.up);
    else if (kind === 'relics') R.addRelic(run, it.id);
    else R.addPotion(run, it.id);
    it.sold = true;
    return { ok: true };
  };
  R.shopRemove = function (run, uid) {
    const st = run.room.stock;
    if (st.removeUsed) return { ok: false };
    const cost = R.removeCost(run);
    if (run.gold < cost) return { ok: false, reason: '엽전이 모자랍니다.' };
    if (!R.removeCard(run, uid)) return { ok: false };
    run.gold -= cost;
    run.removes++;
    st.removeUsed = true;
    return { ok: true };
  };

  // ── 주막 ──
  R.restHealAmount = (run) => Math.floor(run.maxHp * (run.asc >= 4 ? 0.25 : 0.3)) + R.mod(run, 'restHeal');
  R.rest = function (run, action, uid) {
    if (run.room.type !== 'rest' || run.room.done) return false;
    if (action === 'rest') {
      if (R.mod(run, 'noRest')) return false;
      const n = R.restHealAmount(run);
      R.heal(run, n);
      run.room.done = 'rest';
      run.room.healed = n;
    } else if (action === 'smith') {
      if (!R.upgradeCard(run, uid)) return false;
      run.room.done = 'smith';
    } else return false;
    return true;
  };

  // ── 보물 ──
  R.setupTreasure = function (run) {
    const rng = R.rng(run, 'reward');
    const x = rng.int(1, 100);
    const tier = x <= 49 ? 'common' : x <= 91 ? 'uncommon' : 'rare';
    run.room = { type: 'treasure', relic: R.randomRelic(run, tier), gold: rng.chance(0.5) ? rng.int(20, 35) : 0, opened: false };
  };
  R.openTreasure = function (run) {
    const rm = run.room;
    if (rm.type !== 'treasure' || rm.opened) return false;
    rm.opened = true;
    R.addRelic(run, rm.relic);
    if (rm.gold) R.goldGain(run, rm.gold);
    return true;
  };

  // ── 사건 ──
  R.setupEvent = function (run) {
    const rng = R.rng(run, 'event');
    const pool = Object.values(D.events).filter((e) => (!e.acts || e.acts.includes(run.act)) && !run.seenEvents.includes(e.id) && (!e.cond || e.cond(run)));
    if (!pool.length) { R.setupCombat(run, 'normal'); return; }
    const ev = rng.pick(pool);
    run.seenEvents.push(ev.id);
    run.room = { type: 'event', id: ev.id, stage: 'start', st: {}, endText: null };
    if (JG.Meta && JG.Meta.seeEvent) JG.Meta.seeEvent(ev.id);
  };
  R.eventView = function (run) {
    const rm = run.room;
    const ev = D.events[rm.id];
    if (rm.stage === '$end') return { title: ev.name, img: ev.img, text: rm.endText, choices: [{ label: '[떠난다]', leave: true }] };
    if (rm.pendingDeck) return { title: ev.name, img: ev.img, text: rm.pendingDeck.text || '카드를 고르세요.', choices: [{ label: '[카드를 고른다]', deckResume: true }] };
    const v = ev.stages[rm.stage](run, rm.st);
    return { title: ev.name, img: ev.img, text: v.text, choices: v.choices };
  };
  R.eventChoose = function (run, idx) {
    const rm = run.room;
    if (rm.type !== 'event') return null;
    const view = R.eventView(run);
    const ch = view.choices[idx];
    if (!ch || ch.disabled) return null;
    if (ch.leave) { run.room = { type: 'map' }; return { leave: true }; }
    if (ch.deckResume) return { deck: rm.pendingDeck };
    const res = ch.go(run, rm.st);
    return R.applyEventResult(run, res);
  };
  R.applyEventResult = function (run, res) {
    const rm = run.room;
    if (run.room.type === 'defeat') return { dead: true };
    if (typeof res === 'string') { rm.stage = res; return { stage: res }; }
    res = res || {};
    if (res.combat) {
      const after = Object.assign({ relic: false }, res.after || {});
      R.setupCombat(run, res.combat.kind || 'event', res.combat.enemies, { after, eventId: rm.id });
      return { combat: true };
    }
    if (res.deck) {
      rm.pendingDeck = { mode: res.deck.mode, count: res.deck.count || 1, text: res.text || '', title: res.deck.title, optional: !!res.deck.optional };
      return { deck: rm.pendingDeck };
    }
    rm.stage = '$end';
    rm.endText = res.text || '';
    return { end: true };
  };
  R.deckFilter = function (mode) {
    if (mode === 'upgrade') return (c) => R.canUpgrade(c);
    if (mode === 'remove' || mode === 'transform') return (c) => D.cards[c.id].rar !== 'special';
    if (mode === 'removeCurse') return (c) => D.cards[c.id].type === 'curse';
    return () => true;
  };
  R.eventDeckDone = function (run, uids) {
    const rm = run.room;
    const pd = rm.pendingDeck;
    if (!pd) return false;
    const out = [];
    for (const uid of uids.slice(0, pd.count)) {
      if (pd.mode === 'remove' || pd.mode === 'removeCurse') { const c = R.removeCard(run, uid); if (c) out.push(D.cards[c.id].name); }
      else if (pd.mode === 'upgrade') { if (R.upgradeCard(run, uid)) out.push(D.cards[run.deck.find((x) => x.uid === uid).id].name); }
      else if (pd.mode === 'transform') { const c = R.transformCard(run, uid); if (c) out.push(D.cards[c.id].name); }
      else if (pd.mode === 'duplicate') { const c = run.deck.find((x) => x.uid === uid); if (c) { R.addCard(run, c.id, c.up); out.push(D.cards[c.id].name); } }
    }
    delete rm.pendingDeck;
    rm.stage = '$end';
    const verb = { remove: '덱에서 없앴다', removeCurse: '저주를 씻어냈다', upgrade: '강화했다', transform: '새 카드로 바뀌었다', duplicate: '복제했다' }[pd.mode];
    rm.endText = (pd.text ? pd.text + '\n\n' : '') + (out.length ? `「${out.join('」, 「')}」 — ${verb}.` : '아무것도 고르지 않았다.');
    return true;
  };

  // ── 일일 도전 ──
  JG.DAILY_MODS = [
    { id: 'rich', name: '부잣집 도령', desc: '엽전 300으로 시작하지만 장터 가격이 30% 비쌉니다.', apply(run) { run.gold = 300; run.mods.priceMul = (run.mods.priceMul || 0) + 0.3; } },
    { id: 'glass', name: '유리 몸', desc: '최대 체력이 절반이지만 매 턴 기력 +1.', apply(run) { run.maxHp = Math.ceil(run.maxHp / 2); run.hp = run.maxHp; run.mods.energy = (run.mods.energy || 0) + 1; } },
    { id: 'swarm', name: '요괴 떼', desc: '적의 체력이 20% 많습니다. 카드 보상 선택지 +1.', apply(run) { run.mods.enemyHp = 0.2; run.mods.cardChoices = 1; } },
    { id: 'relicky', name: '보물 사냥꾼', desc: '무작위 신물 2개를 들고 시작합니다.', apply(run) { R.addRelic(run, R.randomRelic(run, 'uncommon'), true); R.addRelic(run, R.randomRelic(run, 'rare'), true); } },
    { id: 'cursed', name: '업보 짊어지기', desc: '저주 2장을 안고 시작하지만 희귀 카드가 잘 나옵니다.', apply(run) { R.addCard(run, 'x_doubt', false, true); R.addCard(run, 'x_regret', false, true); run.mods.rareBonus = 10; } },
    { id: 'potion', name: '약방 손님', desc: '약 슬롯 5칸, 무작위 약 3개를 들고 시작합니다.', apply(run) { run.potions = [null, null, null, null, null]; for (let i = 0; i < 3; i++) R.addPotion(run, R.randomPotion(run)); } },
  ];
  R.applyDaily = function (run, d) {
    run.daily = d.date;
    for (const id of d.mods) { const m = JG.DAILY_MODS.find((x) => x.id === id); if (m) m.apply(run); }
  };
  R.dailyConfig = function (dateStr) {
    const rng = JG.RNG('daily:' + dateStr);
    const chars = Object.keys(D.chars).filter((k) => !D.chars[k].hidden);
    const mods = rng.shuffle(JG.DAILY_MODS.map((m) => m.id)).slice(0, 2);
    return { date: dateStr, char: rng.pick(chars), mods, seed: 'daily-' + dateStr };
  };

  // ── 점수 ──
  R.score = function (run, won) {
    const s = run.stats;
    let score = run.floor * 10 + s.kills * 3 + s.elites * 25 + s.bosses * 60 + Math.floor(s.goldGained / 10) + s.cycles * 5;
    if (won) score += 300 + run.hp * 2;
    if (run.mode === 'endless') score += Math.max(0, run.act - 3) * 150;
    score = Math.round(score * (1 + run.asc * 0.1));
    return score;
  };

  // ── 저장용 ──
  R.serialize = function (run) {
    R.syncRng(run);
    return JSON.stringify(run);
  };
  R.deserialize = function (str) {
    const run = JSON.parse(str);
    return run;
  };
})();
