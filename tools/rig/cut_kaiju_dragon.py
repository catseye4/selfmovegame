"""
※ 게임에서 뺌 (2026-10-17): 사용자 요청은 합성괴인 용머리였음(D-054, cut_chimera_dragon.py). 원본·스크립트만 남김 —
  다시 쓰려면 실행한 뒤 partsExtra_v2.js에 머리 파츠(rigVariant 'dragon')와 rigAvatar.js RIG_SET_ART.kaiju에 'dragon'을 더함.

거대괴수 용머리 (추가 머리 파츠) 부위 그림 → assets/sprites/rig/kaiju/head_dragon.png · jaw_dragon.png + rig.json에 추가

실행: 프로젝트 루트에서  python tools/rig/cut_kaiju_dragon.py   (기본·A·B 그림은 그대로 둠)

입력 (Gemini 원본 크기 다운로드, assets/sprites/parts/kaiju/src/, 2026-10-17)
 - kaiju_dragon_step2_gemini.png : 기본 리그 그림(kaiju_step2 위쪽 큰 괴수 450×345를 3배)을 첨부해 머리만 용머리로 바꾼 것
 - kaiju_dragon_step3_gemini.png : 같은 대화에서 아래턱·아랫니만 지운 것 (입안이 보임)

방법 (머리 파츠라 머리·턱 두 조각만 — 몸통·팔·다리·꼬리는 장착한 다른 파츠 그림을 그대로 씀)
 1. cut_kaiju_sets와 같이 기본 리그 그림 칸(450×345)에 윤곽 IoU 최대로 맞춤. 턱 없는 그림은 머리 아래 줄(몸)에 맞춤
 2. 아래턱 = 기본 턱 선(조금 넓힘) 안에서 턱 없는 그림과 달라진 곳 (윗니·목은 두 그림이 같아서 빠짐)
 3. 머리 = 기본 머리 선 + 머리 위 장식 칸 + 뒤로 뻗은 뿔(등 가시와의 틈을 따라) + 기본 원본과 달라진 곳(머리 둘레 칸 안 — 머리 뒤 지느러미)
    턱 뒤(입안·목)는 턱 없는 그림에서 채움 (턱을 벌리면 드러남)
 4. 같은 3배 확대로 저장 → rigVariant 'dragon'이면 rigAvatar.setVariants가 head → head_dragon, jaw → jaw_dragon으로 바꿔 그림
"""
import json
import os
import sys

import cv2
import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from rigcut import remove_key_background, poly_mask, rect_mask, largest, grow, drop_specks, cut, save_parts, rest_check  # noqa: E402
import cut_kaiju_parts as base  # noqa: E402
import cut_kaiju_sets as ks  # noqa: E402

V = 'dragon'
SRC_FULL = f'{base.SRC_DIR}/kaiju_dragon_step2_gemini.png'
SRC_JAWLESS = f'{base.SRC_DIR}/kaiju_dragon_step3_gemini.png'
TMP_DIR = ks.TMP_DIR
HORN_POLY = [(226, 0), (300, 0), (300, 40), (268, 58), (262, 55), (250, 45), (238, 35), (226, 22)]   # 뒤로 뻗은 뿔 (아래 등 가시와 틈을 따라)
CHANGE_BOX = (225, 0, 380, 135)        # 기본 원본과 달라진 곳을 머리로 보는 범위 (머리 둘레)
DIFF_T = 60


def color_diff(a, b):
    return np.abs(a[..., :3].astype(int) - b[..., :3].astype(int)).max(2) > DIFF_T


def opened(mask, k=3):
    return cv2.morphologyEx(mask.astype(np.uint8), cv2.MORPH_OPEN, np.ones((k, k), np.uint8)).astype(bool)


def main():
    ref = np.asarray(Image.open(base.SRC_RIG).convert('RGB'))[:ks.FRAME_H, :ks.W]
    iou1, p1, full_can = ks.best_fit(Image.open(SRC_FULL).convert('RGB'), ks.keymask(ref))
    rows_fit = np.zeros(ks.FRAME_H, bool)
    rows_fit[150:] = True
    iou2, p2, less_can = ks.best_fit(Image.open(SRC_JAWLESS).convert('RGB'), ks.keymask(np.asarray(full_can)), rows_fit)
    print(f'용머리 → 기본: IoU {iou1:.3f} {p1} / 턱 없는 그림 → 용머리(몸 줄): IoU {iou2:.3f} {p2}')
    os.makedirs(TMP_DIR, exist_ok=True)
    full_path, less_path = f'{TMP_DIR}/dragon_full.png', f'{TMP_DIR}/dragon_less.png'
    full_can.crop((0, 0, ks.W, ks.H)).save(full_path)
    less_can.crop((0, 0, ks.W, ks.H)).save(less_path)

    src = remove_key_background(full_path, 'magenta', key_t=base.KEY_T)
    less = remove_key_background(less_path, 'magenta', key_t=base.KEY_T)
    orig = remove_key_background(base.SRC_RIG, 'magenta', base.CROP, key_t=base.KEY_T)
    shape = src.shape
    H, W = shape[:2]
    opaque = src[..., 3] > 0
    cols = np.broadcast_to(np.arange(W)[None, :], (H, W))
    rows = np.broadcast_to(np.arange(H)[:, None], (H, W))
    arm_zone = poly_mask(shape, base.ARM_POLY)

    # 아래턱: 기본 턱 선 안에서 턱 없는 그림과 달라진 곳
    jaw_zone = grow(poly_mask(shape, base.JAW_POLY), np.ones((H, W), bool), 6)
    differs = opaque & ((less[..., 3] == 0) | color_diff(src, less))
    jaw = largest(opened(differs & jaw_zone) & ~arm_zone)
    jaw = grow(jaw, opaque & jaw_zone & ~arm_zone, 2)

    # 머리: 기본 선 + 뿔 + 기본 원본과 달라진 곳 (머리 둘레)
    changed = opened(opaque & ((orig[..., 3] == 0) | color_diff(src, orig)) & rect_mask(shape, CHANGE_BOX))
    head_zone = (poly_mask(shape, base.HEAD_POLY) | rect_mask(shape, ks.HEAD_EXTRA) | poly_mask(shape, HORN_POLY)
                 | drop_specks(changed, 30))
    head = head_zone & opaque & ~jaw & ~arm_zone & (rows < 150)
    head = largest(head) | (head & drop_specks(head, 30))
    head_piece = grow(head, opaque & ~jaw & ~arm_zone & (cols >= base.NECK_BAND_X - 12), base.SEAM_OVERLAP)
    head_img = cut(src, head_piece)
    fill = rect_mask(shape, ks.JAW_ZONE) & ~arm_zone & (head_img[..., 3] == 0) & (less[..., 3] == 255) & (cols >= base.NECK_BAND_X)
    head_img[fill] = less[fill]
    jaw_img = cut(src, grow(jaw, opaque, base.SEAM_OVERLAP))

    parts = {f'head_{V}': head_img, f'jaw_{V}': jaw_img}
    for k, p in parts.items():
        if not p[..., 3].any():
            raise SystemExit(f'비어 있는 조각: {k}')
    layout_parts = save_parts(parts, base.OUT_DIR, base.SCALE)

    # 검증: 기본 몸통·팔·다리·꼬리 + 용머리·턱을 기본 자세로 합쳐 용머리 전신과 비교
    path = f'{base.OUT_DIR}/rig.json'
    layout = json.load(open(path, encoding='utf-8'))
    layout['parts'].update(layout_parts)
    ref3 = src.repeat(base.SCALE, axis=0).repeat(base.SCALE, axis=1)
    order = ['tail3', 'tail2', 'tail1', 'legF', 'legN', 'body', f'head_{V}', f'jaw_{V}', 'armF']
    rest_check(base.OUT_DIR, layout, order, ref3, os.path.join(os.path.dirname(os.path.abspath(__file__)), '_rest_check_kaiju_dragon.png'))
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(layout, f, ensure_ascii=False, indent=2)
    print('조각:', list(layout_parts), '/ rig.json 부위 그림:', len(layout['parts']), '개')


if __name__ == '__main__':
    main()
