"""
파견 일러스트 만들기 (D-070, js/ui_v2/dispatchUi_v2.js DISPATCH_ZONES)

원본: assets/sprites/dispatch/src/zone<N>_<trek|return>_gemini.png (Gemini "이미지 복사" 1024×572, 로고 있음)
출력: assets/sprites/dispatch/
  zone<N>_trek.webp   = 로고 지움 → 그림 + 좌우 뒤집은 그림을 이어 붙인 띠(32:9) → 높이 352px (장면 176px × 2배)
                        좌우 거울이라 이음매가 맞아 끊김 없이 흐름
  zone<N>_return.webp = 로고 지움 → 1024×572 그대로 (귀환 장면 배경)

실행: python tools/images/build_dispatch_art.py
"""
import os
import sys

import numpy as np
from PIL import Image, ImageOps

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE)
from unlogo import load_clean  # noqa: E402

DIR = os.path.join(ROOT, 'assets', 'sprites', 'dispatch')
TREK_H = 352
QUALITY = 88


def main():
    for z in (1, 2, 3, 4):
        for kind in ('trek', 'return'):
            src = os.path.join(DIR, 'src', f'zone{z}_{kind}_gemini.png')
            if not os.path.exists(src):
                print('없음:', src)
                continue
            rgb, cleaned = load_clean(src)
            im = Image.fromarray(rgb)
            if kind == 'trek':
                strip = Image.new('RGB', (im.width * 2, im.height))
                strip.paste(im, (0, 0))
                strip.paste(ImageOps.mirror(im), (im.width, 0))
                im = strip.resize((round(strip.width * TREK_H / strip.height), TREK_H), Image.LANCZOS)
            out = os.path.join(DIR, f'zone{z}_{kind}.webp')
            im.save(out, 'WEBP', quality=QUALITY, method=6)
            print(f'{os.path.relpath(out, ROOT)} {im.size} {os.path.getsize(out) // 1024}KB 로고{"지움" if cleaned else " 못 찾음"}')


if __name__ == '__main__':
    main()
