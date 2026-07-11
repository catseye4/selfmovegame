/* ==========================================================================
   PROJECT: MAD OVERLORD // BATTLE ENGINE (CONTINUOUS DISTANCE & BASE DESTRUCTION)
   ========================================================================== */

import { gameState } from './state.js';
import { monsterController } from './monster.js';

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
        this.attackHitTriggered = false; // 공격 모션 타격 프레임 중복 발동 방지 플래그
        this.spawnTimer = 0;
        this.spawnInterval = 2.2; // 쫄몹 연속 소환 주기

        // DOM 컨테이너
        this.domEnemies = document.getElementById('enemies-container');
        this.domProjectiles = document.getElementById('projectiles-container');
        this.domDamage = document.getElementById('damage-container');
        this.domPlayerBaseBar = document.getElementById('hp-player-base');
        this.domEnemyBaseBar = document.getElementById('hp-enemy-base');
        this.domTargetLabel = document.getElementById('enemy-target-label');
        this.domDistText = document.getElementById('battle-distance');
        this.domStarsText = document.getElementById('battle-stars');
        this.domDmText = document.getElementById('battle-dm-count');
        this.domAnnouncement = document.getElementById('battle-announcement');
        this.domAnnouncementText = document.getElementById('announcement-text');
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
        this.attackHitTriggered = false;
        this.spawnTimer = 0;

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
        monsterController.renderVisuals(equippedObjs);
        monsterController.updateHpBar(this.playerHp, this.maxPlayerHp);
        monsterController.setMonsterPosition(this.monsterX);
        monsterController.setState('walking');

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
    spawnAllyMinion(startX) {
        if (!this.domEnemies) return;
        const maxHp = 350;
        const dps = 17.5; // 적 보병 데미지의 절반
        const allyId = `ally_${Date.now()}_${Math.random()}`;

        const el = document.createElement('div');
        el.className = 'ally-minion';
        el.style.left = `${startX}px`;

        const hpBar = document.createElement('div');
        hpBar.className = 'ally-hp';
        hpBar.style.width = '100%';
        el.appendChild(hpBar);

        this.domEnemies.appendChild(el);

        this.allies.push({
            id: allyId,
            x: startX,
            hp: maxHp,
            maxHp: maxHp,
            dps: dps,
            speed: this.playerSpeed * 0.55,
            dom: el,
            hpBar: hpBar
        });

        this.createDamagePopup(startX, 180, '★ 세뇌 징집! (MIND CONTROL)', false);
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

        // 고정폭 HP 트랙 + 내부 체력 채움 (채움 폭을 %로 제어)
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
    fireAttack(targetEnemy) {
        if (!targetEnemy || !this.domProjectiles) return;
        
        const monsterFireX = this.monsterX + 90; // 현재 몬스터 위치 우측 발사 지점
        const targetX = targetEnemy.x;
        const dmg = this.playerDps * 0.5;
        const isCrit = Math.random() < 0.2;
        const finalDmg = isCrit ? dmg * 1.5 : dmg;

        if (this.attackType === 'laser') {
            const beam = document.createElement('div');
            beam.style.position = 'absolute';
            beam.style.bottom = '120px';
            beam.style.left = `${monsterFireX}px`;
            beam.style.width = `${Math.max(10, targetX - monsterFireX)}px`;
            beam.style.height = '6px';
            beam.style.background = 'linear-gradient(90deg, #00ccff, #ffffff)';
            beam.style.boxShadow = '0 0 15px #00ccff';
            beam.style.zIndex = '40';
            this.domProjectiles.appendChild(beam);
            setTimeout(() => beam.remove(), 150);

            this.dealDamageToEnemy(targetEnemy, finalDmg, isCrit);
        } 
        else if (this.attackType === 'missile') {
            const m = document.createElement('div');
            m.className = 'projectile';
            m.style.left = `${monsterFireX}px`;
            m.style.bottom = '130px';
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
            slash.style.borderRight = '6px solid #ff0055';
            slash.style.borderRadius = '50%';
            slash.style.transform = 'rotate(20deg)';
            slash.style.boxShadow = '0 0 15px #ff0055';
            this.domProjectiles.appendChild(slash);
            setTimeout(() => slash.remove(), 200);

            this.dealDamageToEnemy(targetEnemy, finalDmg, isCrit);
        }
    }

    // 적 또는 거점 건물에 데미지 적용 및 소멸 처리
    dealDamageToEnemy(enemy, damage, isCrit) {
        enemy.hp -= damage;
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
                    
                    // 최종 핵심 기지가 파괴되었으므로 남은 일반 적 쫄몹 모두 전멸 처리
                    this.enemies.forEach(e => {
                        if (!e.isBuilding && e.dom) e.dom.remove();
                    });
                    this.enemies = this.enemies.filter(e => e.isBuilding);

                    // ★ 승리 포즈 발동: 정면을 바라보며 만세 스쿼트 포효!
                    monsterController.setState('victory');

                    this.showAnnouncement('★★ MISSION VICTORY!! 최종 핵심 기지 완전 분쇄!', 4000);
                    setTimeout(() => {
                        this.stopBattle();
                        document.getElementById('btn-battle-leave')?.click();
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

                // [세뇌 스마트 구속구 기믹 작동]: 적 보병 소멸 시 확률적으로 즉시 아군 미니언 징집
                if (this.equippedHeadId === 'head_hero' && Math.random() < 0.35) {
                    this.spawnAllyMinion(enemy.x);
                }
            }
        }
    }

    // 메인 게임 루프
    loop(timestamp) {
        if (!this.isActive) return;
        const dt = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;

        // 최종 핵심 기지가 파괴된 승리 상태라면 승리 모션 유지(추가 행동 전환 없음)
        if (this.finalBaseDestroyed) {
            this.loopId = requestAnimationFrame((t) => this.loop(t));
            return;
        }

        // 1. 적 쫄몹 연속 소환 주기 처리 (최종 거점이 파괴되지 않았을 때만 소환!)
        if (!this.finalBaseDestroyed) {
            this.spawnTimer += dt;
            if (this.spawnTimer >= this.spawnInterval && this.enemies.filter(e => !e.isBuilding).length < 6) {
                this.spawnTimer = 0;
                this.spawnMinion();
            }
        }

        // [돌연변이 포자 뿔 (head_mutant)]: 전투 중 초당 최대 체력의 2%씩 지속 재생
        if (this.equippedHeadId === 'head_mutant' && this.playerHp < this.maxPlayerHp) {
            const regenAmount = this.maxPlayerHp * 0.02 * dt;
            this.playerHp = Math.min(this.maxPlayerHp, this.playerHp + regenAmount);
            monsterController.updateHpBar(this.playerHp, this.maxPlayerHp);

            this.regenPopupTimer = (this.regenPopupTimer || 0) + dt;
            if (this.regenPopupTimer >= 1.0) {
                this.regenPopupTimer = 0;
                this.createDamagePopup(this.monsterX + 40, 180, `+${Math.round(this.maxPlayerHp * 0.02)} REGEN`, false);
            }
        }

        // [흑마법 룬 갑옷 (body_hero)]: 전방 180px 이내 적 전체에게 매초 흑마법 저주 지속 데미지(DoT)
        const monsterFrontX = this.monsterX + 100;
        if (this.equippedBodyId === 'body_hero') {
            this.curseTickTimer = (this.curseTickTimer || 0) + dt;
            const tickCursePopup = this.curseTickTimer >= 0.65;
            if (tickCursePopup) this.curseTickTimer = 0;

            [...this.enemies].forEach(enemy => {
                const dist = enemy.x - monsterFrontX;
                if (dist >= -40 && dist <= 180) {
                    enemy.hp -= 48 * dt;
                    if (enemy.hpBar) {
                        enemy.hpBar.style.width = `${Math.max(0, (enemy.hp / enemy.maxHp) * 100)}%`;
                    }
                    if (tickCursePopup) {
                        this.createDamagePopup(enemy.x, 140, '☠ 흑마법 -31', false);
                    }
                    if (enemy.hp <= 0) {
                        this.dealDamageToEnemy(enemy, 0, false);
                    }
                }
            });
        }

        // [점액질 기동 포자 (leg_mutant)]: 전방(0~220px)으로 독성 점액 포자 살포 (이동속도 40% 감속 및 지속 산성 데미지)
        if (this.equippedLegId === 'leg_mutant') {
            this.legSkillTimer = (this.legSkillTimer || 0) + dt;
            const tickSporePopup = this.legSkillTimer >= 0.75;
            if (tickSporePopup) this.legSkillTimer = 0;

            [...this.enemies].forEach(enemy => {
                const dist = enemy.x - monsterFrontX;
                if (dist >= 0 && dist <= 220) {
                    enemy.speed = Math.min(enemy.speed, 35); // 이동속도 감속
                    enemy.hp -= 35 * dt; // 산성 포자 데미지
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

        // [지진 분쇄 다리 (leg_chimera)]: 전진 및 전투 중 전방 지면에 광역 지진 분쇄 충격 데미지
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

        // 2. 사거리에 가장 가까운 적(또는 건물) 탐색
        let closestEnemy = null;
        let minDistance = Infinity;

        this.enemies.forEach(enemy => {
            const dist = enemy.x - monsterFrontX;
            if (dist < minDistance) {
                minDistance = dist;
                closestEnemy = enemy;
            }
        });

        // 화면 내에 활성화된 거점 건물이 있는지 확인
        const activeBuilding = this.enemies.find(e => e.isBuilding);

        // 3. 핵심 기믹: 사거리 감지 및 몬스터 상태 전환 (걷기 vs 거점 접근 전진 vs 공격)
        if (closestEnemy && minDistance <= this.playerRange) {
            // [ATTACKING STATE]: 사거리에 닿았으므로 이동 및 배경 스크롤을 멈추고 공격
            monsterController.setState('attacking');

            // 공격 모션이 실제 타격 프레임(20~23번째) 구간에 진입하는 순간에만 1회 데미지 적용
            const inHitWindow = monsterController.isAttackImpactFrame();
            if (inHitWindow && !this.attackHitTriggered) {
                this.attackHitTriggered = true;
                this.fireAttack(closestEnemy);
            } else if (!inHitWindow) {
                this.attackHitTriggered = false;
            }

            // 적 또한 몬스터를 공격
            if (minDistance <= 70) {
                this.playerHp -= closestEnemy.dps * dt;
                monsterController.updateHpBar(this.playerHp, this.maxPlayerHp);
            }
        } else if (activeBuilding) {
            // [ADVANCING STATE]: 적 거점이 떴으나 아직 사거리에 닿지 않음 -> 배경 스크롤을 멈추고 캐릭터가 직접 사거리까지 앞으로 전진!
            monsterController.setState('walking-forward');
            this.attackHitTriggered = false;
            this.monsterX += this.playerSpeed * dt;
            monsterController.setMonsterPosition(this.monsterX);
        } else {
            // [NORMAL WALKING STATE]: 거점 건물이 없으므로 캐릭터는 제자리 걷고 배경이 우에서 좌로 흐름!
            monsterController.setState('walking');
            this.attackHitTriggered = false;

            // 이전에 거점 공격을 위해 우측으로 전진해있던 몬스터가 원래 위치(150px)로 서서히 복귀 (카메라가 이동하는 연출)
            if (this.monsterX > 150) {
                this.monsterX = Math.max(150, this.monsterX - 120 * dt);
                monsterController.setMonsterPosition(this.monsterX);
            }

            // 이동 거리 적산
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

        // 3-1. 징집된 아군 미니언(세뇌 스마트 구속구) 이동 및 교전 로직
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

                // 거점과 충돌 시 거점 공격력 대신 우리 병사 HP를 깎아 충돌 데미지 처리
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

        // 4. 적군 보병 이동 로직 (전방의 아군 미니언 감지 시 우선 공격)
        this.enemies.forEach(enemy => {
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
                    enemy.x -= enemy.speed * dt;
                    if (enemy.dom) enemy.dom.style.left = `${enemy.x}px`;
                } else {
                    this.playerHp -= enemy.dps * dt;
                    monsterController.updateHpBar(this.playerHp, this.maxPlayerHp);
                }
            }
        });

        // 5. 패배 판정
        if (this.playerHp <= 0 || this.playerBaseHp <= 0) {
            this.showAnnouncement('DEFEAT... // 몬스터가 쓰러졌습니다!', 3000);
            setTimeout(() => {
                this.stopBattle();
                document.getElementById('btn-battle-leave')?.click();
            }, 2500);
            return;
        }

        this.loopId = requestAnimationFrame((t) => this.loop(t));
    }
}

export const battleEngine = new BattleEngine();
