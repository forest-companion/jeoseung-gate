'use strict';
// 상태 효과(버프·디버프) 정의. 수치가 0이 되면 사라짐.
// kind: buff | debuff | power(비전 카드가 남기는 지속 효과)
// decay: 'turnEnd'(내 턴 끝에 1 감소) | 'turnStart' | null
(function () {
  const S = JG.defStatus;
  S('sharp', { name: '예리', icon: '⚔', kind: 'buff', neg: true, desc: (n) => n >= 0 ? `공격 피해가 ${n} 증가합니다.` : `공격 피해가 ${-n} 감소합니다.` });
  S('sturdy', { name: '견고', icon: '⛨', kind: 'buff', neg: true, desc: (n) => n >= 0 ? `방어를 얻을 때 ${n} 더 얻습니다.` : `방어를 얻을 때 ${-n} 덜 얻습니다.` });
  S('thorns', { name: '가시', icon: '❋', kind: 'buff', desc: (n) => `공격받을 때마다 공격한 대상에게 ${n} 피해를 줍니다.` });
  S('regen', { name: '재생', icon: '✚', kind: 'buff', desc: (n) => `턴이 끝날 때 체력을 ${n} 회복하고, 재생이 1 줄어듭니다.` });
  S('burn', { name: '화상', icon: '火', kind: 'debuff', desc: (n) => `턴이 시작될 때 ${n} 피해를 받고(방어 무시), 화상이 1 줄어듭니다.` });
  S('chill', { name: '냉기', icon: '❄', kind: 'debuff', decay: 'turnEnd', desc: (n) => `주는 공격 피해가 25% 줄어듭니다. (${n}턴)` });
  S('crack', { name: '균열', icon: '◈', kind: 'debuff', decay: 'turnEnd', desc: (n) => `받는 공격 피해가 50% 늘어납니다. (${n}번의 적 차례 / 내가 건 경우 ${n}턴)` });
  S('edge', { name: '칼끝', icon: '刃', kind: 'buff', desc: (n) => `이번 턴 동안 공격 피해가 ${n} 증가합니다.` });
  S('stun', { name: '기절', icon: '✷', kind: 'debuff', desc: () => `다음 행동을 하지 못합니다.` });
  S('bedrock', { name: '반석', icon: '⛰', kind: 'buff', flag: true, desc: () => `방어가 턴 시작에 사라지지 않습니다.` });
  S('frenzy', { name: '광분', icon: '☄', kind: 'buff', desc: (n) => `턴이 끝날 때 예리를 ${n} 얻습니다.` });
  S('phantom', { name: '허상', icon: '◌', kind: 'buff', decay: 'turnEnd', desc: (n) => `공격을 받을 때 피해가 1회당 1로 줄어듭니다. (${n}턴)` });
  S('fury', { name: '기세', icon: '勢', kind: 'buff', desc: (n) => `기세 ${n}. 마무리 기술이 기세를 써서 강해집니다.` });
  S('wisp', { name: '도깨비불', icon: '燐', kind: 'buff', desc: (n) => `도깨비불 ${n}개. 턴이 끝날 때 하나마다 무작위 적에게 4 피해(최대 10개). 터뜨리는 카드로 한꺼번에 쓸 수 있습니다.` });
  // 적 전용 표식
  S('countdown', { name: '명부', icon: '冊', kind: 'buff', desc: (n) => `${n}턴 뒤 명부를 집행합니다!` });
  S('ironEater', { name: '쇠붙이 먹기', icon: '鐵', kind: 'buff', flag: true, desc: () => `당신이 금(金) 카드를 쓸 때마다 방어 4를 얻고, 3장째마다 예리 1을 얻습니다.` });
  S('fireproof', { name: '불 먹는 짐승', icon: '獬', kind: 'buff', flag: true, desc: () => `화(火) 원소 공격의 피해를 절반만 받습니다. 화상에 걸리지 않습니다.` });
  S('rage', { name: '격노', icon: '怒', kind: 'buff', desc: (n) => `당신이 술법 카드를 쓸 때마다 예리를 ${n} 얻습니다.` });
  S('reflect', { name: '업보 비춤', icon: '鏡', kind: 'buff', desc: (n) => `당신이 공격 카드를 쓸 때마다 당신에게 ${n} 피해를 돌려줍니다.` });
  S('revive', { name: '되살아남', icon: '魂', kind: 'buff', flag: true, desc: () => `처음 쓰러질 때 체력 절반으로 다시 일어납니다. 화(火) 공격으로 쓰러지면 되살아나지 못합니다.` });
  S('thief', { name: '도둑', icon: '錢', kind: 'buff', desc: (n) => `엽전 ${n}을 훔쳤습니다. 처치하면 되찾습니다.` });
  S('devour', { name: '탐식', icon: '餓', kind: 'buff', desc: (n) => `카드 ${n}장을 삼켰습니다. 쓰러뜨리면 되돌려받습니다.` });
})();
