/* Módulo Banners: grade versão × subversão, cadastro e montagem dos banners */

let bannerData = null;   // { versions, banners, limits }
let allChars = null;

async function load() {
  bannerData = await api('/api/banners');
  render();
}

function bannerCharHtml(banner, c) {
  return `
    <div class="banner-char r${c.rarity}" title="${esc(c.name)} (${c.rarity}★)">
      <img src="${esc(thumbUrl(c.card_promo, 220))}" alt="${esc(c.name)}">
      <div class="bc-name">${esc(c.name)}</div>
      <button class="bc-remove" data-banner="${banner.id}" data-char="${c.id}" title="Remover do banner">&#x2715;</button>
    </div>`;
}

function render() {
  const board = document.getElementById('banner-board');
  const { versions, banners } = bannerData;
  if (!banners.length) {
    board.innerHTML = `<div class="empty-state glass"><span class="rune">&#x16B1;</span>
      Nenhum banner cadastrado ainda.<br><br>
      <button class="btn primary" onclick="document.getElementById('new-banner-btn').click()">+ Cadastrar o primeiro</button></div>`;
    return;
  }

  const majors = [...new Set(banners.map((b) => b.major))].sort((a, b) => a - b);
  const minors = [...new Set(banners.map((b) => b.minor))].sort((a, b) => a - b);
  const byCell = {};
  banners.forEach((b) => { byCell[`${b.major}.${b.minor}`] = b; });

  let html = '<table class="banner-table"><thead><tr><th></th>';
  for (const major of majors) {
    html += `<th><div class="ver-head glass">
        <span class="ver-num">${major}.x</span>
        <span class="ver-name">${esc(versions[major] || '')}</span>
        <button class="icon-btn" data-rename="${major}" title="Renomear versão">&#x270E;</button>
      </div></th>`;
  }
  html += '</tr></thead><tbody>';

  for (const minor of minors) {
    html += `<tr><td class="minor-label">x.${minor}</td>`;
    for (const major of majors) {
      const banner = byCell[`${major}.${minor}`];
      if (!banner) {
        html += '<td class="banner-cell empty-cell">—</td>';
        continue;
      }
      const five = banner.characters.filter((c) => c.rarity === 5);
      const four = banner.characters.filter((c) => c.rarity === 4);
      html += `
        <td class="banner-cell glass">
          <div class="banner-box">
            <div class="bb-head">
              <span class="banner-type ${banner.type}">${BANNER_TYPE_LABEL[banner.type]} &middot; ${major}.${minor}</span>
              <button class="icon-btn danger" data-delete="${banner.id}" title="Excluir banner">&#x2715;</button>
            </div>
            <div class="banner-chars">
              ${five.map((c) => bannerCharHtml(banner, c)).join('')}
              ${four.map((c) => bannerCharHtml(banner, c)).join('')}
              <button class="banner-add-btn" data-add="${banner.id}" title="Adicionar personagem">+</button>
            </div>
          </div>
        </td>`;
    }
    html += '</tr>';
  }
  html += '</tbody></table>';
  board.innerHTML = html;

  board.querySelectorAll('[data-rename]').forEach((btn) =>
    btn.addEventListener('click', () => renameVersion(+btn.dataset.rename)));
  board.querySelectorAll('[data-delete]').forEach((btn) =>
    btn.addEventListener('click', () => deleteBanner(+btn.dataset.delete)));
  board.querySelectorAll('[data-add]').forEach((btn) =>
    btn.addEventListener('click', () => openPicker(+btn.dataset.add)));
  board.querySelectorAll('.bc-remove').forEach((btn) =>
    btn.addEventListener('click', async () => {
      try {
        await api(`/api/banners/${btn.dataset.banner}/characters/${btn.dataset.char}`, { method: 'DELETE' });
        await load();
      } catch (err) { toast(err.message, 'error'); }
    }));
}

// ---------------------------------------------------------------- cadastro
document.getElementById('new-banner-btn').addEventListener('click', () => {
  const majorOptions = Array.from({ length: 8 }, (_, i) => i + 1)
    .map((m) => `<option value="${m}">${m}.x${bannerData.versions[m] ? ` — ${esc(bannerData.versions[m])}` : ''}</option>`).join('');
  const minorOptions = Array.from({ length: 9 }, (_, i) => i)
    .map((m) => `<option value="${m}">.${m}</option>`).join('');

  const overlay = openModal(`
    <h3><span class="rune">&#x16B1;</span> Cadastrar Banner</h3>
    <div class="form-grid">
      <div class="field">
        <label class="field-label">Versão</label>
        <select id="nb-major">${majorOptions}</select>
      </div>
      <div class="field">
        <label class="field-label">Subversão</label>
        <select id="nb-minor">${minorOptions}</select>
      </div>
    </div>
    <div class="field" id="nb-name-field">
      <label class="field-label">Nome da versão</label>
      <input type="text" id="nb-name" maxlength="80" placeholder="Ex.: O Despertar das Runas">
    </div>
    <div class="field">
      <label class="field-label">Tipo de banner</label>
      <select id="nb-type">
        <option value="unitario">Unitário — 1 personagem 5★ + 3 personagens 4★</option>
        <option value="duplo">Duplo — 2 personagens 5★ + 3 personagens 4★</option>
        <option value="especial">Especial — até 10 personagens 5★ + 5 personagens 4★</option>
      </select>
    </div>
    <div class="modal-actions">
      <button class="btn" data-close>Cancelar</button>
      <button class="btn primary" data-save>Cadastrar</button>
    </div>`);

  const majorSel = overlay.querySelector('#nb-major');
  const nameField = overlay.querySelector('#nb-name-field');
  const nameInput = overlay.querySelector('#nb-name');
  function syncName() {
    const existing = bannerData.versions[+majorSel.value];
    nameField.style.display = existing ? 'none' : 'block';
    if (existing) nameInput.value = '';
  }
  majorSel.addEventListener('change', syncName);
  syncName();

  overlay.querySelector('[data-close]').onclick = () => closeModal(overlay);
  overlay.querySelector('[data-save]').onclick = async () => {
    try {
      await api('/api/banners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          major: +majorSel.value,
          minor: +overlay.querySelector('#nb-minor').value,
          type: overlay.querySelector('#nb-type').value,
          version_name: nameInput.value.trim(),
        }),
      });
      closeModal(overlay);
      toast('Banner cadastrado! Use o botão + para adicionar personagens.', 'success');
      await load();
    } catch (err) { toast(err.message, 'error'); }
  };
});

async function renameVersion(major) {
  const current = bannerData.versions[major] || '';
  const overlay = openModal(`
    <h3><span class="rune">&#x16B9;</span> Nome da versão ${major}.x</h3>
    <div class="field"><input type="text" id="rv-name" maxlength="80" value="${esc(current)}"></div>
    <div class="modal-actions">
      <button class="btn" data-close>Cancelar</button>
      <button class="btn primary" data-save>Salvar</button>
    </div>`);
  overlay.querySelector('[data-close]').onclick = () => closeModal(overlay);
  overlay.querySelector('[data-save]').onclick = async () => {
    try {
      await api(`/api/versions/${major}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: overlay.querySelector('#rv-name').value.trim() }),
      });
      closeModal(overlay);
      await load();
    } catch (err) { toast(err.message, 'error'); }
  };
}

function deleteBanner(bannerId) {
  const banner = bannerData.banners.find((b) => b.id === bannerId);
  const overlay = openModal(`
    <h3><span class="rune">&#x16DA;</span> Excluir banner ${banner.major}.${banner.minor}</h3>
    <p style="color:var(--ink-2)">Os personagens não serão excluídos, apenas o banner.</p>
    <div class="modal-actions">
      <button class="btn" data-close>Cancelar</button>
      <button class="btn danger" data-confirm>Excluir</button>
    </div>`);
  overlay.querySelector('[data-close]').onclick = () => closeModal(overlay);
  overlay.querySelector('[data-confirm]').onclick = async () => {
    try {
      await api(`/api/banners/${bannerId}`, { method: 'DELETE' });
      closeModal(overlay);
      await load();
    } catch (err) { toast(err.message, 'error'); }
  };
}

// ---------------------------------------------------------------- modal de seleção
async function openPicker(bannerId) {
  if (!allChars) allChars = await api('/api/characters');
  const banner = bannerData.banners.find((b) => b.id === bannerId);
  const params = await api('/api/params');

  const selectHtml = (id, label, items) => `
    <select id="${id}"><option value="">${label}: todos</option>
      ${items.map((i) => `<option value="${esc(i.name)}">${esc(i.name)}</option>`).join('')}
    </select>`;

  const overlay = openModal(`
    <h3><span class="rune">&#x16A9;</span> Adicionar ao banner ${banner.major}.${banner.minor}
      <span style="font-size:12px;color:var(--ink-3);font-weight:400">(${BANNER_TYPE_LABEL[banner.type]})</span>
    </h3>
    <div class="pick-filters">
      <input type="text" id="pk-search" placeholder="Buscar nome...">
      ${selectHtml('pk-region', 'Região', params.region)}
      ${selectHtml('pk-affiliation', 'Afiliação', params.affiliation)}
      ${selectHtml('pk-element', 'Elemento', params.element)}
      ${selectHtml('pk-weapon', 'Arma', params.weapon)}
      <select id="pk-rarity"><option value="">Raridade: todas</option>
        <option value="5">5 Estrelas</option><option value="4">4 Estrelas</option>
      </select>
    </div>
    <div class="pick-grid" id="pk-grid"></div>`, { wide: true });

  const grid = overlay.querySelector('#pk-grid');

  function slotsLeft(rarity) {
    const inBanner = bannerData.banners.find((b) => b.id === bannerId).characters
      .filter((c) => c.rarity === rarity).length;
    return bannerData.limits[banner.type][rarity] - inBanner;
  }

  function renderGrid() {
    const term = overlay.querySelector('#pk-search').value.trim().toLowerCase();
    const filters = {
      region: overlay.querySelector('#pk-region').value,
      affiliation: overlay.querySelector('#pk-affiliation').value,
      element: overlay.querySelector('#pk-element').value,
      weapon: overlay.querySelector('#pk-weapon').value,
    };
    const rarity = overlay.querySelector('#pk-rarity').value;
    const inBannerIds = new Set(
      bannerData.banners.find((b) => b.id === bannerId).characters.map((c) => c.id));

    const chars = allChars.filter((c) => {
      if (term && !c.name.toLowerCase().includes(term)) return false;
      if (rarity && String(c.rarity) !== rarity) return false;
      for (const [dim, val] of Object.entries(filters)) {
        if (val && (c[dim].name || '') !== val) return false;
      }
      return true;
    });

    if (!chars.length) {
      grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1;padding:30px">Nenhum personagem encontrado.</div>';
      return;
    }
    grid.innerHTML = chars.map((c) => {
      const already = inBannerIds.has(c.id);
      const full = slotsLeft(c.rarity) <= 0;
      const disabled = already || full;
      const reason = already ? 'Já está no banner' : full ? `Limite de ${c.rarity}★ atingido` : '';
      return `
        <div class="pick-card ${disabled ? 'disabled' : ''}" data-char="${c.id}" title="${reason || esc(c.name)}">
          <img src="${esc(thumbUrl(c.card_promo, 260))}" alt="" loading="lazy">
          <span class="pk-star stars-${c.rarity}">${c.rarity}★</span>
          <div class="pk-name">${esc(c.name)}</div>
        </div>`;
    }).join('');

    grid.querySelectorAll('.pick-card:not(.disabled)').forEach((card) =>
      card.addEventListener('click', async () => {
        try {
          await api(`/api/banners/${bannerId}/characters`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ character_id: +card.dataset.char }),
          });
          await load();
          renderGrid();
        } catch (err) { toast(err.message, 'error'); }
      }));
  }

  overlay.querySelectorAll('select, input').forEach((el) =>
    el.addEventListener('input', renderGrid));
  renderGrid();
}

load().catch((e) => toast(e.message, 'error'));
