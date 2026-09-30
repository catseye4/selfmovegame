/* ==========================================================================
   PROJECT: MAD OVERLORD // 거대로봇 스킬 이펙트 정의 (v2)
   컨셉 시트: 초장거리 포격(보라 광선), 미사일(주황 폭발), 스웜 드론(보라 코어 → 폭파)
   캐니스터의 보라 에너지 + 청록 조명이 팩션 색
   ========================================================================== */

export const BEAM = '215, 90, 255';
export const CYAN = '0, 230, 255';
export const BLAST = '255, 150, 60';
const SMOKE = '70, 60, 80';
const METAL = '60, 60, 75';

export const MECH_VFX = {
    // 레이저 포대 광선: 총구 → 적 (play 옵션 to = 적 지점). 총구 섬광 + 적중 폭발
    laser: {
        sfx: 'mech_laser',
        layers: [
            { type: 'beam', at: 0, dur: 0.2, w: 7, color: BEAM },
            { type: 'flash', at: 0, dur: 0.1, r: 16, color: BEAM },
            { type: 'flash', at: 0.02, dur: 0.14, r: 22, color: BEAM, pos: 'to' },
            { type: 'sparks', at: 0.02, count: 9, speed: 240, color: BEAM, pos: 'to' },
            { type: 'glow', at: 0.02, dur: 0.6, r: 20, color: BEAM, pos: 'to', dy: 30 },
            { type: 'smoke', at: 0.06, count: 2, spread: 6, spreadY: 10, size: 10, life: [0.4, 0.7], rise: 25, color: SMOKE, pos: 'to' }
        ]
    },

    // 유도 미사일 폭발 (광역)
    missileBlast: {
        sfx: 'mech_missile_blast',
        layers: [
            { type: 'fireball', at: 0, dur: 0.45, r: 44, color: BLAST },
            { type: 'ring', at: 0, dur: 0.35, r: 58, color: BLAST, width: 6 },
            { type: 'ring', at: 0.02, dur: 0.4, r: 60, ground: true, color: BLAST, dy: 32 },
            { type: 'sparks', at: 0, count: 14, speed: 320, color: BLAST },
            { type: 'debris', at: 0, count: 7, speed: 260, size: 3.5, color: METAL },
            { type: 'smoke', at: 0.05, count: 6, spread: 16, spreadY: 18, size: 18, life: [0.6, 1.0], rise: 35, color: SMOKE },
            { type: 'glow', at: 0.05, dur: 1.0, r: 34, color: BLAST, dy: 32 }
        ]
    },

    // 스웜 드론 자폭
    droneBlast: {
        sfx: 'mech_drone_blast',
        layers: [
            { type: 'fireball', at: 0, dur: 0.38, r: 32, color: BEAM },
            { type: 'ring', at: 0, dur: 0.32, r: 50, color: BEAM, width: 5 },
            { type: 'sparks', at: 0, count: 12, speed: 280, color: BLAST },
            { type: 'sparks', at: 0, count: 6, speed: 200, color: BEAM },
            { type: 'debris', at: 0, count: 5, speed: 220, size: 3, color: METAL },
            { type: 'smoke', at: 0.04, count: 4, spread: 12, spreadY: 12, size: 14, life: [0.5, 0.8], rise: 30, color: SMOKE }
        ]
    },

    // 기본 주먹 타격 (강철 주먹 + 청록 충격)
    fistHit: {
        sfx: 'mech_fist_hit',
        layers: [
            { type: 'flash', at: 0, dur: 0.12, r: 26, color: CYAN },
            { type: 'ring', at: 0, dur: 0.28, r: 42, color: CYAN, width: 6 },
            { type: 'sparks', at: 0, count: 10, speed: 280, angle: 0, cone: 2.4, color: CYAN },
            { type: 'debris', at: 0, count: 4, speed: 200, size: 3, color: METAL }
        ]
    },

    // 출격 점프 착지 충격 (캐릭터 발밑)
    landing: {
        sfx: 'mech_land',
        layers: [
            { type: 'ring', at: 0, dur: 0.45, r: 90, ground: true, color: CYAN, width: 6 },
            { type: 'cracks', at: 0, dur: 0.9, count: 7, len: 80, color: BEAM },
            { type: 'debris', at: 0, count: 8, speed: 260, size: 3.5, color: METAL }
        ]
    }
};
