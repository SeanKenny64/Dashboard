/* ---------- FOOD DIARY ---------- */
(function initFoodDiary() {
  const textEl = document.getElementById('food-diary-text');
  const photoEl = document.getElementById('food-diary-photo');
  const photoNameEl = document.getElementById('food-diary-photo-name');
  const submitBtn = document.getElementById('food-diary-submit');
  const noneBtn = document.getElementById('food-diary-none');
  const statusEl = document.getElementById('food-diary-status');
  const recentEl = document.getElementById('food-diary-recent');

  if (!textEl || !photoEl || !submitBtn || !noneBtn) return;

  photoEl.addEventListener('change', () => {
    const file = photoEl.files && photoEl.files[0];
    if (photoNameEl) photoNameEl.textContent = file ? file.name : '';
  });

  async function loadRecent() {
    if (!recentEl) return;
    try {
      const response = await fetch(`/api/food-diary/recent?t=${Date.now()}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const entries = Array.isArray(data.entries) ? data.entries : [];
      recentEl.innerHTML = entries.map(entry => {
        const text = String(entry.text || '[photo only]')
          .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
        return `<div style="font-size:0.8rem;color:var(--muted);"><strong>${entry.time || ''}</strong> ${text}</div>`;
      }).join('');
    } catch (error) {
      console.error('Food diary recent fetch error:', error);
    }
  }

  submitBtn.addEventListener('click', async () => {
    const text = textEl.value.trim();
    const photo = photoEl.files && photoEl.files[0];
    if (!text && !photo) {
      if (statusEl) statusEl.textContent = 'Enter something or add a photo';
      return;
    }

    submitBtn.disabled = true;
    noneBtn.disabled = true;
    if (statusEl) statusEl.textContent = 'Saving...';

    try {
      const form = new FormData();
      form.append('text', text);
      if (photo) form.append('photo', photo);

      const response = await fetch('/api/food-diary', { method: 'POST', body: form });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (!data.ok) throw new Error('Save failed');

      textEl.value = '';
      photoEl.value = '';
      if (photoNameEl) photoNameEl.textContent = '';
      if (statusEl) statusEl.textContent = '✓ Logged';
      await loadRecent();
      window.dispatchEvent(new CustomEvent('food-diary-completed'));
    } catch (error) {
      console.error('Food diary save error:', error);
      if (statusEl) statusEl.textContent = '✗ Failed to save';
    } finally {
      submitBtn.disabled = false;
      noneBtn.disabled = false;
    }
  });

  noneBtn.type = 'button';
  noneBtn.addEventListener('click', () => {
    // None is a completion action for the current scheduled slot.
    // It deliberately does not write anything to the food diary.
    noneBtn.disabled = true;
    if (statusEl) statusEl.textContent = 'Skipped';
    window.dispatchEvent(new CustomEvent('food-diary-none'));
  });

  loadRecent();
})();
