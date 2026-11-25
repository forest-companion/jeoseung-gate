'use strict';
// ─────────────────────────────────────────────────────────────
// 저승문 공용 기반: 전역 이름공간, 난수, 작은 도구들 (DOM 없음)
// ─────────────────────────────────────────────────────────────
var JG = (typeof window !== 'undefined' ? window : globalThis).JG = {
  VERSION: '1.0.0',
  D: { cards: {}, enemies: {}, relics: {}, potions: {}, events: {}, chars: {}, statuses: {}, encounters: {} },
};

// ── 난수: sfc32 (상태를 저장/복원할 수 있게) ──
JG.hashSeed = function (str) {
  str = String(str);
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  const out = [];
  for (let k = 0; k < 4; k++) {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    out.push(h >>> 0);
  }
  return out;
};

JG.RNG = function (seedOrState) {
  const r = Object.create(JG.RNG.proto);
  r.s = Array.isArray(seedOrState) ? seedOrState.slice() : JG.hashSeed(seedOrState);
  for (let i = 0; i < 12; i++) r.next();
  return r;
};
JG.RNG.proto = {
  next() {
    let [a, b, c, d] = this.s;
    a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
    const t = (a + b | 0) + d | 0;
    d = d + 1 | 0;
    a = b ^ (b >>> 9);
    b = c + (c << 3) | 0;
    c = (c << 21) | (c >>> 11);
    c = c + t | 0;
    this.s = [a >>> 0, b >>> 0, c >>> 0, d >>> 0];
    return (t >>> 0) / 4294967296;
  },
  int(a, b) { return a + Math.floor(this.next() * (b - a + 1)); }, // a..b 포함
  chance(p) { return this.next() < p; },
  pick(arr) { return arr.length ? arr[Math.floor(this.next() * arr.length)] : undefined; },
  shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  },
  weighted(items, wf) { // wf(item) → 가중치
    let total = 0;
    for (const it of items) total += Math.max(0, wf(it));
    if (total <= 0) return items[0];
    let x = this.next() * total;
    for (const it of items) { x -= Math.max(0, wf(it)); if (x < 0) return it; }
    return items[items.length - 1];
  },
  state() { return this.s.slice(); },
};

// ── 작은 도구 ──
JG.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
JG.uidCounter = 1;
JG.uid = () => JG.uidCounter++;
JG.clone = (o) => JSON.parse(JSON.stringify(o));
JG.sum = (arr, f) => arr.reduce((s, x) => s + (f ? f(x) : x), 0);
JG.range = (n) => Array.from({ length: n }, (_, i) => i);

// 조사(은/는, 을/를, 이/가) — 받침 여부
JG.josa = function (word, pair) {
  const w = String(word);
  const ch = w.charCodeAt(w.length - 1);
  const has = ch >= 0xac00 && ch <= 0xd7a3 ? (ch - 0xac00) % 28 !== 0 : false;
  const [a, b] = pair.split('/');
  return w + (has ? a : b);
};

// ── 오행 ──
JG.EL = ['wood', 'fire', 'earth', 'metal', 'water'];
JG.ELINFO = {
  wood: { name: '목', hanja: '木', color: '#3f9a6b', light: '#bfe3c9', guard: '청룡' },
  fire: { name: '화', hanja: '火', color: '#d4473a', light: '#f5c2b8', guard: '주작' },
  earth: { name: '토', hanja: '土', color: '#c9961e', light: '#f1dc9e', guard: '황룡' },
  metal: { name: '금', hanja: '金', color: '#9aa3b5', light: '#e3e6ee', guard: '백호' },
  water: { name: '수', hanja: '水', color: '#33508f', light: '#b9c7ea', guard: '현무' },
  none: { name: '무', hanja: '無', color: '#7d7486', light: '#ddd6e2', guard: '' },
  wild: { name: '오색', hanja: '彩', color: '#b46ad1', light: '#ecd6f5', guard: '' },
};
// 상생: 다음 원소
JG.nextEl = (el) => JG.EL[(JG.EL.indexOf(el) + 1) % 5];
JG.prevEl = (el) => JG.EL[(JG.EL.indexOf(el) + 4) % 5];
// 상극: a가 b를 이기는가 (목극토, 토극수, 수극화, 화극금, 금극목)
JG.BEATS = { wood: 'earth', earth: 'water', water: 'fire', fire: 'metal', metal: 'wood' };
JG.beats = (a, b) => !!a && JG.BEATS[a] === b;
JG.beatenBy = (b) => Object.keys(JG.BEATS).find((k) => JG.BEATS[k] === b);

// 등록 도우미
JG.defCard = function (id, def) { def.id = id; JG.D.cards[id] = def; return def; };
JG.defEnemy = function (id, def) { def.id = id; JG.D.enemies[id] = def; return def; };
JG.defRelic = function (id, def) { def.id = id; JG.D.relics[id] = def; return def; };
JG.defPotion = function (id, def) { def.id = id; JG.D.potions[id] = def; return def; };
JG.defEvent = function (id, def) { def.id = id; JG.D.events[id] = def; return def; };
JG.defStatus = function (id, def) { def.id = id; JG.D.statuses[id] = def; return def; };
