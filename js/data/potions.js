'use strict';
// 약. use(g, t, mul) = 전투 중 사용, useOut(run, mul) = 전투 밖에서도 쓸 수 있는 약
(function () {
  const P = JG.defPotion;
  P('p_heal', { name: '회복 탕약', icon: '🍵', rar: 'common', desc: '최대 체력의 25%를 회복합니다. (전투 밖에서도 사용 가능)',
    use(g, t, m) { g.heal(g.p, Math.floor(g.p.maxHp * 0.25 * m)); },
    useOut(run, m) { run.hp = Math.min(run.maxHp, run.hp + Math.floor(run.maxHp * 0.25 * m)); } });
  P('p_fire', { name: '화염 단지', icon: '🔥', rar: 'common', target: 'enemy', desc: '적에게 화상 8.', use(g, t, m) { g.apply(t, 'burn', 8 * m, g.p); } });
  P('p_block', { name: '흙 탕약', icon: '🟫', rar: 'common', desc: '방어 12.', use(g, t, m) { g.block(12 * m); } });
  P('p_sharp', { name: '쇠뜨기 즙', icon: '🗡️', rar: 'common', desc: '예리 2.', use(g, t, m) { g.selfApply('sharp', 2 * m); } });
  P('p_chill', { name: '얼음 정수', icon: '🧊', rar: 'common', desc: '모든 적에게 냉기 3.', use(g, t, m) { g.applyAll('chill', 3 * m); } });
  P('p_draw', { name: '맑은 샘물', icon: '💧', rar: 'common', desc: '카드 3장 뽑기.', use(g, t, m) { g.draw(3 * m); } });
  P('p_bomb', { name: '화약 단지', icon: '💣', rar: 'common', desc: '모든 적에게 피해 10.', use(g, t, m) { for (const e of g.alive()) g.damage(e, 10 * m, { kind: 'potion' }); } });
  P('p_crack', { name: '균열 가루', icon: '💢', rar: 'common', target: 'enemy', desc: '적에게 균열 3.', use(g, t, m) { g.apply(t, 'crack', 3 * m, g.p); } });
  P('p_cleanse', { name: '해독초', icon: '🍃', rar: 'common', desc: '내 화상·냉기·균열을 없애고 방어 6.',
    use(g, t, m) { for (const s of ['burn', 'chill', 'crack']) g.removeStatus(g.p, s); g.block(6 * m); } });
  P('p_energy', { name: '기력환', icon: '💊', rar: 'uncommon', desc: '기력 2.', use(g, t, m) { g.gainEnergy(2 * m); } });
  P('p_wild', { name: '오색환', icon: '🌈', rar: 'uncommon', desc: '다음에 쓰는 원소 카드 3장이 반드시 연계로 이어집니다.', use(g, t, m) { g.chain.free += 3 * m; } });
  P('p_regen', { name: '산삼주', icon: '🌿', rar: 'uncommon', desc: '재생 10.', use(g, t, m) { g.selfApply('regen', 10 * m); } });
  P('p_phantom', { name: '감투 탕', icon: '🌫️', rar: 'uncommon', desc: '이번 적 차례 동안 받는 공격 피해가 1회당 1이 됩니다.', use(g) { g.selfApply('phantom', 1); } });
  P('p_discover', { name: '부적 꾸러미', icon: '📜', rar: 'uncommon', desc: '무작위 카드 3장 중 1장을 골라 손에 넣습니다. 이번 턴 비용 0.',
    use(g, t, m) {
      const pool = JG.cardPool(g.run.char, (d) => d.rar !== 'basic');
      const list = [];
      const used = new Set();
      while (list.length < 3 && used.size < pool.length) { const d = g.rng.pick(pool); if (used.has(d.id)) continue; used.add(d.id); list.push(JG.newCard(d.id, false)); }
      g.choose({ title: '손에 넣을 카드', list, always: true, then: (p) => { for (const c of p) for (let i = 0; i < m; i++) { const x = g.addCard(c.id, 'hand', c.up); x.costTurn = 0; } } });
    } });
  P('p_ginseng', { name: '산삼', icon: '🥕', rar: 'rare', desc: '최대 체력 +8. (전투 밖에서도 사용 가능)',
    use(g, t, m) { g.gainMaxHp(8 * m); }, useOut(run, m) { run.maxHp += 8 * m; run.hp += 8 * m; } });
  P('p_stun', { name: '기절 가루', icon: '💫', rar: 'rare', target: 'enemy', desc: '적을 기절시킵니다.', use(g, t) { g.apply(t, 'stun', 1, g.p); } });
  P('p_fury', { name: '호랑이 기운', icon: '🐅', rar: 'rare', desc: '예리 3, 견고 3.', use(g, t, m) { g.selfApply('sharp', 3 * m); g.selfApply('sturdy', 3 * m); } });
})();
