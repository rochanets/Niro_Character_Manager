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
   'ultimate', 'personality', 'profession', 'lore'].forEach((f) => {
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

    btn.disabled = true;
    btn.classList.add('loading');
    progress.classList.add('active');
    bar.style.width = '3%';
    textarea.value = '';

    try {
      const resp = await fetch('/api/ai_fill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field, data: collectData() }),
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
   'ultimate', 'personality', 'profession', 'lore'].forEach((f) => fd.append(f, data[f]));
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
