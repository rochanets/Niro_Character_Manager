/* Módulo Banners: grade versão × subversão, cadastro e montagem dos banners */

let bannerData = null;   // { versions, banners, limits }
let allChars = null;

async function load() {
  bannerData = await api('/api/banners');
  render();
}

const versionSeq = (major, minor) => major * 9 + minor;

// especiais não têm metade própria: valem pela versão x.y inteira
const halfLabelText = (half) => (half === 1 ? '1ª metade' : half === 2 ? '2ª metade' : 'versão toda');

// quantas vezes o personagem já apareceu em banners até (e incluindo) a versão-alvo
function appearanceCount(charId, targetSeq) {
  return bannerData.banners.filter((b) =>
    versionSeq(b.major, b.minor) <= targetSeq && b.characters.some((c) => c.id === charId)).length;
}

// ---------------------------------------------------------------- popover de histórico por raridade (hover no picker)
let histPopover = null;

function ensureHistPopover() {
  if (!histPopover) {
    histPopover = document.createElement('div');
    histPopover.className = 'banner-hist-popover';
    // ao entrar no próprio popover, mantém aberto; só fecha quando o cursor sair dele
    histPopover.addEventListener('mouseenter', () => clearTimeout(histHideTimer));
    histPopover.addEventListener('mouseleave', hideRarityHistoryPopover);
    document.body.appendChild(histPopover);
  }
  return histPopover;
}

let histShowTimer = null;
let histHideTimer = null;

function hideRarityHistoryPopoverNow() {
  if (histPopover) histPopover.style.display = 'none';
}

// esconde imediatamente e cancela qualquer exibição/ocultação agendada
function hideRarityHistoryPopover() {
  clearTimeout(histShowTimer);
  clearTimeout(histHideTimer);
  hideRarityHistoryPopoverNow();
}

// agenda o fechamento em breve, dando tempo do cursor entrar no próprio popover
function scheduleHideRarityHistoryPopover() {
  clearTimeout(histShowTimer);
  clearTimeout(histHideTimer);
  histHideTimer = setTimeout(hideRarityHistoryPopoverNow, 150);
}

// linha do tempo de versões (major.minor) que têm ao menos um banner com personagens;
// a contagem de "tempo sem aparecer" é por versão, não por metade (1ª/2ª metade da
// mesma versão contam como o mesmo ponto da linha do tempo)
function versionTimeline(targetMajor, targetMinor) {
  const targetKey = versionSeq(targetMajor, targetMinor);
  const versions = [...new Set(
    bannerData.banners.filter((b) => b.characters.length > 0).map((b) => versionSeq(b.major, b.minor)),
  )].sort((a, b) => a - b);
  const currentIdx = versions.filter((v) => v < targetKey).length;
  // último banner (qualquer metade) em que cada personagem apareceu, até a versão alvo
  const lastIdx = {};
  const lastBanner = {};
  bannerData.banners.forEach((b) => {
    const seq = versionSeq(b.major, b.minor);
    if (seq > targetKey || !b.characters.length) return;
    const idx = versions.indexOf(seq);
    b.characters.forEach((c) => {
      if (lastIdx[c.id] === undefined || idx > lastIdx[c.id]) { lastIdx[c.id] = idx; lastBanner[c.id] = b; }
    });
  });
  return { currentIdx, lastIdx, lastBanner };
}

// histórico de aparições dos personagens da mesma raridade, até a versão alvo
function rarityHistoryRows(rarity, targetMajor, targetMinor) {
  const { currentIdx, lastIdx, lastBanner } = versionTimeline(targetMajor, targetMinor);
  const rows = allChars.filter((c) => c.rarity === rarity).map((c) => {
    const last = lastIdx[c.id];
    const gap = last === undefined ? currentIdx + 1 : currentIdx - last;
    const b = lastBanner[c.id] || null;
    return {
      id: c.id, name: c.name, rarity: c.rarity,
      gap, last_banner: b ? `${b.major}.${b.minor} (${halfLabelText(b.half)})` : null,
    };
  });
  rows.sort((a, b) => b.gap - a.gap || a.name.localeCompare(b.name));
  return rows;
}

// mapa charId -> quantidade de versões publicadas desde a última aparição do
// personagem até a versão alvo; usado para ordenar quem está há mais tempo sem
// aparecer primeiro nas listas de seleção
function appearanceGapMap(targetMajor, targetMinor) {
  const { currentIdx, lastIdx } = versionTimeline(targetMajor, targetMinor);
  const gaps = {};
  allChars.forEach((c) => {
    const last = lastIdx[c.id];
    gaps[c.id] = last === undefined ? currentIdx + 1 : currentIdx - last;
  });
  return gaps;
}

function showRarityHistoryPopover(anchorEl, charId, rarity, targetMajor, targetMinor, targetHalf) {
  const pop = ensureHistPopover();
  const rows = rarityHistoryRows(rarity, targetMajor, targetMinor);
  const maxGap = Math.max(1, ...rows.map((r) => r.gap));
  const halfLabel = targetHalf === 1 ? '1ª' : '2ª';
  pop.innerHTML = `
    <div class="hp-title">Aparições em banners &middot; ${rarity}★ &middot; até ${targetMajor}.${targetMinor} (${halfLabel})</div>
    <div class="hp-rows">
      ${rows.map((r) => `
        <div class="hp-row r${r.rarity} ${r.id === charId ? 'hp-current' : ''}" title="${r.gap === 0 ? 'está no banner atual' : r.last_banner ? `última aparição no banner ${esc(r.last_banner)}` : 'nunca apareceu em um banner'}">
          <span class="hp-name">${esc(r.name)}</span>
          <span class="hp-track"><span class="hp-fill" style="width:${maxGap ? (r.gap / maxGap) * 100 : 0}%${r.gap === 0 ? ';display:none' : ''}"></span></span>
          <span class="hp-value">${r.gap}</span>
        </div>`).join('')}
    </div>`;
  pop.style.display = 'block';
  const rect = anchorEl.getBoundingClientRect();
  const popRect = pop.getBoundingClientRect();
  let left = rect.right + 12;
  if (left + popRect.width > window.innerWidth - 10) left = rect.left - popRect.width - 12;
  if (left < 10) left = 10;
  let top = rect.top;
  if (top + popRect.height > window.innerHeight - 10) top = window.innerHeight - popRect.height - 10;
  if (top < 10) top = 10;
  pop.style.left = `${left}px`;
  pop.style.top = `${top}px`;
}

const HIST_HOVER_DELAY_MS = 2000;

// liga o hover de histórico por raridade a todas as pick-cards de uma grade;
// o popover só abre depois do cursor parado sobre o personagem por 2s
function attachRarityHistoryHover(grid, getTargetVersion) {
  grid.querySelectorAll('.pick-card').forEach((card) => {
    const rarity = +card.dataset.rarity;
    const charId = +card.dataset.char;
    card.addEventListener('mouseenter', () => {
      clearTimeout(histShowTimer);
      clearTimeout(histHideTimer);
      const target = getTargetVersion();
      histShowTimer = setTimeout(() => {
        showRarityHistoryPopover(card, charId, rarity, target.major, target.minor, target.half);
      }, HIST_HOVER_DELAY_MS);
    });
    card.addEventListener('mouseleave', scheduleHideRarityHistoryPopover);
  });
}

document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hideRarityHistoryPopover(); });

// true quando o banner já atingiu o limite total de personagens do seu tipo
// (raridades com limite ilimitado — ex.: 4★ em banners especiais — nunca ficam cheias)
function isBannerFull(banner) {
  const limits = bannerData.limits[banner.type];
  if (limits[5] == null || limits[4] == null) return false;
  const maxTotal = limits[5] + limits[4];
  return banner.characters.length >= maxTotal;
}

// menor versão (major.minor) em que o personagem aparece em algum banner —
// usado para saber se ESTE banner é a estreia dele (primeira vez que aparece)
function firstAppearanceSeq(charId) {
  let min;
  bannerData.banners.forEach((b) => {
    if (!b.characters.some((c) => c.id === charId)) return;
    const seq = versionSeq(b.major, b.minor);
    if (min === undefined || seq < min) min = seq;
  });
  return min;
}

function isFirstAppearance(banner, charId) {
  return firstAppearanceSeq(charId) === versionSeq(banner.major, banner.minor);
}

function bannerCharHtml(banner, c) {
  const first = isFirstAppearance(banner, c.id);
  return `
    <div class="banner-char r${c.rarity} ${first ? 'bc-first' : ''}" title="${esc(c.name)} (${c.rarity}★)${first ? ' — estreia em banner' : ''}">
      <img src="${esc(thumbUrl(c.card_promo, 220))}" alt="${esc(c.name)}">
      <div class="bc-name">${esc(c.name)}</div>
      <button class="bc-remove" data-banner="${banner.id}" data-char="${c.id}" title="Remover do banner">&#x2715;</button>
    </div>`;
}

// banners especiais têm 4★ ilimitado: em vez de cartas de imagem, lista os
// nomes em bullet points de 3 colunas numa subseção "4 estrelas:"
function bannerFourStarListHtml(banner, four) {
  return `
    <div class="banner-four-list">
      <div class="b4-title">4 estrelas:</div>
      <ul class="b4-columns">
        ${four.map((c) => {
          const first = isFirstAppearance(banner, c.id);
          return `
          <li class="${first ? 'bc-first' : ''}">
            <span class="b4-name" title="${esc(c.name)}${first ? ' — estreia em banner' : ''}">${esc(c.name)}</span>
            <button class="bc-remove b4-remove" data-banner="${banner.id}" data-char="${c.id}" title="Remover do banner">&#x2715;</button>
          </li>`;
        }).join('')}
      </ul>
    </div>`;
}

// monta a área de personagens de um banner; especiais mostram 4★ como lista de
// nomes (ilimitado), os demais tipos mostram cartas de imagem para as 2 raridades
function charsSectionHtml(banner, { withAddBtn }) {
  const five = banner.characters.filter((c) => c.rarity === 5);
  const four = banner.characters.filter((c) => c.rarity === 4);
  const addBtn = withAddBtn && !isBannerFull(banner)
    ? `<button class="banner-add-btn" data-add="${banner.id}" title="Adicionar personagem">+</button>` : '';
  if (banner.type === 'especial') {
    return `
      <div class="banner-chars">
        ${five.map((c) => bannerCharHtml(banner, c)).join('')}
        ${addBtn}
      </div>
      ${four.length ? bannerFourStarListHtml(banner, four) : ''}`;
  }
  return `
    <div class="banner-chars">
      ${five.map((c) => bannerCharHtml(banner, c)).join('')}
      ${four.map((c) => bannerCharHtml(banner, c)).join('')}
      ${addBtn}
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
  banners.forEach((b) => { if (b.half) byCell[`${b.major}.${b.minor}.${b.half}`] = b; });

  function halfBoxHtml(major, minor, half) {
    const banner = byCell[`${major}.${minor}.${half}`];
    const halfLabel = half === 1 ? '1ª metade' : '2ª metade';
    if (!banner) {
      return `
        <div class="banner-half empty-half">
          <span class="half-label">${halfLabel}</span>
          <button class="half-add-btn" data-add-half="${major}.${minor}.${half}" title="Cadastrar banner (${halfLabel})">+</button>
        </div>`;
    }
    return `
      <div class="banner-half">
        <div class="banner-box">
          <div class="bb-head">
            <span class="banner-type ${banner.type}">${BANNER_TYPE_LABEL[banner.type]} &middot; ${major}.${minor} &middot; ${halfLabel}</span>
            <div class="icon-btn-group">
              <button class="icon-btn" data-edit-banner="${banner.id}" title="Editar banner">&#x270E;</button>
              <button class="icon-btn danger" data-delete="${banner.id}" title="Excluir banner">&#x2715;</button>
            </div>
          </div>
          ${charsSectionHtml(banner, { withAddBtn: true })}
        </div>
      </div>`;
  }

  // banners especiais valem pela versão x.y inteira (não presos a uma metade) e
  // podem coexistir com as 2 metades já ocupadas
  function specialsForCell(major, minor) {
    return banners.filter((b) => b.major === major && b.minor === minor && b.type === 'especial');
  }

  function specialBoxHtml(banner) {
    return `
      <div class="banner-special">
        <div class="banner-box">
          <div class="bb-head">
            <span class="banner-type especial">${BANNER_TYPE_LABEL.especial} &middot; ${banner.major}.${banner.minor} &middot; versão toda</span>
            <div class="icon-btn-group">
              <button class="icon-btn" data-edit-banner="${banner.id}" title="Editar banner">&#x270E;</button>
              <button class="icon-btn danger" data-delete="${banner.id}" title="Excluir banner">&#x2715;</button>
            </div>
          </div>
          ${charsSectionHtml(banner, { withAddBtn: true })}
        </div>
      </div>`;
  }

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
      const specials = specialsForCell(major, minor);
      html += `
        <td class="banner-cell glass">
          ${halfBoxHtml(major, minor, 1)}
          ${halfBoxHtml(major, minor, 2)}
          ${specials.map((b) => specialBoxHtml(b)).join('')}
          <button class="special-add-btn" data-add-special="${major}.${minor}"
            title="Cadastrar banner especial (vale pela versão ${major}.${minor} inteira)">+ Especial</button>
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
  board.querySelectorAll('[data-edit-banner]').forEach((btn) =>
    btn.addEventListener('click', () =>
      openNewBannerModal(null, bannerData.banners.find((b) => b.id === +btn.dataset.editBanner))));
  board.querySelectorAll('[data-add]').forEach((btn) =>
    btn.addEventListener('click', () => openPicker(+btn.dataset.add)));
  board.querySelectorAll('[data-add-half]').forEach((btn) =>
    btn.addEventListener('click', () => {
      const [major, minor, half] = btn.dataset.addHalf.split('.').map(Number);
      openNewBannerModal({ major, minor, half });
    }));
  board.querySelectorAll('[data-add-special]').forEach((btn) =>
    btn.addEventListener('click', () => {
      const [major, minor] = btn.dataset.addSpecial.split('.').map(Number);
      openNewBannerModal({ major, minor, half: null, type: 'especial' });
    }));
  board.querySelectorAll('.bc-remove').forEach((btn) =>
    btn.addEventListener('click', async () => {
      try {
        await api(`/api/banners/${btn.dataset.banner}/characters/${btn.dataset.char}`, { method: 'DELETE' });
        await load();
      } catch (err) { toast(err.message, 'error'); }
    }));
}

// ---------------------------------------------------------------- cadastro / edição
async function openNewBannerModal(prefill, editBanner) {
  const isEdit = !!editBanner;
  const base = editBanner || prefill;
  if (isEdit && !allChars) allChars = await api('/api/characters');
  const editParams = isEdit ? await api('/api/params') : null;
  const majorOptions = Array.from({ length: 8 }, (_, i) => i + 1)
    .map((m) => `<option value="${m}" ${base && base.major === m ? 'selected' : ''}>${m}.x${bannerData.versions[m] ? ` — ${esc(bannerData.versions[m])}` : ''}</option>`).join('');
  const minorOptions = Array.from({ length: 9 }, (_, i) => i)
    .map((m) => `<option value="${m}" ${base && base.minor === m ? 'selected' : ''}>.${m}</option>`).join('');
  const halfOptions = [1, 2]
    .map((h) => `<option value="${h}" ${base && base.half === h ? 'selected' : ''}>${h === 1 ? '1ª metade (dias 1–25)' : '2ª metade (dias 26–50)'}</option>`).join('');
  const typeOptions = [
    ['unitario', 'Unitário — 1 personagem 5★ + 3 personagens 4★'],
    ['duplo', 'Duplo — 2 personagens 5★ + 3 personagens 4★'],
    ['especial', 'Especial — até 10 personagens 5★ + 4★ ilimitado (vale pela versão inteira)'],
  ].map(([v, label]) => `<option value="${v}" ${base && base.type === v ? 'selected' : ''}>${label}</option>`).join('');

  const selectHtml = (id, label, items) => `
    <select id="${id}"><option value="">${label}: todos</option>
      ${items.map((i) => `<option value="${esc(i.name)}">${esc(i.name)}</option>`).join('')}
    </select>`;

  const overlay = openModal(`
    <h3><span class="rune">&#x16B1;</span> ${isEdit ? 'Editar' : 'Cadastrar'} Banner</h3>
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
    <div class="field" id="nb-half-field">
      <label class="field-label">Metade da versão</label>
      <select id="nb-half">${halfOptions}</select>
    </div>
    <div class="field" id="nb-name-field">
      <label class="field-label">Nome da versão</label>
      <input type="text" id="nb-name" maxlength="80" placeholder="Ex.: O Despertar das Runas">
    </div>
    <div class="field">
      <label class="field-label">Tipo de banner</label>
      <select id="nb-type">${typeOptions}</select>
    </div>
    <div class="modal-actions">
      <button class="btn" data-close>Cancelar</button>
      <button class="btn primary" data-save>${isEdit ? 'Salvar' : 'Cadastrar'}</button>
    </div>
    ${isEdit ? `
    <label class="field-label" style="margin-top:20px">Personagens no banner</label>
    <div id="nb-chars"></div>
    <label class="field-label" style="margin-top:18px">Adicionar personagem</label>
    <div class="pick-filters">
      <input type="text" id="nb-pk-search" placeholder="Buscar nome...">
      ${selectHtml('nb-pk-region', 'Região', editParams.region)}
      ${selectHtml('nb-pk-affiliation', 'Afiliação', editParams.affiliation)}
      ${selectHtml('nb-pk-element', 'Elemento', editParams.element)}
      ${selectHtml('nb-pk-weapon', 'Arma', editParams.weapon)}
      <select id="nb-pk-rarity"><option value="">Raridade: todas</option>
        <option value="5">5 Estrelas</option><option value="4">4 Estrelas</option>
      </select>
      <button type="button" class="btn small" id="nb-pk-sort" title="Ordenar por quem está há mais tempo sem aparecer em banners">&#x21C5; Mais tempo sem aparecer</button>
    </div>
    <div class="pick-grid" id="nb-pk-grid"></div>
    ` : ''}`, { wide: isEdit });

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

  // banners especiais não são presos a uma metade (valem pela versão toda)
  const typeSel = overlay.querySelector('#nb-type');
  const halfField = overlay.querySelector('#nb-half-field');
  function syncType() {
    halfField.style.display = typeSel.value === 'especial' ? 'none' : 'block';
  }
  typeSel.addEventListener('change', syncType);
  syncType();

  overlay.querySelector('[data-close]').onclick = () => closeModal(overlay);
  overlay.querySelector('[data-save]').onclick = async () => {
    try {
      const btype = typeSel.value;
      await api(isEdit ? `/api/banners/${editBanner.id}` : '/api/banners', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          major: +majorSel.value,
          minor: +overlay.querySelector('#nb-minor').value,
          half: btype === 'especial' ? null : +overlay.querySelector('#nb-half').value,
          type: btype,
          version_name: nameInput.value.trim(),
        }),
      });
      closeModal(overlay);
      toast(isEdit ? 'Banner atualizado!' : 'Banner cadastrado! Use o botão + para adicionar personagens.', 'success');
      await load();
    } catch (err) { toast(err.message, 'error'); }
  };

  if (isEdit) initEditBannerChars(overlay, editBanner.id);
}

// ---------------------------------------------------------------- edição de personagens dentro do modal de banner
function initEditBannerChars(overlay, bannerId) {
  const charsEl = overlay.querySelector('#nb-chars');
  const grid = overlay.querySelector('#nb-pk-grid');
  let sortByWait = false;
  const sortBtn = overlay.querySelector('#nb-pk-sort');
  sortBtn.addEventListener('click', () => {
    sortByWait = !sortByWait;
    sortBtn.classList.toggle('primary', sortByWait);
    renderGrid();
  });

  function currentBanner() {
    return bannerData.banners.find((b) => b.id === bannerId);
  }

  function slotsLeft(rarity) {
    const banner = currentBanner();
    const limit = bannerData.limits[banner.type][rarity];
    if (limit == null) return Infinity;
    const inBanner = banner.characters.filter((c) => c.rarity === rarity).length;
    return limit - inBanner;
  }

  function versionConflict(charId) {
    const banner = currentBanner();
    const targetSeq = versionSeq(banner.major, banner.minor);
    for (const b of bannerData.banners) {
      if (!b.characters.some((c) => c.id === charId)) continue;
      const seq = versionSeq(b.major, b.minor);
      if (seq === targetSeq && b.id !== bannerId) return `Já está na versão ${b.major}.${b.minor}`;
      if (Math.abs(seq - targetSeq) === 1) return `Apareceu na versão ${b.major}.${b.minor} (precisa de 1 versão de intervalo)`;
    }
    return '';
  }

  function renderChars() {
    const banner = currentBanner();
    charsEl.innerHTML = banner.characters.length
      ? charsSectionHtml(banner, { withAddBtn: false })
      : '<div class="empty-state" style="padding:14px">Nenhum personagem neste banner ainda.</div>';
    charsEl.querySelectorAll('.bc-remove').forEach((btn) =>
      btn.addEventListener('click', async () => {
        try {
          await api(`/api/banners/${bannerId}/characters/${btn.dataset.char}`, { method: 'DELETE' });
          await load();
          renderChars();
          renderGrid();
        } catch (err) { toast(err.message, 'error'); }
      }));
  }

  function renderGrid() {
    const term = overlay.querySelector('#nb-pk-search').value.trim().toLowerCase();
    const filters = {
      region: overlay.querySelector('#nb-pk-region').value,
      affiliation: overlay.querySelector('#nb-pk-affiliation').value,
      element: overlay.querySelector('#nb-pk-element').value,
      weapon: overlay.querySelector('#nb-pk-weapon').value,
    };
    const rarity = overlay.querySelector('#nb-pk-rarity').value;
    const inBannerIds = new Set(currentBanner().characters.map((c) => c.id));

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
    const banner = currentBanner();
    const targetSeq = versionSeq(banner.major, banner.minor);
    if (sortByWait) {
      const gaps = appearanceGapMap(banner.major, banner.minor);
      chars.sort((a, b) => gaps[b.id] - gaps[a.id] || a.name.localeCompare(b.name));
    }
    grid.innerHTML = chars.map((c) => {
      const already = inBannerIds.has(c.id);
      const full = slotsLeft(c.rarity) <= 0;
      const conflict = !already && !full ? versionConflict(c.id) : '';
      const disabled = already || full || !!conflict;
      const reason = already ? 'Já está no banner' : full ? `Limite de ${c.rarity}★ atingido` : conflict;
      const count = appearanceCount(c.id, targetSeq);
      return `
        <div class="pick-card ${disabled ? 'disabled' : ''}" data-char="${c.id}" data-rarity="${c.rarity}" title="${reason || esc(c.name)}">
          <img src="${esc(thumbUrl(c.card_promo, 260))}" alt="" loading="lazy">
          <span class="pk-star stars-${c.rarity}">${c.rarity}★</span>
          <span class="pk-count" title="Vezes que apareceu em banners até ${banner.major}.${banner.minor}">${count}×</span>
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
          renderChars();
          renderGrid();
        } catch (err) { toast(err.message, 'error'); }
      }));
    // banners especiais não têm metade própria (valem pela versão toda); usa a
    // 2ª metade como referência para incluir toda a versão no cálculo do histórico
    attachRarityHistoryHover(grid, () => {
      const b = currentBanner();
      return { major: b.major, minor: b.minor, half: b.half || 2 };
    });
  }

  overlay.querySelectorAll('#nb-pk-search, #nb-pk-region, #nb-pk-affiliation, #nb-pk-element, #nb-pk-weapon, #nb-pk-rarity')
    .forEach((el) => el.addEventListener('input', renderGrid));
  overlay.addEventListener('mousedown', hideRarityHistoryPopover);
  renderChars();
  renderGrid();
}

document.getElementById('new-banner-btn').addEventListener('click', () => openNewBannerModal());

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
    <h3><span class="rune">&#x16DA;</span> Excluir banner ${banner.major}.${banner.minor} (${halfLabelText(banner.half)})</h3>
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
    <h3><span class="rune">&#x16A9;</span> Adicionar ao banner ${banner.major}.${banner.minor} (${halfLabelText(banner.half)})
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
      <button type="button" class="btn small" id="pk-sort" title="Ordenar por quem está há mais tempo sem aparecer em banners">&#x21C5; Mais tempo sem aparecer</button>
    </div>
    <div class="pick-grid" id="pk-grid"></div>`, { wide: true });

  const grid = overlay.querySelector('#pk-grid');
  const targetSeq = versionSeq(banner.major, banner.minor);
  let sortByWait = false;
  const sortBtn = overlay.querySelector('#pk-sort');
  sortBtn.addEventListener('click', () => {
    sortByWait = !sortByWait;
    sortBtn.classList.toggle('primary', sortByWait);
    renderGrid();
  });

  function slotsLeft(rarity) {
    const limit = bannerData.limits[banner.type][rarity];
    if (limit == null) return Infinity;
    const inBanner = bannerData.banners.find((b) => b.id === bannerId).characters
      .filter((c) => c.rarity === rarity).length;
    return limit - inBanner;
  }

  // versão(s) em que o personagem já apareceu, para bloquear repetição na mesma
  // versão (outra metade) ou em versões adjacentes (precisa de 1 versão de intervalo)
  function versionConflict(charId) {
    for (const b of bannerData.banners) {
      if (!b.characters.some((c) => c.id === charId)) continue;
      const seq = versionSeq(b.major, b.minor);
      if (seq === targetSeq && b.id !== bannerId) return `Já está na versão ${b.major}.${b.minor}`;
      if (Math.abs(seq - targetSeq) === 1) return `Apareceu na versão ${b.major}.${b.minor} (precisa de 1 versão de intervalo)`;
    }
    return '';
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
    if (sortByWait) {
      const gaps = appearanceGapMap(banner.major, banner.minor);
      chars.sort((a, b) => gaps[b.id] - gaps[a.id] || a.name.localeCompare(b.name));
    }
    grid.innerHTML = chars.map((c) => {
      const already = inBannerIds.has(c.id);
      const full = slotsLeft(c.rarity) <= 0;
      const conflict = !already && !full ? versionConflict(c.id) : '';
      const disabled = already || full || !!conflict;
      const reason = already ? 'Já está no banner' : full ? `Limite de ${c.rarity}★ atingido` : conflict;
      const count = appearanceCount(c.id, targetSeq);
      return `
        <div class="pick-card ${disabled ? 'disabled' : ''}" data-char="${c.id}" data-rarity="${c.rarity}" title="${reason || esc(c.name)}">
          <img src="${esc(thumbUrl(c.card_promo, 260))}" alt="" loading="lazy">
          <span class="pk-star stars-${c.rarity}">${c.rarity}★</span>
          <span class="pk-count" title="Vezes que apareceu em banners até ${banner.major}.${banner.minor}">${count}×</span>
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
    attachRarityHistoryHover(grid, () => ({ major: banner.major, minor: banner.minor, half: banner.half || 2 }));
  }

  overlay.querySelectorAll('select, input').forEach((el) =>
    el.addEventListener('input', renderGrid));
  overlay.addEventListener('mousedown', hideRarityHistoryPopover);
  renderGrid();
}

// quando o board não cabe na tela, a página toda ganha rolagem horizontal
// nativa (barra de rolagem, Shift+roda do mouse ou gesto de trackpad); sem
// hijack de wheel aqui para não travar a rolagem vertical normal da página

load().catch((e) => toast(e.message, 'error'));
