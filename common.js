// 혼밥 레벨 지도 - 모든 페이지 공통

const GAS_URL = 'https://script.google.com/macros/s/' +
  'AKfycbxOQGuJnxkAMHcVEA1DR_xRPVKoCnvbY6WAXyEfUhMAVCqlFd4GE6LCF8t6ayJScK75' +
  '/exec';

const $ = id => document.getElementById(id);

// ---------- 레벨 기준표 ----------
const LEVELS = [
  {
    lv: 0, emoji: '\u{1F35A}', name: '혼밥 준비 중',
    label: '', color: '#9CA3AF', scls: [], q: ''
  },
  {
    lv: 1, emoji: '\u{1F3EA}', name: '혼밥 첫걸음',
    label: '편의점', color: '#38BDF8',
    scls: ['편의점'],
    q: '편의점에서 혼자 도시락이나 컵라면을 먹어 본 적 있나요?'
  },
  {
    lv: 2, emoji: '\u{2615}', name: '혼밥 새싹',
    label: '카페·빵집', color: '#A16207',
    scls: ['카페', '빵/도넛', '떡/한과', '아이스크림/빙수'],
    q: '카페나 빵집에서 혼자 먹고 가 본 적 있나요?'
  },
  {
    lv: 3, emoji: '\u{1F354}', name: '후다닥 혼밥러',
    label: '패스트푸드', color: '#EAB308',
    scls: ['버거', '피자', '토스트/샌드위치/샐러드'],
    q: '햄버거나 샌드위치 가게에서 혼자 먹어 본 적 있나요?'
  },
  {
    lv: 4, emoji: '\u{1F359}', name: '1인분 프로',
    label: '분식·마라탕', color: '#84CC16',
    scls: ['김밥/만두/분식', '마라탕/훠궈'],
    q: '분식집이나 마라탕집에서 혼자 먹어 본 적 있나요?'
  },
  {
    lv: 5, emoji: '\u{1F372}', name: '든든 혼밥러',
    label: '국밥·백반·면', color: '#F97316',
    scls: [
      '국/탕/찌개류', '백반/한정식', '국수/칼국수',
      '냉면/밀면', '일식 면 요리', '일식 카레/돈가스/덮밥',
      '기타 한식 음식점', '복 요리 전문', '전/부침개'
    ],
    q: '국밥집이나 백반집에 혼자 들어가 본 적 있나요?'
  },
  {
    lv: 6, emoji: '\u{1F95F}', name: '중식 도전자',
    label: '중국집', color: '#EF4444',
    scls: ['중국집'],
    q: '중국집에 혼자 가서 먹어 본 적 있나요?'
  },
  {
    lv: 7, emoji: '\u{1F35D}', name: '분위기 혼밥러',
    label: '레스토랑', color: '#EC4899',
    scls: [
      '일식 회/초밥', '경양식', '파스타/스테이크',
      '베트남식 전문', '패밀리레스토랑', '기타 서양식 음식점',
      '기타 일식 음식점', '기타 동남아식 전문'
    ],
    q: '초밥집이나 파스타 레스토랑에 혼자 가 본 적 있나요?'
  },
  {
    lv: 8, emoji: '\u{1F969}', name: '1인 고기 장인',
    label: '고기·회·치킨', color: '#8B5CF6',
    scls: [
      '돼지고기 구이/찜', '소고기 구이/찜', '닭/오리고기 구이/찜',
      '해산물 구이/찜', '곱창 전골/구이', '족발/보쌈',
      '횟집', '치킨'
    ],
    q: '고깃집이나 횟집에서 혼자 먹어 본 적 있나요?'
  },
  {
    lv: 9, emoji: '\u{1F37A}', name: '혼밥 마스터',
    label: '혼술', color: '#374151',
    scls: ['요리 주점', '생맥주 전문'],
    q: '술집에 혼자 가서 마셔 본 적 있나요?'
  }
];

const SCLS_LV = {};
LEVELS.forEach(info => {
  info.scls.forEach(s => { SCLS_LV[s] = info.lv; });
});

// 식당 레벨 = 업종 소분류만으로 판정 (표에 없으면 0 = 제외)
function levelOf(scls) {
  return SCLS_LV[scls] || 0;
}

// ---------- 브라우저 저장소 ----------
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
  del(k) {
    try {
      localStorage.removeItem('honbab_' + k);
    } catch (e) {}
  }
};

// ---------- 나의 레벨 판정 ----------
// tried[1]~tried[9]: true = 해 봄, false = 아직
function getTried() {
  return store.get('tried', null);
}
function hasTested() {
  return Array.isArray(getTried());
}
function triedCount() {
  const t = getTried() || [];
  let n = 0;
  for (let lv = 1; lv <= 9; lv++) if (t[lv]) n++;
  return n;
}
// 해 본 레벨 중 가장 높은 레벨
function myLevel() {
  const t = getTried() || [];
  for (let lv = 9; lv >= 1; lv--) if (t[lv]) return lv;
  return 0;
}
// 아직인 레벨 중 가장 낮은 레벨 (0 = 다음 도전 없음)
function nextLevel() {
  const t = getTried() || [];
  for (let lv = 1; lv <= 9; lv++) if (!t[lv]) return lv;
  return 0;
}
function markTried(lv) {
  const t = getTried() || new Array(10).fill(false);
  t[lv] = true;
  store.set('tried', t);
}

// ---------- 서버 호출 ----------
async function api(params) {
  const url = GAS_URL + '?' + new URLSearchParams(params);
  const res = await fetch(url);
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || '알 수 없는 오류');
  return json.data;
}

// 주변 식당 → 레벨·거리 붙이기 → 가까운 순
async function loadStores(lat, lng) {
  const d = await api({ action: 'stores', lat: lat, lng: lng });
  const list = [];
  d.list.forEach(r => {
    const lv = levelOf(r[1]);
    if (!lv) return;
    list.push({
      name: r[0], scls: r[1], lat: r[2], lng: r[3],
      addr: r[4], lv: lv,
      dist: distM(lat, lng, r[2], r[3])
    });
  });
  list.sort((a, b) => a.dist - b.dist);
  return { stdrYm: d.stdrYm, list: list };
}

// ---------- 거리 ----------
function distM(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const rad = x => x * Math.PI / 180;
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) *
    Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
function fmtDist(m) {
  if (m < 1000) return Math.round(m / 10) * 10 + 'm';
  return (m / 1000).toFixed(1) + 'km';
}
function fmtYm(ym) {
  ym = String(ym || '');
  if (ym.length !== 6) return '최신';
  return ym.slice(0, 4) + '.' + ym.slice(4);
}

// ---------- 화면 조각 ----------
function esc(s) {
  const map = {
    '&': '&amp;', '<': '&lt;', '>': '&gt;',
    '"': '&quot;', "'": '&#39;'
  };
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => map[c]);
}
function lvBadge(lv) {
  return '<span class="lv" style="--c:' + LEVELS[lv].color + '">' +
    'Lv.' + lv + '</span>';
}
function lvTitle(lv) {
  return 'Lv.' + lv + ' ' + LEVELS[lv].name;
}
function storeItemHtml(s, i) {
  return '<li class="item" data-i="' + i + '">' +
    '<div class="emo">' + LEVELS[s.lv].emoji + '</div>' +
    '<div class="item-main">' +
    '<div class="item-name">' + esc(s.name) + '</div>' +
    '<div class="sub">' + lvBadge(s.lv) + ' ' +
    esc(LEVELS[s.lv].label) + ' · ' + esc(s.scls) + '</div>' +
    '</div>' +
    '<div class="item-dist">' + fmtDist(s.dist) + '</div>' +
    '</li>';
}
function kakaoLink(s) {
  const name = String(s.name).replace(/,/g, ' ');
  return 'https://map.kakao.com/link/map/' +
    encodeURIComponent(name) + ',' + s.lat + ',' + s.lng;
}
function loadingHtml(text) {
  return '<div class="state"><div class="spinner"></div>' +
    esc(text) + '</div>';
}
function msgHtml(title, sub, extra) {
  return '<div class="state"><b>' + esc(title) + '</b>' +
    '<p class="sub">' + esc(sub) + '</p>' + (extra || '') + '</div>';
}

// ---------- 상단 메뉴 ----------
function renderNav(active) {
  const items = [
    ['index.html', '지도'],
    ['test.html', '테스트'],
    ['my.html', '기록']
  ];
  const nav = document.createElement('nav');
  nav.className = 'nav';
  nav.innerHTML = items.map(it => {
    const on = it[0] === active ? ' class="on"' : '';
    return '<a href="' + it[0] + '"' + on + '>' + it[1] + '</a>';
  }).join('');
  document.body.prepend(nav);
}

// ---------- 알림 ----------
let toastTimer = null;
function toast(msg) {
  let el = $('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}
