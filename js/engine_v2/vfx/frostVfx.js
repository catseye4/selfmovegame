/* ==========================================================================
   PROJECT: MAD OVERLORD // 서리의 무희 스킬 이펙트 정의 (v2, 새 캐릭터 3 — D-046)
   컨셉 시트: 서리 부채(얼음 칼날·초승달), 영원한 안식(얼음 결정에 가둠), 눈꽃
   팩션 색: 얼음 하늘색 + 흰 서리
   타이밍 원칙: 예비(모으기) → 발동(가장 밝고 짧게) → 여운(서리 가루, 얼음 조각)
   ========================================================================== */

export const ICE = '150, 220, 255';
export const FROST_WHITE = '215, 240, 255';
export const MIST = '110, 160, 200';
const SHARD = '190, 230, 255';
const DEEP = '20, 40, 70';

export const FROST_VFX = {
    // 서리 부채 칼날이 맞음 (작은 얼음 조각)
    fanHit: {
        sfx: 'frost_hit',
        layers: [
            { type: 'flash', at: 0, dur: 0.1, r: 16, color: ICE },
            { type: 'slash', at: 0, dur: 0.32, r: 30, arc: 2.7, sweep: 0.12, thick: 1, angle: 0.8, width: 7, color: FROST_WHITE },
            { type: 'motes', at: 0.03, count: 4, spread: 12, rise: [20, 45], life: [0.4, 0.7], size: 1.8, color: FROST_WHITE },
            { type: 'shards', at: 0, count: 4, speed: 150, angle: -0.4, cone: 1.8, size: 4.3, spin: 9, life: [0.7, 1.1], shape: 'ice', floor: 32, color: SHARD },
            { type: 'glow', at: 0.03, dur: 0.55, r: 16, color: ICE, dy: 30 },
            { type: 'mist', at: 0.06, r: 22, h: 8, life: 0.7, drift: 14, color: MIST, dy: 30 }
        ]
    },

    // 냉기가 가득 차 얼어붙음 (지면 기준): 발밑에서 작은 결정이 솟고 서리 고리가 조여듦
    freeze: {
        sfx: 'frost_freeze',
        layers: [
            { type: 'crystals', at: 0, dur: 1.0, count: 4, h: 44, spread: 16, color: ICE },
            { type: 'ring', at: 0, dur: 0.4, r: 34, ground: true, inward: true, color: FROST_WHITE, width: 3 },
            { type: 'flash', at: 0.08, dur: 0.12, r: 20, color: FROST_WHITE, dy: -18 },
            { type: 'glow', at: 0.04, dur: 0.85, r: 26, color: ICE },
            { type: 'motes', at: 0.05, count: 6, spread: 14, rise: [30, 70], life: [0.5, 0.8], size: 2, color: FROST_WHITE },
            { type: 'shards', at: 0.08, count: 4, speed: 100, size: 5, spin: 8, life: 0.75, shape: 'ice', floor: 0, color: SHARD },
            { type: 'mist', at: 0.02, r: 40, h: 10, life: 1.0, drift: 10, color: MIST }
        ]
    },

    // [팔 스킬] 초승달 참격: 부채 끝에서 터지는 서리 (날아가는 초승달은 BattleFx.launchWave)
    crescentBurst: {
        sfx: 'frost_crescent',
        layers: [
            { type: 'flash', at: 0, dur: 0.16, r: 34, color: ICE },
            { type: 'slash', at: 0, dur: 0.42, r: 75, arc: 2.7, sweep: 0.12, thick: 1, angle: Math.PI / 2, width: 14, color: ICE },
            { type: 'slash', at: 0.04, dur: 0.4, r: 55, arc: 2.7, sweep: 0.12, thick: 1, angle: Math.PI / 2, width: 5, color: FROST_WHITE },
            { type: 'shards', at: 0, count: 6, speed: 220, angle: -0.3, cone: 1.2, size: 4.7, spin: 9, life: [0.7, 1.1], shape: 'ice', floor: 32, color: SHARD },
            { type: 'motes', at: 0.05, count: 6, spread: 16, rise: [20, 60], life: [0.5, 0.9], size: 2, color: FROST_WHITE },
            { type: 'mist', at: 0.06, r: 29, h: 8, life: 0.8, drift: 14, color: MIST, dy: 30 }
        ]
    },

    // 초승달에 베인 적
    crescentHit: {
        layers: [
            { type: 'slash', at: 0, dur: 0.32, r: 55, arc: 2.7, sweep: 0.12, thick: 1, angle: Math.PI / 2, width: 14, color: ICE },
            { type: 'slash', at: 0.04, dur: 0.38, r: 41, arc: 2.7, sweep: 0.12, thick: 1, angle: Math.PI / 2, width: 5, color: FROST_WHITE },
            { type: 'flash', at: 0, dur: 0.12, r: 22, color: ICE },
            { type: 'shards', at: 0, count: 5, speed: 220, size: 5.0, spin: 9, life: [0.7, 1.1], shape: 'ice', floor: 32, color: SHARD },
            { type: 'glow', at: 0.04, dur: 0.55, r: 24, color: ICE, dy: 30 },
            { type: 'mist', at: 0.06, r: 22, h: 8, life: 0.8, drift: 14, color: MIST, dy: 30 }
        ]
    },

    // [몸통 스킬] 눈보라 춤: 무희 둘레에 깔리는 서리 장판 (저주 장판과 같은 그리기, 얼음 색)
    blizzardField: {
        kind: 'field', rx: 150, flat: 0.22, dy: 4, origin: 150,
        color: ICE, dark: DEEP, haze: '170, 210, 240', wisps: 18, pulseSec: 0.6,
        rune: { r: 60, dx: 0, spin: 1.4 }
    },

    // 눈보라가 퍼짐 (지면 기준)
    blizzardOpen: {
        sfx: 'frost_blizzard',
        layers: [
            { type: 'ring', at: 0, dur: 0.5, r: 170, ground: true, color: FROST_WHITE, width: 5 },
            { type: 'swirl', at: 0, dur: 0.8, r: 70, arms: 4, spin: 12, color: FROST_WHITE, dy: -70 },
            { type: 'crystals', at: 0.06, dur: 0.85, count: 5, h: 24, spread: 85, color: ICE },
            { type: 'glow', at: 0.03, dur: 0.9, r: 100, color: ICE },
            { type: 'motes', at: 0.05, count: 12, spread: 140, rise: [40, 110], life: [0.8, 1.3], size: 2.4, color: FROST_WHITE },
            { type: 'smoke', at: 0.08, count: 4, spread: 80, spreadY: 8, size: 22, life: [0.7, 1.1], rise: 14, color: MIST, layer: 'ground' }
        ]
    },

    // 눈보라 틱 (지면 기준, 안의 적마다)
    blizzardTick: {
        layers: [
            { type: 'ring', at: 0, dur: 0.35, r: 22, ground: true, inward: true, color: ICE, width: 2.5 },
            { type: 'crystals', at: 0.02, dur: 0.5, count: 2, h: 14, spread: 10, color: ICE },
            { type: 'motes', at: 0, count: 3, spread: 12, rise: [30, 60], life: [0.4, 0.6], size: 2, color: FROST_WHITE }
        ]
    },

    // [머리 필살기] 영원한 안식: 무희 발밑에서 퍼지는 서리 (지면 기준)
    eternalCall: {
        sfx: 'frost_eternal',
        layers: [
            { type: 'rune', at: 0, dur: 0.85, r: 80, color: FROST_WHITE, spin: 0.6 },
            { type: 'ring', at: 0, dur: 0.7, r: 260, ground: true, color: ICE, width: 7 },
            { type: 'glow', at: 0, dur: 1.4, r: 140, color: ICE },
            { type: 'flash', at: 0.05, dur: 0.16, r: 42, color: FROST_WHITE, dy: -25 },
            { type: 'crystals', at: 0.05, dur: 1.4, count: 7, h: 70, spread: 90, color: ICE },
            { type: 'motes', at: 0.12, count: 4, spread: 80, rise: [30, 70], life: [0.7, 1.1], size: 2, color: FROST_WHITE }
        ]
    },

    // 적을 가두는 큰 얼음 결정 (지면 기준) — 깨질 때까지 유지 (dur = 가두는 시간)
    encase: {
        layers: [
            { type: 'crystals', at: 0, dur: 2.4, count: 6, h: 96, spread: 26, color: ICE },
            { type: 'glow', at: 0, dur: 2.4, r: 40, color: ICE },
            { type: 'ring', at: 0, dur: 0.45, r: 44, ground: true, inward: true, color: FROST_WHITE, width: 3 },
            { type: 'flash', at: 0, dur: 0.16, r: 30, color: FROST_WHITE, dy: -40 },
            { type: 'shards', at: 0.08, count: 4, speed: 105, size: 6, spin: 7, life: 0.85, shape: 'ice', dy: -40, floor: 40, color: SHARD },
            { type: 'mist', at: 0, r: 50, h: 13, life: 2.4, drift: 8, color: MIST }
        ]
    },

    // 얼음 결정이 한꺼번에 깨짐 (지면 기준)
    shatter: {
        sfx: 'frost_shatter',
        layers: [
            { type: 'flash', at: 0, dur: 0.18, r: 40, color: FROST_WHITE, dy: -40 },
            { type: 'shockwave', at: 0, dur: 0.4, r: 60, color: ICE, width: 20, dy: -40 },
            { type: 'shards', at: 0, count: 10, speed: 320, size: 6.1, spin: 9, life: [0.7, 1.1], shape: 'ice', floor: 40, color: SHARD, dy: -40 },
            { type: 'motes', at: 0.04, count: 8, spread: 26, rise: [20, 65], life: [0.65, 1.0], size: 2.2, color: FROST_WHITE, dy: -35 },
            { type: 'shockwave', at: 0.04, dur: 0.55, r: 52, ground: true, color: ICE, width: 14 },
            { type: 'glow', at: 0.05, dur: 0.8, r: 36, color: ICE },
            { type: 'mist', at: 0.05, r: 34, h: 8, life: 0.9, drift: 14, color: MIST, dy: 0 }
        ]
    }
};
