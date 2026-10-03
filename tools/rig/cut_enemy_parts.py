"""
리그용 적 파츠 분리 스크립트 (Gemini 그림 2장 → 조각 PNG + rig.json) — 경비병·방패병·마취총 사수·전기 충격병·의무병·보스

실행: 프로젝트 루트에서
  python tools/rig/cut_enemy_parts.py guard            # 한 종류
  python tools/rig/cut_enemy_parts.py all              # 전부
  python tools/rig/cut_enemy_parts.py shield --preview # 자르는 선·팔 영역만 그려 확인 (tools/rig/_cut_<적>.png)

입력 (assets/sprites/stage/src, 1024×1024, 두 장은 픽셀 정렬 확인됨: 겹쳐 어긋남 0px)
 - <적>_1_gemini.png : 전신 (왼쪽을 봄, 걷는 중간 자세)
 - <적>_2_gemini.png : 같은 그림에서 팔(소매·손·무기)만 지운 몸

분리 방침 (경비병에서 확인한 방식, D-035)
 - 팔 = 두 그림이 다른 곳. 'two' = 왼쪽 덩어리가 앞팔(무기), 오른쪽이 뒷팔 / 'one' = 두 팔 + 무기를 한 조각(마취총)
   어두운 팔과 그 뒤 배낭처럼 색이 비슷하면 차이가 조각나므로 close(px)로 틈을 메움
 - 몸통 = 팔 없는 그림 (팔이 움직이면 드러나는 곳이 이미 채워져 있음)
 - 머리: head_y 위. 그 아래 몇 px는 몸통에도 남겨(목 띠) 고개를 까딱여도 틈이 안 보이게
 - 다리: hip_y 아래를 사타구니 선(x = crotch + slope × (y - hip_y))으로 둘로. 위쪽 몇 px는 몸통(골반)에도 남김
 - 무기 끝의 불꽃처럼 떨어진 작은 조각도 살림 (가장 큰 덩어리만 남기지 않음)
 - 오른쪽 아래 Gemini 로고는 unlogo.py로 지운 뒤 처리
"""
import os
import sys

import cv2
import numpy as np
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, '..', 'images'))
from rigcut import remove_key_background, largest, grow, cut, save_parts, write_layout, rest_check  # noqa: E402
from unlogo import load_clean  # noqa: E402

SRC = 'assets/sprites/stage/src/{name}_{n}_gemini.png'
OUT = 'assets/sprites/rig/{name}'

# head_y: 머리/몸통 경계(턱 아래), hip_y: 몸통/다리 경계, crotch: hip_y에서 다리 나누는 x, slope: 아래로 갈수록 x 이동
# arms: 'two' | 'one', close: 팔 영역 틈 메우기(px), key: 배경색
# arm_top: 팔(무기) 차이를 찾기 시작하는 y (방패가 머리 높이까지 올라오면 더 위로), head_x: 머리 조각 x 범위 (어깨 갑옷 제외)
# cape: (x, y) 오른쪽 아래의 파란 망토를 따로 한 조각으로 (다리에 붙어 같이 흔들리지 않게, 몸통 뒤에서 살랑임)
# pivot: 자동으로 잡은 회전 중심 대신 (방패·분사기는 맨 위가 아니라 손잡이/어깨에서 돌아야 함)
# flip: 좌우 뒤집어서 처리 (오른쪽을 보는 그림), tail: (x0, y0, x1, y1) 이 영역의 꼬리를 따로 한 조각으로
# not_arm: [(x0, y0, x1, y1)] 팔 차이에서 뺄 곳 (팔 없는 그림이 가슴·망토를 다시 그려 차이가 생긴 곳)
# head_cut: [(x0, y0, x1, y1)] 머리에서 뺄 곳 (머리 높이까지 올라온 등짐 — 몸통에 남김)
ENEMIES = {
    'guard':    {'key': 'green', 'head_y': 392, 'hip_y': 700, 'crotch': 510, 'slope': 0.35, 'arms': 'two', 'close': 0},
    'shield':   {'key': 'green', 'head_y': 408, 'hip_y': 700, 'crotch': 510, 'slope': 0.35, 'arms': 'two', 'close': 11,
                 'arm_top': 200, 'pivot': {'armF': (365, 520)}},
    'tranq':    {'key': 'green', 'head_y': 392, 'hip_y': 700, 'crotch': 510, 'slope': 0.35, 'arms': 'one', 'close': 5},
    'shock':    {'key': 'green', 'head_y': 392, 'hip_y': 700, 'crotch': 510, 'slope': 0.35, 'arms': 'two', 'close': 9},
    'medic':    {'key': 'magenta', 'head_y': 410, 'hip_y': 700, 'crotch': 510, 'slope': 0.35, 'arms': 'two', 'close': 9,
                 'pivot': {'armF': (425, 478)}},
    'guardian': {'key': 'green', 'head_y': 305, 'hip_y': 752, 'crotch': 577, 'slope': 0.35, 'arms': 'two', 'close': 7,
                 'arm_top': 200, 'head_x': (370, 600), 'cape': (600, 380), 'pivot': {'armF': (365, 410)}},
    # ---- 구역 2: 고철 약탈단 (마젠타 배경, D-040) ----
    'raider':   {'key': 'magenta', 'head_y': 400, 'hip_y': 700, 'crotch': 510, 'slope': 0.35, 'arms': 'two', 'close': 9,
                 'not_arm': [(410, 440, 610, 700)]},
    'builder':  {'key': 'magenta', 'head_y': 430, 'hip_y': 735, 'crotch': 517, 'slope': 0.3, 'arms': 'two', 'close': 9,
                 'head_x': (320, 565)},
    'sludge':   {'key': 'magenta', 'head_y': 405, 'hip_y': 700, 'crotch': 510, 'slope': 0.35, 'arms': 'two', 'close': 9,
                 'head_cut': [(615, 285, 900, 410)]},
    'netter':   {'key': 'magenta', 'head_y': 395, 'hip_y': 715, 'crotch': 540, 'slope': 0.3, 'arms': 'one', 'close': 9,
                 'not_arm': [(605, 380, 800, 800)]},
    'mechanic': {'key': 'magenta', 'head_y': 405, 'hip_y': 700, 'crotch': 510, 'slope': 0.35, 'arms': 'two', 'close': 9},
    # 보스 고철왕: 폐차 조종석 = 몸통, 조종사(위) = 머리, 크레인 팔(앞) = armF, 집게 팔(뒤) = armB
    'scrapking': {'key': 'magenta', 'head_y': 290, 'hip_y': 560, 'crotch': 535, 'slope': 0.25, 'arms': 'two', 'close': 5,
                  'arm_top': 60, 'head_x': (470, 700),
                  'pivot': {'armF': (395, 300), 'armB': (812, 420), 'legF': (450, 580), 'legB': (690, 575)}},
    # 합성괴인 졸개(아군): 오른쪽을 보는 그림 → 뒤집어서 적과 같은 방향으로 자름 (게임에선 아군이라 다시 뒤집어 그림)
    'minion':   {'key': 'green', 'flip': True, 'head_y': 470, 'hip_y': 640, 'crotch': 505, 'slope': 0.12, 'arms': 'two',
                 'close': 7, 'arm_top': 400, 'head_x': (200, 560), 'tail': (712, 655, 1024, 775),
                 'pivot': {'armF': (320, 515), 'armB': (585, 470), 'legB': (590, 655), 'tail': (712, 728)}},
}
NECK_BAND = 14            # 몸통이 머리 아래쪽으로 더 가지는 목 띠(px)
HIP_BAND = 32             # 다리가 골반(몸통) 아래로 더 올라가는 겹침(px)
ARM_DIFF = 40             # 두 그림의 색 차이가 이보다 크면 팔
SEAM = 3                  # 팔 조각을 윤곽선까지 넓히는 폭
MIN_ARM = 1500            # 이보다 작은 차이 덩어리는 팔이 아님(다시 그려진 작은 무늬)


def keyed(path, key):
    """로고를 지운 그림 → 배경 제거 RGBA (떨어진 작은 조각도 살림)"""
    rgb, _ = load_clean(path)
    tmp = os.path.join(HERE, f'_tmp_{os.path.basename(path)}')
    Image.fromarray(rgb).save(tmp)
    try:
        return remove_key_background(tmp, key, min_part=40)
    finally:
        os.remove(tmp)


def arm_masks(full, armless, cfg, rows, op1, op2):
    diff = np.abs(full[..., :3].astype(int) - armless[..., :3].astype(int)).max(axis=2) > ARM_DIFF
    cols = np.broadcast_to(np.arange(rows.shape[1])[None, :], rows.shape)
    arms = op1 & (diff | ~op2) & (rows >= cfg.get('arm_top', cfg['head_y']))
    for x0, y0, x1, y1 in cfg.get('not_arm', []):
        arms &= ~((cols >= x0) & (cols < x1) & (rows >= y0) & (rows < y1))
    arms = cv2.morphologyEx(arms.astype(np.uint8), cv2.MORPH_OPEN, np.ones((3, 3), np.uint8)) > 0
    if cfg['close']:
        k = np.ones((cfg['close'], cfg['close']), np.uint8)
        arms = (cv2.morphologyEx(arms.astype(np.uint8), cv2.MORPH_CLOSE, k) > 0) & op1
    n, lab, st, cent = cv2.connectedComponentsWithStats(arms.astype(np.uint8), connectivity=8)
    big = [i for i in range(1, n) if st[i, cv2.CC_STAT_AREA] >= MIN_ARM]
    if cfg['arms'] == 'one':
        arm = np.isin(lab, big)
        return {'arms': grow(arm, op1, SEAM)}
    big = sorted(big, key=lambda i: -st[i, cv2.CC_STAT_AREA])[:2]
    big.sort(key=lambda i: cent[i][0])
    arm_f, arm_b = (lab == big[0]), (lab == big[1])
    # 무기 끝 불꽃처럼 떨어진 작은 조각: 앞팔 가까이(왼쪽)면 앞팔에
    for i in range(1, n):
        if i not in big and st[i, cv2.CC_STAT_AREA] >= 20 and cent[i][0] < cent[big[0]][0] + 40:
            arm_f |= lab == i
    return {'armF': grow(arm_f, op1 & ~arm_b, SEAM), 'armB': grow(arm_b, op1 & ~arm_f, SEAM)}


def arm_pivot(mask):
    """팔 조각 맨 위(어깨) 근처 가운데"""
    ys, xs = np.nonzero(mask)
    top = ys.min()
    band = ys < top + 24
    return float(xs[band].mean()), float(top + 18)


def masks_for(name):
    cfg = ENEMIES[name]
    full = keyed(SRC.format(name=name, n=1), cfg['key'])
    armless = keyed(SRC.format(name=name, n=2), cfg['key'])
    if cfg.get('flip'):
        full, armless = np.ascontiguousarray(full[:, ::-1]), np.ascontiguousarray(armless[:, ::-1])
    H, W = full.shape[:2]
    op1, op2 = full[..., 3] > 0, armless[..., 3] > 0
    rows = np.broadcast_to(np.arange(H)[:, None], (H, W))
    cols = np.broadcast_to(np.arange(W)[None, :], (H, W))
    arms = arm_masks(full, armless, cfg, rows, op1, op2)
    anyarm = np.zeros_like(op1)
    for m in arms.values():
        anyarm |= m
    # 따로 흔드는 조각: 보스 망토(파란색) / 졸개 꼬리(영역)
    cape, extra_name, region = np.zeros_like(op1), None, None
    if 'cape' in cfg:
        rgb = armless[..., :3].astype(int)
        blue = (rgb[..., 2] > rgb[..., 0] + 50) & (rgb[..., 2] > rgb[..., 1] + 30)
        region = (cols >= cfg['cape'][0]) & (rows >= cfg['cape'][1])
        cape = largest(op2 & blue & region)
        extra_name = 'cape'
    elif 'tail' in cfg:
        x0, y0, x1, y1 = cfg['tail']
        region = (cols >= x0) & (cols < x1) & (rows >= y0) & (rows < y1)
        cape = largest(op2 & region)
        extra_name = 'tail'
    if extra_name:
        cape = grow(cape, op2 & region, SEAM)
    head = op1 & (rows < cfg['head_y']) & ~anyarm
    if 'head_x' in cfg:
        head &= (cols >= cfg['head_x'][0]) & (cols < cfg['head_x'][1])
    for x0, y0, x1, y1 in cfg.get('head_cut', []):
        head &= ~((cols >= x0) & (cols < x1) & (rows >= y0) & (rows < y1))
    torso = op2 & ((rows >= cfg['head_y'] - NECK_BAND) | (op1 & ~head & ~anyarm)) & (rows < cfg['hip_y']) & ~cape
    legs = op2 & (rows >= cfg['hip_y'] - HIP_BAND) & ~cape
    split = cfg['crotch'] + cfg['slope'] * (rows - cfg['hip_y'])
    leg_b, leg_f = largest(legs & (cols >= split)), largest(legs & (cols < split))
    rest = legs & ~leg_b & ~leg_f                      # 떨어져 나간 자투리(망토 윤곽선, 뒤꿈치): 망토 또는 가까운 다리로
    if cape.any():
        cape |= rest & region
        rest &= ~cape
    leg_b |= rest & (cols >= split)
    leg_f |= rest & (cols < split)
    masks = {**({extra_name: cape} if cape.any() else {}),
             'legB': leg_b, 'legF': leg_f,
             'torso': torso, **arms, 'head': head}
    return cfg, full, armless, masks


def preview(name):
    cfg, full, armless, masks = masks_for(name)
    colors = {'cape': (255, 255, 60), 'tail': (255, 255, 60), 'legB': (80, 80, 255), 'legF': (60, 200, 255), 'torso': (120, 120, 120), 'armB': (255, 160, 40),
              'armF': (255, 60, 60), 'arms': (255, 60, 60), 'head': (80, 230, 80)}
    vis = (full[..., :3] * 0.45).astype(np.uint8)
    for k, m in masks.items():
        if k == 'torso':
            continue
        vis[m] = (vis[m] * 0.4 + np.array(colors[k]) * 0.6).astype(np.uint8)
    im = Image.fromarray(vis)
    d = ImageDraw.Draw(im)
    d.line([(0, cfg['head_y']), (1024, cfg['head_y'])], fill=(80, 255, 80))
    d.line([(0, cfg['hip_y']), (1024, cfg['hip_y'])], fill=(80, 160, 255))
    d.line([(cfg['crotch'], cfg['hip_y']), (cfg['crotch'] + cfg['slope'] * 250, cfg['hip_y'] + 250)], fill=(80, 160, 255))
    out = os.path.join(HERE, f'_cut_{name}.png')
    im.save(out)
    print('preview', out)


def build(name):
    cfg, full, armless, masks = masks_for(name)
    H, W = full.shape[:2]
    op1 = full[..., 3] > 0
    ground = int(np.nonzero(op1.any(axis=1))[0].max())
    feet_x = np.nonzero(op1[ground - 40:ground + 1].any(axis=0))[0]     # 두 발 끝 사이 가운데
    pivots = {
        'root': (float((feet_x.min() + feet_x.max()) / 2), float(ground)),
        'body': (float(cfg['crotch']), float((cfg['head_y'] + cfg['hip_y']) / 2)),
        'head': (float(np.nonzero(masks['head'][cfg['head_y'] - 1])[0].mean()) if masks['head'][cfg['head_y'] - 1].any()
                 else float(cfg['crotch']), float(cfg['head_y'] + 2)),
        'legF': (float(cfg['crotch'] - 58), float(cfg['hip_y'] + 6)),
        'legB': (float(cfg['crotch'] + 72), float(cfg['hip_y'] + 6)),
    }
    sockets = {'footF': (pivots['legF'][0], float(ground)), 'footB': (pivots['legB'][0], float(ground))}
    weapon = masks.get('armF', masks.get('arms'))
    for k in ('armF', 'armB', 'arms', 'cape', 'tail'):
        if k in masks:
            pivots[k] = arm_pivot(masks[k])
    pivots.update({k: (float(x), float(y)) for k, (x, y) in cfg.get('pivot', {}).items()})
    ys, xs = np.nonzero(weapon)
    tip = int(np.argmin(xs))                                   # 무기 끝 = 앞쪽 조각의 맨 왼쪽
    sockets['tip'] = (float(xs[tip]), float(ys[tip]))

    parts = {}
    for k, m in masks.items():
        src = full if k in ('armF', 'armB', 'arms', 'head') else armless
        parts[k] = cut(src, m)
    out_dir = OUT.format(name=name)
    layout = {'source': {'w': W, 'h': H}, 'ground': ground,
              'parts': save_parts(parts, out_dir),
              'pivots': {k: [float(x), float(y)] for k, (x, y) in pivots.items()},
              'sockets': {k: [float(x), float(y)] for k, (x, y) in sockets.items()}}
    write_layout(out_dir, layout)
    print(name, 'parts:', {k: (v['w'], v['h']) for k, v in layout['parts'].items()})
    order = [k for k in ('cape', 'tail') if k in parts] + ['legB', 'legF', 'torso'] + [k for k in ('armB', 'arms', 'armF') if k in parts] + ['head']
    rest_check(out_dir, layout, order, full, os.path.join(HERE, f'_rest_check_{name}.png'))


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    names = list(ENEMIES) if args == ['all'] else args
    for name in names:
        (preview if '--preview' in sys.argv else build)(name)


if __name__ == '__main__':
    main()
