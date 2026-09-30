/* ==========================================================================
   PROJECT: MAD OVERLORD // BATTLE ENGINE (CONTINUOUS DISTANCE & BASE DESTRUCTION) (v2)
   Uses suffix -v2 to avoid overlapping with original vanilla battle engine.
   ========================================================================== */

import { gameState } from '../engine/state.js';
import { monsterControllerV2 } from './monster_v2.js';
import { BattleFx, ensureSkillStyles } from './battleFx.js';
import { gameTime } from './gameTime.js';
import { HERO_VFX, HERO_WAVE, HERO_ORB } from './vfx/heroVfx.js';

// ---- 팩션 스킬 (컨셉 시트 기준) ----
const PHASE2 = { hpRatio: 0.5, shieldRatio: 0.3, dpsMul: 1.3 };            // 합성괴인 머리: 2페이즈 거대화 + 실드
const EGG = { interval: 3.2, hatchSec: 1.6, maxBabies: 3 };                // 거대괴수 몸통: 이동 중 산란 → 새끼 괴수
const BABY = { hp: 260, dps: 22, speedMul: 0.6 };
const DRONE = { interval: 6, count: 3, range: 800, dmgMul: 0.35, splash: 70 };  // 거대로봇 머리: 스웜 드론
// 타락 히어로: 머리 세뇌 파동(처치한 적 징집 확률 = 파츠 설명 25%), 몸통 흑마법 오라, 팔 어둠 파동(관통 + 감속)
const HERO = { recruitChance: 0.25, curseTick: 0.65, curseZone: [-40, 180], curseDps: 48,
    waveRange: 340, slowSec: 2.5, slowMul: 0.5 };
// 캐릭터별 근접 타격 이펙트 (다른 캐릭터는 이펙트 재정비 단계에서 추가)
const HIT_VFX = { hero: HERO_VFX.slashHit };
const HIT_REACT = { flashMs: 80, knockPx: 10, stopSec: 0.05 };

export class BattleEngine {
    constructor() {
        this.isActive = false;
        this.loopId = null;
        this.lastTime = 0;

        // 전장 진행 및 목표 스탯
        this.distanceTraveled = 0;
        this.maxDistance = 1000;
        this.stars = 0; // 0 | 1 | 2

        // 아군 몬스터 스탯 및 좌표
        this.monsterX = 150; // 캐릭터 초기 좌측 X 좌표
        this.playerHp = 0;
        this.maxPlayerHp = 0;
        this.playerDps = 0;
        this.playerRange = 150;
        this.playerSpeed = 100;
        this.attackType = 'melee';

        // 거점 건물 스탯
        this.playerBaseHp = 5000;
        this.maxPlayerBaseHp = 5000;
        this.currentTargetHp = 3500;
        this.maxTargetHp = 3500;

        // 거점 생성 및 파괴 상태
        this.midBaseSpawned = false;
        this.midBaseDestroyed = false;
        this.finalBaseSpawned = false;
        this.finalBaseDestroyed = false;

        // 전장 엔티티 및 투사체 목록
        this.enemies = [];
        this.allies = [];
        this.projectiles = [];
        this.equippedHeadId = null;
        this.equippedBodyId = null;
        this.equippedLegId = null;
        this.spawnTimer = 0;
        this.spawnInterval = 2.2;

        // DOM 컨테이너 (v2 suffix 적용)
        this.domEnemies = document.getElementById('enemies-container-v2');
        this.domProjectiles = document.getElementById('projectiles-container-v2');
        this.domDamage = document.getElementById('damage-container-v2');
        this.domPlayerBaseBar = document.getElementById('hp-player-base-v2');
        this.domEnemyBaseBar = document.getElementById('hp-enemy-base-v2');
        this.domTargetLabel = document.getElementById('enemy-target-label-v2');
        this.domDistText = document.getElementById('battle-distance-v2');
        this.domStarsText = document.getElementById('battle-stars-v2');
        this.domDmText = document.getElementById('battle-dm-count-v2');
        this.domAnnouncement = document.getElementById('battle-announcement-v2');
        this.domAnnouncementText = document.getElementById('announcement-text-v2');
        this.fx = new BattleFx('entity-layer-v2');
        ensureSkillStyles();
    }

    // 전투 시작
    startBattle() {
        this.stopBattle();
        this.isActive = true;
        this.distanceTraveled = 0;
        this.stars = 0;
        this.monsterX = 150;
        this.playerBaseHp = 5000;
        this.currentTargetHp = 3500;
        this.maxTargetHp = 3500;
        this.midBaseSpawned = false;
        this.midBaseDestroyed = false;
        this.finalBaseSpawned = false;
        this.finalBaseDestroyed = false;
        this.enemies = [];
        this.allies = [];
        this.projectiles = [];
        this.spawnTimer = 0;
        this.phase2 = false;
        this.shieldHp = 0;
        this.shieldHitCd = 0;
        this.eggTimer = 0;
        this.pendingEggs = 0;
        this.droneTimer = DRONE.interval - 1.5;   // 첫 드론은 적이 보이면 곧 출격

        // 현재 장착 파츠 스탯 불러오기
        const stats = gameState.getEquippedStats();
        const equippedObjs = gameState.getEquippedObjects();
        this.equippedHeadId = equippedObjs.head ? equippedObjs.head.id : null;
        this.equippedBodyId = equippedObjs.body ? equippedObjs.body.id : null;
        this.equippedLegId = equippedObjs.leg ? equippedObjs.leg.id : null;
        this.curseTickTimer = 0;
        this.legSkillTimer = 0;
        this.maxPlayerHp = stats.hp;
        this.playerHp = stats.hp;
        this.playerDps = stats.dps;
        this.playerRange = stats.range;
        this.playerSpeed = stats.speed;
        this.attackType = equippedObjs.arm ? (equippedObjs.arm.attackType || 'melee') : 'melee';

        if (this.equippedBodyId === 'body_chimera') {
            setTimeout(() => {
                this.spawnAllyMinion(this.monsterX + 60);
                this.spawnAllyMinion(this.monsterX + 110);
            }, 600);
        }

        // 몬스터 비주얼 렌더링 및 위치 리셋
        monsterControllerV2.renderVisuals(equippedObjs);
        monsterControllerV2.updateHpBar(this.playerHp, this.maxPlayerHp);
        monsterControllerV2.setMonsterPosition(this.monsterX);
        monsterControllerV2.setState('walking');
        monsterControllerV2.resetSkills();
        monsterControllerV2.playIntro();   // 거대로봇: 출격 점프
        this.fx.start();
        if (this.equippedBodyId === 'body_hero') {
            // 흑마법 오라: 몸 앞 바닥에 마법진 (저주 범위 중앙)
            const [z0, z1] = HERO.curseZone;
            this.fx.setAura('curse', HERO_VFX.curseAura, () => [this.monsterX + 100 + (z0 + z1) / 2, 58]);
        }

        // 컨테이너 초기화
        if (this.domEnemies) this.domEnemies.innerHTML = '';
        if (this.domProjectiles) this.domProjectiles.innerHTML = '';
        if (this.domDamage) this.domDamage.innerHTML = '';
        
        if (this.domTargetLabel) this.domTargetLabel.textContent = '적 수비대 거점 HP (탐색 중)';
        this.updateHud();

        // 출격 알림
        this.showAnnouncement('DEPLOYED TO BATTLE // 거점 진격 개시!', 1500);

        this.lastTime = performance.now();
        this.loopId = requestAnimationFrame((t) => this.loop(t));
    }

    // 전투 정지 및 퇴각
    stopBattle() {
        this.isActive = false;
        if (this.fx) this.fx.stop();
        if (this.loopId) {
            cancelAnimationFrame(this.loopId);
            this.loopId = null;
        }
    }

    // 알림 메시지 표시 Helper
    showAnnouncement(text, duration = 2000) {
        if (!this.domAnnouncement || !this.domAnnouncementText) return;
        this.domAnnouncementText.textContent = text;
        this.domAnnouncement.classList.remove('hidden');
        setTimeout(() => {
            if (this.domAnnouncement) this.domAnnouncement.classList.add('hidden');
        }, duration);
    }

    // HUD 정보 갱신
    updateHud() {
        if (this.domDistText) this.domDistText.textContent = `${Math.round(this.distanceTraveled)}m`;
        if (this.domStarsText) {
            if (this.stars === 2) this.domStarsText.textContent = '★★';
            else if (this.stars === 1) this.domStarsText.textContent = '★☆';
            else this.domStarsText.textContent = '☆☆';
        }
        if (this.domDmText) this.domDmText.textContent = gameState.darkMatter.toLocaleString();
        if (this.domPlayerBaseBar) {
            const pct = Math.max(0, (this.playerBaseHp / this.maxPlayerBaseHp) * 100);
            this.domPlayerBaseBar.style.width = `${pct}%`;
        }
        if (this.domEnemyBaseBar) {
            const pct = Math.max(0, (this.currentTargetHp / this.maxTargetHp) * 100);
            this.domEnemyBaseBar.style.width = `${pct}%`;
        }
    }

    // 데미지 팝업 텍스트 생성
    createDamagePopup(x, y, damage, isCrit = false) {
        if (!this.domDamage) return;
        const el = document.createElement('div');
        el.className = 'damage-popup';
        el.style.left = `${x}px`;
        el.style.bottom = `${y}px`;
        if (typeof damage === 'string') {
            el.textContent = damage;
            if (damage.includes('저주') || damage.includes('흑마법')) {
                el.style.color = '#cc33ff';
                el.style.textShadow = '0 0 8px #9900ff';
            } else if (damage.includes('REGEN') || damage.includes('회복')) {
                el.style.color = '#00ff66';
                el.style.textShadow = '0 0 8px #00ff66';
            } else if (damage.includes('포자') || damage.includes('점액')) {
                el.style.color = '#aaff00';
                el.style.textShadow = '0 0 8px #66aa00';
            } else if (damage.includes('지진') || damage.includes('분쇄')) {
                el.style.color = '#ff9900';
                el.style.textShadow = '0 0 8px #cc6600';
            }
        } else {
            el.textContent = Math.round(damage);
            if (isCrit) {
                el.style.color = '#ffcc00';
                el.style.fontSize = '22px';
                el.textContent = `CRIT! ${Math.round(damage)}`;
            }
        }
        this.domDamage.appendChild(el);
        setTimeout(() => el.remove(), 800);
    }

    // [세뇌 스마트 구속구]: 적 보병 소멸 시 아군 미니언 징집 소환
    // kind 'baby_kaiju': 거대괴수 산란으로 부화한 새끼 괴수 (리그에서 구운 스프라이트)
    spawnAllyMinion(startX, kind = 'mind') {
        if (!this.domEnemies) return;
        const baby = kind === 'baby_kaiju';
        const maxHp = baby ? BABY.hp : 350;
        const dps = baby ? BABY.dps : 17.5; // 세뇌 미니언은 적 보병 데미지의 절반
        const allyId = `ally_${Date.now()}_${Math.random()}`;

        const el = document.createElement('div');
        el.className = baby ? 'ally-minion baby-kaiju-v2' : 'ally-minion';
        el.style.left = `${startX}px`;

        const hpBar = document.createElement('div');
        hpBar.className = 'ally-hp';
        hpBar.style.width = '100%';
        if (baby) {   // 새끼 괴수는 산성 초록 체력바
            hpBar.style.background = '#aaff28';
            hpBar.style.boxShadow = '0 0 6px #aaff28';
        }
        el.appendChild(hpBar);

        this.domEnemies.appendChild(el);

        this.allies.push({
            id: allyId,
            kind,
            x: startX,
            hp: maxHp,
            maxHp: maxHp,
            dps: dps,
            speed: this.playerSpeed * (baby ? BABY.speedMul : 0.55),
            dom: el,
            hpBar: hpBar
        });

        this.createDamagePopup(startX, 180, baby ? '🥚 새끼 괴수 부화!' : '★ 세뇌 징집! (MIND CONTROL)', false);
    }

    // ---- 팩션 스킬 ----
    // 몬스터가 받는 피해: 실드가 있으면 먼저 흡수
    damagePlayer(amount, dt) {
        if (this.shieldHp > 0) {
            const absorbed = Math.min(this.shieldHp, amount);
            this.shieldHp -= absorbed;
            amount -= absorbed;
            this.shieldHitCd -= dt;
            if (this.shieldHitCd <= 0) {
                monsterControllerV2.shieldHit();
                this.shieldHitCd = 0.3;
            }
            if (this.shieldHp <= 0) {
                monsterControllerV2.breakShield();
                this.createDamagePopup(this.monsterX + 40, 200, '⬢ 실드 파괴!', false);
            }
        }
        this.playerHp -= amount;
        monsterControllerV2.updateHpBar(this.playerHp, this.maxPlayerHp);
    }

    // [합성괴인 머리] 체력 50% 이하 시 자동 거대화 및 실드 전개 (전투당 1회)
    enterPhase2() {
        this.phase2 = true;
        this.shieldHp = this.maxPlayerHp * PHASE2.shieldRatio;
        this.playerDps *= PHASE2.dpsMul;
        monsterControllerV2.enterPhase2();
        this.showAnnouncement('2PHASE // 자동 거대화 및 실드 전개!', 2000);
        this.createDamagePopup(this.monsterX + 40, 210, '⬢ 실드 전개 (최대 체력 30%)', false);
    }

    // [타락 히어로 머리] 세뇌 파동: 시전 동작 → 보라 구체가 쓰러진 적 자리로 → 소용돌이 속에서 아군으로
    recruit(x) {
        const tx = x + 38;
        monsterControllerV2.playCast(() => {
            if (!this.isActive) return;
            const from = monsterControllerV2.getSocketPoint('hand', 'armF') || { x: this.monsterX + 90, bottom: 130 };
            this.fx.launchOrb(from, () => ({ x: tx, b: 90 }), HERO_ORB.color, HERO_ORB.dur, () => {
                this.fx.play(HERO_VFX.mindConvert, tx, 58);
                setTimeout(() => {
                    if (this.isActive && !this.finalBaseDestroyed) this.spawnAllyMinion(x);
                }, 350);
            });
        });
    }

    // [타락 히어로 팔] 어둠 파동: 칼끝에서 초승달 파동이 앞으로 날아가며 지나가는 적 전부에게 피해 + 감속
    launchDarkWave(fromX, dmg, isCrit) {
        const hit = new Set();
        this.fx.launchWave({
            x: fromX, b: 88, range: Math.max(this.playerRange, HERO.waveRange), speed: HERO_WAVE.speed,
            h: HERO_WAVE.h, color: HERO_WAVE.color,
            onPass: (x0, x1) => {
                [...this.enemies].forEach(e => {
                    const cx = e.x + (e.isBuilding ? 45 : 38);
                    if (cx < x0 || cx > x1 || hit.has(e)) return;
                    hit.add(e);
                    this.fx.play(HERO_VFX.waveHit, cx, 88);
                    if (!e.isBuilding) this.slowEnemy(e);
                    this.dealDamageToEnemy(e, dmg, isCrit, { knock: 0.6 });
                });
            }
        });
    }

    slowEnemy(e) {
        e.slowT = HERO.slowSec;
        this.updateEnemyFilter(e);
    }

    // 적 외형 상태: 감속 중이면 보라 기운 (피격 섬광 중에는 섬광 우선)
    updateEnemyFilter(e) {
        if (!e.dom || e.flashing) return;
        e.dom.style.filter = e.slowT > 0 ? 'drop-shadow(0 0 6px #b050ff) saturate(0.55) brightness(0.9)' : '';
    }

    // 피격 반응: 섬광 + 넉백 (+ 강한 타격은 히트스톱)
    hitReact(e, react) {
        if (react.stop) gameTime.hitStop(HIT_REACT.stopSec);
        if (!e.dom) return;
        e.flashing = true;
        e.dom.style.filter = 'brightness(2.4) saturate(0.2)';
        setTimeout(() => { e.flashing = false; this.updateEnemyFilter(e); }, HIT_REACT.flashMs);
        if (!e.isBuilding && react.knock) {
            e.x += HIT_REACT.knockPx * react.knock;
            e.dom.style.left = `${e.x}px`;
        }
    }

    // [거대괴수 몸통] 이동 중 발밑에 알을 낳고, 부화하면 새끼 괴수(아군)
    updateEggs(dt, moving) {
        if (!moving) return;
        this.eggTimer += dt;
        if (this.eggTimer < EGG.interval) return;
        this.eggTimer = 0;
        const babies = this.allies.filter(a => a.kind === 'baby_kaiju').length;
        if (babies + this.pendingEggs >= EGG.maxBabies) return;
        const x = this.monsterX + 12;
        this.pendingEggs += 1;
        this.fx.addEgg(x, EGG.hatchSec, () => {
            this.pendingEggs -= 1;
            if (this.isActive && !this.finalBaseDestroyed) this.spawnAllyMinion(x - 30, 'baby_kaiju');
        });
    }

    // [거대로봇 머리] 사정권에 적이 있으면 스웜 드론 출격 → 목표에 돌진 폭발 (범위 피해)
    updateDrones(dt) {
        this.droneTimer += dt;
        if (this.droneTimer < DRONE.interval) return;
        const ahead = this.enemies.filter(e => e.x - this.monsterX < DRONE.range && e.x > this.monsterX);
        if (ahead.length === 0) return;
        this.droneTimer = 0;
        const from = monsterControllerV2.getSocketPoint('droneBay', 'canister') || { x: this.monsterX + 40, bottom: 230 };
        for (let i = 0; i < DRONE.count; i++) {
            let target = ahead.sort((a, b) => a.x - b.x)[i % ahead.length];
            this.fx.launchDrone({
                from: { x: from.x, b: from.bottom },
                index: i,
                getTarget: () => {
                    if (!this.enemies.includes(target)) {
                        target = this.enemies.filter(e => e.x > this.monsterX).sort((a, b) => a.x - b.x)[0];
                    }
                    return target ? { x: target.x + (target.isBuilding ? 45 : 38), b: target.isBuilding ? 130 : 90 } : null;
                },
                onHit: pos => {
                    const dmg = this.playerDps * DRONE.dmgMul;
                    [...this.enemies].forEach(e => {
                        const d = Math.abs(e.x + (e.isBuilding ? 45 : 38) - pos.x);
                        if (d < DRONE.splash) this.dealDamageToEnemy(e, e === target ? dmg : dmg * 0.5, false, { knock: 0.8 });
                    });
                }
            });
        }
        this.createDamagePopup(this.monsterX + 40, 230, '🛸 스웜 드론 출격!', false);
    }

    // 적 쫄몹 연속 소환 로직
    spawnMinion() {
        if (!this.domEnemies) return;
        
        const maxHp = 350;
        const dps = 35;
        const enemyId = `minion_${Date.now()}_${Math.random()}`;
        
        const activeBuilding = this.enemies.find(e => e.isBuilding);
        const startX = activeBuilding ? activeBuilding.x - 30 : (window.innerWidth > 1000 ? 980 : 700);

        const el = document.createElement('div');
        el.className = 'enemy-entity';
        el.style.left = `${startX}px`;

        const hpTrack = document.createElement('div');
        hpTrack.className = 'enemy-hp-track';
        const hpBar = document.createElement('div');
        hpBar.className = 'enemy-hp';
        hpBar.style.width = '100%';
        hpTrack.appendChild(hpBar);
        el.appendChild(hpTrack);

        this.domEnemies.appendChild(el);

        this.enemies.push({
            id: enemyId,
            x: startX,
            hp: maxHp,
            maxHp: maxHp,
            dps: dps,
            speed: 75 + Math.random() * 25,
            isBuilding: false,
            dom: el,
            hpBar: hpBar
        });
    }

    // 중간 거점 요새 건물 출현
    spawnMidBase() {
        if (this.midBaseSpawned || !this.domEnemies) return;
        this.midBaseSpawned = true;
        
        const enemyId = 'building_mid_base';
        const startX = window.innerWidth > 1000 ? 880 : 650;
        const maxHp = 3800;
        this.currentTargetHp = maxHp;
        this.maxTargetHp = maxHp;

        if (this.domTargetLabel) this.domTargetLabel.textContent = '[중간 거점 요새] HP';

        const el = document.createElement('div');
        el.className = 'building-entity';
        el.setAttribute('data-label', 'INTERMEDIATE FORT');
        el.style.left = `${startX}px`;

        const hpBar = document.createElement('div');
        hpBar.className = 'enemy-hp';
        hpBar.style.width = '100%';
        el.appendChild(hpBar);

        this.domEnemies.appendChild(el);

        this.enemies.push({
            id: enemyId,
            x: startX,
            hp: maxHp,
            maxHp: maxHp,
            dps: 50,
            speed: 0,
            isBuilding: true,
            isFinal: false,
            dom: el,
            hpBar: hpBar
        });

        this.showAnnouncement('WARNING // 중간 거점 요새 출현! 배경을 멈추고 직접 돌격하라!', 2500);
        this.updateHud();
    }

    // 최종 핵심 기지 건물 출현
    spawnFinalBase() {
        if (this.finalBaseSpawned || !this.domEnemies) return;
        this.finalBaseSpawned = true;
        
        const enemyId = 'building_final_base';
        const startX = window.innerWidth > 1000 ? 850 : 620;
        const maxHp = 7000;
        this.currentTargetHp = maxHp;
        this.maxTargetHp = maxHp;

        if (this.domTargetLabel) this.domTargetLabel.textContent = '[최종 핵심 기지] HP';

        const el = document.createElement('div');
        el.className = 'building-entity final-base';
        el.setAttribute('data-label', 'FINAL HEADQUARTERS');
        el.style.left = `${startX}px`;

        const hpBar = document.createElement('div');
        hpBar.className = 'enemy-hp';
        hpBar.style.width = '100%';
        el.appendChild(hpBar);

        this.domEnemies.appendChild(el);

        this.enemies.push({
            id: enemyId,
            x: startX,
            hp: maxHp,
            maxHp: maxHp,
            dps: 100,
            speed: 0,
            isBuilding: true,
            isFinal: true,
            dom: el,
            hpBar: hpBar
        });

        this.showAnnouncement('DANGER // 최종 핵심 기지 출현! 배경을 멈추고 진격하여 분쇄하라!', 2500);
        this.updateHud();
    }

    // 공격 이펙트 / 투사체 생성
    // hitScale: 기본 1타 대비 피해 비율 (리그 캐논은 연사 1발당 0.2)
    fireAttack(targetEnemy, hitScale = 1) {
        if (!targetEnemy || !this.domProjectiles) return;

        // 거대로봇 리그면 실제 총구 위치에서 발사, 아니면 기존 고정 위치
        const muzzle = monsterControllerV2.getMuzzlePoint();
        const monsterFireX = muzzle ? muzzle.x : this.monsterX + 90;
        const targetX = targetEnemy.x;
        const dmg = this.playerDps * 0.5 * hitScale;
        const isCrit = Math.random() < 0.2;
        const finalDmg = isCrit ? dmg * 1.5 : dmg;

        if (this.attackType === 'laser') {
            const beam = document.createElement('div');
            beam.style.position = 'absolute';
            if (muzzle) {
                // 총구에서 적 몸통 중앙을 향해 비스듬히 (적 76x76 @bottom 52, 거점 90x150 @bottom 60)
                const aimX = targetX + (targetEnemy.isBuilding ? 45 : 38);
                const aimBottom = targetEnemy.isBuilding ? 135 : 90;
                const dx = Math.max(10, aimX - muzzle.x);
                const dy = muzzle.bottom - aimBottom;
                beam.style.bottom = `${muzzle.bottom - 3}px`;
                beam.style.left = `${muzzle.x}px`;
                beam.style.width = `${Math.hypot(dx, dy)}px`;
                beam.style.transformOrigin = '0 50%';
                beam.style.transform = `rotate(${Math.atan2(dy, dx) * 180 / Math.PI}deg)`;
            } else {
                beam.style.bottom = '120px';
                beam.style.left = `${monsterFireX}px`;
                beam.style.width = `${Math.max(10, targetX - monsterFireX)}px`;
            }
            beam.style.height = '6px';
            // 컨셉 시트의 거대로봇 '초장거리 포격' 색 (보라 광선)
            beam.style.background = 'linear-gradient(90deg, #c45cff, #ffffff)';
            beam.style.boxShadow = '0 0 15px #c45cff';
            beam.style.zIndex = '40';
            this.domProjectiles.appendChild(beam);
            setTimeout(() => beam.remove(), 150);

            this.dealDamageToEnemy(targetEnemy, finalDmg, isCrit, { knock: 0.3 });
        }
        else if (this.attackType === 'wave') {
            // 어둠 파동: 칼을 휘두른 타격 순간 파동 발사 (피해는 파동이 적을 지날 때)
            this.launchDarkWave(monsterFireX, finalDmg, isCrit);
        }
        else if (this.attackType === 'missile') {
            const m = document.createElement('div');
            m.className = 'projectile';
            m.style.left = `${monsterFireX}px`;
            m.style.bottom = muzzle ? `${muzzle.bottom - 5}px` : '130px';
            m.style.background = '#ffcc00';
            m.style.boxShadow = '0 0 12px #ffcc00';
            this.domProjectiles.appendChild(m);

            setTimeout(() => {
                m.remove();
                this.dealDamageToEnemy(targetEnemy, finalDmg * 1.2, isCrit);
                this.enemies.forEach(other => {
                    if (other !== targetEnemy && Math.abs(other.x - targetEnemy.x) < 90) {
                        this.dealDamageToEnemy(other, finalDmg * 0.5, false);
                    }
                });
            }, 250);
        }
        else {
            const slash = document.createElement('div');
            slash.style.position = 'absolute';
            slash.style.left = `${targetX - 20}px`;
            slash.style.bottom = '80px';
            slash.style.width = '40px';
            slash.style.height = '60px';
            const hitColor = monsterControllerV2.getHitColor() || '#ff0055';  // 리그 캐릭터별 타격 색
            slash.style.borderRight = `6px solid ${hitColor}`;
            slash.style.borderRadius = '50%';
            slash.style.transform = 'rotate(20deg)';
            slash.style.boxShadow = `0 0 15px ${hitColor}`;
            this.domProjectiles.appendChild(slash);
            setTimeout(() => slash.remove(), 200);

            const hitVfx = HIT_VFX[monsterControllerV2.getCharacterId()];
            if (hitVfx) this.fx.play(hitVfx, targetX + (targetEnemy.isBuilding ? 45 : 38), targetEnemy.isBuilding ? 130 : 95);
            this.dealDamageToEnemy(targetEnemy, finalDmg, isCrit, { knock: 1, stop: hitScale >= 1 });
        }
    }

    // 적 또는 거점 건물에 데미지 적용 및 소멸 처리
    // react: { knock(넉백 배율), stop(히트스톱) } — 몬스터/스킬의 직접 타격일 때만 (지속 피해는 생략)
    dealDamageToEnemy(enemy, damage, isCrit, react = null) {
        enemy.hp -= damage;
        if (react && enemy.hp > 0) this.hitReact(enemy, react);
        const popupY = enemy.isBuilding ? 160 + Math.random() * 40 : 110 + Math.random() * 30;
        this.createDamagePopup(enemy.x, popupY, damage, isCrit);

        if (enemy.hpBar) {
            const pct = Math.max(0, (enemy.hp / enemy.maxHp) * 100);
            enemy.hpBar.style.width = `${pct}%`;
        }

        if (enemy.isBuilding) {
            this.currentTargetHp = Math.max(0, enemy.hp);
            this.updateHud();
        }

        if (enemy.hp <= 0) {
            if (enemy.dom) enemy.dom.remove();
            this.enemies = this.enemies.filter(e => e.id !== enemy.id);

            if (enemy.isBuilding) {
                if (enemy.isFinal) {
                    this.finalBaseDestroyed = true;
                    this.stars = 2;
                    gameState.addDarkMatter(2500);
                    this.updateHud();
                    
                    this.enemies.forEach(e => {
                        if (!e.isBuilding && e.dom) e.dom.remove();
                    });
                    this.enemies = this.enemies.filter(e => e.isBuilding);

                    monsterControllerV2.setState('victory');

                    this.showAnnouncement('★★ MISSION VICTORY!! 최종 핵심 기지 완전 분쇄!', 4000);
                    setTimeout(() => {
                        this.stopBattle();
                        document.getElementById('btn-battle-leave-v2')?.click();
                    }, 4500);
                } else {
                    this.midBaseDestroyed = true;
                    this.stars = Math.max(1, this.stars);
                    gameState.addDarkMatter(800);
                    if (this.domTargetLabel) this.domTargetLabel.textContent = '적 수비대 거점 HP (진격 중)';
                    this.showAnnouncement('★ 중간 거점 요새 분쇄 완료! 배경 스크롤 및 진격 재개!', 2000);
                    this.updateHud();
                }
            } else {
                gameState.addDarkMatter(15);
                this.updateHud();

                if (this.equippedHeadId === 'head_hero' && Math.random() < HERO.recruitChance) {
                    this.recruit(enemy.x);
                }
            }
        }
    }

    // 메인 게임 루프
    loop(timestamp) {
        if (!this.isActive) return;
        const dt = gameTime.frozen(timestamp) ? 0 : (timestamp - this.lastTime) / 1000;   // 히트스톱 중 정지
        this.lastTime = timestamp;

        if (this.finalBaseDestroyed) {
            this.loopId = requestAnimationFrame((t) => this.loop(t));
            return;
        }

        if (!this.finalBaseDestroyed) {
            this.spawnTimer += dt;
            if (this.spawnTimer >= this.spawnInterval && this.enemies.filter(e => !e.isBuilding).length < 6) {
                this.spawnTimer = 0;
                this.spawnMinion();
            }
        }

        if (this.equippedHeadId === 'head_mutant' && this.playerHp < this.maxPlayerHp) {
            const regenAmount = this.maxPlayerHp * 0.02 * dt;
            this.playerHp = Math.min(this.maxPlayerHp, this.playerHp + regenAmount);
            monsterControllerV2.updateHpBar(this.playerHp, this.maxPlayerHp);

            this.regenPopupTimer = (this.regenPopupTimer || 0) + dt;
            if (this.regenPopupTimer >= 1.0) {
                this.regenPopupTimer = 0;
                this.createDamagePopup(this.monsterX + 40, 180, `+${Math.round(this.maxPlayerHp * 0.02)} REGEN`, false);
            }
        }

        const monsterFrontX = this.monsterX + 100;
        if (this.equippedBodyId === 'body_hero') {
            this.curseTickTimer = (this.curseTickTimer || 0) + dt;
            const tickCursePopup = this.curseTickTimer >= HERO.curseTick;
            if (tickCursePopup) {
                this.curseTickTimer = 0;
                this.fx.pulseAura('curse');
            }

            [...this.enemies].forEach(enemy => {
                const dist = enemy.x - monsterFrontX;
                if (dist >= HERO.curseZone[0] && dist <= HERO.curseZone[1]) {
                    enemy.hp -= HERO.curseDps * dt;
                    if (enemy.hpBar) {
                        enemy.hpBar.style.width = `${Math.max(0, (enemy.hp / enemy.maxHp) * 100)}%`;
                    }
                    if (tickCursePopup) {
                        // 흑마법 틱: 적 발밑에서 보라 기둥
                        this.fx.play(HERO_VFX.curseTick, enemy.x + (enemy.isBuilding ? 45 : 38), 58);
                        this.createDamagePopup(enemy.x, 140, `☠ -${Math.round(HERO.curseDps * HERO.curseTick)}`, false);
                    }
                    if (enemy.hp <= 0) {
                        this.dealDamageToEnemy(enemy, 0, false);
                    }
                }
            });
        }

        if (this.equippedLegId === 'leg_mutant') {
            this.legSkillTimer = (this.legSkillTimer || 0) + dt;
            const tickSporePopup = this.legSkillTimer >= 0.75;
            if (tickSporePopup) this.legSkillTimer = 0;

            [...this.enemies].forEach(enemy => {
                const dist = enemy.x - monsterFrontX;
                if (dist >= 0 && dist <= 220) {
                    enemy.speed = Math.min(enemy.speed, 35);
                    enemy.hp -= 35 * dt;
                    if (enemy.hpBar) {
                        enemy.hpBar.style.width = `${Math.max(0, (enemy.hp / enemy.maxHp) * 100)}%`;
                    }
                    if (tickSporePopup) {
                        this.createDamagePopup(enemy.x, 130, '☣ 전방 포자 살포', false);
                    }
                    if (enemy.hp <= 0) {
                        this.dealDamageToEnemy(enemy, 0, false);
                    }
                }
            });
        }

        if (this.equippedLegId === 'leg_chimera') {
            this.legSkillTimer = (this.legSkillTimer || 0) + dt;
            const tickQuakePopup = this.legSkillTimer >= 0.75;
            if (tickQuakePopup) this.legSkillTimer = 0;

            [...this.enemies].forEach(enemy => {
                const dist = enemy.x - monsterFrontX;
                if (dist >= -20 && dist <= 200) {
                    enemy.hp -= 40 * dt;
                    if (enemy.hpBar) {
                        enemy.hpBar.style.width = `${Math.max(0, (enemy.hp / enemy.maxHp) * 100)}%`;
                    }
                    if (tickQuakePopup) {
                        this.createDamagePopup(enemy.x, 130, '💥 지진 분쇄 -28', false);
                    }
                    if (enemy.hp <= 0) {
                        this.dealDamageToEnemy(enemy, 0, false);
                    }
                }
            });
        }

        // 팩션 스킬
        if (this.equippedBodyId === 'body_mutant') {
            this.updateEggs(dt, monsterControllerV2.currentState !== 'attacking');
        }
        if (this.equippedHeadId === 'head_mech') {
            this.updateDrones(dt);
        }
        if (!this.phase2 && this.equippedHeadId === 'head_chimera' && this.playerHp > 0
            && this.playerHp <= this.maxPlayerHp * PHASE2.hpRatio) {
            this.enterPhase2();
        }

        let closestEnemy = null;
        let minDistance = Infinity;

        this.enemies.forEach(enemy => {
            const dist = enemy.x - monsterFrontX;
            if (dist < minDistance) {
                minDistance = dist;
                closestEnemy = enemy;
            }
        });

        const activeBuilding = this.enemies.find(e => e.isBuilding);

        if (closestEnemy && minDistance <= this.playerRange) {
            monsterControllerV2.setState('attacking');

            // 공격 애니메이션의 타격 시점(리그 이벤트/페이퍼돌 휘두르기 정점)에 맞춰 발사
            const hit = monsterControllerV2.consumeAttackHit();
            if (hit > 0) this.fireAttack(closestEnemy, hit);

            if (minDistance <= 70) {
                this.damagePlayer(closestEnemy.dps * dt, dt);
            }
        } else if (activeBuilding) {
            monsterControllerV2.setState('walking-forward');
            this.monsterX += this.playerSpeed * dt;
            monsterControllerV2.setMonsterPosition(this.monsterX);
        } else {
            monsterControllerV2.setState('walking');

            if (this.monsterX > 150) {
                this.monsterX = Math.max(150, this.monsterX - 120 * dt);
                monsterControllerV2.setMonsterPosition(this.monsterX);
            }

            if (this.distanceTraveled < this.maxDistance) {
                this.distanceTraveled += this.playerSpeed * dt * 0.4;
                this.updateHud();

                if (this.distanceTraveled >= 450 && !this.midBaseSpawned && !this.midBaseDestroyed) {
                    this.spawnMidBase();
                } else if (this.distanceTraveled >= 900 && !this.finalBaseSpawned) {
                    this.spawnFinalBase();
                }
            }
        }

        this.allies.forEach(ally => {
            let closestEnemyToAlly = null;
            let minAllyDist = Infinity;

            this.enemies.forEach(enemy => {
                const dist = enemy.x - ally.x;
                if (dist >= -35 && dist < minAllyDist) {
                    minAllyDist = dist;
                    closestEnemyToAlly = enemy;
                }
            });

            const hitRange = (closestEnemyToAlly && closestEnemyToAlly.isBuilding) ? 110 : 65;
            if (closestEnemyToAlly && minAllyDist <= hitRange) {
                this.dealDamageToEnemy(closestEnemyToAlly, ally.dps * dt, false);

                if (closestEnemyToAlly.isBuilding) {
                    ally.hp -= 25 * dt;
                    if (ally.hpBar) {
                        ally.hpBar.style.width = `${Math.max(0, (ally.hp / ally.maxHp) * 100)}%`;
                    }
                    if (ally.hp <= 0) {
                        if (ally.dom) ally.dom.remove();
                        this.allies = this.allies.filter(a => a.id !== ally.id);
                    }
                }
            } else if (closestEnemyToAlly || ally.x < this.monsterX + 180) {
                ally.x += ally.speed * dt;
                if (ally.dom) ally.dom.style.left = `${ally.x}px`;
            }
        });

        this.enemies.forEach(enemy => {
            if (enemy.slowT > 0) {
                enemy.slowT -= dt;
                if (enemy.slowT <= 0) this.updateEnemyFilter(enemy);
            }
            if (!enemy.isBuilding) {
                const targetAlly = this.allies.find(a => enemy.x - a.x <= 65 && enemy.x - a.x >= -35);
                if (targetAlly) {
                    targetAlly.hp -= enemy.dps * dt;
                    if (targetAlly.hpBar) {
                        targetAlly.hpBar.style.width = `${Math.max(0, (targetAlly.hp / targetAlly.maxHp) * 100)}%`;
                    }
                    if (targetAlly.hp <= 0) {
                        if (targetAlly.dom) targetAlly.dom.remove();
                        this.allies = this.allies.filter(a => a.id !== targetAlly.id);
                    }
                } else if (enemy.x > monsterFrontX + 30) {
                    enemy.x -= enemy.speed * (enemy.slowT > 0 ? HERO.slowMul : 1) * dt;   // 어둠 파동 감속
                    if (enemy.dom) enemy.dom.style.left = `${enemy.x}px`;
                } else {
                    this.damagePlayer(enemy.dps * dt, dt);
                }
            }
        });

        if (this.playerHp <= 0 || this.playerBaseHp <= 0) {
            this.showAnnouncement('DEFEAT... // 몬스터가 쓰러졌습니다!', 3000);
            setTimeout(() => {
                this.stopBattle();
                document.getElementById('btn-battle-leave-v2')?.click();
            }, 2500);
            return;
        }

        this.loopId = requestAnimationFrame((t) => this.loop(t));
    }
}

export const battleEngineV2 = new BattleEngine();
