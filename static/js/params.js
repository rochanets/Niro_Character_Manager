/* Módulo Parâmetros: CRUD de regiões, afiliações, elementos e armas */

const META = {
  region:      { label: 'Região',    plural: 'Regiões',    hasImage: false },
  affiliation: { label: 'Afiliação', plural: 'Afiliações', hasImage: false },
  element:     { label: 'Elemento',  plural: 'Elementos',  hasImage: true },
  weapon:      { label: 'Arma',      plural: 'Armas',      hasImage: true },
  role:        { label: 'Role',      plural: 'Roles',      hasImage: false, hasDescription: true },
};

let currentType = 'region';
let allParams = {};
let addImageInput = null;

// Abas que não são CRUD de parâmetro têm cada uma o seu renderizador.
const ABAS_ESPECIAIS = { data: () => renderData(), tracks: () => renderTracks() };

async function load() {
  if (ABAS_ESPECIAIS[currentType]) { await ABAS_ESPECIAIS[currentType](); return; }
  allParams = await api('/api/params');
  renderAdd();
  renderList();
}

// Link direto para uma aba: /parametros#trilhas. O endereço usa o nome em
// português (o que o usuário vê); os data-type do HTML seguem em inglês.
const APELIDOS_ABA = {
  regioes: 'region', afiliacoes: 'affiliation', elementos: 'element',
  armas: 'weapon', roles: 'role', trilhas: 'tracks', dados: 'data',
};
const APELIDO_POR_ABA = Object.fromEntries(
  Object.entries(APELIDOS_ABA).map(([apelido, tipo]) => [tipo, apelido]));

function abaDoEndereco() {
  const bruto = decodeURIComponent((location.hash || '').replace('#', ''));
  const alvo = APELIDOS_ABA[bruto] || bruto;
  return document.querySelector(`#param-tabs .tab[data-type="${alvo}"]`) ? alvo : null;
}

// ---------------------------------------------------------------- aba Dados (backup)
function renderData() {
  document.getElementById('param-list').classList.remove('as-tracks');
  document.getElementById('param-list').innerHTML = '';
  const box = document.getElementById('param-add');
  box.innerHTML = `
    <div class="data-panel">
      <div class="data-block">
        <h3 style="margin:0 0 6px">Exportar backup</h3>
        <p style="color:var(--ink-2);line-height:1.6;margin:0 0 12px">
          Baixe um arquivo <b>.zip</b> com o banco de dados e todas as imagens.
          Use-o como backup ou para migrar os dados locais para a versão on-line.
        </p>
        <a class="btn primary" href="/api/backup/export" download>&#x2193; Baixar backup (.zip)</a>
      </div>
      <div class="rune-divider" aria-hidden="true" style="margin:22px 0">&#x16A0; &#x16B1; &#x16C7; &#x16D2; &#x16DE;</div>
      <div class="data-block">
        <h3 style="margin:0 0 6px">Importar backup</h3>
        <p style="color:var(--ink-2);line-height:1.6;margin:0 0 12px">
          Envie um <b>.zip</b> exportado (contendo <code>niro.db</code> e a pasta
          <code>uploads/</code>). <b style="color:var(--danger,#e05a5a)">Atenção:</b>
          isto <b>substitui</b> o banco de dados atual e mescla as imagens.
        </p>
        <div class="row" style="align-items:center;gap:12px">
          <input type="file" id="backup-file" accept=".zip">
          <button class="btn primary" id="import-btn">&#x2191; Importar backup</button>
        </div>
        <div id="import-progress" style="display:none;margin-top:12px">
          <div style="height:8px;border-radius:6px;background:var(--glass);overflow:hidden">
            <div id="import-bar" style="height:100%;width:0;background:var(--accent);transition:width .2s"></div>
          </div>
          <div id="import-status" style="font-size:12px;color:var(--ink-2);margin-top:6px"></div>
        </div>
      </div>
    </div>`;

  const fileInput = box.querySelector('#backup-file');
  box.querySelector('#import-btn').addEventListener('click', async () => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) return toast('Selecione o arquivo .zip de backup.', 'error');
    if (!confirm('Isto vai SUBSTITUIR o banco de dados atual pelos dados do backup. Deseja continuar?')) return;
    const btn = box.querySelector('#import-btn');
    const progress = box.querySelector('#import-progress');
    const bar = box.querySelector('#import-bar');
    const status = box.querySelector('#import-status');
    btn.disabled = true;
    btn.textContent = 'Importando…';
    progress.style.display = 'block';
    try {
      const res = await uploadBackupInChunks(file, (sent, total, finalizing = false) => {
        const pct = Math.round((sent / total) * 100);
        bar.style.width = pct + '%';
        status.textContent = finalizing
          ? 'Aplicando backup no servidor…'
          : `Enviando… ${pct}% (${fmtMB(sent)} / ${fmtMB(total)} MB)`;
      });
      bar.style.width = '100%';
      status.textContent = 'Backup aplicado com sucesso.';
      toast(`Backup importado: ${res.characters} personagem(ns) e ${res.images} imagem(ns).`, 'success');
      setTimeout(() => window.location.reload(), 1400);
    } catch (err) {
      toast(err.message, 'error');
      btn.disabled = false;
      btn.innerHTML = '&#x2191; Importar backup';
      status.textContent = 'Falha no envio: ' + err.message;
    }
  });
}

function fmtMB(bytes) {
  return (bytes / (1024 * 1024)).toFixed(1);
}

// Envia o .zip em partes de ~4 MB para contornar o limite de tamanho de corpo
// do edge/proxy da hospedagem, e só então dispara a aplicação do backup.
async function uploadBackupInChunks(file, onProgress) {
  const CHUNK = 4 * 1024 * 1024;
  const MAX_ATTEMPTS = 4;
  const uploadId = (crypto.randomUUID
    ? crypto.randomUUID().replace(/-/g, '')
    : (Date.now().toString(16) + Math.random().toString(16).slice(2))).slice(0, 32);
  let sent = 0;
  let index = 0;
  while (sent < file.size) {
    const blob = file.slice(sent, sent + CHUNK);
    let completed = false;
    let lastError = null;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS && !completed; attempt += 1) {
      try {
        const resp = await fetch(
          `/api/backup/import_chunk?upload_id=${uploadId}&index=${index}&offset=${sent}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/octet-stream' },
            body: blob,
          },
        );
        if (resp.ok) {
          completed = true;
          break;
        }
        let msg = `Erro ${resp.status} ao enviar parte ${index + 1}`;
        try { const b = await resp.json(); if (b && b.error) msg = b.error; } catch (_) {}
        lastError = new Error(msg);
        if (resp.status < 500 && resp.status !== 408 && resp.status !== 429) break;
      } catch (_) {
        lastError = new Error(`Falha de rede ao enviar a parte ${index + 1} do backup.`);
      }
      if (attempt < MAX_ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
      }
    }
    if (!completed) throw lastError || new Error(`Não foi possível enviar a parte ${index + 1}.`);
    sent += blob.size;
    index += 1;
    if (onProgress) onProgress(sent, file.size);
  }
  if (onProgress) onProgress(file.size, file.size, true);
  return api(`/api/backup/import_finalize?upload_id=${uploadId}&expected_size=${file.size}`, { method: 'POST' });
}

function renderAdd() {
  const meta = META[currentType];
  const box = document.getElementById('param-add');
  const namePlaceholder = meta.hasImage
    ? (currentType === 'element' ? 'Fogo' : 'Espada')
    : (currentType === 'region' ? 'Vale de Aur' : currentType === 'affiliation' ? 'Ordem dos Sábios' : 'Crowd Control');
  box.innerHTML = `
    <div class="row">
      <div class="field">
        <label class="field-label">Nome d${meta.label === 'Elemento' ? 'o' : 'a'} ${meta.label}</label>
        <input type="text" id="new-name" maxlength="80" placeholder="Ex.: ${namePlaceholder}">
      </div>
      ${meta.hasImage ? '<div class="field"><label class="field-label">Imagem</label><div id="new-image"></div></div>' : ''}
      ${meta.hasDescription ? '<div class="field"><label class="field-label">Descrição (usada pela IA ao gerar habilidades)</label><input type="text" id="new-description" maxlength="300" placeholder="Ex.: controla o campo de batalha, prendendo ou atordoando inimigos"></div>' : ''}
      <button class="btn primary" id="add-btn">+ Adicionar</button>
    </div>`;
  addImageInput = meta.hasImage ? createImageInput(document.getElementById('new-image')) : null;

  const nameInput = document.getElementById('new-name');
  document.getElementById('add-btn').addEventListener('click', async () => {
    const name = nameInput.value.trim();
    if (!name) return toast('Informe o nome.', 'error');
    if (META[currentType].hasImage && !addImageInput.file) return toast('Envie uma imagem.', 'error');
    const fd = new FormData();
    fd.append('name', name);
    if (addImageInput && addImageInput.file) fd.append('image', addImageInput.file);
    if (meta.hasDescription) fd.append('description', document.getElementById('new-description').value.trim());
    try {
      await api(`/api/params/${currentType}`, { method: 'POST', body: fd });
      toast(`${META[currentType].label} adicionad${currentType === 'element' ? 'o' : 'a'}!`, 'success');
      await load();
    } catch (err) { toast(err.message, 'error'); }
  });
  nameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('add-btn').click();
  });
}

function renderList() {
  document.getElementById('param-list').classList.remove('as-tracks');
  const meta = META[currentType];
  const items = allParams[currentType] || [];
  const list = document.getElementById('param-list');
  if (!items.length) {
    list.innerHTML = `<div class="empty-state glass" style="grid-column:1/-1"><span class="rune">&#x16C1;</span>Nenhum item cadastrado em ${meta.plural}.</div>`;
    return;
  }
  list.innerHTML = items.map((item) => `
    <div class="param-item glass" data-id="${item.id}">
      ${meta.hasImage && item.image ? `<img src="/static/${esc(item.image)}" alt="">` : ''}
      <span class="pi-name">${esc(item.name)}${meta.hasDescription && item.description ? `<br><small style="color:var(--ink-3);font-weight:400">${esc(item.description)}</small>` : ''}</span>
      <span class="pi-actions">
        <button class="icon-btn" data-edit="${item.id}" title="Editar">&#x270E;</button>
        <button class="icon-btn danger" data-del="${item.id}" title="Excluir">&#x2715;</button>
      </span>
    </div>`).join('');

  list.querySelectorAll('[data-edit]').forEach((btn) =>
    btn.addEventListener('click', () => openEdit(+btn.dataset.edit)));
  list.querySelectorAll('[data-del]').forEach((btn) =>
    btn.addEventListener('click', () => tryDelete(+btn.dataset.del)));
}

function openEdit(id) {
  const meta = META[currentType];
  const item = allParams[currentType].find((i) => i.id === id);
  const overlay = openModal(`
    <h3><span class="rune">&#x16B9;</span> Editar ${meta.label}</h3>
    <div class="field">
      <label class="field-label">Nome</label>
      <input type="text" id="edit-name" maxlength="80" value="${esc(item.name)}">
    </div>
    ${meta.hasImage ? '<div class="field"><label class="field-label">Imagem (deixe como está para manter)</label><div id="edit-image"></div></div>' : ''}
    ${meta.hasDescription ? `<div class="field"><label class="field-label">Descrição (usada pela IA ao gerar habilidades)</label><input type="text" id="edit-description" maxlength="300" value="${esc(item.description || '')}"></div>` : ''}
    <p style="font-size:12px;color:var(--ink-3)">A alteração será refletida em todos os personagens que usam este item.</p>
    <div class="modal-actions">
      <button class="btn" data-close>Cancelar</button>
      <button class="btn primary" data-save>Salvar</button>
    </div>`);
  const editImage = meta.hasImage
    ? createImageInput(overlay.querySelector('#edit-image'),
        { existingUrl: item.image ? `/static/${item.image}` : null })
    : null;
  overlay.querySelector('[data-close]').onclick = () => closeModal(overlay);
  overlay.querySelector('[data-save]').onclick = async () => {
    const fd = new FormData();
    fd.append('name', overlay.querySelector('#edit-name').value.trim());
    if (editImage && editImage.file) fd.append('image', editImage.file);
    if (meta.hasDescription) fd.append('description', overlay.querySelector('#edit-description').value.trim());
    try {
      await api(`/api/params/${currentType}/${id}`, { method: 'PUT', body: fd });
      closeModal(overlay);
      toast('Atualizado! Personagens vinculados foram atualizados.', 'success');
      await load();
    } catch (err) { toast(err.message, 'error'); }
  };
}

async function tryDelete(id) {
  const meta = META[currentType];
  const item = allParams[currentType].find((i) => i.id === id);
  try {
    await api(`/api/params/${currentType}/${id}`, { method: 'DELETE' });
    toast(`${meta.label} excluíd${currentType === 'element' ? 'o' : 'a'}.`, 'success');
    await load();
  } catch (err) {
    if (err.status === 409 && err.body && err.body.in_use) {
      openReassign(id, item, err.body.characters);
    } else {
      toast(err.message, 'error');
    }
  }
}

function openReassign(id, item, characters) {
  const meta = META[currentType];
  const others = allParams[currentType].filter((i) => i.id !== id);
  if (!others.length) {
    return toast(`Não é possível excluir: há personagens usando "${item.name}" e nenhuma outra opção de ${meta.label} para substituir. Cadastre outra antes.`, 'error');
  }
  const overlay = openModal(`
    <h3><span class="rune">&#x16DA;</span> ${meta.label} em uso</h3>
    <p style="color:var(--ink-2);line-height:1.6;margin-bottom:14px">
      <b>${esc(item.name)}</b> está em uso pelos personagens abaixo. Escolha uma nova opção
      para eles antes de excluir.
    </p>
    <div class="pick-grid" style="margin-bottom:16px">
      ${characters.map((c) => `
        <div class="pick-card">
          <img src="/static/${esc(c.card_promo)}" alt="">
          <div class="pk-name">${esc(c.name)}</div>
        </div>`).join('')}
    </div>
    <div class="field">
      <label class="field-label">Substituir por</label>
      <select id="reassign-select">
        ${others.map((o) => `<option value="${o.id}">${esc(o.name)}</option>`).join('')}
      </select>
    </div>
    <div class="modal-actions">
      <button class="btn" data-close>Cancelar</button>
      <button class="btn danger" data-confirm>Substituir e Excluir</button>
    </div>`);
  overlay.querySelector('[data-close]').onclick = () => closeModal(overlay);
  overlay.querySelector('[data-confirm]').onclick = async () => {
    const newId = overlay.querySelector('#reassign-select').value;
    try {
      await api(`/api/params/${currentType}/${id}?reassign_to=${newId}`, { method: 'DELETE' });
      closeModal(overlay);
      toast('Personagens atualizados e item excluído.', 'success');
      await load();
    } catch (err) { toast(err.message, 'error'); }
  };
}

// ---------------------------------------------------------------- backup (exportar/importar)
document.getElementById('import-btn').addEventListener('click', () => {
  document.getElementById('import-file').click();
});

document.getElementById('import-file').addEventListener('change', function () {
  const file = this.files[0];
  this.value = '';
  if (!file) return;

  const overlay = openModal(`
    <h3><span class="rune">&#x16DA;</span> Importar backup</h3>
    <p style="color:var(--ink-2);line-height:1.6">
      Isso vai <b>substituir todos os dados atuais</b> (personagens, imagens, times, banners,
      parâmetros e histórico) pelo conteúdo de <b>${esc(file.name)}</b>. Essa ação não pode ser desfeita.
    </p>
    <div class="modal-actions">
      <button class="btn" data-close>Cancelar</button>
      <button class="btn danger" data-confirm>Substituir tudo e importar</button>
    </div>`);
  overlay.querySelector('[data-close]').onclick = () => closeModal(overlay);
  overlay.querySelector('[data-confirm]').onclick = async () => {
    const btn = overlay.querySelector('[data-confirm]');
    btn.disabled = true;
    btn.textContent = 'Importando… 0%';
    try {
      await uploadBackupInChunks(file, (sent, total, finalizing = false) => {
        const pct = Math.round((sent / total) * 100);
        btn.textContent = finalizing ? 'Aplicando backup…' : `Importando… ${pct}%`;
      });
      toast('Backup importado! Recarregando...', 'success');
      setTimeout(() => window.location.reload(), 800);
    } catch (err) {
      toast(err.message, 'error');
      closeModal(overlay);
    }
  };
});

document.querySelectorAll('#param-tabs .tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('#param-tabs .tab').forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    currentType = tab.dataset.type;
    history.replaceState(null, '', currentType === 'region'
      ? location.pathname
      : `#${APELIDO_POR_ABA[currentType] || currentType}`);
    load().catch((e) => toast(e.message, 'error'));
  });
});

const abaInicial = abaDoEndereco();
if (abaInicial) {
  currentType = abaInicial;
  document.querySelectorAll('#param-tabs .tab').forEach((t) =>
    t.classList.toggle('active', t.dataset.type === abaInicial));
}


/* ================================================================
   Aba Trilhas — trilha sonora do slideshow do módulo Chars.
   Envio em lote, vínculo automático pelo nome do arquivo, lixeira de
   30 dias e os ajustes de som usados pelo slideshow.
   ================================================================ */

let tracks = [];
let trackSettings = { duck: 0.15, video_sound: 1, volume: 0.7 };
let trashOpen = false;

const SCOPE_LABEL = { element: 'Elemento', region: 'Região', geral: 'Geral' };

async function renderTracks() {
  [allParams, tracks, trackSettings] = await Promise.all([
    api('/api/params'),
    api('/api/tracks'),
    api('/api/tracks/settings').catch(() => trackSettings),
  ]);
  pintarCaixaTrilhas();
  pintarListaTrilhas();
}

function pintarCaixaTrilhas() {
  const duck = Math.round(trackSettings.duck * 100);
  const vol = Math.round(trackSettings.volume * 100);
  document.getElementById('param-add').innerHTML = `
    <div class="drop-zone" id="drop-zone">
      <div class="dz-icon">&#x266B;</div>
      <div><b>Arraste as faixas para cá</b> ou clique para escolher os arquivos</div>
      <div class="ii-hint">MP3, M4A, OGG, WAV — vários de uma vez</div>
      <div class="ii-hint">
        O vínculo é automático pelo nome: <code>fae_1.mp3</code> vira o elemento Fae,
        <code>aurion_2.mp3</code> vira a região Aurion.
      </div>
      <input type="file" id="file-input" accept="audio/*" multiple hidden>
    </div>
    <div class="ai-progress" id="upload-progress"><div class="bar"></div></div>
    <div id="upload-label" class="ii-note" style="display:none;text-align:right"></div>

    <div class="settings-grid">
      <label class="set-item">
        <span class="set-label">Som dos vídeos dos personagens</span>
        <span class="set-control">
          <input type="checkbox" id="set-video-sound" ${trackSettings.video_sound ? 'checked' : ''}>
          <span class="set-hint">Os vídeos tocam com o áudio próprio deles</span>
        </span>
      </label>
      <label class="set-item">
        <span class="set-label">Volume da trilha <b>durante os vídeos</b></span>
        <span class="set-control">
          <input type="range" id="set-duck" min="0" max="100" step="5" value="${duck}">
          <output id="set-duck-val">${duck}%</output>
        </span>
        <span class="set-hint">Quanto a música recua quando o vídeo começa. 0% deixa só o som do vídeo.</span>
      </label>
      <label class="set-item">
        <span class="set-label">Volume inicial da trilha</span>
        <span class="set-control">
          <input type="range" id="set-volume" min="0" max="100" step="5" value="${vol}">
          <output id="set-volume-val">${vol}%</output>
        </span>
        <span class="set-hint">Ponto de partida; dá para mudar na barra do slideshow.</span>
      </label>
    </div>`;
  ligarEnvioTrilhas();
  ligarAjustesTrilhas();
}

function refOptions(scope, current) {
  if (scope === 'geral') return '';
  const lista = [...new Set((allParams[scope] || []).map((p) => p.name))];
  return lista.map((nome) =>
    `<option value="${esc(nome)}" ${nome === current ? 'selected' : ''}>${esc(nome)}</option>`).join('');
}

function trackRow(t) {
  return `
    <div class="track-row" data-id="${t.id}">
      <div class="tk-main">
        <span class="tk-name">${esc(t.name)}</span>
        <audio controls preload="none" src="${esc(t.url)}"></audio>
      </div>
      <div class="tk-actions">
        <select class="tk-scope">
          <option value="element" ${t.scope === 'element' ? 'selected' : ''}>Elemento</option>
          <option value="region" ${t.scope === 'region' ? 'selected' : ''}>Região</option>
          <option value="geral" ${t.scope === 'geral' ? 'selected' : ''}>Geral</option>
        </select>
        <select class="tk-ref" ${t.scope === 'geral' ? 'disabled' : ''}>
          <option value="">— vincular a —</option>
          ${refOptions(t.scope, t.ref_name)}
        </select>
        <button type="button" class="icon-btn danger tk-del" title="Excluir">&#x2715;</button>
      </div>
    </div>`;
}

function pintarListaTrilhas() {
  const lista = document.getElementById('param-list');
  lista.classList.add('as-tracks');   // desliga o grid de cartões dos parâmetros
  const cabecalho = `
    <div class="tracks-head">
      <span class="page-sub">${tracks.length} faixa(s) cadastrada(s)</span>
      <button type="button" class="btn small ${trashOpen ? 'primary' : ''}" id="toggle-trash">Lixeira</button>
    </div>`;

  if (!tracks.length) {
    lista.innerHTML = cabecalho + `<div class="empty-state glass"><span class="rune">&#x16DE;</span>
      Nenhuma faixa cadastrada ainda. Arraste os arquivos para o campo acima.</div>
      <div id="trash-area" ${trashOpen ? '' : 'hidden'}></div>`;
    ligarListaTrilhas();
    return;
  }

  // agrupa por vínculo: cada elemento/região vira um container e o que não
  // casou com nada fica em "Geral".
  const grupos = new Map();
  for (const t of tracks) {
    const chave = t.ref_name ? `${SCOPE_LABEL[t.scope]}: ${t.ref_name}` : 'Geral (sem vínculo)';
    if (!grupos.has(chave)) grupos.set(chave, []);
    grupos.get(chave).push(t);
  }
  const chaves = [...grupos.keys()].sort((a, b) => {
    if (a.startsWith('Geral')) return 1;
    if (b.startsWith('Geral')) return -1;
    return a.localeCompare(b, 'pt-BR');
  });

  lista.innerHTML = cabecalho + chaves.map((chave) => `
    <div class="group-container glass">
      <h3>${esc(chave)} <span class="count">(${grupos.get(chave).length})</span></h3>
      <div class="track-list">${grupos.get(chave).map(trackRow).join('')}</div>
    </div>`).join('') + `<div id="trash-area" ${trashOpen ? '' : 'hidden'}></div>`;
  ligarListaTrilhas();
  if (trashOpen) renderTrash().catch((e) => toast(e.message, 'error'));
}

async function salvarTrilha(id, dados) {
  const t = tracks.find((x) => x.id === id);
  const atualizado = await api(`/api/tracks/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: t.name, scope: t.scope, ref_name: t.ref_name, credit: t.credit, ...dados }),
  });
  Object.assign(t, atualizado);
  pintarListaTrilhas();
}

// ---------------------------------------------------------------- envio em lote
async function enviarTrilhas(arquivos) {
  const lista = [...arquivos].filter((f) =>
    f.type.startsWith('audio/') || /\.(mp3|m4a|aac|ogg|oga|wav|flac)$/i.test(f.name));
  if (!lista.length) { toast('Nenhum arquivo de áudio reconhecido.', 'error'); return; }

  const form = new FormData();
  lista.forEach((f) => form.append('files', f));

  const barra = document.getElementById('upload-progress');
  const rotulo = document.getElementById('upload-label');
  barra.classList.add('active');
  rotulo.style.display = 'block';
  rotulo.textContent = `Enviando ${lista.length} faixa(s)...`;

  try {
    const resp = await apiUpload('/api/tracks', 'POST', form, (frac) => {
      barra.querySelector('.bar').style.width = `${(frac * 100).toFixed(0)}%`;
      rotulo.textContent = `Enviando ${lista.length} faixa(s)... ${(frac * 100).toFixed(0)}%`;
    });
    const vinculadas = (resp.tracks || []).filter((t) => t.ref_name).length;
    toast(`${(resp.tracks || []).length} faixa(s) enviada(s), ${vinculadas} vinculada(s) automaticamente.`, 'success');
    (resp.errors || []).forEach((e) => toast(e, 'error'));
    tracks = await api('/api/tracks');
    pintarListaTrilhas();
  } catch (e) {
    toast(e.message, 'error');
  } finally {
    barra.classList.remove('active');
    barra.querySelector('.bar').style.width = '0%';
    rotulo.style.display = 'none';
  }
}

function ligarEnvioTrilhas() {
  const zona = document.getElementById('drop-zone');
  const input = document.getElementById('file-input');
  zona.addEventListener('click', () => input.click());
  input.addEventListener('change', () => {
    if (input.files.length) enviarTrilhas(input.files);
    input.value = '';
  });
  ['dragover', 'dragenter'].forEach((ev) =>
    zona.addEventListener(ev, (e) => { e.preventDefault(); zona.classList.add('dragover'); }));
  ['dragleave', 'drop'].forEach((ev) =>
    zona.addEventListener(ev, (e) => { e.preventDefault(); zona.classList.remove('dragover'); }));
  zona.addEventListener('drop', (e) => {
    if (e.dataTransfer.files.length) enviarTrilhas(e.dataTransfer.files);
  });
}

// ---------------------------------------------------------------- ajustes de som
function ligarAjustesTrilhas() {
  document.getElementById('set-video-sound').addEventListener('change', function () {
    salvarAjustesTrilha({ video_sound: this.checked ? 1 : 0 });
  });
  ['duck', 'volume'].forEach((campo) => {
    const slider = document.getElementById(`set-${campo}`);
    slider.addEventListener('input', function () {
      document.getElementById(`set-${campo}-val`).textContent = `${this.value}%`;
    });
    // só grava quando solta o controle, para não disparar um PUT por pixel
    slider.addEventListener('change', function () {
      salvarAjustesTrilha({ [campo]: this.value / 100 });
    });
  });
}

async function salvarAjustesTrilha(mudanca) {
  try {
    trackSettings = await api('/api/tracks/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mudanca),
    });
    toast('Ajuste salvo.', 'success');
  } catch (e) {
    toast(e.message, 'error');
  }
}

// ---------------------------------------------------------------- lista e lixeira
let listaTrilhasLigada = false;

function ligarListaTrilhas() {
  // #param-list é reaproveitado a cada render: os listeners ficam nele por
  // delegação e são registrados uma única vez.
  if (listaTrilhasLigada) return;
  listaTrilhasLigada = true;
  const lista = document.getElementById('param-list');

  lista.addEventListener('change', (e) => {
    const linha = e.target.closest('.track-row');
    if (!linha || linha.closest('#trash-area')) return;
    const id = +linha.dataset.id;
    if (e.target.classList.contains('tk-scope')) {
      salvarTrilha(id, { scope: e.target.value, ref_name: '' }).catch((err) => toast(err.message, 'error'));
    } else if (e.target.classList.contains('tk-ref')) {
      salvarTrilha(id, { ref_name: e.target.value }).catch((err) => toast(err.message, 'error'));
    }
  });

  lista.addEventListener('click', async (e) => {
    if (e.target.closest('#toggle-trash')) {
      trashOpen = !trashOpen;
      const area = document.getElementById('trash-area');
      area.hidden = !trashOpen;
      document.getElementById('toggle-trash').classList.toggle('primary', trashOpen);
      if (trashOpen) await renderTrash().catch((err) => toast(err.message, 'error'));
      return;
    }

    const linha = e.target.closest('.track-row');
    if (!linha) return;
    const id = +linha.dataset.id;

    if (e.target.closest('.tk-del')) {
      const t = tracks.find((x) => x.id === id);
      const ok = await confirmDialog({
        title: 'Excluir faixa',
        message: `A faixa "${t.name}" vai para a lixeira e pode ser restaurada por 30 dias.`,
        confirmLabel: 'Excluir',
        danger: true,
      });
      if (!ok) return;
      try {
        await api(`/api/tracks/${id}`, { method: 'DELETE' });
        tracks = tracks.filter((x) => x.id !== id);
        pintarListaTrilhas();
        toast('Faixa movida para a lixeira.', 'success');
      } catch (err) {
        toast(err.message, 'error');
      }
    } else if (e.target.closest('.tk-restore')) {
      try {
        await api(`/api/tracks/${id}/restore`, { method: 'POST' });
        toast('Faixa restaurada.', 'success');
        tracks = await api('/api/tracks');
        pintarListaTrilhas();
      } catch (err) {
        toast(err.message, 'error');
      }
    } else if (e.target.closest('.tk-purge')) {
      const ok = await confirmDialog({
        title: 'Excluir definitivamente',
        message: 'O arquivo será apagado do servidor. Esta ação não pode ser desfeita.',
        confirmLabel: 'Excluir para sempre',
        danger: true,
      });
      if (!ok) return;
      try {
        await api(`/api/tracks/${id}/permanent`, { method: 'DELETE' });
        toast('Faixa excluída definitivamente.', 'success');
        await renderTrash();
      } catch (err) {
        toast(err.message, 'error');
      }
    }
  });
}

async function renderTrash() {
  const area = document.getElementById('trash-area');
  if (!area) return;
  const lista = await api('/api/tracks/archived');
  if (!lista.length) {
    area.innerHTML = `<div class="group-container glass"><h3>Lixeira</h3>
      <p class="page-sub">Nenhuma faixa excluída.</p></div>`;
    return;
  }
  area.innerHTML = `
    <div class="group-container glass">
      <h3>Lixeira <span class="count">(${lista.length})</span></h3>
      <p class="page-sub">Faixas excluídas somem de vez depois de 30 dias.</p>
      <div class="track-list">
        ${lista.map((t) => `
          <div class="track-row" data-id="${t.id}">
            <div class="tk-main">
              <span class="tk-name">${esc(t.name)}</span>
              <span class="page-sub">${t.days_left} dia(s) restante(s)</span>
            </div>
            <div class="tk-actions">
              <button type="button" class="btn small tk-restore">Restaurar</button>
              <button type="button" class="icon-btn danger tk-purge" title="Excluir definitivamente">&#x2715;</button>
            </div>
          </div>`).join('')}
      </div>
    </div>`;
}


load().catch((e) => toast(e.message, 'error'));
