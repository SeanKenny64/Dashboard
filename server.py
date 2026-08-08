#!/usr/bin/env python3
from http.server import HTTPServer, CGIHTTPRequestHandler
import json
import subprocess
import os
import re
import urllib.parse
from datetime import date
from data_handler import read_data, write_data

class HybridHandler(CGIHTTPRequestHandler):
    """Handler that serves static files, CGI scripts, AND API endpoints"""
    cgi_directories = ['/cgi-bin']
    
    # Whitelist of allowed commands
    ALLOWED_COMMANDS = ['td', 'ta', 't', 'task', 'tl', 'tn', 'tm', 'tdel', 'arena']
    
    def execute_terminal_command(self, command):
        """Execute a whitelisted terminal command"""
        try:
            parts = command.strip().split()
            if not parts:
                return {"error": "Empty command"}
            
            cmd_name = parts[0]
            
            if cmd_name not in self.ALLOWED_COMMANDS:
                return {"error": f"Command '{cmd_name}' not allowed. Allowed: {', '.join(self.ALLOWED_COMMANDS)}"}
            
            aliases = """
shopt -s expand_aliases
alias tm='task modify'
alias ta='task add'
alias td='task done'
alias t='task'
alias tdel='task delete'
"""
            full_command = f'{aliases}\n{command} rc.confirmation=no'
            
            result = subprocess.run(
                full_command,
                shell=True,
                executable='/bin/bash',
                capture_output=True,
                text=True,
                timeout=5,
                cwd=os.path.expanduser("~")
            )
            
            return {
                "stdout": result.stdout,
                "stderr": result.stderr,
                "returncode": result.returncode
            }
            
        except subprocess.TimeoutExpired:
            return {"error": "Command timed out"}
        except Exception as e:
            return {"error": f"Execution error: {str(e)}"}
    
    def do_GET(self):
        if self.path == '/api/shopping':
            self._handle_shopping()
            return

        if self.path == '/api/data' or self.path.startswith('/api/data?'):
            self._handle_api_get()
            return
        
        if self.path == '/':
            self.path = '/dashboard.html'

        if self.path == '/api/weather':
            self._handle_weather()
            return

        if self.path == '/api/food-diary/recent':
            self._handle_food_diary_recent()
            return
        
        super().do_GET()
    
    def do_POST(self):
        if self.path == '/cgi-bin/terminal_exec.py':
            self._handle_terminal_exec()
            return

        if self.path == '/cgi-bin/save_checkin.py':
            self._handle_save_checkin()
            return

        if self.path == '/api/food-diary':
            self._handle_food_diary_post()
            return

        if self.path == '/api/notes-logseq':
            self._handle_notes_logseq_post()
            return
        
        if self.path.startswith('/api/'):
            self._handle_api_post()
            return
        
        super().do_POST()
    
    def _handle_terminal_exec(self):
        """Handle POST /cgi-bin/terminal_exec.py - execute terminal commands"""
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            if content_length == 0:
                self.send_error(400, "No command provided")
                return
            
            post_data = self.rfile.read(content_length).decode('utf-8')
            params = urllib.parse.parse_qs(post_data)
            command = params.get('command', [''])[0]
            
            if not command:
                self.send_error(400, "No command provided")
                return
            
            result = self.execute_terminal_command(command)
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(result).encode())
            
            print(f"✓ TERMINAL: {command} (exit code: {result.get('returncode', 'N/A')})")
            
        except Exception as e:
            print(f"✗ TERMINAL ERROR: {e}")
            self.send_error(500, f"Server error: {e}")

    def _handle_weather(self):
        """Proxy weather data from wttr.in to avoid CORS"""
        try:
            import urllib.request
            with urllib.request.urlopen('http://wttr.in/Bristol?format=j1', timeout=5) as r:
                data = r.read()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(data)
            print("✓ WEATHER: fetched OK")
        except Exception as e:
            print(f"✗ WEATHER ERROR: {e}")
            self.send_error(500, f"Weather fetch failed: {e}")        

    def _handle_save_checkin(self):
        """Handle POST /cgi-bin/save_checkin.py - save daily check-in data"""
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            if content_length == 0:
                self.send_error(400, "No data received")
                return

            post_data = self.rfile.read(content_length)
            payload = json.loads(post_data.decode('utf-8'))

            today = str(date.today())
            filename = os.path.join(os.path.dirname(__file__), 'data', 'checkins.json')

            if os.path.exists(filename):
                with open(filename, 'r') as f:
                    try:
                        checkins = json.load(f)
                    except Exception:
                        checkins = []
            else:
                checkins = []

            entry = {
                "date":   today,
                "drink":  payload.get("drink", ""),
                "smoked": payload.get("smoked", ""),
                "sleep":  payload.get("sleep", ""),
                "civ":    payload.get("civ", "")
            }

            checkins = [c for c in checkins if c.get("date") != today]
            checkins.append(entry)

            with open(filename, 'w') as f:
                json.dump(checkins, f, indent=2)

            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({"status": "ok"}).encode())
            print(f"✓ CHECKIN: {entry}")

        except Exception as e:
            print(f"✗ CHECKIN ERROR: {e}")
            self.send_error(500, f"Server error: {e}")

    def _handle_shopping(self):
        """Handle GET /api/shopping - return high-priority out-of-stock groceries from Taskwarrior"""
        try:
            result = subprocess.run(
                ['task', '+oostock', '+groceries', 'pri:H', 'export'],
                capture_output=True,
                text=True,
                timeout=5,
                cwd=os.path.expanduser("~")
            )
            # Strip control characters that task sometimes adds to export output
            clean = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f]', '', result.stdout)
            all_tasks = json.loads(clean) if clean.strip() else []
            tasks = [t for t in all_tasks if t.get('status') == 'pending']
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(tasks).encode())
            print(f"✓ SHOPPING: returned {len(tasks)} items")
        except Exception as e:
            print(f"✗ SHOPPING ERROR: {e}")
            self.send_error(500, f"Server error: {e}")

    def _handle_api_get(self):
        """Handle GET /api/data - return current dashboard data"""
        try:
            data = read_data()
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(data).encode())
            
            print(f"✓ GET {self.path} - Sent data")
        except Exception as e:
            print(f"✗ GET {self.path} - Error: {e}")
            self.send_error(500, f"Server error: {e}")

    def _handle_food_diary_post(self):
        """Handle POST /api/food-diary - save entry to Logseq journal"""
        try:
            from datetime import datetime
            import email
            from email import policy as email_policy

            LOGSEQ_JOURNALS = os.path.expanduser('~/Documents/LogSeq/journals')
            LOGSEQ_ASSETS   = os.path.expanduser('~/Documents/LogSeq/assets')
            FOOD_LOG        = os.path.expanduser('~/Documents/LogSeq/assets/food_diary_log.json')

            content_type   = self.headers.get('Content-Type', '')
            content_length = int(self.headers.get('Content-Length', 0))
            body           = self.rfile.read(content_length)

            # Parse multipart form data using Python's email parser (no cgi module needed)
            raw = b'Content-Type: ' + content_type.encode() + b'\r\n\r\n' + body
            msg = email.message_from_bytes(raw, policy=email_policy.compat32)

            text       = ''
            photo_name = None
            photo_md   = ''
            now        = datetime.now()
            timestamp  = now.strftime('%H:%M')
            date_str   = now.strftime('%Y_%m_%d')

            for part in msg.get_payload():
                disposition = part.get('Content-Disposition', '')
                if 'name="text"' in disposition:
                    text = part.get_payload(decode=True).decode('utf-8', errors='replace').strip()
                elif 'name="photo"' in disposition and 'filename=' in disposition:
                    filename = disposition.split('filename=')[-1].strip().strip('"')
                    if filename:
                        os.makedirs(LOGSEQ_ASSETS, exist_ok=True)
                        safe_name  = f"food_{now.strftime('%Y%m%d_%H%M%S')}_{os.path.basename(filename)}"
                        photo_path = os.path.join(LOGSEQ_ASSETS, safe_name)
                        with open(photo_path, 'wb') as f:
                            f.write(part.get_payload(decode=True))
                        photo_md   = f'\n  - ![{safe_name}](../assets/{safe_name})'
                        photo_name = safe_name

            # Write to Logseq journal
            logseq_block = f'- 🍽️ #FoodDiary {timestamp}: {text}{photo_md}\n'
            os.makedirs(LOGSEQ_JOURNALS, exist_ok=True)
            journal_file = os.path.join(LOGSEQ_JOURNALS, f'{date_str}.md')
            with open(journal_file, 'a', encoding='utf-8') as f:
                f.write(logseq_block)

            # Update JSON log for dashboard recent feed
            log = []
            if os.path.exists(FOOD_LOG):
                with open(FOOD_LOG, 'r') as f:
                    try:
                        log = json.load(f)
                    except Exception:
                        log = []
            log.insert(0, {
                'time':  now.strftime('%d %b %H:%M'),
                'text':  text,
                'photo': photo_name
            })
            log = log[:50]
            with open(FOOD_LOG, 'w') as f:
                json.dump(log, f, indent=2)

            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({'ok': True}).encode())
            print(f"✓ FOOD DIARY: {timestamp} — {text[:40] if text else '[photo only]'}")

        except Exception as e:
            print(f"✗ FOOD DIARY ERROR: {e}")
            self.send_error(500, f"Server error: {e}")

    def _handle_food_diary_recent(self):
        """Handle GET /api/food-diary/recent - return recent food diary entries"""
        try:
            FOOD_LOG = os.path.expanduser('~/Documents/LogSeq/assets/food_diary_log.json')
            log = []
            if os.path.exists(FOOD_LOG):
                with open(FOOD_LOG, 'r') as f:
                    log = json.load(f)
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({'entries': log[:10]}).encode())
        except Exception as e:
            print(f"✗ FOOD DIARY RECENT ERROR: {e}")
            self.send_error(500, f"Server error: {e}")

    def _handle_notes_logseq_post(self):
        """Handle POST /api/notes-logseq - save note to Logseq journal"""
        try:
            from datetime import datetime

            LOGSEQ_JOURNALS = os.path.expanduser('~/Documents/LogSeq/journals')

            content_length = int(self.headers.get('Content-Length', 0))
            if content_length == 0:
                self.send_error(400, "No data received")
                return

            post_data = self.rfile.read(content_length)
            payload = json.loads(post_data.decode('utf-8'))
            text = payload.get('notes', '').strip()

            if not text:
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({'ok': True, 'note': 'empty'}).encode())
                return

            now = datetime.now()
            timestamp = now.strftime('%H:%M')
            date_str = now.strftime('%Y_%m_%d')

            logseq_block = f'- 📝 {timestamp}: {text}\n'
            os.makedirs(LOGSEQ_JOURNALS, exist_ok=True)
            journal_file = os.path.join(LOGSEQ_JOURNALS, f'{date_str}.md')
            with open(journal_file, 'a', encoding='utf-8') as f:
                f.write(logseq_block)

            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({'ok': True}).encode())
            print(f"✓ NOTES: {timestamp} — {text[:60]}")

        except Exception as e:
            print(f"✗ NOTES ERROR: {e}")
            self.send_error(500, f"Server error: {e}")

    def _handle_api_post(self):
        """Handle POST /api/save-notes and other API endpoints"""
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            if content_length == 0:
                self.send_error(400, "No data received")
                return
            
            post_data = self.rfile.read(content_length)
            received_data = json.loads(post_data.decode('utf-8'))
            
            if self.path == '/api/save-notes':
                current = read_data()
                current['notes'] = received_data.get('notes', '')
                write_data(current)
                
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({"status": "saved", "type": "notes"}).encode())
                
                print(f"✓ POST {self.path} - Saved notes ({len(current['notes'])} chars)")
            
            else:
                self.send_error(404, f"Unknown endpoint: {self.path}")
        
        except json.JSONDecodeError:
            print(f"✗ POST {self.path} - Invalid JSON")
            self.send_error(400, "Invalid JSON")
        except Exception as e:
            print(f"✗ POST {self.path} - Error: {e}")
            self.send_error(500, f"Server error: {e}")

if __name__ == "__main__":
    server = HTTPServer(('0.0.0.0', 8000), HybridHandler)
    print("=" * 50)
    print("🚀 Dashboard Server Started")
    print("=" * 50)
    print("URL:      http://localhost:8000")
    print("Features: Static files + CGI + API")
    print("API:      /api/data (GET), /api/save-notes (POST), /api/food-diary (POST), /api/notes-logseq (POST)")
    print("CGI:      /cgi-bin/terminal_exec.py, /cgi-bin/save_checkin.py")
    print("=" * 50)
    server.serve_forever()