/* ==========================================================================
   PROJECT: MAD OVERLORD // 설정 창 (v2)
   전체/효과음/배경음 음량, 음소거, 화면 흔들림. 값은 settings_v2.js에 바로 저장되어 즉시 적용.
   openSettings(): 화면 위에 창을 띄움 (전투 일시정지 메뉴, 메인 화면 톱니바퀴에서 연다)
   ========================================================================== */

import { icon } from './icons.js';
import { settings } from '../engine_v2/settings_v2.js';
import { sound } from '../engine_v2/audio/sound_v2.js';

const SLIDERS = [
    { key: 'master', label: '전체 음량', preview: 'ui_click' },
    { key: 'sfx', label: '효과음', preview: 'mech_missile_blast' },
    { key: 'bgm', label: '배경음', preview: null }
];
const TOGGLES = [
    { key: 'mute', label: '음소거', desc: '모든 소리 끄기' },
    { key: 'shake', label: '화면 흔들림', desc: '폭발·착지·타격 때 화면이 흔들림' }
];

export function openSettings() {
    if (document.querySelector('.v2-settings')) return;
    const el = document.createElement('div');
    el.className = 'v2-settings';
    el.innerHTML = `
        <div class="v2-settings__panel v2-panel" role="dialog" aria-label="설정">
            <div class="v2-hazard v2-settings__stripe"></div>
            <h2>${icon('gear', 22)} SETTINGS <small>설정</small></h2>
            <section>
                <h3>사운드</h3>
                ${SLIDERS.map(s => `
                    <label class="v2-settings__row">
                        <span>${s.label}</span>
                        <input type="range" min="0" max="100" step="5" data-key="${s.key}">
                        <output data-out="${s.key}"></output>
                    </label>`).join('')}
            </section>
            <section>
                <h3>화면 / 조작</h3>
                ${TOGGLES.map(t => `
                    <div class="v2-settings__row">
                        <span>${t.label}<small>${t.desc}</small></span>
                        <button class="v2-switch" data-toggle="${t.key}" role="switch"><i></i></button>
                    </div>`).join('')}
            </section>
            <div class="v2-settings__actions">
                <button class="v2-btn v2-btn--ghost" data-act="reset">기본값</button>
                <button class="v2-btn" data-act="close">닫기</button>
            </div>
        </div>`;
    document.body.appendChild(el);

    const render = () => {
        el.querySelectorAll('input[data-key]').forEach(inp => {
            const v = Math.round(settings.get(inp.dataset.key) * 100);
            inp.value = v;
            inp.style.setProperty('--val', `${v}%`);
            el.querySelector(`[data-out="${inp.dataset.key}"]`).textContent = v;
        });
        el.querySelectorAll('[data-toggle]').forEach(btn => {
            const on = !!settings.get(btn.dataset.toggle);
            btn.classList.toggle('is-on', on);
            btn.setAttribute('aria-checked', String(on));
        });
    };
    render();

    el.querySelectorAll('input[data-key]').forEach(inp => {
        inp.addEventListener('input', () => {
            settings.set(inp.dataset.key, Number(inp.value) / 100);
            render();
        });
        // 손을 떼면 그 소리 크기로 미리 들려줌
        inp.addEventListener('change', () => {
            const s = SLIDERS.find(x => x.key === inp.dataset.key);
            if (s && s.preview) sound.play(s.preview);
        });
    });
    el.querySelectorAll('[data-toggle]').forEach(btn => btn.addEventListener('click', () => {
        const key = btn.dataset.toggle;
        settings.set(key, !settings.get(key));
        sound.play('ui_toggle');
        render();
    }));

    const close = () => {
        sound.play('ui_click');
        el.classList.add('is-out');
        document.removeEventListener('keydown', onKey, true);
        setTimeout(() => el.remove(), 180);
    };
    const onKey = e => {
        if (e.key === 'Escape') {
            e.stopPropagation();
            e.preventDefault();
            close();
        }
    };
    document.addEventListener('keydown', onKey, true);
    el.querySelector('[data-act="close"]').addEventListener('click', close);
    el.querySelector('[data-act="reset"]').addEventListener('click', () => {
        settings.reset();
        sound.play('ui_toggle');
        render();
    });
    el.addEventListener('pointerdown', e => { if (e.target === el) close(); });
}
