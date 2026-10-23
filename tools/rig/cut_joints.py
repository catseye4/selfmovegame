"""
관절 나누기 — 손(무기)을 팔에서 떼어 손목 관절을 만든다 (Q-008 단계 2, D-067)

실행: 프로젝트 루트에서 (cut_newchar_parts.py 등으로 리그 조각을 만든 **뒤에** 돌림 — rig.json에 조각·피벗을 더함)
  python tools/rig/cut_joints.py frost
  python tools/rig/cut_joints.py frost --preview   # 자른 결과만 그려 확인 (tools/rig/_joints_<id>.png)

입력 (assets/sprites/parts/<id>/src, 원래 리그를 만든 그림과 같은 1024 단색 배경·같은 자리)
 - 전신 (리그를 만든 그림) + **손 지운 전신** (Gemini: 손과 무기만 지우고 소매 끝은 빈 소맷부리, 가려졌던 곳은 채움)
 - 팔 없는 몸 (리그를 만든 그림) — 무기에 가려졌던 소매를 찾을 때 씀

방식
 - 손+무기 = 팔 조각(rig.json 그 팔 부위) 안에서 전신과 손 지운 그림이 다른 곳
 - 소매 = 팔 조각의 나머지 (+ reveal이면 무기에 가려졌다가 손 지운 그림에서 드러난 소매 — 손 지운 그림이 팔 없는 몸과 다른 곳.
   무기 뒤가 소매인 캐릭터만: 무희 부채. 무기 뒤가 몸통이면 끔 — 두 그림을 따로 그려 생긴 차이가 소매로 잘못 들어가지 않게)
 - 손목 피벗 = 손 조각 중 소매에 닿은 곳에서 어깨에 가장 가까운 점들의 가운데
 - 팔 뼈는 소매 그림(<팔>_sleeve.png)을, 새 손 뼈는 손 그림(<손>.png)을 씀 — <팔>.png(전체 팔)는 연구소 카드 그림으로 그대로 둠
 - 기본·강화 그림(<부위>_up)이 뼈대 하나를 같이 쓰므로 피벗은 기본 그림 기준 한 벌
"""
import json
import os
import sys

import cv2
import numpy as np
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from cut_enemy_parts import keyed  # noqa: E402

DIFF = 48        # 전신 ↔ 손 지운 그림: 이만큼 다르면 손·무기 (다시 그리며 생긴 잡티 2~3%는 이보다 작음)
MIN_PIECE = 150  # 손 조각으로 칠 가장 작은 덩어리 (px)

CHARS = {
    # 서리의 무희: 두 손 + 얼음 부채 (부채에 매달린 보라 술 포함). 기본 = 1·2, 강화 = 3·4
    'frost': {
        'key': 'green',
        'variants': {
            '': ('frost_1_gemini.png', 'frost_1_nohands_gemini.png', 'frost_2_gemini.png'),
            '_up': ('frost_3_gemini.png', 'frost_3_nohands_gemini.png', 'frost_4_gemini.png'),
        },
        'hands': {'armF': 'handF', 'armB': 'handB'},
        'reveal': True,
    },
    # 봉합 성녀: 앞손 + 큰 주사기(강화: 이중 주사기 대포). 앞팔 조각 대부분이 주사기라 소매는 왼쪽 소맷부리만 남음
    'saint': {
        'key': 'green',
        'variants': {
            '': ('saint_1_gemini.png', 'saint_1_nohands_gemini.png', 'saint_2_gemini.png'),
            '_up': ('saint_3_gemini.png', 'saint_3_nohands_gemini.png', 'saint_4_clean.png'),
        },
        'hands': {'armF': 'handF'},
    },
    # 뒤틀린 인형사: 앞손 + 재단 가위(강화: 가위 칼날 집게)
    'doll': {
        'key': 'magenta',
        'variants': {
            '': ('doll_1_gemini.png', 'doll_1_nohands_gemini.png', 'doll_2_gemini.png'),
            '_up': ('doll_3_gemini.png', 'doll_3_nohands_gemini.png', 'doll_4_gemini.png'),
        },
        'hands': {'armF': 'handF'},
    },
    # 철거의 설계자 (D-079): 앞손 + 공압 드릴(강화: 큰 드릴·사슬) — 드릴 뒤에 가려졌던 아래팔이 손 지운 그림에서 드러남(reveal)
    'architect': {
        'key': 'green',
        'variants': {
            '': ('architect_1_gemini.png', 'architect_1_nohands_gemini.png', 'architect_2_gemini.png'),
            '_up': ('architect_3_gemini.png', 'architect_3_nohands_gemini.png', 'architect_4_gemini.png'),
        },
        'hands': {'armF': 'handF'},
        'reveal': True,
    },
    # (침묵의 방송자는 손 지운 그림에서 소매가 통째로 다시 그려져 손목이 어깨 쪽에 잡힘 → 손목 관절 없이 팔 한 장, D-079)
    # 심연의 길잡이: 뒷손에 매달린 앵커 (앞팔은 팔 전체가 물대포라 그대로) — 앵커가 손목처럼 손 아래에서 흔들림
    'diver': {
        'key': 'magenta',
        'variants': {
            '': ('diver_1_gemini.png', 'diver_1_noanchor_gemini.png', 'diver_2_gemini.png'),
            '_up': ('diver_3_gemini.png', 'diver_3_noanchor_gemini.png', 'diver_4_merged.png'),
        },
        'hands': {'armB': 'anchorB'},
    },
}


def mask_of(layout, part, rgba_dir):
    """rig.json 조각 → 1024 그림 좌표의 알파 마스크"""
    p = layout['parts'][part]
    img = np.asarray(Image.open(os.path.join(rgba_dir, p['src'])).convert('RGBA'))
    m = np.zeros((1024, 1024), bool)
    h, w = img.shape[:2]
    m[p['y']:p['y'] + h, p['x']:p['x'] + w] = img[..., 3] > 0
    return m


def piece(rgba, mask):
    """마스크 부분만 남긴 RGBA와 그 상자 (x, y, w, h)"""
    ys, xs = np.nonzero(mask)
    x0, y0, x1, y1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
    out = rgba[y0:y1, x0:x1].copy()
    out[..., 3] = np.where(mask[y0:y1, x0:x1], out[..., 3], 0)
    return Image.fromarray(out), (int(x0), int(y0), int(x1 - x0), int(y1 - y0))


def split_arm(full, nohands, armless, arm, reveal=False):
    diff = np.abs(full[..., :3].astype(int) - nohands[..., :3].astype(int)).max(axis=2) > DIFF
    hand = arm & (diff | (full[..., 3] > 0) & (nohands[..., 3] == 0))
    hand = cv2.morphologyEx(hand.astype(np.uint8), cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    hand = cv2.morphologyEx(hand, cv2.MORPH_CLOSE, np.ones((7, 7), np.uint8)) > 0
    n, lab, st, _ = cv2.connectedComponentsWithStats(hand.astype(np.uint8), connectivity=8)
    hand = np.isin(lab, [i for i in range(1, n) if st[i, cv2.CC_STAT_AREA] >= MIN_PIECE]) & arm
    # 무기에 가려졌던 소매: 손 지운 그림에 있고 팔 없는 몸과 다른 곳 (손 자리 안에서)
    shown = hand & (nohands[..., 3] > 0) & (np.abs(nohands[..., :3].astype(int) - armless[..., :3].astype(int)).max(axis=2) > DIFF)
    shown = (cv2.morphologyEx(shown.astype(np.uint8), cv2.MORPH_OPEN, np.ones((3, 3), np.uint8)) > 0) & reveal
    sleeve = (arm & ~hand) | shown
    sleeve_rgba = full.copy()
    sleeve_rgba[shown] = nohands[shown]
    return hand, sleeve, sleeve_rgba


def wrist_of(hand, sleeve, shoulder):
    """손 조각 중 소매에 닿은 곳에서 어깨에 가까운 쪽 5%의 가운데"""
    near = hand & cv2.dilate(sleeve.astype(np.uint8), np.ones((5, 5), np.uint8)).astype(bool)
    ys, xs = np.nonzero(near)
    d = np.hypot(xs - shoulder[0], ys - shoulder[1])
    k = max(8, len(d) // 20)
    idx = np.argsort(d)[:k]
    return [float(round(xs[idx].mean())), float(round(ys[idx].mean()))]


def main(cid, preview=False):
    cfg = CHARS[cid]
    src = f'assets/sprites/parts/{cid}/src'
    out_dir = f'assets/sprites/rig/{cid}'
    layout_path = os.path.join(out_dir, 'rig.json')
    layout = json.load(open(layout_path, encoding='utf-8'))
    shots = []
    for suffix, (f_full, f_nohands, f_armless) in cfg['variants'].items():
        full, nohands, armless = (keyed(os.path.join(src, f), cfg['key']) for f in (f_full, f_nohands, f_armless))
        for arm_bone, hand_bone in cfg['hands'].items():
            arm_key, hand_key = arm_bone + suffix, hand_bone + suffix
            # 팔 마스크는 원래 팔 그림(<팔>.png)에서 — 이미 소매로 바꿨어도 다시 돌릴 수 있게
            layout['parts'][arm_key]['src'] = f'{arm_key}.png'
            arm = mask_of(layout, arm_key, out_dir)
            hand, sleeve, sleeve_rgba = split_arm(full, nohands, armless, arm, cfg.get('reveal', False))
            if not hand.any():
                raise SystemExit(f'{cid} {arm_key}: 손 조각을 못 찾음 (손 지운 그림을 확인)')
            if suffix == '':
                layout['pivots'][hand_bone] = wrist_of(hand, sleeve, layout['pivots'][arm_bone])
            himg, (hx, hy, hw, hh) = piece(full, hand)
            simg, (sx, sy, sw, sh) = piece(sleeve_rgba, sleeve)
            if preview:
                shots.append((arm_key, simg, (sx, sy), himg, (hx, hy), layout['pivots'][hand_bone]))
                continue
            himg.save(os.path.join(out_dir, f'{hand_key}.png'))
            simg.save(os.path.join(out_dir, f'{arm_key}_sleeve.png'))
            layout['parts'][hand_key] = {'src': f'{hand_key}.png', 'x': hx, 'y': hy, 'w': hw, 'h': hh}
            layout['parts'][arm_key] = {'src': f'{arm_key}_sleeve.png', 'x': sx, 'y': sy, 'w': sw, 'h': sh}
            print(f'{arm_key}: 손 {hw}×{hh} @({hx},{hy}) · 소매 {sw}×{sh} · 손목 {layout["pivots"][hand_bone]}')
    if preview:
        canvas = Image.new('RGBA', (1024 * len(cfg['variants']), 1024), (40, 44, 52, 255))
        for i, (arm_key, simg, sp, himg, hp, wrist) in enumerate(shots):
            ox = 1024 * (1 if arm_key.endswith('_up') else 0)
            tint = Image.new('RGBA', himg.size, (255, 120, 60, 90))
            canvas.alpha_composite(simg, (ox + sp[0], sp[1]))
            canvas.alpha_composite(himg, (ox + hp[0], hp[1]))
            hm = Image.new('RGBA', himg.size, (0, 0, 0, 0))
            hm.paste(tint, (0, 0), himg.getchannel('A'))
            canvas.alpha_composite(hm, (ox + hp[0], hp[1]))
            d = ImageDraw.Draw(canvas)
            d.ellipse([ox + wrist[0] - 6, wrist[1] - 6, ox + wrist[0] + 6, wrist[1] + 6], outline=(255, 255, 0, 255), width=3)
        path = os.path.join(HERE, f'_joints_{cid}.png')
        canvas.save(path)
        print('preview →', path)
        return
    json.dump(layout, open(layout_path, 'w', encoding='utf-8'), indent=2, ensure_ascii=False)
    print('→', layout_path)


if __name__ == '__main__':
    main(sys.argv[1], '--preview' in sys.argv)
