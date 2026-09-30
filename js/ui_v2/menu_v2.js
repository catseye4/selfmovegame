/* ==========================================================================
   PROJECT: MAD OVERLORD // MAIN MENU CONTROLLER (PORTRAIT KIOSK) (v2)
   ========================================================================== */

import { gameState } from '../engine/state.js';
import { monsterControllerV2 } from '../engine_v2/monster_v2.js';

export class MenuController {
    constructor(switchScreenFn) {
        this.switchScreen = switchScreenFn;
        this.domDmCount = document.getElementById('menu-dm-count-v2');
        this.domFactionName = document.getElementById('menu-faction-name-v2');

        this.initEvents();
    }

    initEvents() {
        const btnLab = document.getElementById('btn-to-lab-v2');
        const btnBattle = document.getElementById('btn-to-battle-v2');

        if (btnLab) {
            btnLab.addEventListener('click', () => {
                gameState.resetCartToEquipped();
                this.switchScreen('lab');
            });
        }

        if (btnBattle) {
            btnBattle.addEventListener('click', () => {
                this.switchScreen('battle');
            });
        }
    }

    updateDisplay() {
        if (this.domDmCount) {
            this.domDmCount.textContent = gameState.darkMatter.toLocaleString();
        }

        const equippedObjs = gameState.getEquippedObjects();
        monsterControllerV2.renderVisuals(equippedObjs);

        // 캐릭터 외형(리그)은 몸통 팩션으로 정해지므로 표시도 몸통 기준 (몸통 해제 시 머리 기준)
        const factionPart = equippedObjs.body && equippedObjs.body.id !== 'none' ? equippedObjs.body : equippedObjs.head;
        if (this.domFactionName && factionPart) {
            this.domFactionName.textContent = factionPart.faction || '합성괴인';
        }
    }
}
