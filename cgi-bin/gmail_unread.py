#!/home/sean/Projects/myenv/bin/python3
import imaplib  # Required to connect to Gmail's server
import os       # Required to read your secrets from the .env file
import json     # Required to format the data for your dashboard
from dotenv import load_dotenv # Required to load the .env file

# 1. Load the hidden environment variables
load_dotenv("/home/sean/Tools/dashboard/.env")

# 2. Get credentials from .env (no longer hardcoded for security)
GMAIL_USER = os.getenv("GMAIL_USER")
GMAIL_PASSWORD = os.getenv("GMAIL_PASSWORD")

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

# 6. Output as JSON for the dashboard.html fetch command
print("Content-Type: application/json\n")
print(json.dumps(get_unread()))
