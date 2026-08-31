    /* ---------- CHECK-IN ---------- */

    // The daily check-in has priority at the start of a new day. Once it has
    // been submitted, it disappears and the normal panel rotation resumes.
(function() {
  const submitted = localStorage.getItem('checkin-submitted');
  const today = new Date().toDateString();
  const card = document.getElementById('checkin-card');

  if (!card) return;

  if (!submitted || new Date(parseInt(submitted)).toDateString() !== today) {
    // A new day (or no previous submission): make the check-in the first panel.
    card.style.display = '';
    if (window.bringPanelToTop) window.bringPanelToTop('daily-checkin');
  } else {
    // Already submitted today: keep it hidden.
    card.style.display = 'none';
    if (window.refreshPanelTopButton) window.refreshPanelTopButton();
  }
})();

    // Radio selection logic
    document.querySelectorAll('.checkin-options').forEach(group => {
      group.querySelectorAll('.ci-btn').forEach(btn => {
        btn.onclick = () => {
          group.querySelectorAll('.ci-btn').forEach(b => b.classList.remove('selected'));
          btn.classList.add('selected');
          checkAllSelected();
        };
      });
    });

    function checkAllSelected() {
      const groups = ['drink','smoked','sleep','civ'];
      const allDone = groups.every(g => {
        const el = document.querySelector(`.checkin-options[data-group="${g}"] .ci-btn.selected`);
        return el !== null;
      });
      const submitBtn = document.getElementById('submit-checkin');
      submitBtn.disabled = !allDone;
      submitBtn.style.opacity = allDone ? '1' : '0.4';
      submitBtn.style.cursor = allDone ? 'pointer' : 'not-allowed';
    }

    document.getElementById('submit-checkin').onclick = async () => {
      const get = (group) => document.querySelector(`.checkin-options[data-group="${group}"] .ci-btn.selected`)?.dataset.value ?? null;
      const payload = {
        drink:  get('drink'),
        smoked: get('smoked'),
        sleep:  get('sleep'),
        civ:    get('civ')
      };
      const statusEl = document.getElementById('checkin-status');
      try {
        const res = await fetch('cgi-bin/save_checkin.py', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.status === 'ok') {
          localStorage.setItem('checkin-submitted', Date.now().toString());
          document.getElementById('checkin-card').style.display = 'none';
          if (window.refreshPanelTopButton) window.refreshPanelTopButton();
        } else {
          statusEl.textContent = '⚠ Server error';
        }
      } catch (e) {
        statusEl.textContent = '⚠ Could not reach server';
        console.error(e);
      }
    };
