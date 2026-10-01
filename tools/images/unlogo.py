"""
Gemini 그림 오른쪽 아래의 반투명 별 로고를 지운다 (역합성)

로고 = 흰색을 알파 a로 덮은 것: 보이는 색 = a·255 + (1-a)·원래 색
                               → 원래 색 = (보이는 색 - a·255) / (1-a)
알파 지도는 로고가 초록 배경 위에만 찍혀 있던 그림에서 잼: 765×1024는 요새 그림 3장(세 장 상관 0.999), 1024×1024는 경비병 그림.
로고는 그림 크기마다 자리가 정해져 있다. 잰 크기(LOGOS)는 그대로 쓰고, 처음 보는 크기는
로고 크기·여백이 √(가로×세로)에 비례해 오른쪽 아래에 붙는다는 점(765×1024 ↔ 1024×1024 ↔ 1024×572 실측)으로
1024×1024 지도를 늘리거나 줄여 쓴다. 로고가 단색 위에만 있는 그림이 생기면 measure()로 재서 LOGOS에 추가한다.

실행 (알파 지도 다시 재기): python tools/images/unlogo.py measure <로고가 초록 위에만 있는 그림>... <x> <y>
"""
import os
import sys

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SIZE = 80   # 로고를 덮는 정사각형 크기(px)
# 그림 크기 → 알파 지도 파일, 정사각형 왼쪽 위 좌표
LOGOS = {
    (765, 1024): {'alpha': 'gemini_logo_765x1024.png', 'x': 625, 'y': 885},
    (1024, 1024): {'alpha': 'gemini_logo_1024x1024.png', 'x': 864, 'y': 864},   # 정사각형 (경비병 1단계에서 잼)
}


def _alpha(spec):
    return np.asarray(Image.open(os.path.join(HERE, spec['alpha']))).astype(np.float32) / 255


def _unblend(region, a):
    return np.clip((region - a[..., None] * 255) / (1 - a[..., None]), 0, 255)


def _scaled(rgb):
    """처음 보는 크기: 1024×1024 지도를 √(w·h)/1024배로 늘리거나 줄여 오른쪽 아래에 붙임.
    예측 자리 둘레의 고정된 창 안에서, 지운 뒤가 가장 매끈한(남은 윤곽선이 없는) 자리·크기를 고른다 (±4px, ±8%)."""
    h, w = rgb.shape[:2]
    base = LOGOS[(1024, 1024)]
    src = Image.fromarray((_alpha(base) * 255).astype(np.uint8))
    img = rgb.astype(np.float32)
    k0 = (w * h) ** 0.5 / 1024
    n0 = round(SIZE * k0)
    wx, wy = round(w - (1024 - base['x']) * k0) - 10, round(h - (1024 - base['y']) * k0) - 10
    wn = n0 + 20                                            # 고정 창 (모든 후보를 같은 곳에서 비교)
    if wx < 0 or wy < 0 or wx + wn > w or wy + wn > h:
        return None, -1, -1
    win = img[wy:wy + wn, wx:wx + wn]

    def score(out):
        g = out.mean(axis=2)
        return np.abs(np.diff(g, axis=0)).mean() + np.abs(np.diff(g, axis=1)).mean()

    best = (score(win), None, -1, -1)                       # 아무것도 안 지운 상태보다 나아야 함
    for ks in np.arange(0.92, 1.081, 0.02):
        k = k0 * ks
        n = max(8, round(SIZE * k))
        a = np.asarray(src.resize((n, n), Image.BILINEAR)).astype(np.float32) / 255
        x0, y0 = round(w - (1024 - base['x']) * k), round(h - (1024 - base['y']) * k)
        for dy in range(-4, 5):
            for dx in range(-4, 5):
                x, y = x0 + dx, y0 + dy
                if x < wx or y < wy or x + n > wx + wn or y + n > wy + wn:
                    continue
                out = win.copy()
                out[y - wy:y - wy + n, x - wx:x - wx + n] = _unblend(img[y:y + n, x:x + n], a)
                sc = score(out)
                if sc < best[0]:
                    best = (sc, a, x, y)
    return best[1:]


def clean(rgb):
    """RGB 배열에서 로고를 지운 새 배열과 지웠는지 여부를 돌려준다."""
    h, w = rgb.shape[:2]
    spec = LOGOS.get((w, h))
    if spec:
        a, x, y = _alpha(spec), spec['x'], spec['y']
    else:
        a, x, y = _scaled(rgb)
    if a is None:
        return rgb, False
    n = a.shape[0]
    out = rgb.astype(np.float32).copy()
    out[y:y + n, x:x + n] = _unblend(out[y:y + n, x:x + n], a)
    return out.round().astype(np.uint8), True


def load_clean(path):
    return clean(np.asarray(Image.open(path).convert('RGB')))


def measure(paths, x, y):
    """로고가 단색 크로마키 배경 위에만 있는 그림들로 알파 지도를 잰다 (빨강·파랑 채널이 흰색 쪽으로 오른 만큼)."""
    maps = []
    for p in paths:
        o = np.asarray(Image.open(p).convert('RGB')).astype(np.float32)[y:y + SIZE, x:x + SIZE]
        r0, b0 = np.median(o[..., 0]), np.median(o[..., 2])
        maps.append(np.clip(((o[..., 0] - r0) / (255 - r0) + (o[..., 2] - b0) / (255 - b0)) / 2, 0, 1))
    a = np.mean(maps, axis=0)
    a[a < 0.01] = 0
    return a


if __name__ == '__main__':
    if len(sys.argv) < 5 or sys.argv[1] != 'measure':
        print(__doc__)
        sys.exit(2)
    *paths, x, y = sys.argv[2:]
    a = measure(paths, int(x), int(y))
    w, h = Image.open(paths[0]).size
    out = os.path.join(HERE, f'gemini_logo_{w}x{h}.png')
    Image.fromarray((a * 255).round().astype(np.uint8)).save(out)
    print(f'saved {out} (max alpha {a.max():.3f}) → LOGOS[({w}, {h})] = {{"x": {x}, "y": {y}}}')
