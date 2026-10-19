/* ==========================================================================
   PROJECT: MAD OVERLORD // 엘리트 속성 이펙트 (v2)
   회복 빛가루·얼음 파편·보호막·가시·독 안개·폭발·금속 불꽃
   ========================================================================== */

const REGEN = '90, 255, 140';
const FROST = '160, 225, 255';
const SHIELD = '110, 170, 255';
const THORNS = '170, 230, 90';
const TOXIC = '190, 230, 40';
const VOLATILE = '255, 140, 40';
const IRON = '200, 205, 215';
const WHITE = '245, 250, 255';

export const ELITE_VFX = {
    regenMotes: {
        layers: [
            { type: 'ring', at: 0, dur: 0.55, r: 30, ground: true, inward: true, width: 2, color: REGEN },
            { type: 'pillar', at: 0, dur: 0.45, h: 52, w: 10, color: REGEN },
            { type: 'motes', at: 0.05, count: 7, spread: 24, rise: [30, 65], life: [0.6, 0.95], size: 2.5, color: REGEN },
            { type: 'glow', at: 0, dur: 0.65, r: 34, color: REGEN, layer: 'front' }
        ]
    },
    frostHit: {
        layers: [
            { type: 'crystals', at: 0, dur: 0.6, count: 4, h: 32, spread: 24, color: FROST, dy: 16 },
            { type: 'shards', at: 0.12, count: 5, speed: 155, size: 4.5, spin: 9, life: [0.7, 1.1], shape: 'ice', floor: 32, color: FROST },
            { type: 'mist', at: 0.06, r: 37, h: 8, life: 0.7, drift: 14, color: FROST, dy: 30 },
            { type: 'glow', at: 0, dur: 0.7, r: 34, color: FROST, dy: 16 },
            { type: 'flash', at: 0, dur: 0.12, r: 24, color: WHITE }
        ]
    },
    shieldBreak: {
        layers: [
            { type: 'ring', at: 0, dur: 0.2, r: 52, inward: true, width: 3, color: SHIELD },
            { type: 'flash', at: 0.04, dur: 0.15, r: 42, color: SHIELD },
            { type: 'shockwave', at: 0.04, dur: 0.5, r: 80, width: 16, color: SHIELD },
            { type: 'glow', at: 0.04, dur: 0.65, r: 55, color: SHIELD, layer: 'front' },
            { type: 'debris', at: 0.04, count: 10, speed: 230, size: 4.5, cone: Math.PI * 2, color: SHIELD },
            { type: 'motes', at: 0.12, count: 5, spread: 42, rise: [15, 40], life: [0.5, 0.8], size: 2, color: SHIELD }
        ]
    },
    thornsSpark: {
        layers: [
            { type: 'crystals', at: 0, dur: 0.3, count: 3, h: 24, spread: 16, color: THORNS, dy: 10 },
            { type: 'flash', at: 0, dur: 0.1, r: 18, color: WHITE },
            { type: 'glow', at: 0, dur: 0.4, r: 26, color: THORNS, dy: 10, layer: 'front' },
            { type: 'debris', at: 0.03, count: 5, speed: 150, size: 2.5, color: THORNS },
            { type: 'sparks', at: 0.02, count: 2, speed: 180, angle: Math.PI, cone: 1.4, color: THORNS },
            { type: 'streaks', at: 0.02, count: 2, speed: 180, len: 34, life: [0.3, 0.55], angle: Math.PI, cone: 1.4, color: THORNS }
        ]
    },
    toxicCloud: {
        layers: [
            { type: 'ring', at: 0, dur: 0.55, r: 60, ground: true, width: 3, color: TOXIC },
            { type: 'goo', at: 0, count: 4, speed: 100, size: 5.8, life: [0.8, 1.15], splat: true, floor: 0, color: TOXIC },
            { type: 'mist', at: 0, r: 75, h: 12.5, life: 1.5, drift: 14, color: TOXIC, dy: 0 },
            { type: 'smoke', at: 0, count: 2, spread: 30, spreadY: 8, size: 16, life: [0.9, 1.5], rise: 12, color: TOXIC },
            { type: 'mist', at: 1.2, r: 67, h: 11, life: 2.6, drift: 14, color: TOXIC, dy: 0 },
            { type: 'glow', at: 0, dur: 4, r: 60, color: TOXIC },
            { type: 'motes', at: 0.2, count: 4, spread: 50, rise: [15, 30], life: [1.0, 1.5], size: 2.5, color: TOXIC },
            { type: 'motes', at: 2.4, count: 4, spread: 45, rise: [10, 25], life: [0.8, 1.4], size: 2, color: TOXIC }
        ]
    },
    volatileWarn: {
        layers: [
            { type: 'ring', at: 0, dur: 1, r: 150, ground: true, width: 5, color: VOLATILE },
            { type: 'ring', at: 0, dur: 1, r: 150, ground: true, inward: true, width: 2, color: WHITE },
            { type: 'glow', at: 0, dur: 1, r: 150, color: VOLATILE },
            { type: 'flash', at: 0, dur: 0.12, r: 32, color: VOLATILE },
            { type: 'flash', at: 0.3, dur: 0.12, r: 36, color: VOLATILE },
            { type: 'flash', at: 0.6, dur: 0.12, r: 40, color: VOLATILE },
            { type: 'flash', at: 0.85, dur: 0.12, r: 44, color: VOLATILE }
        ]
    },
    volatileBlast: {
        layers: [
            { type: 'flash', at: 0, dur: 0.16, r: 55, color: WHITE, dy: -25 },
            { type: 'flame', at: 0, count: 10, speed: 240, angle: -Math.PI / 2, cone: 3.4, size: 14, grow: 3.5, life: [0.55, 0.85], drag: 2.2, rise: 100, color: VOLATILE, dy: -25 },
            { type: 'shockwave', at: 0, dur: 0.45, r: 150, ground: true, width: 28, color: VOLATILE },
            { type: 'glow', at: 0.04, dur: 1.0, r: 95, color: VOLATILE },
            { type: 'embers', at: 0.02, count: 8, speed: 290, angle: -Math.PI / 2, cone: 3.2, size: 1.8, life: [0.6, 1.1], color: VOLATILE },
            { type: 'debris', at: 0.02, count: 4, speed: 250, size: 3, color: IRON },
            { type: 'smoke', at: 0.12, count: 8, spread: 55, spreadY: 30, size: 28, life: [0.8, 1.3], rise: 35, color: '90, 80, 70' }
        ]
    },
    ironSpark: {
        layers: [
            { type: 'flash', at: 0, dur: 0.1, r: 18, color: WHITE },
            { type: 'ring', at: 0, dur: 0.25, r: 25, width: 2, color: IRON },
            { type: 'sparks', at: 0, count: 2, speed: 260, angle: -2.6, cone: 1.2, color: IRON },
            { type: 'streaks', at: 0, count: 4, speed: 260, len: 34, life: [0.3, 0.55], angle: -2.6, cone: 1.2, color: IRON },
            { type: 'debris', at: 0.02, count: 4, speed: 170, size: 2, angle: -2.4, cone: 1.0, color: IRON },
            { type: 'smoke', at: 0.04, count: 2, spread: 8, spreadY: 8, size: 9, life: [0.3, 0.5], rise: 15, color: IRON }
        ]
    }
};
