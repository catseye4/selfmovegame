/* ==========================================================================
   PROJECT: MAD OVERLORD // MAIN ENGINE ROUTER & INITIALIZER
   ========================================================================== */

import { gameState } from './engine/state.js';
import { battleEngine } from './engine/battle.js';
import { MenuController } from './ui/menu.js';
import { LabController } from './ui/lab.js';

class GameRouter {
    constructor() {
        this.currentScreen = 'menu';
        
        // 라우터 바인딩된 화면 전환 함수
        const switchFn = (name) => this.switchScreen(name);
        
        this.menuController = new MenuController(switchFn);
        this.labController = new LabController(switchFn);

        this.init();
    }

    init() {
        // 전장 퇴각 버튼 이벤트
        const btnLeave = document.getElementById('btn-battle-leave');
        if (btnLeave) {
            btnLeave.addEventListener('click', () => {
                battleEngine.stopBattle();
                this.switchScreen('menu');
            });
        }

        // 특수 스킬 강제 발동 버튼 이벤트
        const btnSpecial = document.getElementById('btn-trigger-special');
        if (btnSpecial) {
            btnSpecial.addEventListener('click', () => {
                if (battleEngine.isActive && battleEngine.enemies.length > 0) {
                    battleEngine.showAnnouncement('SPECIAL SKILL OVERLOAD // 광역 스킬 방출!', 1500);
                    // 모든 적에게 대량 피해
                    battleEngine.enemies.forEach(e => {
                        battleEngine.dealDamageToEnemy(e, 500, true);
                    });
                    // 이펙트 화면 흔들림
                    const viewport = document.getElementById('battle-viewport');
                    if (viewport) {
                        viewport.style.transform = 'translate(10px, -10px)';
                        setTimeout(() => viewport.style.transform = 'none', 100);
                    }
                }
            });
        }

        // 게임 상태 변경 시 모든 UI 자동 동기화 구독
        gameState.subscribe(() => {
            this.menuController.updateDisplay();
            this.labController.updateMvvmFeedback();
            if (battleEngine.isActive) {
                battleEngine.updateHud();
            }
        });

        // 초기 화면 설정
        this.switchScreen('menu');
        console.log('🔥 PROJECT: MAD OVERLORD ENGINE ONLINE 🔥');
    }

    switchScreen(screenName) {
        if (this.currentScreen === 'battle' && screenName !== 'battle') {
            battleEngine.stopBattle();
        }

        const screens = document.querySelectorAll('.screen');
        screens.forEach(s => {
            s.classList.remove('active');
            s.style.opacity = '0';
        });

        const target = document.getElementById(`screen-${screenName}`);
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
            battleEngine.startBattle();
        }
    }
}

// DOM 로드 완료 시 코어 엔진 가동
window.addEventListener('DOMContentLoaded', () => {
    window.madOverlordGame = new GameRouter();
});
