/* ==========================================================================
   PROJECT: MAD OVERLORD // 뒤틀린 인형사 스킬 이펙트 정의 (v2, 새 캐릭터 4 — D-046·D-049)
   컨셉 시트: 가위 참격(은빛 칼날·X자), 인형 실(청록 실·꼭두각시), 토끼 인형 가족
   팩션 색: 청록 실 + 은빛 가위 + 크림색 솜
   타이밍 원칙: 예비(모으기) → 발동(가장 밝고 짧게) → 여운(솜·실 가루)
   ========================================================================== */

export const THREAD = '90, 230, 240';
export const STEEL = '225, 238, 248';
const STUFF = '250, 238, 215';       // 인형 솜
const FELT = '205, 180, 150';

export const DOLL_VFX = {
    // 가위로 자름 (기본 공격 한 번)
    snipHit: {
        sfx: 'doll_snip',
        layers: [
            { type: 'slash', at: 0, dur: 0.28, r: 42, arc: 1.9, sweep: 0.12, thick: 1, angle: 0.75, width: 8, color: STEEL },
            { type: 'slash', at: 0.02, dur: 0.28, r: 42, arc: 1.9, sweep: 0.12, thick: 1, angle: 2.4, width: 8, color: STEEL },
            { type: 'flash', at: 0, dur: 0.1, r: 16, color: STEEL },
            { type: 'motes', at: 0.03, count: 4, spread: 10, rise: [20, 50], life: [0.4, 0.7], size: 1.8, color: THREAD },
            { type: 'smoke', at: 0.05, count: 1, spread: 6, spreadY: 8, size: 8, life: [0.4, 0.65], rise: 16, color: STUFF },
            { type: 'glow', at: 0.03, dur: 0.55, r: 18, color: THREAD, dy: 28 }
        ]
    },

    // [팔 스킬] 가위 참격 X자: 큰 X자 칼자국
    xcut: {
        sfx: 'doll_xcut',
        layers: [
            { type: 'slash', at: 0, dur: 0.42, r: 101, arc: 1.65, sweep: 0.12, thick: 1, angle: 0.8, width: 20, color: STEEL },
            { type: 'slash', at: 0.12, dur: 0.42, r: 101, arc: 1.65, sweep: 0.12, thick: 1, angle: 2.35, width: 20, color: STEEL },
            { type: 'flash', at: 0, dur: 0.16, r: 34, color: STEEL },
            { type: 'flash', at: 0.12, dur: 0.16, r: 34, color: THREAD },
            { type: 'streaks', at: 0.04, count: 6, speed: 260, len: 34, life: [0.3, 0.55], angle: 0, cone: 1.8, color: STEEL },
            { type: 'motes', at: 0.14, count: 5, spread: 24, rise: [20, 55], life: [0.5, 0.8], size: 2, color: THREAD },
            { type: 'smoke', at: 0.16, count: 2, spread: 16, spreadY: 18, size: 10, life: [0.5, 0.8], rise: 18, color: STUFF },
            { type: 'ring', at: 0.12, dur: 0.35, r: 58, color: THREAD, width: 3 },
            { type: 'glow', at: 0.14, dur: 0.7, r: 32, color: THREAD, dy: 32 }
        ]
    },

    // [몸통 스킬] 인형 가족: 실에 매달려 내려오는 인형 (지면 기준, 인형마다)
    dollDrop: {
        sfx: 'doll_summon',
        layers: [
            { type: 'beam', at: 0, dur: 0.5, w: 2, color: THREAD },
            { type: 'ring', at: 0, dur: 0.22, r: 24, ground: true, inward: true, color: THREAD, width: 2 },
            { type: 'flash', at: 0.15, dur: 0.1, r: 16, color: STUFF, dy: -6 },
            { type: 'smoke', at: 0.15, count: 3, spread: 18, spreadY: 6, size: 14, life: [0.4, 0.7], rise: 20, color: STUFF },
            { type: 'ring', at: 0.15, dur: 0.35, r: 34, ground: true, color: THREAD, width: 3 },
            { type: 'glow', at: 0.15, dur: 0.75, r: 26, color: THREAD },
            { type: 'motes', at: 0.15, count: 6, spread: 16, rise: [30, 70], life: [0.4, 0.8], size: 2.2, color: THREAD }
        ]
    },

    // 토끼 인형이 쓰러지며 터짐: 솜이 사방으로 + 청록 실 고리 (지면 기준)
    dollBurst: {
        sfx: 'doll_burst',
        layers: [
            { type: 'flash', at: 0, dur: 0.16, r: 34, color: STUFF, dy: -30 },
            { type: 'ring', at: 0, dur: 0.4, r: 80, ground: true, color: THREAD, width: 5 },
            { type: 'motes', at: 0.02, count: 8, spread: 24, rise: [15, 45], life: [0.7, 1.1], size: 3.4, color: STUFF, dy: -24 },
            { type: 'debris', at: 0, count: 5, speed: 220, size: 3, color: FELT, dy: -30 },
            { type: 'smoke', at: 0.03, count: 9, spread: 24, spreadY: 18, size: 12, life: [0.7, 1.2], rise: 16, color: STUFF, dy: -24 },
            { type: 'swirl', at: 0.02, dur: 0.55, r: 36, arms: 3, spin: -9, color: THREAD, dy: -24 },
            { type: 'glow', at: 0.05, dur: 0.9, r: 40, color: THREAD }
        ]
    },

    // 토끼 인형이 적을 붙잡음 (지면 기준)
    grab: {
        layers: [
            { type: 'ring', at: 0, dur: 0.35, r: 24, ground: true, inward: true, color: THREAD, width: 2.5 },
            { type: 'claw', at: 0, dur: 0.5, count: 2, len: 24, gap: 8, angle: Math.PI / 2, width: 2, bend: 12, color: THREAD, dy: -12 },
            { type: 'flash', at: 0.02, dur: 0.1, r: 10, color: STUFF, dy: -12 },
            { type: 'glow', at: 0.04, dur: 0.6, r: 18, color: THREAD }
        ]
    },

    // [머리 필살기] 인형 실 발동: 인형사 둘레로 실이 퍼짐 (지면 기준)
    stringsCall: {
        sfx: 'doll_strings',
        layers: [
            { type: 'ring', at: 0, dur: 0.6, r: 240, ground: true, color: THREAD, width: 5 },
            { type: 'rune', at: 0, dur: 1.0, r: 80, color: THREAD, spin: 2 },
            { type: 'claw', at: 0.04, dur: 0.65, count: 3, len: 90, gap: 24, angle: Math.PI / 2, width: 2, bend: 3, color: THREAD, dy: -50 },
            { type: 'flash', at: 0.08, dur: 0.16, r: 28, color: STEEL, dy: -35 },
            { type: 'glow', at: 0.08, dur: 1.0, r: 70, color: THREAD },
            { type: 'motes', at: 0.05, count: 16, spread: 90, rise: [60, 140], life: [0.7, 1.2], size: 2.4, color: THREAD }
        ]
    },

    // 꼭두각시가 된 적: 위에서 내려온 실 (play 옵션 to = 적 몸, 기준점 = 위쪽)
    puppetString: {
        layers: [
            { type: 'beam', at: 0, dur: 0.55, w: 1.8, color: THREAD },
            { type: 'flash', at: 0, dur: 0.12, r: 12, color: THREAD, pos: 'to' },
            { type: 'ring', at: 0.03, dur: 0.45, r: 18, inward: true, color: THREAD, width: 2, pos: 'to' },
            { type: 'claw', at: 0.04, dur: 0.55, count: 2, len: 22, gap: 8, angle: 0.8, width: 2, bend: 5, color: THREAD, pos: 'to' }
        ]
    },

    // 꼭두각시가 다른 적을 때림
    puppetHit: {
        layers: [
            { type: 'flash', at: 0, dur: 0.1, r: 14, color: THREAD },
            { type: 'ring', at: 0, dur: 0.28, r: 22, color: THREAD, width: 2 },
            { type: 'motes', at: 0.03, count: 4, spread: 10, rise: [25, 50], life: [0.4, 0.65], size: 1.8, color: THREAD },
            { type: 'glow', at: 0.03, dur: 0.5, r: 16, color: THREAD, dy: 28 }
        ]
    }
};
