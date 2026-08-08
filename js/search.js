    /* ---------- CUSTOM ENGINE DROPDOWN ---------- */
    let currentEngineUrl = 'https://google.com/search?q=';

    function toggleEngineDropdown() {
      document.getElementById('engine-options').classList.toggle('open');
    }

    function selectEngine(el) {
      // Update hidden select so executeSearch() still works
      currentEngineUrl = el.dataset.url;
      const sel = document.getElementById('search-engine-selector');
      for (let opt of sel.options) {
        if (opt.value === currentEngineUrl) { opt.selected = true; break; }
      }
      // Update visible button
      document.getElementById('engine-icon').src = el.querySelector('img').src;
      document.getElementById('engine-label').textContent = el.textContent.trim();
      // Mark active
      document.querySelectorAll('.engine-option').forEach(o => o.classList.remove('active'));
      el.classList.add('active');
      // Close
      document.getElementById('engine-options').classList.remove('open');
    }

    // Close dropdown if user clicks outside it
    document.addEventListener('click', (e) => {
      if (!document.getElementById('engine-dropdown').contains(e.target)) {
        document.getElementById('engine-options').classList.remove('open');
      }
    });

    /* ---------- SEARCH LOGIC ---------- */
    function executeSearch() {
      const input = document.getElementById('search-input').value.trim();
      if (!input) return;
      acSave(input);
      acHide();
      if (input.includes('.') && !input.includes(' ')) {
        let url = input.startsWith('http') ? input : 'https://' + input;
        window.open(url, '_blank');
      } else {
        window.open(currentEngineUrl + encodeURIComponent(input), '_blank');
      }
    }

    /* ---------- SEARCH AUTOCOMPLETE ---------- */
    const AC_KEY = 'searchHistory';
    const AC_MAX = 200; // max saved terms
    let acIndex = -1;

    function acLoad() {
      try { return JSON.parse(localStorage.getItem(AC_KEY)) || []; } catch { return []; }
    }

    function acSave(term) {
      let hist = acLoad().filter(t => t !== term);
      hist.unshift(term);
      if (hist.length > AC_MAX) hist = hist.slice(0, AC_MAX);
      localStorage.setItem(AC_KEY, JSON.stringify(hist));
    }

    function acUpdate(val) {
      const list = document.getElementById('ac-list');
      const hist = acLoad();
      const q = val.trim().toLowerCase();
      const matches = q ? hist.filter(t => t.toLowerCase().includes(q)) : hist;
      if (!matches.length) { acHide(); return; }
      acIndex = -1;
      list.innerHTML = matches.slice(0, 10).map((t, i) =>
        `<li data-i="${i}" onmousedown="acPick(this)" style="
          padding:7px 12px;
          cursor:pointer;
          font-size:0.9rem;
          border-bottom:1px solid var(--border,#333);
          white-space:nowrap;
          overflow:hidden;
          text-overflow:ellipsis;
        ">${escHtml(t)}</li>`
      ).join('');
      list.style.display = 'block';
    }

    function acHide() {
      const list = document.getElementById('ac-list');
      if (list) { list.style.display = 'none'; list.innerHTML = ''; }
      acIndex = -1;
    }

    function acPick(li) {
      const inp = document.getElementById('search-input');
      inp.value = li.textContent;
      acHide();
      executeSearch();
    }

    function acKeydown(e) {
      const list = document.getElementById('ac-list');
      const items = list.querySelectorAll('li');
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        acIndex = Math.min(acIndex + 1, items.length - 1);
        acHighlight(items);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        acIndex = Math.max(acIndex - 1, -1);
        acHighlight(items);
      } else if (e.key === 'Enter') {
        if (acIndex >= 0 && items[acIndex]) {
          e.preventDefault();
          document.getElementById('search-input').value = items[acIndex].textContent;
          acHide();
        }
        executeSearch();
      } else if (e.key === 'Escape') {
        acHide();
      }
    }

    function acHighlight(items) {
      items.forEach((li, i) => {
        li.style.background = i === acIndex ? 'var(--accent,#7c6af7)' : '';
        li.style.color = i === acIndex ? '#fff' : '';
      });
      if (acIndex >= 0 && items[acIndex]) {
        document.getElementById('search-input').value = items[acIndex].textContent;
      }
    }

    function escHtml(s) {
      return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }
/* This function updates the background icon of the selector */
function updateSearchIcon(select) {
  const domain = select.options[select.selectedIndex].getAttribute('data-domain');
  if (domain) {
    select.style.backgroundImage = `url('https://www.google.com/s2/favicons?domain=${domain}&sz=32')`;
  }
}
    

    // Enter key handled by acKeydown on the search input

