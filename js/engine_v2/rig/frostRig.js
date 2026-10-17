/* ==========================================================================
   PROJECT: MAD OVERLORD // 서리의 무희 리그 데이터 (v2, 새 캐릭터 3 — D-046)
   파츠: tools/rig/cut_newchar_parts.py frost 가 Gemini 그림 4장에서 분리 (얼굴은 오른쪽, 몸은 3/4 정면).
   좌표 단위: 원본 이미지 픽셀. rot은 도(°), 화면 기준 +는 시계 방향.

   기본·강화 그림이 같은 뼈대를 씀: 부위 그림 <부위>(기본) ↔ <부위>_up(강화) — rigAvatar.applyUpgrades.
   두 팔을 양옆으로 벌린 무희 자세:
     앞팔(armF) = 오른쪽 얼음 부채, 어깨에서 오른쪽 아래 35° → rot -는 부채를 들어 올림
     뒷팔(armB) = 왼쪽 얼음 부채, 어깨에서 왼쪽 아래 20° → rot +가 들어 올림 (왼쪽을 향해 있어 방향이 반대)
   몸 뒤로 흘러내린 긴 포니테일(hair)은 머리에 붙은 따로 한 조각 — 몸통 뒤에 그리고 스프링으로 한 박자 늦게 흔들림.
   치마가 허벅지를 덮어 다리는 몸통 뒤에서 짧게 들어 올리는 가벼운 걸음 (다리는 루트에 붙어 발이 미끄러지지 않음).
   ========================================================================== */

export const FROST_ASSET_DIR = 'assets/sprites/rig/frost/';

// 부모가 먼저 오도록 나열. z가 클수록 앞에 그림. 뒷머리는 맨 뒤, 두 팔(부채)은 맨 앞
export const FROST_BONES = [
    { name: 'root', parent: null },
    { name: 'legB', parent: 'root', part: 'legB', z: 1 },
    { name: 'legF', parent: 'root', part: 'legF', z: 2 },
    { name: 'torso', parent: 'root', part: 'torso', z: 3 },
    { name: 'head', parent: 'torso', part: 'head', z: 4 },
    { name: 'hair', parent: 'head', part: 'hair', z: 0 },
    { name: 'armB', parent: 'torso', part: 'armB', z: 5 },
    { name: 'armF', parent: 'torso', part: 'armF', z: 6 }
];

/** 강화 그림 (D-044): 강화 부채가 조금 더 커서 앞 부채 소켓도 바꿈. 뒷머리는 머리 슬롯과 같이 바뀜 */
export const FROST_UPGRADE = {
    parts: { head: ['head', 'hair'], body: ['torso'], arm: ['armF', 'armB'], leg: ['legF', 'legB'] },
    sockets: { arm: { fanF: 'fanFUp' } }
};

export const FROST_SPRINGS = [
    // 뒷머리: 몸이 앞으로 가속하면 뒤로(시계 반대, -) 날리고 끝이 출렁임
    { bone: 'hair', channel: 'rot', axis: 0, gain: 0.10, k: 55, damping: 4.5, limit: 9 },
    { bone: 'head', channel: 'y', axis: 1, gain: 0.25, k: 240, damping: 11, limit: 4 }
];

export const FROST_DEBUG_SOCKETS = [
    ['fanF', 'armF'],
    ['fanB', 'armB'],
    ['crown', 'head'],
    ['chest', 'torso'],
    ['footF', 'legF'],
    ['footB', 'legB']
];

const ICE = '150, 220, 255';      // 얼음 칼날·초승달
const DUST = '200, 240, 255';     // 서리 가루

export const FROST_CLIPS = {
    // 부채를 살랑이며 숨 쉬듯, 뒷머리가 천천히 흔들림
    idle: {
        duration: 2.4,
        loop: true,
        tracks: {
            torso: { y: [[0, 0], [1.2, 3], [2.4, 0]], rot: [[0, 0], [1.2, -1], [2.4, 0]] },
            head: { rot: [[0, 0], [1.2, 2], [2.4, 0]] },
            hair: { rot: [[0, 0], [1.2, -3], [2.4, 0]] },
            armF: { rot: [[0, 0], [0.6, -5], [1.2, 0], [1.8, -3], [2.4, 0]] },
            armB: { rot: [[0, 0], [0.6, 4], [1.2, 0], [1.8, 3], [2.4, 0]] }
        }
    },

    // 한 사이클 = 앞발 딛기(0.35) + 뒷발 딛기(0.85). 치맛자락 밑에서 다리를 가볍게 들고, 부채는 춤추듯 엇갈려 흔듦
    walk: {
        duration: 1.0,
        loop: true,
        tracks: {
            legF: {
                y: [[0, 0, 'out'], [0.18, -18, 'in'], [0.35, 0, 'linear'], [1.0, 0]],
                rot: [[0, 0, 'out'], [0.18, -5, 'in'], [0.35, 0, 'linear'], [1.0, 0]]
            },
            legB: {
                y: [[0, 0], [0.5, 0, 'out'], [0.68, -18, 'in'], [0.85, 0, 'linear'], [1.0, 0]],
                rot: [[0, 0], [0.5, 0, 'out'], [0.68, -5, 'in'], [0.85, 0, 'linear'], [1.0, 0]]
            },
            torso: {
                x: [[0, 0], [0.18, -2], [0.35, 0, 'out'], [0.5, 0], [0.68, 2], [0.85, 0, 'out'], [1.0, 0]],
                y: [[0, 0], [0.18, -5, 'in'], [0.35, 3, 'out'], [0.5, 0], [0.68, -5, 'in'], [0.85, 3, 'out'], [1.0, 0]],
                rot: [[0, 0], [0.25, -1.5], [0.5, 0], [0.75, 1.5], [1.0, 0]]
            },
            head: { rot: [[0, 0], [0.35, 1.5, 'out'], [0.5, 0], [0.85, 1.5, 'out'], [1.0, 0]] },
            hair: { rot: [[0, -2], [0.5, -5], [1.0, -2]] },
            armF: { rot: [[0, -6], [0.5, 4], [1.0, -6]] },
            armB: { rot: [[0, -4], [0.5, 6], [1.0, -4]] }
        },
        events: [
            [0.35, 'step', { foot: 'footF', bone: 'legF' }],
            [0.85, 'step', { foot: 'footB', bone: 'legB' }]
        ]
    },

    // 서리 부채 (기본 공격): 0~0.3 부채를 아래로 모음 → 앞 부채로 올려 쳐 얼음 칼날(0.42) → 뒷 부채가 따라 휘둘러 한 번 더(0.8)
    attack_fan: {
        duration: 1.0,
        loop: true,
        loopFrom: 0.3,
        tracks: {
            armF: { rot: [[0, 0], [0.3, 18, 'in'], [0.42, -26, 'out'], [0.6, -14], [0.72, 12, 'in'], [0.8, -18, 'out'], [1.0, 18]] },
            armB: { rot: [[0, 0], [0.3, -6], [0.42, 6], [0.62, -12, 'in'], [0.78, 20, 'out'], [1.0, -6]] },
            torso: {
                x: [[0, 0], [0.3, -3, 'in'], [0.42, 5, 'out'], [0.72, 0], [0.8, 4, 'out'], [1.0, -3]],
                rot: [[0, 0], [0.3, -2, 'in'], [0.42, 2, 'out'], [0.72, -1.5], [0.8, 1.5, 'out'], [1.0, -2]]
            },
            head: { rot: [[0, 0], [0.42, 2], [0.8, -1], [1.0, 0]] },
            hair: { rot: [[0, 0], [0.42, -4, 'out'], [0.8, -2], [1.0, 0]] }
        },
        events: [
            [0.42, 'fire', { hit: 0.35, color: ICE, size: 1.2 }],
            [0.8, 'fire', { hit: 0.35, color: ICE, size: 1.2 }]
        ]
    },

    // 초승달 참격 (팔 스킬): 앞 부채를 크게 뒤로 젖혔다가 위로 크게 그어 큰 서리 초승달 ('cast' = 날리는 순간)
    crescent: {
        duration: 0.9,
        loop: false,
        tracks: {
            armF: { rot: [[0, 0], [0.28, 30, 'in'], [0.4, -40, 'out'], [0.6, -32], [0.9, 0]] },
            armB: { rot: [[0, 0], [0.28, -10], [0.4, 14, 'out'], [0.9, 0]] },
            torso: { x: [[0, 0], [0.28, -6, 'in'], [0.4, 8, 'out'], [0.9, 0]],
                     rot: [[0, 0], [0.28, -3, 'in'], [0.4, 3, 'out'], [0.9, 0]] },
            head: { rot: [[0, 0], [0.28, -3], [0.4, 3], [0.9, 0]] },
            hair: { rot: [[0, 0], [0.4, -6, 'out'], [0.9, 0]] }
        },
        events: [
            [0.38, 'cast'],
            [0.4, 'fire', { color: ICE, size: 1.8 }]
        ]
    },

    // 눈보라 춤 (몸통 스킬): 두 부채를 활짝 들어 올리고 빙글 도는 듯 몸을 흔듦 ('cast' = 눈보라가 퍼지는 순간)
    spin: {
        duration: 1.0,
        loop: false,
        tracks: {
            armF: { rot: [[0, 0], [0.25, -30, 'out'], [0.45, -10], [0.65, -30], [1.0, 0]] },
            armB: { rot: [[0, 0], [0.25, 28, 'out'], [0.45, 8], [0.65, 28], [1.0, 0]] },
            torso: { y: [[0, 0], [0.25, -8, 'out'], [0.45, 2], [0.65, -6], [1.0, 0]],
                     rot: [[0, 0], [0.25, -3], [0.45, 3], [0.65, -3], [1.0, 0]] },
            head: { rot: [[0, 0], [0.25, -4], [0.45, 3], [0.65, -4], [1.0, 0]] },
            hair: { rot: [[0, 0], [0.25, -7], [0.45, 4], [0.65, -7], [1.0, 0]] },
            legF: { y: [[0, 0], [0.25, -8], [0.45, 0], [1.0, 0]] },
            legB: { y: [[0, 0], [0.45, 0], [0.65, -8], [0.85, 0], [1.0, 0]] }
        },
        events: [
            [0.05, 'charge', { socket: 'chest', bone: 'torso', color: DUST }],
            [0.45, 'chargeEnd'],
            [0.45, 'cast']
        ]
    },

    // 영원한 안식 (필살기)·시전: 두 부채를 모아 앞으로 내밀며 얼음 결정을 피워 올림 ('cast' = 결정이 솟는 순간)
    cast: {
        duration: 1.0,
        loop: false,
        tracks: {
            armF: { rot: [[0, 0], [0.3, -34, 'out'], [0.48, 4, 'out'], [0.7, 0], [1.0, 0]] },
            armB: { rot: [[0, 0], [0.3, 30, 'out'], [0.48, -6, 'out'], [1.0, 0]] },
            torso: { y: [[0, 0], [0.3, -6], [0.48, 4, 'out'], [1.0, 0]],
                     rot: [[0, 0], [0.3, -3], [0.48, 2, 'out'], [1.0, 0]] },
            head: { rot: [[0, 0], [0.3, -6], [0.48, 2, 'out'], [1.0, 0]] },
            hair: { rot: [[0, 0], [0.3, -5], [0.48, 3, 'out'], [1.0, 0]] }
        },
        events: [
            [0.05, 'charge', { socket: 'crown', bone: 'head', color: DUST }],
            [0.48, 'chargeEnd'],
            [0.48, 'impact', { color: ICE }],
            [0.48, 'cast']
        ]
    },

    // 승리: 두 부채를 높이 들고 고개를 살짝 젖힌 채 우아하게 흔들림
    victory: {
        duration: 1.4,
        loop: true,
        tracks: {
            armF: { rot: [[0, -40], [0.7, -46], [1.4, -40]] },
            armB: { rot: [[0, 36], [0.7, 42], [1.4, 36]] },
            torso: { y: [[0, 0], [0.7, -4], [1.4, 0]], rot: [[0, -2], [0.7, 2], [1.4, -2]] },
            head: { rot: [[0, -5], [0.7, -3], [1.4, -5]] },
            hair: { rot: [[0, -3], [0.7, -7], [1.4, -3]] }
        },
        events: [[0.1, 'roar', { socket: 'crown', bone: 'head', color: DUST }]]
    }
};

export const FROST = {
    id: 'frost',
    name: '서리의 무희',
    assetDir: FROST_ASSET_DIR,
    bones: FROST_BONES,
    springs: FROST_SPRINGS,
    clips: FROST_CLIPS,
    arms: null,
    attack: 'attack_fan',
    hitSocket: ['fanF', 'armF'],
    upgrade: FROST_UPGRADE,
    skillClips: [['초승달 참격', 'crescent'], ['눈보라 춤', 'spin'], ['영원한 안식', 'cast']],   // rig_test.html 동작 버튼
    // 부채에서 흩날리는 서리 가루, 발밑에 깔리는 찬 안개
    ambient: [
        { kind: 'ember', socket: 'fanF', bone: 'armF', layer: 'front', rate: 3,
          offset: [0, 0], spread: [90, 90], size: [1.6, 2.8], life: [0.8, 1.4],
          vel: [[-10, 10], [10, 35]], color: DUST },
        { kind: 'ember', socket: 'fanB', bone: 'armB', layer: 'front', rate: 2,
          offset: [0, 0], spread: [90, 90], size: [1.6, 2.6], life: [0.8, 1.4],
          vel: [[-10, 10], [10, 35]], color: DUST },
        { kind: 'smoke', socket: 'footF', bone: 'legF', layer: 'back', rate: 3,
          offset: [-60, -10], spread: [160, 10], size: [26, 38], life: [1.2, 1.8],
          vel: [[-10, 10], [-12, -4]], color: '120, 170, 210', glow: '190, 230, 255' }
    ],
    debugSockets: FROST_DEBUG_SOCKETS,
    shadow: { rx: 200, ry: 26 }
};
