/* Cadastro/edição de personagem: imagens, contadores, IA em streaming */

const form = document.getElementById('char-form');
const charId = form.dataset.charId;

const fullEl = document.getElementById('ii-card-full');
const promoEl = document.getElementById('ii-card-promo');
const iiFull = createImageInput(fullEl, { existingUrl: fullEl.dataset.existing || null });
const iiPromo = createImageInput(promoEl, { existingUrl: promoEl.dataset.existing || null });

// contadores de caracteres
document.querySelectorAll('.char-count').forEach((counter) => {
  const input = document.getElementById(counter.dataset.for);
  const update = () => { counter.textContent = `${input.value.length} / ${input.maxLength}`; };
  input.addEventListener('input', update);
  update();
});

// ---------------------------------------------------------------- coleta de dados
function collectData() {
  const data = {};
  ['name', 'age', 'height', 'dom', 'normal_attack', 'skill1', 'skill2',
   'ultimate', 'personality', 'profession', 'lore', 'role1', 'role2'].forEach((f) => {
    data[f] = form.elements[f].value.trim();
  });
  ['region', 'affiliation', 'element', 'weapon'].forEach((f) => {
    const select = form.elements[`${f}_id`];
    data[`${f}_id`] = select.value;
    data[f] = select.selectedIndex > 0 ? select.options[select.selectedIndex].text : '';
  });
  const rar = form.elements.rarity.value;
  data.rarity = rar ? (rar === '5' ? '5 estrelas' : '4 estrelas') : '';
  data._rarity_raw = rar;
  return data;
}

// ---------------------------------------------------------------- IA (streaming)
document.querySelectorAll('.ai-btn').forEach((btn) => {
  btn.addEventListener('click', async () => {
    const field = btn.dataset.field;
    const textarea = document.getElementById(`f-${field}`);
    const progress = document.querySelector(`.ai-progress[data-for="${field}"]`);
    const bar = progress.querySelector('.bar');
    const expected = Math.max(300, (TEXT_LIMITS[field] || 500) * 0.55);

    // O que o usuário digitou no campo vira a base principal para a IA
    const draft = textarea.value.trim();

    btn.disabled = true;
    btn.classList.add('loading');
    progress.classList.add('active');
    bar.style.width = '3%';
    textarea.value = '';

    try {
      const resp = await fetch('/api/ai_fill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field, draft, data: collectData() }),
      });
      if (!resp.ok) {
        const body = await resp.json().catch(() => null);
        throw new Error((body && body.error) || `Erro ${resp.status}`);
      }
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let received = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        received += decoder.decode(value, { stream: true });
        textarea.value = received.slice(0, textarea.maxLength);
        textarea.dispatchEvent(new Event('input'));
        bar.style.width = `${Math.min(95, (received.length / expected) * 100)}%`;
        textarea.scrollTop = textarea.scrollHeight;
      }
      if (received.trim().startsWith('ERRO:')) {
        textarea.value = '';
        textarea.dispatchEvent(new Event('input'));
        throw new Error(received.trim());
      }
      bar.style.width = '100%';
      toast('Campo preenchido pela IA ✦', 'success');
    } catch (err) {
      toast(err.message, 'error');
      bar.style.width = '0%';
    } finally {
      btn.disabled = false;
      btn.classList.remove('loading');
      setTimeout(() => { progress.classList.remove('active'); bar.style.width = '0%'; }, 900);
    }
  });
});

// ---------------------------------------------------------------- importação de planilha
const importBtn = document.getElementById('import-sheet-btn');
const sheetInput = document.createElement('input');
sheetInput.type = 'file';
sheetInput.accept = '.xlsx,.csv';
sheetInput.style.display = 'none';
document.body.appendChild(sheetInput);

importBtn.addEventListener('click', () => sheetInput.click());
sheetInput.addEventListener('change', async () => {
  const file = sheetInput.files[0];
  sheetInput.value = '';
  if (!file) return;
  importBtn.disabled = true;
  try {
    const fd = new FormData();
    fd.append('sheet', file);
    const res = await api('/api/import_sheet', { method: 'POST', body: fd });
    const rows = res.rows || [];
    if (rows.length === 1) applySheetRow(rows[0]);
    else pickSheetRow(rows);
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    importBtn.disabled = false;
  }
});

function pickSheetRow(rows) {
  const overlay = openModal(`
    <h3><span class="rune">&#x16B9;</span> Importar da planilha</h3>
    <p style="color:var(--ink-2);margin-bottom:14px">
      A planilha tem <b>${rows.length}</b> personagens. Escolha qual usar para preencher o formulário:
    </p>
    <div class="sheet-pick">
      ${rows.map((r, i) => `<button type="button" class="btn" data-row="${i}">${esc(r.name)}</button>`).join('')}
    </div>`);
  overlay.querySelectorAll('[data-row]').forEach((b) => {
    b.onclick = () => { applySheetRow(rows[+b.dataset.row]); closeModal(overlay); };
  });
}

function selectByText(select, text) {
  const target = String(text).trim().toLowerCase();
  const opt = [...select.options].find((o) => o.text.trim().toLowerCase() === target);
  if (opt) { select.value = opt.value; return true; }
  return false;
}

function applySheetRow(row) {
  let filled = 0;
  const skipped = [];

  ['name', 'age', 'height', 'dom', 'normal_attack', 'skill1', 'skill2',
   'ultimate', 'personality', 'profession', 'lore'].forEach((f) => {
    if (row[f] === undefined) return;
    const el = form.elements[f];
    el.value = el.maxLength > 0 ? row[f].slice(0, el.maxLength) : row[f];
    el.dispatchEvent(new Event('input'));
    filled++;
  });

  // dropboxes: só preenche se o valor bater 100% com uma opção existente
  [['region', 'region_id', 'Região'], ['affiliation', 'affiliation_id', 'Afiliação'],
   ['element', 'element_id', 'Elemento'], ['weapon', 'weapon_id', 'Arma']].forEach(([f, sel, label]) => {
    if (row[f] === undefined) return;
    if (selectByText(form.elements[sel], row[f])) filled++;
    else skipped.push(`${label} "${row[f]}"`);
  });

  ['role1', 'role2'].forEach((f, i) => {
    if (row[f] === undefined) return;
    if (selectByText(form.elements[f], row[f])) filled++;
    else skipped.push(`Role ${i + 1} "${row[f]}"`);
  });

  if (row.rarity === '4' || row.rarity === '5') {
    form.elements.rarity.value = row.rarity;
    filled++;
  } else if (row.rarity !== undefined) {
    skipped.push(`Raridade "${row.rarity}"`);
  }

  toast(`Planilha importada: ${filled} campo${filled === 1 ? '' : 's'} preenchido${filled === 1 ? '' : 's'}.`, 'success');
  if (skipped.length) {
    toast(`Sem correspondência exata nas opções (não preenchidos): ${skipped.join(', ')}`, 'error');
  }
}

// ---------------------------------------------------------------- submit
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = collectData();

  if (!data.name) return toast('Informe o nome do personagem.', 'error');
  if (!data._rarity_raw) return toast('Escolha a raridade.', 'error');
  if (!charId && (!iiFull.file || !iiPromo.file)) {
    return toast('Envie o card completo e o card promo.', 'error');
  }

  const fd = new FormData();
  ['name', 'age', 'height', 'dom', 'normal_attack', 'skill1', 'skill2',
   'ultimate', 'personality', 'profession', 'lore', 'role1', 'role2'].forEach((f) => fd.append(f, data[f]));
  ['region_id', 'affiliation_id', 'element_id', 'weapon_id'].forEach((f) => fd.append(f, data[f]));
  fd.append('rarity', data._rarity_raw);
  if (iiFull.file) fd.append('card_full', iiFull.file);
  if (iiPromo.file) fd.append('card_promo', iiPromo.file);

  const btn = document.getElementById('submit-btn');
  btn.disabled = true;
  try {
    if (charId) {
      await api(`/api/characters/${charId}`, { method: 'PUT', body: fd });
      toast('Personagem atualizado!', 'success');
      setTimeout(() => { window.location.href = `/chars/${charId}`; }, 600);
    } else {
      const res = await api('/api/characters', { method: 'POST', body: fd });
      toast('Personagem cadastrado!', 'success');
      setTimeout(() => { window.location.href = `/chars/${res.id}`; }, 600);
    }
  } catch (err) {
    toast(err.message, 'error');
    btn.disabled = false;
  }
});
