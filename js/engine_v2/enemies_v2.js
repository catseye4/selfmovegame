/* ==========================================================================
   PROJECT: MAD OVERLORD // 적 종류와 행동 (v2)
   기획서 2-⑥ "진격 지연형" 적 (결정 D-020). 외형은 C단계 이미지가 오기 전까지
   고블린 스프라이트에 종류별 색조 + 이름표로 구분한다 (임시).

   종류 (hp·dps는 스테이지 배율 stage.enemy.hp/dps를 곱함, reward = 처치 보상 배율)
     guard   경비병        근접 기본 보병
     shield  방패병        체력↑, 받는 피해 40% 감소, 밀쳐지지 않음
     tranq   마취총 사수   멀리서 멈춰 마취탄 → 주인공 감속
     shock   전기 충격병   근접, 주기적으로 주인공 기절
     medic   의무병        뒤에 머물며 가장 다친 적(또는 거점)을 치유
     guardian 정의의 수호자 (챕터 1 보스) 방패 강타(기절), 정의의 일격(예고 후 큰 피해)
   엘리트: 체력 ×3, 공격 ×1.5, 크기 ×1.3, 금색 이름표, 보상 ×4
   ========================================================================== */

import { KAIJU_VFX, BATTLE_VFX } from './vfx/vfxDefs.js';
import { sound } from './audio/sound_v2.js';
import { aimAt } from './bases_v2.js';
// 적 그림 (로드맵 C단계, D-035): 리그를 구운 동작별 스프라이트 — tools/rig/bake_enemies.py가 만듦.
// 그림이 있는 종류는 구운 크기 그대로(종류별 scale·색조 대신), 없는 종류는 임시 고블린 + 색조 (D-023)
import { ENEMY_ART } from './enemyArt_v2.js';

export const ENEMY_TYPES = {
    guard: { name: '경비병', hp: 350, dps: 35, speed: [75, 100], reward: 1 },
    shield: {
        name: '방패병', hp: 820, dps: 24, speed: [44, 54], reward: 2, armor: 0.4, knockResist: true, scale: 1.12,
        tint: 'hue-rotate(185deg) saturate(1.2)'
    },
    tranq: {
        name: '마취총 사수', hp: 240, dps: 0, speed: [70, 84], reward: 1.5, tint: 'hue-rotate(95deg) saturate(1.4)',
        ranged: { range: 230, every: 2.4, dmg: 24, slow: 2.2 }
    },
    shock: {
        name: '전기 충격병', hp: 380, dps: 26, speed: [82, 96], reward: 1.5, tint: 'hue-rotate(38deg) saturate(1.7) brightness(1.15)',
        shock: { every: 3.2, stun: 0.8 }
    },
    medic: {
        name: '의무병', hp: 300, dps: 0, speed: [58, 66], reward: 2, tint: 'grayscale(0.55) brightness(1.5)',
        heal: { every: 2.6, amount: 110, range: 200, keepBack: 250, baseMul: 3 }
    },
    guardian: {
        name: '정의의 수호자', boss: true, hp: 5200, dps: 55, speed: [40, 40], reward: 30, armor: 0.25, knockResist: true, scale: 1.7,
        tint: 'sepia(0.6) hue-rotate(10deg) saturate(1.8) brightness(1.3)',
        bash: { every: 7, stun: 1.0, dmg: 0.05 }, smite: { every: 11, warn: 1.2, dmg: 0.09 }
    }
};
export const ELITE = { hp: 3, dps: 1.5, scale: 1.3, reward: 4 };

const ENEMY_CENTER = 38;   // 적 x(왼쪽 끝)에서 몸 가운데까지 — 겨누기·이펙트 기준 (bases_v2.js aimAt)
const ART_FOOT_B = 58;     // 그림 적의 발 높이 (bottom px)
// 세뇌 보병(타락 히어로가 징집한 아군): 경비병 그림을 오른쪽으로 돌려 검보라로 (D-020)
const MIND_ART = 'guard';
const CREEP = 0.3;       // 원거리·치유형이 제자리에서도 조금씩 다가오는 속도 배율 (사거리가 짧은 캐릭터도 닿게)
// 근접: STOP까지 다가가 멈추고, REACH 안이면 공격 (주인공 공격에 조금 밀려나도 계속 공격)
const MELEE = { stop: 30, reach: 55 };
const FOOT_B = 58;

const rand = ([a, b]) => a + Math.random() * (b - a);

/** 스테이지 비중(mix)대로 적 종류 하나 고름 */
export function pickType(mix) {
    const entries = Object.entries(mix);
    const total = entries.reduce((s, [, w]) => s + w, 0);
    let r = Math.random() * total;
    for (const [id, w] of entries) {
        r -= w;
        if (r <= 0) return id;
    }
    return entries[0][0];
}

let artStyles = false;

/** 그림 적의 CSS(종류별 걷기·공격 스프라이트)를 한 번만 주입 */
function ensureEnemyStyles() {
    if (artStyles) return;
    artStyles = true;
    const css = [`
        #screen-battle-v2 .enemy-entity.v2-enemy.has-art { background: none; animation: none; height: var(--art-h); bottom: ${ART_FOOT_B}px; }
        #screen-battle-v2 .v2-enemy__sprite { position: absolute; bottom: 0; background-repeat: no-repeat; background-size: auto 100%; pointer-events: none; }`];
    for (const [id, a] of Object.entries(ENEMY_ART)) {
        css.push(`
        #screen-battle-v2 .v2-art-${id} { --art-h: ${a.frameHeight}px; }
        #screen-battle-v2 .v2-art-${id} .v2-enemy__sprite {
            left: ${ENEMY_CENTER - a.anchorX}px; width: ${a.frameWidth}px; height: ${a.frameHeight}px;
            background-image: url('${a.walk.src}');
            animation: v2-${id}-walk ${a.walk.duration}s steps(${a.walk.frames}) infinite;
        }
        @keyframes v2-${id}-walk { from { background-position-x: 0; } to { background-position-x: -${a.frameWidth * a.walk.frames}px; } }`);
        for (const clip of Object.keys(a).filter(k => a[k] && a[k].src && k !== 'walk')) {
            const c = a[clip];
            css.push(`
        #screen-battle-v2 .v2-art-${id}.${clipClass(clip)} .v2-enemy__sprite {
            background-image: url('${c.src}');
            animation: v2-${id}-${clip} ${c.duration}s steps(${c.frames}) infinite;
        }
        @keyframes v2-${id}-${clip} { from { background-position-x: 0; } to { background-position-x: -${a.frameWidth * c.frames}px; } }`);
        }
    }
    const m = ENEMY_ART[MIND_ART];
    css.push(`
        #screen-battle-v2 .ally-minion.v2-mind {
            width: ${m.frameWidth}px; height: ${m.frameHeight}px; bottom: ${ART_FOOT_B}px;
            background-image: url('${m.walk.src}'); background-size: auto 100%;
            animation: v2-${MIND_ART}-walk ${m.walk.duration}s steps(${m.walk.frames}) infinite;
        }`);
    const style = document.createElement('style');
    style.id = 'enemies-v2-styles';
    style.textContent = css.join('\n');
    document.head.appendChild(style);
}

const clipClass = clip => (clip === 'attack' ? 'is-attacking' : `is-${clip}`);

/** 그림 적: 공격 중이면 공격 스프라이트로 (근접 거리 안에서 때리는 동안) */
function setAttacking(e, on) {
    if (e.attacking === on || !e.art) return;
    e.attacking = on;
    e.dom.classList.toggle('is-attacking', on);
}

/** 그림 적: 한 번만 하는 동작 (마취탄 발사, 치유 분사, 보스 방패 강타) — 한 사이클 뒤 원래 동작으로 */
function playOnce(e, clip) {
    const c = e.art && e.art[clip];
    if (!c || !e.dom) return;
    const cls = clipClass(clip);
    clearTimeout(e.onceTimer);
    e.dom.classList.remove(cls);
    void e.dom.offsetWidth;            // 같은 동작을 다시 처음부터
    e.dom.classList.add(cls);
    e.onceTimer = setTimeout(() => {
        if (e.dom && !(clip === 'attack' && e.attacking)) e.dom.classList.remove(cls);
    }, c.duration * 1000);
}

/** 적 하나를 전장에 만든다. opts: { x, elite } */
export function spawnEnemy(b, typeId, opts = {}) {
    ensureEnemyStyles();
    const t = ENEMY_TYPES[typeId] || ENEMY_TYPES.guard;
    const se = b.stage.enemy;
    const elite = !!opts.elite && !t.boss;
    const hp = Math.round(t.hp * se.hp * (elite ? ELITE.hp : 1));
    const art = ENEMY_ART[typeId] || null;
    const scale = (art ? 1 : t.scale || 1) * (elite ? ELITE.scale : 1);   // 그림은 구운 크기가 곧 게임 크기

    const el = document.createElement('div');
    el.className = `enemy-entity v2-enemy v2-type-${typeId}${art ? ` has-art v2-art-${typeId}` : ''}${elite ? ' is-elite' : ''}${t.boss ? ' is-boss' : ''}`;
    el.dataset.name = `${elite ? '엘리트 ' : ''}${t.name}`;
    el.style.left = `${opts.x}px`;
    if (scale !== 1) el.style.transform = `scale(${scale})`;
    if (art) {
        const sprite = document.createElement('div');
        sprite.className = 'v2-enemy__sprite';
        sprite.style.animationDelay = `-${(Math.random() * art.walk.duration).toFixed(2)}s`;   // 발걸음이 모두 같지 않게
        el.appendChild(sprite);
    }
    const track = document.createElement('div');
    track.className = 'enemy-hp-track';
    const bar = document.createElement('div');
    bar.className = 'enemy-hp';
    bar.style.width = '100%';
    track.appendChild(bar);
    el.appendChild(track);
    b.domEnemies.appendChild(el);

    const e = {
        id: `${typeId}_${Date.now()}_${Math.random()}`,
        type: typeId, t, x: opts.x, hp, maxHp: hp,
        dps: t.dps * se.dps * (elite ? ELITE.dps : 1),
        speed: rand(t.speed), isBuilding: false, dom: el, hpBar: bar, art, attacking: false,
        elite, boss: !!t.boss, armor: t.armor || 0, knockResist: !!t.knockResist,
        reward: (t.reward || 1) * (elite ? ELITE.reward : 1),
        baseFilter: [art ? '' : t.tint, elite ? 'drop-shadow(0 0 5px #ffd24a)' : ''].filter(Boolean).join(' '),
        cd: { skill: Math.random() * 1.5, smite: 0 }
    };
    el.style.filter = e.baseFilter;
    b.enemies.push(e);
    return e;
}

/**
 * 적 한 명의 이번 프레임 행동 (이동, 공격, 종류별 능력). 기절한 적은 부르지 않는다.
 * frontX: 주인공 앞면 x
 */
export function updateEnemy(b, e, dt, frontX) {
    const t = e.t;
    const slowMul = e.slowT > 0 ? 0.5 : 1;
    const dist = e.x - frontX;

    // 아군 미니언과 맞붙으면 그쪽과 싸움 (공격력이 있는 적만)
    if (e.dps > 0) {
        const ally = b.allies.find(a => e.x - a.x <= 65 && e.x - a.x >= -35);
        if (ally) {
            setAttacking(e, true);
            b.damageAlly(ally, e.dps * dt);
            return;
        }
    }

    // 원거리(마취총) · 치유(의무병): 정해진 거리에서 멈추고 천천히 다가오며 능력 사용
    const hold = t.ranged ? t.ranged.range : t.heal ? t.heal.keepBack : 0;
    if (hold) {
        const moving = dist > hold ? 1 : dist > 40 ? CREEP : 0;
        if (moving) moveBy(e, e.speed * slowMul * moving * dt);
        e.cd.skill += dt;
        if (t.ranged && dist <= hold + 20 && e.cd.skill >= t.ranged.every) {
            e.cd.skill = 0;
            shootTranq(b, e);
        }
        if (t.heal && e.cd.skill >= t.heal.every) {
            e.cd.skill = 0;
            healNearest(b, e);
        }
        return;
    }

    // 근접: 다가가서 닿으면 공격
    if (dist > MELEE.stop) moveBy(e, e.speed * slowMul * dt);
    if (dist > MELEE.reach) {
        setAttacking(e, false);
        return;
    }
    if (b.legContact(e)) return;   // 다리 패시브(궤도 돌진)로 밀려남
    setAttacking(e, true);
    b.damagePlayer(e.dps * dt, dt);

    e.cd.skill += dt;
    if (t.shock && e.cd.skill >= t.shock.every) {
        e.cd.skill = 0;
        b.fx.play(BATTLE_VFX.shockHit, b.monsterX + 60, 110);
        sound.play('hero_wave_hit', { rate: 1.5 });
        b.applyPlayerStun(t.shock.stun, '감전!');
    }
    if (t.bash && e.cd.skill >= t.bash.every) {
        e.cd.skill = 0;
        playOnce(e, 'bash');
        b.fx.play(BATTLE_VFX.shieldBash, b.monsterX + 70, 100);
        sound.play('mech_fist_hit', { rate: 0.8 });
        b.damagePlayer(b.maxPlayerHp * t.bash.dmg, 0);
        b.applyPlayerStun(t.bash.stun, '방패 강타!');
        b.allies.forEach(a => { a.x -= 40; if (a.dom) a.dom.style.left = `${a.x}px`; });
    }
    if (t.smite) {
        e.cd.smite += dt;
        if (e.cd.smite >= t.smite.every) {
            e.cd.smite = 0;
            smite(b, e);
        }
    }
}

function moveBy(e, px) {
    e.x -= px;
    if (e.dom) e.dom.style.left = `${e.x}px`;
}

// 마취탄: 적 → 주인공 가슴, 맞으면 피해 + 감속
function shootTranq(b, e) {
    playOnce(e, 'attack');
    const from = { x: e.x + 12, bottom: 96 };
    sound.play('mech_laser', { rate: 1.7, vol: 0.6 });
    b.fx.launchOrb(from, () => ({ x: b.monsterX + 60, b: 120 }), '90, 230, 255', 0.38, () => {
        if (!b.isActive) return;
        b.damagePlayer(e.t.ranged.dmg * b.stage.enemy.dps, 0);
        b.applyPlayerSlow(e.t.ranged.slow);
    }, null);
}

// 치유: 사거리 안에서 체력 비율이 가장 낮은 적(거점 포함)
function healNearest(b, e) {
    const h = e.t.heal;
    const cands = b.enemies.filter(o => o !== e && o.hp < o.maxHp && Math.abs(o.x - e.x) <= h.range);
    if (!cands.length) return;
    playOnce(e, 'attack');
    const target = cands.sort((p, q) => p.hp / p.maxHp - q.hp / q.maxHp)[0];
    const amount = h.amount * b.stage.enemy.hp * (target.isBuilding ? h.baseMul : 1);
    target.hp = Math.min(target.maxHp, target.hp + amount);
    if (target.hpBar) target.hpBar.style.width = `${(target.hp / target.maxHp) * 100}%`;
    if (target.isBuilding) {
        b.currentTargetHp = target.hp;
        b.updateHud();
    }
    const tx = aimAt(target).x;
    b.fx.play(KAIJU_VFX.regen, tx, FOOT_B);
    b.createDamagePopup(target.x, target.isBuilding ? 200 : 130, `+${Math.round(amount)} 치유`, false);
    sound.play('kaiju_regen', { rate: 1.3 });
}

// 정의의 일격: 주인공 발밑에 예고 → 잠시 뒤 큰 피해
function smite(b, e) {
    const t = e.t.smite;
    const x = b.monsterX + 35;
    b.fx.play(BATTLE_VFX.smiteWarn, x, FOOT_B, { follow: () => [b.monsterX + 35, FOOT_B] });
    b.createDamagePopup(b.monsterX + 20, 220, '⚠ 정의의 일격', false);
    sound.play('warning', { vol: 0.5, rate: 1.4 });
    b.schedule(t.warn, () => {
        if (!b.isActive || !b.enemies.includes(e)) return;
        b.fx.play(BATTLE_VFX.smiteHit, b.monsterX + 35, FOOT_B);
        b.director.shake(10, 450);
        b.director.flash('#fff6c8', 200, 0.6);
        sound.play('chimera_slam');
        b.damagePlayer(b.maxPlayerHp * t.dmg, 0);
    });
}

/** 처치 보상 (종류·엘리트 배율) */
export function killReward(b, e) {
    return Math.round(b.stage.reward.kill * (e.reward || 1));
}

