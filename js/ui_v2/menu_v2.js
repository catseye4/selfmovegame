/* ==========================================================================
   PROJECT: MAD OVERLORD // 메인 화면: 전술 그리드 (v2, 가로 1280x720)
   ① 오버로드 대기실: 장착 파츠로 조립된 캐릭터(리그 idle) + 부위별 파츠·스킬 설명 + 능력치 + MUTATION LAB
   ② 전술 레이더: 챕터 스테이지 점(누르면 선택), 선택한 스테이지 정보 (STORY / SPECIAL 전환 — SPECIAL은 준비 중)
   ③ ATTACK / SORTIE 출격 버튼 + 상태 줄(보유 DM, 장착 스킬)
   ④ 우상단: 재화, 설정(톱니바퀴)
   ========================================================================== */

import { gameState } from '../engine/state.js';
import { monsterControllerV2 } from '../engine_v2/monster_v2.js';
import { skillsForParts, legPassiveOf } from '../engine_v2/skills_v2.js';
import { progress } from '../engine_v2/progress_v2.js';
import { CHAPTER1, STAGES, stageById, isUnlocked, defaultStage } from '../engine_v2/stages_v2.js';
import { ENEMY_TYPES } from '../engine_v2/enemies_v2.js';
import { sound } from '../engine_v2/audio/sound_v2.js';
import { icon, fillIcons } from './icons.js';
import { openSettings } from './settingsPanel_v2.js';
import { TacticalRadar } from './radar_v2.js';

const $ = id => document.getElementById(id);
const SLOTS = [
    { slot: 'head', label: 'HEAD', role: 'ULT' },
    { slot: 'arm', label: 'ARM', role: '1' },
    { slot: 'body', label: 'BODY', role: '2' },
    { slot: 'leg', label: 'LEG', role: 'P' }
];

export class MenuController {
    constructor(switchScreenFn) {
        this.switchScreen = switchScreenFn;
        this.root = $('screen-menu-v2');
        this.domDmCount = $('menu-dm-count-v2');
        this.domFactionName = $('menu-faction-name-v2');
        this.map = 'story';
        this.radar = new TacticalRadar($('menu-radar-v2'));
        fillIcons(this.root);
        const chip = this.root && this.root.querySelector('.v2-chip--dm');
        if (chip) chip.insertAdjacentHTML('afterbegin', icon('gem', 18));
        this.initEvents();
    }

    initEvents() {
        $('btn-to-lab-v2')?.addEventListener('click', () => {
            gameState.resetCartToEquipped();
            this.switchScreen('lab');
        });
        $('btn-to-battle-v2')?.addEventListener('click', () => {
            if (this.map !== 'story') return;
            this.switchScreen('battle');
        });
        $('btn-menu-settings-v2')?.addEventListener('click', () => openSettings());
        this.root?.querySelectorAll('.v2-maptab').forEach(tab => tab.addEventListener('click', () => this.setMap(tab.dataset.map)));
    }

    setMap(map) {
        this.map = map;
        this.radar.setMode(map);
        this.root.querySelectorAll('.v2-maptab').forEach(t => t.classList.toggle('is-on', t.dataset.map === map));
        const story = map === 'story';
        $('menu-radar-locked-v2').hidden = story;
        $('menu-map-name-v2').textContent = story ? CHAPTER1.name : 'SPECIAL · 무한 파밍 / 엘리트 챌린지';
        const sortie = $('btn-to-battle-v2');
        sortie.disabled = !story;
        if (story) this.renderStages();
        else {
            $('menu-map-foot-v2').textContent = 'SPECIAL MAP · 준비 중';
            $('menu-sortie-sub-v2').textContent = 'SPECIAL MAP 준비 중 — STORY MAP으로 출격';
        }
    }

    // ---- 스테이지 선택 (레이더 점) ----
    /** 지금 고른 스테이지 (저장된 선택이 열려 있으면 그것, 아니면 아직 못 깬 첫 스테이지) */
    currentStage() {
        const sel = progress.selectedStage;
        return sel && isUnlocked(sel, progress) ? stageById(sel) : defaultStage(progress);
    }

    selectStage(id) {
        if (!isUnlocked(id, progress)) {
            sound.play('ui_error');
            $('menu-map-foot-v2').innerHTML = `<b>${id}</b> 잠김 — 이전 스테이지를 먼저 클리어하세요`;
            return;
        }
        sound.play('ui_tab');
        progress.selectStage(id);
        this.renderStages();
    }

    renderStages() {
        const cur = this.currentStage();
        progress.selectedStage = cur.id;
        const nodes = STAGES.map(st => ({
            id: st.id, at: st.map, boss: !!st.boss, name: `${st.id} ${st.name}`,
            state: progress.stage(st.id).cleared ? 'cleared' : isUnlocked(st.id, progress) ? 'open' : 'locked',
            stars: progress.starCount(st.id)
        }));
        this.radar.setStages(nodes, cur.id, id => this.selectStage(id));
        const stars = progress.stage(cur.id).stars.map(f => (f ? '★' : '☆')).join('');
        const enemies = Object.keys(cur.enemy.mix).map(k => ENEMY_TYPES[k].name).join(' · ');
        const best = progress.stage(cur.id).bestTime;
        const clock = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
        $('menu-map-foot-v2').innerHTML = `<b>${cur.id} ${cur.name}</b> <span class="v2-stars">${stars}</span>`
            + `<span class="v2-radar__time">⏱ 제한 ${clock(cur.timeLimit)} · ★ ${cur.starTime}초 안에${best ? ` · 최고 ${clock(best)}` : ''}</span>`
            + `<small>${cur.desc} · 적: ${enemies}${cur.boss ? ' · 보스' : ''}</small>`;
        $('menu-sortie-sub-v2').textContent = `STAGE ${cur.id} ${cur.name} 출격`;
    }

    /** 메인 화면이 보일 때마다: 장착 상태로 캐릭터/설명/능력치/상태 줄 갱신, 레이더 시작 */
    updateDisplay() {
        if (this.domDmCount) this.domDmCount.textContent = gameState.darkMatter.toLocaleString();
        const equipped = gameState.getEquippedObjects();
        monsterControllerV2.renderVisuals(equipped);

        // 캐릭터 이름/팩션 (캐릭터는 몸통 팩션으로 정해짐)
        const portrait = monsterControllerV2.getPortrait();
        const body = equipped.body && equipped.body.id !== 'none' ? equipped.body : null;
        $('menu-unit-name-v2').textContent = portrait ? portrait.name : 'OVERLORD';
        if (this.domFactionName) this.domFactionName.textContent = body ? body.faction : '몸통 파츠 없음 — 연구소에서 장착';

        this.renderCallouts(equipped);
        this.renderStats();
        this.renderStatusBar(equipped);
        if (this.map === 'story') {
            $('menu-map-name-v2').textContent = CHAPTER1.name;
            this.renderStages();
        }
        if (gameState.currentScreen === 'menu' || !gameState.currentScreen) this.radar.start();
    }

    renderCallouts(equipped) {
        const skills = skillsForParts(equipped);
        $('menu-callouts-v2').innerHTML = SLOTS.map(({ slot, label, role }, i) => {
            const part = equipped[slot];
            const has = part && part.id !== 'none';
            const sk = skills[slot];
            const leg = slot === 'leg' ? legPassiveOf(part) : null;
            const lv = has ? progress.levelOf(part.id) : 1;
            const skillLine = sk ? `<span style="--sk:${sk.color}">${icon(sk.icon, 12)}<i>${role === 'ULT' ? '필살기' : `스킬 ${role}`} · ${sk.name}</i></span>`
                : leg ? `<span><i>패시브 · ${leg.name}</i></span>` : '<span><i>—</i></span>';
            return `<li data-slot="${slot}" class="${i >= 2 ? 'is-right' : ''}">
                <b>${label}${lv > 1 ? ` · Lv${lv}` : ''}</b><strong>${has ? part.name : '비어 있음'}</strong>${skillLine}</li>`;
        }).join('');
    }

    renderStats() {
        const st = progress.equippedStats();   // 강화 레벨 반영
        const rows = [['ARMOR', st.hp], ['POWER', st.dps], ['RANGE', st.range], ['SPEED', st.speed]];
        $('menu-stats-v2').innerHTML = rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${Number(v).toLocaleString()}</dd></div>`).join('');
    }

    renderStatusBar(equipped) {
        const skills = skillsForParts(equipped);
        const list = ['arm', 'body', 'head'].map(s => skills[s]).filter(Boolean)
            .map(sk => `<span class="v2-statusbar__skill" style="--sk:${sk.color}">${icon(sk.icon, 14)}${sk.name}</span>`).join('');
        const ready = !!(equipped.body && equipped.body.id !== 'none');
        $('menu-statusbar-v2').innerHTML = `
            <span><b>DARK MATTER</b><strong>${gameState.darkMatter.toLocaleString()}</strong></span>
            <span><b>SKILLS</b>${list || '<em>장착 스킬 없음</em>'}</span>
            <span><b>SQUAD</b><strong style="color:${ready ? 'var(--v2-green)' : 'var(--v2-amber)'}">${ready ? 'DEPLOYABLE' : 'NO BODY'}</strong></span>`;
    }

    /** 메인 화면을 떠날 때: 레이더 멈춤 */
    onLeave() {
        this.radar.stop();
    }
}

