/* ==========================================================================
   PROJECT: MAD OVERLORD // MONSTER RENDERER & ANIMATION CONTROLLER (v2)
   Delegates DOM styling and clear/render tasks to the Renderer module.
   ========================================================================== */

import { SpriteAnimator } from './spriteAnimator_v2.js';
import { renderer } from './renderer.js';

export class MonsterController {
    constructor(suffix = '-v2') {
        this.suffix = suffix;
        this.initDOM();
    }

    initDOM() {
        const s = this.suffix;
        // 인게임 도트(Pixel Art) 부위별 DOM 요소
        this.domMonster = document.getElementById(`player-monster${s}`);
        this.domHpFill = document.getElementById(`hp-player-monster${s}`);
        this.domViewport = document.getElementById(`battle-viewport${s}`);

        // 베이킹된 스프라이트 프레임 재생기 (walk/attack)
        const spriteCanvas = document.getElementById(`player-sprite-canvas${s}`);
        this.spriteAnimator = spriteCanvas ? new SpriteAnimator(spriteCanvas) : null;
        if (this.spriteAnimator) {
            this.spriteAnimator.play('walk');
        }

        // 메인 메뉴 캐릭터 프리뷰용 재생기 (idle 대기 모션)
        const menuCanvas = document.getElementById(`menu-sprite-canvas${s}`);
        this.menuAnimator = menuCanvas ? new SpriteAnimator(menuCanvas) : null;
        if (this.menuAnimator) {
            this.menuAnimator.play('idle');
        }

        this.pixelParts = {
            head: document.getElementById(`pixel-head${s}`),
            body: document.getElementById(`pixel-body${s}`),
            arm: document.getElementById(`pixel-arm${s}`),
            leg: document.getElementById(`pixel-leg${s}`)
        };

        // 메뉴 전용 Live2D 프리뷰 부위별 DOM 요소
        this.menuLive2dParts = {
            head: document.getElementById(`menu-prev-head${s}`),
            body: document.getElementById(`menu-prev-body${s}`),
            arm: document.getElementById(`menu-prev-arm${s}`),
            leg: document.getElementById(`menu-prev-leg${s}`)
        };

        // 연구소 키오스크 Live2D 프리뷰 부위별 DOM 요소
        this.labLive2dParts = {
            head: document.getElementById(`lab-prev-head${s}`),
            body: document.getElementById(`lab-prev-body${s}`),
            arm: document.getElementById(`lab-prev-arm${s}`),
            leg: document.getElementById(`lab-prev-leg${s}`)
        };

        this.currentState = null; // 'walking' | 'walking-forward' | 'attacking' | 'victory'
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
                renderer.applyStyle(this.pixelParts[slot], part.pixelStyle);
            }

            // 2. 메인 메뉴 Live2D 부위 스타일 적용
            if (this.menuLive2dParts[slot] && part.live2dStyle) {
                renderer.applyStyle(this.menuLive2dParts[slot], part.live2dStyle);
            }

            // 3. 연구소 키오스크 Live2D 부위 스타일 적용
            if (this.labLive2dParts[slot] && part.live2dStyle) {
                renderer.applyStyle(this.labLive2dParts[slot], part.live2dStyle);
            }

            // 4. 격리 렌더러의 페이퍼돌 레이어 실시간 스왑 연동 (changePart)
            if (slot === 'leg') {
                const isSprite = part.id === 'leg_mech_wheel';
                if (isSprite) {
                    renderer.changePart('leg', 'assets/sprites/parts/leg_track_mock.png', 'sprite', 4, 12);
                } else {
                    renderer.changePart('leg', 'assets/sprites/parts/leg_mock.png', 'pivot');
                }
            } else {
                renderer.changePart(slot, `assets/sprites/parts/${slot}_mock.png`, 'pivot');
            }
        }
    }

    // 몬스터 애니메이션 및 배경 패럴랙스 상태 제어
    setState(newState) {
        if (this.currentState === newState) return;
        this.currentState = newState;

        const s = this.suffix;
        const stateText = document.getElementById(`monster-state-text${s}`);
        const actionLog = document.getElementById(`battle-action-log${s}`);

        if (newState === 'walking') {
            if (this.spriteAnimator) this.spriteAnimator.play('walk');
            if (this.domMonster) {
                this.domMonster.classList.remove('attacking', 'victory');
                this.domMonster.classList.add('walking');
            }
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
            if (this.spriteAnimator) this.spriteAnimator.play('idle');
            if (this.domMonster) {
                this.domMonster.classList.remove('attacking', 'victory');
                this.domMonster.classList.add('walking');
            }
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
            if (this.spriteAnimator) this.spriteAnimator.play('attack');
            if (this.domMonster) {
                this.domMonster.classList.remove('walking', 'victory');
                this.domMonster.classList.add('attacking');
            }
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
            if (this.spriteAnimator) this.spriteAnimator.play('idle');
            if (this.domMonster) {
                this.domMonster.classList.remove('walking', 'attacking');
                this.domMonster.classList.add('victory');
            }
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

export const monsterControllerV2 = new MonsterController('-v2');
