/* ==========================================================================
   PROJECT: MAD OVERLORD // 철거의 설계자 리그 데이터 (v2, 새 캐릭터 5 — D-079, MD/새캐릭터2종_설계안.md)
   파츠: tools/rig/cut_newchar_parts.py architect → tools/rig/cut_joints.py architect (Gemini 그림 6장, 오른쪽을 봄, 반전 없음).
   좌표 단위: 원본 이미지 픽셀. rot은 도(°), 화면 기준 +는 시계 방향.

   기본·강화 그림이 같은 뼈대를 씀: 부위 그림 <부위>(기본) ↔ <부위>_up(강화) — rigAvatar.applyUpgrades.
   반바지 아래로 다리가 드러나 길잡이처럼 다리를 번갈아 들어 딛는 걸음 (다리는 루트에 붙어 발이 미끄러지지 않음).
   앞팔(armF) = 공압 드릴을 앞으로 든 팔(강화: 큰 드릴 + 사슬), rot -는 드릴 끝을 들어 올림.
   손(handF) = 드릴·드릴 쥔 손 (손 지운 그림과의 차이 — 아래팔 대부분이 드릴 뒤라 손목이 어깨 가까이) → 드릴 떨림·반동만 ±6°.
   뒷팔(armB) = 몸 앞을 가로지르는 장갑 낀 빈손(강화: 유압 집게가 같이 붙음), rot -는 앞(오른쪽)으로 휘두름.
   ========================================================================== */

export const ARCHITECT_ASSET_DIR = 'assets/sprites/rig/architect/';

// 부모가 먼저 오도록 나열. z가 클수록 앞에 그림. 다리는 몸통(반바지) 뒤, 뒷팔(장갑·집게)은 몸 앞을 가로지름
export const ARCHITECT_BONES = [
    { name: 'root', parent: null },
    { name: 'legB', parent: 'root', part: 'legB', z: 1 },
    { name: 'legF', parent: 'root', part: 'legF', z: 2 },
    { name: 'torso', parent: 'root', part: 'torso', z: 3 },
    { name: 'head', parent: 'torso', part: 'head', z: 4 },
    { name: 'armB', parent: 'torso', part: 'armB', z: 5 },
    { name: 'armF', parent: 'torso', part: 'armF', z: 6 },
    { name: 'handF', parent: 'armF', part: 'handF', z: 5.5 }   // 드릴은 소맷부리 밑에
];

/** 강화 그림 (D-079): 큰 드릴은 더 길고 높음 → 드릴 끝 소켓, 뒷손은 유압 집게 → 집게 끝 소켓도 바꿈 */
export const ARCHITECT_UPGRADE = {
    parts: { head: ['head'], body: ['torso'], arm: ['armF', 'armB', 'handF'], leg: ['legF', 'legB'] },
    sockets: { arm: { muzzle: 'muzzleUp', hand: 'clawUp' } }
};

export const ARCHITECT_SPRINGS = [
    // 안전모: 착지 때 살짝 눌렸다 돌아옴
    { bone: 'head', channel: 'y', axis: 1, gain: 0.25, k: 230, damping: 11, limit: 4 },
    // 뒷손(강화: 유압 집게): 몸이 앞으로 가속하면 한 박자 늦게 뒤로(+) 흔들림
    { bone: 'armB', channel: 'rot', axis: 0, gain: -0.05, k: 80, damping: 6, limit: 6 }
];

export const ARCHITECT_DEBUG_SOCKETS = [
    ['muzzle', 'handF'],
    ['hand', 'armB'],
    ['lamp', 'head'],
    ['chest', 'torso'],
    ['footF', 'legF'],
    ['footB', 'legB']
];

const SPARK = '255, 170, 60';     // 드릴 불티·철거 (주황)
const STEEL = '200, 215, 235';    // 철골·설계도 (흰 강철빛)

export const ARCHITECT_CLIPS = {
    // 숨 쉬듯 몸통만 오르내림, 드릴은 앞으로 든 채 살짝 떨림
    idle: {
        duration: 2.2,
        loop: true,
        tracks: {
            handF: { rot: [[0, 0], [1.1, -1.5], [2.2, 0]] },
            torso: { y: [[0, 0], [1.1, 4], [2.2, 0]] },
            head: { rot: [[0, 0], [1.1, 1.5], [2.2, 0]] },
            armF: { rot: [[0, 0], [1.1, 2], [2.2, 0]] },
            armB: { rot: [[0, 0], [1.1, 3], [2.2, 0]] }
        }
    },

    // 한 사이클 = 앞발 딛기(0.4) + 뒷발 딛기(0.95). 작업화로 또박또박, 몸은 살짝 흔들림
    walk: {
        duration: 1.1,
        loop: true,
        tracks: {
            handF: { rot: [[0, 1], [0.55, -2], [1.1, 1]] },
            legF: {
                y: [[0, 0, 'out'], [0.2, -26, 'in'], [0.4, 0, 'linear'], [1.1, 0]],
                rot: [[0, 0, 'out'], [0.2, -6, 'in'], [0.4, 0, 'linear'], [1.1, 0]]
            },
            legB: {
                y: [[0, 0], [0.55, 0, 'out'], [0.75, -26, 'in'], [0.95, 0, 'linear'], [1.1, 0]],
                rot: [[0, 0], [0.55, 0, 'out'], [0.75, -6, 'in'], [0.95, 0, 'linear'], [1.1, 0]]
            },
            torso: {
                x: [[0, 0], [0.2, -4], [0.4, -1, 'out'], [0.55, 0], [0.75, 4], [0.95, 1, 'out'], [1.1, 0]],
                y: [[0, 0], [0.2, -5, 'in'], [0.4, 5, 'out'], [0.55, 0], [0.75, -5, 'in'], [0.95, 5, 'out'], [1.1, 0]],
                rot: [[0, 0], [0.2, -1], [0.4, 0.5, 'out'], [0.55, 0], [0.75, 1], [0.95, -0.5, 'out'], [1.1, 0]]
            },
            head: { rot: [[0, 0], [0.4, 1.5, 'out'], [0.55, 0], [0.95, 1.5, 'out'], [1.1, 0]] },
            armF: { rot: [[0, -2], [0.55, 3], [1.1, -2]] },
            armB: { rot: [[0, 4], [0.55, -4], [1.1, 4]] }
        },
        events: [
            [0.4, 'step', { foot: 'footF', bone: 'legF' }],
            [0.95, 'step', { foot: 'footB', bone: 'legB' }]
        ]
    },

    // 공압 드릴 (기본 공격): 0~0.3 드릴을 들이댐 → 0.3~1.0 드르륵 두 번 (드릴이 떨며 튐)
    attack_drill: {
        duration: 1.0,
        loop: true,
        loopFrom: 0.3,
        tracks: {
            handF: { rot: [[0, 0], [0.3, 2], [0.4, -4, 'out'], [0.47, 3], [0.54, -4], [0.62, 2], [0.75, 2], [0.82, -4, 'out'], [0.89, 3], [0.95, -3], [1.0, 2]] },
            armF: { rot: [[0, 0, 'out'], [0.3, 4], [0.4, 0, 'out'], [0.62, 4], [0.82, 0, 'out'], [1.0, 4]] },
            armB: { rot: [[0, 0], [0.3, 5], [1.0, 5]] },
            torso: {
                x: [[0, 0], [0.3, 4], [0.4, 8, 'out'], [0.62, 4], [0.82, 8, 'out'], [1.0, 4]],
                y: [[0, 0], [0.3, 3], [1.0, 3]]
            },
            head: { rot: [[0, 0], [0.3, -1.5], [1.0, -1.5]] }
        },
        events: [
            [0.12, 'charge', { color: SPARK }],
            [0.42, 'fire', { hit: 0.33, color: SPARK, size: 1.1 }],
            [0.84, 'fire', { hit: 0.33, color: SPARK, size: 1.1 }]
        ]
    },

    // 내려찍기 (기초 파쇄·말뚝 등): 드릴을 높이 들었다(0.28) 땅으로 박음(0.45 'impact'·'cast')
    slam: {
        duration: 0.95,
        loop: false,
        tracks: {
            armF: { rot: [[0, 0], [0.28, -34, 'in'], [0.45, 26, 'out'], [0.65, 20], [0.95, 0]] },
            handF: { rot: [[0, 0], [0.28, -4], [0.45, 6, 'out'], [0.6, -3], [0.7, 3], [0.95, 0]] },
            armB: { rot: [[0, 0], [0.28, 10], [0.45, -10], [0.95, 0]] },
            torso: { y: [[0, 0], [0.28, -6], [0.45, 10, 'out'], [0.65, 6], [0.95, 0]], rot: [[0, 0], [0.28, -3], [0.45, 4, 'out'], [0.95, 0]] },
            head: { rot: [[0, 0], [0.28, -3], [0.45, 3], [0.95, 0]] },
            legF: { rot: [[0, 0], [0.45, -4], [0.95, 0]] }
        },
        events: [[0.45, 'impact', { color: SPARK }], [0.45, 'cast']]
    },

    // 시전 (강제 재건·필살기): 뒷팔(집게)을 치켜들고 설계도를 펼치듯 → 앞으로 뻗어 'cast'
    cast: {
        duration: 1.0,
        loop: false,
        tracks: {
            handF: { rot: [[0, 0], [0.3, -4], [0.45, 3, 'out'], [1.0, 0]] },
            armF: { rot: [[0, 0], [0.3, -16, 'out'], [0.45, 4, 'out'], [0.7, 2], [1.0, 0]] },
            armB: { rot: [[0, 0], [0.3, 24, 'out'], [0.45, -30, 'out'], [0.7, -22], [1.0, 0]] },
            torso: { y: [[0, 0], [0.3, 6], [0.45, -4, 'out'], [1.0, 0]], rot: [[0, 0], [0.3, -3], [0.45, 3, 'out'], [1.0, 0]] },
            head: { rot: [[0, 0], [0.3, -5], [0.45, 2, 'out'], [1.0, 0]] }
        },
        events: [
            [0.05, 'charge', { socket: 'lamp', bone: 'head', color: STEEL }],
            [0.45, 'chargeEnd'],
            [0.45, 'impact', { color: SPARK }],
            [0.45, 'cast']
        ]
    },

    // 휘두르기 (집게·렌치·철구): 뒷팔을 뒤로 젖혔다(0.22) 앞으로 크게 휘둘러 'cast'(0.38)
    swing: {
        duration: 0.85,
        loop: false,
        tracks: {
            armB: { rot: [[0, 0], [0.22, 45, 'in'], [0.38, -65, 'out'], [0.58, -45], [0.85, 0]] },
            armF: { rot: [[0, 0], [0.22, 4], [0.38, -4], [0.85, 0]] },
            torso: { x: [[0, 0], [0.22, -8, 'in'], [0.38, 10, 'out'], [0.85, 0]], rot: [[0, 0], [0.22, -4], [0.38, 4, 'out'], [0.85, 0]] },
            head: { rot: [[0, 0], [0.22, -3], [0.38, 3], [0.85, 0]] }
        },
        events: [[0.38, 'cast'], [0.38, 'impact', { color: STEEL }]]
    },

    // 던지기 (폭탄·훅·말뚝): 드릴 팔을 뒤로 젖혔다 앞으로 뿌림(0.35 'cast')
    throw: {
        duration: 0.8,
        loop: false,
        tracks: {
            armF: { rot: [[0, 0], [0.2, -30, 'in'], [0.35, 14, 'out'], [0.55, 8], [0.8, 0]] },
            armB: { rot: [[0, 0], [0.2, 8], [0.35, -6], [0.8, 0]] },
            torso: { x: [[0, 0], [0.2, -8, 'in'], [0.35, 10, 'out'], [0.8, 0]], rot: [[0, 0], [0.2, -4], [0.35, 4, 'out'], [0.8, 0]] },
            head: { rot: [[0, 0], [0.2, -3], [0.35, 3], [0.8, 0]] }
        },
        events: [[0.35, 'cast'], [0.35, 'fire', { color: SPARK, size: 1.2 }]]
    },

    // 승리: 드릴을 하늘로 치켜들고 돌리며 통통 뜀, 작업등이 반짝
    victory: {
        duration: 1.0,
        loop: true,
        tracks: {
            handF: { rot: [[0, -3], [0.25, 3], [0.5, -3], [0.75, 3], [1.0, -3]] },
            armF: { rot: [[0, -30], [0.5, -36], [1.0, -30]] },
            armB: { rot: [[0, -12], [0.5, 12], [1.0, -12]] },
            torso: { y: [[0, 4], [0.5, -6], [1.0, 4]], rot: [[0, -2], [0.5, -3], [1.0, -2]] },
            head: { rot: [[0, -4], [0.5, -7], [1.0, -4]] },
            legF: { y: [[0, 0], [0.5, -6], [1.0, 0]] },
            legB: { y: [[0, -6], [0.5, 0], [1.0, -6]] }
        },
        events: [[0.1, 'roar', { socket: 'lamp', bone: 'head', color: STEEL }]]
    }
};

export const ARCHITECT = {
    id: 'architect',
    name: '철거의 설계자',
    assetDir: ARCHITECT_ASSET_DIR,
    bones: ARCHITECT_BONES,
    springs: ARCHITECT_SPRINGS,
    clips: ARCHITECT_CLIPS,
    arms: null,
    attack: 'attack_drill',
    hitSocket: ['muzzle', 'handF'],
    upgrade: ARCHITECT_UPGRADE,
    skillClips: [['내려찍기', 'slam'], ['시전 동작', 'cast'], ['휘두르기', 'swing'], ['던지기', 'throw']],   // rig_test.html 동작 버튼
    // 드릴 끝 주황 불티, 작업등 둘레 흰 빛가루
    ambient: [
        { kind: 'ember', socket: 'muzzle', bone: 'handF', layer: 'front', rate: 2,
          offset: [0, 0], spread: [14, 8], size: [1.4, 2.4], life: [0.3, 0.6],
          vel: [[10, 50], [-30, 10]], color: SPARK },
        { kind: 'ember', socket: 'lamp', bone: 'head', layer: 'front', rate: 1,
          offset: [0, 0], spread: [30, 10], size: [1.4, 2.2], life: [0.6, 1.0],
          vel: [[-6, 6], [-30, -12]], color: STEEL }
    ],
    debugSockets: ARCHITECT_DEBUG_SOCKETS,
    shadow: { rx: 190, ry: 26 }
};
