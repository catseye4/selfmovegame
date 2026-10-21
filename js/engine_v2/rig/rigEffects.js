/* ==========================================================================
   PROJECT: MAD OVERLORD // RIG EFFECTS (v2)
   애니메이션 클립의 이벤트(stomp/charge/fire/impact)가 호출하는 캐릭터 주변 이펙트.
   위치는 리그 소켓(총구, 발)에서 받아오므로 파츠를 바꿔도 좌표를 하드코딩할 필요가 없다.
   좌표: 호출하는 쪽의 화면 공간. size 배율로 캐릭터 크기에 맞춰 이펙트 크기를 조절한다.
   - projectiles: true  → 총구에서 발사체가 날아감 (rig_test.html)
   - projectiles: false → 총구 섬광만 표시, 적까지의 탄도는 전투 엔진이 담당 (게임)
   상시 이펙트(ambient): 캐릭터 정의의 ambient 목록대로 소켓 주변에서 입자를 계속 뿜는다.
     kind: smoke(연기, 퍼지며 상승) · ember(불티) · drip(떨어지는 점액 → 지면에 닿으면 splat) · flame(추진 화염)
   일시 이펙트: addTimedEmitter(같은 규격, 지정 시간만 뿜음) · 실드(setShield/shieldHit/shieldBreak, 육각 격자 돔)
     layer: 'back'(캐릭터 뒤, drawBack) | 'front'(캐릭터 앞, draw)
     크기/속도 단위는 테스트 화면 기준 px(× size 배율), spread/offset은 원본 이미지 px
   ========================================================================== */

const CYAN = '0, 255, 204';
const TOXIC = '170, 255, 40';
const VIOLET = '200, 110, 255';
const TRAIL_LIFE = 0.16;

export class RigEffects {
    constructor({ size = 1, projectiles = true } = {}) {
        this.k = size;
        this.projectiles = projectiles;
        this.emitters = [];
        this.timed = [];
        this.seed = 20260930;
        this.clear();
    }

    // 결정적 난수 (스크린샷/녹화 재현용)
    rand() {
        this.seed = (this.seed * 1664525 + 1013904223) >>> 0;
        return this.seed / 4294967296;
    }

    range([a, b]) {
        return a + (b - a) * this.rand();
    }

    /**
     * 상시 이펙트 설정
     * @param {Array} defs  캐릭터 정의의 ambient
     * @param {Function} resolve (socket, bone, ox, oy) → 화면 좌표 [x, y] (ox/oy: 원본 이미지 px 오프셋)
     * @param {number} groundY 지면 화면 y (점액이 닿으면 퍼짐)
     */
    setAmbient(defs, resolve, groundY) {
        this.emitters = (defs || []).map(def => ({ def, acc: 0 }));
        this.resolve = resolve;
        this.groundY = groundY;
        this.ambient = [];
    }

    /** def 규격의 입자를 dur초 동안만 뿜음 (점프 추진 화염 등) */
    addTimedEmitter(def, dur) {
        this.timed.push({ def, acc: 0, left: dur });
    }

    /**
     * 육각 격자 실드 돔
     * @param {Function} getGeom () → {x, y, rx, ry} 화면 좌표 (캐릭터를 따라다님)
     */
    setShield(getGeom, color = '255, 200, 60') {
        this.shield = { getGeom, color, t: 0, hit: 0, open: 0 };
    }

    shieldHit() {
        if (this.shield) this.shield.hit = 1;
    }

    /** 실드 파괴: 육각 조각이 흩어지며 사라짐 */
    shieldBreak() {
        const sh = this.shield;
        if (!sh) return;
        const g = sh.getGeom();
        for (let i = 0; i < 26; i++) {
            const a = this.rand() * Math.PI * 2;
            const x = g.x + Math.cos(a) * g.rx * (0.6 + this.rand() * 0.4);
            const y = g.y + Math.sin(a) * g.ry * (0.6 + this.rand() * 0.4);
            const v = (120 + this.rand() * 200) * this.k;
            this.shards.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60 * this.k, rot: this.rand() * 6,
                vr: (this.rand() - 0.5) * 10, life: 0, dur: 0.6 + this.rand() * 0.4, color: sh.color });
        }
        this.rings.push({ x: g.x, y: g.y, life: 0, dur: 0.5, r: Math.max(g.rx, g.ry) * 1.3, color: sh.color });
        this.shield = null;
        this.shake(6, 0.25);
    }

    _spawn(def) {
        const a = this.rand() * Math.PI * 2;
        const rr = Math.sqrt(this.rand());
        const [bx, by] = def.offset || [0, 0];
        const [sx, sy] = def.spread || [0, 0];
        const pos = this.resolve && this.resolve(def.socket, def.bone, bx + sx * rr * Math.cos(a), by + sy * rr * Math.sin(a));
        if (!pos) return;
        const k = this.k;
        this.ambient.push({
            kind: def.kind, layer: def.layer || 'front', x: pos[0], y: pos[1],
            vx: this.range(def.vel[0]) * k, vy: this.range(def.vel[1]) * k,
            r: this.range(def.size) * k, life: 0, dur: this.range(def.life),
            color: def.color, glow: def.glow
        });
    }

    clear() {
        this.ambient = [];
        this.sparks = [];
        this.timed = [];
        this.shield = null;
        this.shards = [];
        this.dust = [];
        this.shots = [];
        this.rings = [];
        this.flashes = [];
        this.charge = null;
        this.trail = null;
        this.shakeT = 0;
        this.shakeDur = 1;
        this.shakeAmp = 0;
        this.time = 0;
    }

    shake(amp, dur) {
        const a = amp * this.k;
        if (a >= this.shakeAmp * (this.shakeT / this.shakeDur)) {
            this.shakeAmp = a;
            this.shakeDur = dur;
            this.shakeT = dur;
        }
    }

    shakeOffset() {
        if (this.shakeT <= 0) return [0, 0];
        const a = this.shakeAmp * (this.shakeT / this.shakeDur);
        // 시간 기반 진동 (난수 대신 결정적인 값 → 스크린샷 재현 가능)
        return [Math.sin(this.time * 91) * a, Math.cos(this.time * 77) * a];
    }

    stomp(x, y) {
        const k = this.k;
        for (let i = 0; i < 14; i++) {
            const side = i % 2 === 0 ? 1 : -1;
            const spread = 0.35 + ((i * 37) % 10) / 10;
            this.dust.push({
                x: x + side * (10 + (i % 5) * 6) * k, y: y - 4 * k,
                vx: side * (70 + spread * 170) * k, vy: -(20 + ((i * 53) % 7) * 12) * k,
                r: (7 + (i % 4) * 3) * k, life: 0, dur: 0.45 + spread * 0.35
            });
        }
        this.shake(7, 0.22);
    }

    // 가벼운 발걸음: 작은 먼지만, 흔들림 없음 (사람 크기 캐릭터)
    step(x, y) {
        const k = this.k;
        for (let i = 0; i < 6; i++) {
            const side = i % 2 === 0 ? 1 : -1;
            this.dust.push({
                x: x + side * (6 + (i % 3) * 5) * k, y: y - 3 * k,
                vx: side * (40 + (i % 3) * 30) * k, vy: -(12 + (i % 2) * 14) * k,
                r: (4 + (i % 3) * 2) * k, life: 0, dur: 0.35 + (i % 3) * 0.08
            });
        }
    }

    // 칼 궤적: 활성 동안 소켓 위치를 기록해 잔상 띠로 그림
    startTrail(getPos, color = VIOLET) {
        this.trail = { getPos, color, active: true, points: [] };
    }

    stopTrail() {
        if (this.trail) this.trail.active = false;
    }

    startCharge(getPos, color = CYAN) {
        this.charge = { t: 0, getPos, color };
    }

    // 상태 전환 시 공격 관련 이펙트 정리 (차징, 날아가던 탄, 칼 궤적)
    stopCharge() {
        this.charge = null;
        this.shots = [];
        this.stopTrail();
    }

    fire(pos, dir, color = CYAN, size = 1) {
        if (this.projectiles) {
            const v = 1100 * this.k;
            this.shots.push({ x: pos[0], y: pos[1], vx: dir[0] * v, vy: dir[1] * v, life: 0, color, size });
        }
        this.flashes.push({ x: pos[0], y: pos[1], life: 0, dur: 0.09, r: 26 * this.k * size, color });
        this.shake(3, 0.1);
    }

    impact(pos, color = CYAN) {
        const k = this.k;
        this.rings.push({ x: pos[0], y: pos[1], life: 0, dur: 0.45, r: 115 * k, color });
        this.rings.push({ x: pos[0], y: pos[1], life: -0.06, dur: 0.35, r: 65 * k, color: '255, 255, 255' });
        this.flashes.push({ x: pos[0], y: pos[1], life: 0, dur: 0.14, r: 48 * k, color });
        // 타격 파편: 사방으로 튀는 빛줄기
        for (let i = 0; i < 14; i++) {
            const a = (i / 14) * Math.PI * 2 + this.rand() * 0.4;
            const v = (260 + this.rand() * 260) * k;
            this.sparks.push({ x: pos[0], y: pos[1], vx: Math.cos(a) * v, vy: Math.sin(a) * v,
                life: 0, dur: 0.22 + this.rand() * 0.18, color });
        }
        this.shake(6, 0.2);
    }

    // 점액 튀김: 타격 지점에서 방울이 앞(+x)으로 튀어 나가 떨어지고 지면에 퍼짐 (상시 점액과 같은 입자)
    splash(pos, color, count = 12) {
        const k = this.k;
        for (let i = 0; i < count; i++) {
            this.ambient.push({
                kind: 'drip', layer: 'front', x: pos[0], y: pos[1],
                vx: (40 + this.rand() * 220) * k, vy: -(120 + this.rand() * 260) * k,
                r: (4 + this.rand() * 5) * k, life: 0, dur: 3, color
            });
        }
    }

    // 포효: 입에서 시차를 두고 퍼지는 링 3개 + 긴 흔들림
    roar(pos, color = TOXIC) {
        for (let i = 0; i < 3; i++) {
            this.rings.push({ x: pos[0], y: pos[1], life: -i * 0.14, dur: 0.6, r: 170 * this.k, color });
        }
        this.shake(9, 0.45);
    }

    update(dt) {
        this.time += dt;
        this.shakeT = Math.max(0, this.shakeT - dt);
        if (this.charge) this.charge.t += dt;
        if (this.trail) {
            const tr = this.trail;
            if (tr.active) {
                const [x, y] = tr.getPos();
                tr.points.push({ x, y, t: this.time });
            }
            tr.points = tr.points.filter(p => this.time - p.t < TRAIL_LIFE);
            if (!tr.active && tr.points.length === 0) this.trail = null;
        }

        for (const em of [...this.emitters, ...this.timed]) {
            em.acc += dt * em.def.rate;
            while (em.acc >= 1) {
                em.acc -= 1;
                this._spawn(em.def);
            }
        }
        for (const tm of this.timed) tm.left -= dt;
        this.timed = this.timed.filter(tm => tm.left > 0);
        if (this.shield) {
            this.shield.t += dt;
            this.shield.open = Math.min(1, this.shield.open + dt / 0.35);
            this.shield.hit = Math.max(0, this.shield.hit - dt / 0.25);
        }
        for (const s of this.shards) {
            s.life += dt;
            s.x += s.vx * dt;
            s.y += s.vy * dt;
            s.vy += 400 * this.k * dt;
            s.rot += s.vr * dt;
        }
        this.shards = this.shards.filter(s => s.life < s.dur);
        for (const p of this.ambient) {
            p.life += dt;
            if (p.kind === 'drip') {
                p.vy += 900 * this.k * dt;
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                if (p.y >= this.groundY) {
                    p.kind = 'splat';
                    p.y = this.groundY;
                    p.life = 0;
                    p.dur = 1.6;
                }
            } else if (p.kind !== 'splat') {
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                p.vx *= 1 - 0.6 * dt;
            }
        }
        this.ambient = this.ambient.filter(p => p.life < p.dur);

        for (const d of this.dust) {
            d.life += dt;
            d.x += d.vx * dt;
            d.y += d.vy * dt;
            d.vx *= 1 - 3.5 * dt;
            d.vy += 60 * this.k * dt;
        }
        this.dust = this.dust.filter(d => d.life < d.dur);

        for (const s of this.shots) {
            s.life += dt;
            s.x += s.vx * dt;
            s.y += s.vy * dt;
        }
        this.shots = this.shots.filter(s => s.life < 1.2);

        for (const s of this.sparks) {
            s.life += dt;
            s.x += s.vx * dt;
            s.y += s.vy * dt;
            s.vx *= 1 - 4 * dt;
            s.vy *= 1 - 4 * dt;
        }
        this.sparks = this.sparks.filter(s => s.life < s.dur);

        for (const f of this.flashes) f.life += dt;
        this.flashes = this.flashes.filter(f => f.life < f.dur);
        for (const r of this.rings) r.life += dt;
        this.rings = this.rings.filter(r => r.life < r.dur);
    }

    /** 캐릭터 뒤에 그릴 이펙트 (skeleton.draw 전에 호출) */
    drawBack(ctx, view) {
        ctx.save();
        ctx.setTransform(view[0], view[1], view[2], view[3], view[4], view[5]);
        this._drawAmbient(ctx, 'back');
        ctx.restore();
    }

    _drawAmbient(ctx, layer) {
        for (const p of this.ambient) {
            if (p.layer !== layer) continue;
            const t = p.life / p.dur;
            if (p.kind === 'smoke') {
                const a = Math.min(1, t / 0.25) * (1 - t);
                const r = p.r * (1 + t * 1.2);
                ctx.globalCompositeOperation = 'source-over';
                glow(ctx, p.x, p.y, r, `rgba(${p.color}, ${0.7 * a})`);
                if (p.glow) {
                    ctx.globalCompositeOperation = 'lighter';
                    glow(ctx, p.x, p.y, r * 0.6, `rgba(${p.glow}, ${0.35 * a})`);
                }
            } else if (p.kind === 'ember') {
                const a = Math.min(1, t / 0.15) * (1 - t);
                ctx.globalCompositeOperation = 'lighter';
                glow(ctx, p.x, p.y, p.r * 3, `rgba(${p.color}, ${0.5 * a})`);
                ctx.fillStyle = `rgba(255, 255, 255, ${0.9 * a})`;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r * 0.6, 0, Math.PI * 2);
                ctx.fill();
            } else if (p.kind === 'drip') {
                const stretch = 1 + Math.min(1.6, Math.max(0, p.vy) / (380 * this.k));
                ctx.globalCompositeOperation = 'lighter';
                glow(ctx, p.x, p.y, p.r * 2.6, `rgba(${p.color}, 0.3)`);
                ctx.globalCompositeOperation = 'source-over';
                ctx.fillStyle = `rgba(${p.color}, 0.95)`;
                ctx.beginPath();
                ctx.ellipse(p.x, p.y, p.r, p.r * stretch, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = 'rgba(235, 255, 200, 0.85)';
                ctx.beginPath();
                ctx.arc(p.x - p.r * 0.3, p.y - p.r * 0.3 * stretch, p.r * 0.35, 0, Math.PI * 2);
                ctx.fill();
            } else if (p.kind === 'flame') {
                const a = 1 - t;
                ctx.globalCompositeOperation = 'lighter';
                glow(ctx, p.x, p.y, p.r * (1.6 - t), `rgba(${p.color}, ${0.8 * a})`);
                glow(ctx, p.x, p.y, p.r * 0.6 * (1 - t), `rgba(255, 255, 255, ${0.9 * a})`);
            } else if (p.kind === 'splat') {
                const rx = p.r * (1.5 + 2.5 * Math.min(1, t * 3));
                const a = 0.85 * (1 - t);
                ctx.globalCompositeOperation = 'lighter';
                glow(ctx, p.x, p.y, rx * 1.4, `rgba(${p.color}, ${0.3 * a})`);
                ctx.globalCompositeOperation = 'source-over';
                ctx.fillStyle = `rgba(${p.color}, ${a})`;
                ctx.beginPath();
                ctx.ellipse(p.x, p.y, rx, rx * 0.28, 0, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.globalCompositeOperation = 'source-over';
    }

    draw(ctx, view) {
        const k = this.k;
        ctx.save();
        ctx.setTransform(view[0], view[1], view[2], view[3], view[4], view[5]);

        this._drawAmbient(ctx, 'front');
        this._drawShield(ctx);

        for (const d of this.dust) {
            const t = d.life / d.dur;
            ctx.fillStyle = `rgba(150, 140, 165, ${0.55 * (1 - t)})`;
            ctx.beginPath();
            ctx.arc(d.x, d.y, d.r * (0.7 + t * 0.9), 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.globalCompositeOperation = 'lighter';

        if (this.trail && this.trail.points.length > 1) {
            // 궤적을 하나의 띠(다각형)로 채움: 선분마다 그리면 겹치는 끝부분이 점처럼 밝아짐
            const pts = this.trail.points;
            const fade = p => Math.max(0, 1 - (this.time - p.t) / TRAIL_LIFE);
            const ribbon = (widthOf, style) => {
                const left = [], right = [];
                for (let i = 0; i < pts.length; i++) {
                    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
                    const dx = b.x - a.x, dy = b.y - a.y;
                    const len = Math.hypot(dx, dy) || 1;
                    const w = widthOf(fade(pts[i])) * k / 2;
                    left.push([pts[i].x - (dy / len) * w, pts[i].y + (dx / len) * w]);
                    right.push([pts[i].x + (dy / len) * w, pts[i].y - (dx / len) * w]);
                }
                ctx.fillStyle = style;
                ctx.beginPath();
                ctx.moveTo(left[0][0], left[0][1]);
                for (const [x, y] of left.slice(1)) ctx.lineTo(x, y);
                for (const [x, y] of right.reverse()) ctx.lineTo(x, y);
                ctx.closePath();
                ctx.fill();
            };
            ribbon(a => 30 * a, `rgba(${this.trail.color}, 0.45)`);
            ribbon(a => 10 * a, 'rgba(255, 255, 255, 0.55)');
        }

        if (this.charge) {
            const [x, y] = this.charge.getPos();
            const grow = Math.min(1, this.charge.t / 0.35);
            const pulse = 0.8 + 0.2 * Math.sin(this.time * 40);
            const r = 20 * k * grow * pulse;
            const c = this.charge.color;
            glow(ctx, x, y, r * 2.2, `rgba(${c}, 0.35)`);
            glow(ctx, x, y, r, `rgba(${c}, 0.9)`);
            glow(ctx, x, y, r * 0.45, 'rgba(255, 255, 255, 0.95)');
        }

        for (const s of this.shots) {
            const sk = k * s.size;
            const len = 42 * sk;
            const n = Math.hypot(s.vx, s.vy);
            const tx = s.x - (s.vx / n) * len, ty = s.y - (s.vy / n) * len;
            const grad = ctx.createLinearGradient(tx, ty, s.x, s.y);
            grad.addColorStop(0, `rgba(${s.color}, 0)`);
            grad.addColorStop(1, `rgba(${s.color}, 0.8)`);
            ctx.strokeStyle = grad;
            ctx.lineWidth = 10 * sk;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(tx, ty);
            ctx.lineTo(s.x, s.y);
            ctx.stroke();
            glow(ctx, s.x, s.y, 14 * sk, `rgba(${s.color}, 0.9)`);
            glow(ctx, s.x, s.y, 6 * sk, 'rgba(255, 255, 255, 1)');
        }

        ctx.lineCap = 'round';
        for (const s of this.sparks) {
            const t = 1 - s.life / s.dur;
            const n = Math.hypot(s.vx, s.vy) || 1;
            const len = Math.min(26 * k, n * 0.05);
            ctx.strokeStyle = `rgba(${s.color}, ${0.9 * t})`;
            ctx.lineWidth = 4 * k * t + 1;
            ctx.beginPath();
            ctx.moveTo(s.x - (s.vx / n) * len, s.y - (s.vy / n) * len);
            ctx.lineTo(s.x, s.y);
            ctx.stroke();
        }

        for (const f of this.flashes) {
            const t = 1 - f.life / f.dur;
            if (f.color) glow(ctx, f.x, f.y, f.r * 1.6 * (0.6 + 0.4 * t), `rgba(${f.color}, ${0.6 * t})`);
            glow(ctx, f.x, f.y, f.r * (0.6 + 0.4 * t), `rgba(255, 255, 255, ${t})`);
        }

        for (const r of this.rings) {
            if (r.life < 0) continue; // 시차 대기 중
            const t = r.life / r.dur;
            ctx.strokeStyle = `rgba(${r.color}, ${1 - t})`;
            ctx.lineWidth = (6 * (1 - t) + 1) * k;
            ctx.beginPath();
            ctx.arc(r.x, r.y, r.r * t, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.restore();
    }
}

RigEffects.prototype._drawShield = function (ctx) {
    const k = this.k;
    for (const s of this.shards) {
        const a = 1 - s.life / s.dur;
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(s.rot);
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = `rgba(${s.color}, ${a})`;
        ctx.lineWidth = 2 * k;
        hexPath(ctx, 0, 0, 9 * k);
        ctx.stroke();
        ctx.restore();
    }
    const sh = this.shield;
    if (!sh) return;
    const { x, y, rx, ry } = sh.getGeom();
    const open = sh.open;
    const pulse = 0.75 + 0.25 * Math.sin(sh.t * 4);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    // 돔 채움 + 테두리
    ctx.beginPath();
    ctx.ellipse(x, y, rx * open, ry * open, 0, 0, Math.PI * 2);
    const g = ctx.createRadialGradient(x, y, 0, x, y, Math.max(rx, ry));
    g.addColorStop(0, `rgba(${sh.color}, 0.02)`);
    g.addColorStop(0.8, `rgba(${sh.color}, ${0.10 + 0.25 * sh.hit})`);
    g.addColorStop(1, `rgba(${sh.color}, ${0.28 + 0.4 * sh.hit})`);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = (3 + 3 * sh.hit) * k;
    ctx.strokeStyle = `rgba(${sh.color}, ${(0.7 + 0.3 * sh.hit) * pulse})`;
    ctx.stroke();
    // 육각 격자: 가장자리일수록 진하게
    ctx.clip();
    const size = 16 * k;
    const w = size * Math.sqrt(3);
    for (let row = -Math.ceil(ry / (size * 1.5)) - 1; row <= Math.ceil(ry / (size * 1.5)) + 1; row++) {
        for (let col = -Math.ceil(rx / w) - 1; col <= Math.ceil(rx / w) + 1; col++) {
            const hx = x + col * w + (row & 1 ? w / 2 : 0);
            const hy = y + row * size * 1.5;
            const d = ((hx - x) / rx) ** 2 + ((hy - y) / ry) ** 2;
            if (d > open * open) continue;
            const a = (0.08 + 0.5 * d * d) * pulse + 0.4 * sh.hit;
            ctx.strokeStyle = `rgba(${sh.color}, ${Math.min(1, a)})`;
            ctx.lineWidth = 1.5 * k;
            hexPath(ctx, hx, hy, size * 0.92);
            ctx.stroke();
        }
    }
    ctx.restore();
};

function hexPath(ctx, x, y, r) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
        const a = Math.PI / 6 + (i * Math.PI) / 3;
        const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }
    ctx.closePath();
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
