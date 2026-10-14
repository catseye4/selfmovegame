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
     character 선택창에서 고른 캐릭터 id (D-051)
     loadouts  캐릭터별 마지막 장착 { mech: { head, body, arm, leg }, ... } — 다시 고르면 그대로
   v1 저장(캐릭터 없음, 다른 캐릭터 파츠를 섞어 낌)은 처음 읽을 때 몸통 캐릭터로 바꾼다 (fixMixed)
   ========================================================================== */

import { gameState } from '../engine/state.js';
import { PARTS_DB } from '../data/parts.js';
import { SLOTS, DEFAULT_CHARACTER, rosterOf, characterOfPart, partsOfCharacter } from './roster_v2.js';

const KEY = 'mo_v2_save';
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
        this.character = DEFAULT_CHARACTER;   // 선택창에서 고른 캐릭터 (저장)
        this.loadouts = {};                   // 캐릭터별 마지막 장착 (저장)
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
            this.loadouts = { ...(data.loadouts || {}) };
        }
        SLOTS.forEach(slot => this.owned.add(gameState.equippedParts[slot]));   // 장착 중인 파츠는 보유
        // 고른 캐릭터: 저장에 있으면 그것, v1 저장이면 몸통 캐릭터
        const saved = data && rosterOf(data.character) ? data.character : null;
        this.character = saved || characterOfPart(partOf('body', gameState.equippedParts.body)) || DEFAULT_CHARACTER;
        this.fixMixed(!saved);
        this.rememberLoadout();
        gameState.cartParts = { ...gameState.equippedParts };
        gameState.subscribe(() => this.saveSoon());
        this.save();
    }

    saveSoon() {
        clearTimeout(this.saveTimer);
        this.saveTimer = setTimeout(() => this.save(), 250);
    }

    save() {
        // 장착이 바깥(검사 도구 등)에서 바뀌었으면 몸통 캐릭터를 따라감
        const bodyChar = characterOfPart(partOf('body', gameState.equippedParts.body));
        if (bodyChar) this.character = bodyChar;
        this.rememberLoadout();
        const data = {
            v: 2,
            dm: gameState.darkMatter,
            equipped: { ...gameState.equippedParts },
            owned: [...this.owned],
            levels: this.levels,
            stages: this.stages,
            selectedStage: this.selectedStage,
            character: this.character,
            loadouts: this.loadouts
        };
        try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* 저장 불가 환경: 이번 실행에서만 유지 */ }
    }

    /** 처음부터 다시 (설정 창의 진행 초기화) */
    resetAll() {
        try { localStorage.removeItem(KEY); } catch (e) { /* 무시 */ }
        location.reload();
    }

    // ---- 캐릭터 선택 (D-051) ----
    /**
     * 장착 중인 다른 캐릭터 파츠를 고른 캐릭터 파츠로 바꿈 (v1 저장 변환).
     * 그 부위에 가진 파츠가 있으면 그것, 없으면 가장 싼 파츠 — grant면 그 파츠를 줌 (예전에 끼우던 부위를 비우지 않게)
     */
    fixMixed(grant) {
        for (const slot of SLOTS) {
            const id = gameState.equippedParts[slot];
            if (id === 'none' || characterOfPart(partOf(slot, id)) === this.character) continue;
            const list = partsOfCharacter(this.character, slot);
            const pick = list.find(p => this.owned.has(p.id))
                || (grant ? [...list].sort((a, b) => (a.cost || 0) - (b.cost || 0))[0] : null);
            if (pick) this.owned.add(pick.id);
            gameState.equippedParts[slot] = pick ? pick.id : 'none';
        }
    }

    /** 지금 장착을 고른 캐릭터의 장착으로 기억 (다른 캐릭터 파츠가 섞여 있으면 기억하지 않음) */
    rememberLoadout() {
        const eq = gameState.equippedParts;
        const mine = SLOTS.every(s => eq[s] === 'none' || characterOfPart(partOf(s, eq[s])) === this.character);
        if (mine) this.loadouts[this.character] = { ...eq };
    }

    /**
     * 캐릭터의 장착 파츠 id {head, body, arm, leg}: 기억해 둔 장착 → 없으면 부위마다 가진 파츠 중 첫 번째.
     * 그 부위 파츠를 하나도 안 가졌으면 'none' (연구소에서 구매)
     */
    loadoutFor(character) {
        if (character === this.character) return { ...gameState.equippedParts };
        const saved = this.loadouts[character] || {};
        const out = {};
        for (const slot of SLOTS) {
            const id = saved[slot];
            const keep = id && this.owned.has(id) && characterOfPart(partOf(slot, id)) === character;
            out[slot] = keep ? id : (partsOfCharacter(character, slot).find(p => this.owned.has(p.id)) || { id: 'none' }).id;
        }
        return out;
    }

    /** 캐릭터 바꾸기: 지금 장착을 기억하고 그 캐릭터의 장착으로 */
    selectCharacter(id) {
        if (!rosterOf(id)) return false;
        if (id === this.character) return true;
        this.rememberLoadout();
        const next = this.loadoutFor(id);
        this.character = id;
        gameState.equippedParts = next;
        gameState.cartParts = { ...next };
        gameState.notify();
        return true;
    }

    /** 캐릭터 파츠 보유 수 { owned, total } */
    ownedCountOf(character) {
        const all = SLOTS.flatMap(s => partsOfCharacter(character, s));
        return { owned: all.filter(p => this.owned.has(p.id)).length, total: all.length };
    }

    /** 출격 가능: 몸통 파츠를 끼웠을 때 */
    isReady() {
        return gameState.equippedParts.body !== 'none';
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
        this.rememberLoadout();
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
