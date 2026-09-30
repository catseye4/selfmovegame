/* ==========================================================================
   PROJECT: MAD OVERLORD // v2 전용 추가 파츠
   js/data/parts.js는 구버전과 같이 쓰므로 고치지 않고, v2가 시작할 때 이 목록을 PARTS_DB에 더한다.
   (구버전 모드는 v2 모듈을 불러오지 않으므로 영향 없음)

   arm_mutant 산성 발톱 팔 (거대괴수): 결정 D-030
     - 괴수 팩션에 팔 파츠가 없어 기본 로봇 주먹을 쓰던 문제(공격력 부족) 해결
     - 기본 공격(물기)에 산성 부식: 물린 적·거점이 몇 초간 지속 피해 (거점 2배) — battle_v2.js ACID
     - 팔 스킬 "산성 돌진" — skills_v2.js acidCharge
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

/** v2 시작 시 한 번: 추가 파츠를 PARTS_DB에 등록 (이미 있으면 건너뜀) */
export function registerV2Parts() {
    for (const [slot, list] of Object.entries(V2_PARTS)) {
        const db = PARTS_DB[slot];
        if (!db) continue;
        for (const part of list) {
            if (!db.some(p => p.id === part.id)) db.push(part);
        }
    }
}
