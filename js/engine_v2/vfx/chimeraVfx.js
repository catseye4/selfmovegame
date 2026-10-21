/* ==========================================================================
   PROJECT: MAD OVERLORD // 합성괴인 스킬 이펙트 정의 (v2)
   컨셉 시트: 악의 조직 괴인 — 주먹, 졸몹 스폰, 2페이즈 거대화 + 금색 육각 실드
   불꽃 주황 + 금색이 팩션 색
   ========================================================================== */

export const FLAME = '255, 150, 40';
export const GOLD = '255, 205, 70';
const SOOT = '70, 45, 35';
const ROCK = '90, 70, 55';

export const CHIMERA_VFX = {
    // 기본 주먹 타격: 충격파 두 겹 + 불꽃 파편
    punchHit: {
        sfx: 'chimera_punch',
        layers: [
            { type: 'fireball', at: 0, dur: 0.32, r: 28, color: FLAME },
            { type: 'shockwave', at: 0, dur: 0.42, r: 68, color: FLAME, width: 18 },
            { type: 'shockwave', at: 0.05, dur: 0.4, r: 60, color: GOLD, width: 14 },
            { type: 'flame', at: 0, count: 3, speed: 150, angle: 0, cone: 0.9, size: 5, grow: 2.2, life: [0.22, 0.4], drag: 3, rise: 40, color: FLAME },
            { type: 'embers', at: 0.03, count: 4, speed: 150, angle: 0, cone: 1.6, size: 1.4, life: [0.3, 0.45], color: GOLD },
            { type: 'glow', at: 0.04, dur: 0.6, r: 26, color: FLAME, dy: 32 },
            { type: 'smoke', at: 0.05, count: 2, spread: 10, spreadY: 10, size: 12, life: [0.3, 0.45], rise: 25, color: SOOT }
        ]
    },

    // 클로 팔(arm_chimera): 전방 발톱 할퀴기
    clawHit: {
        sfx: 'chimera_claw',
        layers: [
            { type: 'slash', at: 0, dur: 0.44, r: 82, arc: 2.6, angle: 2.2, width: 18, sweep: 0.1, thick: 1, color: FLAME },
            { type: 'claw', at: 0, dur: 0.44, count: 3, len: 88, gap: 13, angle: 2.2, width: 8, bend: 14, color: FLAME },
            { type: 'flash', at: 0.03, dur: 0.1, r: 22, color: GOLD },
            { type: 'embers', at: 0.03, count: 5, speed: 160, angle: 0.4, cone: 1.6, size: 1.4, life: [0.3, 0.45], color: GOLD },
            { type: 'glow', at: 0.05, dur: 0.55, r: 22, color: FLAME, dy: 30 },
            { type: 'smoke', at: 0.08, count: 2, spread: 10, spreadY: 16, size: 12, life: [0.45, 0.75], rise: 18, color: SOOT }
        ]
    },

    // [몸통] 졸몹 소환: 주황 소환진 + 연기 속에서 등장
    summon: {
        sfx: 'chimera_summon',
        layers: [
            { type: 'rune', at: 0, dur: 0.9, r: 40, color: FLAME, spin: 2 },
            { type: 'ring', at: 0, dur: 0.24, r: 46, ground: true, inward: true, color: GOLD, width: 3 },
            { type: 'pillar', at: 0.05, dur: 0.45, h: 80, w: 26, color: FLAME },
            { type: 'flash', at: 0.05, dur: 0.14, r: 22, color: GOLD, dy: -20 },
            { type: 'glow', at: 0.08, dur: 0.9, r: 34, color: FLAME },
            { type: 'smoke', at: 0.15, count: 6, spread: 18, spreadY: 30, size: 16, life: [0.6, 1.0], rise: 25, color: SOOT },
            { type: 'embers', at: 0.1, count: 6, speed: 65, size: 1.5, life: [0.6, 1.0], color: GOLD }
        ]
    },

    // [다리] 지진 분쇄 틱: 적 발밑 균열 + 파편
    quakeTick: {
        sfx: 'chimera_quake',
        layers: [
            { type: 'flash', at: 0, dur: 0.1, r: 18, color: GOLD, dy: -3 },
            { type: 'shockwave', at: 0, dur: 0.3, r: 40, ground: true, color: GOLD, width: 14 },
            { type: 'cracks', at: 0, dur: 0.7, count: 5, len: 45, color: FLAME },
            { type: 'glow', at: 0.02, dur: 0.65, r: 30, color: FLAME },
            { type: 'shards', at: 0, count: 5, speed: 200, size: 5.4, spin: 7, life: [0.7, 1.1], shape: 'rock', floor: 0, color: ROCK },
            { type: 'dust', at: 0.02, count: 2, speed: 91, dir: 'both', size: 12, life: 0.8, color: SOOT, dy: 0 }
        ]
    },

    // [필살기] 파괴 광란(2페이즈 이후): 즉시 내려찍는 대형 충격파
    slam: {
        sfx: 'chimera_slam',
        layers: [
            { type: 'flash', at: 0, dur: 0.12, r: 36, color: GOLD, dy: -20 },
            { type: 'fireball', at: 0, dur: 0.4, r: 60, color: FLAME, dy: -20 },
            { type: 'shockwave', at: 0, dur: 0.55, r: 230, ground: true, color: FLAME, width: 36 },
            { type: 'shockwave', at: 0.06, dur: 0.5, r: 170, ground: true, color: GOLD, width: 16 },
            { type: 'cracks', at: 0, dur: 1.2, count: 10, len: 180, color: FLAME },
            { type: 'glow', at: 0.03, dur: 1.1, r: 110, color: FLAME },
            { type: 'shards', at: 0, count: 10, speed: 340, size: 7.2, spin: 7, life: [0.7, 1.1], shape: 'rock', floor: 0, color: ROCK },
            { type: 'flame', at: 0.02, count: 3, speed: 90, angle: -Math.PI / 2, cone: 2.0, size: 10, grow: 2.4, life: [0.4, 0.7], drag: 2.5, rise: 60, color: FLAME, dy: -20 },
            { type: 'embers', at: 0.05, count: 8, speed: 170, cone: 2.8, size: 1.7, life: [0.7, 1.2], color: GOLD, dy: -20 },
            { type: 'dust', at: 0.1, count: 5, speed: 140, dir: 'both', size: 22, life: 1.1, color: SOOT, dy: 0 }
        ]
    },

    // [머리] 2페이즈: 변신 클립의 거대화 순간(0.58초)에 발밑 충격파 + 균열 + 불티
    phase2Burst: {
        sfx: 'chimera_phase2',
        layers: [
            { type: 'glow', at: 0, dur: 1.5, r: 70, color: FLAME },
            { type: 'ring', at: 0, dur: 0.58, r: 90, ground: true, inward: true, color: GOLD, width: 3 },
            { type: 'flash', at: 0.58, dur: 0.2, r: 70, color: GOLD, dy: -80 },
            { type: 'shockwave', at: 0.58, dur: 0.55, r: 170, ground: true, color: FLAME, width: 32 },
            { type: 'shockwave', at: 0.64, dur: 0.5, r: 130, ground: true, color: GOLD, width: 16 },
            { type: 'cracks', at: 0.58, dur: 1.2, count: 9, len: 150, color: FLAME },
            { type: 'debris', at: 0.58, count: 12, speed: 320, size: 4, color: ROCK },
            { type: 'embers', at: 0.6, count: 12, speed: 150, cone: 2.6, size: 1.8, life: [0.8, 1.4], color: GOLD, dy: -40 },
            { type: 'smoke', at: 0.66, count: 5, spread: 60, spreadY: 10, size: 22, life: [0.8, 1.2], rise: 24, color: SOOT, layer: 'ground' }
        ]
    }
};
