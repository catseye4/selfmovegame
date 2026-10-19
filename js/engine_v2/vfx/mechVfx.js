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
            { type: 'ring', at: 0, dur: 0.18, r: 22, inward: true, color: CYAN, width: 2 },
            { type: 'flash', at: 0.02, dur: 0.14, r: 22, color: BEAM, pos: 'to' },
            { type: 'ring', at: 0.02, dur: 0.32, r: 28, color: CYAN, width: 3, pos: 'to' },
            { type: 'streaks', at: 0.02, count: 6, speed: 240, len: 34, life: [0.3, 0.55], angle: 0, cone: 1.8, color: BEAM, pos: 'to' },
            { type: 'glow', at: 0.02, dur: 0.6, r: 20, color: BEAM, pos: 'to', dy: 30 },
            { type: 'smoke', at: 0.06, count: 2, spread: 6, spreadY: 10, size: 10, life: [0.4, 0.7], rise: 25, color: SMOKE, pos: 'to' }
        ]
    },

    // [팔 스킬] 관통 레이저: 굵은 광선이 전장 끝까지
    laserBig: {
        sfx: 'mech_laser_big',
        layers: [
            { type: 'beam', at: 0, dur: 0.55, w: 16, color: BEAM },
            { type: 'flash', at: 0, dur: 0.18, r: 30, color: BEAM },
            { type: 'swirl', at: 0, dur: 0.35, r: 26, arms: 3, spin: 16, color: CYAN },
            { type: 'ring', at: 0, dur: 0.3, r: 46, color: CYAN, width: 5 },
            { type: 'streaks', at: 0, count: 8, speed: 300, len: 34, life: [0.3, 0.55], angle: 0, cone: 1.0, color: BEAM },
            { type: 'ring', at: 0.04, dur: 0.45, r: 58, color: BEAM, width: 4, pos: 'to' },
            { type: 'glow', at: 0.05, dur: 0.8, r: 36, color: BEAM, pos: 'to', dy: 30 },
            { type: 'motes', at: 0.08, count: 4, spread: 16, rise: [30, 65], life: [0.4, 0.7], size: 2, color: CYAN, pos: 'to' }
        ]
    },

    // 관통 레이저가 지나간 적
    laserHit: {
        sfx: 'mech_laser_hit',
        layers: [
            { type: 'flash', at: 0, dur: 0.16, r: 26, color: BEAM },
            { type: 'ring', at: 0.02, dur: 0.32, r: 30, color: CYAN, width: 3 },
            { type: 'streaks', at: 0, count: 5, speed: 220, len: 34, life: [0.3, 0.55], angle: 0, cone: 1.6, color: BEAM },
            { type: 'glow', at: 0.03, dur: 0.55, r: 20, color: BEAM, dy: 30 },
            { type: 'smoke', at: 0.05, count: 2, spread: 6, spreadY: 10, size: 12, life: [0.4, 0.7], rise: 25, color: SMOKE }
        ]
    },

    // 유도 미사일 폭발 (광역)
    missileBlast: {
        sfx: 'mech_missile_blast',
        layers: [
            { type: 'flash', at: 0, dur: 0.12, r: 30, color: BLAST },
            { type: 'fireball', at: 0, dur: 0.34, r: 40, color: BLAST },
            { type: 'flame', at: 0.02, count: 4, speed: 110, angle: -Math.PI / 2, cone: 2.2, size: 8, grow: 2.2, life: [0.35, 0.65], drag: 2.8, rise: 55, color: BLAST },
            { type: 'shockwave', at: 0, dur: 0.35, r: 58, color: BLAST, width: 23 },
            { type: 'shockwave', width: 22, at: 0.02, dur: 0.4, r: 60, ground: true, color: BLAST, dy: 32 },
            { type: 'embers', at: 0.02, count: 9, speed: 180, cone: 2.6, size: 1.7, life: [0.5, 0.9], color: BLAST },
            { type: 'debris', at: 0, count: 7, speed: 260, size: 3.5, color: METAL },
            { type: 'smoke', at: 0.12, count: 5, spread: 16, spreadY: 18, size: 18, life: [0.7, 1.1], rise: 35, color: SMOKE },
            { type: 'glow', at: 0.05, dur: 1.0, r: 34, color: BLAST, dy: 32 }
        ]
    },

    // 스웜 드론 자폭
    droneBlast: {
        sfx: 'mech_drone_blast',
        layers: [
            { type: 'flash', at: 0, dur: 0.18, r: 32, color: BEAM },
            { type: 'swirl', at: 0, dur: 0.38, r: 30, arms: 3, spin: 14, color: BEAM },
            { type: 'shockwave', at: 0, dur: 0.32, r: 50, color: BEAM, width: 20 },
            { type: 'shockwave', at: 0.04, dur: 0.42, r: 48, ground: true, color: CYAN, width: 14, dy: 30 },
            { type: 'glow', at: 0.04, dur: 0.8, r: 28, color: BEAM, dy: 30 },
            { type: 'embers', at: 0.02, count: 6, speed: 150, size: 1.5, life: [0.4, 0.8], color: BLAST },
            { type: 'streaks', at: 0, count: 6, speed: 200, len: 34, life: [0.3, 0.55], color: BEAM },
            { type: 'debris', at: 0, count: 5, speed: 220, size: 3, color: METAL },
            { type: 'smoke', at: 0.04, count: 4, spread: 12, spreadY: 12, size: 14, life: [0.5, 0.8], rise: 30, color: SMOKE }
        ]
    },

    // 기본 주먹 타격 (강철 주먹 + 청록 충격)
    fistHit: {
        sfx: 'mech_fist_hit',
        layers: [
            { type: 'flash', at: 0, dur: 0.12, r: 26, color: CYAN },
            { type: 'shockwave', at: 0, dur: 0.42, r: 66, color: CYAN, width: 17 },
            { type: 'streaks', at: 0, count: 4, speed: 230, len: 34, life: [0.3, 0.42], angle: 0, cone: 1.8, color: CYAN },
            { type: 'shards', at: 0, count: 4, speed: 200, size: 5.4, spin: 7, life: [0.7, 1.1], shape: 'shell', floor: 32, color: METAL },
            { type: 'shockwave', at: 0.03, dur: 0.42, r: 46, ground: true, color: CYAN, width: 14, dy: 32 },
            { type: 'glow', at: 0.04, dur: 0.55, r: 24, color: CYAN, dy: 32 },
            { type: 'dust', at: 0.05, count: 2, speed: 90, dir: 'both', size: 11, life: 0.7, color: SMOKE, dy: 28 }
        ]
    },

    // 출격 점프 착지 충격 (캐릭터 발밑)
    landing: {
        sfx: 'mech_land',
        layers: [
            { type: 'flash', at: 0, dur: 0.14, r: 32, color: CYAN, dy: -6 },
            { type: 'shockwave', at: 0, dur: 0.45, r: 90, ground: true, color: CYAN, width: 24 },
            { type: 'cracks', at: 0, dur: 0.9, count: 7, len: 80, color: BEAM },
            { type: 'glow', at: 0.02, dur: 0.75, r: 54, color: CYAN },
            { type: 'shards', at: 0, count: 5, speed: 260, size: 6.3, spin: 7, life: [0.7, 1.1], shape: 'rock', floor: 0, color: METAL },
            { type: 'dust', at: 0.03, count: 3, speed: 110, dir: 'both', size: 17, life: 0.9, color: SMOKE, dy: 0 }
        ]
    }
};
