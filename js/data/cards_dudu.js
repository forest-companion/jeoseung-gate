'use strict';
// 도깨비 두두의 카드 — 도깨비불을 피워 쌓고 터뜨린다. 엽전과 장난(무작위)도 무기.
(function () {
  const Y = (id, def) => JG.defCard(id, Object.assign({ char: 'dudu' }, def));
  const S = JG.defStatus;
  const wisps = (g) => g.p.st.wisp || 0;
  const gold = (g, n) => { g.run.gold += n; g.fx.push({ t: 'msg', text: `엽전 +${n}`, gold: g.run.gold }); };

  // ═══ 기본 ═══
  const ATK = [['du_wood_atk', '방망이질', 'wood'], ['du_fire_atk', '불 방망이', 'fire'], ['du_earth_atk', '돌 방망이', 'earth'], ['du_water_atk', '물 방망이', 'water']];
  for (const [id, name, el] of ATK) {
    Y(id, { name, el, type: 'atk', cost: 1, rar: 'basic', target: 'enemy', art: JG.ELINFO[el].hanja,
      v: { dmg: 6, w: 1 }, vu: { dmg: 9, w: 1 }, text: '피해 {D}.', chain: '도깨비불 {w}.',
      play(g, c, t, k) { g.attack(t, g.v(c, 'dmg')); if (k.chained) g.addWisp(g.v(c, 'w')); } });
  }
  const DEF = [['du_wood_def', '나무 뒤 숨기', 'wood'], ['du_fire_def', '불꽃 가림', 'fire'], ['du_metal_def', '솥뚜껑 막기', 'metal'], ['du_water_def', '물안개 숨기', 'water']];
  for (const [id, name, el] of DEF) {
    Y(id, { name, el, type: 'skill', cost: 1, rar: 'basic', art: '隱',
      v: { blk: 5, cblk: 3 }, vu: { blk: 8, cblk: 4 }, text: '방어 {B}.', chain: '방어 +{cblk}.',
      play(g, c, t, k) { g.block(g.v(c, 'blk') + (k.chained ? g.v(c, 'cblk') : 0)); } });
  }
  Y('du_kindle', { name: '불 피우기', el: 'fire', type: 'skill', cost: 1, rar: 'basic', art: '燐',
    v: { w: 2 }, vu: { w: 3 }, text: '도깨비불 {w}.', chain: '카드 1장 뽑기.',
    play(g, c, t, k) { g.addWisp(g.v(c, 'w')); if (k.chained) g.draw(1); } });
  Y('du_ttukttak', { name: '뚝딱', el: 'wild', type: 'skill', cost: 0, rar: 'basic', art: '金',
    v: { gold: 3, draw: 1 }, vu: { gold: 5, draw: 2 }, text: '오색(연계를 잇는 다음 원소). 엽전 {gold}. 카드 {draw}장 뽑기.',
    play(g, c) { gold(g, g.v(c, 'gold')); g.draw(g.v(c, 'draw')); } });

  // ═══ 일반 ═══
  Y('du_flame_toss', { name: '불 던지기', el: 'fire', type: 'atk', cost: 1, rar: 'common', target: 'enemy', art: '投',
    v: { dmg: 8, w: 1 }, vu: { dmg: 11, w: 1 }, text: '피해 {D}.', chain: '도깨비불 {w}.',
    play(g, c, t, k) { g.attack(t, g.v(c, 'dmg')); if (k.chained) g.addWisp(g.v(c, 'w')); } });
  Y('du_burst', { name: '불 터뜨리기', el: 'fire', type: 'atk', cost: 1, rar: 'common', target: 'enemy', art: '爆',
    v: { per: 6 }, vu: { per: 8 }, text: '도깨비불을 모두 터뜨려, 하나당 피해 {per}.', chain: '터뜨린 뒤 도깨비불 1.',
    play(g, c, t, k) { const n = g.burstWisps(); if (n) g.attack(t, g.v(c, 'per'), { hits: n }); if (k.chained) g.addWisp(1); } });
  Y('du_coin_scatter', { name: '엽전 뿌리기', el: 'metal', type: 'atk', cost: 1, rar: 'common', target: 'all', art: '散',
    v: { dmg: 5, gold: 3 }, vu: { dmg: 7, gold: 4 }, text: '모든 적에게 피해 {D}. 엽전 {gold}.', chain: '도깨비불 1.',
    play(g, c, t, k) { g.attackAll(g.v(c, 'dmg')); gold(g, g.v(c, 'gold')); if (k.chained) g.addWisp(1); } });
  Y('du_prank', { name: '장난', el: 'none', type: 'skill', cost: 0, rar: 'common', art: '戱',
    v: { n: 1 }, vu: { n: 2 }, text: '무작위 장난 {n}번: 카드 2장 · 기력 1 · 도깨비불 2 · 방어 8 · 모든 적 화상 4 중 하나.',
    play(g, c) {
      for (let i = 0; i < g.v(c, 'n'); i++) {
        const r = g.rng.int(0, 4);
        if (r === 0) g.draw(2); else if (r === 1) g.gainEnergy(1); else if (r === 2) g.addWisp(2); else if (r === 3) g.block(8); else g.applyAll('burn', 4);
        g.fx.push({ t: 'msg', text: ['장난: 카드 2장!', '장난: 기력 +1!', '장난: 도깨비불 2!', '장난: 방어 8!', '장난: 모두 화상 4!'][r] });
      }
    } });
  Y('du_hide', { name: '감투 쓰기', el: 'water', type: 'skill', cost: 1, rar: 'common', art: '帽',
    v: { blk: 8, n: 1 }, vu: { blk: 11, n: 2 }, text: '방어 {B}.', chain: '모든 적에게 냉기 {n}.',
    play(g, c, t, k) { g.block(g.v(c, 'blk')); if (k.chained) g.applyAll('chill', g.v(c, 'n')); } });
  Y('du_club_swing', { name: '방망이 돌리기', el: 'wood', type: 'atk', cost: 2, rar: 'common', target: 'all', art: '棒',
    v: { dmg: 8, w: 2 }, vu: { dmg: 11, w: 2 }, text: '모든 적에게 피해 {D}.', chain: '도깨비불 {w}.',
    play(g, c, t, k) { g.attackAll(g.v(c, 'dmg')); if (k.chained) g.addWisp(g.v(c, 'w')); } });
  Y('du_wisp_shield', { name: '도깨비불 방패', el: 'fire', type: 'skill', cost: 1, rar: 'common', art: '盾',
    v: { blk: 4, per: 2 }, vu: { blk: 6, per: 3 }, text: '방어 {B} + 도깨비불 1당 {per}.', chain: '도깨비불 1 먼저.',
    play(g, c, t, k) { if (k.chained) g.addWisp(1); g.block(g.v(c, 'blk') + wisps(g) * g.v(c, 'per')); } });
  Y('du_splash', { name: '물장난', el: 'water', type: 'skill', cost: 0, rar: 'common', art: '潑',
    v: { draw: 2 }, vu: { draw: 3 }, text: '카드 {draw}장 뽑고 1장 버리기.', chain: '버리지 않고 도깨비불 1.',
    play(g, c, t, k) { g.draw(g.v(c, 'draw')); if (k.chained) g.addWisp(1); else g.choose({ title: '버릴 카드', from: 'hand', then: (p) => { for (const x of p) g.discardCard(x); } }); } });
  Y('du_spite', { name: '심술', el: 'wood', type: 'skill', cost: 1, rar: 'common', target: 'enemy', art: '妬',
    v: { chill: 2, crack: 1 }, vu: { chill: 2, crack: 2 }, text: '냉기 {chill}, 균열 {crack}.', chain: '도깨비불 1.',
    play(g, c, t, k) { g.apply(t, 'chill', g.v(c, 'chill'), g.p); g.apply(t, 'crack', g.v(c, 'crack'), g.p); if (k.chained) g.addWisp(1); } });
  Y('du_gold_out', { name: '금 나와라', el: 'metal', type: 'skill', cost: 1, rar: 'common', kw: ['exhaust'], art: '鑛',
    v: { gold: 12, blk: 5 }, vu: { gold: 18, blk: 7 }, text: '엽전 {gold}. 방어 {B}. 소멸.',
    play(g, c) { gold(g, g.v(c, 'gold')); g.block(g.v(c, 'blk')); } });
  Y('du_pebbles', { name: '돌팔매질', el: 'earth', type: 'atk', cost: 0, rar: 'common', target: 'enemy', art: '礫',
    v: { dmg: 3 }, vu: { dmg: 4 }, text: '피해 {D}.', chain: '2번 더.',
    play(g, c, t, k) { g.attack(t, g.v(c, 'dmg'), { hits: k.chained ? 3 : 1 }); } });
  Y('du_dance', { name: '도깨비 춤', el: 'none', type: 'skill', cost: 1, rar: 'common', art: '舞',
    v: { w: 2, blk: 4 }, vu: { w: 3, blk: 5 }, text: '도깨비불 {w}. 방어 {B}.', play(g, c) { g.addWisp(g.v(c, 'w')); g.block(g.v(c, 'blk')); } });
  Y('du_lantern', { name: '도깨비 등불', el: 'fire', type: 'skill', cost: 0, rar: 'common', art: '燈',
    v: { w: 1, draw: 1 }, vu: { w: 1, draw: 2 }, text: '도깨비불 {w}. 카드 {draw}장 뽑기.', play(g, c) { g.addWisp(g.v(c, 'w')); g.draw(g.v(c, 'draw')); } });
  Y('du_mud', { name: '진흙 던지기', el: 'earth', type: 'atk', cost: 1, rar: 'common', target: 'enemy', art: '泥',
    v: { dmg: 7, n: 1 }, vu: { dmg: 10, n: 1 }, text: '피해 {D}. 냉기 {n}.', chain: '방어 5.',
    play(g, c, t, k) { g.attack(t, g.v(c, 'dmg')); g.apply(t, 'chill', g.v(c, 'n'), g.p); if (k.chained) g.block(5); } });

  // ═══ 고급 ═══
  Y('du_wisp_storm', { name: '도깨비불 폭풍', el: 'fire', type: 'atk', cost: 2, rar: 'uncommon', target: 'all', art: '颶',
    v: { per: 5 }, vu: { per: 7 }, text: '도깨비불을 모두 터뜨려 하나당 전체 피해 {per}.', chain: '그 뒤 도깨비불 2.',
    play(g, c, t, k) { const n = g.burstWisps(); for (let i = 0; i < n; i++) { g.attackAll(g.v(c, 'per')); if (g.over) break; } if (k.chained) g.addWisp(2); } });
  Y('du_rich', { name: '부자 도깨비', el: 'metal', type: 'power', cost: 1, rar: 'uncommon', art: '富',
    v: { n: 15 }, vu: { n: 25 }, text: '이 전투에서 이기면 엽전 {n}.', play(g, c) { g.selfApply('p_rich', g.v(c, 'n')); } });
  S('p_rich', { name: '부자 도깨비', icon: '富', kind: 'power', desc: (n) => `전투에서 이기면 엽전 ${n}.`, combatEnd(g, n, won) { if (won) g.run.gold += n; } });
  Y('du_money_power', { name: '돈의 힘', el: 'metal', type: 'atk', cost: 1, rar: 'uncommon', target: 'enemy', art: '錢',
    v: { dmg: 6, per: 25 }, vu: { dmg: 9, per: 20 }, text: '피해 {D} + 엽전 {per}개당 1 (최대 +20).', chain: '엽전 5.',
    play(g, c, t, k) { g.attack(t, g.v(c, 'dmg') + Math.min(20, Math.floor(g.run.gold / g.v(c, 'per')))); if (k.chained) gold(g, 5); } });
  Y('du_fan_flame', { name: '불씨 키우기', el: 'fire', type: 'power', cost: 1, rar: 'uncommon', art: '扇',
    v: { n: 2 }, vu: { n: 3 }, text: '도깨비불 하나의 피해가 {n} 늘어납니다(턴 끝 공격·터뜨리기 모두).', play(g, c) { g.selfApply('p_fan', g.v(c, 'n')); } });
  S('p_fan', { name: '불씨 키우기', icon: '扇', kind: 'power', desc: (n) => `도깨비불 하나의 피해 +${n}.`, wispDmg: (g, n) => n });
  Y('du_shapeshift', { name: '둔갑술', el: 'wild', type: 'skill', cost: 1, rar: 'uncommon', kw: ['exhaust'], art: '變',
    v: {}, text: '오색. 손패의 다른 카드를 모두 무작위 카드(강화됨)로 바꿉니다. 소멸.',
    play(g) {
      const pool = JG.cardPool('dudu', (d) => d.rar !== 'basic' && d.rar !== 'rare');
      const old = g.pile.hand.filter((x) => !['status', 'curse'].includes(JG.cdef(x).type) || true);
      for (const x of old) { g.pile.hand.splice(g.pile.hand.indexOf(x), 1); g.fx.push({ t: 'exhaust', uid: x.uid }); }
      for (let i = 0; i < old.length; i++) g.addCard(g.rng.pick(pool).id, 'hand', true);
    } });
  Y('du_copycat', { name: '흉내쟁이', el: 'water', type: 'skill', cost: 1, rar: 'uncommon', art: '倣', costUp: 0,
    v: {}, text: '이번 턴에 마지막으로 쓴 다른 카드의 복사본을 손에 넣습니다(이번 턴 비용 0).',
    play(g) { const id = g.flags.lastCardId; if (id && id !== 'du_copycat') { const x = g.addCard(id, 'hand', g.flags.lastCardUp); x.costTurn = 0; } } });
  Y('du_gamtu', { name: '도깨비 감투', el: 'water', type: 'skill', cost: 2, rar: 'uncommon', kw: ['exhaust'], art: '隱', costUp: 1,
    v: {}, text: '이번 적 차례 동안 받는 공격 피해가 1회당 1이 됩니다. 소멸.', play(g) { g.selfApply('phantom', 1); } });
  Y('du_fire_ring', { name: '불의 고리', el: 'fire', type: 'power', cost: 2, rar: 'uncommon', art: '環', costUp: 1,
    v: { n: 1 }, text: '턴이 시작될 때 도깨비불 {n}.', play(g, c) { g.selfApply('p_ring', g.v(c, 'n')); } });
  S('p_ring', { name: '불의 고리', icon: '環', kind: 'power', desc: (n) => `턴이 시작될 때 도깨비불 ${n}.`, turnStart(g, n) { g.addWisp(n); } });
  Y('du_bribe', { name: '뇌물', el: 'metal', type: 'skill', cost: 0, rar: 'uncommon', target: 'enemy', kw: ['exhaust'], art: '賂',
    v: { gold: 25 }, vu: { gold: 15 }, text: '엽전 {gold}을 주고 적을 기절시킵니다. 소멸.',
    canPlay(g, c) { return g.run.gold >= JG.cardVal(c, 'gold'); },
    play(g, c, t) { g.run.gold -= g.v(c, 'gold'); g.fx.push({ t: 'msg', text: `엽전 -${g.v(c, 'gold')}`, gold: g.run.gold }); g.apply(t, 'stun', 1, g.p); } });
  Y('du_tree_goblin', { name: '나무 도깨비', el: 'wood', type: 'power', cost: 2, rar: 'uncommon', art: '樹',
    v: { per: 2 }, vu: { per: 3 }, text: '턴이 끝날 때 도깨비불 1당 방어 {per}.', play(g, c) { g.selfApply('p_treeGob', g.v(c, 'per')); } });
  S('p_treeGob', { name: '나무 도깨비', icon: '樹', kind: 'power', desc: (n) => `턴이 끝날 때 도깨비불 1당 방어 ${n}.`, turnEnd(g, n) { const w = g.p.st.wisp || 0; if (w) g.block(w * n); } });
  Y('du_flood', { name: '물난리', el: 'water', type: 'atk', cost: 2, rar: 'uncommon', target: 'all', art: '洪',
    v: { dmg: 9, w: 2 }, vu: { dmg: 12, w: 2 }, text: '모든 적에게 피해 {D}.', chain: '도깨비불 {w}.',
    play(g, c, t, k) { g.attackAll(g.v(c, 'dmg')); if (k.chained) g.addWisp(g.v(c, 'w')); } });
  Y('du_magic_talisman', { name: '요술 부적', el: 'none', type: 'skill', cost: 1, rar: 'uncommon', art: '妖', costUp: 0,
    v: {}, text: '무작위 카드 3장 중 1장을 골라 손에 넣습니다(이번 턴 비용 0).',
    play(g) {
      const pool = JG.cardPool('dudu', (d) => d.rar !== 'basic');
      const list = []; const used = new Set();
      while (list.length < 3 && used.size < pool.length) { const d = g.rng.pick(pool); if (used.has(d.id)) continue; used.add(d.id); list.push(JG.newCard(d.id, false)); }
      g.choose({ title: '손에 넣을 카드', list, always: true, then: (p) => { for (const x of p) { const y = g.addCard(x.id, 'hand'); y.costTurn = 0; } } });
    } });
  Y('du_feast', { name: '불티 잔치', el: 'fire', type: 'skill', cost: 1, rar: 'uncommon', art: '宴',
    v: { extra: 0 }, vu: { extra: 1 }, text: '손에 있는 공격 카드 수만큼 도깨비불 (+{extra}).', chain: '카드 1장 뽑기.',
    play(g, c, t, k) { g.addWisp(g.pile.hand.filter((x) => JG.cdef(x).type === 'atk').length + g.v(c, 'extra')); if (k.chained) g.draw(1); } });
  Y('du_wrestle', { name: '도깨비 씨름', el: 'earth', type: 'atk', cost: 2, rar: 'uncommon', target: 'enemy', art: '角',
    v: { dmg: 13 }, vu: { dmg: 17 }, text: '피해 {D}.', chain: '적을 기절시킵니다.',
    play(g, c, t, k) { g.attack(t, g.v(c, 'dmg')); if (k.chained && !t.dead) g.apply(t, 'stun', 1, g.p); } });
  Y('du_greed_club', { name: '욕심 방망이', el: 'wood', type: 'atk', cost: 1, rar: 'uncommon', target: 'enemy', art: '慾',
    v: { dmg: 9, gold: 6 }, vu: { dmg: 12, gold: 8 }, text: '피해 {D}. 이 공격으로 적을 쓰러뜨리면 엽전 {gold}.', chain: '도깨비불 1.',
    play(g, c, t, k) { g.attack(t, g.v(c, 'dmg')); if (t.dead) gold(g, g.v(c, 'gold')); if (k.chained) g.addWisp(1); } });

  // ═══ 희귀 ═══
  Y('du_goblin_king', { name: '도깨비 대장', el: 'fire', type: 'power', cost: 3, rar: 'rare', art: '王', costUp: 2,
    v: {}, text: '턴이 끝날 때 도깨비불이 두 번 공격합니다.', play(g) { g.selfApply('p_king', 1); } });
  S('p_king', { name: '도깨비 대장', icon: '王', kind: 'power', flag: true, desc: () => '턴이 끝날 때 도깨비불이 두 번 공격합니다.' });
  Y('du_gold_rain', { name: '금비', el: 'metal', type: 'skill', cost: 2, rar: 'rare', kw: ['exhaust'], art: '雨',
    v: { gold: 25, dmg: 10 }, vu: { gold: 35, dmg: 14 }, text: '엽전 {gold}. 모든 적에게 피해 {dmg}. 소멸.',
    play(g, c) { gold(g, g.v(c, 'gold')); for (const e of g.alive()) g.damage(e, g.v(c, 'dmg'), { kind: 'skill' }); } });
  Y('du_magic_club', { name: '요술 방망이', el: 'wood', type: 'skill', cost: 1, rar: 'rare', kw: ['exhaust'], art: '寶', costUp: 0,
    v: {}, text: '손의 카드 1장을 강화하고, 강화된 복사본 1장을 손에 넣습니다. 소멸.',
    play(g) { g.choose({ title: '두드릴 카드', from: 'hand', filter: (x) => !['status', 'curse'].includes(JG.cdef(x).type), then: (p) => { for (const x of p) { x.up = 1; const y = g.addCard(x.id, 'hand', true); y.bonus = Object.assign({}, x.bonus); } } }); } });
  Y('du_parade', { name: '도깨비 행렬', el: 'none', type: 'skill', cost: 3, rar: 'rare', kw: ['exhaust'], art: '列', costUp: 2,
    v: { w: 6 }, vu: { w: 6 }, text: '도깨비불 {w}. 소멸.', play(g, c) { g.addWisp(g.v(c, 'w')); } });
  Y('du_trick_mirror', { name: '도깨비 거울', el: 'water', type: 'power', cost: 2, rar: 'rare', art: '鏡', costUp: 1,
    v: {}, text: '매 턴 처음 쓰는 술법 카드가 한 번 더 발동합니다.', play(g) { g.selfApply('p_trickMirror', 1); } });
  S('p_trickMirror', { name: '도깨비 거울', icon: '鏡', kind: 'power', flag: true, desc: () => '매 턴 처음 쓰는 술법 카드가 한 번 더 발동합니다.',
    turnStartPre(g) { g.flags.mirrorUsed = false; } });
  Y('du_jackpot', { name: '대박', el: 'metal', type: 'atk', cost: 2, rar: 'rare', target: 'enemy', art: '福',
    v: { dmg: 18, need: 100 }, vu: { dmg: 24, need: 100 }, text: '피해 {D}. 엽전이 {need} 이상이면 한 번 더.', chain: '엽전 10.',
    play(g, c, t, k) { g.attack(t, g.v(c, 'dmg'), { hits: g.run.gold >= g.v(c, 'need') ? 2 : 1 }); if (k.chained) gold(g, 10); } });
  Y('du_ghost_fire', { name: '귀화', el: 'fire', type: 'atk', cost: 'X', rar: 'rare', target: 'all', art: '鬼',
    v: { per: 5 }, vu: { per: 7 }, text: '도깨비불 X×2를 피운 뒤 모두 터뜨려, 무작위 적에게 하나당 피해 {per}.', chain: '도깨비불 2 더.',
    play(g, c, t, k) { g.addWisp(k.x * 2 + (k.chained ? 2 : 0)); const n = g.burstWisps(); g.attackRandom(g.v(c, 'per') + g.hookSum('wispDmg'), n); } });

  // 캐릭터
  JG.D.chars.dudu = {
    id: 'dudu', name: '두두', title: '도깨비', hp: 72, gold: 120, relic: 'r_gamtu', img: 'ch_dudu', color: '#3f9a6b',
    blurb: '장난을 좋아하는 꼬마 도깨비. 도깨비불을 피워 두었다가 한꺼번에 터뜨리고, 엽전으로 일을 꾸밉니다.',
    style: '난이도 ★★★ · 변칙형 · 도깨비불 쌓기·엽전·무작위',
    prologue: '도깨비 마을에도 소문이 돌았다. “저승문이 열리면 사람들이 겁먹고 씨름도 안 하겠지!” 그건 곤란하다. 두두는 방망이를 어깨에 메고, 도깨비불 한 줌을 주머니에 넣었다.',
    ending: '“금 나와라 뚝딱!” 마지막 장난에 흑운귀왕이 연기처럼 흩어졌다. 저승문이 닫히자 두두는 엽전 한 닢을 문틈에 끼워 두었다. 다음에 또 열리면 제일 먼저 알 수 있게. 그날 밤 도깨비 마을에서는 사흘 밤낮 씨름판이 벌어졌다.',
    deck: ['du_wood_atk', 'du_fire_atk', 'du_earth_atk', 'du_water_atk', 'du_wood_def', 'du_fire_def', 'du_metal_def', 'du_water_def', 'du_kindle', 'du_ttukttak'],
    unlock: (d) => d.stats.runs >= 3 || !!(d.stats.bosses.imugi || d.stats.bosses.agwi || d.stats.bosses.heukun),
    unlockText: '2막 보스를 쓰러뜨리거나 여정을 세 번 마치면 함께할 수 있습니다.',
  };
})();
