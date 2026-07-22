/* Módulo Reações: chart cruzando todos os elementos (linhas x colunas).
   Mesmo elemento = bloco preto "Mono X". Cruzamentos diferentes = reação
   cadastrada (imagem composta + nome) ou um "+" para cadastrar.
   Última coluna, à direita = bloco branco "X Rainbow" por linha. */

let elements = null;
let reactions = null;

function reactionByPair(e1, e2) {
  const lo = Math.min(e1, e2), hi = Math.max(e1, e2);
  return (reactions || []).find((r) => r.element1.id === lo && r.element2.id === hi) || null;
}

async function load() {
  const [params, rx] = await Promise.all([api('/api/params'), api('/api/reactions')]);
  elements = params.element;
  reactions = rx;
  render();
}

function headerCellHtml(el) {
  const img = el.image ? `<img src="${esc(thumbUrl(el.image, 64))}" alt="${esc(el.name)}">` : '';
  return `<div class="rx-cell rx-header"><div class="rx-header-inner">${img}<span>${esc(el.name)}</span></div></div>`;
}

function monoCellHtml(el) {
  return `
    <div class="rx-cell rx-mono" data-mono="${el.id}">
      <span class="rx-mono-label" data-el="${el.id}">Mono ${esc(el.name)}</span>
    </div>`;
}

function rainbowCellHtml(el) {
  return `
    <div class="rx-cell rx-rainbow">
      <span class="rx-rainbow-label">${esc(el.name)} Rainbow</span>
    </div>`;
}

function crossCellHtml(rowEl, colEl) {
  const r = reactionByPair(rowEl.id, colEl.id);
  if (r) {
    return `
      <div class="rx-cell rx-reaction" data-reaction="${r.id}" title="${esc(r.name)}">
        <img src="${esc(thumbUrl(r.image, 120))}" alt="${esc(r.name)}">
        <span class="rx-reaction-name">${esc(r.name)}</span>
      </div>`;
  }
  return `
    <div class="rx-cell rx-empty" data-e1="${rowEl.id}" data-e2="${colEl.id}" title="Cadastrar reação: ${esc(rowEl.name)} + ${esc(colEl.name)}">
      <button class="rx-add" data-e1="${rowEl.id}" data-e2="${colEl.id}">+</button>
    </div>`;
}

function render() {
  const root = document.getElementById('reactions-chart');
  if (!elements.length) {
    root.innerHTML = `<div class="empty-state glass"><span class="rune">&#x16DF;</span>
      Cadastre elementos em Parâmetros primeiro.</div>`;
    return;
  }
  const n = elements.length;
  let html = `<div class="rx-grid" style="grid-template-columns: 130px repeat(${n}, minmax(96px, 1fr)) 140px;">`;
  html += `<div class="rx-cell rx-corner"></div>`;
  elements.forEach((el) => { html += headerCellHtml(el); });
  html += `<div class="rx-cell rx-header rx-rainbow-header">Rainbow</div>`;

  elements.forEach((rowEl) => {
    html += headerCellHtml(rowEl);
    elements.forEach((colEl) => {
      html += rowEl.id === colEl.id ? monoCellHtml(rowEl) : crossCellHtml(rowEl, colEl);
    });
    html += rainbowCellHtml(rowEl);
  });
  html += `</div>`;
  root.innerHTML = html;

  elements.forEach((el) =>
    elementColor(el).then((color) => {
      if (!color) return;
      root.querySelectorAll(`.rx-mono-label[data-el="${el.id}"]`).forEach((n2) => { n2.style.color = color; });
    }));

  root.querySelectorAll('.rx-add').forEach((btn) =>
    btn.addEventListener('click', () => openCreateModal(+btn.dataset.e1, +btn.dataset.e2)));
  root.querySelectorAll('.rx-reaction').forEach((cell) =>
    cell.addEventListener('click', () => openEditModal(+cell.dataset.reaction)));
}

function elementName(id) {
  const el = elements.find((e) => e.id === id);
  return el ? el.name : '';
}

// ---------------------------------------------------------------- cadastro
function openCreateModal(e1, e2) {
  const overlay = openModal(`
    <h3><span class="rune">&#x16DF;</span> Nova reação — ${esc(elementName(e1))} + ${esc(elementName(e2))}</h3>
    <div class="field">
      <label class="field-label">Nome da reação</label>
      <input type="text" id="rx-name" maxlength="60" placeholder="Ex.: Vapor Ardente">
    </div>
    <div class="field">
      <label class="field-label">Descrição</label>
      <textarea id="rx-description" maxlength="500" rows="3" placeholder="O que acontece quando os dois elementos se encontram..."></textarea>
    </div>
    <div class="field">
      <label class="field-label">Efeito in-game</label>
      <textarea id="rx-effect" maxlength="500" rows="3" placeholder="Dano extra, status aplicado, etc."></textarea>
    </div>
    <div class="modal-actions">
      <button class="btn" data-close>Cancelar</button>
      <button class="btn primary" data-save>Cadastrar</button>
    </div>`);
  overlay.querySelector('[data-close]').onclick = () => closeModal(overlay);
  overlay.querySelector('[data-save]').onclick = async () => {
    const name = overlay.querySelector('#rx-name').value.trim();
    const description = overlay.querySelector('#rx-description').value.trim();
    const effect = overlay.querySelector('#rx-effect').value.trim();
    if (!name) { toast('Informe o nome da reação.', 'error'); return; }
    const btn = overlay.querySelector('[data-save]');
    btn.disabled = true;
    btn.textContent = 'Gerando...';
    try {
      await api('/api/reactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ element1_id: e1, element2_id: e2, name, description, effect }),
      });
      closeModal(overlay);
      toast('Reação cadastrada!', 'success');
      await load();
    } catch (err) {
      toast(err.message, 'error');
      btn.disabled = false;
      btn.textContent = 'Cadastrar';
    }
  };
}

// ---------------------------------------------------------------- edição / exclusão
function openEditModal(id) {
  const r = reactions.find((x) => x.id === id);
  if (!r) return;
  const overlay = openModal(`
    <h3><span class="rune">&#x16DF;</span> ${esc(r.element1.name)} + ${esc(r.element2.name)}</h3>
    <img src="${esc(thumbUrl(r.image, 200))}" alt="${esc(r.name)}" style="width:120px;height:120px;display:block;margin:0 auto 14px">
    <div class="field">
      <label class="field-label">Nome da reação</label>
      <input type="text" id="rx-name" maxlength="60" value="${esc(r.name)}">
    </div>
    <div class="field">
      <label class="field-label">Descrição</label>
      <textarea id="rx-description" maxlength="500" rows="3">${esc(r.description || '')}</textarea>
    </div>
    <div class="field">
      <label class="field-label">Efeito in-game</label>
      <textarea id="rx-effect" maxlength="500" rows="3">${esc(r.effect || '')}</textarea>
    </div>
    <div class="modal-actions">
      <button class="btn danger" data-delete>Excluir</button>
      <button class="btn" data-close>Cancelar</button>
      <button class="btn primary" data-save>Salvar</button>
    </div>`);
  overlay.querySelector('[data-close]').onclick = () => closeModal(overlay);
  overlay.querySelector('[data-save]').onclick = async () => {
    const name = overlay.querySelector('#rx-name').value.trim();
    const description = overlay.querySelector('#rx-description').value.trim();
    const effect = overlay.querySelector('#rx-effect').value.trim();
    if (!name) { toast('Informe o nome da reação.', 'error'); return; }
    try {
      await api(`/api/reactions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, effect }),
      });
      closeModal(overlay);
      toast('Reação atualizada!', 'success');
      await load();
    } catch (err) { toast(err.message, 'error'); }
  };
  overlay.querySelector('[data-delete]').onclick = async () => {
    try {
      await api(`/api/reactions/${id}`, { method: 'DELETE' });
      closeModal(overlay);
      toast('Reação excluída.', 'success');
      await load();
    } catch (err) { toast(err.message, 'error'); }
  };
}

load().catch((e) => toast(e.message, 'error'));
