// 협력 출격 전용 시전자/타이머/표식. 주인공 스킬의 전역 monster 참조를 사용하지 않는다.
import { progress } from '../progress_v2.js';
import { SUPPORT as T, SUPPORT_UNITS } from '../support_v2.js';
import { rosterOf } from '../roster_v2.js';
import { RigAvatar, rigConfigFor } from '../rig/rigAvatar.js';
import { monsterControllerV2 as monster } from '../monster_v2.js';
import { gameTime } from '../gameTime.js';
import { aimAt } from '../bases_v2.js';
import { sound } from '../audio/sound_v2.js';
import { MECH_VFX, KAIJU_VFX, HERO_VFX, CHIMERA_VFX, DIVER_VFX, SAINT_VFX, FROST_VFX, DOLL_VFX } from '../vfx/vfxDefs.js';

const VFX = { mech: MECH_VFX.droneBlast, kaiju: KAIJU_VFX.roarBurst, hero: HERO_VFX.mindConvert,
    chimera: CHIMERA_VFX.slam, diver: DIVER_VFX.hands, saint: SAINT_VFX.corpseRise,
    frost: FROST_VFX.encase, doll: DOLL_VFX.puppetHit };
const HIT = { mech: MECH_VFX.laserHit, kaiju: KAIJU_VFX.biteHit, hero: HERO_VFX.waveHit,
    chimera: CHIMERA_VFX.clawHit, diver: DIVER_VFX.jetHit, saint: SAINT_VFX.needleHit,
    frost: FROST_VFX.fanHit, doll: DOLL_VFX.snipHit };
const MELEE = new Set(['melee', 'scissors']);
const AREA = new Set(['rail', 'water', 'wave', 'frost', 'missile', 'shotgun', 'orb', 'spit', 'melee', 'scissors']);
const solid = e => e.isBuilding || e.isBarricade;

export const SupportMethods = {
    setupSupport() {
        this.clearSupport();
        const main = monster.getCharacterId() || progress.character;
        this.support = { snapshot: progress.supportSnapshot(main), cooldown: T.cooldown, serial: 0, active: null, auto: !!progress.supportAuto };
        this.supportShield = 0;
        this.stats.supportCalls = 0;
        this.stats.supportDamage = 0;
    },
    supportTargets() {
        return this.enemies.filter(e => e.hp > 0 && e.x >= this.monsterX - 80 && e.x <= this.frontX() + T.range)
            .sort((a, b) => a.x - b.x);
    },
    supportStatus() {
        const s = this.support;
        const active = s?.active;
        const targets = this.supportTargets();
        const defensive = s?.snapshot?.id === 'saint' && this.overloadT <= 0 &&
            (this.playerHp < this.maxPlayerHp || this.allies.some(a => a.hp < a.maxHp));
        const cooldown = s?.cooldown || 0;
        return { ready: !!s?.snapshot && cooldown === 0 && !active,
            hasTarget: targets.length > 0 || defensive, cooldown,
            charge: s?.snapshot ? Math.max(0, Math.min(1, 1 - cooldown / T.cooldown)) : 0,
            time: active ? Math.max(0, T.duration - active.elapsed) : 0 };
    },
    callSupport() {
        const status = this.supportStatus();
        if (!this.isActive || this.cinematic || this.finalBaseDestroyed || this.timeUp || gameTime.paused ||
            document.querySelector('.v2-opcard') ||
            document.querySelector('.v2-settings') || !status.ready || !status.hasTarget) return false;
        const s = this.support, snap = s.snapshot;
        const target = this.supportTargets()[0];
        const active = { owner: `support-${this.runId}-${++s.serial}`, elapsed: 0, cast: false, nextAttack: T.attackAt,
            marks: new Map(), tasks: [], snapshot: snap, x: this.monsterX - 45, shieldAllies: new Set(),
            melee: MELEE.has(snap.parts.arm?.attackType || 'melee'), target, dash: null, dashUsed: false };
        active.x = this.supportPositionX(active.melee && target ? this.supportCombatX(active, target) : active.x);
        s.active = active;
        s.cooldown = T.cooldown;
        this.stats.supportCalls = (this.stats.supportCalls || 0) + 1;
        const el = document.createElement('div');
        el.className = 'v2-support-actor';
        el.style.setProperty('--support', rosterOf(snap.id).color);
        el.innerHTML = '<canvas></canvas><span>CO-OP · 협력 출격</span>';
        this.domEnemies?.appendChild(el);
        active.dom = el;
        const config = rigConfigFor(snap.parts, snap.id);
        const avatar = new RigAvatar(el.querySelector('canvas'), {
            character: snap.id, width: 360, height: 300, rootX: 160, rootY: 265,
            scale: 0.22, fit: { x: 24, y: 16 }, shadow: true
        });
        active.avatar = avatar;
        avatar.setArm(config.arm);
        avatar.setUpgrades(config.upgrades);
        avatar.setVariants(config.variants);
        avatar.setPartFilters(config.filters);
        avatar.ready.then(() => {
            if (this.support?.active !== active || !this.isActive) return;
            avatar.setMode('idle');
            avatar.start();
        });
        this.positionSupport(active);
        sound.play('ui_equip');
        this.hud.supportNotice?.(rosterOf(snap.id).faction, SUPPORT_UNITS[snap.id].ult);
        return true;
    },
    // 몸의 앞면을 건물/바리케이드보다 왼쪽에 둔다. 먼 적 앞으로 소환해도 방벽을 건너뛰지 않는다.
    supportPositionX(x) {
        const wall = this.enemies.filter(e => e.hp > 0 && solid(e)).reduce((p, e) => Math.min(p, e.x - 100), Infinity);
        return Math.min(wall, Math.max(20, x));
    },
    supportCombatX(a, target) {
        return target.x - T.actorFront - Math.min(T.meleeGap, Math.max(70, a.snapshot.stats.range) * 0.5);
    },
    supportInRange(a, target) {
        const dx = target.x - (a.x + T.actorFront);
        return dx >= -35 && dx <= Math.max(70, a.snapshot.stats.range) + 20;
    },
    positionSupport(a, dt = 0) {
        const target = this.supportTargets()[0];
        const reach = Math.max(70, a.snapshot.stats.range);
        const desired = this.supportPositionX(a.melee ? (target ? this.supportCombatX(a, target) : a.x)
            : Math.min(this.monsterX + 180, a.elapsed >= T.attackAt && target
                ? Math.max(this.monsterX - 45, target.x - reach - 50) : this.monsterX - 45));
        if (a.melee && a.elapsed < T.exitAt && target && a.target &&
            !this.enemies.includes(a.target) && !a.dashUsed && !this.supportInRange(a, target) && Math.abs(desired - a.x) <= T.dashRange) {
            a.dash = { from: a.x, to: desired, at: a.elapsed };
            a.dashUsed = true;
        }
        if (target) a.target = target;
        if (a.dash) {
            const u = Math.min(1, (a.elapsed - a.dash.at) / T.dashSec);
            a.x = this.supportPositionX(a.dash.from + (a.dash.to - a.dash.from) * (1 - (1 - u) ** 2));
            a.moving = true;
            if (u >= 1) a.dash = null;
        } else if (!a.melee || a.elapsed >= T.attackAt) {
            const gap = desired - a.x;
            const step = Math.max(90, a.snapshot.stats.speed) * dt;
            a.moving = Math.abs(gap) > 2;
            a.x = this.supportPositionX(a.x + Math.sign(gap) * Math.min(Math.abs(gap), step));
        }
        if (a.dom) {
            const fade = Math.min(1, a.elapsed / T.enter, (T.duration - a.elapsed) / (T.duration - T.exitAt));
            a.dom.style.left = `${a.x - 160}px`;
            a.dom.style.opacity = String(Math.max(0, fade));
            a.dom.style.transform = `translateX(${a.elapsed < T.enter ? -35 * (1 - fade) : a.elapsed > T.exitAt ? -35 * (1 - fade) : 0}px)`;
        }
    },
    tickSupport(dt) {
        const s = this.support;
        if (!s || !this.isActive) return;
        if (this.cinematic || this.finalBaseDestroyed || this.timeUp) { this.clearSupport(); return; }
        if (dt <= 0 || gameTime.paused) return;
        s.cooldown = Math.max(0, s.cooldown - dt);
        if (s.cooldown < 1e-6) s.cooldown = 0;
        if (!s.active) {
            if (s.auto && s.cooldown === 0 && s.snapshot && this.stats.time >= 2.5) {
                const targets = this.supportTargets();
                const id = s.snapshot.id;
                const danger = this.playerHp / this.maxPlayerHp <= T.autoHealth;
                const boss = targets.some(e => e.boss);
                const elites = targets.filter(e => e.elite).length >= 2;
                const crowd = targets.filter(e => !solid(e)).length >= T.autoCrowd;
                const finalPush = targets.some(e => e.isFinal) || this.timeLeft() < 20;
                const reason = id === 'saint' ? danger || boss || finalPush : boss || elites || crowd || (danger && targets.length) || finalPush;
                if (reason) this.callSupport();
            }
            return;
        }
        const a = s.active;
        a.elapsed += dt;
        if (a.elapsed >= T.duration) { this.clearSupport(); return; }
        this.positionSupport(a, dt);
        if (!a.cast && a.elapsed >= T.enter) {
            a.cast = true;
            const def = SUPPORT_UNITS[a.snapshot.id];
            if (!a.avatar?.playOnce(def.clip)) a.avatar?.setMode('attack');
            this.supportUltimate(a);
        }
        if (this.support?.active !== a) return;
        const due = a.tasks.filter(t => t.at <= a.elapsed);
        a.tasks = a.tasks.filter(t => t.at > a.elapsed);
        for (const task of due) {
            if (this.support?.active !== a || !this.isActive || this.finalBaseDestroyed) break;
            task.fn();
        }
        if (this.support?.active !== a) return;
        for (const [e, m] of a.marks) {
            if (!this.enemies.includes(e)) { e.dom?.classList.remove('v2-support-mark'); a.marks.delete(e); continue; }
            if (m.holdUntil <= a.elapsed) e.dom?.classList.remove('is-support-held');
            if (m.kind === 'diver') this.supportHit(a, e, a.snapshot.stats.dps * 0.12 * dt, { dot: true });
        }
        if (!a.dash && a.elapsed >= a.nextAttack && a.elapsed < T.exitAt) {
            a.nextAttack += T.attacksEvery;
            const target = this.supportTargets().find(e => this.supportInRange(a, e));
            a.avatar?.setMode(target ? 'attack' : a.moving ? 'walk' : 'idle');
            if (target) {
                const aim = aimAt(target);
                this.fx.play(HIT[a.snapshot.id] || CHIMERA_VFX.punchHit, aim.x, aim.b, { scale: 0.75 });
                this.supportHit(a, target, a.snapshot.stats.dps * T.attacksEvery * T.damage);
            }
            if (a.snapshot.id === 'doll') {
                for (const [e, m] of a.marks) {
                    if (m.holdUntil <= a.elapsed || e.boss || solid(e)) continue;
                    const victim = this.supportTargets().find(t => t !== e && !this.supportHeld(t));
                    if (victim) this.supportHit(a, victim, a.snapshot.stats.dps * 0.12);
                }
            }
        }
        if (a.elapsed >= T.exitAt) a.avatar?.setMode('idle');
    },
    supportLater(a, delay, fn) { a.tasks.push({ at: a.elapsed + delay, fn }); },
    supportHit(a, enemy, damage, extra = {}) {
        if (this.support?.active !== a || !this.isActive || this.cinematic || this.finalBaseDestroyed ||
            a.elapsed >= T.exitAt || !this.enemies.includes(enemy) || enemy.hp <= 0) return;
        const base = solid(enemy) ? T.baseDamage : 1;
        this.dealDamageToEnemy(enemy, damage * base, false, { ...extra, source: 'support', supportGear: a.snapshot.gear });
    },
    supportMark(a, e, hold = 0, shatter = false) {
        if (this.support?.active !== a || !this.enemies.includes(e) || e.hp <= 0) return;
        const control = !e.boss && !solid(e);
        a.marks.set(e, { kind: a.snapshot.id, holdUntil: a.elapsed + (control ? hold : 0), shatter });
        e.dom?.classList.add('v2-support-mark');
        e.dom?.style.setProperty('--support-mark', rosterOf(a.snapshot.id).color);
        e.dom?.classList.toggle('is-support-held', control && hold > 0);
    },
    supportUltimate(a) {
        const id = a.snapshot.id;
        const targets = this.supportTargets().slice(0, T.maxTargets);
        const u = a.snapshot.stats.dps * T.damage * T.ultimate * (1 + 0.1 * (a.snapshot.skillLevel - 1));
        if (id === 'chimera' && monster.rigBattle) monster.rigBattle.supportAttackSpeed = 1 + T.synergy;
        if (id === 'saint') {
            const ratio = targets.some(e => e.boss) || this.stage.boss ? T.bossShield : T.shield;
            this.supportShield = Math.min(a.snapshot.stats.hp * 0.12, this.maxPlayerHp * ratio, this.maxPlayerHp * T.shieldCap);
            for (const ally of this.allies) {
                ally.supportShield = Math.min(ally.maxHp * ratio, a.snapshot.stats.hp * 0.04);
                a.shieldAllies.add(ally);
            }
        }
        if (id === 'hero' || id === 'saint') {
            const cap = id === 'hero' ? 2 : 3;
            let made = 0;
            if (id === 'saint') {
                for (const c of [...this.corpses].slice(0, cap)) {
                    this.spawnSupportAlly(a, c.x, 'stitch', c.type);
                    this.removeCorpse(c);
                    made++;
                }
            }
            for (const e of targets.filter(e => !e.boss && !solid(e)).slice(0, cap - made)) {
                const x = e.x;
                this.enemies = this.enemies.filter(t => t !== e); // 전환은 처치/드랍 보상 없음
                e.dom?.remove();
                this.spawnSupportAlly(a, x, id === 'hero' ? 'mind' : 'stitch', e.artKey || e.type);
            }
            if (id === 'hero') {
                // 세뇌된 적 자리 주위(180px)에 약화, 보스/거점 단독일 때도 유효.
                const centers = targets.slice(0, 2).map(e => e.x);
                for (const e of this.supportTargets()) if (centers.some(x => Math.abs(e.x - x) <= 180)) this.supportMark(a, e);
            }
            for (const e of targets.filter(e => e.boss || solid(e))) {
                this.supportMark(a, e);
                const p = aimAt(e); this.fx.play(VFX[id], p.x, p.b);
                this.supportHit(a, e, u * 0.65);
            }
            return;
        }
        if (id === 'mech') {
            for (let i = 0; i < 6; i++) {
                let target = targets[i % targets.length];
                this.fx.launchDrone({ from: { x: a.x + 40, b: 210 }, index: i % 3,
                    delay: Math.floor(i / 3) * 0.2, owner: a.owner,
                    getTarget: () => {
                        if (this.support?.active !== a) return null;
                        if (!this.enemies.includes(target)) target = this.supportTargets()[0];
                        if (!target) return null;
                        const p = aimAt(target); return { x: p.x, b: p.b };
                    },
                    onHit: () => {
                        if (!target || this.support?.active !== a) return;
                        this.supportMark(a, target);
                        this.supportHit(a, target, u / 3);
                    }
                });
            }
            return;
        }
        const list = id === 'doll' ? targets.slice(0, 4) : targets;
        for (const e of list) {
            const hold = id === 'kaiju' || id === 'diver' ? 2 : id === 'frost' ? 1.5 : id === 'doll' ? 3 : 0;
            this.supportMark(a, e, hold, id === 'frost');
            const p = aimAt(e);
            this.fx.play(VFX[id], p.x, p.b, { scale: 0.8 });
            if (id === 'frost') {
                this.supportLater(a, 1.5, () => {
                    if (!this.enemies.includes(e)) return;
                    const q = aimAt(e); this.fx.play(FROST_VFX.shatter, q.x, q.b);
                    this.supportHit(a, e, u);
                });
            } else this.supportHit(a, e, u * (id === 'doll' ? 0.65 : 1));
        }
    },
    spawnSupportAlly(a, x, kind, art) {
        const ally = this.spawnAllyMinion(x, kind, { art,
            hp: Math.max(100, Math.min(a.snapshot.stats.hp * 0.08, 700)),
            dps: a.snapshot.stats.dps * 0.09, speed: a.snapshot.stats.speed });
        if (!ally) return;
        ally.supportOwner = a.owner;
        ally.supportGear = a.snapshot.gear;
        ally.dom?.classList.add('v2-support-minion');
    },
    supportHeld(e) {
        const a = this.support?.active;
        const m = a?.marks.get(e);
        return !!m && !e.boss && !solid(e) && m.holdUntil > a.elapsed;
    },
    supportEnemyDamageMul(e) {
        return this.support?.active?.marks.get(e)?.kind === 'hero' ? 1 - T.synergy : 1;
    },
    supportAttackMul() {
        return this.support?.active?.cast && this.support.active.snapshot.id === 'chimera' ? 1 + T.synergy : 1;
    },
    // 주인공만 연계 혜택. 지원/임시 아군은 주인공 옵션·흡혈·빙판 걸음을 빌리지 않는다.
    supportModifyDamage(enemy, damage, react) {
        if (react?.source === 'support' || react?.source === 'ally' || damage <= 0) return { damage, pierce: react?.pierce || 0 };
        const a = this.support?.active, m = a?.marks.get(enemy);
        let pierce = react?.pierce || 0;
        if (!m) return { damage, pierce };
        const melee = react?.delivery ? react.delivery === 'melee' : MELEE.has(this.attackType);
        const area = react?.area ?? AREA.has(this.attackType);
        if ((m.kind === 'mech' && !melee) || (m.kind === 'kaiju' && melee) || (m.kind === 'diver' && area)) damage *= 1 + T.synergy;
        if (m.kind === 'doll') pierce = Math.max(pierce, 0.25);
        if (m.kind === 'frost' && m.shatter) {
            m.shatter = false;
            damage += Math.min(a.snapshot.stats.dps * T.shatter, this.playerDps * 0.75);
            const p = aimAt(enemy); this.fx.play(FROST_VFX.shatter, p.x, p.b, { scale: 0.6 });
        }
        return { damage, pierce };
    },
    clearSupport() {
        const a = this.support?.active;
        if (a) {
            a.tasks.length = 0;
            a.avatar?.stop();
            if (this.fx?.drones) this.fx.drones = this.fx.drones.filter(d => d.owner !== a.owner);
            a.dom?.remove();
            for (const e of a.marks.keys()) {
                e.dom?.classList.remove('v2-support-mark', 'is-support-held');
                e.dom?.style.removeProperty('--support-mark');
            }
            for (const ally of this.allies || []) if (ally.supportOwner === a.owner) ally.dom?.remove();
            this.allies = (this.allies || []).filter(ally => ally.supportOwner !== a.owner);
            for (const ally of a.shieldAllies) delete ally.supportShield;
            this.support.active = null;
        }
        this.supportShield = 0;
        if (monster.rigBattle) monster.rigBattle.supportAttackSpeed = 1;
        this.hud?.clearSupportNotice?.();
    }
};
