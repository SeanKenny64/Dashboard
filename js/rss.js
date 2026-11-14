document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('rss-feed-container');
    if (!container) return;

    fetch('cgi-bin/rss.py')
        .then(response => response.json())
        .then(data => {
            if (!data || data.length === 0) {
                container.innerHTML = '<p style="color: var(--muted);">No feeds found.</p>';
                return;
            }
            
            let html = '<ul style="list-style:none; padding:0; margin:0;">';
            data.forEach(item => {
                html += `
                    <li style="margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px solid var(--border);">
                        <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
                            <a href="${item.link}" target="_blank"
                            style="color: var(--text); text-decoration: none; flex: 1;">
                                ${item.title}
                            </a>
                            <span style="background: #8ecae6; color: white; font-weight: bold;
                                        font-size: 0.7em; padding: 3px 7px; border-radius: 4px;
                                        white-space: nowrap;">
                                ${item.source || 'Unknown'}
                            </span>
                        </div>
                    </li>
                `;         
               });
            html += '</ul>';
            container.innerHTML = html;
        })
        .catch(error => {
            console.error('Error fetching RSS:', error);
            container.innerHTML = '<p style="color: red;">Failed to load RSS feeds.</p>';
        });
});