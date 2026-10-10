/* ==========================================================================
   PROJECT: MAD OVERLORD // 심연의 길잡이 리그 데이터 (v2, 새 캐릭터 1 — D-044)
   파츠: tools/rig/cut_newchar_parts.py diver 가 Gemini 그림 4장에서 분리 (오른쪽을 봄, 반전 없음).
   좌표 단위: 원본 이미지 픽셀. rot은 도(°), 화면 기준 +는 시계 방향.

   기본·강화 그림이 같은 뼈대를 씀: 부위 그림 <부위>(기본) ↔ <부위>_up(강화)을 setPart로 바꿔 끼움.
   무거운 잠수복 → 합성괴인처럼 다리를 번갈아 들어 올렸다 내려딛는 묵직한 걸음 (다리는 루트에 붙어 발이 미끄러지지 않음).
   물대포 팔(armF)은 어깨에서 오른쪽 아래 35°를 향하므로 rot -는 총구를 들어 올림.
   팔 한 장이 몸통 옆면에 붙어 있어 피벗을 어깨와 몸통이 맞닿은 가운데에 두고, 20°쯤 넘게 돌리면 이음새가 벌어짐.
   앵커 쥔 손(armB)은 손목에서 매달린 앵커가 오른쪽 아래로 늘어져 있어 rot -는 앵커를 앞으로, +는 뒤로.
   ========================================================================== */

export const DIVER_ASSET_DIR = 'assets/sprites/rig/diver/';

// 부모가 먼저 오도록 나열. z가 클수록 앞에 그림. 앵커는 다리 위로 늘어지므로 다리 앞.
export const DIVER_BONES = [
    { name: 'root', parent: null },
    { name: 'legB', parent: 'root', part: 'legB', z: 1 },
    { name: 'legF', parent: 'root', part: 'legF', z: 2 },
    { name: 'torso', parent: 'root', part: 'torso', z: 3 },
    { name: 'head', parent: 'torso', part: 'head', z: 4 },
    { name: 'armB', parent: 'torso', part: 'armB', z: 5 },
    { name: 'armF', parent: 'torso', part: 'armF', z: 6 }
];

/** 강화 그림 (D-044): 슬롯별로 강화 파츠를 끼우면 그 부위 뼈의 그림만 <부위>_up으로 (rigAvatar.applyUpgrades)
 *  강화 물대포는 60px 더 길어 총구 소켓도 바꿈 */
export const DIVER_UPGRADE = {
    parts: { head: ['head'], body: ['torso'], arm: ['armF', 'armB'], leg: ['legF', 'legB'] },
    sockets: { arm: { muzzle: 'muzzleUp' } }
};

export const DIVER_SPRINGS = [
    // 앵커: 몸이 앞으로 가속하면 매달린 앵커가 한 박자 늦게 뒤로(+) 흔들림
    { bone: 'armB', channel: 'rot', axis: 0, gain: -0.08, k: 70, damping: 5, limit: 10 },
    // 무거운 잠수모: 착지 때 살짝 눌렸다 돌아옴
    { bone: 'head', channel: 'y', axis: 1, gain: 0.3, k: 220, damping: 11, limit: 5 }
];

export const DIVER_DEBUG_SOCKETS = [
    ['muzzle', 'armF'],
    ['anchor', 'armB'],
    ['eye', 'head'],
    ['lamp', 'torso'],
    ['footF', 'legF'],
    ['footB', 'legB']
];

const WATER = '90, 225, 235';      // 고압 방수포 물줄기
const ABYSS = '40, 220, 190';      // 청록 유령 불길 (등불·심연의 손)
const AIM = -16;                   // 물대포를 들어 겨눈 각도 (어깨가 몸통 옆에 붙은 그림이라 많이 돌리면 틈이 보임)

export const DIVER_CLIPS = {
    // 숨 쉬듯 몸통만 오르내림 (다리는 루트에 붙어 고정), 물대포는 아래로 늘어뜨림
    idle: {
        duration: 2.6,
        loop: true,
        tracks: {
            torso: { y: [[0, 0], [1.3, 5], [2.6, 0]] },
            head: { rot: [[0, 0], [1.3, 1.2], [2.6, 0]] },
            armF: { rot: [[0, 0], [1.3, 3], [2.6, 0]] },
            armB: { rot: [[0, 0], [1.3, -2], [2.6, 0]] }
        }
    },

    // 한 사이클 = 앞발 딛기(0.5) + 뒷발 딛기(1.15). 드는 발 반대쪽으로 체중을 싣고 딛을 때 무릎을 굽히듯 몸이 내려앉음
    walk: {
        duration: 1.3,
        loop: true,
        tracks: {
            legF: {
                y: [[0, 0, 'out'], [0.25, -34, 'in'], [0.5, 0, 'linear'], [1.3, 0]],
                rot: [[0, 0, 'out'], [0.25, -6, 'in'], [0.5, 0, 'linear'], [1.3, 0]]
            },
            legB: {
                y: [[0, 0], [0.65, 0, 'out'], [0.9, -34, 'in'], [1.15, 0, 'linear'], [1.3, 0]],
                rot: [[0, 0], [0.65, 0, 'out'], [0.9, -7, 'in'], [1.15, 0, 'linear'], [1.3, 0]]
            },
            torso: {
                x: [[0, 0], [0.25, -6], [0.5, -2, 'out'], [0.65, 0], [0.9, 6], [1.15, 2, 'out'], [1.3, 0]],
                y: [[0, 0], [0.25, -5, 'in'], [0.5, 7, 'out'], [0.65, 0], [0.9, -5, 'in'], [1.15, 7, 'out'], [1.3, 0]],
                rot: [[0, 0], [0.25, -1.5], [0.5, 0.6, 'out'], [0.65, 0], [0.9, 1.5], [1.15, -0.6, 'out'], [1.3, 0]]
            },
            head: { rot: [[0, 0], [0.5, 1.5, 'out'], [0.65, 0], [1.15, 1.5, 'out'], [1.3, 0]] },
            armF: { rot: [[0, -4], [0.65, 5], [1.3, -4]] },
            armB: { rot: [[0, 5], [0.65, -5], [1.3, 5]] }
        },
        events: [
            [0.5, 'step', { foot: 'footF', bone: 'legF' }],
            [1.15, 'step', { foot: 'footB', bone: 'legB' }]
        ]
    },

    // 고압 방수포: 0~0.3 겨눔 → 0.3~0.6 압력 충전 → 0.6~1.2 물줄기 연사 구간 반복 (반동으로 몸이 밀림)
    attack_water: {
        duration: 1.2,
        loop: true,
        loopFrom: 0.6,
        tracks: {
            armF: {
                rot: [[0, 0, 'out'], [0.3, AIM], [0.45, AIM + 1.5], [0.6, AIM, 'out'],
                      [0.63, AIM - 4], [0.8, AIM, 'out'], [0.83, AIM - 4], [1.0, AIM, 'out'], [1.03, AIM - 4], [1.2, AIM]]
            },
            armB: { rot: [[0, 0], [0.3, 6], [1.2, 6]] },
            torso: {
                x: [[0, 0], [0.3, -2], [0.6, -2, 'out'], [0.63, -7], [0.8, -2, 'out'], [0.83, -7], [1.0, -2, 'out'],
                    [1.03, -7], [1.2, -2]],
                y: [[0, 0], [0.3, 5], [1.2, 5]],
                rot: [[0, 0], [0.3, -1.5], [1.2, -1.5]]
            },
            head: { rot: [[0, 0], [0.3, -2], [1.2, -2]] }
        },
        events: [
            [0.3, 'charge', { color: WATER }],
            [0.62, 'fire', { hit: 0.2, color: WATER, size: 1.6 }],
            [0.82, 'fire', { hit: 0.2, color: WATER, size: 1.6 }],
            [1.02, 'fire', { hit: 0.2, color: WATER, size: 1.6 }]
        ]
    },

    // 앵커 견인 (스킬): 앵커를 뒤로 크게 젖혔다 앞으로 던짐('cast' = 앵커가 손을 떠나는 순간) →
    // 몸을 뒤로 젖혀 밧줄을 당김 ('impact' = 끌려온 적이 발 앞에 떨어짐). 한 번 재생
    anchor: {
        duration: 1.3,
        loop: false,
        tracks: {
            armB: { rot: [[0, 0], [0.3, 38, 'out'], [0.45, -75, 'out'], [0.7, -60], [0.95, 20, 'in'], [1.3, 0]] },
            armF: { rot: [[0, 0], [0.3, 8], [0.45, -6], [0.95, 6], [1.3, 0]] },
            torso: {
                x: [[0, 0], [0.3, -10, 'in'], [0.45, 14, 'out'], [0.7, 10], [0.95, -14, 'in'], [1.3, 0]],
                y: [[0, 0], [0.3, 6], [0.45, -3, 'out'], [0.95, 6], [1.3, 0]],
                rot: [[0, 0], [0.3, -3, 'in'], [0.45, 4, 'out'], [0.7, 3], [0.95, -4, 'in'], [1.3, 0]]
            },
            head: { rot: [[0, 0], [0.3, -3], [0.45, 4], [0.95, -4], [1.3, 0]] },
            legF: { rot: [[0, 0], [0.45, -4, 'out'], [0.95, 2], [1.3, 0]] }
        },
        events: [
            [0.45, 'cast'],
            [0.95, 'impact', { socket: 'anchor', bone: 'armB', color: ABYSS }]
        ]
    },

    // 스킬 시전 (고압 분사 · 심연의 손): 웅크려 압력을 모았다가 물대포를 들어 한 번에 해방
    cast: {
        duration: 0.9,
        loop: false,
        tracks: {
            torso: { y: [[0, 0], [0.3, 12, 'out'], [0.42, -4, 'out'], [0.9, 0]],
                     rot: [[0, 0], [0.3, 2], [0.42, -3, 'out'], [0.9, 0]] },
            armF: { rot: [[0, 0], [0.3, 8, 'out'], [0.42, -22, 'out'], [0.62, -19], [0.9, 0]] },
            armB: { rot: [[0, 0], [0.3, 12], [0.42, -20, 'out'], [0.9, 0]] },
            head: { rot: [[0, 0], [0.3, 3], [0.42, -4, 'out'], [0.9, 0]] }
        },
        events: [
            [0.05, 'charge', { color: ABYSS }],
            [0.42, 'chargeEnd'],
            [0.42, 'impact', { color: ABYSS }],
            [0.42, 'cast']
        ]
    },

    // 승리: 물대포를 비스듬히 치켜들어 물을 뿜고 앵커를 흔들며 들썩임
    victory: {
        duration: 1.0,
        loop: true,
        tracks: {
            armF: { rot: [[0, -20], [0.5, -24], [1.0, -20]] },
            armB: { rot: [[0, -25], [0.5, 15], [1.0, -25]] },
            torso: { y: [[0, 6], [0.5, -4], [1.0, 6]], rot: [[0, -4], [0.5, -6], [1.0, -4]] },
            head: { rot: [[0, -5], [0.5, -7], [1.0, -5]] }
        },
        events: [[0.1, 'fire', { color: WATER, size: 1.4 }], [0.6, 'fire', { color: WATER, size: 1.4 }]]
    }
};

export const DIVER = {
    id: 'diver',
    name: '심연의 길잡이',
    assetDir: DIVER_ASSET_DIR,
    bones: DIVER_BONES,
    springs: DIVER_SPRINGS,
    clips: DIVER_CLIPS,
    arms: null,
    attack: 'attack_water',
    hitSocket: ['muzzle', 'armF'],
    upgrade: DIVER_UPGRADE,
    skillClips: [['앵커 견인', 'anchor'], ['시전 동작', 'cast']],   // rig_test.html 동작 버튼
    // 등불에서 피어오르는 청록 유령 불티, 물대포 끝에서 떨어지는 물방울
    ambient: [
        { kind: 'ember', socket: 'lamp', bone: 'torso', layer: 'front', rate: 4,
          offset: [0, -10], spread: [40, 30], size: [2, 3.5], life: [0.8, 1.3],
          vel: [[-10, 10], [-60, -30]], color: '120, 255, 225' },
        { kind: 'drip', socket: 'muzzle', bone: 'armF', rate: 1.5, spread: [16, 8], size: [4, 6],
          life: [3, 3], vel: [[-8, 8], [0, 20]], color: WATER }
    ],
    debugSockets: DIVER_DEBUG_SOCKETS,
    shadow: { rx: 230, ry: 30 }
};
