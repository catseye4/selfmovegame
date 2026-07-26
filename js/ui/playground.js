/* ==========================================================================
   PROJECT: MAD OVERLORD // PLAYGROUND UI CONTROLLER (v2)
   Includes [파츠제거] support, Wireframe fallback mode, Real-time Debug Log Console,
   Synchronous immediate canvas redrawing on part change, and STOP motion handling.
   ========================================================================== */

import { PARTS_DB } from '../data/parts.js';
import { SpriteAnimator } from '../engine_v2/spriteAnimator_v2.js';
import { renderer } from '../engine_v2/renderer.js';
import { RobotPartsStructure } from '../engine_v2/robotStructure.js';

window.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('playground-canvas');
    const logConsole = document.getElementById('debug-log-console');
    const btnClearLog = document.getElementById('btn-clear-log');
    if (!canvas) return;

    // 디버그 로그 출력 헬퍼 함수
    function addLog(msg, level = 'info') {
        if (!logConsole) return;
        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
        
        const div = document.createElement('div');
        div.className = `log-entry ${level}`;
        div.innerHTML = `<span style="color:#666;">[${timeStr}]</span> ${msg}`;
        logConsole.appendChild(div);
        logConsole.scrollTop = logConsole.scrollHeight;

        console.log(`[Playground Log] [${level}] ${msg}`);
    }

    if (btnClearLog) {
        btnClearLog.addEventListener('click', () => {
            if (logConsole) logConsole.innerHTML = '';
        });
    }

    addLog("=== PARTS PLAYGROUND DEBUGGER STARTED ===", "success");
    addLog("Decoupled Renderer v2 & Anchor System Initialized", "info");

    // 로봇 파츠 데이터 구조체 인스턴스 생성
    const robotParts = new RobotPartsStructure();

    // SpriteAnimator 및 Renderer 초기화 (기본 모드: paperdoll)
    const animator = new SpriteAnimator(canvas);
    animator.mode = 'paperdoll';
    animator.play('idle');

    // UI 요소
    const selectors = {
        head: document.getElementById('select-head'),
        body: document.getElementById('select-body'),
        arm: document.getElementById('select-arm'),
        leg: document.getElementById('select-leg')
    };

    const selectEngineMode = document.getElementById('select-engine-mode');
    const selectLegAnimType = document.getElementById('select-leg-anim-type');

    // 각 파츠 드롭다운 채우기 (0번: [파츠제거], 초기 기본 선택: 1번 인덱스 기본 메카 파츠)
    for (const slot in PARTS_DB) {
        if (!selectors[slot]) continue;
        const parts = PARTS_DB[slot];
        parts.forEach(part => {
            const opt = document.createElement('option');
            opt.value = part.id;
            opt.textContent = `${part.name} (${part.faction})`;
            selectors[slot].appendChild(opt);
        });

        // 초기 기본 선택: 1번 인덱스 (기본 메카 파츠)
        selectors[slot].value = parts[1]?.id || parts[0]?.id || 'none';
    }

    // 선택된 파츠들 스탯 계산 및 렌더링 스타일 연동 함수
    function updateSelectedParts() {
        for (const slot in selectors) {
            const partId = selectors[slot].value;
            const part = PARTS_DB[slot].find(p => p.id === partId);

            if (part) {
                if (partId === 'none') {
                    addLog(`[파츠 해제] Slot: <strong>${slot.toUpperCase()}</strong> -> 이미지 해제 (뼈대 와이어프레임 렌더링)`, "warn");
                    if (slot === 'head') {
                        robotParts.setHead({ id: 'none', name: '[파츠제거]', src: '', animType: 'pivot' });
                        renderer.changePart('head', '', 'pivot');
                    } else if (slot === 'body') {
                        robotParts.setBody({ id: 'none', name: '[파츠제거]', src: '', animType: 'pivot' });
                        renderer.changePart('body', '', 'pivot');
                    } else if (slot === 'arm') {
                        robotParts.setArmSet({ id: 'none', name: '[파츠제거]', animType: 'pivot', right: { src: '' }, left: { src: '' } });
                        renderer.changePart('arm', { right: '', left: '' }, 'pivot');
                    } else if (slot === 'leg') {
                        robotParts.setLegSet({ id: 'none', name: '[파츠제거]', animType: 'pivot', right: { src: '' }, left: { src: '' } });
                        renderer.changePart('leg', { right: '', left: '' }, 'pivot');
                    }
                } else {
                    const partSrc = part.src || '';
                    const animType = (slot === 'leg' && selectLegAnimType.value === 'sprite') ? 'sprite' : (part.animType || 'pivot');

                    if (slot === 'head') {
                        addLog(`[파츠 선택] Head -> <strong>${part.name}</strong> (${part.id}) | Src: ${partSrc}`, "info");
                        canvas.style.borderColor = part.pixelStyle?.borderColor || '#00ffcc';
                        canvas.style.boxShadow = part.pixelStyle?.boxShadow || 'none';
                        robotParts.setHead({ id: part.id, name: part.name, src: partSrc, animType: animType });
                        renderer.changePart('head', partSrc, animType);
                    } else if (slot === 'body') {
                        addLog(`[파츠 선택] Body -> <strong>${part.name}</strong> (${part.id}) | Src: ${partSrc}`, "info");
                        robotParts.setBody({ id: part.id, name: part.name, src: partSrc, animType: animType });
                        robotParts.setBody({ id: part.id, name: part.name, src: partSrc, animType: animType });
                        renderer.changePart('body', partSrc, animType, 1, 10, part.id);
                    } else if (slot === 'arm') {
                        const rSrc = part.rightSrc || partSrc;
                        const lSrc = part.leftSrc || partSrc;
                        const rPivot = part.rightPivot || null;
                        const lPivot = part.leftPivot || null;
                        addLog(`[파츠 선택] Arm -> <strong>${part.name}</strong> (${part.id}) | Right: ${rSrc} | Left: ${lSrc}`, "success");
                        robotParts.setArmSet({
                            id: part.id,
                            name: part.name,
                            animType: animType,
                            right: { src: rSrc, pivot: rPivot },
                            left:  { src: lSrc, pivot: lPivot }
                        });
                        renderer.changePart('arm', { right: rSrc, left: lSrc }, animType, 1, 10, null, { right: rPivot, left: lPivot });
                    } else if (slot === 'leg') {
                        const legSrc = animType === 'sprite' ? 'assets/sprites/parts/leg_track_mock.png' : partSrc;
                        const rSrc = part.rightSrc || legSrc;
                        const lSrc = part.leftSrc || legSrc;
                        addLog(`[파츠 선택] Leg -> <strong>${part.name}</strong> (${part.id}) | AnimType: ${animType} | Src: ${rSrc}`, "info");
                        robotParts.setLegSet({
                            id: part.id,
                            name: part.name,
                            animType: animType,
                            right: { src: rSrc },
                            left:  { src: lSrc }
                        });
                        renderer.changePart('leg', { right: rSrc, left: lSrc }, animType);
                    }
                }
            }
        }

        // 렌더러에 구조체 적용 (팔/다리는 양쪽 세트로 일괄 바인딩)
        renderer.setRobotStructure(robotParts);

        // 파츠 변경 즉시 애니메이션 재생/정지 상태와 무관하게 캔버스를 동기식 1회 재드로잉 (즉각 반응 100%)
        if (animator.mode === 'paperdoll') {
            const timeSec = animator.elapsedMs / 1000;
            renderer.clear(canvas);
            renderer.drawPaperDoll(canvas, 165, 124, animator.currentName || 'idle', timeSec);
        }
    }

    // 드롭다운 변경 리스너
    for (const slot in selectors) {
        selectors[slot].addEventListener('change', updateSelectedParts);
    }

    // 엔진 모드 스위치 연동
    if (selectEngineMode) {
        selectEngineMode.addEventListener('change', (e) => {
            animator.mode = e.target.value;
            addLog(`[엔진 모드 변경] Render Mode: <strong>${animator.mode.toUpperCase()}</strong>`, "warn");
            updateSelectedParts();
        });
    }

    // 다리 궤도 타입 스위치 연동
    if (selectLegAnimType) {
        selectLegAnimType.addEventListener('change', (e) => {
            addLog(`[다리 메커니즘 변경] Leg Anim Type: <strong>${e.target.value.toUpperCase()}</strong>`, "info");
            updateSelectedParts();
        });
    }

    // 애니메이션 트리거 버튼 연동
    const animBtns = document.querySelectorAll('.btn-test');
    animBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            animBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const anim = btn.dataset.anim;
            if (anim === 'stop') {
                animator.pause();
                addLog(`[애니메이션 멈춤] Motion Engine Paused`, "warn");
                updateSelectedParts();
            } else {
                animator.play(anim);
                addLog(`[애니메이션 트리거] Trigger: <strong>${anim.toUpperCase()}</strong>`, "success");
            }
        });
    });

    // 초기 실행 갱신
    updateSelectedParts();
});
