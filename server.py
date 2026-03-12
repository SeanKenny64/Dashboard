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
        
        super().do_GET()
    
    def do_POST(self):
        if self.path == '/cgi-bin/terminal_exec.py':
            self._handle_terminal_exec()
            return

        if self.path == '/cgi-bin/save_checkin.py':
            self._handle_save_checkin()
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
                ['task', '+oostock', 'pri:H', 'export'],
                capture_output=True,
                text=True,
                timeout=5,
                cwd=os.path.expanduser("~")
            )
            # Strip control characters that task sometimes adds to export output
            clean = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f]', '', result.stdout)
            tasks = json.loads(clean) if clean.strip() else []
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
    print("API:      /api/data (GET), /api/save-notes (POST)")
    print("CGI:      /cgi-bin/terminal_exec.py, /cgi-bin/save_checkin.py")
    print("=" * 50)
    server.serve_forever()