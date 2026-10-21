"""
이펙트 안(A·B·C)·픽셀풍을 영상으로 찍는다 — 다른 개발자들이 보고 고르는 용도 (D-059)

실행: 프로젝트 루트에서
  python tools/tests/record_vfx.py                 # 전부 (이펙트마다 A·B·C + A 픽셀풍)
  python tools/tests/record_vfx.py SET_VFX.flame   # 하나만
  python tools/tests/record_vfx.py --no-pixel      # 픽셀풍 빼고

출력: tools/tests/_out/vfx_videos/<이펙트>_<안>[_pixel].mp4 (960×540, H.264)
      tools/tests/_out/vfx_videos/manifest.json   (이펙트 이름·안 이름·파일)
      tools/tests/_out/vfx_videos/vfx_all.mp4     (전부 이어 붙인 한 편 — 메신저 공유용)

방식: rig_test.html?capture=1 (무대만 창에 꽉 차게)을 헤드리스 Chrome으로 열어 녹화(Playwright 영상, webm)하고,
     페이지가 준비된 시점부터 이펙트가 끝날 때까지만 잘라 ffmpeg(imageio_ffmpeg)로 mp4로 바꾼다.
     rig_test API: vfxVariantKeys · setVfxVariant · setVfxStyle · vfxShowcase(길이 초를 돌려줌) · #capture-label
"""
import json
import os
import shutil
import subprocess
import sys
import tempfile
import time

from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from common import start_server  # noqa: E402

OUT = os.path.join(HERE, '_out', 'vfx_videos')
W, H = 960, 540
LEAD = 0.35      # 이펙트 시작 전 여유(초)
TAIL = 0.7       # 끝난 뒤 여유(초)


def ffmpeg():
    exe = shutil.which('ffmpeg')
    if exe:
        return exe
    import imageio_ffmpeg
    return imageio_ffmpeg.get_ffmpeg_exe()


def to_mp4(src, dst, start, dur):
    subprocess.run([ffmpeg(), '-y', '-loglevel', 'error', '-ss', f'{max(0, start):.2f}', '-i', src, '-t', f'{dur:.2f}',
                    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '24', '-preset', 'medium', '-r', '30',
                    '-movflags', '+faststart', '-an', dst], check=True, timeout=120)


def record_clip(browser, base, key, variant, label, style, dst, tmp):
    ctx = browser.new_context(viewport={'width': W, 'height': H}, record_video_dir=tmp,
                              record_video_size={'width': W, 'height': H})
    page = ctx.new_page()
    t0 = time.monotonic()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)[:200]))
    page.goto(f'{base}/rig_test.html?capture=1&t={time.time()}')
    page.wait_for_function('window.rigTest && window.rigTest.ready', timeout=60000)
    page.evaluate("""([key, variant, style, label]) => {
        rigTest.setVfxStyle(style);
        rigTest.setVfxVariant(key, variant);
        const el = document.getElementById('capture-label');
        if (el) el.textContent = label;
    }""", [key, variant, style, label])
    page.wait_for_timeout(500)                      # 캐릭터·적 그림이 다 뜨게
    start = time.monotonic() - t0 - LEAD
    dur = float(page.evaluate('([key]) => rigTest.vfxShowcase(key)', [key]) or 2.5)
    page.wait_for_timeout(int((dur + TAIL) * 1000))
    end = time.monotonic() - t0
    video = page.video.path()
    ctx.close()                                     # 닫혀야 영상 파일이 다 써짐
    to_mp4(video, dst, start, end - start)
    return end - start, errors


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    pixel = '--no-pixel' not in sys.argv
    os.makedirs(OUT, exist_ok=True)
    srv, base = start_server()
    manifest = []
    tmp = tempfile.mkdtemp(prefix='vfxrec_')
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(channel='chrome')
            probe = browser.new_page()
            probe.goto(f'{base}/rig_test.html?capture=1')
            probe.wait_for_function('window.rigTest && window.rigTest.ready', timeout=60000)
            keys = probe.evaluate('() => rigTest.vfxVariantKeys()')
            probe.close()
            if args:
                keys = [k for k in keys if k['key'] in args]
            for k in keys:
                jobs = [(v['id'], v['label'], 'glow') for v in k['variants']]
                if pixel:
                    jobs.append(('A', next(v['label'] for v in k['variants'] if v['id'] == 'A'), 'pixel'))
                for vid, vlabel, style in jobs:
                    suffix = '_pixel' if style == 'pixel' else ''
                    name = f"{k['key'].replace('.', '_')}_{vid}{suffix}.mp4"
                    label = f"{k['name']} · {vid} {vlabel}{' · 픽셀풍' if style == 'pixel' else ''}"
                    dur, errors = record_clip(browser, base, k['key'], vid, label, style, os.path.join(OUT, name), tmp)
                    manifest.append({'key': k['key'], 'name': k['name'], 'variant': vid, 'label': vlabel,
                                     'style': style, 'file': name, 'seconds': round(dur, 2), 'errors': errors})
                    print(('OK  ' if not errors else 'ERR ') + label, f'{dur:.1f}s', errors[:1])
            browser.close()
    finally:
        srv.shutdown()
        shutil.rmtree(tmp, ignore_errors=True)
    # 일부만 다시 찍었으면 기존 목록에 합침 (같은 파일은 새 것으로, 순서는 이펙트·안 순)
    path = os.path.join(OUT, 'manifest.json')
    if args and os.path.exists(path):
        old = [m for m in json.load(open(path, encoding='utf-8')) if m['file'] not in {n['file'] for n in manifest}]
        order = {k['key']: i for i, k in enumerate(keys)}
        merged = old + manifest
        keyorder = []
        for m in merged:
            if m['key'] not in keyorder:
                keyorder.append(m['key'])
        manifest = sorted(merged, key=lambda m: (keyorder.index(m['key']), m['style'] == 'pixel', m['variant']))
    json.dump(manifest, open(path, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    # 전부 이어 붙인 한 편
    lst = os.path.join(OUT, '_concat.txt')
    with open(lst, 'w', encoding='utf-8') as f:
        for m in manifest:
            f.write(f"file '{os.path.join(OUT, m['file']).replace(os.sep, '/')}'\n")
    subprocess.run([ffmpeg(), '-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', lst,
                    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '26', '-r', '30', '-movflags', '+faststart', '-an',
                    os.path.join(OUT, 'vfx_all.mp4')], check=True, timeout=600)
    os.remove(lst)
    print('→', OUT, len(manifest), 'clips')


if __name__ == '__main__':
    main()
