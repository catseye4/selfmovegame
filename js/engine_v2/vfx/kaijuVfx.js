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
    // [팔 스킬] 산성 돌진: 몸통 박치기 충격 + 산성 폭발 + 바닥 산성 웅덩이 (산성 발톱 팔, D-030)
    acidCharge: {
        sfx: 'kaiju_bite',
        layers: [
            { type: 'flash', at: 0, dur: 0.18, r: 44, color: ACID, dy: -40 },
            { type: 'goo', at: 0.02, count: 6, speed: 224, angle: -0.45, cone: 2.0, size: 7.3, life: [0.8, 1.15], splat: true, floor: 40, color: ACID, dy: -40 },
            { type: 'shockwave', at: 0.02, dur: 0.45, r: 110, ground: true, color: ACID, width: 28 },
            { type: 'cracks', at: 0.03, dur: 1.0, count: 6, len: 80, color: ACID },
            { type: 'glow', at: 0.05, dur: 3.0, r: 90, color: ACID },
            { type: 'shockwave', at: 0.2, dur: 0.65, r: 70, ground: true, color: MOSS, width: 16 },
            { type: 'mist', at: 0.1, r: 62, h: 11, life: 1.3, drift: 14, color: MOSS, dy: 0 }
        ]
    },
    // 산성 부식 틱 (물린 적 위에서 거품)
    acidTick: {
        layers: [
            { type: 'goo', at: 0, count: 3, speed: 52, size: 4.0, life: [0.8, 1.15], splat: true, floor: 0, color: ACID },
            { type: 'glow', at: 0, dur: 0.5, r: 14, color: ACID, dy: 26 },
            { type: 'mist', at: 0, r: 22, h: 8, life: 0.6, drift: 14, color: MOSS, dy: 0 }
        ]
    },
    // 물기 적중: 이빨 자국 + 산성 튀김 + 바닥 산성 웅덩이
    biteHit: {
        sfx: 'kaiju_bite',
        layers: [
            { type: 'bite', at: 0, dur: 0.45, r: 48, color: ACID },
            { type: 'flash', at: 0.06, dur: 0.12, r: 24, color: ACID },
            { type: 'goo', at: 0.06, count: 3, speed: 136, angle: -0.7, cone: 2.0, size: 5.3, life: [0.8, 1.15], splat: true, floor: 36, color: ACID },
            { type: 'mist', at: 0.1, r: 22, h: 8, life: 0.8, drift: 14, color: MOSS, dy: 36 },
            { type: 'glow', at: 0.12, dur: 0.45, r: 30, color: ACID, dy: 36 },
            { type: 'ring', at: 0.16, dur: 0.55, r: 32, ground: true, color: ACID, width: 2, dy: 36 }
        ]
    },

    // [다리] 포자 살포 틱: 적 발밑에서 독 포자 구름
    sporeTick: {
        sfx: 'kaiju_spore',
        layers: [
            { type: 'mist', at: 0, r: 46, h: 11, life: 1.4, drift: 14, color: SPORE, dy: 0 },
            { type: 'motes', at: 0, count: 5, spread: 22, rise: [30, 80], life: [0.7, 1.1], size: 2.6, color: ACID },
            { type: 'ring', at: 0, dur: 0.5, r: 34, ground: true, color: ACID, width: 3 },
            { type: 'glow', at: 0, dur: 0.9, r: 32, color: ACID },
            { type: 'goo', at: 0, count: 3, speed: 90, size: 5, life: 0.85, floor: 0, splat: true, color: ACID }
        ]
    },

    // [몸통] 알 낳기: 발밑 포자 연기
    eggLay: {
        sfx: 'kaiju_egg_lay',
        layers: [
            { type: 'ring', at: 0, dur: 0.3, r: 24, ground: true, inward: true, color: SHELL, width: 3 },
            { type: 'flash', at: 0.12, dur: 0.12, r: 12, color: ACID, dy: -6 },
            { type: 'drops', at: 0.12, count: 2, speed: 90, size: 3, color: ACID },
            { type: 'smoke', at: 0.12, count: 2, spread: 12, spreadY: 6, size: 12, life: [0.5, 0.8], rise: 15, color: SPORE },
            { type: 'glow', at: 0, dur: 0.8, r: 22, color: ACID }
        ]
    },

    // [몸통] 알 부화: 껍질이 튀고 산성 증기
    eggHatch: {
        sfx: 'kaiju_egg_hatch',
        layers: [
            { type: 'flash', at: 0, dur: 0.14, r: 24, color: ACID, dy: -14 },
            { type: 'ring', at: 0, dur: 0.4, r: 40, ground: true, color: ACID, width: 5 },
            { type: 'debris', at: 0, count: 9, speed: 200, size: 3.5, color: SHELL, dy: -12 },
            { type: 'drops', at: 0.02, count: 6, speed: 150, angle: -Math.PI / 2, cone: 2.2, size: 3, color: ACID, dy: -12 },
            { type: 'glow', at: 0.03, dur: 0.85, r: 28, color: ACID },
            { type: 'smoke', at: 0.06, count: 5, spread: 14, spreadY: 14, size: 14, life: [0.6, 1.0], rise: 25, color: SPORE }
        ]
    },

    // [필살기] 대지 포효: 발밑에서 퍼지는 산성 충격파 + 균열 + 포자 폭풍
    roarBurst: {
        sfx: 'kaiju_roar',
        layers: [
            { type: 'flash', at: 0, dur: 0.16, r: 48, color: ACID, dy: -35 },
            { type: 'shockwave', at: 0, dur: 0.6, r: 280, ground: true, color: ACID, width: 36 },
            { type: 'shockwave', at: 0.1, dur: 0.6, r: 210, ground: true, color: MOSS, width: 20 },
            { type: 'cracks', at: 0, dur: 1.3, count: 10, len: 190, color: ACID },
            { type: 'glow', at: 0, dur: 1.2, r: 150, color: ACID },
            { type: 'smoke', at: 0.05, count: 10, spread: 150, spreadY: 20, size: 26, life: [0.9, 1.5], rise: 30, color: SPORE },
            { type: 'debris', at: 0.02, count: 6, speed: 250, size: 3.5, color: SHELL },
            { type: 'motes', at: 0.08, count: 12, spread: 150, rise: [60, 140], life: [0.8, 1.3], size: 3, color: ACID }
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
