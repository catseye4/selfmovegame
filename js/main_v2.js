/* ==========================================================================
   PROJECT: MAD OVERLORD // MAIN ENGINE ROUTER & INITIALIZER (v2)
   ========================================================================== */

import { gameState } from './engine/state.js';
import { battleEngineV2 } from './engine_v2/battle_v2.js';
import { MenuController } from './ui_v2/menu_v2.js';
import { LabController } from './ui_v2/lab_v2.js';

class GameRouterV2 {
    constructor() {
        this.currentScreen = 'menu';
        
        // 라우터 바인딩된 화면 전환 함수 (v2)
        const switchFn = (name) => this.switchScreen(name);
        
        this.menuController = new MenuController(switchFn);
        this.labController = new LabController(switchFn);

        this.init();
    }

    init() {
        // 전장 퇴각 버튼 이벤트 (v2)
        const btnLeave = document.getElementById('btn-battle-leave-v2');
        if (btnLeave) {
            btnLeave.addEventListener('click', () => {
                battleEngineV2.stopBattle();
                this.switchScreen('menu');
            });
        }

        // 특수 스킬 강제 발동 버튼 이벤트 (v2)
        const btnSpecial = document.getElementById('btn-trigger-special-v2');
        if (btnSpecial) {
            btnSpecial.addEventListener('click', () => {
                if (battleEngineV2.isActive && battleEngineV2.enemies.length > 0) {
                    battleEngineV2.showAnnouncement('SPECIAL SKILL OVERLOAD // 광역 스킬 방출!', 1500);
                    // 모든 적에게 대량 피해
                    battleEngineV2.enemies.forEach(e => {
                        battleEngineV2.dealDamageToEnemy(e, 500, true);
                    });
                    // 이펙트 화면 흔들림
                    const viewport = document.getElementById('battle-viewport-v2');
                    if (viewport) {
                        viewport.style.transform = 'translate(10px, -10px)';
                        setTimeout(() => viewport.style.transform = 'none', 100);
                    }
                }
            });
        }

        // 게임 상태 변경 시 모든 UI 자동 동기화 구독
        gameState.subscribe(() => {
            if (window.madOverlordGameMode !== 'v2') return;
            this.menuController.updateDisplay();
            this.labController.updateMvvmFeedback();
            if (battleEngineV2.isActive) {
                battleEngineV2.updateHud();
            }
        });

        // 초기 화면 설정
        this.switchScreen('menu');
        console.log('🔥 PROJECT: MAD OVERLORD ENGINE V2 ONLINE 🔥');
    }

    switchScreen(screenName) {
        if (this.currentScreen === 'battle' && screenName !== 'battle') {
            battleEngineV2.stopBattle();
        }

        const screens = document.querySelectorAll('.screen-v2');
        screens.forEach(s => {
            s.classList.remove('active');
            s.style.opacity = '0';
        });

        const target = document.getElementById(`screen-${screenName}-v2`);
        if (target) {
            target.classList.add('active');
            setTimeout(() => {
                target.style.opacity = '1';
            }, 50);
        }

        this.currentScreen = screenName;
        gameState.currentScreen = screenName;

        // 화면 전환 시 각 화면별 데이터 리프레시
        if (screenName === 'menu') {
            this.menuController.updateDisplay();
        } else if (screenName === 'lab') {
            this.labController.renderPartsGrid();
            this.labController.updateMvvmFeedback();
        } else if (screenName === 'battle') {
            battleEngineV2.startBattle();
        }
    }
}

export function initGameRouterV2() {
    window.madOverlordGameV2 = new GameRouterV2();
}
