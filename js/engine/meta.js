'use strict';
// 판을 넘어 남는 기록: 해금, 업적, 도감, 통계, 설정, 이어하기 저장 (localStorage)
(function () {
  const KEY = 'jg_meta_v1';
  const RUNKEY = 'jg_run_v1';
  const ls = () => (typeof localStorage !== 'undefined' ? localStorage : null);

  const DEF = () => ({
    v: 1,
    settings: { master: 0.8, sfx: 0.9, music: 0.55, speed: 1, shake: true, tips: true, autoEnd: false, confirmEnd: true, bigText: false },
    unlocked: { yeonhwa: true },
    maxAsc: {},
    seen: { cards: {}, relics: {}, potions: {}, enemies: {}, events: {} },
    ach: {},
    stats: { runs: 0, wins: 0, byChar: {}, bestFloor: 0, kills: 0, maxHit: 0, cycles: 0, fastestWin: 0, bestScore: 0, bosses: {}, playMs: 0 },
    history: [],
    daily: {},
    tutorial: { combat: false, chain: false, map: false },
  });

  const M = JG.Meta = {
    data: DEF(),
    load() {
      try {
        const s = ls() && ls().getItem(KEY);
        if (s) {
          const d = JSON.parse(s);
          const base = DEF();
          for (const k of Object.keys(base)) if (d[k] === undefined) d[k] = base[k];
          d.settings = Object.assign(base.settings, d.settings);
          d.seen = Object.assign(base.seen, d.seen);
          d.stats = Object.assign(base.stats, d.stats);
          d.tutorial = Object.assign(base.tutorial, d.tutorial);
          M.data = d;
        }
      } catch (e) { console.warn('meta load failed', e); }
      return M.data;
    },
    save() { try { ls() && ls().setItem(KEY, JSON.stringify(M.data)); } catch (e) { console.warn('meta save failed', e); } },
    reset() { M.data = DEF(); M.save(); M.clearRun(); },

    // 이어하기
    saveRun(run) { try { if (ls()) ls().setItem(RUNKEY, JG.R.serialize(run)); } catch (e) { console.warn('run save failed', e); } },
    loadRun() { try { const s = ls() && ls().getItem(RUNKEY); return s ? JG.R.deserialize(s) : null; } catch (e) { return null; } },
    clearRun() { try { ls() && ls().removeItem(RUNKEY); } catch (e) { /* 무시 */ } },

    // 도감
    seeCard(id) { if (!M.data.seen.cards[id]) { M.data.seen.cards[id] = 1; M.dirty = true; } },
    seeRelic(id) { if (!M.data.seen.relics[id]) { M.data.seen.relics[id] = 1; M.dirty = true; } },
    seePotion(id) { if (!M.data.seen.potions[id]) { M.data.seen.potions[id] = 1; M.dirty = true; } },
    seeEnemy(id) { if (!M.data.seen.enemies[id]) { M.data.seen.enemies[id] = 1; M.dirty = true; } },
    seeEvent(id) { if (!M.data.seen.events[id]) { M.data.seen.events[id] = 1; M.dirty = true; } },

    isUnlocked(ch) { return !!M.data.unlocked[ch]; },
    maxAsc(ch) { return M.data.maxAsc[ch] || 0; },

    // 업적
    grant(id) {
      if (M.data.ach[id]) return false;
      M.data.ach[id] = Date.now();
      M.dirty = true;
      (M.newAch = M.newAch || []).push(id);
      return true;
    },
    popNew() { const a = M.newAch || []; M.newAch = []; return a; },

    // 전투가 끝날 때마다 (UI·봇 공용)
    onCombat(run, g) {
      const s = M.data.stats;
      s.maxHit = Math.max(s.maxHit, g.stats.maxHit);
      s.cycles += g.stats.cycles;
      for (const e of g.enemies) M.seeEnemy(e.id);
      if (g.stats.cycles >= 1) M.grant('cycle1');
      if (g.stats.cycles >= 3) M.grant('cycle3');
      if (g.stats.maxHit >= 50) M.grant('hit50');
      if (g.stats.maxHit >= 100) M.grant('hit100');
      if (g.flags.maxChain >= 10) M.grant('chain10');
      if (g.flags.maxBurn >= 30) M.grant('burn30');
      if (g.flags.maxBlock >= 50) M.grant('block50');
      if (g.result === 'win' && g.cfg.kind === 'boss') {
        for (const e of g.enemies) if (JG.D.enemies[e.id].type === 'boss') { s.bosses[e.id] = (s.bosses[e.id] || 0) + 1; M.grant('boss_' + e.id); }
        if (g.cnt.hpLost === 0) M.grant('flawless');
      }
      if (g.cnt.potions >= 3) M.grant('potion3');
      M.save();
    },
    onRunState(run) {
      if (run.gold >= 500) M.grant('rich');
      if (run.relics.length >= 15) M.grant('relics15');
      if (run.deck.length >= 40) M.grant('deck40');
      if (run.deck.filter((c) => JG.D.cards[c.id].type === 'curse').length >= 5) M.grant('curse5');
      if (run.act >= 2) M.grant('act2');
      if (run.act >= 3) M.grant('act3');
      if (M.dirty) { M.dirty = false; M.save(); }
    },
    // 여정이 끝났을 때 → 새로 열린 것 목록
    onRunEnd(run, won) {
      const d = M.data;
      const s = d.stats;
      const out = { unlocks: [], score: JG.R.score(run, won) };
      s.runs++;
      const bc = s.byChar[run.char] || (s.byChar[run.char] = { runs: 0, wins: 0 });
      bc.runs++;
      s.bestFloor = Math.max(s.bestFloor, run.floor);
      s.kills += run.stats.kills;
      s.bestScore = Math.max(s.bestScore, out.score);
      const ms = (run.stats.endedAt || Date.now()) - run.stats.startedAt;
      s.playMs += ms;
      M.grant('first_run');
      if (won) {
        s.wins++; bc.wins++;
        if (!s.fastestWin || ms < s.fastestWin) s.fastestWin = ms;
        M.grant('first_win');
        if (run.deck.length <= 15) M.grant('deck_small');
        if (run.asc >= 1) M.grant('asc1');
        if (run.asc >= 5) M.grant('asc5');
        if (run.asc >= 10) M.grant('asc10');
        if (run.mode === 'normal' && run.asc >= (d.maxAsc[run.char] || 0) && (d.maxAsc[run.char] || 0) < 10) {
          d.maxAsc[run.char] = (d.maxAsc[run.char] || 0) + 1;
          out.unlocks.push({ kind: 'asc', char: run.char, level: d.maxAsc[run.char] });
        }
        const allc = Object.keys(JG.D.chars).filter((c) => !JG.D.chars[c].hidden);
        if (allc.length >= 3 && allc.every((c) => s.byChar[c] && s.byChar[c].wins > 0)) M.grant('all_chars');
      }
      if (run.mode === 'daily' && run.daily) {
        const prev = d.daily[run.daily];
        if (!prev || out.score > prev.score) d.daily[run.daily] = { score: out.score, won, char: run.char, floor: run.floor };
        M.grant('daily');
      }
      // 캐릭터 해금
      for (const ch of Object.values(JG.D.chars)) {
        if (d.unlocked[ch.id] || !ch.unlock) continue;
        if (ch.unlock(d, run, won)) { d.unlocked[ch.id] = true; out.unlocks.push({ kind: 'char', char: ch.id }); }
      }
      d.history.unshift({ char: run.char, won, floor: run.floor, act: run.act, asc: run.asc, score: out.score, at: Date.now(), mode: run.mode, by: run.room && run.room.by ? run.room.by : null, ms });
      d.history = d.history.slice(0, 30);
      M.save();
      M.clearRun();
      return out;
    },
  };

  JG.ACH = [
    { id: 'first_run', name: '첫걸음', desc: '여정을 한 번 마치세요.' },
    { id: 'first_win', name: '저승문을 닫다', desc: '흑운귀왕을 쓰러뜨리고 여정을 끝내세요.' },
    { id: 'act2', name: '안개 속으로', desc: '2막에 들어서세요.' },
    { id: 'act3', name: '황천길', desc: '3막에 들어서세요.' },
    { id: 'boss_gumiho', name: '여우 사냥', desc: '구미호를 쓰러뜨리세요.' },
    { id: 'boss_bulgasari', name: '쇠를 녹이다', desc: '불가사리를 쓰러뜨리세요.' },
    { id: 'boss_imugi', name: '승천 저지', desc: '이무기를 쓰러뜨리세요.' },
    { id: 'boss_agwi', name: '배부른 귀신', desc: '아귀를 쓰러뜨리세요.' },
    { id: 'boss_heukun', name: '귀왕 토벌', desc: '흑운귀왕을 쓰러뜨리세요.' },
    { id: 'cycle1', name: '오행순환', desc: '한 턴에 다섯 원소를 이어 오행순환을 이루세요.' },
    { id: 'cycle3', name: '삼순환', desc: '한 전투에서 오행순환을 3번 이루세요.' },
    { id: 'chain10', name: '끝없는 흐름', desc: '연계 10단계에 이르세요.' },
    { id: 'hit50', name: '일격필살', desc: '한 번에 50 이상의 피해를 주세요.' },
    { id: 'hit100', name: '천지개벽', desc: '한 번에 100 이상의 피해를 주세요.' },
    { id: 'burn30', name: '불바다', desc: '적 하나에게 화상 30 이상을 쌓으세요.' },
    { id: 'block50', name: '철옹성', desc: '방어를 50 이상 쌓으세요.' },
    { id: 'flawless', name: '무결', desc: '체력을 잃지 않고 보스를 쓰러뜨리세요.' },
    { id: 'potion3', name: '약방 단골', desc: '한 전투에서 약을 3개 쓰세요.' },
    { id: 'rich', name: '거상', desc: '엽전 500개를 모으세요.' },
    { id: 'relics15', name: '보물 수집가', desc: '한 여정에서 신물 15개를 모으세요.' },
    { id: 'deck40', name: '보따리장수', desc: '덱을 40장 이상으로 불리세요.' },
    { id: 'deck_small', name: '단출한 보따리', desc: '덱 15장 이하로 여정을 끝내세요.' },
    { id: 'curse5', name: '업보 덩어리', desc: '저주 카드를 5장 이상 지니세요.' },
    { id: 'asc1', name: '업보의 길', desc: '업보 1 이상으로 승리하세요.' },
    { id: 'asc5', name: '깊은 업보', desc: '업보 5 이상으로 승리하세요.' },
    { id: 'asc10', name: '저승의 진노', desc: '업보 10으로 승리하세요.' },
    { id: 'daily', name: '오늘의 도전', desc: '일일 도전을 한 번 마치세요.' },
    { id: 'all_chars', name: '삼인방', desc: '모든 캐릭터로 승리하세요.' },
  ];

  JG.ASC_TEXT = [
    '기본 난이도',
    '강적의 체력이 늘어납니다.',
    '일반 적의 체력이 늘어납니다.',
    '보스의 체력이 늘어납니다.',
    '주막·막 이동 시 회복량이 줄어듭니다.',
    '최대 체력이 6 줄어든 채 시작합니다.',
    '저주 「업보」를 안고 시작합니다.',
    '장터 가격이 10% 오릅니다.',
    '적의 공격 피해가 10% 늘어납니다.',
    '보스의 체력이 더 늘어납니다.',
    '저승의 진노: 보스가 방어 15를 두른 채 시작합니다.',
  ];
})();
