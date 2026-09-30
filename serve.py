import http.server, socketserver

PORT = 8099
H = http.server.SimpleHTTPRequestHandler
# Windows에서 .js가 text/plain으로 나가 ES 모듈이 차단되는 문제를 막는다.
H.extensions_map['.js']  = 'text/javascript'
H.extensions_map['.mjs'] = 'text/javascript'
H.extensions_map['.css'] = 'text/css'


# 브라우저가 이미지를 한꺼번에 요청해도 연결이 거부되지 않도록 요청마다 스레드로 처리하고 대기열을 늘린다.
class Server(socketserver.ThreadingMixIn, socketserver.TCPServer):
    allow_reuse_address = True
    daemon_threads = True
    request_queue_size = 64


with Server(('0.0.0.0', PORT), H) as httpd:
    print(f'serving on http://localhost:{PORT}/')
    httpd.serve_forever()
