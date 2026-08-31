/* ---------- TILES & BOOKMARKS ---------- */
    const DEFAULT_TILE_GROUPS = [
      {
        name: 'AI', color: '#7c6fde', bg: 'rgba(124,111,222,0.15)',
        tiles: [
          { name: "ChatGPT",  url: "https://chatgpt.com" },
          { name: "Gemini",   url: "https://gemini.google.com/app" },
          { name: "Claude",   url: "https://claude.ai" },
          { name: "DeepSeek", url: "https://chat.deepseek.com" },
          { name: "Grok",     url: "https://grok.com" },
        ]
      },
      {
        name: 'News', color: '#e07b4a', bg: 'rgba(224,123,74,0.15)',
        tiles: [
          { name: "Google News",  url: "https://news.google.com/" },
          { name: "BBC Radio 4",  url: "https://www.bbc.co.uk/sounds/schedules/bbc_radio_fourfm" },
          { name: "The Guardian", url: "https://www.theguardian.com" },
        ]
      },
      {
        name: 'Media', color: '#4aade0', bg: 'rgba(74,173,224,0.15)',
        tiles: [
          { name: "Spotify",   url: "https://open.spotify.com" },
          { name: "YouTube",   url: "https://www.youtube.com" },
          { name: "Facebook",  url: "https://www.facebook.com" },
          { name: "Reddit",    url: "https://www.reddit.com" },
          { name: "Goodreads", url: "https://www.goodreads.com" },
        ]
      },
      {
        name: 'Reference & Learning', color: '#4ac49e', bg: 'rgba(74,196,158,0.15)',
        tiles: [
          { name: "Wikipedia", url: "https://en.wikipedia.org" },
          { name: "Duolingo", url: "https://www.duolingo.com" },
          { name: "Bristol City Council", url: "https://bristol.gov.uk" },
          { name: "NHS", url: "https://www.nhs.uk" }
        ]
      },
      {
        name: 'Work', color: '#e0c44a', bg: 'rgba(224,196,74,0.15)',
        tiles: [
          { name: "Github", url: "https://www.github.com" },
          { name: "GDrive", url: "https://drive.google.com/drive/u/0/my-drive" },
        ]
      },
      {
        name: 'Budget', color: '#4ae07b', bg: 'rgba(74,224,123,0.15)',
        tiles: [
          { name: "Co-op Bank", url: "https://bank.co-operativebank.co.uk/r/Login/EnterUsername" },
          { name: "UC Login",   url: "https://www.universal-credit.service.gov.uk/sign-in" },
          { name: "Revolut",    url: "https://app.revolut.com" },
        ]
      },
    ];

    // Load saved tiles, or fall back to defaults (first run)
    let TILE_GROUPS = JSON.parse(localStorage.getItem('tileGroups') || 'null') || DEFAULT_TILE_GROUPS;

    function saveTileGroups() {
      localStorage.setItem('tileGroups', JSON.stringify(TILE_GROUPS));
    }

    // Load collapsed state from localStorage
    let collapsedGroups = JSON.parse(localStorage.getItem('collapsedGroups') || '{}');

    function faviconFor(url) {
      try { return `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=64`; } catch { return ""; }
    }

    function toggleGroup(name) {
      collapsedGroups[name] = !collapsedGroups[name];
      localStorage.setItem('collapsedGroups', JSON.stringify(collapsedGroups));
      renderGroups();
    }

    function addTile(groupName) {
      const name = prompt('Site name?');
      if (!name) return;
      let url = prompt('URL?');
      if (!url) return;
      if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
      const group = TILE_GROUPS.find(g => g.name === groupName);
      group.tiles.push({ name, url });
      saveTileGroups();
      renderGroups();
    }

    function removeTile(groupName, tileIndex) {
      const group = TILE_GROUPS.find(g => g.name === groupName);
      group.tiles.splice(tileIndex, 1);
      saveTileGroups();
      renderGroups();
    }

    function addGroup() {
      const name = prompt('New group name?');
      if (!name) return;
      if (TILE_GROUPS.some(g => g.name === name)) { alert('Group already exists.'); return; }
      const colors = ['#7c6fde', '#e07b4a', '#4aade0', '#4ac49e', '#e0c44a', '#4ae07b', '#de4a8f', '#4ac4de'];
      const color = colors[TILE_GROUPS.length % colors.length];
      TILE_GROUPS.push({ name, color, bg: `${color}26`, tiles: [] });
      saveTileGroups();
      renderGroups();
    }

    function renderGroups() {
      const collapsedBar = document.getElementById('tile-groups-collapsed');
      const openGrid    = document.getElementById('tile-groups-open');

      const collapsed = TILE_GROUPS.filter(g => collapsedGroups[g.name]);
      const open      = TILE_GROUPS.filter(g => !collapsedGroups[g.name]);

      collapsedBar.innerHTML = collapsed.map(g => `
        <div class="tile-group-pill" style="border-color: ${g.color}44; background: ${g.bg};">
          <span style="color: ${g.color}; font-weight: 600;">${g.name}</span>
          <button class="tile-group-pill-btn" style="border-color: ${g.color}66; color: ${g.color};"
                  onclick="toggleGroup('${g.name}')">Restore</button>
        </div>
      `).join('');

      openGrid.innerHTML = open.map(g => `
        <div class="tile-group">
          <div class="tile-group-header"
               style="background:${g.bg}; color:${g.color}; border-bottom:1px solid ${g.color}44; display:flex; justify-content:space-between; align-items:center;">
            <span onclick="toggleGroup('${g.name}')" style="cursor:pointer; flex:1;">${g.name} <span class="group-chevron">▾</span></span>
            <button onclick="addTile('${g.name}')" title="Add site"
                    style="background:none; border:1px solid ${g.color}66; color:${g.color}; border-radius:4px; width:20px; height:20px; line-height:1; cursor:pointer; font-size:13px;">+</button>
          </div>
          <div class="tile-group-body">
            <div class="tiles">
              ${g.tiles.map((t, i) => `
                <a class="tile" href="${t.url}" target="_blank" style="border-color:${g.color}33; position:relative;">
                  <div class="tileRow">
                    <img class="favicon" src="${faviconFor(t.url)}" alt="">
                    <div class="tileTitle">${t.name}</div>
                  </div>
                  <button onclick="event.preventDefault(); event.stopPropagation(); removeTile('${g.name}', ${i});"
                          title="Remove"
                          style="position:absolute; top:-6px; right:-6px; width:16px; height:16px; border-radius:50%; border:none; background:#c33; color:#fff; font-size:10px; line-height:16px; padding:0; cursor:pointer; opacity:0; transition:opacity 0.15s;"
                          onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0">×</button>
                </a>`).join('')}
            </div>
          </div>
        </div>`).join('');
    }

    renderGroups();

    /* ---------- CORE UTILITIES ---------- */
    function tick() {
      const d = new Date();
      document.getElementById("clock").textContent = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      document.getElementById("date").textContent = d.toLocaleDateString([], { weekday: "long", year: "numeric", month: "short", day: "numeric" });
    }
tick();
setInterval(tick, 1000);
