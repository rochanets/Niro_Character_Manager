/* Módulo Trilhas — trilha sonora do slideshow.
   Upload em lote (clique ou arrastar-e-soltar), vínculo automático por nome de
   arquivo e lixeira de 30 dias, igual aos personagens. */

let tracks = [];
let params = {};
let trashOpen = false;

const SCOPE_LABEL = { element: 'Elemento', region: 'Região', geral: 'Geral' };

async function load() {
  [tracks, params] = await Promise.all([api('/api/tracks'), api('/api/params')]);
  render();
}

function refOptions(scope, current) {
  if (scope === 'geral') return '';
  const lista = [...new Set((params[scope] || []).map((p) => p.name))];
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

function render() {
  const area = document.getElementById('tracks-area');
  if (!tracks.length) {
    area.innerHTML = `<div class="empty-state glass"><span class="rune">&#x16DE;</span>
      Nenhuma faixa cadastrada ainda. Arraste os arquivos para o campo acima.</div>`;
    return;
  }

  // agrupa por vínculo: cada elemento/região vira um container, e o que não
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

  area.innerHTML = chaves.map((chave) => `
    <div class="group-container glass">
      <h3>${esc(chave)} <span class="count">(${grupos.get(chave).length})</span></h3>
      <div class="track-list">${grupos.get(chave).map(trackRow).join('')}</div>
    </div>`).join('');
}

async function salvar(id, dados) {
  const t = tracks.find((x) => x.id === id);
  const atualizado = await api(`/api/tracks/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: t.name, scope: t.scope, ref_name: t.ref_name, credit: t.credit, ...dados }),
  });
  Object.assign(t, atualizado);
  render();
}

// ---------------------------------------------------------------- upload em lote
async function enviar(arquivos) {
  const lista = [...arquivos].filter((f) => f.type.startsWith('audio/') || /\.(mp3|m4a|aac|ogg|oga|wav|flac)$/i.test(f.name));
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
    await load();
  } catch (e) {
    toast(e.message, 'error');
  } finally {
    barra.classList.remove('active');
    barra.querySelector('.bar').style.width = '0%';
    rotulo.style.display = 'none';
  }
}

const zona = document.getElementById('drop-zone');
const input = document.getElementById('file-input');

zona.addEventListener('click', () => input.click());
document.getElementById('pick-files').addEventListener('click', () => input.click());
input.addEventListener('change', () => { if (input.files.length) enviar(input.files); input.value = ''; });

['dragover', 'dragenter'].forEach((ev) =>
  zona.addEventListener(ev, (e) => { e.preventDefault(); zona.classList.add('dragover'); }));
['dragleave', 'drop'].forEach((ev) =>
  zona.addEventListener(ev, (e) => { e.preventDefault(); zona.classList.remove('dragover'); }));
zona.addEventListener('drop', (e) => {
  if (e.dataTransfer.files.length) enviar(e.dataTransfer.files);
});

// ---------------------------------------------------------------- ações da lista
document.getElementById('tracks-area').addEventListener('change', (e) => {
  const linha = e.target.closest('.track-row');
  if (!linha) return;
  const id = +linha.dataset.id;
  if (e.target.classList.contains('tk-scope')) {
    const scope = e.target.value;
    salvar(id, { scope, ref_name: scope === 'geral' ? '' : '' }).catch((err) => toast(err.message, 'error'));
  } else if (e.target.classList.contains('tk-ref')) {
    salvar(id, { ref_name: e.target.value }).catch((err) => toast(err.message, 'error'));
  }
});

document.getElementById('tracks-area').addEventListener('click', async (e) => {
  const botao = e.target.closest('.tk-del');
  if (!botao) return;
  const linha = botao.closest('.track-row');
  const id = +linha.dataset.id;
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
    render();
    if (trashOpen) renderTrash();
    toast('Faixa movida para a lixeira.', 'success');
  } catch (err) {
    toast(err.message, 'error');
  }
});

// ---------------------------------------------------------------- lixeira
async function renderTrash() {
  const area = document.getElementById('trash-area');
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

document.getElementById('toggle-trash').addEventListener('click', async function () {
  trashOpen = !trashOpen;
  const area = document.getElementById('trash-area');
  area.hidden = !trashOpen;
  this.classList.toggle('primary', trashOpen);
  if (trashOpen) await renderTrash().catch((e) => toast(e.message, 'error'));
});

document.getElementById('trash-area').addEventListener('click', async (e) => {
  const linha = e.target.closest('.track-row');
  if (!linha) return;
  const id = +linha.dataset.id;
  try {
    if (e.target.closest('.tk-restore')) {
      await api(`/api/tracks/${id}/restore`, { method: 'POST' });
      toast('Faixa restaurada.', 'success');
      await load();
      await renderTrash();
    } else if (e.target.closest('.tk-purge')) {
      const ok = await confirmDialog({
        title: 'Excluir definitivamente',
        message: 'O arquivo será apagado do servidor. Esta ação não pode ser desfeita.',
        confirmLabel: 'Excluir para sempre',
        danger: true,
      });
      if (!ok) return;
      await api(`/api/tracks/${id}/permanent`, { method: 'DELETE' });
      toast('Faixa excluída definitivamente.', 'success');
      await renderTrash();
    }
  } catch (err) {
    toast(err.message, 'error');
  }
});

load().catch((e) => toast(e.message, 'error'));
