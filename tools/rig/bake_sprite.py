"""
리그 동작을 CSS용 스프라이트 시트로 굽는 도구 (rig_test.html을 헤드리스 Chrome으로 열어 프레임을 찍음)

실행: 프로젝트 루트에서
  python tools/rig/bake_sprite.py kaiju walk 12 64 assets/sprites/rig/kaiju/baby_walk.png
  인자: 캐릭터 클립 프레임수 높이(px) 출력파일

- 배경/이펙트를 끄고 투명 배경으로 한 사이클을 균등하게 찍음
- 모든 프레임을 같은 영역(전체 프레임의 합집합)으로 잘라 흔들림 없이 가로로 이어 붙임
- 같은 이름의 .json에 프레임 크기/수/재생 시간을 기록 (battleFx.js가 CSS 애니메이션에 사용)
"""
import base64
import functools
import http.server
import io
import json
import os
import sys
import threading

from PIL import Image
from playwright.sync_api import sync_playwright


class _Handler(http.server.SimpleHTTPRequestHandler):
    # Windows에서 .js가 text/plain으로 나가 ES 모듈이 막히는 문제 방지
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map, '.js': 'text/javascript'}

    def log_message(self, *args):
        pass


def serve(root):
    httpd = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(_Handler, directory=root))
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd


def main():
    char, clip, count, height, out = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4]), sys.argv[5]
    httpd = serve(os.getcwd())
    url = f'http://127.0.0.1:{httpd.server_address[1]}/rig_test.html?bake=1'
    frames = []
    with sync_playwright() as p:
        browser = p.chromium.launch(channel='chrome')
        page = browser.new_page(viewport={'width': 1400, 'height': 820})
        page.goto(url)
        page.wait_for_function('window.rigTest')
        page.evaluate('window.rigTest.ready')
        page.evaluate('rigTest.pause()')
        page.evaluate(f"rigTest.setCharacter('{char}')")
        page.wait_for_timeout(300)
        for key in ('bg', 'fx', 'scroll'):
            page.evaluate(f"rigTest.setOption('{key}', false)")
        page.evaluate(f"rigTest.setMode('{clip}')")
        duration = page.evaluate(f"rigTest.clipDuration('{clip}')")
        page.evaluate(f'rigTest.step({duration * 2})')   # 전환 보간이 끝난 사이클부터
        for _ in range(count):
            data = page.evaluate("document.getElementById('rig-canvas').toDataURL('image/png')")
            frames.append(Image.open(io.BytesIO(base64.b64decode(data.split(',')[1]))).convert('RGBA'))
            page.evaluate(f'rigTest.step({duration / count})')
        browser.close()
    httpd.shutdown()

    box = None
    for f in frames:
        b = f.getchannel('A').getbbox()
        box = b if box is None else (min(box[0], b[0]), min(box[1], b[1]), max(box[2], b[2]), max(box[3], b[3]))
    x0, y0, x1, y1 = box
    scale = height / (y1 - y0)
    fw = max(1, round((x1 - x0) * scale))
    sheet = Image.new('RGBA', (fw * count, height), (0, 0, 0, 0))
    for i, f in enumerate(frames):
        sheet.paste(f.crop(box).resize((fw, height), Image.LANCZOS), (i * fw, 0))
    os.makedirs(os.path.dirname(out), exist_ok=True)
    sheet.save(out)
    meta = {'frameWidth': fw, 'frameHeight': height, 'frames': count, 'duration': duration}
    with open(os.path.splitext(out)[0] + '.json', 'w', encoding='utf-8') as fp:
        json.dump(meta, fp, indent=2)
    print(out, meta)


if __name__ == '__main__':
    main()
