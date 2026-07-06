/* Módulo Times: cadastro e exibição de times de 4 personagens.
   O bloco do nome usa um gradiente com as cores dominantes das imagens
   dos elementos dos membros (slots "?" são ignorados). */

const GRADIENT_MODES = 5;
const GRADIENT_TITLES = [
  'esquerda → direita',
  'direita → esquerda',
  'diagonal',
  'radial (central)',
  'cônico',
];

let teams = null;
let allChars = null;

async function load() {
  [teams, allChars] = await Promise.all([api('/api/teams'), api('/api/characters')]);
  render();
}

function usedCharIds() {
  const used = new Set();
  teams.forEach((t) => t.members.forEach((m) => { if (m) used.add(m.id); }));
  return used;
}

// ---------------------------------------------------------------- cor dos elementos
const _colorCache = new Map();

function imageColor(url) {
  if (_colorCache.has(url)) return _colorCache.get(url);
  const promise = new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const size = 24;
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = size;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, size, size);
      let data;
      try { data = ctx.getImageData(0, 0, size, size).data; } catch (_) { return resolve(null); }
      let r = 0, g = 0, b = 0, n = 0;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] < 60) continue;                       // ignora transparência
        const R = data[i], G = data[i + 1], B = data[i + 2];
        const w = 1 + (Math.max(R, G, B) - Math.min(R, G, B)) / 24;  // pixels vivos pesam mais
        r += R * w; g += G * w; b += B * w; n += w;
      }
      resolve(n ? [r / n, g / n, b / n] : null);
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
  _colorCache.set(url, promise);
  return promise;
}

function vivid([r, g, b]) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  const l = (max + min) / 2;
  let h = 0;
  let s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  if (d > 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  s = Math.min(1, s * 1.35 + 0.1);
  const L = Math.min(0.55, Math.max(0.34, l));
  return `hsl(${h.toFixed(0)} ${(s * 100).toFixed(0)}% ${(L * 100).toFixed(0)}% / 0.85)`;
}

function gradientCss(colors, mode) {
  if (!colors.length) {
    colors = ['rgba(90, 215, 232, 0.22)', 'rgba(167, 139, 250, 0.22)'];
  } else if (colors.length === 1) {
    colors = [colors[0], colors[0]];
  }
  const stops = colors.join(', ');
  switch (mode % GRADIENT_MODES) {
    case 0: return `linear-gradient(90deg, ${stops})`;
    case 1: return `linear-gradient(270deg, ${stops})`;
    case 2: return `linear-gradient(150deg, ${stops})`;
    case 3: return `radial-gradient(circle at 50% 50%, ${stops})`;
    default: return `conic-gradient(from 90deg at 50% 50%, ${stops}, ${colors[0]})`;
  }
}

async function applyGradient(team, headEl) {
  if (!headEl) return;
  const urls = team.members
    .filter((m) => m && m.element_image)
    .map((m) => `/static/${m.element_image}`);
  const colors = (await Promise.all(urls.map(imageColor))).filter(Boolean).map(vivid);
  headEl.style.background = gradientCss(colors, team.gradient_mode);
}

// ---------------------------------------------------------------- exibição
function memberHtml(team, m) {
  if (!m) {
    return `
      <div class="team-member">
        <div class="tm-card mystery">?</div>
        <div class="tm-name">???</div>
      </div>`;
  }
  const elem = m.element_image
    ? `<img class="tm-elem" src="/static/${esc(m.element_image)}" alt="${esc(m.element_name)}" title="${esc(m.element_name)}">`
    : '<span class="tm-elem"></span>';
  return `
    <div class="team-member">
      <div class="tm-card r${m.rarity}">
        <img src="/static/${esc(m.card_promo)}" alt="${esc(m.name)}" loading="lazy">
        <button class="tm-remove" data-team="${team.id}" data-char="${m.id}" title="Remover do time">&#x2715;</button>
      </div>
      <div class="tm-name" title="${esc(m.name)}">${esc(m.name)}</div>
      ${elem}
    </div>`;
}

function teamHtml(t) {
  const nextTitle = GRADIENT_TITLES[(t.gradient_mode + 1) % GRADIENT_MODES];
  return `
    <div class="team-card glass">
      <div class="team-head" data-team="${t.id}">
        <span class="team-name">${esc(t.name)}</span>
        <div class="team-head-actions">
          <button class="icon-btn" data-grad="${t.id}" title="Mudar gradiente (próximo: ${nextTitle})">&#x25D1;</button>
          <button class="icon-btn" data-edit="${t.id}" title="Editar time">&#x270E;</button>
          <button class="icon-btn danger" data-delete="${t.id}" title="Excluir time">&#x2715;</button>
        </div>
      </div>
      <div class="team-members">
        ${t.members.map((m) => memberHtml(t, m)).join('')}
      </div>
    </div>`;
}

function render() {
  const root = document.getElementById('team-grid');
  if (!teams.length) {
    root.innerHTML = `<div class="empty-state glass" style="grid-column:1/-1"><span class="rune">&#x16DF;</span>
      Nenhum time cadastrado ainda.<br><br>
      <button class="btn primary" onclick="document.getElementById('new-team-btn').click()">+ Cadastrar o primeiro</button></div>`;
    return;
  }
  root.innerHTML = teams.map(teamHtml).join('');

  teams.forEach((t) => applyGradient(t, root.querySelector(`.team-head[data-team="${t.id}"]`)));

  root.querySelectorAll('[data-grad]').forEach((btn) =>
    btn.addEventListener('click', () => cycleGradient(+btn.dataset.grad)));
  root.querySelectorAll('[data-edit]').forEach((btn) =>
    btn.addEventListener('click', () => openTeamModal(teams.find((t) => t.id === +btn.dataset.edit))));
  root.querySelectorAll('[data-delete]').forEach((btn) =>
    btn.addEventListener('click', () => deleteTeam(+btn.dataset.delete)));
  root.querySelectorAll('.tm-remove').forEach((btn) =>
    btn.addEventListener('click', async () => {
      try {
        await api(`/api/teams/${btn.dataset.team}/members/${btn.dataset.char}`, { method: 'DELETE' });
        toast('Personagem removido do time.', 'success');
        await load();
      } catch (err) { toast(err.message, 'error'); }
    }));
}

async function cycleGradient(teamId) {
  const team = teams.find((t) => t.id === teamId);
  team.gradient_mode = (team.gradient_mode + 1) % GRADIENT_MODES;
  const head = document.querySelector(`.team-head[data-team="${teamId}"]`);
  applyGradient(team, head);
  const btn = head.querySelector('[data-grad]');
  btn.title = `Mudar gradiente (próximo: ${GRADIENT_TITLES[(team.gradient_mode + 1) % GRADIENT_MODES]})`;
  try {
    await api(`/api/teams/${teamId}/gradient`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: team.gradient_mode }),
    });
  } catch (err) { toast(err.message, 'error'); }
}

function deleteTeam(teamId) {
  const team = teams.find((t) => t.id === teamId);
  const overlay = openModal(`
    <h3><span class="rune">&#x16DA;</span> Excluir time "${esc(team.name)}"</h3>
    <p style="color:var(--ink-2)">Os personagens não serão excluídos e voltarão a ficar disponíveis para outros times.</p>
    <div class="modal-actions">
      <button class="btn" data-close>Cancelar</button>
      <button class="btn danger" data-confirm>Excluir</button>
    </div>`);
  overlay.querySelector('[data-close]').onclick = () => closeModal(overlay);
  overlay.querySelector('[data-confirm]').onclick = async () => {
    try {
      await api(`/api/teams/${teamId}`, { method: 'DELETE' });
      closeModal(overlay);
      await load();
    } catch (err) { toast(err.message, 'error'); }
  };
}

// ---------------------------------------------------------------- cadastro / edição
async function openTeamModal(editTeam) {
  const isEdit = !!editTeam;
  const used = usedCharIds();
  if (isEdit) editTeam.members.forEach((m) => { if (m) used.delete(m.id); });
  const available = allChars.filter((c) => !used.has(c.id));
  const byId = new Map(available.map((c) => [c.id, c]));
  const params = await api('/api/params');
  // null = slot vazio, 'q' = "?", número = id do personagem
  const sel = isEdit ? editTeam.members.map((m) => (m ? m.id : 'q')) : [null, null, null, null];
  if (isEdit) sel.forEach((v, i) => { if (v !== 'q' && !byId.has(v)) byId.set(v, editTeam.members[i]); });

  const selectHtml = (id, label, items) => `
    <select id="${id}"><option value="">${label}: todos</option>
      ${items.map((i) => `<option value="${esc(i.name)}">${esc(i.name)}</option>`).join('')}
    </select>`;

  const overlay = openModal(`
    <h3><span class="rune">&#x16DF;</span> ${isEdit ? 'Editar' : 'Cadastrar'} Time</h3>
    <div class="field">
      <label class="field-label">Nome do time</label>
      <input type="text" id="tm-name" maxlength="60" placeholder="Ex.: Vanguarda de Niro" value="${isEdit ? esc(editTeam.name) : ''}">
    </div>
    <label class="field-label">Escalação — arraste um personagem até um slot, ou clique num slot preenchido para esvaziá-lo</label>
    <div class="team-slots" id="tm-slots"></div>
    <label class="field-label">Personagens disponíveis</label>
    <div class="pick-filters">
      <input type="text" id="tm-search" placeholder="Buscar nome...">
      ${selectHtml('tm-region', 'Região', params.region)}
      ${selectHtml('tm-affiliation', 'Afiliação', params.affiliation)}
      ${selectHtml('tm-element', 'Elemento', params.element)}
      ${selectHtml('tm-weapon', 'Arma', params.weapon)}
      ${selectHtml('tm-role1', 'Role 1', params.role)}
      ${selectHtml('tm-role2', 'Role 2', params.role)}
    </div>
    <div class="pick-grid" id="tm-grid"></div>
    <div class="modal-actions">
      <button class="btn" data-close>Cancelar</button>
      <button class="btn primary" data-save>${isEdit ? 'Salvar' : 'Cadastrar'}</button>
    </div>`, { wide: true });

  const slotsEl = overlay.querySelector('#tm-slots');
  const gridEl = overlay.querySelector('#tm-grid');
  const searchEl = overlay.querySelector('#tm-search');
  const dimFilterEls = {
    region: overlay.querySelector('#tm-region'),
    affiliation: overlay.querySelector('#tm-affiliation'),
    element: overlay.querySelector('#tm-element'),
    weapon: overlay.querySelector('#tm-weapon'),
  };
  const role1El = overlay.querySelector('#tm-role1');
  const role2El = overlay.querySelector('#tm-role2');

  function assign(idx, value) {
    sel[idx] = value;
    renderSlots();
    renderGrid();
  }

  function renderSlots() {
    slotsEl.innerHTML = sel.map((v, i) => {
      if (v === null) return `<div class="team-slot empty" data-slot="${i}"><span>+</span></div>`;
      if (v === 'q') return `<div class="team-slot mystery" data-slot="${i}" draggable="true" title="Clique para esvaziar, ou arraste para trocar de slot">?</div>`;
      const c = byId.get(v);
      return `
        <div class="team-slot" data-slot="${i}" draggable="true" title="Clique para esvaziar, ou arraste para trocar de slot">
          <img src="/static/${esc(c.card_promo)}" alt="${esc(c.name)}">
          <div class="ts-name">${esc(c.name)}</div>
        </div>`;
    }).join('');

    slotsEl.querySelectorAll('.team-slot:not(.empty)').forEach((slot) => {
      slot.addEventListener('click', () => { sel[+slot.dataset.slot] = null; renderSlots(); renderGrid(); });
      slot.addEventListener('dragstart', (e) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', JSON.stringify({ from: 'slot', index: +slot.dataset.slot }));
      });
    });

    slotsEl.querySelectorAll('.team-slot').forEach((slot) => {
      slot.addEventListener('dragover', (e) => { e.preventDefault(); slot.classList.add('drag-over'); });
      slot.addEventListener('dragleave', () => slot.classList.remove('drag-over'));
      slot.addEventListener('drop', (e) => {
        e.preventDefault();
        slot.classList.remove('drag-over');
        let payload;
        try { payload = JSON.parse(e.dataTransfer.getData('text/plain')); } catch (_) { return; }
        const idx = +slot.dataset.slot;
        if (payload.from === 'pick') {
          assign(idx, payload.value);
        } else if (payload.from === 'slot' && payload.index !== idx) {
          const tmp = sel[idx];
          sel[idx] = sel[payload.index];
          sel[payload.index] = tmp;
          renderSlots();
          renderGrid();
        }
      });
    });
  }

  function pick(value) {
    const empty = sel.indexOf(null);
    if (empty === -1) { toast('Os 4 slots já estão preenchidos.', 'error'); return; }
    assign(empty, value);
  }

  function renderGrid() {
    const term = searchEl.value.trim().toLowerCase();
    const role1 = role1El.value;
    const role2 = role2El.value;
    const chars = available.filter((c) => {
      if (sel.includes(c.id)) return false;
      if (term && !c.name.toLowerCase().includes(term)) return false;
      if (role1 && c.role1 !== role1) return false;
      if (role2 && c.role2 !== role2) return false;
      for (const [dim, el] of Object.entries(dimFilterEls)) {
        if (el.value && (c[dim].name || '') !== el.value) return false;
      }
      return true;
    });

    const mysteryCard = `
      <div class="pick-card pick-mystery" data-mystery draggable="true" title="Slot desconhecido">
        <div class="pm-block">?</div>
        <div class="pk-name">?</div>
      </div>`;
    const charCards = chars.map((c) => `
      <div class="pick-card" data-char="${c.id}" draggable="true" title="${esc(c.name)}">
        <img src="/static/${esc(c.card_promo)}" alt="" loading="lazy">
        <span class="pk-star stars-${c.rarity}">${c.rarity}★</span>
        <div class="pk-name">${esc(c.name)}</div>
      </div>`).join('');

    gridEl.innerHTML = mysteryCard + (charCards ||
      '<div class="empty-state" style="grid-column:2/-1;padding:30px">Nenhum personagem encontrado.</div>');

    gridEl.querySelector('[data-mystery]').addEventListener('click', () => pick('q'));
    gridEl.querySelectorAll('[data-char]').forEach((card) =>
      card.addEventListener('click', () => pick(+card.dataset.char)));

    gridEl.querySelectorAll('.pick-card').forEach((card) => {
      card.addEventListener('dragstart', (e) => {
        e.dataTransfer.effectAllowed = 'copy';
        const value = card.dataset.mystery !== undefined ? 'q' : +card.dataset.char;
        e.dataTransfer.setData('text/plain', JSON.stringify({ from: 'pick', value }));
      });
    });
  }

  searchEl.addEventListener('input', renderGrid);
  Object.values(dimFilterEls).forEach((el) => el.addEventListener('change', renderGrid));
  role1El.addEventListener('change', renderGrid);
  role2El.addEventListener('change', renderGrid);
  renderSlots();
  renderGrid();

  overlay.querySelector('[data-close]').onclick = () => closeModal(overlay);
  overlay.querySelector('[data-save]').onclick = async () => {
    const name = overlay.querySelector('#tm-name').value.trim();
    if (!name) { toast('Informe o nome do time.', 'error'); return; }
    if (sel.includes(null)) { toast('Preencha os 4 slots do time (use "?" se necessário).', 'error'); return; }
    try {
      await api(isEdit ? `/api/teams/${editTeam.id}` : '/api/teams', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, members: sel.map((v) => (v === 'q' ? null : v)) }),
      });
      closeModal(overlay);
      toast(isEdit ? 'Time atualizado!' : 'Time cadastrado!', 'success');
      await load();
    } catch (err) { toast(err.message, 'error'); }
  };
}

document.getElementById('new-team-btn').addEventListener('click', () => openTeamModal());

load().catch((e) => toast(e.message, 'error'));
