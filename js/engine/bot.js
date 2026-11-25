'use strict';
// ─────────────────────────────────────────────────────────────
// 자동 플레이 봇: 밸런스 시뮬레이션(tools/sim.js)과 화면 속 '추천 수' 표시에 쓴다.
// 전투는 "한 수 앞을 실제로 해 보고 되돌리기"로 가장 좋아지는 수를 고른다.
// ─────────────────────────────────────────────────────────────
(function () {
  const D = JG.D;
  const B = JG.Bot = {};

  // ── 전투 상태 저장/복원 ──
  B.snap = function (g) {
    return {
      s: JSON.stringify({ p: g.p, enemies: g.enemies, pile: g.pile, chain: g.chain, cycles: g.cycles, next: g.next, cnt: g.cnt, flags: g.flags, stats: g.stats, turn: g.turn, phase: g.phase, over: g.over, result: g.result, persistChain: g.persistChain, rng: g.rng.s, curEl: g.curEl,
        run: { hp: g.run.hp, maxHp: g.run.maxHp, gold: g.run.gold, potions: g.run.potions, relics: g.run.relics } }),
      fx: g.fx.length,
    };
  };
  B.restore = function (g, sn) {
    const o = JSON.parse(sn.s);
    g.p = o.p; g.enemies = o.enemies; g.pile = o.pile; g.chain = o.chain; g.cycles = o.cycles; g.next = o.next; g.cnt = o.cnt; g.flags = o.flags; g.stats = o.stats;
    g.turn = o.turn; g.phase = o.phase; g.over = o.over; g.result = o.result; g.persistChain = o.persistChain; g.rng.s = o.rng; g.curEl = o.curEl;
    g.run.hp = o.run.hp; g.run.maxHp = o.run.maxHp; g.run.gold = o.run.gold; g.run.potions = o.run.potions; g.run.relics = o.run.relics;
    g.fx.length = sn.fx; g.steps = []; g.pending = null;
  };

  // 카드의 대략적인 가치(고르기·보상용)
  B.cardWorth = function (id, up) {
    const d = D.cards[id];
    if (!d) return 0;
    if (d.type === 'curse') return -10;
    if (d.type === 'status') return -6;
    let w = { basic: 0.6, common: 1.6, uncommon: 2.4, rare: 3.4, special: 1 }[d.rar] || 1;
    if (d.type === 'power') w += 0.4;
    if (up) w += 0.5;
    return w;
  };

  const tri = (n) => n * (n + 1) / 2;
  B.incoming = function (g) {
    let inc = 0;
    for (const e of g.alive()) { const it = g.intentOf(e); if (it && it.dmg !== undefined && !it.stunned) inc += it.dmg * (it.hits || 1); }
    return inc;
  };
  // 상태 가치 함수 (terminal=true: 턴을 끝낸다고 볼 때 — 남은 기력·손패는 가치 없음)
  B.value = function (g, terminal) {
    if (g.result === 'win') return 1e6 + g.p.hp * 10;
    if (g.result === 'lose' || g.p.hp <= 0) return -1e6;
    let v = 0;
    for (const e of g.enemies) {
      if (e.escaped) { v -= 20; continue; }
      if (e.dead) { v += 14 + (e.minion ? 0 : 6); continue; }
      v -= e.hp;
      v -= e.block * 0.45;
      const b = e.st.burn || 0;
      v += Math.min(tri(b), e.hp) * 0.75;
      v += (e.st.crack || 0) * 3.5 + (e.st.chill || 0) * 2.5 + (e.st.stun ? 10 : 0);
      v -= (e.st.sharp || 0) * 3 + (e.st.thorns || 0) * 1.5 + (e.st.regen || 0) * 1.5 + (e.st.frenzy || 0) * 4;
    }
    const p = g.p;
    v += p.hp * 1.6;
    const inc = B.incoming(g);
    const unblocked = Math.max(0, inc - p.block);
    v -= unblocked * 1.35;
    v += Math.min(Math.max(0, p.block - inc), 12) * (p.st.bedrock ? 0.6 : 0.08);
    v += (p.st.sharp || 0) * 4 + (p.st.sturdy || 0) * 3 + (p.st.thorns || 0) * 1.6 + Math.min(tri(p.st.regen || 0), p.maxHp - p.hp + 6) * 0.7;
    v -= tri(p.st.burn || 0) * 1.1 + (p.st.crack || 0) * 2.5 + (p.st.chill || 0) * 2;
    v += (p.st.fury || 0) * 1.5 + (p.st.wisp || 0) * 3.5;
    for (const k of Object.keys(p.st)) if (k.startsWith('p_')) v += 9;
    if (p.st.bedrock) v += 6;
    if (!terminal) v += p.energy * 1.6 + g.pile.hand.length * 0.9;
    else v += g.pile.hand.filter((c) => JG.cardKw(c, 'retain')).length * 0.5;
    v += g.chain.n * (g.persistChain ? 1.2 : 0.3) + g.chain.free * 2;
    v += g.next.energy * 3 + g.next.draw * 1.3 + g.next.block * 0.8;
    for (const k of ['hand', 'draw', 'discard']) for (const c of g.pile[k]) { const t = D.cards[c.id].type; if (t === 'status') v -= 1.5; }
    return v;
  };

  // 고르기(pending) 자동 처리
  B.resolvePending = function (g) {
    let guard = 0;
    while (g.pending && guard++ < 10) {
      const pd = g.pending;
      const bad = /소멸|버릴|내려|바칠|팔/.test(pd.title);
      const sorted = pd.cands.slice().sort((a, b) => B.cardWorth(a.id, a.up) - B.cardWorth(b.id, b.up));
      const pick = bad ? sorted.slice(0, Math.max(pd.min, 1)) : sorted.reverse().slice(0, Math.max(pd.min, 1));
      g.resolve(pick.map((c) => c.uid));
    }
  };

  // 가능한 수 목록
  B.moves = function (g) {
    const out = [];
    for (const c of g.pile.hand) {
      if (!g.canPlay(c)) continue;
      if (g.needsTarget(c)) for (const e of g.alive()) out.push({ kind: 'card', c, t: e });
      else out.push({ kind: 'card', c, t: null });
    }
    return out;
  };
  B.tryMove = function (g, m) {
    const sn = B.snap(g);
    if (m.kind === 'card') g.play(m.c, m.t);
    else g.usePotion(m.slot, m.t);
    B.resolvePending(g);
    const v = B.value(g);
    B.restore(g, sn);
    return v;
  };
  // 지금 가장 좋은 수 (없으면 null = 턴 종료)
  B.best = function (g, withPotions) {
    const base = B.value(g);
    let best = null, bestV = base + 0.4;
    for (const m of B.moves(g)) {
      // uid 로 다시 찾기 (복원하면 객체가 바뀌므로)
      const v = B.tryMove(g, { kind: 'card', c: g.pile.hand.find((x) => x.uid === m.c.uid), t: m.t ? g.enemies.find((e) => e.uid === m.t.uid) : null });
      if (v > bestV) { bestV = v; best = { kind: 'card', uid: m.c.uid, tuid: m.t ? m.t.uid : null, v }; }
    }
    if (withPotions) {
      const danger = B.incoming(g) - g.p.block >= g.p.hp;
      const big = g.cfg.kind === 'boss' || g.cfg.kind === 'elite';
      g.run.potions.forEach((id, slot) => {
        if (!id || !g.canUsePotion(slot)) return;
        if (!(danger || (big && g.turn <= 2) || g.p.hp < g.p.maxHp * 0.3)) return;
        const pd = D.potions[id];
        const ts = pd.target === 'enemy' ? g.alive() : [null];
        for (const t of ts) {
          const v = B.tryMove(g, { kind: 'potion', slot, t: t ? g.enemies.find((e) => e.uid === t.uid) : null });
          if (v > bestV + 3) { bestV = v; best = { kind: 'potion', slot, tuid: t ? t.uid : null, v }; }
        }
      });
    }
    return best;
  };
  B.doMove = function (g, m) {
    if (m.kind === 'card') {
      const c = g.pile.hand.find((x) => x.uid === m.uid);
      const t = m.tuid ? g.enemies.find((e) => e.uid === m.tuid) : null;
      g.play(c, t);
    } else g.usePotion(m.slot, m.tuid ? g.enemies.find((e) => e.uid === m.tuid) : null);
    B.resolvePending(g);
  };
  // 한 턴 전체 계획 (빔 탐색). 난수 상태까지 되돌리므로 계획한 그대로 재현된다.
  B.planTurn = function (g, K, maxDepth) {
    K = K || 5; maxDepth = maxDepth || 8;
    const root = B.snap(g);
    let best = { seq: [], v: B.value(g, true) };
    let beam = [{ seq: [], sn: root }];
    for (let depth = 0; depth < maxDepth && beam.length; depth++) {
      const next = [];
      for (const node of beam) {
        B.restore(g, node.sn);
        const seen = new Set();
        const moves = [];
        for (const m of B.moves(g)) {
          const key = m.c.id + (m.c.up ? '+' : '') + JSON.stringify(m.c.bonus || {}) + (m.c.costTurn !== undefined ? 'z' : '') + '>' + (m.t ? m.t.uid : '');
          if (seen.has(key)) continue;
          seen.add(key);
          moves.push({ uid: m.c.uid, tuid: m.t ? m.t.uid : null });
        }
        for (const mv of moves) {
          B.restore(g, node.sn);
          B.doMove(g, { kind: 'card', uid: mv.uid, tuid: mv.tuid });
          const vt = B.value(g, true);
          const seq = node.seq.concat([mv]);
          if (vt > best.v + 0.01) best = { seq, v: vt };
          if (g.over) continue;
          next.push({ seq, sn: B.snap(g), h: B.value(g, false) });
        }
      }
      next.sort((a, b) => b.h - a.h);
      beam = next.slice(0, K);
    }
    B.restore(g, root);
    return best.seq;
  };
  B.playTurn = function (g) {
    // 약은 따로 판단
    let guard = 0;
    while (!g.over && g.phase === 'player' && guard++ < 4) {
      const pm = B.best(g, true);
      if (!pm || pm.kind !== 'potion') break;
      B.doMove(g, pm);
    }
    if (g.over) return;
    const plan = B.planTurn(g);
    for (const mv of plan) {
      if (g.over || g.phase !== 'player') break;
      const c = g.pile.hand.find((x) => x.uid === mv.uid);
      if (!c || !g.canPlay(c)) break;
      B.doMove(g, { kind: 'card', uid: mv.uid, tuid: mv.tuid });
    }
    if (!g.over && g.phase === 'player') g.endTurn();
  };
  B.playCombat = function (g, maxTurns) {
    maxTurns = maxTurns || 60;
    if (g.phase === 'init') g.start();
    while (!g.over && g.turn <= maxTurns) { B.playTurn(g); g.fx.length = 0; }
    if (!g.over) { g.lose(); }
    return g.result;
  };

  // ── 전투 밖 결정 ──
  B.pickCard = function (run, cards, rng) {
    let best = -1, bestW = run.deck.length > 22 ? 2.3 : 1.2;
    cards.forEach((c, i) => {
      let w = B.cardWorth(c.id, c.up) + rng.next() * 0.6;
      const d = D.cards[c.id];
      const same = run.deck.filter((x) => x.id === c.id).length;
      w -= same * 0.6;
      if (d.type === 'power' && run.deck.filter((x) => D.cards[x.id].type === 'power').length >= 3) w -= 0.8;
      if (w > bestW) { bestW = w; best = i; }
    });
    return best < 0 ? 'skip' : best;
  };
  B.pickNode = function (run, nodes, rng) {
    const hp = run.hp / run.maxHp;
    const W = hp < 0.35 ? { rest: 6, shop: 3, event: 2.5, fight: 1, elite: 0.15, treasure: 8, boss: 1 }
      : hp < 0.6 ? { rest: 3, shop: 2, event: 3, fight: 3, elite: 0.8, treasure: 8, boss: 1 }
        : { rest: 0.8, shop: run.gold >= 150 ? 3 : 1.2, event: 2.5, fight: 3, elite: run.act === 1 && run.floor < 5 ? 1 : 3, treasure: 8, boss: 1 };
    return rng.weighted(nodes, (n) => W[n.type] || 1);
  };
  B.restChoice = function (run) {
    const hp = run.hp / run.maxHp;
    const beforeBoss = run.pos && run.pos.row >= 12;
    if (JG.R.mod(run, 'noRest')) return 'smith';
    if (hp < 0.5 || (beforeBoss && hp < 0.75)) return 'rest';
    return run.deck.some((c) => JG.R.canUpgrade(c)) ? 'smith' : 'rest';
  };
  B.bestUpgrade = function (run) {
    const cands = run.deck.filter((c) => JG.R.canUpgrade(c));
    cands.sort((a, b) => B.cardWorth(b.id, 0) - B.cardWorth(a.id, 0));
    return cands[0] ? cands[0].uid : null;
  };
  B.worstCard = function (run) {
    const cands = run.deck.filter((c) => D.cards[c.id].rar !== 'special');
    cands.sort((a, b) => B.cardWorth(a.id, a.up) - B.cardWorth(b.id, b.up));
    return cands[0] ? cands[0].uid : null;
  };
  B.deckPick = function (run, mode) {
    const f = JG.R.deckFilter(mode);
    const cands = run.deck.filter(f);
    if (!cands.length) return [];
    if (mode === 'upgrade') { cands.sort((a, b) => B.cardWorth(b.id, 0) - B.cardWorth(a.id, 0)); return [cands[0].uid]; }
    if (mode === 'duplicate') { cands.sort((a, b) => B.cardWorth(b.id, b.up) - B.cardWorth(a.id, a.up)); return [cands[0].uid]; }
    cands.sort((a, b) => B.cardWorth(a.id, a.up) - B.cardWorth(b.id, b.up));
    return [cands[0].uid];
  };
  B.shop = function (run) {
    const st = run.room.stock;
    const R = JG.R;
    const worst = B.worstCard(run);
    if (worst && !st.removeUsed && run.gold >= R.removeCost(run) && B.cardWorth(run.deck.find((c) => c.uid === worst).id) < 1) R.shopRemove(run, worst);
    st.relics.forEach((it, i) => { if (!it.sold && run.gold >= it.price) R.buy(run, 'relics', i); });
    st.cards.forEach((it, i) => { if (!it.sold && run.gold >= it.price + 20 && B.cardWorth(it.id, it.up) >= 2.4) R.buy(run, 'cards', i); });
    st.potions.forEach((it, i) => { if (!it.sold && run.gold >= it.price + 60 && run.potions.indexOf(null) >= 0) R.buy(run, 'potions', i); });
  };
  B.event = function (run, rng) {
    const R = JG.R;
    let guard = 0;
    while (run.room.type === 'event' && guard++ < 10) {
      const view = R.eventView(run);
      const ok = view.choices.map((c, i) => ({ c, i })).filter((x) => !x.c.disabled);
      if (!ok.length) { run.room = { type: 'map' }; return; }
      const lowHp = run.hp < run.maxHp * 0.4;
      const pick = rng.weighted(ok, (x) => (x.c.leave ? 1 : 1) * (lowHp && /체력 -|전투/.test(x.c.hint || '') ? 0.1 : 1) * (/저주/.test(x.c.hint || '') ? 0.3 : 1));
      const res = R.eventChoose(run, pick.i);
      if (!res) { run.room = { type: 'map' }; return; }
      if (res.deck) R.eventDeckDone(run, B.deckPick(run, res.deck.mode));
      if (res.combat || res.dead) return;
    }
  };

  // 한 판 전체를 자동으로
  B.runOnce = function (opts) {
    const R = JG.R;
    const run = R.newRun({ char: opts.char || 'yeonhwa', asc: opts.asc || 0, seed: opts.seed });
    const rng = JG.RNG('bot:' + run.seed);
    const log = [];
    let guard = 0;
    while (guard++ < 400) {
      const rm = run.room;
      if (rm.type === 'victory' || rm.type === 'defeat') break;
      if (rm.type === 'map') {
        const av = R.available(run);
        if (!av.length) { log.push('no nodes'); break; }
        const n = B.pickNode(run, av, rng);
        R.enter(run, n.row, n.col);
      } else if (rm.type === 'combat') {
        const g = R.makeCombat(run);
        const enemies = rm.enemies.join('+');
        B.playCombat(g);
        if (opts.onCombat) opts.onCombat(run, g, enemies);
        R.combatOver(run, g);
        if (run.room.type === 'defeat') { run.killedBy = enemies; run.diedAct = run.act; break; }
      } else if (rm.type === 'reward') {
        rm.items.forEach((it, i) => {
          if (it.type === 'card') R.takeReward(run, i, B.pickCard(run, it.cards, rng));
          else R.takeReward(run, i);
        });
        R.leaveReward(run);
      } else if (rm.type === 'bossRelic') {
        R.takeBossRelic(run, rng.int(0, rm.choices.length - 1));
      } else if (rm.type === 'rest') {
        const a = B.restChoice(run);
        if (a === 'smith') { const u = B.bestUpgrade(run); if (u) R.rest(run, 'smith', u); else R.rest(run, 'rest'); }
        else R.rest(run, 'rest');
        run.room = { type: 'map' };
      } else if (rm.type === 'shop') {
        B.shop(run);
        run.room = { type: 'map' };
      } else if (rm.type === 'treasure') {
        R.openTreasure(run);
        run.room = { type: 'map' };
      } else if (rm.type === 'event') {
        B.event(run, rng);
        if (run.room.type === 'event') run.room = { type: 'map' };
      } else { log.push('unknown room ' + rm.type); break; }
      // 전투 밖 약: 체력이 낮으면 회복약
      if (run.hp < run.maxHp * 0.4) run.potions.forEach((id, i) => { if (id && D.potions[id].useOut) R.usePotionOut(run, i); });
    }
    return { run, won: run.room.type === 'victory', floor: run.floor, act: run.act, log };
  };
})();
