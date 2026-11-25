'use strict';
// 사건(설화). stages.start(run, st) → { text, choices:[{label, hint, disabled, go(run, st) → 결과}] }
// 결과: 'stage키' | { text } | { combat:{enemies,kind}, after:{relic,relicId,gold,...} } | { deck:{mode,count}, text }
(function () {
  const D = JG.D;
  const R = JG.R;
  const V = JG.defEvent;
  const rnd = (run) => R.rng(run, 'event');
  const relicName = (id) => D.relics[id].name;
  const cardName = (id) => D.cards[id].name;
  function gainRelic(run, tier) { const id = R.randomRelic(run, tier); R.addRelic(run, id); return relicName(id); }
  function upgradeRandom(run, n, filter) {
    const cands = run.deck.filter((c) => R.canUpgrade(c) && (!filter || filter(D.cards[c.id])));
    rnd(run).shuffle(cands);
    const out = [];
    for (const c of cands.slice(0, n)) { c.up = 1; out.push(cardName(c.id)); }
    return out;
  }
  const hasCurse = (run) => run.deck.some((c) => D.cards[c.id].type === 'curse');
  const gold = (run, n) => R.goldGain(run, n);
  const fmtList = (a) => a.length ? '「' + a.join('」, 「') + '」' : '(없음)';

  V('tiger', { name: '떡 하나 주면 안 잡아먹지', acts: [1], img: 'ev_tiger', stages: {
    start: (run) => ({ text: '고갯길 한가운데 집채만 한 호랑이가 버티고 앉아 있다. 호랑이가 침을 흘리며 말한다.\n\n“떡 하나 주면 안 잡아먹지!”', choices: [
      { label: '[떡을 내준다]', hint: '약 1개를 잃는다. 호랑이 이빨을 얻는다.', disabled: !run.potions.some(Boolean),
        go(run) { const i = run.potions.findIndex(Boolean); run.potions[i] = null; const got = run.relics.some((r) => r.id === 'r_tiger_tooth') ? gainRelic(run, 'common') : (R.addRelic(run, 'r_tiger_tooth'), relicName('r_tiger_tooth')); return { text: `호랑이는 떡을 냉큼 받아 삼키고 꼬리를 흔들며 길을 비켜 주었다. 바위 틈에 빠진 이빨 하나가 반짝인다.\n\n신물 「${got}」을 얻었다.` }; } },
      { label: '[맞서 싸운다]', hint: '강적과 싸운다. 이기면 「호랑이 가죽」.', go() { return { combat: { enemies: ['tiger'], kind: 'elite' }, after: { relicId: 'r_tiger_hide' } }; } },
      { label: '[몰래 돌아간다]', hint: '체력 7을 잃는다.', go(run) { R.loseHp(run, 7); return { text: '가시덤불을 헤치고 먼 길을 돌아갔다. 온몸이 긁혔지만 호랑이 밥은 면했다.' }; } },
    ] }),
  } });

  V('golden_axe', { name: '금도끼 은도끼', acts: [1, 2], img: 'ev_axe', stages: {
    start: () => ({ text: '연못가에서 나무를 하다 도끼를 빠뜨렸다. 물결이 일더니 흰 수염의 산신령이 금도끼를 들고 떠오른다.\n\n“이 금도끼가 네 도끼냐?”', choices: [
      { label: '[예, 제 것입니다]', hint: '???', go(run) { R.addCard(run, 'x_doubt'); return { text: '산신령은 혀를 차며 물속으로 사라졌다. 금도끼도, 내 도끼도 돌아오지 않았다. 마음 한구석에 의심이 싹튼다.\n\n저주 「의심」이 덱에 들어왔다.' }; } },
      { label: '[아니요, 낡은 쇠도끼입니다]', hint: '???', go: () => 'honest' },
      { label: '[그냥 떠난다]', hint: '', go() { return { text: '도끼 하나쯤이야. 갈 길이 바쁘다.' }; } },
    ] }),
    honest: () => ({ text: '“허허, 정직하구나!” 산신령은 크게 웃으며 금도끼와 은도끼를 함께 내민다. 둘 중 무엇이든 가져가라 한다.', choices: [
      { label: '[금도끼를 받는다]', hint: '희귀 카드 「금도끼」 + 신물 「금도끼」', go(run) { R.addCard(run, 'n_golden_axe'); R.addRelic(run, 'r_golden_axe'); return { text: '묵직한 금도끼가 손에 감긴다. 정직함의 무게다.' }; } },
      { label: '[은도끼를 받는다]', hint: '카드 「은도끼」 + 엽전 60', go(run) { R.addCard(run, 'n_silver_axe'); gold(run, 60); return { text: '은도끼와 함께 산신령이 엽전 꾸러미까지 얹어 주었다.' }; } },
    ] }),
  } });

  V('gourd', { name: '흥부네 박', acts: [1, 2, 3], img: 'ev_gourd', stages: {
    start: (run, st) => {
      st.n = st.n || 0;
      const intro = '다리를 고쳐 준 제비가 박씨를 물어다 주었다. 하룻밤 새 지붕 위에 커다란 박 세 통이 열렸다. 박을 탈수록 무엇이 나올지 모른다…';
      const text = (st.last ? st.last + '\n\n' : intro) + (st.n < 3 ? `\n\n남은 박: ${3 - st.n}통` : '\n\n박을 모두 탔다.');
      const ch = [];
      if (st.n < 3) ch.push({ label: `[${['첫째', '둘째', '셋째'][st.n]} 박을 탄다]`, hint: ['안전해 보인다.', '조금 불안하다…', '크게 흔들린다!'][st.n], go(run, st) {
        const r = rnd(run).next();
        if (st.n === 0) { const g = gold(run, 50); st.last = `“슬근슬근 톱질이야!” 박 속에서 엽전이 쏟아졌다. (엽전 +${g})`; }
        else if (st.n === 1) {
          if (r < 0.65) st.last = `박 속에서 귀한 물건이 나왔다! 신물 「${gainRelic(run, 'common')}」.`;
          else { R.loseHp(run, 8); st.last = '박 속에서 도깨비들이 튀어나와 두들겨 패고 달아났다! (체력 -8)'; }
        } else {
          if (r < 0.5) st.last = `눈부신 빛과 함께 보물이 쏟아진다! 신물 「${gainRelic(run, 'rare')}」.`;
          else { R.loseHp(run, 12); R.addCard(run, 'x_greed'); st.last = '놀부네 박이었나! 똥물과 빚쟁이가 쏟아졌다. (체력 -12, 저주 「탐욕」)'; }
        }
        st.n++;
        return 'start';
      } });
      ch.push({ label: '[그만둔다]', hint: '', go() { return { text: '과유불급. 남은 박은 제비에게 맡기고 길을 떠났다.' }; } });
      return { text, choices: ch };
    },
  } });

  V('hokburi', { name: '혹부리 영감과 도깨비', acts: [1, 2], img: 'ev_hokburi', stages: {
    start: (run) => ({ text: '숲속 빈집에서 노래를 흥얼거리자 도깨비들이 몰려왔다.\n\n“그 고운 소리는 어디서 나오느냐? 그 혹에서 나오는 게지?”', choices: [
      { label: '[혹을 판다]', hint: '최대 체력 -5, 엽전 +110', go(run) { run.maxHp -= 5; run.hp = Math.min(run.hp, run.maxHp); const g = gold(run, 110); return { text: `도깨비들이 신이 나서 무언가를 뚝 떼어 가고 금은보화를 두고 갔다. 몸 어딘가가 허전하다. (엽전 +${g})` }; } },
      { label: '[밤새 함께 노래한다]', hint: '무작위 카드 2장 강화, 체력 -4', go(run) { R.loseHp(run, 4); const up = upgradeRandom(run, 2); return { text: `목이 쉬도록 노래하자 도깨비들의 흥이 부적에 스며들었다.\n\n강화: ${fmtList(up)}` }; } },
      { label: '[방망이를 슬쩍한다]', hint: '체력 -11, 카드 「도깨비 방망이」', go(run) { R.loseHp(run, 11); R.addCard(run, 'n_club'); return { text: '들켜서 실컷 얻어맞았지만, 품속엔 도깨비 방망이 하나가 들어 있다.' }; } },
    ] }),
  } });

  V('seonang', { name: '서낭당', acts: [1, 2], img: 'ev_seonang', stages: {
    start: (run) => ({ text: '마을 어귀 서낭당. 돌무더기 곁 신목에 오색 천이 나부낀다. 지나는 이들은 돌 하나를 얹고 소원을 빈다.', choices: [
      { label: '[건강을 빈다]', hint: `체력 ${Math.floor(run.maxHp * 0.25)} 회복`, go(run) { const n = Math.floor(run.maxHp * 0.25); R.heal(run, n); return { text: `돌 하나를 정성껏 얹었다. 따스한 기운이 몸을 감싼다. (체력 +${n})` }; } },
      { label: '[재물을 빈다]', hint: '엽전을 얻을지도…', go(run) { if (rnd(run).chance(0.6)) { const g = gold(run, 65); return { text: `돌을 얹자마자 발치에서 엽전 꾸러미가 굴러 나왔다! (엽전 +${g})` }; } return { text: '아무 일도 없었다. 소원이 너무 컸나 보다.' }; } },
      { label: '[돌무더기를 걷어찬다]', hint: '엽전 +95, 저주 「업보」', go(run) { const g = gold(run, 95); R.addCard(run, 'x_karma'); return { text: `돌 틈에서 엽전이 쏟아졌다. (엽전 +${g})\n\n어디선가 서늘한 기운이 따라붙는다. 저주 「업보」.` }; } },
    ] }),
  } });

  V('jumak', { name: '주막 할머니', acts: [1, 2, 3], img: 'ev_jumak', stages: {
    start: (run) => ({ text: '길가 주막에서 할머니가 가마솥에 국밥을 말고 있다.\n\n“아이고, 고생이 많구먼. 뭐라도 들고 가.”', choices: [
      { label: '[국밥 한 그릇] 엽전 25', hint: '체력 18 회복, 최대 체력 +3', disabled: run.gold < 25, go(run) { run.gold -= 25; run.maxHp += 3; R.heal(run, 21); return { text: '뜨끈한 국물이 속을 데운다. 힘이 솟는다. (최대 체력 +3)' }; } },
      { label: '[막걸리 한 사발] 엽전 12', hint: '카드 「막걸리 한 사발」', disabled: run.gold < 12, go(run) { run.gold -= 12; R.addCard(run, 'n_makgeolli'); return { text: '“한 사발 더 싸 가.” 할머니가 호리병에 막걸리를 채워 준다.' }; } },
      { label: '[옛날이야기를 듣는다]', hint: '체력 6 회복', go(run) { R.heal(run, 6); return { text: '“옛날 옛적에…” 할머니의 이야기를 듣다 깜빡 졸았다. 개운하다.' }; } },
    ] }),
  } });

  V('snail', { name: '우렁각시', acts: [1, 2], img: 'ev_snail', stages: {
    start: () => ({ text: '논두렁에서 커다란 우렁이를 주워 물항아리에 넣어 두었다. 그날 밤부터 누군가 따뜻한 밥상을 차려 놓고 사라진다…', choices: [
      { label: '[항아리째 데려간다]', hint: '신물 「우렁이 항아리」', go(run) { R.addRelic(run, 'r_snail_jar'); return { text: '항아리를 등에 졌다. 어쩐지 든든하다.' }; } },
      { label: '[몰래 지켜본다]', hint: '???', go(run) { if (rnd(run).chance(0.5)) { const up = upgradeRandom(run, 2); return { text: `우렁각시가 부끄러워하며 부적을 손봐 주고 떠났다.\n\n강화: ${fmtList(up)}` }; } R.heal(run, 10); return { text: '들킨 우렁각시가 놀라 사라졌다. 남은 밥상으로 배를 채웠다. (체력 +10)' }; } },
      { label: '[우렁이를 놓아준다]', hint: '체력 8 회복', go(run) { R.heal(run, 8); return { text: '우렁이를 냇가에 놓아주었다. 마음이 가볍다. (체력 +8)' }; } },
    ] }),
  } });

  V('magpie', { name: '오작교', acts: [2, 3], img: 'ev_magpie', stages: {
    start: (run) => ({ text: '칠석날 밤, 까치와 까마귀가 몰려와 은하수에 다리를 놓았다. 견우와 직녀가 다리 위에서 눈물을 흘린다.', choices: [
      { label: '[다리를 함께 건넌다]', hint: '카드 1장 없애기', go() { return { deck: { mode: 'remove', count: 1, title: '내려놓을 카드' }, text: '다리를 건너며 무거운 마음 하나를 내려놓았다.' }; } },
      { label: '[까치에게 먹이를 준다] 엽전 30', hint: '신물 「오작교 깃털」', disabled: run.gold < 30, go(run) { run.gold -= 30; R.addRelic(run, 'r_magpie_bridge'); return { text: '배부른 까치가 깃털 하나를 떨구고 날아갔다.' }; } },
      { label: '[바라만 본다]', hint: '체력 7 회복', go(run) { R.heal(run, 7); return { text: '눈물이 비가 되어 내린다. 마음이 맑아진다. (체력 +7)' }; } },
    ] }),
  } });

  V('turtle', { name: '별주부의 꼬드김', acts: [2], img: 'ev_turtle', stages: {
    start: () => ({ text: '바닷가에서 자라가 말을 걸어 온다.\n\n“용궁에 가면 벼슬도 주고 보물도 준다오. 다만… 간을 잠시 맡겨 두셔야 하오.”', choices: [
      { label: '[용궁에 간다]', hint: '최대 체력 -7, 희귀 신물', go(run) { run.maxHp -= 7; run.hp = Math.min(run.hp, run.maxHp); return { text: `용왕 앞에서 “간은 뭍에 두고 왔소!” 둘러대고는 보물 하나를 챙겨 빠져나왔다. 기운이 조금 빠졌다.\n\n신물 「${gainRelic(run, 'rare')}」.` }; } },
      { label: '[되레 꾀를 낸다]', hint: '???', go(run) { if (rnd(run).chance(0.5)) { const g = gold(run, 80); return { text: `“용궁 지도부터 보여 주시오.” 자라가 허둥대다 엽전 주머니를 떨구고 달아났다. (엽전 +${g})` }; } R.loseHp(run, 9); return { text: '자라가 성을 내며 정강이를 물고 늘어졌다. (체력 -9)' }; } },
      { label: '[거절한다]', hint: '', go() { return { text: '간은 소중하니까.' }; } },
    ] }),
  } });

  V('jangseung', { name: '장승', acts: [1], img: 'ev_jangseung', stages: {
    start: (run) => ({ text: '마을 입구에 천하대장군과 지하여장군이 나란히 서서 길손을 굽어본다.', choices: [
      { label: '[천하대장군께 절한다]', hint: '공격 카드 2장 강화', go(run) { const up = upgradeRandom(run, 2, (d) => d.type === 'atk'); return { text: `장승의 부릅뜬 눈에서 기운이 흘러든다.\n\n강화: ${fmtList(up)}` }; } },
      { label: '[지하여장군께 절한다]', hint: '술법 카드 2장 강화', go(run) { const up = upgradeRandom(run, 2, (d) => d.type === 'skill'); return { text: `온화한 기운이 부적을 감싼다.\n\n강화: ${fmtList(up)}` }; } },
      { label: '[두 장승께 공양한다] 엽전 45', hint: '신물 「장승의 축복」', disabled: run.gold < 45, go(run) { run.gold -= 45; R.addRelic(run, 'r_jangseung'); return { text: '두 장승이 고개를 끄덕인 것만 같다.' }; } },
    ] }),
  } });

  V('sansin', { name: '산신령과 호랑이', acts: [2], img: 'ev_sansin', stages: {
    start: () => ({ text: '구름 낀 산마루, 호랑이를 거느린 산신령이 소나무 아래 앉아 있다.\n\n“무엇을 내어놓고 무엇을 얻겠느냐?”', choices: [
      { label: '[카드를 바친다]', hint: '카드 1장을 다른 카드로 바꾼다', go() { return { deck: { mode: 'transform', count: 1, title: '바칠 카드' }, text: '산신령이 부적을 쓰다듬자 글자가 바뀌어 간다.' }; } },
      { label: '[피를 바친다]', hint: '체력 -12, 희귀 카드 1장', go(run) { R.loseHp(run, 12); const pool = JG.cardPool(run.char, (d) => d.rar === 'rare'); const d = rnd(run).pick(pool); R.addCard(run, d.id); return { text: `호랑이가 으르렁대며 손끝을 할퀴었다. 흐른 피가 부적이 된다.\n\n카드 「${d.name}」을 얻었다.` }; } },
      { label: '[절만 하고 떠난다]', hint: '체력 5 회복', go(run) { R.heal(run, 5); return { text: '“허허, 욕심이 없구나.” 산바람이 시원하다.' }; } },
    ] }),
  } });

  V('bari', { name: '바리공주', acts: [3], img: 'ev_bari', stages: {
    start: () => ({ text: '황천 어귀, 무녀 옷을 입은 공주가 등불을 들고 망자들을 이끌고 있다. 바리공주다.\n\n“산 사람이 여기까지 왔구나. 무엇을 나눠 줄까?”', choices: [
      { label: '[생명수를 마신다]', hint: '체력 모두 회복', go(run) { run.hp = run.maxHp; return { text: '서천 꽃밭의 물이 온몸을 적신다. 상처가 씻은 듯 낫는다.' }; } },
      { label: '[생명꽃을 받는다]', hint: '신물 「생명꽃」(한 번 되살아남)', go(run) { R.addRelic(run, 'r_bari_flower'); return { text: '“꼭 살아서 돌아가거라.”' }; } },
      { label: '[망자의 길을 돕는다]', hint: '카드 1장 없애기, 엽전 +50', go(run) { gold(run, 50); return { deck: { mode: 'remove', count: 1, title: '함께 보낼 카드' }, text: '망자들과 함께 걸으며 짐 하나를 맡겼다. 공주가 노잣돈을 쥐여 준다.' }; } },
    ] }),
  } });

  V('wrestle', { name: '도깨비 씨름판', acts: [1, 2, 3], img: 'ev_wrestle', stages: {
    start: () => ({ text: '달밤의 공터에서 도깨비들이 씨름판을 벌였다.\n\n“한 판 붙자! 이기면 엽전, 지면… 히히.”', choices: [
      { label: '[샅바를 잡는다]', hint: '이기면 엽전 +80, 지면 체력 -12', go(run) { if (rnd(run).chance(0.55)) { const g = gold(run, 80); return { text: `안다리걸기 한 방에 도깨비가 나동그라졌다! (엽전 +${g})` }; } R.loseHp(run, 12); return { text: '도깨비 힘이 장사다. 모래판에 처박혔다. (체력 -12)' }; } },
      { label: '[구경만 한다]', hint: '엽전 +15', go(run) { const g = gold(run, 15); return { text: `흥이 오른 도깨비들이 구경꾼에게도 엽전을 던져 준다. (엽전 +${g})` }; } },
      { label: '[판을 엎는다]', hint: '전투. 이기면 「도깨비 주머니」', go() { return { combat: { enemies: ['imp', 'imp'], kind: 'normal' }, after: { relicId: 'r_dok_pouch' } }; } },
    ] }),
  } });

  V('gut', { name: '큰 굿판', acts: [1, 2, 3], img: 'ev_gut', stages: {
    start: (run) => ({ text: '마을에서 큰 굿판이 벌어졌다. 장구 소리에 맞춰 무당이 작두를 탄다. 이 기운이라면 무엇이든 씻어낼 수 있을 것 같다.', choices: [
      { label: '[부정을 씻는다]', hint: '저주 카드 1장 없애기', disabled: !hasCurse(run), go() { return { deck: { mode: 'removeCurse', count: 1, title: '씻어낼 저주' }, text: '무당의 방울 소리에 묵은 업이 흩어진다.' }; } },
      { label: '[복을 빈다] 엽전 40', hint: '카드 1장 강화, 체력 10 회복', disabled: run.gold < 40, go(run) { run.gold -= 40; R.heal(run, 10); return { deck: { mode: 'upgrade', count: 1, title: '복을 받을 카드' }, text: '복채를 올리자 무당이 부적에 축원을 불어넣는다.' }; } },
      { label: '[함께 춤춘다]', hint: '무작위 카드 2장 강화, 체력 -5', go(run) { R.loseHp(run, 5); const up = upgradeRandom(run, 2); return { text: `밤새 덩실덩실 춤을 추었다. 다리가 후들거리지만 부적에 신명이 깃들었다.\n\n강화: ${fmtList(up)}` }; } },
    ] }),
  } });

  V('ghostbride', { name: '처녀귀신의 한', acts: [2, 3], img: 'ev_ghostbride', stages: {
    start: (run) => ({ text: '버드나무 아래 흰 소복의 여인이 울고 있다.\n\n“억울하게 죽은 내 사연을 들어 주오…”', choices: [
      { label: '[사연을 들어준다]', hint: '체력 -6, 고급 신물', go(run) { R.loseHp(run, 6); return { text: `밤새 사연을 들어 주자 귀신이 고운 물건 하나를 남기고 사라졌다. 한기가 뼛속까지 스몄다.\n\n신물 「${gainRelic(run, 'uncommon')}」.` }; } },
      { label: '[제사를 지내 준다] 엽전 50', hint: '카드 1장 없애기, 체력 10 회복', disabled: run.gold < 50, go(run) { run.gold -= 50; R.heal(run, 10); return { deck: { mode: 'remove', count: 1, title: '함께 태워 보낼 카드' }, text: '정성껏 제사를 지내 주자 여인이 미소 지으며 사라졌다.' }; } },
      { label: '[퇴마한다]', hint: '전투. 이기면 신물', go() { return { combat: { enemies: ['eggghost', 'waterghost'], kind: 'normal' }, after: { relic: true } }; } },
    ] }),
  } });

  V('foxbead', { name: '여우구슬', acts: [1, 2], img: 'ev_foxbead', stages: {
    start: () => ({ text: '달밤의 숲길, 고운 처녀가 다가와 입을 맞추려 한다. 입속에서 영롱한 구슬이 반짝인다. 여우다!', choices: [
      { label: '[구슬을 삼킨다]', hint: '신물 「여우구슬」, 최대 체력 -4', go(run) { run.maxHp -= 4; run.hp = Math.min(run.hp, run.maxHp); R.addRelic(run, 'r_fox_bead'); return { text: '구슬을 꿀꺽 삼키자 하늘과 땅의 이치가 어렴풋이 보인다.' }; } },
      { label: '[부적을 던진다]', hint: '???', go(run) { if (rnd(run).chance(0.5)) { R.addCard(run, 'n_fox_bead'); return { text: '부적에 맞은 여우가 구슬을 떨구고 달아났다. 카드 「여우구슬」을 얻었다.' }; } R.loseHp(run, 8); return { text: '여우가 할퀴고 달아났다. (체력 -8)' }; } },
      { label: '[도망친다]', hint: '', go() { return { text: '뒤도 돌아보지 않고 달렸다.' }; } },
    ] }),
  } });

  V('river', { name: '삼도천 나룻배', acts: [3], img: 'ev_river', stages: {
    start: (run) => ({ text: '검은 강가에 나룻배 한 척. 뱃사공이 앙상한 손을 내민다.\n\n“뱃삯을 내시오. 아니면 헤엄쳐 건너든가.”', choices: [
      { label: '[뱃삯을 낸다] 엽전 50', hint: '체력 12 회복, 약 1개', disabled: run.gold < 50, go(run) { run.gold -= 50; R.heal(run, 12); const p = R.randomPotion(run); const ok = R.addPotion(run, p); return { text: `편안히 강을 건넜다. 사공이 말없이 약 하나를 건넨다.${ok ? `\n\n약 「${D.potions[p].name}」.` : ' (약 주머니가 가득 차 받지 못했다)'}` }; } },
      { label: '[헤엄쳐 건넌다]', hint: '체력 -12, 카드 1장 강화', go(run) { R.loseHp(run, 12); return { deck: { mode: 'upgrade', count: 1, title: '강물에 씻을 카드' }, text: '얼음장 같은 강물에 정신이 번쩍 든다.' }; } },
      { label: '[사공을 쓰러뜨린다]', hint: '전투. 이기면 엽전을 많이', go() { return { combat: { enemies: ['ferryman'], kind: 'normal' }, after: { gold: 90 } }; } },
    ] }),
  } });

  V('court', { name: '저승 재판', acts: [3], img: 'ev_court', stages: {
    start: (run) => ({ text: '저승의 재판정. 거대한 업경대가 지난 걸음을 비춘다. 판관이 붓을 든다.\n\n“죄를 고하라.”', choices: [
      { label: '[죄를 고백한다]', hint: '저주를 모두 없앤다, 최대 체력 -4', disabled: !hasCurse(run), go(run) { const n = run.deck.filter((c) => D.cards[c.id].type === 'curse').length; run.deck = run.deck.filter((c) => D.cards[c.id].type !== 'curse'); run.maxHp -= 4; run.hp = Math.min(run.hp, run.maxHp); return { text: `판관이 명부의 몇 줄을 지웠다. 저주 ${n}장이 사라졌다.` }; } },
      { label: '[판관에게 뇌물을 바친다] 엽전 90', hint: '희귀 신물', disabled: run.gold < 90, go(run) { run.gold -= 90; return { text: `판관이 헛기침을 하며 소매 속에서 무언가를 꺼내 준다.\n\n신물 「${gainRelic(run, 'rare')}」.` }; } },
      { label: '[당당히 맞선다]', hint: '???', go(run) { if (rnd(run).chance(0.5)) { const up = upgradeRandom(run, 3); return { text: `“허허, 담이 크구나.” 판관이 붓을 내려놓는다.\n\n강화: ${fmtList(up)}` }; } R.addCard(run, 'x_shackle'); return { text: '“괘씸하구나!” 발목에 족쇄가 채워졌다. 저주 「족쇄」.' }; } },
    ] }),
  } });

  V('ginseng', { name: '심봤다!', acts: [1, 2], img: 'ev_ginseng', stages: {
    start: (run) => ({ text: '이끼 낀 바위 틈에서 은은히 빛나는 뿌리를 발견했다. 산삼이다!', choices: [
      { label: '[조심스레 캔다]', hint: '약 「산삼」', disabled: run.potions.indexOf(null) < 0, go(run) { R.addPotion(run, 'p_ginseng'); return { text: '잔뿌리 하나 다치지 않게 캐냈다.' }; } },
      { label: '[그 자리에서 먹는다]', hint: '최대 체력 +6, 체력 6 회복', go(run) { run.maxHp += 6; R.heal(run, 12); return { text: '쌉싸름한 맛 뒤로 힘이 솟는다.' }; } },
      { label: '[내다 팔 궁리를 한다]', hint: '엽전 +85', go(run) { const g = gold(run, 85); return { text: `지나가던 약초꾼이 두말없이 값을 쳐 주었다. (엽전 +${g})` }; } },
    ] }),
  } });

  V('toad', { name: '콩쥐와 두꺼비', acts: [1, 2], img: 'ev_toad', stages: {
    start: () => ({ text: '밑 빠진 독에 물을 채우느라 울던 소녀 곁에 커다란 두꺼비가 나타나 독의 구멍을 막아 준다.', choices: [
      { label: '[소녀를 돕는다]', hint: '체력 -5, 카드 1장 없애기', go(run) { R.loseHp(run, 5); return { deck: { mode: 'remove', count: 1, title: '독에 담아 버릴 카드' }, text: '물을 길어 나르느라 녹초가 됐지만 마음은 가볍다.' }; } },
      { label: '[두꺼비에게 부탁한다]', hint: '무작위 약 2개', go(run) { const got = []; for (let i = 0; i < 2; i++) { const p = R.randomPotion(run); if (R.addPotion(run, p)) got.push(D.potions[p].name); } return { text: `두꺼비가 개굴 하더니 독 밑에서 약병을 꺼내 준다.\n\n${got.length ? '약: ' + fmtList(got) : '약 주머니가 가득 차서 받지 못했다.'}` }; } },
      { label: '[지나간다]', hint: '', go() { return { text: '두꺼비가 있으니 괜찮겠지.' }; } },
    ] }),
  } });

  V('bridge', { name: '돌다리', acts: [2, 3], img: 'ev_bridge', stages: {
    start: () => ({ text: '안개 낀 골짜기 위 낡은 돌다리. 비석에 이렇게 새겨져 있다.\n\n“돌다리도 두들겨 보고 건너라.”', choices: [
      { label: '[두들겨 보며 건넌다]', hint: '체력 5 회복', go(run) { R.heal(run, 5); return { text: '한 걸음 한 걸음, 숨을 고르며 건넜다.' }; } },
      { label: '[단숨에 뛰어 건넌다]', hint: '???', go(run) { if (rnd(run).chance(0.6)) { const g = gold(run, 60); return { text: `반대편에 누군가 흘린 엽전 주머니가! (엽전 +${g})` }; } R.loseHp(run, 10); return { text: '돌 하나가 무너져 발을 헛디뎠다. (체력 -10)' }; } },
      { label: '[다리 밑을 살핀다]', hint: '보물… 혹은 물귀신', go(run) { if (rnd(run).chance(0.4)) return { text: `다리 밑 돌 틈에 보물이 숨겨져 있었다. 신물 「${gainRelic(run, 'common')}」.` }; return { combat: { enemies: ['waterghost', 'waterghost'], kind: 'normal' }, after: {} }; } },
    ] }),
  } });

  V('well', { name: '달 두 개 비친 우물', acts: [2, 3], img: 'ev_well', stages: {
    start: (run) => ({ text: '폐허가 된 마을의 오래된 우물. 들여다보니 달이 두 개 비친다.', choices: [
      { label: '[엽전을 던진다] 엽전 30', hint: '카드 1장을 다른 카드로 바꾼다', disabled: run.gold < 30, go(run) { run.gold -= 30; return { deck: { mode: 'transform', count: 1, title: '바꿀 카드' }, text: '퐁당. 물결이 일며 부적의 글자가 일렁인다.' }; } },
      { label: '[두레박을 내린다]', hint: '???', go(run) { if (rnd(run).chance(0.55)) { const p = R.randomPotion(run); const ok = R.addPotion(run, p); return { text: ok ? `두레박에 약병 하나가 걸려 올라왔다. 약 「${D.potions[p].name}」.` : '약병이 올라왔지만 담을 곳이 없다.' }; } R.addCard(run, 'x_regret'); return { text: '두레박 가득 누군가의 미련이 길어 올려졌다. 저주 「미련」.' }; } },
      { label: '[우물 속 달을 건진다]', hint: '체력 -6, 카드 1장 복제', go(run) { R.loseHp(run, 6); return { deck: { mode: 'duplicate', count: 1, title: '복제할 카드' }, text: '차가운 물에 손을 담그자 달빛이 부적 한 장을 비춘다.' }; } },
    ] }),
  } });

  V('peddler', { name: '보부상', acts: [1, 2, 3], img: 'ev_peddler', stages: {
    start: (run) => ({ text: '등짐을 진 보부상이 길가에서 쉬고 있다.\n\n“이보시오, 좋은 물건 있소!”', choices: [
      { label: '[카드를 판다]', hint: '카드 1장 없애기, 엽전 +35', go(run) { gold(run, 35); return { deck: { mode: 'remove', count: 1, title: '팔 카드' }, text: '보부상이 부적을 이리저리 살피더니 엽전을 세어 준다.' }; } },
      { label: '[수상한 꾸러미를 산다] 엽전 60', hint: '???', disabled: run.gold < 60, go(run) { run.gold -= 60; if (rnd(run).chance(0.7)) return { text: `꾸러미 안에서 신물이 나왔다! 「${gainRelic(run, 'common')}」.` }; return { text: '꾸러미 안에는 돌멩이만 가득했다. 보부상은 이미 저만치 가고 없다.' }; } },
      { label: '[길을 묻는다]', hint: '체력 3 회복', go(run) { R.heal(run, 3); return { text: '“다음 장터가 멀지 않소.” 보부상이 물 한 바가지를 건넨다.' }; } },
    ] }),
  } });
})();
