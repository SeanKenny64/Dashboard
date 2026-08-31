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
                        <a href="${item.link}" target="_blank" style="color: var(--text); text-decoration: none;">${item.title}</a>
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