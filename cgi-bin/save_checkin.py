#!/usr/bin/env python3
import json
import sys
import os
from datetime import date

print("Content-Type: application/json\n")

try:
    length = int(os.environ.get('CONTENT_LENGTH', 0))
    data = sys.stdin.read(length)
    payload = json.loads(data) if data else {}
except Exception:
    payload = {}

filename = "../data/checkins.json"

# Load existing data
if os.path.exists(filename):
    with open(filename, "r") as f:
        try:
            checkins = json.load(f)
        except Exception:
            checkins = []
else:
    checkins = []

today = str(date.today())

entry = {
    "date": today,
    "drink": payload.get("drink", 0),
    "smoked": payload.get("smoked", False),
    "sleep": payload.get("sleep", ""),
    "civ": payload.get("civ", False)
}

# Remove today's entry if it exists
checkins = [c for c in checkins if c.get("date") != today]
checkins.append(entry)

with open(filename, "w") as f:
    json.dump(checkins, f, indent=2)

print(json.dumps({"status": "ok"}))
