"""
A·B 세트 그림 맞추기 (D-050 파츠 확장) — cut_mech_sets.py · cut_hero_sets.py · cut_chimera_sets.py 공용

세트 그림은 기본 리그 원본을 Gemini에 첨부해 "같은 자세·자리로 장비만" 바꾼 것을 원본 크기로 받은 것이다.
원본 크기(약 2배)라 로고를 지우고, 기본 원본 칸(W×H)에 윤곽이 가장 많이 겹치는 배율·자리로 줄여 놓는다.
같은 대화에서 이어 받은 그림은 캔버스 비율이 바뀔 때가 있어(1024² · 16:9) 배율·자리를 넓게 찾는다:
배율마다 모든 자리의 겹침을 FFT 상관으로 한 번에 계산(1/4 크기) → 원래 크기에서 ±3px로 다듬기.
"""
import os
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'images'))
from unlogo import clean  # noqa: E402

GREEN = (0, 255, 0)
KEY_T = 60


def load(path):
    """원본 크기 세트 그림 → 로고를 지운 RGB 배열"""
    rgb, _ = clean(np.asarray(Image.open(path).convert('RGB')))
    return rgb


def keymask(rgb):
    """초록 크로마키가 아닌 곳 (rigcut.remove_key_background와 같은 기준)"""
    a = rgb.astype(int)
    return (a[..., 1] - np.maximum(a[..., 0], a[..., 2])) <= KEY_T


def scaled(rgb, H, s):
    """높이를 H에 맞춘 배율 × s로 줄인 그림"""
    im = Image.fromarray(rgb)
    k = H / im.height * s
    return np.asarray(im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.BOX))


def paste(small, W, H, x0, y0):
    """줄인 그림의 왼쪽 위를 (x0, y0)에 두고 W×H 초록 칸에 놓기"""
    h, w = small.shape[:2]
    can = np.empty((H, W) + small.shape[2:], small.dtype)
    can[:] = GREEN if small.ndim == 3 else 0
    sx0, sy0 = max(0, -x0), max(0, -y0)
    cx0, cy0 = max(0, x0), max(0, y0)
    cw, ch = min(W - cx0, w - sx0), min(H - cy0, h - sy0)
    if cw > 0 and ch > 0:
        can[cy0:cy0 + ch, cx0:cx0 + cw] = small[sy0:sy0 + ch, sx0:sx0 + cw]
    return can


def _xcorr(A, B):
    """out[y0 + h - 1, x0 + w - 1] = Σ A[y, x]·B[y - y0, x - x0]"""
    H, W = A.shape
    h, w = B.shape
    shp = (H + h - 1, W + w - 1)
    fa = np.fft.rfft2(A.astype(np.float32), shp)
    fb = np.fft.rfft2(B[::-1, ::-1].astype(np.float32), shp)
    return np.fft.irfft2(fa * fb, shp)


def _iou(a, b):
    return (a & b).sum() / max(1, (a | b).sum())


def fit(rgb, ref_mask, region=None, s_range=(0.94, 1.06), coarse=4):
    """ref_mask(H×W bool, 맞출 윤곽)와 region 안 IoU가 가장 큰 배율·자리로 놓은 W×H 칸과 (IoU, (s, x0, y0))"""
    H, W = ref_mask.shape
    if region is None:
        region = np.ones((H, W), bool)
    sh, sw = H // coarse, W // coarse
    small = lambda m: np.asarray(Image.fromarray(m.astype(np.uint8) * 255).resize((sw, sh), Image.BOX)) > 127
    A, R = small(ref_mask & region), small(region)
    a_sum = A.sum()
    best = (-1.0, None)
    for s in np.arange(s_range[0], s_range[1] + 1e-9, 0.01):
        B = keymask(scaled(rgb, sh, s))
        h, w = B.shape
        inter = _xcorr(A, B)
        cnt = _xcorr(R, B)
        iou = inter / np.maximum(1, a_sum + cnt - inter)
        n = np.unravel_index(int(np.argmax(iou)), iou.shape)
        if iou[n] > best[0]:
            best = (float(iou[n]), (float(s), (n[1] - (w - 1)) * coarse, (n[0] - (h - 1)) * coarse))
    _, (s0, x0, y0) = best
    best = (-1.0, None)
    for s in (s0 - 0.005, s0, s0 + 0.005):
        sm = scaled(rgb, H, s)
        m = keymask(sm)
        for dy in range(-4, 5):
            for dx in range(-4, 5):
                iou = _iou(ref_mask & region, paste(m, W, H, x0 + dx, y0 + dy) & region)
                if iou > best[0]:
                    best = (iou, (round(s, 4), x0 + dx, y0 + dy))
    iou, (s, x0, y0) = best
    return paste(scaled(rgb, H, s), W, H, x0, y0), iou, (s, x0, y0)


def save_tmp(rgb, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    Image.fromarray(rgb).save(path)
    return path
