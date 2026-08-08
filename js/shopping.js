    /* ---------- SHOPPING LIST ---------- */
    async function loadShoppingList() {
      const container = document.getElementById('shopping-list');
      try {
        const response = await fetch('/api/shopping');
        const tasks = await response.json();
        if (tasks.length === 0) {
          container.innerHTML = '<span style="color: var(--muted)">Nothing needed right now.</span>';
          return;
        }
        container.innerHTML = tasks
          .map(t => {
          const tagEmoji = {
            fish: '🐟', meat: '🥩', vegetables: '🥦', salad: '🥗',
            dairy: '🥛', cheese: '🧀', herbs: '🌿', fruit: '🍎',
            oil: '🫙', staples: '🌾', pantry: '🥫', spices: '🌶️'
          };
          const tags = t.tags || [];
          const emoji = tags.map(tag => tagEmoji[tag]).find(e => e) || '🛒';
          return `<div>${emoji} ${t.description}</div>`;
        }) 
          .join('');
      } catch (e) {
        container.innerHTML = '<span style="color: #ff4444">Could not load shopping list.</span>';
        console.error('Shopping list error:', e);
      }
    }

    window.addEventListener('DOMContentLoaded', loadShoppingList);

        // --- Food Diary ---
    (function() {
      const photoInput = document.getElementById('food-diary-photo');
      const photoLabel = document.getElementById('food-diary-photo-label');
      const photoName  = document.getElementById('food-diary-photo-name');
      const submitBtn  = document.getElementById('food-diary-submit');
      const statusEl   = document.getElementById('food-diary-status');
      const textEl     = document.getElementById('food-diary-text');
      const recentEl   = document.getElementById('food-diary-recent');

      photoLabel.addEventListener('click', () => photoInput.click());

      photoInput.addEventListener('change', () => {
        const file = photoInput.files[0];
        photoName.textContent = file ? file.name : '';
        photoLabel.textContent = file ? '📷 Change photo' : '📷 Add photo';
      });

      submitBtn.addEventListener('click', async () => {
        const text  = textEl.value.trim();
        const photo = photoInput.files[0] || null;
        if (!text && !photo) { statusEl.textContent = 'Nothing to log.'; return; }
        submitBtn.disabled = true;
        statusEl.textContent = 'Saving…';
        try {
          const formData = new FormData();
          if (text)  formData.append('text', text);
          if (photo) formData.append('photo', photo);
          const res  = await fetch('/api/food-diary', { method: 'POST', body: formData });
          const data = await res.json();
          if (data.ok) {
            statusEl.textContent = '✓ Logged to Logseq';
            textEl.value = '';
            photoInput.value = '';
            photoName.textContent = '';
            photoLabel.textContent = '📷 Add photo';
            loadRecent();
            setTimeout(() => { statusEl.textContent = ''; }, 3000);
          } else {
            statusEl.textContent = '⚠ ' + (data.error || 'Error saving');
          }
        } catch(e) {
          statusEl.textContent = '⚠ Could not reach server';
        }
        submitBtn.disabled = false;
      });

      async function loadRecent() {
        try {
          const res  = await fetch('/api/food-diary/recent');
          const data = await res.json();
          recentEl.innerHTML = '';
          (data.entries || []).slice(0, 4).forEach(e => {
            const div = document.createElement('div');
            div.style.cssText = 'font-size:0.78rem; color:var(--muted); border-left:2px solid var(--border); padding-left:8px;';
            div.textContent = e.time + ' — ' + (e.text || '[photo]');
            recentEl.appendChild(div);
          });
        } catch(_) {}
      }

      loadRecent();
    })();

