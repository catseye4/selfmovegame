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
   구역 2 (D-040): raider builder sludge netter mechanic + 보스 scrapking
   구역 3·4 (D-056): soldier inquisitor holyshield priest mage + demon demonknight + 보스 archbishop /
                     cultist tentacle carapace slime(→ slimelet) sporer + 보스 oculus — MD/구역3·4_설계안.md
   엘리트: 체력 ×3, 공격 ×1.5, 크기 ×1.3, 금색 이름표, 보상 ×4
   ========================================================================== */

import { KAIJU_VFX, BATTLE_VFX, ZONE_VFX, BOSS_VFX, ELITE_VFX } from './vfx/vfxDefs.js';
import { sound } from './audio/sound_v2.js';
import { aimAt } from './bases_v2.js';
// 적 그림 (로드맵 C단계, D-035): 리그를 구운 동작별 스프라이트 — tools/rig/bake_enemies.py가 만듦.
// 그림이 있는 종류는 구운 크기 그대로(종류별 scale·색조 대신), 없는 종류는 임시 고블린 + 색조 (D-023)
import { ENEMY_ART } from './enemyArt_v2.js';
import { hastedType } from './difficulty_v2.js';

// ---- 적 그림 미리 풀기 (성능 측정 2026-10-21: 새 적이 처음 나올 때 그림 압축 풀기로 50~100ms 멈춤) ----
const decoded = new Map();   // 그림 주소 → Image (붙잡아 두어 풀린 그림이 남게)
function decodeOnce(src) {
    if (decoded.has(src) || typeof Image === 'undefined') return;
    const img = new Image();
    img.src = src;
    decoded.set(src, img);
    if (img.decode) img.decode().catch(() => {});
}
/** 전투 시작 때 (battle_v2.js startBattle): 이 스테이지 적 섞기·보스의 그림(빌린 그림 포함)을 미리 풂 */
export function predecodeStageArt(stage) {
    const types = new Set(Object.keys((stage.enemy && stage.enemy.mix) || {}));
    if (stage.boss && stage.boss.unit) types.add(stage.boss.unit);
    for (const id of types) {
        const t = ENEMY_TYPES[id];
        const key = ENEMY_ART[id] ? id : t && t.artAs;
        const art = key && ENEMY_ART[key];
        if (!art) continue;
        for (const v of Object.values(art)) if (v && v.src) decodeOnce(v.src);
    }
}

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
        bash: { every: 7, stun: 1.0, dmg: 0.05 }, smite: { every: 11, warn: 1.2, dmg: 0.09 },
        barrier: { every: 15, sec: 3, cut: 0.7 }
    }
};
// ---- 구역 2: 고철 약탈단 (D-040) — 기획서 2-⑥의 바리케이드·늪 + 속박·수리 ----
Object.assign(ENEMY_TYPES, {
    raider: { name: '고철 약탈자', hp: 360, dps: 36, speed: [78, 102], reward: 1 },
    builder: {
        name: '고철 방벽병', hp: 520, dps: 26, speed: [48, 60], reward: 2, armor: 0.15,
        // 주인공 앞 range px 안에 오면 멈춰서 바리케이드를 세움 (every초에 한 번, 근처에 이미 있으면 안 세움)
        barricade: { range: 300, every: 9, hp: 520, gap: 140 }
    },
    sludge: {
        name: '오물 투척병', hp: 260, dps: 0, speed: [66, 80], reward: 1.5,
        // 주인공 발밑에 오물을 던져 늪 장판 (위에 있으면 진격·동작 감속, 반중력 부양은 면역)
        sludge: { range: 250, every: 3.6, sec: 4.5, width: 120 }
    },
    netter: {
        name: '그물총 사수', hp: 280, dps: 0, speed: [70, 84], reward: 1.5,
        // 그물: 맞으면 속박(진격 불가, 공격·스킬은 가능)
        net: { range: 240, every: 3.8, dmg: 18, root: 1.8 }
    },
    mechanic: {
        name: '수리공', hp: 320, dps: 0, speed: [58, 66], reward: 2,
        // 수리: 거점·바리케이드를 먼저 (repair). 배율: 거점 baseMul, 바리케이드 barricadeMul, 병사 soldierMul
        // (치유량은 스테이지 적 체력 배율도 곱해짐 — 거점 4배였을 때 2-5에서 초당 640을 고쳐 최종 기지를 못 부숨. 1.2배 = 2-B 초당 약 200)
        heal: { every: 2.4, amount: 120, range: 220, keepBack: 260, baseMul: 1.2, barricadeMul: 0.5, soldierMul: 0.35, repair: true }
    },
    scrapking: {
        name: '고철왕', boss: true, hp: 5800, dps: 45, speed: [34, 34], reward: 40, armor: 0.3, knockResist: true, scale: 1.7,
        tint: 'sepia(0.4) saturate(1.4)',
        // 자석: 크레인 자석으로 붙잡아 뒤로 내던짐(주인공 밀려남 + 잠깐 기절) / 고철 낙하: 예고 원 → 큰 피해
        magnet: { every: 9, warn: 0.6, push: 130, stun: 0.6, range: 420 },
        drop: { every: 12, warn: 1.3, dmg: 0.08 },
        scrapWall: { every: 16, hp: 520, gap: 140 }
    }
});
// ---- 구역 3: 성왕국 이단심문소 & 타락 기사단 / 구역 4: 별의 사도들과 실패한 진화체들 (D-056) ----
// 그림이 오기 전까지 artAs = 빌려 쓸 그림(ENEMY_ART 이름) + tint 색조. 그 종류 이름의 그림이 생기면 그것을 씀 (spawnEnemy)
Object.assign(ENEMY_TYPES, {
    soldier: { name: '왕국보병', hp: 340, dps: 34, speed: [80, 104], reward: 1, artAs: 'guard', tint: 'sepia(0.55) saturate(0.9) brightness(0.95)' },
    inquisitor: {
        name: '이단심문관', hp: 520, dps: 50, speed: [70, 88], reward: 1.8,
        artAs: 'shock', tint: 'hue-rotate(-48deg) saturate(1.6) brightness(0.95)'
    },
    holyshield: {
        name: '신성 방패병', hp: 640, dps: 22, speed: [44, 56], reward: 2, armor: 0.3, knockResist: true,
        artAs: 'shield', tint: 'sepia(0.75) saturate(1.7) brightness(1.1)',
        barricade: { range: 300, every: 9, hp: 600, gap: 140, label: '🛡 방패 장벽!' }
    },
    priest: {
        name: '신관', hp: 280, dps: 0, speed: [58, 66], reward: 2, artAs: 'medic', tint: 'sepia(0.35) brightness(1.12)',
        // 병사만 조금 치유 (거점·장벽은 안 고침 — 구역 1 의무병·구역 2 수리공과 구분)
        heal: { every: 3, amount: 70, range: 220, keepBack: 260, soldiersOnly: true }
    },
    mage: {
        name: '마법사', hp: 260, dps: 0, speed: [66, 80], reward: 1.8, artAs: 'tranq', tint: 'hue-rotate(205deg) saturate(1.2) brightness(0.9)',
        // 1~3초마다 불(화상)·번개(기절)·얼음(감속) 중 하나
        spell: { range: 260, every: [1, 3], dmg: 26,
            fire: { dmgMul: 1, burnTicks: 3, burnEvery: 1, burnMul: 0.25 },
            bolt: { dmgMul: 0.8, stun: 0.4 }, ice: { dmgMul: 0.9, slow: 1.5 } }
    },
    demon: {
        name: '악마병', hp: 700, dps: 18, speed: [50, 60], reward: 0.5, armor: 0.2,
        artAs: 'raider', tint: 'brightness(0.5) saturate(1.8) hue-rotate(-25deg) drop-shadow(0 0 4px rgba(200, 30, 60, 0.8))'
    },
    demonknight: {
        name: '악마기사', hp: 700, dps: 46, speed: [56, 66], reward: 3, knockResist: true, scale: 1.12,
        artAs: 'builder', tint: 'brightness(0.42) saturate(1.8) hue-rotate(-28deg) drop-shadow(0 0 5px rgba(220, 30, 50, 0.9))',
        cleave: { every: 5, dmg: 0.05 }
    },
    archbishop: {
        name: '대주교 베네딕트', boss: true, hp: 5200, dps: 0, speed: [30, 30], reward: 50, armor: 0.3, knockResist: true,
        // 임시: 정의의 수호자 그림을 바랜 금빛 + 등 뒤 검붉은 그림자(악마)처럼
        artAs: 'guardian', tint: 'sepia(0.65) saturate(1.6) hue-rotate(-10deg) brightness(1.05) drop-shadow(-6px -4px 12px rgba(150, 0, 40, 0.95))',
        caster: { hold: 240 },
        // 천상의 심판: 예고 원 → 빛의 기둥 / 악마병 소환: 체력 below 아래에서 every초마다 n기
        judgment: { every: 9, warn: 1.4, dmg: 0.09 },
        summon: { below: 0.5, every: 12, unit: 'demon', n: 2 },
        chain: { every: 13, warn: 0.8, root: 1.6, dmg: 0.03 }
    },
    cultist: { name: '진화의 광신도', hp: 360, dps: 36, speed: [80, 104], reward: 1, artAs: 'raider', tint: 'hue-rotate(235deg) saturate(1.3) brightness(0.85)' },
    tentacle: {
        name: '심연 촉수귀', hp: 540, dps: 52, speed: [70, 88], reward: 1.8,
        artAs: 'sludge', tint: 'hue-rotate(250deg) brightness(0.55) saturate(1.7)'
    },
    carapace: {
        name: '생체 방패수', hp: 680, dps: 24, speed: [44, 56], reward: 2, armor: 0.3, knockResist: true,
        artAs: 'builder', tint: 'hue-rotate(200deg) saturate(1.3) brightness(0.8)',
        barricade: { range: 300, every: 9, hp: 650, gap: 140, label: '🛡 갑각 장벽!' }
    },
    slime: {
        name: '키메라 슬라임', hp: 420, dps: 30, speed: [60, 76], reward: 1.2,
        artAs: 'minion', tint: 'hue-rotate(160deg) saturate(1.6) brightness(1.05)',
        split: { into: 'slimelet', n: 2 }   // 쓰러지면 작은 슬라임 2기 (한 번만)
    },
    slimelet: {
        name: '작은 슬라임', hp: 160, dps: 18, speed: [86, 100], reward: 0.4, scale: 0.6,
        artAs: 'slime', tint: 'saturate(1.3) brightness(1.15)'   // 키메라 슬라임 그림을 작게 (갈라져 나온 조각)
    },
    sporer: {
        name: '포자 술사', hp: 260, dps: 0, speed: [66, 80], reward: 1.8, artAs: 'tranq', tint: 'hue-rotate(70deg) saturate(1.7) brightness(0.9)',
        spore: { range: 280, every: [1, 3], dmg: 28 }   // 높은 포물선 (곡사)
    },
    oculus: {
        name: '관장자 오큘러스', boss: true, hp: 6000, dps: 50, speed: [34, 34], reward: 60, armor: 0.3, knockResist: true,
        artAs: 'scrapking', tint: 'hue-rotate(225deg) saturate(1.3) brightness(0.8)',
        caster: { hold: 260 },
        // 심연의 파동: 발밑 예고 → 촉수 / 유전자 붕괴: 점액 → 긴 감속
        wave: { every: 8, warn: 1.0, dmg: 0.07 },
        goo: { every: 11, slow: 4, range: 460 },
        // 극한의 변이 (2페이즈): 체력 at 아래 → 뒤에 머물지 않고 근접 광폭화 + 돌진
        rage: {
            at: 0.5, speedMul: 2.4, dpsMul: 1.8, scale: 1.15,
            tint: 'hue-rotate(-30deg) saturate(2) brightness(0.9) drop-shadow(0 0 12px rgba(255, 40, 60, 0.8))',
            glow: 'drop-shadow(0 0 10px rgba(255, 40, 60, 0.75))',   // 2페이즈 그림(oculus2)을 쓸 때는 색조 대신 진홍 윤곽 빛만
            charge: { every: 7, warn: 0.8, dmg: 0.08, push: 110 },
            gaze: { every: 9, warn: 1.0, dmg: 0.06, stun: 0.5 }
        }
    }
});
export const ELITE = { hp: 3, dps: 1.5, scale: 1.3, reward: 4, affixReward: 0.25 };
export const ELITE_AFFIXES = {
    swift: { name: '가속', color: '120, 220, 255', speedMul: 1.6, dpsMul: 1.15 },
    shielded: { name: '보호막', color: '110, 170, 255', shield: 0.4 },
    thorns: { name: '가시', color: '170, 230, 90', reflect: 0.12, cap: 0.01 },
    regen: { name: '재생', color: '90, 255, 140', delay: 2, rate: 0.03 },
    frost: { name: '서리', color: '160, 225, 255', every: 4, slow: 1.5 },
    toxic: { name: '독 구름', color: '190, 230, 40', sec: 4, width: 120 },
    volatile: { name: '폭발', color: '255, 140, 40', delay: 1, radius: 150, dmg: 0.04 },
    iron: { name: '강철', color: '200, 205, 215', cut: 0.2 }
};

const ENEMY_CENTER = 38;   // 적 x(왼쪽 끝)에서 몸 가운데까지 — 겨누기·이펙트 기준 (bases_v2.js aimAt)
const ART_FOOT_B = 58;     // 그림 적의 발 높이 (bottom px)
// 아군 그림 (.ally-minion은 index.css에서 좌우 반전 → 왼쪽을 보는 구운 그림이 오른쪽을 봄)
// 세뇌 보병(타락 히어로 징집, D-020) = 경비병 그림 + 검보라(ui_v2.css), 합성괴인 졸개 = 졸개 그림(D-039)
const ALLY_ART = {
    'v2-mind': { art: 'guard', filter: null },
    'chimera-minion-v2': { art: 'minion', filter: 'drop-shadow(0 0 5px rgba(255, 150, 40, 0.5))' },
    'doll-rabbit-v2': { art: 'rabbit', filter: 'drop-shadow(0 0 4px rgba(90, 230, 240, 0.7))' }   // 뒤틀린 인형사 토끼 인형 (D-049)
};
// 봉합 성녀가 꿰매 일으킨 아군: 쓰러진 적 그림 그대로 + 붉은 실 빛 (battle/saint.js)
const STITCH_FILTER = 'saturate(0.8) sepia(0.25) hue-rotate(-12deg) drop-shadow(0 0 4px rgba(235, 40, 70, 0.85))';
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

/** 그림 적·아군의 CSS(종류별 걷기·공격 스프라이트)를 한 번만 주입 */
export function ensureEnemyStyles() {
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
    for (const [cls, { art, filter }] of Object.entries(ALLY_ART)) {
        const m = ENEMY_ART[art];
        if (!m) continue;
        css.push(`
        #screen-battle-v2 .ally-minion.${cls} {
            width: ${m.frameWidth}px; height: ${m.frameHeight}px; bottom: ${ART_FOOT_B}px;
            background-image: url('${m.walk.src}'); background-size: auto 100%;
            animation: v2-${art}-walk ${m.walk.duration}s steps(${m.walk.frames}) infinite;${filter ? `
            filter: ${filter};` : ''}
        }
        #screen-battle-v2 .ally-minion.${cls}.is-attacking {
            background-image: url('${m.attack.src}');
            animation: v2-${art}-attack ${m.attack.duration}s steps(${m.attack.frames}) infinite;
        }`);
    }
    for (const [id, m] of Object.entries(ENEMY_ART)) {
        if (!m.attack) continue;
        css.push(`
        #screen-battle-v2 .ally-minion.v2-stitch-${id} {
            width: ${m.frameWidth}px; height: ${m.frameHeight}px; bottom: ${ART_FOOT_B}px;
            background-image: url('${m.walk.src}'); background-size: auto 100%;
            animation: v2-${id}-walk ${m.walk.duration}s steps(${m.walk.frames}) infinite;
            filter: ${STITCH_FILTER};
        }
        #screen-battle-v2 .ally-minion.v2-stitch-${id}.is-attacking {
            background-image: url('${m.attack.src}');
            animation: v2-${id}-attack ${m.attack.duration}s steps(${m.attack.frames}) infinite;
        }`);
    }
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

/** 적 하나를 전장에 만든다. opts: { x, elite, affixes? } */
export function spawnEnemy(b, typeId, opts = {}) {
    ensureEnemyStyles();
    const t0 = ENEMY_TYPES[typeId] || ENEMY_TYPES.guard;
    // 나이트메어 보스: 기술 간격을 줄인 복사본 (difficulty_v2.js bossHaste)
    const t = t0.boss ? hastedType(typeId, t0, b.stage.bossHaste) : t0;
    const se = b.stage.enemy;
    const elite = !!opts.elite && !t.boss;
    const affixes = [];
    if (elite) {
        if (Array.isArray(opts.affixes)) {
            affixes.push(...new Set(opts.affixes.filter(id => Object.hasOwn(ELITE_AFFIXES, id))));
        } else {
            const pool = Object.keys(ELITE_AFFIXES);
            const count = b.stage.affixCount ?? (b.stage.zone >= 3 ? 2 : 1);   // 난이도별 (difficulty_v2.js affixCountFor)
            for (let i = 0; i < count; i++) affixes.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
        }
    }
    const hp = Math.round(t.hp * se.hp * (elite ? ELITE.hp : 1));
    // 그림: 그 종류의 그림 → 없으면 빌린 그림(artAs, 구역 3·4 임시) → 없으면 임시 고블린
    const own = !!ENEMY_ART[typeId];
    const artKey = own ? typeId : (t.artAs && ENEMY_ART[t.artAs] ? t.artAs : null);
    const art = artKey ? ENEMY_ART[artKey] : null;
    const scale = (own ? 1 : t.scale || 1) * (elite ? ELITE.scale : 1);   // 자기 그림은 구운 크기가 곧 게임 크기

    const el = document.createElement('div');
    el.className = `enemy-entity v2-enemy v2-type-${typeId}${art ? ` has-art v2-art-${artKey}` : ''}${elite ? ' is-elite' : ''}${t.boss ? ' is-boss' : ''}`;
    el.dataset.name = `${elite ? `엘리트 ${affixes.length ? `[${affixes.map(id => ELITE_AFFIXES[id].name).join('·')}] ` : ''}` : ''}${t.name}`;
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
        speed: rand(t.speed), isBuilding: false, dom: el, hpBar: bar, art, artKey: artKey || typeId, attacking: false,
        elite, affixes, boss: !!t.boss, armor: t.armor || 0, knockResist: !!t.knockResist || affixes.includes('iron'),
        reward: (t.reward || 1) * (elite ? ELITE.reward * (1 + ELITE.affixReward * affixes.length) : 1),
        baseFilter: [own ? '' : t.tint, elite ? 'drop-shadow(0 0 5px #ffd24a)' : '',
            affixes.length ? `drop-shadow(0 0 7px rgb(${ELITE_AFFIXES[affixes[0]].color}))` : ''].filter(Boolean).join(' '),
        cd: { skill: Math.random() * 1.5, smite: 0 }
    };
    if (affixes.includes('swift')) {
        e.speed *= ELITE_AFFIXES.swift.speedMul;
        e.dps *= ELITE_AFFIXES.swift.dpsMul;
    }
    if (affixes.includes('shielded')) e.shield = e.maxShield = e.maxHp * ELITE_AFFIXES.shielded.shield;
    b.updateEnemyFilter(e);
    e.scale = scale;
    b.enemies.push(e);
    if (elite && b.fx) b.fx.play(BATTLE_VFX.eliteSpawn, e.x + ENEMY_CENTER, FOOT_B, { scale: e.scale });
    return e;
}

/**
 * 적 한 명의 이번 프레임 행동 (이동, 공격, 종류별 능력). 기절한 적은 부르지 않는다.
 * frontX: 주인공 앞면 x
 */
export function updateEnemy(b, e, dt, frontX) {
    const t = e.t;
    const blocked = e.healBlockUntil > b.stats.time || e.purifyUntil > b.stats.time;   // 치유 방해 옵션·정화 파동 (battle/growth.js)
    const regen = e.affixes?.includes('regen') && !blocked && ELITE_AFFIXES.regen;
    if (regen && b.stats.time - (e.lastHit || 0) >= regen.delay && e.hp < e.maxHp) {
        e.hp = Math.min(e.maxHp, e.hp + e.maxHp * regen.rate * dt);
        if (e.hpBar) e.hpBar.style.width = `${(e.hp / e.maxHp) * 100}%`;
        e.cd.regenFx = (e.cd.regenFx || 0) + dt;
        if (e.cd.regenFx >= 0.5) {
            e.cd.regenFx = 0;
            b.fx.play(ELITE_VFX.regenMotes, e.x + ENEMY_CENTER, FOOT_B + 30);
        }
    }
    const frost = e.affixes?.includes('frost') && !(e.purifyUntil > b.stats.time) && ELITE_AFFIXES.frost;
    if (frost) {
        e.cd.frostFx = (e.cd.frostFx || 0) + dt;
        if (e.cd.frostFx >= 0.5) {
            e.cd.frostFx = 0;
            b.fx.play({ layers: [{ type: 'motes', count: 4, spread: 40, rise: [10, 25], life: [0.5, 0.8], size: 2, color: frost.color }] },
                e.x + ENEMY_CENTER, FOOT_B + 55);
        }
    }
    const slowMul = e.slowT > 0 ? 0.5 : 1;
    const dist = e.x - frontX;

    // 수호의 결계: 거리·아군과의 교전 여부와 상관없이 주기마다 금빛 방벽
    if (t.barrier) {
        if (e.barrierT > 0) {
            e.barrierT = Math.max(0, e.barrierT - dt);
            if (e.barrierT <= 0) {
                e.baseFilter = e.barrierBaseFilter;
                b.updateEnemyFilter(e);
            }
        }
        e.cd.barrier = (e.cd.barrier || 0) + dt;
        if (e.cd.barrier >= t.barrier.every) {
            e.cd.barrier = 0;
            e.barrierT = t.barrier.sec;
            e.barrierBaseFilter = e.baseFilter;
            e.baseFilter = [e.baseFilter, 'drop-shadow(0 0 10px rgba(255, 220, 120, 0.95))'].filter(Boolean).join(' ');
            b.updateEnemyFilter(e);
            b.createDamagePopup(e.x, 240, '🛡 수호의 결계', false);
            b.fx.play(BOSS_VFX.guardianBarrier, e.x + ENEMY_CENTER, FOOT_B + 90, { follow: () => [e.x + ENEMY_CENTER, FOOT_B + 90] });
        }
    }

    // 아군 미니언과 맞붙으면 그쪽과 싸움 (공격력이 있는 적만)
    if (e.dps > 0) {
        const ally = b.allies.find(a => e.x - a.x <= 65 && e.x - a.x >= -35);
        if (ally) {
            setAttacking(e, true);
            b.damageAlly(ally, e.dps * dt);
            return;
        }
    }

    // 보스 기술 (거리와 상관없이 주기마다): 고철왕 자석·고철 낙하 / 대주교·오큘러스 (구역 3·4)
    if (t.magnet || t.drop) tickBossSkills(b, e, dt, dist);
    if (t.judgment || t.summon || t.wave || t.goo || t.rage) tickAbyssBoss(b, e, dt, dist);

    // 원거리(마취총·오물·그물·마법·포자) · 치유(의무병·수리공·신관) · 뒤에 머무는 보스(caster):
    // 정해진 거리에서 멈추고 천천히 다가오며 능력 사용. 2페이즈(rage)가 되면 caster는 근접으로
    const shot = t.ranged || t.sludge || t.net || t.spell || t.spore;
    const hold = shot ? shot.range : t.heal ? t.heal.keepBack : t.caster && !e.raged ? t.caster.hold : 0;
    if (hold) {
        const moving = dist > hold ? 1 : dist > 40 ? CREEP : 0;
        if (moving) moveBy(b, e, e.speed * slowMul * moving * dt);
        e.cd.skill += dt;
        // 주기가 [최소, 최대]면 쏠 때마다 새로 고름 (마법사·포자 술사 1~3초)
        const every = shot && (Array.isArray(shot.every) ? (e.cd.next ??= rand(shot.every)) : shot.every);
        if (shot && dist <= hold + 20 && e.cd.skill >= every) {
            e.cd.skill = 0;
            if (Array.isArray(shot.every)) e.cd.next = rand(shot.every);
            if (t.ranged) shootTranq(b, e);
            else if (t.sludge) throwSludge(b, e);
            else if (t.net) shootNet(b, e);
            else if (t.spell) castSpell(b, e);
            else lobSpore(b, e);
            if (frost) frostShot(b, frost);
        }
        if (t.heal && e.cd.skill >= t.heal.every) {
            e.cd.skill = 0;
            if (healNearest(b, e) && frost) frostShot(b, frost);
        }
        return;
    }

    // 방벽병: 사거리에 들어오면 멈춰서 바리케이드를 박음 (망치 동작 동안 서 있음)
    if (t.barricade) {
        e.cd.build = (e.cd.build ?? t.barricade.every * 0.6) + dt;
        if (e.busyT > 0) {
            e.busyT -= dt;
            return;
        }
        if (dist <= t.barricade.range && dist > MELEE.reach && e.cd.build >= t.barricade.every
            && !b.enemies.some(o => o.isBarricade && Math.abs(o.x - (e.x - 40)) < t.barricade.gap)) {
            e.cd.build = 0;
            e.busyT = 0.9;
            playOnce(e, 'attack');
            b.schedule(0.5, () => {
                if (b.isActive && b.enemies.includes(e)) b.spawnBarricade(e.x - 70, t.barricade.hp * b.stage.enemy.hp, t.barricade.label);
            });
            return;
        }
    }

    // 근접: 다가가서 닿으면 공격
    if (dist > MELEE.stop) moveBy(b, e, e.speed * slowMul * dt);
    if (dist > MELEE.reach) {
        setAttacking(e, false);
        return;
    }
    if (b.legContact(e)) return;   // 다리 패시브(궤도 돌진)로 밀려남
    setAttacking(e, true);
    b.damagePlayer(e.dps * dt, dt, e);   // e: 가시 갑옷 되돌림 대상

    if (frost && e.dps > 0) {
        e.cd.frost = (e.cd.frost || 0) + dt;
        if (e.cd.frost >= frost.every) {
            e.cd.frost = 0;
            b.applyPlayerSlow(frost.slow);
            b.fx.play(ELITE_VFX.frostHit, b.monsterX + 60, 110);
        }
    }

    e.cd.skill += dt;
    if (t.shock && e.cd.skill >= t.shock.every) {
        e.cd.skill = 0;
        b.fx.play(BATTLE_VFX.shockHit, b.monsterX + 60, 110);
        sound.play('hero_wave_hit', { rate: 1.5 });
        b.applyPlayerStun(t.shock.stun, '감전!');
    }
    if (t.cleave && e.cd.skill >= t.cleave.every) {   // 악마기사: 도끼 내려찍기
        e.cd.skill = 0;
        playOnce(e, 'attack');
        b.fx.play(ZONE_VFX.axeCleave, b.monsterX + 70, 100);
        b.director.shake(7, 300);
        b.damagePlayer(b.maxPlayerHp * t.cleave.dmg, 0);
        b.createDamagePopup(b.monsterX + 30, 210, '🪓 도끼 내려찍기', false);
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

function moveBy(b, e, px) {
    if (e.rootT > 0) return;   // 속박 (저주의 사슬): 제자리에서 공격만
    px *= b.kitEnemyMove ? b.kitEnemyMove(e) : 1;   // 2차 패시브 마왕의 위압: 보통 적 이동 감소 (battle/kit.js)
    if (e.purifyUntil > b.stats.time && e.affixes?.includes('swift')) px /= ELITE_AFFIXES.swift.speedMul;   // 정화 파동: 가속 해제
    e.x -= px;
    if (e.dom) e.dom.style.left = `${e.x}px`;
    if (px > 0 && e.affixes?.includes('swift') && b.stats.time - (e.cd.swiftFx ?? -Infinity) >= 0.2) {
        e.cd.swiftFx = b.stats.time;
        b.fx.play({ layers: [{ type: 'motes', count: 5, spread: 14, rise: [5, 15], life: [0.2, 0.4], size: 2, color: ELITE_AFFIXES.swift.color }] },
            e.x + ENEMY_CENTER + 20, FOOT_B + 8);
    }
}

// 원거리·치유형 서리: 발사 뒤 짧은 지연, 자기장 방벽이면 감속 시간 절반
function frostShot(b, frost) {
    b.schedule(0.4, () => {
        if (!b.isActive || b.finalBaseDestroyed) return;
        b.applyPlayerSlow(frost.slow * b.rangedMul());
        b.fx.play(ELITE_VFX.frostHit, b.monsterX + 60, 110);
    });
}

// 마취탄: 적 → 주인공 가슴, 맞으면 피해 + 감속
function shootTranq(b, e) {
    playOnce(e, 'attack');
    const from = { x: e.x + 12, bottom: 96 };
    sound.play('mech_laser', { rate: 1.7, vol: 0.6 });
    b.fx.launchOrb(from, () => ({ x: b.monsterX + 60, b: 120 }), '90, 230, 255', 0.38, () => {
        if (!b.isActive) return;
        const k = b.rangedMul();   // 자기장 방벽: 원거리 피해·효과 절반
        b.damagePlayer(e.t.ranged.dmg * b.stage.enemy.dps * k, 0);
        b.applyPlayerSlow(e.t.ranged.slow * k);
    }, null);
}

// 오물 투척: 국자로 오물을 던져 주인공 발밑에 늪 장판
function throwSludge(b, e) {
    const s = e.t.sludge;
    playOnce(e, 'attack');
    const from = { x: e.x + 8, bottom: 110 };
    const tx = b.monsterX + 60;
    sound.play('kaiju_spore', { rate: 0.8, vol: 0.6 });
    b.fx.launchOrb(from, () => ({ x: tx, b: FOOT_B + 6 }), '190, 230, 40', 0.55, () => {
        if (b.isActive) b.addPuddle(tx - s.width / 2, s.width, s.sec * b.rangedMul());
    }, null);
}

// 그물: 맞으면 피해 + 속박 (진격 불가, 공격은 가능)
function shootNet(b, e) {
    const n = e.t.net;
    playOnce(e, 'attack');
    const from = { x: e.x + 4, bottom: 104 };
    sound.play('mech_missile_launch', { rate: 1.5, vol: 0.5 });
    b.fx.launchOrb(from, () => ({ x: b.monsterX + 60, b: 110 }), '210, 190, 140', 0.42, () => {
        if (!b.isActive) return;
        const k = b.rangedMul();
        b.damagePlayer(n.dmg * b.stage.enemy.dps * k, 0);
        b.applyPlayerRoot(n.root * k);
    }, null);
}

// 마법사 (구역 3): 불·번개·얼음 중 하나 — 원소별 피해·상태 이상
const SPELLS = [
    { key: 'fire', name: '🔥', color: '255, 140, 40', sfx: 'zone_spell_fire', fx: 'spellFire' },
    { key: 'bolt', name: '⚡', color: '255, 240, 120', sfx: 'zone_spell_bolt', fx: 'spellBolt' },
    { key: 'ice', name: '❄', color: '150, 220, 255', sfx: 'zone_spell_ice', fx: 'spellIce' }
];
export function castSpell(b, e, key = null) {
    const s = SPELLS.find(s => s.key === key) || SPELLS[Math.floor(Math.random() * SPELLS.length)];
    playOnce(e, 'attack');
    sound.play(s.sfx, { rate: 1.4, vol: 0.5 });
    b.fx.launchOrb({ x: e.x + 10, bottom: 110 }, () => ({ x: b.monsterX + 60, b: 120 }), s.color, 0.36, () => {
        if (!b.isActive) return;
        b.fx.play(ZONE_VFX[s.fx], b.monsterX + 60, 120);
        const spell = e.t.spell, effect = spell[s.key];
        const k = b.rangedMul();
        const dmg = spell.dmg * b.stage.enemy.dps;
        b.damagePlayer(dmg * k * effect.dmgMul, 0);
        if (effect.burnTicks) {
            b.createDamagePopup(b.monsterX + 40, 200, '🔥 화상', false);
            for (let i = 1; i <= effect.burnTicks; i++) b.schedule(effect.burnEvery * i, () => {
                if (b.isActive && !b.finalBaseDestroyed) b.damagePlayer(dmg * effect.burnMul * k, 0);
            });
        }
        if (effect.stun) b.applyPlayerStun(effect.stun * k, '감전!');
        if (effect.slow) b.applyPlayerSlow(effect.slow * k);
    }, null);
}

// 포자 술사 (구역 4): 높은 포물선으로 포자 덩어리
function lobSpore(b, e) {
    playOnce(e, 'attack');
    b.fx.launchMissile({ x: e.x + 10, bottom: 120 }, () => ({ x: b.monsterX + 60, b: FOOT_B + 40 }), () => {
        if (!b.isActive) return;
        b.fx.play(ZONE_VFX.sporeBurst, b.monsterX + 60, FOOT_B + 40);
        b.damagePlayer(e.t.spore.dmg * b.stage.enemy.dps * b.rangedMul(), 0);
    }, { apex: 150, dur: 0.95, color: '150, 255, 90' });
}

// 구역 3·4 보스: 대주교 베네딕트(천상의 심판·악마병 소환), 관장자 오큘러스(심연의 파동·유전자 붕괴·극한의 변이·돌진)
function tickAbyssBoss(b, e, dt, dist) {
    const t = e.t;
    if (t.rage && !e.raged && e.hp <= e.maxHp * t.rage.at) enrage(b, e);
    if (t.judgment) {
        e.cd.judgment = (e.cd.judgment ?? t.judgment.every * 0.5) + dt;
        if (e.cd.judgment >= t.judgment.every) {
            e.cd.judgment = 0;
            groundStrike(b, e, t.judgment, 'bash', '⚠ 천상의 심판', () => {
                b.fx.play(ZONE_VFX.heavenPillar, b.monsterX + 35, FOOT_B, { scale: 1 });
                b.director.flash('#fff6c8', 240, 0.6);
            }, ZONE_VFX.judgmentWarn, ZONE_VFX.heavenPillar);
        }
    }
    if (t.summon && e.hp <= e.maxHp * t.summon.below) {
        const s = t.summon;
        e.cd.summon = (e.cd.summon ?? s.every - 1.5) + dt;   // 처음엔 금방
        if (e.cd.summon >= s.every) {
            e.cd.summon = 0;
            playOnce(e, 'attack');
            b.director.flash('#7a0a1e', 320, 0.35);
            b.createDamagePopup(e.x - 20, 260, '🔥 지옥문 — 악마병!', false);
            for (let i = 0; i < s.n; i++) {
                const x = e.x - 60 - i * 45;
                b.fx.play(ZONE_VFX.hellGate, x + 38, FOOT_B + 30);
                b.spawnMinion(s.unit, { x, elite: false });
            }
        }
    }
    if (t.chain) {
        const c = t.chain;
        e.cd.chain = (e.cd.chain || 0) + dt;
        if (e.cd.chain >= c.every) {
            e.cd.chain = 0;
            playOnce(e, 'attack');
            b.createDamagePopup(e.x, 250, '⚠ 속죄의 사슬', false);
            b.schedule(c.warn, () => {
                if (!b.isActive || !b.enemies.includes(e)) return;
                b.fx.launchChain(() => ({ x: e.x + 10, b: 150 }), () => ({ x: b.monsterX + 60, b: 120 }), {
                    color: '255, 214, 120',
                    onHook: () => {
                        if (!b.isActive || !b.enemies.includes(e)) return;
                        b.damagePlayer(b.maxPlayerHp * c.dmg, 0);
                        b.applyPlayerRoot(c.root * b.rangedMul());
                        b.fx.play(BOSS_VFX.chainHit, b.monsterX + 60, 120);
                    }
                });
            });
        }
    }
    if (t.wave) {
        e.cd.wave = (e.cd.wave ?? t.wave.every * 0.5) + dt;
        if (e.cd.wave >= t.wave.every) {
            e.cd.wave = 0;
            groundStrike(b, e, t.wave, 'drop', '⚠ 심연의 파동', () => {
                const x = b.monsterX + 35;
                [-38, 0, 38].forEach((dx, i) => b.schedule(i * 0.06, () => b.fx.play(BATTLE_VFX.abyssSpike, x + dx, FOOT_B, { scale: 0.8 + i * 0.15 })));
            }, ZONE_VFX.abyssWarn);
        }
    }
    if (t.goo && !e.raged) {
        e.cd.goo = (e.cd.goo ?? t.goo.every * 0.7) + dt;
        if (e.cd.goo >= t.goo.every && dist <= t.goo.range) {
            e.cd.goo = 0;
            playOnce(e, 'magnet');
            b.fx.launchOrb({ x: e.x + 20, bottom: 150 }, () => ({ x: b.monsterX + 60, b: 110 }), '150, 255, 90', 0.5, () => {
                if (!b.isActive) return;
                b.fx.play(ZONE_VFX.gooSplat, b.monsterX + 60, FOOT_B + 30);
                b.createDamagePopup(b.monsterX + 20, 230, '🧬 유전자 붕괴', false);
                b.applyPlayerSlow(t.goo.slow * b.rangedMul());
            }, null);
        }
    }
    if (e.raged && t.rage.charge) {
        const c = t.rage.charge;
        e.cd.charge = (e.cd.charge ?? c.every * 0.5) + dt;
        if (e.cd.charge >= c.every && !e.charging) {
            e.cd.charge = 0;
            e.charging = true;
            b.createDamagePopup(e.x, 270, '⚠ 돌진', false);
            sound.play('charge_up', { rate: 0.8 });
            b.schedule(c.warn, () => {
                e.charging = false;
                if (!b.isActive || !b.enemies.includes(e)) return;
                e.x = b.frontX() + 10;   // 주인공 앞까지 달려듦
                if (e.dom) e.dom.style.left = `${e.x}px`;
                playOnce(e, 'attack');
                b.fx.play(ZONE_VFX.chargeImpact, b.monsterX + 70, 100);
                b.director.shake(12, 450);
                b.damagePlayer(b.maxPlayerHp * c.dmg, 0);
                b.knockPlayerBack(c.push, '돌진에 밀려남!');
            });
        }
    }
    if (e.raged && t.rage.gaze) {
        const g = t.rage.gaze;
        e.cd.gaze = (e.cd.gaze || 0) + dt;
        if (e.cd.gaze >= g.every) {
            e.cd.gaze = 0;
            b.fx.play(BOSS_VFX.gazeWarn, e.x + 40, 190, { to: [b.monsterX + 60, 120], follow: () => [e.x + 40, 190] });
            b.schedule(g.warn, () => {
                if (!b.isActive || !b.enemies.includes(e)) return;
                b.fx.play(BOSS_VFX.gaze, e.x + 40, 190, { to: [b.monsterX + 60, 120] });
                b.damagePlayer(b.maxPlayerHp * g.dmg, 0);
                b.applyPlayerStun(g.stun, '진홍 시선!');
            });
        }
    }
}

/** 주인공 발밑 예고 원 → warn초 뒤 hit() + 최대 내구도 비율 피해 (천상의 심판·심연의 파동) */
function groundStrike(b, e, s, clip, label, hit, warnFx = BATTLE_VFX.smiteWarn, hitFx = null) {
    playOnce(e, clip);
    b.fx.play(warnFx, b.monsterX + 35, FOOT_B, { follow: () => [b.monsterX + 35, FOOT_B] });
    b.createDamagePopup(b.monsterX + 20, 220, label, false);
    sound.play('warning', { vol: 0.5, rate: 1.3 });
    b.schedule(s.warn, () => {
        if (!b.isActive || !b.enemies.includes(e)) return;
        hit();
        b.director.shake(10, 450);
        if (!hitFx?.sfx) sound.play('chimera_slam', { rate: 0.85 });
        b.damagePlayer(b.maxPlayerHp * s.dmg, 0);
    });
}

/** 극한의 변이 (오큘러스 2페이즈): 근접 광폭화 — 빠르고 세짐, 진홍 색조·조금 커짐, 배경이 진홍으로 (ui_v2.css .v2-boss-rage) */
function enrage(b, e) {
    b.fx.play(ZONE_VFX.mutationBurst, e.x + 60, FOOT_B + 90);
    const r = e.t.rage;
    e.raged = true;
    e.speed *= r.speedMul;
    e.dps = (e.dps || e.t.dps * b.stage.enemy.dps) * r.dpsMul;
    // 2페이즈 그림(<종류>2, 예: oculus2)이 있으면 바꿔 끼우고 색조 없이 — 없으면 임시로 색조·크기만
    const phase2 = `${e.type}2`;
    if (ENEMY_ART[phase2] && e.dom) {
        e.dom.classList.remove(`v2-art-${e.artKey}`);
        e.dom.classList.add(`v2-art-${phase2}`);
        e.art = ENEMY_ART[phase2];
        e.artKey = phase2;
        e.baseFilter = r.glow || '';
    } else {
        e.baseFilter = r.tint;
        if (e.dom) e.dom.style.transform = `scale(${(e.scale || 1) * r.scale})`;
    }
    b.updateEnemyFilter(e);
    b.director.flash('#ff2040', 480, 0.6);
    b.director.shake(14, 700);
    b.director.stamp('극한의 변이', `${e.t.name} — 외눈 괴수로 변이한다`, 'is-red', 1800);
    document.getElementById('screen-battle-v2')?.classList.add('v2-boss-rage');
}

// 고철왕 기술: 자석으로 붙잡아 뒤로 내던짐 / 예고 원 자리에 고철 낙하
function tickBossSkills(b, e, dt, dist) {
    const t = e.t;
    if (t.scrapWall) {
        const w = t.scrapWall;
        e.cd.scrapWall = (e.cd.scrapWall || 0) + dt;
        if (e.cd.scrapWall >= w.every) {
            e.cd.scrapWall = 0;
            if (!b.enemies.some(o => o.isBarricade && Math.abs(o.x - (e.x - 90)) < w.gap)) {
                playOnce(e, 'drop');
                b.spawnBarricade(e.x - 90, w.hp * b.stage.enemy.hp, '🧲 고철 방벽!');
            }
        }
    }
    e.cd.magnet = (e.cd.magnet || 0) + dt;
    e.cd.drop = (e.cd.drop ?? t.drop.every * 0.5) + dt;
    if (t.magnet && e.cd.magnet >= t.magnet.every && dist <= t.magnet.range) {
        e.cd.magnet = 0;
        const m = t.magnet;
        playOnce(e, 'magnet');
        b.createDamagePopup(e.x, 250, '🧲 자석!', false);
        sound.play('charge_up', { rate: 0.7, vol: 0.7 });
        b.schedule(m.warn, () => {
            if (!b.isActive || !b.enemies.includes(e)) return;
            b.fx.launchOrb({ x: e.x - 20, bottom: 120 }, () => ({ x: b.monsterX + 60, b: 120 }), '120, 200, 255', 0.25, () => {
                if (!b.isActive) return;
                b.knockPlayerBack(m.push, '자석에 붙잡혀 내던져짐!');   // 자기장 방벽은 knockPlayerBack 안에서 절반
                b.applyPlayerStun(m.stun * (b.equippedLegId === 'leg_mech_b' ? 0.5 : 1), '자석!');
            }, null);
        });
    }
    if (t.drop && e.cd.drop >= t.drop.every) {
        e.cd.drop = 0;
        const d = t.drop;
        playOnce(e, 'drop');
        b.fx.play(BATTLE_VFX.smiteWarn, b.monsterX + 35, FOOT_B, { follow: () => [b.monsterX + 35, FOOT_B] });
        b.createDamagePopup(b.monsterX + 20, 220, '⚠ 고철 낙하', false);
        sound.play('warning', { vol: 0.5, rate: 1.2 });
        b.schedule(d.warn, () => {
            if (!b.isActive || !b.enemies.includes(e)) return;
            b.fx.play(BATTLE_VFX.baseBlast, b.monsterX + 35, FOOT_B + 20, { scale: 1.2 });
            b.director.shake(10, 450);
            sound.play('chimera_slam', { rate: 0.8 });
            b.damagePlayer(b.maxPlayerHp * d.dmg, 0);
        });
    }
}

// 치유·수리: 사거리 안에서 체력 비율이 가장 낮은 적(거점·바리케이드 포함)
function healNearest(b, e) {
    const h = e.t.heal;
    const cands = b.enemies.filter(o => o !== e && o.hp < o.maxHp && Math.abs(o.x - e.x) <= h.range
        && !(o.healBlockUntil > b.stats.time)                                                       // 치유 방해 옵션
        && !(h.soldiersOnly && (o.isBuilding || o.isBarricade)));   // 신관: 병사만
    if (!cands.length) return;
    playOnce(e, 'attack');
    // 수리공은 건물·바리케이드를 먼저
    const fixed = o => o.isBuilding || o.isBarricade;
    const pool = h.repair && cands.some(fixed) ? cands.filter(fixed) : cands;
    const target = pool.sort((p, q) => p.hp / p.maxHp - q.hp / q.maxHp)[0];
    const mul = target.isBarricade ? (h.barricadeMul ?? h.baseMul) : target.isBuilding ? h.baseMul : (h.soldierMul ?? 1);
    const amount = h.amount * b.stage.enemy.hp * mul;
    target.hp = Math.min(target.maxHp, target.hp + amount);
    if (target.hpBar) target.hpBar.style.width = `${(target.hp / target.maxHp) * 100}%`;
    if (target.isBuilding) {
        b.currentTargetHp = target.hp;
        b.updateHud();
    }
    const tx = aimAt(target).x;
    b.fx.play(h.soldiersOnly ? ZONE_VFX.holyHeal : KAIJU_VFX.regen, tx, FOOT_B);
    b.createDamagePopup(target.x, target.isBuilding ? 200 : 130, `+${Math.round(amount)} ${h.repair ? '수리' : '치유'}`, false);
    if (!h.soldiersOnly) sound.play('kaiju_regen', { rate: 1.3 });
    return true;
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

