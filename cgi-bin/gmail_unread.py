#!/home/sean/Projects/myenv/bin/python3
import datetime
import imaplib
import json
import os
import urllib.request
from icalendar import Calendar
import recurring_ical_events
from dotenv import load_dotenv

# 1. Load the hidden environment variables
load_dotenv("/home/sean/Projects/dashboard/.env")

# 2. Get credentials from .env (no longer hardcoded for security)
GMAIL_USER = os.getenv("GMAIL_USER")
GMAIL_PASSWORD = os.getenv("GMAIL_PASSWORD")
GCAL_ICAL_URL = os.getenv("GCAL_ICAL_URL", "").strip()
GCAL_MAX_EVENTS = int(os.getenv("GCAL_MAX_EVENTS", "4"))

def get_unread():
    try:
        # 3. Connect and Login
        mail = imaplib.IMAP4_SSL('imap.gmail.com')
        mail.login(GMAIL_USER, GMAIL_PASSWORD)
        
        # 4. Check the inbox for unread messages
        mail.select("inbox")
        status, response = mail.search(None, 'UNSEEN')
        
        # 5. Count the messages
        count = len(response[0].split())
        mail.logout()
        return {"count": count}
    except Exception as e:
        return {"error": str(e)}


def get_calendar_events():
    if not GCAL_ICAL_URL:
        return []

    try:
        with urllib.request.urlopen(GCAL_ICAL_URL, timeout=5) as response:
            ics_data = response.read()

        cal = Calendar.from_ical(ics_data)
        now = datetime.datetime.now(datetime.timezone.utc)
        window_end = now + datetime.timedelta(days=7)

        occurrences = recurring_ical_events.of(cal).between(now, window_end)

        events = []
        for component in occurrences:
            title = str(component.get("SUMMARY", "(No title)"))
            dtstart = component.get("DTSTART").dt

            # Handle date vs datetime
            if isinstance(dtstart, datetime.date) and not isinstance(dtstart, datetime.datetime):
                start_dt = datetime.datetime.combine(dtstart, datetime.time.min, tzinfo=datetime.timezone.utc)
                all_day = True
            else:
                if dtstart.tzinfo is None:
                    dtstart = dtstart.replace(tzinfo=datetime.timezone.utc)
                start_dt = dtstart
                all_day = False

            events.append({
                "title": title,
                "start": start_dt.isoformat(),
                "all_day": all_day,
            })

        events.sort(key=lambda x: x["start"])
        return events

    except Exception:
        return []


def get_panel_data():
    unread_data = get_unread()
    unread_data["calendar"] = get_calendar_events()
    return unread_data

# 6. Output as JSON for the dashboard.html fetch command
print("Content-Type: application/json\n")
print(json.dumps(get_panel_data()))