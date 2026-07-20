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

        if (this.domFactionName && equippedObjs.head) {
            this.domFactionName.textContent = equippedObjs.head.faction || '합성괴인';
        }
    }
}
