/* ==========================================================================
   PROJECT: MAD OVERLORD // 강화 외 성장 화면 조각 (v2, Q-006)
   ① 재화 칩 (★ 남은 별 · 파츠 조각 · 스킬 코어) — 메인·연구소 위쪽
   ② 작전 지원 창 (메인 "작전 지원" 버튼): 전술 모듈 · 파견 · 계정 연구 — 별·DM·조각·코어를 쓰는 곳
   수치는 engine_v2/growth_v2.js, 저장은 engine_v2/progressGrowth_v2.js.
   ========================================================================== */

import { gameState } from '../engine/state.js';
import { progress } from '../engine_v2/progress_v2.js';
import { rosterOf, ROSTER } from '../engine_v2/roster_v2.js';
import { CHAPTERS } from '../engine_v2/stages_v2.js';
import { MODULES, MODULE_MAX_LEVEL, RESEARCH, DISPATCH, gradeOf, OPTIONS } from '../engine_v2/growth_v2.js';
import { sound } from '../engine_v2/audio/sound_v2.js';
import { icon } from './icons.js';

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** 재화 칩 안쪽 HTML */
export function resChipHtml() {
    return `<span title="남은 별 (캐릭터 해금·전술 모듈·계정 연구)"><i>★</i><b>${progress.availableStars()}</b></span>`
        + `<span title="파츠 조각 (등급 올리기)"><i>조각</i><b>${progress.shards}</b></span>`
        + `<span title="스킬 코어 (스킬 강화)"><i>코어</i><b>${progress.cores}</b></span>`;
}

/** 등급 표시 태그 (커먼이면 빈 문자열) */
export function gradeTag(partId) {
    const g = gradeOf(progress.gradeOf(partId));
    return g.id === 'common' ? '' : `<span class="v2-gradetag" style="--grade:${g.color}">${g.name}</span>`;
}

/** 옵션 한 줄 */
export function optionText(partId) {
    const opts = progress.optionsOf(partId).map(o => OPTIONS[o]).filter(Boolean);
    return opts.length ? `옵션: ${opts.map(o => `${o.name}(${o.desc})`).join(' · ')}` : '';
}

const clock = ms => {
    const s = Math.max(0, Math.ceil(ms / 1000));
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    return h ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${m}:${String(sec).padStart(2, '0')}`;
};

// ---- 작전 지원 창 ----
let panel = null;
let tab = 'modules';
let timer = null;
let onChange = null;

export function openGrowthPanel(startTab = 'modules', changed = null) {
    tab = startTab;
    onChange = changed;
    if (!panel) {
        panel = document.createElement('div');
        panel.className = 'v2-growth';
        panel.setAttribute('role', 'dialog');
        panel.setAttribute('aria-label', '작전 지원');
        panel.addEventListener('click', e => {
            if (e.target === panel) return closeGrowthPanel();
            const el = e.target.closest('[data-act]');
            if (el && !el.disabled) act(el.dataset.act, el.dataset);
        });
        document.addEventListener('keydown', e => { if (panel?.isConnected && e.key === 'Escape') closeGrowthPanel(); });
    }
    document.body.appendChild(panel);   // 설정 창처럼 화면 전체 위 (settingsPanel_v2.js)
    render();
    clearInterval(timer);
    timer = setInterval(() => { if (tab === 'dispatch' && panel.isConnected) render(); }, 1000);
    sound.play('ui_click');
}

export function closeGrowthPanel() {
    clearInterval(timer);
    if (panel?.isConnected) panel.remove();
    if (onChange) onChange();
}

function toast(msg, ok = true) {
    const el = document.createElement('div');
    el.className = `v2-toast${ok ? '' : ' is-error'}`;
    el.textContent = msg;
    panel.querySelector('.v2-growth__box').appendChild(el);
    setTimeout(() => el.remove(), 2200);
    sound.play(ok ? 'ui_equip' : 'ui_error');
}

function act(name, d) {
    let r = null;
    if (name === 'tab') { tab = d.tab; sound.play('ui_tab'); return render(); }
    if (name === 'close') return closeGrowthPanel();
    if (name === 'buyModule') r = progress.buyModule(d.id);
    if (name === 'equipModule') { progress.equipModule(Number(d.slot), d.id || null); sound.play('ui_tab'); return render(); }
    if (name === 'upModule') r = progress.upgradeModule(d.id);
    if (name === 'buyResearch') r = progress.buyResearch(d.id);
    if (name === 'dispatch') {
        const sel = panel.querySelector(`select[data-zone-for="${d.char}"]`);
        r = progress.startDispatch(d.char, Number(sel ? sel.value : 0));
    }
    if (name === 'collect') {
        r = progress.collectDispatch(Number(d.index));
        if (r.success) {
            const part = r.part ? ` · ${r.part.name}(${gradeOf(r.part.grade).name}) ${r.part.type === 'refund' ? '환급' : '획득'}` : '';
            render();   // 다시 그린 뒤 알림 (먼저 띄우면 다시 그리며 지워짐)
            return toast(`파견 보상: +${r.dm.toLocaleString()} DM · 조각 +${r.shards} · 코어 +${r.cores}${part}`);
        }
    }
    render();
    if (r) toast(r.success ? '완료!' : r.reason, r.success);
}

function render() {
    if (!panel) return;
    const tabs = [['modules', '전술 모듈'], ['dispatch', '파견'], ['research', '계정 연구']];
    const body = tab === 'dispatch' ? dispatchHtml() : tab === 'research' ? researchHtml() : modulesHtml();
    panel.innerHTML = `<div class="v2-growth__box v2-panel">
        <div class="v2-growth__head">
            <h2>작전 지원</h2>
            <div class="v2-chip v2-chip--res">${resChipHtml()}</div>
            <div class="v2-chip v2-chip--dm">${icon('gem', 16)}<strong>${gameState.darkMatter.toLocaleString()}</strong><small>DM</small></div>
            <button class="v2-iconbtn" data-act="close" aria-label="닫기">✕</button>
        </div>
        <nav class="v2-growth__tabs">${tabs.map(([id, label]) => `<button data-act="tab" data-tab="${id}" class="${tab === id ? 'is-on' : ''}">${label}</button>`).join('')}</nav>
        <div class="v2-growth__body">${body}</div>
    </div>`;
}

function modulesHtml() {
    const slots = progress.moduleSlots();
    const eq = Array.from({ length: slots }, (_, i) => progress.modules.equipped[i] || null);
    const slotHtml = eq.map((id, i) => {
        const m = id && MODULES[id];
        return `<div class="v2-modslot"><small>칸 ${i + 1} · 키 ${i + 4}</small>${m ? `${icon(m.icon, 18)}<b>${m.name}</b>` : '<em>비어 있음</em>'}</div>`;
    }).join('');
    const cards = Object.entries(MODULES).map(([id, m]) => {
        const own = progress.ownsModule(id);
        const lv = progress.moduleLevel(id);
        const up = progress.moduleUpgradeCost(id);
        const slotBtns = own ? Array.from({ length: slots }, (_, i) => `<button data-act="equipModule" data-slot="${i}" data-id="${eq[i] === id ? '' : id}" class="${eq[i] === id ? 'is-on' : ''}">${eq[i] === id ? `칸 ${i + 1} 빼기` : `칸 ${i + 1}에`}</button>`).join('') : '';
        return `<div class="v2-modcard${own ? ' is-own' : ''}" style="--sk:${m.color}">
            <div class="v2-modcard__head">${icon(m.icon, 22)}<b>${m.name}</b>${own ? `<i>Lv${lv}/${MODULE_MAX_LEVEL}</i>` : ''}</div>
            <p>${esc(m.desc)}</p><small>쿨다운 ${Math.round(m.cd * (1 - 0.1 * (lv - 1)))}초${own && lv < MODULE_MAX_LEVEL ? ' · 강화마다 -10%' : ''}</small>
            <div class="v2-modcard__acts">${own ? slotBtns + (up != null ? `<button data-act="upModule" data-id="${id}" ${up > gameState.darkMatter ? 'disabled' : ''}>강화 ${up.toLocaleString()} DM</button>` : '<span class="is-max">MAX</span>')
                : `<button data-act="buyModule" data-id="${id}" ${progress.availableStars() < m.stars ? 'disabled' : ''}>★${m.stars}로 해금</button>`}</div>
        </div>`;
    }).join('');
    return `<p class="v2-growth__hint">출격 때 끼우는 보조 스킬 (키 4·5, AUTO면 쓸 상황에 자동). 칸: 노말 1칸 → 하드를 열면 2칸. 별로 해금, DM으로 강화.</p>
        <div class="v2-modslots">${slotHtml}</div><div class="v2-modgrid">${cards}</div>`;
}

function dispatchHtml() {
    const now = Date.now();
    const zones = progress.dispatchZones();
    const slots = progress.dispatchSlots();
    const running = progress.dispatch.map((d, i) => {
        const left = d.end - now, done = left <= 0;
        const pct = Math.min(100, ((now - d.start) / (d.end - d.start)) * 100);
        const r = rosterOf(d.character);
        return `<div class="v2-dispatch${done ? ' is-done' : ''}" style="--sk:${r ? r.color : '#888'}">
            <b>${r ? r.faction : d.character}</b><small>구역 ${d.zone} · ${CHAPTERS[d.zone - 1]?.name.split('·')[1]?.trim() || ''}</small>
            <div class="v2-dispatch__bar"><i style="width:${pct}%"></i></div>
            ${done ? `<button data-act="collect" data-index="${i}">받기</button>` : `<span>${clock(left)} 남음</span>`}</div>`;
    }).join('');
    const free = slots - progress.dispatch.length;
    const cands = ROSTER.filter(c => c.id !== progress.character && progress.isCharacterUnlocked(c.id) && !progress.isDispatched(c.id));
    const opts = zones.map(z => `<option value="${z}">구역 ${z}</option>`).join('');
    const list = !zones.length ? '<p class="v2-growth__hint">노말에서 구역 보스전(1-B)을 깨면 그 구역에 파견할 수 있어요.</p>'
        : !cands.length ? '<p class="v2-growth__hint">보낼 캐릭터가 없어요 — 출전 중이 아닌 열린 캐릭터만 보낼 수 있어요.</p>'
            : cands.map(c => `<div class="v2-dispatch v2-dispatch--new" style="--sk:${c.color}"><b>${c.faction}</b>
                <select data-zone-for="${c.id}" aria-label="${c.faction} 파견 구역">${opts}</select>
                <button data-act="dispatch" data-char="${c.id}" ${free <= 0 ? 'disabled' : ''}>파견</button></div>`).join('');
    const ex = DISPATCH.reward(zones[zones.length - 1] || 1);
    return `<p class="v2-growth__hint">출전하지 않는 캐릭터를 깬 구역에 ${DISPATCH.hours}시간(연구로 단축) 보내면 DM·파츠 조각·스킬 코어를 가져와요 (30% 확률로 그 캐릭터 파츠, 레어 이하).
        예: 구역 ${zones[zones.length - 1] || 1} = DM ${ex.dm.toLocaleString()} · 조각 ${ex.shards} · 코어 ${ex.cores}. 칸 ${progress.dispatch.length}/${slots} (하드·헬을 열면 늘어남).</p>
        <div class="v2-dispatchlist">${running}${list}</div>`;
}

function researchHtml() {
    const rows = Object.entries(RESEARCH).map(([id, r]) => {
        const lv = progress.researchLevel(id);
        const cost = progress.researchCost(id);
        return `<div class="v2-research">
            <b>${r.name}</b><small>${esc(r.desc)} · 단계 ${lv}/${r.max}</small>
            <div class="v2-pips">${Array.from({ length: r.max }, (_, i) => `<i class="${i < lv ? 'is-on' : ''}"></i>`).join('')}</div>
            ${cost == null ? '<span class="is-max">MAX</span>' : `<button data-act="buyResearch" data-id="${id}" ${progress.availableStars() < cost ? 'disabled' : ''}>★${cost}</button>`}
        </div>`;
    }).join('');
    return `<p class="v2-growth__hint">별로 계정 전체에 붙는 작은 영구 보너스. 별은 난이도마다 따로 모여요 (지금 모은 별 ★${progress.totalStars()}, 쓴 별 ★${progress.spentStars}).</p>
        <div class="v2-researchlist">${rows}</div>`;
}
