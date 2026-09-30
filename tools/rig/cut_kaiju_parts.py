"""
리그용 거대괴수 파츠 분리 스크립트 (Gemini 마젠타 크로마키 이미지 → 조각 PNG + rig.json)

실행: 프로젝트 루트에서  python tools/rig/cut_kaiju_parts.py

입력 (Gemini가 컨셉 패널 형태로 그려서 상단 큰 괴수만 사용)
 - kaiju_step2_gemini.png : 리그용 포즈 (측면, 오른쪽을 봄, 입 벌림, 꼬리 뒤로 뻗음)
 - kaiju_step3_gemini.png : 팔/아래턱/꼬리를 지운 몸통 (다리는 지워지지 않음). step2와 픽셀 정렬 확인됨

분리 방침
 - 꼬리 3마디: 몸통 뒤에 그림. 마디마다 부모 쪽으로 여유분을 두고 부모 뒤에 그려 회전해도 틈이 없게
 - 다리: 넓적다리 살집은 몸통에 두고, 무릎 아래(정강이+발)만 몸통 뒤에서 흔듦
 - 앞으로 뻗은 팔: 몸통 앞에 그림. 팔이 가리던 가슴 옆면은 step3로 채움
 - 배 위의 짧은 팔은 몸통에 그려져 있어 분리하지 않음
 - 아래턱: 머리 앞에 그림. 턱 뒤(입안/목)는 step3로 채우고, step3에도 없는 입 앞쪽은 입안 색으로 채움
 - 원본이 작아(약 380x310) 최근접 보간으로 3배 확대해 저장 → 거대로봇(약 900px)과 같은 규격
"""
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from rigcut import (remove_key_background, poly_mask, rect_mask, largest, grow, drop_specks, cut,
                    save_parts, write_layout, rest_check)

SRC_DIR = 'assets/sprites/parts/kaiju/src'
SRC_RIG = f'{SRC_DIR}/kaiju_step2_gemini.png'
SRC_LIMBLESS = f'{SRC_DIR}/kaiju_step3_gemini.png'
OUT_DIR = 'assets/sprites/rig/kaiju'
CROP = (0, 0, 450, 338)   # 패널 상단 메인 괴수 (아래 애니메이션/파츠 행 제외)
SCALE = 3

# ---- 원본 좌표 정의 ----
TAIL_POLY = [(18, 205), (45, 214), (80, 234), (110, 232), (130, 230), (150, 232), (170, 238),
             (192, 242), (192, 302), (130, 306), (85, 293), (50, 266), (20, 242)]
TAIL_BODY_CUT_X = 178                           # 몸통은 이 x 오른쪽의 꼬리 픽셀을 유지 (꼬리 뿌리는 몸통 뒤로 숨음)
TAIL_SEGMENTS = {'tail1': (116, 192), 'tail2': (66, 124), 'tail3': (0, 74)}  # 마디별 x 범위 (겹침 포함)

ARM_POLY = [(318, 148), (350, 150), (395, 158), (414, 168), (416, 214), (390, 216), (345, 208), (318, 204)]
ARM_BODY_CUT_X = 324                            # 몸통은 이 x 왼쪽의 팔 뿌리를 유지
ARM_FILL_ZONE = (316, 140, 345, 215)            # 팔이 가리던 가슴 옆면 → step3로 채움

JAW_POLY = [(270, 100), (290, 108), (310, 116), (330, 117), (350, 118), (356, 128), (353, 143),
            (330, 147), (305, 147), (285, 139), (270, 126)]
HEAD_POLY = [(262, 40), (285, 16), (300, 18), (318, 38), (328, 36), (346, 48), (362, 60), (372, 72),
             (374, 102), (358, 110), (350, 116), (330, 116), (310, 114), (290, 108), (276, 104),
             (268, 118), (262, 126), (256, 95), (256, 60)]
NECK_BAND_X = 268                               # 머리 뒤쪽 이 x 왼쪽은 몸통에도 남겨 목 이음새를 가림
MOUTH_FILL_POLY = [(326, 104), (356, 108), (356, 124), (326, 124)]  # step3에도 없는 입 앞쪽(윗니~아랫니 사이) → 입안 그림자색
SEAM_OVERLAP = 2                                # 위에 그리는 조각(턱/머리/팔)을 아래 조각 쪽으로 겹쳐 축소 시 경계 틈 방지
KEY_T = 30                                      # 마젠타 판정 임계값 (가장자리 번짐까지 제거)

LEG_N_POLY = [(176, 268), (260, 268), (264, 300), (262, 332), (176, 332)]   # 앞(가까운) 다리: 무릎 아래
LEG_F_POLY = [(280, 268), (352, 268), (374, 300), (374, 332), (280, 332)]   # 뒤(먼) 다리: 무릎 아래
LEG_BODY_CUT_Y = 282                            # 몸통은 이 y 위의 다리 픽셀(여유분)을 유지

PIVOTS = {
    'root': (262, 326), 'body': (250, 250), 'head': (268, 100), 'jaw': (276, 108), 'armF': (326, 176),
    'tail1': (184, 268), 'tail2': (121, 270), 'tail3': (71, 262),
    'legN': (218, 283), 'legF': (315, 284),
}
SOCKETS = {'mouth': (360, 112), 'claw': (412, 192), 'footN': (218, 326), 'footF': (330, 326)}


def main():
    src = remove_key_background(SRC_RIG, 'magenta', CROP, key_t=KEY_T)
    limbless = remove_key_background(SRC_LIMBLESS, 'magenta', CROP, key_t=KEY_T)
    H, W = src.shape[:2]
    shape = src.shape
    opaque = src[..., 3] > 0
    cols = np.broadcast_to(np.arange(W)[None, :], (H, W))
    rows = np.broadcast_to(np.arange(H)[:, None], (H, W))

    tail = largest(poly_mask(shape, TAIL_POLY) & opaque)
    arm = largest(poly_mask(shape, ARM_POLY) & opaque)
    arm = drop_specks(grow(arm, opaque & (cols >= ARM_BODY_CUT_X - SEAM_OVERLAP - 1) & (rows < 225), 3), 40)
    jaw = largest(poly_mask(shape, JAW_POLY) & opaque)
    head = poly_mask(shape, HEAD_POLY) & opaque & ~jaw
    # 겹침: 턱은 머리 쪽으로, 머리는 목(몸통) 쪽으로 몇 px 더 포함 (기본 자세에선 같은 픽셀이라 보이지 않음)
    jaw_piece = grow(jaw, opaque, SEAM_OVERLAP)
    head_piece = grow(head, opaque & ~jaw & (cols >= NECK_BAND_X - 12), SEAM_OVERLAP)
    leg_n = largest(poly_mask(shape, LEG_N_POLY) & opaque & ~tail)
    leg_f = largest(poly_mask(shape, LEG_F_POLY) & opaque)

    body = (opaque
            & ~(tail & (cols < TAIL_BODY_CUT_X))
            & ~(arm & (cols >= ARM_BODY_CUT_X))
            & ~jaw
            & ~(head & (cols >= NECK_BAND_X))
            & ~((leg_n | leg_f) & (rows >= LEG_BODY_CUT_Y)))
    body = drop_specks(body, 200)

    # 몸통: 팔이 가리던 가슴 옆면과 턱 아래 목을 step3로 (머리를 들어 올리면 드러나는 곳)
    body_img = cut(src, body)
    fill = ((rect_mask(shape, ARM_FILL_ZONE) | poly_mask(shape, JAW_POLY))
            & (body_img[..., 3] == 0) & (limbless[..., 3] == 255))
    body_img[fill] = limbless[fill]

    # 머리: 턱 뒤(입안/목)는 step3로, step3에도 없는 입 앞쪽은 입안 그림자색으로
    head_img = cut(src, head_piece)
    jaw_zone = poly_mask(shape, JAW_POLY)
    fill = jaw_zone & (head_img[..., 3] == 0) & (limbless[..., 3] == 255)
    head_img[fill] = limbless[fill]
    interior = head & (src[..., 0] > src[..., 1] + 25) & (src[..., 0] > 70)   # 붉은 입안 픽셀
    mouth_rgb = src[interior][:, :3].mean(0) * 0.45 if interior.any() else np.array([50, 18, 18])
    fill = poly_mask(shape, MOUTH_FILL_POLY) & jaw & (head_img[..., 3] == 0)   # 기본 자세에서 턱에 가려지는 곳만
    head_img[fill, :3] = mouth_rgb.astype(np.uint8)
    head_img[fill, 3] = 255

    parts = {'body': body_img, 'head': head_img, 'jaw': cut(src, jaw_piece), 'armF': cut(src, arm),
             'legN': cut(src, leg_n), 'legF': cut(src, leg_f)}
    for name, (x0, x1) in TAIL_SEGMENTS.items():
        parts[name] = cut(src, tail & (cols >= x0) & (cols < x1))

    layout = {'source': {'w': W * SCALE, 'h': H * SCALE}, 'ground': PIVOTS['root'][1] * SCALE,
              'parts': save_parts(parts, OUT_DIR, SCALE),
              'pivots': {k: [float(x * SCALE), float(y * SCALE)] for k, (x, y) in PIVOTS.items()},
              'sockets': {k: [float(x * SCALE), float(y * SCALE)] for k, (x, y) in SOCKETS.items()}}
    write_layout(OUT_DIR, layout)
    print('parts:', list(parts))

    ref = src.repeat(SCALE, axis=0).repeat(SCALE, axis=1)
    order = ['tail3', 'tail2', 'tail1', 'legF', 'legN', 'body', 'head', 'jaw', 'armF']
    rest_check(OUT_DIR, layout, order, ref,
               os.path.join(os.path.dirname(os.path.abspath(__file__)), '_rest_check_kaiju.png'))


if __name__ == '__main__':
    main()
