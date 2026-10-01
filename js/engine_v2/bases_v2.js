/* ==========================================================================
   거점 건물 그림·상태 (로드맵 C단계)
   - 그림: stageArt_v2.js (tools/images/build_bases.py가 Gemini 그림에서 만듦)
   - 상태: 온전 → 체력 BASE_STATE.damaged 이하면 파손 → 파괴 연출의 대폭발 때 붕괴(잔해)
   - 요새 잔해는 그 자리에 남았다가, 주인공이 다시 걸으면(배경이 흐르면) 바닥과 함께 왼쪽으로 흘러 나감
   - 그림이 없으면(stageArt_v2.js에 없음) 예전 임시 상자로 그림
   ========================================================================== */

import { BASE_ART } from './stageArt_v2.js';

// 바닥이 흐르는 속도(px/초): index.css .walking .bg-layer.ground = 폭 200%(2560px)를 3초에 절반 이동
export const GROUND_SPEED = 1280 / 3;
export const BASE_STATE = { damaged: 0.5, ruinHold: 1.4 };   // 파손 체력 비율, 요새 붕괴 뒤 머무는 시간(초)
const GROUND_B = 60;
const OLD_BOX = { mid: { w: 90, h: 150 }, final: { w: 120, h: 200 } };

/** 로딩 화면에서 미리 받을 그림 */
export const BASE_IMAGES = Object.values(BASE_ART).flatMap(a => a.src);

export const baseArt = kind => BASE_ART[kind] || null;
export const baseSize = kind => BASE_ART[kind] || OLD_BOX[kind];

/** 적·스킬이 겨누는 곳 (건물은 몸통 가운데) */
export function aimAt(e) {
    if (!e.isBuilding) return { x: e.x + 38, b: 90 };
    const s = e.size || OLD_BOX[e.isFinal ? 'final' : 'mid'];
    return { x: e.x + s.w / 2, b: GROUND_B + Math.min(s.h, 220) * 0.45 };
}

/** 건물 DOM을 그림으로 꾸밈 (그림이 없으면 그대로 임시 상자) */
export function dressBase(el, kind) {
    const art = BASE_ART[kind];
    if (!art) return;
    el.classList.add('v2-base', `v2-base--${kind}`);
    el.style.width = `${art.w}px`;
    el.style.height = `${art.h}px`;
    el.style.bottom = `${GROUND_B - art.sink}px`;
    setBaseState(el, kind, 0);
}

/** 0 온전 / 1 파손 / 2 붕괴 */
export function setBaseState(el, kind, state) {
    const art = BASE_ART[kind];
    if (!art || !el) return;
    el.style.backgroundImage = `url('${art.src[state]}')`;
    el.dataset.state = String(state);
    el.classList.toggle('is-ruin', state === 2);
}
