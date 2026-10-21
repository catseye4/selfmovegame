"""
합성괴인 용머리 (세트 밖 추가 머리 파츠 head_chimera_dragon, D-054) 부위 그림 → assets/sprites/rig/chimera/head_dragon.png + rig.json에 추가

실행: 프로젝트 루트에서  python tools/rig/cut_chimera_dragon.py   (기본·A·B 그림은 그대로 둠)

입력 (Gemini 원본 크기 다운로드, assets/sprites/parts/chimera/src/, 2026-10-17)
 - chimera_dragon_base_gemini.png : 기준 원본(chimera_base)을 첨부해 머리만 용머리로 바꾼 것 (몸·날개·꼬리는 그대로)

방법 (머리 파츠라 머리 한 조각만 — 합성괴인 리그는 턱이 따로 없음. 몸통·팔·날개·다리는 장착한 다른 파츠 그림)
 1. setfit으로 로고를 지우고 기본 원본 칸(886×1024)에 맞춤
 2. 머리 = 기본 머리 선 안의 모든 픽셀 + 머리 둘레에서 기본 원본과 달라진 곳(선 밖으로 나온 지느러미 등)
    — 기본 몸통에는 돼지 머리 가장자리 띠(목·어깨, cut_chimera_parts NECK_BAND)가 남아 있으므로
      머리 선 안을 통째로 가져와 그 띠를 덮는다 (머리가 맨 앞에 그려짐)
 3. 기본과 같이 좌우 반전 저장 → rigVariant 'dragon'이면 rigAvatar.setVariants가 head → head_dragon으로 바꿔 그림
"""
import json
import os
import sys

import cv2
import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from rigcut import remove_key_background, poly_mask, rect_mask, largest, grow, drop_specks, cut, save_parts, rest_check  # noqa: E402
import cut_chimera_parts as base  # noqa: E402
import setfit  # noqa: E402

V = 'dragon'
SRC = f'{base.SRC_DIR}/chimera_dragon_base_gemini.png'
TMP = 'tools/rig/_sets_tmp/chimera_dragon_full.png'
CHANGE_BOX = (20, 20, 520, 600)     # 기본 원본과 달라진 곳을 머리로 보는 범위 (원본 좌표, 머리 둘레)
DIFF_T = 60


def main():
    ref = setfit.keymask(np.asarray(Image.open(base.SRC_BASE).convert('RGB')))
    rgb, iou, prm = setfit.fit(setfit.load(SRC), ref)
    print(f'용머리 → 기본: IoU {iou:.3f} {prm}')
    src = remove_key_background(setfit.save_tmp(rgb, TMP), 'green')
    orig = remove_key_background(base.SRC_BASE, 'green')
    shape = src.shape
    opaque = src[..., 3] > 0

    head_core = poly_mask(shape, base.HEAD_POLY) & opaque
    diff = np.abs(src[..., :3].astype(int) - orig[..., :3].astype(int)).max(2) > DIFF_T
    changed = opaque & ((orig[..., 3] == 0) | diff) & rect_mask(shape, CHANGE_BOX) & ~poly_mask(shape, base.ARM_F_POLY)
    changed = cv2.morphologyEx(changed.astype(np.uint8), cv2.MORPH_OPEN, np.ones((3, 3), np.uint8)).astype(bool)
    head = largest(head_core | drop_specks(changed, 40))
    head = grow(head, opaque, base.SEAM)
    head_img = cut(src, head)

    parts = {f'head_{V}': np.ascontiguousarray(head_img[:, ::-1])}
    layout_parts = save_parts(parts, base.OUT_DIR)

    # 검증: 기본 몸통·팔·날개·다리·꼬리 + 용머리를 기본 자세로 합쳐 용머리 전신(반전)과 비교
    path = f'{base.OUT_DIR}/rig.json'
    layout = json.load(open(path, encoding='utf-8'))
    layout['parts'].update(layout_parts)
    order = ['tail1', 'tail2', 'legB', 'legF', 'torso', 'wing', 'armB', 'armF', f'head_{V}']
    rest_check(base.OUT_DIR, layout, order, np.ascontiguousarray(src[:, ::-1]),
               os.path.join(os.path.dirname(os.path.abspath(__file__)), '_rest_check_chimera_dragon.png'))
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(layout, f, ensure_ascii=False, indent=2)
    print('조각:', list(layout_parts), '/ rig.json 부위 그림:', len(layout['parts']), '개')


if __name__ == '__main__':
    main()
