"""
Gemini 이펙트 프레임 시트(검은 배경, N×N 칸) → 게임용 가로 띠 PNG (D-060)

실행: python tools/images/build_vfx_sheet.py <원본.png> <이름> [칸 수=3] [프레임 크기=256]
  → assets/sprites/vfx/<이름>.png  (프레임을 가로로 이어 붙임, 알파 = 밝기 — 'lighter'로 겹쳐 그림)
칸 사이 회색 격자선은 칸 안쪽으로 몇 px 들여 잘라 지운다. 로고는 unlogo.py로 먼저 지움.
"""
import os
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from unlogo import load_clean  # noqa: E402

INSET = 6
EDGE = 10      # 바탕 밝기를 재는 칸 가장자리 폭(px)
FADE = 18      # 칸 가장자리에서 알파를 0 → 1로 올리는 폭(px)


def main():
    src, name = sys.argv[1], sys.argv[2]
    n = int(sys.argv[3]) if len(sys.argv) > 3 else 3
    size = int(sys.argv[4]) if len(sys.argv) > 4 else 256
    rgb, _ = load_clean(src)
    rgb = rgb.copy()
    h, w = rgb.shape[:2]
    # 오른쪽 아래 Gemini 로고 자리(마지막 칸, 거의 빈 프레임)는 통째로 검게 — 역합성으로 덜 지워진 별 모양이 남을 때가 있음
    rgb[int(h * 0.82):, int(w * 0.82):] = 0
    frames = []
    for r in range(n):
        for c in range(n):
            x0, x1 = round(w * c / n) + INSET, round(w * (c + 1) / n) - INSET
            y0, y1 = round(h * r / n) + INSET, round(h * (r + 1) / n) - INSET
            cell = rgb[y0:y1, x0:x1].astype(np.float32)
            a = cell.max(axis=2)
            # 칸 바탕이 순수한 검정이 아닐 때가 있음(어떤 칸만 초록·주황빛 네모) → 가장자리 밝기를 바탕으로 보고 그만큼 뺌
            ch, cw = a.shape
            edge = np.zeros_like(a, bool)
            edge[:EDGE, :] = edge[-EDGE:, :] = edge[:, :EDGE] = edge[:, -EDGE:] = True
            floor = max(10.0, float(np.percentile(a[edge], 60)) + 8)
            a = np.clip((a - floor) / (255 - floor), 0, 1)
            # 칸 가장자리로 갈수록 옅게 (네모 테두리가 보이지 않게)
            yy = np.minimum(np.arange(ch), np.arange(ch)[::-1])[:, None]
            xx = np.minimum(np.arange(cw), np.arange(cw)[::-1])[None, :]
            a *= np.clip(np.minimum(yy, xx) / FADE, 0, 1)
            col = np.where(a[..., None] > 0, cell / np.maximum(a[..., None] * 255, 1) * 255, 0)
            rgba = np.dstack([np.clip(col, 0, 255), a * 255]).astype(np.uint8)
            frames.append(Image.fromarray(rgba, 'RGBA').resize((size, size), Image.LANCZOS))
    strip = Image.new('RGBA', (size * len(frames), size), (0, 0, 0, 0))
    for i, f in enumerate(frames):
        strip.paste(f, (i * size, 0))
    out = os.path.join('assets', 'sprites', 'vfx', f'{name}.png')
    os.makedirs(os.path.dirname(out), exist_ok=True)
    strip.save(out, optimize=True)
    print(out, strip.size, len(frames), 'frames')


if __name__ == '__main__':
    main()
