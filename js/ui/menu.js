/* ==========================================================================
   PROJECT: MAD OVERLORD // MAIN MENU CONTROLLER (PORTRAIT KIOSK)
   ========================================================================== */

import { gameState } from '../engine/state.js';
import { monsterController } from '../engine/monster.js';

export class MenuController {
    constructor(switchScreenFn) {
        this.switchScreen = switchScreenFn;
        this.domDmCount = document.getElementById('menu-dm-count');
        this.domFactionName = document.getElementById('menu-faction-name');

        this.initEvents();
    }

    initEvents() {
        const btnLab = document.getElementById('btn-to-lab');
        const btnBattle = document.getElementById('btn-to-battle');

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
        monsterController.renderVisuals(equippedObjs);

        if (this.domFactionName && equippedObjs.head) {
            this.domFactionName.textContent = equippedObjs.head.faction || '합성괴인';
        }
    }
}
