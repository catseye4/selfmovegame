/* ==========================================================================
   PROJECT: MAD OVERLORD // 거대괴수(자연의 분노) 리그 데이터 (v2)
   파츠: tools/rig/cut_kaiju_parts.py 가 Gemini 이미지에서 분리 (원본을 3배 확대한 좌표).
   좌표 단위: 원본 이미지 픽셀(3배). rot은 도(°), 화면 기준 +는 시계 방향.

   측면 구도(오른쪽을 봄) → 무릎 아래 다리를 앞뒤로 휘두르는 뒤뚱 걷기.
   다리 뼈는 무릎 기준으로 아래를 향하므로 rot -는 발이 앞(오른쪽)으로, +는 뒤로.
   꼬리는 왼쪽을 향하므로 rot +는 꼬리 끝이 위로, -는 아래로.
   ========================================================================== */

export const KAIJU_ASSET_DIR = 'assets/sprites/rig/kaiju/';

// 부모가 먼저 오도록 나열. z가 클수록 앞에 그림.
// 꼬리는 마디마다 부모 뒤에 그려 이음새를 가리고, 다리는 넓적다리 살집(몸통) 뒤에서 흔든다.
export const KAIJU_BONES = [
    { name: 'root', parent: null },
    { name: 'legF', parent: 'root', part: 'legF', z: 3 },
    { name: 'legN', parent: 'root', part: 'legN', z: 4 },
    { name: 'body', parent: 'root', part: 'body', z: 5 },
    { name: 'tail1', parent: 'body', part: 'tail1', z: 2 },
    { name: 'tail2', parent: 'tail1', part: 'tail2', z: 1 },
    { name: 'tail3', parent: 'tail2', part: 'tail3', z: 0 },
    { name: 'head', parent: 'body', part: 'head', z: 6 },
    { name: 'jaw', parent: 'head', part: 'jaw', z: 7 },
    { name: 'armF', parent: 'body', part: 'armF', z: 8 }
];

// 2차 모션: 꼬리는 마디가 갈수록 크게 휘어 채찍처럼 따라옴
export const KAIJU_SPRINGS = [
    { bone: 'tail1', channel: 'rot', axis: 1, gain: -0.06, k: 90, damping: 7, limit: 6 },
    { bone: 'tail2', channel: 'rot', axis: 1, gain: -0.10, k: 70, damping: 6, limit: 10 },
    { bone: 'tail3', channel: 'rot', axis: 1, gain: -0.14, k: 60, damping: 5, limit: 14 },
    { bone: 'head', channel: 'y', axis: 1, gain: 0.35, k: 240, damping: 11, limit: 6 },
    { bone: 'armF', channel: 'rot', axis: 1, gain: 0.08, k: 90, damping: 8, limit: 6 }
];

export const KAIJU_DEBUG_SOCKETS = [
    ['mouth', 'head'],
    ['footN', 'legN'],
    ['footF', 'legF']
];

export const KAIJU_CLIPS = {
    idle: {
        duration: 2.4,
        loop: true,
        tracks: {
            body: { y: [[0, 0], [1.2, 6], [2.4, 0]], rot: [[0, 0], [1.2, -0.6], [2.4, 0]] },
            head: { rot: [[0, 0], [1.2, -1.5], [2.4, 0]] },
            jaw: { rot: [[0, 0], [0.8, -6], [1.6, 0], [2.4, 0]] },
            armF: { rot: [[0, 0], [1.2, 4], [2.4, 0]] },
            tail1: { rot: [[0, 0], [1.2, 3], [2.4, 0]] },
            tail2: { rot: [[0, 0], [1.2, 4], [2.4, 0]] },
            tail3: { rot: [[0, 0], [1.2, 6], [2.4, 0]] }
        }
    },

    // 한 사이클 = 앞발 딛기(0) + 뒷발 딛기(0.6). 휘두르는 다리는 들어 올렸다 내림
    walk: {
        duration: 1.2,
        loop: true,
        tracks: {
            legN: {
                rot: [[0, -16], [0.6, 14], [1.2, -16]],
                y: [[0, 0], [0.6, 0, 'out'], [0.9, -24, 'in'], [1.2, 0]]
            },
            legF: {
                rot: [[0, 14], [0.6, -16], [1.2, 14]],
                y: [[0, 0, 'out'], [0.3, -24, 'in'], [0.6, 0], [1.2, 0]]
            },
            body: {
                y: [[0, 10, 'out'], [0.3, -6, 'in'], [0.6, 10, 'out'], [0.9, -6, 'in'], [1.2, 10]],
                rot: [[0, -1], [0.3, 1], [0.6, -1], [0.9, 1], [1.2, -1]],
                x: [[0, 4], [0.6, -4], [1.2, 4]]
            },
            head: { rot: [[0, 2], [0.3, -1], [0.6, 2], [0.9, -1], [1.2, 2]] },
            jaw: { rot: [[0, 0], [0.6, -4], [1.2, 0]] },
            armF: { rot: [[0, -6], [0.6, 6], [1.2, -6]] },
            tail1: { rot: [[0, 4], [0.6, -4], [1.2, 4]] },
            tail2: { rot: [[0, -2], [0.3, 4], [0.9, -4], [1.2, -2]] }
        },
        events: [
            [0, 'stomp', { foot: 'footN', bone: 'legN' }],
            [0.6, 'stomp', { foot: 'footF', bone: 'legF' }]
        ]
    },

    // 물기: 0~0.35 뒤로 젖히며 입 크게 벌림 → 0.47 앞으로 덮치며 턱 닫기(타격) → 복귀
    attack_bite: {
        duration: 1.1,
        loop: true,
        tracks: {
            body: {
                x: [[0, 0], [0.35, -18, 'in'], [0.47, 36, 'out'], [0.7, 28], [1.1, 0]],
                y: [[0, 0], [0.35, 4], [0.47, -2], [1.1, 0]],
                rot: [[0, 0], [0.35, -4, 'in'], [0.47, 5, 'out'], [0.7, 4], [1.1, 0]]
            },
            head: { rot: [[0, 0], [0.35, -8, 'in'], [0.47, 8, 'out'], [0.7, 6], [1.1, 0]] },
            jaw: { rot: [[0, 0], [0.3, 14, 'in'], [0.45, -12, 'out'], [0.7, -10], [1.1, 0]] },
            armF: { rot: [[0, 0], [0.35, -15, 'in'], [0.47, 20, 'out'], [0.8, 10], [1.1, 0]] },
            tail1: { rot: [[0, 0], [0.35, 6], [0.47, -6, 'out'], [1.1, 0]] }
        },
        events: [[0.46, 'impact', { hit: 1, color: '170, 255, 40', splash: true }]]
    },

    // 승리 = 포효: 몸을 젖히고 머리를 들어 입을 크게 벌린 채 떨며 포효
    victory: {
        duration: 1.6,
        loop: true,
        tracks: {
            body: { rot: [[0, 0], [0.4, -6, 'out'], [1.2, -6], [1.6, 0]], y: [[0, 0], [0.4, -8], [1.2, -8], [1.6, 0]] },
            head: {
                rot: [[0, 0], [0.4, -10, 'out'], [0.5, -8.5], [0.6, -10], [0.7, -8.5], [0.8, -10], [0.9, -8.5],
                      [1.0, -10], [1.2, -9], [1.6, 0]]
            },
            jaw: { rot: [[0, 0], [0.4, 16, 'out'], [1.2, 16], [1.6, 0]] },
            armF: { rot: [[0, 0], [0.4, -25], [1.2, -25], [1.6, 0]] },
            tail1: { rot: [[0, 0], [0.4, 8], [1.2, 8], [1.6, 0]] }
        },
        events: [[0.4, 'roar']]
    }
};

export const KAIJU = {
    id: 'kaiju',
    name: '거대괴수',
    assetDir: KAIJU_ASSET_DIR,
    bones: KAIJU_BONES,
    springs: KAIJU_SPRINGS,
    clips: KAIJU_CLIPS,
    arms: null,                          // 무기 팔 교체 없음
    attack: 'attack_bite',
    hitSocket: ['mouth', 'head'],        // 물기 타격/포효 이펙트 위치
    // 이펙트용 소켓 (원본 3배 좌표): 아래턱 끝, 가슴
    sockets: { jawDrip: [960, 430], chest: [880, 470] },
    // 컨셉의 산성 점액: 턱/가슴/발톱에서 방울이 떨어져 지면에 퍼짐
    ambient: [
        { kind: 'drip', socket: 'jawDrip', bone: 'jaw', rate: 4, spread: [45, 6], size: [6, 10],
          life: [3, 3], vel: [[-15, 15], [10, 40]], color: '150, 235, 40' },
        { kind: 'drip', socket: 'chest', bone: 'body', rate: 2, spread: [55, 45], size: [5, 8],
          life: [3, 3], vel: [[-10, 10], [0, 20]], color: '150, 235, 40' },
        { kind: 'drip', socket: 'claw', bone: 'armF', rate: 1.5, spread: [20, 8], size: [5, 7.5],
          life: [3, 3], vel: [[-10, 10], [0, 20]], color: '150, 235, 40' },
        // 입에서 피어오르는 산성 증기
        { kind: 'smoke', socket: 'jawDrip', bone: 'jaw', layer: 'front', rate: 7, offset: [30, -40],
          spread: [50, 25], size: [10, 16], life: [0.7, 1.1], vel: [[5, 25], [-40, -15]],
          color: '95, 190, 30', glow: '175, 255, 60' }
    ],
    debugSockets: KAIJU_DEBUG_SOCKETS,
    shadow: { rx: 430, ry: 40 }
};
