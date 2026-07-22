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

async function load() {
  if (currentType === 'data') { renderData(); return; }
  allParams = await api('/api/params');
  renderAdd();
  renderList();
}

// ---------------------------------------------------------------- aba Dados (backup)
function renderData() {
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
      const res = await uploadBackupInChunks(file, (sent, total) => {
        const pct = Math.round((sent / total) * 100);
        bar.style.width = pct + '%';
        status.textContent = `Enviando… ${pct}% (${fmtMB(sent)} / ${fmtMB(total)} MB)`;
      });
      bar.style.width = '100%';
      status.textContent = 'Aplicando backup no servidor…';
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
  const uploadId = (crypto.randomUUID
    ? crypto.randomUUID().replace(/-/g, '')
    : (Date.now().toString(16) + Math.random().toString(16).slice(2))).slice(0, 32);
  let sent = 0;
  let index = 0;
  while (sent < file.size) {
    const blob = file.slice(sent, sent + CHUNK);
    const resp = await fetch(`/api/backup/import_chunk?upload_id=${uploadId}&index=${index}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: blob,
    });
    if (!resp.ok) {
      let msg = `Erro ${resp.status} ao enviar parte ${index + 1}`;
      try { const b = await resp.json(); if (b && b.error) msg = b.error; } catch (_) {}
      throw new Error(msg);
    }
    sent += blob.size;
    index += 1;
    if (onProgress) onProgress(sent, file.size);
  }
  return api(`/api/backup/import_finalize?upload_id=${uploadId}`, { method: 'POST' });
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
    btn.textContent = 'Importando...';
    const fd = new FormData();
    fd.append('file', file);
    try {
      await api('/api/import', { method: 'POST', body: fd });
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
    if (currentType === 'data') {
      renderData();
    } else {
      renderAdd();
      renderList();
    }
  });
});

load().catch((e) => toast(e.message, 'error'));
