"""
리그용 타락 히어로 파츠 분리 스크립트 (Gemini 초록 크로마키 이미지 → 조각 PNG + rig.json)

실행: 프로젝트 루트에서  python tools/rig/cut_hero_parts.py

입력 (모두 픽셀 정렬 확인됨)
 - hero_neutral_gemini.png        : 중립 자세 (측면, 두 다리 곧게 모음, 빈손 팔 내림) → 몸통/다리/망토/팔
 - hero_neutral_armfwd_gemini.png : 같은 그림에서 팔만 앞으로 든 변형 → 팔에 가려졌던 몸통 채우기
 - hero_step2_gemini.png          : 이전 전투 자세. 머리카락 위치가 중립 이미지와 같아
                                    발광 눈이 있는 머리를 여기서 가져옴 (중립 이미지는 눈이 평범하게 바뀜)
 - hero_armforward_gemini.png     : 이전 이미지. 손잡이까지 보이는 칼을 여기서 잘라 새 주먹 위치로 옮김
 (hero_step1/hero_body/hero_sword 는 사용하지 않음)

분리 방침
 - 망토 2마디: 맨 뒤, 위/아래로 나눔. 몸통 등 뒤로 몇 px 여유분 포함
 - 다리: 허벅지 + 정강이 2마디. 무릎 보호대는 허벅지에 두고 정강이는 그 뒤에 그림
 - 견갑: 팔 위에 덮는 별도 조각 → 팔을 돌려도 어깨 이음새가 가려짐
 - 칼: 주먹 뒤에 그림(주먹이 칼자루를 가림)
"""
import os
import sys

import cv2
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from rigcut import (remove_key_background, poly_mask, rect_mask, largest, grow, fill_flat, cut,
                    save_parts, write_layout, rest_check)

SRC_DIR = 'assets/sprites/parts/hero/src'
SRC_RIG = f'{SRC_DIR}/hero_neutral_gemini.png'
SRC_ARMFWD = f'{SRC_DIR}/hero_neutral_armfwd_gemini.png'
SRC_HEAD = f'{SRC_DIR}/hero_step2_gemini.png'
SRC_SWORD = f'{SRC_DIR}/hero_armforward_gemini.png'
OUT_DIR = 'assets/sprites/rig/hero'
SEAM = 3

# 머리 (hero_step2 좌표 = 중립 이미지 좌표)
HEAD_POLY = [(290, 50), (710, 50), (710, 300), (655, 300), (645, 395), (618, 430), (555, 428), (545, 398),
             (520, 378), (470, 352), (440, 346), (400, 352), (330, 350), (290, 332)]
# 칼 (hero_armforward 좌표). 칼자루 중심(668, 668)을 중립 이미지의 주먹 중심으로 옮김
SWORD_POLY = [(578, 605), (700, 612), (772, 640), (1012, 772), (1012, 832), (900, 832), (760, 772),
              (690, 762), (578, 668)]
SWORD_GRIP_OLD = (668, 668)
FIST = (660, 666)

ARM_ZONE = (500, 495, 720, 720)                  # 팔을 찾는 범위 (견갑 아래)
PAULDRON_POLY = [(462, 400), (560, 394), (596, 406), (602, 470), (600, 494), (560, 505), (520, 516),
                 (488, 525), (468, 505), (458, 450)]
TORSO_FILL_ZONE = (500, 495, 605, 705)           # 팔이 가리던 가슴/허리 → armfwd로 채움
ARMFWD_ARM = (585, 390, 910, 530)                # armfwd 이미지에서 앞으로 든 팔이 있는 곳 (채우기에서 제외)

CAPE_X = 408                                     # 이 x 왼쪽 = 망토 (몸통 등판 경계)
CAPE_MARGIN_X = 425                              # 망토 조각은 이 x까지 포함 (몸통 뒤로 숨는 여유분)
CAPE_TOP_Y = 395
CAPE_SPLIT_Y = (660, 640)                        # cape1: y < 660, cape2: y >= 640 (겹침)

LEG_TOP_Y = 700                                  # 허벅지 조각은 치마 뒤로 숨는 여기부터 포함
LEG_CUT_Y = 730                                  # 몸통(치마)은 이 y 위를 유지
LEGS_BOX = (425, LEG_TOP_Y, 645, 935)
LEG_N_POLY = [(488, 700), (600, 700), (618, 742), (620, 800), (585, 830), (582, 866), (640, 878), (640, 930),
              (515, 930), (515, 874), (522, 803), (488, 765)]
KNEE_SPLIT = {'F': (800, 785), 'B': (805, 790)}  # 허벅지: y < 앞값, 정강이: y >= 뒤값 (겹침)

PIVOTS = {
    'root': (525, 922), 'torso': (515, 705), 'head': (535, 410), 'pauldron': (540, 460),
    'cape1': (405, 425), 'cape2': (330, 650),
    'armF': (553, 500), 'sword': FIST,
    'thighB': (482, 712), 'shinB': (480, 800), 'thighF': (550, 712), 'shinF': (555, 792),
}
SOCKETS = {'tip': (992, 804), 'blade': (862, 746), 'footB': (475, 922), 'footF': (575, 922), 'chest': (500, 560)}


def fill_holes(mask):
    m = mask.astype(np.uint8)
    h, w = m.shape
    flood = m.copy()
    cv2.floodFill(flood, np.zeros((h + 2, w + 2), np.uint8), (0, 0), 1)
    return mask | (flood == 0)


def main():
    src = remove_key_background(SRC_RIG, 'green')
    fwd = remove_key_background(SRC_ARMFWD, 'green')
    head_src = remove_key_background(SRC_HEAD, 'green')
    sword_src = remove_key_background(SRC_SWORD, 'green', min_part=3000)
    H, W = src.shape[:2]
    shape = src.shape
    opaque = src[..., 3] > 0
    cols = np.broadcast_to(np.arange(W)[None, :], (H, W))
    rows = np.broadcast_to(np.arange(H)[:, None], (H, W))

    # 머리: 이전 이미지에서 (발광 눈)
    head_mask = (poly_mask(shape, HEAD_POLY) | (rows < 300)) & (head_src[..., 3] > 0)
    head_img = cut(head_src, grow(head_mask, head_src[..., 3] > 0, SEAM))
    head_cover = head_img[..., 3] > 0

    # 칼: 이전 이미지에서 잘라 주먹 위치로 이동
    sword_mask = largest(poly_mask(shape, SWORD_POLY) & (sword_src[..., 3] > 0)
                         & ~((cols < 600) & (rows > 655)))
    dx, dy = FIST[0] - SWORD_GRIP_OLD[0], FIST[1] - SWORD_GRIP_OLD[1]
    sword_img = np.roll(cut(sword_src, sword_mask), (dy, dx), axis=(0, 1))

    # 팔: 팔 내린/든 두 이미지의 차이 = 내린 팔
    diff = np.abs(src[..., :3].astype(int) - fwd[..., :3].astype(int)).max(2) > 50
    diff |= (src[..., 3] > 0) != (fwd[..., 3] > 0)
    pauldron = poly_mask(shape, PAULDRON_POLY) & opaque
    arm = diff & opaque & rect_mask(shape, ARM_ZONE) & ~pauldron
    arm = cv2.morphologyEx(arm.astype(np.uint8), cv2.MORPH_OPEN, np.ones((3, 3), np.uint8)).astype(bool)
    arm = largest(arm)
    arm = fill_holes(cv2.morphologyEx(arm.astype(np.uint8), cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8)).astype(bool))
    arm = grow(arm & opaque, opaque & rect_mask(shape, ARM_ZONE) & ~pauldron, SEAM)

    # 다리
    legs_zone = rect_mask(shape, LEGS_BOX) & opaque & (cols >= CAPE_X + 12)
    leg_f = largest(poly_mask(shape, LEG_N_POLY) & legs_zone)
    leg_b = largest(legs_zone & ~leg_f)

    # 망토
    cape = opaque & (cols < CAPE_MARGIN_X) & (rows >= CAPE_TOP_Y) & ~legs_zone

    # 몸통: 팔/다리/망토/머리를 뺀 나머지. 팔이 가리던 곳은 armfwd로 채움
    # 치마 아래로 내려오는 망토 오른쪽 테두리(x 408~425)는 몸통에 남기지 않음 (망토가 흔들릴 때 제자리에 남지 않도록)
    torso = (opaque & ~arm & ~(cape & ((cols < CAPE_X) | (rows >= LEG_CUT_Y - 10)))
             & ~((leg_f | leg_b) & (rows >= LEG_CUT_Y))
             & ~(head_cover & (rows < 400)))
    torso = largest(torso)
    torso_img = cut(src, torso)
    fill = (rect_mask(shape, TORSO_FILL_ZONE) & arm & (torso_img[..., 3] == 0) & (fwd[..., 3] == 255)
            & ~rect_mask(shape, ARMFWD_ARM))
    torso_img[fill] = fwd[fill]
    hole = rect_mask(shape, TORSO_FILL_ZONE) & arm & (torso_img[..., 3] == 0) & (cols < 598)
    torso_img = fill_flat(torso_img, hole, rect_mask(shape, (440, 520, 520, 620)))

    ys, xs = CAPE_SPLIT_Y
    parts = {
        'torso': torso_img,
        'head': head_img,
        'pauldron': cut(src, pauldron),
        'armF': cut(src, arm),
        'sword': sword_img,
        'cape1': cut(src, cape & (rows < ys)),
        'cape2': cut(src, cape & (rows >= xs)),
    }
    for side, leg in (('F', leg_f), ('B', leg_b)):
        thigh_end, shin_start = KNEE_SPLIT[side]
        parts[f'thigh{side}'] = cut(src, leg & (rows < thigh_end))
        parts[f'shin{side}'] = cut(src, leg & (rows >= shin_start))

    layout = {'source': {'w': W, 'h': H}, 'ground': PIVOTS['root'][1],
              'parts': save_parts(parts, OUT_DIR),
              'pivots': {k: [float(x), float(y)] for k, (x, y) in PIVOTS.items()},
              'sockets': {k: [float(x), float(y)] for k, (x, y) in SOCKETS.items()}}
    write_layout(OUT_DIR, layout)
    print('parts:', list(parts))

    ref = src.copy()   # 기준 = 중립 이미지 (머리/칼은 다른 이미지라 비교에서 제외)
    order = ['cape2', 'cape1', 'shinB', 'thighB', 'shinF', 'thighF', 'torso', 'armF', 'pauldron']
    ref[head_cover | (sword_img[..., 3] > 0)] = 0
    rest_check(OUT_DIR, layout, order, ref,
               os.path.join(os.path.dirname(os.path.abspath(__file__)), '_rest_check_hero.png'))


if __name__ == '__main__':
    main()
