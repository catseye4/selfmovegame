/* ==========================================================================
   PROJECT: MAD OVERLORD // 전투 — 주인공 (v2)
   내구도·실드·과부하(D-028), 상태 이상(감속·기절·속박), 다리 패시브(궤도 돌진·반중력 부양·잠수화),
   팩션 패시브(괴수 재생, 히어로 흑마법 장판, 괴수 포자, 합성괴인 지진·2페이즈).
   battle_v2.js의 BattleEngine에 메서드로 붙는다 (this = 전투 엔진).
   ========================================================================== */

import { monsterControllerV2 } from '../monster_v2.js';
import { sound } from '../audio/sound_v2.js';
import { HERO_VFX, MECH_VFX, KAIJU_VFX, CHIMERA_VFX } from '../vfx/vfxDefs.js';
import { aimAt as aimOf } from '../bases_v2.js';
import { PHASE2, HERO, PASSIVE, LEG, PLAYER_STATUS, OVERLOAD, FOOT_B, FROST } from './tuning.js';

export const PlayerMethods = {
    // 몬스터가 받는 피해: 실드가 있으면 먼저 흡수
    damagePlayer(amount, dt) {
        if (this.overloadT > 0) return;   // 과부하(긴급 수리) 중에는 피해 없음
        if (this.equippedLegId === 'leg_hero_hover') amount *= 1 - LEG.hoverReduce;   // 다리 패시브 '반중력 부양'
        if (this.blizzard) amount *= 1 - FROST.blizzardGuard;                         // 서리의 무희 '눈보라 춤' 동안
        if (this.shieldHp > 0) {
            const absorbed = Math.min(this.shieldHp, amount);
            this.shieldHp -= absorbed;
            amount -= absorbed;
            this.shieldHitCd -= dt;
            if (this.shieldHitCd <= 0) {
                monsterControllerV2.shieldHit();
                sound.play('shield_hit');
                this.shieldHitCd = 0.3;
            }
            if (this.shieldHp <= 0) {
                this.shieldTimer = Infinity;
                monsterControllerV2.breakShield();
                sound.play('shield_break');
                this.createDamagePopup(this.monsterX + 40, 200, '⬢ 실드 파괴!', false);
            }
        }
        this.playerHp -= amount;
        if (amount > 0) sound.play('player_hit');   // 0.4초에 한 번까지 (sound_v2 SFX 표)
        monsterControllerV2.updateHpBar(this.playerHp, this.maxPlayerHp);
    },

    // [다리 패시브 '궤도 돌진'] 처음 맞닿은 적에게 돌진 피해 + 밀쳐냄 + 잠깐 기절 (적마다 LEG.ramCd초에 한 번)
    legContact(enemy) {
        if (this.equippedLegId !== 'leg_mech_wheel' || enemy.isBuilding) return false;
        if (enemy.rammedAt != null && this.stats.time - enemy.rammedAt < LEG.ramCd) return false;
        enemy.rammedAt = this.stats.time;
        const a = aimOf(enemy);
        this.fx.play(MECH_VFX.fistHit, a.x - 10, a.b - 20);
        this.dealDamageToEnemy(enemy, this.unit() * LEG.ramDmg, false, { knock: LEG.ramKnock, stop: true });
        if (this.enemies.includes(enemy)) this.stunEnemy(enemy, LEG.ramStun);
        return true;
    },

    // [합성괴인 머리 패시브] 체력 50% 이하 자동 2페이즈
    checkPhase2() {
        if (!this.phase2 && this.equippedHeadId === 'head_chimera' && this.playerHp > 0
            && this.playerHp <= this.maxPlayerHp * PHASE2.hpRatio) {
            this.enterPhase2();
        }
    },

    // [합성괴인 머리] 체력 50% 이하 시 자동 거대화 및 실드 전개 (전투당 1회)
    enterPhase2() {
        this.phase2 = true;
        this.shieldHp = this.maxPlayerHp * PHASE2.shieldRatio;
        this.shieldTimer = Infinity;
        this.playerDps *= PHASE2.dpsMul;
        monsterControllerV2.enterPhase2();
        this.fx.play(CHIMERA_VFX.phase2Burst, this.monsterX + 35, FOOT_B);   // 변신 클립의 거대화 순간에 맞춘 충격파
        this.showAnnouncement('2PHASE // 자동 거대화 및 실드 전개!', 2000);
        this.createDamagePopup(this.monsterX + 40, 210, '⬢ 실드 전개 (최대 체력 30%)', false);
    },

    // ---- 과부하: 내구도 0이면 멈춰서 긴급 수리 (주인공은 죽지 않음, D-028) ----
    checkOverload(dt) {
        if (this.overloadT > 0) {
            this.overloadT -= dt;
            if (this.overloadT <= 0) {
                this.overloadT = 0;
                this.playerHp = this.maxPlayerHp * OVERLOAD.restore;
                monsterControllerV2.updateHpBar(this.playerHp, this.maxPlayerHp);
                this.createDamagePopup(this.monsterX + 30, 200, '🔧 긴급 수리 완료', false);
                sound.play('shield_on', { rate: 1.2 });
            }
            return;
        }
        if (this.playerHp > 0) return;
        this.playerHp = 0;
        this.overloadT = OVERLOAD.sec;
        this.stats.overloads = (this.stats.overloads || 0) + 1;
        this.applyPlayerStun(OVERLOAD.sec, 'OVERLOAD');
        this.director.overload(OVERLOAD.sec);
    },

    // ---- 주인공 상태 이상 (적 공격) ----
    applyPlayerSlow(sec, quiet = false) {
        if (this.equippedLegId === 'leg_hero_hover') {   // 다리 패시브: 감속 무시
            if (!quiet) this.createDamagePopup(this.monsterX + 40, 190, '감속 무효', false);
            return;
        }
        sec *= 1 - this.bootsCut('slow');                // 다리 패시브 '잠수화' (diver.js)
        if (this.pSlowT <= 0) this.createDamagePopup(this.monsterX + 40, 190, '❄ 감속!', false);
        this.pSlowT = Math.max(this.pSlowT, sec);
        this.updatePlayerStatus();
    },

    applyPlayerStun(sec, label = '기절!') {
        if (this.pStunT <= 0) this.createDamagePopup(this.monsterX + 40, 200, `⚡ ${label}`, false);
        this.pStunT = Math.max(this.pStunT, sec);
        this.updatePlayerStatus();
    },

    /** 속박 (그물): 진격 불가, 공격·스킬은 가능 (구역 2 그물총 사수) */
    applyPlayerRoot(sec) {
        sec *= 1 - this.bootsCut('slow');                // 잠수화
        if (this.pRootT <= 0) this.createDamagePopup(this.monsterX + 40, 200, '🕸 그물에 묶임!', false);
        this.pRootT = Math.max(this.pRootT, sec);
        this.updatePlayerStatus();
    },

    /** 뒤로 밀려남 (고철왕 자석): 거점을 향해 다시 걸어야 해서 시간 손실 */
    knockPlayerBack(px, label) {
        const cut = this.bootsCut('push');               // 잠수화: 덜 밀려남
        if (cut) {
            px *= 1 - cut;
            label = '⚓ 잠수화 — 버팀';
        }
        this.monsterX = Math.max(80, this.monsterX - px);
        monsterControllerV2.setMonsterPosition(this.monsterX);
        if (label) this.createDamagePopup(this.monsterX + 30, 210, label, false);
        this.director.shake(8, 350);
    },

    playerStunned() {
        return this.pStunT > 0;
    },

    /** 진격 속도 배율 (기절·속박 0, 감속 0.5) */
    moveMul() {
        const base = this.pStunT > 0 || this.pRootT > 0 ? 0 : this.pSlowT > 0 ? PLAYER_STATUS.slowMove : 1;
        return base * this.dollStride();   // 뒤틀린 인형사 다리 '실 걸음' (doll.js)
    },

    updatePlayerStatus() {
        const state = this.pStunT > 0 ? 'stun' : this.pRootT > 0 ? 'root' : this.pSlowT > 0 ? 'slow' : null;
        if (state === this.pStatusShown) return;
        this.pStatusShown = state;
        monsterControllerV2.setStatusVisual(state, state === 'slow' ? PLAYER_STATUS.slowAnim : state === 'stun' ? 0 : 1);
    },

    tickPlayerStatus(dt) {
        if (this.pSlowT > 0) this.pSlowT = Math.max(0, this.pSlowT - dt);
        if (this.pStunT > 0) this.pStunT = Math.max(0, this.pStunT - dt);
        if (this.pRootT > 0) this.pRootT = Math.max(0, this.pRootT - dt);
        this.updatePlayerStatus();
    },

    /**
     * 팩션 패시브 (매 프레임): 괴수 머리 재생, 히어로 몸통 흑마법 장판, 괴수 다리 포자, 합성괴인 다리 지진
     * frontX: 주인공 앞면 x (이번 프레임 기준)
     */
    tickFactionPassives(dt, frontX) {
        if (this.equippedHeadId === 'head_mutant' && this.playerHp < this.maxPlayerHp) {
            const regenAmount = this.maxPlayerHp * PASSIVE.regen * dt;
            this.playerHp = Math.min(this.maxPlayerHp, this.playerHp + regenAmount);
            monsterControllerV2.updateHpBar(this.playerHp, this.maxPlayerHp);

            this.regenPopupTimer = (this.regenPopupTimer || 0) + dt;
            if (this.regenPopupTimer >= 1.0) {
                this.regenPopupTimer = 0;
                this.createDamagePopup(this.monsterX + 40, 180, `+${Math.round(this.maxPlayerHp * PASSIVE.regen)} REGEN`, false);
                this.fx.play(KAIJU_VFX.regen, this.monsterX + 35, FOOT_B, { follow: () => [this.monsterX + 35, FOOT_B] });
            }
        }

        if (this.equippedBodyId === 'body_hero') {
            this.curseTickTimer = (this.curseTickTimer || 0) + dt;
            const tickCursePopup = this.curseTickTimer >= HERO.curseTick;
            if (tickCursePopup) {
                this.curseTickTimer = 0;
                this.fx.pulseAura('curse');
            }

            [...this.enemies].forEach(enemy => {
                const dist = enemy.x - frontX;
                const inZone = dist >= HERO.curseZone[0] && dist <= HERO.curseZone[1];
                if (inZone !== !!enemy.cursed) {
                    enemy.cursed = inZone;          // 저주 상태 (장판 촉수 + 어두운 색 + ☠ 아이콘)
                    this.updateEnemyFilter(enemy);
                }
                if (inZone) {
                    enemy.hp -= HERO.curseDps * dt;
                    if (enemy.hpBar) {
                        enemy.hpBar.style.width = `${Math.max(0, (enemy.hp / enemy.maxHp) * 100)}%`;
                    }
                    if (tickCursePopup) {
                        // 흑마법 틱: 발밑 고리가 조여들고 머리 위 ▼ 표식이 가라앉음
                        this.fx.play(HERO_VFX.curseTick, aimOf(enemy).x, FOOT_B);
                        this.createDamagePopup(enemy.x, 140, `☠ -${Math.round(HERO.curseDps * HERO.curseTick)}`, false);
                    }
                    if (enemy.hp <= 0) {
                        this.dealDamageToEnemy(enemy, 0, false);
                    }
                }
            });
        }

        if (this.equippedLegId === 'leg_mutant') {
            this.legSkillTimer = (this.legSkillTimer || 0) + dt;
            const tickSporePopup = this.legSkillTimer >= 0.75;
            if (tickSporePopup) this.legSkillTimer = 0;

            [...this.enemies].forEach(enemy => {
                const dist = enemy.x - frontX;
                if (dist >= 0 && dist <= 220) {
                    enemy.speed = Math.min(enemy.speed, 35);
                    enemy.hp -= PASSIVE.sporeDps * dt;
                    if (enemy.hpBar) {
                        enemy.hpBar.style.width = `${Math.max(0, (enemy.hp / enemy.maxHp) * 100)}%`;
                    }
                    if (tickSporePopup) {
                        this.fx.play(KAIJU_VFX.sporeTick, aimOf(enemy).x, FOOT_B);
                        this.createDamagePopup(enemy.x, 130, `☣ -${Math.round(PASSIVE.sporeDps * 0.75)}`, false);
                    }
                    if (enemy.hp <= 0) {
                        this.dealDamageToEnemy(enemy, 0, false);
                    }
                }
            });
        }

        if (this.equippedLegId === 'leg_chimera') {
            this.legSkillTimer = (this.legSkillTimer || 0) + dt;
            const tickQuakePopup = this.legSkillTimer >= 0.75;
            if (tickQuakePopup) this.legSkillTimer = 0;

            [...this.enemies].forEach(enemy => {
                const dist = enemy.x - frontX;
                if (dist >= -20 && dist <= 200) {
                    enemy.hp -= PASSIVE.quakeDps * dt;
                    if (enemy.hpBar) {
                        enemy.hpBar.style.width = `${Math.max(0, (enemy.hp / enemy.maxHp) * 100)}%`;
                    }
                    if (tickQuakePopup) {
                        this.fx.play(CHIMERA_VFX.quakeTick, aimOf(enemy).x, FOOT_B);
                        this.createDamagePopup(enemy.x, 130, `💥 -${Math.round(PASSIVE.quakeDps * 0.75)}`, false);
                    }
                    if (enemy.hp <= 0) {
                        this.dealDamageToEnemy(enemy, 0, false);
                    }
                }
            });
        }
    }
};
