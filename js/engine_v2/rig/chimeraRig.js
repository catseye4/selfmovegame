/* ==========================================================================
   PROJECT: MAD OVERLORD // 합성괴인(악의 조직) 리그 데이터 (v2)
   파츠: tools/rig/cut_chimera_parts.py 가 Gemini 이미지에서 분리 (원본을 좌우 반전해 오른쪽을 봄).
   좌표 단위: 원본 이미지 픽셀. rot은 도(°), 화면 기준 +는 시계 방향.

   다리를 벌린 육중한 3/4 자세 → 거대로봇처럼 다리를 번갈아 들어 올렸다 내려찍는 쿵쿵 걸음.
   앞팔(진행 방향 쪽)은 어깨에서 앞 아래를 향하므로 rot -는 주먹을 앞으로 들어 올림.
   날개는 어깨 뒤 뿌리에서 위로 뻗어 있어 rot -는 뒤로 펼침, +는 앞으로 접음.
   꼬리는 뒤(왼쪽)로 뻗어 있어 rot +는 꼬리 끝이 위로.
   ========================================================================== */

export const CHIMERA_ASSET_DIR = 'assets/sprites/rig/chimera/';

// 부모가 먼저 오도록 나열. z가 클수록 앞에 그림.
// 날개는 등 위에 겹쳐 그려진 그림이라 몸통 앞, 큰 팔 뒤. 꼬리는 뒷다리 뒤.
export const CHIMERA_BONES = [
    { name: 'root', parent: null },
    { name: 'legB', parent: 'root', part: 'legB', z: 1 },
    { name: 'legF', parent: 'root', part: 'legF', z: 2 },
    { name: 'torso', parent: 'root', part: 'torso', z: 3 },
    { name: 'tail1', parent: 'torso', part: 'tail1', z: 0 },
    { name: 'tail2', parent: 'tail1', part: 'tail2', z: -1 },
    { name: 'wing', parent: 'torso', part: 'wing', z: 4 },
    { name: 'armB', parent: 'torso', part: 'armB', z: 5 },
    { name: 'armF', parent: 'torso', part: 'armF', z: 6 },
    { name: 'head', parent: 'torso', part: 'head', z: 7 }
];

export const CHIMERA_SPRINGS = [
    // 날개: 몸이 앞으로 가속하면 위로 뻗은 날개 끝이 뒤처져 뒤로(-) 젖혀짐
    { bone: 'wing', channel: 'rot', axis: 0, gain: 0.15, k: 80, damping: 6, limit: 8 },
    // 꼬리: 착지(아래로 가던 몸이 멈춤) 순간 꼬리 끝이 한 박자 늦게 출렁
    { bone: 'tail1', channel: 'rot', axis: 1, gain: -0.06, k: 90, damping: 7, limit: 8 },
    { bone: 'tail2', channel: 'rot', axis: 1, gain: -0.10, k: 70, damping: 6, limit: 12 },
    { bone: 'head', channel: 'y', axis: 1, gain: 0.35, k: 240, damping: 11, limit: 6 }
];

export const CHIMERA_DEBUG_SOCKETS = [
    ['fist', 'armF'],
    ['mouth', 'head'],
    ['footF', 'legF'],
    ['footB', 'legB']
];

const FLAME = '255, 150, 40';

export const CHIMERA_CLIPS = {
    idle: {
        duration: 2.4,
        loop: true,
        tracks: {
            torso: { y: [[0, 0], [1.2, 6], [2.4, 0]] },
            head: { rot: [[0, 0], [1.2, 1.5], [2.4, 0]] },
            wing: { rot: [[0, 0], [1.2, -4], [2.4, 0]] },
            armF: { rot: [[0, 0], [1.2, -3], [2.4, 0]] },
            armB: { rot: [[0, 0], [1.2, 3], [2.4, 0]] },
            tail1: { rot: [[0, 0], [1.2, 5], [2.4, 0]] },
            tail2: { rot: [[0, 0], [1.2, 8], [2.4, 0]] }
        }
    },

    // 한 사이클 = 앞발 쿵(0.42) + 뒷발 쿵(0.97). 드는 발 반대쪽으로 체중을 싣고 착지 때 주저앉음
    walk: {
        duration: 1.1,
        loop: true,
        tracks: {
            legF: {
                y: [[0, 0, 'out'], [0.2, -45, 'in'], [0.42, 0, 'linear'], [1.1, 0]],
                rot: [[0, 0, 'out'], [0.2, -6, 'in'], [0.42, 0, 'linear'], [1.1, 0]]
            },
            legB: {
                y: [[0, 0], [0.55, 0, 'out'], [0.75, -45, 'in'], [0.97, 0, 'linear'], [1.1, 0]],
                rot: [[0, 0], [0.55, 0, 'out'], [0.75, -6, 'in'], [0.97, 0, 'linear'], [1.1, 0]]
            },
            torso: {
                x: [[0, 0], [0.2, -10], [0.42, -4, 'out'], [0.55, 0], [0.75, 10], [0.97, 4, 'out'], [1.1, 0]],
                y: [[0, 0], [0.2, -7, 'in'], [0.42, 8, 'out'], [0.55, 0], [0.75, -7, 'in'], [0.97, 8, 'out'], [1.1, 0]],
                rot: [[0, 0], [0.2, -2], [0.42, 0.8, 'out'], [0.55, 0], [0.75, 2], [0.97, -0.8, 'out'], [1.1, 0]]
            },
            head: { rot: [[0, 0], [0.42, 2, 'out'], [0.55, 0], [0.97, 2, 'out'], [1.1, 0]] },
            armF: { rot: [[0, -5], [0.55, 6], [1.1, -5]] },
            armB: { rot: [[0, 5], [0.55, -5], [1.1, 5]] },
            wing: { rot: [[0, 0], [0.42, 3, 'out'], [0.55, 0], [0.97, 3, 'out'], [1.1, 0]] },
            tail1: { rot: [[0, -4], [0.55, 4], [1.1, -4]] },
            tail2: { rot: [[0, 0], [0.28, 8], [0.83, -8], [1.1, 0]] }
        },
        events: [
            [0.42, 'stomp', { foot: 'footF', bone: 'legF' }],
            [0.97, 'stomp', { foot: 'footB', bone: 'legB' }]
        ]
    },

    // 주먹 지르기: 0~0.3 주먹을 뒤로 당기며 몸을 젖힘 → 0.42 앞으로 내지르며 몸을 실음(타격) → 복귀
    attack_punch: {
        duration: 1.0,
        loop: true,
        tracks: {
            armF: { rot: [[0, 0], [0.3, 25, 'in'], [0.42, -62, 'out'], [0.62, -55], [1.0, 0]] },
            torso: {
                x: [[0, 0], [0.3, -10, 'in'], [0.42, 22, 'out'], [0.62, 16], [1.0, 0]],
                y: [[0, 0], [0.3, 4], [0.42, -2, 'out'], [1.0, 0]],
                rot: [[0, 0], [0.3, -3, 'in'], [0.42, 4, 'out'], [0.62, 3], [1.0, 0]]
            },
            head: { rot: [[0, 0], [0.3, -4], [0.42, 5, 'out'], [1.0, 0]] },
            wing: { rot: [[0, 0], [0.3, -10, 'in'], [0.42, 6, 'out'], [1.0, 0]] },
            armB: { rot: [[0, 0], [0.3, -8], [0.42, 10, 'out'], [1.0, 0]] },
            tail1: { rot: [[0, 0], [0.3, 6], [0.42, -6, 'out'], [1.0, 0]] }
        },
        events: [[0.42, 'impact', { hit: 1, color: FLAME }]]
    },

    // 2페이즈 변신: 웅크려 힘을 모음 → 날개를 펼치며 포효하는 순간 거대화 → 실드 전개 (한 번 재생)
    transform: {
        duration: 1.6,
        loop: false,
        tracks: {
            torso: { y: [[0, 0], [0.45, 22, 'out'], [0.6, -12, 'out'], [1.2, -6], [1.6, 0]],
                     rot: [[0, 0], [0.45, 4], [0.6, -4, 'out'], [1.2, -3], [1.6, 0]] },
            head: { rot: [[0, 0], [0.45, 8, 'out'], [0.6, -6, 'out'], [0.7, -4.5], [0.8, -6], [0.9, -4.5], [1.0, -6],
                          [1.6, 0]] },
            wing: { rot: [[0, 0], [0.45, 12, 'out'], [0.62, -20, 'out'], [0.8, -12], [0.95, -20], [1.6, 0]] },
            armF: { rot: [[0, 0], [0.45, 20, 'out'], [0.62, -40, 'out'], [1.2, -35], [1.6, 0]] },
            armB: { rot: [[0, 0], [0.45, -15, 'out'], [0.62, 25, 'out'], [1.2, 20], [1.6, 0]] },
            tail1: { rot: [[0, 0], [0.45, -8], [0.62, 12, 'out'], [1.6, 0]] }
        },
        events: [
            [0.58, 'roar', { socket: 'mouth', bone: 'head', color: FLAME }],
            [0.58, 'grow', { mult: 1.3 }],
            [1.15, 'shield']
        ]
    },

    // 승리: 날개를 펼쳐 퍼덕이며 주먹을 치켜들고 고개를 젖혀 포효
    // (머리가 어깨와 넓게 맞닿은 그림이라 6° 넘게 젖히면 귀 옆 이음새가 드러남 → 조금 젖히고 떨게)
    victory: {
        duration: 1.4,
        loop: true,
        tracks: {
            head: {
                rot: [[0, 0], [0.3, -6, 'out'], [0.36, -4.5], [0.42, -6], [0.48, -4.5], [0.54, -6], [0.6, -4.5],
                      [0.66, -6], [0.72, -4.5], [0.78, -6], [1.0, -5.5], [1.4, 0]]
            },
            wing: { rot: [[0, 0], [0.3, -18, 'out'], [0.45, -8], [0.6, -18], [0.75, -8], [0.9, -18], [1.4, 0]] },
            armF: { rot: [[0, 0], [0.3, -95, 'out'], [1.0, -95], [1.4, 0]] },
            armB: { rot: [[0, 0], [0.3, -20], [1.0, -20], [1.4, 0]] },
            torso: { y: [[0, 0], [0.3, -10], [1.0, -10], [1.4, 0]], rot: [[0, 0], [0.3, -3], [1.0, -3], [1.4, 0]] },
            tail1: { rot: [[0, 0], [0.3, 10], [1.0, 10], [1.4, 0]] }
        },
        events: [[0.3, 'roar', { socket: 'mouth', bone: 'head', color: FLAME }]]
    }
};

export const CHIMERA = {
    id: 'chimera',
    name: '합성괴인',
    assetDir: CHIMERA_ASSET_DIR,
    bones: CHIMERA_BONES,
    springs: CHIMERA_SPRINGS,
    clips: CHIMERA_CLIPS,
    arms: null,
    attack: 'attack_punch',
    hitSocket: ['fist', 'armF'],
    hitColor: '#ff9628',                 // 전투 엔진 근접 타격 이펙트 색 (주황)
    debugSockets: CHIMERA_DEBUG_SOCKETS,
    shadow: { rx: 360, ry: 36 }
};
