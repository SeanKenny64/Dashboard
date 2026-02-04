#!/usr/bin/env python3
from http.server import HTTPServer, CGIHTTPRequestHandler
import json
from data_handler import read_data, write_data

class HybridHandler(CGIHTTPRequestHandler):
    """Handler that serves static files, CGI scripts, AND API endpoints"""
    cgi_directories = ['/cgi-bin']
    
    def do_GET(self):
        # Handle API requests
        if self.path == '/api/data' or self.path.startswith('/api/data?'):
            self._handle_api_get()
            return
        
        # Redirect root to dashboard
        if self.path == '/':
            self.path = '/dashboard.html'
        
        # Let parent handle static files and CGI
        super().do_GET()
    
    def do_POST(self):
        # Handle API POST requests
        if self.path.startswith('/api/'):
            self._handle_api_post()
            return
        
        # Let parent handle other POST requests
        super().do_POST()
    
    def _handle_api_get(self):
        """Handle GET /api/data - return current dashboard data"""
        try:
            data = read_data()
            
            # Send response
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
            # Read POST data
            content_length = int(self.headers.get('Content-Length', 0))
            if content_length == 0:
                self.send_error(400, "No data received")
                return
            
            post_data = self.rfile.read(content_length)
            received_data = json.loads(post_data.decode('utf-8'))
            
            # Handle different endpoints
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
    print("=" * 50)
    server.serve_forever()