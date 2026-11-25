'use strict';
// 화랑 도윤의 카드 — 공격으로 기세를 쌓고, 마무리 기술로 터뜨린다
(function () {
  const Y = (id, def) => JG.defCard(id, Object.assign({ char: 'doyun' }, def));
  const S = JG.defStatus;
  const fury = (g) => g.p.st.fury || 0;

  // ═══ 기본 ═══
  const BASIC_ATK = [['d_wood_atk', '청룡검', 'wood'], ['d_fire_atk', '주작검', 'fire'], ['d_earth_atk', '황룡검', 'earth'], ['d_water_atk', '현무검', 'water']];
  for (const [id, name, el] of BASIC_ATK) {
    Y(id, { name, el, type: 'atk', cost: 1, rar: 'basic', target: 'enemy', art: JG.ELINFO[el].hanja,
      v: { dmg: 6, f: 2 }, vu: { dmg: 9, f: 3 }, text: '피해 {D}.', chain: '기세 {f}.',
      play(g, c, t, k) { g.attack(t, g.v(c, 'dmg')); if (k.chained) g.gainFury(g.v(c, 'f')); } });
  }
  const BASIC_DEF = [['d_earth_def', '황룡 막기', 'earth'], ['d_water_def', '흘려 막기', 'water'], ['d_wood_def', '대나무 막기', 'wood'], ['d_metal_def', '쇠 막기', 'metal']];
  for (const [id, name, el] of BASIC_DEF) {
    Y(id, { name, el, type: 'skill', cost: 1, rar: 'basic', art: '防',
      v: { blk: 5, cblk: 3 }, vu: { blk: 8, cblk: 4 }, text: '방어 {B}.', chain: '방어 +{cblk}.',
      play(g, c, t, k) { g.block(g.v(c, 'blk') + (k.chained ? g.v(c, 'cblk') : 0)); } });
  }
  Y('d_ildo', { name: '일도양단', el: 'metal', type: 'atk', cost: 1, rar: 'basic', target: 'enemy', art: '斷', finisher: true,
    v: { dmg: 6, per: 4, heal: 4 }, vu: { dmg: 9, per: 5, heal: 6 }, text: '마무리: 기세를 모두 써서 피해 {D} + 기세당 {per}. 처치하면 체력 {heal} 회복.', chain: '기세 1을 남깁니다.',
    play(g, c, t, k) { const n = g.spendFury(); g.attack(t, g.v(c, 'dmg') + n * g.v(c, 'per')); if (t.dead) g.heal(g.p, g.v(c, 'heal')); if (k.chained && n > 0) g.gainFury(1); } });

  // ═══ 일반 ═══
  Y('d_double', { name: '연속 베기', el: 'metal', type: 'atk', cost: 1, rar: 'common', target: 'enemy', art: '連',
    v: { dmg: 4, hits: 2, f: 2 }, vu: { dmg: 5, hits: 2, f: 2 }, text: '피해 {D}을 {hits}번.', chain: '기세 {f}.',
    play(g, c, t, k) { g.attack(t, g.v(c, 'dmg'), { hits: g.v(c, 'hits') }); if (k.chained) g.gainFury(g.v(c, 'f')); } });
  Y('d_sweep_all', { name: '휘둘러 베기', el: 'metal', type: 'atk', cost: 1, rar: 'common', target: 'all', art: '揮',
    v: { dmg: 6, f: 1 }, vu: { dmg: 8, f: 2 }, text: '모든 적에게 피해 {D}.', chain: '기세 {f}.',
    play(g, c, t, k) { g.attackAll(g.v(c, 'dmg')); if (k.chained) g.gainFury(g.v(c, 'f')); } });
  Y('d_thrust', { name: '찌르기', el: 'fire', type: 'atk', cost: 1, rar: 'common', target: 'enemy', art: '刺',
    v: { dmg: 9, burn: 3 }, vu: { dmg: 12, burn: 4 }, text: '피해 {D}.', chain: '화상 {burn}.',
    play(g, c, t, k) { g.attack(t, g.v(c, 'dmg')); if (k.chained) g.apply(t, 'burn', g.v(c, 'burn'), g.p); } });
  Y('d_fire_slash', { name: '불꽃 베기', el: 'fire', type: 'atk', cost: 2, rar: 'common', target: 'enemy', art: '焰',
    v: { dmg: 14, f: 1, cf: 2 }, vu: { dmg: 18, f: 1, cf: 2 }, text: '피해 {D}. 기세 {f}.', chain: '기세 +{cf}.',
    play(g, c, t, k) { g.attack(t, g.v(c, 'dmg')); g.gainFury(g.v(c, 'f') + (k.chained ? g.v(c, 'cf') : 0)); } });
  Y('d_iron_stance', { name: '철벽 자세', el: 'earth', type: 'skill', cost: 1, rar: 'common', art: '壁',
    v: { blk: 7 }, vu: { blk: 10 }, text: '방어 {B}. 기세 1당 방어 +1 (최대 +10).', chain: '기세 1.',
    play(g, c, t, k) { g.block(g.v(c, 'blk') + Math.min(10, fury(g))); if (k.chained) g.gainFury(1); } });
  Y('d_counter', { name: '받아치기', el: 'earth', type: 'skill', cost: 1, rar: 'common', art: '返',
    v: { blk: 6, n: 1 }, vu: { blk: 9, n: 2 }, text: '방어 {B}. 이번 적 차례에 공격받을 때마다 기세 {n}.', chain: '방어 +3.',
    play(g, c, t, k) { g.block(g.v(c, 'blk') + (k.chained ? 3 : 0)); g.selfApply('counter', g.v(c, 'n')); } });
  S('counter', { name: '받아치기', icon: '返', kind: 'buff', desc: (n) => `이번 적 차례에 공격받을 때마다 기세 ${n}.`,
    attacked(g, n) { g.gainFury(n); }, turnStartPre(g) { delete g.p.st.counter; } });
  Y('d_ground_cut', { name: '땅 가르기', el: 'earth', type: 'atk', cost: 2, rar: 'common', target: 'enemy', art: '坼',
    v: { dmg: 11, f: 2 }, vu: { dmg: 15, f: 2 }, text: '피해 {D}. 모든 적에게 냉기 1.', chain: '기세 {f}.',
    play(g, c, t, k) { g.attack(t, g.v(c, 'dmg')); g.applyAll('chill', 1); if (k.chained) g.gainFury(g.v(c, 'f')); } });
  Y('d_flow_cut', { name: '흘려 베기', el: 'water', type: 'atk', cost: 1, rar: 'common', target: 'enemy', art: '流',
    v: { dmg: 5, draw: 1 }, vu: { dmg: 8, draw: 1 }, text: '피해 {D}. 카드 {draw}장 뽑기.', chain: '기세 1.',
    play(g, c, t, k) { g.attack(t, g.v(c, 'dmg')); g.draw(g.v(c, 'draw')); if (k.chained) g.gainFury(1); } });
  Y('d_step_back', { name: '물러서기', el: 'water', type: 'skill', cost: 1, rar: 'common', art: '退',
    v: { blk: 8, draw: 1 }, vu: { blk: 11, draw: 1 }, text: '방어 {B}. 다음 턴 카드 {draw}장 더.', chain: '기세 1.',
    play(g, c, t, k) { g.block(g.v(c, 'blk')); g.next.draw += g.v(c, 'draw'); if (k.chained) g.gainFury(1); } });
  Y('d_bamboo', { name: '죽도', el: 'wood', type: 'atk', cost: 0, rar: 'common', target: 'enemy', art: '竹',
    v: { dmg: 4, f: 1 }, vu: { dmg: 6, f: 1 }, text: '피해 {D}. 기세 {f}.', chain: '피해 +2.',
    play(g, c, t, k) { g.attack(t, g.v(c, 'dmg') + (k.chained ? 2 : 0)); g.gainFury(g.v(c, 'f')); } });
  Y('d_breath', { name: '숨 고르기', el: 'wood', type: 'skill', cost: 1, rar: 'common', kw: ['exhaust'], art: '息',
    v: { heal: 4, f: 2 }, vu: { heal: 6, f: 3 }, text: '체력 {heal} 회복. 기세 {f}. 소멸.', chain: '카드 1장 뽑기.',
    play(g, c, t, k) { g.heal(g.p, g.v(c, 'heal')); g.gainFury(g.v(c, 'f')); if (k.chained) g.draw(1); } });
  Y('d_vine_guard', { name: '가시 울타리', el: 'wood', type: 'skill', cost: 1, rar: 'common', art: '籬',
    v: { blk: 6, th: 2 }, vu: { blk: 9, th: 3 }, text: '방어 {B}.', chain: '가시 {th}.',
    play(g, c, t, k) { g.block(g.v(c, 'blk')); if (k.chained) g.selfApply('thorns', g.v(c, 'th')); } });
  Y('d_shout', { name: '기합', el: 'none', type: 'skill', cost: 0, rar: 'common', kw: ['exhaust'], art: '喝',
    v: { f: 3 }, vu: { f: 5 }, text: '기세 {f}. 소멸.', play(g, c) { g.gainFury(g.v(c, 'f')); } });
  Y('d_feint', { name: '허초', el: 'none', type: 'skill', cost: 1, rar: 'common', art: '虛',
    v: { draw: 2, f: 1 }, vu: { draw: 3, f: 1 }, text: '카드 {draw}장 뽑기. 기세 {f}.', play(g, c) { g.draw(g.v(c, 'draw')); g.gainFury(g.v(c, 'f')); } });
  Y('d_wave_cut', { name: '물결 쓸기', el: 'water', type: 'atk', cost: 2, rar: 'common', target: 'all', art: '掃',
    v: { dmg: 9, n: 1 }, vu: { dmg: 12, n: 1 }, text: '모든 적에게 피해 {D}. 냉기 {n}.', chain: '기세 2.',
    play(g, c, t, k) { g.attackAll(g.v(c, 'dmg')); g.applyAll('chill', g.v(c, 'n')); if (k.chained) g.gainFury(2); } });
  Y('d_edge_guard', { name: '칼등 막기', el: 'metal', type: 'skill', cost: 1, rar: 'common', art: '鍔',
    v: { blk: 7, edge: 3 }, vu: { blk: 10, edge: 4 }, text: '방어 {B}.', chain: '이번 턴 공격 피해 +{edge}.',
    play(g, c, t, k) { g.block(g.v(c, 'blk')); if (k.chained) g.selfApply('edge', g.v(c, 'edge')); } });

  // ═══ 고급 ═══
  Y('d_dragon_eye', { name: '화룡점정', el: 'fire', type: 'atk', cost: 2, rar: 'uncommon', target: 'enemy', art: '睛', finisher: true,
    v: { dmg: 4, per: 5 }, vu: { dmg: 6, per: 6 }, text: '마무리: 기세를 모두 써서 피해 {D} + 기세당 {per}.', chain: '그만큼 화상.',
    play(g, c, t, k) { const n = g.spendFury(); g.attack(t, g.v(c, 'dmg') + n * g.v(c, 'per')); if (k.chained && n) g.apply(t, 'burn', n, g.p); } });
  Y('d_thousand_sword', { name: '천검', el: 'metal', type: 'atk', cost: 1, rar: 'uncommon', target: 'all', art: '千', finisher: true,
    v: { dmg: 4 }, vu: { dmg: 5 }, text: '마무리: 기세를 모두 써서 무작위 적에게 피해 {D}을 기세만큼(최소 1번).', chain: '2번 더.',
    play(g, c, t, k) { const n = g.spendFury(); g.attackRandom(g.v(c, 'dmg'), Math.max(1, n) + (k.chained ? 2 : 0)); } });
  Y('d_tiger_spirit', { name: '백호의 기세', el: 'metal', type: 'power', cost: 1, rar: 'uncommon', art: '虎',
    v: { n: 2 }, vu: { n: 3 }, text: '턴이 시작될 때 기세 {n}.', play(g, c) { g.selfApply('p_tiger', g.v(c, 'n')); } });
  S('p_tiger', { name: '백호의 기세', icon: '虎', kind: 'power', desc: (n) => `턴이 시작될 때 기세 ${n}.`, turnStart(g, n) { g.gainFury(n); } });
  Y('d_spirit', { name: '투혼', el: 'fire', type: 'skill', cost: 0, rar: 'uncommon', art: '魂',
    v: { hp: 3, f: 4 }, vu: { hp: 3, f: 6 }, text: '체력 {hp}을 잃고 기세 {f}.', chain: '카드 1장 뽑기.',
    play(g, c, t, k) { g.loseHp(g.v(c, 'hp')); g.gainFury(g.v(c, 'f')); if (k.chained) g.draw(1); } });
  Y('d_passion', { name: '열화', el: 'fire', type: 'power', cost: 1, rar: 'uncommon', art: '熱',
    v: { n: 2 }, vu: { n: 3 }, text: '체력을 잃을 때마다 기세 {n}.', play(g, c) { g.selfApply('p_passion', g.v(c, 'n')); } });
  S('p_passion', { name: '열화', icon: '熱', kind: 'power', desc: (n) => `체력을 잃을 때마다 기세 ${n}.`, hpLost(g, n) { g.gainFury(n); } });
  Y('d_rage', { name: '분노 폭발', el: 'fire', type: 'skill', cost: 1, rar: 'uncommon', kw: ['exhaust'], art: '怒', costUp: 0,
    v: {}, text: '기세를 2배로. 소멸.', play(g) { g.gainFury(fury(g)); } });
  Y('d_mountain', { name: '태산 자세', el: 'earth', type: 'skill', cost: 2, rar: 'uncommon', art: '嶽',
    v: { per: 3 }, vu: { per: 4 }, text: '기세 1당 방어 {per} (기세는 그대로).', chain: '기세 2.',
    play(g, c, t, k) { if (k.chained) g.gainFury(2); g.block(fury(g) * g.v(c, 'per')); } });
  Y('d_endure', { name: '버티기', el: 'earth', type: 'power', cost: 1, rar: 'uncommon', art: '忍',
    v: { n: 2 }, vu: { n: 3 }, text: '턴이 끝날 때 방어가 있으면 기세 {n}.', play(g, c) { g.selfApply('p_endure', g.v(c, 'n')); } });
  S('p_endure', { name: '버티기', icon: '忍', kind: 'power', desc: (n) => `턴이 끝날 때 방어가 있으면 기세 ${n}.`, turnEnd(g, n) { if (g.p.block > 0) g.gainFury(n); } });
  Y('d_axis_cut', { name: '지축 베기', el: 'earth', type: 'atk', cost: 2, rar: 'uncommon', target: 'enemy', art: '軸',
    v: { dmg: 15 }, vu: { dmg: 20 }, text: '피해 {D}.', chain: '적을 기절시킵니다.',
    play(g, c, t, k) { g.attack(t, g.v(c, 'dmg')); if (k.chained && !t.dead) g.apply(t, 'stun', 1, g.p); } });
  Y('d_still_mind', { name: '명경지수', el: 'water', type: 'power', cost: 2, rar: 'uncommon', art: '鏡', costUp: 1,
    v: { n: 5 }, text: '기세가 {n} 이상인 채로 턴을 시작하면 기력 +1.', play(g, c) { g.selfApply('p_mind', g.v(c, 'n')); } });
  S('p_mind', { name: '명경지수', icon: '鏡', kind: 'power', desc: (n) => `기세 ${n} 이상으로 턴을 시작하면 기력 +1.`, turnStartPre(g, n) { if ((g.p.st.fury || 0) >= n) g.gainEnergy(1); } });
  Y('d_flowing_sword', { name: '유수검', el: 'water', type: 'atk', cost: 1, rar: 'uncommon', target: 'enemy', art: '水',
    v: { dmg: 3 }, vu: { dmg: 4 }, text: '피해 {D}을 이번 턴에 쓴 카드 수만큼(이 카드 포함).', chain: '1번 더.',
    play(g, c, t, k) { g.attack(t, g.v(c, 'dmg'), { hits: g.cnt.turnCards + (k.chained ? 1 : 0) }); } });
  Y('d_tide_guard', { name: '파도 막기', el: 'water', type: 'skill', cost: 2, rar: 'uncommon', art: '濤',
    v: { blk: 12, draw: 2 }, vu: { blk: 16, draw: 2 }, text: '방어 {B}.', chain: '카드 {draw}장 뽑기.',
    play(g, c, t, k) { g.block(g.v(c, 'blk')); if (k.chained) g.draw(g.v(c, 'draw')); } });
  Y('d_deep_root', { name: '깊은 뿌리', el: 'wood', type: 'power', cost: 2, rar: 'uncommon', art: '根',
    v: { n: 2 }, vu: { n: 3 }, text: '턴이 끝날 때 체력 {n} 회복, 기세 1.', play(g, c) { g.selfApply('p_root', g.v(c, 'n')); } });
  S('p_root', { name: '뿌리 깊은 나무', icon: '根', kind: 'power', desc: (n) => `턴이 끝날 때 체력 ${n} 회복, 기세 1.`, turnEnd(g, n) { g.heal(g.p, n); g.gainFury(1); } });
  Y('d_whirl', { name: '회오리 베기', el: 'wood', type: 'atk', cost: 2, rar: 'uncommon', target: 'all', art: '旋',
    v: { dmg: 5, hits: 2, f: 2 }, vu: { dmg: 7, hits: 2, f: 2 }, text: '모든 적에게 피해 {D}을 {hits}번.', chain: '기세 {f}.',
    play(g, c, t, k) { for (let i = 0; i < g.v(c, 'hits'); i++) g.attackAll(g.v(c, 'dmg')); if (k.chained) g.gainFury(g.v(c, 'f')); } });
  Y('d_rainbow_sword', { name: '오색검', el: 'wild', type: 'atk', cost: 1, rar: 'uncommon', target: 'enemy', art: '彩',
    v: { dmg: 7, f: 1 }, vu: { dmg: 10, f: 1 }, text: '오색(연계를 잇는 다음 원소로 취급). 피해 {D}. 기세 {f}.',
    play(g, c, t) { g.attack(t, g.v(c, 'dmg')); g.gainFury(g.v(c, 'f')); } });
  Y('d_empty_mind', { name: '무념무상', el: 'none', type: 'skill', cost: 1, rar: 'uncommon', art: '無',
    v: { draw: 3 }, vu: { draw: 4 }, text: '손패를 모두 버리고, 버린 장수만큼 기세. 카드 {draw}장 뽑기.',
    play(g, c) { const hand = g.pile.hand.slice(); for (const x of hand) g.discardCard(x); g.gainFury(hand.length); g.draw(g.v(c, 'draw')); } });

  // ═══ 희귀 ═══
  Y('d_iron_cut', { name: '참철', el: 'metal', type: 'atk', cost: 3, rar: 'rare', target: 'enemy', art: '鐵',
    v: { dmg: 22, per: 4 }, vu: { dmg: 28, per: 5 }, text: '피해 {D}. 기세 1당 피해 +{per} (기세는 그대로).', chain: '기력 1을 돌려받습니다.',
    play(g, c, t, k) { g.attack(t, g.v(c, 'dmg') + fury(g) * g.v(c, 'per')); if (k.chained) g.gainEnergy(1); } });
  Y('d_hwarang_way', { name: '화랑도', el: 'none', type: 'power', cost: 3, rar: 'rare', art: '道', costUp: 2,
    v: {}, text: '마무리 기술로 쓴 기세의 절반을 돌려받습니다.', play(g) { g.selfApply('p_hwarang', 1); } });
  S('p_hwarang', { name: '화랑도', icon: '道', kind: 'power', flag: true, desc: () => '마무리로 쓴 기세의 절반을 돌려받습니다.', furySpent(g, n, amount) { if (amount >= 2) g.gainFury(Math.floor(amount / 2)); } });
  Y('d_precepts', { name: '세속오계', el: 'none', type: 'power', cost: 2, rar: 'rare', art: '戒', costUp: 1,
    v: {}, text: '매 턴, 원소마다 처음 쓰는 카드는 기세 1을 줍니다.', play(g) { g.selfApply('p_precepts', 1); } });
  S('p_precepts', { name: '세속오계', icon: '戒', kind: 'power', flag: true, desc: () => '매 턴 원소마다 처음 쓰는 카드는 기세 1.',
    turnStartPre(g) { g.flags.precepts = {}; },
    cardPlayed(g, n, c) { const el = JG.cdef(c).el; if (!JG.EL.includes(el)) return; g.flags.precepts = g.flags.precepts || {}; if (!g.flags.precepts[el]) { g.flags.precepts[el] = 1; g.gainFury(1); } } });
  Y('d_sword_dance', { name: '검무', el: 'fire', type: 'atk', cost: 2, rar: 'rare', target: 'enemy', art: '舞',
    v: { dmg: 5, hits: 4 }, vu: { dmg: 6, hits: 4 }, text: '피해 {D}을 {hits}번.', chain: '1번 더, 기세 2.',
    play(g, c, t, k) { g.attack(t, g.v(c, 'dmg'), { hits: g.v(c, 'hits') + (k.chained ? 1 : 0) }); if (k.chained) g.gainFury(2); } });
  Y('d_rising_dragon', { name: '승룡참', el: 'water', type: 'atk', cost: 2, rar: 'rare', target: 'all', art: '昇', finisher: true,
    v: { dmg: 6, per: 4 }, vu: { dmg: 9, per: 5 }, text: '마무리: 기세를 모두 써서, 모든 적에게 피해 {D} + 기세 1당 {per}.', chain: '카드 2장 뽑기.',
    play(g, c, t, k) { const n = g.spendFury(); g.attackAll(g.v(c, 'dmg') + n * g.v(c, 'per')); if (k.chained) g.draw(2); } });
  Y('d_unshaken', { name: '부동심', el: 'earth', type: 'power', cost: 2, rar: 'rare', art: '不',
    v: { per: 2 }, vu: { per: 3 }, text: '턴이 시작될 때 기세 1당 방어 {per} (최대 24).', play(g, c) { g.selfApply('p_unshaken', g.v(c, 'per')); } });
  S('p_unshaken', { name: '부동심', icon: '不', kind: 'power', desc: (n) => `턴이 시작될 때 기세 1당 방어 ${n} (최대 24).`, turnStart(g, n) { const b = Math.min(24, (g.p.st.fury || 0) * n); if (b) g.block(b); } });
  Y('d_trance', { name: '무아지경', el: 'none', type: 'skill', cost: 2, rar: 'rare', kw: ['exhaust'], art: '我', costUp: 1,
    v: {}, text: '이번 턴 손패의 공격 카드 비용이 0이 됩니다. 소멸.',
    play(g) { for (const x of g.pile.hand) if (JG.cdef(x).type === 'atk') x.costTurn = 0; g.fx.push({ t: 'msg', text: '무아지경! 공격 카드 비용 0' }); } });
  Y('d_blood_oath', { name: '혈맹', el: 'fire', type: 'power', cost: 1, rar: 'rare', art: '血',
    v: { n: 3 }, vu: { n: 4 }, text: '턴이 시작될 때 이번 턴 공격 피해 +{n}. 턴이 끝날 때 체력 2를 잃습니다.', play(g, c) { g.selfApply('p_oath', g.v(c, 'n')); g.selfApply('edge', g.v(c, 'n')); } });
  S('p_oath', { name: '혈맹', icon: '血', kind: 'power', desc: (n) => `턴 시작 시 공격 피해 +${n}, 턴 종료 시 체력 2 잃음.`, turnStart(g, n) { g.selfApply('edge', n); }, turnEnd(g) { g.loseHp(2); } });
  Y('d_crane_wing', { name: '학익진', el: 'wood', type: 'skill', cost: 2, rar: 'rare', art: '鶴',
    v: { blk: 11, n: 2, f: 2 }, vu: { blk: 15, n: 2, f: 3 }, text: '방어 {B}. 모든 적에게 냉기 {n}. 기세 {f}.', chain: '기력 1을 돌려받습니다.',
    play(g, c, t, k) { g.block(g.v(c, 'blk')); g.applyAll('chill', g.v(c, 'n')); g.gainFury(g.v(c, 'f')); if (k.chained) g.gainEnergy(1); } });
  Y('d_heaven_split', { name: '천지개벽', el: 'metal', type: 'atk', cost: 'X', rar: 'rare', target: 'enemy', art: '天', finisher: true,
    v: { dmg: 9 }, vu: { dmg: 12 }, text: '마무리: 피해 {D}을 X번. 기세 4당 1번 더(기세를 모두 씀).', chain: '1번 더.',
    play(g, c, t, k) { const n = g.spendFury(); g.attack(t, g.v(c, 'dmg'), { hits: k.x + Math.floor(n / 4) + (k.chained ? 1 : 0) }); } });

  // 캐릭터
  JG.D.chars.doyun = {
    id: 'doyun', name: '도윤', title: '화랑', hp: 85, gold: 99, relic: 'r_hwarang_sword', img: 'ch_doyun', color: '#caa44e',
    blurb: '신라의 검을 잇는 젊은 화랑. 공격할 때마다 기세를 쌓고, 마무리 기술로 한꺼번에 터뜨립니다.',
    style: '난이도 ★☆☆ · 공격형 · 기세를 모아 마무리',
    prologue: '화랑의 수련터에 검은 구름이 내려앉았다. 스승은 “검은 사람을 지키라고 있는 것”이라 말했다. 도윤은 칼을 차고, 요괴가 몰려오는 산길로 홀로 내려간다.',
    ending: '마지막 일격이 흑운을 갈랐다. 저승문이 닫히는 소리는 생각보다 작았다. 도윤은 칼을 칼집에 넣고 오래 숨을 골랐다. 동이 틀 무렵 수련터에 돌아온 그는, 아이들에게 처음으로 검이 아닌 이야기를 가르쳤다.',
    deck: ['d_wood_atk', 'd_fire_atk', 'd_earth_atk', 'd_water_atk', 'd_earth_def', 'd_water_def', 'd_wood_def', 'd_metal_def', 'd_ildo', 'd_bamboo'],
    unlock: (d) => d.stats.runs >= 1,
    unlockText: '여정을 한 번 마치면 함께할 수 있습니다.',
  };
})();
