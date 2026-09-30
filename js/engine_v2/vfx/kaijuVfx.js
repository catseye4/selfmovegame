/* ==========================================================================
   PROJECT: MAD OVERLORD // 거대괴수 스킬 이펙트 정의 (v2)
   컨셉 시트: 오염물질에서 태어난 괴수 — 산성 점액, 알/포자 산란(새끼 괴수), 포효
   산성 초록 + 짙은 이끼색이 팩션 색
   ========================================================================== */

export const ACID = '160, 255, 50';
export const MOSS = '55, 100, 20';
const SPORE = '140, 220, 50';
const SHELL = '150, 200, 70';

export const KAIJU_VFX = {
    // 물기 적중: 이빨 자국 + 산성 튀김 + 바닥 산성 웅덩이
    biteHit: {
        sfx: 'kaiju_bite',
        layers: [
            { type: 'bite', at: 0, dur: 0.45, r: 24, color: ACID },
            { type: 'flash', at: 0.06, dur: 0.12, r: 24, color: ACID },
            { type: 'sparks', at: 0.06, count: 10, speed: 230, angle: -0.6, cone: 2.4, color: ACID },
            { type: 'smoke', at: 0.1, count: 3, spread: 10, spreadY: 10, size: 12, life: [0.5, 0.8], rise: 30, color: MOSS },
            { type: 'glow', at: 0.12, dur: 1.4, r: 30, color: ACID, dy: 36 }
        ]
    },

    // [다리] 포자 살포 틱: 적 발밑에서 독 포자 구름
    sporeTick: {
        sfx: 'kaiju_spore',
        layers: [
            { type: 'smoke', at: 0, count: 7, spread: 24, spreadY: 22, size: 22, life: [0.9, 1.4], rise: 20, color: SPORE },
            { type: 'motes', at: 0, count: 9, spread: 22, rise: [30, 80], life: [0.7, 1.1], size: 2.6, color: ACID },
            { type: 'ring', at: 0, dur: 0.5, r: 34, ground: true, color: ACID, width: 3 },
            { type: 'glow', at: 0, dur: 0.9, r: 32, color: ACID }
        ]
    },

    // [몸통] 알 낳기: 발밑 포자 연기
    eggLay: {
        sfx: 'kaiju_egg_lay',
        layers: [
            { type: 'smoke', at: 0, count: 4, spread: 12, spreadY: 6, size: 12, life: [0.5, 0.8], rise: 15, color: SPORE },
            { type: 'glow', at: 0, dur: 0.6, r: 18, color: ACID }
        ]
    },

    // [몸통] 알 부화: 껍질이 튀고 산성 증기
    eggHatch: {
        sfx: 'kaiju_egg_hatch',
        layers: [
            { type: 'flash', at: 0, dur: 0.14, r: 24, color: ACID, dy: -14 },
            { type: 'ring', at: 0, dur: 0.4, r: 40, ground: true, color: ACID, width: 5 },
            { type: 'debris', at: 0, count: 9, speed: 200, size: 3.5, color: SHELL, dy: -12 },
            { type: 'sparks', at: 0, count: 8, speed: 180, angle: -Math.PI / 2, cone: 2.4, color: ACID, dy: -12 },
            { type: 'smoke', at: 0.03, count: 5, spread: 14, spreadY: 14, size: 14, life: [0.6, 1.0], rise: 25, color: SPORE }
        ]
    },

    // [필살기] 대지 포효: 발밑에서 퍼지는 산성 충격파 + 균열 + 포자 폭풍
    roarBurst: {
        sfx: 'kaiju_roar',
        layers: [
            { type: 'ring', at: 0, dur: 0.6, r: 280, ground: true, color: ACID, width: 9 },
            { type: 'ring', at: 0.1, dur: 0.6, r: 210, ground: true, color: MOSS, width: 5 },
            { type: 'cracks', at: 0, dur: 1.3, count: 10, len: 190, color: ACID },
            { type: 'glow', at: 0, dur: 1.2, r: 150, color: ACID },
            { type: 'smoke', at: 0.05, count: 12, spread: 150, spreadY: 20, size: 26, life: [0.9, 1.5], rise: 30, color: SPORE },
            { type: 'motes', at: 0.05, count: 18, spread: 150, rise: [60, 140], life: [0.8, 1.3], size: 3, color: ACID }
        ]
    },

    // [머리] 재생: 몸을 따라 떠오르는 초록 빛가루 (1초마다)
    regen: {
        sfx: 'kaiju_regen',
        layers: [
            { type: 'motes', at: 0, count: 11, spread: 38, rise: [60, 120], life: [0.8, 1.2], size: 3, color: ACID, dy: -45 },
            { type: 'ring', at: 0, dur: 0.6, r: 55, ground: true, color: ACID, width: 3 },
            { type: 'glow', at: 0, dur: 0.8, r: 48, color: ACID }
        ]
    }
};
