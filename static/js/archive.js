/* Módulo Arquivo: personagens excluídos, restauração e exclusão definitiva */

async function load() {
  const items = await api('/api/archive');
  const area = document.getElementById('archive-area');
  if (!items.length) {
    area.innerHTML = `<div class="empty-state glass"><span class="rune">&#x16BB;</span>
      O arquivo está vazio. Personagens excluídos aparecem aqui por 30 dias.</div>`;
    return;
  }
  area.innerHTML = items.map((c) => `
    <div class="archive-item glass">
      <img src="${esc(thumbUrl(c.card_promo, 128))}" alt="">
      <div class="ai-info">
        <strong>${esc(c.name)}</strong> ${starsHtml(c.rarity)}
        <div class="ai-days ${c.days_left <= 5 ? 'warn' : ''}">
          ${c.days_left > 0
            ? `Exclusão definitiva em ${c.days_left} dia${c.days_left === 1 ? '' : 's'}`
            : 'Será excluído definitivamente em breve'}
        </div>
      </div>
      <button class="btn small primary" data-restore="${c.id}">Restaurar</button>
      <button class="btn small danger" data-purge="${c.id}" data-name="${esc(c.name)}">Excluir agora</button>
    </div>`).join('');

  area.querySelectorAll('[data-restore]').forEach((btn) =>
    btn.addEventListener('click', async () => {
      try {
        await api(`/api/characters/${btn.dataset.restore}/restore`, { method: 'POST' });
        toast('Personagem restaurado!', 'success');
        await load();
      } catch (err) { toast(err.message, 'error'); }
    }));

  area.querySelectorAll('[data-purge]').forEach((btn) =>
    btn.addEventListener('click', () => {
      const overlay = openModal(`
        <h3><span class="rune">&#x16DA;</span> Excluir definitivamente</h3>
        <p style="color:var(--ink-2);line-height:1.6">
          <b>${btn.dataset.name}</b> e suas imagens serão excluídos <b>permanentemente</b>.
          Essa ação não pode ser desfeita.
        </p>
        <div class="modal-actions">
          <button class="btn" data-close>Cancelar</button>
          <button class="btn danger" data-confirm>Excluir definitivamente</button>
        </div>`);
      overlay.querySelector('[data-close]').onclick = () => closeModal(overlay);
      overlay.querySelector('[data-confirm]').onclick = async () => {
        try {
          await api(`/api/characters/${btn.dataset.purge}/permanent`, { method: 'DELETE' });
          closeModal(overlay);
          toast('Personagem excluído definitivamente.', 'success');
          await load();
        } catch (err) { toast(err.message, 'error'); }
      };
    }));
}

load().catch((e) => toast(e.message, 'error'));
