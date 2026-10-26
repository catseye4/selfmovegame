/* ==========================================================================
   PROJECT: MAD OVERLORD // 첫 출격 안내 (2026-10-24, 로드맵 "처음 하는 사람용 다듬기")
   처음 한 번만 뜨는 말풍선. 가리킬 단추 위에 붙고, 누를 수 없으며(pointer-events 없음 — 조작을 막지 않음)
   몇 초 뒤 저절로 사라진다. 본 안내는 progress.tips에 저장(설정 창의 진행 초기화 때 같이 지워짐).
   부르는 곳: battle_v2.js(출격 인트로 뒤) · battleHud_v2.js(필살기 첫 준비) · enemyField.js(첫 요새) · main_v2.js(전투 뒤 메인 화면)
   ========================================================================== */

import { progress } from '../engine_v2/progress_v2.js';

export const COACH = {
    battle_skills: { text: '캐릭터는 알아서 걷고 싸웁니다<br>스킬은 <kbd>1</kbd> <kbd>2</kbd> 키나 단추로 — <b>AUTO</b>를 켜면 자동', sec: 7 },
    battle_ult: { text: '필살기 준비 완료! <kbd>3</kbd> 키나 단추<br>요새·기지·보스 앞에서 쓰면 좋아요', sec: 6 },
    battle_base: { text: '요새를 부수면 별 1개, 최종 기지를 부수면 승리<br>이 시계가 <b>제한 시간</b>입니다', sec: 7, side: 'bottom' },
    menu_lab: { text: '얻은 <b>DM</b>으로 연구소에서<br>파츠를 사고 강화하세요', sec: 9 },
    offline_intro: { text: '접속하지 않아도 DM이 쌓여요<br><b>방치 보상</b>에서 직접 받으세요', sec: 7, side: 'bottom' },
    pet_intro: { text: '펫을 처음 얻었어요!<br><b>작전 지원 → 펫</b>에서 장착하세요', sec: 7, side: 'bottom' },
    shop_intro: { text: '<b>상점</b>에서 상품과 확률 정보를 확인할 수 있어요', sec: 7, side: 'bottom' }
};

/** 안내 id를 아직 안 봤으면 anchor(요소 또는 선택자) 옆에 말풍선. 돌려주는 값: 말풍선 요소 또는 null */
export function coach(id, anchor, { remember = true } = {}) {
    const c = COACH[id];
    if (!c || (remember && progress.hasTip(id))) return null;
    const a = typeof anchor === 'string' ? document.querySelector(anchor) : anchor;
    if (!a || !a.getClientRects().length) return null;
    if (remember) progress.markTip(id);
    const host = a.closest('.screen-v2') || document.body;
    const el = document.createElement('div');
    const side = c.side || 'top';
    el.className = `v2-coach is-${side}`;
    el.innerHTML = `<p>${c.text}</p>`;
    host.appendChild(el);
    // 화면 맞춤 배율(transform)을 풀어 host 안 좌표로: 가리킬 단추의 가운데 위(아래)
    const hr = host.getBoundingClientRect();
    const ar = a.getBoundingClientRect();
    const k = hr.width / (host.offsetWidth || hr.width) || 1;
    const half = el.offsetWidth / 2 + 8;
    const x = Math.max(half, Math.min((host.offsetWidth || hr.width) - half, (ar.left + ar.width / 2 - hr.left) / k));
    el.style.left = `${x}px`;
    el.style.top = `${((side === 'bottom' ? ar.bottom : ar.top) - hr.top) / k}px`;
    el.style.setProperty('--arrow', `${(ar.left + ar.width / 2 - hr.left) / k - x}px`);
    setTimeout(() => el.classList.add('is-out'), c.sec * 1000);
    setTimeout(() => el.remove(), c.sec * 1000 + 400);
    return el;
}
