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

    // Apply saved order as soon as this script runs, so panels are in the right place before first paint.
    applyPanelOrder();

    // Exposed so other scripts (e.g. checkin.js, which hides its own card once
    // submitted) can trigger a recheck of which panel should show the button,
    // since that can change for reasons outside this rotation logic.
    window.refreshPanelTopButton = updateTopButton;

    // Every minimize button rotates the current top panel to the back, regardless
    // of which button was physically clicked (only the top one is visible anyway).
    document.querySelectorAll('.minimize-btn').forEach(btn => {
      btn.onclick = () => rotateTopPanel();
    });
