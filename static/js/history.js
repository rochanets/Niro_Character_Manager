/* Módulo Histórico: gráfico de barras horizontais de ausência em banners.
   Séries: 5★ dourado (--star5) e 4★ roxo (--star4) — padrão de raridade do app. */

let historyRows = null;
let currentLabel = '';
let showTable = false;
let sortDesc = true;
let rarityFilter = '';
let searchTerm = '';

const select = document.getElementById('banner-select');
const area = document.getElementById('history-area');
const tooltip = document.getElementById('viz-tooltip');
const searchEl = document.getElementById('hist-search');
const rarityEl = document.getElementById('hist-rarity');
const sortToggleEl = document.getElementById('sort-toggle');

function filteredSortedRows() {
  let rows = historyRows || [];
  if (rarityFilter) rows = rows.filter((r) => r.rarity === +rarityFilter);
  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    rows = rows.filter((r) => r.name.toLowerCase().includes(term));
  }
  return [...rows].sort((a, b) =>
    (sortDesc ? b.gap - a.gap : a.gap - b.gap) || a.name.localeCompare(b.name));
}

async function loadOptions() {
  const data = await api('/api/history');
  if (!data.options.length) {
    area.innerHTML = `<div class="empty-state glass"><span class="rune">&#x16D2;</span>
      Nenhum banner com personagens cadastrado ainda.<br>
      Monte seus banners no módulo <a href="/banners" style="color:var(--accent)">Banners</a> primeiro.</div>`;
    select.disabled = true;
    return;
  }
  select.innerHTML = '<option value="">— selecione —</option>' +
    data.options.map((o) => `<option value="${o.id}">Banner ${o.label}</option>`).join('');
}

async function loadHistory(bannerId) {
  const data = await api(`/api/history?banner_id=${bannerId}`);
  historyRows = data.rows;
  currentLabel = data.current;
  render();
}

function gapText(row) {
  if (row.gap === 0) return 'está no banner atual';
  if (!row.last_banner) return 'nunca apareceu em um banner';
  return `última aparição no banner ${row.last_banner}`;
}

function renderGroup(rows, rarity, maxGap, step) {
  const title = rarity === 5 ? '5 Estrelas' : '4 Estrelas';
  const ticks = [];
  for (let t = 0; t <= maxGap; t += step) {
    ticks.push(`<span class="tick" style="left:${(t / maxGap) * 100}%">${t}</span>`);
  }
  // hairlines verticais recessivas nas posições dos ticks
  const gridImage = `repeating-linear-gradient(to right,
    rgba(255,255,255,0.06) 0, rgba(255,255,255,0.06) 1px,
    transparent 1px, transparent ${(step / maxGap) * 100}%)`;

  return `
    <div class="viz-group-title">${title}</div>
    <div class="viz-axis"><span></span><div class="ticks">${ticks.join('')}</div><span></span></div>
    ${rows.map((r) => `
      <div class="bar-row r${r.rarity}" data-id="${r.id}">
        <span class="br-label">
          <img src="${esc(thumbUrl(r.card_promo, 64))}" alt="">
          ${esc(r.name)}
        </span>
        <span class="br-track" style="background-image:${gridImage}">
          <span class="br-fill" style="width:${maxGap ? (r.gap / maxGap) * 100 : 0}%${r.gap === 0 ? ';display:none' : ''}"></span>
        </span>
        <span class="br-value">${r.gap}</span>
      </div>`).join('')}`;
}

function render() {
  if (!historyRows) return;
  const rows = filteredSortedRows();
  const five = rows.filter((r) => r.rarity === 5);
  const four = rows.filter((r) => r.rarity === 4);
  const maxGap = Math.max(1, ...rows.map((r) => r.gap));
  const step = maxGap <= 6 ? 1 : Math.ceil(maxGap / 6);

  if (!rows.length) {
    area.innerHTML = `<div class="empty-state glass"><span class="rune">&#x16D2;</span>
      Nenhum personagem encontrado com esses filtros.</div>`;
    return;
  }

  if (showTable) {
    area.innerHTML = `
      <div class="viz-root glass">
        <div class="viz-head">
          <div><b>Ausência em banners</b>
            <div class="page-sub">em relação ao banner ${esc(currentLabel)}</div></div>
        </div>
        <table class="viz-table">
          <thead><tr><th>Personagem</th><th>Raridade</th><th>Banners ausente</th><th>Última aparição</th></tr></thead>
          <tbody>
            ${rows.map((r) => `
              <tr>
                <td>${esc(r.name)}</td>
                <td><span class="cc-stars stars-${r.rarity}">${r.rarity}★</span></td>
                <td class="num">${r.gap}</td>
                <td>${r.last_banner ? esc(r.last_banner) : '—'}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
    return;
  }

  area.innerHTML = `
    <div class="viz-root glass">
      <div class="viz-head">
        <div><b>Ausência em banners</b>
          <div class="page-sub">em relação ao banner ${esc(currentLabel)} &middot; 0 = presente no banner atual</div></div>
        <div class="viz-legend">
          <span class="key"><span class="swatch" style="background:var(--star5)"></span>5 Estrelas</span>
          <span class="key"><span class="swatch" style="background:var(--star4)"></span>4 Estrelas</span>
        </div>
      </div>
      ${five.length ? renderGroup(five, 5, maxGap, step) : ''}
      ${four.length ? renderGroup(four, 4, maxGap, step) : ''}
    </div>`;

  area.querySelectorAll('.bar-row').forEach((row) => {
    const data = rows.find((r) => r.id === +row.dataset.id);
    row.addEventListener('mousemove', (e) => {
      tooltip.style.display = 'block';
      tooltip.innerHTML = `<b>${esc(data.name)}</b> &middot; ${data.rarity}★
        <div class="tt-sub">Ausente há <b>${data.gap}</b> banner${data.gap === 1 ? '' : 's'} — ${gapText(data)}</div>`;
      const x = Math.min(e.clientX + 14, window.innerWidth - 280);
      tooltip.style.left = `${x}px`;
      tooltip.style.top = `${e.clientY + 14}px`;
    });
    row.addEventListener('mouseleave', () => { tooltip.style.display = 'none'; });
  });
}

select.addEventListener('change', () => {
  if (select.value) loadHistory(select.value).catch((e) => toast(e.message, 'error'));
});

document.getElementById('table-toggle').addEventListener('click', function () {
  showTable = !showTable;
  this.classList.toggle('on', showTable);
  this.textContent = showTable ? 'Ver gráfico' : 'Ver tabela';
  render();
});

sortToggleEl.addEventListener('click', function () {
  sortDesc = !sortDesc;
  this.textContent = sortDesc ? 'Maior → menor' : 'Menor → maior';
  render();
});

searchEl.addEventListener('input', () => {
  searchTerm = searchEl.value.trim();
  render();
});

rarityEl.addEventListener('change', () => {
  rarityFilter = rarityEl.value;
  render();
});

loadOptions().catch((e) => toast(e.message, 'error'));
