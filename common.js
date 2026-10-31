// ===== 어슬렁 공통 코드 =====
// GAS 서버 주소 (8주차 수업처럼 GAS가 공공데이터 API를 대신 호출해 준다)
const GAS_URL = 'https://script.google.com/macros/s/AKfycbwW6bGogaXbZxJc6ALclkTrn6sEWtDB9H_axxM4tKAJ-bw4qt86Lo6wXEFGX0wf_k1J/exec';

const GROUPS = {
  food: { label: '밥집', color: '#E07A5F', icon: '🍚' },
  cafe: { label: '카페·디저트', color: '#D4A017', icon: '☕' },
  bar:  { label: '술집', color: '#7B5EA7', icon: '🍺' },
  shop: { label: '구경 가게', color: '#3D9970', icon: '🛍️' },
  life: { label: '생활 가게', color: '#8D99AE', icon: '✂️' },
};

// ---------- 서버 요청 ----------
async function api(params) {
  const res = await fetch(GAS_URL + '?' + new URLSearchParams(params));
  const json = await res.json();
  if (!json.ok) throw new Error(json.error);
  return json.data;
}

// 전국 골목 동네 목록 (한 번 받으면 브라우저 탭이 열려 있는 동안 기억)
async function getPresets() {
  try {
    const saved = sessionStorage.getItem('presets');
    if (saved) return prep(JSON.parse(saved));
  } catch (e) {}
  const list = await api({ action: 'presets' });
  try { sessionStorage.setItem('presets', JSON.stringify(list)); } catch (e) {}
  return prep(list);
}

// ---------- 주소·화면 도우미 ----------
function getParams() {
  const p = new URLSearchParams(location.search);
  return { lat: Number(p.get('lat')), lon: Number(p.get('lon')), name: p.get('name') || '' };
}
function link(page, lat, lon, name) {
  return `${page}?lat=${lat.toFixed(5)}&lon=${lon.toFixed(5)}&name=${encodeURIComponent(name || '')}`;
}
function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function shortSido(s) {
  const map = { '경상북도': '경북', '경상남도': '경남', '충청북도': '충북', '충청남도': '충남', '전라남도': '전남', '전남광주통합특별시': '광주·전남' };
  return map[s] || s.replace(/특별자치도|특별자치시|특별시|광역시|도$/, '');
}
function josa(word, a, b) {
  const code = word.charCodeAt(word.length - 1) - 0xAC00;
  if (code < 0 || code > 11171) return a + '(' + b + ')';
  return code % 28 ? a : b;
}
function starText(n) { return '★'.repeat(n) + '☆'.repeat(5 - n); }
function loading(el, msg) {
  el.innerHTML = `<div class="loading"><div class="spinner"></div><p>${msg}</p></div>`;
}
function showError(err) {
  document.querySelector('main').insertAdjacentHTML('afterbegin',
    `<div class="error">😢 ${esc(err.message)}<br><small>잠시 후 새로고침해 보세요.</small></div>`);
}
function renderHeader(active) {
  const items = [['index.html', '🏠 홈'], ['similar.html', '🔍 닮은 동네 찾기']];
  document.getElementById('top').innerHTML = `<a class="logo" href="index.html">🐾 어슬렁</a><nav>${
    items.map(([h, t]) => `<a href="${h}" class="${h === active ? 'on' : ''}">${t}</a>`).join('')}</nav>`;
}
function legend() {
  return Object.values(GROUPS).map(x => `<span class="tag" style="background:${x.color};color:#fff">${x.icon} ${x.label}</span>`).join(' ');
}
function ageLabel(a) {
  return a < 30 ? '👶 풋풋한 청춘 동네' : a < 40 ? '🧑 한창 뜨는 동네' : a < 50 ? '🧔 자리 잡은 어른 동네'
    : a < 60 ? '👴 정 많은 중년 동네' : '🧓 세월이 쌓인 노포 동네';
}
function simRow({ p, score }) {
  return `<a class="sim" href="${link('dong.html', p.lat, p.lon, p.name)}">
    <div><b>${esc(p.name)}</b><br><small>${esc(shortSido(p.sido))} ${esc(p.sigungu)}</small></div>
    <div class="meter"><i style="width:${score}%"></i></div><div class="pct">${score}%</div></a>`;
}

// 지도 (Leaflet + CARTO 지도 타일)
function makeMap(id, center, zoom) {
  const map = L.map(id).setView(center, zoom);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap', maxZoom: 19,
  }).addTo(map);
  return map;
}

// ---------- 동네 분석 계산 ----------
// 가게 수 → 비율(특징값)
function features(d) {
  const g = d.groups, t = d.tags;
  const base = (g.food + g.cafe + g.bar + g.shop + g.life) || 1;
  return {
    food: g.food / base, cafe: g.cafe / base, bar: g.bar / base, shop: g.shop / base, life: g.life / base,
    franchise: t.franchise / base, old: t.old / base, trendy: t.trendy / base,
    solo: t.solo / base, culture: t.culture / base,
    shopShare: g.shop / ((g.food + g.cafe + g.bar + g.shop) || 1),  // 먹는 가게 대비 구경 가게
    nightShare: g.bar / ((g.cafe + g.bar) || 1),                    // 카페 대비 술집
    density: d.total / (Math.PI * (d.r / 1000) ** 2),                // 1㎢당 가게 수
  };
}

// 전국 골목 동네들의 평균·표준편차 (상대 평가 기준)
function prep(presets) {
  presets.forEach(p => { p.f = features(p); });
  const s = {};
  Object.keys(presets[0].f).forEach(k => {
    const arr = presets.map(p => p.f[k]);
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    const std = Math.sqrt(arr.reduce((a, b) => a + (b - mean) ** 2, 0) / arr.length) || 1;
    s[k] = { mean, std };
  });
  presets.stats = s;
  return presets;
}

// 전국 동네 중 몇 % 위치인지 (0~1)
function percentile(presets, fn, v) {
  return presets.filter(p => fn(p.f) <= v).length / presets.length;
}
const toStars = p => Math.min(5, Math.max(1, Math.ceil(p * 5)));

// 동네 MBTI: 4가지 축에서 전국 동네의 가운데보다 높으면 오른쪽 글자
const MBTI_BASE = {
  MD: { icon: '🍞', name: '브런치 산책' }, MN: { icon: '🍶', name: '맛집 포차' },
  SD: { icon: '🛍️', name: '소품 구경' }, SN: { icon: '🎸', name: '밤의 아지트' },
};
function mbti(f, presets) {
  const pos = k => percentile(presets, x => x[k], f[k]);
  const axes = [
    { l: ['I', '개인 가게'], r: ['F', '프랜차이즈'], p: pos('franchise') },
    { l: ['M', '먹으러 가는'], r: ['S', '구경하러 가는'], p: pos('shopShare') },
    { l: ['D', '낮이 좋은'], r: ['N', '밤이 좋은'], p: pos('nightShare') },
    { l: ['Q', '조용한'], r: ['L', '북적이는'], p: pos('density') },
  ];
  axes.forEach(a => { a.pick = a.p > 0.5 ? a.r : a.l; });
  const code = axes.map(a => a.pick[0]).join('');
  const base = MBTI_BASE[code[1] + code[2]];
  return {
    code, icon: base.icon, axes,
    name: (code[3] === 'L' ? '북적이는 ' : '조용한 ') + base.name + (code[0] === 'I' ? ' 골목' : ' 거리'),
    desc: axes.map(a => a.pick[1]).join(' · '),
  };
}

// 동네 나이: 노포 업종 ↑ 나이 ↑, 트렌디 업종·프랜차이즈 ↑ 나이 ↓ → 전국 범위를 22~68세로 환산
function ageScore(f) { return f.old * 3 - f.trendy - f.franchise * 0.5; }
function dongAge(f, presets) {
  const scores = presets.map(p => ageScore(p.f));
  const min = Math.min(...scores), max = Math.max(...scores);
  const t = (ageScore(f) - min) / ((max - min) || 1);
  return Math.round(Math.min(79, Math.max(19, 22 + t * 46)));
}

// 닮은 정도: 11가지 값을 표준화(z-점수)한 뒤 코사인 유사도 → 0~100%
const SIM_KEYS = ['food', 'cafe', 'bar', 'shop', 'life', 'franchise', 'old', 'trendy', 'solo', 'culture', 'density'];
function similarity(f1, f2, s) {
  const v1 = SIM_KEYS.map(k => (f1[k] - s[k].mean) / s[k].std);
  const v2 = SIM_KEYS.map(k => (f2[k] - s[k].mean) / s[k].std);
  const dot = v1.reduce((a, x, i) => a + x * v2[i], 0);
  const n = (Math.hypot(...v1) * Math.hypot(...v2)) || 1;
  return Math.round(((dot / n) + 1) / 2 * 100);
}
function distKm(lat1, lon1, lat2, lon2) {
  const R = 6371, rad = x => x * Math.PI / 180;
  const a = Math.sin(rad(lat2 - lat1) / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lon2 - lon1) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
function similarList(f, presets, self) {
  return presets
    .filter(p => !self || distKm(p.lat, p.lon, self.lat, self.lon) > 0.5)
    .map(p => ({ p, score: similarity(f, p.f, presets.stats) }))
    .sort((a, b) => b.score - a.score);
}

// 특기: 지도용 가게들 중 가장 많은 업종
function specialty(d) {
  const cnt = {};
  (d.stores || []).forEach(s => { cnt[s[4]] = (cnt[s[4]] || 0) + 1; });
  return Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a])[0] || '-';
}

// 분석 결과를 한 번에 정리
function report(d, presets, name) {
  const f = features(d);
  const pct = fn => percentile(presets, fn, fn(f));
  return {
    name: name || d.dong,
    place: `${d.sido} ${d.sigungu} ${d.dong}`,
    f,
    mbti: mbti(f, presets),
    age: dongAge(f, presets),
    honol: toStars(pct(x => x.solo + x.culture + x.cafe)),
    nopo: toStars(pct(x => x.old)),
    indie: Math.round(Math.max(0, 1 - f.franchise) * 100),
    similar: similarList(f, presets, d).slice(0, 3),
    specialty: specialty(d),
  };
}
