/* Módulo Chars — galeria com agrupamento em containers e ordenação */

let allChars = [];
let allParams = {};
const activeDims = new Set();   // dimensões de agrupamento selecionadas
let sortAlpha = false;
let searchTerm = '';
// filtros por valor específico, combináveis entre si (AND) — independentes do agrupamento
const filters = { region: '', affiliation: '', element: '', weapon: '', rarity: '' };

const DIM_VALUE = {
  region:      (c) => c.region.name || 'Sem região',
  affiliation: (c) => c.affiliation.name || 'Sem afiliação',
  element:     (c) => c.element.name || 'Sem elemento',
  weapon:      (c) => c.weapon.name || 'Sem arma',
  rarity:      (c) => (c.rarity === 5 ? '5 Estrelas' : '4 Estrelas'),
};

// Todos os valores possíveis de cada dimensão, para detectar combinações
// que ainda não têm nenhum personagem cadastrado.
function dimValues(dim) {
  if (dim === 'rarity') return ['5 Estrelas', '4 Estrelas'];
  return (allParams[dim] || []).map((p) => p.name);
}

// ---------------------------------------------------------------- persistência dos agrupamentos
const GROUPING_KEY = 'niro:chars:grouping';

function loadGroupingState() {
  let saved;
  try { saved = JSON.parse(localStorage.getItem(GROUPING_KEY)); } catch (_) { saved = null; }
  if (!saved) return;
  (saved.dims || []).forEach((dim) => {
    const chip = document.querySelector(`.chip[data-dim="${dim}"]`);
    if (chip) { activeDims.add(dim); chip.classList.add('on'); }
  });
  if (saved.sortAlpha) {
    sortAlpha = true;
    document.getElementById('sort-chip').classList.add('on');
  }
  if (saved.filters) Object.assign(filters, saved.filters);
}

function saveGroupingState() {
  localStorage.setItem(GROUPING_KEY, JSON.stringify({ dims: [...activeDims], sortAlpha, filters }));
}

// preenche as opções dos selects de filtro com os valores cadastrados em Parâmetros
// e aplica o filtro salvo (se houver)
function populateFilterSelects() {
  ['region', 'affiliation', 'element', 'weapon'].forEach((dim) => {
    const sel = document.getElementById(`f-${dim}`);
    (allParams[dim] || []).forEach((p) => {
      const opt = document.createElement('option');
      opt.value = p.name;
      opt.textContent = p.name;
      sel.appendChild(opt);
    });
    sel.value = filters[dim];
  });
  document.getElementById('f-rarity').value = filters.rarity;
}

async function load() {
  loadGroupingState();
  [allChars, allParams] = await Promise.all([api('/api/characters'), api('/api/params')]);
  populateFilterSelects();
  render();
}

function cardHtml(c) {
  const elem = c.element.image
    ? `<img class="cc-elem" src="${esc(thumbUrl(c.element.image, 64))}" title="${esc(c.element.name)}" alt="">`
    : '';
  return `
    <a class="char-card" href="/chars/${c.id}">
      <img class="promo" src="${esc(thumbUrl(c.card_promo, 480))}" alt="${esc(c.name)}" loading="lazy">
      ${elem}
      <div class="cc-info">
        <span class="cc-name">${esc(c.name)}</span>
        ${starsHtml(c.rarity)}
      </div>
    </a>`;
}

function render() {
  const area = document.getElementById('chars-area');
  let chars = allChars.filter((c) => {
    if (searchTerm && !c.name.toLowerCase().includes(searchTerm)) return false;
    if (filters.region && (c.region.name || '') !== filters.region) return false;
    if (filters.affiliation && (c.affiliation.name || '') !== filters.affiliation) return false;
    if (filters.element && (c.element.name || '') !== filters.element) return false;
    if (filters.weapon && (c.weapon.name || '') !== filters.weapon) return false;
    if (filters.rarity && String(c.rarity) !== filters.rarity) return false;
    return true;
  });

  if (sortAlpha) chars = [...chars].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

  if (!chars.length) {
    area.innerHTML = `<div class="empty-state glass"><span class="rune">&#x16DE;</span>
      Nenhum personagem ${allChars.length ? 'encontrado com esses filtros' : 'cadastrado ainda'}.<br><br>
      ${allChars.length ? '' : '<a class="btn primary" href="/chars/new">+ Cadastrar o primeiro</a>'}</div>`;
    return;
  }

  // Sem filtros selecionados: grade única, sem containers
  if (!activeDims.size) {
    area.innerHTML = `<div class="char-grid">${chars.map(cardHtml).join('')}</div>`;
    return;
  }

  // Com filtros: containers pela combinação das dimensões selecionadas
  const dims = ['region', 'affiliation', 'element', 'weapon', 'rarity'].filter((d) => activeDims.has(d));
  const groups = new Map();
  for (const c of chars) {
    const key = dims.map((d) => DIM_VALUE[d](c)).join(' · ');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(c);
  }
  const keys = [...groups.keys()].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  area.innerHTML = keys.map((key) => `
    <div class="group-container glass">
      <h3>${esc(key)} <span class="count">(${groups.get(key).length})</span></h3>
      <div class="char-grid">${groups.get(key).map(cardHtml).join('')}</div>
    </div>`).join('') + zeroedGroupsHtml(dims, groups);
}

// Combinações possíveis das dimensões selecionadas que ainda não têm
// nenhum personagem — indica oportunidades de novos personagens.
function zeroedGroupsHtml(dims, groups) {
  let combos = [[]];
  for (const dim of dims) {
    const values = dimValues(dim);
    if (!values.length) return '';
    const next = [];
    for (const combo of combos) {
      for (const value of values) next.push([...combo, value]);
    }
    combos = next;
  }

  const zeroed = combos
    .map((combo) => combo.join(' · '))
    .filter((key) => !groups.has(key))
    .sort((a, b) => a.localeCompare(b, 'pt-BR'));

  if (!zeroed.length) return '';

  return `
    <div class="group-container glass zeroed-groups">
      <h3>Agrupamentos zerados <span class="count">(${zeroed.length})</span></h3>
      <p class="page-sub">Combinações sem nenhum personagem cadastrado — oportunidades para novos personagens.</p>
      <div class="zeroed-list">
        ${zeroed.map((key) => `<span class="chip zeroed-chip">${esc(key)}</span>`).join('')}
      </div>
    </div>`;
}

document.querySelectorAll('.chip[data-dim]').forEach((chip) => {
  chip.addEventListener('click', () => {
    const dim = chip.dataset.dim;
    if (activeDims.has(dim)) { activeDims.delete(dim); chip.classList.remove('on'); }
    else { activeDims.add(dim); chip.classList.add('on'); }
    saveGroupingState();
    render();
  });
});

document.getElementById('sort-chip').addEventListener('click', function () {
  sortAlpha = !sortAlpha;
  this.classList.toggle('on', sortAlpha);
  saveGroupingState();
  render();
});

document.getElementById('search').addEventListener('input', function () {
  searchTerm = this.value.trim().toLowerCase();
  render();
});

['region', 'affiliation', 'element', 'weapon', 'rarity'].forEach((dim) => {
  document.getElementById(`f-${dim}`).addEventListener('change', function () {
    filters[dim] = this.value;
    saveGroupingState();
    render();
  });
});

document.getElementById('clear-filters').addEventListener('click', () => {
  Object.keys(filters).forEach((dim) => { filters[dim] = ''; });
  populateFilterSelects();
  saveGroupingState();
  render();
});

load().catch((e) => toast(e.message, 'error'));
