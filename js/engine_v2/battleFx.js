/* ==========================================================================
   PROJECT: MAD OVERLORD // BATTLE FX OVERLAY (v2)
   전투 화면(entity-layer-v2) 전체를 덮는 이펙트 캔버스. 캐릭터 캔버스 밖까지 오가는 스킬 연출을 그린다.
   - 거대괴수 산란: addEgg(x, 부화 시간, onHatch) — 알이 떨어져 맥동하다 흔들리며 깨지고 onHatch 호출
   - 거대로봇 스웜 드론: launchDrone({from, index, getTarget, onHit}) — 발사구에서 솟아 공중 대기 후
     목표에 돌진해 폭발, onHit(폭발 위치) 호출
   - 스킬 이펙트(VfxPlayer): play(정의, x, b) · setAura/pulseAura(계속 깔리는 마법진) · launchWave · launchOrb
     바닥 이펙트(마법진 등)는 적/캐릭터 아래 캔버스, 나머지는 위 캔버스에 그림
   좌표: entity-layer 기준 x(left px), b(bottom px). 캔버스 y = 높이 - b
   ========================================================================== */

import { VfxPlayer } from './vfx/vfxPlayer.js';
import { gameTime } from './gameTime.js';

// 새끼 괴수 걷기 스프라이트 (tools/rig/bake_sprite.py 결과 assets/sprites/rig/kaiju/baby_walk.json 과 맞춤)
export const BABY_KAIJU = { src: 'assets/sprites/rig/kaiju/baby_walk.png', frameWidth: 80, frameHeight: 64, frames: 12, duration: 1.2 };

const TOXIC = '170, 255, 40';
const DRONE_CORE = '200, 90, 255';
const BOOM = '255, 150, 60';

let stylesInjected = false;

/** 새끼 괴수 아군의 CSS(스프라이트 걷기 애니메이션)를 한 번만 주입 (index.css 공용 규칙은 건드리지 않음) */
export function ensureSkillStyles() {
    if (stylesInjected) return;
    stylesInjected = true;
    const b = BABY_KAIJU;
    const style = document.createElement('style');
    style.id = 'battle-fx-v2-styles';
    style.textContent = `
        .ally-minion.baby-kaiju-v2 {
            width: ${b.frameWidth}px; height: ${b.frameHeight}px;
            background-image: url('${b.src}');
            background-size: auto 100%;
            animation: baby-kaiju-walk-v2 ${b.duration}s steps(${b.frames}) infinite;
            transform: none;
            filter: drop-shadow(0 0 6px rgba(${TOXIC}, 0.6));
        }
        @keyframes baby-kaiju-walk-v2 {
            from { background-position-x: 0; }
            to { background-position-x: -${b.frameWidth * b.frames}px; }
        }`;
    document.head.appendChild(style);
}

export class BattleFx {
    constructor(layerId = 'entity-layer-v2') {
        this.layerId = layerId;
        this.canvas = null;
        this.ground = null;
        this.running = false;
        this.rafId = null;
        this.vfx = new VfxPlayer();
        this.reset();
    }

    get H() {
        return (this.canvas && this.canvas.height) || (document.getElementById(this.layerId) || {}).clientHeight || 600;
    }

    // ---- 스킬 이펙트 (VfxPlayer) ----
    play(def, x, b, opts = {}) {
        const follow = opts.follow ? () => { const [fx, fb] = opts.follow(); return [fx, this.H - fb]; } : null;
        this.vfx.play(def, x, this.H - b, { ...opts, follow });
    }

    setAura(key, layer, follow) {
        this.vfx.setPersistent(key, layer, layer ? () => { const [x, b] = follow(); return [x, this.H - b]; } : null);
    }

    pulseAura(key) {
        this.vfx.pulse(key);
    }

    /** o: { x, b, range, color, speed, h, onPass(x0, x1) } */
    launchWave(o) {
        this.vfx.launchWave({ ...o, y: this.H - o.b, onMove: o.onPass });
    }

    /** from {x, bottom}, to() → {x, b}, onArrive() */
    launchOrb(from, to, color, dur, onArrive) {
        this.vfx.launchOrb({
            from: [from.x, this.H - from.bottom], to: () => { const t = to(); return [t.x, this.H - t.b]; },
            color, dur, onArrive
        });
    }

    reset() {
        if (this.vfx) this.vfx.clear();
        this.eggs = [];
        this.drones = [];
        this.sparks = [];
        this.rings = [];
        this.shards = [];
    }

    start() {
        const layer = document.getElementById(this.layerId);
        if (!layer) return;
        if (!this.canvas) {
            this.canvas = document.createElement('canvas');
            this.canvas.id = 'battle-fx-canvas-v2';
            Object.assign(this.canvas.style, {
                position: 'absolute', left: '0', top: '0', width: '100%', height: '100%',
                pointerEvents: 'none', zIndex: '30'
            });
            layer.appendChild(this.canvas);
            this.ctx = this.canvas.getContext('2d');
            // 바닥 레이어: entity-layer 쌓임 맥락 안에서 적/캐릭터보다 아래
            this.ground = document.createElement('canvas');
            this.ground.id = 'battle-fx-ground-v2';
            Object.assign(this.ground.style, {
                position: 'absolute', left: '0', top: '0', width: '100%', height: '100%',
                pointerEvents: 'none', zIndex: '-1'
            });
            layer.insertBefore(this.ground, layer.firstChild);
            this.gctx = this.ground.getContext('2d');
        }
        this.reset();
        if (this.running) return;
        this.running = true;
        this.last = performance.now();
        this.rafId = requestAnimationFrame(t => this._loop(t));
    }

    stop() {
        this.running = false;
        if (this.rafId) cancelAnimationFrame(this.rafId);
        this.rafId = null;
        this.reset();
        if (this.ctx) this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        if (this.gctx) this.gctx.clearRect(0, 0, this.ground.width, this.ground.height);
    }

    // ---- 산란 ----
    addEgg(x, hatchSec, onHatch) {
        this.eggs.push({ x, t: 0, hatchSec, onHatch, seed: Math.random() * 10 });
    }

    // ---- 스웜 드론 ----
    /**
     * @param {Object} o { from: {x, b}, index, getTarget: () => {x, b} | null, onHit: (pos) => void }
     */
    launchDrone(o) {
        const side = o.index - 1;   // -1, 0, 1 → 좌우로 퍼짐
        this.drones.push({
            x: o.from.x, b: o.from.b, state: 'launch', t: -o.index * 0.08,
            sx: o.from.x, sb: o.from.b,
            hx: o.from.x - 30 + side * 34, hb: o.from.b + 80 + (1 - Math.abs(side)) * 26,
            getTarget: o.getTarget, onHit: o.onHit, spin: Math.random() * 6, trail: []
        });
    }

    _loop(now) {
        if (!this.running) return;
        const dt = gameTime.frozen(now) ? 0 : Math.min(0.05, (now - this.last) / 1000);   // 히트스톱 중 정지
        this.last = now;
        this._resize();
        this._update(dt);
        this._draw();
        this.rafId = requestAnimationFrame(t => this._loop(t));
    }

    _resize() {
        const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
        if (w && (this.canvas.width !== w || this.canvas.height !== h)) {
            this.canvas.width = w;
            this.canvas.height = h;
            this.ground.width = w;
            this.ground.height = h;
        }
    }

    _burst(x, b, color, n, speed) {
        for (let i = 0; i < n; i++) {
            const a = Math.random() * Math.PI * 2;
            const v = speed * (0.5 + Math.random() * 0.8);
            this.sparks.push({ x, b, vx: Math.cos(a) * v, vb: Math.sin(a) * v, t: 0, dur: 0.3 + Math.random() * 0.25, color });
        }
    }

    _update(dt) {
        this.vfx.update(dt);
        // 알: 등장(0.25s) → 맥동 → 마지막 0.6초 흔들림 → 부화
        for (const e of this.eggs) {
            e.t += dt;
            if (!e.hatched && e.t >= e.hatchSec) {
                e.hatched = true;
                this._burst(e.x, 60 + 14, TOXIC, 16, 160);
                this.rings.push({ x: e.x, b: 62, t: 0, dur: 0.4, r: 40, color: TOXIC });
                for (let i = 0; i < 8; i++) {
                    const a = -Math.PI * (0.15 + 0.7 * Math.random());
                    const v = 90 + Math.random() * 120;
                    this.shards.push({ x: e.x, b: 70, vx: Math.cos(a) * v * (Math.random() < 0.5 ? -1 : 1),
                        vb: -Math.sin(a) * v, rot: Math.random() * 6, t: 0, dur: 0.7 });
                }
                if (e.onHatch) e.onHatch();
            }
        }
        this.eggs = this.eggs.filter(e => !e.hatched);

        for (const d of this.drones) {
            d.t += dt;
            d.spin += dt * 9;
            if (d.t < 0) continue;
            if (d.state === 'launch') {
                // 발사구에서 포물선으로 솟아 공중 대기 지점으로
                const u = Math.min(1, d.t / 0.45);
                const e = 1 - (1 - u) * (1 - u);
                d.x = d.sx + (d.hx - d.sx) * e;
                d.b = d.sb + (d.hb - d.sb) * e + Math.sin(u * Math.PI) * 30;
                if (u >= 1) { d.state = 'hover'; d.t = 0; }
            } else if (d.state === 'hover') {
                d.b = d.hb + Math.sin(d.t * 14) * 3;
                if (d.t >= 0.3) { d.state = 'dive'; d.t = 0; }
            } else if (d.state === 'dive') {
                const target = d.getTarget();
                if (!target) {
                    if (d.t > 1.2) this._explode(d);
                    d.b += 20 * dt;
                    continue;
                }
                const dx = target.x - d.x, db = target.b - d.b;
                const dist = Math.hypot(dx, db);
                const step = Math.min(dist, (380 + d.t * 900) * dt);
                if (dist <= 14) {
                    this._explode(d);
                } else {
                    d.x += (dx / dist) * step;
                    d.b += (db / dist) * step;
                }
            }
            d.trail.push({ x: d.x, b: d.b });
            if (d.trail.length > 8) d.trail.shift();
        }
        this.drones = this.drones.filter(d => !d.done);

        for (const s of this.sparks) {
            s.t += dt;
            s.x += s.vx * dt;
            s.b += s.vb * dt;
            s.vx *= 1 - 3 * dt;
            s.vb *= 1 - 3 * dt;
        }
        this.sparks = this.sparks.filter(s => s.t < s.dur);
        for (const r of this.rings) r.t += dt;
        this.rings = this.rings.filter(r => r.t < r.dur);
        for (const s of this.shards) {
            s.t += dt;
            s.x += s.vx * dt;
            s.b += s.vb * dt;
            s.vb -= 500 * dt;
            s.rot += dt * 8;
        }
        this.shards = this.shards.filter(s => s.t < s.dur && s.b > 50);
    }

    _explode(d) {
        d.done = true;
        this._burst(d.x, d.b, BOOM, 14, 260);
        this._burst(d.x, d.b, DRONE_CORE, 8, 180);
        this.rings.push({ x: d.x, b: d.b, t: 0, dur: 0.35, r: 55, color: DRONE_CORE });
        this.rings.push({ x: d.x, b: d.b, t: 0, dur: 0.25, r: 30, color: BOOM, fill: true });
        if (d.onHit) d.onHit({ x: d.x, b: d.b });
    }

    _draw() {
        const ctx = this.ctx;
        const H = this.canvas.height;
        ctx.clearRect(0, 0, this.canvas.width, H);
        const Y = b => H - b;
        this.gctx.clearRect(0, 0, this.ground.width, this.ground.height);
        this.vfx.draw(this.gctx, 'ground');

        for (const e of this.eggs) drawEgg(ctx, e, Y);

        for (const s of this.shards) {
            ctx.save();
            ctx.translate(s.x, Y(s.b));
            ctx.rotate(s.rot);
            ctx.fillStyle = `rgba(150, 230, 60, ${1 - s.t / s.dur})`;
            ctx.fillRect(-4, -3, 8, 6);
            ctx.restore();
        }

        for (const d of this.drones) {
            if (d.t < 0) continue;
            ctx.globalCompositeOperation = 'lighter';
            d.trail.forEach((p, i) => glow(ctx, p.x, Y(p.b), 3 + i, `rgba(${DRONE_CORE}, ${0.05 * i})`));
            ctx.globalCompositeOperation = 'source-over';
            drawDrone(ctx, d.x, Y(d.b), d.spin);
        }

        ctx.globalCompositeOperation = 'lighter';
        for (const r of this.rings) {
            const t = r.t / r.dur;
            if (r.fill) {
                glow(ctx, r.x, Y(r.b), r.r * (0.5 + t), `rgba(${r.color}, ${0.9 * (1 - t)})`);
            } else {
                ctx.strokeStyle = `rgba(${r.color}, ${1 - t})`;
                ctx.lineWidth = 4 * (1 - t) + 1;
                ctx.beginPath();
                ctx.arc(r.x, Y(r.b), r.r * t, 0, Math.PI * 2);
                ctx.stroke();
            }
        }
        ctx.lineCap = 'round';
        for (const s of this.sparks) {
            const a = 1 - s.t / s.dur;
            ctx.strokeStyle = `rgba(${s.color}, ${a})`;
            ctx.lineWidth = 2.5 * a + 0.5;
            ctx.beginPath();
            ctx.moveTo(s.x - s.vx * 0.03, Y(s.b - s.vb * 0.03));
            ctx.lineTo(s.x, Y(s.b));
            ctx.stroke();
        }
        ctx.globalCompositeOperation = 'source-over';
        this.vfx.draw(ctx, 'front');
    }
}

function glow(ctx, x, y, r, color) {
    if (r <= 0.5) return;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
}

// 산성 알: 등장 시 톡 떨어지고, 맥동 발광, 부화 직전 흔들리며 금이 감
function drawEgg(ctx, e, Y) {
    const appear = Math.min(1, e.t / 0.25);
    const left = e.hatchSec - e.t;
    const shake = left < 0.6 ? Math.sin(e.t * 45) * 0.18 * (1 - left / 0.6) : 0;
    const pulse = 0.6 + 0.4 * Math.sin(e.t * 6 + e.seed);
    const w = 12, h = 16;
    const y = Y(60 + (1 - appear) * 30);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, e.x, y - h * 0.6, 26, `rgba(${TOXIC}, ${0.35 * pulse})`);
    ctx.globalCompositeOperation = 'source-over';
    ctx.translate(e.x, y);
    ctx.rotate(shake);
    ctx.scale(appear, appear);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(w, 0, w, -h * 1.1, 0, -h * 1.9);
    ctx.bezierCurveTo(-w, -h * 1.1, -w, 0, 0, 0);
    const g = ctx.createRadialGradient(-3, -h * 1.2, 2, 0, -h, h * 1.4);
    g.addColorStop(0, '#e8ff9a');
    g.addColorStop(0.45, '#8fd62a');
    g.addColorStop(1, '#2f5a10');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = '#1a2e08';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = 'rgba(40, 80, 15, 0.8)';
    for (const [sx, sy, r] of [[-4, -10, 2.5], [4, -18, 2], [2, -6, 1.8], [-3, -22, 1.6]]) {
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.fill();
    }
    if (left < 0.6) {
        ctx.strokeStyle = `rgba(230, 255, 180, ${1 - left / 0.6})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-6, -16); ctx.lineTo(-2, -19); ctx.lineTo(1, -15); ctx.lineTo(5, -19);
        ctx.stroke();
    }
    ctx.restore();
}

// 스웜 드론: 가시 달린 검은 구체 + 보라 코어 (컨셉 '스웜 드론')
function drawDrone(ctx, x, y, spin) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1.4, 1.4);
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, 0, 0, 16, `rgba(${DRONE_CORE}, 0.45)`);
    ctx.globalCompositeOperation = 'source-over';
    ctx.rotate(spin * 0.3);
    ctx.strokeStyle = '#1b1b26';
    ctx.lineWidth = 3;
    for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 6, Math.sin(a) * 6);
        ctx.lineTo(Math.cos(a) * 13, Math.sin(a) * 13);
        ctx.stroke();
    }
    ctx.fillStyle = '#34344a';
    ctx.strokeStyle = '#0d0d14';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, 0, 0, 6, `rgba(${DRONE_CORE}, 1)`);
    glow(ctx, 0, 0, 2.5, 'rgba(255, 255, 255, 1)');
    ctx.restore();
}
