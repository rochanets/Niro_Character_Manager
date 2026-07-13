/* Módulo Logs: histórico de ações do sistema (criações, edições, exclusões, erros). */

const PAGE_SIZE = 50;
const LEVEL_LABEL = { info: 'Info', success: 'Sucesso', warning: 'Aviso', error: 'Erro' };

let offset = 0;
let lastTotal = 0;
let knownActions = [];

function currentFilters() {
  return {
    level: document.getElementById('logs-level').value,
    q: document.getElementById('logs-search').value.trim(),
  };
}

function fmtDate(iso) {
  // "YYYY-MM-DD HH:MM:SS" (UTC, como salvo pelo SQLite datetime('now')) -> local, pt-BR
  const d = new Date(iso.replace(' ', 'T') + 'Z');
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'medium' });
}

function rowHtml(log) {
  return `
    <div class="log-row log-${log.level}">
      <span class="log-level">${esc(LEVEL_LABEL[log.level] || log.level)}</span>
      <span class="log-action">${esc(log.action)}</span>
      <span class="log-message">${esc(log.message)}</span>
      <span class="log-time">${esc(fmtDate(log.created_at))}</span>
    </div>`;
}

function renderActionOptions() {
  const sel = document.getElementById('logs-action');
  const current = sel.value;
  sel.innerHTML = '<option value="">Ação: todas</option>' +
    knownActions.map((a) => `<option value="${esc(a)}">${esc(a)}</option>`).join('');
  if (knownActions.includes(current)) sel.value = current;
}

function renderPagination() {
  const root = document.getElementById('logs-pagination');
  const totalPages = Math.max(1, Math.ceil(lastTotal / PAGE_SIZE));
  const page = Math.floor(offset / PAGE_SIZE) + 1;
  root.innerHTML = `
    <button class="btn" id="logs-prev" ${page <= 1 ? 'disabled' : ''}>&larr; Anterior</button>
    <span style="color:var(--ink-2);font-size:13px;padding:0 4px">Página ${page} de ${totalPages} &middot; ${lastTotal} registro(s)</span>
    <button class="btn" id="logs-next" ${page >= totalPages ? 'disabled' : ''}>Próxima &rarr;</button>`;
  const prev = document.getElementById('logs-prev');
  const next = document.getElementById('logs-next');
  if (prev) prev.addEventListener('click', () => { offset = Math.max(0, offset - PAGE_SIZE); load(); });
  if (next) next.addEventListener('click', () => { offset += PAGE_SIZE; load(); });
}

async function load() {
  const { level, q } = currentFilters();
  const params = new URLSearchParams({ limit: PAGE_SIZE, offset });
  if (level) params.set('level', level);
  const action = document.getElementById('logs-action').value;
  if (action) params.set('action', action);
  if (q) params.set('q', q);

  const data = await api(`/api/logs?${params.toString()}`);
  lastTotal = data.total;
  knownActions = data.actions;
  renderActionOptions();

  const list = document.getElementById('logs-list');
  if (!data.items.length) {
    list.innerHTML = `<div class="empty-state glass"><span class="rune">&#x16DE;</span>Nenhum log encontrado.</div>`;
  } else {
    list.innerHTML = `<div class="log-table">${data.items.map(rowHtml).join('')}</div>`;
  }
  renderPagination();
}

function reload() { offset = 0; load().catch((e) => toast(e.message, 'error')); }

document.getElementById('logs-refresh-btn').addEventListener('click', reload);
document.getElementById('logs-search').addEventListener('input', () => {
  clearTimeout(window._logsSearchDebounce);
  window._logsSearchDebounce = setTimeout(reload, 300);
});
document.getElementById('logs-level').addEventListener('change', reload);
document.getElementById('logs-action').addEventListener('change', reload);

document.getElementById('logs-clear-btn').addEventListener('click', () => {
  const overlay = openModal(`
    <h3><span class="rune">&#x16DA;</span> Limpar logs</h3>
    <p style="color:var(--ink-2);line-height:1.6">Isso vai apagar <b>todo o histórico de logs</b>. Essa ação não pode ser desfeita.</p>
    <div class="modal-actions">
      <button class="btn" data-close>Cancelar</button>
      <button class="btn danger" data-confirm>Limpar tudo</button>
    </div>`);
  overlay.querySelector('[data-close]').onclick = () => closeModal(overlay);
  overlay.querySelector('[data-confirm]').onclick = async () => {
    try {
      await api('/api/logs', { method: 'DELETE' });
      closeModal(overlay);
      toast('Logs apagados.', 'success');
      reload();
    } catch (err) { toast(err.message, 'error'); }
  };
});

reload();
