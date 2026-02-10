#!/home/sean/Projects/myenv/bin/python3
import datetime
import imaplib
import json
import os
import urllib.request
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


def _ical_unescape(text):
    return (
        text.replace("\\n", "\n")
        .replace("\\,", ",")
        .replace("\\;", ";")
        .replace("\\\\", "\\")
    )


def _parse_ics_datetime(raw_value):
    value = raw_value.strip()
    if not value:
        return None, False

    # Date-only entry (all-day event)
    if len(value) == 8 and value.isdigit():
        day = datetime.datetime.strptime(value, "%Y%m%d").date()
        return datetime.datetime.combine(day, datetime.time.min), True

    # UTC timestamp
    if value.endswith("Z"):
        dt = datetime.datetime.strptime(value, "%Y%m%dT%H%M%SZ")
        return dt.replace(tzinfo=datetime.timezone.utc).astimezone(), False

    # Local timestamp without explicit timezone
    dt = datetime.datetime.strptime(value, "%Y%m%dT%H%M%S")
    return dt, False


def _extract_prop(event_lines, prop_name):
    prefix = f"{prop_name}:"
    for line in event_lines:
        if line.startswith(prefix):
            return line[len(prefix):]
        if line.startswith(f"{prop_name};") and ":" in line:
            return line.split(":", 1)[1]
    return ""


def get_calendar_events():
    if not GCAL_ICAL_URL:
        return []

    try:
        with urllib.request.urlopen(GCAL_ICAL_URL, timeout=5) as response:
            ics_text = response.read().decode("utf-8", errors="replace")

        # Unfold folded ICS lines (continuation starts with space/tab)
        unfolded = []
        for line in ics_text.splitlines():
            if unfolded and (line.startswith(" ") or line.startswith("\t")):
                unfolded[-1] += line[1:]
            else:
                unfolded.append(line)

        now = datetime.datetime.now().astimezone()
        events = []
        in_event = False
        current_event = []

        for line in unfolded:
            if line == "BEGIN:VEVENT":
                in_event = True
                current_event = []
                continue
            if line == "END:VEVENT" and in_event:
                title = _ical_unescape(_extract_prop(current_event, "SUMMARY")) or "(No title)"
                start_raw = _extract_prop(current_event, "DTSTART")
                if start_raw:
                    start_dt, all_day = _parse_ics_datetime(start_raw)
                    if start_dt and start_dt.astimezone() >= now:
                        events.append(
                            {
                                "title": title,
                                "start": start_dt.isoformat(),
                                "all_day": all_day,
                            }
                        )
                in_event = False
                current_event = []
                continue
            if in_event:
                current_event.append(line)

        events.sort(key=lambda x: x["start"])
        return events[: max(GCAL_MAX_EVENTS, 1)]
    except Exception:
        return []


def get_panel_data():
    unread_data = get_unread()
    unread_data["calendar"] = get_calendar_events()
    return unread_data

# 6. Output as JSON for the dashboard.html fetch command
print("Content-Type: application/json\n")
print(json.dumps(get_panel_data()))