/* ==========================================================================
   PROJECT: MAD OVERLORD // 침묵의 방송자 리그 데이터 (v2, 새 캐릭터 6 — D-079, MD/새캐릭터2종_설계안.md)
   파츠: tools/rig/cut_newchar_parts.py broadcaster (Gemini 그림 4장, 오른쪽을 봄, 반전 없음).
   좌표 단위: 원본 이미지 픽셀. rot은 도(°), 화면 기준 +는 시계 방향.

   기본·강화 그림이 같은 뼈대를 씀: 부위 그림 <부위>(기본) ↔ <부위>_up(강화) — rigAvatar.applyUpgrades.
   긴 코트가 다리를 덮음 → 성녀처럼 코트 뒤에서 짧게 들어 올리는 종종걸음 (다리는 루트에 붙어 발이 미끄러지지 않음).
   앞팔(armF) = 분홍 소리굽쇠를 치켜든 팔(강화: 큰 소리굽쇠 장치), rot -는 소리굽쇠를 들어 올림.
   뒷팔(armB) = 작은 라디오를 든 팔(강화: 거대 스피커 대포), rot -는 앞(오른쪽)으로 휘두름.
   손목 관절 없음: 손 지운 그림에서 소매가 통째로 다시 그려져 손목을 못 찾음 (tools/rig/cut_joints.py 주석)
   ========================================================================== */

export const BROADCASTER_ASSET_DIR = 'assets/sprites/rig/broadcaster/';

// 부모가 먼저 오도록 나열. z가 클수록 앞에 그림. 다리는 코트 뒤, 뒷팔(라디오·스피커 대포)은 코트 앞
export const BROADCASTER_BONES = [
    { name: 'root', parent: null },
    { name: 'legB', parent: 'root', part: 'legB', z: 1 },
    { name: 'legF', parent: 'root', part: 'legF', z: 2 },
    { name: 'torso', parent: 'root', part: 'torso', z: 3 },
    { name: 'head', parent: 'torso', part: 'head', z: 4 },
    { name: 'armB', parent: 'torso', part: 'armB', z: 5 },
    { name: 'armF', parent: 'torso', part: 'armF', z: 6 }
];

/** 강화 그림 (D-079): 큰 소리굽쇠 장치는 더 길고 높음 → 끝 소켓, 뒷손은 스피커 대포 → 우퍼 소켓 */
export const BROADCASTER_UPGRADE = {
    parts: { head: ['head'], body: ['torso'], arm: ['armF', 'armB'], leg: ['legF', 'legB'] },
    sockets: { arm: { muzzle: 'muzzleUp', radio: 'wooferUp' } }
};

export const BROADCASTER_SPRINGS = [
    // 헤드폰·머리카락: 착지 때 살짝 눌렸다 돌아옴
    { bone: 'head', channel: 'y', axis: 1, gain: 0.25, k: 240, damping: 11, limit: 4 },
    // 뒷손 라디오(강화: 스피커 대포): 한 박자 늦게 흔들림
    { bone: 'armB', channel: 'rot', axis: 0, gain: -0.05, k: 85, damping: 6, limit: 6 }
];

export const BROADCASTER_DEBUG_SOCKETS = [
    ['muzzle', 'armF'],
    ['radio', 'armB'],
    ['antenna', 'head'],
    ['visor', 'head'],
    ['chest', 'torso'],
    ['footF', 'legF'],
    ['footB', 'legB']
];

const WAVE = '255, 80, 170';      // 분홍 음파
const STATIC = '255, 190, 230';   // 정적 (옅은 분홍빛)

export const BROADCASTER_CLIPS = {
    // 숨 쉬듯 몸통만 오르내림, 소리굽쇠는 치켜든 채 살짝 흔들림
    idle: {
        duration: 2.4,
        loop: true,
        tracks: {
            torso: { y: [[0, 0], [1.2, 4], [2.4, 0]] },
            head: { rot: [[0, 0], [1.2, 1.5], [2.4, 0]] },
            armF: { rot: [[0, 0], [1.2, -2], [2.4, 0]] },
            armB: { rot: [[0, 0], [1.2, 3], [2.4, 0]] }
        }
    },

    // 한 사이클 = 앞발 딛기(0.32) + 뒷발 딛기(0.77). 코트 밑에서 다리를 짧게 들어 종종걸음, 코트 자락이 살랑임
    walk: {
        duration: 0.9,
        loop: true,
        tracks: {
            legF: {
                y: [[0, 0, 'out'], [0.16, -18, 'in'], [0.32, 0, 'linear'], [0.9, 0]],
                rot: [[0, 0, 'out'], [0.16, -6, 'in'], [0.32, 0, 'linear'], [0.9, 0]]
            },
            legB: {
                y: [[0, 0], [0.45, 0, 'out'], [0.61, -18, 'in'], [0.77, 0, 'linear'], [0.9, 0]],
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

    // 공명 음파 (기본 공격): 0~0.35 소리굽쇠를 울림(충전) → 0.35~1.0 앞으로 두 번 쳐서 음파 (반동으로 살짝 튐)
    attack_wave: {
        duration: 1.0,
        loop: true,
        loopFrom: 0.35,
        tracks: {
            armF: {
                rot: [[0, 0, 'out'], [0.35, -6], [0.45, -6, 'out'], [0.48, 4], [0.62, -6, 'out'],
                      [0.8, -6, 'out'], [0.83, 4], [1.0, -6]]
            },
            armB: { rot: [[0, 0], [0.35, 5], [1.0, 5]] },
            torso: {
                x: [[0, 0], [0.35, -2], [0.45, -2, 'out'], [0.48, -6], [0.62, -2, 'out'], [0.8, -2, 'out'], [0.83, -6], [1.0, -2]],
                y: [[0, 0], [0.35, 3], [1.0, 3]]
            },
            head: { rot: [[0, 0], [0.35, -1.5], [1.0, -1.5]] }
        },
        events: [
            [0.15, 'charge', { color: WAVE }],
            [0.46, 'fire', { hit: 0.33, color: WAVE, size: 1.1 }],
            [0.81, 'fire', { hit: 0.33, color: WAVE, size: 1.1 }]
        ]
    },

    // 시전 (정적의 장막·필살기): 소리굽쇠를 높이 들어 울렸다(0.3) 앞으로 내밀어 해방(0.45 'cast')
    cast: {
        duration: 1.0,
        loop: false,
        tracks: {
            armF: { rot: [[0, 0], [0.3, -26, 'out'], [0.45, 8, 'out'], [0.65, 3], [1.0, 0]] },
            armB: { rot: [[0, 0], [0.3, 16, 'out'], [0.45, -20, 'out'], [0.7, -14], [1.0, 0]] },
            torso: { y: [[0, 0], [0.3, 6], [0.45, -4, 'out'], [1.0, 0]], rot: [[0, 0], [0.3, -3], [0.45, 3, 'out'], [1.0, 0]] },
            head: { rot: [[0, 0], [0.3, -5], [0.45, 2, 'out'], [1.0, 0]] }
        },
        events: [
            [0.05, 'charge', { socket: 'antenna', bone: 'head', color: STATIC }],
            [0.45, 'chargeEnd'],
            [0.45, 'impact', { color: WAVE }],
            [0.45, 'cast']
        ]
    },

    // 스피커 포격 (공명 파열·우퍼 펀치): 뒷팔 라디오/스피커 대포를 앞으로 겨눠(0.22) 쾅(0.36 'cast'), 반동으로 몸이 뒤로
    blast: {
        duration: 0.9,
        loop: false,
        tracks: {
            armB: { rot: [[0, 0], [0.22, -40, 'out'], [0.36, -30], [0.42, -46, 'out'], [0.65, -34], [0.9, 0]] },
            armF: { rot: [[0, 0], [0.22, 6], [0.9, 0]] },
            torso: { x: [[0, 0], [0.22, 3], [0.36, -8, 'out'], [0.65, -3], [0.9, 0]], rot: [[0, 0], [0.36, -2], [0.9, 0]] },
            head: { rot: [[0, 0], [0.36, -3], [0.9, 0]] }
        },
        events: [[0.36, 'cast'], [0.36, 'impact', { socket: 'radio', bone: 'armB', color: WAVE }]]
    },

    // 던지기 (레코드·케이블·나비 원반): 소리굽쇠 팔을 뒤로 젖혔다 앞으로 뿌림(0.35 'cast')
    throw: {
        duration: 0.8,
        loop: false,
        tracks: {
            armF: { rot: [[0, 0], [0.2, -34, 'in'], [0.35, 14, 'out'], [0.55, 8], [0.8, 0]] },
            armB: { rot: [[0, 0], [0.2, 8], [0.35, -6], [0.8, 0]] },
            torso: { x: [[0, 0], [0.2, -8, 'in'], [0.35, 10, 'out'], [0.8, 0]], rot: [[0, 0], [0.2, -4], [0.35, 4, 'out'], [0.8, 0]] },
            head: { rot: [[0, 0], [0.2, -3], [0.35, 3], [0.8, 0]] }
        },
        events: [[0.35, 'cast'], [0.35, 'fire', { color: WAVE, size: 1.2 }]]
    },

    // 승리: 소리굽쇠를 하늘로 치켜들고 흔들며 통통 뜀, 안테나가 분홍빛
    victory: {
        duration: 1.0,
        loop: true,
        tracks: {
            armF: { rot: [[0, -28], [0.5, -36], [1.0, -28]] },
            armB: { rot: [[0, -14], [0.5, 14], [1.0, -14]] },
            torso: { y: [[0, 4], [0.5, -6], [1.0, 4]], rot: [[0, -2], [0.5, -3], [1.0, -2]] },
            head: { rot: [[0, -4], [0.5, -7], [1.0, -4]] },
            legF: { y: [[0, 0], [0.5, -6], [1.0, 0]] },
            legB: { y: [[0, -6], [0.5, 0], [1.0, -6]] }
        },
        events: [[0.1, 'roar', { socket: 'antenna', bone: 'head', color: WAVE }]]
    }
};

export const BROADCASTER = {
    id: 'broadcaster',
    name: '침묵의 방송자',
    assetDir: BROADCASTER_ASSET_DIR,
    bones: BROADCASTER_BONES,
    springs: BROADCASTER_SPRINGS,
    clips: BROADCASTER_CLIPS,
    arms: null,
    attack: 'attack_wave',
    hitSocket: ['muzzle', 'armF'],
    upgrade: BROADCASTER_UPGRADE,
    skillClips: [['시전 동작', 'cast'], ['스피커 포격', 'blast'], ['던지기', 'throw']],   // rig_test.html 동작 버튼
    // 소리굽쇠 끝 분홍 음파 가루, 안테나 끝 깜빡이는 빛
    ambient: [
        { kind: 'ember', socket: 'muzzle', bone: 'armF', layer: 'front', rate: 2,
          offset: [0, 0], spread: [16, 16], size: [1.4, 2.6], life: [0.5, 0.9],
          vel: [[-10, 10], [-30, -10]], color: WAVE },
        { kind: 'ember', socket: 'antenna', bone: 'head', layer: 'front', rate: 1,
          offset: [0, 0], spread: [6, 6], size: [1.6, 2.6], life: [0.4, 0.7],
          vel: [[-4, 4], [-20, -8]], color: STATIC }
    ],
    debugSockets: BROADCASTER_DEBUG_SOCKETS,
    shadow: { rx: 180, ry: 24 }
};
