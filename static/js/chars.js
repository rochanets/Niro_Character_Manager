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
  ssAudioCarregarPrefs();
  await ssCarregarAjustes();
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

let ssCardMs = 4000;              // tempo do card; vem dos ajustes da aba Trilhas
const SS_FADE_MS = 380;           // crossfade do card para o vídeo
const SS_GIF_MS = 5000;           // "vídeo" em gif não tem fim: tempo fixo
const SS_VIDEO_TIMEOUT_MS = 8000; // vídeo que não começa não trava o slideshow
const SS_CHECK_MS = 700;          // intervalo da vigilância de áudio e vídeo
const SS_TRAVA_MS = 3000;         // vídeo parado sozinho por esse tempo: segue em frente
const SS_FONT = '"Segoe UI", system-ui, -apple-system, sans-serif';
const SS_VIDEO_SLOTS = 3;         // <video> reaproveitados (ver "linha 2" abaixo)

/* O show é montado como uma linha do tempo de editor de vídeo, com três linhas:

   linha 1 — imagem: alterna entre o card do personagem e o vídeo dele;
   linha 2 — som do vídeo: vazia enquanto o card está em cena, preenchida só
             quando o que está tocando é um vídeo que realmente tem áudio;
   linha 3 — trilha: constante do começo ao fim. Não reinicia quando troca o
             personagem nem a mídia; só abaixa o volume (ducking) enquanto a
             linha 2 está preenchida, e só muda de faixa quando a atual acaba.
*/

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

// Filtrou por um elemento ou uma região que tem trilha própria? Então a trilha
// daquele grupo é a escolha óbvia — o show inteiro é daquele bloco. Elemento
// vem antes de região por ser o recorte mais específico.
function ssTrilhaSugerida(f) {
  const alvos = [['element', f.element], ['region', f.region]];
  for (const [scope, nome] of alvos) {
    if (nome && ssFaixasDoGrupo(scope, nome).length) return `${scope}:${nome}`;
  }
  return '';
}

const SS_SUGESTAO_LABEL = { element: 'elemento', region: 'região' };

function ssTextoSugestao(valor) {
  if (!valor) return '';
  const [scope, ...resto] = valor.split(':');
  return `Sugerida pelo filtro de ${SS_SUGESTAO_LABEL[scope] || scope}: `
    + `<b>${esc(resto.join(':'))}</b>. Trocar aqui mantém a sua escolha.`;
}

// ---------------------------------------------------------------- modal de filtros
function openSlideshowModal() {
  const f = { ...filters };
  let order = 'alpha';
  try { order = localStorage.getItem('niro:chars:ss-order') || 'alpha'; } catch (_) { /* storage indisponível */ }
  ssAudioCarregarPrefs();
  let trilha = ssAudio.modo === 'grupo' && ssAudio.grupoFixo
    ? `${ssAudio.grupoFixo.scope}:${ssAudio.grupoFixo.ref}`
    : ssAudio.modo;
  if (trilha === 'auto' && !allTracks.length) trilha = 'none';
  // Enquanto o usuário não mexer no select, a trilha acompanha os filtros.
  let trilhaManual = false;
  const sugestao = ssTrilhaSugerida(f);
  if (sugestao) trilha = sugestao;

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
      Cada personagem aparece ${(ssCardMs / 1000).toString().replace('.', ',')}s no card,
      com um leve zoom, e em seguida toca o vídeo cadastrado (quando houver). No fim do
      vídeo passa sozinho para o próximo. O tempo do card fica em Parâmetros &rarr; Trilhas.
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
        ${ssOpcoesDeGrupo(trilha)}
      </select>
      ${allTracks.length ? '' : '<p class="page-sub">Nenhuma faixa cadastrada — veja o módulo Trilhas.</p>'}
      <p class="page-sub" id="ss-track-hint" ${sugestao ? '' : 'hidden'}>${ssTextoSugestao(sugestao)}</p>
    </div>
    <p class="ss-count" id="ss-count"></p>
    <div class="modal-actions">
      <button type="button" class="btn" data-close>Cancelar</button>
      <button type="button" class="btn primary" id="ss-start">&#9654; Iniciar slideshow</button>
    </div>`, { wide: true });

  const countEl = overlay.querySelector('#ss-count');
  const startBtn = overlay.querySelector('#ss-start');
  const trackSel = overlay.querySelector('#ss-track');
  const trackHint = overlay.querySelector('#ss-track-hint');

  // Refaz a sugestão a cada mudança de filtro, sem passar por cima de uma
  // escolha manual.
  function atualizarSugestao() {
    const nova = ssTrilhaSugerida(f);
    if (!trilhaManual && nova && nova !== trilha) {
      trilha = nova;
      trackSel.value = nova;
    }
    const mostrar = !trilhaManual && nova && trackSel.value === nova;
    trackHint.hidden = !mostrar;
    if (mostrar) trackHint.innerHTML = ssTextoSugestao(nova);
  }

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
    sel.addEventListener('change', () => {
      f[sel.dataset.ssFilter] = sel.value;
      atualizarSugestao();
      refresh();
    });
  });
  overlay.querySelector('#ss-order').addEventListener('change', function () {
    order = this.value;
    try { localStorage.setItem('niro:chars:ss-order', order); } catch (_) { /* storage indisponível */ }
    refresh();
  });
  trackSel.addEventListener('change', function () {
    trilha = this.value;
    trilhaManual = true;
    trackHint.hidden = true;
  });
  overlay.querySelector('[data-close]').addEventListener('click', () => closeModal(overlay));
  startBtn.addEventListener('click', () => {
    const list = refresh();
    if (!list.length) return;
    closeModal(overlay);
    // A trilha sugerida vale só para este show: não vira preferência salva.
    ssAplicarTrilha(trilha, { persistir: trilhaManual });
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

const ssAudio = {
  ctx: null, master: null, duck: null, dest: null, videoGain: null,
  slots: [], atual: -1,
  modo: 'auto', grupoFixo: null, grupo: null, grupoDesejado: null, playlist: [], pos: 0,
  volume: 0.7, mudo: false,
  // vêm do módulo Trilhas (ficam no banco, então valem também no celular)
  duckNivel: 0.15, somVideo: true,
};

// Ajustes do módulo Trilhas. Falha silenciosa: sem eles o slideshow usa os padrões.
async function ssCarregarAjustes() {
  try {
    const cfg = await api('/api/tracks/settings');
    ssAudio.duckNivel = cfg.duck;
    ssAudio.somVideo = !!cfg.video_sound;
    if (cfg.card_seconds) ssCardMs = cfg.card_seconds * 1000;
    if (!ssAudio.volumeLocal) ssAudio.volume = cfg.volume;
  } catch (_) { /* mantém os padrões */ }
}

function ssAudioCarregarPrefs() {
  try {
    const salvo = JSON.parse(localStorage.getItem(SS_AUDIO_KEY));
    if (salvo) {
      if (typeof salvo.volume === 'number') { ssAudio.volume = salvo.volume; ssAudio.volumeLocal = true; }
      if (typeof salvo.mudo === 'boolean') ssAudio.mudo = salvo.mudo;
      if (salvo.modo) ssAudio.modo = salvo.modo;
      if (salvo.grupoFixo) ssAudio.grupoFixo = salvo.grupoFixo;
    }
  } catch (_) { /* storage indisponível */ }
}

function ssAudioSalvarPrefs() {
  try {
    localStorage.setItem(SS_AUDIO_KEY,
      JSON.stringify({ volume: ssAudio.volume, mudo: ssAudio.mudo,
                       modo: ssAudio.modo, grupoFixo: ssAudio.grupoFixo }));
  } catch (_) { /* storage indisponível */ }
}

function ssAudioIniciar() {
  // O contexto é criado mesmo sem trilha: é por ele que o som dos vídeos entra
  // na gravação do download.
  if (ssAudio.ctx) return;
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

  // O som próprio dos vídeos não passa pelo volume nem pelo ducking da trilha:
  // quem recua é a música, o vídeo continua no nível dele.
  ssAudio.videoGain = ssAudio.ctx.createGain();
  ssAudio.videoGain.gain.value = 1;
  ssAudio.videoGain.connect(ssAudio.ctx.destination);
  ssAudio.videoGain.connect(ssAudio.dest);

  // dois slots alternados: enquanto um sobe, o outro desce (crossfade)
  ssAudio.slots = [0, 1].map(() => {
    const el = document.createElement('audio');
    el.preload = 'auto';
    el.crossOrigin = 'anonymous';
    el.addEventListener('ended', () => {
      if (ssAudio.slots[ssAudio.atual] && ssAudio.slots[ssAudio.atual].el === el) ssAudioProxima();
    });
    // Faixa que não carrega não pode travar a trilha: pula para a próxima.
    el.addEventListener('error', () => {
      if (ssAudio.slots[ssAudio.atual] && ssAudio.slots[ssAudio.atual].el === el) ssAudioProxima();
    });
    ss.pool.appendChild(el);
    const gain = ssAudio.ctx.createGain();
    gain.gain.value = 0;
    ssAudio.ctx.createMediaElementSource(el).connect(gain);
    gain.connect(ssAudio.duck);
    return { el, gain };
  });
  ssAudio.atual = -1;
  ssAudio.grupo = null;
  // O navegador suspende o contexto sozinho ao sair do app: seguir o estado
  // mantém o botão de som coerente com o que está realmente tocando.
  if (typeof ssAudio.ctx.addEventListener === 'function') {
    ssAudio.ctx.addEventListener('statechange', ssAtualizarBotaoSom);
  }
  ssAudioResumir();
}

// Liga o áudio de um <video> ao grafo do AudioContext. Só é feito durante a
// gravação: ligar um <video> ao contexto tira o som dele da saída nativa e o
// deixa refém do estado do contexto — se o navegador suspende o áudio (sair do
// app, ligação, tela bloqueada), o vídeo fica mudo mesmo com o volume aberto.
// Fora da gravação o vídeo toca pela saída normal, que sempre volta sozinha.
function ssConectarVideo(el) {
  if (!ssAudio.ctx || !el || el.tagName !== 'VIDEO' || el.dataset.ligado) return;
  try {
    ssAudio.ctx.createMediaElementSource(el).connect(ssAudio.videoGain);
    el.dataset.ligado = '1';
  } catch (_) { /* já estava ligado */ }
}

// Devolve o áudio depois de qualquer interrupção (pausa, sair do app, ligação).
// Só destravar o contexto não basta: os elementos de áudio ficam parados e
// precisam de um play() novo, senão a trilha some pelo resto do show.
function ssAudioResumir() {
  if (!ssAudio.ctx) return;
  if (ssAudio.ctx.state === 'suspended') {
    ssAudio.ctx.resume().then(() => {
      if (!ss.paused) ssRetomarTrilha();
      ssAtualizarBotaoSom();
    }).catch(() => { /* precisa de um toque do usuário */ });
  } else if (!ss.paused) {
    ssRetomarTrilha();
  }
  ssAtualizarBotaoSom();
}

// A trilha voltou a existir? Se o grupo sumiu, escolhe de novo; se a faixa atual
// ficou parada (o sistema pausou ao sair do app), manda tocar outra vez.
function ssRetomarTrilha() {
  if (!ssAudio.ctx || ssAudio.modo === 'none' || !ss.open) return;
  if (ssFilmeAtivo()) return;   // no filme a trilha já está dentro do arquivo
  const c = ss.list[ss.idx];
  if (!c) return;
  if (ssAudio.atual < 0 || !ssAudio.playlist.length) {
    ssAudio.grupo = null;             // força reescolher o grupo do personagem atual
    ssAudioAcompanhar(c);
    return;
  }
  const slot = ssAudio.slots[ssAudio.atual];
  if (!slot) return;
  if (slot.el.ended) { ssAudioProxima(); return; }
  if (slot.el.paused) slot.el.play().catch(() => { /* liberado no primeiro toque */ });
}

function ssEmbaralhar(lista) {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

// As faixas de um grupo (elemento, região ou "geral").
function ssFaixasDoGrupo(scope, ref) {
  if (scope === 'geral') return allTracks.filter((t) => !t.ref_name);
  return allTracks.filter((t) => t.scope === scope && t.ref_name === ref);
}

// Que grupo de faixas toca neste personagem. A escolha é sempre de um grupo,
// nunca de uma faixa solta: dentro dele as faixas se revezam em ordem
// embaralhada, e o grupo só muda quando muda o bloco que está passando.
function ssGrupoPara(c) {
  if (!allTracks.length || ssAudio.modo === 'none') return null;

  if (ssAudio.modo === 'grupo' && ssAudio.grupoFixo) {
    const { scope, ref } = ssAudio.grupoFixo;
    const faixas = ssFaixasDoGrupo(scope, ref);
    if (faixas.length) return { chave: `g:${scope}:${ref || ''}`, faixas };
  }

  if (ssAudio.modo === 'auto') {
    const doElemento = ssFaixasDoGrupo('element', c.element.name);
    if (doElemento.length) return { chave: `e:${c.element.name}`, faixas: doElemento };
    const daRegiao = ssFaixasDoGrupo('region', c.region.name);
    if (daRegiao.length) return { chave: `r:${c.region.name}`, faixas: daRegiao };
  }

  return { chave: 'todas', faixas: allTracks };
}

function ssAudioTocar(faixa) {
  if (!ssAudio.ctx || !faixa) return;
  const proximo = (ssAudio.atual + 1) % 2;
  const slot = ssAudio.slots[proximo];
  slot.el.src = faixa.url;
  // Faixa sozinha num grupo que não pode mudar (trilha fixa ou aleatória entre
  // todas) repete em loop. No modo automático ela precisa terminar de verdade:
  // é no fim dela que o grupo do personagem atual é reavaliado.
  slot.el.loop = ssAudio.playlist.length <= 1 && ssAudio.modo !== 'auto';
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

// Chamado a cada troca de personagem. A trilha é a linha constante do show:
// trocar de personagem (ou de mídia) nunca interrompe a música. A troca de
// grupo fica anotada e só entra em cena quando a faixa atual terminar.
function ssAudioAcompanhar(c) {
  if (!ssAudio.ctx) return;
  const escolha = ssGrupoPara(c);
  if (!escolha) return;
  ssAudio.grupoDesejado = escolha;
  if (ssAudio.atual >= 0 && ssAudio.playlist.length) return;   // já tem música no ar
  ssAudioAbrirGrupo(escolha);
}

function ssAudioAbrirGrupo(escolha) {
  ssAudio.grupo = escolha.chave;
  ssAudio.playlist = ssEmbaralhar(escolha.faixas);
  ssAudio.pos = 0;
  ssAudioTocar(ssAudio.playlist[0]);
}

// Fim natural da faixa — único momento em que a trilha muda. Se o personagem
// que está em cena agora pede outro grupo, é aqui que a virada acontece.
function ssAudioProxima() {
  if (!ssAudio.ctx) return;
  const c = ss.list[ss.idx];
  const desejado = (c && ssGrupoPara(c)) || ssAudio.grupoDesejado;
  if (desejado && desejado.chave !== ssAudio.grupo) { ssAudioAbrirGrupo(desejado); return; }
  if (!ssAudio.playlist.length) return;
  ssAudio.pos = (ssAudio.pos + 1) % ssAudio.playlist.length;
  ssAudioTocar(ssAudio.playlist[ssAudio.pos]);
}

// Abaixa a trilha enquanto o vídeo do personagem toca e devolve o volume depois.
function ssAudioDuck(abaixar) {
  if (!ssAudio.ctx) return;
  const agora = ssAudio.ctx.currentTime;
  const g = ssAudio.duck.gain;
  g.cancelScheduledValues(agora);
  g.setValueAtTime(g.value, agora);
  g.linearRampToValueAtTime(abaixar ? ssAudio.duckNivel : 1, agora + 0.4);
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
  ssAudio.grupoDesejado = null;
  ssAudio.playlist = [];
  ssAudio.pos = 0;
}

// Opções de trilha do modal: um item por grupo (elemento, região ou geral),
// e não um item por faixa — dentro do grupo as faixas se revezam sozinhas.
function ssOpcoesDeGrupo(selecionado) {
  const grupos = new Map();
  for (const t of allTracks) {
    const chave = t.ref_name ? `${t.scope}:${t.ref_name}` : 'geral:';
    if (!grupos.has(chave)) grupos.set(chave, []);
    grupos.get(chave).push(t);
  }

  const secoes = [
    ['element', 'Elementos'],
    ['region', 'Regiões'],
    ['geral', 'Sem vínculo'],
  ];

  return secoes.map(([scope, titulo]) => {
    const itens = [...grupos.entries()]
      .filter(([chave]) => chave.startsWith(`${scope}:`))
      .sort((a, b) => a[0].localeCompare(b[0], 'pt-BR'))
      .map(([chave, faixas]) => {
        const ref = chave.split(':')[1];
        const nome = ref || 'Sem vínculo';
        const plural = faixas.length === 1 ? 'faixa' : 'faixas';
        return `<option value="${esc(chave)}" ${selecionado === chave ? 'selected' : ''}>
          ${esc(nome)} — ${faixas.length} ${plural}</option>`;
      });
    return itens.length ? `<optgroup label="${titulo}">${itens.join('')}</optgroup>` : '';
  }).join('');
}

// ---------------------------------------------------------------- estado do palco
const ss = {
  open: false, overlay: null, canvas: null, ctx: null, pool: null,
  list: [], filters: {}, order: 'alpha',
  idx: 0, phase: 'card', phaseStart: 0, paused: false, pausedAt: 0, raf: 0,
  media: null, mediaStarted: 0,
  images: new Map(), gifs: new Map(), videoPool: [], duckAtivo: false,
  temSom: new Map(),   // por arquivo de vídeo: tem faixa de áudio ou não
  rec: null, chunks: [], recMime: '', recStart: 0,
  recParaFilme: false, recMarcas: [], recDur: 0,
  // filme montado: um arquivo só, com trilha e vídeos já embutidos
  filme: null,
  // pausa que o sistema causou (sair do app) e vigilância do playback
  autoPausado: false, ultimaChecagem: 0, videoTravadoEm: 0,
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

// ---------------------------------------------------------------- linha 2: mídia
/*
   Os <video> do show são um punhado fixo de elementos reaproveitados, e não um
   elemento novo por personagem. Motivo: elemento de mídia criado no meio do
   show nunca passou por um gesto do usuário, e o navegador recusa tocá-lo com
   som — o código caía no play() mudo e o áudio do vídeo sumia do terceiro
   personagem em diante. Os slots nascem e são destravados no mesmo clique que
   abre o show; depois disso só trocam de `src`, e o destravamento continua
   valendo. Gif não tem áudio nem essa trava, então segue como <img> comum.
*/
function ssCriarPoolDeVideos() {
  ss.videoPool = [];
  for (let k = 0; k < SS_VIDEO_SLOTS; k += 1) {
    const el = document.createElement('video');
    el.muted = !ssAudio.somVideo;
    el.loop = false;
    el.playsInline = true;
    el.setAttribute('playsinline', '');
    el.setAttribute('webkit-playsinline', '');
    el.preload = 'auto';
    ss.pool.appendChild(el);
    ss.videoPool.push({ el, idx: -1, src: '', usado: 0 });
  }
}

// Destrava os slots dentro do gesto que abriu o show: um play() mudo em cada um
// basta para o navegador liberar aquele elemento pelo resto da sessão.
function ssDestravarVideos() {
  const primeiro = ss.list.map((c) => c.demo_video).find((v) => v && !ssIsGif(v));
  ss.videoPool.forEach((slot) => {
    const { el } = slot;
    if (!el.getAttribute('src')) {
      if (!primeiro) return;
      el.src = `/static/${primeiro}`;   // src só para destravar; será trocado
      el.load();
    }
    el.muted = true;                    // o aquecimento é silencioso
    const p = el.play();
    // pausa de volta só o que não é o vídeo em cena — senão o aquecimento
    // congela o vídeo que acabou de começar
    if (p && p.then) p.then(() => { if (ss.media !== el) el.pause(); }).catch(() => { /* destrava no play seguinte */ });
  });
}

// Slot do pool que vai carregar o vídeo do personagem i. Reaproveita o que já
// está com esse arquivo; senão pega o mais antigo que não está em cena.
function ssSlotDeVideo(i, src) {
  const pronto = ss.videoPool.find((s) => s.idx === i && s.src === src);
  if (pronto) { pronto.usado = ssNow(); return pronto.el; }
  const livres = ss.videoPool.filter((s) => s.el !== ss.media);
  const slot = livres.sort((a, b) => a.usado - b.usado)[0] || ss.videoPool[0];
  slot.idx = i;
  slot.src = src;
  slot.usado = ssNow();
  const { el } = slot;
  el.pause();
  el.muted = !ssAudio.somVideo;
  el.src = src;
  el.load();
  if (ss.rec) ssConectarVideo(el);
  return el;
}

// Elemento de mídia do personagem: <video> do pool para vídeo, <img> para gif.
function ssMediaFor(i) {
  const c = ss.list[i];
  if (!c || !c.demo_video) return null;
  const src = `/static/${c.demo_video}`;
  if (!ssIsGif(src)) return ssSlotDeVideo(i, src);
  if (!ss.gifs.has(i)) {
    const img = document.createElement('img');
    img.src = src;
    ss.pool.appendChild(img);
    ss.gifs.set(i, img);
  }
  return ss.gifs.get(i);
}

// Só os gifs precisam ser soltos: os <video> são reaproveitados pelo pool.
function ssReleaseMedia(keep) {
  [...ss.gifs.keys()].forEach((i) => {
    if (keep.includes(i)) return;
    ss.gifs.get(i).remove();
    ss.gifs.delete(i);
  });
  if (keep.length) return;
  ss.videoPool.forEach((slot) => {
    slot.el.pause();
    slot.el.removeAttribute('src');
    slot.el.load();
    slot.el.remove();
  });
  ss.videoPool = [];
}

// ---------------------------------------------------------------- ducking (linhas 2 e 3)
// A linha 2 só está preenchida quando o que está em cena é um vídeo com som de
// verdade: gif não tem áudio, vídeo mudo (por ajuste ou porque o navegador
// recusou tocar com som) também não, e há vídeo cadastrado sem faixa de áudio.
// Nesses casos a trilha não tem por que recuar.
function ssLembrarSom(src, tem) {
  if (src) ss.temSom.set(src, tem);
  return tem;
}

function ssMediaTemSom(el) {
  if (!el || el.tagName !== 'VIDEO' || el.muted || !ssAudio.somVideo) return false;
  const src = el.getAttribute('src') || '';
  if (typeof el.mozHasAudio === 'boolean') return ssLembrarSom(src, el.mozHasAudio);
  // Safari expõe as faixas assim que os metadados chegam — ali a resposta é na hora.
  if (el.audioTracks && typeof el.audioTracks.length === 'number' && el.readyState >= 1) {
    return ssLembrarSom(src, el.audioTracks.length > 0);
  }
  // Chrome não expõe: com um terço de segundo tocando, um vídeo com áudio já
  // decodificou alguma coisa. A resposta fica guardada por arquivo, então o
  // vaivém do volume acontece no máximo uma vez por vídeo mudo.
  if (typeof el.webkitAudioDecodedByteCount === 'number' && el.currentTime > 0.3) {
    return ssLembrarSom(src, el.webkitAudioDecodedByteCount > 0);
  }
  return ss.temSom.has(src) ? ss.temSom.get(src) : true;
}

function ssAtualizarDuck() {
  const abaixar = ss.phase === 'media' && !ss.paused && ssMediaTemSom(ss.media);
  if (abaixar === ss.duckAtivo) return;
  ss.duckAtivo = abaixar;
  ssAudioDuck(abaixar);
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

// A caixa do card assume a proporção da própria arte: assim a imagem aparece
// inteira, sem corte, em vez de ser recortada num 3:4 fixo. Nome e estrelas ficam
// numa faixa logo abaixo, fora da arte, para não cobrirem nada dela.
function ssCardBox(img, zoom = 1) {
  const cv = ss.canvas;
  const proporcao = img && img.naturalWidth ? img.naturalWidth / img.naturalHeight : 0.75;
  const legenda = cv.height * 0.085;
  const respiro = cv.height * 0.022;
  const alturaLivre = cv.height * 0.94 - legenda - respiro;
  let h = alturaLivre;
  let w = h * proporcao;
  if (w > cv.width * 0.88) { w = cv.width * 0.88; h = w / proporcao; }
  w *= zoom;
  h *= zoom;
  const total = h + respiro + legenda;
  return { x: (cv.width - w) / 2, y: (cv.height - total) / 2, w, h, legenda, respiro };
}

function ssDrawCard(c, t, alpha) {
  const { ctx } = ss;
  const img = ssLoaded(ssCardUrl(c));
  const ease = 1 - Math.pow(1 - t, 3);
  // O zoom cresce o card inteiro, e não a arte dentro dele: o movimento continua
  // existindo sem que as bordas da imagem sejam comidas.
  const zoom = 1 + 0.06 * ease;
  const { x, y, w, h, legenda, respiro } = ssCardBox(img, zoom);
  const radius = Math.min(w, h) * 0.05;

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
    // a caixa já tem a proporção da arte, então ela entra inteira e encaixada
    const f = ssContain(img.naturalWidth, img.naturalHeight, w, h);
    ctx.drawImage(img, x + f.x, y + f.y, f.w, f.h);
  }

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

  // nome e estrelas abaixo da arte, nunca por cima dela
  const meio = y + h + respiro + legenda / 2;
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
  ctx.shadowBlur = legenda * 0.25;
  ctx.font = `600 ${legenda * 0.46}px ${SS_FONT}`;
  ctx.fillStyle = '#f2f3fa';
  ctx.textAlign = 'left';
  ctx.fillText(c.name, x, meio, w * 0.65);
  ctx.font = `${legenda * 0.38}px ${SS_FONT}`;
  ctx.fillStyle = c.rarity === 5 ? '#e0b45c' : '#9085e9';
  ctx.textAlign = 'right';
  ctx.fillText('★'.repeat(c.rarity || 0), x + w, meio);
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
  // Enquanto monta o filme, guarda em que segundo cada personagem entra: é o que
  // permite pular de personagem depois, já dentro do arquivo pronto.
  if (ss.rec) ss.recMarcas.push({ i: ss.idx, t: Math.max(0, (ssNow() - ss.recStart) / 1000) });
  if (ss.media && ss.media.tagName === 'VIDEO') ss.media.pause();
  ss.media = null;
  ss.phase = 'card';
  ss.phaseStart = ssNow();
  if (restartMedia) ssPreload();
  ssAudioAcompanhar(ss.list[ss.idx]);
  ssAtualizarDuck();          // card em cena: a linha 2 está vazia
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

// Dá play no vídeo do personagem com o som que os ajustes pedem. Alguns
// navegadores recusam tocar com som sem gesto do usuário: em vez de pular o
// vídeo, ele toca mudo.
function ssTocarVideo(el) {
  if (!el || el.tagName !== 'VIDEO') return;
  el.muted = !ssAudio.somVideo;
  const p = el.play();
  if (!p || !p.then) { ss.mediaStarted = 1; return; }
  p.then(() => { ss.mediaStarted = 1; ssAtualizarDuck(); }).catch(() => {
    if (el.muted) return;
    el.muted = true;
    ssAtualizarDuck();   // sem som no vídeo, a trilha não precisa recuar
    const q = el.play();
    if (q && q.then) q.then(() => { ss.mediaStarted = 1; }).catch(() => { /* segue pelo timeout */ });
  });
}

function ssStartMedia() {
  const el = ssMediaFor(ss.idx);
  if (!el) { ssNext(); return; }
  ss.media = el;
  ss.mediaStarted = 0;
  ss.videoTravadoEm = 0;
  ss.phase = 'media';
  ss.phaseStart = ssNow();
  if (el.tagName === 'VIDEO') {
    try { el.currentTime = 0; } catch (_) { /* ainda sem metadata */ }
    if (ss.rec) ssConectarVideo(el);   // durante a gravação o som do vídeo entra no grafo
    ssTocarVideo(el);
  } else {
    ss.mediaStarted = 1;
  }
  ssAtualizarDuck();   // a trilha só recua se este vídeo tiver som
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

// Vigia o que o navegador pode ter desligado por conta própria — voltar de
// segundo plano, uma ligação, a tela bloqueando. Sem isso o show continua
// desenhando enquanto o vídeo está parado e a trilha, muda.
function ssVigiarPlayback() {
  if (!ss.open || ss.paused || ssFilmeAtivo()) return;
  const agora = ssNow();
  if (agora - ss.ultimaChecagem < SS_CHECK_MS) return;
  ss.ultimaChecagem = agora;

  // contexto suspenso pelo sistema: tenta voltar (sem gesto, pode não dar)
  if (ssAudio.ctx && ssAudio.ctx.state === 'suspended') ssAudioResumir();
  else ssRetomarTrilha();
  ssAtualizarDuck();   // o vídeo pode ter começado (ou acabado) sem som

  const el = ss.media;
  if (ss.phase === 'media' && el && el.tagName === 'VIDEO' && el.paused && !el.ended) {
    if (!ss.videoTravadoEm) ss.videoTravadoEm = agora;
    ssTocarVideo(el);
    // não voltou mesmo depois de insistir: não trava o show no meio
    if (agora - ss.videoTravadoEm > SS_TRAVA_MS) { ss.videoTravadoEm = 0; ssNext(); }
  } else {
    ss.videoTravadoEm = 0;
  }
}

function ssFrame() {
  if (!ss.open) return;
  ss.raf = requestAnimationFrame(ssFrame);
  ssVigiarPlayback();
  const c = ss.list[ss.idx];
  if (!c) return;
  const elapsed = (ss.paused ? ss.pausedAt : ssNow()) - ss.phaseStart;
  const cardImg = ssLoaded(ssCardUrl(c));

  if (ss.phase === 'card') {
    const t = Math.min(1, elapsed / ssCardMs);
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
  filme: '<svg viewBox="0 0 24 24"><path d="M3 5h3.2l1.6 3H5.4L3.8 5zm5.4 0h3.2l1.6 3h-3.2zm5.4 0h3.2l1.6 3h-3.2zM3 10h18v9H3zm2 2v5h14v-5z" fill="currentColor"/></svg>',
  slides: '<svg viewBox="0 0 24 24"><path d="M3 4h8v7H3zm10 0h8v7h-8zM3 13h8v7H3zm10 0h8v7h-8z" fill="currentColor"/></svg>',
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
  ss.autoPausado = false;
  ss.ultimaChecagem = 0;
  ss.videoTravadoEm = 0;
  ss.idx = 0;
  ss.media = null;
  ss.images = new Map();
  ss.gifs = new Map();
  ss.temSom = new Map();
  ss.duckAtivo = false;

  const portrait = window.innerHeight > window.innerWidth;
  const overlay = document.createElement('div');
  overlay.className = 'ss-overlay';
  overlay.innerHTML = `
    <button type="button" class="ss-exit" data-act="close" title="Sair do show"
            aria-label="Sair do show">${SS_ICONS.close}</button>
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
          <button type="button" class="ss-btn so-slides" data-act="filme"
                  title="Montar filme contínuo (melhor para a TV)">${SS_ICONS.filme}</button>
          <button type="button" class="ss-btn so-filme" data-act="slides"
                  title="Voltar ao modo slides">${SS_ICONS.slides}</button>
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
    if (ssFilmeAtivo()) {
      ss.filme.video.volume = this.value / 100;
      ss.filme.video.muted = false;
      ssAtualizarBotaoSom();
      return;
    }
    ssAudio.volume = this.value / 100;
    ssAudio.mudo = false;
    ssAudioVolume();
    ssAudioSalvarPrefs();
    ssAtualizarBotaoSom();
  });
  // qualquer toque no palco serve de gesto para o navegador liberar o áudio
  overlay.addEventListener('pointerdown', ssAudioResumir);
  overlay.addEventListener('click', ssAudioResumir);
  document.addEventListener('keydown', ssKeys);
  document.addEventListener('visibilitychange', ssVisibilidade);
  window.addEventListener('pageshow', ssVisibilidade);

  // iOS só libera o play de vídeo dentro de um gesto: destrava aqui, no clique
  // que abriu o slideshow, os elementos já criados.
  ssAudioIniciar();
  ssCriarPoolDeVideos();
  ssGoTo(0);
  ssDestravarVideos();
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
  ssEncerrarFilme();
  ss.filme = null;              // o arquivo montado só vale enquanto o show está aberto
  ssReleaseMedia([]);
  document.removeEventListener('keydown', ssKeys);
  document.removeEventListener('visibilitychange', ssVisibilidade);
  window.removeEventListener('pageshow', ssVisibilidade);
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
  if (ssFilmeAtivo() && ssAcaoFilme(act)) return;
  if (act === 'filme') { ssMontarFilme(); return; }
  if (act === 'slides') return;
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

const ssFilmeAtivo = () => !!(ss.filme && ss.filme.ativo && ss.filme.video);

// O navegador só libera som depois de um gesto. Quando o slideshow abre sozinho
// (link com ?show=1), o botão fica marcado e o primeiro toque destrava.
function ssAtualizarBotaoSom() {
  if (!ss.overlay) return;
  const btn = ss.overlay.querySelector('[data-act="som"]');
  if (!btn) return;
  const vol0 = ss.overlay.querySelector('.ss-vol');
  // No filme o som é o do próprio arquivo, não o da trilha ao vivo.
  if (ssFilmeAtivo()) {
    const v = ss.filme.video;
    btn.hidden = false;
    if (vol0) vol0.hidden = false;
    btn.classList.remove('alerta');
    const ic = v.muted ? 'mudo' : 'som';
    if (btn.dataset.icone !== ic) { btn.innerHTML = SS_ICONS[ic]; btn.dataset.icone = ic; }
    btn.title = v.muted ? 'Ativar o som do filme' : 'Silenciar o filme';
    return;
  }
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

// Traduz a escolha do modal para o motor. Valores possíveis: 'auto', 'random',
// 'none' ou um grupo no formato 'element:Fae' / 'region:Aurion' / 'geral:'.
function ssAplicarTrilha(valor, { persistir = true } = {}) {
  if (valor === 'auto' || valor === 'random' || valor === 'none') {
    ssAudio.modo = valor;
    ssAudio.grupoFixo = null;
  } else {
    const [scope, ...resto] = String(valor).split(':');
    const ref = resto.join(':');
    const temFaixas = ssFaixasDoGrupo(scope, ref).length > 0;
    ssAudio.grupoFixo = temFaixas ? { scope, ref } : null;
    ssAudio.modo = temFaixas ? 'grupo' : 'auto';
  }
  ssAudio.grupo = null;
  ssAudio.grupoDesejado = null;
  ssAudio.playlist = [];
  ssAudio.pos = 0;
  if (persistir) ssAudioSalvarPrefs();
}

// Ponto único de pausa: vale tanto para o botão quanto para a pausa que o
// sistema impõe ao sair do app. Ao voltar, o áudio é reatado explicitamente —
// só chamar play() no vídeo não devolve a trilha.
function ssDefinirPausa(pausado) {
  if (!ss.open || ss.paused === pausado) return;
  ss.paused = pausado;
  const btn = ss.overlay && ss.overlay.querySelector('[data-act="toggle"]');
  if (pausado) {
    ss.pausedAt = ssNow();
    if (ss.media && ss.media.tagName === 'VIDEO') ss.media.pause();
    ssAudioPausar(true);
    if (btn) { btn.innerHTML = SS_ICONS.play; btn.title = 'Continuar'; }
  } else {
    ss.phaseStart += ssNow() - ss.pausedAt;
    ss.videoTravadoEm = 0;
    ssAudioPausar(false);
    ssAudioResumir();                    // o contexto pode ter sido suspenso
    if (ss.media && ss.media.tagName === 'VIDEO') ssTocarVideo(ss.media);
    if (btn) { btn.innerHTML = SS_ICONS.pause; btn.title = 'Pausar'; }
  }
  ssAtualizarBotaoSom();
}

function ssTogglePause() {
  ss.autoPausado = false;   // pausa do usuário manda sobre a do sistema
  ssDefinirPausa(!ss.paused);
}

// Sair do aplicativo (ou bloquear a tela) corta o vídeo e o áudio sem avisar o
// show. Pausar na saída e retomar na volta mantém trilha, vídeo e cronômetro do
// card no mesmo ponto, em vez de voltar com um vídeo mudo ou a trilha parada.
function ssVisibilidade() {
  if (!ss.open) return;
  if (ssFilmeAtivo()) {
    const v = ss.filme.video;
    if (document.hidden) { ss.filme.retomar = !v.paused; v.pause(); }
    else if (ss.filme.retomar) { ss.filme.retomar = false; v.play().catch(() => { /* precisa de toque */ }); }
    return;
  }
  if (document.hidden) {
    if (!ss.paused) { ss.autoPausado = true; ssDefinirPausa(true); }
    return;
  }
  if (ss.autoPausado) {
    ss.autoPausado = false;
    ssDefinirPausa(false);
  } else {
    ssAudioResumir();
  }
  // Sem gesto do usuário o navegador pode recusar destravar o áudio: avisa uma vez.
  setTimeout(() => {
    if (!ss.open || ss.paused) return;
    const temTrilha = ssAudio.modo !== 'none' && allTracks.length;
    if (temTrilha && ssAudio.ctx && ssAudio.ctx.state === 'suspended') {
      toast('Toque na tela para voltar com o som.');
    }
  }, 800);
}

function ssUpdateBar() {
  if (!ss.overlay) return;
  if (ssFilmeAtivo()) { ssAtualizarBotaoSom(); ssAtualizarBarraFilme(); return; }
  const c = ss.list[ss.idx];
  ssAtualizarBotaoSom();
  ss.overlay.querySelector('.ss-meta').textContent =
    `${ss.idx + 1}/${ss.list.length} · ${c.name}${c.demo_video ? '' : ' · sem vídeo'}`;
  ssUpdateProgress();
}

function ssUpdateProgress() {
  if (!ss.overlay) return;
  if (ssFilmeAtivo()) { ssAtualizarBarraFilme(); return; }
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

function ssStartRecording(mime, paraFilme = false) {
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
  ss.recParaFilme = paraFilme;
  ss.recMarcas = [];
  // fora da gravação o vídeo toca pela saída nativa; agora ele precisa entrar
  // no grafo para o som dele ir junto no arquivo
  ss.videoPool.forEach((slot) => ssConectarVideo(slot.el));
  rec.ondataavailable = (e) => { if (e.data && e.data.size) ss.chunks.push(e.data); };
  rec.onstop = () => ssSaveRecording();
  rec.start(1000);
  ss.overlay.querySelector('.ss-rec').hidden = false;
  ss.overlay.querySelector('.ss-rec [data-act="stop-rec"]').textContent =
    paraFilme ? 'Parar e montar' : 'Parar e salvar';
  if (ss.paused) ssTogglePause();
  ssGoTo(0);
  toast(paraFilme ? 'Montando o filme…' : 'Gravando o slideshow…', 'success');
}

function ssStopRecording() {
  if (!ss.rec) return;
  if (ss.rec.state !== 'inactive') ss.rec.stop();
  else ssSaveRecording();
}

function ssSaveRecording() {
  const rec = ss.rec;
  const paraFilme = ss.recParaFilme;
  ss.rec = null;
  ss.recParaFilme = false;
  ss.recDur = Math.max(0.1, (ssNow() - ss.recStart) / 1000);
  if (ss.overlay) ss.overlay.querySelector('.ss-rec').hidden = true;
  if (!ss.chunks.length) {
    toast(paraFilme ? 'O filme saiu vazio.' : 'A gravação saiu vazia.', 'error');
    ss.chunks = [];
    return;
  }
  const type = (rec && rec.mimeType) || ss.recMime || 'video/webm';
  const blob = new Blob(ss.chunks, { type });
  ss.chunks = [];
  if (paraFilme) { ssExibirFilme(blob); return; }
  ssBaixarBlob(blob);
}

function ssBaixarBlob(blob) {
  const type = blob.type || 'video/webm';
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

// ---------------------------------------------------------------- modo filme
/*
   No modo slides o palco é um canvas redesenhado quadro a quadro e cada
   personagem com vídeo é um <video> diferente entrando em cena. Na TV isso
   aparece como troca de mídia: o receptor mostra os controles de reprodução a
   cada personagem e a exibição fica picotada.

   O modo filme resolve na raiz: o show inteiro é montado uma vez só num único
   arquivo (imagem do canvas + trilha + som dos vídeos, via MediaRecorder) e o
   que toca depois é esse arquivo — uma mídia só, do começo ao fim. A montagem é
   em tempo real, então ela roda com barra de progresso, sem travar a tela.
*/

function ssMontarFilme() {
  if (ss.rec) { toast('A montagem já está em andamento.', 'error'); return; }
  const mime = ssPickMime();
  if (!mime || !ss.canvas.captureStream) {
    toast('Este navegador não permite montar o filme.', 'error');
    return;
  }

  // Filme já montado nesta sessão: não precisa gravar tudo de novo.
  if (ss.filme && ss.filme.blob) {
    const ov = openModal(`
      <h3><span class="rune">&#x16D2;</span> Filme já montado</h3>
      <p style="color:var(--ink-2);line-height:1.6">
        Existe um filme montado nesta sessão (${(ss.filme.blob.size / 1048576).toFixed(1)} MB).
        Exibir de novo é imediato; montar outra vez leva o tempo do show inteiro.
      </p>
      <div class="modal-actions">
        <button type="button" class="btn" data-close>Cancelar</button>
        <button type="button" class="btn" data-novo>Montar de novo</button>
        <button type="button" class="btn primary" data-exibir>Exibir o filme</button>
      </div>`);
    ov.querySelector('[data-close]').addEventListener('click', () => closeModal(ov));
    ov.querySelector('[data-exibir]').addEventListener('click', () => {
      closeModal(ov);
      ssExibirFilme(ss.filme.blob, ss.filme.marcas, ss.filme.dur);
    });
    ov.querySelector('[data-novo]').addEventListener('click', () => {
      closeModal(ov);
      ssEncerrarFilme();
      ssStartRecording(mime, true);
    });
    return;
  }

  const withVideo = ss.list.filter((c) => c.demo_video).length;
  const estimate = Math.round((ss.list.length * (ssCardMs / 1000) + withVideo * 8) / 60);
  const overlay = openModal(`
    <h3><span class="rune">&#x16D2;</span> Montar filme contínuo</h3>
    <p style="color:var(--ink-2);line-height:1.6">
      O show inteiro vira <b>um arquivo de vídeo só</b>, com a trilha e o som dos vídeos
      já dentro. Depois ele toca do começo ao fim como um filme — é o modo indicado para
      projetar na TV, porque o receptor não mostra os controles a cada personagem.
      <br><br>
      A montagem é feita em tempo real (~${estimate || 1} min) e você acompanha pela barra
      de progresso. Mantenha esta aba visível até o fim — em segundo plano o navegador
      congela a montagem.
    </p>
    <div class="modal-actions">
      <button type="button" class="btn" data-close>Cancelar</button>
      <button type="button" class="btn primary" data-go>Montar agora</button>
    </div>`);
  overlay.querySelector('[data-close]').addEventListener('click', () => closeModal(overlay));
  overlay.querySelector('[data-go]').addEventListener('click', () => {
    closeModal(overlay);
    ssStartRecording(mime, true);
  });
}

function ssExibirFilme(blob, marcas, dur) {
  if (!ss.open || !ss.overlay) return;
  const url = URL.createObjectURL(blob);
  ss.filme = {
    ativo: true, blob, url, video: null, retomar: false,
    marcas: (marcas || ss.recMarcas).slice(),
    dur: dur || ss.recDur || 0,
  };

  // o motor de slides para: quem manda agora é o arquivo
  cancelAnimationFrame(ss.raf);
  ss.raf = 0;
  if (ss.media && ss.media.tagName === 'VIDEO') ss.media.pause();
  ssAudioPausar(true);          // a trilha já está dentro do filme
  ss.duckAtivo = false;
  ssAudioDuck(false);

  const v = document.createElement('video');
  v.className = 'ss-filme';
  v.playsInline = true;
  v.setAttribute('playsinline', '');
  v.setAttribute('webkit-playsinline', '');
  v.setAttribute('x-webkit-airplay', 'allow');   // AirPlay direto deste arquivo
  v.preload = 'auto';
  v.loop = true;
  v.volume = ssAudio.volume;
  v.src = url;
  v.addEventListener('loadedmetadata', () => {
    if (isFinite(v.duration) && v.duration > 0) ss.filme.dur = v.duration;
    ssAtualizarBarraFilme();
  });
  v.addEventListener('timeupdate', ssAtualizarBarraFilme);
  v.addEventListener('play', ssBotaoPlayFilme);
  v.addEventListener('pause', ssBotaoPlayFilme);

  ss.overlay.classList.add('ss-modo-filme');
  ss.canvas.hidden = true;
  ss.overlay.querySelector('.ss-stage').appendChild(v);
  ss.filme.video = v;
  ss.paused = false;
  v.play().catch(() => { /* liberado no primeiro toque */ });

  const vol = ss.overlay.querySelector('.ss-vol');
  if (vol) vol.value = Math.round(v.volume * 100);
  ssBotaoPlayFilme();
  ssAtualizarBotaoSom();
  ssAtualizarBarraFilme();
  toast('Filme pronto — agora é um arquivo só, sem cortes entre os personagens.', 'success');
}

function ssBotaoPlayFilme() {
  if (!ssFilmeAtivo() || !ss.overlay) return;
  const btn = ss.overlay.querySelector('[data-act="toggle"]');
  if (!btn) return;
  const tocando = !ss.filme.video.paused;
  btn.innerHTML = tocando ? SS_ICONS.pause : SS_ICONS.play;
  btn.title = tocando ? 'Pausar' : 'Continuar';
}

// Em que capítulo (personagem) o filme está agora.
function ssCapituloAtual() {
  const { marcas, video } = ss.filme;
  if (!marcas.length) return -1;
  const t = video.currentTime || 0;
  let k = 0;
  for (let j = 0; j < marcas.length; j += 1) { if (marcas[j].t <= t + 0.15) k = j; }
  return k;
}

function ssPularCapitulo(dir) {
  const { marcas, video } = ss.filme;
  if (!marcas.length) {
    video.currentTime = Math.max(0, (video.currentTime || 0) + dir * 10);
    return;
  }
  const k = ssCapituloAtual();
  // voltar no meio de um capítulo recomeça o capítulo, como num tocador comum
  const alvo = (dir < 0 && (video.currentTime - marcas[k].t) > 2) ? k : k + dir;
  const j = Math.min(marcas.length - 1, Math.max(0, alvo));
  try { video.currentTime = marcas[j].t + 0.05; } catch (_) { /* arquivo sem busca */ }
  ssAtualizarBarraFilme();
}

function ssAtualizarBarraFilme() {
  if (!ssFilmeAtivo() || !ss.overlay) return;
  const { video, marcas } = ss.filme;
  const dur = (isFinite(video.duration) && video.duration > 0) ? video.duration : ss.filme.dur;
  const frac = dur ? Math.min(1, (video.currentTime || 0) / dur) : 0;
  ss.overlay.querySelector('.ss-track span').style.width = `${(frac * 100).toFixed(1)}%`;
  const k = ssCapituloAtual();
  const c = k >= 0 ? ss.list[marcas[k].i] : null;
  ss.overlay.querySelector('.ss-meta').textContent = c
    ? `Filme · ${k + 1}/${marcas.length} · ${c.name}`
    : `Filme · ${ss.list.length} personagens`;
}

// Ações da barra enquanto o filme está no ar. Devolve true quando tratou.
function ssAcaoFilme(act) {
  const v = ss.filme.video;
  if (act === 'toggle') {
    if (v.paused) v.play().catch(() => { /* precisa de um toque */ });
    else v.pause();
    return true;
  }
  if (act === 'next') { ssPularCapitulo(1); return true; }
  if (act === 'prev') { ssPularCapitulo(-1); return true; }
  if (act === 'som') { v.muted = !v.muted; ssAtualizarBotaoSom(); return true; }
  if (act === 'download') { ssBaixarBlob(ss.filme.blob); return true; }
  if (act === 'cast') { ssOpenCastModal(); return true; }
  if (act === 'filme') { toast('O filme já está tocando.'); return true; }
  if (act === 'slides') { ssSairDoFilme(); return true; }
  return false;   // tela cheia e fechar seguem o caminho normal
}

// Volta ao modo slides, no personagem em que o filme estava.
function ssSairDoFilme() {
  if (!ssFilmeAtivo()) return;
  const k = ssCapituloAtual();
  const destino = k >= 0 ? ss.filme.marcas[k].i : ss.idx;
  ssEncerrarFilme();
  ss.canvas.hidden = false;
  ss.paused = false;
  ssAudioResumir();
  ssGoTo(destino);
  ssBotaoPlayFilme();
  if (!ss.raf) ss.raf = requestAnimationFrame(ssFrame);
  const btn = ss.overlay.querySelector('[data-act="toggle"]');
  if (btn) { btn.innerHTML = SS_ICONS.pause; btn.title = 'Pausar'; }
  ssAtualizarBotaoSom();
}

// Tira o filme da tela. O blob fica guardado para poder ser reexibido sem
// montar tudo de novo; só a URL temporária é liberada.
function ssEncerrarFilme() {
  if (!ss.filme) return;
  const { video, url } = ss.filme;
  if (video) {
    video.pause();
    video.removeAttribute('src');
    video.load();
    video.remove();
  }
  if (url) URL.revokeObjectURL(url);
  ss.filme.ativo = false;
  ss.filme.video = null;
  ss.filme.url = '';
  if (ss.overlay) ss.overlay.classList.remove('ss-modo-filme');
}

// ---------------------------------------------------------------- projeção na TV
function ssShareUrl() {
  const url = new URL('/chars', location.origin);
  url.searchParams.set('show', '1');
  Object.entries(ss.filters).forEach(([k, v]) => { if (v) url.searchParams.set(k, v); });
  url.searchParams.set('order', ss.order);
  url.searchParams.set('trilha', ssAudio.modo === 'grupo' && ssAudio.grupoFixo
    ? `${ssAudio.grupoFixo.scope}:${ssAudio.grupoFixo.ref}`
    : ssAudio.modo);
  return url.toString();
}

async function ssTryCast() {
  // Com o filme no ar, o que vai para a TV é o próprio arquivo: uma mídia só,
  // sem o receptor mostrar os controles a cada personagem.
  if (ssFilmeAtivo()) {
    const f = ss.filme.video;
    if (typeof f.webkitShowPlaybackTargetPicker === 'function') {
      f.webkitShowPlaybackTargetPicker();
      return true;
    }
    if (f.remote && typeof f.remote.prompt === 'function') {
      await f.remote.prompt();
      return true;
    }
  }
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
      Para assistir na TV, o <b>modo filme</b> é o que dá a exibição mais fluida: o show
      é montado num arquivo de vídeo só, então a TV não mostra os controles de
      reprodução a cada troca de personagem, como acontece no modo slides.
    </p>
    <p style="color:var(--ink-2);line-height:1.6;margin-bottom:12px">
      No iPhone/iPad o caminho mais confiável é o <b>espelhamento de tela</b>:
      abra a Central de Controle (deslize da borda superior direita para baixo),
      toque em <b>Espelhamento de Tela</b>, escolha a TV/Apple TV e volte para cá —
      o slideshow inteiro aparece na TV. Deixe o slideshow em tela cheia e o aparelho
      em modo paisagem antes de espelhar.
    </p>
    <div class="ss-cast-actions">
      <button type="button" class="btn primary" data-act="filme">&#127909; Montar filme contínuo</button>
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
  overlay.querySelector('[data-act="filme"]').addEventListener('click', () => {
    closeModal(overlay);
    ssMontarFilme();
  });
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
