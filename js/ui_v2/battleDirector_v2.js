/* ==========================================================================
   PROJECT: MAD OVERLORD // 전투 연출 (v2)
   전투 엔진(battle_v2.js)이 알맞은 순간에 부르는 화면 연출을 모았다. 전투 규칙은 건드리지 않는다.
   - intro()          : 출격 인트로 (레터박스 + 작전명 카드 + SORTIE!) → HUD 등장
   - warning(kind)    : 거점 출현 경고 (붉은 테두리 + 경고 줄무늬 + WARNING / DANGER)
   - ultCutIn(...)    : 필살기 컷인 (화면 어둡게 + 집중선 + 사선 띠 초상화) + 슬로모션
   - baseDestroyed()  : 거점 파괴 (연쇄 폭발 → 대폭발, 흔들림, 섬광, 슬로모션, 별 획득)
   - playerDown()     : 캐릭터가 쓰러짐 (슬로모션, 붉은 섬광, 흑백으로 주저앉음)
   - showResult()     : 승리/패배 결과 화면 (별 도장, 전투 기록, 보상 카운트업, 다음 행동 버튼)
   - setLowHp(on)     : 체력 30% 미만 화면 가장자리 붉은 경고
   효과음은 sfx(이름)으로 연결 지점만 둔다 (4단계 사운드 작업에서 사운드 매니저를 연결).
   ========================================================================== */

import { icon } from './icons.js';
import { gameTime } from '../engine_v2/gameTime.js';
import { monsterControllerV2 } from '../engine_v2/monster_v2.js';
import { BATTLE_VFX } from '../engine_v2/vfx/vfxDefs.js';

const STAGE = { code: 'OPERATION 07', name: 'SECTOR 7', title: '적 수비대 거점 공략', goal: '중간 요새 → 최종 핵심 기지 파괴' };
const INTRO_MS = { card: 150, sortie: 1750, reveal: 2150, end: 2700 };
const FB = 58;   // 지면 높이 (bottom px)

const wait = ms => new Promise(r => setTimeout(r, ms));

export class BattleDirector {
    constructor(engine) {
        this.b = engine;
        this.frame = null;
        this.onSfx = null;      // (이름) => 효과음 재생 — 사운드 작업 때 연결
        this.token = 0;         // 전투가 다시 시작되면 진행 중인 연출(대기 중 타이머)을 무효화
    }

    sfx(name) {
        if (this.onSfx) this.onSfx(name);
    }

    attach() {
        this.frame = document.querySelector('#screen-battle-v2 .v2-battle');
        this.viewport = document.getElementById('battle-viewport-v2');
        if (!this.frame) return false;
        if (!this.vignette) {
            this.vignette = document.createElement('div');
            this.vignette.className = 'v2-vignette';
            this.frame.appendChild(this.vignette);
        }
        return true;
    }

    /** 전투 시작/재시작: 이전 전투의 연출을 모두 걷어냄 */
    clear() {
        if (!this.attach()) return;
        this.token += 1;
        this.frame.querySelectorAll('.v2-fx-layer').forEach(n => n.remove());
        this.frame.classList.remove('v2-intro', 'v2-lowhp', 'v2-alert', 'v2-ending');
        this.lowHp = false;
        const canvas = document.getElementById('player-sprite-canvas-v2');
        if (canvas) canvas.classList.remove('v2-down');
        monsterControllerV2.freezeRig(false);
    }

    layer(cls, html = '') {
        const el = document.createElement('div');
        el.className = `v2-fx-layer ${cls}`;
        el.innerHTML = html;
        this.frame.appendChild(el);
        return el;
    }

    alive(token) {
        return token === this.token;
    }

    // ------------------------------------------------------------------
    /** 출격 인트로: 레터박스 + 작전명 → SORTIE! → HUD 등장. 클릭하면 건너뜀 */
    async intro() {
        if (!this.attach()) return;
        const token = this.token;
        this.frame.classList.add('v2-intro');
        const bars = this.layer('v2-letterbox', '<i></i><i></i>');
        const card = this.layer('v2-opcard', `
            <div class="v2-opcard__inner">
                <small>${STAGE.code}</small>
                <h2>${STAGE.name}<span>//</span>${STAGE.title}</h2>
                <p>${icon('hq', 14)} 목표: ${STAGE.goal}</p>
                <div class="v2-hazard v2-opcard__stripe"></div>
            </div>`);
        let skipped = false;
        const skip = () => { skipped = true; };
        this.frame.addEventListener('pointerdown', skip, { once: true });
        this.sfx('intro_whoosh');

        const until = async ms => {
            const start = performance.now();
            while (!skipped && performance.now() - start < ms) await wait(30);
        };
        await until(INTRO_MS.card);
        if (!this.alive(token)) return;
        card.classList.add('is-in');
        await until(INTRO_MS.sortie - INTRO_MS.card);
        if (!this.alive(token)) return;
        card.classList.add('is-out');
        const sortie = this.layer('v2-stamp v2-stamp--sortie', '<strong>SORTIE!</strong><small>출격</small>');
        this.sfx('intro_sortie');
        await until(INTRO_MS.reveal - INTRO_MS.sortie);
        if (!this.alive(token)) return;
        this.frame.classList.remove('v2-intro');
        bars.classList.add('is-out');
        await wait(skipped ? 0 : INTRO_MS.end - INTRO_MS.reveal);
        this.frame.removeEventListener('pointerdown', skip);
        [bars, card, sortie].forEach(n => n.remove());
    }

    // ------------------------------------------------------------------
    /** 거점 출현 경고. kind: 'mid' | 'final' */
    async warning(kind) {
        if (!this.attach()) return;
        const token = this.token;
        const final = kind === 'final';
        const el = this.layer(`v2-warning${final ? ' is-final' : ''}`, `
            <div class="v2-warning__band">
                <div class="v2-warning__stripe"></div>
                <div class="v2-warning__body">
                    <strong data-text="${final ? 'DANGER' : 'WARNING'}">${final ? 'DANGER' : 'WARNING'}</strong>
                    <span>${final ? '최종 핵심 기지 출현 — 진격하여 분쇄하라' : '중간 거점 요새 출현 — 돌격하여 분쇄하라'}</span>
                </div>
                <div class="v2-warning__stripe"></div>
            </div>`);
        this.frame.classList.add('v2-alert');
        this.sfx(final ? 'warning_danger' : 'warning');
        await wait(2300);
        if (!this.alive(token)) return;
        this.frame.classList.remove('v2-alert');
        el.classList.add('is-out');
        await wait(300);
        el.remove();
    }

    // ------------------------------------------------------------------
    /** 필살기 컷인: 화면을 어둡게 하고 사선 띠에 초상화 + 스킬 이름, 그동안 전투는 슬로모션 */
    ultCutIn(sk, portraitSrc) {
        if (!this.attach()) return;
        gameTime.slowMo(0.22, 1.0);
        this.sfx('ult_cutin');
        const el = this.layer('v2-ultcut', `
            <div class="v2-ultcut__dim"></div>
            <div class="v2-ultcut__band">
                <div class="v2-ultcut__lines"></div>
                ${portraitSrc ? `<img class="v2-ultcut__face" src="${portraitSrc}" alt="">` : `<span class="v2-ultcut__face">${icon(sk.icon, 120)}</span>`}
                <div class="v2-ultcut__text">
                    <small>ULTIMATE SKILL</small>
                    <strong>${sk.name}</strong>
                    <span>${icon(sk.icon, 16)} ${sk.desc || ''}</span>
                </div>
            </div>`);
        el.style.setProperty('--sk', sk.color);
        setTimeout(() => el.remove(), 1250);
    }

    // ------------------------------------------------------------------
    /** 화면 흔들림 (전장만). px: 세기, ms: 길이 — 리그 흔들림과 따로 Web Animations로 */
    shake(px = 8, ms = 400) {
        if (!this.viewport || !this.viewport.animate) return;
        const frames = [];
        const n = Math.max(4, Math.round(ms / 40));
        for (let i = 0; i <= n; i++) {
            const a = px * (1 - i / n);
            const x = i === n ? 0 : (i % 2 ? 1 : -1) * a * (0.6 + 0.4 * Math.abs(Math.sin(i * 1.7)));
            const y = i === n ? 0 : Math.cos(i * 2.3) * a * 0.6;
            frames.push({ transform: `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)` });
        }
        this.viewport.animate(frames, { duration: ms, easing: 'linear' });
    }

    /** 전체 섬광 */
    flash(color = '#fff', ms = 220, peak = 0.85) {
        if (!this.attach()) return;
        const el = this.layer('v2-flash');
        el.style.background = color;
        el.animate([{ opacity: peak }, { opacity: 0 }], { duration: ms, easing: 'ease-out' }).onfinish = () => el.remove();
    }

    // ------------------------------------------------------------------
    /**
     * 거점 파괴: 건물 곳곳에서 연쇄 폭발 → 대폭발 + 섬광 + 흔들림 + 슬로모션.
     * 중간 요새는 별이 HUD로 날아가고 진격 재개, 최종 기지는 MISSION COMPLETE 후 결과 화면.
     * @returns {Promise} 연출이 끝나면 resolve
     */
    async baseDestroyed(enemy, isFinal) {
        if (!this.attach()) return;
        const token = this.token;
        const fx = this.b.fx;
        const w = isFinal ? 120 : 90;
        const cx = enemy.x + w / 2;
        gameTime.speed = 1;                 // 연출 타이밍을 실제 시간에 맞춤
        gameTime.hitStop(0.09, 0);
        this.flash('#fff', 160, 0.55);
        this.shake(isFinal ? 7 : 5, 380);

        // 건물: 달아오르며 흔들리다 무너져 내림
        const dom = enemy.dom;
        if (dom) {
            dom.classList.add('v2-wreck');
            if (isFinal) dom.classList.add('v2-wreck--final');
        }

        // 연쇄 폭발 (건물 위를 오르내리며)
        const n = isFinal ? 7 : 4;
        const gap = isFinal ? 150 : 130;
        for (let i = 0; i < n; i++) {
            const bx = enemy.x + 12 + ((i * 37) % (w - 24));
            const bb = FB + 30 + ((i * 53) % (isFinal ? 150 : 110));
            fx.play(BATTLE_VFX.baseBlast, bx, bb, { scale: isFinal ? 1.45 : 1.1 });
            if (i % 2 === 0) this.shake(isFinal ? 5 : 3, 200);
            await wait(gap);
            if (!this.alive(token)) return;
        }

        // 대폭발
        fx.play(BATTLE_VFX.baseFinale, cx, FB, { scale: isFinal ? 1.4 : 0.85 });
        this.flash(isFinal ? '#fff3d0' : '#fff', isFinal ? 420 : 260, isFinal ? 0.95 : 0.7);
        this.shake(isFinal ? 16 : 10, isFinal ? 900 : 600);
        gameTime.slowMo(isFinal ? 0.3 : 0.45, isFinal ? 1.7 : 1.0);
        if (dom) setTimeout(() => dom.remove(), 700);

        if (!isFinal) {
            this.flyStar(cx, FB + 110);
            this.stamp('FORTRESS DESTROYED', '중간 거점 요새 분쇄 · 진격 재개', 'is-gold', 1600);
            return;
        }
        await wait(1500);
        if (!this.alive(token)) return;
        this.frame.classList.add('v2-ending');
        this.stamp('MISSION COMPLETE', '최종 핵심 기지 완전 분쇄', 'is-gold is-big', 1900);
        this.sfx('mission_complete');
        await wait(2000);
    }

    /** 가운데 도장 문구 (잠깐 표시) */
    stamp(title, sub, cls = '', ms = 1600) {
        const el = this.layer(`v2-stamp ${cls}`, `<strong>${title}</strong><small>${sub}</small>`);
        el.style.setProperty('--out', `${ms - 320}ms`);
        setTimeout(() => el.remove(), ms);
        return el;
    }

    /** 거점 자리에서 별이 튀어올라 HUD 별 칸으로 날아감 */
    flyStar(x, b) {
        const target = document.getElementById('battle-stars-v2');
        if (!target || !this.viewport) return;
        const fr = this.frame.getBoundingClientRect();
        const vr = this.viewport.getBoundingClientRect();
        const tr = target.getBoundingClientRect();
        const sx = vr.left - fr.left + x, sy = vr.bottom - fr.top - b;
        const tx = tr.left - fr.left + tr.width / 2, ty = tr.top - fr.top + tr.height / 2;
        const el = this.layer('v2-flystar', icon('star', 44));
        el.style.left = `${sx}px`;
        el.style.top = `${sy}px`;
        this.sfx('star_get');
        el.animate([
            { transform: 'translate(-50%, -50%) scale(0.2) rotate(-40deg)', opacity: 0 },
            { transform: 'translate(-50%, -140%) scale(1.5) rotate(0deg)', opacity: 1, offset: 0.3 },
            { transform: 'translate(-50%, -140%) scale(1.3) rotate(0deg)', opacity: 1, offset: 0.5 },
            { transform: `translate(calc(${tx - sx}px - 50%), calc(${ty - sy}px - 50%)) scale(0.45) rotate(360deg)`, opacity: 1 }
        ], { duration: 1300, easing: 'cubic-bezier(.5, 0, .3, 1)' }).onfinish = () => {
            el.remove();
            target.classList.remove('is-gain');
            void target.offsetWidth;
            target.classList.add('is-gain');
        };
    }

    // ------------------------------------------------------------------
    /** 캐릭터가 쓰러짐: 붉은 섬광 + 슬로모션 + 흑백으로 주저앉음 → MISSION FAILED */
    async playerDown() {
        if (!this.attach()) return;
        const token = this.token;
        gameTime.speed = 1;
        gameTime.slowMo(0.3, 1.4);
        this.flash('#ff1a3c', 500, 0.6);
        this.shake(10, 600);
        this.frame.classList.add('v2-ending');
        const canvas = document.getElementById('player-sprite-canvas-v2');
        if (canvas) canvas.classList.add('v2-down');
        this.sfx('player_down');
        await wait(900);
        if (!this.alive(token)) return;
        monsterControllerV2.freezeRig(true);
        this.stamp('MISSION FAILED', '기체 대파 · 작전 실패', 'is-red is-big', 1600);
        this.sfx('mission_failed');
        await wait(1500);
    }

    // ------------------------------------------------------------------
    setLowHp(on) {
        if (!this.attach() || on === this.lowHp) return;
        this.lowHp = on;
        this.frame.classList.toggle('v2-lowhp', on);
        if (on) this.sfx('low_hp');
    }

    // ------------------------------------------------------------------
    /**
     * 결과 화면. r: { victory, stars, distance, kills, time, dm }
     * onAction(name): 'retry' | 'lab' | 'menu'
     */
    showResult(r, onAction) {
        if (!this.attach()) return;
        const token = this.token;
        const mm = String(Math.floor(r.time / 60)).padStart(2, '0');
        const ss = String(Math.floor(r.time % 60)).padStart(2, '0');
        const starLabels = ['중간 요새', '최종 기지'];
        const el = this.layer(`v2-result ${r.victory ? 'is-win' : 'is-lose'}`, `
            <div class="v2-result__panel v2-panel">
                <div class="v2-hazard v2-result__stripe"></div>
                <small class="v2-result__op">${STAGE.code} · ${STAGE.name}</small>
                <h2 class="v2-result__title">${r.victory ? 'MISSION COMPLETE' : 'MISSION FAILED'}</h2>
                <p class="v2-result__sub">${r.victory ? '적 수비대 거점을 모두 분쇄했습니다' : '기체가 대파되어 퇴각했습니다'}</p>
                <div class="v2-result__stars">
                    ${starLabels.map((label, i) => `
                        <div class="v2-result__star${i < r.stars ? ' is-on' : ''}" style="--d:${0.35 + i * 0.35}s">
                            ${icon('star', 54)}<span>${label}</span>
                        </div>`).join('')}
                </div>
                <dl class="v2-result__stats">
                    <div><dt>진격 거리</dt><dd>${Math.round(r.distance)}m</dd></div>
                    <div><dt>처치</dt><dd>${r.kills}</dd></div>
                    <div><dt>전투 시간</dt><dd>${mm}:${ss}</dd></div>
                    <div class="is-reward"><dt>${icon('gem', 16)} 획득 DM</dt><dd><strong data-count="${r.dm}">+0</strong></dd></div>
                </dl>
                ${r.victory ? '' : '<p class="v2-result__tip">연구소에서 파츠를 바꿔 기체를 강화해 보세요.</p>'}
                <div class="v2-result__actions">
                    <button class="v2-btn v2-btn--primary" data-act="retry">${icon('play', 16)} ${r.victory ? '다시 출격' : '재도전'}</button>
                    <button class="v2-btn v2-btn--ghost" data-act="lab">${icon('gear', 16)} 연구소</button>
                    <button class="v2-btn v2-btn--ghost" data-act="menu">메인 메뉴</button>
                </div>
            </div>`);
        el.querySelectorAll('[data-act]').forEach(btn => btn.addEventListener('click', () => {
            this.sfx('ui_click');
            onAction(btn.dataset.act);
        }));
        this.sfx(r.victory ? 'result_win' : 'result_lose');
        // 별 도장 효과음 + 보상 카운트업
        for (let i = 0; i < r.stars; i++) setTimeout(() => this.alive(token) && this.sfx('result_star'), (350 + i * 350) + 250);
        const num = el.querySelector('[data-count]');
        const total = r.dm;
        const start = performance.now() + 900;
        const dur = Math.min(1600, 500 + total * 0.4);
        const step = now => {
            if (!this.alive(token) || !num.isConnected) return;
            const u = Math.max(0, Math.min(1, (now - start) / dur));
            const v = Math.round(total * (1 - Math.pow(1 - u, 3)));
            num.textContent = `+${v.toLocaleString()}`;
            if (u < 1) requestAnimationFrame(step);
            else num.classList.add('is-done');
        };
        requestAnimationFrame(step);
        if (total > 0) setTimeout(() => this.alive(token) && this.sfx('ui_countup'), 900);
    }
}
