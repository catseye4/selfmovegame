/* ==========================================================================
   PROJECT: MAD OVERLORD // MONSTER RENDERER & ANIMATION CONTROLLER
   ========================================================================== */

import { SpriteAnimator } from './spriteAnimator.js';

export class MonsterController {
    constructor() {
        // 인게임 도트(Pixel Art) 부위별 DOM 요소
        this.domMonster = document.getElementById('player-monster');
        this.domHpFill = document.getElementById('hp-player-monster');
        this.domViewport = document.getElementById('battle-viewport');

        // 베이킹된 스프라이트 프레임 재생기 (walk/attack)
        const spriteCanvas = document.getElementById('player-sprite-canvas');
        this.spriteAnimator = spriteCanvas ? new SpriteAnimator(spriteCanvas) : null;
        if (this.spriteAnimator) {
            this.spriteAnimator.play('walk'); // HTML 기본 클래스(walking)와 동일한 초기 상태
        }

        // 메인 메뉴 캐릭터 프리뷰용 재생기 (idle 대기 모션, 인게임과 동일한 스프라이트)
        const menuCanvas = document.getElementById('menu-sprite-canvas');
        this.menuAnimator = menuCanvas ? new SpriteAnimator(menuCanvas) : null;
        if (this.menuAnimator) {
            this.menuAnimator.play('idle');
        }

        this.pixelParts = {
            head: document.getElementById('pixel-head'),
            body: document.getElementById('pixel-body'),
            arm: document.getElementById('pixel-arm'),
            leg: document.getElementById('pixel-leg')
        };

        // 메뉴 전용 Live2D 프리뷰 부위별 DOM 요소
        this.menuLive2dParts = {
            head: document.getElementById('menu-prev-head'),
            body: document.getElementById('menu-prev-body'),
            arm: document.getElementById('menu-prev-arm'),
            leg: document.getElementById('menu-prev-leg')
        };

        // 연구소 키오스크 Live2D 프리뷰 부위별 DOM 요소
        this.labLive2dParts = {
            head: document.getElementById('lab-prev-head'),
            body: document.getElementById('lab-prev-body'),
            arm: document.getElementById('lab-prev-arm'),
            leg: document.getElementById('lab-prev-leg')
        };

        // null로 시작해야 전투 시작 시 첫 setState('walking') 호출이 실제로 실행된다.
        // (초기값을 'walking'으로 두면 동일값 가드에 걸려 domViewport에 walking 클래스가 안 붙어 배경 스크롤이 멈춰있었음)
        this.currentState = null; // 'walking' | 'walking-forward' | 'attacking' | 'victory'
    }

    // 스타일 맵 적용 Helper
    applyStyles(el, styleObj) {
        if (!el || !styleObj) return;
        for (const prop in styleObj) {
            el.style[prop] = styleObj[prop];
        }
    }

    // 캐릭터 DOM 좌표 직접 제어 (거점 출현 시 앞으로 전진)
    setMonsterPosition(x) {
        if (this.domMonster) {
            this.domMonster.style.left = `${x}px`;
        }
    }

    // 부위별 파츠 데이터로 모든 렌더링 화면(도트 전장 + Live2D 메뉴/연구소) 업데이트
    renderVisuals(partsObj) {
        for (const slot in partsObj) {
            const part = partsObj[slot];
            if (!part) continue;

            // 1. 인게임 도트(Pixel Art) 전장 부위 스타일 적용
            if (this.pixelParts[slot] && part.pixelStyle) {
                this.applyStyles(this.pixelParts[slot], part.pixelStyle);
            }

            // 2. 메인 메뉴 Live2D 부위 스타일 적용
            if (this.menuLive2dParts[slot] && part.live2dStyle) {
                this.applyStyles(this.menuLive2dParts[slot], part.live2dStyle);
            }

            // 3. 연구소 키오스크 Live2D 부위 스타일 적용
            if (this.labLive2dParts[slot] && part.live2dStyle) {
                this.applyStyles(this.labLive2dParts[slot], part.live2dStyle);
            }
        }
    }

    // 몬스터 애니메이션 및 배경 패럴랙스 상태 제어
    setState(newState) {
        if (this.currentState === newState) return;
        this.currentState = newState;

        const stateText = document.getElementById('monster-state-text');
        const actionLog = document.getElementById('battle-action-log');

        if (newState === 'walking') {
            // [일반 진격]: 배경 스크롤 작동 + 캐릭터 제자리 걷기 모션
            if (this.spriteAnimator) this.spriteAnimator.play('walk');
            this.domMonster.classList.remove('attacking', 'victory');
            this.domMonster.classList.add('walking');
            if (this.domViewport) {
                this.domViewport.classList.remove('attacking', 'walking-forward', 'victory');
                this.domViewport.classList.add('walking');
            }
            if (stateText) {
                stateText.textContent = '진격 중 (WALKING)';
                stateText.className = 'text-neon-green';
            }
            if (actionLog) {
                actionLog.textContent = '사정거리 내 적을 탐색하며 배경을 가로질러 전진합니다.';
            }
        } else if (newState === 'walking-forward') {
            // [거점 향해 전진]: 배경 스크롤이 멈춰 화면 자체는 정지 상태이므로 idle 연출
            // (캐릭터 좌표만 CSS transition으로 서서히 이동)
            if (this.spriteAnimator) this.spriteAnimator.play('idle');
            this.domMonster.classList.remove('attacking', 'victory');
            this.domMonster.classList.add('walking');
            if (this.domViewport) {
                this.domViewport.classList.remove('walking', 'attacking', 'victory');
                this.domViewport.classList.add('walking-forward');
            }
            if (stateText) {
                stateText.textContent = '거점 접근 중 (ADVANCING)';
                stateText.className = 'text-neon-green';
            }
            if (actionLog) {
                actionLog.textContent = '적 거점이 포착되었습니다! 배경을 멈추고 사거리까지 캐릭터가 직접 돌격합니다.';
            }
        } else if (newState === 'attacking') {
            // [교전]: 배경 스크롤 정지 + 캐릭터 이동 정지 및 공격 모션
            if (this.spriteAnimator) this.spriteAnimator.play('attack');
            this.domMonster.classList.remove('walking', 'victory');
            this.domMonster.classList.add('attacking');
            if (this.domViewport) {
                this.domViewport.classList.remove('walking', 'walking-forward', 'victory');
                this.domViewport.classList.add('attacking');
            }
            if (stateText) {
                stateText.textContent = '교전 중 (ATTACKING)';
                stateText.className = 'text-neon-purple';
            }
            if (actionLog) {
                actionLog.textContent = '전진 및 배경 이동을 멈추고 화력을 집중하여 적을 공격합니다!';
            }
        } else if (newState === 'victory') {
            // [승리 포즈]: 전용 승리 모션 프레임은 없어 idle(대기) 루프를 재생하면서
            // CSS 트랜스폼(victory-squat-bounce 등)으로 만세 모션을 얹어 연출한다.
            if (this.spriteAnimator) this.spriteAnimator.play('idle');
            this.domMonster.classList.remove('walking', 'attacking');
            this.domMonster.classList.add('victory');
            if (this.domViewport) {
                this.domViewport.classList.remove('walking', 'walking-forward', 'attacking');
                this.domViewport.classList.add('victory');
            }
            if (stateText) {
                stateText.textContent = '★★ 승리 포즈 (VICTORY HURRAH) ★★';
                stateText.style.color = '#ffcc00';
            }
            if (actionLog) {
                actionLog.textContent = '최종 핵심 기지 분쇄! 오버로드가 정면을 바라보며 만세 스쿼트 포효를 터뜨립니다!';
            }
        }
    }

    // 공격 애니메이션이 실제 타격 프레임 구간(20~23번째 프레임)에 들어와 있는지 확인
    isAttackImpactFrame() {
        if (!this.spriteAnimator) return false;
        return this.spriteAnimator.currentName === 'attack'
            && this.spriteAnimator.frameIndex >= 20
            && this.spriteAnimator.frameIndex <= 23;
    }

    // 체력바 업데이트
    updateHpBar(currentHp, maxHp) {
        if (!this.domHpFill) return;
        const pct = Math.max(0, Math.min(100, (currentHp / maxHp) * 100));
        this.domHpFill.style.width = `${pct}%`;
        
        if (pct < 30) {
            this.domHpFill.style.background = '#ff0055';
        } else if (pct < 60) {
            this.domHpFill.style.background = '#ffcc00';
        } else {
            this.domHpFill.style.background = '#00ff66';
        }
    }
}

export const monsterController = new MonsterController();
