"""
리그 파츠 분리 공용 도구 (cut_mech_parts.py, cut_kaiju_parts.py 등이 사용)
좌표는 모두 (x, y) 픽셀, 마스크는 (H, W) bool 배열.
"""
import json
import os

import cv2
import numpy as np
from PIL import Image, ImageDraw


def remove_key_background(path, key, crop=None, key_t=60, spill_t=12, min_part=None):
    """단색 크로마키 배경 제거 → RGBA. key: 'green'(#00FF00) | 'magenta'(#FF00FF).
    crop=(x0, y0, x1, y1)이면 그 영역만 사용.
    min_part=None 이면 가장 큰 덩어리만 남기고(워터마크 등 제거),
    숫자면 그 면적 이상 덩어리는 모두 남김 (본체와 떨어진 칼 등을 살릴 때)."""
    a = np.asarray(Image.open(path).convert('RGB')).astype(np.float32)
    if crop:
        x0, y0, x1, y1 = crop
        a = a[y0:y1, x0:x1]
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    if key == 'green':
        keyness = g - np.maximum(r, b)
    elif key == 'magenta':
        keyness = np.minimum(r, b) - g
    else:
        raise ValueError(key)
    alpha = np.where(keyness > key_t, 0, 255).astype(np.uint8)
    rgb = a.copy()
    spill = (alpha == 255) & (keyness > spill_t)
    if key == 'green':
        rgb[..., 1] = np.where(spill, np.maximum(r, b) + spill_t, g)
    else:
        lim = g + spill_t
        rgb[..., 0] = np.where(spill, np.minimum(r, lim), r)
        rgb[..., 2] = np.where(spill, np.minimum(b, lim), b)
    keep = largest(alpha > 0) if min_part is None else drop_specks(alpha > 0, min_part)
    alpha[~keep] = 0
    return np.dstack([np.clip(rgb, 0, 255).astype(np.uint8), alpha])


def poly_mask(shape, pts):
    m = Image.new('L', (shape[1], shape[0]), 0)
    ImageDraw.Draw(m).polygon(pts, fill=1)
    return np.asarray(m) > 0


def rect_mask(shape, box):
    m = np.zeros(shape[:2], bool)
    x0, y0, x1, y1 = box
    m[y0:y1, x0:x1] = True
    return m


def largest(mask):
    n, lab, st, _ = cv2.connectedComponentsWithStats(mask.astype(np.uint8), connectivity=8)
    if n <= 1:
        return mask
    return lab == 1 + int(np.argmax(st[1:, cv2.CC_STAT_AREA]))


def grow(mask, allowed, px=7):
    """조각 경계를 px만큼 넓혀 바깥 윤곽선을 포함시킨다 (allowed 영역 안에서만)."""
    k = np.ones((2 * px + 1, 2 * px + 1), np.uint8)
    return mask | (cv2.dilate(mask.astype(np.uint8), k).astype(bool) & allowed)


def drop_specks(mask, min_area=300):
    n, lab, st, _ = cv2.connectedComponentsWithStats(mask.astype(np.uint8), connectivity=8)
    keep = np.zeros(n, bool)
    keep[1:] = st[1:, cv2.CC_STAT_AREA] >= min_area
    return keep[lab]


def inpaint(img, region, radius=7):
    """region 픽셀을 주변 색으로 채우고 불투명하게 만든다."""
    if not region.any():
        return img
    rgb = np.ascontiguousarray(img[..., :3])
    filled = cv2.inpaint(rgb, region.astype(np.uint8) * 255, radius, cv2.INPAINT_TELEA)
    out = img.copy()
    out[region, :3] = filled[region]
    out[region, 3] = 255
    return out


def fill_flat(img, region, sample):
    """region 픽셀을 sample 영역(불투명 픽셀)의 중간색으로 채우고 불투명하게 만든다.
    인페인팅이 투명 영역의 검은색까지 끌어와 번질 때 대신 사용."""
    if not region.any():
        return img
    pick = sample & (img[..., 3] == 255)
    color = np.median(img[pick][:, :3], axis=0) if pick.any() else np.array([40, 36, 48])
    out = img.copy()
    out[region, :3] = color.astype(np.uint8)
    out[region, 3] = 255
    return out


def cut(img, mask):
    part = img.copy()
    part[~mask] = 0
    return part


def save_parts(parts, out_dir, scale=1):
    """조각을 알파 경계로 잘라 저장하고 {이름: {src, x, y, w, h}} 반환 (좌표는 scale 배).
    scale > 1이면 최근접 보간으로 확대(도트 유지)."""
    os.makedirs(out_dir, exist_ok=True)
    layout = {}
    for name, img in parts.items():
        ys, xs = np.nonzero(img[..., 3])
        x0, y0, x1, y1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
        crop = img[y0:y1, x0:x1]
        if scale > 1:
            crop = crop.repeat(scale, axis=0).repeat(scale, axis=1)
        Image.fromarray(np.ascontiguousarray(crop), 'RGBA').save(f'{out_dir}/{name}.png')
        layout[name] = {'src': f'{name}.png', 'x': int(x0 * scale), 'y': int(y0 * scale),
                        'w': int((x1 - x0) * scale), 'h': int((y1 - y0) * scale)}
    return layout


def write_layout(out_dir, layout):
    with open(f'{out_dir}/rig.json', 'w', encoding='utf-8') as f:
        json.dump(layout, f, ensure_ascii=False, indent=2)


def rest_check(out_dir, layout, order, ref, save_path):
    """기본 자세로 조각을 다시 합쳐 원본(ref, 같은 배율 RGBA)과 비교."""
    H, W = ref.shape[:2]
    comp = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    for name in order:
        p = layout['parts'][name]
        comp.alpha_composite(Image.open(f"{out_dir}/{p['src']}"), (p['x'], p['y']))
    c = np.asarray(comp)
    missing = (ref[..., 3] > 0) & (c[..., 3] == 0)
    diff = np.abs(c[..., :3].astype(int) - ref[..., :3].astype(int)).max(2)
    changed = (ref[..., 3] == 255) & (c[..., 3] > 0) & (diff > 40)
    comp.save(save_path)
    total = int((ref[..., 3] > 0).sum())
    print(f'rest-pose check: missing px={int(missing.sum())}, changed px={int(changed.sum())} of {total}')
