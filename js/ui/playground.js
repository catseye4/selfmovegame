import { PARTS_DB } from '../data/parts.js';
import { SpriteAnimator } from '../engine_v2/spriteAnimator_v2.js';
import { renderer } from '../engine_v2/renderer.js';
import { RobotPartsStructure } from '../engine_v2/robotStructure.js';

window.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('playground-canvas');
    if (!canvas) return;

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
    const statsFeedback = document.getElementById('stats-feedback');

    // 각 파츠 드롭다운 채우기
    for (const slot in PARTS_DB) {
        if (!selectors[slot]) continue;
        const parts = PARTS_DB[slot];
        parts.forEach(part => {
            const opt = document.createElement('option');
            opt.value = part.id;
            opt.textContent = `${part.name} (${part.faction})`;
            selectors[slot].appendChild(opt);
        });

        // 초기 선택
        selectors[slot].value = parts[0]?.id || '';
    }

    // 선택된 파츠들 스탯 계산 및 렌더링 스타일 연동 함수
    function updateSelectedParts() {
        let totalHp = 0;
        let totalDps = 0;
        let totalRange = 0;
        let totalSpeed = 0;

        for (const slot in selectors) {
            const partId = selectors[slot].value;
            const part = PARTS_DB[slot].find(p => p.id === partId);
            if (part) {
                totalHp += part.stats.hp || 0;
                totalDps += part.stats.dps || 0;
                totalRange += part.stats.range || 0;
                totalSpeed += part.stats.speed || 0;

                const partSrc = part.src || `assets/sprites/parts/${slot}_mock.png`;
                const animType = (slot === 'leg' && selectLegAnimType.value === 'sprite') ? 'sprite' : (part.animType || 'pivot');

                // 렌더러를 경유한 속성 스타일 매핑 검증
                if (slot === 'head') {
                    canvas.style.borderColor = part.pixelStyle?.borderColor || '#00ffcc';
                    canvas.style.boxShadow = part.pixelStyle?.boxShadow || 'none';
                    robotParts.setHead({
                        id: part.id,
                        name: part.name,
                        src: partSrc,
                        animType: animType
                    });
                    renderer.changePart('head', partSrc, animType);
                } else if (slot === 'body') {
                    robotParts.setBody({
                        id: part.id,
                        name: part.name,
                        src: partSrc,
                        animType: animType
                    });
                    renderer.changePart('body', partSrc, animType, 1, 10, part.id);
                } else if (slot === 'arm') {
                    // 팔(arm) 파츠 교체 시 오른쪽/왼쪽 이미지가 세트로 동시 변경됨!
                    const rSrc = part.rightSrc || partSrc;
                    const lSrc = part.leftSrc || partSrc;
                    robotParts.setArmSet({
                        id: part.id,
                        name: part.name,
                        animType: animType,
                        right: { src: rSrc },
                        left:  { src: lSrc }
                    });
                    renderer.changePart('arm', { right: rSrc, left: lSrc }, animType);
                } else if (slot === 'leg') {
                    // 다리(leg) 파츠 교체 시 오른쪽/왼쪽 이미지가 세트로 동시 변경됨!
                    const legSrc = animType === 'sprite' ? 'assets/sprites/parts/leg_track_mock.png' : partSrc;
                    const rSrc = part.rightSrc || legSrc;
                    const lSrc = part.leftSrc || legSrc;
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

        // 렌더러에 구조체 적용 (팔/다리는 양쪽 세트로 일괄 바인딩)
        renderer.setRobotStructure(robotParts);

        // 스탯 피드백 출력
        if (statsFeedback) {
            statsFeedback.innerHTML = `
                <strong>종합 체력 (HP)</strong>: ${totalHp.toLocaleString()}<br>
                <strong>초당 공격력 (DPS)</strong>: ${totalDps.toLocaleString()}<br>
                <strong>사정거리 (Range)</strong>: ${totalRange}px<br>
                <strong>이동속도 (Speed)</strong>: ${totalSpeed}
            `;
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
            console.log(`Renderer mode changed to: ${animator.mode}`);
        });
    }

    // 다리 궤도 타입 스위치 연동
    if (selectLegAnimType) {
        selectLegAnimType.addEventListener('change', () => {
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
            animator.play(anim);
        });
    });

    // 초기값 호출
    updateSelectedParts();
});
