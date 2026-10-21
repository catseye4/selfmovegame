"""
적 리그(js/engine_v2/rig/enemyRigs.js)를 전투용 스프라이트로 한꺼번에 굽고, 게임이 읽는 값을 만든다 (D-035)

실행: 프로젝트 루트에서
  python tools/rig/bake_enemies.py            # 전부
  python tools/rig/bake_enemies.py guardian   # 하나만 (나머지는 기존 json 값을 그대로 씀)

출력: assets/sprites/rig/<적>/<적>_<동작>.png, <적>.json  (bake_sprite.py 여러 클립 모드: 같은 틀·배율)
      js/engine_v2/enemyArt_v2.js  (자동 생성: 프레임 크기·발 위치·동작별 그림 — enemies_v2.js가 씀)

키(px)는 걷기 기준 게임 크기: 일반 적 92 (주인공의 절반), 방패병은 덩치가 커서 1.12배, 보스는 주인공(186)과 맞서게 196

퀄리티업 Q5 (Q-008, 2026-10-20): 그림은 2배 픽셀(RES)·WebP 품질 90으로 굽고 (게임 크기는 그대로 — 큰 화면에서 선명),
프레임을 늘림 (걷기 12 → 16, 공격 10 → 14, 보스 기술 12 → 16, 8 → 12)
"""
import json
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
JS_OUT = 'js/engine_v2/enemyArt_v2.js'
RES, WEBP = 2, 90   # 그림 픽셀 배율 · WebP 품질 (bake_sprite.py --res --webp)
# 보스는 화면에 크게(키 196~236) 나와 2배면 시트 하나가 화면 메모리 약 15MB(보스 하나 50~60MB) → 1.5배
# (1080p 전체 화면의 해상도 배율이 1.5라 거기서는 화질 차이 없음, 메모리는 약 56%)
BOSS_RES = 1.5
BOSSES = {'guardian', 'scrapking', 'archbishop', 'oculus', 'oculus2'}
ENEMIES = {
    'guard': (92, 'walk:16,attack:14'),
    'shield': (103, 'walk:16,attack:14'),
    'tranq': (92, 'walk:16,attack:12'),
    'shock': (92, 'walk:16,attack:14'),
    'medic': (92, 'walk:16,attack:14'),
    'guardian': (196, 'walk:16,attack:16,bash:14'),
    'minion': (92, 'walk:16,attack:14'),        # 합성괴인 졸개(아군) — 경비병과 같은 키
    'rabbit': (72, 'walk:16,attack:14'),        # 뒤틀린 인형사의 토끼 인형(아군) — 작은 인형
    # 구역 2: 고철 약탈단 (D-040) — 방벽병은 덩치·배낭이 커서 103, 고철왕은 넓은 탑승형이라 230
    'raider': (92, 'walk:16,attack:14'),
    'builder': (103, 'walk:16,attack:14'),
    'sludge': (92, 'walk:16,attack:12'),
    'netter': (92, 'walk:16,attack:12'),
    'mechanic': (92, 'walk:16,attack:14'),
    'scrapking': (230, 'walk:16,attack:16,magnet:16,drop:14'),
    # 구역 3: 성왕국 (D-056) — 방패병 103, 악마기사(엘리트) 115, 대주교는 가마까지 215
    'soldier': (92, 'walk:16,attack:14'),
    'inquisitor': (96, 'walk:16,attack:14'),
    'holyshield': (103, 'walk:16,attack:14'),
    'priest': (92, 'walk:16,attack:14'),
    'mage': (96, 'walk:16,attack:14'),
    'demon': (90, 'walk:16,attack:14'),
    'demonknight': (115, 'walk:16,attack:16'),
    'archbishop': (215, 'walk:16,attack:16,bash:16'),
    # 구역 4: 심연 — 방패수 108, 포자 술사는 등의 식물까지 104, 슬라임은 납작하고 넓어 78
    'cultist': (94, 'walk:16,attack:14'),
    'tentacle': (96, 'walk:16,attack:14'),
    'carapace': (108, 'walk:16,attack:14'),
    'sporer': (104, 'walk:16,attack:14'),
    'slime': (78, 'walk:16,attack:14'),
    # 보스 오큘러스 (벌레 몸이 넓어 고철왕과 같은 230), 2페이즈는 같은 틀로 그림만 바꿔 끼움
    'oculus': (230, 'walk:16,attack:16,magnet:16,drop:16'),
    'oculus2': (236, 'walk:16,attack:16,magnet:16,drop:16'),
}


def out_png(name):
    return f'assets/sprites/rig/{name}/{name}.png'


def bake(name):
    height, spec = ENEMIES[name]
    subprocess.run([sys.executable, os.path.join(HERE, 'bake_sprite.py'), name, spec, str(height), out_png(name),
                    f'--res={BOSS_RES if name in BOSSES else RES}', f'--webp={WEBP}'], check=True, timeout=600)
    # 예전 PNG 시트는 WebP로 바뀌어 쓰지 않음 → 지움 (리그에서 언제든 다시 구울 수 있음)
    for clip in (part.split(':')[0] for part in spec.split(',')):
        old = f'assets/sprites/rig/{name}/{name}_{clip}.png'
        if os.path.exists(old):
            os.remove(old)


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
