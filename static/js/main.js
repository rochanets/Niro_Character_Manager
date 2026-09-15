/* Utilidades compartilhadas — Niro Character Manager */

// ---------------------------------------------------------------- menu lateral
const SIDEBAR_KEY = 'niro:sidebar:expanded';

function initSidebar() {
  const sidebar = document.querySelector('.sidebar');
  const toggle = sidebar && sidebar.querySelector('.sidebar-toggle');
  if (!sidebar || !toggle) return;

  let expanded = false;
  try { expanded = localStorage.getItem(SIDEBAR_KEY) === '1'; } catch (_) { /* storage indisponível */ }

  function setExpanded(next, persist = true) {
    expanded = next;
    sidebar.classList.toggle('is-expanded', expanded);
    toggle.setAttribute('aria-expanded', String(expanded));
    const action = expanded ? 'Fechar' : 'Abrir';
    toggle.setAttribute('aria-label', `${action} menu lateral`);
    toggle.title = `${action} menu lateral`;
    if (persist) {
      try { localStorage.setItem(SIDEBAR_KEY, expanded ? '1' : '0'); } catch (_) { /* storage indisponível */ }
    }
  }

  setExpanded(expanded, false);
  toggle.addEventListener('click', () => setExpanded(!expanded));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && expanded) {
      setExpanded(false);
      toggle.focus();
    }
  });
}

initSidebar();

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

// Envio com barra de progresso — uploads grandes (vídeo demonstrativo, cards
// em alta resolução) não podem parecer travados enquanto sobem.
function apiUpload(url, method, formData, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);
    xhr.upload.addEventListener('progress', (e) => {
      if (onProgress && e.lengthComputable) onProgress(e.loaded / e.total);
    });
    xhr.addEventListener('load', () => {
      let body = null;
      try { body = JSON.parse(xhr.responseText); } catch (_) { /* respostas sem json */ }
      if (xhr.status >= 200 && xhr.status < 300) { resolve(body); return; }
      const err = new Error((body && body.error) || `Erro ${xhr.status}`);
      err.status = xhr.status;
      reject(err);
    });
    xhr.addEventListener('error', () => reject(new Error('Falha de conexão ao enviar os arquivos.')));
    xhr.addEventListener('abort', () => reject(new Error('Envio cancelado.')));
    xhr.send(formData);
  });
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
  overlay.innerHTML = `
    <div class="modal ${wide ? 'wide' : ''} ${picker ? 'picker' : ''}" role="dialog" aria-modal="true">
      <button type="button" class="modal-close" aria-label="Fechar janela" title="Fechar">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M18.3 5.7a1 1 0 0 0-1.4 0L12 10.6 7.1 5.7a1 1 0 0 0-1.4 1.4l4.9 4.9-4.9 4.9a1 1 0 1 0 1.4 1.4l4.9-4.9 4.9 4.9a1 1 0 0 0 1.4-1.4L13.4 12l4.9-4.9a1 1 0 0 0 0-1.4Z"/>
        </svg>
      </button>
      ${html}
    </div>`;
  const dismiss = () => {
    overlay.remove();
    document.removeEventListener('keydown', onEsc);
  };
  overlay.addEventListener('mousedown', (e) => {
    if (e.target === overlay) dismiss();
  });
  const onEsc = (e) => {
    if (e.key === 'Escape') dismiss();
  };
  overlay.querySelector('.modal-close').addEventListener('click', dismiss);
  overlay._dismiss = dismiss;
  document.addEventListener('keydown', onEsc);
  document.getElementById('modal-root').appendChild(overlay);
  return overlay;
}

function closeModal(node) {
  const overlay = node.closest ? node.closest('.modal-overlay') : node;
  if (overlay) {
    if (overlay._dismiss) overlay._dismiss();
    else overlay.remove();
  }
}

// ---------------------------------------------------------------- confirmação
// Diálogo temático do projeto — nunca confirm() nativo, que abre janela do SO
// fora do tema. Devolve uma Promise que resolve true/false.
function confirmDialog({ title, message, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar',
                         danger = false } = {}) {
  return new Promise((resolve) => {
    const overlay = openModal(`
      <h3><span class="rune">&#x16DE;</span> ${esc(title || 'Confirmar')}</h3>
      <p style="color:var(--ink-2);line-height:1.6">${esc(message || '')}</p>
      <div class="modal-actions">
        <button type="button" class="btn" data-cancel>${esc(cancelLabel)}</button>
        <button type="button" class="btn ${danger ? 'danger' : 'primary'}" data-ok>${esc(confirmLabel)}</button>
      </div>`);
    let respondido = false;
    const responder = (valor) => {
      if (respondido) return;
      respondido = true;
      resolve(valor);
    };
    overlay.querySelector('[data-cancel]').addEventListener('click', () => {
      responder(false);
      closeModal(overlay);
    });
    overlay.querySelector('[data-ok]').addEventListener('click', () => {
      responder(true);
      closeModal(overlay);
    });
    // fechar pelo X, pelo Esc ou clicando fora equivale a cancelar
    const original = overlay._dismiss;
    overlay._dismiss = () => { responder(false); original(); };
  });
}

// ---------------------------------------------------------------- input de imagem
// Aceita clique (upload), arrastar-e-soltar e Ctrl+V.
// O paste vai para o input sob o mouse, o focado, ou o único da página.
const _imageInputs = [];
let _hoveredImageInput = null;

const VIDEO_EXT_RE = /\.(mp4|webm|ogg|ogv|mov|m4v)(\?.*)?$/i;

function isVideoUrl(url) {
  return !!url && VIDEO_EXT_RE.test(url);
}

// `video: true` transforma o campo em slot de vídeo (mp4/webm/mov/gif),
// com prévia rodando em loop e mudo, igual ao que aparece no cadastro.
function createImageInput(container, { onChange = null, existingUrl = null, video = false } = {}) {
  container.classList.add('image-input');
  if (video) container.classList.add('video-input');
  container.tabIndex = 0;
  container.innerHTML = `
    <div class="ii-placeholder">
      <div class="ii-icon">${video ? '&#x25B6;' : '&#x16E3;'}</div>
      <div>Clique para enviar, arraste ${video ? 'um vídeo' : 'uma imagem'}<br>ou use <b>Ctrl+V</b></div>
      <div class="ii-hint">${video ? 'MP4, WEBM, MOV, GIF' : 'PNG, JPG, WEBP, GIF'}</div>
    </div>
    <img class="ii-preview" style="display:none" alt="">
    <video class="ii-preview-video" style="display:none" muted loop playsinline autoplay></video>
    <button type="button" class="icon-btn danger ii-clear" title="Remover ${video ? 'vídeo' : 'imagem'}">&#x2715;</button>`;

  const preview = container.querySelector('.ii-preview');
  const previewVideo = container.querySelector('.ii-preview-video');
  const clearBtn = container.querySelector('.ii-clear');
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = video ? 'video/*,image/gif' : 'image/*';
  fileInput.style.display = 'none';
  container.appendChild(fileInput);

  const state = { file: null, container, isVideo: video };

  function accepts(file) {
    if (!file) return false;
    if (!video) return file.type.startsWith('image/');
    return file.type.startsWith('video/') || file.type === 'image/gif';
  }

  function show(url, asVideo) {
    if (asVideo) {
      previewVideo.src = url;
      previewVideo.style.display = 'block';
      previewVideo.play().catch(() => { /* autoplay bloqueado: fica no primeiro frame */ });
      preview.style.display = 'none';
    } else {
      preview.src = url;
      preview.style.display = 'block';
      previewVideo.style.display = 'none';
    }
    container.classList.add('has-image');
  }

  function setFile(file) {
    if (!accepts(file)) return;
    state.file = file;
    show(URL.createObjectURL(file), file.type.startsWith('video/'));
    if (onChange) onChange(file);
  }

  if (existingUrl) show(existingUrl, isVideoUrl(existingUrl));

  container.addEventListener('click', (e) => {
    if (e.target === clearBtn) return;
    fileInput.click();
  });
  fileInput.addEventListener('change', () => setFile(fileInput.files[0]));

  clearBtn.addEventListener('click', () => {
    state.file = null;
    preview.src = '';
    preview.style.display = 'none';
    previewVideo.removeAttribute('src');
    previewVideo.load();
    previewVideo.style.display = 'none';
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
    if (item.type.startsWith('image/') || item.type.startsWith('video/')) {
      file = item.getAsFile();
      break;
    }
  }
  if (!file) return;
  const isVideo = file.type.startsWith('video/');
  // Um slot só aceita o que é do tipo dele (vídeo no slot de vídeo, imagem nos demais)
  const visible = _imageInputs.filter((s) => s.container.isConnected &&
    s.container.offsetParent !== null &&
    (isVideo ? s.isVideo : !s.isVideo || file.type === 'image/gif'));
  const hovered = _hoveredImageInput && visible.includes(_hoveredImageInput) ? _hoveredImageInput : null;
  const target = hovered
    || visible.find((s) => s.container === document.activeElement)
    || (visible.length === 1 ? visible[0] : null);
  if (target) {
    e.preventDefault();
    const ext = isVideo ? (file.type.split('/')[1] || 'mp4') : 'png';
    target.setFile(new File([file], `colada.${ext}`, { type: file.type }));
    toast(isVideo ? 'Vídeo colado!' : 'Imagem colada!', 'success');
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

// ---------------------------------------------------------------- alternar imagem/vídeo no card
// Card de personagem com vídeo cadastrado ganha um ícone de câmera no canto
// inferior direito da imagem. Clicando, o card vira vídeo (mudo, em loop) e o
// ícone vira o de imagem; clicando de novo, volta à imagem estática.
// O estado não é persistido: sair da página devolve todos ao padrão estático.
const ICON_DEMO_VIDEO = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
  stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="13" height="12" rx="2"></rect>
  <path d="M15 11l6-4v10l-6-4z"></path></svg>`;
const ICON_DEMO_IMAGE = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
  stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"></rect>
  <circle cx="8.5" cy="9.5" r="1.6"></circle><path d="M21 16l-5-5-5 5-2-2-5 5"></path></svg>`;

// Envolve a mídia do card: `<div class="demo-media">` com a imagem e o botão.
function demoToggleHtml(c) {
  const src = c && c.demo_video;
  if (!src) return '';
  return `<button type="button" class="demo-toggle" data-demo="/static/${esc(src)}"
    title="Ver vídeo" aria-label="Ver vídeo">${ICON_DEMO_VIDEO}</button>`;
}

function _stopDemoVideo(btn) {
  const media = btn.closest('.demo-media');
  const playing = media && media.querySelector('.demo-video');
  if (playing) playing.remove();
  btn.classList.remove('playing');
  btn.innerHTML = ICON_DEMO_VIDEO;
  btn.title = 'Ver vídeo';
  btn.setAttribute('aria-label', 'Ver vídeo');
}

function _startDemoVideo(btn) {
  const media = btn.closest('.demo-media');
  if (!media) return;
  const src = btn.dataset.demo;
  // gif não toca em <video>: nesse caso o card animado é a própria imagem
  const isGif = /\.gif(\?.*)?$/i.test(src);
  const el = document.createElement(isGif ? 'img' : 'video');
  el.className = 'demo-video';
  if (!isGif) {
    el.muted = true;
    el.loop = true;
    el.autoplay = true;
    el.playsInline = true;
    el.setAttribute('playsinline', '');
  }
  el.addEventListener('error', () => {
    _stopDemoVideo(btn);
    toast('Não foi possível carregar o vídeo.', 'error');
  });
  el.src = src;
  media.appendChild(el);
  if (!isGif) el.play().catch(() => { /* sem autoplay: fica no primeiro frame */ });
  requestAnimationFrame(() => el.classList.add('on'));
  btn.classList.add('playing');
  btn.innerHTML = ICON_DEMO_IMAGE;
  btn.title = 'Voltar para a imagem';
  btn.setAttribute('aria-label', 'Voltar para a imagem');
}

// O card é um link: o clique no ícone não pode navegar.
document.addEventListener('click', (e) => {
  const btn = e.target.closest && e.target.closest('.demo-toggle');
  if (!btn) return;
  e.preventDefault();
  e.stopPropagation();
  if (btn.classList.contains('playing')) _stopDemoVideo(btn);
  else _startDemoVideo(btn);
}, true);
