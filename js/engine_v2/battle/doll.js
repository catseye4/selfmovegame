/* ==========================================================================
   PROJECT: MAD OVERLORD // 전투 — 뒤틀린 인형사 (v2, 새 캐릭터 4 — D-046·D-049)
   인형 가족으로 막고 적을 꼭두각시로 부려 교란하는 근접 캐릭터.
     기본 공격 가위 참격(팔 attackType 'scissors'): 두 번 자름(반 타씩), 방어(방패병·보스 피해 감소)를 일부 무시, 뒤 적 휩쓸기
     팔 스킬 가위 참격 X자: 앞의 적 모두에게 큰 피해 + 방어 일부 무시
     몸통 스킬 인형 가족: 토끼 인형 3기 — 달려가 적을 붙잡아(멈춤) 막고(붙잡힌 적이 발버둥쳐 인형이 닳음), 쓰러지면 솜이 터져 둘레 피해
     머리 필살기 인형 실: 앞의 적 몇 명을 몇 초간 꼭두각시로 — 멈춘 채 가까운 다른 적을 때림 (보스는 잠깐 멈춤만)
     다리 패시브 실 걸음: 토끼 인형이 많을수록 빨라짐 (player.js moveMul이 dollStride를 곱함)
   수치는 battle/tuning.js DOLL, 이펙트는 vfx/dollVfx.js, 토끼 인형 그림은 enemies_v2.js ALLY_ART(구운 스프라이트).
   battle_v2.js의 BattleEngine에 메서드로 붙는다 (this = 전투 엔진).
   ========================================================================== */

import { monsterControllerV2 } from '../monster_v2.js';
import { DOLL_VFX } from '../vfx/dollVfx.js';
import { aimAt as aimOf } from '../bases_v2.js';
import { DOLL, MELEE_CLEAVE, FOOT_B } from './tuning.js';

const solid = e => e.isBuilding || e.isBarricade;
const hitX = e => (solid(e) ? e.x + 12 : aimOf(e).x);

export const DollMethods = {
    // ---- 기본 공격: 가위 참격 ----
    snipScissors(target, dmg, isCrit, hitScale) {
        const a = aimOf(target);
        this.fx.play(DOLL_VFX.snipHit, a.x, a.b + 5);
        const near = this.enemies.filter(o => o !== target && !o.isBuilding && Math.abs(o.x - target.x) <= MELEE_CLEAVE.radius);
        this.dealDamageToEnemy(target, dmg, isCrit, { knock: 0.6, stop: hitScale >= 0.5, pierce: DOLL.pierce });
        near.forEach(o => this.dealDamageToEnemy(o, dmg * MELEE_CLEAVE.mul, false, { knock: 0.4, pierce: DOLL.pierce }));
    },

    // ---- 팔 스킬: 가위 참격 X자 ----
    scissorX(range) {
        const list = this.enemiesInRange(this.playerRange + range);
        if (!list.length) return;
        const cx = hitX(list[0]) + 30;
        this.fx.play(DOLL_VFX.xcut, cx, 100);
        list.filter(e => hitX(e) <= hitX(list[0]) + DOLL.xWidth).forEach((e, i) => this.schedule(i * 0.03, () => {
            if (!this.enemies.includes(e)) return;
            this.dealDamageToEnemy(e, this.unit() * (solid(e) ? DOLL.xBaseDmg : DOLL.xDmg), false,
                { knock: 1.2, stop: i === 0, pierce: DOLL.xPierce });
        }));
    },

    // ---- 몸통 스킬: 인형 가족 ----
    dollFamily() {
        const room = DOLL.rabbitMax - this.allies.filter(a => a.kind === 'rabbit').length;
        const n = Math.min(DOLL.rabbitCount, room);
        for (let i = 0; i < n; i++) {
            this.schedule(i * 0.18, () => {
                if (!this.isActive || this.finalBaseDestroyed) return;
                const x = this.monsterX + 70 + i * 45;
                this.fx.play(DOLL_VFX.dollDrop, x + 30, FOOT_B, { to: [x + 30, 330] });
                this.spawnAllyMinion(x, 'rabbit', { hp: DOLL.rabbitHp, dps: DOLL.rabbitDps, speed: DOLL.rabbitSpeed });
            });
        }
    },

    /** 아군이 쓰러질 때 (allies.js): 토끼 인형이면 솜이 터져 둘레 적에게 피해 */
    onAllyDown(ally) {
        if (ally.kind !== 'rabbit' || !this.isActive) return;
        const cx = ally.x + 30;
        this.fx.play(DOLL_VFX.dollBurst, cx, FOOT_B);
        [...this.enemies].forEach(e => {
            if (Math.abs(hitX(e) - cx) <= DOLL.burstRadius) {
                this.dealDamageToEnemy(e, this.unit() * DOLL.burstDmg * (solid(e) ? DOLL.burstBaseMul : 1), false, { knock: 1 });
            }
        });
    },

    // ---- 머리 필살기: 인형 실 ----
    puppetStrings(range) {
        this.fx.play(DOLL_VFX.stringsCall, this.monsterX + 35, FOOT_B);
        const list = this.enemiesInRange(this.playerRange + range).filter(e => !solid(e)).slice(0, DOLL.puppetMax);
        list.forEach((e, i) => this.schedule(0.08 + i * 0.07, () => {
            if (!this.isActive || !this.enemies.includes(e)) return;
            const a = aimOf(e);
            this.fx.play(DOLL_VFX.puppetString, a.x, 470, { to: [a.x, a.b] });
            if (e.boss) {
                this.stunEnemy(e, DOLL.puppetBossStun);
                return;
            }
            e.puppetT = DOLL.puppetSec;
            e.puppetFx = 0;
            this.stunEnemy(e, 0.2);
            this.updateEnemyFilter(e);
        }));
    },

    // ---- 다리 패시브: 실 걸음 ----
    /** 진격 속도 배율: 토끼 인형 수만큼 빨라짐 (실 걸음 다리가 아니면 1) */
    dollStride() {
        const step = DOLL.stride[this.equippedLegId];
        if (!step) return 1;
        return 1 + step * Math.min(DOLL.strideMax, this.allies.filter(a => a.kind === 'rabbit').length);
    },

    /** 매 프레임: 토끼 인형이 붙잡은 적 멈추기, 꼭두각시 */
    tickDoll(dt) {
        [...this.allies].forEach(ally => {
            if (ally.kind !== 'rabbit' || !ally.attacking) return;
            const e = this.enemies.find(o => !solid(o) && !o.boss && o.x - ally.x >= -35 && o.x - ally.x <= 65);
            if (!e) return;
            // 붙잡힌 적은 멈춰서도 발버둥쳐 인형을 해침 (멈춘 적은 원래 공격을 안 해서, 이게 없으면 인형이 영원히 붙잡아 둠)
            this.damageAlly(ally, e.dps * DOLL.struggle * dt);
            if (e.stunT > 0.12 || !this.allies.includes(ally)) return;
            this.stunEnemy(e, DOLL.holdSec);   // 끌어안아 붙잡음 (멈춤)
            this.fx.play(DOLL_VFX.grab, aimOf(e).x, FOOT_B);
        });
        [...this.enemies].forEach(e => {
            if (!(e.puppetT > 0)) return;
            e.puppetT -= dt;
            if (e.stunT < 0.12) e.stunT = 0.2;   // 꼭두각시는 제 뜻대로 못 움직임 (주인공도 못 때림)
            const t = this.enemies.filter(o => o !== e && !(o.puppetT > 0) && Math.abs(hitX(o) - hitX(e)) <= DOLL.puppetReach)
                .sort((p, q) => Math.abs(hitX(p) - hitX(e)) - Math.abs(hitX(q) - hitX(e)))[0];
            e.puppetFx -= dt;
            if (e.puppetFx <= 0) {
                e.puppetFx = 0.6;
                const a = aimOf(e);
                this.fx.play(DOLL_VFX.puppetString, a.x, 470, { to: [a.x, a.b] });
                if (t) this.fx.play(DOLL_VFX.puppetHit, hitX(t), aimOf(t).b);
            }
            if (t) this.dealDamageToEnemy(t, (e.dps * DOLL.puppetDpsMul + this.unit() * DOLL.puppetUnit) * dt, false, { dot: true });
            if (e.puppetT <= 0 && this.enemies.includes(e)) this.updateEnemyFilter(e);
        });
    }
};
