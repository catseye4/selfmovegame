"""
적 리그(js/engine_v2/rig/enemyRigs.js)를 전투용 스프라이트로 한꺼번에 굽고, 게임이 읽는 값을 만든다 (D-035)

실행: 프로젝트 루트에서
  python tools/rig/bake_enemies.py            # 전부
  python tools/rig/bake_enemies.py guardian   # 하나만 (나머지는 기존 json 값을 그대로 씀)

출력: assets/sprites/rig/<적>/<적>_<동작>.png, <적>.json  (bake_sprite.py 여러 클립 모드: 같은 틀·배율)
      js/engine_v2/enemyArt_v2.js  (자동 생성: 프레임 크기·발 위치·동작별 그림 — enemies_v2.js가 씀)

키(px)는 걷기 기준 게임 크기: 일반 적 92 (주인공의 절반), 방패병은 덩치가 커서 1.12배, 보스는 주인공(186)과 맞서게 196
"""
import json
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
JS_OUT = 'js/engine_v2/enemyArt_v2.js'
ENEMIES = {
    'guard': (92, 'walk:12,attack:10'),
    'shield': (103, 'walk:12,attack:10'),
    'tranq': (92, 'walk:12,attack:8'),
    'shock': (92, 'walk:12,attack:10'),
    'medic': (92, 'walk:12,attack:10'),
    'guardian': (196, 'walk:12,attack:12,bash:10'),
    'minion': (92, 'walk:12,attack:10'),        # 합성괴인 졸개(아군) — 경비병과 같은 키
}


def out_png(name):
    return f'assets/sprites/rig/{name}/{name}.png'


def bake(name):
    height, spec = ENEMIES[name]
    subprocess.run([sys.executable, os.path.join(HERE, 'bake_sprite.py'), name, spec, str(height), out_png(name)],
                   check=True, timeout=600)


def write_js():
    lines = [
        '// 자동 생성 파일: python tools/rig/bake_enemies.py (손으로 고치지 말 것)',
        '// 적 그림 (로드맵 C단계, D-035): 리그를 구운 동작별 스프라이트. 같은 틀·배율이라 바꿔 끼워도 발 위치가 같음',
        '// frameWidth·frameHeight = 프레임 크기(px), anchorX = 프레임 안 발 사이 x, 동작 = { src, frames, duration }',
        'export const ENEMY_ART = {',
    ]
    for name in ENEMIES:
        meta = json.load(open(os.path.splitext(out_png(name))[0] + '.json', encoding='utf-8'))
        clips = ', '.join(f"{c}: {{ src: '{v['src']}', frames: {v['frames']}, duration: {v['duration']} }}"
                          for c, v in meta['clips'].items())
        lines.append(f"    {name}: {{ frameWidth: {meta['frameWidth']}, frameHeight: {meta['frameHeight']}, "
                     f"anchorX: {meta['anchorX']}, {clips} }},")
    lines.append('};')
    open(JS_OUT, 'w', encoding='utf-8').write('\n'.join(lines) + '\n')
    print('→', JS_OUT)


def main():
    names = sys.argv[1:] or list(ENEMIES)
    for name in names:
        bake(name)
    write_js()


if __name__ == '__main__':
    main()
