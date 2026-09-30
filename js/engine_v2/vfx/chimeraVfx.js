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
            { type: 'ring', at: 0, dur: 0.3, r: 46, color: FLAME, width: 7 },
            { type: 'ring', at: 0.05, dur: 0.35, r: 62, color: GOLD, width: 3 },
            { type: 'sparks', at: 0, count: 12, speed: 300, angle: 0, cone: 2.2, color: FLAME },
            { type: 'smoke', at: 0.05, count: 3, spread: 10, spreadY: 10, size: 12, life: [0.4, 0.7], rise: 25, color: SOOT }
        ]
    },

    // 클로 팔(arm_chimera): 전방 발톱 할퀴기
    clawHit: {
        sfx: 'chimera_claw',
        layers: [
            { type: 'claw', at: 0, dur: 0.4, count: 3, len: 70, gap: 13, angle: 2.2, color: FLAME },
            { type: 'flash', at: 0.03, dur: 0.1, r: 22, color: GOLD },
            { type: 'sparks', at: 0.03, count: 8, speed: 240, angle: 2.2, cone: 1.2, color: GOLD }
        ]
    },

    // [몸통] 졸몹 소환: 주황 소환진 + 연기 속에서 등장
    summon: {
        sfx: 'chimera_summon',
        layers: [
            { type: 'rune', at: 0, dur: 0.9, r: 40, color: FLAME, spin: 2 },
            { type: 'pillar', at: 0.05, dur: 0.45, h: 80, w: 26, color: FLAME },
            { type: 'smoke', at: 0.15, count: 6, spread: 18, spreadY: 30, size: 16, life: [0.6, 1.0], rise: 25, color: SOOT },
            { type: 'motes', at: 0.1, count: 8, spread: 18, rise: [60, 110], life: [0.5, 0.9], color: GOLD }
        ]
    },

    // [다리] 지진 분쇄 틱: 적 발밑 균열 + 파편
    quakeTick: {
        sfx: 'chimera_quake',
        layers: [
            { type: 'cracks', at: 0, dur: 0.7, count: 5, len: 45, color: FLAME },
            { type: 'debris', at: 0, count: 5, speed: 200, size: 3, color: ROCK },
            { type: 'smoke', at: 0.02, count: 2, spread: 14, spreadY: 4, size: 12, life: [0.5, 0.8], rise: 15, color: SOOT }
        ]
    },

    // [필살기] 파괴 광란(2페이즈 이후): 즉시 내려찍는 대형 충격파
    slam: {
        sfx: 'chimera_slam',
        layers: [
            { type: 'fireball', at: 0, dur: 0.4, r: 60, color: FLAME, dy: -20 },
            { type: 'ring', at: 0, dur: 0.55, r: 230, ground: true, color: FLAME, width: 9 },
            { type: 'ring', at: 0.06, dur: 0.5, r: 170, ground: true, color: GOLD, width: 4 },
            { type: 'cracks', at: 0, dur: 1.2, count: 10, len: 180, color: FLAME },
            { type: 'debris', at: 0, count: 16, speed: 340, size: 4, color: ROCK },
            { type: 'motes', at: 0.05, count: 14, spread: 80, rise: [80, 160], life: [0.8, 1.3], size: 3, color: GOLD, dy: -30 }
        ]
    },

    // [머리] 2페이즈: 변신 클립의 거대화 순간(0.58초)에 발밑 충격파 + 균열 + 불티
    phase2Burst: {
        sfx: 'chimera_phase2',
        layers: [
            { type: 'glow', at: 0, dur: 0.6, r: 60, color: FLAME },
            { type: 'flash', at: 0.58, dur: 0.2, r: 70, color: GOLD, dy: -80 },
            { type: 'ring', at: 0.58, dur: 0.55, r: 170, ground: true, color: FLAME, width: 8 },
            { type: 'ring', at: 0.64, dur: 0.5, r: 130, ground: true, color: GOLD, width: 4 },
            { type: 'cracks', at: 0.58, dur: 1.2, count: 9, len: 150, color: FLAME },
            { type: 'debris', at: 0.58, count: 14, speed: 320, size: 4, color: ROCK },
            { type: 'motes', at: 0.6, count: 16, spread: 60, rise: [80, 160], life: [0.8, 1.4], size: 3, color: GOLD, dy: -40 }
        ]
    }
};
