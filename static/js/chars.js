/* Módulo Chars — galeria com agrupamento em containers e ordenação */

let allChars = [];
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

async function load() {
  allChars = await api('/api/characters');
  render();
}

function cardHtml(c) {
  const elem = c.element.image
    ? `<img class="cc-elem" src="/static/${esc(c.element.image)}" title="${esc(c.element.name)}" alt="">`
    : '';
  return `
    <a class="char-card" href="/chars/${c.id}">
      <img class="promo" src="/static/${esc(c.card_promo)}" alt="${esc(c.name)}" loading="lazy">
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
    </div>`).join('');
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
