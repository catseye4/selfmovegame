/* ==========================================================================
   PROJECT: MAD OVERLORD // 사운드 매니저 (v2)
   - 효과음: assets/audio/sfx/<이름>.ogg (tools/audio/build_audio.py로 만듦). 이름은 이펙트 정의의 sfx,
     전투 연출(director.sfx), 전투 엔진/HUD에서 부르는 이름과 같다.
   - 배경음: assets/audio/bgm/<menu|battle|boss>.ogg — 곡이 바뀔 때 서로 교차해 페이드
   - 음량은 settings_v2.js(전체/효과음/배경음/음소거)를 따른다.

   재생 규칙 (SFX 표)
     vol   : 기본 음량 (0~1)
     gap   : 같은 소리를 다시 낼 수 있는 최소 간격(초) — 연사/지속 피해가 소리로 뭉개지지 않게
     voices: 같은 소리 동시 재생 최대 수
     pitch : 재생마다 음높이를 ±pitch 만큼 흔듦 (같은 소리 반복이 기계적으로 들리지 않게)
     duck  : 재생하는 동안 배경음을 이 비율로 낮춤 (큰 연출 순간)

   브라우저 자동 재생 제한: 첫 클릭/키 입력 뒤에 소리를 켠다(unlock). 그 전의 배경음 요청은 기억했다가 재생.
   ========================================================================== */

import { settings } from '../settings_v2.js';

const BASE = 'assets/audio/';

export const SFX = {
    // 거대로봇
    mech_laser: { vol: 0.26, gap: 0.045, voices: 4, pitch: 0.06 },
    mech_laser_big: { vol: 0.7 },
    mech_laser_hit: { vol: 0.22, gap: 0.06, voices: 3, pitch: 0.1 },
    mech_missile_launch: { vol: 0.32, gap: 0.05, voices: 4, pitch: 0.1 },
    mech_missile_blast: { vol: 0.42, gap: 0.05, voices: 4, pitch: 0.1 },
    mech_drone_launch: { vol: 0.35, gap: 0.08, pitch: 0.1 },
    mech_drone_blast: { vol: 0.42, gap: 0.06, voices: 4, pitch: 0.1 },
    mech_fist_hit: { vol: 0.55, gap: 0.05, pitch: 0.06 },
    mech_land: { vol: 0.7 },
    mech_thrust: { vol: 0.45 },
    giant_step: { vol: 0.22, gap: 0.12, pitch: 0.08 },
    charge_up: { vol: 0.32 },
    // 거대괴수
    kaiju_bite: { vol: 0.5, gap: 0.08, pitch: 0.06 },
    kaiju_roar: { vol: 0.8, duck: 0.45 },
    kaiju_spore: { vol: 0.16, gap: 0.25, pitch: 0.1 },
    kaiju_egg_lay: { vol: 0.45, gap: 0.1 },
    kaiju_egg_hatch: { vol: 0.5, gap: 0.08, pitch: 0.08 },
    kaiju_regen: { vol: 0.14, gap: 0.8 },
    // 타락 히어로
    hero_slash_hit: { vol: 0.48, gap: 0.05, pitch: 0.06 },
    hero_wave: { vol: 0.38, gap: 0.08, pitch: 0.05 },
    hero_wave_hit: { vol: 0.28, gap: 0.06, voices: 4, pitch: 0.1 },
    hero_orb: { vol: 0.35, gap: 0.1, pitch: 0.05 },
    hero_cast: { vol: 0.5 },
    hero_curse_tick: { vol: 0.15, gap: 0.3, pitch: 0.05 },
    hero_curse_nova: { vol: 0.7 },
    hero_mind_convert: { vol: 0.45, gap: 0.1 },
    // 합성괴인
    chimera_punch: { vol: 0.55, gap: 0.05, pitch: 0.06 },
    chimera_claw: { vol: 0.42, gap: 0.05, pitch: 0.08 },
    chimera_summon: { vol: 0.5, gap: 0.2 },
    chimera_quake: { vol: 0.18, gap: 0.3 },
    chimera_slam: { vol: 0.75 },
    // 심연의 길잡이 (합성음, tools/audio/build_audio.py)
    diver_jet: { vol: 0.2, gap: 0.08, voices: 3, pitch: 0.1 },
    diver_anchor_throw: { vol: 0.45, gap: 0.2 },
    diver_anchor_hit: { vol: 0.5, gap: 0.1, pitch: 0.05 },
    diver_surge: { vol: 0.6 },
    diver_hands: { vol: 0.65, duck: 0.6 },
    // 봉합 성녀 (합성음)
    saint_needle: { vol: 0.2, gap: 0.06, voices: 3, pitch: 0.08 },
    saint_stitch: { vol: 0.24, gap: 0.06, voices: 3, pitch: 0.1 },
    saint_seal: { vol: 0.6 },
    saint_revive: { vol: 0.7, duck: 0.55 },
    chimera_phase2: { vol: 0.8, duck: 0.45 },
    generic_slash: { vol: 0.42, gap: 0.05, pitch: 0.08 },
    // 실드
    shield_on: { vol: 0.5 },
    shield_hit: { vol: 0.28, gap: 0.15, pitch: 0.1 },
    shield_break: { vol: 0.7 },
    // 전투 공용
    enemy_die: { vol: 0.28, gap: 0.06, voices: 3, pitch: 0.12 },
    player_hit: { vol: 0.22, gap: 0.4, pitch: 0.1 },
    base_blast: { vol: 0.5, gap: 0.08, voices: 4, pitch: 0.12 },
    base_destroyed: { vol: 0.9, duck: 0.35 },
    player_down: { vol: 0.8, duck: 0.35 },
    // 연출
    intro_whoosh: { vol: 0.45 },
    intro_sortie: { vol: 0.6 },
    warning: { vol: 0.32, duck: 0.6 },
    warning_danger: { vol: 0.38, duck: 0.5 },
    ult_cutin: { vol: 0.6, duck: 0.45 },
    ult_ready: { vol: 0.42, gap: 1 },
    skill_ready: { vol: 0.32, gap: 0.3 },
    skill_use: { vol: 0.32, gap: 0.1 },
    star_get: { vol: 0.55 },
    mission_complete: { vol: 0.7 },
    mission_failed: { vol: 0.7 },
    result_win: { vol: 0.4 },
    result_lose: { vol: 0.4 },
    result_star: { vol: 0.5, gap: 0.1 },
    low_hp: { vol: 0.55 },
    // UI
    ui_click: { vol: 0.45, gap: 0.04 },
    ui_toggle: { vol: 0.4, gap: 0.04 },
    ui_pause: { vol: 0.45, gap: 0.05 },
    ui_tab: { vol: 0.32, gap: 0.04 },
    ui_tick: { vol: 0.12, gap: 0.05, pitch: 0.04 },
    ui_equip: { vol: 0.55 },
    ui_error: { vol: 0.45, gap: 0.1 },
    reward_done: { vol: 0.5 }
};

export const BGM = { menu: 'bgm/menu.ogg', battle: 'bgm/battle.ogg', boss: 'bgm/boss.ogg' };

class SoundManager {
    constructor() {
        this.ctx = null;
        this.unlocked = false;
        this.buffers = new Map();
        this.loading = new Map();
        this.lastAt = new Map();
        this.playing = new Map();
        this.loops = new Map();
        this.bgm = null;            // { name, el, gain }
        this.wantBgm = null;        // unlock 전에 요청된 배경음
        this.duckUntil = 0;
        settings.subscribe(() => this.applyVolumes());
    }

    // ---- 시작 ----
    /** 첫 사용자 입력에서 소리를 켬 (브라우저 자동 재생 제한) */
    listenForUnlock() {
        const go = () => {
            this.unlock();
            window.removeEventListener('pointerdown', go, true);
            window.removeEventListener('keydown', go, true);
        };
        window.addEventListener('pointerdown', go, true);
        window.addEventListener('keydown', go, true);
        this.unlock();   // 이미 사용자가 클릭해 진입한 경우 바로 켜짐
    }

    unlock() {
        if (!this.ctx) {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return;
            this.ctx = new AC();
            this.master = this.ctx.createGain();
            this.sfxBus = this.ctx.createGain();
            this.bgmBus = this.ctx.createGain();
            this.bgmDuck = this.ctx.createGain();
            // 마지막 단: 리미터 (폭발이 겹쳐도 소리가 찢어지지 않게)
            this.limiter = this.ctx.createDynamicsCompressor();
            this.limiter.threshold.value = -8;
            this.limiter.knee.value = 6;
            this.limiter.ratio.value = 12;
            this.limiter.attack.value = 0.003;
            this.limiter.release.value = 0.25;
            this.sfxBus.connect(this.master);
            this.bgmDuck.connect(this.bgmBus);
            this.bgmBus.connect(this.master);
            this.master.connect(this.limiter);
            this.limiter.connect(this.ctx.destination);
            this.applyVolumes();
        }
        const resumed = this.ctx.state === 'running' ? Promise.resolve() : this.ctx.resume();
        resumed.then(() => {
            if (this.unlocked || this.ctx.state !== 'running') return;
            this.unlocked = true;
            Object.keys(SFX).forEach(name => this.load(name));
            if (this.wantBgm) this.playBgm(this.wantBgm);
        }).catch(() => { /* 아직 사용자 입력 전 — 다음 입력에서 다시 시도 */ });
    }

    applyVolumes() {
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        const s = settings.values;
        this.master.gain.setTargetAtTime(s.mute ? 0 : s.master, t, 0.03);
        this.sfxBus.gain.setTargetAtTime(s.sfx, t, 0.03);
        this.bgmBus.gain.setTargetAtTime(s.bgm, t, 0.03);
    }

    load(name) {
        if (this.buffers.has(name) || this.loading.has(name) || !this.ctx) return this.loading.get(name);
        const p = fetch(`${BASE}sfx/${name}.ogg`)
            .then(r => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(r.status))))
            .then(buf => this.ctx.decodeAudioData(buf))
            .then(audio => { this.buffers.set(name, audio); })
            .catch(() => { /* 파일 없음/해석 실패: 소리 없이 진행 */ })
            .finally(() => this.loading.delete(name));
        this.loading.set(name, p);
        return p;
    }

    // ---- 효과음 ----
    /** opts: { vol(배율), rate(음높이 배율) } */
    play(name, opts = {}) {
        const def = SFX[name];
        if (!def || !this.unlocked) return;
        const now = this.ctx.currentTime;
        if (def.gap && now - (this.lastAt.get(name) ?? -9) < def.gap) return;
        const count = this.playing.get(name) || 0;
        if (count >= (def.voices || 6)) return;
        const buf = this.buffers.get(name);
        if (!buf) {
            this.load(name);
            return;
        }
        this.lastAt.set(name, now);
        const src = this.ctx.createBufferSource();
        src.buffer = buf;
        const wobble = def.pitch ? 1 + (Math.random() * 2 - 1) * def.pitch : 1;
        src.playbackRate.value = (opts.rate || 1) * wobble;
        const g = this.ctx.createGain();
        g.gain.value = (def.vol ?? 0.5) * (opts.vol ?? 1);
        src.connect(g).connect(this.sfxBus);
        this.playing.set(name, count + 1);
        src.onended = () => this.playing.set(name, Math.max(0, (this.playing.get(name) || 1) - 1));
        src.start();
        if (def.duck) this.duck(def.duck, buf.duration + 0.3);
    }

    /** 반복 재생 (저체력 심장 박동 등). 이미 켜져 있으면 무시 */
    loop(name) {
        if (!this.unlocked || this.loops.has(name)) return;
        const buf = this.buffers.get(name);
        if (!buf) {
            const p = this.load(name);
            if (p) p.then(() => this.buffers.has(name) && this.loop(name));
            return;
        }
        const src = this.ctx.createBufferSource();
        src.buffer = buf;
        src.loop = true;
        const g = this.ctx.createGain();
        g.gain.value = 0;
        g.gain.setTargetAtTime((SFX[name] && SFX[name].vol) ?? 0.5, this.ctx.currentTime, 0.1);
        src.connect(g).connect(this.sfxBus);
        src.start();
        this.loops.set(name, { src, g });
    }

    stopLoop(name, fade = 0.3) {
        const l = this.loops.get(name);
        if (!l) return;
        this.loops.delete(name);
        const t = this.ctx.currentTime;
        l.g.gain.setTargetAtTime(0, t, fade / 3);
        l.src.stop(t + fade + 0.05);
    }

    stopAllLoops() {
        [...this.loops.keys()].forEach(name => this.stopLoop(name, 0.15));
    }

    // ---- 배경음 ----
    /** 곡 전환: 이전 곡은 fade초 동안 줄어들고 새 곡이 커짐 */
    playBgm(name, fade = 1.2) {
        this.wantBgm = name;
        if (!this.unlocked) return;
        if (this.bgm && this.bgm.name === name) return;
        this.stopBgm(fade);
        const el = new Audio(`${BASE}${BGM[name]}`);
        el.loop = true;
        el.preload = 'auto';
        const node = this.ctx.createMediaElementSource(el);
        const gain = this.ctx.createGain();
        gain.gain.value = 0;
        node.connect(gain).connect(this.bgmDuck);
        gain.gain.setTargetAtTime(1, this.ctx.currentTime, fade / 3);
        el.play().catch(() => { /* 재생 실패(파일 없음 등): 무음 */ });
        this.bgm = { name, el, gain };
    }

    stopBgm(fade = 0.8) {
        if (!this.bgm) return;
        const { el, gain } = this.bgm;
        this.bgm = null;
        if (this.ctx) gain.gain.setTargetAtTime(0, this.ctx.currentTime, fade / 3);
        setTimeout(() => { el.pause(); el.src = ''; }, fade * 1000 + 200);
    }

    /** 잠깐 배경음 낮춤 (큰 효과음/연출 동안) */
    duck(level = 0.4, sec = 1.2) {
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        const g = this.bgmDuck.gain;
        g.cancelScheduledValues(t);
        g.setTargetAtTime(level, t, 0.05);
        const until = t + sec;
        this.duckUntil = Math.max(this.duckUntil, until);
        g.setTargetAtTime(1, this.duckUntil, 0.35);
    }

    /** 일시정지 중에는 배경음을 낮춰 둠 */
    setPaused(on) {
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        this.bgmDuck.gain.cancelScheduledValues(t);
        this.bgmDuck.gain.setTargetAtTime(on ? 0.35 : 1, t, 0.1);
        this.duckUntil = 0;
    }
}

export const sound = new SoundManager();
