    /* ---------- MINIMIZE & RESTORE ---------- */
    let minimizedPanels = JSON.parse(localStorage.getItem('minimizedPanels') || '{}');

    function updateMinimizedList() {
      const list = document.getElementById('minimized-list');
      const current = Object.keys(minimizedPanels).filter(id => minimizedPanels[id] && document.querySelector(`[data-card="${id}"]`));
      list.innerHTML = current.map(id => `
        <div class="minimized-item">
          ${id.charAt(0).toUpperCase() + id.slice(1).replace('-', ' ')}
          <button class="restore-btn" onclick="restorePanel('${id}')">Restore</button>
        </div>
      `).join('');
    }

    function minimizePanel(id) {
      const el = document.querySelector(`[data-card="${id}"]`);
      if (el) {
        el.style.display = 'none';
        minimizedPanels[id] = true;
        localStorage.setItem('minimizedPanels', JSON.stringify(minimizedPanels));
        updateMinimizedList();
      }
    }

    function restorePanel(id) {
      const el = document.querySelector(`[data-card="${id}"]`);
      if (el) {
        el.style.display = 'block';
        minimizedPanels[id] = false;
        localStorage.setItem('minimizedPanels', JSON.stringify(minimizedPanels));
        updateMinimizedList();
      }
    }

    // Attach listeners to minimize buttons
    document.querySelectorAll('.minimize-btn').forEach(btn => {
      btn.onclick = () => minimizePanel(btn.getAttribute('data-card'));
    });

