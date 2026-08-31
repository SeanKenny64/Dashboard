/* ---------- ROTATE PANELS (circular queue) ---------- */
// Panels keep a fixed relative order. The only action is: send whichever
// panel is currently on top to the back of the queue. Everyone else's
// relative order never changes — so to bring a panel to the top, you just
// keep sending the current top one to the back until it comes round.

function getDefaultSequence() {
  return Array.from(document.querySelectorAll('.card[data-card]')).map(el => el.getAttribute('data-card'));
}

let panelSequence = JSON.parse(localStorage.getItem('panelSequence') || 'null') || getDefaultSequence();

(function reconcileSequence() {
  const onPage = getDefaultSequence();
  panelSequence = panelSequence.filter(id => onPage.includes(id));
  onPage.forEach(id => { if (!panelSequence.includes(id)) panelSequence.push(id); });
})();

function saveSequence() {
  localStorage.setItem('panelSequence', JSON.stringify(panelSequence));
}

function isVisible(el) {
  return !!el && el.offsetParent !== null;
}

function currentTopId() {
  return panelSequence.find(id => isVisible(document.querySelector(`[data-card="${id}"]`)));
}

function updateTopButton() {
  const topId = currentTopId();
  document.querySelectorAll('.minimize-btn').forEach(btn => {
    btn.style.visibility = (btn.getAttribute('data-card') === topId) ? 'visible' : 'hidden';
  });
}

/* ---------- PANEL RESIZING (desktop only) ---------- */
const PANEL_SIZES_KEY = 'panelSizes';
const resizeTargets = new Set(['arena', 'quick-launch', 'gmail', 'notes', 'shopping', 'food-diary', 'rss-feeds']);
let panelSizes = {};

try {
  panelSizes = JSON.parse(localStorage.getItem(PANEL_SIZES_KEY) || '{}') || {};
} catch (_) {
  panelSizes = {};
}

function isDesktop() {
  return window.matchMedia('(min-width: 901px)').matches;
}

function savePanelSizes() {
  localStorage.setItem(PANEL_SIZES_KEY, JSON.stringify(panelSizes));
}

function applyPanelSize(id) {
  if (!isDesktop()) return;
  const card = document.querySelector(`[data-card="${id}"]`);
  const size = panelSizes[id];
  if (!card || !size) return;
  card.style.width = `${size.width}px`;
  card.style.height = `${size.height}px`;
}

function applyAllPanelSizes() {
  if (!isDesktop()) return;
  resizeTargets.forEach(applyPanelSize);
}

function addResizeHandle(card) {
  if (!resizeTargets.has(card.getAttribute('data-card'))) return;
  if (card.querySelector('.panel-resize-handle')) return;

  card.classList.add('panel-resizable');
  const handle = document.createElement('div');
  handle.className = 'panel-resize-handle';
  handle.setAttribute('aria-label', 'Resize panel');
  handle.title = 'Drag to resize';
  card.appendChild(handle);

  handle.addEventListener('pointerdown', event => {
    if (!isDesktop()) return;
    event.preventDefault();
    event.stopPropagation();

    const startX = event.clientX;
    const startY = event.clientY;
    const startWidth = card.getBoundingClientRect().width;
    const startHeight = card.getBoundingClientRect().height;
    const id = card.getAttribute('data-card');

    card.classList.add('panel-resizing');
    handle.setPointerCapture?.(event.pointerId);

    const onMove = moveEvent => {
      const width = Math.max(300, Math.round(startWidth + moveEvent.clientX - startX));
      const height = Math.max(180, Math.round(startHeight + moveEvent.clientY - startY));
      card.style.width = `${width}px`;
      card.style.height = `${height}px`;
    };

    const onUp = () => {
      const rect = card.getBoundingClientRect();
      panelSizes[id] = {
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      };
      savePanelSizes();
      card.classList.remove('panel-resizing');
      handle.removeEventListener('pointermove', onMove);
      handle.removeEventListener('pointerup', onUp);
      handle.removeEventListener('pointercancel', onUp);
    };

    handle.addEventListener('pointermove', onMove);
    handle.addEventListener('pointerup', onUp);
    handle.addEventListener('pointercancel', onUp);
  });
}

function setupPanelResizing() {
  if (!isDesktop()) return;
  document.querySelectorAll('.card[data-card]').forEach(card => addResizeHandle(card));
  applyAllPanelSizes();
}

function applyPanelOrder() {
  panelSequence.forEach((id, index) => {
    const el = document.querySelector(`[data-card="${id}"]`);
    if (el) el.style.order = index;
  });
  applyAllPanelSizes();
  updateTopButton();
}

function rotateTopPanel() {
  const topId = currentTopId();
  if (!topId) return;
  panelSequence = panelSequence.filter(id => id !== topId);
  panelSequence.push(topId);
  saveSequence();
  applyPanelOrder();
}

function bringPanelToTop(id) {
  if (!panelSequence.includes(id)) return;
  panelSequence = panelSequence.filter(panelId => panelId !== id);
  panelSequence.unshift(id);
  saveSequence();
  applyPanelOrder();
}

function bringPanelToBottom(id) {
  if (!panelSequence.includes(id)) return;
  panelSequence = panelSequence.filter(panelId => panelId !== id);
  panelSequence.push(id);
  saveSequence();
  applyPanelOrder();
}

applyPanelOrder();
setupPanelResizing();

window.refreshPanelTopButton = updateTopButton;
window.bringPanelToTop = bringPanelToTop;
window.bringPanelToBottom = bringPanelToBottom;

document.querySelectorAll('.minimize-btn').forEach(btn => {
  btn.onclick = () => rotateTopPanel();
});

/* ---------- SCHEDULED FOOD DIARY ---------- */
(function scheduleFoodDiary() {
  const FOOD_CARD = 'food-diary';
  const STORAGE_KEY = 'food-diary-completed-slots';
  const SLOTS = [10, 14, 20];

  function dateKey(date) {
    return date.toDateString();
  }

  function currentSlot(date = new Date()) {
    const hour = date.getHours();
    let slot = null;
    SLOTS.forEach(h => { if (hour >= h) slot = h; });
    return slot;
  }

  function slotKey(date, hour) {
    return `${dateKey(date)}|${hour}`;
  }

  function getCompleted() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch (_) {
      return {};
    }
  }

  function isCompleted(date, hour) {
    return !!getCompleted()[slotKey(date, hour)];
  }

  function markCompleted(date, hour) {
    const completed = getCompleted();
    completed[slotKey(date, hour)] = true;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(completed));
  }

  function completeCurrentSlot() {
    const now = new Date();
    const slot = currentSlot(now);
    if (slot === null || isCompleted(now, slot)) return;
    markCompleted(now, slot);
    bringPanelToBottom(FOOD_CARD);
  }

  function promptIfNeeded() {
    const card = document.querySelector(`[data-card="${FOOD_CARD}"]`);
    if (!card) return;

    const now = new Date();
    const slot = currentSlot(now);
    if (slot === null || isCompleted(now, slot)) return;

    card.style.display = '';
    bringPanelToTop(FOOD_CARD);
  }

  function watchForCompletion() {
    const statusEl = document.getElementById('food-diary-status');
    if (!statusEl) return;

    const observer = new MutationObserver(() => {
      if (statusEl.textContent.trim().startsWith('✓ Logged')) {
        completeCurrentSlot();
      }
    });

    observer.observe(statusEl, { childList: true, characterData: true, subtree: true });
  }

  window.addEventListener('food-diary-none', completeCurrentSlot);

  promptIfNeeded();
  watchForCompletion();
  setInterval(promptIfNeeded, 30 * 1000);
})();
