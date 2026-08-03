"""自定义 no-cache HTTP 服务器，强制禁用浏览器缓存"""
from http.server import SimpleHTTPRequestHandler, HTTPServer
import os
import sys

class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

if __name__ == '__main__':
    port = 8765
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    server = HTTPServer(('0.0.0.0', port), NoCacheHandler)
    print(f'No-cache HTTP server running on http://localhost:{port}/')
    print(f'Workdir: {os.getcwd()}')
    sys.stdout.flush()
    server.serve_forever()
