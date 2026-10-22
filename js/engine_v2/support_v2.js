// D-069: 내 캐릭터 협력 출격. 편성/저장 규칙은 전투·화면이 함께 사용한다.
import { PARTS_DB } from '../data/parts.js';
import { ROSTER, SLOTS, characterOfPart } from './roster_v2.js';
import { skillsForParts } from './skills_v2.js';

export const SUPPORT = Object.freeze({
    cooldown: 30, // D-075: 첫 충전과 반복 재충전 시간.
    actorFront: 60, meleeGap: 80, dashSec: 0.22, dashRange: 260,
    duration: 5, enter: 0.4, attackAt: 1.5, exitAt: 4.5, attacksEvery: 0.65,
    damage: 0.55, ultimate: 1.6, baseDamage: 0.65, synergy: 0.15,
    shield: 0.08, bossShield: 0.12, shieldCap: 0.12, shatter: 0.45,
    range: 520, maxTargets: 6, autoHealth: 0.4, autoCrowd: 4
});
export const SUPPORT_UNITS = {
    mech: { role: '원거리 화력', ult: '스웜 드론 총출격', skill: 'droneSwarm', clip: 'attack', icon: 'drone',
        brief: '드론 포격 · 원거리 피해 +15%',
        effect: '드론 6기로 포격. 명중한 적에게 주인공의 원거리 피해 +15%.', partners: ['hero', 'frost', 'diver'] },
    kaiju: { role: '광역 제압', ult: '대지 포효', skill: 'earthRoar', clip: 'victory', icon: 'roar',
        brief: '광역 기절 · 근접 피해 +15%',
        effect: '포효로 일반 적 2초 기절. 명중한 적에게 주인공의 근접 피해 +15%.', partners: ['chimera', 'doll'] },
    hero: { role: '세뇌 · 약화', ult: '대세뇌', skill: 'massMind', clip: 'cast', icon: 'mind',
        brief: '적 2기 세뇌 · 적 공격 피해 -15%',
        effect: '일반 적 최대 2기를 임시 아군화. 표식 주변 적의 공격 피해 -15%. 보스·거점에는 약화 표식.', partners: ['mech', 'frost'] },
    chimera: { role: '근접 화력 · 지휘', ult: '파괴 광란', skill: 'rampage', clip: 'transform', icon: 'rampage',
        brief: '연속 강타 · 아군 공격속도 +15%',
        effect: '광란 강타 후 연속 공격. 주인공과 아군 소환수의 공격속도 +15%.', partners: ['kaiju', 'saint', 'doll'] },
    diver: { role: '구속 · 범위 연계', ult: '심연의 손', skill: 'abyssHands', clip: 'cast', icon: 'hand',
        brief: '구속 · 지속 피해 · 범위 피해 +15%',
        effect: '일반 적을 2초 구속하고 지속 피해. 표식 대상에게 주인공의 범위 피해 +15%. 보스·거점에는 피해 표식.', partners: ['mech', 'kaiju'] },
    saint: { role: '보호 · 부활', ult: '억지 부활', skill: 'forcedRevive', clip: 'cast', icon: 'redcross',
        brief: '임시 부활 · 보호막 8~12%',
        effect: '시체 우선, 일반 적까지 최대 3기를 임시 아군화. 주인공·기존 소환수 보호막 8%, 보스전 12%.', partners: ['chimera', 'doll'] },
    frost: { role: '빙결 · 파쇄', ult: '영원한 안식', skill: 'eternalRest', clip: 'cast', icon: 'icecage',
        brief: '빙결 · 첫 타격 추가 파쇄',
        effect: '일반 적을 1.5초 빙결 후 파쇄. 주인공 첫 타격에 추가 파쇄 1회. 보스·거점에는 추가 피해 표식.', partners: ['kaiju', 'chimera'] },
    doll: { role: '교란 · 방어 약화', ult: '인형 실', skill: 'puppetStrings', clip: 'strings', icon: 'puppet',
        brief: '적 조종 · 방어 25% 무시',
        effect: '일반 적 최대 4기를 3초 조종. 표식 대상에게 주인공 공격이 방어 25% 무시. 보스·거점에는 방어 약화.', partners: ['mech', 'hero'] }
};

export const SupportProgressMethods = {
    supportReason(id, main = this.character) {
        if (!SUPPORT_UNITS[id]) return '없는 캐릭터';
        if (id === main) return '현재 출전 캐릭터';
        if (!this.isCharacterUnlocked(id)) return '캐릭터 해금 필요';
        if (this.isDispatched(id)) return '파견 중';
        const eq = this.loadoutFor(id);
        if (!SLOTS.every(s => {
            const p = (PARTS_DB[s] || []).find(p => p.id === eq[s]);
            return p && this.isOwned(p.id) && characterOfPart(p) === id;
        })) return '보유 파츠 4부위 필요';
        return '';
    },
    supportCandidates(main = this.character) {
        return ROSTER.filter(c => !this.supportReason(c.id, main));
    },
    selectSupport(id) {
        if (id != null && this.supportReason(id)) return false;
        this.supportCharacter = id || null;
        this.supportRandom = false;
        this.save();
        return true;
    },
    randomSupport(random = Math.random) {
        const list = this.supportCandidates();
        if (!list.length) return false;
        const roll = Math.max(0, Math.min(0.999999, Number(random()) || 0));
        this.supportCharacter = list[Math.floor(roll * list.length)].id;
        this.supportRandom = true;
        this.save();
        return true;
    },
    setSupportAuto(on) {
        this.supportAuto = !!on;
        this.save();
    },
    supportSnapshot(main = this.character) {
        const id = this.supportCharacter;
        if (!id || this.supportReason(id, main)) return null;
        const ids = this.loadoutFor(id);
        // 출격 시점의 독립 복사본. 주인공의 장착/스킬은 바꾸지 않는다.
        const parts = Object.fromEntries(SLOTS.map(s => [s, structuredClone(PARTS_DB[s].find(p => p.id === ids[s]))]));
        const sk = skillsForParts(parts).head;
        const skillLevel = this.skillLevel(sk?.id || SUPPORT_UNITS[id].skill);
        return { id, parts, stats: { ...this.statsFor(parts) }, gear: { ...this.gearTotals(parts) },
            skillLevel, auto: !!this.supportAuto, random: !!this.supportRandom };
    }
};

export function supportPairText(id, main) {
    const unit = SUPPORT_UNITS[id];
    if (!unit) return '지원 캐릭터를 편성하세요';
    return `${unit.partners.includes(main) ? '추천 연계 · ' : ''}${unit.effect}`;
}
