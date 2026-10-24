/* ==========================================================================
   PROJECT: MAD OVERLORD // 패배 원인 알려주기 (2026-10-24, 로드맵 "처음 하는 사람용 다듬기")
   전투 중 남긴 구간 시각(b.stats.marks)으로 어디서 시간이 걸렸는지, 무엇 때문에 졌는지, 무엇을 하면 되는지를 만든다.
   결과 화면(battleDirector_v2.js showResult)이 패배 때 보여 준다. 전투 규칙은 건드리지 않는 순수 함수.
   입력 s = { time, marks: { midSeen, midDown, finalSeen, gateDown }, finalPct, bossPct, bossName,
             distance, maxDistance, overloads, overloadSec }
     - marks의 값은 그 일이 일어난 전투 시각(초), 없으면 일어나지 않음
     - finalPct·bossPct = 남은 체력 비율(0~1), 없으면 null
   ========================================================================== */

const pct = v => Math.round(v * 100);

/** 구간: 진격 → 중간 요새 → 진격 → 최종 기지 → (정문을 부순 뒤) 보스. 일어나지 않은 구간은 뺀다 */
export function runSegments(s) {
    const m = s.marks || {};
    const end = s.time;
    const cut = (v, fallback) => (v == null ? fallback : Math.min(v, end));
    const out = [];
    const add = (key, label, from, to) => { if (from != null && to > from) out.push({ key, label, sec: to - from }); };
    add('walk', '진격', 0, cut(m.midSeen, end));
    if (m.midSeen != null) add('mid', '중간 요새', m.midSeen, cut(m.midDown, end));
    if (m.midDown != null) add('walk', '진격', m.midDown, cut(m.finalSeen, end));
    if (m.finalSeen != null) add('final', '최종 기지', m.finalSeen, cut(m.gateDown, end));
    if (m.gateDown != null) add('boss', '보스', m.gateDown, end);
    return out;
}

/** 패배 원인 한 줄과 할 일 (많아야 3개) */
export function runReport(s) {
    const m = s.marks || {};
    const segments = runSegments(s);
    const longest = segments.reduce((a, b) => (b.sec > (a ? a.sec : -1) ? b : a), null);
    let cause;
    let tips;
    if (s.bossPct != null && s.bossPct > 0) {
        cause = { key: 'boss', text: `보스 ${s.bossName || ''} 체력 ${pct(s.bossPct)}% 남음` };
        tips = ['필살기 게이지를 보스 앞에서 아껴 두었다가 쓰세요', '팔 파츠를 강화하면 보스가 빨리 쓰러집니다'];
    } else if (m.finalSeen != null && s.finalPct != null) {
        if (s.finalPct <= 0.25) {
            cause = { key: 'almost', text: `최종 기지 체력 ${pct(s.finalPct)}% — 거의 다 부쉈습니다` };
            tips = ['필살기 한 번이나 강화 한두 단계면 충분합니다'];
        } else {
            cause = { key: 'final', text: `최종 기지 체력 ${pct(s.finalPct)}% 남음` };
            tips = ['거점에 강한 스킬(설명에 "거점 n배")을 기지 앞에서 쓰세요', '팔 파츠를 강화하면 기지가 빨리 부서집니다'];
        }
    } else if (m.midSeen != null && m.midDown == null) {
        cause = { key: 'mid', text: '중간 요새를 부수지 못했습니다' };
        tips = ['요새 앞에서 스킬을 몰아 쓰세요', '팔 파츠를 강화하면 요새가 빨리 부서집니다'];
    } else {
        const went = s.maxDistance ? pct(Math.min(1, s.distance / s.maxDistance)) : 0;
        cause = { key: 'walk', text: `최종 기지까지 가지 못했습니다 (진격 ${went}%)` };
        tips = ['적을 빨리 쓰러뜨려야 앞으로 나아갑니다 — 팔(공격) 강화, 여럿을 맞히는 스킬', '다리 파츠는 진격 속도를 올립니다'];
    }
    if (s.overloads >= 2) tips.push(`과부하 ${s.overloads}번으로 약 ${Math.round(s.overloads * (s.overloadSec || 4))}초 멈췄습니다 — 몸통 파츠(체력)를 강화하세요`);
    return { segments, longest: segments.indexOf(longest), cause, tips: tips.slice(0, 3) };
}
