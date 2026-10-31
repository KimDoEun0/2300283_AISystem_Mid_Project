// ===== 장소 검색 =====
// OpenStreetMap Nominatim 검색 (API 키 필요 없음)
// 결과를 누르면 map.html의 load(위도, 경도, 이름)를 불러
// 그 위치 반경 500m 식당을 보여 준다.
const searchForm = document.getElementById('searchForm');
const searchInput = document.getElementById('searchInput');
const searchResults = document.getElementById('searchResults');
let searchList = [];

// Enter 또는 검색 버튼을 눌렀을 때만 검색 (서비스 이용 규칙)
searchForm.addEventListener('submit', async e => {
  e.preventDefault();
  const q = searchInput.value.trim();
  if (!q) return;
  searchResults.innerHTML = '<p class="hint">찾는 중…</p>';
  try {
    const params = new URLSearchParams({
      q: q,
      format: 'jsonv2',
      limit: 5,
      countrycodes: 'kr',
      'accept-language': 'ko',
    });
    const url = 'https://nominatim.openstreetmap.org/search?'
      + params;
    const res = await fetch(url);
    searchList = await res.json();
    showResults();
  } catch (err) {
    searchResults.innerHTML =
      '<p class="hint">검색에 실패했어요. 잠시 후 다시 해 보세요.</p>';
  }
});

// 검색 결과 목록 (최대 5개)
function showResults() {
  if (!searchList.length) {
    searchResults.innerHTML =
      '<p class="hint">검색 결과가 없어요. 다른 이름으로 해 보세요.</p>';
    return;
  }
  searchResults.innerHTML = searchList.map((p, i) => {
    const parts = p.display_name.split(',').map(s => s.trim());
    const name = p.name || parts[0];
    const addr = parts.slice(1, 4).join(' ');
    return `<button type="button" class="result-item" data-i="${i}">`
      + `<b>\u{1F4CD} ${esc(name)}</b>`
      + `<span class="meta">${esc(addr)}</span></button>`;
  }).join('');
}

// 결과를 누르면 그 위치로 이동
searchResults.addEventListener('click', e => {
  const b = e.target.closest('.result-item');
  if (!b) return;
  const p = searchList[Number(b.dataset.i)];
  const name = p.name || p.display_name.split(',')[0];
  searchResults.innerHTML = '';
  searchInput.value = name;
  load(Number(p.lat), Number(p.lon), name);
});
