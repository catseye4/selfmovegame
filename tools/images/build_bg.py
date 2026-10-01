"""
구역 배경 그림(Gemini) → 게임용 배경 층 (로드맵 C단계)

실행: 프로젝트 루트에서  python tools/images/build_bg.py

입력: assets/sprites/stage/src/bg/<이름>_gemini.png   (없는 층은 건너뜀)
출력: assets/sprites/stage/bg/<이름>.png
      tools/images/_out/bg_<이름>_tiled.png  (두 번 이어 붙인 미리보기 — 이음매 확인)

처리
 1. Gemini 로고 지우기 (unlogo.py — 처음 보는 크기는 1024×1024 지도를 늘리거나 줄여 자리를 찾음)
 2. (key가 있으면) 단색 배경 지우기 — 벽면 층의 위쪽 초록 = 투명
 3. 가로를 tile_w(px)로 맞춤. 배경 층은 한 바퀴(화면 너비 1280px)마다 같은 그림이 와야 끊김 없이 흐르므로
    tile_w는 1280의 약수. 줄일 때 양 끝을 반대쪽 픽셀로 이어 붙여 줄여서 이음매가 생기지 않게 함
 4. 이음매(왼쪽 끝 ↔ 오른쪽 끝) 차이가 크면 양 끝 seam px를 서로 섞어 부드럽게
"""
import os
import sys

import numpy as np
from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'rig'))
from unlogo import load_clean  # noqa: E402
from build_bases import key_out  # noqa: E402

SRC = 'assets/sprites/stage/src/bg/{name}_gemini.png'
OUT = 'assets/sprites/stage/bg/{name}.png'
PREVIEW = 'tools/images/_out/bg_{name}_tiled.png'

# tile_w: 게임에서 그림 한 장의 가로(px), seam: 이음매를 섞는 폭(원본 px, 0이면 안 섞음), key: 초록 배경을 투명하게
# feet: (원본 줄, 화면 바닥에서 px) — 캐릭터 발이 디딜 원본 줄이 게임 발 높이에 오도록, 띠 맨 위부터 화면 바닥까지만 잘라 냄
LAYERS = {
    'hall': {'tile_w': 1280, 'seam': 0},          # 먼 배경: 연구소 대형 홀 (가장 느리게)
    'hall_alarm': {'tile_w': 1280, 'seam': 0},    # 보스전: 붉은 경보 조명
    'machinery': {'tile_w': 640, 'seam': 0, 'key': True},   # 중간 층: 낮은 기계·난간 띠 (위·아래 초록 = 투명)
    'floor': {'tile_w': 256, 'seam': 0, 'key': True, 'feet': (195, 60)},   # 바닥: 경고 줄무늬 사이 철망 가운데에 발
}
WRAP = 8           # 줄일 때 양 끝에 덧붙이는 반대쪽 픽셀 수


def seam_diff(a):
    edge = np.abs(a[:, 0, :3].astype(int) - a[:, -1, :3].astype(int)).mean()
    inner = np.mean([np.abs(a[:, x, :3].astype(int) - a[:, x + 1, :3].astype(int)).mean() for x in range(4, a.shape[1] - 4, 9)])
    return edge, inner


def blend_seam(a, px):
    """양 끝 px를 서로 섞음: 오른쪽 끝으로 갈수록 왼쪽 끝 색이 섞여 이어 붙였을 때 부드럽게"""
    a = a.astype(np.float32)
    left = a[:, :px].copy()
    for i in range(px):
        t = (i + 1) / (px + 1)
        a[:, -px + i] = a[:, -px + i] * (1 - t) + left[:, i] * t
    return a.round().astype(np.uint8)


def build(name, cfg):
    rgb, unlogoed = load_clean(SRC.format(name=name))
    a = key_out(rgb)[0] if cfg.get('key') else rgb
    edge, inner = seam_diff(a)
    if cfg['seam'] and edge > inner * 2:
        a = blend_seam(a, cfg['seam'])
    h, w = a.shape[:2]
    tw = cfg['tile_w']
    th = round(h * tw / w)
    # 양 끝을 반대쪽 픽셀로 늘린 뒤 줄이고 잘라냄 → 줄이는 필터가 이음매에서도 이어진 픽셀을 봄
    padded = np.concatenate([a[:, -WRAP:], a, a[:, :WRAP]], axis=1)
    pw = round((w + 2 * WRAP) * tw / w)
    big = Image.fromarray(padded)
    big = (big.convert('RGBa').resize((pw, th), Image.LANCZOS).convert('RGBA') if big.mode == 'RGBA'
           else big.resize((pw, th), Image.LANCZOS))
    off = round(WRAP * tw / w)
    img = big.crop((off, 0, off + tw, th))
    if 'feet' in cfg:
        al = np.asarray(img)[..., 3]
        top = int(np.nonzero(al.max(axis=1) > 0)[0].min())
        row, feet_b = cfg['feet']
        img = img.crop((0, top, tw, round(row * tw / w) + feet_b))
        th = img.height
        print(f'  {name}: 게임 높이 {th}px (띠 맨 위가 화면 바닥에서 {th}px, 발 {feet_b}px)')
    os.makedirs(os.path.dirname(OUT.format(name=name)), exist_ok=True)
    img.save(OUT.format(name=name), optimize=True)

    tiled = Image.new('RGBA', (tw * 2, th), (30, 28, 40, 255))
    tiled.alpha_composite(img.convert('RGBA'), (0, 0))
    tiled.alpha_composite(img.convert('RGBA'), (tw, 0))
    tiled = tiled.convert('RGB')
    ImageDraw.Draw(tiled).line([(tw, 0), (tw, 12)], fill=(255, 60, 60), width=3)
    os.makedirs(os.path.dirname(PREVIEW.format(name=name)), exist_ok=True)
    tiled.resize((tw, th // 2)).save(PREVIEW.format(name=name))
    extra = ''
    if cfg.get('key'):
        al = np.asarray(img)[..., 3]
        rows = np.nonzero(al.max(axis=1) > 0)[0]
        extra = f', 그림 있는 줄 {rows.min()}~{rows.max()} (아래 빈 칸 {th - 1 - rows.max()}px)'
    print(f'{name}: {w}x{h} → {tw}x{th}, 로고 {"지움" if unlogoed else "없음"}, 이음매 {edge:.1f} (보통 {inner:.1f}){extra}')


def main():
    for name, cfg in LAYERS.items():
        if os.path.exists(SRC.format(name=name)):
            build(name, cfg)
        else:
            print(f'{name}: 아직 그림 없음 (건너뜀)')


if __name__ == '__main__':
    main()
