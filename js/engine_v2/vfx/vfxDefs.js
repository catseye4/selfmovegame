/* ==========================================================================
   PROJECT: MAD OVERLORD // 이펙트 정의 모음 (v2)
   캐릭터별 정의 파일을 모으고, 전투 엔진이 쓰는 공통 조회(근접 타격 이펙트)를 제공한다.
   ========================================================================== */

import { HERO_VFX } from './heroVfx.js';
import { MECH_VFX } from './mechVfx.js';
import { KAIJU_VFX } from './kaijuVfx.js';
import { CHIMERA_VFX } from './chimeraVfx.js';

export { HERO_VFX, MECH_VFX, KAIJU_VFX, CHIMERA_VFX };

// 리그가 없는 캐릭터(페이퍼돌)의 기본 베기
export const GENERIC_VFX = {
    slashHit: {
        sfx: 'generic_slash',
        layers: [
            { type: 'claw', at: 0, dur: 0.35, count: 1, len: 64, angle: 2.0, color: '255, 0, 85' },
            { type: 'flash', at: 0.03, dur: 0.1, r: 20, color: '255, 0, 85' },
            { type: 'sparks', at: 0.03, count: 6, speed: 220, angle: 0, cone: 2, color: '255, 80, 130' }
        ]
    }
};

// 전투 연출 (거점 파괴): 연쇄 폭발 → 마지막 대폭발 + 붕괴 먼지
const FIRE = '255, 120, 40';
const EMBER = '255, 190, 80';
const DUST = '70, 60, 70';
export const BATTLE_VFX = {
    // 연쇄 폭발 한 번 (건물 곳곳에서 차례로)
    baseBlast: {
        sfx: 'base_blast',
        layers: [
            { type: 'fireball', at: 0, dur: 0.5, r: 34, color: FIRE },
            { type: 'flash', at: 0, dur: 0.14, r: 30, color: EMBER },
            { type: 'sparks', at: 0, count: 12, speed: 300, color: EMBER },
            { type: 'debris', at: 0.02, count: 6, speed: 260, size: 4, color: '60, 40, 50' },
            { type: 'smoke', at: 0.12, count: 4, spread: 16, spreadY: 16, size: 20, life: [0.8, 1.3], rise: 30, color: DUST }
        ]
    },
    // 마지막 대폭발 (지면 기준): 불기둥 + 충격파 고리 + 균열 + 파편
    baseFinale: {
        sfx: 'base_destroyed',
        layers: [
            { type: 'flash', at: 0, dur: 0.3, r: 120, color: EMBER, dy: -70 },
            { type: 'fireball', at: 0, dur: 0.9, r: 90, color: FIRE, dy: -70 },
            { type: 'fireball', at: 0.1, dur: 0.8, r: 60, color: FIRE, dy: -130 },
            { type: 'pillar', at: 0.02, dur: 0.8, h: 260, w: 70, color: FIRE },
            { type: 'ring', at: 0.05, dur: 0.7, r: 260, ground: true, color: EMBER, width: 10 },
            { type: 'ring', at: 0.1, dur: 0.6, r: 140, color: EMBER, width: 6, dy: -70 },
            { type: 'cracks', at: 0.05, dur: 1.6, count: 9, len: 150, color: FIRE },
            { type: 'glow', at: 0.05, dur: 2.0, r: 150, color: FIRE },
            { type: 'sparks', at: 0.05, count: 30, speed: 520, color: EMBER },
            { type: 'debris', at: 0.05, count: 22, speed: 480, size: 6, color: '60, 40, 50' },
            { type: 'smoke', at: 0.3, count: 14, spread: 80, spreadY: 60, size: 40, life: [1.4, 2.2], rise: 45, color: DUST }
        ]
    }
};

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
