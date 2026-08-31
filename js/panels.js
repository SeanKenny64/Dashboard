    /* ---------- ROTATE PANELS (circular queue) ---------- */
    // Panels keep a fixed relative order. The only action is: send whichever
    // panel is currently on top to the back of the queue. Everyone else's
    // relative order never changes — so to bring a panel to the top, you just
    // keep sending the current top one to the back until it comes round.

    function getDefaultSequence() {
      return Array.from(document.querySelectorAll('.card[data-card]')).map(el => el.getAttribute('data-card'));
    }

    let panelSequence = JSON.parse(localStorage.getItem('panelSequence') || 'null') || getDefaultSequence();

    // Reconcile with what's actually on the page, in case cards were added/removed
    // since this was last saved.
    (function reconcileSequence() {
      const onPage = getDefaultSequence();
      panelSequence = panelSequence.filter(id => onPage.includes(id));
      onPage.forEach(id => { if (!panelSequence.includes(id)) panelSequence.push(id); });
    })();

    function saveSequence() {
      localStorage.setItem('panelSequence', JSON.stringify(panelSequence));
    }

    // Some panels (like the daily check-in card) can be hidden by other logic
    // entirely separate from this rotation — e.g. once you've submitted for the
    // day. Those shouldn't count as "top" even if they're first in the sequence.
    function isVisible(el) {
      return !!el && el.offsetParent !== null;
    }

    function currentTopId() {
      return panelSequence.find(id => isVisible(document.querySelector(`[data-card="${id}"]`)));
    }

    function updateTopButton() {
      const topId = currentTopId();
      document.querySelectorAll('.minimize-btn').forEach(btn => {
        // Only the button on the current top (visible) panel is usable — the rest
        // are hidden, since clicking any panel other than the top one wouldn't
        // make sense here.
        btn.style.visibility = (btn.getAttribute('data-card') === topId) ? 'visible' : 'hidden';
      });
    }

    function applyPanelOrder() {
      panelSequence.forEach((id, index) => {
        const el = document.querySelector(`[data-card="${id}"]`);
        if (el) el.style.order = index;
      });
      updateTopButton();
    }

    function rotateTopPanel() {
      const topId = currentTopId();
      if (!topId) return; // nothing visible to rotate
      panelSequence = panelSequence.filter(id => id !== topId);
      panelSequence.push(topId);
      saveSequence();
      applyPanelOrder();
    }

    // Allow other modules to deliberately put a panel at the front of the queue.
    // The daily check-in uses this at the start of a new day so it always gets
    // priority, regardless of where the user left the panel rotation yesterday.
    function bringPanelToTop(id) {
      if (!panelSequence.includes(id)) return;
      panelSequence = panelSequence.filter(panelId => panelId !== id);
      panelSequence.unshift(id);
      saveSequence();
      applyPanelOrder();
    }

    // Put a panel at the very end of the queue. Scheduled panels use this after
    // they've been completed so the dashboard returns to its normal rotation.
    function bringPanelToBottom(id) {
      if (!panelSequence.includes(id)) return;
      panelSequence = panelSequence.filter(panelId => panelId !== id);
      panelSequence.push(id);
      saveSequence();
      applyPanelOrder();
    }

    // Apply saved order as soon as this script runs, so panels are in the right place before first paint.
    applyPanelOrder();

    // Exposed so other scripts can deliberately change panel priority.
    window.refreshPanelTopButton = updateTopButton;
    window.bringPanelToTop = bringPanelToTop;
    window.bringPanelToBottom = bringPanelToBottom;

    // Every minimize button rotates the current top panel to the back, regardless
    // of which button was physically clicked (only the top one is visible anyway).
    document.querySelectorAll('.minimize-btn').forEach(btn => {
      btn.onclick = () => rotateTopPanel();
    });

    /* ---------- SCHEDULED FOOD DIARY ---------- */
    // Food diary prompts occur three times a day. Once the current prompt is
    // successfully logged, the card goes back to the bottom of the queue.
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

        // Keep the localStorage entry small by retaining only recent days.
        const cutoff = Date.now() - (7 * 24 * 60 * 60 * 1000);
        Object.keys(completed).forEach(key => {
          const datePart = key.split('|')[0];
          const parsed = new Date(datePart);
          if (!Number.isNaN(parsed.getTime()) && parsed.getTime() < cutoff) {
            delete completed[key];
          }
        });

        localStorage.setItem(STORAGE_KEY, JSON.stringify(completed));
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
            const now = new Date();
            const slot = currentSlot(now);
            if (slot !== null && !isCompleted(now, slot)) {
              markCompleted(now, slot);
              bringPanelToBottom(FOOD_CARD);
            }
          }
        });

        observer.observe(statusEl, { childList: true, characterData: true, subtree: true });
      }

      promptIfNeeded();
      watchForCompletion();

      // Check regularly so an already-open dashboard notices 10:00, 14:00 and
      // 20:00 without requiring a page refresh.
      setInterval(promptIfNeeded, 30 * 1000);
    })();
