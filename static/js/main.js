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
function openModal(html, { wide = false } = {}) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `<div class="modal ${wide ? 'wide' : ''}">${html}</div>`;
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

// ---------------------------------------------------------------- clique-e-segure: card vira vídeo
// Qualquer elemento com data-demo="<url do vídeo>" toca o vídeo demonstrativo
// em loop (mudo, como um gif) enquanto o dedo/mouse fica pressionado.
const HOLD_MS = 350;          // tempo de pressão até virar vídeo
const HOLD_MOVE_TOLERANCE = 12;  // px de movimento que cancelam a pressão

let _hold = null;
let _swallowClick = false;

// Atributo pronto para usar nos templates de card dos módulos
function demoAttr(c) {
  const src = c && c.demo_video;
  return src ? ` data-demo="/static/${esc(src)}"` : '';
}

function _holdTargetRect(host) {
  const media = host.matches('img, video') ? host : host.querySelector('img, video');
  return (media || host).getBoundingClientRect();
}

function _showHoldVideo() {
  if (!_hold || _hold.shown) return;
  const { host } = _hold;
  const rect = _holdTargetRect(host);
  if (!rect.width || !rect.height) return;

  // gif não toca em <video>: nesse caso a prévia é a própria imagem animada
  const isGif = /\.gif(\?.*)?$/i.test(host.dataset.demo);
  const video = document.createElement(isGif ? 'img' : 'video');
  video.className = 'demo-hold-video';
  video.src = host.dataset.demo;
  if (!isGif) {
    video.muted = true;
    video.loop = true;
    video.autoplay = true;
    video.playsInline = true;
    video.setAttribute('playsinline', '');
  }
  video.style.left = `${rect.left}px`;
  video.style.top = `${rect.top}px`;
  video.style.width = `${rect.width}px`;
  video.style.height = `${rect.height}px`;
  const media = host.matches('img, video') ? host : host.querySelector('img, video');
  video.style.borderRadius = getComputedStyle(media || host).borderRadius;
  video.addEventListener('error', () => video.remove());
  document.body.appendChild(video);
  if (!isGif) video.play().catch(() => { /* sem autoplay: mostra o primeiro frame */ });
  requestAnimationFrame(() => video.classList.add('on'));

  _hold.shown = true;
  _hold.video = video;
}

function _endHold() {
  if (!_hold) return;
  clearTimeout(_hold.timer);
  if (_hold.video) _hold.video.remove();
  if (_hold.shown) {
    // evita que o "segurar" no card vire navegação ao soltar
    _swallowClick = true;
    setTimeout(() => { _swallowClick = false; }, 700);
  }
  _hold = null;
}

document.addEventListener('pointerdown', (e) => {
  if (e.button) return;
  const host = e.target.closest && e.target.closest('[data-demo]');
  if (!host || !host.dataset.demo) return;
  _endHold();
  _hold = { host, x: e.clientX, y: e.clientY, shown: false, video: null, timer: null };
  _hold.timer = setTimeout(_showHoldVideo, HOLD_MS);
});

document.addEventListener('pointermove', (e) => {
  if (!_hold) return;
  if (Math.abs(e.clientX - _hold.x) > HOLD_MOVE_TOLERANCE ||
      Math.abs(e.clientY - _hold.y) > HOLD_MOVE_TOLERANCE) _endHold();
});

['pointerup', 'pointercancel', 'pointerleave'].forEach((ev) =>
  document.addEventListener(ev, _endHold));
window.addEventListener('scroll', _endHold, true);
window.addEventListener('blur', _endHold);

// o menu nativo do toque longo atrapalharia a prévia
document.addEventListener('contextmenu', (e) => {
  if (_hold) e.preventDefault();
});

document.addEventListener('click', (e) => {
  if (!_swallowClick) return;
  _swallowClick = false;
  e.preventDefault();
  e.stopPropagation();
}, true);
