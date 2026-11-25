'use strict';
// 공용 카드: 상태(전투 중 방해), 저주(덱에 남는 방해), 중립(사건·장터), 토큰
// 텍스트 표기: {D}/{D:키}=공격 피해(보정 반영), {B}/{B:키}=방어(보정 반영), {키}=수치
(function () {
  const C = JG.defCard;

  // ── 상태 카드 ──
  C('s_daze', { name: '잡념', el: 'none', type: 'status', cost: 0, rar: 'special', unplayable: true, kw: ['ethereal'], art: '亂',
    text: '사용할 수 없습니다.', play() {} });
  C('s_grudge', { name: '원한', el: 'none', type: 'status', cost: 0, rar: 'special', unplayable: true, art: '怨', v: { n: 2 },
    text: '사용할 수 없습니다. 손에 든 채로 턴이 끝나면 체력 {n}을 잃습니다.', play() {},
    endInHand(g, c) { g.loseHp(g.v(c, 'n')); } });
  C('s_soot', { name: '그을음', el: 'none', type: 'status', cost: 1, rar: 'special', kw: ['exhaust'], art: '煤', target: 'none',
    text: '아무 효과도 없습니다.', play() {} });
  C('s_filth', { name: '오물', el: 'none', type: 'status', cost: 0, rar: 'special', unplayable: true, art: '穢', v: { n: 2 },
    text: '사용할 수 없습니다. 손에 든 채로 턴이 끝나면 화상 {n}을 얻습니다.', play() {},
    endInHand(g, c) { g.apply(g.p, 'burn', g.v(c, 'n')); } });
  C('s_charm', { name: '현혹', el: 'none', type: 'status', cost: 0, rar: 'special', unplayable: true, kw: ['ethereal'], art: '惑',
    text: '사용할 수 없습니다. 이 카드가 손에 있는 동안 연계가 이어지지 않습니다.', play() {} });
  C('s_iron', { name: '쇳가루', el: 'none', type: 'status', cost: 0, rar: 'special', unplayable: true, kw: ['ethereal'], art: '屑', v: { n: 1 },
    text: '사용할 수 없습니다. 이 카드를 뽑으면 방어를 잃습니다(최대 5).', play() {},
    onDraw(g) { const lost = Math.min(5, g.p.block); if (lost) { g.p.block -= lost; g.fx.push({ t: 'block', who: 'p', amount: 0, snap: g.snap(g.p) }); } } });

  // ── 저주 ──
  C('x_karma', { name: '업보', el: 'none', type: 'curse', cost: 0, rar: 'curse', unplayable: true, art: '業',
    text: '사용할 수 없습니다.', play() {} });
  C('x_regret', { name: '미련', el: 'none', type: 'curse', cost: 0, rar: 'curse', unplayable: true, art: '戀',
    text: '사용할 수 없습니다. 손에 든 채로 턴이 끝나면 손패 1장당 체력 1을 잃습니다.', play() {},
    endInHand(g) { g.loseHp(g.pile.hand.length); } });
  C('x_shackle', { name: '족쇄', el: 'none', type: 'curse', cost: 0, rar: 'curse', unplayable: true, art: '枷',
    text: '사용할 수 없습니다. 이 카드를 뽑으면 기력을 1 잃습니다.', play() {},
    onDraw(g) { g.gainEnergy(-1); } });
  C('x_doubt', { name: '의심', el: 'none', type: 'curse', cost: 0, rar: 'curse', unplayable: true, art: '疑',
    text: '사용할 수 없습니다. 손에 든 채로 턴이 끝나면 균열 1을 얻습니다.', play() {},
    endInHand(g) { g.apply(g.p, 'crack', 1); } });
  C('x_forget', { name: '망각', el: 'none', type: 'curse', cost: 0, rar: 'curse', unplayable: true, kw: ['innate'], art: '忘',
    text: '선천. 사용할 수 없습니다.', play() {} });
  C('x_greed', { name: '탐욕', el: 'none', type: 'curse', cost: 0, rar: 'curse', unplayable: true, art: '貪',
    text: '사용할 수 없습니다. 손에 든 채로 턴이 끝나면 엽전 5를 잃습니다.', play() {},
    endInHand(g) { g.run.gold = Math.max(0, g.run.gold - 5); g.fx.push({ t: 'msg', text: '엽전 5를 잃었다…', gold: g.run.gold }); } });

  // ── 토큰 ──
  C('t_sprout', { name: '새싹', el: 'wood', type: 'atk', cost: 0, rar: 'special', kw: ['exhaust'], target: 'enemy', art: '芽',
    v: { dmg: 4, regen: 1 }, vu: { dmg: 6, regen: 2 },
    text: '피해 {D}. 재생 {regen}. 소멸.', play(g, c, t) { g.attack(t, g.v(c, 'dmg')); g.selfApply('regen', g.v(c, 'regen')); } });
  C('t_wisp_card', { name: '불티', el: 'fire', type: 'atk', cost: 0, rar: 'special', kw: ['exhaust'], target: 'enemy', art: '燐',
    v: { dmg: 3, burn: 2 }, vu: { dmg: 5, burn: 3 },
    text: '피해 {D}. 화상 {burn}. 소멸.', play(g, c, t) { g.attack(t, g.v(c, 'dmg')); g.apply(t, 'burn', g.v(c, 'burn'), g.p); } });

  // ── 중립 카드 (사건·장터) ──
  const N = (id, def) => C(id, Object.assign({ char: 'neutral' }, def));
  N('n_makgeolli', { name: '막걸리', el: 'none', type: 'skill', cost: 0, rar: 'common', kw: ['exhaust'], art: '酒',
    v: { heal: 4, e: 1 }, vu: { heal: 6, e: 1 }, text: '체력 {heal} 회복. 기력 {e}. 소멸.',
    play(g, c) { g.heal(g.p, g.v(c, 'heal')); g.gainEnergy(g.v(c, 'e')); } });
  N('n_coin_toss', { name: '엽전 던지기', el: 'metal', type: 'atk', cost: 0, rar: 'common', target: 'enemy', art: '錢',
    v: { dmg: 4, gold: 8 }, vu: { dmg: 6, gold: 12 }, text: '피해 {D}. 이 공격으로 적을 쓰러뜨리면 엽전 {gold}.',
    play(g, c, t) { g.attack(t, g.v(c, 'dmg')); if (t.dead) { g.run.gold += g.v(c, 'gold'); g.fx.push({ t: 'msg', text: `엽전 +${g.v(c, 'gold')}`, gold: g.run.gold }); } } });
  N('n_fan', { name: '합죽선', el: 'none', type: 'skill', cost: 1, rar: 'common', art: '扇',
    v: { blk: 6, draw: 1 }, vu: { blk: 9, draw: 1 }, text: '방어 {B}. 카드 {draw}장 뽑기.',
    play(g, c) { g.block(g.v(c, 'blk')); g.draw(g.v(c, 'draw')); } });
  N('n_rice_cake', { name: '떡 한 덩이', el: 'none', type: 'skill', cost: 1, rar: 'uncommon', kw: ['exhaust'], art: '餠',
    v: { heal: 7 }, vu: { heal: 10 }, text: '체력 {heal} 회복. 소멸.', play(g, c) { g.heal(g.p, g.v(c, 'heal')); } });
  N('n_golden_axe', { name: '금도끼', el: 'metal', type: 'atk', cost: 1, rar: 'rare', target: 'enemy', art: '斧',
    v: { dmg: 13 }, vu: { dmg: 18 }, text: '피해 {D}. 정직한 자에게 내려진 도끼.', play(g, c, t) { g.attack(t, g.v(c, 'dmg')); } });
  N('n_silver_axe', { name: '은도끼', el: 'metal', type: 'atk', cost: 1, rar: 'uncommon', target: 'enemy', art: '銀',
    v: { dmg: 8, blk: 5 }, vu: { dmg: 11, blk: 7 }, text: '피해 {D}. 방어 {B}.', play(g, c, t) { g.attack(t, g.v(c, 'dmg')); g.block(g.v(c, 'blk')); } });
  N('n_club', { name: '도깨비 방망이', el: 'wood', type: 'skill', cost: 1, rar: 'rare', kw: ['exhaust'], art: '棒',
    v: { gold: 20, e: 1 }, vu: { gold: 30, e: 2 }, text: '"금 나와라 뚝딱!" 엽전 {gold}, 기력 {e}. 소멸.',
    play(g, c) { g.run.gold += g.v(c, 'gold'); g.fx.push({ t: 'msg', text: `엽전 +${g.v(c, 'gold')}`, gold: g.run.gold }); g.gainEnergy(g.v(c, 'e')); } });
  N('n_magpie', { name: '까치의 보은', el: 'none', type: 'skill', cost: 0, rar: 'uncommon', kw: ['exhaust'], art: '鵲',
    v: { draw: 2 }, vu: { draw: 3 }, text: '카드 {draw}장 뽑기. 소멸.', play(g, c) { g.draw(g.v(c, 'draw')); } });
  N('n_life_water', { name: '생명수', el: 'water', type: 'skill', cost: 1, rar: 'rare', kw: ['exhaust'], art: '命',
    v: { heal: 12 }, vu: { heal: 18 }, text: '체력 {heal} 회복. 화상·냉기·균열을 없앱니다. 소멸.',
    play(g, c) { g.heal(g.p, g.v(c, 'heal')); for (const s of ['burn', 'chill', 'crack']) g.removeStatus(g.p, s); } });
  N('n_secret_book', { name: '비술서', el: 'none', type: 'power', cost: 2, rar: 'rare', art: '書', costUp: 1,
    v: { n: 1 }, text: '턴이 시작될 때 카드 {n}장을 더 뽑습니다.', play(g, c) { g.selfApply('p_book', g.v(c, 'n')); } });
  JG.defStatus('p_book', { name: '비술서', icon: '書', kind: 'power', desc: (n) => `턴이 시작될 때 카드 ${n}장을 더 뽑습니다.`, drawBonus: (g, n) => n });
  N('n_tiger_claw', { name: '호랑이 발톱', el: 'metal', type: 'atk', cost: 1, rar: 'uncommon', target: 'enemy', art: '爪',
    v: { dmg: 5, hits: 2 }, vu: { dmg: 7, hits: 2 }, text: '피해 {D}을 {hits}번.', play(g, c, t) { g.attack(t, g.v(c, 'dmg'), { hits: g.v(c, 'hits') }); } });
  N('n_fox_bead', { name: '여우구슬', el: 'wild', type: 'skill', cost: 0, rar: 'rare', art: '珠',
    v: { draw: 1 }, vu: { draw: 2 }, text: '오색(연계를 잇는 다음 원소로 취급). 카드 {draw}장 뽑기. 기력 1.',
    play(g, c) { g.draw(g.v(c, 'draw')); g.gainEnergy(1); } });
  N('n_jangseung', { name: '장승의 호령', el: 'earth', type: 'skill', cost: 1, rar: 'uncommon', art: '將',
    v: { blk: 8, n: 1 }, vu: { blk: 11, n: 1 }, text: '방어 {B}. 모든 적에게 냉기 {n}.',
    play(g, c) { g.block(g.v(c, 'blk')); g.applyAll('chill', g.v(c, 'n')); } });
})();
