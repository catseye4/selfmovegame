/* ==========================================================================
   PROJECT: MAD OVERLORD // PLAYGROUND UI CONTROLLER (v2)
   Includes [파츠제거] support, Wireframe fallback mode, Real-time Debug Log Console,
   Single-slot event logging, Red Error highlighting, and 3-step laser attack sequence.
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

    // 렌더러 이미지 자산 로드 실패 (HTTP 404 / 403 / 파일 미존재 등) 실시간 에러 로깅 바인딩 (붉은색 강조)
    renderer.onAssetError = (layerKey, src) => {
        addLog(`[자산 로드 오류 ❌] Layer: <strong>${layerKey.toUpperCase()}</strong> -> 이미지 파일이 존재하지 않거나 로드에 실패했습니다! (Path: ${src})`, "error");
    };

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
    const selectMonsterType = document.getElementById('select-monster-type');

    let currentMonsterPreset = 'red_robot';

    // 몬스터/기체 팩션 필터링 기반 드롭다운 파츠 채우기 함수
    function populatePartSelectors(targetFaction = '거대로봇 (메카닉)') {
        for (const slot in PARTS_DB) {
            if (!selectors[slot]) continue;
            const selector = selectors[slot];
            const prevValue = selector.value;
            selector.innerHTML = '';

            const allParts = PARTS_DB[slot];
            // [파츠제거] ('none') 또는 targetFaction과 일치하는 파츠만 필터링!
            const filteredParts = allParts.filter(p => p.id === 'none' || p.faction === targetFaction);

            filteredParts.forEach(part => {
                const opt = document.createElement('option');
                opt.value = part.id;
                opt.textContent = part.id === 'none' ? part.name : `${part.name} (${part.faction})`;
                selector.appendChild(opt);
            });

            // 1번 인덱스 기본 파츠 또는 이전 선택값 유지
            if (filteredParts.some(p => p.id === prevValue)) {
                selector.value = prevValue;
            } else {
                selector.value = filteredParts[1]?.id || filteredParts[0]?.id || 'none';
            }
        }
    }

    // 몬스터/기체 선택 드롭다운 이벤트 (거대괴수 & 타락영웅 선택 시 뼈대 미존재 에러 표출 및 선택 취소 원복)
    if (selectMonsterType) {
        selectMonsterType.addEventListener('change', (e) => {
            const selectedVal = e.target.value;
            if (selectedVal === 'kaiju' || selectedVal === 'corrupted_hero') {
                const presetName = selectedVal === 'kaiju' ? '거대괴수 (바이오)' : '타락영웅 (다크엔젤)';
                addLog(`[몬스터 선택 오류 ❌] <strong>${presetName}</strong>의 뼈대(Skeleton) 및 마운트 앵커(Anchor DB) 데이터가 존재하지 않습니다! (선택 취소됨)`, "error");
                selectMonsterType.value = currentMonsterPreset; // 이전 선택값으로 원복!
            } else {
                currentMonsterPreset = selectedVal;
                addLog(`[몬스터 선택] Preset Loaded -> <strong>거대로봇 (메카닉)</strong>`, "success");
                populatePartSelectors('거대로봇 (메카닉)');
                updateSelectedParts(null);
            }
        });
    }

    // 초기 파츠 드롭다운 채우기 (거대로봇 계통 파츠만 채움)
    populatePartSelectors('거대로봇 (메카닉)');

    // 선택된 파츠들 스탯 계산 및 렌더링 스타일 연동 함수 (changedSlot이 지정되면 오직 해당 변경 파츠의 로그만 단독 출력!)
    function updateSelectedParts(changedSlot = null) {
        for (const slot in selectors) {
            const partId = selectors[slot].value;
            const part = PARTS_DB[slot].find(p => p.id === partId);
            const shouldLog = (changedSlot === null || changedSlot === slot);

            if (part) {
                if (partId === 'none') {
                    if (shouldLog) {
                        addLog(`[파츠 해제] Slot: <strong>${slot.toUpperCase()}</strong> -> 이미지 해제 (뼈대 와이어프레임 렌더링)`, "warn");
                    }
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
                    const rSrc = part.rightSrc || partSrc;
                    const lSrc = part.leftSrc || partSrc;

                    // 연결된 이미지 파일 경로(src) 부재 체크 (오류 시 붉은색 강조)
                    if (!partSrc && !rSrc && !lSrc) {
                        addLog(`[파츠 바인딩 오류 ⚠️] Slot: <strong>${slot.toUpperCase()}</strong> | ID: <strong>${part.id}</strong> (${part.name}) -> 연결된 이미지 파일 경로(src)가 없습니다!`, "error");
                    }

                    const animType = part.animType || 'pivot';

                    if (slot === 'head') {
                        if (shouldLog) {
                            addLog(`[파츠 선택] Head -> <strong>${part.name}</strong> (${part.id}) | Src: ${partSrc}`, "info");
                        }
                        canvas.style.borderColor = part.pixelStyle?.borderColor || '#00ffcc';
                        canvas.style.boxShadow = part.pixelStyle?.boxShadow || 'none';
                        robotParts.setHead({ id: part.id, name: part.name, src: partSrc, animType: animType });
                        renderer.changePart('head', partSrc, animType);
                    } else if (slot === 'body') {
                        if (shouldLog) {
                            addLog(`[파츠 선택] Body -> <strong>${part.name}</strong> (${part.id}) | Src: ${partSrc}`, "info");
                        }
                        robotParts.setBody({ id: part.id, name: part.name, src: partSrc, animType: animType });
                        renderer.changePart('body', partSrc, animType, 1, 10, part.id);
                    } else if (slot === 'arm') {
                        const rPivot = part.rightPivot || null;
                        const lPivot = part.leftPivot || null;
                        if (shouldLog) {
                            addLog(`[파츠 선택] Arm -> <strong>${part.name}</strong> (${part.id}) | Right: ${rSrc} | Left: ${lSrc}`, "success");
                        }
                        robotParts.setArmSet({
                            id: part.id,
                            name: part.name,
                            animType: animType,
                            right: { src: rSrc, pivot: rPivot },
                            left:  { src: lSrc, pivot: lPivot }
                        });
                        renderer.changePart('arm', { right: rSrc, left: lSrc }, animType, 1, 10, null, { right: rPivot, left: lPivot });
                    } else if (slot === 'leg') {
                        const finalRSrc = part.rightSrc || partSrc;
                        const finalLSrc = part.leftSrc || partSrc;
                        if (shouldLog) {
                            addLog(`[파츠 선택] Leg -> <strong>${part.name}</strong> (${part.id}) | AnimType: ${animType} | Src: ${finalRSrc}`, "info");
                        }
                        robotParts.setLegSet({
                            id: part.id,
                            name: part.name,
                            animType: animType,
                            right: { src: finalRSrc },
                            left:  { src: finalLSrc }
                        });
                        renderer.changePart('leg', { right: finalRSrc, left: finalLSrc }, animType);
                    }
                }
            }
        }

        // 렌더러에 구조체 적용 (팔/다리는 양쪽 세트로 일괄 바인딩)
        renderer.setRobotStructure(robotParts);

        // 파츠 변경 즉시 캔버스 동기식 1회 재드로잉
        if (animator.mode === 'paperdoll') {
            const timeSec = animator.elapsedMs / 1000;
            renderer.clear(canvas);
            renderer.drawPaperDoll(canvas, 165, 124, animator.currentName || 'idle', timeSec);
        }
    }

    // 드롭다운 변경 리스너 (변경 시 오직 해당 slot 전용 로그만 단독 출력!)
    for (const slot in selectors) {
        selectors[slot].addEventListener('change', () => {
            updateSelectedParts(slot);
        });
    }

    // 엔진 모드 스위치 연동
    if (selectEngineMode) {
        selectEngineMode.addEventListener('change', (e) => {
            animator.mode = e.target.value;
            addLog(`[엔진 모드 변경] Render Mode: <strong>${animator.mode.toUpperCase()}</strong>`, "warn");
            updateSelectedParts(null);
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
                updateSelectedParts(null);
            } else {
                animator.play(anim);
                addLog(`[애니메이션 트리거] Trigger: <strong>${anim.toUpperCase()}</strong>`, "success");
            }
        });
    });

    // 초기 실행 갱신 (전체 파츠 로깅 안 함)
    updateSelectedParts(null);
});
