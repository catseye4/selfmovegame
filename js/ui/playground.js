import { PARTS_DB } from '../data/parts.js';
import { SpriteAnimator } from '../engine_v2/spriteAnimator_v2.js';
import { renderer } from '../engine_v2/renderer.js';

window.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('playground-canvas');
    if (!canvas) return;

    // SpriteAnimator 및 Renderer 초기화
    const animator = new SpriteAnimator(canvas);
    animator.play('idle');

    // UI 요소
    const selectors = {
        head: document.getElementById('select-head'),
        body: document.getElementById('select-body'),
        arm: document.getElementById('select-arm'),
        leg: document.getElementById('select-leg')
    };

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

                // 렌더러를 경유한 속성 스타일 매핑 검증
                if (slot === 'head') {
                    canvas.style.borderColor = part.pixelStyle.borderColor || '#00ffcc';
                    canvas.style.boxShadow = part.pixelStyle.boxShadow || 'none';
                }
            }
        }

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
