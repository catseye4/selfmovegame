/* ==========================================================================
   PROJECT: MAD OVERLORD // 게임 설정 (v2)
   음량(전체/효과음/배경음), 음소거, 화면 흔들림. 브라우저(localStorage)에 저장해 다음 실행에도 유지.
   settings.get(key) / settings.set(key, value) / settings.subscribe(fn)
   ========================================================================== */

const KEY = 'mo_v2_settings';
export const DEFAULT_SETTINGS = { master: 0.8, sfx: 0.9, bgm: 0.5, mute: false, shake: true };

function load() {
    try {
        const raw = JSON.parse(localStorage.getItem(KEY) || '{}');
        return { ...DEFAULT_SETTINGS, ...raw };
    } catch (e) {
        return { ...DEFAULT_SETTINGS };
    }
}

export const settings = {
    values: load(),
    listeners: new Set(),

    get(key) {
        return this.values[key];
    },

    set(key, value) {
        if (this.values[key] === value) return;
        this.values[key] = value;
        try { localStorage.setItem(KEY, JSON.stringify(this.values)); } catch (e) { /* 저장 불가(사생활 보호 모드 등) — 이번 실행에서만 적용 */ }
        this.listeners.forEach(fn => fn(key, value));
    },

    reset() {
        Object.entries(DEFAULT_SETTINGS).forEach(([k, v]) => this.set(k, v));
    },

    /** fn(key, value). 해제 함수 반환 */
    subscribe(fn) {
        this.listeners.add(fn);
        return () => this.listeners.delete(fn);
    }
};
