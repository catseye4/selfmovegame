/* ==========================================================================
   PROJECT: MAD OVERLORD // 전투 수치 (v2)
   밸런스를 맞출 때 고치는 곳을 한 파일에 모았다. 적 능력치는 enemies_v2.js의 ENEMY_TYPES,
   스테이지(거리·제한 시간·적 구성·거점 체력·보상)는 stages_v2.js, 스킬 수치는 skills_v2.js.
   ========================================================================== */

// ---- 팩션 스킬 (컨셉 시트 기준) ----
export const PHASE2 = { hpRatio: 0.5, shieldRatio: 0.3, dpsMul: 1.3 };            // 합성괴인 머리: 2페이즈 거대화 + 실드
// 산란(거대괴수 몸통 스킬)과 스웜 드론(거대로봇 머리 필살기)은 액티브 스킬로 발동 (skills_v2.js)
export const EGG = { hatchSec: 1.6 };
export const BABY = { hp: 260, dps: 22, speedMul: 0.6 };
export const DRONE = { dmgMul: 0.35, splash: 70 };
// 타락 히어로: 머리 세뇌 파동(처치한 적 징집 확률 = 파츠 설명 25%), 몸통 흑마법 오라, 팔 어둠 파동(관통 + 감속)
// curseZone: 적 왼쪽 끝 기준 저주 범위 (몸 앞 기준 px). auraDx: 저주 장판 중심 (몸 앞 기준, 장판은 발밑~범위 끝)
// wavePierce: 관통 파동이 두 번째 적부터 주는 피해 배율 (적을 지날 때마다 곱해짐, 밸런스 1차)
export const HERO = { recruitChance: 0.1, curseTick: 0.65, curseZone: [-40, 180], curseDps: 22, auraDx: 65,
    waveRange: 280, slowSec: 2.5, slowMul: 0.5, wavePierce: 0.5, waveBaseMul: 0.7 };   // waveBaseMul: 파동이 거점·바리케이드에 주는 피해 배율
// 팩션 패시브 수치 (밸런스 1차): 괴수 머리 재생(최대 체력 비율/초), 합성괴인 다리 지진(초당 피해), 괴수 다리 포자(초당 피해)
export const PASSIVE = { regen: 0.012, quakeDps: 30, sporeDps: 30 };
export const HIT_REACT = { flashMs: 80, knockPx: 10, stopSec: 0.05 };
// 다리 패시브 (설명: skills_v2.js LEG_PASSIVES). 궤도 돌진: 피해(기본 1타 배수)·넉백·기절·재사용 / 반중력 부양: 피해 감소율
export const LEG = { ramDmg: 1.5, ramKnock: 3, ramStun: 0.6, ramCd: 4, hoverReduce: 0.3 };
// 주인공 상태 이상 (적 공격): 감속 = 진격 속도·동작 속도 감소, 기절 = 공격·진격·스킬 멈춤
export const PLAYER_STATUS = { slowMove: 0.5, slowAnim: 0.55 };
// 과부하: 내구도 0 → sec초 동안 멈춤(무적) → 최대 내구도 × restore로 수리 (D-028)
export const OVERLOAD = { sec: 4, restore: 0.5 };
// 산성 발톱 팔(arm_mutant, D-030): 물린 적·거점 부식 — 초당 피해 = 주인공 DPS × dpsMul (거점 × baseMul)
export const ACID = { dpsMul: 0.14, baseMul: 2, sec: 3 };
// 심연의 길잡이 (새 캐릭터, D-044) — 효과는 battle/diver.js, 스킬은 skills_v2.js
//   기본 공격 고압 방수포: 사거리 안 적을 모두 꿰뚫음, 두 번째 적부터 피해 × jetPierce (적마다 곱해짐), 작은 넉백
//   앵커 견인: 피해(기본 1타 배수)·기절(초), 끌려와 멈추는 자리 = 주인공 앞면 + pullGap, 감는 시간 = pullSec
//   고압 분사: 물결이 지나간 적 피해·밀어냄(넉백 배율, 10px 단위)·감속, 거점은 피해만
//   심연의 손: 최대 handsMax명, 첫 피해·붙잡기(기절 초)·지속 피해(주인공 DPS 배율, 거점 × handsBaseMul, handsSec초)
//   잠수화(다리 패시브): 밀려남(넉백) 감소율 push, 감속·속박 시간 감소율 slow
export const DIVER = {
    jetPierce: 0.6, jetKnock: 0.4,
    anchorDmg: 1.5, anchorStun: 1.6, pullGap: 30, pullSec: 0.35,
    surgeDmg: 1.2, surgeKnock: 7, surgeRange: 160,
    handsMax: 6, handsDmg: 1.5, handsHold: 2.5, handsSec: 4, handsDps: 0.35, handsBaseMul: 2,
    boots: { leg_diver: { push: 0.6, slow: 0.5 }, leg_diver_up: { push: 0.8, slow: 0.7 } }
};
// 봉합 성녀 (새 캐릭터, D-046) — 효과는 battle/saint.js, 스킬은 skills_v2.js
//   봉합 표식: 바늘·장판에 맞은 병사에 markSec초 — 표식이 남은 채 쓰러지면 바닥에 시체(corpseSec초, 최대 corpseMax)
//   봉합 실(기본 공격): 바늘이 꽂힌 적에서 radius px 안 다른 적 linkN명까지 실이 이어져 피해 × linkMul + 표식
//     (바늘 한 줄로는 계속 나오는 병사를 못 따라잡아 요새 앞에서 멈췄음 — 밸런스 1차 측정)
//   3연발: 바늘 셋 tripleGap초 간격, 피해(기본 1타 배수)·묶음(초)
//   생명 봉인: sealSec초, 장판 = 주인공 앞면 기준 sealZone px(중심 sealDx), 초당 피해(기본 1타 배수), sealTick마다 다시 묶음
//   억지 부활: 최대 reviveMax명(시체 먼저, 모자라면 체력이 가장 낮은 병사), 아군 상한 allyMax,
//             아군 체력 = 원래 최대 체력 × allyHp (allyHpMin~allyHpMax), 공격력 = 원래 × allyDps
//   자가 봉합(다리 패시브): 초당 회복 = 최대 내구도 × (base + k × 잃은 비율)
export const SAINT = {
    markSec: 5, corpseSec: 14, corpseMax: 8,
    linkN: 2, linkRadius: 140, linkMul: 0.5,
    tripleGap: 0.18, tripleDmg: 1.2, tripleStun: 0.9,
    sealSec: 4, sealZone: [-30, 230], sealDx: 100, sealDps: 0.5, sealTick: 0.5,
    reviveMax: 3, allyMax: 8, allyHp: 0.7, allyHpMin: 300, allyHpMax: 1000, allyDps: 0.7,
    regen: { leg_saint: { base: 0.003, k: 0.017 }, leg_saint_up: { base: 0.004, k: 0.024 } }
};
// 서리의 무희 (새 캐릭터, D-046) — 효과는 battle/frost.js, 스킬은 skills_v2.js
//   냉기: 맞을 때마다 쌓여 freezeAt이면 freezeSec초 빙결(보스는 안 얼음), chillSec초 안 맞으면 사라짐
//   서리 부채(기본 공격): 앞의 적 fanTargets명까지, 두 번째부터 피해 × fanSecond, 냉기 1
//   초승달 참격: 지나간 적 모두 피해(기본 1타 배수)·냉기 crescentChill
//   눈보라 춤: blizzardSec초, 주인공 앞면 기준 blizzardZone px(중심 blizzardDx), 초당 피해·blizzardTick마다 냉기 1,
//             그동안 무희가 받는 피해 × (1 - blizzardGuard)
//   영원한 안식: 최대 restMax명을 restSec초 가뒀다 깨뜨림 — 피해 restDmg (거점·바리케이드 restBaseDmg)
//   빙판 걸음(다리 패시브): 얼어 있는 적에게 주는 피해 × (1 + shatter)
export const FROST = {
    freezeAt: 4, freezeSec: 1.0, chillSec: 4,
    fanTargets: 2, fanSecond: 0.5,
    crescentDmg: 1.6, crescentChill: 2,
    blizzardSec: 4, blizzardZone: [-120, 170], blizzardDx: 20, blizzardDps: 0.45, blizzardTick: 0.6, blizzardGuard: 0.3,
    restMax: 8, restSec: 2.4, restDmg: 3, restBaseDmg: 2.5,
    shatter: { leg_frost: 0.3, leg_frost_up: 0.45 }
};
// 근접 기본 공격 휩쓸기: 맞은 적 뒤 radius px 안의 적에게도 피해 × mul (거대 캐릭터가 무리를 쳐냄)
export const MELEE_CLEAVE = { radius: 60, mul: 0.4 };

// ---- 화면 배치 ----
// 피해 숫자: 같은 자리 연속 표시는 위로 쌓고, 지속 피해(아군 미니언 등)는 모아서 0.5초마다 표시
export const POPUP = { column: 36, stackMs: 350, stackPx: 15, dotFlushSec: 0.5 };
export const FOOT_B = 58;   // 지면 이펙트 높이 (bottom px)
// 거점 건물 왼쪽 끝 위치 (전장 1280px 기준): 그림 폭(약 220px)이 하단 오른쪽 스킬 도크(약 x 965부터)에 가리지 않게
export const BASE_X = { mid: 720, final: 720 };
