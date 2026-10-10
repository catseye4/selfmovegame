"""
Gemini 그림에 여백 붙이기 — 캐릭터가 그림에 꽉 차 가장자리에 붙었을 때 (새 캐릭터 1단계, D-044)

Gemini에게 "줌아웃"을 부탁하면 정사각형으로 바꾸며 오히려 양옆을 잘라 버리는 일이 많아(성녀 1단계), 직접 넓힌다.
  python tools/images/pad_image.py <원본> <저장> [green|magenta] [여백 비율 0.13]
- 배경(크로마키)을 순수 단색으로 바꿔 붙인 여백과 이음새가 안 보이게
- 오른쪽 아래 Gemini 로고 자리는 캐릭터가 없으면 지움
- 캐릭터를 가운데 두고 사방에 여백(캐릭터 큰 변 × 비율)을 둔 정사각형 → 1024×1024
"""
import sys

import numpy as np
from PIL import Image

KEY = {'green': (0, 255, 0), 'magenta': (255, 0, 255)}


def keyness(a, key):
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    return (g - np.maximum(r, b)) if key == 'green' else (np.minimum(r, b) - g)


def pad(src, dst, key='green', margin=0.13, size=1024):
    a = np.asarray(Image.open(src).convert('RGB')).astype(int)
    H, W = a.shape[:2]
    bg = keyness(a, key) > 60
    logo = np.zeros_like(bg)
    logo[int(H * 0.86):, int(W * 0.83):] = True
    if not (~bg & logo).sum() > 400:          # 로고 자리에 캐릭터가 없으면 로고째 지움
        bg |= logo
    a[bg] = KEY[key]
    ys, xs = np.nonzero(~bg)
    x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
    side = int(max(x1 - x0, y1 - y0) * (1 + 2 * margin))
    canvas = np.zeros((side, side, 3), np.uint8)
    canvas[:] = KEY[key]
    ox, oy = side // 2 - (x0 + x1) // 2, side // 2 - (y0 + y1) // 2
    cx0, cy0 = max(0, ox), max(0, oy)
    sx0, sy0 = cx0 - ox, cy0 - oy
    w, h = min(W - sx0, side - cx0), min(H - sy0, side - cy0)
    canvas[cy0:cy0 + h, cx0:cx0 + w] = a[sy0:sy0 + h, sx0:sx0 + w].astype(np.uint8)
    Image.fromarray(canvas).resize((size, size), Image.LANCZOS).save(dst)
    print(f'{src} → {dst}: 캐릭터 {x1 - x0}×{y1 - y0}px, 정사각형 {side}px → {size}px')


if __name__ == '__main__':
    pad(sys.argv[1], sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else 'green',
        float(sys.argv[4]) if len(sys.argv) > 4 else 0.13)
