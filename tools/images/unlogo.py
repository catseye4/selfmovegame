"""
Gemini 그림 오른쪽 아래의 반투명 별 로고를 지운다 (역합성)

로고 = 흰색을 알파 a로 덮은 것: 보이는 색 = a·255 + (1-a)·원래 색
                               → 원래 색 = (보이는 색 - a·255) / (1-a)
알파 지도는 로고가 초록 배경 위에만 찍혀 있던 그림에서 잼: 765×1024는 요새 그림 3장(세 장 상관 0.999), 1024×1024는 경비병 그림.
로고는 그림 크기마다 자리가 정해져 있으므로 같은 크기의 그림에만 적용한다.
다른 크기가 오면 measure()로 재서 LOGOS에 추가한다.

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


def clean(rgb):
    """RGB 배열에서 로고를 지운 새 배열과 지웠는지 여부를 돌려준다."""
    h, w = rgb.shape[:2]
    spec = LOGOS.get((w, h))
    if not spec:
        return rgb, False
    a = _alpha(spec)[..., None]
    x, y = spec['x'], spec['y']
    out = rgb.astype(np.float32).copy()
    region = out[y:y + SIZE, x:x + SIZE]
    out[y:y + SIZE, x:x + SIZE] = np.clip((region - a * 255) / (1 - a), 0, 255)
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
