/* ==========================================================================
   PROJECT: MAD OVERLORD // 이펙트 정의 모음 (v2)
   캐릭터별 정의 파일을 모으고, 전투 엔진이 쓰는 공통 조회(근접 타격 이펙트)를 제공한다.
   ========================================================================== */

import { HERO_VFX } from './heroVfx.js';
import { MECH_VFX } from './mechVfx.js';
import { KAIJU_VFX } from './kaijuVfx.js';
import { CHIMERA_VFX } from './chimeraVfx.js';
import { SET_VFX } from './setVfx.js';
import { DIVER_VFX } from './diverVfx.js';
import { SAINT_VFX } from './saintVfx.js';
import { FROST_VFX } from './frostVfx.js';
import { DOLL_VFX } from './dollVfx.js';
import { ZONE_VFX } from './zoneVfx.js';
import { BOSS_VFX } from './bossVfx.js';
import { ELITE_VFX } from './eliteVfx.js';

export { HERO_VFX, MECH_VFX, KAIJU_VFX, CHIMERA_VFX, SET_VFX, DIVER_VFX, SAINT_VFX, FROST_VFX, DOLL_VFX, ZONE_VFX, BOSS_VFX };
export { ELITE_VFX };

// 리그가 없는 캐릭터(페이퍼돌)의 기본 베기
export const GENERIC_VFX = {
    slashHit: {
        sfx: 'generic_slash',
        layers: [
            { type: 'slash', at: 0, dur: 0.42, r: 76, arc: 2.7, sweep: 0.12, thick: 1, angle: 2.0, color: '255, 0, 85' },
            { type: 'flash', at: 0.03, dur: 0.1, r: 20, color: '255, 0, 85' },
            { type: 'streaks', at: 0.03, count: 6, speed: 220, len: 34, life: [0.32, 0.44], angle: 0, cone: 2, color: '255, 80, 130' }
        ]
    }
};

// 전투 연출 (거점 파괴): 연쇄 폭발 → 마지막 대폭발 + 붕괴 먼지
const FIRE = '255, 120, 40';
const EMBER = '255, 190, 80';
const DUST = '70, 60, 70';
export const BATTLE_VFX = {
    enemyDefeat: {
        layers: [
            { type: 'smoke', at: 0, count: 7, spread: 18, spreadY: 32, size: 18, life: [0.6, 1.0], rise: 45, color: '100, 90, 125', dy: -30 },
            { type: 'flash', at: 0, dur: 0.16, r: 26, color: '215, 195, 255', dy: -30 },
            { type: 'motes', at: 0.03, count: 10, spread: 24, rise: [40, 80], life: [0.7, 1.2], size: 2, color: '180, 115, 240', dy: -25 }
        ]
    },
    eliteSpawn: {
        layers: [
            { type: 'rune', at: 0, dur: 0.85, r: 52, spin: 0.6, color: '255, 205, 80' },
            { type: 'pillar', at: 0, dur: 0.65, h: 180, w: 32, color: '255, 215, 105' },
            { type: 'motes', at: 0.05, count: 12, spread: 32, rise: [45, 100], life: [0.6, 1.1], size: 2.4, color: '255, 215, 105' }
        ]
    },
    baseHit: {
        layers: [
            { type: 'flash', at: 0, dur: 0.1, r: 16, color: EMBER },
            { type: 'shards', at: 0, count: 4, speed: 140, size: 4, spin: 6, life: [0.4, 0.7], shape: 'rock', color: '100, 90, 85' },
            { type: 'embers', at: 0, count: 4, speed: 100, size: 1.2, life: [0.25, 0.5], color: EMBER },
            { type: 'smoke', at: 0.03, count: 3, spread: 10, spreadY: 8, size: 12, life: [0.4, 0.7], rise: 18, color: DUST }
        ]
    },
    // 연쇄 폭발 한 번 (건물 곳곳에서 차례로)
    baseBlast: {
        sfx: 'base_blast',
        layers: [
            { type: 'flame', at: 0, count: 8, speed: 210, angle: 0, cone: Math.PI * 2, size: 12, grow: 3.5, life: [0.55, 0.85], drag: 2.5, rise: 95, color: FIRE },
            { type: 'flash', at: 0, dur: 0.14, r: 30, color: EMBER },
            { type: 'embers', at: 0, count: 8, speed: 220, angle: 0, cone: Math.PI * 2, size: 1.6, life: [0.5, 1.0], color: EMBER },
            { type: 'debris', at: 0.02, count: 6, speed: 260, size: 4, color: '60, 40, 50' },
            { type: 'smoke', at: 0.12, count: 4, spread: 16, spreadY: 16, size: 20, life: [0.8, 1.3], rise: 30, color: DUST }
        ]
    },
    // 마지막 대폭발 (지면 기준): 불기둥 + 충격파 고리 + 균열 + 파편
    baseFinale: {
        sfx: 'base_destroyed',
        layers: [
            { type: 'flash', at: 0, dur: 0.3, r: 120, color: EMBER, dy: -70 },
            { type: 'flame', at: 0, count: 14, speed: 340, angle: -Math.PI / 2, cone: Math.PI * 1.6, size: 22, grow: 4, life: [0.8, 1.15], drag: 2.2, rise: 170, color: FIRE, dy: -70 },
            { type: 'flame', at: 0.1, count: 8, speed: 270, angle: -Math.PI / 2, cone: 1.0, size: 18, grow: 3.8, life: [0.75, 1.05], drag: 1.6, rise: 180, color: FIRE, dy: -100 },
            { type: 'shockwave', at: 0.05, dur: 0.7, r: 260, ground: true, color: EMBER, width: 40 },
            { type: 'shockwave', at: 0.1, dur: 0.6, r: 140, color: EMBER, width: 24, dy: -70 },
            { type: 'cracks', at: 0.05, dur: 1.6, count: 9, len: 150, color: FIRE },
            { type: 'glow', at: 0.05, dur: 2.0, r: 150, color: FIRE },
            { type: 'embers', at: 0.05, count: 18, speed: 360, angle: -Math.PI / 2, cone: Math.PI * 1.6, size: 2, life: [0.7, 1.3], color: EMBER },
            { type: 'shards', at: 0.05, count: 10, speed: 480, size: 10.8, spin: 7, life: [0.7, 1.1], shape: 'rock', floor: 0, color: '60, 40, 50' },
            { type: 'dust', at: 0.3, count: 6, speed: 144, dir: 'both', size: 40, life: 2.2, color: DUST, dy: 0 }
        ]
    }
};

// 적 능력 (enemies_v2.js): 전기 충격, 방패 강타, 정의의 일격 예고·타격 / 보스전 EMP 포격
const SHOCK = '255, 225, 80';
const HOLY = '255, 236, 170';
const EMP = '120, 210, 255';
Object.assign(BATTLE_VFX, {
    shockHit: {
        layers: [
            { type: 'flash', at: 0, dur: 0.12, r: 24, color: '245, 250, 255' },
            { type: 'bolt', jag: 18, branches: 2, width: 2.8, flicker: 0.055, at: 0, dur: 0.2, count: 4, len: 48, color: SHOCK, layer: 'front' },
            { type: 'bolt', jag: 18, branches: 2, width: 2.8, flicker: 0.055, at: 0.08, dur: 0.24, count: 3, len: 36, color: SHOCK, dy: -12, layer: 'front' },
            { type: 'streaks', at: 0.02, count: 8, speed: 230, len: 34, life: [0.3, 0.55], color: SHOCK },
            { type: 'ring', at: 0.02, dur: 0.35, r: 40, color: SHOCK, width: 2 },
            { type: 'glow', at: 0.02, dur: 0.5, r: 32, color: SHOCK, layer: 'front' },
            { type: 'motes', at: 0.1, count: 4, spread: 22, rise: [20, 40], life: [0.35, 0.6], size: 1.8, color: SHOCK }
        ]
    },
    shieldBash: {
        layers: [
            { type: 'flash', at: 0, dur: 0.14, r: 30, color: '245, 250, 255' },
            { type: 'shockwave', at: 0, dur: 0.35, r: 60, color: '140, 200, 255', width: 24 },
            { type: 'shockwave', at: 0.04, dur: 0.45, r: 68, ground: true, color: '140, 200, 255', width: 14, dy: 36 },
            { type: 'streaks', at: 0, count: 8, speed: 280, len: 34, life: [0.3, 0.55], angle: Math.PI, cone: 1.2, color: '200, 230, 255' },
            { type: 'debris', at: 0.02, count: 4, speed: 200, size: 2.5, angle: -2.6, cone: 1.1, color: '110, 130, 150', dy: 30 },
            { type: 'smoke', at: 0.05, count: 4, spread: 22, spreadY: 12, size: 18, life: [0.45, 0.8], rise: 20, color: '80, 90, 110', dy: 36 }
        ]
    },
    smiteWarn: {
        layers: [
            { type: 'rune', at: 0, dur: 1.2, r: 70, color: '255, 70, 60', spin: 3 },
            { type: 'glow', at: 0, dur: 1.2, r: 80, color: '255, 70, 60' },
            { type: 'ring', at: 0.8, dur: 0.4, r: 70, ground: true, inward: true, width: 2, color: HOLY },
            { type: 'motes', at: 0.65, count: 6, spread: 40, rise: [20, 40], life: [0.3, 0.5], size: 2, color: HOLY },
            { type: 'mist', at: 0, r: 70, h: 10, life: 1.2, drift: 0, rim: true, color: '255, 70, 60' }
        ]
    },
    smiteHit: {
        layers: [
            { type: 'rays', at: 0, dur: 0.6, count: 12, len: 135, width: 11, spin: 0.5, color: HOLY, dy: -60 },
            { type: 'pillar', at: 0, dur: 0.7, h: 320, w: 60, color: HOLY },
            { type: 'pillar', at: 0.02, dur: 0.4, h: 310, w: 16, color: '255, 250, 235' },
            { type: 'flash', at: 0, dur: 0.22, r: 75, color: '255, 250, 235', dy: -60 },
            { type: 'shockwave', at: 0.02, dur: 0.5, r: 150, ground: true, color: HOLY, width: 32 },
            { type: 'cracks', at: 0.02, dur: 1.2, count: 7, len: 110, color: '255, 190, 80' },
            { type: 'glow', at: 0.05, dur: 1.2, r: 85, color: HOLY },
            { type: 'motes', at: 0.08, count: 16, spread: 75, rise: [50, 120], life: [0.65, 1.15], size: 2.8, color: HOLY },
            { type: 'smoke', at: 0.12, count: 4, spread: 55, spreadY: 8, size: 20, life: [0.5, 0.9], rise: 20, color: DUST }
        ]
    },
    emp: {
        sfx: 'shield_break',
        layers: [
            { type: 'flash', at: 0, dur: 0.28, r: 120, color: '235, 250, 255', dy: -120 },
            { type: 'ring', at: 0, dur: 1.1, r: 900, ground: true, color: EMP, width: 14 },
            { type: 'ring', at: 0.08, dur: 1.0, r: 700, color: EMP, width: 6, dy: -120 },
            { type: 'bolt', jag: 18, branches: 2, width: 2.8, flicker: 0.055, at: 0.02, dur: 0.35, count: 8, len: 210, color: EMP, dy: -120, layer: 'front' },
            { type: 'bolt', jag: 18, branches: 2, width: 2.8, flicker: 0.055, at: 0.16, dur: 0.45, count: 5, len: 150, color: '200, 240, 255', layer: 'front' },
            { type: 'glow', at: 0.08, dur: 1.2, r: 180, color: EMP },
            { type: 'streaks', at: 0, count: 16, speed: 480, len: 34, life: [0.3, 0.55], color: '200, 240, 255' },
            { type: 'motes', at: 0.18, count: 8, spread: 150, rise: [25, 65], life: [0.6, 1.0], size: 2.5, color: EMP }
        ]
    }
});

// 구역 4 보스 오큘러스 '심연의 파동': 바닥에서 솟는 보라 촉수 (세 번 겹쳐 재생)
const VOID = '170, 90, 255';
const BIO = '150, 255, 90';
Object.assign(BATTLE_VFX, {
    abyssSpike: {
        layers: [
            { type: 'hands', at: 0, dur: 0.7, count: 3, h: 145, spread: 24, color: VOID },
            { type: 'pillar', at: 0, dur: 0.45, h: 190, w: 14, color: VOID },
            { type: 'flash', at: 0.03, dur: 0.15, r: 30, color: BIO },
            { type: 'cracks', at: 0, dur: 0.9, count: 5, len: 80, color: VOID },
            { type: 'goo', at: 0.04, count: 4, speed: 136, size: 7, life: [0.8, 1.15], splat: true, floor: 0, color: BIO },
            { type: 'mist', at: 0.1, r: 50, h: 10, life: 0.95, drift: 14, color: VOID, dy: 0 },
            { type: 'glow', at: 0, dur: 0.95, r: 60, color: VOID }
        ]
    }
});

/** 근접 타격 이펙트 (캐릭터 id, 장착 팔 id) — 합성괴인은 클로 팔이면 할퀴기 */
export function meleeHitVfx(characterId, armId) {
    if (characterId === 'chimera' && armId === 'arm_chimera') return CHIMERA_VFX.clawHit;
    return {
        mech: MECH_VFX.fistHit,
        kaiju: KAIJU_VFX.biteHit,
        hero: HERO_VFX.slashHit,
        chimera: CHIMERA_VFX.punchHit
    }[characterId] || GENERIC_VFX.slashHit;
}
