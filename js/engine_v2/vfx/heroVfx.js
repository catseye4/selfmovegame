/* ==========================================================================
   PROJECT: MAD OVERLORD // 타락 히어로 스킬 이펙트 정의 (v2)
   컨셉 시트: 흑마법 광역 스킬(마법진 + 보라 기둥), 세뇌 파동(보라 파동으로 적을 아군으로), 스킬 시전
   타이밍 원칙: 예비(모으기) → 발동(가장 밝고 짧게) → 여운(연기, 잔광)
   sfx: 효과음 연결 이름 (사운드 작업 때 사용)
   ========================================================================== */

export const VIOLET = '190, 95, 255';
export const DEEP = '70, 18, 115';
const PINK = '255, 150, 255';

export const HERO_VFX = {
    // 몸통 [흑마법 저주] 틱: 오라 안의 적마다 보라 기둥이 솟음
    curseTick: {
        sfx: 'hero_curse_tick',
        layers: [
            { type: 'glow', at: 0, dur: 0.5, r: 30, color: VIOLET },
            { type: 'ring', at: 0, dur: 0.35, r: 30, ground: true, color: VIOLET, width: 4 },
            { type: 'pillar', at: 0.02, dur: 0.55, h: 115, w: 20, color: VIOLET },
            { type: 'motes', at: 0.05, count: 7, spread: 14, rise: [70, 130], life: [0.5, 0.9], color: PINK },
            { type: 'smoke', at: 0.2, count: 3, spread: 10, spreadY: 60, size: 14, life: [0.6, 1.0], rise: 30, color: DEEP }
        ]
    },

    // 흑마법 오라 마법진 (몸 앞 바닥에 계속 깔림, 틱마다 번쩍)
    curseAura: { r: 115, color: VIOLET, spin: 0.7 },

    // 스킬 시전 해방 (손끝)
    castRelease: {
        sfx: 'hero_cast',
        layers: [
            { type: 'flash', at: 0, dur: 0.16, r: 22, color: VIOLET },
            { type: 'ring', at: 0, dur: 0.3, r: 34, color: VIOLET, width: 4 },
            { type: 'sparks', at: 0, count: 10, speed: 220, color: VIOLET }
        ]
    },

    // [세뇌 파동] 도착: 소용돌이에 휘감겨 아군으로 변환
    mindConvert: {
        sfx: 'hero_mind_convert',
        layers: [
            { type: 'rune', at: 0, dur: 0.9, r: 42, color: VIOLET, spin: 2.5 },
            { type: 'swirl', at: 0, dur: 0.7, r: 46, arms: 3, spin: 10, color: VIOLET, layer: 'front', dy: -34 },
            { type: 'flash', at: 0.35, dur: 0.18, r: 30, color: PINK, dy: -34 },
            { type: 'ring', at: 0.35, dur: 0.4, r: 50, color: VIOLET, width: 5, dy: -34 },
            { type: 'smoke', at: 0.3, count: 6, spread: 18, spreadY: 50, size: 18, life: [0.6, 1.1], rise: 20, color: DEEP, dy: -10 },
            { type: 'motes', at: 0.35, count: 10, spread: 20, rise: [60, 120], life: [0.6, 1.0], color: PINK }
        ]
    },

    // [어둠 파동] 적중: 파동이 지나간 적에게
    waveHit: {
        sfx: 'hero_wave_hit',
        layers: [
            { type: 'flash', at: 0, dur: 0.12, r: 20, color: VIOLET },
            { type: 'sparks', at: 0, count: 8, speed: 200, angle: 0, cone: 1.6, color: VIOLET },
            { type: 'smoke', at: 0.05, count: 3, spread: 8, spreadY: 30, size: 12, life: [0.4, 0.7], rise: 15, color: DEEP }
        ]
    },

    // 기본 베기 적중 (전투 엔진 근접 공격 위치)
    slashHit: {
        sfx: 'hero_slash_hit',
        layers: [
            { type: 'flash', at: 0, dur: 0.12, r: 24, color: VIOLET },
            { type: 'sparks', at: 0, count: 10, speed: 260, angle: -0.3, cone: 2.2, color: PINK }
        ]
    }
};

// 어둠 파동 투사체 설정
export const HERO_WAVE = { speed: 560, h: 72, color: VIOLET };
export const HERO_ORB = { dur: 0.42, color: VIOLET };
