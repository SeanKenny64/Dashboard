        /* ---------- NOTES (Logseq) ---------- */
    const notes = document.getElementById("notes");
    const notesLogBtn = document.getElementById("notes-log-btn");
    const notesStatus = document.getElementById("notes-status");

    // Load notes from localStorage on page open
    function loadNotesFromServer() {
      notes.value = localStorage.getItem("dashboard_notes") || "";
    }

    // Save locally as user types (so they don't lose anything)
    notes.oninput = () => {
      localStorage.setItem("dashboard_notes", notes.value);
    };

    // Log It button — sends to Logseq and clears
    notesLogBtn.addEventListener('click', async () => {
      const text = notes.value.trim();
      if (!text) { notesStatus.textContent = 'Nothing to log.'; return; }
      notesLogBtn.disabled = true;
      notesStatus.textContent = 'Saving…';
      try {
        const res = await fetch('/api/notes-logseq', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notes: text })
        });
        const data = await res.json();
        if (data.ok) {
          notesStatus.textContent = '✓ Logged to Logseq';
          notes.value = '';
          localStorage.setItem("dashboard_notes", '');
          setTimeout(() => { notesStatus.textContent = ''; }, 3000);
        } else {
          notesStatus.textContent = '⚠ Error saving';
        }
      } catch(e) {
        notesStatus.textContent = '⚠ Could not reach server';
      }
      notesLogBtn.disabled = false;
    });

    // Load notes when page loads
    window.addEventListener('DOMContentLoaded', loadNotesFromServer);

    // Initial minimized state check
    window.onload = () => {
      Object.keys(minimizedPanels).forEach(id => { if(minimizedPanels[id]) minimizePanel(id); });
      updateMinimizedList();
      // Set day of week in check-in heading
      const dayEl = document.getElementById('checkin-day');
      if (dayEl) {
        const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
        dayEl.textContent = '— ' + days[new Date().getDay()];
      }
    };


