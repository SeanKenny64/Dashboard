    /* ---------- CHECK-IN ---------- */

    // Hide card if already submitted today
(function() {
  const submitted = localStorage.getItem('checkin-submitted');
  if (!submitted) return;

  const today = new Date().toDateString();
  const submittedDate = new Date(parseInt(submitted)).toDateString();

  if (today === submittedDate) {
    document.getElementById('checkin-card').style.display = 'none';
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
