/* ==========================================================================
   PROJECT: MAD OVERLORD // RIG AVATAR (v2)
   캔버스 하나에 리그 캐릭터를 그리는 게임용 래퍼. monster_v2.js가 메뉴/전투 캔버스마다 하나씩 생성한다.
   - setCharacter('mech' | 'kaiju' | 'hero' | 'chimera', scale?), setMode('idle' | 'walk' | 'attack' | 'victory'),
     setArm('cannon' | 'fist')
   - consumeHit(): 공격 클립의 fire/impact 이벤트가 쌓은 타격량을 전투 엔진이 가져감
   - muzzlePoint(): 공격 소켓(총구/입)의 캔버스 좌표 (전투 엔진의 레이저 시작점)
   - headTop(): 머리 위(체력바 자리)의 캔버스 좌표
   - playOnce(clip): 점프/변신처럼 한 번 재생하고 현재 상태 동작으로 복귀
   - enterPhase2() / shieldHit() / breakShield() / resetSkills(): 2페이즈 거대화 + 육각 실드
   ========================================================================== */

import { Animator, Skeleton, Spring, Mat } from './rig.js';
import { RIG_CHARACTERS, attackClipOf, hitSocketOf } from './characters.js';
import { RigEffects } from './rigEffects.js';
import { gameTime } from '../gameTime.js';

const FIXED_DT = 1 / 120;
const FADE_SEC = 0.18;
const TEST_PAGE_SCALE = 0.42; // rigEffects의 기준 크기(rig_test.html 캐릭터 배율)
export const PHASE2_SCALE = 1.3; // 2페이즈 거대화 배율
const SHIELD_COLOR = '255, 200, 60';

/** 기본 자세 파츠 범위 (루트 피벗 기준 원본 px): 실드 크기/메뉴 맞춤에 사용 */
export function restBounds(layout) {
    const root = layout.pivots.root;
    let minX = Infinity, maxX = -Infinity, minY = Infinity;
    for (const p of Object.values(layout.parts)) {
        minX = Math.min(minX, p.x - root[0]);
        maxX = Math.max(maxX, p.x + p.w - root[0]);
        minY = Math.min(minY, p.y - root[1]);
    }
    return { minX, maxX, minY };
}

/** 실드 돔 크기/위치 (화면 좌표): 캐릭터 기본 자세 범위를 감싸는 타원 */
export function shieldGeom(bounds, toScreen, scale) {
    const [x, y] = toScreen([(bounds.minX + bounds.maxX) / 2, bounds.minY / 2]);
    return { x, y, rx: ((bounds.maxX - bounds.minX) / 2) * 1.02 * scale, ry: (-bounds.minY / 2) * 1.08 * scale };
}

/** 거대화 배율 트윈 (살짝 넘쳤다 돌아오는 easeOutBack) */
export class ScaleTween {
    constructor() {
        this.value = 1;
        this.from = 1;
        this.to = 1;
        this.t = 1;
        this.dur = 0.9;
    }

    set(to, dur = 0.9) {
        this.from = this.value;
        this.to = to;
        this.dur = dur;
        this.t = dur > 0 ? 0 : 1;
        if (dur <= 0) this.value = to;
    }

    /** @returns {boolean} 값이 바뀌었으면 true */
    update(dt) {
        if (this.t >= 1) return false;
        this.t = Math.min(1, this.t + dt / this.dur);
        const u = this.t - 1;
        const e = 1 + 2.70158 * u * u * u + 1.70158 * u * u;
        this.value = this.from + (this.to - this.from) * e;
        return true;
    }

    get done() {
        return this.t >= 1;
    }
}

const assetCache = new Map(); // assetDir -> Promise<{ layout, images }>

/** 캐릭터의 rig.json + 파츠 이미지를 한 번만 로드해 모든 아바타가 공유 */
export function loadRigAssets(character) {
    const dir = character.assetDir;
    if (!assetCache.has(dir)) {
        assetCache.set(dir, (async () => {
            const res = await fetch(`${dir}rig.json`);
            if (!res.ok) throw new Error(`[RigAvatar] ${dir}rig.json 로드 실패 (${res.status})`);
            const layout = await res.json();
            const images = {};
            await Promise.all(Object.entries(layout.parts).map(([key, part]) => new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => { images[key] = img; resolve(); };
                img.onerror = () => reject(new Error(`[RigAvatar] 파츠 이미지 로드 실패: ${dir}${part.src}`));
                img.src = dir + part.src;
            })));
            return { layout, images };
        })());
    }
    return assetCache.get(dir);
}

/**
 * 캐릭터 정의 + 에셋으로 뼈대 구성 (게임 RigAvatar와 rig_test.html 공용)
 * character.sockets(이펙트 위치 등)를 rig.json 소켓에 더하고, 자동 접지/무기 팔을 적용한다.
 */
export function buildSkeleton(character, layout, images, arm) {
    const merged = character.sockets
        ? { ...layout, sockets: { ...layout.sockets, ...character.sockets } }
        : layout;
    const skeleton = new Skeleton(character.bones, merged, images);
    skeleton.autoGround = character.autoGround || null;
    if (character.arms) skeleton.setPart(character.weaponBone, character.arms[arm].part);
    return skeleton;
}

/**
 * 애니메이션 이벤트 → 이펙트 (게임 RigAvatar와 rig_test.html 공용)
 * @param {Object} env { effects, skeleton, character, arm, toScreen(p), groundY, onGrow(mult), onShield() }
 *   stomp/step {foot, bone} · charge {color?, socket?, bone?} · chargeEnd · fire {color?, size?}
 *   impact {color?, splash?, socket?, bone?} · cast (소유자 콜백용 신호)
 *   roar {socket?, bone?, color?}
 *   trailStart {socket, bone, color} · trailEnd
 *   thrust {sockets: [[소켓, 뼈]...], dur, color?} 추진 화염 · grow {mult} 거대화 · shield 실드 전개
 */
export function applyRigEvent(name, data, env) {
    const { effects, skeleton, toScreen } = env;
    const socketPos = (socket, bone) => toScreen(skeleton.socketWorld(socket, bone));
    const [hitSocket, hitBone] = hitSocketOf(env.character, env.arm);
    const muzzle = () => socketPos(hitSocket, hitBone);
    const at = data.socket ? () => socketPos(data.socket, data.bone) : muzzle;   // 이벤트가 지정한 소켓 우선

    if (name === 'stomp') {
        effects.stomp(socketPos(data.foot, data.bone)[0], env.groundY);
    } else if (name === 'step') {
        effects.step(socketPos(data.foot, data.bone)[0], env.groundY);
    } else if (name === 'charge') {
        effects.startCharge(at, data.color);
    } else if (name === 'chargeEnd') {
        effects.charge = null;
    } else if (name === 'fire') {
        const p = muzzle();
        const q = toScreen(skeleton.pivotWorld(hitBone));
        const len = Math.hypot(p[0] - q[0], p[1] - q[1]) || 1;
        effects.fire(p, [(p[0] - q[0]) / len, (p[1] - q[1]) / len], data.color, data.size);
    } else if (name === 'impact') {
        effects.impact(at(), data.color);
        if (data.splash) effects.splash(at(), data.color);
    } else if (name === 'roar') {
        effects.roar(data.socket ? socketPos(data.socket, data.bone) : muzzle(), data.color);
    } else if (name === 'trailStart') {
        effects.startTrail(() => socketPos(data.socket, data.bone), data.color);
    } else if (name === 'trailEnd') {
        effects.stopTrail();
    } else if (name === 'thrust') {
        for (const [socket, bone] of data.sockets) {
            effects.addTimedEmitter({
                kind: 'flame', socket, bone, layer: 'front', rate: 50, spread: [30, 6], size: [13, 19],
                life: [0.18, 0.32], vel: [[-25, 25], [150, 280]], color: data.color || '150, 110, 255'
            }, data.dur || 0.5);
        }
    } else if (name === 'grow') {
        if (env.onGrow) env.onGrow(data.mult || PHASE2_SCALE);
    } else if (name === 'shield') {
        if (env.onShield) env.onShield();
    }
}

// 몸통 파츠 팩션 → 리그 캐릭터 (js/data/parts.js 의 faction 문자열)
const FACTION_RIG = [
    ['거대로봇', 'mech'],
    ['거대괴수', 'kaiju'],
    ['타락 히어로', 'hero'],
    ['합성괴인', 'chimera']
];

/**
 * 장착 파츠 조합을 어떤 리그 캐릭터로 그릴지 판정 (몸통 팩션 기준).
 * 거대로봇은 원거리 팔(laser/missile)이면 캐논, 그 외는 주먹.
 * @returns {{character: string, arm?: 'cannon'|'fist'} | null}  null이면 기존 페이퍼돌
 */
export function rigConfigFor(partsObj) {
    const faction = String((partsObj && partsObj.body && partsObj.body.faction) || '');
    const match = FACTION_RIG.find(([name]) => faction.includes(name));
    if (!match) return null;
    const character = match[1];
    if (character !== 'mech') return { character };
    const type = partsObj.arm && partsObj.arm.attackType;
    return { character, arm: type === 'laser' || type === 'missile' ? 'cannon' : 'fist' };
}

export class RigAvatar {
    /**
     * @param {HTMLCanvasElement} canvas
     * @param {Object} opts { character, width, height, rootX, rootY, scale, fit, shadow, shakeTarget, onEvent }
     *   character: 'mech' | 'kaiju' | 'hero' | 'chimera' (기본 mech)
     *   rootX/rootY: 캔버스에서 발 중앙(지면)이 놓일 위치, scale: 원본 이미지 대비 배율
     *   fit: 여백 px (숫자 또는 {x, y}). 지정하면 캐릭터마다 캔버스 안에 들어오도록 배율(최대 scale)과 rootX를 자동 계산 (메뉴용)
     *   shakeTarget: 착지/사격 흔들림을 적용할 요소(없으면 캐릭터만 흔들림)
     *   onResize: 거대화 등으로 크기가 바뀌었을 때 호출 (체력바 위치 갱신용)
     */
    constructor(canvas, opts) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.opts = { character: 'mech', shadow: true, fit: null, shakeTarget: null, onEvent: null, onResize: null, ...opts };
        this.giant = new ScaleTween();
        this.onceClip = null;
        this.effects = new RigEffects({ size: opts.scale / TEST_PAGE_SCALE, projectiles: false });
        this._setStage(opts.rootX, opts.scale);
        this.mode = 'idle';
        this.arm = null;
        this.pendingHit = 0;
        this.running = false;
        this.rafId = null;
        this.acc = 0;
        this.shaking = false;
        this.skeleton = null;
        this.animator = null;
        this.character = null;
        this.ready = this.setCharacter(this.opts.character);
    }

    /** 캐릭터 교체 (에셋 로드 후 뼈대/동작을 새로 구성). scale을 주면 배율도 바꿈 */
    setCharacter(id, scale) {
        const character = RIG_CHARACTERS[id];
        if (!character) return Promise.reject(new Error(`[RigAvatar] unknown character: ${id}`));
        if (scale && scale !== this.opts.scale) {
            this.opts.scale = scale;
            this._setStage(this.rootX, scale);
        }
        if (this.character === character) return this.ready;
        this.character = character;
        if (character.arms && !character.arms[this.arm]) this.arm = character.defaultArm;
        this.ready = loadRigAssets(character)
            .then(({ layout, images }) => {
                if (this.character === character) this._build(layout, images);
            })
            .catch(err => console.error(err));
        return this.ready;
    }

    _setStage(rootX, scale) {
        this.rootX = rootX;
        this.baseScale = scale;
        this._applyScale();
    }

    // 실제 배율 = 기본 배율 × 거대화 배율 (발 위치는 고정)
    _applyScale() {
        this.scale = this.baseScale * this.giant.value;
        this.stageM = Mat.trs(this.rootX, this.opts.rootY, 0, this.scale, this.scale);
        this.effects.k = this.scale / TEST_PAGE_SCALE;
    }

    /** fit 모드: 기본 자세 파츠 범위가 캔버스 안에 들어오도록 배율/가로 위치 계산 */
    _fitToCanvas(layout) {
        const fit = this.opts.fit;
        const mx = typeof fit === 'number' ? fit : fit.x;
        const my = typeof fit === 'number' ? fit : fit.y;
        const { minX, maxX, minY } = restBounds(layout);
        const scale = Math.min(this.opts.scale, (this.opts.width - 2 * mx) / (maxX - minX), (this.opts.rootY - my) / -minY);
        this._setStage(this.opts.width / 2 - ((minX + maxX) / 2) * scale, scale);
    }

    // 현재 뼈대/애니메이터가 지금 캐릭터로 만들어졌는지 (캐릭터 교체 후 에셋 로드 중에는 이전 캐릭터가 계속 재생됨)
    get _built() {
        return !!this.skeleton && this.builtFor === this.character;
    }

    _build(layout, images) {
        const c = this.character;
        this.builtFor = c;
        this.layout = layout;
        this.bounds = restBounds(layout);
        this.onceClip = null;
        this.giant.set(1, 0);
        if (this.opts.fit != null) this._fitToCanvas(layout);
        else this._applyScale();
        this.skeleton = buildSkeleton(c, layout, images, this.arm);
        this.springs = c.springs.map(s => new Spring(s));
        this.effects.clear();
        this.effects.setAmbient(c.ambient, (socket, bone, ox, oy) => {
            const w = this.skeleton.socketWorld(socket, bone);
            return this._toCanvas([w[0] + ox, w[1] + oy]);
        }, this.opts.rootY);
        this.pendingHit = 0;
        this.animator = new Animator(c.clips, (name, data) => this._handleEvent(name, data));
        this.animator.play(this._clip(this.mode), 0);
        this._tick(0);
        if (this.running) this.render();
    }

    _clip(mode) {
        return mode === 'attack' ? attackClipOf(this.character, this.arm) : mode;
    }

    setMode(mode) {
        if (!mode || mode === this.mode) return;
        this.mode = mode;
        this.pendingHit = 0;
        if (!this.animator || this.onceClip) return;   // 점프/변신 중이면 끝난 뒤 이 동작으로 복귀
        this.effects.stopCharge();
        this.animator.play(this._clip(mode), FADE_SEC);
    }

    /** 한 번만 재생하는 동작(점프/변신). 끝나면 현재 상태 동작으로 복귀. 해당 클립이 없으면 false */
    playOnce(name) {
        if (!this.animator || !this.character.clips[name]) return false;
        this.onceClip = name;
        this.pendingHit = 0;
        this.effects.stopCharge();
        this.animator.play(name, 0.12);
        return true;
    }

    // ---- 2페이즈 거대화 + 실드 ----
    /** 변신 클립이 있으면 클립의 grow/shield 이벤트로, 없으면 즉시 거대화 + 실드 */
    enterPhase2() {
        if (!this.animator) return;
        if (!this.playOnce('transform')) {
            this.setGiant(PHASE2_SCALE);
            this.shieldOn();
        }
    }

    setGiant(mult, instant = false) {
        this.giant.set(mult, instant ? 0 : 0.9);
        this._applyScale();
        if (instant && this.opts.onResize) this.opts.onResize();
    }

    shieldOn() {
        this.effects.setShield(() => shieldGeom(this.bounds, p => this._toCanvas(p), this.scale), SHIELD_COLOR);
    }

    shieldHit() {
        this.effects.shieldHit();
    }

    breakShield() {
        this.effects.shieldBreak();
    }

    /** 전투 시작 시 스킬 상태 초기화 (거대화/실드/한 번 재생 동작) */
    resetSkills() {
        this.effects.shield = null;
        this.setGiant(1, true);
        if (this.onceClip && this.animator) {
            this.onceClip = null;
            this.animator.play(this._clip(this.mode), 0);
        }
    }

    /** 리그 소켓의 캔버스 좌표 [x, y] */
    socketPoint(socket, bone) {
        if (!this._built) return null;
        return this._toCanvas(this.skeleton.socketWorld(socket, bone));
    }

    setArm(kind) {
        const c = this.character;
        if (!c || !c.arms || !c.arms[kind] || kind === this.arm) return;
        this.arm = kind;
        if (!this.skeleton) return;
        this.skeleton.setPart(c.weaponBone, c.arms[kind].part);
        if (this.mode === 'attack') {
            this.pendingHit = 0;
            this.effects.stopCharge();
            this.animator.play(this._clip('attack'), FADE_SEC);
        }
    }

    /** 마지막 호출 이후 발생한 타격량(1 = 전투 엔진 기본 1타)을 반환하고 비움 */
    consumeHit() {
        const hit = this.pendingHit;
        this.pendingHit = 0;
        return hit;
    }

    /** 머리 위(체력바 자리)의 캔버스 좌표 {x: 머리 피벗 x, y: 가장 높은 파츠 윗변} (기본 자세 기준) */
    headTop() {
        if (!this.layout) return null;
        const root = this.layout.pivots.root;
        const head = this.layout.pivots.head || root;
        const minY = Math.min(...Object.values(this.layout.parts).map(p => p.y));
        const [x, y] = this._toCanvas([head[0] - root[0], minY - root[1]]);
        return { x, y };
    }

    /** 공격 소켓(총구/입)의 캔버스 좌표 [x, y] */
    muzzlePoint() {
        if (!this._built) return null;
        const [socket, bone] = hitSocketOf(this.character, this.arm);
        return this._toCanvas(this.skeleton.socketWorld(socket, bone));
    }

    start() {
        if (this.running) return;
        this.running = true;
        this.canvas.width = this.opts.width;
        this.canvas.height = this.opts.height;
        this.last = performance.now();
        this.rafId = requestAnimationFrame(t => this._loop(t));
    }

    stop() {
        this.running = false;
        if (this.rafId) cancelAnimationFrame(this.rafId);
        this.rafId = null;
        this._applyShake(0, 0);
    }

    _loop(now) {
        if (!this.running) return;
        const dt = gameTime.frozen(now) ? 0 : Math.min(0.1, (now - this.last) / 1000);   // 히트스톱 중 정지
        this.last = now;
        if (this.animator) {
            this.acc += dt;
            while (this.acc >= FIXED_DT) {
                this._tick(FIXED_DT);
                this.acc -= FIXED_DT;
            }
            this.render();
        }
        this.rafId = requestAnimationFrame(t => this._loop(t));
    }

    _tick(h) {
        this.animator.update(h);
        if (this.onceClip && this.animator.currentTime >= this.character.clips[this.onceClip].duration) {
            this.onceClip = null;
            this.animator.play(this._clip(this.mode), FADE_SEC);
        }
        if (this.giant.update(h)) {
            this._applyScale();
            if (this.giant.done && this.opts.onResize) this.opts.onResize();
        }
        const offsets = {};
        for (const s of this.springs) {
            offsets[s.bone] = { ...(offsets[s.bone] || {}), [s.channel]: s.value };
        }
        this.skeleton.update(this.animator.sample(), offsets);
        if (h > 0) {
            for (const s of this.springs) s.step(this.skeleton.restPivotWorld(s.bone), h);
        }
        this.effects.update(h);
    }

    _toCanvas(p) {
        return Mat.apply(this.stageM, p[0], p[1]);
    }

    _handleEvent(name, data) {
        if (!this._built) return;   // 교체 대기 중인 이전 캐릭터의 이벤트는 무시
        applyRigEvent(name, data, {
            effects: this.effects, skeleton: this.skeleton, character: this.character, arm: this.arm,
            toScreen: p => this._toCanvas(p), groundY: this.opts.rootY,
            onGrow: mult => this.setGiant(mult), onShield: () => this.shieldOn()
        });
        if (data.hit) this.pendingHit += data.hit;
        if (this.opts.onEvent) this.opts.onEvent(name, data);
    }

    _applyShake(x, y) {
        const target = this.opts.shakeTarget;
        if (!target) return;
        if (x || y) {
            target.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
            this.shaking = true;
        } else if (this.shaking) {
            target.style.transform = '';
            this.shaking = false;
        }
    }

    render() {
        if (!this.skeleton) return;
        const ctx = this.ctx;
        const [sx, sy] = this.effects.shakeOffset();
        this._applyShake(sx, sy);
        const view = this.opts.shakeTarget ? [1, 0, 0, 1, 0, 0] : [1, 0, 0, 1, sx, sy];

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        if (this.opts.shadow) {
            const s = this.scale;
            const { rx, ry } = this.character.shadow;
            ctx.setTransform(view[0], view[1], view[2], view[3], view[4], view[5]);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
            ctx.beginPath();
            ctx.ellipse(this.rootX, this.opts.rootY + 2, rx * s, ry * s, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        this.effects.drawBack(ctx, view);
        this.skeleton.draw(ctx, Mat.mul(view, this.stageM));
        this.effects.draw(ctx, view);
    }
}
