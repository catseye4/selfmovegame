/* ==========================================================================
   PROJECT: MAD OVERLORD // 거대로봇(매드 사이언티스트) 리그 데이터 (v2)
   뼈 구성, 스프링, 무기 팔 옵션, 애니메이션 클립을 전부 데이터로 정의한다.
   (코드 수정 없이 이 파일만 바꿔 동작을 조정할 수 있게 하는 것이 목표)

   좌표 단위: 원본 이미지 픽셀. rot은 도(°), 화면 기준 +는 시계 방향.
   정면 구도 메카라 다리를 앞뒤로 휘두르지 않고, 번갈아 들어 올렸다 내려찍는 '쿵쿵 걷기'.
   공격 이벤트의 hit = 전투 엔진 기본 1타 대비 피해 비율 (캐논 0.6초에 3발 × 0.2 ≈ 초당 1타)
   ========================================================================== */

export const MECH_ASSET_DIR = 'assets/sprites/rig/mech/';

// 컨셉 시트의 '초장거리 포격'은 보라(캐니스터와 같은 색) 광선
const BEAM = '215, 90, 255';

// 부모가 먼저 오도록 나열. z가 클수록 앞에 그림.
// 다리는 root의 자식 → 몸통이 흔들려도 딛고 있는 발은 땅에 고정.
// 머리(돔)와 캐니스터는 몸통 뒤에 그려서 목 링/고정 클램프가 이음새를 가린다.
export const MECH_BONES = [
    { name: 'root', parent: null },
    { name: 'legL', parent: 'root', part: 'legL', z: 0 },
    { name: 'legR', parent: 'root', part: 'legR', z: 1 },
    { name: 'body', parent: 'root', part: 'body', z: 4 },
    { name: 'head', parent: 'body', part: 'head', z: 2 },
    { name: 'canister', parent: 'body', part: 'canister', z: 3 },
    { name: 'armL', parent: 'body', part: 'armL', z: 5 },
    { name: 'armR', parent: 'body', part: 'armR_cannon', z: 6 }
];

// 교체 가능한 무기 팔 (오른쪽 = 적 방향)
export const ARM_OPTIONS = {
    cannon: { label: '개틀링 캐논', part: 'armR_cannon', attack: 'attack_cannon', muzzle: 'muzzle_cannon' },
    fist: { label: '기본 주먹', part: 'armR_fist', attack: 'attack_fist', muzzle: 'muzzle_fist' }
};

// 2차 모션: axis 0 = 가로 가속도, 1 = 세로 가속도
export const MECH_SPRINGS = [
    // 캐니스터: 받침이 오른쪽으로 가속하면 위쪽이 뒤처져 왼쪽(반시계, -)으로 기움
    { bone: 'canister', channel: 'rot', axis: 0, gain: 0.15, k: 110, damping: 7, limit: 7 },
    // 돔: 몸통이 내려오다 멈추면(착지) 관성으로 살짝 더 내려갔다 복귀
    { bone: 'head', channel: 'y', axis: 1, gain: 0.4, k: 260, damping: 11, limit: 5 },
    // 매달린 블록 팔: 어깨가 오른쪽으로 가속하면 팔 끝이 왼쪽으로 뒤처짐(시계, +)
    { bone: 'armL', channel: 'rot', axis: 0, gain: -0.12, k: 90, damping: 8, limit: 5 }
];

// 디버그 표시용 소켓 (총구는 장착한 무기 팔 기준으로 main.js에서 추가)
export const DEBUG_SOCKETS = [
    ['footL', 'legL'],
    ['footR', 'legR']
];

// ---------------------------------------------------------------------------
// 애니메이션 클립
// tracks: { 뼈: { 채널: [[시간, 값, 다음키까지 이징], ...] } }
// events: [[시간, 이름, 데이터]]  — 효과/판정 타이밍을 코드가 아닌 데이터로
// loopFrom: 루프 시 되돌아갈 시간 (인트로 1회 재생 후 뒷구간만 반복)
// ---------------------------------------------------------------------------
export const MECH_CLIPS = {
    idle: {
        duration: 2.4,
        loop: true,
        tracks: {
            body: {
                y: [[0, 0], [1.2, 7], [2.4, 0]],
                rot: [[0, 0], [1.2, 0.5], [2.4, 0]]
            },
            armR: { rot: [[0, 0], [1.2, -2], [2.4, 0]] },
            armL: { rot: [[0, 0], [1.2, 2], [2.4, 0]] }
        }
    },

    // 한 사이클 = 오른발 쿵 + 왼발 쿵
    walk: {
        duration: 1.1,
        loop: true,
        tracks: {
            legR: {
                y: [[0, 0, 'out'], [0.2, -40, 'in'], [0.42, 0, 'linear'], [1.1, 0]],
                rot: [[0, 0, 'out'], [0.2, -5, 'in'], [0.42, 0, 'linear'], [1.1, 0]]
            },
            legL: {
                y: [[0, 0], [0.55, 0, 'out'], [0.75, -40, 'in'], [0.97, 0, 'linear'], [1.1, 0]],
                rot: [[0, 0], [0.55, 0, 'out'], [0.75, 5, 'in'], [0.97, 0, 'linear'], [1.1, 0]]
            },
            body: {
                // 들어 올리는 발 반대쪽(딛는 발)으로 체중 이동 + 기울기, 착지 순간 살짝 주저앉음
                x: [[0, 0], [0.2, -10], [0.42, -4, 'out'], [0.55, 0], [0.75, 10], [0.97, 4, 'out'], [1.1, 0]],
                y: [[0, 0], [0.2, -7, 'in'], [0.42, 6, 'out'], [0.55, 0], [0.75, -7, 'in'], [0.97, 6, 'out'], [1.1, 0]],
                rot: [[0, 0], [0.2, -2.2], [0.42, 0.6, 'out'], [0.55, 0], [0.75, 2.2], [0.97, -0.6, 'out'], [1.1, 0]]
            },
            armR: { rot: [[0, 0], [0.3, 5], [0.55, 0], [0.85, -5], [1.1, 0]] },
            armL: { rot: [[0, 0], [0.3, 5], [0.55, 0], [0.85, -5], [1.1, 0]] }
        },
        events: [
            [0.42, 'stomp', { foot: 'footR', bone: 'legR' }],
            [0.97, 'stomp', { foot: 'footL', bone: 'legL' }]
        ]
    },

    // 캐논: 0~0.35 조준 → 0.35~0.7 차징 → 0.7~1.3 연사 구간 반복
    attack_cannon: {
        duration: 1.3,
        loop: true,
        loopFrom: 0.7,
        tracks: {
            armR: {
                rot: [[0, 0, 'out'], [0.35, -36], [0.45, -34.5], [0.55, -36.5], [0.62, -35], [0.7, -36, 'out'],
                      [0.74, -41], [0.9, -36, 'out'], [0.94, -41], [1.1, -36, 'out'], [1.14, -41], [1.3, -36]]
            },
            armL: { rot: [[0, 0], [0.35, 7], [1.3, 7]] },
            body: {
                x: [[0, 0], [0.35, -3], [0.7, -3, 'out'], [0.74, -9], [0.9, -3, 'out'], [0.94, -9],
                    [1.1, -3, 'out'], [1.14, -9], [1.3, -3]],
                y: [[0, 0], [0.35, 6], [1.3, 6]],
                rot: [[0, 0], [0.35, -1.5], [1.3, -1.5]]
            }
        },
        events: [
            [0.35, 'charge', { color: BEAM }],
            [0.72, 'fire', { hit: 0.2, color: BEAM, size: 1.8 }],
            [0.92, 'fire', { hit: 0.2, color: BEAM, size: 1.8 }],
            [1.12, 'fire', { hit: 0.2, color: BEAM, size: 1.8 }]
        ]
    },

    // 주먹: 뒤로 당김 → 휘둘러 올려치기 → 복귀 반복
    attack_fist: {
        duration: 1.0,
        loop: true,
        tracks: {
            armR: { rot: [[0, 0], [0.3, 22, 'in'], [0.42, -58, 'out'], [0.62, -52], [1.0, 0]] },
            armL: { rot: [[0, 0], [0.3, -6], [0.42, 8], [1.0, 0]] },
            body: {
                x: [[0, 0], [0.3, -8, 'in'], [0.42, 14, 'out'], [0.62, 10], [1.0, 0]],
                y: [[0, 0], [0.3, 5], [0.42, -3, 'out'], [1.0, 0]],
                rot: [[0, 0], [0.3, -2.5, 'in'], [0.42, 3, 'out'], [0.62, 2], [1.0, 0]]
            }
        },
        events: [[0.42, 'impact', { hit: 1, color: BEAM }]]
    },

    // 점프: 웅크림 → 발 추진기 분사하며 솟구침 → 체공 → 쿵 착지 (한 번 재생, root를 움직임)
    jump: {
        duration: 1.45,
        loop: false,
        tracks: {
            root: { y: [[0, 0], [0.25, 0, 'out'], [0.62, -150, 'out'], [0.82, -150, 'in'], [1.1, 0], [1.45, 0]] },
            body: { y: [[0, 0], [0.22, 26, 'out'], [0.4, -8], [1.1, 0], [1.2, 26, 'out'], [1.45, 0]] },
            legR: { y: [[0, 0], [0.3, 0], [0.5, -26], [0.95, -26], [1.1, 0]], rot: [[0, 0], [0.5, -6], [1.1, 0]] },
            legL: { y: [[0, 0], [0.3, 0], [0.5, -26], [0.95, -26], [1.1, 0]], rot: [[0, 0], [0.5, 6], [1.1, 0]] },
            armR: { rot: [[0, 0], [0.22, 10], [0.5, -25], [0.95, -20], [1.2, 8], [1.45, 0]] },
            armL: { rot: [[0, 0], [0.22, -10], [0.5, 25], [0.95, 20], [1.2, -8], [1.45, 0]] }
        },
        events: [
            [0.25, 'thrust', { sockets: [['footR', 'legR'], ['footL', 'legL']], dur: 0.55, color: '150, 110, 255' }],
            [0.92, 'thrust', { sockets: [['footR', 'legR'], ['footL', 'legL']], dur: 0.18, color: '150, 110, 255' }],
            [1.1, 'stomp', { foot: 'footR', bone: 'legR' }],
            [1.1, 'stomp', { foot: 'footL', bone: 'legL' }]
        ]
    },

    // 승리: 두 팔을 하늘로 V자로 뻗어 흔들며 들썩이는 만세 스쿼트
    // (무기 팔 기본 방향이 오른쪽 아래 43°, 왼팔은 바로 아래 → 각각 위쪽 바깥으로 회전)
    victory: {
        duration: 0.5,
        loop: true,
        tracks: {
            armR: { rot: [[0, -92], [0.25, -108], [0.5, -92]] },
            armL: { rot: [[0, 132], [0.25, 148], [0.5, 132]] },
            body: {
                y: [[0, 10], [0.25, -4], [0.5, 10]],
                rot: [[0, -1], [0.25, 1], [0.5, -1]]
            }
        }
    }
};

// ---------------------------------------------------------------------------
// 캐릭터 정의 (rigAvatar.js / rig_test.html 공통 규격)
// ---------------------------------------------------------------------------
export const MECH = {
    id: 'mech',
    name: '거대로봇',
    assetDir: MECH_ASSET_DIR,
    bones: MECH_BONES,
    springs: MECH_SPRINGS,
    clips: MECH_CLIPS,
    weaponBone: 'armR',          // 무기 팔 교체 대상 뼈
    arms: ARM_OPTIONS,           // 교체 가능한 무기 팔 (attack 클립, 총구 소켓 포함)
    defaultArm: 'cannon',
    hitColor: '#d75aff',         // 전투 엔진 근접(주먹) 타격 이펙트 색 (보라)
    sockets: { droneBay: [693, 70] },   // 스웜 드론 발사구 (캐니스터 윗부분, 원본 px)
    debugSockets: DEBUG_SOCKETS,
    shadow: { rx: 417, ry: 38 }  // 발밑 그림자 (원본 픽셀)
};
