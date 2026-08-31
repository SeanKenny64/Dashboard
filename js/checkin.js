    /* ---------- CHECK-IN ---------- */

(function() {
  const card = document.getElementById('checkin-card');
  if (!card) return;

  const today = new Date().toDateString();
  const localSubmitted = localStorage.getItem('checkin-submitted');

  function showCheckin() {
    card.style.display = '';
    if (window.bringPanelToTop) window.bringPanelToTop('daily-checkin');
  }

  function hideCheckin() {
    card.style.display = 'none';
    if (window.refreshPanelTopButton) window.refreshPanelTopButton();
  }

  // Ask the server for today's status so web and mobile browsers share the
  // same source of truth. Keep the old local value as a fallback if the server
  // cannot be reached.
  fetch('cgi-bin/checkin_status.py', { cache: 'no-store' })
    .then(res => {
      if (!res.ok) throw new Error('Status request failed');
      return res.json();
    })
    .then(data => {
      if (data.checked_in) {
        localStorage.setItem('checkin-submitted', Date.now().toString());
        hideCheckin();
      } else {
        localStorage.removeItem('checkin-submitted');
        showCheckin();
      }
    })
    .catch(err => {
      console.warn('Could not check server check-in status; using local fallback.', err);
      if (localSubmitted && new Date(parseInt(localSubmitted)).toDateString() === today) {
        hideCheckin();
      } else {
        showCheckin();
      }
    });
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
  const submitBtn = document.getElementById('submit-checkin');
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
