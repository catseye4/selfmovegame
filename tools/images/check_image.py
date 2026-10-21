"""
Gemini에서 받은 이미지를 게임에 넣기 전에 확인하는 도구 (로드맵 C단계)

실행: 프로젝트 루트에서
  python tools/images/check_image.py <이미지> <종류> [--ref <1단계 이미지>] [--height 최소-최대]
  종류: mid(중간 요새) | final(최종 기지) | enemy(적) | boss(보스)
  예) python tools/images/check_image.py assets/sprites/stage/src/bunker_1_gemini.png mid
      python tools/images/check_image.py assets/sprites/stage/src/bunker_2_gemini.png mid --ref assets/sprites/stage/src/bunker_1_gemini.png
      python tools/images/check_image.py assets/sprites/stage/src/bunker_3_gemini.png mid --ref assets/sprites/stage/src/bunker_1_gemini.png --height 0.25-0.45
  --height: 1단계 대비 높이가 이 범위여야 함 (붕괴 단계처럼 크기가 바뀌어야 하는 경우)

자동으로 보는 것: 배경이 한 가지 색인지, 잘림·여백, 오른쪽 아래 구석(Gemini 로고 → unlogo.py로 지운 뒤 분석), 떨어진 조각,
                  바닥선(거점), 1단계 그림과 위치·크기 차이(--ref)
눈으로 보는 것: 미리보기 tools/images/_out/<이름>_check.png
                (게임과 같은 크기로 배경을 지워 주인공 옆에 세움 → 방향·스타일·알아볼 수 있는지)
"""
import os
import sys

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'rig'))
from rigcut import remove_key_background  # noqa: E402
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from unlogo import load_clean  # noqa: E402

# 게임에서 그릴 높이(px). 거점은 그림으로 바꿀 때의 추천 크기(주인공 186px 기준, 임시 상자는 150·200),
# 적은 index.css .enemy-entity 크기
KINDS = {
    'mid': {'name': '중간 요새', 'h': 220, 'base': True},
    'final': {'name': '최종 기지', 'h': 280, 'base': True},
    'enemy': {'name': '적', 'h': 76, 'base': False},
    'boss': {'name': '보스', 'h': 114, 'base': False},
}
HERO_SRC = 'assets/sprites/parts/hero/src/hero_neutral_gemini.png'
HERO_SCALE = 0.215          # monster_v2.js BATTLE_RIG_SCALE.hero
KEY_T = 60                  # rigcut과 같은 배경 판정 기준
CORNER = 0.12               # 오른쪽 아래 구석(로고 자리) 크기 비율
OUT_DIR = 'tools/images/_out'
PREVIEW = {'w': 1280, 'h': 400, 'ground': 60, 'sky': (20, 18, 28), 'floor': (42, 36, 51)}


def keyness(rgb, key):
    r, g, b = (rgb[..., i].astype(np.int32) for i in range(3))
    return g - np.maximum(r, b) if key == 'green' else np.minimum(r, b) - g


def detect_key(rgb):
    border = np.concatenate([rgb[0], rgb[-1], rgb[:, 0], rgb[:, -1]])[None]
    g = (keyness(border, 'green') > KEY_T).mean()
    m = (keyness(border, 'magenta') > KEY_T).mean()
    return ('green', g) if g >= m else ('magenta', m)


def components(mask):
    n, lab, st, _ = cv2.connectedComponentsWithStats(mask.astype(np.uint8), connectivity=8)
    return [(i, st[i]) for i in range(1, n)], lab


def bbox(mask):
    ys, xs = np.nonzero(mask)
    return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1


class Report:
    def __init__(self):
        self.lines, self.bad, self.warn = [], 0, 0

    def ok(self, msg):
        self.lines.append(f'  ✓ {msg}')

    def warning(self, msg):
        self.warn += 1
        self.lines.append(f'  ⚠ {msg}')

    def fail(self, msg):
        self.bad += 1
        self.lines.append(f'  ✗ {msg}')


def analyze(path, kind):
    """배경색·대상 영역·조각을 분석. 반환: (분석 dict, Report)"""
    rep = Report()
    rgb, unlogoed = load_clean(path)
    if unlogoed:
        # 로고를 지운 그림으로 분석·미리보기 (원본 파일은 그대로)
        clean_path = os.path.join(OUT_DIR, os.path.splitext(os.path.basename(path))[0] + '_clean.png')
        os.makedirs(OUT_DIR, exist_ok=True)
        Image.fromarray(rgb).save(clean_path)
    H, W = rgb.shape[:2]
    key, border_ratio = detect_key(rgb)
    k = keyness(rgb, key)
    bg = k > KEY_T

    # 배경: 한 가지 색인지 (테두리가 거의 다 배경색이고, 영역마다 색이 같아야 함)
    ideal = (0, 255, 0) if key == 'green' else (255, 0, 255)
    mean = rgb[bg].mean(axis=0)
    dev = np.abs(mean - ideal).max()
    halves = [rgb[:H // 2][bg[:H // 2]], rgb[H // 2:][bg[H // 2:]], rgb[:, :W // 2][bg[:, :W // 2]], rgb[:, W // 2:][bg[:, W // 2:]]]
    spread = max(np.abs(a.mean(axis=0) - b.mean(axis=0)).max() for a, b in [(halves[0], halves[1]), (halves[2], halves[3])] if len(a) and len(b))
    hexc = '#%02X%02X%02X' % tuple(int(v) for v in mean)
    if border_ratio < 0.9:
        rep.fail(f'배경색을 확신할 수 없음 (테두리의 {border_ratio:.0%}만 {key} 배경) → 대상이 가장자리에 닿거나 배경이 단색이 아님')
    elif spread > 12 or dev > 40:
        rep.warning(f'배경이 완전한 단색이 아님 (평균 {hexc}, 위아래·좌우 차이 {spread:.0f}) → 그라데이션·그림자 확인')
    else:
        rep.ok(f'배경 단색 {key} (평균 {hexc})')

    # 반쯤 배경색인 픽셀(그림자·안개·바닥)
    haze = ((k > 15) & (k <= KEY_T)).sum() / max(1, (~bg).sum())
    if haze > 0.08:
        rep.warning(f'배경색이 섞인 픽셀이 많음 ({haze:.0%}) → 그림자·바닥·안개가 그려졌는지 확인')

    # 대상과 떨어진 조각
    subj = ~bg
    comps, lab = components(subj)
    if not comps:
        rep.fail('대상을 찾지 못함')
        return None, rep
    main_i, main_st = max(comps, key=lambda c: c[1][cv2.CC_STAT_AREA])
    main_area = main_st[cv2.CC_STAT_AREA]
    corner_x, corner_y = W * (1 - CORNER), H * (1 - CORNER)
    logo, pieces = [], []
    for i, st in comps:
        if i == main_i or st[cv2.CC_STAT_AREA] < 40:
            continue
        x, y, w, h = st[:4]
        if x >= corner_x and y >= corner_y and st[cv2.CC_STAT_AREA] < main_area * 0.05:
            logo.append(i)
        elif st[cv2.CC_STAT_AREA] >= main_area * 0.002:
            pieces.append(st)
    if logo:
        rep.ok('오른쪽 아래 구석의 로고/잡티는 대상과 떨어져 있음 → 자동으로 지움')
    if pieces:
        msg = f'본체와 떨어진 조각 {len(pieces)}개 (연기·불꽃·무기 등이면 정상, 잡티면 지움)'
        (rep.ok if KINDS[kind]['base'] else rep.warning)(msg)

    keep = subj.copy()
    for i in logo:
        keep[lab == i] = False
    x0, y0, x1, y1 = bbox(keep)
    main = lab == main_i
    mx0, my0, mx1, my1 = bbox(main)

    # 잘림·여백·구석
    edge = 2
    cut = [n for n, v in (('왼쪽', x0 < edge), ('위', y0 < edge), ('오른쪽', x1 > W - edge), ('아래', y1 > H - edge)) if v]
    if cut:
        rep.fail(f'대상이 그림 가장자리에서 잘림: {", ".join(cut)}')
    else:
        margin = min(x0 / W, y0 / H, (W - x1) / W, (H - y1) / H)
        (rep.ok if margin >= 0.03 else rep.warning)(f'여백 최소 {margin:.0%} (권장 3% 이상)')
    if main[int(corner_y):, int(corner_x):].any():
        if unlogoed:
            rep.ok('대상이 오른쪽 아래 구석에 걸쳐 있지만 Gemini 로고는 역합성으로 지움')
        else:
            rep.warning('대상이 오른쪽 아래 구석(Gemini 로고 자리)에 걸침 → 로고가 대상 위에 찍혔는지 확인 (이 그림 크기는 자동 로고 지우기 미등록)')

    # 바닥선: 거점은 아래쪽이 수평 직선이어야 게임 바닥에 딱 붙는다
    if KINDS[kind]['base']:
        cols = main[:, mx0:mx1]
        has = cols.any(axis=0)
        bottom = np.where(has, H - 1 - np.argmax(cols[::-1], axis=0), -1)
        flat = (bottom[has] >= my1 - 1 - max(3, H * 0.01)).mean()
        (rep.ok if flat >= 0.5 else rep.warning)(f'바닥선 수평 {flat:.0%} (너비 중 바닥에 닿는 부분, 권장 50% 이상)')

    info = {'path': clean_path if unlogoed else path, 'key': key, 'size': (W, H), 'bbox': (x0, y0, x1, y1), 'main': (mx0, my0, mx1, my1), 'mask': keep}
    return info, rep


def compare(info, ref, rep, height=None):
    """변형 단계(파손·붕괴, 팔 없는 몸 등)가 1단계와 같은 자리·같은 바닥선인지"""
    if info['size'] != ref['size']:
        rep.warning(f'그림 크기가 1단계와 다름 {info["size"]} ↔ {ref["size"]} → 맞춰서 비교')
    sx = ref['size'][0] / info['size'][0]
    sy = ref['size'][1] / info['size'][1]
    x0, y0, x1, y1 = info['main']
    x0, x1, y0, y1 = x0 * sx, x1 * sx, y0 * sy, y1 * sy
    rx0, ry0, rx1, ry1 = ref['main']
    rh, rw = ry1 - ry0, rx1 - rx0
    d_bottom = (y1 - ry1) / rh
    (rep.ok if abs(d_bottom) <= 0.02 else rep.fail)(f'바닥선 차이 {d_bottom:+.1%} (1단계 높이 기준, ±2% 이내여야 바꿔 끼울 때 안 튐)')

    # 그림 전체가 밀렸는지: 두 실루엣을 겹쳐 가장 잘 맞는 이동량 (팔이 빠지는 등 일부가 달라도 나머지로 맞춤)
    a = ref['mask'].astype(np.float32)
    b = cv2.resize(info['mask'].astype(np.float32), ref['size'], interpolation=cv2.INTER_NEAREST)
    (dx, dy), resp = cv2.phaseCorrelate(a, b)
    if resp >= 0.05:
        moved = max(abs(dx) / rw, abs(dy) / rh)
        (rep.ok if moved <= 0.02 else rep.fail)(
            f'1단계와 겹쳐 본 어긋남 {dx:+.0f}, {dy:+.0f}px ({moved:.1%}, 2% 이내여야 같은 자리)')
    else:
        d_center = ((x0 + x1) - (rx0 + rx1)) / 2 / rw
        (rep.ok if abs(d_center) <= 0.1 else rep.warning)(
            f'모양이 많이 달라 겹쳐 맞추기 불가 → 가운데 위치 차이 {d_center:+.1%} (±10% 이내 권장)')
    ratio = (y1 - y0) / rh
    if height:
        (rep.ok if height[0] <= ratio <= height[1] else rep.fail)(
            f'높이 1단계 대비 {ratio:.0%} (기대 {height[0]:.0%}~{height[1]:.0%})')
    else:
        rep.ok(f'높이 1단계 대비 {ratio:.0%}')
    return rh


def cutout(path, key, scale, crop_box):
    rgba = remove_key_background(path, key, min_part=40)
    img = Image.fromarray(rgba).crop(crop_box)
    w, h = img.size
    return img.resize((max(1, round(w * scale)), max(1, round(h * scale))), Image.LANCZOS)


def font(size):
    for f in ('C:/Windows/Fonts/malgun.ttf', '/System/Library/Fonts/AppleSDGothicNeo.ttc'):
        if os.path.exists(f):
            return ImageFont.truetype(f, size)
    return ImageFont.load_default()


def preview(info, kind, ref_info, ref_h, out):
    """게임 크기(1배)로 배경 지운 그림을 주인공 옆, 바닥 위에 세운다"""
    P = PREVIEW
    canvas = Image.new('RGBA', (P['w'], P['h']), P['sky'] + (255,))
    d = ImageDraw.Draw(canvas)
    gy = P['h'] - P['ground']
    d.rectangle([0, gy, P['w'], P['h']], fill=P['floor'] + (255,))
    f = font(15)

    hero = remove_key_background(HERO_SRC, 'green')
    hero_img = Image.fromarray(hero)
    hb = hero_img.getbbox()
    hero_img = hero_img.crop(hb)
    hero_img = hero_img.resize((round(hero_img.width * HERO_SCALE), round(hero_img.height * HERO_SCALE)), Image.LANCZOS)
    canvas.alpha_composite(hero_img, (160, gy - hero_img.height))
    d.text((160, gy + 8), f'주인공(히어로) {hero_img.height}px', fill='white', font=f)

    spec = KINDS[kind]
    scale = spec['h'] / (ref_h or (info['main'][3] - info['main'][1]))
    x = 560
    items = [('이번 그림', info)] + ([('1단계', ref_info)] if ref_info else [])
    for label, it in items:
        mx0, my0, mx1, my1 = it['main']
        bx0, by0, bx1, _ = it['bbox']
        img = cutout(it['path'], it['key'], scale, (bx0, by0, bx1, my1))
        canvas.alpha_composite(img, (x, gy - img.height))
        d.text((x, gy + 8), f'{label} · {spec["name"]} {img.width}×{img.height}px', fill='white', font=f)
        x += img.width + 140
    d.text((16, 12), f'게임 크기 미리보기 (1배) · {os.path.basename(info["path"])}', fill=(200, 200, 210), font=f)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    canvas.convert('RGB').save(out)


def main(argv):
    opts, args, i = {}, [], 0
    while i < len(argv):
        if argv[i].startswith('--'):
            opts[argv[i][2:]] = argv[i + 1]
            i += 2
        else:
            args.append(argv[i])
            i += 1
    ref_path = opts.get('ref')
    height = tuple(float(v) for v in opts['height'].split('-')) if 'height' in opts else None
    if len(args) != 2 or args[1] not in KINDS:
        print(__doc__)
        return 2
    path, kind = args
    info, rep = analyze(path, kind)
    ref_info, ref_h = None, None
    if info and ref_path:
        ref_info, _ = analyze(ref_path, kind)
        if ref_info:
            ref_h = compare(info, ref_info, rep, height)
    print(f'[{KINDS[kind]["name"]}] {path}')
    print('\n'.join(rep.lines))
    if info:
        out = os.path.join(OUT_DIR, os.path.splitext(os.path.basename(path))[0] + '_check.png')
        preview(info, kind, ref_info, ref_h, out)
        print(f'  미리보기: {out}')
    verdict = '다시 요청 필요' if rep.bad else ('확인 필요' if rep.warn else '통과')
    print(f'결과: {verdict} (✗ {rep.bad}, ⚠ {rep.warn})')
    return 1 if rep.bad else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
