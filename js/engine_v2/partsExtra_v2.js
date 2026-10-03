/* ==========================================================================
   PROJECT: MAD OVERLORD // v2 전용 추가 파츠
   js/data/parts.js는 구버전과 같이 쓰므로 고치지 않고, v2가 시작할 때 이 목록을 PARTS_DB에 더한다.
   (구버전 모드는 v2 모듈을 불러오지 않으므로 영향 없음)

   arm_mutant 산성 발톱 팔 (거대괴수): 결정 D-030
     - 괴수 팩션에 팔 파츠가 없어 기본 로봇 주먹을 쓰던 문제(공격력 부족) 해결
     - 기본 공격(물기)에 산성 부식: 물린 적·거점이 몇 초간 지속 피해 (거점 2배) — battle/tuning.js ACID
     - 팔 스킬 "산성 돌진" — skills_v2.js acidCharge

   V2_STAT_OVERRIDES: 기존 파츠 능력치를 v2에서만 바꿈 (parts.js 원본은 그대로)
     - 기본 로봇 (2026-10-03, D-043): 풀강화(Lv5)해도 1-4를 못 깸 → 기본 다리 속도 20 → 70, 기본 팔 공격력 300 → 520
       · 속도: 기본 로봇 45로 다른 조합의 1/3 (속도는 강화로 안 오름) → 95. 걷는 동안 적이 쌓여 기절·과부하
       · 공격력: 근접 주먹이라 적이 붙게 두고 싸워야 함 → 속도만으로는 Lv5도 1-3 실패라 함께 올림
       · 결과: Lv1은 1-3까지, Lv5는 1-4까지, 1-5부터는 파츠 구매 (레이저 조합은 Lv1로 1-B까지)
   ========================================================================== */

import { PARTS_DB } from '../data/parts.js';

export const V2_PARTS = {
    arm: [
        {
            id: 'arm_mutant',
            name: '산성 발톱 팔',
            faction: '거대괴수 (돌연변이)',
            cost: 450,
            src: 'assets/sprites/rig/kaiju/armF.png',
            rightSrc: 'assets/sprites/rig/kaiju/armF.png',
            leftSrc: 'assets/sprites/rig/kaiju/armF.png',
            animType: 'pivot',
            stats: { hp: 500, dps: 380, range: 190, speed: 0 },
            attackType: 'melee',
            skillDesc: '산성 이빨: 물어뜯은 적과 거점을 산성으로 부식시켜 몇 초간 지속 피해 (거점 2배)'
        }
    ]
};

export const V2_STAT_OVERRIDES = {
    leg_red_robot: { speed: 70 },
    arm_red_robot: { dps: 520 }
};

/** v2 시작 시 한 번: 추가 파츠를 PARTS_DB에 등록 (이미 있으면 건너뜀), 능력치 덮어쓰기 */
export function registerV2Parts() {
    for (const [slot, list] of Object.entries(V2_PARTS)) {
        const db = PARTS_DB[slot];
        if (!db) continue;
        for (const part of list) {
            if (!db.some(p => p.id === part.id)) db.push(part);
        }
    }
    for (const db of Object.values(PARTS_DB)) {
        for (const part of db) {
            const over = V2_STAT_OVERRIDES[part.id];
            if (over && part.stats) Object.assign(part.stats, over);
        }
    }
}
