/* ==========================================================================
   PROJECT: MAD OVERLORD // 진행 저장 · 파츠 소유 · 파츠 강화 · 스테이지 기록 (v2)
   구버전과 같이 쓰는 gameState(js/engine/state.js)는 고치지 않는다.
   v2가 시작할 때 저장된 값을 gameState에 채워 넣고, gameState 변경을 구독해 다시 저장한다.

   저장 (localStorage 'mo_v2_save'):
     dm        다크 매터
     equipped  장착 파츠 { head, body, arm, leg }
     owned     보유 파츠 id 목록 (가격 0인 파츠와 [파츠제거]는 처음부터 보유)
     levels    파츠 강화 레벨 { id: 1~5 }  (결정 D-015)
     stages    스테이지 기록 { '1-1': { stars: [요새, 기지, 체력50%], cleared, bestTime } }  (D-016)
   ========================================================================== */

import { gameState } from '../engine/state.js';
import { PARTS_DB } from '../data/parts.js';

const KEY = 'mo_v2_save';
const SLOTS = ['head', 'body', 'arm', 'leg'];
export const MAX_LEVEL = 5;
export const LEVEL_BONUS = 0.12;      // 강화 1레벨마다 그 파츠의 HP·DPS +12%
export const STAR_BONUS_DM = 300;     // 새로 얻은 별 하나마다 보너스

function partOf(slot, id) {
    return (PARTS_DB[slot] || []).find(p => p.id === id) || null;
}

function slotOf(id) {
    return SLOTS.find(s => partOf(s, id));
}

class Progress {
    constructor() {
        this.owned = new Set();
        this.levels = {};
        this.stages = {};
        this.selectedStage = null;   // 메인 화면에서 고른 스테이지 (저장)
        this.loaded = false;
        this.saveTimer = null;
    }

    // ---- 시작 / 저장 ----
    /** v2 시작 시 한 번: 저장값을 gameState에 적용하고 변경을 구독 */
    init() {
        if (this.loaded) return;
        this.loaded = true;
        SLOTS.forEach(slot => (PARTS_DB[slot] || []).forEach(p => { if (!p.cost) this.owned.add(p.id); }));
        let data = null;
        try { data = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { data = null; }
        if (data) {
            if (Number.isFinite(data.dm)) gameState.darkMatter = data.dm;
            if (data.equipped) {
                SLOTS.forEach(slot => {
                    if (partOf(slot, data.equipped[slot])) gameState.equippedParts[slot] = data.equipped[slot];
                });
            }
            (data.owned || []).forEach(id => this.owned.add(id));
            this.levels = { ...(data.levels || {}) };
            this.stages = { ...(data.stages || {}) };
            this.selectedStage = data.selectedStage || null;
        }
        SLOTS.forEach(slot => this.owned.add(gameState.equippedParts[slot]));   // 장착 중인 파츠는 보유
        gameState.cartParts = { ...gameState.equippedParts };
        gameState.subscribe(() => this.saveSoon());
        this.save();
    }

    saveSoon() {
        clearTimeout(this.saveTimer);
        this.saveTimer = setTimeout(() => this.save(), 250);
    }

    save() {
        const data = {
            v: 1,
            dm: gameState.darkMatter,
            equipped: { ...gameState.equippedParts },
            owned: [...this.owned],
            levels: this.levels,
            stages: this.stages,
            selectedStage: this.selectedStage
        };
        try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* 저장 불가 환경: 이번 실행에서만 유지 */ }
    }

    /** 처음부터 다시 (설정 창의 진행 초기화) */
    resetAll() {
        try { localStorage.removeItem(KEY); } catch (e) { /* 무시 */ }
        location.reload();
    }

    // ---- 파츠 소유 ----
    isOwned(id) {
        return this.owned.has(id);
    }

    /** 장바구니 중 보유하지 않은 파츠의 구매 비용 */
    cartCost() {
        return SLOTS.reduce((sum, slot) => {
            const id = gameState.cartParts[slot];
            const p = partOf(slot, id);
            return sum + (p && !this.owned.has(id) ? p.cost || 0 : 0);
        }, 0);
    }

    cartChanges() {
        return SLOTS.filter(s => gameState.cartParts[s] !== gameState.equippedParts[s]).length;
    }

    /** 장바구니 확정: 보유하지 않은 파츠는 구매 후 장착 */
    confirmCart() {
        const cost = this.cartCost();
        if (gameState.darkMatter < cost) return { success: false, reason: '다크 매터(DM)가 부족합니다' };
        SLOTS.forEach(slot => this.owned.add(gameState.cartParts[slot]));
        gameState.darkMatter -= cost;
        gameState.equippedParts = { ...gameState.cartParts };
        gameState.notify();
        return { success: true, cost };
    }

    // ---- 파츠 강화 ----
    levelOf(id) {
        return this.levels[id] || 1;
    }

    /** 다음 레벨 강화 비용 (최대면 null) */
    upgradeCost(id) {
        const lv = this.levelOf(id);
        if (lv >= MAX_LEVEL || id === 'none') return null;
        const p = partOf(slotOf(id), id);
        const base = Math.max(p ? p.cost || 0 : 0, 200);
        return Math.round((base * 0.6 * lv) / 10) * 10;
    }

    upgrade(id) {
        if (!this.owned.has(id)) return { success: false, reason: '먼저 파츠를 구매해야 합니다' };
        const cost = this.upgradeCost(id);
        if (cost == null) return { success: false, reason: '이미 최대 레벨입니다' };
        if (gameState.darkMatter < cost) return { success: false, reason: '다크 매터(DM)가 부족합니다' };
        gameState.darkMatter -= cost;
        this.levels[id] = this.levelOf(id) + 1;
        gameState.notify();
        return { success: true, cost, level: this.levels[id] };
    }

    /** 강화 레벨을 반영한 파츠 능력치 */
    partStats(part) {
        const s = (part && part.stats) || {};
        const k = 1 + LEVEL_BONUS * (this.levelOf(part && part.id) - 1);
        return { hp: Math.round((s.hp || 0) * k), dps: Math.round((s.dps || 0) * k), range: s.range || 0, speed: s.speed || 0 };
    }

    /** 파츠 조합 능력치 (구버전 calculateStats와 같은 규칙 + 강화 레벨) */
    statsFor(partsObj) {
        let hp = 0, dps = 0, range = 0, speed = 0;
        for (const slot of SLOTS) {
            const part = partsObj[slot];
            if (!part || !part.stats) continue;
            const s = this.partStats(part);
            hp += s.hp;
            dps += s.dps;
            if (slot === 'arm') range = part.stats.range || 100;   // 사거리는 팔이 기준
            else range += s.range;
            speed += s.speed;
        }
        return { hp, dps, range: Math.max(80, range), speed: Math.max(30, speed) };
    }

    equippedStats() {
        return this.statsFor(gameState.getEquippedObjects());
    }

    // ---- 스테이지 기록 ----
    selectStage(id) {
        this.selectedStage = id;
        this.saveSoon();
    }

    stage(id) {
        return this.stages[id] || { stars: [false, false, false], cleared: false, bestTime: null };
    }

    starCount(id) {
        return this.stage(id).stars.filter(Boolean).length;
    }

    /**
     * 전투 결과 기록. stars: [요새, 기지, 체력50%] 이번 판 달성 여부
     * @returns {{ newStars: number, bonus: number }} 새로 얻은 별 수와 보너스 DM (보너스는 여기서 지급)
     */
    recordStage(id, { stars, cleared, time }) {
        const prev = this.stage(id);
        const merged = prev.stars.map((had, i) => had || !!stars[i]);
        const newStars = merged.filter(Boolean).length - prev.stars.filter(Boolean).length;
        this.stages[id] = {
            stars: merged,
            cleared: prev.cleared || !!cleared,
            bestTime: cleared ? Math.min(prev.bestTime ?? Infinity, time) : prev.bestTime
        };
        const bonus = newStars * STAR_BONUS_DM;
        if (bonus) gameState.darkMatter += bonus;
        gameState.notify();
        return { newStars, bonus };
    }
}

export const progress = new Progress();
