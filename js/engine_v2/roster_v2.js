/* ==========================================================================
   PROJECT: MAD OVERLORD // 캐릭터 목록 (v2) — 캐릭터 선택창·연구소·저장이 같이 씀 (D-051)
   - 캐릭터는 선택창에서 고르고, 연구소에는 고른 캐릭터의 파츠만 나온다 (D-050 추가, D-004를 바꿈)
   - 파츠가 어느 캐릭터 것인지는 parts.js의 faction 문자열로 판정 (parts.js는 구버전과 공용이라 읽기만)
   - 새 캐릭터를 합칠 때는 ROSTER에 한 줄씩 더하면 선택창 카드가 늘어남
   ========================================================================== */

import { PARTS_DB } from '../data/parts.js';

export const SLOTS = ['head', 'body', 'arm', 'leg'];
export const DEFAULT_CHARACTER = 'mech';

// id = 리그 캐릭터 id (rig/characters.js), faction = parts.js faction 문자열에 들어 있는 이름
export const ROSTER = [
    { id: 'mech', faction: '거대로봇', tag: 'MECHANIC', color: '#3ee6ff', desc: '주먹으로 버티다 레이저·미사일 팔로 멀리서 포격. 반사 실드와 드론 필살기.' },
    { id: 'kaiju', faction: '거대괴수', tag: 'MUTANT', color: '#a0ff32', desc: '두꺼운 체력과 재생. 산성 돌진·산란·대지 포효로 밀고 나간다.' },
    { id: 'hero', faction: '타락 히어로', tag: 'BRAINWASHED', color: '#c86eff', desc: '어둠 파동과 흑마법 폭발. 필살기로 적 보병을 세뇌해 아군으로.' },
    { id: 'chimera', faction: '합성괴인', tag: 'CHIMERA', color: '#ff9628', desc: '졸개를 불러 함께 싸우고 파괴 광란으로 날뛴다. 파츠가 모두 무료.' }
];

export function rosterOf(id) {
    return ROSTER.find(c => c.id === id) || null;
}

/** 파츠의 캐릭터 id ('none'·알 수 없는 팩션이면 null) */
export function characterOfPart(part) {
    const f = String((part && part.faction) || '');
    const c = ROSTER.find(r => f.includes(r.faction));
    return c ? c.id : null;
}

/** 캐릭터의 한 부위 파츠 목록 (parts.js 순서, [파츠제거] 제외) */
export function partsOfCharacter(character, slot) {
    return (PARTS_DB[slot] || []).filter(p => characterOfPart(p) === character);
}

/**
 * 연구소 카드의 세트 표시: 파츠에 set이 있으면 그것(A·B 세트), 거대로봇 기본 로봇 파츠는 '기본 로봇',
 * 나머지 지금 파츠는 팩션 괄호 안 이름(메카닉 / 돌연변이 / 세뇌 / 키메라)
 */
export function partSetLabel(part) {
    if (!part || part.id === 'none') return '';
    if (part.set) return part.set;
    if (part.id.endsWith('_red_robot')) return '기본 로봇';
    const m = String(part.faction || '').match(/\(([^)]+)\)/);
    return m ? m[1] : '';
}
