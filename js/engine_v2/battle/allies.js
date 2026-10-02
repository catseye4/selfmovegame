/* ==========================================================================
   PROJECT: MAD OVERLORD // 전투 — 아군 (v2)
   소환·징집되는 아군 미니언: 세뇌 보병(타락 히어로), 새끼 괴수(거대괴수 산란), 졸개(합성괴인 몸통).
   아군은 자기 체력이 있고, 가장 가까운 적과 싸우며 0이 되면 사라진다 (기획서 4-②).
   battle_v2.js의 BattleEngine에 메서드로 붙는다 (this = 전투 엔진).
   ========================================================================== */

import { monsterControllerV2 } from '../monster_v2.js';
import { HERO_ORB } from '../vfx/heroVfx.js';
import { HERO_VFX, CHIMERA_VFX } from '../vfx/vfxDefs.js';
import { BABY, EGG, FOOT_B } from './tuning.js';

export const AllyMethods = {
    // [세뇌 스마트 구속구]: 적 보병 소멸 시 아군 미니언 징집 소환
    // kind 'baby_kaiju': 거대괴수 산란으로 부화한 새끼 괴수 (리그에서 구운 스프라이트)
    //      'chimera': 합성괴인 몸통의 졸개 소환 (소환진 이펙트)
    spawnAllyMinion(startX, kind = 'mind') {
        if (!this.domEnemies) return;
        const baby = kind === 'baby_kaiju';
        const maxHp = baby ? BABY.hp : 350;
        const dps = baby ? BABY.dps : 17.5; // 세뇌 미니언은 적 보병 데미지의 절반
        const allyId = `ally_${Date.now()}_${Math.random()}`;

        const el = document.createElement('div');
        // 외형: 새끼 괴수 / 합성괴인 졸개(미니 괴인 스프라이트) / 세뇌 보병(적 보병 + 검보라 세뇌 표식)
        el.className = `ally-minion ${baby ? 'baby-kaiju-v2' : kind === 'chimera' ? 'chimera-minion-v2' : 'v2-mind'}`;
        el.style.left = `${startX}px`;

        const hpBar = document.createElement('div');
        hpBar.className = 'ally-hp';
        hpBar.style.width = '100%';
        if (baby) {   // 새끼 괴수는 산성 초록 체력바
            hpBar.style.background = '#aaff28';
            hpBar.style.boxShadow = '0 0 6px #aaff28';
        } else if (kind === 'chimera') {
            hpBar.style.background = '#ff9628';
            hpBar.style.boxShadow = '0 0 6px #ff9628';
        }
        el.appendChild(hpBar);

        this.domEnemies.appendChild(el);

        this.allies.push({
            id: allyId,
            kind,
            x: startX,
            hp: maxHp,
            maxHp: maxHp,
            dps: dps,
            speed: this.playerSpeed * (baby ? BABY.speedMul : 0.55),
            dom: el,
            hpBar: hpBar
        });

        if (kind === 'chimera') this.fx.play(CHIMERA_VFX.summon, startX + 38, FOOT_B);
        const label = { baby_kaiju: '🥚 새끼 괴수 부화!', chimera: '👹 졸개 소환!' }[kind] || '★ 세뇌 징집! (MIND CONTROL)';
        this.createDamagePopup(startX, 180, label, false);
    },

    // 아군 미니언이 피해를 받음 (0 이하면 사라짐)
    damageAlly(ally, amount) {
        ally.hp -= amount;
        if (ally.hpBar) ally.hpBar.style.width = `${Math.max(0, (ally.hp / ally.maxHp) * 100)}%`;
        if (ally.hp <= 0) {
            if (ally.dom) ally.dom.remove();
            this.allies = this.allies.filter(a => a.id !== ally.id);
        }
    },

    /** 아군 이동·공격: 가장 가까운 적(뒤로 35px까지)과 붙으면 싸우고, 아니면 앞으로 (주인공보다 너무 멀리 가지 않음) */
    tickAllies(dt) {
        this.allies.forEach(ally => {
            let closestEnemyToAlly = null;
            let minAllyDist = Infinity;

            this.enemies.forEach(enemy => {
                const dist = enemy.x - ally.x;
                if (dist >= -35 && dist < minAllyDist) {
                    minAllyDist = dist;
                    closestEnemyToAlly = enemy;
                }
            });

            const hitRange = (closestEnemyToAlly && closestEnemyToAlly.isBuilding) ? 110 : 65;
            if (closestEnemyToAlly && minAllyDist <= hitRange) {
                this.dealDamageToEnemy(closestEnemyToAlly, ally.dps * dt, false, { dot: true });

                if (closestEnemyToAlly.isBuilding) {
                    ally.hp -= 25 * dt;
                    if (ally.hpBar) {
                        ally.hpBar.style.width = `${Math.max(0, (ally.hp / ally.maxHp) * 100)}%`;
                    }
                    if (ally.hp <= 0) {
                        if (ally.dom) ally.dom.remove();
                        this.allies = this.allies.filter(a => a.id !== ally.id);
                    }
                }
            } else if (closestEnemyToAlly || ally.x < this.monsterX + 180) {
                ally.x += ally.speed * dt;
                if (ally.dom) ally.dom.style.left = `${ally.x}px`;
            }
        });
    },

    // [타락 히어로 머리] 세뇌 파동: 시전 동작 → 보라 구체가 쓰러진 적 자리로 → 소용돌이 속에서 아군으로
    recruit(x) {
        monsterControllerV2.playCast(() => this.mindOrb(x));
    },

    // 손끝에서 세뇌 구체 → x 자리에서 소용돌이 → 아군 미니언
    mindOrb(x) {
        if (!this.isActive) return;
        const tx = x + 38;
        const from = monsterControllerV2.getSocketPoint('hand', 'armF') || { x: this.monsterX + 90, bottom: 130 };
        this.fx.play(HERO_VFX.castRelease, from.x, from.bottom);
        this.fx.launchOrb(from, () => ({ x: tx, b: 90 }), HERO_ORB.color, HERO_ORB.dur, () => {
            this.fx.play(HERO_VFX.mindConvert, tx, 58);
            this.schedule(0.35, () => {
                if (this.isActive && !this.finalBaseDestroyed) this.spawnAllyMinion(x);
            });
        });
    },

    // [대세뇌] 살아 있는 적 보병을 즉시 아군으로 (보상 없이 전장에서 제거 후 세뇌 미니언 소환)
    convertEnemy(e) {
        if (!this.enemies.includes(e) || e.isBuilding) return;
        this.enemies = this.enemies.filter(o => o !== e);
        if (e.dom) e.dom.remove();
        this.mindOrb(e.x);
    },

    // [거대괴수 몸통 스킬 '산란'] 발밑에 알 → 부화하면 새끼 괴수(아군). cap: 새끼 최대 수
    layEgg(x, cap) {
        const babies = this.allies.filter(a => a.kind === 'baby_kaiju').length;
        if (babies + this.pendingEggs >= cap) return;
        this.pendingEggs += 1;
        this.fx.addEgg(x, EGG.hatchSec, () => {
            this.pendingEggs -= 1;
            if (this.isActive && !this.finalBaseDestroyed) this.spawnAllyMinion(x - 30, 'baby_kaiju');
        });
    }
};
