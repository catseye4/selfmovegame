/* ==========================================================================
   PROJECT: MAD OVERLORD // 연구소: 파츠 개조 (v2, 가로 1280x720)
   - 왼쪽: 개조 미리보기 — 장바구니(선택 중인) 파츠로 조립한 리그 캐릭터 (몸통 팩션이 캐릭터를 정함)
   - 가운데: 능력치 비교(현재 → 개조 후) + 스킬 구성(팔 1 / 몸통 2 / 머리 필살기 / 다리 패시브)
   - 오른쪽: 부위 탭 + 파츠 카드 (리그 부위 그림, 팩션 색, 능력치, 부여 스킬, 가격/장착 상태)
   - 아래: 변경 수, 개조 비용, 개조 후 잔액, 되돌리기, 개조 확정
   게임 상태(장바구니/장착/재화)는 js/engine/state.js, 파츠 데이터는 js/data/parts.js (구버전과 공용, 읽기만)
   ========================================================================== */

import { gameState } from '../engine/state.js';
import { PARTS_DB } from '../data/parts.js';
import { PART_SKILL, SKILLS, skillsForParts } from '../engine_v2/skills_v2.js';
import { RigAvatar, rigConfigFor } from '../engine_v2/rig/rigAvatar.js';
import { RIG_CHARACTERS } from '../engine_v2/rig/characters.js';
import { sound } from '../engine_v2/audio/sound_v2.js';
import { icon, fillIcons } from './icons.js';
import { openSettings } from './settingsPanel_v2.js';
import { legPassive } from './menu_v2.js';

const $ = id => document.getElementById(id);
const SLOTS = ['head', 'body', 'arm', 'leg'];
const ROLE = { arm: { tag: '1', label: '스킬 1' }, body: { tag: '2', label: '스킬 2' }, head: { tag: 'ULT', label: '필살기' }, leg: { tag: 'P', label: '패시브' } };
// 팩션 문자열(parts.js) → 리그 캐릭터 / 표시 색
const FACTIONS = [['거대로봇', 'mech', '#3ee6ff'], ['거대괴수', 'kaiju', '#a0ff32'], ['타락 히어로', 'hero', '#c86eff'], ['합성괴인', 'chimera', '#ff9628']];
// 카드 그림: 같은 팩션 리그 캐릭터의 해당 부위 그림
const THUMB = {
    mech: { head: 'head.png', body: 'body.png', arm: p => (p.attackType === 'laser' || p.attackType === 'missile' ? 'armR_cannon.png' : 'armR_fist.png'), leg: 'legR.png' },
    kaiju: { head: 'head.png', body: 'body.png', arm: 'armF.png', leg: 'legF.png' },
    hero: { head: 'head.png', body: 'torso.png', arm: 'sword.png', leg: 'shinF.png' },
    chimera: { head: 'head.png', body: 'torso.png', arm: 'armF.png', leg: 'legF.png' }
};
const LAB_RIG = { width: 350, height: 400, rootX: 175, rootY: 384, scale: 0.36, fit: { x: 22, y: 16 }, shadow: true };

function factionOf(part) {
    const f = FACTIONS.find(([name]) => String(part && part.faction).includes(name));
    return f ? { id: f[1], color: f[2] } : null;
}

function thumbOf(slot, part) {
    const f = factionOf(part);
    if (!f || !THUMB[f.id]) return null;
    const file = THUMB[f.id][slot];
    return `assets/sprites/rig/${f.id}/${typeof file === 'function' ? file(part) : file}`;
}

function skillOf(slot, part) {
    if (!part || part.id === 'none') return null;
    if (slot === 'leg') {
        const p = legPassive(part);
        return p ? { name: p.name, desc: p.desc, icon: 'shield', color: '#8b95a8', passive: true } : null;
    }
    const id = PART_SKILL[part.id];
    return id ? { id, ...SKILLS[id] } : null;
}

export class LabController {
    constructor(switchScreenFn) {
        this.switchScreen = switchScreenFn;
        this.activeSlot = 'head';
        this.root = $('screen-lab-v2');
        this.domPartsGrid = $('parts-grid-v2');
        this.domDmCount = $('lab-dm-count-v2');
        this.btnEquip = $('btn-equip-confirm-v2');
        const canvas = $('lab-rig-canvas-v2');
        this.rig = canvas ? new RigAvatar(canvas, LAB_RIG) : null;
        this.rigOn = false;
        fillIcons(this.root);
        const chip = this.root && this.root.querySelector('.v2-chip--dm');
        if (chip) chip.insertAdjacentHTML('afterbegin', icon('gem', 18));
        this.initEvents();
    }

    initEvents() {
        $('btn-lab-back-v2')?.addEventListener('click', () => this.switchScreen('menu'));
        $('btn-lab-settings-v2')?.addEventListener('click', () => openSettings());

        const tabs = this.root.querySelectorAll('.tab-btn-v2');
        tabs.forEach(btn => btn.addEventListener('click', () => {
            tabs.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            this.activeSlot = btn.dataset.slot || 'head';
            this.renderPartsGrid();
        }));

        $('btn-cart-reset-v2')?.addEventListener('click', () => {
            gameState.resetCartToEquipped();
            this.renderPartsGrid();
            this.updateMvvmFeedback();
        });

        this.btnEquip?.addEventListener('click', () => {
            const res = gameState.confirmEquip();
            sound.play(res.success ? 'ui_equip' : 'ui_error');
            if (res.success) {
                this.showNotification(res.cost ? `개조 완료! (-${res.cost.toLocaleString()} DM)` : '개조 완료!', 'success');
                this.renderPartsGrid();
                this.updateMvvmFeedback();
            } else {
                this.showNotification(res.reason, 'error');
            }
        });
    }

    showNotification(msg, type = 'success') {
        const el = document.createElement('div');
        el.className = `v2-toast${type === 'success' ? '' : ' is-error'}`;
        el.textContent = msg;
        this.root.querySelector('.v2-lab').appendChild(el);
        setTimeout(() => el.remove(), 2000);
    }

    // ------------------------------------------------------------------
    renderPartsGrid() {
        if (!this.domPartsGrid) return;
        const slot = this.activeSlot;
        const list = PARTS_DB[slot] || [];
        const cartId = gameState.cartParts[slot];
        const equippedId = gameState.equippedParts[slot];

        this.domPartsGrid.innerHTML = '';
        list.forEach(part => {
            const f = factionOf(part);
            const sk = skillOf(slot, part);
            const thumb = thumbOf(slot, part);
            const equipped = part.id === equippedId;
            const badge = equipped ? ['EQUIPPED', 'is-equipped']
                : part.cost === 0 ? ['FREE', 'is-free']
                    : [`${part.cost.toLocaleString()} DM`, part.cost > gameState.darkMatter ? 'is-poor' : ''];
            const card = document.createElement('div');
            card.className = `part-card v2-partcard${part.id === cartId ? ' is-selected' : ''}`;
            card.style.setProperty('--fc', f ? f.color : '#5a6272');
            card.innerHTML = `
                <div class="v2-partcard__side">
                    <div class="v2-partcard__thumb">${thumb ? `<img src="${thumb}" alt="">` : icon('retreat', 30)}</div>
                    <span class="v2-partcard__badge ${badge[1]}">${badge[0]}</span>
                </div>
                <div class="v2-partcard__body">
                    <div class="v2-partcard__name">${part.name}</div>
                    <div class="v2-partcard__faction">${part.id === 'none' ? '장착 해제' : part.faction}</div>
                    <div class="v2-partcard__stats">HP +${part.stats.hp} · DPS +${part.stats.dps}${part.stats.range ? ` · RNG +${part.stats.range}` : ''}</div>
                    ${sk ? `<div class="v2-partcard__skill" style="--sk:${sk.color}"><em>${ROLE[slot].tag}</em>${icon(sk.icon, 13)}${sk.name}</div>` : '<div class="v2-partcard__skill">스킬 없음</div>'}
                </div>`;
            card.addEventListener('click', () => {
                gameState.selectCartPart(slot, part.id);
                this.renderPartsGrid();
                this.updateMvvmFeedback();
            });
            this.domPartsGrid.appendChild(card);
        });
    }

    updateMvvmFeedback() {
        if (this.domDmCount) this.domDmCount.textContent = gameState.darkMatter.toLocaleString();
        this.renderCompare();
        this.renderLoadout();
        this.renderCart();
        // 미리보기는 연구소 화면일 때만 (전투 중 재화 변동으로 불릴 때는 그리지 않음)
        if (gameState.currentScreen === 'lab') this.renderPreview();
    }

    renderCompare() {
        const cur = gameState.getEquippedStats();
        const next = gameState.getCartStats();
        const rows = [['최대 체력', 'hp'], ['초당 피해', 'dps'], ['사거리', 'range'], ['이동 속도', 'speed']];
        $('lab-compare-v2').innerHTML = rows.map(([label, k]) => {
            const d = next[k] - cur[k];
            const cls = d > 0 ? 'is-up' : d < 0 ? 'is-down' : '';
            const delta = d ? `${d > 0 ? '▲' : '▼'}${Math.abs(d).toLocaleString()}` : '';
            return `<div><dt>${label}</dt><dd class="is-old">${cur[k].toLocaleString()}</dd><dd class="is-arrow">→</dd>`
                + `<dd class="${cls}">${next[k].toLocaleString()}</dd><dd class="is-delta ${cls}">${delta}</dd></div>`;
        }).join('');
    }

    renderLoadout() {
        const cart = gameState.getCartObjects();
        const eq = gameState.getEquippedObjects();
        const cartSkills = skillsForParts(cart);
        const eqSkills = skillsForParts(eq);
        $('lab-loadout-v2').innerHTML = ['arm', 'body', 'head', 'leg'].map(slot => {
            const sk = slot === 'leg' ? skillOf('leg', cart.leg) : cartSkills[slot];
            const before = slot === 'leg' ? skillOf('leg', eq.leg) : eqSkills[slot];
            const changed = (sk && sk.name) !== (before && before.name);
            const meta = !sk ? '' : sk.ult ? '게이지' : sk.passive ? '상시' : `${sk.cd}초`;
            return `<li class="${changed ? 'is-changed' : ''}" style="--sk:${sk ? sk.color : '#3a4150'}">
                <span class="v2-loadout__icon">${icon(sk ? sk.icon : 'retreat', 20)}</span>
                <div class="v2-loadout__body">
                    <div class="v2-loadout__name"><em>${ROLE[slot].tag}</em>${sk ? sk.name : '없음'}${changed ? '<b>NEW</b>' : ''}<i>${meta}</i></div>
                    <div class="v2-loadout__desc">${sk ? (sk.desc || '') : `${ROLE[slot].label} 파츠가 없습니다`}</div>
                </div></li>`;
        }).join('');
    }

    renderCart() {
        const changes = SLOTS.filter(s => gameState.cartParts[s] !== gameState.equippedParts[s]).length;
        const cost = gameState.getCartTotalCost();
        const remain = gameState.darkMatter - cost;
        $('cart-count-v2').textContent = changes;
        $('cart-cost-v2').textContent = cost.toLocaleString();
        const rem = $('cart-remain-v2');
        rem.textContent = remain.toLocaleString();
        rem.classList.toggle('is-poor', remain < 0);
        if (this.btnEquip) {
            this.btnEquip.disabled = changes === 0 || remain < 0;
            this.btnEquip.querySelector('small').textContent = changes === 0 ? '변경한 파츠 없음' : remain < 0 ? 'DM 부족' : `${changes}개 파츠 장착`;
        }
    }

    renderPreview() {
        const cart = gameState.getCartObjects();
        const config = rigConfigFor(cart);
        const body = cart.body && cart.body.id !== 'none' ? cart.body : null;
        $('lab-unit-name-v2').textContent = config ? RIG_CHARACTERS[config.character].name : '미완성 기체';
        $('lab-faction-v2').textContent = body ? body.faction : '몸통 파츠를 골라 주세요';
        const changed = SLOTS.some(s => gameState.cartParts[s] !== gameState.equippedParts[s]);
        $('lab-preview-tag-v2').textContent = changed ? 'MODIFIED' : 'CURRENT';
        $('lab-empty-v2').hidden = !!config;
        if (!this.rig) return;
        if (!config) {
            this.rig.stop();
            this.rigOn = false;
            const c = this.rig.canvas;
            const ctx = c.getContext('2d');
            ctx.setTransform(1, 0, 0, 1, 0, 0);   // 리그가 남긴 변환 초기화 후 지움
            ctx.clearRect(0, 0, c.width, c.height);
            return;
        }
        this.rig.setCharacter(config.character);
        if (config.arm) this.rig.setArm(config.arm);
        if (!this.rigOn) {
            this.rig.setMode('idle');
            this.rig.start();
            this.rigOn = true;
        }
    }

    /** 연구소를 떠날 때: 미리보기 멈춤 */
    onLeave() {
        if (this.rig) this.rig.stop();
        this.rigOn = false;
    }
}
