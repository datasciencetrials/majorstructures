import http.server
import os
import socketserver
import urllib.parse
from pathlib import Path


ROOT = Path(r"D:\nbms_push_recovery_20260624")
PORT = int(os.environ.get("NBMS_PREVIEW_PORT", "4180"))


class Handler(http.server.SimpleHTTPRequestHandler):
    def translate_path(self, path):
        parsed = urllib.parse.urlparse(path).path
        if parsed in {"/uganda_nbms", "/uganda_nbms/"}:
            relative = "index.html"
        elif parsed.startswith("/uganda_nbms/"):
            relative = parsed[len("/uganda_nbms/") :]
        else:
            relative = parsed.lstrip("/") or "index.html"
        relative = os.path.normpath(urllib.parse.unquote(relative)).lstrip("\\/")
        return str(ROOT / relative)

    def log_message(self, fmt, *args):
        return


class ReusableTCPServer(socketserver.TCPServer):
    allow_reuse_address = True


if __name__ == "__main__":
    with ReusableTCPServer(("127.0.0.1", PORT), Handler) as httpd:
        print(f"Serving {ROOT} as /uganda_nbms/ on http://127.0.0.1:{PORT}/uganda_nbms/", flush=True)
        httpd.serve_forever()
