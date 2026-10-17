/* ==========================================================================
   PROJECT: MAD OVERLORD // 캐릭터 선택창 (v2, 가로 1280x720) — D-051
   - 메인 화면 CHARACTER 버튼으로 들어옴
   - 캐릭터 카드: 그 캐릭터의 장착(기억해 둔 장착 / 가진 파츠)으로 조립한 리그 idle, 소개, 능력치, 스킬, 보유 파츠 수
   - 카드를 누르면 바로 그 캐릭터로 바뀜 (지금 장착은 캐릭터마다 기억) → 결정(메인 화면) / 연구소
   - 몸통을 아직 안 산 캐릭터도 고를 수 있음: 흐린 모습으로 보이고, 연구소에서 파츠를 사야 출격
   캐릭터 목록은 js/engine_v2/roster_v2.js, 선택·장착 기억은 progress_v2.js
   ========================================================================== */

import { gameState } from '../engine/state.js';
import { progress } from '../engine_v2/progress_v2.js';
import { ROSTER, rosterOf, SLOTS } from '../engine_v2/roster_v2.js';
import { RigAvatar, rigConfigFor } from '../engine_v2/rig/rigAvatar.js';
import { RIG_CHARACTERS } from '../engine_v2/rig/characters.js';
import { skillsForParts, legPassiveOf } from '../engine_v2/skills_v2.js';
import { sound } from '../engine_v2/audio/sound_v2.js';
import { icon, fillIcons } from './icons.js';
import { openSettings } from './settingsPanel_v2.js';

const $ = id => document.getElementById(id);
const CARD_RIG = { width: 260, height: 236, rootX: 130, rootY: 226, scale: 0.3, fit: { x: 12, y: 10 }, shadow: true };

/** 파츠 id 묶음 → 파츠 객체 묶음 (없는 부위는 [파츠제거] 객체) */
function objectsOf(ids) {
    const out = {};
    for (const slot of SLOTS) out[slot] = gameState.getPartById(slot, ids[slot]);
    return out;
}

export class SelectController {
    constructor(switchScreenFn) {
        this.switchScreen = switchScreenFn;
        this.root = $('screen-select-v2');
        this.grid = $('select-grid-v2');
        this.cards = {};   // 캐릭터 id → { el, rig }
        if (!this.root || !this.grid) return;
        fillIcons(this.root);
        const chip = this.root.querySelector('.v2-chip--dm');
        if (chip) chip.insertAdjacentHTML('afterbegin', icon('gem', 18));
        this.buildCards();
        this.initEvents();
    }

    buildCards() {
        this.grid.innerHTML = '';
        for (const c of ROSTER) {
            const el = document.createElement('div');
            el.className = 'v2-charcard';
            el.dataset.char = c.id;
            el.tabIndex = 0;
            el.setAttribute('role', 'button');
            el.style.setProperty('--cc', c.color);
            el.innerHTML = `
                <div class="v2-charcard__head">
                    <div><small>${c.tag}</small><h2>${RIG_CHARACTERS[c.id] ? RIG_CHARACTERS[c.id].name : c.faction}</h2></div>
                    <span class="v2-charcard__badge">SELECTED</span>
                </div>
                <div class="v2-charcard__stage"><div class="v2-showroom__floor"></div><canvas></canvas></div>
                <p class="v2-charcard__desc">${c.desc}</p>
                <dl class="v2-charcard__stats"></dl>
                <ul class="v2-charcard__skills"></ul>
                <div class="v2-charcard__foot"></div>`;
            el.addEventListener('click', () => this.pick(c.id));
            el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.pick(c.id); } });
            this.grid.appendChild(el);
            this.cards[c.id] = { el, rig: null };
        }
    }

    initEvents() {
        $('btn-select-back-v2')?.addEventListener('click', () => this.switchScreen('menu'));
        $('btn-select-confirm-v2')?.addEventListener('click', () => this.switchScreen('menu'));
        $('btn-select-settings-v2')?.addEventListener('click', () => openSettings());
        $('btn-select-lab-v2')?.addEventListener('click', () => {
            gameState.resetCartToEquipped();
            this.switchScreen('lab');
        });
    }

    /** 카드 누름: 그 캐릭터로 바꿈 (지금 장착은 기억) */
    pick(id) {
        if (id === progress.character) return;
        if (!progress.selectCharacter(id)) return;
        sound.play('ui_equip');
        this.render();
    }

    /** 선택창이 보일 때: 카드 내용 갱신 + 리그 재생 */
    render() {
        const dm = $('select-dm-count-v2');
        if (dm) dm.textContent = gameState.darkMatter.toLocaleString();
        for (const c of ROSTER) this.renderCard(c);
        this.renderInfo();
    }

    renderCard(c) {
        const card = this.cards[c.id];
        if (!card) return;
        const { el } = card;
        const ids = progress.loadoutFor(c.id);
        const parts = objectsOf(ids);
        const st = progress.statsFor(parts);
        const own = progress.ownedCountOf(c.id);
        const ready = ids.body !== 'none';
        const on = c.id === progress.character;
        el.classList.toggle('is-selected', on);
        el.classList.toggle('is-empty', !ready);
        el.setAttribute('aria-pressed', String(on));

        el.querySelector('.v2-charcard__stats').innerHTML = [['ARMOR', st.hp], ['POWER', st.dps], ['SPEED', st.speed]]
            .map(([k, v]) => `<div><dt>${k}</dt><dd>${ready ? Number(v).toLocaleString() : '—'}</dd></div>`).join('');

        const skills = skillsForParts(parts);
        const leg = legPassiveOf(parts.leg);
        const chips = [['arm', '1'], ['body', '2'], ['head', 'ULT']].map(([slot, tag]) => {
            const sk = skills[slot];
            return sk ? `<li style="--sk:${sk.color}" title="${tag === 'ULT' ? '필살기' : `스킬 ${tag}`} · ${sk.name}">${icon(sk.icon, 16)}<span>${sk.name}</span></li>`
                : `<li class="is-off" title="파츠 없음">${icon('lock', 14)}<span>—</span></li>`;
        });
        if (leg) chips.push(`<li style="--sk:#8b95a8" title="패시브 · ${leg.name}">${icon('shield', 16)}<span>${leg.name}</span></li>`);
        el.querySelector('.v2-charcard__skills').innerHTML = chips.join('');

        el.querySelector('.v2-charcard__foot').innerHTML = `<span>파츠 <b>${own.owned}</b> / ${own.total} 보유</span>`
            + (ready ? '<em class="is-ready">출격 가능</em>' : '<em class="is-need">연구소에서 몸통 구매</em>');

        this.renderRig(c.id, parts);
    }

    renderRig(id, parts) {
        const card = this.cards[id];
        const config = rigConfigFor(parts, id);
        if (!config) return;
        if (!card.rig) card.rig = new RigAvatar(card.el.querySelector('canvas'), { ...CARD_RIG, character: id });
        if (config.arm) card.rig.setArm(config.arm);
        card.rig.setPartFilters(config.filters);
        card.rig.setVariants(config.variants);   // A·B 세트 부위 그림 (D-050)
        card.rig.start();
    }

    renderInfo() {
        const box = $('select-info-v2');
        if (!box) return;
        const c = rosterOf(progress.character);
        const own = progress.ownedCountOf(progress.character);
        const ready = progress.isReady();
        box.innerHTML = `<span>선택 <b style="color:${c.color}">${RIG_CHARACTERS[c.id].name}</b></span>`
            + `<span>파츠 <b>${own.owned}</b> / ${own.total} 보유</span>`
            + `<small>${ready ? '연구소에는 이 캐릭터의 파츠만 나옵니다 · 캐릭터마다 장착을 따로 기억합니다'
                : '몸통 파츠가 없어 아직 출격할 수 없습니다 — 연구소에서 파츠를 구매하세요'}</small>`;
        const lab = $('btn-select-lab-v2');
        if (lab) lab.classList.toggle('is-hint', !ready);
    }

    /** 선택창을 떠날 때: 카드 리그 멈춤 */
    onLeave() {
        for (const card of Object.values(this.cards)) if (card.rig) card.rig.stop();
    }
}
