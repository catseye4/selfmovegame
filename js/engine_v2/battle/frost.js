/* ==========================================================================
   PROJECT: MAD OVERLORD // 전투 — 서리의 무희 (v2, 새 캐릭터 3 — D-046)
   얼리고 깨뜨리는 원거리 군중 제어.
     냉기: 무희의 공격에 맞을 때마다 쌓임 → freezeAt이 되면 빙결(기절 + 얼음 색), 냉기는 비움. 한동안 안 맞으면 사라짐
     기본 공격 서리 부채(팔 attackType 'frost'): 작은 서리 초승달 — 앞의 적 둘까지, 냉기 1
     팔 스킬 초승달 참격: 큰 초승달이 지나간 적 모두 피해 + 냉기 2
     몸통 스킬 눈보라 춤: 몇 초간 둘레 눈보라 — 안의 적 계속 피해 + 냉기, 그동안 무희가 받는 피해 감소
     머리 필살기 영원한 안식: 앞의 적을 얼음 결정에 가뒀다가 한꺼번에 깨뜨림 (거점은 깨지는 피해만)
     다리 패시브 빙판 걸음: 얼어 있는 적에게 주는 모든 피해 증가 (enemyField.dealDamageToEnemy가 shatterBonus를 곱함)
   보스는 얼지 않음(냉기만 쌓임). 수치는 battle/tuning.js FROST, 이펙트는 vfx/frostVfx.js.
   battle_v2.js의 BattleEngine에 메서드로 붙는다 (this = 전투 엔진).
   ========================================================================== */

import { monsterControllerV2 } from '../monster_v2.js';
import { FROST_VFX, ICE, MIST } from '../vfx/frostVfx.js';
import { aimAt as aimOf } from '../bases_v2.js';
import { FROST, FOOT_B } from './tuning.js';

const solid = e => e.isBuilding || e.isBarricade;
const hitX = e => (solid(e) ? e.x + 12 : aimOf(e).x);

export const FrostMethods = {
    // ---- 냉기·빙결 ----
    /** 냉기 n 쌓기 → freezeAt이면 빙결 (거점·바리케이드는 없음, 보스는 쌓이기만) */
    applyChill(e, n = 1) {
        if (!e || solid(e) || e.hp <= 0 || e.frozenT > 0) return;
        e.chill = (e.chill || 0) + n;
        e.chillT = FROST.chillSec;
        if (e.chill >= FROST.freezeAt && !e.boss) {
            e.chill = 0;
            this.freezeEnemy(e, FROST.freezeSec);
        } else {
            this.updateEnemyFilter(e);
        }
    },

    freezeEnemy(e, sec) {
        if (!e || solid(e) || e.boss || !this.enemies.includes(e)) return;
        this.stunEnemy(e, sec);
        e.frozenT = Math.max(e.frozenT || 0, sec);
        e.chill = 0;
        this.updateEnemyFilter(e);
        this.fx.play(FROST_VFX.freeze, aimOf(e).x, FOOT_B);
    },

    /** 다리 패시브 빙판 걸음: 얼어 있는 적에게 주는 피해 배율 증가분 (아니면 0) */
    shatterBonus() {
        return FROST.shatter[this.equippedLegId] || 0;
    },

    // ---- 기본 공격: 서리 부채 ----
    fireFrostFan(target, dmg, isCrit) {
        const fan = monsterControllerV2.getMuzzlePoint() || { x: this.monsterX + 90, bottom: 110 };
        const hit = [];
        this.fx.launchWave({
            x: fan.x, b: Math.max(70, fan.bottom - 10), range: this.playerRange + 30, speed: 820, h: 54,
            color: ICE, mist: MIST, sfx: 'frost_fan',
            onPass: (x0, x1) => {
                if (hit.length >= FROST.fanTargets) return;
                [...this.enemies].forEach(e => {
                    const x = hitX(e);
                    if (x < x0 || x > x1 || hit.includes(e) || hit.length >= FROST.fanTargets) return;
                    hit.push(e);
                    const mul = hit.length === 1 ? 1 : FROST.fanSecond;
                    this.fx.play(FROST_VFX.fanHit, x, aimOf(e).b);
                    this.dealDamageToEnemy(e, dmg * mul, isCrit && mul === 1, { knock: 0.3 });
                    if (this.enemies.includes(e)) this.applyChill(e, 1);
                });
            }
        });
    },

    // ---- 팔 스킬: 초승달 참격 ----
    crescentSlash(range) {
        const fan = monsterControllerV2.getMuzzlePoint() || { x: this.monsterX + 90, bottom: 110 };
        this.fx.play(FROST_VFX.crescentBurst, fan.x, fan.bottom);
        const hit = new Set();
        this.fx.launchWave({
            x: fan.x, b: 86, range: this.playerRange + range, speed: 700, h: 130, color: ICE, mist: MIST,
            sfx: null,
            onPass: (x0, x1) => {
                [...this.enemies].forEach(e => {
                    const x = hitX(e);
                    if (x < x0 || x > x1 || hit.has(e)) return;
                    hit.add(e);
                    this.fx.play(FROST_VFX.crescentHit, x, aimOf(e).b);
                    this.dealDamageToEnemy(e, this.unit() * FROST.crescentDmg, false, { knock: 0.6, stop: hit.size === 1 });
                    if (this.enemies.includes(e)) this.applyChill(e, FROST.crescentChill);
                });
            }
        });
    },

    // ---- 몸통 스킬: 눈보라 춤 ----
    blizzardDance() {
        this.blizzard = { t: FROST.blizzardSec, tick: 0 };
        const cx = () => this.frontX() + FROST.blizzardDx;
        this.fx.play(FROST_VFX.blizzardOpen, cx(), FOOT_B);
        this.fx.setAura('blizzard', FROST_VFX.blizzardField, () => [cx(), FOOT_B]);
    },

    inBlizzard(e) {
        const d = hitX(e) - this.frontX();
        return d >= FROST.blizzardZone[0] && d <= FROST.blizzardZone[1];
    },

    endBlizzard() {
        this.blizzard = null;
        this.fx.setAura('blizzard', null);
    },

    // ---- 머리 필살기: 영원한 안식 ----
    eternalRest(range) {
        this.fx.play(FROST_VFX.eternalCall, this.monsterX + 35, FOOT_B);
        this.enemiesInRange(this.playerRange + range).slice(0, FROST.restMax).forEach((e, i) => this.schedule(0.1 + i * 0.06, () => {
            if (!this.isActive || !this.enemies.includes(e)) return;
            this.fx.play(FROST_VFX.encase, hitX(e), FOOT_B);
            if (!solid(e) && !e.boss) {
                this.stunEnemy(e, FROST.restSec + 0.1);
                e.frozenT = FROST.restSec + 0.1;
                e.chill = 0;
                this.updateEnemyFilter(e);
            }
            this.schedule(FROST.restSec, () => {   // 한꺼번에 깨짐 (얼어 있으면 빙판 걸음 보너스도 받음)
                if (!this.isActive || !this.enemies.includes(e)) return;
                this.fx.play(FROST_VFX.shatter, hitX(e), FOOT_B);
                this.dealDamageToEnemy(e, this.unit() * (solid(e) ? FROST.restBaseDmg : FROST.restDmg), false, { knock: 1, stop: i === 0 });
            });
        }));
    },

    /** 매 프레임: 냉기·빙결 시간, 눈보라 */
    tickFrost(dt) {
        this.enemies.forEach(e => {
            if (e.chill > 0) {
                e.chillT -= dt;
                if (e.chillT <= 0) {
                    e.chill = 0;
                    this.updateEnemyFilter(e);
                }
            }
            if (e.frozenT > 0) {
                e.frozenT -= dt;
                if (e.frozenT <= 0) this.updateEnemyFilter(e);
            }
        });
        if (!this.blizzard) return;
        this.blizzard.t -= dt;
        this.blizzard.tick -= dt;
        const tick = this.blizzard.tick <= 0;
        if (tick) {
            this.blizzard.tick = FROST.blizzardTick;
            this.fx.pulseAura('blizzard');
        }
        [...this.enemies].forEach(e => {
            if (!this.inBlizzard(e)) return;
            this.dealDamageToEnemy(e, this.unit() * FROST.blizzardDps * dt, false, { dot: true });
            if (tick && this.enemies.includes(e)) {
                this.applyChill(e, 1);
                this.fx.play(FROST_VFX.blizzardTick, hitX(e), FOOT_B);
            }
        });
        if (this.blizzard.t <= 0) this.endBlizzard();
    }
};
