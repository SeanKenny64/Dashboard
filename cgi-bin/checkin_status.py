#!/usr/bin/env python3
import json
import os
from datetime import date

print("Content-Type: application/json\n")

filename = "../data/checkins.json"
today = str(date.today())

checked_in = False

if os.path.exists(filename):
    try:
        with open(filename, "r") as f:
            checkins = json.load(f)
        checked_in = any(c.get("date") == today for c in checkins)
    except Exception:
        checked_in = False

print(json.dumps({"status": "ok", "checked_in": checked_in, "date": today}))
