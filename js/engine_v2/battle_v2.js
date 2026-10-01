/* ==========================================================================
   PROJECT: MAD OVERLORD // BATTLE ENGINE (CONTINUOUS DISTANCE & BASE DESTRUCTION) (v2)
   Uses suffix -v2 to avoid overlapping with original vanilla battle engine.
   스테이지(거리·적 구성·거점 체력·보상)는 stages_v2.js, 적 종류와 행동은 enemies_v2.js,
   승패는 기획서 방식(D-028): 제한 시간 안에 최종 기지를 부수면 승리, 못 부수면 패배(TIME OVER).
   주인공은 죽지 않는다 — 내구도(HP)가 0이 되면 과부하(OVERLOAD)로 잠시 멈춘 뒤 수리되어 다시 싸운다(피격 = 시간 손실).
   별 3개(요새 / 최종 기지 / 목표 시간 안에 클리어, D-029)와 기록 저장은 progress_v2.js
   ========================================================================== */

import { gameState } from '../engine/state.js';
import { monsterControllerV2 } from './monster_v2.js';
import { BattleFx, ensureSkillStyles } from './battleFx.js';
import { gameTime } from './gameTime.js';
import { HERO_WAVE, HERO_ORB } from './vfx/heroVfx.js';
import { HERO_VFX, MECH_VFX, KAIJU_VFX, CHIMERA_VFX, BATTLE_VFX, meleeHitVfx } from './vfx/vfxDefs.js';
import { skillsForParts, hasTarget, ULT_FILL } from './skills_v2.js';
import { BattleHud } from '../ui_v2/battleHud_v2.js';
import { BattleDirector } from '../ui_v2/battleDirector_v2.js';
import { sound } from './audio/sound_v2.js';
import { progress } from './progress_v2.js';
import { stageById, defaultStage, nextStageOf } from './stages_v2.js';
import { spawnEnemy, updateEnemy, pickType, killReward, ENEMY_TYPES } from './enemies_v2.js';
import { icon } from '../ui_v2/icons.js';
import { GROUND_SPEED, BASE_STATE, baseArt, baseSize, aimAt, dressBase, setBaseState } from './bases_v2.js';

// ---- 팩션 스킬 (컨셉 시트 기준) ----
const PHASE2 = { hpRatio: 0.5, shieldRatio: 0.3, dpsMul: 1.3 };            // 합성괴인 머리: 2페이즈 거대화 + 실드
// 산란(거대괴수 몸통 스킬)과 스웜 드론(거대로봇 머리 필살기)은 액티브 스킬로 발동 (skills_v2.js)
const EGG = { hatchSec: 1.6 };
const BABY = { hp: 260, dps: 22, speedMul: 0.6 };
const DRONE = { dmgMul: 0.35, splash: 70 };
const SKILL_AUTO_KEY = 'mo_v2_auto_skill';
// 타락 히어로: 머리 세뇌 파동(처치한 적 징집 확률 = 파츠 설명 25%), 몸통 흑마법 오라, 팔 어둠 파동(관통 + 감속)
// curseZone: 적 왼쪽 끝 기준 저주 범위 (몸 앞 기준 px). auraDx: 저주 장판 중심 (몸 앞 기준, 장판은 발밑~범위 끝)
// wavePierce: 관통 파동이 두 번째 적부터 주는 피해 배율 (적을 지날 때마다 곱해짐, 밸런스 1차)
const HERO = { recruitChance: 0.1, curseTick: 0.65, curseZone: [-40, 180], curseDps: 22, auraDx: 65,
    waveRange: 280, slowSec: 2.5, slowMul: 0.5, wavePierce: 0.5 };
// 팩션 패시브 수치 (밸런스 1차): 괴수 머리 재생(최대 체력 비율/초), 합성괴인 다리 지진(초당 피해), 괴수 다리 포자(초당 피해)
const PASSIVE = { regen: 0.012, quakeDps: 30, sporeDps: 30 };
const HIT_REACT = { flashMs: 80, knockPx: 10, stopSec: 0.05 };
// 다리 패시브 (설명: skills_v2.js LEG_PASSIVES). 궤도 돌진: 피해(기본 1타 배수)·넉백·기절·재사용 / 반중력 부양: 피해 감소율
const LEG = { ramDmg: 1.5, ramKnock: 3, ramStun: 0.6, ramCd: 4, hoverReduce: 0.3 };
// 주인공 상태 이상 (적 공격): 감속 = 진격 속도·동작 속도 감소, 기절 = 공격·진격·스킬 멈춤
const PLAYER_STATUS = { slowMove: 0.5, slowAnim: 0.55 };
// 과부하: 내구도 0 → sec초 동안 멈춤(무적) → 최대 내구도 × restore로 수리 (D-028)
const OVERLOAD = { sec: 4, restore: 0.5 };
// 산성 발톱 팔(arm_mutant, D-030): 물린 적·거점 부식 — 초당 피해 = 주인공 DPS × dpsMul (거점 × baseMul)
const ACID = { dpsMul: 0.14, baseMul: 2, sec: 3 };
// 근접 기본 공격 휩쓸기: 맞은 적 뒤 radius px 안의 적에게도 피해 × mul (거대 캐릭터가 무리를 쳐냄)
const MELEE_CLEAVE = { radius: 60, mul: 0.4 };
// 피해 숫자: 같은 자리 연속 표시는 위로 쌓고, 지속 피해(아군 미니언 등)는 모아서 0.5초마다 표시
const POPUP = { column: 36, stackMs: 350, stackPx: 15, dotFlushSec: 0.5 };
const FOOT_B = 58;   // 지면 이펙트 높이 (bottom px)
// 거점 건물 왼쪽 끝 위치 (전장 1280px 기준): 그림 폭(약 220px)이 하단 오른쪽 스킬 도크(약 x 965부터)에 가리지 않게
const BASE_X = { mid: 720, final: 720 };
const aimOf = aimAt;   // 적 몸통 중앙 (건물은 그림 크기의 가운데, bases_v2.js)
// 적 상태 외형 (우선순위: 기절 > 감속 > 저주) + 체력바 옆 상태 아이콘
const ENEMY_TINT = {
    stun: 'grayscale(0.7) brightness(1.15) drop-shadow(0 0 6px #ffe066)',
    slow: 'drop-shadow(0 0 6px #b050ff) saturate(0.55) brightness(0.9)',
    curse: 'brightness(0.72) saturate(0.7) drop-shadow(0 0 4px rgba(170, 80, 255, 0.9))'
};
const STATUS_ICON = { curse: 'curse', slow: 'slow', stun: 'stun', acid: 'acid' };

export class BattleEngine {
    constructor() {
        this.isActive = false;
        this.loopId = null;
        this.lastTime = 0;

        // 전장 진행 및 목표 스탯
        this.distanceTraveled = 0;
        this.maxDistance = 1000;
        this.stage = stageById('1-1');
        this.starFlags = [false, false, false];   // 요새 / 최종 기지 / 체력 50% 이상 (D-016)
        this.pSlowT = 0;
        this.pStunT = 0;

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
        this.ruins = [];
        this.ruinHoldT = 0;

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
        this.timers = [];
        this.skills = { arm: null, body: null, head: null };
        this.skillCd = { arm: 0, body: 0 };
        this.ultGauge = 0;
        this.shieldTimer = Infinity;
        try { this.autoSkills = localStorage.getItem(SKILL_AUTO_KEY) === '1'; } catch (e) { this.autoSkills = false; }
        this.hud = new BattleHud(this);
        this.director = new BattleDirector(this);   // 인트로/경고/컷인/거점 파괴/결과 화면 연출
        this.onNavigate = null;                     // (화면 이름) => 화면 전환 (main_v2.js가 연결)
        this.runId = 0;
        this.cinematic = false;                     // 끝 연출 중: 입력/스킬 막음
        this.stats = { kills: 0, time: 0, startDm: 0 };
        this.popupSlots = new Map();
        // 리그 애니메이션 이벤트 → 전장 이펙트 (거대로봇 출격 점프 착지)
        monsterControllerV2.onRigEvent = name => {
            if (!this.isActive) return;
            if (name === 'land') this.fx.play(MECH_VFX.landing, this.monsterX + 35, FOOT_B);
            // 동작 효과음: 발걸음(거대 캐릭터 걷기 = stomp, 사람 크기 히어로 = step 가볍게), 점프 분사, 기 모으기
            if (name === 'stomp') sound.play('giant_step');
            else if (name === 'step') sound.play('giant_step', { vol: 0.45, rate: 1.5 });
            else if (name === 'thrust') sound.play('mech_thrust');
            else if (name === 'charge') sound.play('charge_up');
        };
    }

    // 전투 시작
    startBattle() {
        this.stopBattle();
        this.isActive = true;
        this.distanceTraveled = 0;
        this.stage = stageById(progress.selectedStage || defaultStage(progress).id);
        this.maxDistance = this.stage.distance;
        this.spawnInterval = this.stage.enemy.spawn;
        this.starFlags = [false, false, false];
        this.pSlowT = 0;
        this.pStunT = 0;
        this.spawnSilence = 0;
        this.overloadT = 0;
        this.timeUp = false;
        this.timeWarned = false;
        this.artTimer = 0;
        this.artWarned = false;
        this.boss = null;
        this.ruins = [];          // 요새 잔해 (다시 걸으면 바닥과 함께 흘러 나감)
        this.ruinHoldT = 0;       // 요새가 무너지는 동안 주인공이 멈춰 지켜보는 시간
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
        this.pendingEggs = 0;
        this.shieldTimer = Infinity;
        this.timers = [];
        this.skillCd = { arm: 0, body: 0 };
        this.ultGauge = 0;
        this.runId += 1;
        this.cinematic = false;
        this.ended = false;
        this.stats = { kills: 0, time: 0, startDm: gameState.darkMatter };
        gameTime.reset();

        // 현재 장착 파츠 스탯 불러오기
        const stats = progress.statsFor(gameState.getEquippedObjects());   // 강화 레벨 반영 (D-015)
        const equippedObjs = gameState.getEquippedObjects();
        this.equippedHeadId = equippedObjs.head ? equippedObjs.head.id : null;
        this.equippedBodyId = equippedObjs.body ? equippedObjs.body.id : null;
        this.equippedLegId = equippedObjs.leg ? equippedObjs.leg.id : null;
        this.curseTickTimer = 0;
        this.legSkillTimer = 0;
        this.dotTimer = 0;
        this.equippedArmId = equippedObjs.arm ? equippedObjs.arm.id : null;
        this.maxPlayerHp = stats.hp;
        this.playerHp = stats.hp;
        this.playerDps = stats.dps;
        this.playerRange = stats.range;
        this.playerSpeed = stats.speed;
        this.attackType = equippedObjs.arm ? (equippedObjs.arm.attackType || 'melee') : 'melee';
        this.skills = skillsForParts(equippedObjs);

        if (this.equippedBodyId === 'body_chimera') {
            setTimeout(() => {
                this.spawnAllyMinion(this.monsterX + 60, 'chimera');
                this.spawnAllyMinion(this.monsterX + 110, 'chimera');
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
            // 흑마법 오라 (디버프 장판): 발밑에서 저주 범위 끝까지. 안에 든 적은 촉수에 발목이 잡힘
            this.fx.setAura('curse', HERO_VFX.curseAura, () => [this.frontX() + HERO.auraDx, FOOT_B],
                () => this.enemies.filter(e => e.cursed).map(e => ({ key: e.id, x: aimOf(e).x, b: FOOT_B, w: e.isBuilding ? 34 : 14 })));
        }

        // 컨테이너 초기화
        if (this.domEnemies) this.domEnemies.innerHTML = '';
        if (this.domProjectiles) this.domProjectiles.innerHTML = '';
        if (this.domDamage) this.domDamage.innerHTML = '';
        
        if (this.domTargetLabel) this.domTargetLabel.textContent = '적 수비대 거점 HP (탐색 중)';
        this.updateHud();
        this.hud.setup(equippedObjs);

        // 출격 인트로 (레터박스 + 작전명 → SORTIE!) + 전투 배경음
        this.director.clear();
        this.director.intro(this.stage);
        sound.playBgm('battle');

        this.lastTime = performance.now();
        this.loopId = requestAnimationFrame((t) => this.loop(t));
    }

    // 전투 정지 및 퇴각
    stopBattle() {
        this.isActive = false;
        this.pSlowT = 0;
        this.pStunT = 0;
        this.pStatusShown = undefined;
        monsterControllerV2.setStatusVisual(null, 1);
        sound.stopAllLoops();
        sound.setPaused(false);
        if (this.fx) this.fx.stop();
        if (this.hud) this.hud.teardown();
        gameTime.reset();
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
            this.domStarsText.textContent = this.starFlags.map(f => (f ? '★' : '☆')).join('');
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
    // kind 'dot': 지속 피해 합계 (작고 흐리게)
    createDamagePopup(x, y, damage, isCrit = false, kind = null) {
        if (!this.domDamage) return;
        const el = document.createElement('div');
        el.className = 'damage-popup';
        el.style.left = `${x}px`;
        // 같은 자리(가로 36px 칸)에 0.35초 안에 연달아 뜨면 위로 쌓아 겹치지 않게
        const col = Math.round(x / POPUP.column);
        const now = performance.now();
        const slot = this.popupSlots.get(col);
        const n = slot && now - slot.t < POPUP.stackMs ? Math.min(slot.n + 1, 4) : 0;
        this.popupSlots.set(col, { t: now, n });
        el.style.bottom = `${y + n * POPUP.stackPx}px`;
        if (typeof damage === 'string') {
            el.textContent = damage;
            if (damage.includes('☠') || damage.includes('저주') || damage.includes('흑마법')) {
                el.style.color = '#cc33ff';
                el.style.textShadow = '0 0 8px #9900ff';
            } else if (damage.includes('REGEN') || damage.includes('회복')) {
                el.style.color = '#00ff66';
                el.style.textShadow = '0 0 8px #00ff66';
            } else if (damage.includes('☣') || damage.includes('포자') || damage.includes('점액')) {
                el.style.color = '#aaff00';
                el.style.textShadow = '0 0 8px #66aa00';
            } else if (damage.includes('💥') || damage.includes('지진') || damage.includes('분쇄')) {
                el.style.color = '#ff9900';
                el.style.textShadow = '0 0 8px #cc6600';
            }
        } else if (kind === 'dot') {
            el.textContent = Math.round(damage);
            el.style.fontSize = '13px';
            el.style.opacity = '0.8';
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
    //      'chimera': 합성괴인 몸통의 졸개 소환 (소환진 이펙트)
    spawnAllyMinion(startX, kind = 'mind') {
        if (!this.domEnemies) return;
        const baby = kind === 'baby_kaiju';
        const maxHp = baby ? BABY.hp : 350;
        const dps = baby ? BABY.dps : 17.5; // 세뇌 미니언은 적 보병 데미지의 절반
        const allyId = `ally_${Date.now()}_${Math.random()}`;

        const el = document.createElement('div');
        // 외형: 새끼 괴수 / 합성괴인 졸개(미니 괴인 스프라이트) / 세뇌 보병(적 보병 + 검보라 세뇌 표식)
        el.className = `ally-minion ${baby ? 'baby-kaiju-v2' : kind === 'chimera' ? 'chimera-minion-v2' : 'v2-mind'}`;
        el.style.left = `${startX}px`;

        const hpBar = document.createElement('div');
        hpBar.className = 'ally-hp';
        hpBar.style.width = '100%';
        if (baby) {   // 새끼 괴수는 산성 초록 체력바
            hpBar.style.background = '#aaff28';
            hpBar.style.boxShadow = '0 0 6px #aaff28';
        } else if (kind === 'chimera') {
            hpBar.style.background = '#ff9628';
            hpBar.style.boxShadow = '0 0 6px #ff9628';
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

        if (kind === 'chimera') this.fx.play(CHIMERA_VFX.summon, startX + 38, FOOT_B);
        const label = { baby_kaiju: '🥚 새끼 괴수 부화!', chimera: '👹 졸개 소환!' }[kind] || '★ 세뇌 징집! (MIND CONTROL)';
        this.createDamagePopup(startX, 180, label, false);
    }

    // ---- 팩션 스킬 ----
    // 몬스터가 받는 피해: 실드가 있으면 먼저 흡수
    damagePlayer(amount, dt) {
        if (this.overloadT > 0) return;   // 과부하(긴급 수리) 중에는 피해 없음
        if (this.equippedLegId === 'leg_hero_hover') amount *= 1 - LEG.hoverReduce;   // 다리 패시브 '반중력 부양'
        if (this.shieldHp > 0) {
            const absorbed = Math.min(this.shieldHp, amount);
            this.shieldHp -= absorbed;
            amount -= absorbed;
            this.shieldHitCd -= dt;
            if (this.shieldHitCd <= 0) {
                monsterControllerV2.shieldHit();
                sound.play('shield_hit');
                this.shieldHitCd = 0.3;
            }
            if (this.shieldHp <= 0) {
                this.shieldTimer = Infinity;
                monsterControllerV2.breakShield();
                sound.play('shield_break');
                this.createDamagePopup(this.monsterX + 40, 200, '⬢ 실드 파괴!', false);
            }
        }
        this.playerHp -= amount;
        if (amount > 0) sound.play('player_hit');   // 0.4초에 한 번까지 (sound_v2 SFX 표)
        monsterControllerV2.updateHpBar(this.playerHp, this.maxPlayerHp);
    }

    // [다리 패시브 '궤도 돌진'] 처음 맞닿은 적에게 돌진 피해 + 밀쳐냄 + 잠깐 기절 (적마다 LEG.ramCd초에 한 번)
    legContact(enemy) {
        if (this.equippedLegId !== 'leg_mech_wheel' || enemy.isBuilding) return false;
        if (enemy.rammedAt != null && this.stats.time - enemy.rammedAt < LEG.ramCd) return false;
        enemy.rammedAt = this.stats.time;
        const a = aimOf(enemy);
        this.fx.play(MECH_VFX.fistHit, a.x - 10, a.b - 20);
        this.dealDamageToEnemy(enemy, this.unit() * LEG.ramDmg, false, { knock: LEG.ramKnock, stop: true });
        if (this.enemies.includes(enemy)) this.stunEnemy(enemy, LEG.ramStun);
        return true;
    }

    // [합성괴인 머리] 체력 50% 이하 시 자동 거대화 및 실드 전개 (전투당 1회)
    enterPhase2() {
        this.phase2 = true;
        this.shieldHp = this.maxPlayerHp * PHASE2.shieldRatio;
        this.shieldTimer = Infinity;
        this.playerDps *= PHASE2.dpsMul;
        monsterControllerV2.enterPhase2();
        this.fx.play(CHIMERA_VFX.phase2Burst, this.monsterX + 35, FOOT_B);   // 변신 클립의 거대화 순간에 맞춘 충격파
        this.showAnnouncement('2PHASE // 자동 거대화 및 실드 전개!', 2000);
        this.createDamagePopup(this.monsterX + 40, 210, '⬢ 실드 전개 (최대 체력 30%)', false);
    }

    // [타락 히어로 머리] 세뇌 파동: 시전 동작 → 보라 구체가 쓰러진 적 자리로 → 소용돌이 속에서 아군으로
    recruit(x) {
        monsterControllerV2.playCast(() => this.mindOrb(x));
    }

    // 손끝에서 세뇌 구체 → x 자리에서 소용돌이 → 아군 미니언
    mindOrb(x) {
        if (!this.isActive) return;
        const tx = x + 38;
        const from = monsterControllerV2.getSocketPoint('hand', 'armF') || { x: this.monsterX + 90, bottom: 130 };
        this.fx.play(HERO_VFX.castRelease, from.x, from.bottom);
        this.fx.launchOrb(from, () => ({ x: tx, b: 90 }), HERO_ORB.color, HERO_ORB.dur, () => {
            this.fx.play(HERO_VFX.mindConvert, tx, 58);
            this.schedule(0.35, () => {
                if (this.isActive && !this.finalBaseDestroyed) this.spawnAllyMinion(x);
            });
        });
    }

    // [대세뇌] 살아 있는 적 보병을 즉시 아군으로 (보상 없이 전장에서 제거 후 세뇌 미니언 소환)
    convertEnemy(e) {
        if (!this.enemies.includes(e) || e.isBuilding) return;
        this.enemies = this.enemies.filter(o => o !== e);
        if (e.dom) e.dom.remove();
        this.mindOrb(e.x);
    }

    // [타락 히어로 팔] 어둠 파동: 칼끝에서 초승달 파동이 앞으로 날아가며 지나가는 적 전부에게 피해 + 감속
    launchDarkWave(fromX, dmg, isCrit) {
        const hit = new Set();
        let mul = 1;   // 관통할수록 약해짐
        this.fx.launchWave({
            x: fromX, b: 88, range: Math.max(this.playerRange, HERO.waveRange), speed: HERO_WAVE.speed,
            h: HERO_WAVE.h, color: HERO_WAVE.color,
            onPass: (x0, x1) => {
                [...this.enemies].forEach(e => {
                    const cx = aimOf(e).x;
                    if (cx < x0 || cx > x1 || hit.has(e)) return;
                    hit.add(e);
                    this.fx.play(HERO_VFX.waveHit, cx, 88);
                    if (!e.isBuilding) this.slowEnemy(e);
                    this.dealDamageToEnemy(e, dmg * mul, isCrit, { knock: 0.6 });
                    mul *= HERO.wavePierce;
                });
            }
        });
    }

    slowEnemy(e) {
        e.slowT = HERO.slowSec;
        this.updateEnemyFilter(e);
    }

    // 적 외형 상태: 기절 > 감속 > 저주 순으로 색 (피격 섬광 중에는 섬광 우선) + 상태 아이콘
    updateEnemyFilter(e) {
        if (!e.dom) return;
        const states = [e.stunT > 0 && 'stun', e.slowT > 0 && 'slow', e.cursed && 'curse', e.acidT > 0 && 'acid'].filter(Boolean);
        this.updateStatusIcons(e, states);
        if (e.flashing) return;
        // 종류 색조(enemies_v2.js baseFilter) + 상태 색
        e.dom.style.filter = [e.baseFilter, states.length ? ENEMY_TINT[states[0]] || '' : ''].filter(Boolean).join(' ');
    }

    // 체력바 옆 상태 아이콘 (저주/감속/기절) — 바뀔 때만 다시 그림
    updateStatusIcons(e, states) {
        const sig = states.join();
        if (sig === (e.statusSig || '')) return;
        e.statusSig = sig;
        if (!e.statusEl) {
            e.statusEl = document.createElement('div');
            e.statusEl.className = 'v2-status';
            e.dom.appendChild(e.statusEl);
        }
        e.statusEl.innerHTML = states.map(k => `<span class="v2-status__icon is-${k}">${icon(STATUS_ICON[k], 10)}</span>`).join('');
    }

    // 피격 반응: 섬광 + 넉백 (+ 강한 타격은 히트스톱)
    hitReact(e, react) {
        if (react.stop) gameTime.hitStop(HIT_REACT.stopSec);
        if (!e.dom) return;
        e.flashing = true;
        e.dom.style.filter = 'brightness(2.4) saturate(0.2)';
        setTimeout(() => { e.flashing = false; this.updateEnemyFilter(e); }, HIT_REACT.flashMs);
        if (!e.isBuilding && !e.knockResist && react.knock) {   // 방패병·보스는 밀리지 않음
            e.x += HIT_REACT.knockPx * react.knock;
            e.dom.style.left = `${e.x}px`;
        }
    }

    // [거대괴수 몸통 스킬 '산란'] 발밑에 알 → 부화하면 새끼 괴수(아군). cap: 새끼 최대 수
    layEgg(x, cap) {
        const babies = this.allies.filter(a => a.kind === 'baby_kaiju').length;
        if (babies + this.pendingEggs >= cap) return;
        this.pendingEggs += 1;
        this.fx.addEgg(x, EGG.hatchSec, () => {
            this.pendingEggs -= 1;
            if (this.isActive && !this.finalBaseDestroyed) this.spawnAllyMinion(x - 30, 'baby_kaiju');
        });
    }

    // [거대로봇 머리 필살기 '스웜 드론 총출격'] 캐니스터 발사구에서 드론 → 가까운 적부터 돌진 폭발 (범위 피해)
    launchDrones(count) {
        const ahead = this.enemies.filter(e => e.x > this.monsterX).sort((a, b) => a.x - b.x);
        const from = monsterControllerV2.getSocketPoint('droneBay', 'canister') || { x: this.monsterX + 40, bottom: 230 };
        for (let i = 0; i < count; i++) {
            let target = ahead[i % Math.max(1, ahead.length)];
            this.fx.launchDrone({
                from: { x: from.x, b: from.bottom },
                index: (i % 3),
                delay: Math.floor(i / 3) * 0.25,
                getTarget: () => {
                    if (!this.enemies.includes(target)) {
                        target = this.enemies.filter(e => e.x > this.monsterX).sort((a, b) => a.x - b.x)[0];
                    }
                    return target ? aimOf(target) : null;
                },
                onHit: pos => {
                    const dmg = this.playerDps * DRONE.dmgMul;
                    [...this.enemies].forEach(e => {
                        const d = Math.abs(aimOf(e).x - pos.x);
                        if (d < DRONE.splash) this.dealDamageToEnemy(e, e === target ? dmg : dmg * 0.5, false, { knock: 0.8 });
                    });
                }
            });
        }
    }

    // [반사 실드] 최대 체력 ratio만큼 흡수하는 실드를 sec초 동안
    applyShield(ratio, sec, color) {
        this.shieldHp = Math.max(this.shieldHp, this.maxPlayerHp * ratio);
        this.shieldTimer = sec;
        monsterControllerV2.shieldOn(color);
        sound.play('shield_on');
        this.createDamagePopup(this.monsterX + 40, 210, '⬢ 실드 전개', false);
    }

    // 유도 미사일 1발 (기본 공격/미사일 일제 사격 공용)
    fireMissile(targetEnemy, dmg, opts = {}, isCrit = false) {
        const muzzle = monsterControllerV2.getMuzzlePoint();
        const from = muzzle || { x: this.monsterX + 90, bottom: 130 };
        let aim = aimOf(targetEnemy);
        this.fx.launchMissile(from, () => {
            if (this.enemies.includes(targetEnemy)) aim = aimOf(targetEnemy);
            return aim;
        }, () => {
            this.fx.play(MECH_VFX.missileBlast, aim.x, aim.b);
            if (!this.isActive) return;
            if (this.enemies.includes(targetEnemy)) {
                this.dealDamageToEnemy(targetEnemy, dmg, isCrit, { knock: 0.8 });
            }
            [...this.enemies].forEach(other => {
                if (other !== targetEnemy && Math.abs(other.x - targetEnemy.x) < 90) {
                    this.dealDamageToEnemy(other, dmg * 0.45, false, { knock: 0.5 });
                }
            });
        }, { dur: 0.5, apex: 55, ...opts });
    }

    stunEnemy(e, sec) {
        e.stunT = Math.max(e.stunT || 0, sec);
        this.updateEnemyFilter(e);
    }

    // ---- 스킬 시스템 공용 ----
    /** 전투 시간(일시정지/배속/히트스톱 반영)으로 sec초 뒤 fn 실행 */
    schedule(sec, fn) {
        this.timers.push({ t: sec, fn });
    }

    frontX() {
        return this.monsterX + 100;
    }

    /** 기본 공격 1타 피해 */
    unit() {
        return this.playerDps * 0.5;
    }

    /** 몬스터 앞 range 안의 적 (가까운 순) */
    enemiesInRange(range) {
        const fx = this.frontX();
        return this.enemies.filter(e => e.x - fx >= -60 && e.x - fx <= range).sort((a, b) => a.x - b.x);
    }

    nearestEnemy(extra = 0) {
        return this.enemiesInRange(this.playerRange + extra)[0] || null;
    }

    /** 슬롯 스킬 사용 가능 여부: { ready, hasTarget } */
    skillState(slot) {
        const sk = this.skills[slot];
        if (!sk) return { ready: false, hasTarget: false };
        const ready = sk.ult ? this.ultGauge >= 1 : this.skillCd[slot] <= 0;
        return { ready, hasTarget: hasTarget(this, sk) };
    }

    /** 스킬 사용 (버튼/단축키/자동). 성공하면 true */
    useSkill(slot) {
        const sk = this.skills[slot];
        if (!this.isActive || this.cinematic || this.finalBaseDestroyed || !sk || gameTime.paused || this.playerStunned()) return false;
        const st = this.skillState(slot);
        if (!st.ready || !st.hasTarget) return false;
        if (sk.ult) this.ultGauge = 0;
        else this.skillCd[slot] = sk.cd;
        sk.use(this);
        if (!sk.ult) sound.play('skill_use');
        this.hud.onSkillUsed(slot, sk);
        return true;
    }

    setAutoSkills(on) {
        this.autoSkills = on;
        try { localStorage.setItem(SKILL_AUTO_KEY, on ? '1' : '0'); } catch (e) { /* 저장 불가 환경 */ }
    }

    tickSkills(dt) {
        for (const slot of ['arm', 'body']) this.skillCd[slot] = Math.max(0, this.skillCd[slot] - dt);
        this.ultGauge = Math.min(1, this.ultGauge + ULT_FILL.perSec * dt);
        if (this.shieldTimer !== Infinity) {
            this.shieldTimer -= dt;
            if (this.shieldTimer <= 0) {
                this.shieldTimer = Infinity;
                if (this.shieldHp > 0) {
                    this.shieldHp = 0;
                    monsterControllerV2.shieldOff();
                }
            }
        }
        if (this.autoSkills) {
            for (const slot of ['arm', 'body', 'head']) this.useSkill(slot);
        }
    }

    tickTimers(dt) {
        if (!this.timers.length) return;
        const due = [];
        for (const tm of this.timers) {
            tm.t -= dt;
            if (tm.t <= 0) due.push(tm);
        }
        this.timers = this.timers.filter(tm => tm.t > 0);
        due.forEach(tm => tm.fn());
    }

    // 적 소환: 스테이지의 적 비중(mix)대로 종류를 고르고, 확률로 엘리트 (enemies_v2.js)
    spawnMinion(typeId = null, opts = {}) {
        if (!this.domEnemies) return null;
        const building = this.enemies.find(e => e.isBuilding);
        const x = opts.x ?? (building ? building.x - 30 : (window.innerWidth > 1000 ? 980 : 700));
        const type = typeId || pickType(this.stage.enemy.mix);
        const elite = opts.elite ?? Math.random() < (this.stage.elite || 0);
        return spawnEnemy(this, type, { x, elite });
    }

    // 아군 미니언이 피해를 받음 (0 이하면 사라짐)
    damageAlly(ally, amount) {
        ally.hp -= amount;
        if (ally.hpBar) ally.hpBar.style.width = `${Math.max(0, (ally.hp / ally.maxHp) * 100)}%`;
        if (ally.hp <= 0) {
            if (ally.dom) ally.dom.remove();
            this.allies = this.allies.filter(a => a.id !== ally.id);
        }
    }

    // ---- 산성 부식 (산성 발톱 팔) ----
    applyAcid(e, sec = ACID.sec) {
        if (!e || e.hp <= 0) return;
        const fresh = !(e.acidT > 0);
        e.acidT = Math.max(e.acidT || 0, sec);
        if (fresh) this.updateEnemyFilter(e);
    }

    tickAcid(dt) {
        const dps = this.playerDps * ACID.dpsMul;
        [...this.enemies].forEach(e => {
            if (!(e.acidT > 0)) return;
            e.acidT -= dt;
            e.acidFx = (e.acidFx || 0) + dt;
            if (e.acidFx >= 0.5) {
                e.acidFx = 0;
                this.fx.play(KAIJU_VFX.acidTick, aimOf(e).x, aimOf(e).b + 10);
            }
            this.dealDamageToEnemy(e, dps * (e.isBuilding ? ACID.baseMul : 1) * dt, false, { dot: true });
            if (e.acidT <= 0 && this.enemies.includes(e)) this.updateEnemyFilter(e);
        });
    }

    // ---- 과부하: 내구도 0이면 멈춰서 긴급 수리 (주인공은 죽지 않음, D-028) ----
    checkOverload(dt) {
        if (this.overloadT > 0) {
            this.overloadT -= dt;
            if (this.overloadT <= 0) {
                this.overloadT = 0;
                this.playerHp = this.maxPlayerHp * OVERLOAD.restore;
                monsterControllerV2.updateHpBar(this.playerHp, this.maxPlayerHp);
                this.createDamagePopup(this.monsterX + 30, 200, '🔧 긴급 수리 완료', false);
                sound.play('shield_on', { rate: 1.2 });
            }
            return;
        }
        if (this.playerHp > 0) return;
        this.playerHp = 0;
        this.overloadT = OVERLOAD.sec;
        this.stats.overloads = (this.stats.overloads || 0) + 1;
        this.applyPlayerStun(OVERLOAD.sec, 'OVERLOAD');
        this.director.overload(OVERLOAD.sec);
    }

    // ---- 제한 시간 (D-028): 시간 안에 최종 기지를 못 부수면 패배 ----
    timeLeft() {
        return Math.max(0, this.stage.timeLimit - this.stats.time);
    }

    checkTimeLimit() {
        const left = this.timeLeft();
        if (!this.timeWarned && left <= 30) {
            this.timeWarned = true;
            this.director.alarm('TIME 30', '제한 시간 30초 — 최종 기지를 서둘러 부숴라', 2);
        }
        if (left > 0 || this.timeUp) return false;
        this.timeUp = true;
        this.cinematic = true;
        const run = this.runId;
        this.director.timeOver().then(() => {
            if (this.runId === run && this.isActive) this.finishBattle(false);
        });
        return true;
    }

    // ---- 주인공 상태 이상 (적 공격) ----
    applyPlayerSlow(sec) {
        if (this.equippedLegId === 'leg_hero_hover') {   // 다리 패시브: 감속 무시
            this.createDamagePopup(this.monsterX + 40, 190, '감속 무효', false);
            return;
        }
        if (this.pSlowT <= 0) this.createDamagePopup(this.monsterX + 40, 190, '❄ 감속!', false);
        this.pSlowT = Math.max(this.pSlowT, sec);
        this.updatePlayerStatus();
    }

    applyPlayerStun(sec, label = '기절!') {
        if (this.pStunT <= 0) this.createDamagePopup(this.monsterX + 40, 200, `⚡ ${label}`, false);
        this.pStunT = Math.max(this.pStunT, sec);
        this.updatePlayerStatus();
    }

    playerStunned() {
        return this.pStunT > 0;
    }

    /** 진격 속도 배율 (기절 0, 감속 0.5) */
    moveMul() {
        return this.pStunT > 0 ? 0 : this.pSlowT > 0 ? PLAYER_STATUS.slowMove : 1;
    }

    updatePlayerStatus() {
        const state = this.pStunT > 0 ? 'stun' : this.pSlowT > 0 ? 'slow' : null;
        if (state === this.pStatusShown) return;
        this.pStatusShown = state;
        monsterControllerV2.setStatusVisual(state, state === 'slow' ? PLAYER_STATUS.slowAnim : state === 'stun' ? 0 : 1);
    }

    tickPlayerStatus(dt) {
        if (this.pSlowT > 0) this.pSlowT = Math.max(0, this.pSlowT - dt);
        if (this.pStunT > 0) this.pStunT = Math.max(0, this.pStunT - dt);
        this.updatePlayerStatus();
    }

    // ---- 보스전: 최종 기지 EMP 광역 포격 (기획서 2-⑥) ----
    // 경보 → 발사: 주인공 기절, 대신 전장의 적 보병 전멸 + 잠시 소환 중단
    tickArtillery(dt) {
        const art = this.stage.boss && this.stage.boss.artillery;
        const base = this.enemies.find(e => e.isBuilding && e.isFinal);
        if (!art || !base) return;
        this.artTimer += dt;
        if (!this.artWarned && this.artTimer >= art.every - art.warn) {
            this.artWarned = true;
            this.director.alarm('EMP 경보', `${art.warn.toFixed(0)}초 뒤 광역 포격 — 적 보병도 함께 쓸려 나간다`, art.warn);
        }
        if (this.artTimer >= art.every) {
            this.artTimer = 0;
            this.artWarned = false;
            const muzzle = baseArt('final') && baseArt('final').muzzle;   // EMP 포구 (그림이 있으면)
            this.fx.play(BATTLE_VFX.emp, muzzle ? base.x + muzzle[0] : base.x + 60, muzzle ? muzzle[1] : 230);
            this.director.flash('#9fe0ff', 380, 0.75);
            this.director.shake(12, 700);
            this.applyPlayerStun(art.stun, 'EMP 마비!');
            this.enemies.filter(e => !e.isBuilding && !e.boss).forEach(e => {
                this.fx.play(BATTLE_VFX.baseBlast, e.x + 38, 90, { scale: 0.5 });
                if (e.dom) {
                    e.dom.classList.add('v2-rout');
                    setTimeout(() => e.dom.remove(), 600);
                }
            });
            this.enemies = this.enemies.filter(e => e.isBuilding || e.boss);
            this.spawnSilence = art.silence;
        }
    }

    // 중간 거점 요새 건물 출현
    spawnMidBase() {
        if (this.midBaseSpawned || !this.domEnemies) return;
        this.midBaseSpawned = true;
        this.spawnBase('mid');
        this.director.warning('mid');
        this.updateHud();
    }

    // 최종 핵심 기지 건물 출현
    spawnFinalBase() {
        if (this.finalBaseSpawned || !this.domEnemies) return;
        this.finalBaseSpawned = true;
        const base = this.spawnBase('final');

        const boss = this.stage.boss;
        this.director.warning('final', boss ? `${ENEMY_TYPES[boss.unit].name} 출현 — 최종 기지를 지키고 있다` : null);
        sound.playBgm('boss', 0.8);
        // 보스전: 기지 앞에 보스 영웅
        if (boss) this.boss = this.spawnMinion(boss.unit, { x: base.x - 70, elite: false });
        this.updateHud();
    }

    /** 거점 건물 (kind: 'mid' 요새 | 'final' 최종 기지). 그림은 bases_v2.js — 체력에 따라 온전 → 파손 → 붕괴 */
    spawnBase(kind) {
        const final = kind === 'final';
        const x = window.innerWidth > 1000 ? BASE_X[kind] : (final ? 620 : 650);
        const maxHp = this.stage.base[kind];
        this.currentTargetHp = maxHp;
        this.maxTargetHp = maxHp;
        if (this.domTargetLabel) this.domTargetLabel.textContent = final ? '[최종 핵심 기지] HP' : '[중간 거점 요새] HP';

        const el = document.createElement('div');
        el.className = final ? 'building-entity final-base' : 'building-entity';
        el.setAttribute('data-label', final ? 'FINAL HEADQUARTERS' : 'INTERMEDIATE FORT');
        el.style.left = `${x}px`;
        dressBase(el, kind);
        el.classList.add('v2-base-in');

        const hpBar = document.createElement('div');
        hpBar.className = 'enemy-hp';
        hpBar.style.width = '100%';
        el.appendChild(hpBar);
        this.domEnemies.appendChild(el);

        const base = {
            id: final ? 'building_final_base' : 'building_mid_base',
            kind,
            size: baseSize(kind),
            artState: 0,
            x,
            hp: maxHp,
            maxHp,
            dps: final ? 100 : 50,
            speed: 0,
            isBuilding: true,
            isFinal: final,
            dom: el,
            hpBar
        };
        this.enemies.push(base);
        return base;
    }

    /** 체력이 절반 아래로 내려가면 파손 그림 (지속 피해로 깎여도 잡히게 매 프레임 확인) */
    updateBaseArt() {
        this.enemies.forEach(e => {
            if (!e.isBuilding || e.artState !== 0 || e.hp > e.maxHp * BASE_STATE.damaged || !baseArt(e.kind)) return;
            e.artState = 1;
            setBaseState(e.dom, e.kind, 1);
            const a = aimOf(e);
            this.fx.play(BATTLE_VFX.baseBlast, a.x, a.b + 20, { scale: 1.1 });
            this.director.shake(5, 300);
            sound.play('base_blast');
        });
    }

    /** 파괴 연출의 대폭발 순간: 잔해 그림으로 바꿈. 요새 잔해는 남겨 두었다가 바닥과 함께 흘려보냄 */
    collapseBase(base) {
        if (!base.dom || !baseArt(base.kind)) return false;
        base.dom.classList.remove('v2-wreck', 'v2-wreck--final', 'v2-base-in');
        setBaseState(base.dom, base.kind, 2);
        if (!base.isFinal) this.ruins.push(base);
        return true;
    }

    /** 걷는 동안(배경이 흐를 때) 잔해를 바닥과 같은 속도로 왼쪽으로 */
    scrollRuins(dt) {
        if (!this.ruins.length) return;
        this.ruins = this.ruins.filter(r => {
            r.x -= GROUND_SPEED * dt;
            if (r.x + r.size.w < -40) {
                r.dom.remove();
                return false;
            }
            r.dom.style.left = `${r.x}px`;
            return true;
        });
    }

    // 공격 이펙트 / 투사체 생성
    // hitScale: 기본 1타 대비 피해 비율 (리그 캐논은 연사 1발당 0.2)
    fireAttack(targetEnemy, hitScale = 1) {
        if (!targetEnemy || !this.domProjectiles) return;
        this.ultGauge = Math.min(1, this.ultGauge + ULT_FILL.perHit * hitScale);

        // 거대로봇 리그면 실제 총구 위치에서 발사, 아니면 기존 고정 위치
        const muzzle = monsterControllerV2.getMuzzlePoint();
        const monsterFireX = muzzle ? muzzle.x : this.monsterX + 90;
        const targetX = targetEnemy.x;
        const dmg = this.playerDps * 0.5 * hitScale;
        const isCrit = Math.random() < 0.2;
        const finalDmg = isCrit ? dmg * 1.5 : dmg;

        if (this.attackType === 'laser') {
            // 초장거리 포격: 총구 → 적 몸통 중앙 보라 광선
            const from = muzzle || { x: monsterFireX, bottom: 120 };
            const aim = aimOf(targetEnemy);
            this.fx.play(MECH_VFX.laser, from.x, from.bottom, { to: [aim.x, aim.b] });
            this.dealDamageToEnemy(targetEnemy, finalDmg, isCrit, { knock: 0.3 });
        }
        else if (this.attackType === 'wave') {
            // 어둠 파동: 칼을 휘두른 타격 순간 파동 발사 (피해는 파동이 적을 지날 때)
            this.launchDarkWave(monsterFireX, finalDmg, isCrit);
        }
        else if (this.attackType === 'missile') {
            // 유도 미사일: 포물선으로 날아가 폭발 (목표가 먼저 쓰러지면 마지막 위치에 떨어짐)
            this.fireMissile(targetEnemy, finalDmg * 1.2, {}, isCrit);
        }
        else {
            // 캐릭터별 타격 이펙트 (로봇 주먹 / 괴수 물기 / 히어로 베기 / 합성괴인 주먹·클로 / 페이퍼돌 기본 베기)
            const aim = aimOf(targetEnemy);
            this.fx.play(meleeHitVfx(monsterControllerV2.getCharacterId(), this.equippedArmId), aim.x, aim.b + 5);
            const near = this.enemies.filter(o => o !== targetEnemy && !o.isBuilding && Math.abs(o.x - targetEnemy.x) <= MELEE_CLEAVE.radius);
            this.dealDamageToEnemy(targetEnemy, finalDmg, isCrit, { knock: 1, stop: hitScale >= 1 });
            near.forEach(o => this.dealDamageToEnemy(o, finalDmg * MELEE_CLEAVE.mul, false, { knock: 0.6 }));
            if (this.equippedArmId === 'arm_mutant') this.applyAcid(targetEnemy);   // 산성 이빨
        }
    }

    // 적 또는 거점 건물에 데미지 적용 및 소멸 처리
    // react: { knock(넉백 배율), stop(히트스톱) } — 몬스터/스킬의 직접 타격일 때만 (지속 피해는 생략)
    // react.dot: 지속 피해 — 피격 반응 없이 합산해 0.5초마다 숫자 표시
    dealDamageToEnemy(enemy, damage, isCrit, react = null) {
        if (enemy.armor && damage > 0) damage *= 1 - enemy.armor;   // 방패병·보스: 받는 피해 감소
        enemy.hp -= damage;
        if (react && !react.dot && enemy.hp > 0) this.hitReact(enemy, react);
        if (react && react.dot) {
            enemy.dotAcc = (enemy.dotAcc || 0) + damage;
        } else if (damage > 0) {
            const popupX = enemy.isBuilding ? aimOf(enemy).x - 24 : enemy.x;
            const popupY = enemy.isBuilding ? aimOf(enemy).b + 20 + Math.random() * 40 : 110 + Math.random() * 30;
            this.createDamagePopup(popupX, popupY, damage, isCrit);
        }

        if (enemy.hpBar) {
            const pct = Math.max(0, (enemy.hp / enemy.maxHp) * 100);
            enemy.hpBar.style.width = `${pct}%`;
        }

        if (enemy.isBuilding) {
            this.currentTargetHp = Math.max(0, enemy.hp);
            this.updateHud();
        }

        if (enemy.hp <= 0) {
            if (!this.enemies.includes(enemy)) return;   // 같은 프레임에 두 번 처리되지 않게
            // 거점 건물은 파괴 연출이 무너뜨린 뒤 치움
            if (enemy.dom && !enemy.isBuilding) enemy.dom.remove();
            this.enemies = this.enemies.filter(e => e.id !== enemy.id);

            if (enemy.isBuilding) {
                if (enemy.isFinal) {
                    this.finalBaseDestroyed = true;
                    this.starFlags[1] = true;
                    gameState.addDarkMatter(this.stage.reward.final);
                    this.updateHud();

                    // 남은 적 병사는 흩어지며 사라짐
                    this.enemies.forEach(e => {
                        if (!e.dom) return;
                        e.dom.classList.add('v2-rout');
                        setTimeout(() => e.dom.remove(), 600);
                    });
                    this.enemies = [];
                    this.cinematic = true;
                    monsterControllerV2.setState('victory');

                    // 연쇄 폭발 → 대폭발 → MISSION COMPLETE → 결과 화면
                    const run = this.runId;
                    this.director.baseDestroyed(enemy, true).then(() => {
                        if (this.runId === run && this.isActive) this.finishBattle(true);
                    });
                } else {
                    this.midBaseDestroyed = true;
                    this.starFlags[0] = true;
                    this.ruinHoldT = BASE_STATE.ruinHold;
                    gameState.addDarkMatter(this.stage.reward.mid);
                    if (this.domTargetLabel) this.domTargetLabel.textContent = '적 수비대 거점 HP (진격 중)';
                    this.director.baseDestroyed(enemy, false);
                    this.updateHud();
                }
            } else {
                this.stats.kills += 1;
                sound.play('enemy_die');
                gameState.addDarkMatter(killReward(this, enemy));
                if (enemy.boss) {
                    this.boss = null;
                    this.director.stamp('BOSS DOWN', `${enemy.t.name} 격파`, 'is-gold', 1500);
                    this.fx.play(BATTLE_VFX.baseFinale, enemy.x + 38, FOOT_B, { scale: 0.6 });
                }
                this.updateHud();

                if (this.equippedHeadId === 'head_hero' && Math.random() < HERO.recruitChance) {
                    this.recruit(enemy.x);
                }
            }
        }
    }

    // 전투 종료 → 결과 화면 (승리: 최종 기지 파괴 연출 뒤 / 패배: 쓰러짐 연출 뒤)
    finishBattle(victory) {
        // 세 번째 별: 목표 시간(stage.starTime) 안에 클리어 (D-029)
        if (victory && this.stats.time <= this.stage.starTime) this.starFlags[2] = true;
        const prevStars = [...progress.stage(this.stage.id).stars];
        const record = progress.recordStage(this.stage.id, { stars: this.starFlags, cleared: victory, time: this.stats.time });
        const next = victory ? nextStageOf(this.stage.id) : null;
        const result = {
            victory,
            stage: this.stage,
            starFlags: [...this.starFlags],
            bestStars: progress.stage(this.stage.id).stars,
            prevStars,
            newStars: record.newStars,
            bonus: record.bonus,
            next,
            timeUp: !victory && this.timeUp,
            overloads: this.stats.overloads || 0,
            distance: Math.min(this.maxDistance, this.distanceTraveled),
            kills: this.stats.kills,
            time: this.stats.time,
            dm: Math.max(0, gameState.darkMatter - this.stats.startDm)
        };
        this.stopBattle();
        setTimeout(() => { if (!this.isActive) sound.playBgm('menu', 2.5); }, 1200);
        this.director.showResult(result, act => {
            if (act === 'next' && next) progress.selectStage(next.id);
            if (this.onNavigate) this.onNavigate(act === 'retry' || act === 'next' ? 'battle' : act);
        });
    }

    // 메인 게임 루프
    loop(timestamp) {
        if (!this.isActive) return;
        const dt = Math.min(0.1, (timestamp - this.lastTime) / 1000) * gameTime.scale(timestamp);   // 히트스톱/일시정지 0, 배속 적용
        this.lastTime = timestamp;

        if (this.finalBaseDestroyed || this.timeUp) {   // 승리 연출 / 시간 초과 연출 중: 전투 정지
            this.loopId = requestAnimationFrame((t) => this.loop(t));
            return;
        }

        if (!this.finalBaseDestroyed) {
            this.stats.time += dt;
            if (this.checkTimeLimit()) {
                this.loopId = requestAnimationFrame((t) => this.loop(t));
                return;
            }
            this.checkOverload(dt);
            this.tickAcid(dt);
            this.updateBaseArt();
            this.tickPlayerStatus(dt);
            this.tickArtillery(dt);
            if (this.spawnSilence > 0) {
                this.spawnSilence -= dt;   // EMP 뒤 소환 중단
            } else {
                this.spawnTimer += dt;
                if (this.spawnTimer >= this.spawnInterval && this.enemies.filter(e => !e.isBuilding).length < this.stage.enemy.max) {
                    this.spawnTimer = 0;
                    this.spawnMinion();
                }
            }
        }

        if (this.equippedHeadId === 'head_mutant' && this.playerHp < this.maxPlayerHp) {
            const regenAmount = this.maxPlayerHp * PASSIVE.regen * dt;
            this.playerHp = Math.min(this.maxPlayerHp, this.playerHp + regenAmount);
            monsterControllerV2.updateHpBar(this.playerHp, this.maxPlayerHp);

            this.regenPopupTimer = (this.regenPopupTimer || 0) + dt;
            if (this.regenPopupTimer >= 1.0) {
                this.regenPopupTimer = 0;
                this.createDamagePopup(this.monsterX + 40, 180, `+${Math.round(this.maxPlayerHp * PASSIVE.regen)} REGEN`, false);
                this.fx.play(KAIJU_VFX.regen, this.monsterX + 35, FOOT_B, { follow: () => [this.monsterX + 35, FOOT_B] });
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
                const inZone = dist >= HERO.curseZone[0] && dist <= HERO.curseZone[1];
                if (inZone !== !!enemy.cursed) {
                    enemy.cursed = inZone;          // 저주 상태 (장판 촉수 + 어두운 색 + ☠ 아이콘)
                    this.updateEnemyFilter(enemy);
                }
                if (inZone) {
                    enemy.hp -= HERO.curseDps * dt;
                    if (enemy.hpBar) {
                        enemy.hpBar.style.width = `${Math.max(0, (enemy.hp / enemy.maxHp) * 100)}%`;
                    }
                    if (tickCursePopup) {
                        // 흑마법 틱: 발밑 고리가 조여들고 머리 위 ▼ 표식이 가라앉음
                        this.fx.play(HERO_VFX.curseTick, aimOf(enemy).x, FOOT_B);
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
                    enemy.hp -= PASSIVE.sporeDps * dt;
                    if (enemy.hpBar) {
                        enemy.hpBar.style.width = `${Math.max(0, (enemy.hp / enemy.maxHp) * 100)}%`;
                    }
                    if (tickSporePopup) {
                        this.fx.play(KAIJU_VFX.sporeTick, aimOf(enemy).x, FOOT_B);
                        this.createDamagePopup(enemy.x, 130, `☣ -${Math.round(PASSIVE.sporeDps * 0.75)}`, false);
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
                    enemy.hp -= PASSIVE.quakeDps * dt;
                    if (enemy.hpBar) {
                        enemy.hpBar.style.width = `${Math.max(0, (enemy.hp / enemy.maxHp) * 100)}%`;
                    }
                    if (tickQuakePopup) {
                        this.fx.play(CHIMERA_VFX.quakeTick, aimOf(enemy).x, FOOT_B);
                        this.createDamagePopup(enemy.x, 130, `💥 -${Math.round(PASSIVE.quakeDps * 0.75)}`, false);
                    }
                    if (enemy.hp <= 0) {
                        this.dealDamageToEnemy(enemy, 0, false);
                    }
                }
            });
        }

        // 지속 피해 숫자 모아서 표시
        this.dotTimer += dt;
        if (this.dotTimer >= POPUP.dotFlushSec) {
            this.dotTimer = 0;
            this.enemies.forEach(e => {
                if (e.dotAcc >= 1) this.createDamagePopup(e.x + 20, 105, e.dotAcc, false, 'dot');
                e.dotAcc = 0;
            });
        }

        // 스킬: 예약 실행, 쿨다운/게이지/자동 사용, HUD
        this.tickTimers(dt);
        this.tickSkills(dt);
        this.hud.update(dt);

        // [합성괴인 머리 패시브] 체력 50% 이하 자동 2페이즈
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
            if (hit > 0 && !this.playerStunned()) this.fireAttack(closestEnemy, hit);

            // 거점 건물은 가까이 붙으면 직접 공격 (적 보병은 enemies_v2.js에서)
            if (minDistance <= 70 && closestEnemy.isBuilding) {
                this.damagePlayer(closestEnemy.dps * dt, dt);
            }
        } else if (activeBuilding) {
            monsterControllerV2.setState('walking-forward');
            this.monsterX += this.playerSpeed * dt * this.moveMul();
            monsterControllerV2.setMonsterPosition(this.monsterX);
        } else if (this.ruinHoldT > 0) {
            this.ruinHoldT -= dt;
            monsterControllerV2.setState('victory');
        } else {
            monsterControllerV2.setState('walking');
            this.scrollRuins(dt);

            if (this.monsterX > 150) {
                this.monsterX = Math.max(150, this.monsterX - 120 * dt);
                monsterControllerV2.setMonsterPosition(this.monsterX);
            }

            if (this.distanceTraveled < this.maxDistance) {
                this.distanceTraveled += this.playerSpeed * dt * 0.4 * this.moveMul();
                this.updateHud();

                if (this.distanceTraveled >= this.stage.midAt && !this.midBaseSpawned && !this.midBaseDestroyed) {
                    this.spawnMidBase();
                } else if (this.distanceTraveled >= this.stage.finalAt && !this.finalBaseSpawned) {
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
                this.dealDamageToEnemy(closestEnemyToAlly, ally.dps * dt, false, { dot: true });

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
            if (enemy.stunT > 0) {
                enemy.stunT -= dt;
                if (enemy.stunT <= 0) this.updateEnemyFilter(enemy);
                return;   // 기절: 이동/공격 없음
            }
            if (!enemy.isBuilding) updateEnemy(this, enemy, dt, monsterFrontX);   // 이동·공격·종류별 능력
        });

        this.loopId = requestAnimationFrame((t) => this.loop(t));
    }
}

export const battleEngineV2 = new BattleEngine();
