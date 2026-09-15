/* Módulo Chars — galeria com agrupamento em containers e ordenação */

let allChars = [];
let allParams = {};
let allTracks = [];
const activeDims = new Set();   // dimensões de agrupamento selecionadas
let sortAlpha = false;
let searchTerm = '';
// filtros por valor específico, combináveis entre si (AND) — independentes do agrupamento
const filters = { region: '', affiliation: '', element: '', weapon: '', rarity: '', role: '' };

const DIM_VALUE = {
  region:      (c) => c.region.name || 'Sem região',
  affiliation: (c) => c.affiliation.name || 'Sem afiliação',
  element:     (c) => c.element.name || 'Sem elemento',
  weapon:      (c) => c.weapon.name || 'Sem arma',
  rarity:      (c) => (c.rarity === 5 ? '5 Estrelas' : '4 Estrelas'),
  role:        (c) => [c.role1, c.role2].filter(Boolean).join(' · ') || 'Sem role',
};

// Todos os valores possíveis de cada dimensão, para detectar combinações
// que ainda não têm nenhum personagem cadastrado.
function dimValues(dim) {
  if (dim === 'rarity') return ['5 Estrelas', '4 Estrelas'];
  if (dim === 'role') return [...new Set([...(allParams.role || []).map((p) => p.name), 'Sem role'])];
  return (allParams[dim] || []).map((p) => p.name);
}

function charDimValues(c, dim) {
  if (dim === 'role') {
    const roles = [...new Set([c.role1, c.role2].filter(Boolean))];
    return roles.length ? roles : ['Sem role'];
  }
  return [DIM_VALUE[dim](c)];
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
  ['region', 'affiliation', 'element', 'weapon', 'role'].forEach((dim) => {
    const sel = document.getElementById(`f-${dim}`);
    // Esta função também é chamada ao limpar filtros: reconstrua as opções
    // para que a lista nunca acumule duplicatas.
    while (sel.options.length > 1) sel.remove(1);
    [...new Set((allParams[dim] || []).map((p) => p.name))].forEach((value) => {
      const opt = document.createElement('option');
      opt.value = value;
      opt.textContent = value;
      sel.appendChild(opt);
    });
    sel.value = filters[dim];
  });
  document.getElementById('f-rarity').value = filters.rarity;
}

async function load() {
  loadGroupingState();
  [allChars, allParams] = await Promise.all([api('/api/characters'), api('/api/params')]);
  // A trilha é opcional: se a rota falhar, o slideshow segue mudo em vez de quebrar.
  allTracks = await api('/api/tracks').catch(() => []);
  populateFilterSelects();
  render();
  maybeAutoSlideshow();
}

function cardHtml(c) {
  const elem = c.element.image
    ? `<img class="cc-elem" src="${esc(thumbUrl(c.element.image, 64))}" title="${esc(c.element.name)}" alt="">`
    : '';
  return `
    <a class="char-card" href="/chars/${c.id}">
      <div class="cc-media demo-media">
        <img class="promo" src="${esc(thumbUrl(c.card_promo, 480))}" alt="${esc(c.name)}" loading="lazy">
        ${demoToggleHtml(c)}
      </div>
      ${elem}
      <div class="cc-info">
        <span class="cc-name">${esc(c.name)}</span>
        ${starsHtml(c.rarity)}
      </div>
    </a>`;
}

// Um personagem passa no conjunto de filtros? Usado pela galeria e pelo slideshow.
function matchesFilters(c, f) {
  if (f.region && (c.region.name || '') !== f.region) return false;
  if (f.affiliation && (c.affiliation.name || '') !== f.affiliation) return false;
  if (f.element && (c.element.name || '') !== f.element) return false;
  if (f.weapon && (c.weapon.name || '') !== f.weapon) return false;
  if (f.rarity && String(c.rarity) !== f.rarity) return false;
  if (f.role && c.role1 !== f.role && c.role2 !== f.role) return false;
  return true;
}

function render() {
  const area = document.getElementById('chars-area');
  let chars = allChars.filter((c) => {
    if (searchTerm && !c.name.toLowerCase().includes(searchTerm)) return false;
    return matchesFilters(c, filters);
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
  const dims = ['region', 'affiliation', 'element', 'weapon', 'rarity', 'role'].filter((d) => activeDims.has(d));
  const groups = new Map();
  for (const c of chars) {
    let combinations = [[]];
    for (const dim of dims) {
      combinations = combinations.flatMap((combo) =>
        charDimValues(c, dim).map((value) => [...combo, value]));
    }
    for (const combination of combinations) {
      const key = combination.join(' · ');
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(c);
    }
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

['region', 'affiliation', 'element', 'weapon', 'rarity', 'role'].forEach((dim) => {
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

/* ================================================================
   Slideshow "✦ show"
   Modal de filtros (os mesmos da barra "Filtrar por") + ordem escolhida
   pelo usuário, e um palco em <canvas>: o card aparece por 2s com um
   leve zoom in e, quando há vídeo cadastrado, o vídeo toca em seguida;
   ao terminar, vai sozinho para o próximo personagem.
   O palco é desenhado em canvas para que a mesma imagem sirva para
   assistir, gravar (download) e projetar.
   ================================================================ */

const SS_CARD_MS = 2000;          // tempo do card, com o zoom in
const SS_FADE_MS = 380;           // crossfade do card para o vídeo
const SS_GIF_MS = 5000;           // "vídeo" em gif não tem fim: tempo fixo
const SS_VIDEO_TIMEOUT_MS = 8000; // vídeo que não começa não trava o slideshow
const SS_FONT = '"Segoe UI", system-ui, -apple-system, sans-serif';

const SS_ORDERS = [
  ['alpha', 'Ordem alfabética (A → Z)'],
  ['rarity45', '4★ → 5★ (e nome)'],
  ['rarity54', 'Raridade: 5★ → 4★ (e nome)'],
  ['element', 'Elemento (e nome)'],
  ['region', 'Região (e nome)'],
];

const SS_FILTER_LABELS = [
  ['region', 'Região', 'todas'],
  ['affiliation', 'Afiliação', 'todas'],
  ['element', 'Elemento', 'todos'],
  ['weapon', 'Arma', 'todas'],
  ['role', 'Role', 'todas'],
];

const ssByName = (a, b) => a.name.localeCompare(b.name, 'pt-BR');
const ssText = (v) => (v || 'zzzz');

function ssSort(list, order) {
  const cmp = {
    alpha: ssByName,
    rarity45: (a, b) => (a.rarity - b.rarity) || ssByName(a, b),
    rarity54: (a, b) => (b.rarity - a.rarity) || ssByName(a, b),
    element: (a, b) => ssText(a.element.name).localeCompare(ssText(b.element.name), 'pt-BR') || ssByName(a, b),
    region: (a, b) => ssText(a.region.name).localeCompare(ssText(b.region.name), 'pt-BR') || ssByName(a, b),
  }[order] || ssByName;
  return [...list].sort(cmp);
}

function ssSelect(list, f, order) {
  return ssSort(list.filter((c) => matchesFilters(c, f)), order);
}

const ssIsGif = (url) => /\.gif(\?.*)?$/i.test(url || '');
const ssCardUrl = (c) => thumbUrl(c.card_promo || c.card_full, 1000);

// ---------------------------------------------------------------- modal de filtros
function openSlideshowModal() {
  const f = { ...filters };
  let order = 'alpha';
  try { order = localStorage.getItem('niro:chars:ss-order') || 'alpha'; } catch (_) { /* storage indisponível */ }
  ssAudioCarregarPrefs();
  let trilha = ssAudio.modo === 'fixa' && ssAudio.fixa ? String(ssAudio.fixa.id) : ssAudio.modo;
  if (trilha === 'auto' && !allTracks.length) trilha = 'none';

  const selects = SS_FILTER_LABELS.map(([dim, label, all]) => {
    const values = [...new Set((allParams[dim] || []).map((p) => p.name))];
    return `<select data-ss-filter="${dim}">
      <option value="">${label}: ${all}</option>
      ${values.map((v) => `<option value="${esc(v)}" ${v === f[dim] ? 'selected' : ''}>${esc(v)}</option>`).join('')}
    </select>`;
  }).join('');

  const overlay = openModal(`
    <h3><span class="rune">&#x16DE;</span> Slideshow de personagens</h3>
    <p class="page-sub" style="margin-bottom:14px">
      Cada personagem aparece 2s no card, com um leve zoom, e em seguida toca o vídeo
      cadastrado (quando houver). No fim do vídeo passa sozinho para o próximo.
    </p>
    <div class="ss-filters">
      ${selects}
      <select data-ss-filter="rarity">
        <option value="">Raridade: todas</option>
        <option value="5" ${f.rarity === '5' ? 'selected' : ''}>5 Estrelas</option>
        <option value="4" ${f.rarity === '4' ? 'selected' : ''}>4 Estrelas</option>
      </select>
    </div>
    <div class="ss-order-row">
      <label class="field-label" for="ss-order">Ordem dos personagens</label>
      <select id="ss-order">
        ${SS_ORDERS.map(([v, label]) => `<option value="${v}" ${v === order ? 'selected' : ''}>${label}</option>`).join('')}
      </select>
    </div>
    <div class="ss-order-row">
      <label class="field-label" for="ss-track">Trilha sonora</label>
      <select id="ss-track">
        <option value="auto" ${trilha === 'auto' ? 'selected' : ''}>Automática (segue o elemento ou a região)</option>
        <option value="random" ${trilha === 'random' ? 'selected' : ''}>Aleatória entre todas</option>
        <option value="none" ${trilha === 'none' ? 'selected' : ''}>Sem trilha</option>
        ${allTracks.map((t) => `<option value="${t.id}" ${trilha === String(t.id) ? 'selected' : ''}>
          Só esta: ${esc(t.name)}${t.ref_name ? ` (${esc(t.ref_name)})` : ''}</option>`).join('')}
      </select>
      ${allTracks.length ? '' : '<p class="page-sub">Nenhuma faixa cadastrada — veja o módulo Trilhas.</p>'}
    </div>
    <p class="ss-count" id="ss-count"></p>
    <div class="modal-actions">
      <button type="button" class="btn" data-close>Cancelar</button>
      <button type="button" class="btn primary" id="ss-start">&#9654; Iniciar slideshow</button>
    </div>`, { wide: true });

  const countEl = overlay.querySelector('#ss-count');
  const startBtn = overlay.querySelector('#ss-start');

  function refresh() {
    const list = ssSelect(allChars, f, order);
    const withVideo = list.filter((c) => c.demo_video).length;
    countEl.textContent = list.length
      ? `${list.length} ${list.length === 1 ? 'personagem' : 'personagens'} no slideshow · `
        + `${withVideo} com vídeo cadastrado`
      : 'Nenhum personagem atende a esses filtros.';
    startBtn.disabled = !list.length;
    return list;
  }

  overlay.querySelectorAll('[data-ss-filter]').forEach((sel) => {
    sel.addEventListener('change', () => { f[sel.dataset.ssFilter] = sel.value; refresh(); });
  });
  overlay.querySelector('#ss-order').addEventListener('change', function () {
    order = this.value;
    try { localStorage.setItem('niro:chars:ss-order', order); } catch (_) { /* storage indisponível */ }
    refresh();
  });
  overlay.querySelector('#ss-track').addEventListener('change', function () { trilha = this.value; });
  overlay.querySelector('[data-close]').addEventListener('click', () => closeModal(overlay));
  startBtn.addEventListener('click', () => {
    const list = refresh();
    if (!list.length) return;
    closeModal(overlay);
    ssAplicarTrilha(trilha);
    ssStart(list, f, order);
  });
  refresh();
}

// ---------------------------------------------------------------- trilha sonora
// Tudo passa por um AudioContext (e não por um <audio> solto) por três motivos:
// dá para abaixar o volume durante o vídeo do personagem (ducking), dá para fazer
// crossfade entre faixas, e o áudio entra na gravação do botão de download.
//
//   slot.gain ──┐
//   slot.gain ──┴─> duck ─> master ─┬─> alto-falantes
//                                   └─> MediaStreamDestination (gravação)
const SS_AUDIO_KEY = 'niro:chars:ss-audio';
const SS_FADE_AUDIO = 1.2;   // crossfade entre faixas, em segundos
const SS_DUCK = 0.35;        // volume da trilha enquanto o vídeo toca

const ssAudio = {
  ctx: null, master: null, duck: null, dest: null,
  slots: [], atual: -1,
  modo: 'auto', fixa: null, grupo: null,
  volume: 0.7, mudo: false,
};

function ssAudioCarregarPrefs() {
  try {
    const salvo = JSON.parse(localStorage.getItem(SS_AUDIO_KEY));
    if (salvo) {
      if (typeof salvo.volume === 'number') ssAudio.volume = salvo.volume;
      if (typeof salvo.mudo === 'boolean') ssAudio.mudo = salvo.mudo;
      if (salvo.modo) ssAudio.modo = salvo.modo;
    }
  } catch (_) { /* storage indisponível */ }
}

function ssAudioSalvarPrefs() {
  try {
    localStorage.setItem(SS_AUDIO_KEY,
      JSON.stringify({ volume: ssAudio.volume, mudo: ssAudio.mudo, modo: ssAudio.modo }));
  } catch (_) { /* storage indisponível */ }
}

function ssAudioIniciar() {
  if (ssAudio.ctx || ssAudio.modo === 'none') return;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return;
  ssAudio.ctx = new Ctx();
  ssAudio.master = ssAudio.ctx.createGain();
  ssAudio.master.gain.value = ssAudio.mudo ? 0 : ssAudio.volume;
  ssAudio.duck = ssAudio.ctx.createGain();
  ssAudio.duck.gain.value = 1;
  ssAudio.duck.connect(ssAudio.master);
  ssAudio.master.connect(ssAudio.ctx.destination);
  ssAudio.dest = ssAudio.ctx.createMediaStreamDestination();
  ssAudio.master.connect(ssAudio.dest);

  // dois slots alternados: enquanto um sobe, o outro desce (crossfade)
  ssAudio.slots = [0, 1].map(() => {
    const el = document.createElement('audio');
    el.loop = true;
    el.preload = 'auto';
    el.crossOrigin = 'anonymous';
    ss.pool.appendChild(el);
    const gain = ssAudio.ctx.createGain();
    gain.gain.value = 0;
    ssAudio.ctx.createMediaElementSource(el).connect(gain);
    gain.connect(ssAudio.duck);
    return { el, gain };
  });
  ssAudio.atual = -1;
  ssAudio.grupo = null;
  ssAudioResumir();
}

function ssAudioResumir() {
  if (ssAudio.ctx && ssAudio.ctx.state === 'suspended') {
    ssAudio.ctx.resume().catch(() => { /* precisa de um toque do usuário */ });
  }
  ssAtualizarBotaoSom();
}

function ssSorteio(lista) {
  return lista[Math.floor(Math.random() * lista.length)];
}

// Qual faixa combina com este personagem, e a que grupo ela pertence.
// O grupo evita trocar de música a cada personagem: só troca quando muda o
// elemento (ou a região) do bloco que está passando.
function ssFaixaPara(c) {
  if (!allTracks.length) return null;
  if (ssAudio.modo === 'fixa') {
    return ssAudio.fixa ? { grupo: `f:${ssAudio.fixa.id}`, faixa: ssAudio.fixa } : null;
  }
  if (ssAudio.modo === 'auto') {
    const doElemento = allTracks.filter((t) => t.scope === 'element' && t.ref_name === c.element.name);
    if (doElemento.length) return { grupo: `e:${c.element.name}`, faixa: ssSorteio(doElemento) };
    const daRegiao = allTracks.filter((t) => t.scope === 'region' && t.ref_name === c.region.name);
    if (daRegiao.length) return { grupo: `r:${c.region.name}`, faixa: ssSorteio(daRegiao) };
  }
  return { grupo: 'aleatorio', faixa: ssSorteio(allTracks) };
}

function ssAudioTocar(faixa) {
  if (!ssAudio.ctx || !faixa) return;
  const proximo = (ssAudio.atual + 1) % 2;
  const slot = ssAudio.slots[proximo];
  slot.el.src = faixa.url;
  slot.el.play().catch(() => { /* liberado no primeiro toque */ });

  const agora = ssAudio.ctx.currentTime;
  const subir = slot.gain.gain;
  subir.cancelScheduledValues(agora);
  subir.setValueAtTime(subir.value, agora);
  subir.linearRampToValueAtTime(1, agora + SS_FADE_AUDIO);

  if (ssAudio.atual >= 0) {
    const anterior = ssAudio.slots[ssAudio.atual];
    const descer = anterior.gain.gain;
    descer.cancelScheduledValues(agora);
    descer.setValueAtTime(descer.value, agora);
    descer.linearRampToValueAtTime(0, agora + SS_FADE_AUDIO);
    setTimeout(() => anterior.el.pause(), SS_FADE_AUDIO * 1000 + 200);
  }
  ssAudio.atual = proximo;
}

// Chamado a cada troca de personagem.
function ssAudioAcompanhar(c) {
  if (!ssAudio.ctx) return;
  const escolha = ssFaixaPara(c);
  if (!escolha) return;
  if (escolha.grupo === ssAudio.grupo) return;   // mesmo bloco: mantém a música
  ssAudio.grupo = escolha.grupo;
  ssAudioTocar(escolha.faixa);
}

// Abaixa a trilha enquanto o vídeo do personagem toca e devolve o volume depois.
function ssAudioDuck(abaixar) {
  if (!ssAudio.ctx) return;
  const agora = ssAudio.ctx.currentTime;
  const g = ssAudio.duck.gain;
  g.cancelScheduledValues(agora);
  g.setValueAtTime(g.value, agora);
  g.linearRampToValueAtTime(abaixar ? SS_DUCK : 1, agora + 0.4);
}

function ssAudioVolume() {
  if (!ssAudio.ctx) return;
  const agora = ssAudio.ctx.currentTime;
  ssAudio.master.gain.cancelScheduledValues(agora);
  ssAudio.master.gain.setValueAtTime(ssAudio.master.gain.value, agora);
  ssAudio.master.gain.linearRampToValueAtTime(ssAudio.mudo ? 0 : ssAudio.volume, agora + 0.15);
}

function ssAudioPausar(pausado) {
  ssAudio.slots.forEach((s, i) => {
    if (i !== ssAudio.atual) return;
    if (pausado) s.el.pause();
    else s.el.play().catch(() => { /* liberado no primeiro toque */ });
  });
}

function ssAudioEncerrar() {
  if (!ssAudio.ctx) return;
  const ctx = ssAudio.ctx;
  const agora = ctx.currentTime;
  ssAudio.master.gain.cancelScheduledValues(agora);
  ssAudio.master.gain.setValueAtTime(ssAudio.master.gain.value, agora);
  ssAudio.master.gain.linearRampToValueAtTime(0, agora + 0.6);   // fade out ao fechar
  ssAudio.slots.forEach((s) => { try { s.el.pause(); } catch (_) { /* já parado */ } });
  setTimeout(() => ctx.close().catch(() => { /* já fechado */ }), 700);
  ssAudio.ctx = null;
  ssAudio.slots = [];
  ssAudio.atual = -1;
  ssAudio.grupo = null;
}

// ---------------------------------------------------------------- estado do palco
const ss = {
  open: false, overlay: null, canvas: null, ctx: null, pool: null,
  list: [], filters: {}, order: 'alpha',
  idx: 0, phase: 'card', phaseStart: 0, paused: false, pausedAt: 0, raf: 0,
  media: null, mediaStarted: 0,
  images: new Map(), videos: new Map(),
  rec: null, chunks: [], recMime: '', recStart: 0,
};

function ssImage(url) {
  if (!url) return Promise.resolve(null);
  if (ss.images.has(url)) return ss.images.get(url);
  const p = new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
  ss.images.set(url, p);
  p.then((img) => ss.images.set(url, img));
  return p;
}

function ssLoaded(url) {
  const v = ss.images.get(url);
  return v && v.naturalWidth ? v : null;
}

// Elemento de mídia do personagem: <video> para vídeo, <img> para gif.
function ssMediaFor(i) {
  const c = ss.list[i];
  if (!c || !c.demo_video) return null;
  if (ss.videos.has(i)) return ss.videos.get(i);
  const src = `/static/${c.demo_video}`;
  let el;
  if (ssIsGif(src)) {
    el = document.createElement('img');
    el.src = src;
  } else {
    el = document.createElement('video');
    el.muted = true;
    el.defaultMuted = true;
    el.loop = false;
    el.playsInline = true;
    el.setAttribute('playsinline', '');
    el.setAttribute('webkit-playsinline', '');
    el.preload = 'auto';
    el.src = src;
    el.load();
  }
  ss.pool.appendChild(el);
  ss.videos.set(i, el);
  return el;
}

function ssReleaseMedia(keep) {
  [...ss.videos.keys()].forEach((i) => {
    if (keep.includes(i)) return;
    const el = ss.videos.get(i);
    if (el.tagName === 'VIDEO') { el.pause(); el.removeAttribute('src'); el.load(); }
    el.remove();
    ss.videos.delete(i);
  });
}

// ---------------------------------------------------------------- desenho
function ssRoundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function ssCover(sw, sh, dw, dh) {
  const s = Math.max(dw / (sw || 1), dh / (sh || 1));
  const w = sw * s, h = sh * s;
  return { x: (dw - w) / 2, y: (dh - h) / 2, w, h };
}

function ssContain(sw, sh, dw, dh) {
  const s = Math.min(dw / (sw || 1), dh / (sh || 1));
  const w = sw * s, h = sh * s;
  return { x: (dw - w) / 2, y: (dh - h) / 2, w, h };
}

function ssBackdrop(img) {
  const { ctx, canvas: cv } = ss;
  ctx.save();
  ctx.fillStyle = '#05050c';
  ctx.fillRect(0, 0, cv.width, cv.height);
  if (img) {
    const blurs = typeof ctx.filter === 'string';
    if (blurs) ctx.filter = `blur(${Math.round(cv.width * 0.03)}px)`;
    ctx.globalAlpha = blurs ? 0.45 : 0.16;
    const f = ssCover(img.naturalWidth || img.videoWidth, img.naturalHeight || img.videoHeight,
      cv.width * 1.25, cv.height * 1.25);
    ctx.drawImage(img, -cv.width * 0.125 + f.x, -cv.height * 0.125 + f.y, f.w, f.h);
    if (blurs) ctx.filter = 'none';
    ctx.globalAlpha = 1;
  }
  const g = ctx.createRadialGradient(cv.width / 2, cv.height * 0.35, 0,
    cv.width / 2, cv.height * 0.5, cv.width * 0.85);
  g.addColorStop(0, 'rgba(26, 20, 64, 0.55)');
  g.addColorStop(1, 'rgba(5, 5, 12, 0.94)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.restore();
}

function ssCardBox() {
  const cv = ss.canvas;
  let h = cv.height * 0.86;
  let w = h * 0.75;                       // mesmo 3:4 do card da galeria
  if (w > cv.width * 0.88) { w = cv.width * 0.88; h = w / 0.75; }
  return { x: (cv.width - w) / 2, y: (cv.height - h) / 2, w, h };
}

function ssDrawCard(c, t, alpha) {
  const { ctx } = ss;
  const { x, y, w, h } = ssCardBox();
  const ease = 1 - Math.pow(1 - t, 3);
  const zoom = 1 + 0.08 * ease;           // zoom in leve: dá movimento ao card
  const radius = Math.min(w, h) * 0.05;
  const img = ssLoaded(ssCardUrl(c));

  ctx.save();
  ctx.globalAlpha = alpha;

  ctx.save();
  ctx.shadowColor = 'rgba(90, 215, 232, 0.35)';
  ctx.shadowBlur = w * 0.06;
  ssRoundRect(ctx, x, y, w, h, radius);
  ctx.fillStyle = 'rgba(12, 12, 24, 0.95)';
  ctx.fill();
  ctx.restore();

  ctx.save();
  ssRoundRect(ctx, x, y, w, h, radius);
  ctx.clip();
  if (img) {
    const zw = w * zoom, zh = h * zoom;
    const f = ssCover(img.naturalWidth, img.naturalHeight, zw, zh);
    ctx.drawImage(img, x + (w - zw) / 2 + f.x, y + (h - zh) / 2 + f.y, f.w, f.h);
  }

  // faixa inferior com nome e estrelas, como no card da galeria
  const barH = h * 0.105;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.fillRect(x, y + h - barH, w, barH);
  ctx.textBaseline = 'middle';
  ctx.font = `600 ${barH * 0.4}px ${SS_FONT}`;
  ctx.fillStyle = '#f2f3fa';
  ctx.textAlign = 'left';
  ctx.fillText(c.name, x + w * 0.05, y + h - barH / 2, w * 0.6);
  ctx.textAlign = 'right';
  ctx.fillStyle = c.rarity === 5 ? '#e0b45c' : '#9085e9';
  ctx.font = `${barH * 0.33}px ${SS_FONT}`;
  ctx.fillText('★'.repeat(c.rarity || 0), x + w - w * 0.05, y + h - barH / 2);

  // ícone do elemento no canto superior esquerdo
  const elImg = ssLoaded(thumbUrl(c.element.image, 128));
  if (elImg) {
    const d = w * 0.13;
    const ex = x + w * 0.045, ey = y + w * 0.045;
    ctx.save();
    ctx.beginPath();
    ctx.arc(ex + d / 2, ey + d / 2, d / 2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fill();
    ctx.clip();
    const f = ssContain(elImg.naturalWidth, elImg.naturalHeight, d * 0.74, d * 0.74);
    ctx.drawImage(elImg, ex + d * 0.13 + f.x, ey + d * 0.13 + f.y, f.w, f.h);
    ctx.restore();
  }
  ctx.restore();

  ssRoundRect(ctx, x, y, w, h, radius);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
  ctx.lineWidth = Math.max(1, w * 0.003);
  ctx.stroke();
  ctx.restore();
}

function ssDrawMedia(el, c, alpha) {
  const { ctx, canvas: cv } = ss;
  const sw = el.videoWidth || el.naturalWidth;
  const sh = el.videoHeight || el.naturalHeight;
  if (!sw || !sh) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  const bw = cv.width * 0.96, bh = cv.height * 0.94;
  const f = ssContain(sw, sh, bw, bh);
  ctx.drawImage(el, (cv.width - bw) / 2 + f.x, (cv.height - bh) / 2 + f.y, f.w, f.h);

  const pad = cv.width * 0.03;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
  ctx.shadowBlur = cv.width * 0.012;
  ctx.font = `600 ${cv.height * 0.042}px ${SS_FONT}`;
  ctx.fillStyle = '#f2f3fa';
  ctx.fillText(c.name, pad, cv.height - pad);
  ctx.font = `${cv.height * 0.032}px ${SS_FONT}`;
  ctx.fillStyle = c.rarity === 5 ? '#e0b45c' : '#9085e9';
  ctx.fillText('★'.repeat(c.rarity || 0), pad, cv.height - pad - cv.height * 0.052);
  ctx.restore();
}

// ---------------------------------------------------------------- laço de exibição
function ssNow() { return performance.now(); }

function ssGoTo(i, { restartMedia = true } = {}) {
  ss.idx = (i + ss.list.length) % ss.list.length;
  if (ss.media && ss.media.tagName === 'VIDEO') ss.media.pause();
  ss.media = null;
  ss.phase = 'card';
  ss.phaseStart = ssNow();
  if (restartMedia) ssPreload();
  ssAudioAcompanhar(ss.list[ss.idx]);
  ssAudioDuck(false);
  ssUpdateBar();
}

function ssPreload() {
  const nexts = [ss.idx, (ss.idx + 1) % ss.list.length];
  nexts.forEach((i) => {
    const c = ss.list[i];
    ssImage(ssCardUrl(c));
    if (c.element.image) ssImage(thumbUrl(c.element.image, 128));
    ssMediaFor(i);
  });
  ssReleaseMedia([ss.idx, (ss.idx + 1) % ss.list.length]);
}

function ssStartMedia() {
  const el = ssMediaFor(ss.idx);
  if (!el) { ssNext(); return; }
  ss.media = el;
  ss.mediaStarted = 0;
  ss.phase = 'media';
  ssAudioDuck(true);   // a trilha recua para o vídeo do personagem aparecer
  ss.phaseStart = ssNow();
  if (el.tagName === 'VIDEO') {
    try { el.currentTime = 0; } catch (_) { /* ainda sem metadata */ }
    el.play().then(() => { ss.mediaStarted = 1; }).catch(() => { /* segue pelo timeout */ });
  } else {
    ss.mediaStarted = 1;
  }
  ssUpdateBar();
}

function ssNext() {
  if (ss.idx + 1 >= ss.list.length) {
    if (ss.rec) { ssStopRecording(); return; }   // gravação termina no fim da lista
    ssGoTo(0);
    return;
  }
  ssGoTo(ss.idx + 1);
}

function ssFrame() {
  if (!ss.open) return;
  ss.raf = requestAnimationFrame(ssFrame);
  const c = ss.list[ss.idx];
  if (!c) return;
  const elapsed = (ss.paused ? ss.pausedAt : ssNow()) - ss.phaseStart;
  const cardImg = ssLoaded(ssCardUrl(c));

  if (ss.phase === 'card') {
    const t = Math.min(1, elapsed / SS_CARD_MS);
    ssBackdrop(cardImg);
    ssDrawCard(c, t, 1);
    if (!ss.paused && t >= 1) ssStartMedia();
    return;
  }

  const el = ss.media;
  const ready = el && (el.tagName === 'IMG' ? el.complete && el.naturalWidth : el.readyState >= 2);
  const a = ready ? Math.min(1, elapsed / SS_FADE_MS) : 0;
  ssBackdrop(ready ? el : cardImg);
  if (a < 1) ssDrawCard(c, 1, 1 - a);
  if (ready) ssDrawMedia(el, c, a);
  ssUpdateProgress();

  if (ss.paused) return;
  const ended = el && el.tagName === 'VIDEO'
    ? el.ended
    : ready && elapsed >= SS_GIF_MS;
  const stalled = !ss.mediaStarted && elapsed > SS_VIDEO_TIMEOUT_MS;
  if (ended || stalled) ssNext();
}

// ---------------------------------------------------------------- palco (overlay)
const SS_ICONS = {
  prev: '<svg viewBox="0 0 24 24"><path d="M7 6h2v12H7zm11 0v12l-8-6z" fill="currentColor"/></svg>',
  next: '<svg viewBox="0 0 24 24"><path d="M15 6h2v12h-2zM6 6l8 6-8 6z" fill="currentColor"/></svg>',
  play: '<svg viewBox="0 0 24 24"><path d="M7 5l12 7-12 7z" fill="currentColor"/></svg>',
  pause: '<svg viewBox="0 0 24 24"><path d="M7 5h3.5v14H7zm6.5 0H17v14h-3.5z" fill="currentColor"/></svg>',
  full: '<svg viewBox="0 0 24 24"><path d="M4 9V4h5v2H6v3zm11-5h5v5h-2V6h-3zM4 15h2v3h3v2H4zm14 0h2v5h-5v-2h3z" fill="currentColor"/></svg>',
  down: '<svg viewBox="0 0 24 24"><path d="M12 3v9.2l3.6-3.6 1.4 1.4-6 6-6-6 1.4-1.4L10 12.2V3zM4 19h16v2H4z" fill="currentColor"/></svg>',
  cast: '<svg viewBox="0 0 24 24"><path d="M3 5h18v11h-6v-2h4V7H5v2H3zm0 6a7 7 0 0 1 7 7H8a5 5 0 0 0-5-5zm0 4a3 3 0 0 1 3 3H4a1 1 0 0 0-1-1z" fill="currentColor"/></svg>',
  close: '<svg viewBox="0 0 24 24"><path d="M18.3 5.7 12 12l6.3 6.3-1.4 1.4L10.6 13.4 4.3 19.7 2.9 18.3 9.2 12 2.9 5.7l1.4-1.4L10.6 10.6l6.3-6.3z" fill="currentColor"/></svg>',
  som: '<svg viewBox="0 0 24 24"><path d="M4 9h3l5-4v14l-5-4H4zm12.5-.5a5 5 0 0 1 0 7l1.4 1.4a7 7 0 0 0 0-9.8z" fill="currentColor"/></svg>',
  mudo: '<svg viewBox="0 0 24 24"><path d="M4 9h3l5-4v14l-5-4H4zm13.7-1.3 1.4 1.4L17.4 12l1.7 1.9-1.4 1.4L16 13.4l-1.7 1.9-1.4-1.4L14.6 12l-1.7-1.9 1.4-1.4L16 10.6z" fill="currentColor"/></svg>',
};

function ssStart(list, f, order) {
  if (ss.open) ssClose();
  ss.list = list;
  ss.filters = { ...f };
  ss.order = order;
  ss.open = true;
  ss.paused = false;
  ss.images = new Map();
  ss.videos = new Map();

  const portrait = window.innerHeight > window.innerWidth;
  const overlay = document.createElement('div');
  overlay.className = 'ss-overlay';
  overlay.innerHTML = `
    <div class="ss-stage"><canvas class="ss-canvas"></canvas></div>
    <div class="ss-pool"></div>
    <div class="ss-bar">
      <div class="ss-track"><span></span></div>
      <div class="ss-row">
        <div class="ss-meta"></div>
        <div class="ss-buttons">
          <button type="button" class="ss-btn" data-act="prev" title="Anterior">${SS_ICONS.prev}</button>
          <button type="button" class="ss-btn" data-act="toggle" title="Pausar">${SS_ICONS.pause}</button>
          <button type="button" class="ss-btn" data-act="next" title="Próximo">${SS_ICONS.next}</button>
          <span class="ss-sep"></span>
          <button type="button" class="ss-btn" data-act="som" title="Silenciar a trilha">${SS_ICONS.som}</button>
          <input type="range" class="ss-vol" min="0" max="100" step="1" value="70"
                 aria-label="Volume da trilha" title="Volume da trilha">
          <span class="ss-sep"></span>
          <button type="button" class="ss-btn" data-act="full" title="Tela cheia">${SS_ICONS.full}</button>
          <button type="button" class="ss-btn" data-act="download" title="Baixar o slideshow em vídeo">${SS_ICONS.down}</button>
          <button type="button" class="ss-btn" data-act="cast" title="Projetar na TV">${SS_ICONS.cast}</button>
          <span class="ss-sep"></span>
          <button type="button" class="ss-btn danger" data-act="close" title="Fechar">${SS_ICONS.close}</button>
        </div>
      </div>
      <div class="ss-rec" hidden>
        <div class="ai-progress active"><div class="bar" style="animation:none"></div></div>
        <div class="ss-rec-row">
          <span class="ss-rec-label"></span>
          <button type="button" class="btn small" data-act="stop-rec">Parar e salvar</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  document.body.classList.add('ss-lock');

  ss.overlay = overlay;
  ss.pool = overlay.querySelector('.ss-pool');
  ss.canvas = overlay.querySelector('.ss-canvas');
  ss.canvas.width = portrait ? 720 : 1280;
  ss.canvas.height = portrait ? 1280 : 720;
  ss.ctx = ss.canvas.getContext('2d');

  overlay.querySelectorAll('[data-act]').forEach((btn) => {
    btn.addEventListener('click', () => ssAction(btn.dataset.act));
  });
  overlay.querySelector('.ss-stage').addEventListener('click', () => ssAction('toggle'));
  const volume = overlay.querySelector('.ss-vol');
  volume.value = Math.round(ssAudio.volume * 100);
  volume.addEventListener('input', function () {
    ssAudio.volume = this.value / 100;
    ssAudio.mudo = false;
    ssAudioVolume();
    ssAudioSalvarPrefs();
    ssAtualizarBotaoSom();
  });
  // qualquer toque no palco serve de gesto para o navegador liberar o áudio
  overlay.addEventListener('pointerdown', ssAudioResumir);
  document.addEventListener('keydown', ssKeys);

  // iOS só libera o play de vídeo dentro de um gesto: destrava aqui, no clique
  // que abriu o slideshow, os elementos já criados.
  ssGoTo(0);
  ss.videos.forEach((el) => {
    if (el.tagName !== 'VIDEO') return;
    const p = el.play();
    if (p && p.then) p.then(() => el.pause()).catch(() => { /* destrava no play seguinte */ });
  });
  ssAudioIniciar();
  ssAudioAcompanhar(ss.list[0]);
  ss.raf = requestAnimationFrame(ssFrame);
}

function ssClose() {
  if (!ss.open) return;
  ss.open = false;
  ssAudioEncerrar();
  cancelAnimationFrame(ss.raf);
  if (ss.rec && ss.rec.state !== 'inactive') { try { ss.rec.stop(); } catch (_) { /* já parado */ } }
  ss.rec = null;
  ssReleaseMedia([]);
  document.removeEventListener('keydown', ssKeys);
  if (document.fullscreenElement || document.webkitFullscreenElement) ssExitFullscreen();
  if (ss.overlay) ss.overlay.remove();
  ss.overlay = null;
  document.body.classList.remove('ss-lock');
}

function ssKeys(e) {
  if (!ss.open) return;
  // Com um modal aberto por cima (download, projeção), o teclado é dele.
  if (document.querySelector('.modal-overlay')) return;
  if (e.key === 'Escape') { ssClose(); return; }
  if (e.key === ' ') { e.preventDefault(); ssAction('toggle'); }
  if (e.key === 'ArrowRight') ssAction('next');
  if (e.key === 'ArrowLeft') ssAction('prev');
  if (e.key.toLowerCase() === 'f') ssAction('full');
}

function ssAction(act) {
  if (act === 'toggle') ssTogglePause();
  else if (act === 'next') ssGoTo(ss.idx + 1);
  else if (act === 'prev') ssGoTo(ss.idx - 1);
  else if (act === 'full') ssToggleFullscreen();
  else if (act === 'download') ssAskDownload();
  else if (act === 'cast') ssOpenCastModal();
  else if (act === 'stop-rec') ssStopRecording();
  else if (act === 'som') ssAlternarSom();
  else if (act === 'close') ssClose();
}

function ssAlternarSom() {
  ssAudio.mudo = !ssAudio.mudo;
  ssAudioVolume();
  ssAudioSalvarPrefs();
  ssAtualizarBotaoSom();
}

// O navegador só libera som depois de um gesto. Quando o slideshow abre sozinho
// (link com ?show=1), o botão fica marcado e o primeiro toque destrava.
function ssAtualizarBotaoSom() {
  if (!ss.overlay) return;
  const btn = ss.overlay.querySelector('[data-act="som"]');
  if (!btn) return;
  const semTrilha = ssAudio.modo === 'none' || !allTracks.length;
  btn.hidden = semTrilha;
  const vol = ss.overlay.querySelector('.ss-vol');
  if (vol) vol.hidden = semTrilha;
  const travado = ssAudio.ctx && ssAudio.ctx.state === 'suspended';
  btn.classList.toggle('alerta', !!travado);
  // Só troca o ícone quando ele realmente muda: reescrever o conteúdo do botão
  // entre o pointerdown e o mouseup cancela o clique do usuário.
  const icone = (ssAudio.mudo || travado) ? 'mudo' : 'som';
  if (btn.dataset.icone !== icone) {
    btn.innerHTML = SS_ICONS[icone];
    btn.dataset.icone = icone;
  }
  btn.title = travado ? 'Toque para ativar o som'
    : (ssAudio.mudo ? 'Ativar a trilha' : 'Silenciar a trilha');
}

// Traduz a escolha do modal ('auto' | 'random' | 'none' | id da faixa) para o motor.
function ssAplicarTrilha(valor) {
  if (valor === 'auto' || valor === 'none') {
    ssAudio.modo = valor;
    ssAudio.fixa = null;
  } else if (valor === 'random') {
    ssAudio.modo = 'random';
    ssAudio.fixa = null;
  } else {
    ssAudio.fixa = allTracks.find((t) => String(t.id) === String(valor)) || null;
    ssAudio.modo = ssAudio.fixa ? 'fixa' : 'auto';
  }
  ssAudio.grupo = null;
  ssAudioSalvarPrefs();
}

function ssTogglePause() {
  ss.paused = !ss.paused;
  const btn = ss.overlay.querySelector('[data-act="toggle"]');
  if (ss.paused) {
    ss.pausedAt = ssNow();
    if (ss.media && ss.media.tagName === 'VIDEO') ss.media.pause();
    ssAudioPausar(true);
    btn.innerHTML = SS_ICONS.play;
    btn.title = 'Continuar';
  } else {
    ss.phaseStart += ssNow() - ss.pausedAt;
    if (ss.media && ss.media.tagName === 'VIDEO') ss.media.play().catch(() => { /* segue pelo timeout */ });
    ssAudioPausar(false);
    btn.innerHTML = SS_ICONS.pause;
    btn.title = 'Pausar';
  }
}

function ssUpdateBar() {
  if (!ss.overlay) return;
  const c = ss.list[ss.idx];
  ssAtualizarBotaoSom();
  ss.overlay.querySelector('.ss-meta').textContent =
    `${ss.idx + 1}/${ss.list.length} · ${c.name}${c.demo_video ? '' : ' · sem vídeo'}`;
  ssUpdateProgress();
}

function ssUpdateProgress() {
  if (!ss.overlay) return;
  const frac = (ss.idx + (ss.phase === 'card' ? 0.25 : 0.75)) / ss.list.length;
  ss.overlay.querySelector('.ss-track span').style.width = `${(frac * 100).toFixed(1)}%`;
  if (ss.rec) {
    const secs = Math.round((ssNow() - ss.recStart) / 1000);
    ss.overlay.querySelector('.ss-rec .bar').style.width = `${(frac * 100).toFixed(1)}%`;
    ss.overlay.querySelector('.ss-rec-label').textContent =
      `Gravando ${ss.idx + 1}/${ss.list.length} — ${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
  }
}

// ---------------------------------------------------------------- tela cheia
function ssExitFullscreen() {
  const fn = document.exitFullscreen || document.webkitExitFullscreen;
  if (fn) fn.call(document);
}

function ssToggleFullscreen() {
  const el = ss.overlay;
  if (document.fullscreenElement || document.webkitFullscreenElement) { ssExitFullscreen(); return; }
  const req = el.requestFullscreen || el.webkitRequestFullscreen;
  if (req) {
    Promise.resolve(req.call(el)).then(() => {
      if (screen.orientation && screen.orientation.lock) {
        screen.orientation.lock('landscape').catch(() => { /* iOS não permite travar */ });
      }
    }).catch(() => el.classList.add('ss-pseudo-fs'));
    return;
  }
  // iPhone: a API de tela cheia não vale para elementos comuns — esconde os
  // controles e usa toda a viewport.
  el.classList.toggle('ss-pseudo-fs');
  if (el.classList.contains('ss-pseudo-fs')) {
    toast('Tela cheia do iPhone: gire o aparelho e toque na tela para trazer os controles de volta.');
  }
}

// ---------------------------------------------------------------- download (gravação)
function ssPickMime() {
  if (typeof MediaRecorder === 'undefined') return '';
  const options = ['video/mp4;codecs=h264', 'video/mp4', 'video/webm;codecs=vp9',
    'video/webm;codecs=vp8', 'video/webm'];
  return options.find((m) => {
    try { return MediaRecorder.isTypeSupported(m); } catch (_) { return false; }
  }) || '';
}

function ssAskDownload() {
  if (ss.rec) { toast('Já existe uma gravação em andamento.', 'error'); return; }
  const mime = ssPickMime();
  if (!mime || !ss.canvas.captureStream) {
    toast('Este navegador não permite gravar o slideshow em vídeo.', 'error');
    return;
  }
  const withVideo = ss.list.filter((c) => c.demo_video).length;
  const estimate = Math.round((ss.list.length * 2 + withVideo * 8) / 60);
  const overlay = openModal(`
    <h3><span class="rune">&#x16D2;</span> Baixar o slideshow em vídeo</h3>
    <p style="color:var(--ink-2);line-height:1.6">
      A gravação é feita em tempo real: o slideshow recomeça do primeiro personagem e o
      vídeo é montado enquanto ele roda (~${estimate || 1} min).
      Mantenha esta aba visível até o fim — em segundo plano o navegador congela a gravação.
      Formato: <b>${mime.split(';')[0]}</b>.
    </p>
    <div class="modal-actions">
      <button type="button" class="btn" data-close>Cancelar</button>
      <button type="button" class="btn primary" data-go>Gravar agora</button>
    </div>`);
  overlay.querySelector('[data-close]').addEventListener('click', () => closeModal(overlay));
  overlay.querySelector('[data-go]').addEventListener('click', () => {
    closeModal(overlay);
    ssStartRecording(mime);
  });
}

function ssStartRecording(mime) {
  const stream = ss.canvas.captureStream(30);
  // o vídeo vem do canvas e o áudio do AudioContext: juntos no mesmo arquivo
  if (ssAudio.dest) ssAudio.dest.stream.getAudioTracks().forEach((t) => stream.addTrack(t));
  let rec;
  try {
    rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 6000000 });
  } catch (_) {
    try { rec = new MediaRecorder(stream); } catch (err) {
      toast('Não foi possível iniciar a gravação neste navegador.', 'error');
      return;
    }
  }
  ss.chunks = [];
  ss.recMime = mime;
  ss.rec = rec;
  ss.recStart = ssNow();
  rec.ondataavailable = (e) => { if (e.data && e.data.size) ss.chunks.push(e.data); };
  rec.onstop = () => ssSaveRecording();
  rec.start(1000);
  ss.overlay.querySelector('.ss-rec').hidden = false;
  if (ss.paused) ssTogglePause();
  ssGoTo(0);
  toast('Gravando o slideshow…', 'success');
}

function ssStopRecording() {
  if (!ss.rec) return;
  if (ss.rec.state !== 'inactive') ss.rec.stop();
  else ssSaveRecording();
}

function ssSaveRecording() {
  const rec = ss.rec;
  ss.rec = null;
  if (ss.overlay) ss.overlay.querySelector('.ss-rec').hidden = true;
  if (!ss.chunks.length) { toast('A gravação saiu vazia.', 'error'); return; }
  const type = (rec && rec.mimeType) || ss.recMime || 'video/webm';
  const blob = new Blob(ss.chunks, { type });
  ss.chunks = [];
  const ext = type.includes('mp4') ? 'mp4' : 'webm';
  const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `niro-slideshow-${stamp}.${ext}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  toast(`Vídeo pronto (${(blob.size / 1048576).toFixed(1)} MB).`, 'success');
}

// ---------------------------------------------------------------- projeção na TV
function ssShareUrl() {
  const url = new URL('/chars', location.origin);
  url.searchParams.set('show', '1');
  Object.entries(ss.filters).forEach(([k, v]) => { if (v) url.searchParams.set(k, v); });
  url.searchParams.set('order', ss.order);
  url.searchParams.set('trilha',
    ssAudio.modo === 'fixa' && ssAudio.fixa ? String(ssAudio.fixa.id) : ssAudio.modo);
  return url.toString();
}

async function ssTryCast() {
  // O palco é um canvas: vira MediaStream para poder ser enviado ao receptor.
  const v = document.createElement('video');
  v.muted = true;
  v.playsInline = true;
  v.setAttribute('playsinline', '');
  v.style.cssText = 'position:absolute;width:1px;height:1px;opacity:0;pointer-events:none';
  v.srcObject = ss.canvas.captureStream(30);
  ss.pool.appendChild(v);
  await v.play().catch(() => { /* segue mesmo sem play */ });
  if (typeof v.webkitShowPlaybackTargetPicker === 'function') {
    v.webkitShowPlaybackTargetPicker();
    return true;
  }
  if (v.remote && typeof v.remote.prompt === 'function') {
    await v.remote.prompt();
    return true;
  }
  v.remove();
  return false;
}

function ssOpenCastModal() {
  const link = ssShareUrl();
  const overlay = openModal(`
    <h3><span class="rune">&#x16B1;</span> Projetar na TV</h3>
    <p style="color:var(--ink-2);line-height:1.6;margin-bottom:12px">
      No iPhone/iPad o caminho mais confiável é o <b>espelhamento de tela</b>:
      abra a Central de Controle (deslize da borda superior direita para baixo),
      toque em <b>Espelhamento de Tela</b>, escolha a TV/Apple TV e volte para cá —
      o slideshow inteiro aparece na TV. Deixe o slideshow em tela cheia e o aparelho
      em modo paisagem antes de espelhar.
    </p>
    <div class="ss-cast-actions">
      <button type="button" class="btn" data-act="airplay">Procurar dispositivo (AirPlay/Cast)</button>
      <button type="button" class="btn" data-act="copy">Copiar link do slideshow</button>
      <button type="button" class="btn" data-act="full">Entrar em tela cheia</button>
    </div>
    <p class="page-sub" style="margin-top:12px">
      O link abre este mesmo slideshow, com os filtros e a ordem já aplicados, em qualquer
      navegador — inclusive o da TV ou de um Chromecast com navegador.
    </p>
    <div class="modal-actions">
      <button type="button" class="btn" data-close>Fechar</button>
    </div>`);

  overlay.querySelector('[data-close]').addEventListener('click', () => closeModal(overlay));
  overlay.querySelector('[data-act="full"]').addEventListener('click', () => {
    closeModal(overlay);
    ssToggleFullscreen();
  });
  overlay.querySelector('[data-act="copy"]').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast('Link copiado.', 'success');
    } catch (_) {
      openModal(`<h3><span class="rune">&#x16B1;</span> Link do slideshow</h3>
        <p style="word-break:break-all;color:var(--ink-2)">${esc(link)}</p>`);
    }
  });
  overlay.querySelector('[data-act="airplay"]').addEventListener('click', async () => {
    try {
      const ok = await ssTryCast();
      if (ok) { closeModal(overlay); return; }
      if (window.PresentationRequest) {
        await new PresentationRequest([link]).start();
        closeModal(overlay);
        return;
      }
      toast('Nenhuma API de projeção disponível — use o espelhamento de tela.', 'error');
    } catch (_) {
      toast('Nenhum dispositivo escolhido — use o espelhamento de tela.', 'error');
    }
  });
}

// ---------------------------------------------------------------- entrada
document.getElementById('slideshow-btn').addEventListener('click', openSlideshowModal);

// Link compartilhado (/chars?show=1&...): abre o slideshow já filtrado e ordenado.
function maybeAutoSlideshow() {
  const params = new URLSearchParams(location.search);
  if (params.get('show') !== '1') return;
  const f = {};
  Object.keys(filters).forEach((dim) => { f[dim] = params.get(dim) || ''; });
  const order = params.get('order') || 'alpha';
  const list = ssSelect(allChars, f, order);
  if (!list.length) { toast('Nenhum personagem atende aos filtros do link.', 'error'); return; }
  ssAudioCarregarPrefs();
  ssAplicarTrilha(params.get('trilha') || ssAudio.modo);
  ssStart(list, f, order);
}
