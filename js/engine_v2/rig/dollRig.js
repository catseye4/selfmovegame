/* ==========================================================================
   PROJECT: MAD OVERLORD // 뒤틀린 인형사 리그 데이터 (v2, 새 캐릭터 4 — D-046·D-049)
   파츠: tools/rig/cut_newchar_parts.py doll 이 Gemini 그림 4장에서 분리 (얼굴은 오른쪽, 몸은 3/4 정면).
   좌표 단위: 원본 이미지 픽셀. rot은 도(°), 화면 기준 +는 시계 방향.

   기본·강화 그림이 같은 뼈대를 씀: 부위 그림 <부위>(기본) ↔ <부위>_up(강화) — rigAvatar.applyUpgrades.
   등 뒤 꼭두각시 십자틀·청록 실·실에 매달린 토끼 인형은 몸통 조각 (몸과 같이 흔들림).
     앞팔(armF) = 재단 가위(강화: 가위 칼날 집게), 어깨에서 오른쪽 아래 40° → rot -는 가위를 들어 올림
     뒷팔(armB) = 나무 손(강화: 황동 대포 — 몸 앞을 가로지름), 어깨에서 왼쪽 아래 → rot +가 들어 올림
   앞치마가 허벅지를 덮어 다리는 몸통 뒤에서 들어 올리는 삐걱이는 인형 걸음 (다리는 루트에 붙어 발이 미끄러지지 않음).
   ========================================================================== */

export const DOLL_ASSET_DIR = 'assets/sprites/rig/doll/';

// 부모가 먼저 오도록 나열. z가 클수록 앞에 그림
export const DOLL_BONES = [
    { name: 'root', parent: null },
    { name: 'legB', parent: 'root', part: 'legB', z: 1 },
    { name: 'legF', parent: 'root', part: 'legF', z: 2 },
    { name: 'torso', parent: 'root', part: 'torso', z: 3 },
    { name: 'head', parent: 'torso', part: 'head', z: 4 },
    { name: 'armB', parent: 'torso', part: 'armB', z: 5 },
    { name: 'armF', parent: 'torso', part: 'armF', z: 6 }
];

/** 강화 그림 (D-044): 강화 팔은 가위 칼날 집게(끝이 더 멂)와 대포(뒷손 자리에 포구) → 소켓도 바꿈 */
export const DOLL_UPGRADE = {
    parts: { head: ['head'], body: ['torso'], arm: ['armF', 'armB'], leg: ['legF', 'legB'] },
    sockets: { arm: { blade: 'bladeUp', hand: 'cannon' } }
};

export const DOLL_SPRINGS = [
    // 나무 인형 머리: 걸음마다 덜컥이며 한 박자 늦게 끄덕임
    { bone: 'head', channel: 'rot', axis: 1, gain: -0.05, k: 120, damping: 6, limit: 5 },
    { bone: 'head', channel: 'y', axis: 1, gain: 0.3, k: 240, damping: 11, limit: 5 }
];

export const DOLL_DEBUG_SOCKETS = [
    ['blade', 'armF'],
    ['hand', 'armB'],
    ['eye', 'head'],
    ['spool', 'torso'],
    ['crossL', 'torso'],
    ['crossR', 'torso'],
    ['footF', 'legF'],
    ['footB', 'legB']
];

const STEEL = '220, 235, 245';    // 가위 날
const THREAD = '90, 230, 240';    // 청록 실

export const DOLL_CLIPS = {
    // 숨 쉬듯 몸통이 오르내리고, 가위를 살짝 벌렸다 오므리듯 흔듦
    idle: {
        duration: 2.2,
        loop: true,
        tracks: {
            torso: { y: [[0, 0], [1.1, 4], [2.2, 0]], rot: [[0, 0], [1.1, 1], [2.2, 0]] },
            head: { rot: [[0, 0], [0.55, -3], [1.1, 2], [1.65, -1], [2.2, 0]] },
            armF: { rot: [[0, 0], [1.1, -4], [2.2, 0]] },
            armB: { rot: [[0, 0], [1.1, 4], [2.2, 0]] }
        }
    },

    // 한 사이클 = 앞발 딛기(0.34) + 뒷발 딛기(0.84). 관절이 삐걱이듯 끊어지는 움직임, 고개가 갸웃거림
    walk: {
        duration: 1.0,
        loop: true,
        tracks: {
            legF: {
                y: [[0, 0, 'out'], [0.17, -22, 'in'], [0.34, 0, 'linear'], [1.0, 0]],
                rot: [[0, 0, 'out'], [0.17, -7, 'in'], [0.34, 0, 'linear'], [1.0, 0]]
            },
            legB: {
                y: [[0, 0], [0.5, 0, 'out'], [0.67, -22, 'in'], [0.84, 0, 'linear'], [1.0, 0]],
                rot: [[0, 0], [0.5, 0, 'out'], [0.67, -7, 'in'], [0.84, 0, 'linear'], [1.0, 0]]
            },
            torso: {
                x: [[0, 0], [0.17, -3, 'step'], [0.34, -1], [0.5, 0], [0.67, 3, 'step'], [0.84, 1], [1.0, 0]],
                y: [[0, 0], [0.17, -6, 'in'], [0.34, 4, 'out'], [0.5, 0], [0.67, -6, 'in'], [0.84, 4, 'out'], [1.0, 0]],
                rot: [[0, -1.5], [0.5, 1.5], [1.0, -1.5]]
            },
            head: { rot: [[0, -3], [0.25, 3, 'step'], [0.5, -3], [0.75, 3, 'step'], [1.0, -3]] },
            armF: { rot: [[0, -6], [0.5, 6], [1.0, -6]] },
            armB: { rot: [[0, -6], [0.5, 8], [1.0, -6]] }
        },
        events: [
            [0.34, 'step', { foot: 'footF', bone: 'legF' }],
            [0.84, 'step', { foot: 'footB', bone: 'legB' }]
        ]
    },

    // 가위 참격 (기본 공격): 가위를 당겼다가 두 번 찔러 자름 (0.38, 0.7 — 각 반 타)
    attack_snip: {
        duration: 1.0,
        loop: true,
        tracks: {
            armF: { rot: [[0, 0], [0.25, 16, 'in'], [0.38, -22, 'out'], [0.52, 6, 'in'], [0.7, -24, 'out'], [1.0, 0]] },
            armB: { rot: [[0, 0], [0.25, -8], [0.38, 6], [0.52, -6], [0.7, 8], [1.0, 0]] },
            torso: {
                x: [[0, 0], [0.25, -6, 'in'], [0.38, 8, 'out'], [0.52, -2], [0.7, 9, 'out'], [1.0, 0]],
                rot: [[0, 0], [0.25, -2], [0.38, 2.5, 'out'], [0.52, -1], [0.7, 3, 'out'], [1.0, 0]]
            },
            head: { rot: [[0, 0], [0.38, 4], [0.52, -2], [0.7, 5], [1.0, 0]] }
        },
        events: [
            [0.38, 'impact', { hit: 0.5, socket: 'blade', bone: 'armF', color: STEEL }],
            [0.7, 'impact', { hit: 0.5, socket: 'blade', bone: 'armF', color: STEEL }]
        ]
    },

    // 가위 참격 X자 (팔 스킬): 가위를 높이 들었다가 내리긋고 다시 올려 그어 X자 ('cast' = 첫 번째 긋기)
    xcut: {
        duration: 0.95,
        loop: false,
        tracks: {
            armF: { rot: [[0, 0], [0.28, -55, 'in'], [0.4, 30, 'out'], [0.5, 34], [0.62, -40, 'out'], [0.95, 0]] },
            armB: { rot: [[0, 0], [0.28, 14], [0.4, -8], [0.62, 10], [0.95, 0]] },
            torso: {
                x: [[0, 0], [0.28, -8, 'in'], [0.4, 10, 'out'], [0.62, 12, 'out'], [0.95, 0]],
                rot: [[0, 0], [0.28, -4, 'in'], [0.4, 4, 'out'], [0.62, -2], [0.95, 0]]
            },
            head: { rot: [[0, 0], [0.28, -5], [0.4, 5], [0.62, -3], [0.95, 0]] }
        },
        events: [[0.4, 'cast']]
    },

    // 인형 가족 (몸통 스킬)·시전: 두 팔을 들어 실을 당기듯 휘저음 ('cast' = 인형이 내려서는 순간)
    cast: {
        duration: 1.0,
        loop: false,
        tracks: {
            armF: { rot: [[0, 0], [0.3, -40, 'out'], [0.4, -30], [0.5, -42], [0.6, -32], [1.0, 0]] },
            armB: { rot: [[0, 0], [0.3, 36, 'out'], [0.4, 26], [0.5, 38], [0.6, 28], [1.0, 0]] },
            torso: { y: [[0, 0], [0.3, -6], [0.6, -4], [1.0, 0]], rot: [[0, 0], [0.3, -2], [0.6, 2], [1.0, 0]] },
            head: { rot: [[0, 0], [0.3, -6], [0.45, 4], [0.6, -4], [1.0, 0]] }
        },
        events: [
            [0.05, 'charge', { socket: 'spool', bone: 'torso', color: THREAD }],
            [0.45, 'chargeEnd'],
            [0.45, 'cast']
        ]
    },

    // 인형 실 (머리 필살기): 양팔을 높이 들고 손가락을 놀리듯 떨며 적을 조종 ('cast' = 실이 적에게 닿는 순간)
    strings: {
        duration: 1.2,
        loop: false,
        tracks: {
            armF: { rot: [[0, 0], [0.3, -60, 'out'], [0.4, -52], [0.5, -62], [0.6, -54], [0.7, -62], [1.2, 0]] },
            armB: { rot: [[0, 0], [0.3, 55, 'out'], [0.4, 47], [0.5, 57], [0.6, 49], [0.7, 57], [1.2, 0]] },
            torso: { y: [[0, 0], [0.3, -10, 'out'], [0.8, -8], [1.2, 0]], rot: [[0, 0], [0.3, -3], [0.8, -3], [1.2, 0]] },
            head: { rot: [[0, 0], [0.3, -8], [0.5, 6], [0.7, -6], [1.2, 0]] }
        },
        events: [
            [0.05, 'charge', { socket: 'eye', bone: 'head', color: THREAD }],
            [0.5, 'chargeEnd'],
            [0.5, 'cast']
        ]
    },

    // 승리: 가위를 높이 들어 짤깍이고 고개를 갸웃거리며 덩실거림
    victory: {
        duration: 1.0,
        loop: true,
        tracks: {
            armF: { rot: [[0, -50], [0.25, -40], [0.5, -55], [0.75, -40], [1.0, -50]] },
            armB: { rot: [[0, 30], [0.5, 40], [1.0, 30]] },
            torso: { y: [[0, 0], [0.5, -8], [1.0, 0]], rot: [[0, -2], [0.5, 2], [1.0, -2]] },
            head: { rot: [[0, -6], [0.5, 6], [1.0, -6]] },
            legF: { y: [[0, 0], [0.5, -6], [1.0, 0]] },
            legB: { y: [[0, -6], [0.5, 0], [1.0, -6]] }
        },
        events: [[0.1, 'roar', { socket: 'eye', bone: 'head', color: THREAD }]]
    }
};

export const DOLL = {
    id: 'doll',
    name: '뒤틀린 인형사',
    assetDir: DOLL_ASSET_DIR,
    bones: DOLL_BONES,
    springs: DOLL_SPRINGS,
    clips: DOLL_CLIPS,
    arms: null,
    attack: 'attack_snip',
    hitSocket: ['blade', 'armF'],
    upgrade: DOLL_UPGRADE,
    skillClips: [['가위 참격 X자', 'xcut'], ['인형 가족', 'cast'], ['인형 실', 'strings']],   // rig_test.html 동작 버튼
    // 십자틀 양 끝에서 실을 따라 흘러내리는 청록 빛
    ambient: [
        { kind: 'ember', socket: 'crossL', bone: 'torso', layer: 'front', rate: 3,
          offset: [0, 40], spread: [20, 60], size: [1.6, 2.6], life: [0.9, 1.5],
          vel: [[-4, 4], [30, 60]], color: THREAD },
        { kind: 'ember', socket: 'crossR', bone: 'torso', layer: 'front', rate: 2,
          offset: [0, 40], spread: [20, 60], size: [1.6, 2.6], life: [0.9, 1.5],
          vel: [[-4, 4], [30, 60]], color: THREAD }
    ],
    debugSockets: DOLL_DEBUG_SOCKETS,
    shadow: { rx: 210, ry: 26 }
};
