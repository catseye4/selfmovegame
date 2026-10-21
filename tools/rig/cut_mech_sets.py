"""
거대로봇 A·B 세트 부위 그림 자르기 (D-050 파츠 확장) → assets/sprites/rig/mech/<부위>_a.png · <부위>_b.png + rig.json에 추가

실행: 프로젝트 루트에서  python tools/rig/cut_mech_sets.py   (기본 그림은 cut_mech_parts.py가 만든 것을 그대로 둠)

입력 (Gemini 원본 크기 다운로드, assets/sprites/parts/robot/src/, 2026-10-17)
 - mech_a_cannon_gemini.png / mech_a_armless_gemini.png : A 「포격 지휘」 — 캐논 원본(mech_rig_cannon)을 첨부해 장비만 바꾼 것 / 같은 대화에서 팔다리를 지운 몸
 - mech_b_fist_gemini.png / mech_b_armless_gemini.png   : B 「돌격 강습」 — 주먹 원본(mech_rig_fist)을 첨부

방법
 1. setfit으로 로고를 지우고 기본 원본 칸(939×1024)에 윤곽이 가장 많이 겹치게 놓는다 (팔 없는 몸은 세트 전신의 위쪽 줄에 맞춤)
 2. cut_mech_parts와 같은 배경 제거(돔 유리 → 반투명 청록)와 같은 선으로 자른다.
    세트 장비가 기본 선 밖으로 나오는 곳만 넓힘: 머리 위(A 레이더 접시, B 뿔·투구), 무기 팔 아래(레일건·파일벙커 끝), 다리 아래(발톱·호버 패드)
 3. 무기 팔: A는 레일건(공격 방식 rail → 캐논 팔 armR_cannon_a), B는 파일벙커(근접 → 주먹 팔 armR_fist_b)
 4. 저장은 기본과 같이 좌우 반전. 머리는 조종사 얼굴 방향 때문에 내용을 뒤집지 않고 기본 머리와 같은 양만큼만 옮긴다
    (그래서 A의 빨간 조준경은 돔 뒤쪽에 보인다)
"""
import json
import os
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from rigcut import poly_mask, rect_mask, largest, grow, drop_specks, inpaint, cut  # noqa: E402
import cut_mech_parts as base  # noqa: E402
import setfit  # noqa: E402

SRC_DIR = base.SRC_DIR
OUT_DIR = base.OUT_DIR
TMP_DIR = 'tools/rig/_sets_tmp'
CHECK_DIR = os.path.dirname(os.path.abspath(__file__))

SETS = {
    'a': {'full': 'mech_a_cannon', 'less': 'mech_a_armless', 'ref': base.SRC_MAIN, 'weapon': 'armR_cannon',
          'head_extra': [(395, 40), (570, 40), (570, 135), (395, 135)]},                       # 레이더 접시
    'b': {'full': 'mech_b_fist', 'less': 'mech_b_armless', 'ref': base.SRC_FIST, 'weapon': 'armR_fist',
          # 뿔·투구 — 왼쪽은 뿔 윤곽을 따라 (캐니스터 오른쪽 끝이 x≈300~325), 오른쪽은 추진기(x>640) 앞에서 끊음
          'head_extra': [(350, 95), (650, 95), (650, 200), (638, 215), (638, 300), (308, 300), (306, 262),
                         (320, 215), (336, 170), (350, 125)]},
}
# 기본 선을 아래로 넓힌 것 (무기 끝·발이 기본보다 낮게 나옴)
ARM_A_POLY = base.ARM_A_POLY[:8] + [(150, 790), (100, 840), (60, 862), (0, 862), (0, 549)]
LEG_A_POLY = base.LEG_A_POLY[:7] + [(445, 1024), (155, 1024)]
LEG_B_POLY = base.LEG_B_POLY[:5] + [(780, 1024), (535, 1024)]
LESS_ROWS = 540            # 팔 없는 몸은 이 y 위(머리·캐니스터·몸통 윗부분)로 세트 전신에 맞춤


def head_shift():
    """기본 머리가 원본에서 옮겨진 양 (내용은 안 뒤집고 반전 자리로 옮김)"""
    layout = json.load(open(f'{OUT_DIR}/rig.json', encoding='utf-8'))
    hp = layout['parts']['head']
    W = layout['source']['w']
    hx0 = W - hp['x'] - hp['w']
    return hp['x'] - hx0


def cut_set(v):
    cfg = SETS[v]
    ref = setfit.keymask(np.asarray(Image.open(cfg['ref']).convert('RGB')))
    full_rgb, iou1, p1 = setfit.fit(setfit.load(f"{SRC_DIR}/{cfg['full']}_gemini.png"), ref)
    region = np.zeros(ref.shape, bool)
    region[:LESS_ROWS] = True
    less_rgb, iou2, p2 = setfit.fit(setfit.load(f"{SRC_DIR}/{cfg['less']}_gemini.png"), setfit.keymask(full_rgb), region)
    print(f'[{v}] 전신 → 기본: IoU {iou1:.3f} {p1} / 팔 없는 몸 → 전신(위쪽): IoU {iou2:.3f} {p2}')
    src = base.remove_background(setfit.save_tmp(full_rgb, f'{TMP_DIR}/mech_{v}_full.png'))
    armless = base.remove_background(setfit.save_tmp(less_rgb, f'{TMP_DIR}/mech_{v}_less.png'))

    H, W = src.shape[:2]
    shape = src.shape
    opaque = src[..., 3] > 0
    rows = np.broadcast_to(np.arange(H)[:, None], (H, W))

    head_zone = poly_mask(shape, base.HEAD_POLY) | poly_mask(shape, cfg['head_extra'])
    head = grow(head_zone & opaque, opaque & (rows < base.HEAD_MARGIN_Y), 3)
    canister = rect_mask(shape, base.CANISTER_BOX) & (src[..., 3] == 255) & ~head
    no_torso = ~rect_mask(shape, base.TORSO_BOX) & ~head
    no_legs = ~poly_mask(shape, LEG_A_POLY) & ~poly_mask(shape, LEG_B_POLY)
    no_pelvis = ~rect_mask(shape, base.PELVIS_BOX)
    arm_top = rows >= ARM_A_POLY[0][1] + 2
    arm_a = largest(poly_mask(shape, ARM_A_POLY) & opaque)
    arm_a = drop_specks(grow(arm_a, opaque & arm_top & no_torso & no_legs), 80)
    arm_b = largest(poly_mask(shape, base.ARM_B_POLY) & opaque)
    arm_b = drop_specks(grow(arm_b, opaque & (rows >= base.ARM_B_POLY[0][1] + 2) & no_torso & no_legs), 80)
    leg_a = largest(poly_mask(shape, LEG_A_POLY) & opaque & ~arm_a)
    leg_a = grow(leg_a, opaque & (rows >= LEG_A_POLY[0][1] + 2) & ~arm_a & no_pelvis)
    leg_b = largest(poly_mask(shape, LEG_B_POLY) & opaque & ~arm_b)
    leg_b = grow(leg_b, opaque & (rows >= LEG_B_POLY[0][1] + 2) & ~arm_b & no_pelvis)

    body = (opaque
            & ~(head & (rows < base.HEAD_CUT_Y))
            & ~(canister & (rows < base.CANISTER_CUT_Y))
            & ~arm_a & ~arm_b & ~leg_a & ~leg_b)
    body = drop_specks(body)

    body_img = cut(src, body)
    fill = ((rect_mask(shape, base.ARMPIT_A) | rect_mask(shape, base.ARMPIT_B) | rect_mask(shape, base.TORSO_BOX))
            & (body_img[..., 3] == 0) & (armless[..., 3] == 255))
    body_img[fill] = armless[fill]

    leg_a_img = cut(src, leg_a | (rect_mask(shape, base.LEG_A_MARGIN) & opaque))
    leg_b_full = leg_b | (rect_mask(shape, base.LEG_B_MARGIN) & opaque)
    leg_b_img = inpaint(cut(src, leg_b_full), arm_b & poly_mask(shape, LEG_B_POLY) & ~leg_b_full)

    parts = {
        'body': body_img,
        'head': cut(src, head & (rows < base.HEAD_MARGIN_Y)),
        'canister': cut(src, canister),
        cfg['weapon']: cut(src, arm_a),
        'armL': cut(src, arm_b),
        'legR': leg_a_img,
        'legL': leg_b_img,
    }
    empty = [k for k, p in parts.items() if not p[..., 3].any()]
    if empty:
        raise SystemExit(f'[{v}] 비어 있는 조각: {empty}')

    # ---- 저장: 좌우 반전 (머리는 내용 유지, 기본 머리와 같은 양만 옮김) ----
    shift = head_shift()
    layout = {}
    comp = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    for name, img in parts.items():
        ys, xs = np.nonzero(img[..., 3])
        x0, y0, x1, y1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
        crop = img[y0:y1, x0:x1]
        if name == 'head':
            nx = x0 + shift
        else:
            crop = crop[:, ::-1]
            nx = W - x1
        key = f'{name}_{v}'
        Image.fromarray(np.ascontiguousarray(crop), 'RGBA').save(f'{OUT_DIR}/{key}.png')
        layout[key] = {'src': f'{key}.png', 'x': int(nx), 'y': int(y0), 'w': int(x1 - x0), 'h': int(y1 - y0)}

    # ---- 검증: 기본 자세로 다시 합쳐 세트 전신(반전, 머리 자리는 기본과 같게)과 비교 ----
    for name in ['legL', 'legR', 'head', 'canister', 'body', 'armL', cfg['weapon']]:
        p = layout[f'{name}_{v}']
        comp.alpha_composite(Image.open(f"{OUT_DIR}/{p['src']}"), (p['x'], p['y']))
    ref_img = np.ascontiguousarray(src[:, ::-1]).copy()
    head_img = parts['head']
    hy, hx = np.nonzero(head_img[..., 3])
    flipped_head = (head_img[..., 3] > 0)[:, ::-1]
    ref_img[flipped_head] = 0
    moved = np.zeros_like(ref_img)
    moved[hy, np.clip(hx + shift, 0, W - 1)] = head_img[hy, hx]
    ref_img = np.where(moved[..., 3:] > 0, moved, ref_img)
    c = np.asarray(comp)
    missing = (ref_img[..., 3] > 0) & (c[..., 3] == 0)
    diff = np.abs(c[..., :3].astype(int) - ref_img[..., :3].astype(int)).max(2)
    changed = (ref_img[..., 3] == 255) & (c[..., 3] > 0) & (diff > 40)
    comp.save(os.path.join(CHECK_DIR, f'_rest_check_mech_{v}.png'))
    print(f'[{v}] 조각: {list(layout)}')
    print(f'[{v}] rest-pose check: missing px={int(missing.sum())}, changed px={int(changed.sum())} of {int((ref_img[..., 3] > 0).sum())}')
    return layout


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
