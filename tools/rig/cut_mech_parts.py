"""
리그 테스트용 거대로봇 파츠 분리 스크립트 (Gemini 크로마키 이미지 → 조각 PNG + rig.json)

실행: 프로젝트 루트에서  python tools/rig/cut_mech_parts.py

처리 순서
 1. 초록(#00FF00) 배경 제거. 돔 유리에 비친 초록은 반투명 청록 유리로 교체, 워터마크 등 떨어진 조각 제거
 2. 원본 좌표(좌우 반전 전)에서 머리/캐니스터/팔/다리/몸통 분리
    - 뒤에 그려지는 조각(머리, 캐니스터, 다리)은 부모 쪽으로 여유분(margin)을 더 포함 → 움직여도 틈이 안 보임
    - 팔에 가려져 원래 그림이 없는 어깨 아래는 Gemini '팔다리 없는 몸통' 이미지의 연결 실린더로 채움
      (그 이미지의 바퀴형 원판 소켓은 디자인이 달라 쓰지 않고, 원판 윗선까지만 사용)
    - 블록 팔 손 뒤의 허벅지처럼 참고 이미지에도 없는 곳은 주변 픽셀로 인페인팅
 3. 좌우 반전(무기가 오른쪽=적 방향을 보도록). 머리는 조종사 얼굴 방향 유지를 위해 내용은 반전하지 않고 위치만 반전
 4. 조각 PNG와 rig.json(조각 위치, 피벗, 소켓) 저장
"""
import json
import os

import cv2
import numpy as np
from PIL import Image

from rigcut import poly_mask, rect_mask, largest, grow, drop_specks, inpaint, cut

SRC_DIR = 'assets/sprites/parts/robot/src'
SRC_MAIN = f'{SRC_DIR}/mech_rig_cannon_gemini.png'   # 몸통/머리/다리/왼팔은 이 이미지에서
SRC_FIST = f'{SRC_DIR}/mech_rig_fist_gemini.png'     # 주먹 팔 변형
SRC_ARMLESS = f'{SRC_DIR}/mech_armless_gemini.png'   # 팔다리 없는 몸통 (원본과 픽셀 정렬 확인됨)
OUT_DIR = 'assets/sprites/rig/mech'

GREEN_T = 60
DOME_BOX = (290, 225, 665, 500)
GLASS_RGBA = (70, 150, 175, 120)

# ---- 원본(반전 전) 좌표 정의 ----
HEAD_CUT_Y, HEAD_MARGIN_Y = 497, 515          # 몸통은 497 아래를 유지, 머리 조각은 515까지 포함(목 링 뒤로 숨는 여유분)
# 돔 윤곽 + 위 캡. 아래쪽 양옆은 어깨 장갑이 앞을 가리므로 안쪽으로 좁힘
HEAD_POLY = [(395, 125), (560, 125), (560, 228), (600, 245), (630, 270), (650, 305), (658, 350),
             (658, 380), (646, 395), (646, 515), (292, 515), (292, 395), (286, 350), (292, 305),
             (315, 270), (350, 245), (395, 230)]
CANISTER_BOX = (155, 25, 335, 318)
CANISTER_CUT_Y = 300
ARM_A_POLY = [(10, 549), (250, 549), (290, 585), (290, 690), (262, 715), (232, 745),
              (205, 775), (150, 790), (100, 815), (10, 815)]            # 무기 팔 (반전 후 화면 오른쪽)
ARM_B_POLY = [(650, 552), (895, 552), (898, 700), (885, 840), (720, 840), (690, 815),
              (672, 770), (680, 700), (655, 690), (640, 645), (650, 600)]  # 블록 팔 (반전 후 화면 왼쪽)
LEG_A_POLY = [(155, 735), (300, 735), (330, 742), (395, 752), (425, 790), (425, 860),
              (445, 880), (445, 990), (155, 990)]                        # 반전 후 화면 오른쪽 다리
LEG_B_POLY = [(535, 705), (680, 705), (700, 800), (722, 832), (775, 850), (780, 990), (535, 990)]
LEG_A_MARGIN = (230, 715, 400, 735)   # 몸통 뒤로 숨는 허벅지 윗부분 여유분
LEG_B_MARGIN = (555, 685, 680, 705)

PIVOTS = {
    'root': (470, 975),
    'body': (470, 700),
    'head': (470, 500),
    'canister': (246, 300),
    'armA': (207, 556),
    'armB': (765, 572),
    'legA': (315, 745),
    'legB': (615, 712),
}
ARMPIT_A = (150, 540, 290, 603)   # 무기 팔이 가리던 어깨 아래 → 팔다리 없는 이미지로 채움
ARMPIT_B = (685, 548, 830, 628)
EDGE_GROW = 7                     # 팔다리 윤곽선이 몸통에 남지 않도록 경계를 넓히는 폭
TORSO_BOX = (288, 497, 652, 705)  # 팔 경계 넓히기가 몸통 옆면을 가져가지 않도록 제외
PELVIS_BOX = (425, 690, 540, 800)  # 다리 경계 넓히기가 골반을 가져가지 않도록 제외
SOCKETS = {
    'muzzle_cannon': (35, 715),
    'muzzle_fist': (38, 670),
    'footA': (300, 972),
    'footB': (655, 972),
}


def remove_background(path):
    a = np.asarray(Image.open(path).convert('RGB')).astype(np.float32)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    greenness = g - np.maximum(r, b)
    n, lab, st, _ = cv2.connectedComponentsWithStats((greenness > GREEN_T).astype(np.uint8), connectivity=4)
    dx0, dy0, dx1, dy1 = DOME_BOX
    alpha = np.full(g.shape, 255, np.uint8)
    rgb = a.copy()
    dome = np.zeros(g.shape, bool)
    for i in range(1, n):
        x, y, w, h, area = st[i]
        if x >= dx0 and y >= dy0 and x + w <= dx1 and y + h <= dy1 and area > 500:
            dome |= lab == i
        else:
            alpha[lab == i] = 0
    rgb[dome] = GLASS_RGBA[:3]
    alpha[dome] = GLASS_RGBA[3]
    spill = (alpha == 255) & (greenness > 12)
    rgb[..., 1] = np.where(spill, np.maximum(r, b) + 12, rgb[..., 1])
    n2, lab2, st2, _ = cv2.connectedComponentsWithStats((alpha > 0).astype(np.uint8), connectivity=8)
    main = 1 + int(np.argmax(st2[1:, cv2.CC_STAT_AREA]))
    alpha[(lab2 != main) & (lab2 != 0)] = 0
    return np.dstack([np.clip(rgb, 0, 255).astype(np.uint8), alpha])


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    src = remove_background(SRC_MAIN)
    fist_src = remove_background(SRC_FIST)
    armless = remove_background(SRC_ARMLESS)
    H, W = src.shape[:2]
    opaque = src[..., 3] > 0
    rows = np.broadcast_to(np.arange(H)[:, None], (H, W))

    head = grow(poly_mask(src.shape, HEAD_POLY) & opaque, opaque & (rows < HEAD_MARGIN_Y), 3)
    canister = rect_mask(src.shape, CANISTER_BOX) & (src[..., 3] == 255) & ~head
    # 팔 경계 넓히기는 몸통 옆면과 다리 영역을 건드리지 않는다 (다리 윤곽선이 팔에 딸려 떠다니는 것 방지)
    no_torso = ~rect_mask(src.shape, TORSO_BOX) & ~head
    no_legs = ~poly_mask(src.shape, LEG_A_POLY) & ~poly_mask(src.shape, LEG_B_POLY)
    no_pelvis = ~rect_mask(src.shape, PELVIS_BOX)
    arm_top = rows >= ARM_A_POLY[0][1] + 2
    arm_a = largest(poly_mask(src.shape, ARM_A_POLY) & opaque)
    arm_a = drop_specks(grow(arm_a, opaque & arm_top & no_torso & no_legs), 80)
    arm_a_fist = largest(poly_mask(src.shape, ARM_A_POLY) & (fist_src[..., 3] > 0))
    arm_a_fist = drop_specks(grow(arm_a_fist, (fist_src[..., 3] > 0) & arm_top & no_torso & no_legs), 80)
    arm_b = largest(poly_mask(src.shape, ARM_B_POLY) & opaque)
    arm_b = drop_specks(grow(arm_b, opaque & (rows >= ARM_B_POLY[0][1] + 2) & no_torso & no_legs), 80)
    leg_a = largest(poly_mask(src.shape, LEG_A_POLY) & opaque & ~arm_a)
    leg_a = grow(leg_a, opaque & (rows >= LEG_A_POLY[0][1] + 2) & ~arm_a & no_pelvis)
    leg_b = largest(poly_mask(src.shape, LEG_B_POLY) & opaque & ~arm_b)
    leg_b = grow(leg_b, opaque & (rows >= LEG_B_POLY[0][1] + 2) & ~arm_b & no_pelvis)

    body = (opaque
            & ~(head & (rows < HEAD_CUT_Y))
            & ~(canister & (rows < CANISTER_CUT_Y))
            & ~arm_a & ~arm_b & ~leg_a & ~leg_b)
    body = drop_specks(body)

    # 어깨 아래와 몸통 옆면(팔이 가리던 곳): 원본 몸통 픽셀이 없는 곳만 팔다리 없는 이미지로 채움
    body_img = cut(src, body)
    fill = ((rect_mask(src.shape, ARMPIT_A) | rect_mask(src.shape, ARMPIT_B) | rect_mask(src.shape, TORSO_BOX))
            & (body_img[..., 3] == 0) & (armless[..., 3] == 255))
    body_img[fill] = armless[fill]

    leg_a_img = cut(src, leg_a | (rect_mask(src.shape, LEG_A_MARGIN) & opaque))
    leg_b_full = leg_b | (rect_mask(src.shape, LEG_B_MARGIN) & opaque)
    leg_b_img = cut(src, leg_b_full)
    # 블록 팔의 손이 가리던 허벅지 부분 채우기
    leg_b_img = inpaint(leg_b_img, arm_b & poly_mask(src.shape, LEG_B_POLY) & ~leg_b_full)

    parts = {
        'body': body_img,
        'head': cut(src, head & (rows < HEAD_MARGIN_Y)),
        'canister': cut(src, canister),
        'armR_cannon': cut(src, arm_a),
        'armR_fist': cut(fist_src, arm_a_fist),
        'armL': cut(src, arm_b),
        'legR': leg_a_img,
        'legL': leg_b_img,
    }

    # ---- 좌우 반전 (머리는 내용 유지, 위치만 반전) ----
    def fx(x):
        return W - x

    layout = {'source': {'w': W, 'h': H}, 'ground': PIVOTS['root'][1], 'parts': {}, 'pivots': {}, 'sockets': {}}
    for name, img in parts.items():
        ys, xs = np.nonzero(img[..., 3])
        x0, y0, x1, y1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
        crop = img[y0:y1, x0:x1]
        if name != 'head':
            crop = crop[:, ::-1]
        nx = fx(x1)
        Image.fromarray(np.ascontiguousarray(crop), 'RGBA').save(f'{OUT_DIR}/{name}.png')
        layout['parts'][name] = {'src': f'{name}.png', 'x': int(nx), 'y': int(y0), 'w': int(x1 - x0), 'h': int(y1 - y0)}

    bone_of = {'root': 'root', 'body': 'body', 'head': 'head', 'canister': 'canister',
               'armA': 'armR', 'armB': 'armL', 'legA': 'legR', 'legB': 'legL'}
    for key, (px, py) in PIVOTS.items():
        layout['pivots'][bone_of[key]] = [float(fx(px)), float(py)]
    # 머리는 내용이 반전되지 않았으므로 조각 안에서의 피벗 상대 위치를 유지
    hp = layout['parts']['head']
    hx0 = W - (hp['x'] + hp['w'])  # 반전 전 원래 x0
    layout['pivots']['head'][0] = float(hp['x'] + (PIVOTS['head'][0] - hx0))
    socket_name = {'footA': 'footR', 'footB': 'footL'}
    for key, (sx, sy) in SOCKETS.items():
        layout['sockets'][socket_name.get(key, key)] = [float(fx(sx)), float(sy)]

    with open(f'{OUT_DIR}/rig.json', 'w', encoding='utf-8') as f:
        json.dump(layout, f, ensure_ascii=False, indent=2)

    # ---- 검증: 기본 자세로 다시 합쳤을 때 원본과 비교 ----
    ref = src[:, ::-1]
    comp = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    for name in ['legL', 'legR', 'head', 'canister', 'body', 'armL', 'armR_cannon']:
        p = layout['parts'][name]
        comp.alpha_composite(Image.open(f"{OUT_DIR}/{p['src']}"), (p['x'], p['y']))
    comp_a = np.asarray(comp)
    missing = (ref[..., 3] > 0) & (comp_a[..., 3] == 0)
    diff = np.abs(comp_a[..., :3].astype(int) - ref[..., :3].astype(int)).max(2)
    changed = (ref[..., 3] == 255) & (diff > 40)
    print(f'parts: {list(parts)}')
    print(f'rest-pose check: missing px={int(missing.sum())}, changed px={int(changed.sum())} '
          f'of {int((ref[..., 3] > 0).sum())}')
    comp.save(os.path.join(os.path.dirname(os.path.abspath(__file__)), '_rest_check.png'))


if __name__ == '__main__':
    main()
