/* ==========================================================================
   PROJECT: MAD OVERLORD // RIG TEST — 테스트 화면 컨트롤러
   rig_test.html 전용. 게임과 같은 리그 엔진(js/engine_v2/rig/)을 사용해 동작만 따로 확인한다.
   ========================================================================== */

import { Animator, Spring, Mat } from '../engine_v2/rig/rig.js';
import { RIG_CHARACTERS, attackClipOf, hitSocketOf } from '../engine_v2/rig/characters.js';
import { loadRigAssets, applyRigEvent, buildSkeleton, restBounds, shieldGeom, ScaleTween, PHASE2_SCALE }
    from '../engine_v2/rig/rigAvatar.js';
import { RigEffects } from '../engine_v2/rig/rigEffects.js';
import { VfxPlayer } from '../engine_v2/vfx/vfxPlayer.js';
import { HERO_WAVE, HERO_ORB } from '../engine_v2/vfx/heroVfx.js';
import { HERO_VFX, MECH_VFX, KAIJU_VFX, CHIMERA_VFX } from '../engine_v2/vfx/vfxDefs.js';

const STAGE_W = 960;
const STAGE_H = 600;
const GROUND_Y = 520;
const CHAR_X = 380;
const CHAR_SCALE = 0.42;     // 원본 약 950px → 화면 약 400px
const PIXEL = 4;             // 도트 모드: 1/4 해상도(캐릭터 약 100px)로 그린 뒤 4배 확대
const FIXED_DT = 1 / 120;
const STEP_FPS = 12;
const SCROLL_SPEED = 140;
const FADE_SEC = 0.18;

// bg/fx: 배경·HUD와 이펙트 그리기 (스프라이트 굽기용으로 끌 수 있음, tools/rig/bake_sprite.py)
const opts = { crossfade: true, springs: true, pixel: false, stepped: false, bones: false, scroll: true, speed: 1,
    bg: true, fx: true, dummies: false };
const state = { char: 'mech', mode: 'idle', arm: 'cannon', paused: false };

let character, skeleton, animator, effects, springs, bounds;
let onceClip = null;               // 점프/변신처럼 한 번 재생 중인 클립

// ---- 스킬 이펙트 확인용: 전장 VFX + 고블린 더미 (게임 전투와 같은 비율) ----
const vfx = new VfxPlayer();
const VFX_SCALE = CHAR_SCALE / 0.235;            // 게임 전투 배율 대비 (캐릭터가 약 1.8배 큼)
const GOBLIN_SRC = 'assets/sprites/enemy/goblin_walk_sheet.png';
const dummies = [330, 440, 550].map(dx => ({ x: CHAR_X + dx * VFX_SCALE * 0.56, flash: 0, slow: 0 }));
const skill = { curse: false, wave: false, curseTimer: 0, castCb: null };
let goblinImg = null;
const giant = new ScaleTween();    // 2페이즈 거대화 배율
let mainCtx, offCanvas, offCtx;
let groundOffset = 0;
let simTime = 0;
let dirty = true;
const eventLog = [];

let stageM = Mat.trs(CHAR_X, GROUND_Y, 0, CHAR_SCALE, CHAR_SCALE);
const toStage = p => Mat.apply(stageM, p[0], p[1]);

function applyScale() {
    const s = CHAR_SCALE * giant.value;
    stageM = Mat.trs(CHAR_X, GROUND_Y, 0, s, s);
    effects.k = giant.value;
}

async function init() {
    const canvas = document.getElementById('rig-canvas');
    mainCtx = canvas.getContext('2d');
    offCanvas = document.createElement('canvas');
    offCanvas.width = STAGE_W / PIXEL;
    offCanvas.height = STAGE_H / PIXEL;
    offCtx = offCanvas.getContext('2d');
    effects = new RigEffects();
    goblinImg = new Image();
    goblinImg.src = GOBLIN_SRC;

    await setCharacter(state.char);
    bindUI();
    document.getElementById('rig-loading').remove();
    requestAnimationFrame(loop);
}

/** 캐릭터 교체: 에셋 로드 후 뼈대/스프링/애니메이터를 새로 구성하고 현재 상태 동작을 이어서 재생 */
async function setCharacter(id) {
    const next = RIG_CHARACTERS[id];
    const { layout, images } = await loadRigAssets(next);
    character = next;
    state.char = id;
    if (character.arms && !character.arms[state.arm]) state.arm = character.defaultArm;
    skeleton = buildSkeleton(character, layout, images, state.arm);
    bounds = restBounds(layout);
    springs = character.springs.map(s => new Spring(s));
    effects.clear();
    onceClip = null;
    giant.set(1, 0);
    applyScale();
    effects.setAmbient(character.ambient, (socket, bone, ox, oy) => {
        const w = skeleton.socketWorld(socket, bone);
        return toStage([w[0] + ox, w[1] + oy]);
    }, GROUND_Y);
    animator = new Animator(character.clips, onEvent);
    animator.play(clipFor(state.mode), 0);
    vfx.clear();
    skill.curse = false;
    skill.wave = false;
    buildPreviewButtons();
    tick(0);
    syncButtons();
    dirty = true;
}

// ---------------------------------------------------------------------------
// 시뮬레이션
// ---------------------------------------------------------------------------
function tick(h) {
    animator.update(h);
    if (onceClip && animator.currentTime >= character.clips[onceClip].duration) {
        onceClip = null;
        animator.play(clipFor(state.mode), opts.crossfade ? FADE_SEC : 0);
    }
    if (giant.update(h)) applyScale();
    vfx.update(h);
    for (const d of dummies) {
        d.flash = Math.max(0, d.flash - h);
        d.slow = Math.max(0, d.slow - h);
    }
    // 흑마법 오라 틱 (게임과 같은 0.65초)
    if (skill.curse) {
        skill.curseTimer += h;
        if (skill.curseTimer >= 0.65) {
            skill.curseTimer = 0;
            vfx.pulse('curse');
            for (const d of dummies) vfx.play(HERO_VFX.curseTick, dummyCenterX(d), GROUND_Y, { scale: VFX_SCALE });
        }
    }
    const pose = animator.sample();
    const offsets = {};
    if (opts.springs) {
        for (const s of springs) {
            offsets[s.bone] = { ...(offsets[s.bone] || {}), [s.channel]: s.value };
        }
    }
    skeleton.update(pose, offsets);
    if (opts.springs && h > 0) {
        for (const s of springs) s.step(skeleton.restPivotWorld(s.bone), h);
    }
    effects.update(h);
    if (state.mode === 'walk' && opts.scroll) groundOffset += SCROLL_SPEED * h;
    simTime += h;
}

function hitSocket() {
    return hitSocketOf(character, state.arm);
}

function onEvent(name, data) {
    applyRigEvent(name, data, {
        effects, skeleton, character, arm: state.arm, toScreen: toStage, groundY: GROUND_Y,
        onGrow: mult => { giant.set(mult); },
        onShield: shieldOn
    });
    if (name === 'cast' && skill.castCb) {
        const cb = skill.castCb;
        skill.castCb = null;
        cb();
    }
    // 공격 타격 순간: 첫 더미 피격 반응 (+ 어둠 파동 팔이면 파동 발사)
    if (name === 'impact' && data.hit && showDummies()) {
        const d = dummies[0];
        if (character.id === 'hero') {
            vfx.play(HERO_VFX.slashHit, dummyCenterX(d), dummyCenterY(), { scale: VFX_SCALE });
            if (skill.wave) launchWave();
        }
        d.flash = 0.08;
    }
    eventLog.unshift(`${simTime.toFixed(2)}s  ${animator.currentName} → ${name}`);
    eventLog.length = Math.min(eventLog.length, 8);
    renderLog();
}

function clipFor(mode) {
    return mode === 'attack' ? attackClipOf(character, state.arm) : mode;
}

function setMode(mode) {
    state.mode = mode;
    if (!onceClip) {
        effects.stopCharge();
        animator.play(clipFor(mode), opts.crossfade ? FADE_SEC : 0);
    }
    syncButtons();
    dirty = true;
}

// ---- 특수 동작 (게임의 RigAvatar와 같은 규칙) ----
function playOnce(name) {
    if (!character.clips[name]) return false;
    onceClip = name;
    effects.stopCharge();
    animator.play(name, 0.12);
    dirty = true;
    return true;
}

function shieldOn() {
    effects.setShield(() => shieldGeom(bounds, toStage, CHAR_SCALE * giant.value));
}

/** 2페이즈: 이미 거대화 상태면 원래대로 되돌림 (반복 확인용) */
function phase2() {
    if (giant.to > 1) {
        giant.set(1, 0.4);
        effects.shield = null;
        return;
    }
    if (!playOnce('transform')) {
        giant.set(PHASE2_SCALE);
        shieldOn();
    }
}

function breakShield() {
    effects.shieldBreak();
}

// ---- 타락 히어로 스킬 (게임 battle_v2.js와 같은 이펙트 정의) ----
function showDummies() {
    return opts.dummies;
}

function dummyCenterX(d) {
    return d.x;
}

function dummyCenterY() {
    return GROUND_Y - 38 * VFX_SCALE * 0.56 * 1.8;
}

function toggleCurse() {
    skill.curse = !skill.curse;
    opts.dummies = true;
    vfx.setPersistent('curse', skill.curse ? HERO_VFX.curseAura : null,
        () => [CHAR_X + 250 * VFX_SCALE * 0.56, GROUND_Y], VFX_SCALE * 0.56 * 1.8);
    syncButtons();
}

function mindWave() {
    opts.dummies = true;
    const release = () => {
        const w = skeleton.socketWorld(character.sockets && character.sockets.hand ? 'hand' : hitSocket()[0],
            character.sockets && character.sockets.hand ? 'armF' : hitSocket()[1]);
        const d = dummies[1];
        vfx.play(HERO_VFX.castRelease, toStage(w)[0], toStage(w)[1], { scale: VFX_SCALE });
        vfx.launchOrb({
            from: toStage(w), to: () => [dummyCenterX(d), dummyCenterY()], color: HERO_ORB.color, dur: HERO_ORB.dur,
            scale: VFX_SCALE, onArrive: () => vfx.play(HERO_VFX.mindConvert, dummyCenterX(d), GROUND_Y, { scale: VFX_SCALE })
        });
    };
    if (playOnce('cast')) skill.castCb = release;
    else release();
    syncButtons();
}

function toggleWave() {
    skill.wave = !skill.wave;
    opts.dummies = true;
    if (skill.wave && state.mode !== 'attack') setMode('attack');
    syncButtons();
}

function launchWave() {
    const tip = toStage(skeleton.socketWorld(hitSocket()[0], hitSocket()[1]));
    const hit = new Set();
    vfx.launchWave({
        x: tip[0], y: dummyCenterY(), range: 340, speed: HERO_WAVE.speed, h: HERO_WAVE.h, color: HERO_WAVE.color,
        scale: VFX_SCALE,
        onMove: (x0, x1) => dummies.forEach(d => {
            if (d.x < x0 || d.x > x1 || hit.has(d)) return;
            hit.add(d);
            d.flash = 0.08;
            d.slow = 2.5;
            vfx.play(HERO_VFX.waveHit, d.x, dummyCenterY(), { scale: VFX_SCALE });
        })
    });
}

// ---- 이펙트 미리보기 (게임과 같은 정의를 더미/캐릭터 위치에서 재생) ----
function vfxAtDummy(def, i = 0, ground = false) {
    const d = dummies[i];
    vfx.play(def, d.x, ground ? GROUND_Y : dummyCenterY(), { scale: VFX_SCALE });
    d.flash = 0.08;
}

function vfxAtEachDummy(def, ground = true) {
    dummies.forEach((d, i) => vfxAtDummy(def, i, ground));
}

function vfxAtSelf(def) {
    vfx.play(def, CHAR_X, GROUND_Y, { scale: VFX_SCALE });
}

/** 두 정의를 이어 붙임 (b는 delay초 뒤) */
function seq(a, b, delay) {
    return { layers: [...a.layers, ...b.layers.map(l => ({ ...l, at: (l.at || 0) + delay }))] };
}

function muzzlePoint() {
    const [socket, bone] = hitSocket();
    return toStage(skeleton.socketWorld(socket, bone));
}

function previewLaser() {
    const m = muzzlePoint();
    const d = dummies[0];
    vfx.play(MECH_VFX.laser, m[0], m[1], { scale: VFX_SCALE, to: [d.x, dummyCenterY()] });
    d.flash = 0.08;
}

function previewMissiles() {
    const m = muzzlePoint();
    dummies.forEach((d, i) => vfx.launchMissile({
        from: m, to: () => [d.x, dummyCenterY()], dur: 0.5 + i * 0.08, apex: 55, scale: VFX_SCALE,
        onArrive: (x, y) => { vfx.play(MECH_VFX.missileBlast, x, y, { scale: VFX_SCALE }); d.flash = 0.08; }
    }));
}

const PREVIEWS = {
    mech: [
        ['레이저 포격', previewLaser],
        ['미사일 3연발', previewMissiles],
        ['드론 폭발', () => vfxAtDummy(MECH_VFX.droneBlast, 1)],
        ['주먹 적중', () => vfxAtDummy(MECH_VFX.fistHit, 0)],
        ['착지 균열', () => vfxAtSelf(MECH_VFX.landing)]
    ],
    kaiju: [
        ['물기 적중', () => vfxAtDummy(KAIJU_VFX.biteHit, 0)],
        ['포자 살포', () => vfxAtEachDummy(KAIJU_VFX.sporeTick)],
        ['알 낳기 → 부화', () => vfxAtDummy(seq(KAIJU_VFX.eggLay, KAIJU_VFX.eggHatch, 1.2), 1, true)],
        ['재생', () => vfxAtSelf(KAIJU_VFX.regen)]
    ],
    hero: [
        ['베기 적중', () => vfxAtDummy(HERO_VFX.slashHit, 0)],
        ['파동 적중', () => vfxAtDummy(HERO_VFX.waveHit, 0)],
        ['시전 해방', () => vfx.play(HERO_VFX.castRelease, ...toStage(skeleton.socketWorld('hand', 'armF')), { scale: VFX_SCALE })],
        ['흑마법 기둥', () => vfxAtEachDummy(HERO_VFX.curseTick)],
        ['세뇌 변환', () => vfxAtDummy(HERO_VFX.mindConvert, 1, true)]
    ],
    chimera: [
        ['주먹 적중', () => vfxAtDummy(CHIMERA_VFX.punchHit, 0)],
        ['클로 할퀴기', () => vfxAtDummy(CHIMERA_VFX.clawHit, 0)],
        ['졸개 소환', () => vfxAtDummy(CHIMERA_VFX.summon, 1, true)],
        ['지진 분쇄', () => vfxAtEachDummy(CHIMERA_VFX.quakeTick)],
        ['2페이즈 충격파', () => vfxAtSelf(CHIMERA_VFX.phase2Burst)]
    ]
};

function previewVfx(i) {
    const list = PREVIEWS[character.id] || [];
    if (!list[i]) return;
    opts.dummies = true;
    list[i][1]();
    syncButtons();
    dirty = true;
}

function buildPreviewButtons() {
    const row = document.getElementById('vfx-preview-row');
    if (!row) return;
    row.innerHTML = '';
    (PREVIEWS[character.id] || []).forEach(([label], i) => {
        const btn = document.createElement('button');
        btn.textContent = label;
        btn.addEventListener('click', () => previewVfx(i));
        row.appendChild(btn);
    });
}

function drawDummies(ctx, view) {
    if (!showDummies() || !goblinImg || !goblinImg.complete || !goblinImg.naturalHeight) return;
    ctx.save();
    ctx.setTransform(view[0], view[1], view[2], view[3], view[4], view[5]);
    const fh = goblinImg.naturalHeight;
    const size = 76 * VFX_SCALE * 0.56 * 1.8;
    for (const d of dummies) {
        ctx.filter = d.flash > 0 ? 'brightness(2.4) saturate(0.2)'
            : d.slow > 0 ? 'drop-shadow(0 0 6px #b050ff) saturate(0.55) brightness(0.9)' : 'none';
        ctx.drawImage(goblinImg, 0, 0, fh, fh, d.x - size / 2, GROUND_Y - size + 8, size, size);
    }
    ctx.restore();
}

function setArm(id) {
    if (!character.arms) return;
    state.arm = id;
    skeleton.setPart(character.weaponBone, character.arms[id].part);
    if (state.mode === 'attack') {
        effects.stopCharge();
        animator.play(clipFor('attack'), opts.crossfade ? FADE_SEC : 0);
    }
    syncButtons();
    dirty = true;
}

function setOption(key, value) {
    opts[key] = value;
    if (key === 'springs' && !value) springs.forEach(s => s.reset());
    syncButtons();
    dirty = true;
}

// ---------------------------------------------------------------------------
// 렌더링
// ---------------------------------------------------------------------------
function render() {
    const P = opts.pixel ? PIXEL : 1;
    const ctx = opts.pixel ? offCtx : mainCtx;
    const [sx, sy] = effects.shakeOffset();
    const view = [1 / P, 0, 0, 1 / P, sx / P, sy / P];

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    if (opts.bg) drawBackground(ctx, view);
    if (opts.fx) {
        ctx.save();
        ctx.setTransform(view[0], view[1], view[2], view[3], view[4], view[5]);
        vfx.draw(ctx, 'ground');
        ctx.restore();
    }
    drawDummies(ctx, view);
    if (opts.fx) effects.drawBack(ctx, view);
    skeleton.draw(ctx, Mat.mul(view, stageM));
    if (opts.fx) {
        effects.draw(ctx, view);
        ctx.save();
        ctx.setTransform(view[0], view[1], view[2], view[3], view[4], view[5]);
        vfx.draw(ctx, 'front');
        ctx.restore();
    }

    if (opts.pixel) {
        mainCtx.setTransform(1, 0, 0, 1, 0, 0);
        mainCtx.imageSmoothingEnabled = false;
        mainCtx.drawImage(offCanvas, 0, 0, offCanvas.width, offCanvas.height, 0, 0, STAGE_W, STAGE_H);
    }
    if (opts.bones) {
        const sockets = character.arms ? [hitSocket(), ...character.debugSockets] : character.debugSockets;
        skeleton.drawDebug(mainCtx, Mat.mul([1, 0, 0, 1, sx, sy], stageM), sockets);
    }
    if (opts.bg) drawHud();
}

function drawBackground(ctx, view) {
    ctx.save();
    ctx.setTransform(view[0], view[1], view[2], view[3], view[4], view[5]);

    const sky = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
    sky.addColorStop(0, '#07071a');
    sky.addColorStop(1, '#1d1033');
    ctx.fillStyle = sky;
    ctx.fillRect(-20, -20, STAGE_W + 40, GROUND_Y + 20);

    // 원경 빌딩 (느린 패럴랙스)
    const far = groundOffset * 0.25;
    ctx.fillStyle = '#16122b';
    for (let i = -1; i < 14; i++) {
        const w = 70 + ((i * 47) % 5) * 12;
        const h = 90 + ((i * 71) % 7) * 28;
        const x = ((i * 90 - far) % 1260 + 1260) % 1260 - 150;
        ctx.fillRect(x, GROUND_Y - h, w, h);
    }

    // 지면 + 스크롤 눈금 (발 미끄러짐 확인용)
    ctx.fillStyle = '#100c1c';
    ctx.fillRect(-20, GROUND_Y, STAGE_W + 40, STAGE_H - GROUND_Y + 20);
    ctx.fillStyle = '#ff0055';
    ctx.fillRect(-20, GROUND_Y, STAGE_W + 40, 2);
    ctx.fillStyle = 'rgba(0, 255, 204, 0.35)';
    const tile = 80;
    for (let x = -(groundOffset % tile) - tile; x < STAGE_W + tile; x += tile) {
        ctx.fillRect(x, GROUND_Y + 12, 34, 4);
        ctx.fillRect(x + 20, GROUND_Y + 40, 46, 4);
    }

    // 그림자
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(CHAR_X, GROUND_Y + 2, character.shadow.rx * CHAR_SCALE, character.shadow.ry * CHAR_SCALE, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function drawHud() {
    mainCtx.save();
    mainCtx.setTransform(1, 0, 0, 1, 0, 0);
    mainCtx.fillStyle = 'rgba(5, 5, 12, 0.7)';
    mainCtx.fillRect(10, 10, 320, 48);
    mainCtx.fillStyle = '#00ffcc';
    mainCtx.font = 'bold 14px Chakra Petch, sans-serif';
    mainCtx.fillText(`${character.name}  CLIP ${animator.currentName}  t=${animator.currentTime.toFixed(2)}s`, 20, 30);
    mainCtx.fillStyle = '#c8c8ff';
    mainCtx.font = '12px Chakra Petch, sans-serif';
    const flags = [opts.pixel && `도트 ${STAGE_W / PIXEL}x${STAGE_H / PIXEL}`, opts.stepped && `${STEP_FPS}fps`,
        !opts.crossfade && '보간 끔', !opts.springs && '스프링 끔'].filter(Boolean).join(' · ');
    mainCtx.fillText(flags || '고해상도 · 60fps', 20, 49);
    mainCtx.restore();
}

// ---------------------------------------------------------------------------
// 루프
// ---------------------------------------------------------------------------
let last = performance.now();
let acc = 0;
let sinceRender = 1;

function simulate(sec) {
    acc += sec;
    while (acc >= FIXED_DT) {
        tick(FIXED_DT);
        acc -= FIXED_DT;
        sinceRender += FIXED_DT;
    }
}

function loop(now) {
    const real = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (!state.paused) simulate(real * opts.speed);
    if (dirty || !opts.stepped || sinceRender >= 1 / STEP_FPS) {
        render();
        sinceRender = 0;
        dirty = false;
    }
    requestAnimationFrame(loop);
}

// ---------------------------------------------------------------------------
// UI
// ---------------------------------------------------------------------------
function bindUI() {
    document.querySelectorAll('[data-char]').forEach(btn =>
        btn.addEventListener('click', () => setCharacter(btn.dataset.char)));
    document.querySelectorAll('[data-mode]').forEach(btn =>
        btn.addEventListener('click', () => setMode(btn.dataset.mode)));
    const specials = { jump: () => playOnce('jump'), phase2, shieldBreak: breakShield,
        cast: () => playOnce('cast'), curse: toggleCurse, mind: mindWave, wave: toggleWave };
    document.querySelectorAll('[data-special]').forEach(btn =>
        btn.addEventListener('click', () => specials[btn.dataset.special]()));
    document.querySelectorAll('[data-arm]').forEach(btn =>
        btn.addEventListener('click', () => setArm(btn.dataset.arm)));
    document.querySelectorAll('[data-opt]').forEach(input =>
        input.addEventListener('change', () => setOption(input.dataset.opt, input.checked)));

    const speed = document.getElementById('opt-speed');
    const speedLabel = document.getElementById('opt-speed-value');
    speed.addEventListener('input', () => {
        opts.speed = Number(speed.value);
        speedLabel.textContent = `${opts.speed.toFixed(2)}x`;
    });
    document.getElementById('btn-pause').addEventListener('click', () => {
        state.paused = !state.paused;
        syncButtons();
    });
    document.getElementById('btn-step').addEventListener('click', () => {
        state.paused = true;
        simulate(1 / STEP_FPS);
        dirty = true;
        syncButtons();
    });
    syncButtons();
}

function syncButtons() {
    document.querySelectorAll('[data-char]').forEach(b => b.classList.toggle('active', b.dataset.char === state.char));
    document.querySelectorAll('[data-mode]').forEach(b => b.classList.toggle('active', b.dataset.mode === state.mode));
    document.querySelectorAll('[data-arm]').forEach(b => b.classList.toggle('active', b.dataset.arm === state.arm));
    document.querySelectorAll('[data-opt]').forEach(i => { i.checked = !!opts[i.dataset.opt]; });
    document.querySelectorAll('[data-special="curse"]').forEach(b => b.classList.toggle('active', skill.curse));
    document.querySelectorAll('[data-special="wave"]').forEach(b => b.classList.toggle('active', skill.wave));
    const heroGroup = document.getElementById('hero-skill-group');
    if (heroGroup && character) heroGroup.hidden = character.id !== 'hero';
    const armGroup = document.getElementById('arm-group');
    if (armGroup && character) armGroup.hidden = !character.arms;
    const pause = document.getElementById('btn-pause');
    if (pause) pause.textContent = state.paused ? '▶ 재생' : '❚❚ 일시정지';
}

function renderLog() {
    const ul = document.getElementById('event-log');
    if (ul) ul.innerHTML = eventLog.map(line => `<li>${line}</li>`).join('');
}

// 자동 검증/디버그용 훅 (브라우저 콘솔에서도 사용 가능)
window.rigTest = {
    ready: init().catch(err => {
        const el = document.getElementById('rig-loading');
        if (el) el.textContent = `로드 실패: ${err.message}`;
        console.error(err);
        throw err;
    }),
    setCharacter,
    setMode,
    setArm,
    setOption,
    playOnce,
    clipDuration: name => character.clips[name].duration,
    toggleCurse,
    mindWave,
    toggleWave,
    previewVfx,
    previews: () => (PREVIEWS[character.id] || []).map(([label]) => label),
    phase2,
    breakShield,
    pause() { state.paused = true; syncButtons(); },
    resume() { state.paused = false; syncButtons(); },
    step(sec) { simulate(sec); render(); },
    render,
    get info() {
        return { char: state.char, clip: animator.currentName, time: animator.currentTime, simTime,
            opts: { ...opts }, events: [...eventLog] };
    }
};
