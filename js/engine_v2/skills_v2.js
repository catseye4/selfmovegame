/* ==========================================================================
   PROJECT: MAD OVERLORD // 파츠 액티브 스킬 (v2)
   장착 파츠가 스킬을 결정한다.
     팔   = 공격 스킬 (버튼, 쿨다운)          단축키 1
     몸통 = 보조 스킬 (버튼, 쿨다운)          단축키 2
     머리 = 필살기 (게이지를 모아 사용, 컷인)  단축키 3 / Space
     다리 = 패시브 (기존 다리 효과 그대로)
   스킬 효과는 전투 엔진(battle_v2.js)의 공용 메서드와 이펙트 정의(vfx/*.js)를 조합해 만든다.
   피해 단위 u = 기본 공격 1타 피해 (playerDps × 0.5)
   ========================================================================== */

import { monsterControllerV2 as monster } from './monster_v2.js';
import { HERO_VFX, MECH_VFX, KAIJU_VFX, CHIMERA_VFX, meleeHitVfx } from './vfx/vfxDefs.js';
import { aimAt } from './bases_v2.js';

export const SLOT_KEYS = { arm: '1', body: '2', head: '3' };
export const ULT_FILL = { perSec: 1 / 24, perHit: 0.03 };   // 필살기 게이지: 24초 + 기본 공격 1타당 3%

const aim = aimAt;   // 적 몸통 중앙 (건물은 그림 크기의 가운데)

// ---- 스킬 정의 ----
// target: 'enemy'(사거리 안에 적이 있어야 사용) | 'self'(언제나) , range: 전방 사거리 추가 px
export const SKILLS = {
    // ===== 팔 =====
    rush: {
        name: '연타 러시', slot: 'arm', cd: 8, icon: 'fist', color: '#3ee6ff', target: 'enemy', range: 40,
        desc: '가장 가까운 적에게 강타 3연속',
        use(b) {
            monster.playSkillAnim('attack');
            const hitVfx = meleeHitVfx(monster.getCharacterId(), b.equippedArmId);
            for (let i = 0; i < 3; i++) {
                b.schedule(0.12 + i * 0.16, () => {
                    const t = b.nearestEnemy(this.range);
                    if (!t) return;
                    b.fx.play(hitVfx, aim(t).x, aim(t).b + 5);
                    b.dealDamageToEnemy(t, b.unit() * 1.3, false, { knock: 1.2, stop: i === 2 });
                });
            }
        }
    },
    pierceLaser: {
        name: '관통 레이저', slot: 'arm', cd: 9, icon: 'laser', color: '#d75aff', target: 'enemy', range: 250,
        desc: '전방 일직선의 모든 적을 꿰뚫는 굵은 광선',
        use(b) {
            monster.playSkillAnim('attack');
            b.schedule(0.3, () => {
                const from = monster.getMuzzlePoint() || { x: b.monsterX + 90, bottom: 120 };
                const endX = b.frontX() + b.playerRange + this.range;
                b.fx.play(MECH_VFX.laserBig, from.x, from.bottom, { to: [endX, 90] });
                b.enemiesInRange(b.playerRange + this.range).forEach((e, i) => b.schedule(i * 0.04, () => {
                    if (!b.enemies.includes(e)) return;
                    b.fx.play(MECH_VFX.laserHit, aim(e).x, aim(e).b);
                    b.dealDamageToEnemy(e, b.unit() * 3, false, { knock: 1.5, stop: i === 0 });
                }));
            });
        }
    },
    missileSalvo: {
        name: '미사일 일제 사격', slot: 'arm', cd: 9, icon: 'missile', color: '#ff9a3c', target: 'enemy', range: 200,
        desc: '미사일 6발을 여러 적에게 동시에 사출',
        use(b) {
            const targets = b.enemiesInRange(b.playerRange + this.range);
            for (let i = 0; i < 6; i++) {
                b.schedule(i * 0.08, () => {
                    const t = targets[i % targets.length];
                    if (t) b.fireMissile(t, b.unit() * 1.1, { apex: 50 + (i % 3) * 25 });
                });
            }
        }
    },
    frenzyClaw: {
        name: '광폭 할퀴기', slot: 'arm', cd: 8, icon: 'claw', color: '#ff9628', target: 'enemy', range: 40,
        desc: '전방을 세 번 할퀴어 주변 적 모두에게 피해',
        use(b) {
            monster.playSkillAnim('attack');
            [2.2, 0.9, 1.6].forEach((angle, i) => b.schedule(0.1 + i * 0.14, () => {
                const t = b.nearestEnemy(this.range);
                if (!t) return;
                const def = { ...CHIMERA_VFX.clawHit, layers: CHIMERA_VFX.clawHit.layers.map(l => (l.type === 'claw' ? { ...l, angle, len: 95 } : l)) };
                b.fx.play(def, aim(t).x, aim(t).b + 5);
                b.enemies.filter(e => Math.abs(e.x - t.x) < 110).forEach(e =>
                    b.dealDamageToEnemy(e, b.unit() * 1.1, false, { knock: 0.8, stop: i === 2 }));
            }));
        }
    },
    tripleWave: {
        name: '어둠 파동 3연', slot: 'arm', cd: 9, icon: 'wave', color: '#c86eff', target: 'enemy', range: 120,
        desc: '관통하며 감속시키는 어둠 파동을 세 번 발사',
        use(b) {
            monster.playSkillAnim('attack');
            for (let i = 0; i < 3; i++) {
                b.schedule(0.25 + i * 0.2, () => {
                    const tip = monster.getMuzzlePoint();
                    b.launchDarkWave(tip ? tip.x : b.monsterX + 90, b.unit() * 1.4, false);
                });
            }
        }
    },
    acidCharge: {
        name: '산성 돌진', slot: 'arm', cd: 9, icon: 'acid', color: '#a0ff32', target: 'enemy', range: 90,
        desc: '거체로 들이받아 큰 피해 + 주변 적을 밀쳐내고 산성 웅덩이로 부식 (거점에 강함)',
        use(b) {
            monster.playSkillAnim('attack');
            b.schedule(0.35, () => {
                const t = b.nearestEnemy(this.range);
                if (!t) return;
                const a = aim(t);
                b.fx.play(KAIJU_VFX.acidCharge, a.x, 58);
                b.dealDamageToEnemy(t, b.unit() * (t.isBuilding ? 4.5 : 3), false, { knock: 2, stop: true });
                b.enemiesInRange(b.playerRange + this.range + 60).forEach(e => {
                    if (e !== t) b.dealDamageToEnemy(e, b.unit() * 1.2, false, { knock: 2.2 });
                    b.applyAcid(e, 4);
                });
                if (b.enemies.includes(t)) b.applyAcid(t, 4);
            });
        }
    },

    // ===== 몸통 =====
    reflectShield: {
        name: '반사 실드', slot: 'body', cd: 16, icon: 'shield', color: '#3ee6ff', target: 'self',
        desc: '5초간 최대 체력 20%의 피해를 막는 에너지 실드',
        use(b) {
            b.applyShield(0.2, 5, '62, 230, 255');
        }
    },
    callMinions: {
        name: '졸개 호출', slot: 'body', cd: 14, icon: 'minions', color: '#ff9628', target: 'self',
        desc: '졸개 미니언 2기를 즉시 소환 (최대 8기)',
        use(b) {
            [60, 110].forEach((dx, i) => b.schedule(i * 0.15, () => {
                if (b.allies.length < 8) b.spawnAllyMinion(b.monsterX + dx, 'chimera');
            }));
        }
    },
    layEggs: {
        name: '산란', slot: 'body', cd: 14, icon: 'egg', color: '#a0ff32', target: 'self',
        desc: '알 2개를 낳아 새끼 괴수 부화 (최대 5마리)',
        use(b) {
            [12, 55].forEach((dx, i) => b.schedule(i * 0.2, () => b.layEgg(b.monsterX + dx, 5)));
        }
    },
    curseBurst: {
        name: '흑마법 폭발', slot: 'body', cd: 15, icon: 'curse', color: '#c86eff', target: 'enemy', range: 200,
        desc: '전방 광역에 흑마법 기둥 — 피해 + 감속',
        use(b) {
            monster.playSkillAnim('cast');
            b.schedule(0.3, () => {
                b.fx.play(HERO_VFX.curseNova, b.frontX() + 140, 58);
                b.enemiesInRange(b.playerRange + this.range).forEach((e, i) => b.schedule(0.1 + i * 0.05, () => {
                    if (!b.enemies.includes(e)) return;
                    b.fx.play(HERO_VFX.curseTick, aim(e).x, 58);
                    if (!e.isBuilding) b.slowEnemy(e);
                    b.dealDamageToEnemy(e, b.unit() * 2, false, { knock: 0.5 });
                }));
            });
        }
    },

    // ===== 머리 (필살기) =====
    droneSwarm: {
        name: '스웜 드론 총출격', slot: 'head', ult: true, icon: 'drone', color: '#d75aff', target: 'enemy', range: 400,
        desc: '자폭 드론 6기가 적진에 돌진',
        use(b) {
            b.launchDrones(6);
        }
    },
    earthRoar: {
        name: '대지 포효', slot: 'head', ult: true, icon: 'roar', color: '#a0ff32', target: 'enemy', range: 250,
        desc: '산성 충격파로 주변 적에게 큰 피해 + 2초 기절',
        use(b) {
            monster.playSkillAnim('victory');
            b.schedule(0.4, () => {
                b.fx.play(KAIJU_VFX.roarBurst, b.monsterX + 60, 58);
                b.enemiesInRange(b.playerRange + this.range).forEach(e => {
                    b.dealDamageToEnemy(e, b.unit() * 3, false, { knock: 2, stop: true });
                    if (!e.isBuilding) b.stunEnemy(e, 2);
                });
            });
        }
    },
    massMind: {
        name: '대세뇌', slot: 'head', ult: true, icon: 'mind', color: '#c86eff', target: 'minion', range: 350,
        desc: '가까운 적 보병 2기를 즉시 세뇌해 아군으로',
        use(b) {
            const targets = b.enemiesInRange(b.playerRange + this.range).filter(e => !e.isBuilding).slice(0, 2);
            monster.playCast(() => targets.forEach((e, i) => b.schedule(i * 0.12, () => b.convertEnemy(e))));
        }
    },
    rampage: {
        name: '파괴 광란', slot: 'head', ult: true, icon: 'rampage', color: '#ff9628', target: 'self',
        desc: '즉시 2페이즈 변신. 이미 변신했다면 대형 충격파 + 1.5초 기절',
        use(b) {
            if (!b.phase2) {
                b.enterPhase2();
                return;
            }
            b.fx.play(CHIMERA_VFX.slam, b.monsterX + 35, 58);
            b.enemiesInRange(b.playerRange + 200).forEach(e => {
                b.dealDamageToEnemy(e, b.unit() * 3, false, { knock: 2, stop: true });
                if (!e.isBuilding) b.stunEnemy(e, 1.5);
            });
        }
    }
};

// 파츠 → 스킬 (파츠제거 'none'은 스킬 없음)
export const PART_SKILL = {
    arm_red_robot: 'rush', arm_mech_laser: 'pierceLaser', arm_mech_missile: 'missileSalvo',
    arm_chimera: 'frenzyClaw', arm_hero_wave: 'tripleWave', arm_mutant: 'acidCharge',
    body_red_robot: 'reflectShield', body_mech: 'reflectShield', body_chimera: 'callMinions',
    body_mutant: 'layEggs', body_hero: 'curseBurst',
    head_red_robot: 'droneSwarm', head_mech: 'droneSwarm', head_mutant: 'earthRoar',
    head_hero: 'massMind', head_chimera: 'rampage'
};

// 다리 패시브 (v2 기준 설명 — parts.js 설명은 구버전과 공용이라 여기서 덮어씀). 효과는 battle_v2.js
export const LEG_PASSIVES = {
    leg_red_robot: { name: '유압 서스펜션', desc: '진격 속도 증가 (능력치)' },
    leg_chimera: { name: '지진 분쇄', desc: '전방 적에게 계속 지진 피해 (초당 30)' },
    leg_mutant: { name: '독성 점액', desc: '전방 적을 감속시키고 계속 독 피해 (초당 30)' },
    leg_mech_wheel: { name: '궤도 돌진', desc: '처음 부딪힌 적에게 돌진 피해를 주고 밀쳐내며 잠깐 기절 (적마다 4초에 한 번)' },
    leg_hero_hover: { name: '반중력 부양', desc: '근접 피해 30% 감소, 감속에 걸리지 않음' }
};

/** 다리 파츠 패시브 { name, desc } (없으면 null) */
export function legPassiveOf(part) {
    return part ? LEG_PASSIVES[part.id] || null : null;
}

/** 장착 파츠로 슬롯별 스킬 목록 { arm, body, head } (없으면 null) */
export function skillsForParts(equipped) {
    const pick = slot => {
        const id = equipped[slot] && PART_SKILL[equipped[slot].id];
        return id ? { id, ...SKILLS[id] } : null;
    };
    return { arm: pick('arm'), body: pick('body'), head: pick('head') };
}

/** 지금 사용할 대상이 있는지 */
export function hasTarget(b, skill) {
    if (skill.target === 'self') return true;
    const list = b.enemiesInRange(b.playerRange + (skill.range || 0));
    return skill.target === 'minion' ? list.some(e => !e.isBuilding) : list.length > 0;
}
