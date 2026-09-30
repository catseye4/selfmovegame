/* ==========================================================================
   PROJECT: MAD OVERLORD // 리그 캐릭터 목록 (v2)
   캐릭터 정의 규격 (mechRig.js의 MECH 참고):
     id, name, assetDir, bones, springs, clips, debugSockets, shadow
     arms/weaponBone/defaultArm : 무기 팔 교체가 있는 캐릭터 (attack 클립과 총구 소켓이 팔마다 다름)
     attack/hitSocket           : 무기 팔이 없는 캐릭터의 공격 클립과 타격 소켓 [소켓, 뼈]
   ========================================================================== */

import { MECH } from './mechRig.js';
import { KAIJU } from './kaijuRig.js';
import { HERO } from './heroRig.js';
import { CHIMERA } from './chimeraRig.js';

export const RIG_CHARACTERS = { mech: MECH, kaiju: KAIJU, hero: HERO, chimera: CHIMERA };

/** 공격 클립 이름 (무기 팔이 있으면 장착한 팔에 따라) */
export function attackClipOf(character, arm) {
    return character.arms ? character.arms[arm].attack : character.attack;
}

/** 공격 이펙트(총구/입)가 나오는 소켓 [소켓 이름, 뼈 이름] */
export function hitSocketOf(character, arm) {
    return character.arms ? [character.arms[arm].muzzle, character.weaponBone] : character.hitSocket;
}
