/* ==========================================================================
   PROJECT: MAD OVERLORD // 봉합 성녀 스킬 이펙트 정의 (v2, 새 캐릭터 2 — D-046)
   컨셉 시트: 봉합 주사(붉은 바늘), 생명 봉인(붉은 실 장판·조준 원), 금빛 후광
   팩션 색: 붉은 약물·실 + 금빛 성스러움
   타이밍 원칙: 예비(모으기) → 발동(가장 밝고 짧게) → 여운(실 가루, 잔광)
   ========================================================================== */

export const BLOOD = '235, 40, 70';
export const HOLY = '255, 215, 130';
const THREAD = '255, 90, 110';
const DARK = '60, 6, 18';

export const SAINT_VFX = {
    // 바늘이 꽂힘 (기본 공격·3연발)
    needleHit: {
        sfx: 'saint_stitch',
        layers: [
            { type: 'flash', at: 0, dur: 0.1, r: 16, color: BLOOD },
            { type: 'claw', at: 0, dur: 0.3, count: 2, len: 22, gap: 6, angle: 0.7, width: 3, bend: 2, color: THREAD },
            { type: 'drops', at: 0, count: 4, speed: 160, size: 2.2, color: BLOOD }
        ]
    },

    // 봉합 실: 바늘이 꽂힌 적에서 근처 적으로 이어지는 붉은 실 (play 옵션 to = 이어진 적)
    threadLink: {
        layers: [
            { type: 'beam', at: 0, dur: 0.28, w: 2.2, color: THREAD },
            { type: 'flash', at: 0.02, dur: 0.1, r: 12, color: BLOOD, pos: 'to' },
            { type: 'drops', at: 0.02, count: 3, speed: 140, size: 2, color: BLOOD, pos: 'to' }
        ]
    },

    // 3연발 바늘에 묶임 (짧은 속박): 실이 발목을 감는 고리
    stitchBind: {
        layers: [
            { type: 'ring', at: 0, dur: 0.45, r: 26, ground: true, inward: true, color: THREAD, width: 3 },
            { type: 'chevrons', at: 0, count: 2, spread: 3, dy: -60, fall: 30, life: [0.5, 0.7], size: 5, color: BLOOD }
        ]
    },

    // [몸통 스킬] 생명 봉인: 붉은 실 장판 (저주 장판과 같은 그리기, 안의 적은 발목이 실에 묶임)
    // rx: 가로 반지름(게임 px) — 중심은 전투 엔진이 정함
    sealField: {
        kind: 'field', rx: 120, flat: 0.22, dy: 4, origin: 24,
        color: THREAD, dark: DARK, haze: '150, 25, 50', wisps: 12, pulseSec: 0.5,
        rune: { r: 54, dx: 30, spin: -0.9 }
    },

    // 장판이 펼쳐지는 순간 (지면 기준)
    sealOpen: {
        sfx: 'saint_seal',
        layers: [
            { type: 'rune', at: 0, dur: 0.9, r: 120, color: BLOOD, spin: -1.6 },
            { type: 'ring', at: 0.05, dur: 0.45, r: 140, ground: true, color: THREAD, width: 5 },
            { type: 'motes', at: 0.1, count: 12, spread: 110, rise: [40, 100], life: [0.6, 1.0], size: 2.4, color: THREAD }
        ]
    },

    // 장판 틱: 안의 적 발밑 조여드는 실 (지면 기준)
    sealTick: {
        layers: [
            { type: 'ring', at: 0, dur: 0.35, r: 22, ground: true, inward: true, color: THREAD, width: 2.5 },
            { type: 'glow', at: 0, dur: 0.4, r: 18, color: BLOOD }
        ]
    },

    // 봉합된 적이 쓰러짐 → 시체에 실 매듭 (지면 기준)
    corpseStitch: {
        layers: [
            { type: 'claw', at: 0, dur: 0.5, count: 2, len: 30, gap: 10, angle: 0.8, width: 4, bend: 0, color: THREAD, dy: -10 },
            { type: 'claw', at: 0.05, dur: 0.5, count: 2, len: 30, gap: 10, angle: 2.35, width: 4, bend: 0, color: THREAD, dy: -10 },
            { type: 'motes', at: 0, count: 5, spread: 14, rise: [30, 60], life: [0.4, 0.7], size: 2, color: BLOOD }
        ]
    },

    // [머리 필살기] 억지 부활: 성녀 발밑에서 퍼지는 금빛·붉은 고리
    reviveCall: {
        sfx: 'saint_revive',
        layers: [
            { type: 'ring', at: 0, dur: 0.6, r: 230, ground: true, color: HOLY, width: 6 },
            { type: 'ring', at: 0.08, dur: 0.6, r: 180, ground: true, color: BLOOD, width: 4 },
            { type: 'glow', at: 0, dur: 1.2, r: 110, color: HOLY },
            { type: 'motes', at: 0.05, count: 14, spread: 60, rise: [60, 140], life: [0.7, 1.2], size: 2.6, color: HOLY }
        ]
    },

    // 시체(또는 꿰맨 적)가 붉은 실에 꿰매여 아군으로 일어남 (지면 기준)
    corpseRise: {
        layers: [
            { type: 'pillar', at: 0, dur: 0.6, h: 110, w: 26, color: BLOOD },
            { type: 'rune', at: 0, dur: 0.8, r: 36, color: THREAD, spin: 2.2 },
            { type: 'claw', at: 0.15, dur: 0.5, count: 3, len: 40, gap: 9, angle: Math.PI / 2, width: 3, bend: 6, color: THREAD, dy: -40 },
            { type: 'flash', at: 0.3, dur: 0.18, r: 28, color: HOLY, dy: -40 },
            { type: 'motes', at: 0.3, count: 10, spread: 18, rise: [60, 120], life: [0.6, 1.0], size: 2.4, color: HOLY }
        ]
    },

    // 다리 패시브 자가 봉합: 몸을 꿰매며 회복 (지면 기준, 1초마다)
    selfStitch: {
        layers: [
            { type: 'motes', at: 0, count: 5, spread: 22, rise: [40, 80], life: [0.5, 0.8], size: 2.2, color: THREAD },
            { type: 'glow', at: 0, dur: 0.6, r: 30, color: BLOOD }
        ]
    }
};
