/* ==========================================================================
   PROJECT: MAD OVERLORD // 봉합 성녀 리그 데이터 (v2, 새 캐릭터 2 — D-044·D-046)
   파츠: tools/rig/cut_newchar_parts.py saint 가 Gemini 그림 4장에서 분리 (오른쪽을 봄, 반전 없음).
   좌표 단위: 원본 이미지 픽셀. rot은 도(°), 화면 기준 +는 시계 방향.

   기본·강화 그림이 같은 뼈대를 씀: 부위 그림 <부위>(기본) ↔ <부위>_up(강화) — rigAvatar.applyUpgrades.
   작은 몸(1.6m)에 로브가 다리를 덮음 → 다리는 몸통 뒤에서 짧게 들어 올리는 종종걸음 (다리는 루트에 붙어 발이 미끄러지지 않음).
   앞팔(armF) = 큰 주사기를 앞으로 겨눈 팔(어깨에서 수평), rot -는 주사기를 들어 올림.
   뒷팔(armB) = 작은 주사기(강화: 황동 집게)를 왼쪽 아래로 늘어뜨린 팔, rot -는 앞(오른쪽)으로 휘두름.
   ========================================================================== */

export const SAINT_ASSET_DIR = 'assets/sprites/rig/saint/';

// 부모가 먼저 오도록 나열. z가 클수록 앞에 그림. 다리는 로브 뒤, 뒷팔(작은 주사기)은 로브 앞을 가로지름
export const SAINT_BONES = [
    { name: 'root', parent: null },
    { name: 'legB', parent: 'root', part: 'legB', z: 1 },
    { name: 'legF', parent: 'root', part: 'legF', z: 2 },
    { name: 'torso', parent: 'root', part: 'torso', z: 3 },
    { name: 'head', parent: 'torso', part: 'head', z: 4 },
    { name: 'armB', parent: 'torso', part: 'armB', z: 5 },
    { name: 'armF', parent: 'torso', part: 'armF', z: 6 }
];

/** 강화 그림 (D-044): 강화 주사기 팔은 이중 주사기 → 바늘 소켓, 뒷손은 집게 → 끝 소켓도 바꿈 */
export const SAINT_UPGRADE = {
    parts: { head: ['head'], body: ['torso'], arm: ['armF', 'armB'], leg: ['legF', 'legB'] },
    sockets: { arm: { muzzle: 'muzzleUp', backTip: 'backTipUp' } }
};

export const SAINT_SPRINGS = [
    // 후광·두건: 착지 때 살짝 눌렸다 돌아옴
    { bone: 'head', channel: 'y', axis: 1, gain: 0.25, k: 240, damping: 11, limit: 4 },
    // 뒷손 작은 주사기: 몸이 앞으로 가속하면 한 박자 늦게 뒤로(+) 흔들림
    { bone: 'armB', channel: 'rot', axis: 0, gain: -0.05, k: 90, damping: 6, limit: 6 }
];

export const SAINT_DEBUG_SOCKETS = [
    ['muzzle', 'armF'],
    ['backTip', 'armB'],
    ['halo', 'head'],
    ['chest', 'torso'],
    ['footF', 'legF'],
    ['footB', 'legB']
];

const BLOOD = '235, 40, 70';      // 봉합 주사 (붉은 약물·실)
const HOLY = '255, 215, 130';     // 금빛 후광

export const SAINT_CLIPS = {
    // 숨 쉬듯 몸통만 오르내림, 주사기는 앞으로 겨눈 채 살짝 흔들림
    idle: {
        duration: 2.4,
        loop: true,
        tracks: {
            torso: { y: [[0, 0], [1.2, 4], [2.4, 0]] },
            head: { rot: [[0, 0], [1.2, 1.5], [2.4, 0]] },
            armF: { rot: [[0, 0], [1.2, 2], [2.4, 0]] },
            armB: { rot: [[0, 0], [1.2, 3], [2.4, 0]] }
        }
    },

    // 한 사이클 = 앞발 딛기(0.32) + 뒷발 딛기(0.77). 로브 밑에서 다리를 짧게 들어 종종걸음, 몸은 가볍게 통통
    walk: {
        duration: 0.9,
        loop: true,
        tracks: {
            legF: {
                y: [[0, 0, 'out'], [0.16, -20, 'in'], [0.32, 0, 'linear'], [0.9, 0]],
                rot: [[0, 0, 'out'], [0.16, -6, 'in'], [0.32, 0, 'linear'], [0.9, 0]]
            },
            legB: {
                y: [[0, 0], [0.45, 0, 'out'], [0.61, -20, 'in'], [0.77, 0, 'linear'], [0.9, 0]],
                rot: [[0, 0], [0.45, 0, 'out'], [0.61, -6, 'in'], [0.77, 0, 'linear'], [0.9, 0]]
            },
            torso: {
                x: [[0, 0], [0.16, -3], [0.32, -1, 'out'], [0.45, 0], [0.61, 3], [0.77, 1, 'out'], [0.9, 0]],
                y: [[0, 0], [0.16, -6, 'in'], [0.32, 4, 'out'], [0.45, 0], [0.61, -6, 'in'], [0.77, 4, 'out'], [0.9, 0]],
                rot: [[0, 0], [0.16, -1], [0.32, 0.5, 'out'], [0.45, 0], [0.61, 1], [0.77, -0.5, 'out'], [0.9, 0]]
            },
            head: { rot: [[0, 0], [0.32, 1.5, 'out'], [0.45, 0], [0.77, 1.5, 'out'], [0.9, 0]] },
            armF: { rot: [[0, -2], [0.45, 3], [0.9, -2]] },
            armB: { rot: [[0, 4], [0.45, -4], [0.9, 4]] }
        },
        events: [
            [0.32, 'step', { foot: 'footF', bone: 'legF' }],
            [0.77, 'step', { foot: 'footB', bone: 'legB' }]
        ]
    },

    // 봉합 주사 (기본 공격): 0~0.35 겨눔·약물 충전 → 0.35~1.0 바늘 두 발 반복 (반동으로 주사기가 튀어 오름)
    attack_needle: {
        duration: 1.0,
        loop: true,
        loopFrom: 0.35,
        tracks: {
            armF: {
                rot: [[0, 0, 'out'], [0.35, -3], [0.45, -3, 'out'], [0.48, -9], [0.62, -3, 'out'],
                      [0.8, -3, 'out'], [0.83, -9], [1.0, -3]]
            },
            armB: { rot: [[0, 0], [0.35, 6], [1.0, 6]] },
            torso: {
                x: [[0, 0], [0.35, -2], [0.45, -2, 'out'], [0.48, -6], [0.62, -2, 'out'], [0.8, -2, 'out'], [0.83, -6], [1.0, -2]],
                y: [[0, 0], [0.35, 3], [1.0, 3]]
            },
            head: { rot: [[0, 0], [0.35, -1.5], [1.0, -1.5]] }
        },
        events: [
            [0.15, 'charge', { color: BLOOD }],
            [0.46, 'fire', { hit: 0.33, color: BLOOD, size: 1.1 }],
            [0.81, 'fire', { hit: 0.33, color: BLOOD, size: 1.1 }]
        ]
    },

    // 봉합 주사 3연발 (팔 스킬): 빠르게 세 번 쏨. 'cast' = 첫 발 (스킬이 바늘 셋을 이 순간부터 쏨)
    triple: {
        duration: 0.95,
        loop: false,
        tracks: {
            armF: { rot: [[0, 0], [0.18, -4, 'out'], [0.2, -11], [0.32, -4, 'out'], [0.38, -11], [0.5, -4, 'out'],
                          [0.56, -12], [0.95, 0]] },
            torso: { x: [[0, 0], [0.18, -2], [0.2, -7], [0.32, -3], [0.38, -8], [0.5, -4], [0.56, -10], [0.95, 0]],
                     rot: [[0, 0], [0.18, -1], [0.56, -2.5], [0.95, 0]] },
            armB: { rot: [[0, 0], [0.18, 8], [0.95, 0]] },
            head: { rot: [[0, 0], [0.56, -3], [0.95, 0]] }
        },
        events: [
            [0.2, 'cast'],
            [0.2, 'fire', { color: BLOOD, size: 1.3 }],
            [0.38, 'fire', { color: BLOOD, size: 1.3 }],
            [0.56, 'fire', { color: BLOOD, size: 1.3 }]
        ]
    },

    // 스킬 시전 (생명 봉인 · 억지 부활): 주사기를 들어 올려 붉은 실을 모았다가 앞으로 뻗어 해방
    cast: {
        duration: 1.0,
        loop: false,
        tracks: {
            armF: { rot: [[0, 0], [0.3, -28, 'out'], [0.45, 6, 'out'], [0.65, 2], [1.0, 0]] },
            armB: { rot: [[0, 0], [0.3, 18, 'out'], [0.45, -24, 'out'], [0.7, -18], [1.0, 0]] },
            torso: { y: [[0, 0], [0.3, 6], [0.45, -4, 'out'], [1.0, 0]],
                     rot: [[0, 0], [0.3, -3], [0.45, 3, 'out'], [1.0, 0]] },
            head: { rot: [[0, 0], [0.3, -5], [0.45, 2, 'out'], [1.0, 0]] }
        },
        events: [
            [0.05, 'charge', { socket: 'halo', bone: 'head', color: HOLY }],
            [0.45, 'chargeEnd'],
            [0.45, 'impact', { color: BLOOD }],
            [0.45, 'cast']
        ]
    },

    // 승리: 큰 주사기를 하늘로 치켜들고 작은 주사기를 흔들며 통통 뜀, 후광이 빛남
    victory: {
        duration: 1.0,
        loop: true,
        tracks: {
            armF: { rot: [[0, -30], [0.5, -36], [1.0, -30]] },
            armB: { rot: [[0, -15], [0.5, 15], [1.0, -15]] },
            torso: { y: [[0, 4], [0.5, -6], [1.0, 4]], rot: [[0, -2], [0.5, -3], [1.0, -2]] },
            head: { rot: [[0, -4], [0.5, -7], [1.0, -4]] },
            legF: { y: [[0, 0], [0.5, -6], [1.0, 0]] },
            legB: { y: [[0, -6], [0.5, 0], [1.0, -6]] }
        },
        events: [[0.1, 'roar', { socket: 'halo', bone: 'head', color: HOLY }]]
    }
};

export const SAINT = {
    id: 'saint',
    name: '봉합 성녀',
    assetDir: SAINT_ASSET_DIR,
    bones: SAINT_BONES,
    springs: SAINT_SPRINGS,
    clips: SAINT_CLIPS,
    arms: null,
    attack: 'attack_needle',
    hitSocket: ['muzzle', 'armF'],
    upgrade: SAINT_UPGRADE,
    skillClips: [['봉합 주사 3연발', 'triple'], ['시전 동작', 'cast']],   // rig_test.html 동작 버튼
    // 후광 둘레에 떠오르는 금빛 가루, 주사기 바늘 끝에서 떨어지는 붉은 약물
    ambient: [
        { kind: 'ember', socket: 'halo', bone: 'head', layer: 'front', rate: 3,
          offset: [0, 0], spread: [90, 20], size: [1.6, 2.8], life: [0.8, 1.3],
          vel: [[-8, 8], [-40, -20]], color: HOLY },
        { kind: 'drip', socket: 'muzzle', bone: 'armF', rate: 1, spread: [8, 4], size: [3.5, 5],
          life: [3, 3], vel: [[-6, 6], [0, 20]], color: BLOOD }
    ],
    debugSockets: SAINT_DEBUG_SOCKETS,
    shadow: { rx: 190, ry: 26 }
};
