'use strict';
// 신물(유물). 훅 함수의 첫 두 인자는 (g, r): g=전투, r=신물 상태 {id, n(누적), c(전투 내 누적), cu(전투 내 사용), tu(턴 내 사용)}
// 진행(전투 밖) 효과: pickup(run, r), runMod: { 키: 값 } (JG.R.mod 로 합산)
(function () {
  const R = JG.defRelic;

  // ── 시작 신물 ──
  R('r_bell', { name: '오색 방울', icon: '🔔', rar: 'starter', char: 'yeonhwa',
    desc: '매 턴 처음으로 연계가 이어질 때 카드 1장을 뽑습니다.',
    turnStartPre(g, r) { r.tu = false; },
    chain(g, r) { if (!r.tu) { r.tu = true; g.relicFlash(r.id); g.draw(1); } } });
  R('r_hwarang_sword', { name: '화랑의 검', icon: '⚔️', rar: 'starter', char: 'doyun',
    desc: '공격 카드를 쓸 때마다 기세 1. 마무리 기술을 쓰면 카드 1장을 뽑습니다. 전투에서 이기면 남은 기세만큼 체력을 회복합니다(최대 8).',
    cardPlayed(g, r, c) { if (JG.cdef(c).type === 'atk') g.selfApply('fury', 1); if (JG.cdef(c).finisher) { g.relicFlash(r.id); g.draw(1); } },
    combatEnd(g, r, won) { const f = Math.min(8, g.p.st.fury || 0); if (won && f) { g.p.hp = Math.min(g.p.maxHp, g.p.hp + f); } } });
  R('r_gamtu', { name: '도깨비 감투', icon: '🎩', rar: 'starter', char: 'dudu',
    desc: '전투가 시작될 때 도깨비불 2를 얻습니다. 엽전을 주울 때 10% 더 얻습니다.',
    combatStart(g, r) { g.relicFlash(r.id); g.addWisp(2); }, runMod: { goldMul: 0.1 } });

  // ── 일반 ──
  R('r_straw_shoes', { name: '짚신', icon: '🩴', rar: 'common', desc: '전투 첫 턴에 카드를 2장 더 뽑습니다.', firstDrawBonus: () => 2 });
  R('r_fan', { name: '부채', icon: '🪭', rar: 'common', desc: '전투 첫 턴에 방어 9를 얻습니다.',
    turnStartPre(g, r) { if (g.turn === 1) { g.relicFlash(r.id); g.block(9); } } });
  R('r_ginseng', { name: '인삼', icon: '🌱', rar: 'common', desc: '전투에서 이기면 체력 5를 회복합니다.',
    combatEnd(g, r, won) { if (won) { g.p.hp = Math.min(g.p.maxHp, g.p.hp + 5); g.relicFlash(r.id); } } });
  R('r_bronze_mirror', { name: '청동 거울', icon: '🪞', rar: 'common', desc: '전투 첫 턴에 공격 피해가 3 늘어납니다.',
    turnStart(g, r) { if (g.turn === 1) { g.relicFlash(r.id); g.selfApply('edge', 3); } } });
  R('r_red_beans', { name: '팥 주머니', icon: '🫘', rar: 'common', desc: '전투가 시작될 때 모든 적에게 냉기 1.',
    combatStart(g, r) { g.relicFlash(r.id); g.applyAll('chill', 1); } });
  R('r_peach_branch', { name: '복숭아 가지', icon: '🌸', rar: 'common', desc: '전투가 시작될 때 모든 적에게 피해 4. (귀신은 복숭아 나무를 싫어한다)',
    combatStart(g, r) { g.relicFlash(r.id); for (const e of g.alive()) g.damage(e, 4, { kind: 'relic' }); } });
  R('r_charcoal', { name: '참숯', icon: '🪨', rar: 'common', desc: '화상을 줄 때마다 1 더 줍니다.',
    modApply(g, r, val, t, id) { return id === 'burn' ? val + 1 : val; } });
  R('r_bamboo_flute', { name: '대나무 피리', icon: '🎋', rar: 'common', desc: '카드를 3장 쓸 때마다 방어 4를 얻습니다.',
    cardPlayed(g, r) { r.n = (r.n || 0) + 1; if (r.n % 3 === 0) { g.relicFlash(r.id); g.block(4); } } });
  R('r_lucky_pouch', { name: '복주머니', icon: '🧧', rar: 'common', desc: '전투에서 이기면 엽전 8을 더 얻습니다.',
    combatEnd(g, r, won) { if (won) { g.run.gold += 8; g.relicFlash(r.id); } } });
  R('r_rope', { name: '동아줄', icon: '🪢', rar: 'common', desc: '전투마다 처음으로 체력이 절반 이하로 떨어지면 방어 12를 얻습니다.',
    hpLost(g, r) { if (!r.cu && g.p.hp > 0 && g.p.hp * 2 <= g.p.maxHp) { r.cu = true; g.relicFlash(r.id); g.block(12); } } });
  R('r_gourd', { name: '호리병', icon: '🍶', rar: 'common', desc: '약을 하나 더 지닐 수 있습니다.', pickup(run) { run.potions.push(null); } });
  R('r_comb', { name: '참빗', icon: '🪮', rar: 'common', desc: '연계가 3단계에 이를 때마다 방어 5를 얻습니다.',
    chain(g, r, n) { if (n === 3 || n === 8) { g.relicFlash(r.id); g.block(5); } } });
  R('r_inkstone', { name: '벼루', icon: '🖋️', rar: 'common', desc: '오행순환을 이룰 때마다 예리 1을 얻습니다.',
    cycle(g, r) { g.relicFlash(r.id); g.selfApply('sharp', 1); } });
  R('r_acorn', { name: '도토리', icon: '🌰', rar: 'common', desc: '주막에서 쉴 때 체력을 15 더 회복합니다.', runMod: { restHeal: 15 } });
  R('r_tiger_tooth', { name: '호랑이 이빨', icon: '🦷', rar: 'common', desc: '전투가 시작될 때 예리 1을 얻습니다.',
    combatStart(g, r) { g.selfApply('sharp', 1); } });
  R('r_turtle_shell', { name: '거북 등껍질', icon: '🐢', rar: 'common', desc: '전투가 시작될 때 견고 1을 얻습니다.',
    combatStart(g, r) { g.selfApply('sturdy', 1); } });
  R('r_onggi', { name: '옹기', icon: '🏺', rar: 'common', desc: '턴이 끝날 때 남은 기력 1당 방어 3을 얻습니다.',
    turnEnd(g, r) { if (g.p.energy > 0) { g.relicFlash(r.id); g.block(3 * g.p.energy); } } });

  // ── 고급 ──
  R('r_obangnang', { name: '오방낭', icon: '👛', rar: 'uncommon', desc: '오행순환을 이룰 때 카드를 2장 더 뽑습니다.', cycleDraw: () => 2 });
  R('r_haetae', { name: '해태상', icon: '🦁', rar: 'uncommon', desc: '전투가 시작될 때 가시 3을 얻습니다.',
    combatStart(g, r) { g.relicFlash(r.id); g.selfApply('thorns', 3); } });
  R('r_lantern', { name: '청사초롱', icon: '🏮', rar: 'uncommon', desc: '강적을 쓰러뜨리면 엽전 25와 체력 6을 얻습니다.',
    combatEnd(g, r, won) { if (won && g.cfg.kind === 'elite') { g.run.gold += 25; g.p.hp = Math.min(g.p.maxHp, g.p.hp + 6); g.relicFlash(r.id); } } });
  R('r_baekja', { name: '백자 항아리', icon: '⚱️', rar: 'uncommon', desc: '카드 보상에서 고를 수 있는 카드가 1장 늘어납니다.', runMod: { cardChoices: 1 } });
  R('r_seven_star', { name: '칠성검', icon: '🗡️', rar: 'uncommon', desc: '전투에서 카드를 7장 쓸 때마다 모든 적에게 피해 7.',
    cardPlayed(g, r) { r.c = (r.c || 0) + 1; if (r.c % 7 === 0) { g.relicFlash(r.id); for (const e of g.alive()) g.damage(e, 7, { kind: 'relic' }); } } });
  R('r_shaman_knife', { name: '신칼', icon: '🔪', rar: 'uncommon', desc: '전투에서 공격 카드를 3장 쓸 때마다 예리 1을 얻습니다.',
    cardPlayed(g, r, c) { if (JG.cdef(c).type !== 'atk') return; r.c = (r.c || 0) + 1; if (r.c % 3 === 0) { g.relicFlash(r.id); g.selfApply('sharp', 1); } } });
  R('r_brass_bowl', { name: '놋그릇', icon: '🥣', rar: 'uncommon', desc: '체력을 회복할 때마다 2 더 회복합니다.', modHeal(g, r, n) { return n > 0 ? n + 2 : n; } });
  R('r_dragon_scale', { name: '용의 비늘', icon: '🐉', rar: 'uncommon', desc: '전투가 시작될 때 방어 10을 얻습니다.',
    turnStartPre(g, r) { if (g.turn === 1) { g.relicFlash(r.id); g.block(10); } } });
  R('r_wind_chime', { name: '풍경', icon: '🎐', rar: 'uncommon', desc: '카드가 소멸될 때마다 방어 3을 얻습니다.',
    exhausted(g, r) { g.relicFlash(r.id); g.block(3); } });
  R('r_hahoe_mask', { name: '하회탈', icon: '🎭', rar: 'uncommon', desc: '적을 쓰러뜨릴 때마다 기력 1을 얻고 카드 1장을 뽑습니다.',
    enemyDied(g, r) { if (g.phase === 'player' && g.alive().length) { g.relicFlash(r.id); g.gainEnergy(1); g.draw(1); } } });
  R('r_frost_pine', { name: '설송 가지', icon: '🌲', rar: 'uncommon', desc: '냉기를 줄 때마다 1 더 줍니다.', modApply(g, r, val, t, id) { return id === 'chill' ? val + 1 : val; } });
  R('r_ox_bell', { name: '워낭', icon: '🐂', rar: 'uncommon', desc: '3턴마다 기력 1을 더 얻습니다.',
    turnStartPre(g, r) { if (g.turn % 3 === 0) { g.relicFlash(r.id); g.gainEnergy(1); } } });
  R('r_needle', { name: '바늘쌈지', icon: '🪡', rar: 'uncommon', desc: '균열에 걸린 적이 받는 공격 피해가 50%가 아닌 75% 늘어납니다.', crackBonus: () => 0.25 });
  R('r_willow', { name: '버들가지', icon: '🌿', rar: 'uncommon', desc: '전투가 시작될 때 재생 4를 얻습니다.',
    combatStart(g, r) { g.selfApply('regen', 4); } });

  // ── 희귀 ──
  R('r_dragon_pearl', { name: '여의주', icon: '🔮', rar: 'rare', desc: '연계 단계가 오를 때마다 이번 턴 공격 피해가 1 늘어납니다.',
    chain(g, r) { g.selfApply('edge', 1); } });
  R('r_immortal_herb', { name: '불로초', icon: '🍄', rar: 'rare', desc: '한 번, 쓰러질 때 최대 체력의 50%로 되살아납니다. (쓰면 시든다)',
    preventDeath(g, r) { if (r.used) return false; r.used = true; g.p.hp = Math.floor(g.p.maxHp / 2); g.relicFlash(r.id); return true; } });
  R('r_cheonbuin', { name: '천부인', icon: '🔱', rar: 'rare', desc: '전투 첫 턴에 오색 부적(비용 0)을 손에 넣습니다.',
    turnStart(g, r) { if (g.turn === 1) { g.relicFlash(r.id); g.addCard('y_wild', 'hand', true); } } });
  R('r_samjogo', { name: '삼족오 깃털', icon: '🪶', rar: 'rare', desc: '오행순환의 기력 보상이 1 늘고, 순환 피해가 10 늘어납니다.', cycleEnergy: () => 1, cycleDmg: () => 10 });
  R('r_mugunghwa', { name: '무궁화', icon: '🌺', rar: 'rare', desc: '한 번에 잃는 체력이 최대 18로 줄어듭니다.', modHpLoss(g, r, n) { return Math.min(n, 18); } });
  R('r_magpie_feather', { name: '까치 깃털', icon: '🐦', rar: 'rare', desc: '카드 보상에 희귀 카드가 훨씬 잘 나옵니다.', runMod: { rareBonus: 8 } });
  R('r_jade_ring', { name: '옥가락지', icon: '💍', rar: 'rare', desc: '턴이 끝날 때 방어가 0이면 다음 턴에 방어 8을 얻습니다.',
    turnEnd(g, r) { if (g.p.block === 0) { g.next.block += 8; } } });
  R('r_thunder_drum', { name: '천둥북', icon: '🪘', rar: 'rare', desc: '약점(상극) 공격의 피해가 1.5배가 아닌 1.75배가 됩니다.', weakBonus: () => 0.25 });

  // ── 보스 ──
  R('r_dok_club', { name: '도깨비 방망이', icon: '🪵', rar: 'boss', desc: '매 턴 기력 +1. 장터 가격이 40% 비싸집니다.', runMod: { energy: 1, priceMul: 0.4 } });
  R('r_saja_gat', { name: '저승사자의 갓', icon: '👒', rar: 'boss', desc: '매 턴 기력 +1. 턴이 시작될 때 체력 1을 잃습니다.', runMod: { energy: 1 },
    turnStartPre(g, r) { g.loseHp(1); } });
  R('r_shaman_drum', { name: '무당의 장구', icon: '🥁', rar: 'boss', desc: '매 턴 기력 +1. 전투가 시작될 때 뽑을 더미에 잡념 3장이 섞입니다.', runMod: { energy: 1 },
    combatStart(g, r) { for (let i = 0; i < 3; i++) g.addCard('s_daze', 'draw'); } });
  R('r_sun_moon', { name: '해와 달', icon: '☯️', rar: 'boss', desc: '매 턴 기력 +1. 주막에서 쉴 수 없습니다.', runMod: { energy: 1, noRest: 1 } });
  R('r_five_bead', { name: '오색 구슬', icon: '🔴', rar: 'boss', desc: '매 턴 기력 +1. 카드 보상에서 고를 수 있는 카드가 1장 줄어듭니다.', runMod: { energy: 1, cardChoices: -1 } });
  R('r_heavenly_peach', { name: '천도복숭아', icon: '🍑', rar: 'boss', desc: '최대 체력 +25, 체력을 모두 회복합니다.', pickup(run) { run.maxHp += 25; run.hp = run.maxHp; } });
  R('r_millstone', { name: '맷돌', icon: '⚙️', rar: 'boss', desc: '덱의 기본 카드를 모두 강화합니다. 이후 얻는 기본 카드도 강화됩니다.',
    pickup(run) { for (const c of run.deck) if (JG.D.cards[c.id].rar === 'basic') c.up = 1; } });
  R('r_royal_seal', { name: '옥새', icon: '📜', rar: 'boss', desc: '턴이 시작될 때 카드를 1장 더 뽑습니다.', drawBonus: () => 1 });
  R('r_karma_shard', { name: '업경 조각', icon: '💠', rar: 'boss', desc: '매 턴 기력 +1. 전투가 시작될 때 균열 2를 얻습니다.', runMod: { energy: 1 },
    combatStart(g, r) { g.apply(g.p, 'crack', 2); } });
  R('r_dragon_crown', { name: '용왕의 관', icon: '👑', rar: 'boss', desc: '오행순환을 이룰 때마다 체력 4 회복, 모든 적에게 균열 1.',
    cycle(g, r) { g.relicFlash(r.id); g.heal(g.p, 4); g.applyAll('crack', 1); } });

  // ── 장터 ──
  R('r_abacus', { name: '주판', icon: '🧮', rar: 'shop', desc: '장터 가격이 20% 싸집니다.', runMod: { priceMul: -0.2 } });
  R('r_brush', { name: '세필 붓', icon: '🖌️', rar: 'shop', desc: '카드 보상과 장터에서 얻는 카드가 강화될 확률이 크게 오릅니다.', runMod: { upChance: 0.35 } });
  R('r_chest', { name: '반닫이', icon: '🗄️', rar: 'shop', desc: '약을 2개 더 지닐 수 있습니다.', pickup(run) { run.potions.push(null, null); } });
  R('r_scales', { name: '저울', icon: '⚖️', rar: 'shop', desc: '카드 없애기 비용이 50으로 고정됩니다.', runMod: { fixedRemove: 50 } });
  R('r_gourd_big', { name: '큰 호리병', icon: '🫙', rar: 'shop', desc: '약의 효과가 2배가 됩니다.' });

  // ── 사건 ──
  R('r_snail_jar', { name: '우렁이 항아리', icon: '🐌', rar: 'event', desc: '주막에서 쉴 때 체력을 10 더 회복하고, 전투에서 이기면 체력 2를 회복합니다.', runMod: { restHeal: 10 },
    combatEnd(g, r, won) { if (won) g.p.hp = Math.min(g.p.maxHp, g.p.hp + 2); } });
  R('r_jangseung', { name: '장승의 축복', icon: '🗿', rar: 'event', desc: '전투가 시작될 때 예리 1, 견고 1을 얻습니다.',
    combatStart(g, r) { g.selfApply('sharp', 1); g.selfApply('sturdy', 1); } });
  R('r_fox_bead', { name: '여우구슬', icon: '🟣', rar: 'event', desc: '카드 보상에서 고를 수 있는 카드가 1장 늘어납니다. 전투가 시작될 때 체력 1을 잃습니다.', runMod: { cardChoices: 1 },
    combatStart(g, r) { g.loseHp(1); } });
  R('r_magpie_bridge', { name: '오작교 깃털', icon: '🌉', rar: 'event', desc: '전투에서 이기면 체력 4를 회복합니다.',
    combatEnd(g, r, won) { if (won) g.p.hp = Math.min(g.p.maxHp, g.p.hp + 4); } });
  R('r_bari_flower', { name: '생명꽃', icon: '🌼', rar: 'event', desc: '한 번, 쓰러질 때 최대 체력의 30%로 되살아납니다.',
    preventDeath(g, r) { if (r.used) return false; r.used = true; g.p.hp = Math.floor(g.p.maxHp * 0.3); g.relicFlash(r.id); return true; } });
  R('r_tiger_hide', { name: '호랑이 가죽', icon: '🐯', rar: 'event', desc: '전투가 시작될 때 예리 2를 얻습니다.', combatStart(g, r) { g.selfApply('sharp', 2); } });
  R('r_dok_pouch', { name: '도깨비 주머니', icon: '💰', rar: 'event', desc: '전투에서 이기면 엽전 5~15를 더 얻습니다.',
    combatEnd(g, r, won) { if (won) g.run.gold += g.rng.int(5, 15); } });
  R('r_golden_axe', { name: '금도끼', icon: '🪓', rar: 'event', desc: '정직함의 증표. 금(金) 공격 카드의 피해가 2 늘어납니다.',
    modAtk(g, r, dmg, tgt, o) { return o.el === 'metal' ? dmg + 2 : dmg; } });
})();
