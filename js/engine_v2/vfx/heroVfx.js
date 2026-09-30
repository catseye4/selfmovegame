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

    // 스킬 시전 해방 (손끝, 세뇌 구체 발사 순간)
    castRelease: {
        sfx: 'hero_cast',
        layers: [
            { type: 'fireball', at: 0, dur: 0.3, r: 20, color: VIOLET },
            { type: 'ring', at: 0, dur: 0.32, r: 38, color: VIOLET, width: 4 },
            { type: 'ring', at: 0.05, dur: 0.35, r: 52, color: PINK, width: 2 },
            { type: 'sparks', at: 0, count: 12, speed: 240, color: PINK },
            { type: 'smoke', at: 0.04, count: 3, spread: 8, spreadY: 8, size: 12, life: [0.4, 0.7], rise: 20, color: DEEP }
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

    // [어둠 파동] 적중: 파동이 적을 세로로 가르고 지나감 + 감속 표시로 발밑에 보라 잔광
    waveHit: {
        sfx: 'hero_wave_hit',
        layers: [
            { type: 'claw', at: 0, dur: 0.35, count: 1, len: 78, angle: Math.PI / 2, width: 9, bend: 14, color: VIOLET },
            { type: 'flash', at: 0, dur: 0.14, r: 24, color: VIOLET },
            { type: 'sparks', at: 0, count: 10, speed: 230, angle: 0, cone: 1.4, color: PINK },
            { type: 'pillar', at: 0.02, dur: 0.4, h: 70, w: 14, color: VIOLET, dy: 32 },
            { type: 'glow', at: 0.02, dur: 2.2, r: 26, color: VIOLET, dy: 32 },
            { type: 'smoke', at: 0.05, count: 4, spread: 10, spreadY: 30, size: 14, life: [0.5, 0.9], rise: 15, color: DEEP }
        ]
    },

    // 기본 베기 적중: 내려벤 방향(왼쪽 위 → 오른쪽 아래)으로 보라 칼 자국 + 섬광 + 연기 여운
    slashHit: {
        sfx: 'hero_slash_hit',
        layers: [
            { type: 'claw', at: 0, dur: 0.38, count: 1, len: 100, angle: 0.85, width: 12, bend: 16, color: VIOLET },
            { type: 'claw', at: 0.03, dur: 0.3, count: 1, len: 70, angle: 0.85, width: 5, bend: 10, color: PINK },
            { type: 'flash', at: 0.02, dur: 0.14, r: 28, color: VIOLET },
            { type: 'ring', at: 0.02, dur: 0.3, r: 40, color: VIOLET, width: 4 },
            { type: 'sparks', at: 0.02, count: 12, speed: 280, angle: 0.6, cone: 1.8, color: PINK },
            { type: 'smoke', at: 0.08, count: 3, spread: 10, spreadY: 14, size: 14, life: [0.5, 0.8], rise: 20, color: DEEP }
        ]
    }
};

// 어둠 파동 투사체 설정
export const HERO_WAVE = { speed: 560, h: 72, color: VIOLET };
export const HERO_ORB = { dur: 0.42, color: VIOLET };
