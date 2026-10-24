/* ==========================================================================
   PROJECT: MAD OVERLORD // 2차 세트 등록 (파츠 확장 2차, Q-009 · D-071 — MD/파츠확장_2차_기획안.md)
   캐릭터별 세트 묶음(sets2/<캐릭터>Sets2.js)을 게임 표(세트·스킬·파츠-스킬·다리 패시브·파츠·세트 색)에 더한다.
   main_v2.js가 registerV2Parts() 전에 한 번 부름 → 그 뒤 PARTS_DB·연구소·드랍·전투가 그대로 씀.
   캐릭터를 더할 때는 PACKS에 한 줄.
   ========================================================================== */

import { SETS } from '../sets_v2.js';
import { SKILLS, PART_SKILL, LEG_PASSIVES } from '../skills_v2.js';
import { V2_PARTS } from '../partsExtra_v2.js';
import { SET_TINT } from '../rig/rigAvatar.js';
import { KIT_PASSIVES, registerSets2 } from '../skillKit_v2.js';
import { KAIJU_SETS2 } from './kaijuSets2.js';
import { CHIMERA_SETS2 } from './chimeraSets2.js';
import { MECH_SETS2 } from './mechSets2.js';
import { HERO_SETS2 } from './heroSets2.js';
import { FROST_SETS2 } from './frostSets2.js';
import { DIVER_SETS2 } from './diverSets2.js';
import { SAINT_SETS2 } from './saintSets2.js';
import { DOLL_SETS2 } from './dollSets2.js';
import { ARCHITECT_BASE, ARCHITECT_SETS2 } from './architectSets2.js';
import { BROADCASTER_BASE, BROADCASTER_SETS2 } from './broadcasterSets2.js';

// 새 캐릭터 5·6 (D-079)은 기본·강화 파츠도 묶음(…_BASE)으로 — 세트보다 먼저 (연구소 카드 순서)
export const PACKS = [KAIJU_SETS2, CHIMERA_SETS2, MECH_SETS2, HERO_SETS2, FROST_SETS2, DIVER_SETS2, SAINT_SETS2, DOLL_SETS2,
    ARCHITECT_BASE, ARCHITECT_SETS2, BROADCASTER_BASE, BROADCASTER_SETS2];

let done = false;
export function registerAllSets2() {
    if (done) return;
    done = true;
    const T = { SETS, SKILLS, PART_SKILL, LEG_PASSIVES, V2_PARTS, SET_TINT, KIT_PASSIVES };
    PACKS.forEach(p => registerSets2(p, T));
}
