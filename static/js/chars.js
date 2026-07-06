/* Módulo Chars — galeria com agrupamento em containers e ordenação */

let allChars = [];
let allParams = {};
const activeDims = new Set();   // dimensões de filtro/agrupamento selecionadas
let sortAlpha = false;
let searchTerm = '';

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

async function load() {
  [allChars, allParams] = await Promise.all([api('/api/characters'), api('/api/params')]);
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
  let chars = allChars.filter((c) =>
    !searchTerm || c.name.toLowerCase().includes(searchTerm));

  if (sortAlpha) chars = [...chars].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

  if (!chars.length) {
    area.innerHTML = `<div class="empty-state glass"><span class="rune">&#x16DE;</span>
      Nenhum personagem ${allChars.length ? 'encontrado com essa busca' : 'cadastrado ainda'}.<br><br>
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
    render();
  });
});

document.getElementById('sort-chip').addEventListener('click', function () {
  sortAlpha = !sortAlpha;
  this.classList.toggle('on', sortAlpha);
  render();
});

document.getElementById('search').addEventListener('input', function () {
  searchTerm = this.value.trim().toLowerCase();
  render();
});

load().catch((e) => toast(e.message, 'error'));
