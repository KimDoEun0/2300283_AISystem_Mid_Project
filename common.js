// ===== 혼밥 레벨 지도 공통 코드 =====
// GAS 서버 주소
const GAS_URL = 'https://script.google.com/macros/s/'
  + 'AKfycbwW6bGogaXbZxJc6ALclkTrn6sEWtDB9H_axxM4tKAJ-'
  + 'bw4qt86Lo6wXEFGX0wf_k1J/exec';

// 띄어쓰기로 구분한 단어들 중 하나라도 들어 있으면 맞는 규칙
const words = s => new RegExp(s.trim().split(/\s+/).join('|'));

// 혼밥 레벨 9단계 + 업종 분류 규칙
// (상가정보 API의 업종 중분류·소분류 이름으로 판단)
const LEVELS = [
  null,
  {
    lv: 1, name: '편의점', icon: '\u{1F3EA}',
    color: '#43A047', title: '편의점 정복자',
    ex: '삼각김밥, 도시락',
    q: '편의점에서 도시락이나 컵라면을 먹어 본 적 있다',
    re: words('편의점'),
  },
  {
    lv: 2, name: '카페·빵집', icon: '\u2615',
    color: '#7CB342', title: '카페 독서가',
    ex: '카페, 베이커리',
    q: '카페나 빵집에서 혼자 끼니를 해결해 본 적 있다',
    re: words('카페 커피 빵 도넛 베이커리 제과 디저트'
      + ' 아이스크림 빙수 떡 한과 주스 비알코올'),
  },
  {
    lv: 3, name: '패스트푸드', icon: '\u{1F354}',
    color: '#C0CA33', title: '버거 솔로',
    ex: '햄버거, 피자, 토스트',
    q: '햄버거·피자 가게에서 혼자 먹어 본 적 있다',
    re: words('햄버거 버거 피자 치킨 샌드위치 토스트 핫도그'),
  },
  {
    lv: 4, name: '분식집', icon: '\u{1F359}',
    color: '#FBC02D', title: '분식집 단골',
    ex: '김밥, 떡볶이, 라면',
    q: '분식집에서 혼자 김밥이나 떡볶이를 먹어 본 적 있다',
    re: words('김밥 분식 만두 라면 떡볶이 순대 어묵'),
  },
  {
    lv: 5, name: '국밥·백반', icon: '\u{1F372}',
    color: '#FB8C00', title: '국밥 장인',
    ex: '국밥, 백반, 찌개',
    q: '국밥집이나 백반집에서 혼자 먹어 본 적 있다',
    re: words('국밥 백반 한정식 찌개 탕 국수 칼국수 냉면'
      + ' 죽 해장 한식 도시락 덮밥 비빔'),
  },
  {
    lv: 6, name: '중국집', icon: '\u{1F95F}',
    color: '#F4511E', title: '짜장면 독립군',
    ex: '짜장면, 짬뽕',
    q: '중국집에서 혼자 짜장면을 먹어 본 적 있다',
    re: words('중식 중국 짜장 짬뽕 마라 양꼬치'),
  },
  {
    lv: 7, name: '일식·양식', icon: '\u{1F35D}',
    color: '#D81B60', title: '파스타 고독가',
    ex: '돈가스, 초밥, 파스타',
    q: '파스타·초밥 같은 레스토랑에서 혼자 먹어 본 적 있다',
    re: words('일식 초밥 스시 돈가스 돈까스 라멘 우동 소바'
      + ' 양식 파스타 스테이크 서양 이탈리아 동남아'
      + ' 쌀국수 베트남 태국 인도 멕시코 외국식'),
  },
  {
    lv: 8, name: '고깃집·횟집', icon: '\u{1F969}',
    color: '#8E24AA', title: '고기 굽는 고수',
    ex: '삼겹살, 곱창, 회',
    q: '고깃집에서 혼자 고기를 구워 본 적 있다',
    re: words('고기 구이 갈비 삼겹 곱창 막창 족발 보쌈'
      + ' 횟집 생선회 해산물 장어 오리 닭갈비'),
  },
  {
    lv: 9, name: '혼술', icon: '\u{1F37A}',
    color: '#3949AB', title: '혼술의 신',
    ex: '술집, 이자카야',
    q: '술집에서 혼자 술을 마셔 본 적 있다',
    re: words('주점 호프 이자카야 포차 와인 칵테일 맥주'),
  },
];

// 겹치는 단어가 있어서 검사 순서가 중요하다
// (예: '떡볶이'는 카페(떡)보다 분식을 먼저 검사)
const CHECK_ORDER = [1, 9, 7, 6, 3, 4, 2, 8, 5];
function levelOf(mcls, scls) {
  const text = mcls + ' ' + scls;
  for (const lv of CHECK_ORDER) {
    if (LEVELS[lv].re.test(text)) return lv;
  }
  return 0;  // 혼밥 레벨에 해당하지 않는 업종
}

// 데모용 추천 동네 [이름, 위도, 경도]
const SPOTS = [
  ['신촌', 37.5559, 126.9368],
  ['강남역', 37.4979, 127.0276],
  ['홍대', 37.5540, 126.9220],
  ['성수', 37.5446, 127.0557],
  ['여의도', 37.5215, 126.9243],
  ['부산 서면', 35.1565, 129.0560],
  ['대구 동성로', 35.8690, 128.5950],
  ['대전 궁동', 36.3625, 127.3505],
];

// ---------- 서버 요청 ----------
async function api(params) {
  const qs = new URLSearchParams(params);
  const res = await fetch(GAS_URL + '?' + qs);
  const json = await res.json();
  if (!json.ok) throw new Error(json.error);
  return json.data;
}

// ---------- 내 기록 (브라우저에 저장) ----------
const store = {
  get(k, def) {
    try {
      const v = localStorage.getItem('honbab_' + k);
      return v === null ? def : JSON.parse(v);
    } catch (e) {
      return def;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem('honbab_' + k, JSON.stringify(v));
    } catch (e) {}
  },
};

function myStamps() {
  return store.get('stamps', []);
}
// 내 레벨 = 테스트 결과와 도장 찍은 최고 레벨 중 높은 것
function myLevel() {
  const lvs = myStamps().map(s => s.lv);
  return Math.max(store.get('testLevel', 0), 0, ...lvs);
}
function nextLevel() {
  return Math.min(9, myLevel() + 1);
}
function titleOf(lv) {
  return lv ? LEVELS[lv].title : '혼밥 새싹';
}
function levelBadge(lv) {
  if (!lv) {
    return '<span class="lvbadge" style="background:#9E9E9E">'
      + 'Lv.0 \u{1F331}</span>';
  }
  const info = LEVELS[lv];
  return `<span class="lvbadge" style="background:${info.color}">`
    + `Lv.${lv} ${info.icon} ${info.name}</span>`;
}

// ---------- 화면 도우미 ----------
const ESC_MAP = {
  '&': '&amp;', '<': '&lt;', '>': '&gt;',
  '"': '&quot;', "'": '&#39;',
};
function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ESC_MAP[c]);
}
function loading(el, msg) {
  el.innerHTML = '<div class="loading"><div class="spinner"></div>'
    + `<p>${msg}</p></div>`;
}
function showError(err) {
  const html = `<div class="error">\u{1F622} ${esc(err.message)}`
    + '<br><small>잠시 후 새로고침해 보세요.</small></div>';
  document.querySelector('main').insertAdjacentHTML('afterbegin', html);
}
function toast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2500);
}
function renderHeader(active) {
  const items = [
    ['index.html', '\u{1F3E0} 홈'],
    ['test.html', '\u{1F9EA} 레벨 테스트'],
    ['map.html', '\u{1F5FA}\uFE0F 혼밥 지도'],
    ['my.html', '\u{1F4D2} 혼밥 일지'],
  ];
  const nav = items.map(([h, t]) => {
    const on = h === active ? 'on' : '';
    return `<a href="${h}" class="${on}">${t}</a>`;
  }).join('');
  document.getElementById('top').innerHTML =
    '<a class="logo" href="index.html">\u{1F35C} 혼밥 레벨 지도</a>'
    + `<nav>${nav}</nav>`;
}

// ---------- 지도·거리 ----------
// 지도 (Leaflet + OpenStreetMap, API 키 필요 없음)
function makeMap(id, center, zoom) {
  const map = L.map(id).setView(center, zoom);
  const tiles = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
  L.tileLayer(tiles, {
    attribution: '&copy; OpenStreetMap',
    maxZoom: 19,
  }).addTo(map);
  return map;
}
// 두 지점 사이 직선거리 (하버사인 공식, km)
function distKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const rad = x => x * Math.PI / 180;
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(rad(lat1)) * Math.cos(rad(lat2))
    * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
// 걷는 속도 분당 약 67m 기준
const walkMin = m => Math.max(1, Math.round(m / 67));
