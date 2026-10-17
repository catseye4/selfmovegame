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

// ---- 기존 4종 A·B 세트 (D-050 파츠 확장 1차, 효과는 battle/sets.js · 스킬은 skills_v2.js) ----
// 피해 배율은 기본 1타(u) 기준, dps가 붙은 것은 주인공 DPS 대비 초당 피해 비율
export const SET = {
    // 새 기본 공격: 레일건 관통(뒤로 갈수록 × pierce), 산성 침 웅덩이, 암흑 구체 폭발, 산탄(가까운 적 max명, 둘째부터 × mul)
    rail: { pierce: 0.6, extra: 40 },
    spit: { puddleSec: 2.5, puddleW: 70, puddleDps: 0.12 },
    orb: { splash: 70, splashMul: 0.5 },
    shotgun: { max: 4, mul: 0.55 },
    // 타락 기사 대검: 넓게 휩쓸기 (기본 근접 휩쓸기 60px·40%보다 넓고 셈)
    greatsword: { radius: 120, mul: 0.65 },
    // 버프: 오버드라이브(공격 속도·진격 속도·받는 피해), 아드레날린(주는 피해), 가시 갑옷(받는 피해·되돌림), 피의 서약(흡혈)
    overdrive: { sec: 6, atk: 1.5, move: 0.4, reduce: 0.3 },
    adrenaline: { sec: 8, dmg: 0.4 },
    thorn: { sec: 6, reduce: 0.25, reflect: 0.5 },
    blood: { sec: 6, ratio: 0.2 },
    // 졸개: 총동원령(4기 + 졸개 피해 ×2), 강화 주사(졸개 체력 50% 회복 + 공격 빨라짐 = 피해 ×1.5)
    mobilize: { count: 4, sec: 6, allyMul: 2, cap: 10 },
    boost: { heal: 0.5, sec: 6, allyMul: 1.5 },
    // 소환·설치: 자동 포탑(sec초, every초마다 u × dmg), 그림자 분신(count명, 기본 공격마다 × mul), 블랙홀(radius 안 끌어당김 px/초)
    turret: { sec: 8, every: 0.3, dmg: 0.35, range: 150 },
    clones: { sec: 6, count: 2, mul: 0.5, gap: 55 },
    blackHole: { sec: 3, radius: 170, pull: 140, dps: 0.45 },
    // 다리 패시브
    anchor: { dmg: 0.2 },                          // 포격 고정: 멈춰 공격하는 동안 피해 +20%
    magField: { reduce: 0.5 },                     // 자기장 방벽: 원거리 공격 피해·효과 50% 감소
    shell: { reduce: 0.15 },                       // 단단한 껍질: 받는 피해 15% 감소, 밀려나지 않음
    sprint: { move: 0.3, clear: 40 },              // 질주 본능: 사거리 + clear px 안에 적이 없으면 진격 +30%
    indomitable: { below: 0.3, reduce: 0.4 },      // 불굴: 내구도 30% 아래에서 받는 피해 40% 감소
    dodge: { chance: 0.25 },                       // 그림자 회피: 25% 확률로 피해 무시
    stomp: { dmg: 0.35, range: 130 },              // 짓밟기: 걸음마다 앞쪽 충격파 (u × dmg)
    commander: { perAlly: 0.05, max: 4 },          // 졸개 지휘: 졸개 하나마다 주는 피해 +5% (최대 4기)
    // 합성괴인 추가 머리 화룡 머리 「용의 숨결」(세트 밖, D-054): 입에서 breathSec초 불길, 앞쪽 u × hitMul, 바닥 width px가 zoneSec초 불탐(초당 공격력 × zoneDps)
    dragonBreath: { breathSec: 1.6, hitMul: 1.5, width: 280, zoneSec: 4, zoneDps: 0.8 }
};

// ---- 화면 배치 ----
// 피해 숫자: 같은 자리 연속 표시는 위로 쌓고, 지속 피해(아군 미니언 등)는 모아서 0.5초마다 표시
export const POPUP = { column: 36, stackMs: 350, stackPx: 15, dotFlushSec: 0.5 };
export const FOOT_B = 58;   // 지면 이펙트 높이 (bottom px)
// 거점 건물 왼쪽 끝 위치 (전장 1280px 기준): 그림 폭(약 220px)이 하단 오른쪽 스킬 도크(약 x 965부터)에 가리지 않게
export const BASE_X = { mid: 720, final: 720 };
