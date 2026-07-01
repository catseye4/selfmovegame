/* ==========================================================================
   PROJECT: MAD OVERLORD // GAME STATE & ECONOMY MANAGER
   ========================================================================== */

import { PARTS_DB } from '../data/parts.js';

class GameStateManager {
    constructor() {
        this.darkMatter = 2500; // 초기 연구 및 개조 자금
        this.currentScreen = 'menu'; // 'menu' | 'lab' | 'battle'
        
        // 현재 장착 확정된 파츠 ID 조합
        this.equippedParts = {
            head: 'head_chimera',
            body: 'body_chimera',
            arm: 'arm_chimera',
            leg: 'leg_chimera'
        };

        // 연구소 키오스크에서 장바구니/시뮬레이션 중인 파츠 ID 조합
        this.cartParts = {
            head: 'head_chimera',
            body: 'body_chimera',
            arm: 'arm_chimera',
            leg: 'leg_chimera'
        };

        // UI 업데이트를 위한 리스너 콜백 배열
        this.listeners = [];
    }

    subscribe(listener) {
        this.listeners.push(listener);
    }

    notify() {
        this.listeners.forEach(fn => fn(this));
    }

    // 파츠 ID로 데이터 조회 Helper
    getPartById(slot, id) {
        const list = PARTS_DB[slot];
        if (!list) return null;
        return list.find(p => p.id === id) || list[0];
    }

    // 장착된 파츠 데이터 조합 반환
    getEquippedObjects() {
        return {
            head: this.getPartById('head', this.equippedParts.head),
            body: this.getPartById('body', this.equippedParts.body),
            arm: this.getPartById('arm', this.equippedParts.arm),
            leg: this.getPartById('leg', this.equippedParts.leg)
        };
    }

    // 장바구니 파츠 데이터 조합 반환
    getCartObjects() {
        return {
            head: this.getPartById('head', this.cartParts.head),
            body: this.getPartById('body', this.cartParts.body),
            arm: this.getPartById('arm', this.cartParts.arm),
            leg: this.getPartById('leg', this.cartParts.leg)
        };
    }

    // 특정 파츠 셋(Equipped vs Cart)의 스탯 합산 연산 (MVVM)
    calculateStats(partsObj) {
        let totalHp = 0;
        let totalDps = 0;
        let totalRange = 0;
        let totalSpeed = 0;
        let skillDescs = [];

        for (const slot in partsObj) {
            const part = partsObj[slot];
            if (part && part.stats) {
                totalHp += part.stats.hp || 0;
                totalDps += part.stats.dps || 0;
                // 사거리는 팔(arm) 파츠를 메인으로 하고, 타 부위 보너스 합산
                if (slot === 'arm') {
                    totalRange = part.stats.range || 100;
                } else {
                    totalRange += part.stats.range || 0;
                }
                totalSpeed += part.stats.speed || 0;
                if (part.skillDesc) {
                    skillDescs.push(`[${part.name}] ${part.skillDesc}`);
                }
            }
        }

        return {
            hp: totalHp,
            dps: totalDps,
            range: Math.max(80, totalRange), // 최소 사거리 80px 보장
            speed: Math.max(30, totalSpeed),  // 최소 속도 30 보장
            skillDescs: skillDescs
        };
    }

    getEquippedStats() {
        return this.calculateStats(this.getEquippedObjects());
    }

    getCartStats() {
        return this.calculateStats(this.getCartObjects());
    }

    // 장바구니에서 신규 선택한 파츠들의 추가 결제 금액 계산
    getCartTotalCost() {
        let cost = 0;
        for (const slot in this.cartParts) {
            const cartId = this.cartParts[slot];
            const equippedId = this.equippedParts[slot];
            if (cartId !== equippedId) {
                const part = this.getPartById(slot, cartId);
                if (part) cost += part.cost || 0;
            }
        }
        return cost;
    }

    // 키오스크 슬롯 파츠 시뮬레이션 변경
    selectCartPart(slot, partId) {
        this.cartParts[slot] = partId;
        this.notify();
    }

    // 연구소 진입 시 장바구니를 현재 장착 상태로 동기화
    resetCartToEquipped() {
        this.cartParts = { ...this.equippedParts };
        this.notify();
    }

    // 장바구니 파츠 최종 구매 및 장착 확정
    confirmEquip() {
        const cost = this.getCartTotalCost();
        if (this.darkMatter < cost) {
            return { success: false, reason: '다크 매터(Dark Matter) 재화가 부족합니다!' };
        }
        
        this.darkMatter -= cost;
        this.equippedParts = { ...this.cartParts };
        this.notify();
        return { success: true, cost: cost };
    }

    // 전투 중 다크 매터 약탈/획득
    addDarkMatter(amount) {
        this.darkMatter += amount;
        this.notify();
    }
}

export const gameState = new GameStateManager();
