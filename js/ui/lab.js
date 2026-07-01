/* ==========================================================================
   PROJECT: MAD OVERLORD // RESEARCH LAB KIOSK CONTROLLER (MVVM)
   ========================================================================== */

import { gameState } from '../engine/state.js';
import { PARTS_DB } from '../data/parts.js';
import { monsterController } from '../engine/monster.js';

export class LabController {
    constructor(switchScreenFn) {
        this.switchScreen = switchScreenFn;
        this.activeSlot = 'head';
        
        this.domDmCount = document.getElementById('lab-dm-count');
        this.domPartsGrid = document.getElementById('parts-grid');
        this.domCartCost = document.getElementById('cart-cost');
        this.btnEquip = document.getElementById('btn-equip-confirm');

        // MVVM 스탯 피드백 DOM
        this.statHp = document.getElementById('stat-hp-val');
        this.statDps = document.getElementById('stat-dps-val');
        this.statRange = document.getElementById('stat-range-val');
        this.statSpeed = document.getElementById('stat-speed-val');
        this.statSkill = document.getElementById('stat-skill-desc');

        this.initEvents();
    }

    initEvents() {
        const btnBack = document.getElementById('btn-lab-back');
        if (btnBack) {
            btnBack.addEventListener('click', () => {
                this.switchScreen('menu');
            });
        }

        // 탭 버튼 클릭 이벤트
        const tabBtns = document.querySelectorAll('.tab-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                tabBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.activeSlot = btn.dataset.slot || 'head';
                this.renderPartsGrid();
            });
        });

        // 파츠 장착 확정 버튼
        if (this.btnEquip) {
            this.btnEquip.addEventListener('click', () => {
                const res = gameState.confirmEquip();
                if (res.success) {
                    this.showNotification(`개조 완료! (-${res.cost} DM)`, 'success');
                    this.updateMvvmFeedback();
                    this.renderPartsGrid();
                } else {
                    this.showNotification(res.reason, 'error');
                }
            });
        }
    }

    showNotification(msg, type = 'success') {
        const el = document.createElement('div');
        el.style.position = 'absolute';
        el.style.top = '20px';
        el.style.left = '50%';
        el.style.transform = 'translateX(-50%)';
        el.style.padding = '10px 20px';
        el.style.borderRadius = '6px';
        el.style.fontFamily = 'var(--font-head)';
        el.style.fontSize = '12px';
        el.style.fontWeight = '800';
        el.style.zIndex = '300';
        el.style.boxShadow = '0 0 20px rgba(0,0,0,0.8)';

        if (type === 'success') {
            el.style.background = '#00ff66';
            el.style.color = '#000';
        } else {
            el.style.background = '#ff0055';
            el.style.color = '#fff';
        }
        el.textContent = msg;
        document.querySelector('.lab-frame').appendChild(el);
        setTimeout(() => el.remove(), 2000);
    }

    renderPartsGrid() {
        if (!this.domPartsGrid) return;
        this.domPartsGrid.innerHTML = '';

        const list = PARTS_DB[this.activeSlot] || [];
        const currentSelectedId = gameState.cartParts[this.activeSlot];
        const equippedId = gameState.equippedParts[this.activeSlot];

        list.forEach(part => {
            const card = document.createElement('div');
            card.className = `part-card ${part.id === currentSelectedId ? 'selected' : ''}`;
            
            const isEquipped = part.id === equippedId;
            const costText = isEquipped ? '장착 중' : (part.cost === 0 ? '기본' : `${part.cost} DM`);

            card.innerHTML = `
                <div>
                    <div class="part-card-header">
                        <span class="part-name">${part.name}</span>
                        <span class="part-cost" style="${isEquipped ? 'background:#00ff66;color:#000;' : ''}">${costText}</span>
                    </div>
                    <div class="part-stats-summary">
                        HP +${part.stats.hp} | DPS +${part.stats.dps}<br>
                        <span style="color:#ff0055;font-weight:700;">기믹: ${part.skillDesc.substring(0, 22)}...</span>
                    </div>
                </div>
            `;

            card.addEventListener('click', () => {
                gameState.selectCartPart(this.activeSlot, part.id);
                this.renderPartsGrid();
            });

            this.domPartsGrid.appendChild(card);
        });
    }

    updateMvvmFeedback() {
        if (this.domDmCount) {
            this.domDmCount.textContent = gameState.darkMatter.toLocaleString();
        }

        const stats = gameState.getCartStats();
        if (this.statHp) this.statHp.textContent = stats.hp.toLocaleString();
        if (this.statDps) this.statDps.textContent = stats.dps.toLocaleString();
        if (this.statRange) this.statRange.textContent = `${stats.range}px`;
        if (this.statSpeed) this.statSpeed.textContent = stats.speed;
        
        if (this.statSkill) {
            this.statSkill.innerHTML = stats.skillDescs.map(d => `• ${d}`).join('<br>') || '장착된 특수 기믹 없음';
        }

        const cost = gameState.getCartTotalCost();
        if (this.domCartCost) {
            this.domCartCost.textContent = cost.toLocaleString();
            this.domCartCost.style.color = cost > gameState.darkMatter ? '#ff0055' : '#00ffcc';
        }

        // 키오스크 화면의 Live2D 모델 프리뷰 실시간 동기화
        const cartObjs = gameState.getCartObjects();
        monsterController.renderVisuals(cartObjs);
    }
}
