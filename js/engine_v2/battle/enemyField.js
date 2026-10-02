/* ==========================================================================
   PROJECT: MAD OVERLORD // 전투 — 전장의 적과 거점 (v2)
   적 소환·이동(종류별 행동은 enemies_v2.js), 피해·처치·보상, 피격 반응과 상태 외형(기절·감속·저주·산성),
   거점(요새·최종 기지) 출현·파손·잔해(그림은 bases_v2.js), 보스전 EMP 포격.
   battle_v2.js의 BattleEngine에 메서드로 붙는다 (this = 전투 엔진).
   ========================================================================== */

import { gameState } from '../../engine/state.js';
import { monsterControllerV2 } from '../monster_v2.js';
import { gameTime } from '../gameTime.js';
import { sound } from '../audio/sound_v2.js';
import { KAIJU_VFX, BATTLE_VFX } from '../vfx/vfxDefs.js';
import { spawnEnemy, updateEnemy, pickType, killReward, ENEMY_TYPES } from '../enemies_v2.js';
import { icon } from '../../ui_v2/icons.js';
import { GROUND_SPEED, BASE_STATE, baseArt, baseSize, aimAt as aimOf, dressBase, setBaseState } from '../bases_v2.js';
import { HERO, HIT_REACT, ACID, POPUP, FOOT_B, BASE_X } from './tuning.js';

// 적 상태 외형 (우선순위: 기절 > 감속 > 저주) + 체력바 옆 상태 아이콘
const ENEMY_TINT = {
    stun: 'grayscale(0.7) brightness(1.15) drop-shadow(0 0 6px #ffe066)',
    slow: 'drop-shadow(0 0 6px #b050ff) saturate(0.55) brightness(0.9)',
    curse: 'brightness(0.72) saturate(0.7) drop-shadow(0 0 4px rgba(170, 80, 255, 0.9))'
};
const STATUS_ICON = { curse: 'curse', slow: 'slow', stun: 'stun', acid: 'acid' };

export const EnemyMethods = {
    // ---- 적 소환 ----
    // 스테이지의 적 비중(mix)대로 종류를 고르고, 확률로 엘리트 (enemies_v2.js)
    spawnMinion(typeId = null, opts = {}) {
        if (!this.domEnemies) return null;
        const building = this.enemies.find(e => e.isBuilding);
        const x = opts.x ?? (building ? building.x - 30 : (window.innerWidth > 1000 ? 980 : 700));
        const type = typeId || pickType(this.stage.enemy.mix);
        const elite = opts.elite ?? Math.random() < (this.stage.elite || 0);
        return spawnEnemy(this, type, { x, elite });
    },

    /** 소환 주기마다 적 하나 (최대 수까지). EMP 포격 뒤에는 잠시 소환 중단 */
    tickSpawning(dt) {
        if (this.spawnSilence > 0) {
            this.spawnSilence -= dt;   // EMP 뒤 소환 중단
            return;
        }
        this.spawnTimer += dt;
        if (this.spawnTimer >= this.spawnInterval && this.enemies.filter(e => !e.isBuilding).length < this.stage.enemy.max) {
            this.spawnTimer = 0;
            this.spawnMinion();
        }
    },

    /** 적 이동·공격 (기절한 적은 멈춤), 감속·기절 시간 줄이기. frontX: 주인공 앞면 x */
    tickEnemies(dt, frontX) {
        this.enemies.forEach(enemy => {
            if (enemy.slowT > 0) {
                enemy.slowT -= dt;
                if (enemy.slowT <= 0) this.updateEnemyFilter(enemy);
            }
            if (enemy.stunT > 0) {
                enemy.stunT -= dt;
                if (enemy.stunT <= 0) this.updateEnemyFilter(enemy);
                return;   // 기절: 이동/공격 없음
            }
            if (!enemy.isBuilding) updateEnemy(this, enemy, dt, frontX);   // 이동·공격·종류별 능력
        });
    },

    // ---- 피해와 처치 ----
    // 적 또는 거점 건물에 데미지 적용 및 소멸 처리
    // react: { knock(넉백 배율), stop(히트스톱) } — 몬스터/스킬의 직접 타격일 때만 (지속 피해는 생략)
    // react.dot: 지속 피해 — 피격 반응 없이 합산해 0.5초마다 숫자 표시
    dealDamageToEnemy(enemy, damage, isCrit, react = null) {
        if (enemy.armor && damage > 0) damage *= 1 - enemy.armor;   // 방패병·보스: 받는 피해 감소
        enemy.hp -= damage;
        if (react && !react.dot && enemy.hp > 0) this.hitReact(enemy, react);
        if (react && react.dot) {
            enemy.dotAcc = (enemy.dotAcc || 0) + damage;
        } else if (damage > 0) {
            const popupX = enemy.isBuilding ? aimOf(enemy).x - 24 : enemy.x;
            const popupY = enemy.isBuilding ? aimOf(enemy).b + 20 + Math.random() * 40 : 110 + Math.random() * 30;
            this.createDamagePopup(popupX, popupY, damage, isCrit);
        }

        if (enemy.hpBar) {
            const pct = Math.max(0, (enemy.hp / enemy.maxHp) * 100);
            enemy.hpBar.style.width = `${pct}%`;
        }

        if (enemy.isBuilding) {
            this.currentTargetHp = Math.max(0, enemy.hp);
            this.updateHud();
        }

        if (enemy.hp <= 0) {
            if (!this.enemies.includes(enemy)) return;   // 같은 프레임에 두 번 처리되지 않게
            // 거점 건물은 파괴 연출이 무너뜨린 뒤 치움
            if (enemy.dom && !enemy.isBuilding) enemy.dom.remove();
            this.enemies = this.enemies.filter(e => e.id !== enemy.id);
            if (enemy.isBuilding) this.onBaseDestroyed(enemy);
            else this.onEnemyKilled(enemy);
        }
    },

    /** 거점 파괴: 요새 = 별 1·보상·잔해 / 최종 기지 = 별 2·보상 → 남은 적 패주 → 승리 연출 → 결과 */
    onBaseDestroyed(enemy) {
        if (enemy.isFinal) {
            this.finalBaseDestroyed = true;
            this.starFlags[1] = true;
            gameState.addDarkMatter(this.stage.reward.final);
            this.updateHud();

            // 남은 적 병사는 흩어지며 사라짐
            this.enemies.forEach(e => {
                if (!e.dom) return;
                e.dom.classList.add('v2-rout');
                setTimeout(() => e.dom.remove(), 600);
            });
            this.enemies = [];
            this.cinematic = true;
            monsterControllerV2.setState('victory');

            // 연쇄 폭발 → 대폭발 → MISSION COMPLETE → 결과 화면
            const run = this.runId;
            this.director.baseDestroyed(enemy, true).then(() => {
                if (this.runId === run && this.isActive) this.finishBattle(true);
            });
        } else {
            this.midBaseDestroyed = true;
            this.starFlags[0] = true;
            this.ruinHoldT = BASE_STATE.ruinHold;
            gameState.addDarkMatter(this.stage.reward.mid);
            if (this.domTargetLabel) this.domTargetLabel.textContent = '적 수비대 거점 HP (진격 중)';
            this.director.baseDestroyed(enemy, false);
            this.updateHud();
        }
    },

    /** 적 처치: 처치 수·보상, 보스 격파 연출, 타락 히어로 머리면 확률로 세뇌 징집 */
    onEnemyKilled(enemy) {
        this.stats.kills += 1;
        sound.play('enemy_die');
        gameState.addDarkMatter(killReward(this, enemy));
        if (enemy.boss) {
            this.boss = null;
            this.director.stamp('BOSS DOWN', `${enemy.t.name} 격파`, 'is-gold', 1500);
            this.fx.play(BATTLE_VFX.baseFinale, enemy.x + 38, FOOT_B, { scale: 0.6 });
        }
        this.updateHud();

        if (this.equippedHeadId === 'head_hero' && Math.random() < HERO.recruitChance) {
            this.recruit(enemy.x);
        }
    },

    /** 지속 피해 숫자 모아서 표시 (POPUP.dotFlushSec마다) */
    flushDotPopups(dt) {
        this.dotTimer += dt;
        if (this.dotTimer >= POPUP.dotFlushSec) {
            this.dotTimer = 0;
            this.enemies.forEach(e => {
                if (e.dotAcc >= 1) this.createDamagePopup(e.x + 20, 105, e.dotAcc, false, 'dot');
                e.dotAcc = 0;
            });
        }
    },

    // ---- 피격 반응과 상태 외형 ----
    // 피격 반응: 섬광 + 넉백 (+ 강한 타격은 히트스톱)
    hitReact(e, react) {
        if (react.stop) gameTime.hitStop(HIT_REACT.stopSec);
        if (!e.dom) return;
        e.flashing = true;
        e.dom.style.filter = 'brightness(2.4) saturate(0.2)';
        setTimeout(() => { e.flashing = false; this.updateEnemyFilter(e); }, HIT_REACT.flashMs);
        if (!e.isBuilding && !e.knockResist && react.knock) {   // 방패병·보스는 밀리지 않음
            e.x += HIT_REACT.knockPx * react.knock;
            e.dom.style.left = `${e.x}px`;
        }
    },

    slowEnemy(e) {
        e.slowT = HERO.slowSec;
        this.updateEnemyFilter(e);
    },

    stunEnemy(e, sec) {
        e.stunT = Math.max(e.stunT || 0, sec);
        this.updateEnemyFilter(e);
    },

    // 적 외형 상태: 기절 > 감속 > 저주 순으로 색 (피격 섬광 중에는 섬광 우선) + 상태 아이콘
    updateEnemyFilter(e) {
        if (!e.dom) return;
        const states = [e.stunT > 0 && 'stun', e.slowT > 0 && 'slow', e.cursed && 'curse', e.acidT > 0 && 'acid'].filter(Boolean);
        this.updateStatusIcons(e, states);
        if (e.flashing) return;
        // 종류 색조(enemies_v2.js baseFilter) + 상태 색
        e.dom.style.filter = [e.baseFilter, states.length ? ENEMY_TINT[states[0]] || '' : ''].filter(Boolean).join(' ');
    },

    // 체력바 옆 상태 아이콘 (저주/감속/기절) — 바뀔 때만 다시 그림
    updateStatusIcons(e, states) {
        const sig = states.join();
        if (sig === (e.statusSig || '')) return;
        e.statusSig = sig;
        if (!e.statusEl) {
            e.statusEl = document.createElement('div');
            e.statusEl.className = 'v2-status';
            e.dom.appendChild(e.statusEl);
        }
        e.statusEl.innerHTML = states.map(k => `<span class="v2-status__icon is-${k}">${icon(STATUS_ICON[k], 10)}</span>`).join('');
    },

    // ---- 산성 부식 (산성 발톱 팔) ----
    applyAcid(e, sec = ACID.sec) {
        if (!e || e.hp <= 0) return;
        const fresh = !(e.acidT > 0);
        e.acidT = Math.max(e.acidT || 0, sec);
        if (fresh) this.updateEnemyFilter(e);
    },

    tickAcid(dt) {
        const dps = this.playerDps * ACID.dpsMul;
        [...this.enemies].forEach(e => {
            if (!(e.acidT > 0)) return;
            e.acidT -= dt;
            e.acidFx = (e.acidFx || 0) + dt;
            if (e.acidFx >= 0.5) {
                e.acidFx = 0;
                this.fx.play(KAIJU_VFX.acidTick, aimOf(e).x, aimOf(e).b + 10);
            }
            this.dealDamageToEnemy(e, dps * (e.isBuilding ? ACID.baseMul : 1) * dt, false, { dot: true });
            if (e.acidT <= 0 && this.enemies.includes(e)) this.updateEnemyFilter(e);
        });
    },

    // ---- 거점 ----
    // 중간 거점 요새 건물 출현
    spawnMidBase() {
        if (this.midBaseSpawned || !this.domEnemies) return;
        this.midBaseSpawned = true;
        this.spawnBase('mid');
        this.director.warning('mid');
        this.updateHud();
    },

    // 최종 핵심 기지 건물 출현
    spawnFinalBase() {
        if (this.finalBaseSpawned || !this.domEnemies) return;
        this.finalBaseSpawned = true;
        const base = this.spawnBase('final');

        const boss = this.stage.boss;
        this.director.warning('final', boss ? `${ENEMY_TYPES[boss.unit].name} 출현 — 최종 기지를 지키고 있다` : null);
        sound.playBgm('boss', 0.8);
        // 보스전: 기지 앞에 보스 영웅
        if (boss) this.boss = this.spawnMinion(boss.unit, { x: base.x - 70, elite: false });
        this.updateHud();
    },

    /** 거점 건물 (kind: 'mid' 요새 | 'final' 최종 기지). 그림은 bases_v2.js — 체력에 따라 온전 → 파손 → 붕괴 */
    spawnBase(kind) {
        const final = kind === 'final';
        const x = window.innerWidth > 1000 ? BASE_X[kind] : (final ? 620 : 650);
        const maxHp = this.stage.base[kind];
        this.currentTargetHp = maxHp;
        this.maxTargetHp = maxHp;
        if (this.domTargetLabel) this.domTargetLabel.textContent = final ? '[최종 핵심 기지] HP' : '[중간 거점 요새] HP';

        const el = document.createElement('div');
        el.className = final ? 'building-entity final-base' : 'building-entity';
        el.setAttribute('data-label', final ? 'FINAL HEADQUARTERS' : 'INTERMEDIATE FORT');
        el.style.left = `${x}px`;
        dressBase(el, kind);
        el.classList.add('v2-base-in');

        const hpBar = document.createElement('div');
        hpBar.className = 'enemy-hp';
        hpBar.style.width = '100%';
        el.appendChild(hpBar);
        this.domEnemies.appendChild(el);

        const base = {
            id: final ? 'building_final_base' : 'building_mid_base',
            kind,
            size: baseSize(kind),
            artState: 0,
            x,
            hp: maxHp,
            maxHp,
            dps: final ? 100 : 50,
            speed: 0,
            isBuilding: true,
            isFinal: final,
            dom: el,
            hpBar
        };
        this.enemies.push(base);
        return base;
    },

    /** 체력이 절반 아래로 내려가면 파손 그림 (지속 피해로 깎여도 잡히게 매 프레임 확인) */
    updateBaseArt() {
        this.enemies.forEach(e => {
            if (!e.isBuilding || e.artState !== 0 || e.hp > e.maxHp * BASE_STATE.damaged || !baseArt(e.kind)) return;
            e.artState = 1;
            setBaseState(e.dom, e.kind, 1);
            const a = aimOf(e);
            this.fx.play(BATTLE_VFX.baseBlast, a.x, a.b + 20, { scale: 1.1 });
            this.director.shake(5, 300);
            sound.play('base_blast');
        });
    },

    /** 파괴 연출의 대폭발 순간: 잔해 그림으로 바꿈. 요새 잔해는 남겨 두었다가 바닥과 함께 흘려보냄 */
    collapseBase(base) {
        if (!base.dom || !baseArt(base.kind)) return false;
        base.dom.classList.remove('v2-wreck', 'v2-wreck--final', 'v2-base-in');
        setBaseState(base.dom, base.kind, 2);
        if (!base.isFinal) this.ruins.push(base);
        return true;
    },

    /** 걷는 동안(배경이 흐를 때) 잔해를 바닥과 같은 속도로 왼쪽으로 */
    scrollRuins(dt) {
        if (!this.ruins.length) return;
        this.ruins = this.ruins.filter(r => {
            r.x -= GROUND_SPEED * dt;
            if (r.x + r.size.w < -40) {
                r.dom.remove();
                return false;
            }
            r.dom.style.left = `${r.x}px`;
            return true;
        });
    },

    // ---- 보스전: 최종 기지 EMP 광역 포격 (기획서 2-⑥) ----
    // 경보 → 발사: 주인공 기절, 대신 전장의 적 보병 전멸 + 잠시 소환 중단
    tickArtillery(dt) {
        const art = this.stage.boss && this.stage.boss.artillery;
        const base = this.enemies.find(e => e.isBuilding && e.isFinal);
        if (!art || !base) return;
        this.artTimer += dt;
        if (!this.artWarned && this.artTimer >= art.every - art.warn) {
            this.artWarned = true;
            this.director.alarm('EMP 경보', `${art.warn.toFixed(0)}초 뒤 광역 포격 — 적 보병도 함께 쓸려 나간다`, art.warn);
        }
        if (this.artTimer >= art.every) {
            this.artTimer = 0;
            this.artWarned = false;
            const muzzle = baseArt('final') && baseArt('final').muzzle;   // EMP 포구 (그림이 있으면)
            this.fx.play(BATTLE_VFX.emp, muzzle ? base.x + muzzle[0] : base.x + 60, muzzle ? muzzle[1] : 230);
            this.director.flash('#9fe0ff', 380, 0.75);
            this.director.shake(12, 700);
            this.applyPlayerStun(art.stun, 'EMP 마비!');
            this.enemies.filter(e => !e.isBuilding && !e.boss).forEach(e => {
                this.fx.play(BATTLE_VFX.baseBlast, e.x + 38, 90, { scale: 0.5 });
                if (e.dom) {
                    e.dom.classList.add('v2-rout');
                    setTimeout(() => e.dom.remove(), 600);
                }
            });
            this.enemies = this.enemies.filter(e => e.isBuilding || e.boss);
            this.spawnSilence = art.silence;
        }
    }
};
