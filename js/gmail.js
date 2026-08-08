    /* ---------- GMAIL UNREAD COUNT ---------- */
  async function fetchGmailCount() {
  try {
    const response = await fetch('cgi-bin/gmail_unread.py');
    if (!response.ok) throw new Error(`HTTP error ${response.status}`);
    
    const data = await response.json();
    const gmailDiv = document.getElementById('gmail-count');
    
    if (data.error) {
      gmailDiv.innerHTML = `<span style="color: #ff4444;">Error: ${data.error}</span>`;
    } else {
      const count = data.count || 0;
      const events = Array.isArray(data.calendar) ? data.calendar : [];
      const unreadLabel = count === 0
        ? '📭 No unread emails'
        : count === 1
          ? '📨 1 unread email'
          : `📨 ${count} unread emails`;

      const upcomingHtml = events.length
        ? `<div style="margin-top:10px; font-size:13px; color:#FFA726;">
            <div style="margin-bottom:6px; font-weight:600;">Upcoming calendar:</div>` +
            events.map((event) => {
              const d = new Date(event.start);
              const when = event.all_day
                ? d.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })
                : d.toLocaleString([], {
                    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                  });
              // Get today's date in YYYY-MM-DD format for Google Calendar URL
              const today = new Date();
              const todayStr = today.toISOString().split('T')[0];
              const calendarUrl = `https://calendar.google.com/calendar/u/0/r/week`;
              
              return `<div style="margin:4px 0; font-size:12.5px;">
          <a href="${calendarUrl}" target="_blank" style="color:#FFA726; text-decoration:none; display:inline-block; cursor:pointer;" 
             title="Open today's calendar"
             onclick="event.stopPropagation()">
            • ${event.title} 
            <span style="opacity:0.9; color:#FFCC80;">(${when})</span>
          </a>
        </div>`;
            }).join('') +
          `</div>`
        : `<div style="margin-top:8px; font-size:13px; color:#FFA726;">No upcoming calendar items</div>`;

      gmailDiv.innerHTML = `${unreadLabel}${upcomingHtml}`;

      // Click opens Gmail, double-click opens Calendar
      gmailDiv.style.cursor = 'pointer';
      gmailDiv.title = 'Click: Gmail • Double-click: Calendar';
      gmailDiv.onclick = () => window.open('https://mail.google.com', '_blank');
      gmailDiv.ondblclick = () => window.open('https://calendar.google.com', '_blank');
    }
  } catch (error) {
    console.error('Gmail fetch error:', error);
    document.getElementById('gmail-count').innerHTML = 
      `<span style="color: #ff4444;">Failed to load</span>`;
  }
}

// Call it on page load and refresh every 5 minutes
fetchGmailCount();
setInterval(fetchGmailCount, 300000); // 5 minutes
