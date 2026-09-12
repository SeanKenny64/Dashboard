#!/home/sean/Projects/myenv/bin/python3
import datetime
import imaplib
import json
import os
import sys
from zoneinfo import ZoneInfo
from dotenv import load_dotenv

# --- Google API Imports ---
from google.oauth2 import service_account
from googleapiclient.discovery import build

# 1. Load the hidden environment variables
load_dotenv("/home/sean/Projects/dashboard/.env")

# 2. Get credentials from .env
GMAIL_USER = os.getenv("GMAIL_USER")
GMAIL_PASSWORD = os.getenv("GMAIL_PASSWORD")
# Path to the JSON key (same folder as this script)
GOOGLE_CREDENTIALS_FILE = os.path.join(os.path.dirname(__file__), "google_credentials.json")
# Use 'primary' if you shared the calendar with the service account, or the specific calendar ID
CALENDAR_ID = os.getenv("CALENDAR_ID", "primary") 

def get_unread():
    try:
        mail = imaplib.IMAP4_SSL('imap.gmail.com')
        mail.login(GMAIL_USER, GMAIL_PASSWORD)
        mail.select("inbox")
        status, response = mail.search(None, 'UNSEEN')
        count = len(response[0].split())
        mail.logout()
        return {"count": count}
    except Exception as e:
        return {"error": str(e)}

def get_calendar_events():
    try:
        # --- Setup the API connection ---
        SCOPES = ['https://www.googleapis.com/auth/calendar.readonly']
        creds = service_account.Credentials.from_service_account_file(
            GOOGLE_CREDENTIALS_FILE, scopes=SCOPES)
        service = build('calendar', 'v3', credentials=creds)

        # --- Set your local timezone ---
        local_tz = ZoneInfo("Europe/London")

        # --- Get the time window (Now to +7 days) ---
        now = datetime.datetime.now(local_tz)
        window_end = now + datetime.timedelta(days=7)

        # Format for API (must be UTC)
        time_min = now.astimezone(datetime.timezone.utc).isoformat()
        time_max = window_end.astimezone(datetime.timezone.utc).isoformat()

        # --- Call the API ---
        events_result = service.events().list(
            calendarId=CALENDAR_ID,
            timeMin=time_min,
            timeMax=time_max,
            singleEvents=True,  # Ensures recurring events are expanded
            orderBy='startTime'
        ).execute()
        
        events_data = events_result.get('items', [])

        # --- Process the clean API data ---
        events = []
        for event in events_data:
            title = event.get('summary', '(No title)')
            
            # The API provides a 'date' for all-day events and 'dateTime' for timed events
            start = event['start']
            if 'dateTime' in start:
                # Timed event
                start_dt = datetime.datetime.fromisoformat(start['dateTime'].replace('Z', '+00:00'))
                start_dt = start_dt.astimezone(local_tz)
                all_day = False
            else:
                # All-day event (just a date string)
                start_dt = datetime.datetime.combine(
                    datetime.date.fromisoformat(start['date']), 
                    datetime.time.min, 
                    tzinfo=local_tz
                )
                all_day = True

            events.append({
                "title": title,
                "start": start_dt.isoformat(),
                "all_day": all_day,
            })

        events.sort(key=lambda x: x["start"])
        return events

    except Exception as e:
        print(f"Calendar error: {e}", file=sys.stderr)
        return []


def get_panel_data():
    unread_data = get_unread()
    unread_data["calendar"] = get_calendar_events()
    return unread_data

# 6. Output as JSON for the dashboard.html fetch command
print("Content-Type: application/json\n")
print(json.dumps(get_panel_data()))