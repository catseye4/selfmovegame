"""
거대괴수 A·B 세트 부위 그림 자르기 (D-050 파츠 확장) → assets/sprites/rig/kaiju/<부위>_a.png · <부위>_b.png + rig.json에 추가

실행: 프로젝트 루트에서  python tools/rig/cut_kaiju_sets.py   (기본 그림은 cut_kaiju_parts.py가 만든 것을 그대로 둠)

입력 (Gemini 원본 크기 다운로드, assets/sprites/parts/kaiju/src/)
 - kaiju_<a|b>_step2_gemini.png : 세트 전신 — 기본 리그 그림(kaiju_step2의 위쪽 큰 괴수)을 첨부해 "같은 자세·자리로 장비만" 바꾼 것
 - kaiju_<a|b>_step3_gemini.png : 같은 대화에서 팔·아래턱·꼬리를 지운 몸

방법
 1. 맞추기: 세트 전신을 기본 리그 그림(450×345 칸)과 윤곽이 가장 많이 겹치는 배율·자리로 줄이고,
    팔 없는 몸은 세트 전신과 머리·다리 줄이 가장 많이 겹치게 맞춘다 (Gemini가 캔버스 비율을 조금 바꿀 때가 있음)
 2. 자르기: 세트 그림은 가시·집게·촉수처럼 기본 그림과 윤곽이 달라 기본 자르는 다각형을 그대로 쓰면 끝이 잘린다
    → 팔·아래턱·꼬리는 "전신 - 팔 없는 몸" 차이에서 자리별로 고른다. 머리·다리·몸통 경계와 뼈 위치는 기본과 같게
 3. 같은 3배 확대로 저장해 기본 부위 그림과 크기가 같다 (게임은 rigAvatar.setVariants로 그림 키만 바꿔 그림)
"""
import json
import os
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from rigcut import remove_key_background, poly_mask, rect_mask, largest, grow, drop_specks, cut, save_parts, rest_check
import cut_kaiju_parts as base

SRC_DIR = 'assets/sprites/parts/kaiju/src'
OUT_DIR = 'assets/sprites/rig/kaiju'
TMP_DIR = 'tools/rig/_sets_tmp'
W, H = base.CROP[2], base.CROP[3]       # 기본 리그 그림 칸 (450×338)
FRAME_H = 345                           # Gemini에 첨부한 참고 그림의 칸 (450×345) — 이 칸에서 맞춘 뒤 H로 자름
MAGENTA = (253, 0, 249)

# 자리별로 차이(전신 - 팔 없는 몸)를 고르는 범위 (기본 좌표)
ARM_ZONE = (290, 90, W, 250)            # 앞으로 뻗은 팔 (집게·촉수가 기본 팔보다 길고 높음)
JAW_ZONE = (262, 95, 372, 165)
TAIL_ZONE_X = 205                       # 꼬리: 이 x 왼쪽
HEAD_EXTRA = (252, 0, 380, 64)          # 머리 위 장식(가시 왕관 등)은 기본 머리 다각형 위로 나옴


def keymask(rgb):
    r, g, b = rgb[..., 0].astype(int), rgb[..., 1].astype(int), rgb[..., 2].astype(int)
    return ~((r > 170) & (b > 170) & (g < 110))


def place(im, sx, sy, dx, dy):
    """세트 그림을 참고 그림 칸(W×FRAME_H)에 놓기: 높이를 칸에 맞춘 뒤 가로·세로 배율과 이동"""
    w = round(im.width * FRAME_H / im.height * sx)
    h = round(FRAME_H * sy)
    can = Image.new('RGB', (W, FRAME_H), MAGENTA)
    can.paste(im.resize((w, h), Image.BOX), ((W - w) // 2 + dx, (FRAME_H - h) // 2 + dy))
    return can


def best_fit(im, target, rows=None):
    """target 윤곽(bool)과 IoU가 가장 큰 배율·이동"""
    best = (-1, None, None)
    for sx in np.arange(0.97, 1.035, 0.01):
        for sy in (0.99, 1.0, 1.01):
            for dx in range(-8, 9, 2):
                for dy in range(-4, 5, 2):
                    can = place(im, sx, sy, dx, dy)
                    m = keymask(np.asarray(can))
                    t, c = (target, m) if rows is None else (target[rows], m[rows])
                    iou = (t & c).sum() / max(1, (t | c).sum())
                    if iou > best[0]:
                        best = (iou, (round(float(sx), 2), sy, dx, dy), can)
    return best


def component_in(mask, zone_mask, pick='largest'):
    """zone 안 mask의 덩어리 하나 (가장 큰 것 / 가장 오른쪽까지 뻗은 것)"""
    m = mask & zone_mask
    if not m.any():
        return m
    if pick == 'largest':
        return largest(m)
    import cv2
    n, lab, st, _ = cv2.connectedComponentsWithStats(m.astype(np.uint8), connectivity=8)
    ok = [i for i in range(1, n) if st[i, cv2.CC_STAT_AREA] >= 80]
    if not ok:
        return largest(m)
    right = max(ok, key=lambda i: st[i, cv2.CC_STAT_LEFT] + st[i, cv2.CC_STAT_WIDTH])
    return lab == right


def cut_set(v):
    os.makedirs(TMP_DIR, exist_ok=True)
    ref = np.asarray(Image.open(base.SRC_RIG).convert('RGB'))[:FRAME_H, :W]
    full_im = Image.open(f'{SRC_DIR}/kaiju_{v}_step2_gemini.png').convert('RGB')
    less_im = Image.open(f'{SRC_DIR}/kaiju_{v}_step3_gemini.png').convert('RGB')
    iou1, p1, full_can = best_fit(full_im, keymask(ref))
    rows = np.zeros(FRAME_H, bool)
    rows[:115] = True
    rows[276:] = True
    iou2, p2, less_can = best_fit(less_im, keymask(np.asarray(full_can)), rows)
    print(f'[{v}] 전신 → 기본: IoU {iou1:.3f} {p1} / 팔 없는 몸 → 전신(머리·다리 줄): IoU {iou2:.3f} {p2}')
    full_path, less_path = f'{TMP_DIR}/{v}_full.png', f'{TMP_DIR}/{v}_less.png'
    full_can.crop((0, 0, W, H)).save(full_path)   # 기본 자르기 칸(450×338)으로
    less_can.crop((0, 0, W, H)).save(less_path)

    src = remove_key_background(full_path, 'magenta', key_t=base.KEY_T)
    limbless = remove_key_background(less_path, 'magenta', key_t=base.KEY_T)
    shape = src.shape
    opaque = src[..., 3] > 0
    less = limbless[..., 3] > 0
    cols = np.broadcast_to(np.arange(W)[None, :], (H, W))
    rows2 = np.broadcast_to(np.arange(H)[:, None], (H, W))
    diff = drop_specks(opaque & ~less, 30)

    # 아래턱: 지워도 윤곽은 거의 그대로(입안 색만 바뀜)라 차이로는 안 잡힘 → 머리 자리가 맞으므로 기본 턱 다각형
    jaw = largest(poly_mask(shape, base.JAW_POLY) & opaque)
    jaw_zone = grow(poly_mask(shape, base.JAW_POLY), np.ones(shape[:2], bool), 6)
    # 팔: 차이 중 가장 오른쪽까지 뻗은 덩어리. 턱 밑(턱이 있던 자리)이 이어 붙어 나오므로 턱 둘레와 어깨 위는 뺌
    arm = component_in(diff & ~jaw_zone & (rows2 >= 135), rect_mask(shape, ARM_ZONE), pick='rightmost')
    arm = drop_specks(grow(arm, opaque & ~jaw_zone & (cols >= base.ARM_BODY_CUT_X - base.SEAM_OVERLAP - 1), 3), 40)
    tail = component_in(diff, cols < TAIL_ZONE_X)
    head = (poly_mask(shape, base.HEAD_POLY) | rect_mask(shape, HEAD_EXTRA)) & opaque & ~jaw & ~arm & (rows2 < 150)
    jaw_piece = grow(jaw, opaque, base.SEAM_OVERLAP)
    head_piece = grow(head, opaque & ~jaw & (cols >= base.NECK_BAND_X - 12), base.SEAM_OVERLAP)
    leg_n = largest(poly_mask(shape, base.LEG_N_POLY) & opaque & ~tail & ~arm)
    leg_f = largest(poly_mask(shape, base.LEG_F_POLY) & opaque & ~arm)

    body = (opaque
            & ~(tail & (cols < base.TAIL_BODY_CUT_X))
            & ~(arm & (cols >= base.ARM_BODY_CUT_X))
            & ~jaw
            & ~(head & (cols >= base.NECK_BAND_X))
            & ~((leg_n | leg_f) & (rows2 >= base.LEG_BODY_CUT_Y)))
    body = drop_specks(body, 200)

    # 몸통: 팔이 가리던 가슴과 턱 아래 목은 팔 없는 몸에서 (기본과 같은 방식)
    body_img = cut(src, body)
    fill = ((rect_mask(shape, base.ARM_FILL_ZONE) | rect_mask(shape, JAW_ZONE) | arm)
            & (body_img[..., 3] == 0) & (limbless[..., 3] == 255) & (cols < W - 2))
    body_img[fill] = limbless[fill]
    # 머리: 턱 뒤(입안)는 팔 없는 몸에서
    head_img = cut(src, head_piece)
    fill = rect_mask(shape, JAW_ZONE) & ~arm & (head_img[..., 3] == 0) & (limbless[..., 3] == 255) & (cols >= base.NECK_BAND_X)
    head_img[fill] = limbless[fill]

    parts = {'body': body_img, 'head': head_img, 'jaw': cut(src, jaw_piece), 'armF': cut(src, arm),
             'legN': cut(src, leg_n), 'legF': cut(src, leg_f)}
    for name, (x0, x1) in base.TAIL_SEGMENTS.items():
        parts[name] = cut(src, tail & (cols >= x0) & (cols < x1))
    empty = [k for k, p in parts.items() if not p[..., 3].any()]
    if empty:
        raise SystemExit(f'[{v}] 비어 있는 조각: {empty} — 자리 범위(ARM_ZONE 등)를 확인')
    named = {f'{k}_{v}': p for k, p in parts.items()}
    layout_parts = save_parts(named, OUT_DIR, base.SCALE)
    ref3 = src.repeat(base.SCALE, axis=0).repeat(base.SCALE, axis=1)
    order = ['tail3', 'tail2', 'tail1', 'legF', 'legN', 'body', 'head', 'jaw', 'armF']
    rest_check(OUT_DIR, {'parts': layout_parts}, [f'{k}_{v}' for k in order], ref3,
               os.path.join(os.path.dirname(os.path.abspath(__file__)), f'_rest_check_kaiju_{v}.png'))
    return layout_parts


def main():
    path = f'{OUT_DIR}/rig.json'
    layout = json.load(open(path, encoding='utf-8'))
    for v in ('a', 'b'):
        layout['parts'].update(cut_set(v))
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(layout, f, ensure_ascii=False, indent=2)
    print('rig.json 부위 그림:', len(layout['parts']), '개')


if __name__ == '__main__':
    main()
