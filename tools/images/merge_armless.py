"""
강화 팔 없는 몸 합치기 — Gemini가 강화 장식을 빠뜨린 4단계 그림을 고친다 (새 캐릭터, D-044)

실행: 프로젝트 루트에서
  python tools/images/merge_armless.py diver            # → <캐릭터>_4_merged.png
  python tools/images/merge_armless.py diver --preview  # 팔 자리·결과를 나란히 (tools/images/_out/<캐릭터>_merge.png)

입력 (assets/sprites/parts/<캐릭터>/src, 1024×1024, 네 장 모두 겹쳐 어긋남 0px)
 - _1 기본 전신, _2 기본 팔 없음, _3 강화 전신, _4 강화 팔 없음(Gemini)

방법
 - 팔 자리 = 기본 두 장(1·2)이 다른 곳 + 강화 두 장(3·4)이 다른 곳 중 그 팔 가까이(reach px 안)
   (강화 팔이 더 길거나 굵으면 그만큼 reach를 키움. 머리 관처럼 멀리 떨어진 차이는 팔이 아님)
 - 결과 = 강화 전신(3)에서 팔 자리만 강화 팔 없음(4)으로 바꿈 → 강화 장식은 모두 남고 팔만 빠짐
"""
import os
import sys

import cv2
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from unlogo import load_clean  # noqa: E402

SRC = 'assets/sprites/parts/{name}/src/{name}_{n}_gemini.png'
OUT = 'assets/sprites/parts/{name}/src/{name}_4_merged.png'
MAGENTA = (255, 0, 255)

# reach: 팔(왼쪽부터)마다 강화 차이를 팔로 볼 거리(px)
CHARS = {
    # 심연의 길잡이: 왼쪽 = 앵커 든 뒷팔(등 뒤 관이 붙어 있어 좁게), 오른쪽 = 물대포(강화가 60px 더 김)
    'diver': {'reach': [15, 80]},
}
ARM_DIFF = 40      # 두 그림의 색 차이가 이보다 크면 다른 곳
MIN_ARM = 1500     # 이보다 작은 차이 덩어리는 팔이 아님(다시 그려진 불빛·무늬)
SEAM = 3           # 팔 자리를 윤곽선까지 넓히는 폭


def diff_parts(a, b):
    d = np.abs(a.astype(int) - b.astype(int)).max(axis=2) > ARM_DIFF
    d = cv2.morphologyEx(d.astype(np.uint8), cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    d = cv2.morphologyEx(d, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8))
    n, lab, st, cent = cv2.connectedComponentsWithStats(d, connectivity=8)
    big = [i for i in range(1, n) if st[i, cv2.CC_STAT_AREA] >= MIN_ARM]
    return lab, sorted(big, key=lambda i: cent[i][0])


def dilate(mask, r):
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * r + 1, 2 * r + 1))
    return cv2.dilate(mask.astype(np.uint8), k) > 0


def merge(name):
    cfg = CHARS[name]
    img = {n: load_clean(SRC.format(name=name, n=n))[0] for n in (1, 2, 3, 4)}
    lab_b, arms_b = diff_parts(img[1], img[2])
    lab_u, parts_u = diff_parts(img[3], img[4])
    if len(arms_b) != len(cfg['reach']):
        sys.exit(f'기본 팔 덩어리 {len(arms_b)}개 — reach {len(cfg["reach"])}개와 다름')
    diff_u = np.isin(lab_u, parts_u)
    arm = np.zeros(lab_b.shape, bool)
    for i, r in zip(arms_b, cfg['reach']):
        m = lab_b == i
        arm |= m | (diff_u & dilate(m, r))
    region = dilate(arm, SEAM)
    out = img[3].copy()
    out[region] = img[4][region]
    bg = (out[..., 0] > 200) & (out[..., 1] < 80) & (out[..., 2] > 200)
    out[region & bg] = MAGENTA                     # 두 그림의 배경 분홍이 살짝 달라 얼룩지지 않게
    return img, region, out


def main():
    name = sys.argv[1]
    img, region, out = merge(name)
    path = OUT.format(name=name)
    Image.fromarray(out).save(path)
    print('저장', path, f'(바꾼 곳 {int(region.sum())}px)')
    if '--preview' in sys.argv:
        mark = img[3].copy()
        edge = dilate(region, 2) & ~region
        mark[edge] = (0, 255, 0)
        side = np.concatenate([mark, out, img[4]], axis=1)
        pv = os.path.join(HERE, '_out', f'{name}_merge.png')
        Image.fromarray(side).resize((1536, 512), Image.NEAREST).save(pv)
        print('미리보기', pv)


if __name__ == '__main__':
    main()
