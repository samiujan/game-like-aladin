# No-cache static dev server (so code edits show up on refresh).
# Run from anywhere: python3 tools/devserver.py [port]
import http.server, os, sys

port = int(sys.argv[1]) if len(sys.argv) > 1 else 8410
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(root)

class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, must-revalidate')
        self.send_header('Expires', '0')
        super().end_headers()
    def log_message(self, *a):
        pass

http.server.ThreadingHTTPServer(('127.0.0.1', port), Handler).serve_forever()
