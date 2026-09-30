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
