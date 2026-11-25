'use strict';
// 부적 카드 그리기와 설명문(실제 수치 반영)
(function () {
  const D = JG.D;
  const TYPE = { atk: '공 격', skill: '술 법', power: '비 전', status: '상 태', curse: '저 주' };
  UI.TYPE_NAME = { atk: '공격', skill: '술법', power: '비전', status: '상태', curse: '저주' };
  UI.RAR_NAME = { basic: '기본', common: '일반', uncommon: '고급', rare: '희귀', special: '특수', curse: '저주' };
  UI.elColor = (el) => (JG.ELINFO[el] || JG.ELINFO.none).color;

  // 카드 설명문 → HTML. g(전투)와 target 이 있으면 실제 피해/방어 수치로 바꿔 보여 준다.
  UI.cardTextHtml = function (c, g, target) {
    const d = D.cards[c.id];
    const val = (key) => JG.cardVal(c, key);
    const baseVal = (key) => { const v = d.v ? d.v[key] : 0; return v === undefined ? 0 : v; };
    const fmt = (tpl) => {
      if (!tpl) return '';
      let s = tpl.replace(/\{([DB]):?([a-zA-Z]*)\}|\{([a-zA-Z]+)\}/g, (m, kind, k1, k2) => {
        if (kind === 'D') {
          const key = k1 || 'dmg';
          const raw = val(key);
          let shown = raw;
          if (g) shown = g.previewAtk(raw, target || null, target ? (d.el === 'wild' ? null : d.el) : undefined);
          const cls = shown > raw ? 'up-val' : shown < raw ? 'down-val' : (c.up && d.vu && d.vu[key] !== undefined && d.vu[key] !== baseVal(key) ? 'up-val' : '');
          return `<span class="num-d ${cls}">${shown}</span>`;
        }
        if (kind === 'B') {
          const key = k1 || 'blk';
          const raw = val(key);
          const shown = g ? g.previewBlock(raw) : raw;
          const cls = shown > raw ? 'up-val' : shown < raw ? 'down-val' : (c.up && d.vu && d.vu[key] !== undefined && d.vu[key] !== baseVal(key) ? 'up-val' : '');
          return `<span class="num-b ${cls}">${shown}</span>`;
        }
        const key = k2;
        const v = val(key);
        const upd = c.up && d.vu && d.vu[key] !== undefined && d.vu[key] !== baseVal(key);
        const grown = c.bonus && c.bonus[key];
        return `<span class="${upd || grown ? 'up-val' : ''}">${v}</span>`;
      });
      return UI.kwHtml(s).replace(/<span class="kw" data-kw="([^"]+)">([^<]+)<\/span>/g, (m, a, b) => `<span class="kw" data-kw="${a}">${b}</span>`);
    };
    let html = `<div class="main">${fmt(d.text)}</div>`;
    if (d.chain) html += `<div class="ch"><b>연계</b>: ${fmt(d.chain)}</div>`;
    return html;
  };
  // 툴팁용 순수 텍스트(키워드 설명 포함)
  UI.cardTipHtml = function (c) {
    const d = D.cards[c.id];
    const kws = new Set();
    const text = (d.text || '') + ' ' + (d.chain || '');
    for (const k of Object.keys(UI.KW)) if (text.includes(k)) kws.add(k);
    for (const s of Object.values(D.statuses)) if (text.includes(s.name)) kws.add(s.name);
    if (d.chain) kws.add('연계');
    if (d.el === 'wild') kws.add('오색');
    const parts = [...kws].map((k) => `<div class="tt-sec">${UI.kwTip(k)}</div>`);
    return parts.join('');
  };

  UI.cardCostText = (c) => { const d = D.cards[c.id]; if (d.unplayable) return ''; const b = JG.baseCost(c); return b === 'X' ? 'X' : String(b); };

  // 카드 요소 만들기
  UI.cardEl = function (c, opts) {
    opts = opts || {};
    const d = D.cards[c.id];
    const el = UI.h('div', { class: `card t-${d.type} el-${d.el} rar-${d.rar}${c.up ? ' up' : ''}${opts.static ? ' static' : ''}`, style: { '--elc': UI.elColor(d.el) } });
    el.dataset.uid = c.uid || '';
    const info = JG.ELINFO[d.el] || JG.ELINFO.none;
    el.appendChild(UI.h('div', { class: 'face' }));
    if (!d.unplayable) el.appendChild(UI.h('div', { class: 'cost' }, UI.cardCostText(c)));
    el.appendChild(UI.h('div', { class: 'el', title: '' }, info.hanja));
    const nm = d.name + (c.up ? '+' : '');
    el.appendChild(UI.h('div', { class: 'name' + (nm.length >= 7 ? ' xs' : nm.length >= 6 ? ' sm' : '') }, nm));
    el.appendChild(UI.h('div', { class: 'glyph' }, d.art || info.hanja));
    el.appendChild(UI.h('div', { class: 'type' }, `${TYPE[d.type] || ''}${d.el !== 'none' && d.el !== 'wild' ? ' · ' + info.name : d.el === 'wild' ? ' · 오색' : ''}`));
    const plain = ((d.text || '') + (d.chain || '') + '연계: ').replace(/\{[^}]+\}/g, '00');
    el.appendChild(UI.h('div', { class: 'txt' + (plain.length > 58 ? ' xs' : plain.length > 46 ? ' sm' : ''), html: UI.cardTextHtml(c, opts.g || null, opts.target || null) }));
    el.appendChild(UI.h('div', { class: 'tag chain' }, '연계 ▲'));
    UI.setTip(el, () => (UI.dragging ? '' : UI.cardTipHtml(c)));
    return el;
  };
  // 전투 중 갱신(비용·수치·연계 표시)
  UI.updateCardEl = function (el, c, g, target) {
    const d = D.cards[c.id];
    const txt = el.querySelector('.txt');
    const html = UI.cardTextHtml(c, g, target);
    if (txt.innerHTML !== html) txt.innerHTML = html;
    const costEl = el.querySelector('.cost');
    if (costEl && g) {
      const cost = g.cost(c);
      const base = JG.baseCost(c);
      costEl.textContent = cost === 'X' ? 'X' : cost;
      costEl.classList.toggle('cheaper', cost !== 'X' && base !== 'X' && cost < base);
      costEl.classList.toggle('costlier', cost !== 'X' && base !== 'X' && cost > base);
      costEl.classList.toggle('no', cost !== 'X' && cost > g.p.energy);
    }
    if (g) {
      const can = g.canPlay(c);
      el.classList.toggle('unplayable-now', !can && g.phase === 'player');
      const chainable = can && d.el !== 'none' && g.wouldChain(c) && g.chain.n > 0;
      el.classList.toggle('chainable', chainable);
    }
    const nameEl = el.querySelector('.name');
    const nm = d.name + (c.up ? '+' : '');
    if (nameEl.textContent !== nm) nameEl.textContent = nm;
  };

  // 정적 카드(덱 보기·보상용)
  UI.staticCard = function (c, onClick) {
    const el = UI.cardEl(c, { static: true });
    if (onClick) { el.addEventListener('click', () => onClick(el)); }
    return el;
  };
})();
