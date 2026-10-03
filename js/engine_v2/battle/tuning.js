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
// 근접 기본 공격 휩쓸기: 맞은 적 뒤 radius px 안의 적에게도 피해 × mul (거대 캐릭터가 무리를 쳐냄)
export const MELEE_CLEAVE = { radius: 60, mul: 0.4 };

// ---- 화면 배치 ----
// 피해 숫자: 같은 자리 연속 표시는 위로 쌓고, 지속 피해(아군 미니언 등)는 모아서 0.5초마다 표시
export const POPUP = { column: 36, stackMs: 350, stackPx: 15, dotFlushSec: 0.5 };
export const FOOT_B = 58;   // 지면 이펙트 높이 (bottom px)
// 거점 건물 왼쪽 끝 위치 (전장 1280px 기준): 그림 폭(약 220px)이 하단 오른쪽 스킬 도크(약 x 965부터)에 가리지 않게
export const BASE_X = { mid: 720, final: 720 };
