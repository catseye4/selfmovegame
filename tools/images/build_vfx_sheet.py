"""
Gemini 이펙트 프레임 시트(검은 배경, N×N 칸) → 게임용 가로 띠 (D-060, WebP는 D-062)

실행: python tools/images/build_vfx_sheet.py <원본.png> <이름> [칸 수=3] [프레임 크기=256] [가장자리 옅게 폭=18] [round]
  → assets/sprites/vfx/png/<이름>.png  원본 띠 (무손실 PNG, 프레임을 가로로 이어 붙임, 알파 = 밝기 — 'lighter'로 겹쳐 그림)
  → assets/sprites/vfx/<이름>.webp     게임이 쓰는 띠 (WebP 품질 90 — PNG의 약 45% 용량, 눈으로 차이 없음)
WebP만 다시 만들기: python tools/images/build_vfx_sheet.py --webp [이름 ...]   (이름 없으면 png/ 전부)
칸 사이 회색 격자선은 칸 안쪽으로 몇 px 들여 잘라 지운다. 로고는 unlogo.py로 먼저 지움.
먼지·연기가 칸 끝까지 번진 그림은 폭을 크게(예: 80) 주면 잘린 네모 테두리 대신 부드럽게 사라진다.
칸을 꽉 채운 구름(가운데 기준 그림)은 round를 더하면 칸 가운데에서 둥글게 옅어진다.
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
VFX_DIR = os.path.join('assets', 'sprites', 'vfx')
WEBP_QUALITY = 90


def save_webp(name):
    """png/<이름>.png → <이름>.webp (색 품질 90, 알파는 손실 없이 가깝게 100)"""
    src = os.path.join(VFX_DIR, 'png', f'{name}.png')
    out = os.path.join(VFX_DIR, f'{name}.webp')
    Image.open(src).save(out, 'WEBP', quality=WEBP_QUALITY, alpha_quality=100, method=6)
    print(out, f'{os.path.getsize(src) // 1024} KB → {os.path.getsize(out) // 1024} KB')


def main():
    if sys.argv[1] == '--webp':
        names = sys.argv[2:] or sorted(f[:-4] for f in os.listdir(os.path.join(VFX_DIR, 'png')) if f.endswith('.png'))
        for name in names:
            save_webp(name)
        return
    src, name = sys.argv[1], sys.argv[2]
    n = int(sys.argv[3]) if len(sys.argv) > 3 else 3
    size = int(sys.argv[4]) if len(sys.argv) > 4 else 256
    fade = float(sys.argv[5]) if len(sys.argv) > 5 else FADE
    round_mask = len(sys.argv) > 6 and sys.argv[6] == 'round'
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
            ramp = np.clip(np.minimum(yy, xx) / fade, 0, 1)
            a *= ramp * ramp * (3 - 2 * ramp)
            if round_mask:   # 가운데에서 반지름 0.72 → 1.0 사이 둥글게 옅어짐
                yy2 = (np.arange(ch)[:, None] - (ch - 1) / 2) / (ch / 2)
                xx2 = (np.arange(cw)[None, :] - (cw - 1) / 2) / (cw / 2)
                rr = np.clip((1.0 - np.sqrt(yy2 ** 2 + xx2 ** 2)) / 0.28, 0, 1)
                a *= rr * rr * (3 - 2 * rr)
            col = np.where(a[..., None] > 0, cell / np.maximum(a[..., None] * 255, 1) * 255, 0)
            rgba = np.dstack([np.clip(col, 0, 255), a * 255]).astype(np.uint8)
            frames.append(Image.fromarray(rgba, 'RGBA').resize((size, size), Image.LANCZOS))
    strip = Image.new('RGBA', (size * len(frames), size), (0, 0, 0, 0))
    for i, f in enumerate(frames):
        strip.paste(f, (i * size, 0))
    out = os.path.join(VFX_DIR, 'png', f'{name}.png')
    os.makedirs(os.path.dirname(out), exist_ok=True)
    strip.save(out, optimize=True)
    print(out, strip.size, len(frames), 'frames')
    save_webp(name)


if __name__ == '__main__':
    main()
