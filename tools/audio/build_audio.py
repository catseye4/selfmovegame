"""
MAD OVERLORD // 게임 사운드 만들기 (v2)

무료(CC0) 사운드 팩에서 고른 소리를 다듬어(자르기, 음높이, 겹치기, 페이드, 음량 맞춤) 게임용 OGG로 저장한다.
사이렌·심장 박동·휙 소리·상승음은 코드로 합성한다.

  입력: 아래 팩을 내려받아 한 폴더(SRC)에 풀어 둔다 (폴더 이름은 zip 이름 그대로, 'x/' 아래)
    x/kenney_sci-fi-sounds, x/kenney_impact-sounds, x/kenney_interface-sounds, x/kenney_digital-audio,
    x/kenney_rpg-audio, x/kenney_ui-audio, x/kenney_music-jingles        (kenney.nl, CC0)
    x/creature  (opengameart.org/content/80-cc0-creature-sfx, rubberduck, CC0)
    monster_roar.wav  (opengameart.org/content/cc0-deep-monster-roar, trazzz123, CC0)
    x/5_Action_Chiptunes_By_Juhani_Junkala  (opengameart.org/content/5-chiptunes-action, CC0)
    x/Juhani_Junkala_Chiptune_Adventures_OGG (opengameart.org/content/4-chiptunes-adventure, CC0)
    Cyberpunk_Moonlight_Sonata_v2.mp3  (opengameart.org/content/cyberpunk-moonlight-sonata, Joth, CC0)
  출력: assets/audio/sfx/<이름>.ogg, assets/audio/bgm/<이름>.ogg
  실행: python tools/audio/build_audio.py <SRC 폴더>

효과음 이름은 이펙트 정의(sfx: '...')와 전투 연출(director.sfx)에서 부르는 이름과 같다.
음량/겹침 제한 같은 재생 규칙은 js/engine_v2/audio/sound_v2.js 의 SFX 표에서 정한다.
"""
import os
import subprocess
import sys

import imageio_ffmpeg
import numpy as np

SR = 44100
FF = imageio_ffmpeg.get_ffmpeg_exe()
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT_SFX = os.path.join(ROOT, 'assets', 'audio', 'sfx')
OUT_BGM = os.path.join(ROOT, 'assets', 'audio', 'bgm')

SCI = 'x/kenney_sci-fi-sounds/Audio/'
IMP = 'x/kenney_impact-sounds/Audio/'
UI = 'x/kenney_interface-sounds/Audio/'
DIG = 'x/kenney_digital-audio/Audio/'
RPG = 'x/kenney_rpg-audio/Audio/'
UIA = 'x/kenney_ui-audio/Audio/'
JIN = 'x/kenney_music-jingles/Audio/'
CRE = 'x/creature/'


# ---------------------------------------------------------------------------
# 기본 처리
def load(path, channels=1):
    raw = subprocess.run([FF, '-v', 'error', '-i', path, '-ac', str(channels), '-ar', str(SR), '-f', 'f32le', '-'],
                         capture_output=True, check=True).stdout
    a = np.frombuffer(raw, dtype=np.float32).copy()
    return a.reshape(-1, channels) if channels > 1 else a


def resample(a, factor):
    """음높이 factor배 (길이는 1/factor)"""
    if factor == 1:
        return a
    n = int(len(a) / factor)
    return np.interp(np.arange(n) * factor, np.arange(len(a)), a).astype(np.float32)


def fades(a, fin=0.004, fout=0.03):
    a = a.copy()
    # 아주 짧은 소리(클릭 등)는 페이드가 소리를 먹지 않도록 길이의 1/3까지만
    i, o = min(int(fin * SR), len(a) // 3), min(int(fout * SR), len(a) // 3)
    if i > 0:
        a[:i] *= np.linspace(0, 1, i)
    if o > 0:
        a[-o:] *= np.linspace(1, 0, o)
    return a


def layer(src_root, path, t0=0.0, t1=None, pitch=1.0, gain=1.0, at=0.0, fin=0.004, fout=0.03):
    a = load(os.path.join(src_root, path))
    a = a[int(t0 * SR): int(t1 * SR) if t1 else None]
    a = fades(resample(a, pitch), fin, fout) * gain
    return np.concatenate([np.zeros(int(at * SR), np.float32), a])


def mix(parts):
    n = max(len(p) for p in parts)
    out = np.zeros(n, np.float32)
    for p in parts:
        out[:len(p)] += p
    return out


def normalize(a, peak_db=-1.0):
    peak = np.max(np.abs(a)) + 1e-9
    return a * (10 ** (peak_db / 20) / peak)


def trim_silence(a, thr=0.002):
    idx = np.where(np.abs(a) > thr)[0]
    return a[: idx[-1] + int(0.02 * SR)] if len(idx) else a


def write_ogg(a, path, q=4, channels=1):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    data = np.clip(a, -1, 1).astype(np.float32).tobytes()
    subprocess.run([FF, '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', str(channels), '-i', '-',
                    '-c:a', 'libvorbis', '-q:a', str(q), path], input=data, check=True)


# ---------------------------------------------------------------------------
# 합성
rng = np.random.default_rng(7)


def t_axis(sec):
    return np.arange(int(sec * SR)) / SR


def one_pole_lowpass(x, cutoff):
    """cutoff: 샘플마다 차단 주파수 배열(Hz)"""
    y = np.zeros_like(x)
    k = 1 - np.exp(-2 * np.pi * np.asarray(cutoff) / SR)
    acc = 0.0
    for i in range(len(x)):
        acc += (k[i] if np.ndim(k) else k) * (x[i] - acc)
        y[i] = acc
    return y


def synth_whoosh(sec=0.9, lo=250, hi=3200):
    """바람 가르는 소리: 잡음을 차단 주파수를 올렸다 내리며 거름"""
    t = t_axis(sec)
    u = t / sec
    noise = rng.standard_normal(len(t)).astype(np.float32)
    sweep = lo + (hi - lo) * np.sin(np.pi * np.clip(u * 1.1, 0, 1)) ** 2
    band = one_pole_lowpass(noise, sweep) - one_pole_lowpass(noise, sweep * 0.25)
    env = np.sin(np.pi * u) ** 1.6
    return band * env


def synth_siren(cycles=3, f_hi=880, f_lo=620, half=0.24, bass=False):
    """경보: 높은음/낮은음 번갈아 (각진 파형을 부드럽게) + 선택적으로 저음 박동"""
    parts = []
    for c in range(cycles * 2):
        f = f_hi if c % 2 == 0 else f_lo
        t = t_axis(half)
        ph = 2 * np.pi * f * t
        wave = np.sin(ph) + np.sin(3 * ph) / 3 + np.sin(5 * ph) / 5 * 0.6   # 부드러운 사각파
        env = np.minimum(1, t / 0.01) * np.minimum(1, (half - t) / 0.03)
        parts.append(wave * env)
    s = np.concatenate(parts)
    vib = 1 + 0.004 * np.sin(2 * np.pi * 6 * t_axis(len(s) / SR))
    s = s * vib
    if bass:
        t = t_axis(len(s) / SR)
        pulse = np.sin(2 * np.pi * 55 * t) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * t / (half * 2))))
        s = s + 0.8 * pulse
    return fades(s.astype(np.float32), 0.01, 0.12)


def synth_heartbeat(period=1.1):
    """심장 박동 두 번 (쿵-쿵), period 길이로 반복 재생용"""
    out = np.zeros(int(period * SR), np.float32)
    for at, amp, f0 in [(0.0, 1.0, 62), (0.2, 0.7, 55)]:
        t = t_axis(0.3)
        freq = f0 * (1 - 0.35 * t / 0.3)
        ph = 2 * np.pi * np.cumsum(freq) / SR
        thump = np.sin(ph) * np.exp(-t / 0.075) * amp
        click = one_pole_lowpass(rng.standard_normal(len(t)).astype(np.float32), np.full(len(t), 900.0)) * np.exp(-t / 0.01) * 0.4 * amp
        i = int(at * SR)
        out[i:i + len(t)] += (thump + click)[: len(out) - i]
    return out


def synth_riser(sec=0.7, f0=180, f1=1400):
    """필살기 컷인: 빠르게 솟는 상승음 (톱니파 + 잡음)"""
    t = t_axis(sec)
    u = t / sec
    freq = f0 * (f1 / f0) ** (u ** 1.5)
    ph = 2 * np.pi * np.cumsum(freq) / SR
    saw = 2 * ((ph / (2 * np.pi)) % 1) - 1
    saw = one_pole_lowpass(saw.astype(np.float32), 800 + 5000 * u)
    noise = one_pole_lowpass(rng.standard_normal(len(t)).astype(np.float32), 2000 + 6000 * u) * 0.35
    env = u ** 1.4 * np.minimum(1, (sec - t) / 0.02)
    return (saw * 0.7 + noise) * env


# ---------------------------------------------------------------------------
# 효과음 조합: 이름 → [(파일, 옵션)] 또는 합성 함수
SFX = {
    # 거대로봇
    'mech_laser': [(SCI + 'laserSmall_004.ogg', dict(t1=0.32, pitch=0.9))],
    'mech_laser_big': [(SCI + 'laserLarge_001.ogg', {}), (SCI + 'lowFrequency_explosion_001.ogg', dict(t1=0.8, gain=0.7))],
    'mech_laser_hit': [(SCI + 'impactMetal_004.ogg', dict(t1=0.3))],
    'mech_missile_launch': [(SCI + 'thrusterFire_001.ogg', dict(t0=1.0, t1=1.45, fin=0.03, fout=0.12))],
    'mech_missile_blast': [(SCI + 'explosionCrunch_000.ogg', {})],
    'mech_drone_launch': [(DIG + 'phaseJump3.ogg', {})],
    'mech_drone_blast': [(SCI + 'explosionCrunch_002.ogg', dict(pitch=1.2, t1=0.9, fout=0.2))],
    'mech_fist_hit': [(IMP + 'impactPunch_heavy_000.ogg', {}), (IMP + 'impactMetal_heavy_000.ogg', dict(gain=0.6))],
    'mech_land': [(SCI + 'lowFrequency_explosion_001.ogg', {}), (IMP + 'impactPlate_heavy_001.ogg', dict(gain=0.6, pitch=0.7))],
    'mech_thrust': [(SCI + 'thrusterFire_003.ogg', dict(t0=0.9, t1=1.8, fin=0.05, fout=0.25))],
    'giant_step': [(IMP + 'footstep_concrete_000.ogg', dict(pitch=0.55)), (IMP + 'impactSoft_heavy_000.ogg', dict(gain=0.5, pitch=0.8, t1=0.3))],
    'charge_up': [(DIG + 'powerUp3.ogg', dict(pitch=0.8, gain=0.8))],
    # 거대괴수
    'kaiju_bite': [(CRE + 'eat_01.ogg', {}), (IMP + 'impactPunch_heavy_002.ogg', dict(gain=0.7, pitch=0.8))],
    'kaiju_roar': [('monster_roar.wav', dict(t0=0.25, t1=2.9, fout=0.7))],
    'kaiju_spore': [(SCI + 'slime_000.ogg', {})],
    'kaiju_egg_lay': [(IMP + 'impactSoft_medium_000.ogg', {}), (SCI + 'slime_000.ogg', dict(pitch=0.7, gain=0.7))],
    'kaiju_egg_hatch': [(IMP + 'impactGlass_light_000.ogg', {}), (CRE + 'cute_01.ogg', dict(at=0.08, pitch=0.8, gain=0.8))],
    'kaiju_regen': [(DIG + 'powerUp2.ogg', dict(gain=0.8))],
    # 타락 히어로
    'hero_slash_hit': [(RPG + 'knifeSlice2.ogg', {}), (IMP + 'impactMetal_heavy_002.ogg', dict(gain=0.5))],
    'hero_wave': [(DIG + 'phaseJump1.ogg', dict(pitch=0.85))],
    'hero_wave_hit': [(DIG + 'zap1.ogg', dict(t1=0.4))],
    'hero_orb': [(DIG + 'phaserUp6.ogg', {})],
    'hero_cast': [(DIG + 'zapThreeToneUp.ogg', dict(t1=0.7, fout=0.15))],
    'hero_curse_tick': [(DIG + 'lowDown.ogg', dict(t0=0.35, t1=0.78, fin=0.02, fout=0.1))],
    'hero_curse_nova': [(SCI + 'forceField_000.ogg', {}), (SCI + 'lowFrequency_explosion_000.ogg', dict(t1=1.2, gain=0.8, fout=0.3))],
    'hero_mind_convert': [(DIG + 'zapTwoTone.ogg', dict(t1=0.9, fout=0.2))],
    # 합성괴인
    'chimera_punch': [(IMP + 'impactPunch_heavy_001.ogg', {})],
    'chimera_claw': [(RPG + 'knifeSlice.ogg', dict(t0=0.2)), (IMP + 'impactSoft_heavy_002.ogg', dict(gain=0.6, t1=0.3))],
    'chimera_summon': [(CRE + 'grunt_04.ogg', {}), (DIG + 'phaseJump2.ogg', dict(gain=0.6))],
    'chimera_quake': [(SCI + 'lowFrequency_explosion_001.ogg', dict(t1=0.5, fout=0.15))],
    'chimera_slam': [(SCI + 'explosionCrunch_003.ogg', dict(t1=1.0, fout=0.3)), (IMP + 'impactSoft_heavy_000.ogg', {})],
    'chimera_phase2': [(CRE + 'roar_02.ogg', {}), (DIG + 'powerUp1.ogg', dict(gain=0.6))],
    'generic_slash': [(RPG + 'knifeSlice2.ogg', {})],
    # 실드
    'shield_on': [(SCI + 'forceField_003.ogg', {})],
    'shield_hit': [(IMP + 'impactGlass_medium_000.ogg', dict(gain=0.8))],
    'shield_break': [(IMP + 'impactGlass_heavy_000.ogg', {}), (SCI + 'explosionCrunch_000.ogg', dict(pitch=1.3, gain=0.6, t1=0.5))],
    # 전투 공용
    'enemy_die': [(CRE + 'hurt_02.ogg', dict(pitch=1.25)), (IMP + 'impactGeneric_light_001.ogg', dict(gain=0.6))],
    'player_hit': [(IMP + 'impactPunch_medium_000.ogg', {})],
    'base_blast': [(SCI + 'explosionCrunch_001.ogg', {})],
    'base_destroyed': [(SCI + 'lowFrequency_explosion_000.ogg', {}), (SCI + 'explosionCrunch_004.ogg', dict(gain=0.8))],
    'player_down': [(SCI + 'explosionCrunch_004.ogg', {}), (DIG + 'lowDown.ogg', dict(at=0.2, gain=0.8))],
    # 연출
    'intro_whoosh': lambda: synth_whoosh(0.9),
    'intro_sortie': [(JIN + 'Hit jingles/jingles_HIT01.ogg', {})],
    'warning': lambda: synth_siren(3, 880, 620, 0.26),
    'warning_danger': lambda: synth_siren(4, 700, 470, 0.22, bass=True),
    'ult_cutin': lambda src: mix([synth_riser(0.55), layer(src, DIG + 'powerUp1.ogg', gain=0.55, at=0.45)]),
    'ult_ready': [(JIN + '8-Bit jingles/jingles_NES03.ogg', {})],
    'skill_ready': [(UI + 'pluck_001.ogg', {})],
    'skill_use': [(UI + 'select_005.ogg', {})],
    'star_get': [(JIN + '8-Bit jingles/jingles_NES09.ogg', {})],
    'mission_complete': [(JIN + '8-Bit jingles/jingles_NES12.ogg', {})],
    'mission_failed': [(JIN + '8-Bit jingles/jingles_NES00.ogg', {})],
    'result_win': [(UI + 'maximize_006.ogg', {})],
    'result_lose': [(UI + 'minimize_006.ogg', {})],
    'result_star': [(IMP + 'impactBell_heavy_001.ogg', dict(pitch=1.4, t1=0.6, fout=0.2))],
    'low_hp': lambda: synth_heartbeat(1.1),
    # UI
    'ui_click': [(UIA + 'click2.ogg', {})],
    'ui_toggle': [(UI + 'toggle_001.ogg', {})],
    'ui_pause': [(UI + 'switch_002.ogg', {})],
    'ui_tab': [(UIA + 'switch3.ogg', {})],
    'ui_tick': [(UI + 'tick_002.ogg', {})],
    'ui_equip': [(UI + 'confirmation_004.ogg', {})],
    'ui_error': [(UI + 'error_004.ogg', {})],
    'reward_done': [(UI + 'confirmation_002.ogg', {})],
}

# 배경음: 이름 → (파일, 시작 초, 길이 초 | None)
BGM = {
    'battle': ('x/5_Action_Chiptunes_By_Juhani_Junkala/Juhani Junkala [Retro Game Music Pack] Level 1.wav', 0, None),
    'boss': ('x/Juhani_Junkala_Chiptune_Adventures_OGG/Juhani Junkala [Chiptune Adventures] 3. Boss Fight.ogg', 0, None),
    'menu': ('Cyberpunk_Moonlight_Sonata_v2.mp3', 0, None),
}
BGM_RMS_DB = -17.0   # 배경음끼리 체감 음량을 맞춤


def build_sfx(src):
    for name, spec in SFX.items():
        if callable(spec):
            a = spec(src) if spec.__code__.co_argcount else spec()
        else:
            a = mix([layer(src, p, **opt) for p, opt in spec])
        if name != 'low_hp':   # 심장 박동은 반복 재생 길이 유지
            a = trim_silence(a)
        write_ogg(normalize(a, -1.0), os.path.join(OUT_SFX, f'{name}.ogg'), q=4)
        print(f'sfx {name:20s} {len(a) / SR:5.2f}s')


def build_bgm(src):
    for name, (path, t0, dur) in BGM.items():
        a = load(os.path.join(src, path), channels=2)
        a = a[int(t0 * SR): int((t0 + dur) * SR) if dur else None]
        rms = np.sqrt(np.mean(a ** 2)) + 1e-9
        a = a * (10 ** (BGM_RMS_DB / 20) / rms)
        a = np.clip(a, -0.98, 0.98)
        write_ogg(a.reshape(-1), os.path.join(OUT_BGM, f'{name}.ogg'), q=2, channels=2)
        print(f'bgm {name:8s} {len(a) / SR:6.1f}s')


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    src_dir = sys.argv[1]
    only = sys.argv[2] if len(sys.argv) > 2 else 'all'
    if only in ('all', 'sfx'):
        build_sfx(src_dir)
    if only in ('all', 'bgm'):
        build_bgm(src_dir)
