/* ==========================================================================
   PROJECT: MAD OVERLORD // 심연의 길잡이 스킬 이펙트 정의 (v2, 새 캐릭터 1 — D-044)
   컨셉 시트: 고압 방수포(물줄기), 앵커 견인, 청록 유령 불길, 심연의 손
   팩션 색: 물(하늘빛 청록) + 심연(짙은 청록 유령 빛)
   타이밍 원칙: 예비(모으기) → 발동(가장 밝고 짧게) → 여운(물보라, 안개)
   ========================================================================== */

export const WATER = '90, 225, 235';
export const ABYSS = '40, 220, 190';
const FOAM = '200, 245, 255';
const MIST = '40, 90, 110';
const DEEP = '10, 45, 60';

export const DIVER_VFX = {
    // 기본 공격 고압 방수포: 총구 → 사거리 끝(마지막으로 맞은 적) 물줄기 (play 옵션 to)
    jet: {
        sfx: 'diver_jet',
        layers: [
            { type: 'jet', at: 0, dur: 0.22, w: 6, spray: 6, color: WATER },
            { type: 'flash', at: 0, dur: 0.1, r: 14, color: WATER },
            { type: 'drops', at: 0.03, count: 5, speed: 200, size: 2.6, color: FOAM, pos: 'to' }
        ]
    },

    // 물줄기에 맞은 적 (작은 물보라)
    jetHit: {
        layers: [
            { type: 'flash', at: 0, dur: 0.1, r: 16, color: WATER },
            { type: 'drops', at: 0, count: 6, speed: 220, size: 2.4, color: FOAM },
            { type: 'smoke', at: 0.02, count: 1, spread: 6, spreadY: 8, size: 10, life: [0.3, 0.5], rise: 15, color: MIST }
        ]
    },

    // [팔 스킬] 앵커 견인: 앵커가 박힌 순간 (사슬은 BattleFx.launchChain)
    anchorHook: {
        sfx: 'diver_anchor_hit',
        layers: [
            { type: 'flash', at: 0, dur: 0.14, r: 26, color: ABYSS },
            { type: 'ring', at: 0, dur: 0.32, r: 40, color: ABYSS, width: 5 },
            { type: 'sparks', at: 0, count: 10, speed: 260, color: '200, 220, 230' },
            { type: 'motes', at: 0.02, count: 6, spread: 12, rise: [40, 90], life: [0.4, 0.8], size: 2.4, color: ABYSS }
        ]
    },

    // 끌려온 적이 발 앞에 떨어짐
    anchorLand: {
        layers: [
            { type: 'ring', at: 0, dur: 0.4, r: 46, ground: true, color: ABYSS, width: 4 },
            { type: 'smoke', at: 0, count: 4, spread: 18, spreadY: 4, size: 14, life: [0.4, 0.7], rise: 18, color: MIST },
            { type: 'drops', at: 0, count: 8, speed: 200, size: 2.6, color: FOAM }
        ]
    },

    // [몸통 스킬] 고압 분사: 총구에서 터지는 물살 (밀어내는 물결은 BattleFx.launchWave)
    surgeBurst: {
        sfx: 'diver_surge',
        layers: [
            { type: 'flash', at: 0, dur: 0.18, r: 40, color: WATER },
            { type: 'ring', at: 0, dur: 0.35, r: 60, color: FOAM, width: 6 },
            { type: 'drops', at: 0, count: 18, speed: 320, angle: -0.4, cone: 1.4, size: 3.2, color: FOAM },
            { type: 'smoke', at: 0.04, count: 5, spread: 16, spreadY: 20, size: 18, life: [0.5, 0.9], rise: 20, color: MIST }
        ]
    },

    // 물살에 밀려난 적
    surgeHit: {
        layers: [
            { type: 'flash', at: 0, dur: 0.12, r: 22, color: WATER },
            { type: 'drops', at: 0, count: 10, speed: 260, angle: -1.2, cone: 1.6, size: 3, color: FOAM },
            { type: 'chevrons', at: 0, count: 2, spread: 3, dy: -40, fall: 30, life: [0.5, 0.7], size: 5, color: WATER }
        ]
    },

    // [머리 필살기] 심연의 손: 대상 발밑 검푸른 웅덩이에서 유령 손이 솟아 움켜쥠 (지면 기준)
    hands: {
        sfx: 'diver_hands',
        layers: [
            { type: 'glow', at: 0, dur: 1.6, r: 46, color: DEEP },
            { type: 'ring', at: 0, dur: 0.5, r: 50, ground: true, inward: true, color: ABYSS, width: 4 },
            { type: 'hands', at: 0.05, dur: 1.5, count: 3, h: 54, spread: 26, color: ABYSS },
            { type: 'motes', at: 0.1, count: 10, spread: 26, rise: [50, 110], life: [0.6, 1.1], size: 2.6, color: ABYSS },
            { type: 'smoke', at: 0.2, count: 4, spread: 20, spreadY: 6, size: 16, life: [0.8, 1.3], rise: 22, color: DEEP, layer: 'ground' }
        ]
    },

    // 심연의 손에 잡힌 적의 지속 피해 틱 (지면 기준)
    handsTick: {
        layers: [
            { type: 'ring', at: 0, dur: 0.4, r: 28, ground: true, inward: true, color: ABYSS, width: 3 },
            { type: 'motes', at: 0, count: 3, spread: 10, rise: [40, 80], life: [0.4, 0.7], size: 2.2, color: ABYSS }
        ]
    },

    // 필살기 발동: 길잡이 발밑에서 퍼지는 심연
    abyssCall: {
        layers: [
            { type: 'ring', at: 0, dur: 0.6, r: 220, ground: true, color: ABYSS, width: 7 },
            { type: 'glow', at: 0, dur: 1.2, r: 120, color: ABYSS },
            { type: 'swirl', at: 0, dur: 0.7, r: 46, arms: 3, spin: 10, color: ABYSS, dy: -60 }
        ]
    }
};
