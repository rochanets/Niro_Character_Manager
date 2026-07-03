/* Módulo Parâmetros: CRUD de regiões, afiliações, elementos e armas */

const META = {
  region:      { label: 'Região',    plural: 'Regiões',    hasImage: false },
  affiliation: { label: 'Afiliação', plural: 'Afiliações', hasImage: false },
  element:     { label: 'Elemento',  plural: 'Elementos',  hasImage: true },
  weapon:      { label: 'Arma',      plural: 'Armas',      hasImage: true },
};

let currentType = 'region';
let allParams = {};
let addImageInput = null;

async function load() {
  allParams = await api('/api/params');
  renderAdd();
  renderList();
}

function renderAdd() {
  const meta = META[currentType];
  const box = document.getElementById('param-add');
  box.innerHTML = `
    <div class="row">
      <div class="field">
        <label class="field-label">Nome d${meta.label === 'Elemento' ? 'o' : 'a'} ${meta.label}</label>
        <input type="text" id="new-name" maxlength="80" placeholder="Ex.: ${meta.hasImage ? (currentType === 'element' ? 'Fogo' : 'Espada') : (currentType === 'region' ? 'Vale de Aur' : 'Ordem dos Sábios')}">
      </div>
      ${meta.hasImage ? '<div class="field"><label class="field-label">Imagem</label><div id="new-image"></div></div>' : ''}
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
      <span class="pi-name">${esc(item.name)}</span>
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

document.querySelectorAll('#param-tabs .tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('#param-tabs .tab').forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    currentType = tab.dataset.type;
    renderAdd();
    renderList();
  });
});

load().catch((e) => toast(e.message, 'error'));
