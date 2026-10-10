"""
리그용 새 캐릭터 파츠 분리 (Gemini 그림 4장 → 기본·강화 조각 PNG + rig.json) — D-044 새 캐릭터 공용

실행: 프로젝트 루트에서
  python tools/rig/cut_newchar_parts.py saint            # 조각 + rig.json
  python tools/rig/cut_newchar_parts.py saint --preview  # 자르는 선·조각 영역만 그려 확인 (tools/rig/_cut_<id>[_up].png)

입력 (assets/sprites/parts/<id>/src, 1024×1024 단색 배경, 네 장 겹쳐 어긋남 0px, 오른쪽을 봄 → 반전 없음)
 - 기본 전신 / 기본 팔 없음 / 강화 전신 / 강화 팔 없음 (파일 이름은 CHARS의 src)

분리 방침 (길잡이에서 정함, 캐릭터마다 CHARS 표에 자르는 선)
 - 기본·강화가 뼈대 하나를 같이 씀: 피벗·소켓은 한 벌, 조각은 <부위>와 <부위>_up 두 벌 (D-044 그림 바꿔 끼우기)
 - 팔 = 전신과 팔 없는 그림이 다른 곳 (cut_enemy_parts.arm_masks). 오른쪽 덩어리 = 앞팔(armF, 적 쪽 무기), 왼쪽 = 뒷팔(armB)
 - 머리 = head_poly. 몸통에 닿는 가장자리 띠(NECK_BAND)는 몸통에도 남겨 고개를 까딱여도 틈이 안 보이게
 - 다리 (legs)
     'split': hip_y 아래를 사타구니 선(x = crotch + slope × (y - hip_y))으로 둘 — 바지·잠수복처럼 다리가 드러난 캐릭터
              위쪽 띠(HIP_BAND)는 몸통(골반) 뒤로 겹침, not_leg 사각형(등 뒤 밧줄 등)은 몸통
     'poly' : 다리 다각형 둘 — 치마·로브가 다리 위를 덮는 캐릭터. 다리는 몸통 뒤에 그리고, leg_cut_y 아래만 몸통에서 뺌
              (다리를 들면 윗부분이 치맛자락 밑으로 들어감)
"""
import os
import sys

import numpy as np
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from rigcut import poly_mask, rect_mask, largest, grow, cut, save_parts, write_layout, rest_check  # noqa: E402
from cut_enemy_parts import keyed, arm_masks  # noqa: E402

NECK_BAND = 14         # 몸통이 머리 가장자리를 더 가지는 띠(px)
HIP_BAND = 32          # 'split' 다리가 골반(몸통) 아래로 더 올라가는 겹침(px)
ORDER = ['legB', 'legF', 'torso', 'head', 'armB', 'armF']

CHARS = {
    # 심연의 길잡이 (마젠타): 앞팔 = 물대포(어깨부터), 뒷팔 = 앵커를 쥔 손(손목부터 — 위팔은 큰 어깨 갑옷 아래 몸통에 그려져 있음)
    # 등 뒤 밧줄은 엉덩이 높이까지 내려오지만 몸통. 강화 잠수모 옆 관이 머리 영역 밖으로 나간 부분은 몸통에 붙음
    'diver': {
        'key': 'magenta',
        'src': ('diver_1_gemini.png', 'diver_2_gemini.png', 'diver_3_gemini.png', 'diver_4_merged.png'),
        'head_poly': [(394, 330), (398, 220), (430, 160), (480, 120), (520, 80), (620, 80), (660, 140), (712, 190),
                      (726, 260), (722, 340), (700, 388), (650, 400), (560, 402), (500, 394), (460, 384), (420, 372)],
        'arm': {'arms': 'two', 'close': 9, 'head_y': 400, 'arm_top': 440},
        'legs': 'split', 'hip_y': 700, 'crotch': 525, 'slope': 0.1, 'not_leg': [(250, 600, 398, 745)],
        'pivots': {'root': (535, 912), 'torso': (540, 690), 'head': (575, 395),
                   'armF': (682, 592), 'armB': (385, 585), 'legB': (470, 700), 'legF': (600, 700)},
        'sockets': {'muzzle': (852, 652), 'muzzleUp': (905, 660),      # 물대포 끝 (강화 물대포가 더 김)
                    'anchor': (520, 790), 'hand': (385, 625),          # 앵커 갈고리, 앵커 쥔 손
                    'eye': (655, 275), 'lamp': (322, 360),             # 잠수모 창, 산소통 등불
                    'footB': (400, 905), 'footF': (640, 905)},
    },
    # 봉합 성녀 (초록): 앞팔 = 큰 주사기(강화: 이중 주사기 대포), 뒷팔 = 작은 주사기(강화: 황동 집게)
    # 등 뒤 장대의 황동 상자·부적은 몸통. 떠 있는 부적과 머리 뒤 작은 후광은 머리. 로브가 다리를 덮어 다리는 다각형
    'saint': {
        'key': 'green',
        'src': ('saint_1_gemini.png', 'saint_2_gemini.png', 'saint_3_gemini.png', 'saint_4_clean.png'),
        'head_poly': [(330, 165), (610, 165), (685, 290), (685, 425), (640, 470), (605, 500), (520, 506), (450, 501),
                      (400, 486), (340, 478), (238, 448), (238, 385), (295, 318), (325, 255)],
        'arm': {'arms': 'two', 'close': 9, 'head_y': 500, 'arm_top': 480},
        'legs': 'poly', 'leg_cut_y': 762,
        'leg_b_poly': [(352, 738), (432, 738), (440, 790), (436, 840), (336, 840), (338, 792), (352, 790)],
        'leg_f_poly': [(512, 738), (566, 738), (604, 768), (624, 800), (624, 840), (514, 840), (508, 790)],
        'pivots': {'root': (485, 835), 'torso': (485, 700), 'head': (515, 500),
                   'armF': (588, 548), 'armB': (385, 552), 'legB': (395, 745), 'legF': (560, 745)},
        'sockets': {'muzzle': (900, 578), 'muzzleUp': (912, 606),     # 주사기 바늘 끝 (강화 이중 주사기는 두 바늘 가운데)
                    'backTip': (205, 712), 'backTipUp': (185, 770),   # 뒷손 작은 주사기 끝 / 강화 집게 끝
                    'halo': (470, 232), 'chest': (500, 600),           # 후광 가운데, 가슴 붉은 십자
                    'footB': (390, 832), 'footF': (575, 832)},
    },
}


def masks_for(cfg, full, armless):
    H, W = full.shape[:2]
    op1, op2 = full[..., 3] > 0, armless[..., 3] > 0
    rows = np.broadcast_to(np.arange(H)[:, None], (H, W))
    cols = np.broadcast_to(np.arange(W)[None, :], (H, W))
    arms = arm_masks(full, armless, cfg['arm'], rows, op1, op2)
    arm_b, arm_f = arms['armF'], arms['armB']             # arm_masks는 왼쪽 덩어리를 armF로 줌 (적은 왼쪽을 봄)
    head = poly_mask(full.shape, cfg['head_poly']) & op2
    near_body = grow(op2 & ~head, head, NECK_BAND) & head   # 몸통에 닿는 머리 가장자리 띠
    if cfg['legs'] == 'split':
        not_leg = np.zeros_like(op2)
        for box in cfg.get('not_leg', []):
            not_leg |= rect_mask(full.shape, box)
        hip = cfg['hip_y']
        legs = op2 & (rows >= hip - HIP_BAND) & ~not_leg
        split = cfg['crotch'] + cfg['slope'] * (rows - hip)
        leg_b, leg_f = largest(legs & (cols < split)), largest(legs & (cols >= split))
        rest = legs & ~leg_b & ~leg_f
        leg_b |= rest & (cols < split) & (rows >= hip)
        leg_f |= rest & (cols >= split) & (rows >= hip)
        cut_y = hip
    else:
        leg_b = largest(poly_mask(full.shape, cfg['leg_b_poly']) & op2)
        leg_f = largest(poly_mask(full.shape, cfg['leg_f_poly']) & op2)
        cut_y = cfg['leg_cut_y']
    torso = op2 & ~(head & ~near_body) & ~((leg_b | leg_f) & (rows >= cut_y))
    return {'legB': leg_b, 'legF': leg_f, 'torso': torso, 'head': head, 'armB': arm_b, 'armF': arm_f}


def preview(cfg, masks, full, path):
    colors = {'legB': (80, 80, 255), 'legF': (60, 200, 255), 'armB': (255, 160, 40), 'armF': (255, 60, 60),
              'head': (80, 230, 80)}
    vis = (full[..., :3] * 0.45).astype(np.uint8)
    for k, m in masks.items():
        if k in colors:
            vis[m] = (vis[m] * 0.4 + np.array(colors[k]) * 0.6).astype(np.uint8)
    im = Image.fromarray(vis)
    d = ImageDraw.Draw(im)
    d.polygon(cfg['head_poly'], outline=(80, 255, 80))
    if cfg['legs'] == 'split':
        hip, c, sl = cfg['hip_y'], cfg['crotch'], cfg['slope']
        d.line([(0, hip), (1024, hip)], fill=(80, 160, 255))
        d.line([(c, hip), (c + sl * 250, hip + 250)], fill=(80, 160, 255))
        for box in cfg.get('not_leg', []):
            d.rectangle(box, outline=(255, 255, 0))
    else:
        d.polygon(cfg['leg_b_poly'], outline=(120, 120, 255))
        d.polygon(cfg['leg_f_poly'], outline=(120, 220, 255))
        d.line([(0, cfg['leg_cut_y']), (1024, cfg['leg_cut_y'])], fill=(80, 160, 255))
    for x, y in cfg['pivots'].values():
        d.ellipse([x - 6, y - 6, x + 6, y + 6], fill=(255, 0, 85))
    for x, y in cfg['sockets'].values():
        d.line([(x - 8, y), (x + 8, y)], fill=(0, 255, 204), width=2)
        d.line([(x, y - 8), (x, y + 8)], fill=(0, 255, 204), width=2)
    im.save(path)


def main():
    cid = sys.argv[1]
    cfg = CHARS[cid]
    src_dir = f'assets/sprites/parts/{cid}/src/'
    out_dir = f'assets/sprites/rig/{cid}'
    full_b, armless_b, full_u, armless_u = cfg['src']
    parts, sheets = {}, []
    for suffix, (full_name, armless_name) in {'': (full_b, armless_b), '_up': (full_u, armless_u)}.items():
        full = keyed(src_dir + full_name, cfg['key'])
        armless = keyed(src_dir + armless_name, cfg['key'])
        masks = masks_for(cfg, full, armless)
        if '--preview' in sys.argv:
            preview(cfg, masks, full, os.path.join(HERE, f'_cut_{cid}{suffix}.png'))
        for k, m in masks.items():
            parts[k + suffix] = cut(full if k.startswith('arm') else armless, m)
        sheets.append((suffix, full))
    if '--preview' in sys.argv:
        print('preview', os.path.join(HERE, f'_cut_{cid}*.png'))
        return
    piv = cfg['pivots']
    layout = {'source': {'w': 1024, 'h': 1024}, 'ground': piv['root'][1],
              'parts': save_parts(parts, out_dir),
              'pivots': {k: [float(x), float(y)] for k, (x, y) in piv.items()},
              'sockets': {k: [float(x), float(y)] for k, (x, y) in cfg['sockets'].items()}}
    write_layout(out_dir, layout)
    print('parts:', list(parts))
    for suffix, full in sheets:
        rest_check(out_dir, layout, [k + suffix for k in ORDER], full,
                   os.path.join(HERE, f'_rest_check_{cid}{suffix}.png'))


if __name__ == '__main__':
    main()
