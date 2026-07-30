#!/usr/bin/env python3
"""Static server for dev/preview: python3 -m http.server plus
- Cache-Control: no-cache on every response, so the browser revalidates each
  script on reload and an edited file can never be served stale;
- POST /__shot?name=<file>.png|.jpg accepting a data-URL body, written under
  /tmp for the test harness to save canvas screenshots (dev-only tooling)."""
import base64
import http.server
import os
import sys
import urllib.parse

SHOT_DIR = os.environ.get('SHOT_DIR', '/tmp/game-shots')


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path != '/__shot':
            self.send_error(404)
            return
        name = urllib.parse.parse_qs(parsed.query).get('name', ['shot.png'])[0]
        name = os.path.basename(name)  # no traversal
        body = self.rfile.read(int(self.headers.get('Content-Length', 0))).decode()
        if body.startswith('data:'):
            body = body.split(',', 1)[1]
        os.makedirs(SHOT_DIR, exist_ok=True)
        path = os.path.join(SHOT_DIR, name)
        with open(path, 'wb') as f:
            f.write(base64.b64decode(body))
        self.send_response(200)
        self.end_headers()
        self.wfile.write(path.encode())


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    http.server.ThreadingHTTPServer(('', port), NoCacheHandler).serve_forever()
