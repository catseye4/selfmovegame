/* ==========================================================================
   PROJECT: MAD OVERLORD // VFX PLAYER (v2)
   데이터로 정의한 스킬 이펙트를 재생한다. 게임(battleFx.js)과 테스트 화면(rig_test.html)이 함께 사용.

   이펙트 정의 = { layers: [...], sfx?: '효과음 이름' }
     layer 공통: { type, at(시작 초), dur(길이 초), color('r, g, b'), layer?('ground'|'front'), dy?(기준점 위아래 px) }
     type
       flash   : 순간 섬광 {r}
       ring    : 퍼지는 고리 {r, ground?(바닥 타원), width}
       pillar  : 바닥에서 솟는 빛기둥 {h, w}
       rune    : 바닥 마법진 (회전하는 룬 고리 + 별) {r, spin}
       swirl   : 안으로 말려드는 소용돌이 {r, arms, spin}
       glow    : 바닥 잔광 {r}
       sparks  : 사방으로 튀는 빛줄기 (입자) {count, speed}
       motes   : 떠오르는 빛가루 (입자) {count, spread, rise:[min,max], life:[min,max]}
       smoke   : 퍼지며 흩어지는 연기 (입자) {count, spread, size, life:[min,max], rise}
   크기 단위: 게임 전장 px. play(..., {scale})로 배율 지정 (테스트 화면은 캐릭터가 커서 배율 ↑)
   좌표: 화면 좌표(y 아래로 증가). 바닥 이펙트는 발 높이 y 기준.

   그 밖에
     setPersistent(key, layer, follow): 계속 떠 있는 이펙트 (예: 흑마법 오라 마법진). pulse(key)로 번쩍임
     launchWave(o) / launchOrb(o): 이동하는 투사체 (어둠 파동, 세뇌 구체)
     onSfx(name): 효과음 연결 지점 (지금은 비어 있음 — 효과 확정 후 사운드 매니저를 연결)
   ========================================================================== */

const WHITE = '255, 255, 255';
const FRONT_TYPES = new Set(['flash', 'ring', 'pillar', 'swirl', 'sparks', 'motes', 'smoke']);

export class VfxPlayer {
    constructor() {
        this.items = [];
        this.parts = [];
        this.projectiles = [];
        this.persistent = new Map();
        this.time = 0;
        this.seed = 7331;
        this.onSfx = null;
    }

    rand() {
        this.seed = (this.seed * 1664525 + 1013904223) >>> 0;
        return this.seed / 4294967296;
    }

    range([a, b]) {
        return a + (b - a) * this.rand();
    }

    clear() {
        this.items = [];
        this.parts = [];
        this.projectiles = [];
        this.persistent.clear();
    }

    /** 이펙트 재생. opts: { scale, follow: () => [x, y] (따라다닐 때) } */
    play(def, x, y, opts = {}) {
        const s = opts.scale || 1;
        for (const layer of def.layers) {
            this.items.push({ ...layer, t: -(layer.at || 0), x, y, s, follow: opts.follow || null, started: false });
        }
        if (def.sfx && this.onSfx) this.onSfx(def.sfx);
    }

    setPersistent(key, layer, follow, scale = 1) {
        if (!layer) {
            this.persistent.delete(key);
            return;
        }
        this.persistent.set(key, { ...layer, follow, s: scale, t: 0, pulse: 0, open: 0 });
    }

    pulse(key) {
        const p = this.persistent.get(key);
        if (p) p.pulse = 1;
    }

    /**
     * 어둠 파동: 초승달 모양이 앞으로 날아가며 지나간 구간마다 onMove(x0, x1) 호출
     * o: { x, y, dir(1|-1), speed, range, h, color, scale, onMove, onEnd }
     */
    launchWave(o) {
        this.projectiles.push({ kind: 'wave', dist: 0, t: 0, trailAcc: 0, dir: 1, speed: 520, h: 70, scale: 1, ...o });
    }

    /** 세뇌 구체: from에서 to로 포물선 비행 후 onArrive. o: { from:[x,y], to: () => [x,y], dur, color, scale, onArrive } */
    launchOrb(o) {
        this.projectiles.push({ kind: 'orb', t: 0, dur: 0.45, scale: 1, trail: [], ...o });
    }

    // ------------------------------------------------------------------
    update(dt) {
        this.time += dt;
        for (const it of this.items) {
            it.t += dt;
            if (!it.started && it.t >= 0) {
                it.started = true;
                this._burst(it);
            }
        }
        this.items = this.items.filter(it => it.t < (it.dur || 0) || !it.started);

        for (const p of this.persistent.values()) {
            p.t += dt;
            p.open = Math.min(1, p.open + dt / 0.4);
            p.pulse = Math.max(0, p.pulse - dt / 0.35);
        }

        for (const p of this.parts) {
            p.t += dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vx *= 1 - (p.drag || 0) * dt;
            p.vy *= 1 - (p.drag || 0) * dt;
            p.vy += (p.g || 0) * dt;
        }
        this.parts = this.parts.filter(p => p.t < p.dur);

        for (const pr of this.projectiles) this._updateProjectile(pr, dt);
        this.projectiles = this.projectiles.filter(pr => !pr.done);
    }

    _burst(it) {
        const s = it.s;
        const [x, y0] = it.follow ? it.follow() : [it.x, it.y];
        const y = y0 + (it.dy || 0) * s;
        if (it.type === 'sparks') {
            for (let i = 0; i < (it.count || 12); i++) {
                const a = (it.angle != null ? it.angle : 0) + (it.cone != null ? (this.rand() - 0.5) * it.cone : this.rand() * Math.PI * 2);
                const v = (it.speed || 260) * s * (0.5 + this.rand() * 0.8);
                this.parts.push({ kind: 'spark', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0,
                    dur: 0.25 + this.rand() * 0.2, drag: 4, color: it.color, s });
            }
        } else if (it.type === 'motes') {
            for (let i = 0; i < (it.count || 8); i++) {
                this.parts.push({ kind: 'mote', x: x + (this.rand() - 0.5) * 2 * (it.spread || 20) * s,
                    y: y - this.rand() * 10 * s, vx: (this.rand() - 0.5) * 20 * s, vy: -this.range(it.rise || [50, 110]) * s,
                    t: 0, dur: this.range(it.life || [0.5, 1]), color: it.color, r: (it.size || 2.5) * s, phase: this.rand() * 6 });
            }
        } else if (it.type === 'smoke') {
            for (let i = 0; i < (it.count || 5); i++) {
                this.parts.push({ kind: 'smoke', x: x + (this.rand() - 0.5) * 2 * (it.spread || 20) * s,
                    y: y - this.rand() * (it.spreadY || 10) * s, vx: (this.rand() - 0.5) * 30 * s,
                    vy: -(it.rise || 25) * s * (0.5 + this.rand()), t: 0, dur: this.range(it.life || [0.7, 1.2]),
                    drag: 1.2, color: it.color, r: (it.size || 16) * s * (0.7 + this.rand() * 0.6),
                    layer: it.layer || 'front' });
            }
        }
    }

    _updateProjectile(pr, dt) {
        pr.t += dt;
        if (pr.kind === 'wave') {
            const x0 = pr.x;
            const step = pr.speed * pr.scale * dt;
            pr.x += step * pr.dir;
            pr.dist += step;
            if (pr.onMove) pr.onMove(Math.min(x0, pr.x), Math.max(x0, pr.x));
            // 꼬리: 보라 연기 + 빛가루
            pr.trailAcc += dt;
            while (pr.trailAcc > 0.035) {
                pr.trailAcc -= 0.035;
                const s = pr.scale;
                this.parts.push({ kind: 'smoke', x: pr.x - pr.dir * 10 * s, y: pr.y + (this.rand() - 0.5) * pr.h * 0.6 * s,
                    vx: -pr.dir * 30 * s, vy: -10 * s, t: 0, dur: 0.5, drag: 2, color: '60, 15, 95', r: 14 * s, layer: 'front' });
                this.parts.push({ kind: 'mote', x: pr.x, y: pr.y + (this.rand() - 0.5) * pr.h * 0.7 * s,
                    vx: -pr.dir * 60 * s, vy: -30 * s, t: 0, dur: 0.4, color: pr.color, r: 2.2 * s, phase: 0 });
            }
            if (pr.dist >= pr.range * pr.scale) {
                pr.done = true;
                this.play({ layers: [
                    { type: 'flash', at: 0, dur: 0.15, r: 26, color: pr.color },
                    { type: 'smoke', at: 0, count: 5, spread: 12, spreadY: pr.h * 0.4, size: 16, life: [0.4, 0.7], color: '60, 15, 95' }
                ] }, pr.x, pr.y, { scale: pr.scale });
                if (pr.onEnd) pr.onEnd();
            }
        } else if (pr.kind === 'orb') {
            const u = Math.min(1, pr.t / pr.dur);
            const [tx, ty] = pr.to();
            const [fx, fy] = pr.from;
            const apex = 60 * pr.scale;
            pr.x = fx + (tx - fx) * u;
            pr.y = fy + (ty - fy) * u - Math.sin(u * Math.PI) * apex;
            pr.trail.push([pr.x, pr.y]);
            if (pr.trail.length > 14) pr.trail.shift();
            if (u >= 1) {
                pr.done = true;
                if (pr.onArrive) pr.onArrive(tx, ty);
            }
        }
    }

    // ------------------------------------------------------------------
    /** layer: 'ground'(캐릭터/적 아래) | 'front'(위) */
    draw(ctx, layer) {
        ctx.save();
        if (layer === 'ground') {
            for (const p of this.persistent.values()) {
                const [x, y] = p.follow();
                drawRune(ctx, x, y, p, p.t, p.open, p.pulse);
            }
        }
        for (const it of this.items) {
            if (!it.started) continue;
            const itLayer = it.layer || (it.ground || !FRONT_TYPES.has(it.type) ? 'ground' : 'front');
            if (itLayer !== layer) continue;
            const u = Math.min(1, it.t / it.dur);
            const [x, y0] = it.follow ? it.follow() : [it.x, it.y];
            const y = y0 + (it.dy || 0) * it.s;
            DRAW[it.type] && DRAW[it.type](ctx, x, y, it, u, it.s, this.time);
        }
        this._drawParts(ctx, layer);
        if (layer === 'front') {
            for (const pr of this.projectiles) {
                if (pr.kind === 'wave') drawWave(ctx, pr);
                else if (pr.kind === 'orb') drawOrb(ctx, pr, this.time);
            }
        }
        ctx.restore();
    }

    _drawParts(ctx, layer) {
        for (const p of this.parts) {
            if ((p.layer || 'front') !== layer) continue;
            const u = p.t / p.dur;
            if (p.kind === 'spark') {
                const a = 1 - u;
                const n = Math.hypot(p.vx, p.vy) || 1;
                const len = Math.min(22 * p.s, n * 0.05);
                ctx.globalCompositeOperation = 'lighter';
                ctx.strokeStyle = `rgba(${p.color}, ${a})`;
                ctx.lineWidth = 3 * p.s * a + 0.8;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(p.x - (p.vx / n) * len, p.y - (p.vy / n) * len);
                ctx.lineTo(p.x, p.y);
                ctx.stroke();
            } else if (p.kind === 'mote') {
                const a = Math.min(1, u / 0.15) * (1 - u);
                const x = p.x + Math.sin(this.time * 6 + p.phase) * 3 * p.r;
                ctx.globalCompositeOperation = 'lighter';
                glow(ctx, x, p.y, p.r * 3.2, `rgba(${p.color}, ${0.55 * a})`);
                glow(ctx, x, p.y, p.r, `rgba(${WHITE}, ${0.9 * a})`);
            } else if (p.kind === 'smoke') {
                const a = Math.min(1, u / 0.2) * (1 - u);
                ctx.globalCompositeOperation = 'source-over';
                glow(ctx, p.x, p.y, p.r * (1 + u * 1.3), `rgba(${p.color}, ${0.6 * a})`);
            }
        }
        ctx.globalCompositeOperation = 'source-over';
    }
}

// ---- 그리기 ------------------------------------------------------------
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

function ellipseGlow(ctx, x, y, rx, ry, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, ry / rx);
    glow(ctx, 0, 0, rx, color);
    ctx.restore();
}

const easeOut = u => 1 - (1 - u) * (1 - u);

const DRAW = {
    flash(ctx, x, y, it, u, s) {
        ctx.globalCompositeOperation = 'lighter';
        const r = it.r * s * (0.6 + 0.4 * (1 - u));
        glow(ctx, x, y, r * 1.6, `rgba(${it.color}, ${0.7 * (1 - u)})`);
        glow(ctx, x, y, r * 0.7, `rgba(${WHITE}, ${1 - u})`);
    },
    ring(ctx, x, y, it, u, s) {
        ctx.globalCompositeOperation = 'lighter';
        const r = it.r * s * easeOut(u);
        ctx.strokeStyle = `rgba(${it.color}, ${1 - u})`;
        ctx.lineWidth = (it.width || 5) * s * (1 - u) + 1;
        ctx.beginPath();
        if (it.ground) ctx.ellipse(x, y, r, r * 0.28, 0, 0, Math.PI * 2);
        else ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.stroke();
    },
    glow(ctx, x, y, it, u, s) {
        ctx.globalCompositeOperation = 'lighter';
        const a = Math.min(1, u / 0.1) * (1 - u);
        ellipseGlow(ctx, x, y, it.r * s, it.r * s * 0.3, `rgba(${it.color}, ${0.7 * a})`);
    },
    pillar(ctx, x, y, it, u, s) {
        // 0~25%: 빠르게 솟음, 이후 가늘어지며 사라짐
        const grow = easeOut(Math.min(1, u / 0.25));
        const a = u < 0.3 ? 1 : 1 - (u - 0.3) / 0.7;
        const h = it.h * s * grow;
        const w = it.w * s * (1 - u * 0.55);
        ctx.globalCompositeOperation = 'lighter';
        ellipseGlow(ctx, x, y, w * 1.8, w * 0.5, `rgba(${it.color}, ${0.8 * a})`);
        const outer = ctx.createLinearGradient(0, y, 0, y - h);
        outer.addColorStop(0, `rgba(${it.color}, ${0.75 * a})`);
        outer.addColorStop(0.7, `rgba(${it.color}, ${0.35 * a})`);
        outer.addColorStop(1, `rgba(${it.color}, 0)`);
        ctx.fillStyle = outer;
        roundTop(ctx, x - w / 2, y - h, w, h);
        const core = ctx.createLinearGradient(0, y, 0, y - h);
        core.addColorStop(0, `rgba(${WHITE}, ${0.95 * a})`);
        core.addColorStop(1, `rgba(${WHITE}, 0)`);
        ctx.fillStyle = core;
        roundTop(ctx, x - w * 0.18, y - h * 0.92, w * 0.36, h * 0.92);
    },
    swirl(ctx, x, y, it, u, s, time) {
        ctx.globalCompositeOperation = 'lighter';
        const a = Math.min(1, u / 0.15) * (1 - u);
        const R = it.r * s * (1 - u * 0.6);
        const arms = it.arms || 3;
        ctx.lineCap = 'round';
        for (let k = 0; k < arms; k++) {
            ctx.strokeStyle = `rgba(${it.color}, ${0.85 * a})`;
            ctx.lineWidth = 3 * s;
            ctx.beginPath();
            for (let i = 0; i <= 24; i++) {
                const f = i / 24;
                const ang = (k / arms) * Math.PI * 2 + f * 3.2 + time * (it.spin || 9);
                const rr = R * (1 - f * 0.85);
                const px = x + Math.cos(ang) * rr, py = y + Math.sin(ang) * rr * 0.75;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.stroke();
        }
        glow(ctx, x, y, R * 0.5, `rgba(${WHITE}, ${0.6 * a})`);
    },
    rune(ctx, x, y, it, u, s, time) {
        const open = easeOut(Math.min(1, u / 0.2));
        const fade = u > 0.7 ? 1 - (u - 0.7) / 0.3 : 1;
        drawRune(ctx, x, y, { r: it.r, s, color: it.color, spin: it.spin }, time, open * fade, 0.6 * fade);
    }
};

function roundTop(ctx, x, y, w, h) {
    const r = Math.min(w / 2, h);
    ctx.beginPath();
    ctx.moveTo(x, y + h);
    ctx.lineTo(x, y + r);
    ctx.arc(x + w / 2, y + r, w / 2, Math.PI, 0);
    ctx.lineTo(x + w, y + h);
    ctx.closePath();
    ctx.fill();
}

// 바닥 마법진: 이중 고리 + 회전하는 룬 눈금 + 육망성 (원근감을 위해 세로로 납작한 타원)
function drawRune(ctx, x, y, p, time, open, pulse) {
    const s = p.s || 1;
    const rx = p.r * s * open, ry = rx * 0.3;
    if (rx < 1) return;
    const base = 0.35 + 0.65 * pulse;
    const rot = time * (p.spin || 0.8);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ellipseGlow(ctx, x, y, rx * 1.1, ry * 1.1, `rgba(${p.color}, ${0.18 + 0.3 * pulse})`);
    ctx.lineWidth = 2 * s;
    ctx.strokeStyle = `rgba(${p.color}, ${0.55 * base + 0.2})`;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = `rgba(${p.color}, ${0.45 * base + 0.15})`;
    ctx.beginPath();
    ctx.ellipse(x, y, rx * 0.78, ry * 0.78, 0, 0, Math.PI * 2);
    ctx.stroke();
    // 룬 눈금 (두 고리 사이)
    ctx.lineWidth = 1.6 * s;
    for (let i = 0; i < 16; i++) {
        const a = rot + (i / 16) * Math.PI * 2;
        const len = i % 2 ? 0.06 : 0.12;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(a) * rx * (0.82), y + Math.sin(a) * ry * 0.82);
        ctx.lineTo(x + Math.cos(a) * rx * (0.82 + len), y + Math.sin(a) * ry * (0.82 + len));
        ctx.stroke();
    }
    // 육망성 (반대 방향 회전)
    ctx.strokeStyle = `rgba(${p.color}, ${0.5 * base + 0.1})`;
    for (let tri = 0; tri < 2; tri++) {
        ctx.beginPath();
        for (let i = 0; i <= 3; i++) {
            const a = -rot * 0.7 + tri * Math.PI / 3 + (i / 3) * Math.PI * 2;
            const px = x + Math.cos(a) * rx * 0.74, py = y + Math.sin(a) * ry * 0.74;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.stroke();
    }
    ctx.restore();
}

// 어둠 파동: 진행 방향을 향한 초승달 (보라 외곽 + 흰 코어), 사거리 끝으로 갈수록 옅어짐
function drawWave(ctx, pr) {
    const s = pr.scale;
    const R = (pr.h / 2) * s;
    const fade = Math.min(1, pr.t / 0.08) * (1 - Math.max(0, pr.dist / (pr.range * s) - 0.7) / 0.3);
    ctx.save();
    ctx.translate(pr.x, pr.y);
    ctx.scale(pr.dir, 1);
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, -R * 0.2, 0, R * 1.5, `rgba(${pr.color}, ${0.35 * fade})`);
    ctx.beginPath();
    ctx.arc(-R * 0.55, 0, R, -1.15, 1.15);
    ctx.arc(-R * 1.05, 0, R * 1.02, 1.0, -1.0, true);
    ctx.closePath();
    const g = ctx.createLinearGradient(-R, 0, R * 0.5, 0);
    g.addColorStop(0, `rgba(${pr.color}, 0)`);
    g.addColorStop(0.6, `rgba(${pr.color}, ${0.8 * fade})`);
    g.addColorStop(1, `rgba(${WHITE}, ${0.95 * fade})`);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = `rgba(${WHITE}, ${0.9 * fade})`;
    ctx.lineWidth = 2.5 * s;
    ctx.beginPath();
    ctx.arc(-R * 0.55, 0, R, -1.0, 1.0);
    ctx.stroke();
    ctx.restore();
}

// 세뇌 구체: 보라 구체 + 나선 꼬리
function drawOrb(ctx, pr, time) {
    const s = pr.scale;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    pr.trail.forEach(([x, y], i) => {
        const f = i / pr.trail.length;
        const off = Math.sin(time * 30 + i) * 4 * s;
        glow(ctx, x, y + off, (3 + 8 * f) * s, `rgba(${pr.color}, ${0.25 * f})`);
    });
    glow(ctx, pr.x, pr.y, 22 * s, `rgba(${pr.color}, 0.6)`);
    glow(ctx, pr.x, pr.y, 8 * s, `rgba(${WHITE}, 0.95)`);
    ctx.restore();
}
