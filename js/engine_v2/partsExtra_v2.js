/* ==========================================================================
   PROJECT: MAD OVERLORD // v2 전용 추가 파츠
   js/data/parts.js는 구버전과 같이 쓰므로 고치지 않고, v2가 시작할 때 이 목록을 PARTS_DB에 더한다.
   (구버전 모드는 v2 모듈을 불러오지 않으므로 영향 없음)

   arm_mutant 산성 발톱 팔 (거대괴수): 결정 D-030
     - 괴수 팩션에 팔 파츠가 없어 기본 로봇 주먹을 쓰던 문제(공격력 부족) 해결
     - 기본 공격(물기)에 산성 부식: 물린 적·거점이 몇 초간 지속 피해 (거점 2배) — battle/tuning.js ACID
     - 팔 스킬 "산성 돌진" — skills_v2.js acidCharge

   심연의 길잡이 파츠 8개 (새 캐릭터 1, D-044): 부위마다 기본 → 강화
     - 팩션 '심연의 길잡이 (심해)' — 몸통이 이 팩션이면 리그 캐릭터 diver (rigAvatar.js FACTION_RIG)
     - rigUpgrade: 강화 파츠 표시 → 그 부위 그림을 <부위>_up으로 바꿔 끼움 (rigAvatar.applyUpgrades)
     - 무거운 탱커: 체력 높고 느림, 팔은 관통 물줄기(attackType 'water', battle/diver.js)
     - 스킬: 팔 앵커 견인 · 몸통 고압 분사 · 머리 심연의 손 · 다리 잠수화 (skills_v2.js), 기본·강화가 같은 스킬
     - 수치 1차 측정(2026-10-10, 밸런스_기록 구역 1): 강화 세트는 목표 곡선대로(Lv1 1-4까지, Lv3 1-5·보스),
       기본 세트는 Lv3도 1-4를 못 깨 팔 공격력 380 → 430, 다리 속도 75 → 90. 해금(별)은 아직 없음 — 구매만 하면 씀

   봉합 성녀 파츠 8개 (새 캐릭터 2, D-046): 같은 규칙 (팩션 '봉합 성녀 (뒤틀린 구원)' → 리그 saint)
     - 버티기 + 쓰러진 적을 꿰매 아군으로: 팔은 바늘(attackType 'needle', battle/saint.js) — 꽂힌 적에 봉합 표식
     - 스킬: 팔 봉합 주사 3연발 · 몸통 생명 봉인 · 머리 억지 부활 · 다리 자가 봉합 (skills_v2.js)
     - 수치: 밸런스 9차(2026-10-10) — 기본 Lv1 1-4까지, 강화 Lv1 1-4·보스. 해금(별)은 아직 없음

   서리의 무희 파츠 8개 (새 캐릭터 3, D-046): 같은 규칙 (팩션 '서리의 무희 (얼어붙은 안식)' → 리그 frost)
     - 얼리고 깨뜨리는 원거리: 팔은 서리 부채(attackType 'frost', battle/frost.js) — 냉기를 쌓아 빙결
     - 스킬: 팔 초승달 참격 · 몸통 눈보라 춤 · 머리 영원한 안식 · 다리 빙판 걸음 (skills_v2.js)
     - 수치 1차 그대로 (밸런스 10차: 기본 Lv1 1-3까지·1-4 아슬아슬, 강화 Lv1 1-5·보스 빠듯), 해금(별)은 아직 없음

   V2_STAT_OVERRIDES: 기존 파츠 능력치를 v2에서만 바꿈 (parts.js 원본은 그대로)
     - 기본 로봇 (2026-10-03, D-043): 풀강화(Lv5)해도 1-4를 못 깸 → 기본 다리 속도 20 → 70, 기본 팔 공격력 300 → 520
       · 속도: 기본 로봇 45로 다른 조합의 1/3 (속도는 강화로 안 오름) → 95. 걷는 동안 적이 쌓여 기절·과부하
       · 공격력: 근접 주먹이라 적이 붙게 두고 싸워야 함 → 속도만으로는 Lv5도 1-3 실패라 함께 올림
       · 결과: Lv1은 1-3까지, Lv5는 1-4까지, 1-5부터는 파츠 구매 (레이저 조합은 Lv1로 1-B까지)
   ========================================================================== */

import { PARTS_DB } from '../data/parts.js';

export const DIVER_FACTION = '심연의 길잡이 (심해)';
export const SAINT_FACTION = '봉합 성녀 (뒤틀린 구원)';
export const FROST_FACTION = '서리의 무희 (얼어붙은 안식)';
/** 새 캐릭터 파츠: 그림은 그 캐릭터 리그의 부위 그림 (연구소 카드는 lab_v2.js THUMB) */
const newPart = (faction, dir) => (id, name, cost, src, stats, extra = {}) => ({
    id, name, faction, cost, src: `assets/sprites/rig/${dir}/${src}`, animType: 'pivot', stats, ...extra
});
const diverPart = newPart(DIVER_FACTION, 'diver');
const saintPart = newPart(SAINT_FACTION, 'saint');
const frostPart = newPart(FROST_FACTION, 'frost');

export const V2_PARTS = {
    head: [
        diverPart('head_diver', '황동 잠수모', 400, 'head.png', { hp: 700, dps: 60, range: 20, speed: 0 },
            { skillDesc: '심연의 손: 유령 손이 적을 붙잡아 묶고 지속 피해' }),
        diverPart('head_diver_up', '심해 등불 잠수모', 950, 'head_up.png', { hp: 950, dps: 90, range: 30, speed: 0 },
            { rigUpgrade: true, skillDesc: '심연의 손 (강화 잠수모: 관·밝은 창)' }),
        saintPart('head_saint', '봉합 두건', 400, 'head.png', { hp: 600, dps: 70, range: 20, speed: 10 },
            { skillDesc: '억지 부활: 봉합된 시체를 아군으로' }),
        saintPart('head_saint_up', '금빛 후광 두건', 950, 'head_up.png', { hp: 800, dps: 100, range: 30, speed: 10 },
            { rigUpgrade: true, skillDesc: '억지 부활 (강화 두건: 큰 금빛 후광)' }),
        frostPart('head_frost', '눈꽃 머리 장식', 400, 'head.png', { hp: 550, dps: 80, range: 30, speed: 10 },
            { skillDesc: '영원한 안식: 적을 얼음에 가뒀다 깨뜨림' }),
        frostPart('head_frost_up', '얼음 결정 왕관', 950, 'head_up.png', { hp: 750, dps: 110, range: 40, speed: 10 },
            { rigUpgrade: true, skillDesc: '영원한 안식 (강화 왕관: 얼음 결정)' })
    ],
    body: [
        diverPart('body_diver', '잠수복', 450, 'torso.png', { hp: 1800, dps: 40, range: 0, speed: 0 },
            { skillDesc: '고압 분사: 물살로 적을 밀어내고 감속' }),
        diverPart('body_diver_up', '산소통 잠수복', 1000, 'torso_up.png', { hp: 2300, dps: 70, range: 0, speed: 0 },
            { rigUpgrade: true, skillDesc: '고압 분사 (강화 잠수복: 산소통 관·청록 빛)' }),
        saintPart('body_saint', '봉합 수녀복', 450, 'torso.png', { hp: 1500, dps: 50, range: 0, speed: 10 },
            { skillDesc: '생명 봉인: 붉은 실 장판으로 적을 묶음' }),
        saintPart('body_saint_up', '수혈 부적 갑옷', 1000, 'torso_up.png', { hp: 1900, dps: 80, range: 0, speed: 10 },
            { rigUpgrade: true, skillDesc: '생명 봉인 (강화 갑옷: 수혈 팩·부적)' }),
        frostPart('body_frost', '서리 무희복', 450, 'torso.png', { hp: 1300, dps: 60, range: 0, speed: 10 },
            { skillDesc: '눈보라 춤: 둘레 눈보라로 냉기 + 받는 피해 감소' }),
        frostPart('body_frost_up', '얼음 하트 갑옷', 1000, 'torso_up.png', { hp: 1700, dps: 90, range: 0, speed: 10 },
            { rigUpgrade: true, skillDesc: '눈보라 춤 (강화 갑옷: 얼음 하트 코어)' })
    ],
    leg: [
        diverPart('leg_diver', '잠수화', 400, 'legF.png', { hp: 800, dps: 30, range: 0, speed: 90 },
            { skillDesc: '잠수화: 밀려남·감속·속박에 강함' }),
        diverPart('leg_diver_up', '청록 강화 잠수화', 950, 'legF_up.png', { hp: 1000, dps: 50, range: 0, speed: 95 },
            { rigUpgrade: true, skillDesc: '잠수화 (강화): 더 강하게 버팀' }),
        saintPart('leg_saint', '흰 장화', 400, 'legF.png', { hp: 600, dps: 30, range: 0, speed: 90 },
            { skillDesc: '자가 봉합: 다칠수록 빨리 회복' }),
        saintPart('leg_saint_up', '금속 덧댄 장화', 950, 'legF_up.png', { hp: 800, dps: 50, range: 0, speed: 105 },
            { rigUpgrade: true, skillDesc: '자가 봉합 (강화): 더 빨리 회복' }),
        frostPart('leg_frost', '흰 하이힐 부츠', 400, 'legF.png', { hp: 550, dps: 40, range: 0, speed: 100 },
            { skillDesc: '빙판 걸음: 얼어 있는 적에게 피해 증가' }),
        frostPart('leg_frost_up', '얼음 결정 부츠', 950, 'legF_up.png', { hp: 750, dps: 60, range: 0, speed: 115 },
            { rigUpgrade: true, skillDesc: '빙판 걸음 (강화): 더 크게 깨뜨림' })
    ],
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
        },
        diverPart('arm_diver', '고압 방수포', 500, 'armF.png', { hp: 350, dps: 430, range: 250, speed: 0 },
            { attackType: 'water', skillDesc: '고압 방수포: 앞의 적을 꿰뚫는 물줄기 · 앵커 견인' }),
        diverPart('arm_diver_up', '심해 방수포·앵커', 1100, 'armF_up.png', { hp: 450, dps: 480, range: 280, speed: 0 },
            { attackType: 'water', rigUpgrade: true, skillDesc: '더 긴 강화 방수포 · 앵커 견인' }),
        saintPart('arm_saint', '봉합 주사기', 500, 'armF.png', { hp: 300, dps: 430, range: 230, speed: 0 },
            { attackType: 'needle', skillDesc: '봉합 주사: 바늘이 꽂힌 적에 봉합 표식 · 3연발' }),
        saintPart('arm_saint_up', '이중 주사기·집게', 1100, 'armF_up.png', { hp: 400, dps: 520, range: 260, speed: 0 },
            { attackType: 'needle', rigUpgrade: true, skillDesc: '이중 주사기 · 봉합 주사 3연발' }),
        frostPart('arm_frost', '얼음 부채', 500, 'armF.png', { hp: 300, dps: 420, range: 270, speed: 0 },
            { attackType: 'frost', skillDesc: '서리 부채: 얼음 칼날로 냉기 → 빙결 · 초승달 참격' }),
        frostPart('arm_frost_up', '얼음 칼날 부채', 1100, 'armF_up.png', { hp: 400, dps: 510, range: 300, speed: 0 },
            { attackType: 'frost', rigUpgrade: true, skillDesc: '큰 얼음 칼날 부채 · 초승달 참격' })
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
