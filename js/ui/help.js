'use strict';
// 도움말: 오행도, 상태 효과, 여정, 조작
(function () {
  const h = UI.h;
  const NS = 'http://www.w3.org/2000/svg';

  function wuxingSvg() {
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '-170 -170 340 340');
    svg.setAttribute('width', '340');
    svg.setAttribute('height', '340');
    const pos = JG.EL.map((e, i) => { const a = -Math.PI / 2 + i * 2 * Math.PI / 5; return { x: Math.cos(a) * 118, y: Math.sin(a) * 118 }; });
    const shrink = (a, b, k) => ({ x1: a.x + (b.x - a.x) * k, y1: a.y + (b.y - a.y) * k, x2: b.x - (b.x - a.x) * k, y2: b.y - (b.y - a.y) * k });
    let html = '<defs><marker id="hg" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="#f0d68a"/></marker>'
      + '<marker id="hr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="#c33a29"/></marker></defs>';
    for (let i = 0; i < 5; i++) {
      const a = pos[i], b = pos[(i + 1) % 5];
      const s = shrink(a, b, 0.2);
      html += `<path d="M${s.x1} ${s.y1} Q${(a.x + b.x) * 0.62} ${(a.y + b.y) * 0.62} ${s.x2} ${s.y2}" stroke="#f0d68a" stroke-width="3" fill="none" marker-end="url(#hg)"/>`;
    }
    for (let i = 0; i < 5; i++) {
      const s = shrink(pos[i], pos[(i + 2) % 5], 0.17);
      html += `<line x1="${s.x1}" y1="${s.y1}" x2="${s.x2}" y2="${s.y2}" stroke="#c33a29" stroke-width="2" stroke-dasharray="6 5" marker-end="url(#hr)"/>`;
    }
    JG.EL.forEach((e, i) => {
      const info = JG.ELINFO[e];
      html += `<circle cx="${pos[i].x}" cy="${pos[i].y}" r="28" fill="#1c1512" stroke="${info.color}" stroke-width="4"/>`
        + `<text x="${pos[i].x}" y="${pos[i].y + 9}" text-anchor="middle" font-size="26" font-weight="900" font-family="Noto Serif KR, Gungsuh, serif" fill="${info.color}">${info.hanja}</text>`
        + `<text x="${pos[i].x}" y="${pos[i].y + 48}" text-anchor="middle" font-size="14" fill="#dccba2">${info.name} · ${info.guard}</text>`;
    });
    svg.innerHTML = html;
    return svg;
  }

  UI.screens.help = function () {
    UI.infoScreen('도움말', ['오행과 연계', '상태 효과', '여정', '조작'], (body, tab) => {
      const sec = (t, ...kids) => h('div', { class: 'lacq', style: { padding: '16px 20px', marginBottom: '14px', borderRadius: '3px' } }, h('div', { class: 'sub-h', style: { marginBottom: '8px' } }, t), ...kids);
      const p = (html) => h('p', { style: { margin: '6px 0', lineHeight: 1.7, fontSize: '15.5px' }, html: UI.kwHtml(html) });
      if (tab === 0) {
        const wrap = h('div', { style: { display: 'grid', gridTemplateColumns: '370px 1fr', gap: '22px', alignItems: 'start' } });
        wrap.appendChild(h('div', { class: 'lacq', style: { padding: '12px', display: 'grid', placeItems: 'center', gap: '6px' } }, wuxingSvg(),
          h('div', { style: { fontSize: '13px', color: 'var(--paper-2)', textAlign: 'center' } }, '금빛 화살표 = 상생(이어짐) · 붉은 점선 = 상극(이김)')));
        wrap.appendChild(h('div', null,
          sec('연계', p('카드에는 목·화·토·금·수 다섯 원소가 있습니다. 직전에 쓴 카드 원소에서 <b>상생 화살표</b>를 따라 다음 원소 카드를 쓰면 연계가 이어집니다. 2단계부터 카드 아래쪽의 「연계:」 효과가 함께 터집니다.'),
            p('이어질 카드는 손패에서 금빛으로 빛나고, 왼쪽 아래 오각형에 다음 원소가 표시됩니다. 무(無) 카드는 연계를 끊지도 잇지도 않고, 오색 카드는 어디에든 이어집니다.')),
          sec('오행순환', p('한 턴에 다섯 원소를 끊김 없이 이어 5단계에 이르면 <b>오행순환</b>! 기력 +1, 카드 1장, 모든 적에게 피해 6. 10단계·15단계에서도 다시 터집니다.')),
          sec('약점', p('적 이름 옆 동그라미가 그 적의 원소입니다. 그 원소를 <b>이기는 원소(상극)</b>로 공격하면 피해가 1.5배입니다. 목극토 · 토극수 · 수극화 · 화극금 · 금극목. 공격 카드를 고르면 약점을 찌를 수 있는 적에게 「약점!」 도장이 찍힙니다.'))));
        body.appendChild(wrap);
      } else if (tab === 1) {
        const grid = h('div', { class: 'dex-grid' });
        for (const id of ['sharp', 'edge', 'sturdy', 'thorns', 'regen', 'burn', 'chill', 'crack', 'stun', 'bedrock', 'phantom', 'frenzy', 'fury', 'wisp']) {
          const sd = JG.D.statuses[id];
          grid.appendChild(h('div', { class: 'dex-item' }, h('div', { class: 'ic', style: { fontFamily: 'var(--f-hanja)', fontWeight: 900, color: sd.kind === 'debuff' ? '#ff9e8c' : '#c9f0c0' } }, sd.icon), h('div', null, h('div', { class: 't' }, sd.name), h('div', { class: 'd' }, sd.desc('N')))));
        }
        body.appendChild(sec('상태 효과', grid));
        body.appendChild(sec('카드 키워드', ...['소멸', '보존', '휘발', '선천', '마무리'].map((k) => p(`<b>${k}</b> — ${UI.KW[k]}`))));
      } else if (tab === 2) {
        body.appendChild(sec('여정의 흐름', p('세 막(달 없는 마을 → 안개 숲 폐사찰 → 황천길)을 지나 흑운귀왕을 쓰러뜨리면 승리합니다. 막마다 갈림길 지도를 따라 13층을 오르고 보스와 싸웁니다.'),
          p('전투에서 이기면 엽전과 카드 보상, 때로는 약을 얻습니다. 강적을 이기면 신물도 얻습니다. 보스를 쓰러뜨리면 보스 신물 3개 중 하나를 고르고, 체력을 크게 회복한 채 다음 막으로 넘어갑니다.')));
        body.appendChild(sec('지도의 칸', ...[['戰', '전투', '평범한 요괴와 싸웁니다.'], ['鬼', '강적', '강한 요괴. 이기면 신물.'], ['?', '사건', '설화 속 사건. 위험과 보상이 함께 있습니다.'], ['酒', '주막', '쉬어서 체력 30% 회복, 또는 카드 1장 정련(강화).'], ['市', '장터', '카드·신물·약을 사고, 카드를 없앨 수 있습니다.'], ['寶', '보물', '신물이 든 상자.']].map(([hz, n, d]) => p(`<b style="font-family:var(--f-hanja);color:var(--cinnabar)">${hz}</b> <b>${n}</b> — ${d}`))));
        body.appendChild(sec('부적사', ...Object.values(JG.D.chars).map((c) => p(`<b>${c.title} ${c.name}</b> — ${c.blurb} <span style="color:var(--brass)">(${c.style})</span>`))));
        body.appendChild(sec('업보와 모드', p('승리할 때마다 그 부적사의 다음 업보(난이도)가 열립니다. 한 번 승리하면 끝없이 내려가는 <b>무한 저승</b>도 열립니다. <b>일일 도전</b>은 날마다 바뀌는 규칙으로 점수를 겨룹니다.')));
      } else {
        body.appendChild(sec('마우스·터치', p('카드를 눌러 고른 뒤 적을 누르면 사용합니다. 카드를 적에게 끌어다 놓아도 됩니다. 대상이 없는 카드는 한 번 더 누르거나 위로 끌어 올리면 사용합니다.'),
          p('오른쪽 클릭이나 빈 곳을 누르면 고르기를 취소합니다. 무엇이든 마우스를 올리면(터치는 길게 누르면) 설명이 나옵니다.')));
        body.appendChild(sec('키보드', p('<b>1~0</b> 카드 고르기 · <b>←/→, Tab</b> 대상 바꾸기 · <b>Enter/Space</b> 사용 · <b>E</b> 턴 종료 · <b>D</b> 덱 보기 · <b>M</b> 지도 · <b>Esc</b> 취소/메뉴')));
        body.appendChild(sec('저장', p('방에 들어갈 때마다 자동으로 저장됩니다. 전투 도중 끄면, 다시 켰을 때 그 전투를 처음부터 다시 시작합니다.')));
      }
    });
  };
})();
