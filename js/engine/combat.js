'use strict';
// ─────────────────────────────────────────────────────────────
// 전투 엔진 (DOM 없음). 화면은 g.fx 에 쌓이는 연출 이벤트를 차례로 재생한다.
// 카드 효과 안에서 고르기(g.choose)가 나오면 g.pending 이 생기고, g.resolve(uid들)로 이어 간다.
// ─────────────────────────────────────────────────────────────
(function () {
  const D = JG.D;
  JG.cdef = (c) => D.cards[c.id];
  JG.newCard = (id, up, extra) => Object.assign({ uid: 'c' + JG.uid(), id, up: up ? 1 : 0, bonus: {} }, extra || {});
  JG.cardKw = function (c, k) {
    const d = D.cards[c.id];
    const list = (c.up && d.kwu) ? d.kwu : (d.kw || []);
    return list.includes(k);
  };
  JG.cardVal = function (c, key) {
    const d = D.cards[c.id];
    let v = (c.up && d.vu && d.vu[key] !== undefined) ? d.vu[key] : (d.v ? d.v[key] : undefined);
    if (v === undefined) v = 0;
    if (c.bonus && c.bonus[key]) v += c.bonus[key];
    return v;
  };
  JG.baseCost = function (c) {
    const d = D.cards[c.id];
    if (d.unplayable) return null;
    if (d.cost === 'X') return 'X';
    return (c.up && d.costUp !== undefined) ? d.costUp : d.cost;
  };

  const P = {};
  JG.Combat = function (run, cfg) {
    const g = Object.create(P);
    g.run = run;
    g.cfg = cfg; // { enemies:[id], kind:'normal'|'elite'|'boss'|'event', seed, act, asc }
    g.rng = JG.RNG(cfg.seed || 'combat');
    g.fx = [];
    g.steps = [];
    g.pending = null;
    g.turn = 0;
    g.phase = 'init';
    g.over = false;
    g.result = null;
    g.curEl = null;
    const ch = D.chars[run.char];
    g.p = { isP: true, uid: 'p', name: ch ? ch.name : '부적사', hp: run.hp, maxHp: run.maxHp, block: 0, st: {}, energy: 0, emax: 3 + (run.energyBonus || 0) };
    g.enemies = [];
    g.pile = { draw: [], hand: [], discard: [], exhaust: [] };
    g.chain = { n: 0, last: null, free: 0 };
    g.persistChain = false;
    g.cycles = 0;
    g.next = { energy: 0, draw: 0, block: 0 };
    g.cnt = { turnCards: 0, turnAttacks: 0, turnSkills: 0, cards: 0, attacks: 0, skills: 0, chainsTurn: 0, cyclesTurn: 0, dmgDealt: 0, maxHit: 0, hpLost: 0, metalCards: 0, exhausted: 0, potions: 0 };
    g.flags = {};
    g.stats = { maxHit: 0, cycles: 0, cards: 0 };
    for (const r of run.relics) { r.c = 0; r.cu = false; r.tu = false; }
    for (const d of run.deck) g.pile.draw.push(JG.newCard(d.id, d.up, { deckUid: d.uid }));
    g.rng.shuffle(g.pile.draw);
    for (const id of cfg.enemies) g.spawn(id, {});
    return g;
  };
  JG.Combat.proto = P;

  // ── 조회 ──
  P.alive = function () { return this.enemies.filter((e) => !e.dead && !e.escaped); };
  P.firstEnemy = function () { return this.alive()[0] || null; };
  P.randomEnemy = function () { return this.rng.pick(this.alive()) || null; };
  P.byUid = function (uid) { return uid === 'p' ? this.p : this.enemies.find((e) => e.uid === uid) || null; };
  P.findCard = function (uid) {
    for (const k of ['hand', 'draw', 'discard', 'exhaust']) { const c = this.pile[k].find((x) => x.uid === uid); if (c) return c; }
    return null;
  };
  P.v = function (c, key) { return JG.cardVal(c, key); };
  P.kw = function (c, k) { return JG.cardKw(c, k); };
  P.snap = function (t) { return { hp: t.hp, maxHp: t.maxHp, block: t.block, st: Object.assign({}, t.st), dead: !!t.dead }; };
  P.hasRelic = function (id) { return this.run.relics.some((r) => r.id === id); };
  P.relic = function (id) { return this.run.relics.find((r) => r.id === id) || null; };
  P.asc = function () { return this.cfg.asc || 0; };

  // ── 훅: 신물 → 내 비전(상태) 순서 ──
  P.eachListener = function (name, fn) {
    for (const r of this.run.relics) {
      const rd = D.relics[r.id];
      if (rd && typeof rd[name] === 'function') fn(rd[name], r, rd);
    }
    for (const id of Object.keys(this.p.st)) {
      const sd = D.statuses[id];
      if (sd && typeof sd[name] === 'function' && this.p.st[id]) fn(sd[name], this.p.st[id], sd);
    }
  };
  P.hook = function (name, ...args) {
    if (this.over && name !== 'combatEnd') return;
    this.eachListener(name, (f, state) => { if (!this.over || name === 'combatEnd') f(this, state, ...args); });
  };
  P.hookSum = function (name, ...args) {
    let s = 0;
    this.eachListener(name, (f, state) => { s += f(this, state, ...args) || 0; });
    return s;
  };
  P.hookMod = function (name, val, ...args) {
    this.eachListener(name, (f, state) => { val = f(this, state, val, ...args); });
    return val;
  };
  P.hookAny = function (name, ...args) {
    let any = false;
    this.eachListener(name, (f, state) => { if (!any && f(this, state, ...args)) any = true; });
    return any;
  };
  P.relicFlash = function (id) { this.fx.push({ t: 'relic', id }); };

  // ── 비용 ──
  P.cost = function (c) {
    const d = JG.cdef(c);
    if (d.unplayable) return null;
    if (d.cost === 'X') return 'X';
    let base = JG.baseCost(c);
    if (c.costCombat !== undefined) base = c.costCombat;
    if (c.costTurn !== undefined) base = c.costTurn;
    if (c.costOnce !== undefined) base = c.costOnce;
    base = this.hookMod('modCost', base, c);
    return Math.max(0, base);
  };

  // ── 연계 판정 (바꾸지 않고 결과만) ──
  P.nx = function (el) { return this.flags.reverse > 0 ? JG.prevEl(el) : JG.nextEl(el); };
  P.chainCheck = function (el) {
    const ch = this.chain;
    if (!el || el === 'none') return { affects: false, chained: false, n: ch.n, last: ch.last };
    if (el === 'wild') {
      if (ch.n === 0) return { affects: true, chained: false, n: 1, last: 'wild', asEl: null };
      const nx = ch.last === 'wild' ? 'wild' : this.nx(ch.last);
      return { affects: true, chained: true, n: ch.n + 1, last: nx, asEl: nx === 'wild' ? null : nx };
    }
    if (ch.n === 0) {
      if (ch.free > 0) return { affects: true, chained: true, n: 2, last: el, usedFree: true };
      return { affects: true, chained: false, n: 1, last: el };
    }
    if (this.pile.hand.some((c) => c.id === 's_charm')) return { affects: true, chained: false, n: 1, last: el, broke: ch.n >= 2, charmed: true };
    if (ch.last === 'wild' || el === this.nx(ch.last)) return { affects: true, chained: true, n: ch.n + 1, last: el };
    if (ch.free > 0) return { affects: true, chained: true, n: ch.n + 1, last: el, usedFree: true };
    return { affects: true, chained: false, n: 1, last: el, broke: ch.n >= 2 };
  };
  P.wouldChain = function (c) { return this.chainCheck(JG.cdef(c).el).chained; };
  P.nextNeeded = function () {
    const ch = this.chain;
    if (ch.n === 0) return null;
    if (ch.last === 'wild') return 'any';
    return this.nx(ch.last);
  };

  // ── 카드 사용 ──
  P.canPlay = function (c) {
    if (this.over || this.pending || this.phase !== 'player') return false;
    if (!this.pile.hand.includes(c)) return false;
    const d = JG.cdef(c);
    if (d.unplayable) return false;
    const cost = this.cost(c);
    if (cost !== 'X' && cost > this.p.energy) return false;
    if (d.canPlay && !d.canPlay(this, c)) return false;
    if (this.flags.noAttacks && d.type === 'atk') return false;
    return true;
  };
  P.needsTarget = function (c) { return JG.cdef(c).target === 'enemy'; };

  P.play = function (c, t) {
    if (!this.canPlay(c)) return false;
    const d = JG.cdef(c);
    if (d.target === 'enemy') {
      if (!t || t.dead || t.escaped || t.isP) t = this.firstEnemy();
      if (!t) return false;
    } else t = null;
    const cost = this.cost(c);
    let x = 0;
    if (cost === 'X') { x = this.p.energy + this.hookSum('xBonus'); this.p.energy = 0; }
    else this.p.energy -= cost;
    delete c.costOnce;
    this.pile.hand.splice(this.pile.hand.indexOf(c), 1);
    const ci = this.chainCheck(d.el);
    const prevN = this.chain.n;
    if (ci.affects) {
      if (ci.usedFree) this.chain.free = Math.max(0, this.chain.free - 1);
      this.chain.n = ci.n;
      this.chain.last = ci.last;
    }
    const k = { chained: ci.chained, n: ci.n, x, el: d.el, cost: cost === 'X' ? x : cost, prevN, affects: ci.affects, broke: !!ci.broke };
    this.fx.push({ t: 'play', uid: c.uid, id: c.id, target: t ? t.uid : null, chain: ci.affects ? ci.n : null, chained: ci.chained, broke: !!ci.broke, el: d.el, asEl: ci.asEl });
    this.fx.push({ t: 'energy', v: this.p.energy });
    this.cnt.turnCards++; this.cnt.cards++; this.stats.cards++;
    if (d.type === 'atk') { this.cnt.turnAttacks++; this.cnt.attacks++; }
    if (d.type === 'skill') { this.cnt.turnSkills++; this.cnt.skills++; }
    if (d.el === 'metal') this.cnt.metalCards++;
    const prevEl = this.curEl;
    this.curEl = d.el === 'wild' ? (ci.asEl || null) : d.el;
    this.steps.push(() => { this.curEl = d.el === 'wild' ? (ci.asEl || null) : d.el; d.play(this, c, t, k); });
    if (this.p.st.p_trickMirror && !this.flags.mirrorUsed && d.type === 'skill') {
      this.flags.mirrorUsed = true;
      this.steps.push(() => { this.fx.push({ t: 'msg', text: '도깨비 거울: 한 번 더!' }); if (t && (t.dead || t.escaped)) t = this.firstEnemy(); if (d.target !== 'enemy' || t) d.play(this, c, t, k); });
    }
    this.steps.push(() => { this.curEl = prevEl; this.afterPlay(c, d, k, ci); });
    this.exec();
    return true;
  };

  P.afterPlay = function (c, d, k, ci) {
    if (d.type === 'power') this.fx.push({ t: 'power', uid: c.uid });
    else if (this.kw(c, 'exhaust') || c.exhaustOnce) this.exhaustCard(c);
    else if (c.toDraw) { delete c.toDraw; this.pile.draw.push(c); this.fx.push({ t: 'toDraw', uid: c.uid }); }
    else { this.pile.discard.push(c); this.fx.push({ t: 'discard', uids: [c.uid] }); }
    if (this.over) return;
    if (ci.affects) this.flags.maxChain = Math.max(this.flags.maxChain || 0, ci.n);
    if (ci.chained) {
      this.cnt.chainsTurn++;
      this.fx.push({ t: 'chain', n: ci.n, el: ci.last });
      this.hook('chain', ci.n, ci.last);
    }
    if (ci.affects && ci.n >= 5 && ci.n % 5 === 0) this.doCycle();
    if (this.over) return;
    this.hook('cardPlayed', c, k);
    if (c.id !== 'du_copycat') { this.flags.lastCardId = c.id; this.flags.lastCardUp = c.up; }
    // 적의 반응
    for (const e of this.alive()) {
      const ed = D.enemies[e.id];
      if (e.st.ironEater && d.el === 'metal') { this.gainBlock(e, 4); e.data.ate = (e.data.ate || 0) + 1; if (e.data.ate % 3 === 0) this.apply(e, 'sharp', 1, e); }
      if (e.st.rage && d.type === 'skill') this.apply(e, 'sharp', e.st.rage, e);
      if (e.st.reflect && d.type === 'atk') this.damage(this.p, e.st.reflect, { kind: 'reflect', src: e });
      if (ed.onPlayerCard) ed.onPlayerCard(this, e, c, k);
      if (this.over) return;
    }
    this.checkEnd();
  };

  P.doCycle = function () {
    this.cycles++; this.cnt.cyclesTurn++; this.stats.cycles++;
    this.fx.push({ t: 'cycle', n: this.cycles });
    const dmg = 6 + this.hookSum('cycleDmg');
    this.gainEnergy(1 + this.hookSum('cycleEnergy'));
    this.drawCards(1 + this.hookSum('cycleDraw'));
    for (const e of this.alive()) this.damage(e, dmg, { kind: 'cycle' });
    this.hook('cycle', this.cycles);
  };

  P.exec = function () {
    let guard = 0;
    while (!this.pending && this.steps.length && !this.over && guard++ < 1000) {
      const f = this.steps.shift();
      f();
    }
    if (this.over) this.steps.length = 0;
  };

  // ── 고르기 ──
  P.choose = function (spec) {
    let cands = spec.list ? spec.list.slice() : this.pile[spec.from || 'hand'].slice();
    if (spec.filter) cands = cands.filter(spec.filter);
    const min = Math.min(spec.min === undefined ? 1 : spec.min, cands.length);
    const max = Math.min(spec.max === undefined ? 1 : spec.max, cands.length);
    if (cands.length === 0) { spec.then([]); return; }
    if (!spec.always && cands.length <= min && min === max) { spec.then(cands.slice()); return; }
    this.pending = { title: spec.title || '카드를 고르세요', cands, min, max, then: spec.then, from: spec.from || 'list', canSkip: min === 0 };
    this.fx.push({ t: 'choose' });
  };
  P.resolve = function (uids) {
    const pd = this.pending;
    if (!pd) return false;
    const picked = pd.cands.filter((c) => uids.includes(c.uid)).slice(0, pd.max);
    if (picked.length < pd.min) return false;
    this.pending = null;
    pd.then(picked);
    this.exec();
    this.checkEnd();
    return true;
  };

  // ── 피해 계산 ──
  P.calcAtk = function (src, tgt, base, o) {
    o = o || {};
    let dmg = base + (o.noSharp ? 0 : (src.st.sharp || 0) + (src.st.edge || 0)) + (o.flat || 0);
    let mul = 1;
    let weak = false;
    const el = o.el;
    if (src.isP && el && tgt.el && JG.beats(el, tgt.el)) { mul *= 1.5 + this.hookSum('weakBonus'); weak = true; }
    if (src.st.chill > 0) mul *= 0.75;
    if (tgt.st.crack > 0) mul *= tgt.isP ? 1.5 : 1.5 + this.hookSum('crackBonus');
    if (!tgt.isP && tgt.st.fireproof && el === 'fire') mul *= 0.5;
    if (!src.isP && this.asc() >= 8) mul *= 1.1;
    if (!src.isP && this.cfg.dmgMul) mul *= this.cfg.dmgMul;
    dmg = Math.max(0, dmg) * mul;
    if (src.isP) dmg = this.hookMod('modAtk', dmg, tgt, o);
    else dmg = this.hookMod('modTaken', dmg, src, o);
    dmg = Math.max(0, Math.floor(dmg));
    if (tgt.st.phantom > 0 && dmg > 1) dmg = 1;
    return { dmg, weak };
  };
  // 카드 공격 미리보기(화면용)
  P.previewAtk = function (base, tgt, el) {
    if (!tgt) return Math.max(0, Math.floor((base + (this.p.st.sharp || 0)) * (this.p.st.chill > 0 ? 0.75 : 1)));
    return this.calcAtk(this.p, tgt, base, { el: el === undefined ? null : el, preview: true }).dmg;
  };
  P.previewBlock = function (n) { return Math.max(0, Math.floor(this.hookMod('modBlock', n + (this.p.st.sturdy || 0)))); };

  // 플레이어 → 적 공격
  P.attack = function (t, base, o) {
    o = o || {};
    const hits = o.hits || 1;
    const el = o.el !== undefined ? o.el : this.curEl;
    let total = 0;
    for (let i = 0; i < hits; i++) {
      if (!t || t.dead || t.escaped) { if (o.retarget !== false) t = this.randomEnemy(); if (!t) break; }
      const { dmg, weak } = this.calcAtk(this.p, t, base, { el, flat: o.flat });
      const dealt = this.damage(t, dmg, { kind: 'atk', weak, src: this.p, el });
      total += dealt;
      if (t.st.thorns && !this.over) this.damage(this.p, t.st.thorns, { kind: 'thorns', src: t });
      if (this.over || this.p.hp <= 0) break;
      this.hook('attackHit', t, dealt);
    }
    return total;
  };
  P.attackAll = function (base, o) {
    let total = 0;
    for (const e of this.alive()) { total += this.attack(e, base, Object.assign({}, o, { retarget: false })); if (this.over) break; }
    return total;
  };
  P.attackRandom = function (base, hits, o) {
    let total = 0;
    for (let i = 0; i < hits; i++) {
      const t = this.randomEnemy();
      if (!t) break;
      total += this.attack(t, base, Object.assign({}, o, { hits: 1 }));
      if (this.over) break;
    }
    return total;
  };

  // 적 → 플레이어 공격
  P.eAttack = function (e, base, hits) {
    hits = hits || 1;
    let total = 0;
    for (let i = 0; i < hits; i++) {
      if (e.dead || this.over) break;
      const { dmg } = this.calcAtk(e, this.p, base, {});
      const dealt = this.damage(this.p, dmg, { kind: 'atk', src: e });
      total += dealt;
      if (this.over) break;
      if (this.p.st.thorns && !e.dead) this.damage(e, this.p.st.thorns, { kind: 'thorns', src: this.p });
      this.hook('attacked', e, dmg, dealt);
    }
    return total;
  };

  // 실제 피해 적용 (방어 흡수 → 체력)
  P.damage = function (t, amount, info) {
    info = info || {};
    if (!t || t.dead || this.over) return 0;
    let dmg = Math.max(0, Math.floor(amount));
    if (t.isP && info.kind !== 'loss') dmg = this.hookMod('modHpDamage', dmg, info);
    let blocked = 0;
    if (info.kind !== 'burn' && info.kind !== 'loss') {
      blocked = Math.min(t.block, dmg);
      t.block -= blocked;
      dmg -= blocked;
    }
    if (t.isP && dmg > 0) dmg = this.hookMod('modHpLoss', dmg, info);
    t.hp -= dmg;
    this.fx.push({ t: 'dmg', who: t.uid, amount: dmg, blocked, kind: info.kind || 'atk', weak: !!info.weak, snap: this.snap(t) });
    if (t.isP) {
      if (dmg > 0) { this.cnt.hpLost += dmg; this.hook('hpLost', dmg, info); }
    } else {
      this.cnt.dmgDealt += dmg;
      if (dmg > this.stats.maxHit) this.stats.maxHit = dmg;
    }
    if (t.hp <= 0) this.kill(t, info);
    else if (!t.isP && dmg > 0) {
      const ed = D.enemies[t.id];
      if (ed.onHurt) ed.onHurt(this, t, dmg, info);
    }
    return dmg;
  };

  P.kill = function (t, info) {
    if (t.isP) {
      if (this.hookAny('preventDeath')) { if (t.hp <= 0) t.hp = 1; this.fx.push({ t: 'revive', who: 'p', snap: this.snap(t) }); return; }
      t.hp = 0;
      this.lose();
      return;
    }
    const edl = D.enemies[t.id];
    if (edl.onLethal && edl.onLethal(this, t, info)) return;
    if (t.st.revive && info.el !== 'fire') {
      delete t.st.revive;
      t.hp = Math.ceil(t.maxHp / 2);
      t.block = 0;
      this.fx.push({ t: 'revive', who: t.uid, snap: this.snap(t) });
      return;
    }
    t.hp = 0; t.dead = true; t.block = 0;
    this.fx.push({ t: 'die', who: t.uid });
    const ed = D.enemies[t.id];
    if (ed.onDeath) ed.onDeath(this, t);
    if (t.st.thief) { this.run.gold += t.st.thief; this.fx.push({ t: 'msg', text: `엽전 ${t.st.thief}을 되찾았다!`, gold: this.run.gold }); }
    if (t.data.eaten && t.data.eaten.length) {
      for (const c of t.data.eaten) this.pile.discard.push(c);
      this.fx.push({ t: 'msg', text: `삼켜졌던 카드 ${t.data.eaten.length}장을 되찾았다!` });
      t.data.eaten = [];
    }
    this.hook('enemyDied', t);
    if (t.boss) for (const m of this.alive()) if (m.minion) { m.dead = true; m.hp = 0; this.fx.push({ t: 'die', who: m.uid }); }
    this.checkEnd();
  };

  // ── 방어·상태·회복 ──
  P.gainBlock = function (t, n, raw) {
    if (t.dead) return 0;
    if (!raw) {
      n += (t.st.sturdy || 0);
      if (t.isP) n = this.hookMod('modBlock', n);
    }
    n = Math.max(0, Math.floor(n));
    if (n <= 0) return 0;
    t.block += n;
    this.fx.push({ t: 'block', who: t.uid, amount: n, snap: this.snap(t) });
    if (t.isP) { this.flags.maxBlock = Math.max(this.flags.maxBlock || 0, t.block); this.hook('blockGained', n); }
    return n;
  };
  P.block = function (n) { return this.gainBlock(this.p, n); };
  P.apply = function (t, id, n, src) {
    if (!t || t.dead || !n || this.over) return;
    const sd = D.statuses[id];
    if (!sd) throw new Error('unknown status ' + id);
    if (src === this.p && !t.isP) n = this.hookMod('modApply', n, t, id);
    if (id === 'burn' && t.st.fireproof) { this.fx.push({ t: 'immune', who: t.uid, id }); return; }
    if (t.isP && sd.kind === 'debuff' && this.hookAny('blockDebuff', id)) { this.fx.push({ t: 'immune', who: t.uid, id }); return; }
    if (sd.flag) t.st[id] = 1;
    else t.st[id] = (t.st[id] || 0) + n;
    if (t.st[id] === 0 || (!sd.neg && t.st[id] < 0)) delete t.st[id];
    this.fx.push({ t: 'status', who: t.uid, id, n, snap: this.snap(t) });
    if (id === 'burn' && !t.isP) this.flags.maxBurn = Math.max(this.flags.maxBurn || 0, t.st.burn || 0);
    if (src === this.p && !t.isP) this.hook('appliedStatus', t, id, n);
  };
  P.selfApply = function (id, n) { this.apply(this.p, id, n, this.p); };
  // 기세(도윤): 마무리 기술이 모두 써서 그 수를 돌려준다
  P.spendFury = function () {
    const n = this.p.st.fury || 0;
    if (n > 0) { delete this.p.st.fury; this.fx.push({ t: 'status', who: 'p', id: 'fury', n: -n, snap: this.snap(this.p) }); }
    this.hook('furySpent', n);
    return n;
  };
  P.gainFury = function (n) { if (n > 0) this.selfApply('fury', n); };
  // 도깨비불(두두): 최대 10개. 턴 끝에 하나당 무작위 적 공격, 터뜨리면 한꺼번에
  P.addWisp = function (n) {
    const cur = this.p.st.wisp || 0;
    const add = Math.max(0, Math.min(n, 10 - cur));
    if (add > 0) this.selfApply('wisp', add);
    else if (n > 0) this.fx.push({ t: 'msg', text: '도깨비불이 가득 찼다 (최대 10)' });
  };
  P.burstWisps = function () {
    const n = this.p.st.wisp || 0;
    if (n > 0) { delete this.p.st.wisp; this.fx.push({ t: 'status', who: 'p', id: 'wisp', n: -n, snap: this.snap(this.p) }); }
    return n;
  };
  P.wispAttack = function () {
    const n = this.p.st.wisp || 0;
    if (!n) return;
    const dmg = 4 + this.hookSum('wispDmg');
    const times = this.p.st.p_king ? 2 : 1;
    for (let r = 0; r < times; r++) for (let i = 0; i < n; i++) { const e = this.randomEnemy(); if (!e || this.over) return; this.damage(e, dmg, { kind: 'wisp', el: 'fire' }); }
  };
  P.applyAll = function (id, n) { for (const e of this.alive()) this.apply(e, id, n, this.p); };
  P.removeStatus = function (t, id) {
    if (t.st[id] !== undefined) { delete t.st[id]; this.fx.push({ t: 'status', who: t.uid, id, n: 0, snap: this.snap(t) }); }
  };
  P.heal = function (t, n) {
    if (t.dead) return 0;
    if (t.isP) n = this.hookMod('modHeal', n);
    n = Math.max(0, Math.floor(n));
    const before = t.hp;
    t.hp = Math.min(t.maxHp, t.hp + n);
    const healed = t.hp - before;
    if (healed > 0) {
      this.fx.push({ t: 'heal', who: t.uid, amount: healed, snap: this.snap(t) });
      if (t.isP) this.hook('healed', healed);
    }
    return healed;
  };
  P.loseHp = function (n) { return this.damage(this.p, n, { kind: 'loss' }); };
  P.gainEnergy = function (n) {
    if (!n) return;
    this.p.energy = Math.max(0, this.p.energy + n);
    this.fx.push({ t: 'energy', v: this.p.energy, gain: n });
  };
  P.gainMaxHp = function (n) {
    this.p.maxHp += n; this.p.hp += n;
    this.run.maxHp += n;
    this.fx.push({ t: 'heal', who: 'p', amount: n, snap: this.snap(this.p) });
  };

  // ── 카드 더미 ──
  P.drawCards = function (n) {
    const drawn = [];
    if (this.flags.noDraw) return drawn;
    for (let i = 0; i < n; i++) {
      if (this.pile.draw.length === 0) {
        if (this.pile.discard.length === 0) break;
        this.reshuffle();
      }
      const c = this.pile.draw.pop();
      if (this.pile.hand.length >= 10) {
        this.pile.discard.push(c);
        this.fx.push({ t: 'overdraw', uid: c.uid });
        continue;
      }
      this.pile.hand.push(c);
      drawn.push(c);
    }
    if (drawn.length) this.fx.push({ t: 'draw', uids: drawn.map((c) => c.uid) });
    for (const c of drawn) {
      const d = JG.cdef(c);
      if (d.onDraw) d.onDraw(this, c);
      this.hook('drew', c);
    }
    return drawn;
  };
  P.draw = P.drawCards;
  P.reshuffle = function () {
    this.pile.draw = this.rng.shuffle(this.pile.discard.splice(0));
    this.fx.push({ t: 'shuffle', n: this.pile.draw.length });
    this.hook('shuffled');
  };
  P.takeFromPiles = function (c) {
    for (const k of ['hand', 'draw', 'discard']) {
      const i = this.pile[k].indexOf(c);
      if (i >= 0) { this.pile[k].splice(i, 1); return k; }
    }
    return null;
  };
  P.exhaustCard = function (c) {
    this.takeFromPiles(c);
    if (!this.pile.exhaust.includes(c)) this.pile.exhaust.push(c);
    this.cnt.exhausted++;
    this.fx.push({ t: 'exhaust', uid: c.uid });
    const d = JG.cdef(c);
    if (d.onExhaust) d.onExhaust(this, c);
    this.hook('exhausted', c);
  };
  P.discardCard = function (c) {
    const i = this.pile.hand.indexOf(c);
    if (i < 0) return;
    this.pile.hand.splice(i, 1);
    this.pile.discard.push(c);
    this.fx.push({ t: 'discard', uids: [c.uid] });
    const d = JG.cdef(c);
    if (d.onDiscard) d.onDiscard(this, c);
    this.hook('discarded', c);
  };
  // where: hand | draw(무작위 위치) | drawTop | discard
  P.addCard = function (id, where, up, extra) {
    const c = JG.newCard(id, up, Object.assign({ tmp: true }, extra || {}));
    where = where || 'hand';
    if (where === 'hand' && this.pile.hand.length >= 10) where = 'discard';
    if (where === 'draw') this.pile.draw.splice(this.rng.int(0, this.pile.draw.length), 0, c);
    else if (where === 'drawTop') this.pile.draw.push(c);
    else this.pile[where].push(c);
    this.fx.push({ t: 'addCard', uid: c.uid, id, where });
    return c;
  };
  P.handCount = function () { return this.pile.hand.length; };

  // ── 적 ──
  P.hpMul = function (type) {
    const a = this.asc();
    let m = 1;
    if (type === 'normal' && a >= 2) m *= 1.1;
    if (type === 'elite' && a >= 1) m *= 1.12;
    if (type === 'boss' && a >= 3) m *= 1.1;
    if (type === 'boss' && a >= 9) m *= 1.1;
    if (this.cfg.hpMul) m *= this.cfg.hpMul;
    return m;
  };
  P.spawn = function (id, o) {
    o = o || {};
    const ed = D.enemies[id];
    if (!ed) throw new Error('unknown enemy ' + id);
    if (this.alive().length >= 5) return null;
    const e = { uid: 'e' + JG.uid(), id, name: ed.name, el: ed.el || null, hp: 0, maxHp: 0, block: 0, st: {}, move: null, hist: [], turn: 0, dead: false, escaped: false, minion: !!o.minion, boss: ed.type === 'boss', data: {} };
    let hp = Array.isArray(ed.hp) ? this.rng.int(ed.hp[0], ed.hp[1]) : ed.hp;
    if (o.hp) hp = o.hp;
    hp = Math.round(hp * (o.minion ? 1 : this.hpMul(ed.type)));
    e.hp = e.maxHp = hp;
    if (o.at !== undefined) this.enemies.splice(o.at, 0, e); else this.enemies.push(e);
    if (ed.init) ed.init(this, e);
    if (ed.type === 'boss' && this.asc() >= 10 && !o.minion) e.block += 15;
    if (this.phase !== 'init') {
      this.chooseIntent(e);
      this.fx.push({ t: 'spawn', who: e.uid });
    }
    return e;
  };
  P.mval = function (e, mv, key) {
    const v = mv[key];
    return typeof v === 'function' ? v(this, e) : v;
  };
  P.chooseIntent = function (e) {
    const ed = D.enemies[e.id];
    e.move = ed.ai(this, e);
    if (!ed.moves[e.move]) throw new Error(`${e.id}: unknown move ${e.move}`);
  };
  P.intentOf = function (e) {
    if (e.dead || e.escaped || !e.move) return null;
    const ed = D.enemies[e.id];
    const mv = ed.moves[e.move];
    const r = { it: mv.it, name: mv.name, key: e.move };
    if (mv.dmg !== undefined) {
      r.dmg = this.calcAtk(e, this.p, this.mval(e, mv, 'dmg'), {}).dmg;
      r.hits = mv.hits ? this.mval(e, mv, 'hits') : 1;
    }
    if (e.st.stun) r.stunned = true;
    return r;
  };
  P.moveAttack = function (e, mv) { return this.eAttack(e, this.mval(e, mv, 'dmg'), mv.hits ? this.mval(e, mv, 'hits') : 1); };

  P.enemyTurn = function (e) {
    const ed = D.enemies[e.id];
    if (!e.st.bedrock && e.block > 0) { e.block = 0; this.fx.push({ t: 'block', who: e.uid, amount: 0, snap: this.snap(e) }); }
    if (e.st.burn) {
      const b = e.st.burn;
      e.st.burn = b - 1; if (e.st.burn <= 0) delete e.st.burn;
      this.damage(e, b, { kind: 'burn' });
      if (e.dead || this.over) return;
    }
    if (ed.onTurnStart) ed.onTurnStart(this, e);
    if (e.dead || this.over || e.escaped) return;
    if (e.st.stun) {
      delete e.st.stun;
      this.fx.push({ t: 'stunned', who: e.uid, snap: this.snap(e) });
    } else if (e.move) {
      const mv = ed.moves[e.move];
      this.fx.push({ t: 'act', who: e.uid, move: e.move, name: mv.name, it: mv.it });
      if (mv.act) mv.act(this, e, mv);
      else if (mv.dmg !== undefined) this.moveAttack(e, mv);
      e.hist.push(e.move);
    }
    if (this.over || e.dead || e.escaped) return;
    if (e.st.regen) { this.heal(e, e.st.regen); e.st.regen--; if (e.st.regen <= 0) delete e.st.regen; }
    if (e.st.frenzy) this.apply(e, 'sharp', e.st.frenzy, e);
    for (const id of ['chill', 'crack', 'phantom']) {
      if (e.st[id]) { e.st[id]--; if (e.st[id] <= 0) delete e.st[id]; }
    }
    this.fx.push({ t: 'snap', who: e.uid, snap: this.snap(e) });
    e.turn++;
  };
  P.escape = function (e) {
    e.escaped = true;
    this.fx.push({ t: 'escape', who: e.uid });
    this.checkEnd();
  };

  // ── 턴 흐름 ──
  P.start = function () {
    this.phase = 'player';
    // 선천 카드는 맨 위로
    const innate = this.pile.draw.filter((c) => this.kw(c, 'innate'));
    for (const c of innate) { this.pile.draw.splice(this.pile.draw.indexOf(c), 1); this.pile.draw.push(c); }
    this.hook('combatStart');
    for (const e of this.alive()) { const ed = D.enemies[e.id]; if (ed.onCombatStart) ed.onCombatStart(this, e); }
    for (const e of this.alive()) this.chooseIntent(e);
    this.fx.push({ t: 'begin' });
    this.startTurn(innate.length);
  };

  P.startTurn = function (innateCount) {
    if (this.over) return;
    this.turn++;
    this.phase = 'player';
    const c0 = this.cnt;
    c0.turnCards = 0; c0.turnAttacks = 0; c0.turnSkills = 0; c0.chainsTurn = 0; c0.cyclesTurn = 0;
    this.flags.firstChainDone = false;
    for (const k of ['hand', 'draw', 'discard']) for (const c of this.pile[k]) delete c.costTurn;
    if (this.p.block > 0 && !this.p.st.bedrock) {
      const keep = this.hookSum('keepBlock');
      this.p.block = Math.min(this.p.block, keep);
      this.fx.push({ t: 'block', who: 'p', amount: 0, snap: this.snap(this.p) });
    }
    if (this.p.st.burn) {
      const b = this.p.st.burn;
      this.p.st.burn = b - 1; if (this.p.st.burn <= 0) delete this.p.st.burn;
      this.damage(this.p, b, { kind: 'burn' });
      if (this.over) return;
    }
    if (!this.persistChain) this.chain = { n: 0, last: null, free: this.chain.free || 0 };
    this.p.energy = this.p.emax + this.next.energy;
    this.next.energy = 0;
    if (this.next.block) { this.block(this.next.block); this.next.block = 0; }
    this.fx.push({ t: 'turn', n: this.turn });
    this.fx.push({ t: 'energy', v: this.p.energy });
    this.hook('turnStartPre');
    if (this.over) return;
    let n = 5 + this.next.draw + this.hookSum('drawBonus');
    if (this.turn === 1) n = Math.max(n, innateCount || 0) + this.hookSum('firstDrawBonus');
    this.next.draw = 0;
    this.drawCards(n);
    this.hook('turnStart');
    for (const e of this.alive()) { const ed = D.enemies[e.id]; if (ed.onPlayerTurn) ed.onPlayerTurn(this, e); }
    this.checkEnd();
  };

  P.endTurn = function () {
    if (this.phase !== 'player' || this.pending || this.over) return false;
    this.phase = 'enemy';
    this.hook('turnEnd');
    if (this.over) return true;
    // 손패 정리
    const keepN = this.hookSum('retainCount');
    let keepLeft = keepN;
    const hand = this.pile.hand.slice().sort((a, b) => (this.cost(b) || 0) - (this.cost(a) || 0));
    const toDiscard = [];
    for (const c of this.pile.hand.slice()) {
      const d = JG.cdef(c);
      if (d.endInHand) d.endInHand(this, c);
      if (this.over) return true;
    }
    for (const c of hand) {
      if (!this.pile.hand.includes(c)) continue;
      if (this.kw(c, 'ethereal')) { this.exhaustCard(c); continue; }
      if (this.kw(c, 'retain') || c.retainOnce) { c.retainOnce = false; continue; }
      if (keepLeft > 0 && !JG.cdef(c).unplayable) { keepLeft--; continue; }
      toDiscard.push(c);
    }
    for (const c of toDiscard) { this.pile.hand.splice(this.pile.hand.indexOf(c), 1); this.pile.discard.push(c); }
    if (toDiscard.length) this.fx.push({ t: 'discard', uids: toDiscard.map((c) => c.uid), endTurn: true });
    // 내 상태 정리
    const p = this.p;
    this.wispAttack();
    if (this.over) return true;
    if (p.st.regen) { this.heal(p, p.st.regen); p.st.regen--; if (p.st.regen <= 0) delete p.st.regen; }
    // 냉기(내 공격 약화)는 내 턴 끝에, 균열·허상(받는 피해)은 적 차례가 끝난 뒤 줄어든다
    if (p.st.chill) { p.st.chill--; if (p.st.chill <= 0) delete p.st.chill; }
    delete p.st.edge;
    if (this.flags.reverse > 0) { this.flags.reverse--; if (!this.flags.reverse) this.fx.push({ t: 'msg', text: '오행의 흐름이 돌아왔다.' }); }
    this.fx.push({ t: 'snap', who: 'p', snap: this.snap(p) });
    this.fx.push({ t: 'enemyPhase' });
    // 적 차례
    for (const e of this.enemies.slice()) {
      if (e.dead || e.escaped) continue;
      this.enemyTurn(e);
      if (this.over) return true;
    }
    this.checkEnd();
    if (this.over) return true;
    for (const id of ['crack', 'phantom']) { if (p.st[id]) { p.st[id]--; if (p.st[id] <= 0) delete p.st[id]; } }
    for (const e of this.alive()) this.chooseIntent(e);
    this.fx.push({ t: 'intents' });
    this.hook('roundEnd');
    this.startTurn();
    return true;
  };

  P.checkEnd = function () {
    if (this.over) return;
    if (this.p.hp <= 0) { this.lose(); return; }
    if (this.phase !== 'init' && this.enemies.every((e) => e.dead || e.escaped)) this.win();
  };
  P.win = function () {
    if (this.over) return;
    this.over = true; this.result = 'win'; this.phase = 'over';
    this.steps.length = 0;
    this.pending = null;
    this.hook('combatEnd', true);
    this.run.hp = Math.max(1, Math.min(this.p.hp, this.run.maxHp));
    this.fx.push({ t: 'win' });
  };
  P.lose = function () {
    if (this.over) return;
    this.over = true; this.result = 'lose'; this.phase = 'over';
    this.steps.length = 0;
    this.pending = null;
    this.run.hp = 0;
    this.fx.push({ t: 'lose' });
  };

  // ── 약 사용 ──
  P.canUsePotion = function (slot) {
    const id = this.run.potions[slot];
    if (!id || this.over || this.pending || this.phase !== 'player') return false;
    const pd = D.potions[id];
    return !!(pd && pd.use);
  };
  P.usePotion = function (slot, t) {
    if (!this.canUsePotion(slot)) return false;
    const id = this.run.potions[slot];
    const pd = D.potions[id];
    if (pd.target === 'enemy') { if (!t || t.dead || t.isP) t = this.firstEnemy(); if (!t) return false; }
    this.run.potions[slot] = null;
    this.cnt.potions++;
    this.fx.push({ t: 'potion', id, slot, target: t ? t.uid : null });
    const mul = this.hasRelic('gourd_big') ? 2 : 1;
    this.steps.push(() => pd.use(this, t, mul));
    this.steps.push(() => { this.hook('potionUsed', id); this.checkEnd(); });
    this.exec();
    return true;
  };
})();
