/* ==========================================================================
   PROJECT: MAD OVERLORD // 보스 새 기술 이펙트 (v2)
   수호의 결계·속죄의 사슬: 금빛 방벽·빛가루 / 진홍 시선: 외눈 조준선·광선
   ========================================================================== */

const HOLY_GOLD = '255, 214, 120';
const HOLY_WHITE = '255, 244, 205';
const CRIMSON = '220, 40, 65';
const DARK_CRIMSON = '85, 20, 40';
const WHITE = '245, 250, 255';

export const BOSS_VFX = {
    // 수호의 결계: 몸 둘레 고리 + 잔광 + 떠오르는 금빛 가루 (3초)
    guardianBarrier: {
        layers: [
            { type: 'rays', at: 0.08, dur: 0.8, count: 14, len: 135, width: 8, spin: 0.45, color: HOLY_GOLD },
            { type: 'rays', at: 1.2, dur: 0.65, count: 10, len: 105, width: 5, spin: -0.4, color: HOLY_WHITE },
            { type: 'ring', at: 0, dur: 3, r: 110, width: 6, color: HOLY_GOLD },
            { type: 'ring', at: 0.15, dur: 2.85, r: 95, width: 3, color: HOLY_WHITE },
            { type: 'ring', at: 0.1, dur: 2.9, r: 110, width: 2, inward: true, color: HOLY_GOLD },
            { type: 'rune', at: 0, dur: 3, r: 75, spin: 1, color: HOLY_GOLD, dy: 70 },
            { type: 'flash', at: 0.08, dur: 0.18, r: 36, color: HOLY_WHITE },
            { type: 'glow', at: 0, dur: 3, r: 120, color: HOLY_GOLD, layer: 'front' },
            { type: 'motes', at: 0, count: 12, spread: 75, rise: [25, 55], life: [1.6, 2.4], size: 3, color: HOLY_GOLD },
            { type: 'motes', at: 1.2, count: 12, spread: 65, rise: [25, 55], life: [1.2, 1.8], size: 2.5, color: HOLY_WHITE }
        ]
    },
    // 속죄의 사슬 적중: 조여드는 금빛 고리 + 작은 섬광·빛가루
    chainHit: {
        layers: [
            { type: 'ring', at: 0, dur: 0.5, r: 55, width: 4, inward: true, color: HOLY_GOLD },
            { type: 'ring', at: 0.04, dur: 1.0, r: 42, ground: true, width: 3, inward: true, color: HOLY_GOLD, dy: -18, layer: 'front' },
            { type: 'ring', at: 0.08, dur: 1.0, r: 42, ground: true, width: 3, inward: true, color: HOLY_GOLD, dy: 18, layer: 'front' },
            { type: 'flash', at: 0.08, dur: 0.16, r: 28, color: HOLY_WHITE },
            { type: 'glow', at: 0.04, dur: 0.8, r: 42, color: HOLY_GOLD, layer: 'front' },
            { type: 'motes', at: 0.12, count: 8, spread: 30, rise: [25, 55], life: [0.6, 1], size: 2.5, color: HOLY_GOLD },
            { type: 'shockwave', at: 0.08, dur: 0.4, r: 64, width: 16, color: HOLY_GOLD },
            { type: 'dust', at: 0.08, count: 3, speed: 100, size: 14, life: 0.65, color: '110, 95, 80', dy: 60 }
        ]
    },
    // 외눈 → 주인공 가슴: 가는 조준선 (1초 예고)
    gazeWarn: {
        layers: [
            { type: 'beam', at: 0, dur: 1, w: 2, color: '170, 90, 255' },
            { type: 'glow', at: 0, dur: 1, r: 24, color: '170, 90, 255', layer: 'front' },
            { type: 'ring', at: 0.65, dur: 0.35, r: 32, inward: true, width: 2, color: '170, 90, 255', pos: 'to' },
            { type: 'rune', at: 0, dur: 1, r: 22, spin: -2, color: '170, 90, 255', pos: 'to', layer: 'front' },
            { type: 'flash', at: 0.7, dur: 0.16, r: 16, color: WHITE },
            { type: 'mist', at: 0, r: 48, h: 10, life: 1, drift: 0, rim: true, color: '150, 255, 90', pos: 'to', dy: 60 }
        ]
    },
    // 진홍 시선: 흰 심·보라 광선 + 목표에 튀는 형광 점액
    gaze: {
        layers: [
            { type: 'rays', at: 0, dur: 0.35, count: 8, len: 85, width: 7, spin: -0.6, color: '170, 90, 255', pos: 'to' },
            { type: 'beam', at: 0, dur: 0.4, w: 26, color: '170, 90, 255' },
            { type: 'beam', at: 0, dur: 0.25, w: 7, color: WHITE },
            { type: 'flash', at: 0, dur: 0.18, r: 42, color: WHITE, pos: 'to' },
            { type: 'shockwave', at: 0.03, dur: 0.45, r: 65, width: 16, color: '170, 90, 255', pos: 'to' },
            { type: 'glow', at: 0.05, dur: 0.8, r: 55, color: '170, 90, 255', pos: 'to', layer: 'front' },
            { type: 'motes', at: 0.08, count: 5, spread: 35, rise: [30, 80], life: [0.5, 0.9], size: 2.5, color: '170, 90, 255', pos: 'to' },
            { type: 'mist', at: 0.12, r: 46, h: 10, life: 1.0, drift: 14, color: '60, 25, 85', dy: 60, pos: 'to' },
            { type: 'goo', at: 0.03, count: 4, speed: 155, size: 7, life: 1.0, floor: 60, splat: true, color: '150, 255, 90', pos: 'to' }
        ]
    }
};
