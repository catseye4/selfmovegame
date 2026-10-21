"""
리그용 합성괴인 파츠 분리 스크립트 (Gemini 초록 크로마키 이미지 → 조각 PNG + rig.json)

실행: 프로젝트 루트에서  python tools/rig/cut_chimera_parts.py

입력 (픽셀 정렬 확인됨, 원본은 왼쪽을 보는 3/4 정면 → 저장할 때 좌우 반전해 오른쪽을 보게 함)
 - chimera_base_gemini.png   : 기준 (꼬리가 뒤로 뻗은 버전)
 - chimera_nowing_gemini.png : 날개/꼬리를 지운 변형 → 날개에 가려졌던 등(어깨 뒤) 채우기
 (chimera_alt_tail_gemini 는 꼬리만 다른 예비, chimera_armraise_gemini 는 팔이 하나 더 그려져 사용하지 않음)

분리 방침 (좌표는 모두 반전 전 원본 기준)
 - 다리를 벌린 육중한 자세 → 거대로봇처럼 다리를 번갈아 들어 올리는 쿵쿵 걸음. 다리는 한 조각씩
 - 날개: 등 위에 겹쳐 그려져 있으므로 몸통 앞, 큰 팔 뒤에 그림. 날개/꼬리 픽셀 = 날개 없는 이미지와 다른 곳
 - 큰 팔(원본 오른쪽): 어깨는 몸통에 두고 팔꿈치 아래(건틀릿+손)만 움직임
 - 앞팔(원본 왼쪽, 반전 후 진행 방향 쪽): 어깨부터 한 조각, 머리 뒤에 그림
 - 머리: 몸통 앞. 목 둘레 일부는 몸통에도 남겨 고개를 까딱여도 틈이 안 보이게
"""
import os
import sys

import cv2
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from rigcut import (remove_key_background, poly_mask, rect_mask, largest, grow, cut,
                    save_parts, write_layout, rest_check)

SRC_DIR = 'assets/sprites/parts/chimera/src'
SRC_BASE = f'{SRC_DIR}/chimera_base_gemini.png'
SRC_NOWING = f'{SRC_DIR}/chimera_nowing_gemini.png'
OUT_DIR = 'assets/sprites/rig/chimera'
SEAM = 3
NECK_BAND = 14                                   # 몸통에 남겨 둘 머리 가장자리 폭

HEAD_POLY = [(38, 395), (75, 300), (125, 250), (170, 200), (245, 110), (285, 95), (295, 55), (345, 28),
             (382, 40), (420, 95), (462, 92), (472, 120), (505, 170), (508, 240), (482, 266), (458, 300),
             (458, 380), (448, 450), (412, 500), (382, 530), (330, 562), (200, 566), (140, 548), (100, 502),
             (55, 472), (38, 440)]
ARM_F_POLY = [(36, 575), (80, 553), (170, 558), (178, 610), (166, 660), (160, 700), (158, 772), (58, 780),
              (32, 722)]
ARM_B_POLY = [(546, 668), (598, 582), (690, 556), (775, 572), (780, 705), (742, 742), (702, 760), (702, 800),
              (592, 800), (556, 762), (546, 700)]
WING_POLY = [(505, 20), (640, 28), (780, 128), (862, 258), (886, 400), (886, 600), (645, 600), (632, 420),
             (600, 262), (528, 160), (505, 80)]
TAIL_POLY = [(628, 738), (850, 732), (856, 838), (772, 905), (636, 908)]
LEG_L_POLY = [(128, 672), (262, 672), (296, 700), (296, 815), (336, 820), (345, 1000), (85, 1000), (88, 868),
              (126, 835), (126, 740)]
LEG_R_POLY = [(448, 672), (562, 672), (578, 700), (562, 760), (600, 802), (700, 800), (705, 1000),
              (482, 1000), (482, 850), (450, 795)]
LEG_CUT_Y = 725                                  # 몸통(벨트/앞치마)은 이 y 위를 유지, 다리 윗부분은 그 뒤로 숨음
BACK_FILL_ZONE = (430, 150, 780, 610)            # 날개에 가려졌던 등 → 날개 없는 이미지로 채움

PIVOTS = {
    'root': (390, 955), 'torso': (380, 700), 'head': (330, 505),
    'armF': (150, 585), 'armB': (700, 575), 'wing': (600, 285),
    'legF': (210, 715), 'legB': (515, 720), 'tail1': (655, 860), 'tail2': (745, 835),
}
SOCKETS = {'fist': (70, 705), 'mouth': (200, 470), 'footF': (215, 952), 'footB': (580, 955)}


def is_orange(img):
    r, g, b = (img[..., i].astype(int) for i in range(3))
    return (r > 140) & (r - b > 70) & (g > 60)


def main():
    src = remove_key_background(SRC_BASE, 'green')
    nowing = remove_key_background(SRC_NOWING, 'green')
    H, W = src.shape[:2]
    shape = src.shape
    opaque = src[..., 3] > 0
    cols = np.broadcast_to(np.arange(W)[None, :], (H, W))
    rows = np.broadcast_to(np.arange(H)[:, None], (H, W))

    # 날개/꼬리 = 기준 이미지에만 있는 픽셀 (날개 없는 이미지와 색이 다르거나 거기선 배경)
    differs = (nowing[..., 3] == 0) | (np.abs(src[..., :3].astype(int) - nowing[..., :3].astype(int)).max(2) > 60)
    # 어깨 쪽(y>200)은 주황 털을 날개에서 제외 (날개 끝 발톱은 크림색이라 유지)
    wing = poly_mask(shape, WING_POLY) & opaque & differs & ~(is_orange(src) & (rows > 200))
    wing = cv2.morphologyEx(wing.astype(np.uint8), cv2.MORPH_CLOSE, np.ones((7, 7), np.uint8)).astype(bool)
    wing = largest(wing & opaque)
    tail = largest(poly_mask(shape, TAIL_POLY) & opaque & differs)

    head_core = poly_mask(shape, HEAD_POLY) & opaque
    head = grow(head_core, opaque, SEAM)
    arm_f = largest(poly_mask(shape, ARM_F_POLY) & opaque & ~head_core)
    arm_b = largest(poly_mask(shape, ARM_B_POLY) & opaque & ~wing & ~tail)
    leg_f = largest(poly_mask(shape, LEG_L_POLY) & opaque & ~arm_f)
    leg_b = largest(poly_mask(shape, LEG_R_POLY) & opaque & ~arm_b & ~tail)

    # 몸통: 머리 안쪽(가장자리 띠 제외)/팔/날개/꼬리/다리 아랫부분을 뺀 나머지
    # 머리가 몸통과 맞닿은 곳(목/어깨)만 가장자리 띠를 몸통에 남김. 바깥 윤곽(뿔 등)은 남기지 않음
    body_side = cv2.dilate((opaque & ~head_core).astype(np.uint8), np.ones((NECK_BAND * 2 + 1,) * 2, np.uint8)).astype(bool)
    head_inner = head_core & ~body_side
    torso = (opaque & ~head_inner & ~arm_f & ~arm_b & ~wing & ~tail
             & ~((leg_f | leg_b) & (rows >= LEG_CUT_Y)))
    torso = largest(torso)
    torso_img = cut(src, torso)
    # 날개에 가려졌던 등: 날개 없는 이미지에서 (날개를 들면 드러나는 곳)
    fill = rect_mask(shape, BACK_FILL_ZONE) & wing & (nowing[..., 3] == 255) & (torso_img[..., 3] == 0)
    torso_img[fill] = nowing[fill]

    covered = torso | head | arm_f | arm_b | wing | tail | leg_f | leg_b
    dbg = src.copy(); dbg[opaque & ~covered] = [255, 0, 255, 255]
    cv2.imwrite(os.path.join(os.path.dirname(os.path.abspath(__file__)), '_missing_chimera.png'),
                cv2.cvtColor(dbg, cv2.COLOR_RGBA2BGRA))
    print('uncovered px:', int((opaque & ~covered).sum()))

    parts = {
        'torso': torso_img,
        'head': cut(src, head),
        'armF': cut(src, grow(arm_f, opaque & ~head_core, SEAM)),
        'armB': cut(src, grow(arm_b, opaque & ~wing & ~tail, SEAM)),
        'wing': cut(src, wing),
        'legF': cut(src, leg_f),
        'legB': cut(src, leg_b),
        'tail1': cut(src, tail & (cols < 752)),
        'tail2': cut(src, tail & (cols >= 738)),
    }

    # ---- 좌우 반전 저장 (오른쪽을 보게) ----
    flipped = {k: np.ascontiguousarray(v[:, ::-1]) for k, v in parts.items()}
    fx = lambda x: float(W - x)
    layout = {'source': {'w': W, 'h': H}, 'ground': PIVOTS['root'][1],
              'parts': save_parts(flipped, OUT_DIR),
              'pivots': {k: [fx(x), float(y)] for k, (x, y) in PIVOTS.items()},
              'sockets': {k: [fx(x), float(y)] for k, (x, y) in SOCKETS.items()}}
    write_layout(OUT_DIR, layout)
    print('parts:', list(parts))

    order = ['tail1', 'tail2', 'legB', 'legF', 'torso', 'wing', 'armB', 'armF', 'head']
    rest_check(OUT_DIR, layout, order, np.ascontiguousarray(src[:, ::-1]),
               os.path.join(os.path.dirname(os.path.abspath(__file__)), '_rest_check_chimera.png'))


if __name__ == '__main__':
    main()
