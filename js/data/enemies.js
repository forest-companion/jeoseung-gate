'use strict';
// 적 정의. it(의도 종류): atk 공격 · def 방어 · buff 강화 · debuff 약화 · atkdef · atkbuff · atkdebuff · defbuff · magic 특수 · summon 소환 · escape 도주 · charge 기 모으기
// ai(g,e) 는 다음 행동 키를 돌려준다. e.turn = 지금까지 행동한 횟수, e.hist = 실제로 한 행동 기록.
(function () {
  const E = JG.defEnemy;
  // 가중치로 고르되 같은 행동을 maxRep번 넘게 연달아 하지 않음
  function wpick(g, e, w, maxRep) {
    maxRep = maxRep || 2;
    const last = e.hist.slice(-maxRep);
    let keys = Object.keys(w).filter((k) => w[k] > 0 && !(last.length === maxRep && last.every((x) => x === k)));
    if (!keys.length) keys = Object.keys(w);
    return g.rng.weighted(keys, (k) => w[k]);
  }
  const cyc = (e, arr) => arr[(e.turn + (e.data.off || 0)) % arr.length];
  const lastIs = (e, k) => e.hist[e.hist.length - 1] === k;
  JG.aiUtil = { wpick, cyc };

  // ═════════════ 1막: 산골 마을 ═════════════
  E('wisp', { name: '도깨비불', el: 'fire', hp: [14, 18], type: 'normal', act: 1, img: 'en_wisp',
    moves: {
      spark: { name: '불티 날리기', it: 'atkdebuff', dmg: 3, act(g, e, m) { g.moveAttack(e, m); g.apply(g.p, 'burn', 2, e); } },
      lick: { name: '혀 날름', it: 'atk', dmg: 6 },
      flare: { name: '일렁임', it: 'defbuff', act(g, e) { g.gainBlock(e, 5); g.apply(e, 'sharp', 1, e); } },
    },
    ai(g, e) { if (e.turn === 0) return g.rng.chance(0.5) ? 'spark' : 'lick'; return wpick(g, e, { spark: 35, lick: 40, flare: lastIs(e, 'flare') ? 0 : 25 }); } });

  E('imp', { name: '꼬마 도깨비', el: 'wood', hp: [28, 32], type: 'normal', act: 1, img: 'en_imp',
    moves: {
      club: { name: '방망이질', it: 'atk', dmg: 8 },
      mischief: { name: '심술', it: 'debuff', act(g, e) { g.addCard('s_daze', 'discard'); g.addCard('s_daze', 'discard'); g.gainBlock(e, 4); } },
      wrestle: { name: '씨름', it: 'atkbuff', dmg: 5, act(g, e, m) { g.moveAttack(e, m); g.apply(e, 'sharp', 1, e); } },
    },
    ai(g, e) { if (e.turn === 0) return 'club'; return wpick(g, e, { club: 40, wrestle: 32, mischief: e.hist.slice(-2).includes('mischief') ? 0 : 28 }); } });

  E('boar', { name: '멧돼지 요괴', el: 'earth', hp: [42, 46], type: 'normal', act: 1, img: 'en_boar',
    init(g, e) { e.data.off = g.rng.int(0, 1); },
    moves: {
      snort: { name: '콧김', it: 'defbuff', act(g, e) { g.gainBlock(e, 7); g.apply(e, 'sharp', 2, e); } },
      charge: { name: '들이받기', it: 'atk', dmg: 13 },
      stomp: { name: '짓밟기', it: 'atkdebuff', dmg: 7, act(g, e, m) { g.moveAttack(e, m); g.apply(g.p, 'crack', 1, e); } },
    },
    ai(g, e) { return cyc(e, ['snort', 'charge', 'stomp']); } });

  E('snake', { name: '구렁이', el: 'wood', hp: [30, 34], type: 'normal', act: 1, img: 'en_snake',
    moves: {
      squeeze: { name: '조이기', it: 'atkdebuff', dmg: 6, act(g, e, m) { g.moveAttack(e, m); g.apply(g.p, 'chill', 1, e); } },
      coil: { name: '똬리 틀기', it: 'defbuff', act(g, e) { g.gainBlock(e, 8); g.apply(e, 'sharp', 1, e); } },
      bite: { name: '물기', it: 'atk', dmg: 10 },
    },
    ai(g, e) { if (e.turn === 0) return g.rng.chance(0.5) ? 'bite' : 'squeeze'; return wpick(g, e, { squeeze: 35, bite: 40, coil: lastIs(e, 'coil') ? 0 : 25 }); } });

  E('eggghost', { name: '달걀귀신', el: 'metal', hp: [26, 30], type: 'normal', act: 1, img: 'en_eggghost',
    desc: '얼굴 없는 귀신. 흐려지면 공격이 거의 통하지 않으니 화상으로 태우세요.',
    moves: {
      dread: { name: '섬뜩함', it: 'debuff', act(g) { g.apply(g.p, 'crack', 2); } },
      wail: { name: '얼굴 없는 비명', it: 'atk', dmg: 9 },
      fade: { name: '흐려지기', it: 'buff', act(g, e) { g.apply(e, 'phantom', 2, e); } },
    },
    ai(g, e) { if (e.turn === 0) return 'dread'; return wpick(g, e, { wail: 55, dread: lastIs(e, 'dread') ? 0 : 20, fade: e.hist.slice(-2).includes('fade') ? 0 : 25 }); } });

  E('waterghost', { name: '물귀신', el: 'water', hp: [32, 36], type: 'normal', act: 1, img: 'en_waterghost',
    init(g, e) { e.data.off = g.rng.int(0, 2); },
    moves: {
      drag: { name: '끌어당기기', it: 'atkdebuff', dmg: 7, act(g, e, m) { g.moveAttack(e, m); g.apply(g.p, 'chill', 1, e); } },
      drown: { name: '물속으로', it: 'atk', dmg: 12 },
      splash: { name: '물보라', it: 'defbuff', act(g, e) { g.gainBlock(e, 9); g.apply(e, 'regen', 3, e); } },
    },
    ai(g, e) { return cyc(e, ['drag', 'drown', 'splash']); } });

  E('rat', { name: '손톱 먹은 쥐', el: 'water', hp: [16, 20], type: 'normal', act: 1, img: 'en_rat',
    desc: '사람의 손톱을 먹고 그 사람 흉내를 내는 쥐.',
    moves: {
      gnaw: { name: '갉아먹기', it: 'atk', dmg: 3, hits: 2 },
      mimic: { name: '흉내내기', it: 'def', act(g, e) { g.gainBlock(e, Math.max(4, Math.min(10, g.p.block))); } },
      squeak: { name: '찍찍', it: 'buff', act(g, e) { for (const a of g.alive()) g.apply(a, 'sharp', 1, e); } },
    },
    ai(g, e) { return wpick(g, e, { gnaw: 50, mimic: 25, squeak: e.hist.includes('squeak') ? 8 : 25 }); } });

  E('jangsan', { name: '장산범', el: 'metal', hp: [82, 88], type: 'elite', act: 1, img: 'en_jangsan',
    desc: '사람 목소리를 흉내 내 홀리는 하얀 짐승. 흉내 낸 목소리는 잡념이 되어 덱을 어지럽힙니다.',
    moves: {
      voice: { name: '목소리 흉내', it: 'buffdebuff', act(g, e) { for (let i = 0; i < 3; i++) g.addCard('s_daze', 'draw'); g.apply(e, 'sharp', 2, e); } },
      claw: { name: '할퀴기', it: 'atk', dmg: 6, hits: 3 },
      pounce: { name: '덮치기', it: 'atk', dmg: 17 },
    },
    ai(g, e) { if (e.turn === 0) return 'voice'; if (e.turn % 4 === 0) return 'voice'; return lastIs(e, 'claw') ? (g.rng.chance(0.7) ? 'pounce' : 'claw') : 'claw'; } });

  E('dueok', { name: '두억시니', el: 'earth', hp: [90, 96], type: 'elite', act: 1, img: 'en_dueok',
    desc: '흐트러짐을 노리는 거인. 연계가 끊길 때마다 예리 2를 얻습니다.',
    onPlayerCard(g, e, c, k) { if (k.affects && !k.chained && k.prevN >= 1) { g.apply(e, 'sharp', 2, e); g.fx.push({ t: 'msg', text: '두억시니가 흐트러짐을 노린다! (예리 +2)' }); } },
    moves: {
      roar: { name: '포효', it: 'defbuff', act(g, e) { g.gainBlock(e, 10); g.apply(e, 'sharp', 2, e); } },
      headbutt: { name: '머리 박치기', it: 'atk', dmg: 15 },
      smash: { name: '내려찍기', it: 'atkdebuff', dmg: 9, act(g, e, m) { g.moveAttack(e, m); g.apply(g.p, 'crack', 1, e); } },
    },
    ai(g, e) { if (e.turn === 0) return 'roar'; return wpick(g, e, { headbutt: 50, smash: 40, roar: e.hist.slice(-3).includes('roar') ? 0 : 15 }); } });

  E('bulyeou', { name: '불여우', el: 'fire', hp: [68, 74], type: 'elite', act: 1, img: 'en_bulyeou',
    desc: '도깨비불을 부리는 여우. 홀리기에 걸리면 다음 턴 연계가 이어지지 않습니다.',
    moves: {
      foxfire: { name: '여우불', it: 'atkdebuff', dmg: 5, hits: 2, act(g, e, m) { g.moveAttack(e, m); g.apply(g.p, 'burn', 2, e); } },
      charm: { name: '홀리기', it: 'debuff', act(g, e) { g.addCard('s_charm', 'hand'); g.gainBlock(e, 8); } },
      bite: { name: '물어뜯기', it: 'atk', dmg: 12 },
      call: { name: '도깨비불 부르기', it: 'summon', act(g, e) { g.spawn('wisp', { minion: true, at: 0 }); } },
    },
    ai(g, e) {
      if (e.turn === 0) return 'foxfire';
      const wisps = g.alive().filter((a) => a.id === 'wisp').length;
      if (wisps < 2 && !lastIs(e, 'call') && e.turn % 3 === 2) return 'call';
      return wpick(g, e, { foxfire: 40, bite: 35, charm: e.hist.slice(-2).includes('charm') ? 0 : 25 });
    } });

  E('gumiho', { name: '구미호', el: 'wood', hp: 210, type: 'boss', act: 1, img: 'en_gumiho', intro: '“어머, 고운 간이 걸어 들어왔네. 천 년을 채우려면 하나가 모자랐거든.”',
    desc: '둔갑술: 행동할 때마다 원소가 상생 순서로 바뀝니다(목→화→토→금→수). 다음 원소를 노려 약점을 찌르세요. 체력이 절반 아래로 떨어지면 아홉 꼬리를 휘두릅니다.',
    init(g, e) { e.el = g.rng.pick(JG.EL); },
    onTurnStart(g, e) { /* 행동 직전 */ },
    moves: {
      charm: { name: '홀리기', it: 'defdebuff', act(g, e) { g.addCard('s_charm', 'hand'); g.addCard('s_daze', 'draw'); g.addCard('s_daze', 'draw'); g.gainBlock(e, 14); } },
      tails: { name: '꼬리 채찍', it: 'atk', dmg: 4, hits: 4 },
      liver: { name: '간 빼먹기', it: 'atkbuff', dmg: 16, act(g, e, m) { const d = g.moveAttack(e, m); if (d > 0) g.heal(e, d); } },
      bead: { name: '여우구슬', it: 'buff', act(g, e) { g.apply(e, 'sharp', 2, e); g.heal(e, 10); } },
      nine: { name: '아홉 꼬리', it: 'atk', dmg: 3, hits: 9, act(g, e, m) { e.data.nineDone = true; g.moveAttack(e, m); } },
    },
    afterAct(g, e) {},
    ai(g, e) {
      if (e.turn > 0) { e.el = JG.nextEl(e.el); g.fx.push({ t: 'elchange', who: e.uid, el: e.el }); }
      if (!e.data.nineDone && e.hp * 2 < e.maxHp) return 'nine';
      return ['charm', 'tails', 'liver', 'tails', 'bead', 'liver'][e.turn % 6];
    } });

  E('bulgasari', { name: '불가사리', el: 'metal', hp: 210, type: 'boss', act: 1, img: 'en_bulgasari', intro: '마을의 쇠붙이를 모조리 삼킨 괴물이 몸을 일으킨다. 쇳소리가 땅을 울린다.',
    desc: '쇠를 먹고 자라는 괴물. 당신이 금(金) 카드를 쓸 때마다 방어 4를 얻고, 3장째마다 예리 1을 얻습니다. 불(火)에 약합니다.',
    init(g, e) { g.apply(e, 'ironEater', 1, e); },
    moves: {
      shards: { name: '쇳조각 뿌리기', it: 'atkdebuff', dmg: 5, hits: 3, act(g, e, m) { g.moveAttack(e, m); g.addCard('s_iron', 'draw'); g.addCard('s_iron', 'draw'); } },
      swallow: { name: '쇠 삼키기', it: 'defbuff', act(g, e) { g.gainBlock(e, 18); g.apply(e, 'sharp', 2, e); } },
      crush: { name: '짓뭉개기', it: 'atk', dmg: 19 },
      roar: { name: '쇳소리 포효', it: 'debuff', act(g, e) { g.apply(g.p, 'chill', 2, e); g.addCard('s_iron', 'draw'); } },
    },
    ai(g, e) { return ['shards', 'swallow', 'crush', 'roar', 'crush', 'swallow'][e.turn % 6]; } });

  E('tiger', { name: '떡 달라는 호랑이', el: 'metal', hp: 72, type: 'elite', act: 1, img: 'en_tiger', intro: '“떡을 안 줬으니, 너를 먹어야겠다!”',
    desc: '"떡 하나 주면 안 잡아먹지!"',
    moves: {
      roar: { name: '어흥', it: 'debuff', act(g) { g.apply(g.p, 'crack', 2); } },
      pounce: { name: '덮치기', it: 'atk', dmg: 14 },
      claw: { name: '앞발 치기', it: 'atk', dmg: 6, hits: 2 },
    },
    ai(g, e) { if (e.turn === 0) return 'roar'; return wpick(g, e, { pounce: 45, claw: 40, roar: lastIs(e, 'roar') ? 0 : 15 }); } });

  // ═════════════ 2막: 안개 숲과 폐사찰 ═════════════
  E('geuseundae', { name: '그슨대', el: 'water', hp: [46, 52], type: 'normal', act: 2, img: 'en_geuseundae',
    desc: '쳐다볼수록 커지는 그림자. 턴마다 예리가 오릅니다. 빨리 쓰러뜨리세요.',
    init(g, e) { g.apply(e, 'frenzy', 2, e); },
    moves: {
      loom: { name: '덮쳐오기', it: 'atk', dmg: 7 },
      grow: { name: '자라나기', it: 'defbuff', act(g, e) { g.gainBlock(e, 9); g.apply(e, 'sharp', 1, e); } },
    },
    ai(g, e) { return cyc(e, ['loom', 'loom', 'grow']); } });

  E('mangryang', { name: '망량', el: 'water', hp: [40, 46], type: 'normal', act: 2, img: 'en_mangryang',
    moves: {
      trick: { name: '홀림', it: 'debuff', act(g) { g.apply(g.p, 'chill', 2); g.apply(g.p, 'crack', 1); } },
      scratch: { name: '할퀴기', it: 'atk', dmg: 7, hits: 2 },
      hide: { name: '물속에 숨기', it: 'def', act(g, e) { g.gainBlock(e, 12); } },
    },
    ai(g, e) { if (e.turn === 0) return g.rng.chance(0.5) ? 'trick' : 'scratch'; return wpick(g, e, { scratch: 50, trick: lastIs(e, 'trick') ? 0 : 25, hide: lastIs(e, 'hide') ? 0 : 25 }); } });

  E('imae', { name: '이매', el: 'wood', hp: [52, 58], type: 'normal', act: 2, img: 'en_imae',
    desc: '가시 돋친 숲의 요괴. 때릴 때마다 가시에 찔립니다.',
    init(g, e) { g.apply(e, 'thorns', 3, e); },
    moves: {
      swipe: { name: '후려치기', it: 'atk', dmg: 13 },
      bramble: { name: '가시 돋기', it: 'defbuff', act(g, e) { g.gainBlock(e, 8); g.apply(e, 'thorns', 2, e); } },
      root: { name: '뿌리 감기', it: 'atkdebuff', dmg: 8, act(g, e, m) { g.moveAttack(e, m); g.apply(g.p, 'chill', 1, e); } },
    },
    ai(g, e) { return wpick(g, e, { swipe: 45, root: 35, bramble: lastIs(e, 'bramble') ? 0 : 20 }); } });

  E('yagwang', { name: '야광귀', el: 'metal', hp: [36, 42], type: 'normal', act: 2, img: 'en_yagwang',
    desc: '설날 밤 신발을 훔쳐 가는 귀신. 엽전을 훔치고 달아납니다. 달아나기 전에 쓰러뜨리면 되찾을 수 있습니다.',
    moves: {
      snatch: { name: '훔치기', it: 'atkdebuff', dmg: 7, act(g, e, m) { g.moveAttack(e, m); const s = Math.min(15, g.run.gold); if (s > 0) { g.run.gold -= s; g.apply(e, 'thief', s, e); g.fx.push({ t: 'msg', text: `엽전 ${s}을 도둑맞았다!`, gold: g.run.gold }); } } },
      smoke: { name: '연막', it: 'def', act(g, e) { g.gainBlock(e, 11); } },
      flee: { name: '달아나기', it: 'escape', act(g, e) { g.escape(e); } },
    },
    ai(g, e) { return ['snatch', 'snatch', 'smoke', 'flee'][Math.min(e.turn, 3)]; } });

  E('statue', { name: '석상 나한', el: 'earth', hp: [58, 64], type: 'normal', act: 2, img: 'en_statue',
    desc: '돌로 된 몸. 방어가 사라지지 않습니다(반석).',
    init(g, e) { g.apply(e, 'bedrock', 1, e); },
    moves: {
      harden: { name: '굳어지기', it: 'def', act(g, e) { g.gainBlock(e, 13); } },
      fist: { name: '돌주먹', it: 'atk', dmg: 14 },
      rumble: { name: '땅울림', it: 'atkdebuff', dmg: 8, act(g, e, m) { g.moveAttack(e, m); g.apply(g.p, 'crack', 1, e); } },
    },
    ai(g, e) { if (e.turn === 0) return 'harden'; return wpick(g, e, { fist: 40, rumble: 35, harden: lastIs(e, 'harden') ? 0 : 25 }); } });

  E('monk', { name: '원귀 승려', el: 'fire', hp: [44, 50], type: 'normal', act: 2, img: 'en_monk',
    moves: {
      chant: { name: '독경', it: 'buff', act(g, e) { for (const a of g.alive()) g.apply(a, 'sharp', 2, e); } },
      moktak: { name: '목탁 두드리기', it: 'atk', dmg: 6, hits: 2 },
      grudge: { name: '업장', it: 'debuff', act(g) { g.addCard('s_grudge', 'discard'); g.addCard('s_grudge', 'discard'); } },
    },
    ai(g, e) { if (e.turn === 0) return 'chant'; return wpick(g, e, { moktak: 50, grudge: e.hist.slice(-2).includes('grudge') ? 0 : 25, chant: lastIs(e, 'chant') ? 0 : 25 }); } });

  E('puppet', { name: '꼭두각시', el: 'wood', hp: [24, 28], type: 'normal', act: 2, img: 'en_puppet',
    desc: '실에 매달린 인형. 하나가 쓰러지면 남은 꼭두각시가 예리 2를 얻습니다.',
    onDeath(g, e) { for (const a of g.alive()) if (a.id === 'puppet') g.apply(a, 'sharp', 2, a); },
    moves: {
      jab: { name: '찌르기', it: 'atk', dmg: 4, hits: 2 },
      poke: { name: '내지르기', it: 'atk', dmg: 8 },
      dance: { name: '꼭두각시 춤', it: 'defbuff', act(g, e) { g.gainBlock(e, 6); g.apply(e, 'sharp', 1, e); } },
    },
    ai(g, e) { return wpick(g, e, { jab: 40, poke: 40, dance: lastIs(e, 'dance') ? 0 : 20 }); } });

  E('haechi', { name: '타락한 해태', el: 'earth', hp: [140, 148], type: 'elite', act: 2, img: 'en_haechi',
    desc: '불을 먹는 짐승. 화(火) 공격은 절반만 들어가고 화상에 걸리지 않습니다. 노려본 다음엔 강력한 심판이 옵니다.',
    init(g, e) { g.apply(e, 'fireproof', 1, e); },
    moves: {
      glare: { name: '노려보기', it: 'debuff', act(g) { g.apply(g.p, 'crack', 1); } },
      judge: { name: '심판', it: 'atk', dmg: 24 },
      scale: { name: '돌비늘', it: 'defbuff', act(g, e) { g.gainBlock(e, 18); g.apply(e, 'thorns', 2, e); } },
      claw: { name: '할퀴기', it: 'atk', dmg: 7, hits: 2 },
    },
    ai(g, e) { return ['glare', 'judge', 'scale', 'claw'][e.turn % 4]; } });

  E('samdu', { name: '삼두구미', el: 'fire', hp: [118, 126], type: 'elite', act: 2, img: 'en_samdu',
    desc: '머리 셋, 꼬리 아홉 달린 짐승.',
    moves: {
      bite3: { name: '세 머리 물기', it: 'atk', dmg: 5, hits: 3 },
      breath: { name: '불길', it: 'atkdebuff', dmg: 10, act(g, e, m) { g.moveAttack(e, m); g.apply(g.p, 'burn', 4, e); } },
      howl: { name: '세 갈래 울음', it: 'buff', act(g, e) { g.apply(e, 'sharp', 3, e); g.gainBlock(e, 8); } },
      tails: { name: '아홉 꼬리', it: 'atk', dmg: 2, hits: 9 },
    },
    ai(g, e) { if (e.turn === 0) return 'howl'; return wpick(g, e, { bite3: 35, breath: 30, tails: 20, howl: e.hist.slice(-3).includes('howl') ? 0 : 15 }); } });

  E('gangcheol', { name: '강철이', el: 'fire', hp: [128, 136], type: 'elite', act: 2, img: 'en_gangcheol',
    desc: '지나가는 곳마다 가뭄이 드는 쇠비늘 괴물.',
    moves: {
      drought: { name: '가뭄', it: 'debuff', act(g) { g.apply(g.p, 'burn', 6); } },
      scale: { name: '쇠비늘', it: 'defbuff', act(g, e) { g.gainBlock(e, 16); g.apply(e, 'sharp', 1, e); } },
      breath: { name: '불바람', it: 'atk', dmg: 16 },
      tail: { name: '꼬리 휘두르기', it: 'atkdebuff', dmg: 9, act(g, e, m) { g.moveAttack(e, m); g.apply(g.p, 'chill', 1, e); } },
    },
    ai(g, e) { if (e.turn === 0) return 'drought'; return wpick(g, e, { breath: 40, tail: 30, scale: lastIs(e, 'scale') ? 0 : 20, drought: e.hist.slice(-3).includes('drought') ? 0 : 15 }); } });

  E('imugi', { name: '이무기', el: 'water', hp: 350, type: 'boss', act: 2, img: 'en_imugi', intro: '“천 년을 물속에서 기다렸다. 오늘 밤 저승문의 기운으로 나는 용이 된다!”',
    desc: '용이 되지 못한 뱀. 체력이 절반 아래로 떨어지면 승천을 시도합니다. 승천 중 40 피해를 주면 막을 수 있고, 막지 못하면 용이 되어 크게 강해집니다.',
    onHurt(g, e, dmg) {
      if (e.data.ascending) {
        e.data.ascDmg += dmg;
        if (e.data.ascDmg >= 40) {
          e.data.ascending = false; e.data.ascFailed = true;
          g.removeStatus(e, 'countdown');
          g.apply(e, 'stun', 1, g.p);
          g.fx.push({ t: 'msg', text: '승천이 꺾였다! 이무기가 떨어진다!', big: true });
        }
      }
    },
    moves: {
      coil: { name: '휘감기', it: 'atkdebuff', dmg: 10, act(g, e, m) { g.moveAttack(e, m); g.apply(g.p, 'chill', 2, e); } },
      tail: { name: '꼬리치기', it: 'atk', dmg: 21 },
      mist: { name: '물안개', it: 'defbuff', act(g, e) { g.gainBlock(e, 18); g.apply(e, 'regen', 6, e); } },
      bite: { name: '독니', it: 'atk', dmg: 8, hits: 2 },
      ascend: { name: '승천 시도', it: 'charge', act(g, e) {
        if (!e.data.ascending && !e.data.ascTried) { e.data.ascending = true; e.data.ascTried = true; e.data.ascDmg = 0; g.apply(e, 'countdown', 2, e); g.fx.push({ t: 'msg', text: '이무기가 승천하려 한다! (40 피해로 저지)', big: true }); }
        else if (e.data.ascending) {
          g.apply(e, 'countdown', -1, e);
          if (!e.st.countdown) {
            e.data.ascending = false; e.data.dragon = true;
            e.name = '용'; e.data.img = 'en_imugi';
            g.heal(e, Math.floor(e.maxHp * 0.2)); g.apply(e, 'sharp', 5, e);
            g.fx.push({ t: 'msg', text: '이무기가 용이 되었다!', big: true });
          }
        }
      } },
      dragonfire: { name: '용의 숨결', it: 'atk', dmg: 14, hits: 2 },
    },
    ai(g, e) {
      if (e.data.ascending) return 'ascend';
      if (!e.data.ascTried && e.hp * 2 < e.maxHp) return 'ascend';
      if (e.data.dragon) return wpick(g, e, { dragonfire: 45, tail: 35, mist: lastIs(e, 'mist') ? 0 : 20 });
      return ['coil', 'tail', 'bite', 'mist', 'tail'][e.turn % 5];
    } });

  E('agwi', { name: '아귀', el: 'fire', hp: 260, type: 'boss', act: 2, img: 'en_agwi', intro: '“배고파… 배고파… 네 부적도, 네 살도, 전부 먹어 치워 주마.”',
    desc: '끝없이 굶주린 귀신. 손패의 카드를 삼킵니다. 쓰러뜨리면 삼킨 카드를 되찾습니다.',
    init(g, e) { e.data.eaten = []; },
    moves: {
      devour: { name: '탐식', it: 'magic', act(g, e) {
        for (let i = 0; i < 2; i++) {
          const pool = g.pile.hand.length ? g.pile.hand : g.pile.draw;
          const c = g.rng.pick(pool);
          if (!c) break;
          pool.splice(pool.indexOf(c), 1);
          e.data.eaten.push(c);
          g.fx.push({ t: 'eaten', uid: c.uid, id: c.id, who: e.uid });
        }
        g.apply(e, 'devour', 2, e);
        e.maxHp += 6; g.heal(e, 6);
      } },
      vomit: { name: '토해내기', it: 'atkdebuff', dmg: 5, hits: 3, act(g, e, m) { g.moveAttack(e, m); g.addCard('s_filth', 'discard'); g.addCard('s_filth', 'discard'); } },
      gnash: { name: '이빨 갈기', it: 'atk', dmg: 20 },
      hunger: { name: '굶주림', it: 'buff', act(g, e) { g.apply(e, 'sharp', 2, e); g.gainBlock(e, 12); } },
    },
    ai(g, e) { return ['vomit', 'devour', 'gnash', 'hunger', 'vomit', 'gnash', 'devour'][e.turn % 7]; } });

  // ═════════════ 3막: 황천길 ═════════════
  E('mangja', { name: '망자', el: 'none', hp: [22, 26], type: 'normal', act: 3, img: 'en_mangja',
    moves: {
      cling: { name: '매달리기', it: 'atkdebuff', dmg: 5, act(g, e, m) { g.moveAttack(e, m); g.apply(g.p, 'chill', 1, e); } },
      wail: { name: '통곡', it: 'buff', act(g, e) { for (const a of g.alive()) g.apply(a, 'sharp', 1, e); } },
      scratch: { name: '할퀴기', it: 'atk', dmg: 8 },
    },
    ai(g, e) { return wpick(g, e, { scratch: 45, cling: 35, wail: lastIs(e, 'wail') ? 0 : 20 }); } });

  E('okjol', { name: '옥졸', el: 'metal', hp: [66, 72], type: 'normal', act: 3, img: 'en_okjol',
    moves: {
      whip: { name: '쇠사슬 채찍', it: 'atk', dmg: 14 },
      bind: { name: '포박', it: 'atkdebuff', dmg: 8, act(g, e, m) { g.moveAttack(e, m); g.apply(g.p, 'crack', 1, e); } },
      stocks: { name: '형틀', it: 'defbuff', act(g, e) { g.gainBlock(e, 14); g.apply(e, 'sharp', 2, e); } },
    },
    ai(g, e) { if (e.turn === 0) return 'bind'; return wpick(g, e, { whip: 45, bind: 30, stocks: lastIs(e, 'stocks') ? 0 : 25 }); } });

  E('crow', { name: '저승 까마귀', el: 'fire', hp: [40, 44], type: 'normal', act: 3, img: 'en_crow',
    moves: {
      peck: { name: '쪼기', it: 'atk', dmg: 4, hits: 3 },
      omen: { name: '흉조', it: 'debuff', act(g) { g.apply(g.p, 'burn', 4); g.apply(g.p, 'crack', 1); } },
      swoop: { name: '내리꽂기', it: 'atk', dmg: 12 },
    },
    ai(g, e) { if (e.turn === 0) return 'omen'; return wpick(g, e, { peck: 40, swoop: 40, omen: e.hist.slice(-2).includes('omen') ? 0 : 20 }); } });

  E('mirror', { name: '업경', el: 'water', hp: [60, 66], type: 'normal', act: 3, img: 'en_mirror',
    desc: '죄를 비추는 거울. 공격 카드를 쓸 때마다 3 피해를 돌려받습니다. 지난 턴에 쓴 카드가 많을수록 세게 비춥니다.',
    init(g, e) { g.apply(e, 'reflect', 3, e); },
    onPlayerTurn(g, e) { e.data.cards = 0; },
    onPlayerCard(g, e) { e.data.cards = (e.data.cards || 0) + 1; },
    moves: {
      reveal: { name: '업보 비추기', it: 'atk', dmg: (g, e) => 3 * Math.max(2, e.data.cards || 0) },
      polish: { name: '거울 닦기', it: 'def', act(g, e) { g.gainBlock(e, 15); } },
      glare: { name: '눈부심', it: 'atkdebuff', dmg: 6, act(g, e, m) { g.moveAttack(e, m); g.apply(g.p, 'chill', 2, e); } },
    },
    ai(g, e) { return wpick(g, e, { reveal: 50, glare: 30, polish: lastIs(e, 'polish') ? 0 : 20 }); } });

  E('ferryman', { name: '삼도천 사공', el: 'water', hp: [72, 78], type: 'normal', act: 3, img: 'en_ferryman',
    moves: {
      oar: { name: '노 젓기', it: 'atk', dmg: 16 },
      toll: { name: '뱃삯 요구', it: 'atkdebuff', dmg: 6, act(g, e, m) { g.moveAttack(e, m); const s = Math.min(20, g.run.gold); if (s) { g.run.gold -= s; g.apply(e, 'thief', s, e); g.fx.push({ t: 'msg', text: `뱃삯 ${s}을 빼앗겼다!`, gold: g.run.gold }); } } },
      current: { name: '거센 물살', it: 'debuff', act(g) { g.apply(g.p, 'chill', 2); g.addCard('s_daze', 'draw'); g.addCard('s_daze', 'draw'); } },
    },
    ai(g, e) { if (e.turn === 0) return 'toll'; return wpick(g, e, { oar: 50, current: lastIs(e, 'current') ? 0 : 25, toll: e.hist.includes('toll') ? 10 : 25 }); } });

  E('skeleton', { name: '백골 무사', el: 'metal', hp: [44, 50], type: 'normal', act: 3, img: 'en_skeleton',
    desc: '한 번 쓰러져도 절반의 체력으로 다시 일어납니다. 화(火) 공격으로 쓰러뜨리면 되살아나지 못합니다.',
    init(g, e) { g.apply(e, 'revive', 1, e); },
    moves: {
      slash: { name: '칼질', it: 'atk', dmg: 12 },
      bone: { name: '뼈 갑옷', it: 'def', act(g, e) { g.gainBlock(e, 12); } },
      rush: { name: '돌격', it: 'atk', dmg: 7, hits: 2 },
    },
    ai(g, e) { return wpick(g, e, { slash: 40, rush: 35, bone: lastIs(e, 'bone') ? 0 : 25 }); } });

  E('chasa', { name: '저승차사', el: 'none', hp: [150, 158], type: 'elite', act: 3, img: 'en_chasa', intro: '“명부에 네 이름이 적혀 있다. 순순히 따라오너라.”',
    desc: '명부에 이름을 적는 차사. 명부가 0이 되면 집행(큰 피해)이 들어옵니다. 집행 전에 방어를 두껍게 쌓으세요.',
    init(g, e) { g.apply(e, 'countdown', 3, e); },
    moves: {
      chains: { name: '저승 쇠사슬', it: 'atkdebuff', dmg: 10, act(g, e, m) { g.moveAttack(e, m); g.apply(g.p, 'crack', 1, e); g.apply(e, 'countdown', -1, e); } },
      record: { name: '명부 기록', it: 'defbuff', act(g, e) { g.gainBlock(e, 14); g.apply(e, 'countdown', -1, e); } },
      execute: { name: '명부 집행', it: 'atk', dmg: 38, act(g, e, m) { g.moveAttack(e, m); g.apply(e, 'countdown', 4, e); } },
    },
    ai(g, e) { if ((e.st.countdown || 0) <= 1) return 'execute'; return lastIs(e, 'chains') ? 'record' : (g.rng.chance(0.65) ? 'chains' : 'record'); } });

  E('yacha', { name: '야차', el: 'metal', hp: [138, 146], type: 'elite', act: 3, img: 'en_yacha',
    desc: '맞을수록 사나워집니다. 피해를 받을 때마다 예리 1. 여러 번 때리는 공격은 조심하세요.',
    onHurt(g, e) { if (!e.dead) { e.st.sharp = (e.st.sharp || 0) + 1; g.fx.push({ t: 'status', who: e.uid, id: 'sharp', n: 1, snap: g.snap(e) }); } },
    moves: {
      trident: { name: '삼지창', it: 'atk', dmg: 6, hits: 3 },
      leap: { name: '도약', it: 'atk', dmg: 18 },
      calm: { name: '숨 고르기', it: 'defbuff', act(g, e) { g.gainBlock(e, 16); e.st.sharp = Math.max(0, (e.st.sharp || 0) - 3); if (!e.st.sharp) delete e.st.sharp; g.fx.push({ t: 'snap', who: e.uid, snap: g.snap(e) }); } },
    },
    ai(g, e) { return wpick(g, e, { trident: 40, leap: 40, calm: lastIs(e, 'calm') ? 0 : 20 }); } });

  E('wonhon', { name: '처녀귀신', el: 'water', hp: [146, 154], type: 'elite', act: 3, img: 'en_wonhon',
    desc: '한을 품은 귀신. 사라지기를 쓰면 공격이 1씩만 들어갑니다. 화상은 그대로 들어갑니다.',
    moves: {
      wail: { name: '한 맺힌 비명', it: 'debuff', act(g) { g.apply(g.p, 'chill', 2); g.apply(g.p, 'crack', 1); } },
      scratch: { name: '손톱 할퀴기', it: 'atk', dmg: 7, hits: 3 },
      vanish: { name: '사라지기', it: 'defbuff', act(g, e) { g.apply(e, 'phantom', 2, e); g.gainBlock(e, 10); } },
      grasp: { name: '붙잡기', it: 'atk', dmg: 20 },
    },
    ai(g, e) { return ['wail', 'scratch', 'vanish', 'grasp', 'scratch', 'grasp'][e.turn % 6]; } });

  E('heukun', { name: '흑운귀왕', el: 'none', hp: 300, type: 'boss', act: 3, img: 'en_heukun', intro: '“문은 이미 열렸다. 산 자와 죽은 자의 경계는 오늘 밤 사라진다. 부적 몇 장으로 무엇을 하겠느냐?”',
    desc: '저승문을 연 귀왕. 쓰러뜨리면 진짜 모습(2단계)을 드러냅니다. 2단계에서는 오행을 거꾸로 흐르게 만듭니다.',
    init(g, e) { e.data.phase = 1; },
    onLethal(g, e) {
      if (e.data.phase !== 1) return false;
      e.data.phase = 2; e.data.p2turn = 0;
      e.name = '흑운귀왕 (진)'; e.data.img = 'en_heukun2';
      e.maxHp = Math.round(245 * g.hpMul('boss')); e.hp = e.maxHp; e.block = 0;
      for (const k of Object.keys(e.st)) if (['burn', 'chill', 'crack', 'stun'].includes(k)) delete e.st[k];
      for (const m of g.alive()) if (m.minion) { m.dead = true; m.hp = 0; g.fx.push({ t: 'die', who: m.uid }); }
      g.fx.push({ t: 'transform', who: e.uid, snap: g.snap(e), name: e.name, img: e.data.img });
      g.fx.push({ t: 'msg', text: '흑운귀왕이 진짜 모습을 드러냈다!', big: true });
      g.chooseIntent(e);
      return true;
    },
    moves: {
      summon: { name: '망자 부르기', it: 'summon', act(g, e) { g.spawn('mangja', { minion: true, at: 0, hp: 20 }); g.spawn('mangja', { minion: true, hp: 20 }); } },
      cloud: { name: '검은 구름', it: 'debuff', act(g) { g.apply(g.p, 'chill', 2); g.apply(g.p, 'crack', 1); g.addCard('s_daze', 'draw'); g.addCard('s_daze', 'draw'); } },
      strike: { name: '귀왕의 일격', it: 'atk', dmg: 28 },
      blades: { name: '저승 칼날', it: 'atk', dmg: 8, hits: 3 },
      // 2단계
      reverse: { name: '오행 역류', it: 'magic', act(g, e) { g.flags.reverse = 1; g.gainBlock(e, 20); g.fx.push({ t: 'msg', text: '오행이 거꾸로 흐른다! 다음 턴은 수→금→토→화→목 순서로 이어집니다.', big: true }); } },
      storm: { name: '검은 폭풍', it: 'atk', dmg: 5, hits: 5 },
      gather: { name: '기 모으기', it: 'defbuff', act(g, e) { g.gainBlock(e, 30); g.apply(e, 'sharp', 3, e); } },
      doom: { name: '멸망의 구름', it: 'atk', dmg: 38 },
    },
    ai(g, e) {
      if (e.data.phase === 1) return ['summon', 'blades', 'cloud', 'strike', 'blades', 'summon', 'strike'][e.turn % 7];
      return ['reverse', 'storm', 'gather', 'doom', 'storm'][e.data.p2turn++ % 5];
    } });
})();
