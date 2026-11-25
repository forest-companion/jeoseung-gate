'use strict';
// 무녀 연화의 카드 — 오행을 고루 쓰는 부적사
// v=기본 수치, vu=강화 수치. text/chain 의 {D}·{B}·{키} 는 화면에서 실제 값으로 바뀐다.
(function () {
  const Y = (id, def) => JG.defCard(id, Object.assign({ char: 'yeonhwa' }, def));
  const S = JG.defStatus;

  // ═══ 기본 카드 ═══
  Y('y_wood_atk', { name: '목 부적', el: 'wood', type: 'atk', cost: 1, rar: 'basic', target: 'enemy', art: '木',
    v: { dmg: 6, heal: 2 }, vu: { dmg: 9, heal: 3 }, text: '피해 {D}.', chain: '체력 {heal} 회복.',
    play(g, c, t, k) { g.attack(t, g.v(c, 'dmg')); if (k.chained) g.heal(g.p, g.v(c, 'heal')); } });
  Y('y_fire_atk', { name: '화 부적', el: 'fire', type: 'atk', cost: 1, rar: 'basic', target: 'enemy', art: '火',
    v: { dmg: 6, burn: 2 }, vu: { dmg: 9, burn: 3 }, text: '피해 {D}.', chain: '화상 {burn}.',
    play(g, c, t, k) { g.attack(t, g.v(c, 'dmg')); if (k.chained) g.apply(t, 'burn', g.v(c, 'burn'), g.p); } });
  Y('y_earth_atk', { name: '토 부적', el: 'earth', type: 'atk', cost: 1, rar: 'basic', target: 'enemy', art: '土',
    v: { dmg: 6, blk: 3 }, vu: { dmg: 9, blk: 4 }, text: '피해 {D}.', chain: '방어 {B}.',
    play(g, c, t, k) { g.attack(t, g.v(c, 'dmg')); if (k.chained) g.block(g.v(c, 'blk')); } });
  Y('y_metal_atk', { name: '금 부적', el: 'metal', type: 'atk', cost: 1, rar: 'basic', target: 'enemy', art: '金',
    v: { dmg: 6, cdmg: 3 }, vu: { dmg: 9, cdmg: 4 }, text: '피해 {D}.', chain: '피해 +{cdmg}.',
    play(g, c, t, k) { g.attack(t, g.v(c, 'dmg') + (k.chained ? g.v(c, 'cdmg') : 0)); } });
  Y('y_water_atk', { name: '수 부적', el: 'water', type: 'atk', cost: 1, rar: 'basic', target: 'enemy', art: '水',
    v: { dmg: 6, draw: 1 }, vu: { dmg: 9, draw: 1 }, text: '피해 {D}.', chain: '카드 {draw}장 뽑기.',
    play(g, c, t, k) { g.attack(t, g.v(c, 'dmg')); if (k.chained) g.draw(g.v(c, 'draw')); } });

  Y('y_wood_def', { name: '목 결계', el: 'wood', type: 'skill', cost: 1, rar: 'basic', art: '護',
    v: { blk: 5, regen: 2 }, vu: { blk: 8, regen: 3 }, text: '방어 {B}.', chain: '재생 {regen}.',
    play(g, c, t, k) { g.block(g.v(c, 'blk')); if (k.chained) g.selfApply('regen', g.v(c, 'regen')); } });
  Y('y_fire_def', { name: '화 결계', el: 'fire', type: 'skill', cost: 1, rar: 'basic', art: '護',
    v: { blk: 5, burn: 1 }, vu: { blk: 8, burn: 2 }, text: '방어 {B}.', chain: '모든 적에게 화상 {burn}.',
    play(g, c, t, k) { g.block(g.v(c, 'blk')); if (k.chained) g.applyAll('burn', g.v(c, 'burn')); } });
  Y('y_earth_def', { name: '토 결계', el: 'earth', type: 'skill', cost: 1, rar: 'basic', art: '護',
    v: { blk: 5, cblk: 4 }, vu: { blk: 8, cblk: 5 }, text: '방어 {B}.', chain: '방어 +{cblk}.',
    play(g, c, t, k) { g.block(g.v(c, 'blk') + (k.chained ? g.v(c, 'cblk') : 0)); } });
  Y('y_metal_def', { name: '금 결계', el: 'metal', type: 'skill', cost: 1, rar: 'basic', art: '護',
    v: { blk: 5, n: 1 }, vu: { blk: 8, n: 1 }, text: '방어 {B}.', chain: '무작위 적에게 균열 {n}.',
    play(g, c, t, k) { g.block(g.v(c, 'blk')); if (k.chained) { const e = g.randomEnemy(); if (e) g.apply(e, 'crack', g.v(c, 'n'), g.p); } } });
  Y('y_water_def', { name: '수 결계', el: 'water', type: 'skill', cost: 1, rar: 'basic', art: '護',
    v: { blk: 5, n: 1 }, vu: { blk: 8, n: 1 }, text: '방어 {B}.', chain: '무작위 적에게 냉기 {n}.',
    play(g, c, t, k) { g.block(g.v(c, 'blk')); if (k.chained) { const e = g.randomEnemy(); if (e) g.apply(e, 'chill', g.v(c, 'n'), g.p); } } });

  Y('y_wild', { name: '오색 부적', el: 'wild', type: 'skill', cost: 0, rar: 'basic', art: '彩',
    v: { draw: 1 }, vu: { draw: 2 }, text: '오색: 연계를 잇는 다음 원소로 취급합니다. 카드 {draw}장 뽑기.',
    play(g, c) { g.draw(g.v(c, 'draw')); } });

  // ═══ 木 목 — 생명·가시·성장 ═══
  Y('y_vine_whip', { name: '덩굴 채찍', el: 'wood', type: 'atk', cost: 1, rar: 'common', target: 'enemy', art: '蔓',
    v: { dmg: 8, th: 2 }, vu: { dmg: 11, th: 3 }, text: '피해 {D}.', chain: '가시 {th}.',
    play(g, c, t, k) { g.attack(t, g.v(c, 'dmg')); if (k.chained) g.selfApply('thorns', g.v(c, 'th')); } });
  Y('y_sprout', { name: '새순', el: 'wood', type: 'skill', cost: 1, rar: 'common', art: '芽',
    v: { blk: 6, regen: 2, creg: 2 }, vu: { blk: 8, regen: 3, creg: 3 }, text: '방어 {B}. 재생 {regen}.', chain: '재생 +{creg}.',
    play(g, c, t, k) { g.block(g.v(c, 'blk')); g.selfApply('regen', g.v(c, 'regen') + (k.chained ? g.v(c, 'creg') : 0)); } });
  Y('y_pine_rain', { name: '솔잎 비', el: 'wood', type: 'atk', cost: 1, rar: 'common', target: 'all', art: '松',
    v: { dmg: 3, hits: 3 }, vu: { dmg: 4, hits: 3 }, text: '무작위 적에게 피해 {D}을 {hits}번.', chain: '1번 더.',
    play(g, c, t, k) { g.attackRandom(g.v(c, 'dmg'), g.v(c, 'hits') + (k.chained ? 1 : 0)); } });
  Y('y_bark', { name: '나무껍질', el: 'wood', type: 'skill', cost: 1, rar: 'common', art: '皮',
    v: { blk: 8, regen: 3 }, vu: { blk: 11, regen: 4 }, text: '방어 {B}.', chain: '재생 {regen}.',
    play(g, c, t, k) { g.block(g.v(c, 'blk')); if (k.chained) g.selfApply('regen', g.v(c, 'regen')); } });
  Y('y_pollen', { name: '꽃가루', el: 'wood', type: 'skill', cost: 0, rar: 'common', art: '花',
    v: { draw: 1, heal: 3 }, vu: { draw: 2, heal: 3 }, text: '카드 {draw}장 뽑기.', chain: '체력 {heal} 회복.',
    play(g, c, t, k) { g.draw(g.v(c, 'draw')); if (k.chained) g.heal(g.p, g.v(c, 'heal')); } });
  Y('y_growing_vine', { name: '자라는 덩굴', el: 'wood', type: 'atk', cost: 1, rar: 'uncommon', target: 'enemy', art: '長',
    v: { dmg: 6, grow: 3 }, vu: { dmg: 8, grow: 4 }, text: '피해 {D}. 쓸 때마다 이번 전투 동안 피해 +{grow}.', chain: '두 배로 자랍니다.',
    play(g, c, t, k) { g.attack(t, g.v(c, 'dmg')); c.bonus.dmg = (c.bonus.dmg || 0) + g.v(c, 'grow') * (k.chained ? 2 : 1); } });
  Y('y_life_tree', { name: '생명의 나무', el: 'wood', type: 'power', cost: 2, rar: 'uncommon', art: '生', costUp: 1,
    v: { n: 2 }, text: '턴이 끝날 때 체력 {n} 회복.',
    play(g, c) { g.selfApply('p_lifeTree', g.v(c, 'n')); } });
  S('p_lifeTree', { name: '생명의 나무', icon: '生', kind: 'power', desc: (n) => `턴이 끝날 때 체력 ${n} 회복.`, turnEnd(g, n) { g.heal(g.p, n); } });
  Y('y_thorn_bush', { name: '가시 덤불', el: 'wood', type: 'power', cost: 1, rar: 'uncommon', art: '棘',
    v: { n: 3 }, vu: { n: 5 }, text: '가시 {n}.', play(g, c) { g.selfApply('thorns', g.v(c, 'n')); } });
  Y('y_seedling', { name: '씨앗 심기', el: 'wood', type: 'skill', cost: 1, rar: 'uncommon', art: '種',
    v: { blk: 5, n: 2 }, vu: { blk: 7, n: 3 }, text: '방어 {B}. 뽑을 더미에 새싹 {n}장을 섞습니다.', chain: '새싹을 강화된 상태로 넣습니다.',
    play(g, c, t, k) { g.block(g.v(c, 'blk')); for (let i = 0; i < g.v(c, 'n'); i++) g.addCard('t_sprout', 'draw', k.chained); } });
  Y('y_forest_breath', { name: '숲의 숨결', el: 'wood', type: 'skill', cost: 1, rar: 'uncommon', kw: ['exhaust'], art: '林',
    v: { regen: 6, creg: 3 }, vu: { regen: 8, creg: 4 }, text: '재생 {regen}. 소멸.', chain: '재생 +{creg}.',
    play(g, c, t, k) { g.selfApply('regen', g.v(c, 'regen') + (k.chained ? g.v(c, 'creg') : 0)); } });
  Y('y_bloom', { name: '만개', el: 'wood', type: 'skill', cost: 2, rar: 'uncommon', art: '開', costUp: 1,
    v: { creg: 3 }, text: '재생 수치의 2배만큼 방어를 얻습니다.', chain: '먼저 재생 {creg}을 얻습니다.',
    play(g, c, t, k) { if (k.chained) g.selfApply('regen', g.v(c, 'creg')); g.block((g.p.st.regen || 0) * 2); } });
  Y('y_azure_dragon', { name: '청룡 강림', el: 'wood', type: 'atk', cost: 3, rar: 'rare', target: 'all', art: '龍',
    v: { dmg: 14, regen: 4 }, vu: { dmg: 18, regen: 6 }, text: '모든 적에게 피해 {D}. 재생 {regen}.', chain: '기력 1을 돌려받습니다.',
    play(g, c, t, k) { g.attackAll(g.v(c, 'dmg')); g.selfApply('regen', g.v(c, 'regen')); if (k.chained) g.gainEnergy(1); } });
  Y('y_world_tree', { name: '세계수', el: 'wood', type: 'power', cost: 2, rar: 'rare', art: '樹', costUp: 1,
    v: { n: 1 }, text: '체력을 회복할 때마다 그만큼 무작위 적에게 피해를 줍니다.',
    play(g, c) { g.selfApply('p_worldTree', 1); } });
  S('p_worldTree', { name: '세계수', icon: '樹', kind: 'power', desc: (n) => `체력을 회복할 때마다 그 ${n > 1 ? n + '배' : ''}만큼 무작위 적에게 피해.`,
    healed(g, n, amount) { const e = g.randomEnemy(); if (e) g.damage(e, amount * n, { kind: 'power' }); } });

  // ═══ 火 화 — 화상·광역·희생 ═══
  Y('y_ember', { name: '불씨', el: 'fire', type: 'atk', cost: 1, rar: 'common', target: 'enemy', art: '炎',
    v: { dmg: 5, burn: 3, cburn: 2 }, vu: { dmg: 6, burn: 4, cburn: 3 }, text: '피해 {D}. 화상 {burn}.', chain: '화상 +{cburn}.',
    play(g, c, t, k) { g.attack(t, g.v(c, 'dmg')); g.apply(t, 'burn', g.v(c, 'burn') + (k.chained ? g.v(c, 'cburn') : 0), g.p); } });
  Y('y_fire_fan', { name: '화염 부채', el: 'fire', type: 'atk', cost: 1, rar: 'common', target: 'all', art: '扇',
    v: { dmg: 5, burn: 2 }, vu: { dmg: 7, burn: 3 }, text: '모든 적에게 피해 {D}.', chain: '모든 적에게 화상 {burn}.',
    play(g, c, t, k) { g.attackAll(g.v(c, 'dmg')); if (k.chained) g.applyAll('burn', g.v(c, 'burn')); } });
  Y('y_flame_veil', { name: '불꽃 장막', el: 'fire', type: 'skill', cost: 1, rar: 'common', art: '幕',
    v: { blk: 7, burn: 3 }, vu: { blk: 10, burn: 4 }, text: '방어 {B}.', chain: '무작위 적에게 화상 {burn}.',
    play(g, c, t, k) { g.block(g.v(c, 'blk')); if (k.chained) { const e = g.randomEnemy(); if (e) g.apply(e, 'burn', g.v(c, 'burn'), g.p); } } });
  Y('y_ignite', { name: '점화', el: 'fire', type: 'skill', cost: 0, rar: 'common', target: 'enemy', art: '點',
    v: { burn: 3, draw: 1 }, vu: { burn: 5, draw: 1 }, text: '화상 {burn}.', chain: '카드 {draw}장 뽑기.',
    play(g, c, t, k) { g.apply(t, 'burn', g.v(c, 'burn'), g.p); if (k.chained) g.draw(g.v(c, 'draw')); } });
  Y('y_wildfire', { name: '들불', el: 'fire', type: 'atk', cost: 2, rar: 'common', target: 'all', art: '野',
    v: { dmg: 9, burn: 1, cburn: 2 }, vu: { dmg: 12, burn: 2, cburn: 2 }, text: '모든 적에게 피해 {D}, 화상 {burn}.', chain: '화상 +{cburn}.',
    play(g, c, t, k) { g.attackAll(g.v(c, 'dmg')); g.applyAll('burn', g.v(c, 'burn') + (k.chained ? g.v(c, 'cburn') : 0)); } });
  Y('y_inferno', { name: '업화', el: 'fire', type: 'skill', cost: 1, rar: 'uncommon', target: 'enemy', kw: ['exhaust'], art: '業', costUp: 0,
    v: {}, text: '적의 화상을 2배로 만듭니다. 소멸.',
    play(g, c, t) { if (t.st.burn) g.apply(t, 'burn', t.st.burn, g.p); } });
  Y('y_fire_burst', { name: '폭염', el: 'fire', type: 'atk', cost: 2, rar: 'uncommon', target: 'enemy', art: '爆',
    v: { dmg: 10 }, vu: { dmg: 14 }, text: '피해 {D} + 대상의 화상.', chain: '화상의 2배를 더합니다.',
    play(g, c, t, k) { const b = t.st.burn || 0; g.attack(t, g.v(c, 'dmg') + b * (k.chained ? 2 : 1)); } });
  Y('y_fire_soul', { name: '불의 혼', el: 'fire', type: 'power', cost: 1, rar: 'uncommon', art: '魂', costUp: 0,
    v: { n: 1 }, text: '화상을 줄 때마다 {n} 더 줍니다.', play(g, c) { g.selfApply('p_fireSoul', g.v(c, 'n')); } });
  S('p_fireSoul', { name: '불의 혼', icon: '魂', kind: 'power', desc: (n) => `화상을 줄 때마다 ${n} 더 줍니다.`,
    modApply(g, n, val, t, id) { return id === 'burn' ? val + n : val; } });
  Y('y_sacrifice', { name: '희생의 불꽃', el: 'fire', type: 'skill', cost: 0, rar: 'uncommon', art: '犧',
    v: { hp: 3, e: 2, draw: 1 }, vu: { hp: 2, e: 2, draw: 2 }, text: '체력 {hp}을 잃고 기력 {e}을 얻습니다.', chain: '카드 {draw}장 뽑기.',
    play(g, c, t, k) { g.loseHp(g.v(c, 'hp')); g.gainEnergy(g.v(c, 'e')); if (k.chained) g.draw(g.v(c, 'draw')); } });
  Y('y_ashes', { name: '잿더미', el: 'fire', type: 'skill', cost: 1, rar: 'uncommon', art: '灰',
    v: { burn: 3, blk: 6 }, vu: { burn: 5, blk: 8 }, text: '손의 카드 1장을 소멸시킵니다. 모든 적에게 화상 {burn}.', chain: '방어 {B}.',
    play(g, c, t, k) {
      if (k.chained) g.block(g.v(c, 'blk'));
      g.applyAll('burn', g.v(c, 'burn'));
      g.choose({ title: '소멸시킬 카드', from: 'hand', then: (p) => { for (const x of p) g.exhaustCard(x); } });
    } });
  Y('y_purgatory', { name: '연옥', el: 'fire', type: 'power', cost: 2, rar: 'uncommon', art: '獄',
    v: { n: 2 }, vu: { n: 3 }, text: '턴이 시작될 때 모든 적에게 화상 {n}.', play(g, c) { g.selfApply('p_purgatory', g.v(c, 'n')); } });
  S('p_purgatory', { name: '연옥', icon: '獄', kind: 'power', desc: (n) => `턴이 시작될 때 모든 적에게 화상 ${n}.`, turnStart(g, n) { g.applyAll('burn', n); } });
  Y('y_vermilion_bird', { name: '주작 강림', el: 'fire', type: 'atk', cost: 3, rar: 'rare', target: 'all', art: '雀',
    v: { dmg: 10, burn: 6 }, vu: { dmg: 13, burn: 8 }, text: '모든 적에게 피해 {D}, 화상 {burn}.', chain: '기력 1을 돌려받습니다.',
    play(g, c, t, k) { g.attackAll(g.v(c, 'dmg')); g.applyAll('burn', g.v(c, 'burn')); if (k.chained) g.gainEnergy(1); } });
  Y('y_phoenix', { name: '불사조의 깃털', el: 'fire', type: 'power', cost: 2, rar: 'rare', art: '鳳', costUp: 1,
    v: { pct: 40 }, text: '이번 전투에서 처음 쓰러질 때 최대 체력의 {pct}%로 되살아납니다.',
    play(g, c) { g.selfApply('p_phoenix', g.v(c, 'pct')); } });
  S('p_phoenix', { name: '불사조', icon: '鳳', kind: 'power', desc: (n) => `처음 쓰러질 때 최대 체력의 ${n}%로 되살아납니다.`,
    preventDeath(g, n) { g.p.hp = Math.max(1, Math.floor(g.p.maxHp * n / 100)); delete g.p.st.p_phoenix; return true; } });
  Y('y_hellfire', { name: '겁화', el: 'fire', type: 'atk', cost: 'X', rar: 'rare', target: 'all', art: '劫',
    v: { dmg: 7 }, vu: { dmg: 10 }, text: '모든 적에게 피해 {D}을 X번.', chain: '1번 더.',
    play(g, c, t, k) { const n = k.x + (k.chained ? 1 : 0); for (let i = 0; i < n; i++) { g.attackAll(g.v(c, 'dmg')); if (g.over) break; } } });

  // ═══ 土 토 — 방어·견고 ═══
  Y('y_mud_wall', { name: '흙벽', el: 'earth', type: 'skill', cost: 1, rar: 'common', art: '壁',
    v: { blk: 8, cblk: 4 }, vu: { blk: 11, cblk: 5 }, text: '방어 {B}.', chain: '방어 +{cblk}.',
    play(g, c, t, k) { g.block(g.v(c, 'blk') + (k.chained ? g.v(c, 'cblk') : 0)); } });
  Y('y_rock_throw', { name: '돌팔매', el: 'earth', type: 'atk', cost: 1, rar: 'common', target: 'enemy', art: '石',
    v: { dmg: 7, blk: 3, cdmg: 3 }, vu: { dmg: 9, blk: 4, cdmg: 4 }, text: '피해 {D}. 방어 {B}.', chain: '피해 +{cdmg}.',
    play(g, c, t, k) { g.attack(t, g.v(c, 'dmg') + (k.chained ? g.v(c, 'cdmg') : 0)); g.block(g.v(c, 'blk')); } });
  Y('y_quake', { name: '지진', el: 'earth', type: 'atk', cost: 2, rar: 'common', target: 'all', art: '震',
    v: { dmg: 8, n: 1 }, vu: { dmg: 11, n: 1 }, text: '모든 적에게 피해 {D}.', chain: '모든 적에게 냉기 {n}.',
    play(g, c, t, k) { g.attackAll(g.v(c, 'dmg')); if (k.chained) g.applyAll('chill', g.v(c, 'n')); } });
  Y('y_dust', { name: '흙먼지', el: 'earth', type: 'skill', cost: 1, rar: 'common', art: '塵',
    v: { blk: 6, draw: 1, cblk: 3 }, vu: { blk: 8, draw: 1, cblk: 4 }, text: '방어 {B}. 카드 {draw}장 뽑기.', chain: '방어 +{cblk}.',
    play(g, c, t, k) { g.block(g.v(c, 'blk') + (k.chained ? g.v(c, 'cblk') : 0)); g.draw(g.v(c, 'draw')); } });
  Y('y_fortress', { name: '토성', el: 'earth', type: 'skill', cost: 2, rar: 'common', art: '城',
    v: { blk: 14, n: 1 }, vu: { blk: 18, n: 1 }, text: '방어 {B}.', chain: '견고 {n}.',
    play(g, c, t, k) { g.block(g.v(c, 'blk')); if (k.chained) g.selfApply('sturdy', g.v(c, 'n')); } });
  Y('y_landslide', { name: '산사태', el: 'earth', type: 'atk', cost: 1, rar: 'uncommon', target: 'enemy', art: '崩', costUp: 0,
    v: { cblk: 5 }, text: '현재 방어만큼 피해를 줍니다.', chain: '먼저 방어 {B:cblk}을 얻습니다.',
    play(g, c, t, k) { if (k.chained) g.block(g.v(c, 'cblk')); g.attack(t, g.p.block); } });
  Y('y_earth_power', { name: '대지의 기운', el: 'earth', type: 'power', cost: 1, rar: 'uncommon', art: '地',
    v: { n: 2 }, vu: { n: 3 }, text: '견고 {n}.', play(g, c) { g.selfApply('sturdy', g.v(c, 'n')); } });
  Y('y_leyline', { name: '지맥', el: 'earth', type: 'skill', cost: 1, rar: 'uncommon', art: '脈',
    v: { blk: 7, e: 1 }, vu: { blk: 10, e: 1 }, text: '방어 {B}. 다음 턴 기력 +{e}.', chain: '다음 턴 카드 1장 더.',
    play(g, c, t, k) { g.block(g.v(c, 'blk')); g.next.energy += g.v(c, 'e'); if (k.chained) g.next.draw += 1; } });
  Y('y_quicksand', { name: '진흙 수렁', el: 'earth', type: 'skill', cost: 1, rar: 'uncommon', art: '泥',
    v: { n: 2, blk: 6 }, vu: { n: 3, blk: 8 }, text: '모든 적에게 냉기 {n}.', chain: '방어 {B}.',
    play(g, c, t, k) { g.applyAll('chill', g.v(c, 'n')); if (k.chained) g.block(g.v(c, 'blk')); } });
  Y('y_stone_skin', { name: '돌 피부', el: 'earth', type: 'power', cost: 2, rar: 'uncommon', art: '岩',
    v: { n: 4 }, vu: { n: 6 }, text: '턴이 끝날 때 방어 {n}.', play(g, c) { g.selfApply('p_stoneSkin', g.v(c, 'n')); } });
  S('p_stoneSkin', { name: '돌 피부', icon: '岩', kind: 'power', desc: (n) => `턴이 끝날 때 방어 ${n}.`, turnEnd(g, n) { g.block(n); } });
  Y('y_yellow_dragon', { name: '황룡 강림', el: 'earth', type: 'skill', cost: 3, rar: 'rare', target: 'all', art: '黃',
    v: { blk: 18 }, vu: { blk: 24 }, text: '방어 {B}. 그 절반만큼 모든 적에게 피해.', chain: '기력 1 돌려받기.',
    play(g, c, t, k) { const got = g.block(g.v(c, 'blk')); for (const e of g.alive()) g.damage(e, Math.floor(got / 2), { kind: 'skill' }); if (k.chained) g.gainEnergy(1); } });
  Y('y_bedrock', { name: '반석', el: 'earth', type: 'power', cost: 2, rar: 'rare', art: '磐', costUp: 1,
    v: {}, text: '방어가 턴 시작에 사라지지 않습니다.', play(g) { g.selfApply('bedrock', 1); } });
  Y('y_mountain', { name: '태산', el: 'earth', type: 'skill', cost: 2, rar: 'rare', kw: ['exhaust'], art: '山', costUp: 1,
    v: {}, text: '방어를 2배로 만듭니다. 소멸.', play(g) { g.gainBlock(g.p, g.p.block, true); } });

  // ═══ 金 금 — 예리·균열·여러 번 베기 ═══
  Y('y_blade', { name: '칼날 부적', el: 'metal', type: 'atk', cost: 1, rar: 'common', target: 'enemy', art: '刃',
    v: { dmg: 9, n: 1 }, vu: { dmg: 12, n: 2 }, text: '피해 {D}.', chain: '먼저 균열 {n}.',
    play(g, c, t, k) { if (k.chained) g.apply(t, 'crack', g.v(c, 'n'), g.p); g.attack(t, g.v(c, 'dmg')); } });
  Y('y_chain_strike', { name: '쇠사슬', el: 'metal', type: 'atk', cost: 1, rar: 'common', target: 'enemy', art: '鎖',
    v: { dmg: 4, hits: 2 }, vu: { dmg: 5, hits: 2 }, text: '피해 {D}을 {hits}번.', chain: '1번 더.',
    play(g, c, t, k) { g.attack(t, g.v(c, 'dmg'), { hits: g.v(c, 'hits') + (k.chained ? 1 : 0) }); } });
  Y('y_cleave', { name: '쪼개기', el: 'metal', type: 'atk', cost: 2, rar: 'common', target: 'enemy', art: '裂',
    v: { dmg: 13, n: 2, cn: 1 }, vu: { dmg: 17, n: 2, cn: 2 }, text: '피해 {D}. 균열 {n}.', chain: '균열 +{cn}.',
    play(g, c, t, k) { g.attack(t, g.v(c, 'dmg')); g.apply(t, 'crack', g.v(c, 'n') + (k.chained ? g.v(c, 'cn') : 0), g.p); } });
  Y('y_iron_armor', { name: '쇠갑옷', el: 'metal', type: 'skill', cost: 1, rar: 'common', art: '甲',
    v: { blk: 7, edge: 3 }, vu: { blk: 10, edge: 4 }, text: '방어 {B}.', chain: '이번 턴 공격 피해 +{edge}.',
    play(g, c, t, k) { g.block(g.v(c, 'blk')); if (k.chained) g.selfApply('edge', g.v(c, 'edge')); } });
  Y('y_whetstone', { name: '숫돌', el: 'metal', type: 'skill', cost: 0, rar: 'common', art: '砥',
    v: { edge: 3, draw: 1 }, vu: { edge: 5, draw: 1 }, text: '이번 턴 공격 피해 +{edge}.', chain: '카드 {draw}장 뽑기.',
    play(g, c, t, k) { g.selfApply('edge', g.v(c, 'edge')); if (k.chained) g.draw(g.v(c, 'draw')); } });
  Y('y_execute', { name: '참수', el: 'metal', type: 'atk', cost: 2, rar: 'uncommon', target: 'enemy', art: '斬',
    v: { dmg: 12 }, vu: { dmg: 16 }, text: '피해 {D}. 대상의 체력이 절반 이하면 피해 2배.', chain: '절반이 아니어도 2배.',
    play(g, c, t, k) { const dbl = k.chained || t.hp * 2 <= t.maxHp; g.attack(t, g.v(c, 'dmg') * (dbl ? 2 : 1)); } });
  Y('y_sharpen', { name: '벼리기', el: 'metal', type: 'power', cost: 1, rar: 'uncommon', art: '鍛',
    v: { n: 2 }, vu: { n: 3 }, text: '예리 {n}.', play(g, c) { g.selfApply('sharp', g.v(c, 'n')); } });
  Y('y_blade_wind', { name: '칼바람', el: 'metal', type: 'atk', cost: 1, rar: 'uncommon', target: 'all', art: '風',
    v: { dmg: 5, n: 1 }, vu: { dmg: 7, n: 1 }, text: '모든 적에게 피해 {D}. 균열 {n}.', chain: '균열 +1.',
    play(g, c, t, k) { g.attackAll(g.v(c, 'dmg')); g.applyAll('crack', g.v(c, 'n') + (k.chained ? 1 : 0)); } });
  Y('y_thousand', { name: '천 개의 칼날', el: 'metal', type: 'atk', cost: 1, rar: 'uncommon', target: 'enemy', art: '千',
    v: { dmg: 4, per: 2 }, vu: { dmg: 6, per: 3 }, text: '피해 {D}. 이번 전투에서 쓴 금(金) 카드 1장당(이 카드 포함) 피해 +{per}.', chain: '피해 +{per} 더.',
    play(g, c, t, k) { g.attack(t, g.v(c, 'dmg') + g.v(c, 'per') * (g.cnt.metalCards + (k.chained ? 1 : 0))); } });
  Y('y_steel_will', { name: '금강', el: 'metal', type: 'power', cost: 2, rar: 'uncommon', art: '剛',
    v: { n: 2 }, vu: { n: 3 }, text: '공격받을 때 피해가 1회당 {n} 줄어듭니다.', play(g, c) { g.selfApply('p_steel', g.v(c, 'n')); } });
  S('p_steel', { name: '금강', icon: '剛', kind: 'power', desc: (n) => `공격받을 때 피해가 1회당 ${n} 줄어듭니다.`, modTaken(g, n, val) { return Math.max(0, val - n); } });
  Y('y_white_tiger', { name: '백호 강림', el: 'metal', type: 'atk', cost: 2, rar: 'rare', target: 'enemy', art: '虎',
    v: { dmg: 7, hits: 3, n: 2 }, vu: { dmg: 9, hits: 3, n: 2 }, text: '피해 {D}을 {hits}번.', chain: '먼저 균열 {n}.',
    play(g, c, t, k) { if (k.chained) g.apply(t, 'crack', g.v(c, 'n'), g.p); g.attack(t, g.v(c, 'dmg'), { hits: g.v(c, 'hits') }); } });
  Y('y_flash', { name: '일섬', el: 'metal', type: 'atk', cost: 3, rar: 'rare', target: 'enemy', art: '閃',
    v: { dmg: 28, e: 2 }, vu: { dmg: 36, e: 2 }, text: '피해 {D}.', chain: '기력 {e}을 돌려받습니다.',
    play(g, c, t, k) { g.attack(t, g.v(c, 'dmg')); if (k.chained) g.gainEnergy(g.v(c, 'e')); } });
  Y('y_forge', { name: '대장간', el: 'metal', type: 'power', cost: 3, rar: 'rare', art: '冶', costUp: 2,
    v: { n: 1 }, text: '턴이 시작될 때 예리 {n}.', play(g, c) { g.selfApply('p_forge', g.v(c, 'n')); } });
  S('p_forge', { name: '대장간', icon: '冶', kind: 'power', desc: (n) => `턴이 시작될 때 예리 ${n}.`, turnStart(g, n) { g.selfApply('sharp', n); } });

  // ═══ 水 수 — 흐름·냉기·보존 ═══
  Y('y_current', { name: '물살', el: 'water', type: 'atk', cost: 1, rar: 'common', target: 'enemy', art: '流',
    v: { dmg: 6, draw: 1 }, vu: { dmg: 8, draw: 1 }, text: '피해 {D}. 카드 {draw}장 뽑기.', chain: '1장 더.',
    play(g, c, t, k) { g.attack(t, g.v(c, 'dmg')); g.draw(g.v(c, 'draw') + (k.chained ? 1 : 0)); } });
  Y('y_mist', { name: '안개', el: 'water', type: 'skill', cost: 1, rar: 'common', art: '霧',
    v: { blk: 6, n: 1 }, vu: { blk: 9, n: 1 }, text: '방어 {B}.', chain: '모든 적에게 냉기 {n}.',
    play(g, c, t, k) { g.block(g.v(c, 'blk')); if (k.chained) g.applyAll('chill', g.v(c, 'n')); } });
  Y('y_ice_spear', { name: '얼음 창', el: 'water', type: 'atk', cost: 1, rar: 'common', target: 'enemy', art: '氷',
    v: { dmg: 7, n: 1 }, vu: { dmg: 9, n: 2 }, text: '피해 {D}. 냉기 {n}.', chain: '냉기 +1.',
    play(g, c, t, k) { g.attack(t, g.v(c, 'dmg')); g.apply(t, 'chill', g.v(c, 'n') + (k.chained ? 1 : 0), g.p); } });
  Y('y_still_water', { name: '고요한 물', el: 'water', type: 'skill', cost: 0, rar: 'common', art: '靜',
    v: { draw: 2 }, vu: { draw: 3 }, text: '카드 {draw}장 뽑고 1장 버리기.', chain: '버리지 않습니다.',
    play(g, c, t, k) { g.draw(g.v(c, 'draw')); if (!k.chained) g.choose({ title: '버릴 카드', from: 'hand', then: (p) => { for (const x of p) g.discardCard(x); } }); } });
  Y('y_ripple', { name: '물결', el: 'water', type: 'skill', cost: 1, rar: 'common', kw: ['retain'], art: '波',
    v: { blk: 7, cblk: 3 }, vu: { blk: 10, cblk: 4 }, text: '보존. 방어 {B}.', chain: '방어 +{cblk}.',
    play(g, c, t, k) { g.block(g.v(c, 'blk') + (k.chained ? g.v(c, 'cblk') : 0)); } });
  Y('y_flow', { name: '흐름', el: 'water', type: 'skill', cost: 1, rar: 'uncommon', art: '轉', costUp: 0,
    v: {}, text: '손의 카드를 모두 버리고 버린 만큼 뽑습니다.', chain: '기력 1.',
    play(g, c, t, k) { const hand = g.pile.hand.slice(); for (const x of hand) g.discardCard(x); g.draw(hand.length); if (k.chained) g.gainEnergy(1); } });
  Y('y_frost', { name: '서리', el: 'water', type: 'skill', cost: 1, rar: 'uncommon', art: '霜',
    v: { n: 2, blk: 4 }, vu: { n: 3, blk: 6 }, text: '모든 적에게 냉기 {n}.', chain: '방어 {B}.',
    play(g, c, t, k) { g.applyAll('chill', g.v(c, 'n')); if (k.chained) g.block(g.v(c, 'blk')); } });
  Y('y_tide', { name: '밀물', el: 'water', type: 'skill', cost: 2, rar: 'uncommon', art: '潮',
    v: { blk: 11, draw: 2 }, vu: { blk: 15, draw: 2 }, text: '방어 {B}. 다음 턴 카드 {draw}장 더.', chain: '기력 1.',
    play(g, c, t, k) { g.block(g.v(c, 'blk')); g.next.draw += g.v(c, 'draw'); if (k.chained) g.gainEnergy(1); } });
  Y('y_deep_pond', { name: '깊은 연못', el: 'water', type: 'power', cost: 1, rar: 'uncommon', art: '淵',
    v: { n: 1 }, vu: { n: 2 }, text: '턴이 끝날 때 손의 카드 {n}장을 버리지 않고 남깁니다(비용 높은 순).',
    play(g, c) { g.selfApply('p_pond', g.v(c, 'n')); } });
  S('p_pond', { name: '깊은 연못', icon: '淵', kind: 'power', desc: (n) => `턴이 끝날 때 손의 카드 ${n}장을 남깁니다.`, retainCount: (g, n) => n });
  Y('y_whirlpool', { name: '소용돌이', el: 'water', type: 'atk', cost: 2, rar: 'uncommon', target: 'all', art: '渦',
    v: { dmg: 8, n: 1 }, vu: { dmg: 11, n: 1 }, text: '모든 적에게 피해 {D}. 냉기 {n}.', chain: '카드 1장 뽑기.',
    play(g, c, t, k) { g.attackAll(g.v(c, 'dmg')); g.applyAll('chill', g.v(c, 'n')); if (k.chained) g.draw(1); } });
  Y('y_black_tortoise', { name: '현무 강림', el: 'water', type: 'skill', cost: 2, rar: 'rare', art: '玄',
    v: { blk: 14, n: 2, draw: 2 }, vu: { blk: 18, n: 2, draw: 2 }, text: '방어 {B}. 모든 적에게 냉기 {n}.', chain: '카드 {draw}장 뽑기.',
    play(g, c, t, k) { g.block(g.v(c, 'blk')); g.applyAll('chill', g.v(c, 'n')); if (k.chained) g.draw(g.v(c, 'draw')); } });
  Y('y_tsunami', { name: '해일', el: 'water', type: 'atk', cost: 2, rar: 'rare', target: 'all', art: '濤',
    v: { per: 4 }, vu: { per: 5 }, text: '모든 적에게 손패 1장당 피해 {per}.', chain: '먼저 카드 2장 뽑기.',
    play(g, c, t, k) { if (k.chained) g.draw(2); g.attackAll(g.v(c, 'per') * g.pile.hand.length); } });
  Y('y_mirror_water', { name: '물거울', el: 'water', type: 'skill', cost: 1, rar: 'rare', kw: ['exhaust'], art: '鏡', costUp: 0,
    v: {}, text: '손의 카드 1장을 골라 복사본을 손에 넣습니다. 소멸.',
    play(g) { g.choose({ title: '복사할 카드', from: 'hand', then: (p) => { for (const x of p) { const cp = g.addCard(x.id, 'hand', x.up); cp.bonus = Object.assign({}, x.bonus); } } }); } });
  Y('y_freeze', { name: '빙결', el: 'water', type: 'skill', cost: 2, rar: 'rare', target: 'enemy', kw: ['exhaust'], art: '凍', costUp: 1,
    v: {}, text: '적을 기절시킵니다(다음 행동을 건너뜀). 소멸.', play(g, c, t) { g.apply(t, 'stun', 1, g.p); } });

  // ═══ 無 무 — 연계 보조 ═══
  Y('y_harmony', { name: '상생의 굿', el: 'none', type: 'skill', cost: 0, rar: 'uncommon', art: '巫',
    v: { draw: 1 }, vu: { draw: 2 }, text: '다음에 쓰는 원소 카드는 반드시 연계로 이어집니다. 카드 {draw}장 뽑기.',
    play(g, c) { g.chain.free += 1; g.fx.push({ t: 'msg', text: '다음 원소 카드는 반드시 연계!' }); g.draw(g.v(c, 'draw')); } });
  Y('y_focus', { name: '정신 집중', el: 'none', type: 'skill', cost: 1, rar: 'common', art: '念',
    v: { draw: 2 }, vu: { draw: 3 }, text: '카드 {draw}장 뽑기.', play(g, c) { g.draw(g.v(c, 'draw')); } });
  Y('y_possession', { name: '신내림', el: 'none', type: 'power', cost: 3, rar: 'rare', art: '神', costUp: 2,
    v: {}, text: '연계가 턴이 끝나도 끊기지 않고 이어집니다.', play(g) { g.persistChain = true; g.selfApply('p_possession', 1); } });
  S('p_possession', { name: '신내림', icon: '神', kind: 'power', flag: true, desc: () => '연계가 턴이 끝나도 이어집니다.' });
  Y('y_five_formation', { name: '오방진', el: 'none', type: 'power', cost: 2, rar: 'rare', art: '陣',
    v: { n: 10 }, vu: { n: 16 }, text: '오행순환의 피해가 {n} 늘어나고, 순환할 때마다 방어 {n}을 얻습니다.',
    play(g, c) { g.selfApply('p_formation', g.v(c, 'n')); } });
  S('p_formation', { name: '오방진', icon: '陣', kind: 'power', desc: (n) => `오행순환 피해 +${n}, 순환할 때 방어 ${n}.`, cycleDmg: (g, n) => n, cycle(g, n) { g.block(n); } });
  Y('y_exorcism', { name: '액막이', el: 'none', type: 'skill', cost: 1, rar: 'uncommon', art: '厄',
    v: { blk: 5 }, vu: { blk: 8 }, text: '방어 {B}. 손의 상태·저주 카드를 모두 소멸시키고 그 수만큼 뽑습니다.',
    play(g, c) { g.block(g.v(c, 'blk')); const bad = g.pile.hand.filter((x) => ['status', 'curse'].includes(JG.cdef(x).type)); for (const x of bad) g.exhaustCard(x); if (bad.length) g.draw(bad.length); } });
  Y('y_bundle', { name: '부적 묶음', el: 'none', type: 'skill', cost: 1, rar: 'common', kw: ['exhaust'], art: '符', costUp: 0,
    v: { n: 2 }, text: '무작위 원소 카드 {n}장을 손에 넣습니다. 이번 턴 비용 0. 소멸.',
    play(g, c) {
      const pool = JG.cardPool('yeonhwa', (d) => d.el !== 'none' && d.el !== 'wild' && d.rar !== 'basic' && d.rar !== 'rare');
      for (let i = 0; i < g.v(c, 'n'); i++) { const d = g.rng.pick(pool); if (d) { const x = g.addCard(d.id, 'hand'); x.costTurn = 0; } }
    } });
  Y('y_samsara', { name: '윤회', el: 'none', type: 'skill', cost: 1, rar: 'rare', art: '輪', costUp: 0,
    v: {}, text: '버린 카드 더미에서 카드 1장을 골라 손으로 가져옵니다. 이번 턴 비용 0.',
    play(g) { g.choose({ title: '가져올 카드', from: 'discard', then: (p) => { for (const x of p) { g.pile.discard.splice(g.pile.discard.indexOf(x), 1); if (g.pile.hand.length < 10) { g.pile.hand.push(x); x.costTurn = 0; g.fx.push({ t: 'toHand', uids: [x.uid] }); } else g.pile.discard.push(x); } } }); } });
})();
