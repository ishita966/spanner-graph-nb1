# Copyright 2025 Google LLC

# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at

#     https://www.apache.org/licenses/LICENSE-2.0

# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

import os
import sys
import threading
import http.server
import socketserver
from pathlib import Path

# Add the project root to Python path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from spanner_graphs.graph_server import GraphServer

class FrontendServer:
    def __init__(self, port=8000):
        self.port = port
        self.server = None
        
    def start(self):
        # Change to the frontend directory
        os.chdir(str(project_root / 'frontend'))
        
        # Create handler that allows CORS and injects the GraphServer port
        class DevServerHandler(http.server.SimpleHTTPRequestHandler):
            def end_headers(self):
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
                self.send_header('Access-Control-Allow-Headers', 'Content-Type')
                super().end_headers()
                
            def do_OPTIONS(self):
                self.send_response(200)
                self.end_headers()

            def do_GET(self):
                if self.path == "/" or self.path == "/index.html":
                    # Redirect to dev.html
                    self.send_response(302)
                    self.send_header('Location', '/static/dev.html')
                    self.end_headers()
                    return
                
                # Special handling for dev.html to inject the port
                if self.path == "/static/dev.html":
                    try:
                        with open(os.path.join(os.getcwd(), "static/dev.html"), 'r') as f:
                            content = f.read()
                            # Inject the GraphServer port
                            content = content.replace("{{PORT}}", str(GraphServer.port))
                            
                            self.send_response(200)
                            self.send_header('Content-type', 'text/html')
                            self.end_headers()
                            self.wfile.write(content.encode())
                            return
                    except Exception as e:
                        print(f"Error serving dev.html: {e}")
                        self.send_error(500, "Internal Server Error")
                        return
                
                # Default handling for all other files
                super().do_GET()
        
        # Start the server
        class ThreadedTCPServer(socketserver.TCPServer):
            allow_reuse_address = True
            daemon_threads = True
            
        self.server = ThreadedTCPServer(("", self.port), DevServerHandler)
        print(f"\nFrontend server started at http://localhost:{self.port}")
        print(f"Visit http://localhost:{self.port}/static/dev.html to access the development interface")
        self.server.serve_forever()
    
    def stop(self):
        if self.server:
            self.server.shutdown()
            self.server.server_close()

def main():
    try:
        # Start the graph server first (it creates its own thread internally)
        graph_server_thread = GraphServer.init()
        
        # Start the frontend server in a separate thread
        frontend_server = FrontendServer()
        frontend_thread = threading.Thread(target=frontend_server.start)
        frontend_thread.daemon = True
        frontend_thread.start()
        
        print("\nPress Ctrl+C to stop the servers...")
        # Keep the main thread alive
        frontend_thread.join()
        
    except KeyboardInterrupt:
        print("\nShutting down servers...")
        frontend_server.stop()
        GraphServer.stop_server()
        sys.exit(0)

if __name__ == "__main__":
    main() 