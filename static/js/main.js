/* Utilidades compartilhadas — Niro Character Manager */

// ---------------------------------------------------------------- fetch
async function api(url, options = {}) {
  const resp = await fetch(url, options);
  let body = null;
  try { body = await resp.json(); } catch (_) { /* respostas sem json */ }
  if (!resp.ok) {
    const err = new Error((body && body.error) || `Erro ${resp.status}`);
    err.status = resp.status;
    err.body = body;
    throw err;
  }
  return body;
}

function esc(text) {
  const div = document.createElement('div');
  div.textContent = text == null ? '' : String(text);
  return div.innerHTML;
}

// ---------------------------------------------------------------- toast
function toast(message, type = '') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  document.getElementById('toast-root').appendChild(el);
  setTimeout(() => {
    el.style.transition = 'opacity 0.4s ease';
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 400);
  }, 3600);
}

// ---------------------------------------------------------------- modal
function openModal(html, { wide = false, picker = false } = {}) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `<div class="modal ${wide ? 'wide' : ''} ${picker ? 'picker' : ''}">${html}</div>`;
  overlay.addEventListener('mousedown', (e) => {
    if (e.target === overlay) overlay.remove();
  });
  const onEsc = (e) => {
    if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', onEsc); }
  };
  document.addEventListener('keydown', onEsc);
  document.getElementById('modal-root').appendChild(overlay);
  return overlay;
}

function closeModal(node) {
  const overlay = node.closest ? node.closest('.modal-overlay') : node;
  if (overlay) overlay.remove();
}

// ---------------------------------------------------------------- input de imagem
// Aceita clique (upload), arrastar-e-soltar e Ctrl+V.
// O paste vai para o input sob o mouse, o focado, ou o único da página.
const _imageInputs = [];
let _hoveredImageInput = null;

function createImageInput(container, { onChange = null, existingUrl = null } = {}) {
  container.classList.add('image-input');
  container.tabIndex = 0;
  container.innerHTML = `
    <div class="ii-placeholder">
      <div class="ii-icon">&#x16E3;</div>
      <div>Clique para enviar, arraste uma imagem<br>ou use <b>Ctrl+V</b></div>
      <div class="ii-hint">PNG, JPG, WEBP, GIF</div>
    </div>
    <img class="ii-preview" style="display:none" alt="">
    <button type="button" class="icon-btn danger ii-clear" title="Remover imagem">&#x2715;</button>`;

  const preview = container.querySelector('.ii-preview');
  const clearBtn = container.querySelector('.ii-clear');
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';
  fileInput.style.display = 'none';
  container.appendChild(fileInput);

  const state = { file: null, container };

  function show(url) {
    preview.src = url;
    preview.style.display = 'block';
    container.classList.add('has-image');
  }

  function setFile(file) {
    if (!file || !file.type.startsWith('image/')) return;
    state.file = file;
    show(URL.createObjectURL(file));
    if (onChange) onChange(file);
  }

  if (existingUrl) show(existingUrl);

  container.addEventListener('click', (e) => {
    if (e.target === clearBtn) return;
    fileInput.click();
  });
  fileInput.addEventListener('change', () => setFile(fileInput.files[0]));

  clearBtn.addEventListener('click', () => {
    state.file = null;
    preview.src = '';
    preview.style.display = 'none';
    container.classList.remove('has-image');
    if (onChange) onChange(null);
  });

  ['dragover', 'dragenter'].forEach((ev) =>
    container.addEventListener(ev, (e) => { e.preventDefault(); container.classList.add('dragover'); }));
  ['dragleave', 'drop'].forEach((ev) =>
    container.addEventListener(ev, (e) => { e.preventDefault(); container.classList.remove('dragover'); }));
  container.addEventListener('drop', (e) => {
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    setFile(file);
  });

  container.addEventListener('mouseenter', () => { _hoveredImageInput = state; });
  container.addEventListener('mouseleave', () => {
    if (_hoveredImageInput === state) _hoveredImageInput = null;
  });

  state.setFile = setFile;
  _imageInputs.push(state);
  return state;
}

document.addEventListener('paste', (e) => {
  const items = e.clipboardData && e.clipboardData.items;
  if (!items) return;
  let file = null;
  for (const item of items) {
    if (item.type.startsWith('image/')) { file = item.getAsFile(); break; }
  }
  if (!file) return;
  const visible = _imageInputs.filter((s) => s.container.isConnected && s.container.offsetParent !== null);
  const target = _hoveredImageInput
    || visible.find((s) => s.container === document.activeElement)
    || (visible.length === 1 ? visible[0] : null);
  if (target) {
    e.preventDefault();
    target.setFile(new File([file], 'colada.png', { type: file.type }));
    toast('Imagem colada!', 'success');
  }
});

// ---------------------------------------------------------------- helpers de domínio

// Miniatura redimensionada no servidor (alta qualidade) — evita a distorção
// do downscale do navegador em imagens muito grandes. width em px físicos (~2x o CSS).
function thumbUrl(rel, width) {
  return rel ? `/thumb/${width}/${rel}` : '';
}

const RARITY_LABEL = { 5: '★★★★★', 4: '★★★★' };
const BANNER_TYPE_LABEL = { unitario: 'Unitário', duplo: 'Duplo', especial: 'Especial' };

function starsHtml(rarity) {
  return `<span class="cc-stars stars-${rarity}">${RARITY_LABEL[rarity] || ''}</span>`;
}

// ---------------------------------------------------------------- cor representativa de um elemento
// Usada para tingir textos/gradientes de acordo com o elemento (Times, Reações).
// Cores extraídas do ícone às vezes ficam parecidas demais entre elementos (ex.: Psy/Electro
// e Aero/Aqua são todos arroxeados/azulados); por isso alguns têm cor fixa aqui.
const ELEMENT_COLOR_OVERRIDES = {
  fae:     'hsl(330 75% 82% / 0.85)',  // rosa bebê, em vez do rosa escuro extraído do ícone
  electro: 'hsl(262 75% 34% / 0.85)',  // roxo bem mais escuro que o Psy
  psy:     'hsl(280 70% 72% / 0.85)',  // roxo bem mais claro que o Electro
  aqua:    'hsl(212 88% 27% / 0.85)',  // azul escuro/marinho, distante do Aero
  aero:    'hsl(190 70% 58% / 0.85)',  // ciano claro, distante do Aqua
};

const _imageColorCache = new Map();

function imageColor(url) {
  if (_imageColorCache.has(url)) return _imageColorCache.get(url);
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
  _imageColorCache.set(url, promise);
  return promise;
}

function vividColor([r, g, b]) {
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

// Cor representativa de um elemento ({name, image}): usa override manual quando existir,
// senão extrai do ícone.
async function elementColor(element) {
  if (!element) return null;
  const override = ELEMENT_COLOR_OVERRIDES[(element.name || '').trim().toLowerCase()];
  if (override) return override;
  if (!element.image) return null;
  const rgb = await imageColor(`/static/${element.image}`);
  return rgb ? vividColor(rgb) : null;
}
