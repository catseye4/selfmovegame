/* ==========================================================================
   PROJECT: MAD OVERLORD // 적 리그 데이터 (v2) — 경비병·방패병·마취총 사수·전기 충격병·의무병·보스
   파츠: tools/rig/cut_enemy_parts.py 가 Gemini 이미지(전신 + 팔 없는 몸)에서 분리 (원본 1024px 좌표).
   rot은 도(°), 화면 기준 +는 시계 방향. 모두 왼쪽을 보는 3/4 측면.

   전투에서는 리그를 직접 그리지 않고, 걷기·공격을 스프라이트로 구워 쓴다 (tools/rig/bake_sprite.py, D-017·D-035).
   다리 뼈는 엉덩이에서 아래를 향하므로 rot +는 발이 앞(왼쪽)으로, -는 뒤로.
   팔도 어깨에서 아래를 향하므로 rot +는 손이 앞으로 올라감 (+140이면 머리 위 뒤쪽).
   ========================================================================== */

const dir = id => `assets/sprites/rig/${id}/`;

/** 뼈대: 망토(있으면) → 다리 → 몸통 → 뒷팔 → 머리 → 앞팔(또는 두 팔 한 조각) 순으로 앞에 그림 */
function bones({ arms = 'two', cape = false, tail = false } = {}) {
    const list = [
        { name: 'root', parent: null },
        { name: 'legB', parent: 'root', part: 'legB', z: 1 },
        { name: 'legF', parent: 'root', part: 'legF', z: 2 },
        { name: 'body', parent: 'root', part: 'torso', z: 3 }
    ];
    if (cape) list.push({ name: 'cape', parent: 'body', part: 'cape', z: 0 });
    if (tail) list.push({ name: 'tail', parent: 'body', part: 'tail', z: 0 });   // 꼬리 뿌리는 뒷다리 뒤에 숨음
    if (arms === 'two') list.push({ name: 'armB', parent: 'body', part: 'armB', z: 4 });
    list.push({ name: 'head', parent: 'body', part: 'head', z: 5 });
    list.push(arms === 'two' ? { name: 'armF', parent: 'body', part: 'armF', z: 6 } : { name: 'arms', parent: 'body', part: 'arms', z: 6 });
    return list;
}

/**
 * 걷기: 한 사이클 = 뒷다리 내딛기(앞 절반) + 앞다리 내딛기(뒤 절반). 내딛는 다리는 들어 올렸다 내림
 * opt: { dur, leg(흔드는 각), lift, bob, armF, armB, arms, cape } — 팔 값은 흔드는 각(0이면 고정)
 */
function walk(o) {
    const d = o.dur, h = d / 2, q = d / 4;
    const swing = a => ({ rot: [[0, -a], [h, a], [d, -a]] });
    const tracks = {
        legF: { rot: [[0, 6], [h, -o.leg], [d, 6]], y: [[0, 0], [h, 0, 'out'], [h + q, -o.lift, 'in'], [d, 0]] },
        legB: { rot: [[0, -6], [h, o.leg], [d, -6]], y: [[0, 0, 'out'], [q, -o.lift, 'in'], [h, 0], [d, 0]] },
        body: {
            y: [[0, o.bob * 0.6, 'out'], [q, -o.bob, 'in'], [h, o.bob * 0.6, 'out'], [h + q, -o.bob, 'in'], [d, o.bob * 0.6]],
            rot: [[0, -1.5], [h, 1.5], [d, -1.5]]
        },
        head: { rot: [[0, 2], [q, -1.5], [h, 2], [h + q, -1.5], [d, 2]] }
    };
    if (o.armF != null) tracks.armF = swing(o.armF);
    if (o.armB != null) tracks.armB = { rot: [[0, o.armB], [h, -o.armB], [d, o.armB]] };
    if (o.arms != null) tracks.arms = { rot: [[0, -o.arms], [h, o.arms], [d, -o.arms]], y: [[0, 0], [q, 6], [h, 0], [h + q, 6], [d, 0]] };
    if (o.cape) tracks.cape = { rot: [[0, o.cape], [h, -o.cape], [d, o.cape]] };
    if (o.tail) tracks.tail = { rot: [[0, o.tail], [q, -o.tail], [h, o.tail], [h + q, -o.tail], [d, o.tail]] };   // 걸음마다 좌우로 살랑
    return {
        duration: d, loop: true, tracks,
        events: [[0, 'step', { foot: 'footF', bone: 'legF' }], [h, 'step', { foot: 'footB', bone: 'legB' }]]
    };
}

const idle = (arm = 'armF') => ({
    duration: 1.6, loop: true,
    tracks: { body: { y: [[0, 0], [0.8, 6], [1.6, 0]] }, head: { rot: [[0, 0], [0.8, -1.5], [1.6, 0]] },
        [arm]: { rot: [[0, 0], [0.8, 3], [1.6, 0]] } }
});

const impact = (t, color) => [[t, 'impact', { socket: 'tip', bone: 'armF', color }]];

// 진압봉 내려치기: 0~0.3 몸을 젖히며 진압봉을 머리 위로 → 0.4 앞으로 내딛으며 내려침 → 복귀
const BATON_SWING = {
    duration: 0.8, loop: true,
    tracks: {
        armF: { rot: [[0, 0], [0.3, 140, 'in'], [0.4, -18, 'out'], [0.55, -12], [0.8, 0]] },
        armB: { rot: [[0, 0], [0.3, -18], [0.4, 22, 'out'], [0.8, 0]] },
        body: { x: [[0, 0], [0.3, 14, 'in'], [0.4, -30, 'out'], [0.6, -22], [0.8, 0]],
                rot: [[0, 0], [0.3, 6, 'in'], [0.4, -8, 'out'], [0.6, -5], [0.8, 0]], y: [[0, 0], [0.3, -6], [0.4, 8], [0.8, 0]] },
        head: { rot: [[0, 0], [0.3, 4], [0.4, -5], [0.8, 0]] },
        legF: { rot: [[0, 0], [0.4, 10, 'out'], [0.8, 0]] },
        legB: { rot: [[0, 0], [0.4, -8, 'out'], [0.8, 0]] }
    },
    events: impact(0.4, '255, 220, 120')
};

// 방패 밀치기: 0~0.35 방패를 당기며 웅크림 → 0.45 몸을 실어 방패로 들이받음 → 복귀 (뒷손 곤봉은 살짝 치켜듦)
const SHIELD_BASH = {
    duration: 0.9, loop: true,
    tracks: {
        armF: { x: [[0, 0], [0.35, 16, 'in'], [0.45, -44, 'out'], [0.65, -34], [0.9, 0]], rot: [[0, 0], [0.35, -3], [0.45, 4], [0.9, 0]] },
        armB: { rot: [[0, 0], [0.35, -20], [0.45, 10, 'out'], [0.9, 0]] },
        body: { x: [[0, 0], [0.35, 12, 'in'], [0.45, -26, 'out'], [0.65, -20], [0.9, 0]],
                rot: [[0, 0], [0.35, 4], [0.45, -6, 'out'], [0.9, 0]], y: [[0, 0], [0.35, 8], [0.45, 0], [0.9, 0]] },
        legF: { rot: [[0, 0], [0.45, 10, 'out'], [0.9, 0]] },
        legB: { rot: [[0, 0], [0.45, -8, 'out'], [0.9, 0]] }
    },
    events: impact(0.45, '120, 200, 255')
};

// 마취총 발사(한 번): 반동으로 총이 뒤로 밀리며 총구가 들림 → 천천히 다시 겨눔
const RIFLE_SHOT = {
    duration: 0.6, loop: true,
    tracks: {
        arms: { x: [[0, 0], [0.06, 22, 'out'], [0.3, 6], [0.6, 0]], rot: [[0, 0], [0.06, 7, 'out'], [0.3, 2], [0.6, 0]] },
        body: { x: [[0, 0], [0.06, 8, 'out'], [0.6, 0]], rot: [[0, 0], [0.06, 2], [0.6, 0]] },
        head: { rot: [[0, 0], [0.06, 2], [0.6, 0]] }
    },
    events: [[0, 'impact', { socket: 'tip', bone: 'arms', color: '90, 230, 255' }]]
};

// 전기 창 찌르기: 0~0.3 창을 뒤로 당김 → 0.4 앞으로 깊게 찌름 → 복귀
const SPEAR_THRUST = {
    duration: 0.8, loop: true,
    tracks: {
        armF: { x: [[0, 0], [0.3, 22, 'in'], [0.4, -40, 'out'], [0.6, -30], [0.8, 0]], rot: [[0, 0], [0.3, -8], [0.4, 4, 'out'], [0.8, 0]] },
        armB: { rot: [[0, 0], [0.3, -12], [0.4, 14, 'out'], [0.8, 0]] },
        body: { x: [[0, 0], [0.3, 12, 'in'], [0.4, -22, 'out'], [0.6, -16], [0.8, 0]], rot: [[0, 0], [0.3, 4], [0.4, -6], [0.8, 0]] },
        legF: { rot: [[0, 0], [0.4, 10, 'out'], [0.8, 0]] },
        legB: { rot: [[0, 0], [0.4, -8, 'out'], [0.8, 0]] }
    },
    events: impact(0.4, '255, 240, 90')
};

// 치유 분사(한 번): 분사기를 앞으로 들어 올려 뿌리며 손이 떨림 → 내림
const HEAL_SPRAY = {
    duration: 0.8, loop: true,
    tracks: {
        armF: { rot: [[0, 0], [0.2, 16, 'out'], [0.3, 13], [0.4, 16], [0.5, 13], [0.6, 16], [0.8, 0]], x: [[0, 0], [0.2, -8], [0.6, -8], [0.8, 0]] },
        body: { rot: [[0, 0], [0.2, -3], [0.6, -3], [0.8, 0]] },
        head: { rot: [[0, 0], [0.2, -3], [0.6, -3], [0.8, 0]] }
    },
    events: impact(0.25, '120, 255, 160')
};

// 보스 장검 베기: 0~0.35 검을 머리 위 뒤로 치켜듦 → 0.45 앞으로 크게 내리벰 → 복귀
const SWORD_SLASH = {
    duration: 0.9, loop: true,
    tracks: {
        armB: { rot: [[0, 0], [0.35, -200, 'in'], [0.45, 30, 'out'], [0.6, 22], [0.9, 0]] },   // -200: 검이 머리 위 뒤쪽
        armF: { x: [[0, 0], [0.35, 10], [0.45, -10], [0.9, 0]] },
        body: { x: [[0, 0], [0.35, 10, 'in'], [0.45, -24, 'out'], [0.65, -16], [0.9, 0]],
                rot: [[0, 0], [0.35, 5, 'in'], [0.45, -7, 'out'], [0.9, 0]] },
        head: { rot: [[0, 0], [0.35, 3], [0.45, -4], [0.9, 0]] },
        cape: { rot: [[0, 0], [0.35, -4], [0.45, 8, 'out'], [0.9, 0]] },
        legF: { rot: [[0, 0], [0.45, 10, 'out'], [0.9, 0]] },
        legB: { rot: [[0, 0], [0.45, -8, 'out'], [0.9, 0]] }
    },
    events: [[0.45, 'impact', { socket: 'tip', bone: 'armF', color: '255, 215, 90' }]]
};

// 보스 방패 강타(한 번, 기절): 방패를 크게 당겼다가 몸을 실어 들이받음
const GUARDIAN_BASH = {
    duration: 0.8, loop: true,
    tracks: {
        armF: { x: [[0, 0], [0.3, 20, 'in'], [0.4, -54, 'out'], [0.6, -40], [0.8, 0]], rot: [[0, 0], [0.3, -4], [0.4, 5], [0.8, 0]] },
        body: { x: [[0, 0], [0.3, 14, 'in'], [0.4, -30, 'out'], [0.6, -22], [0.8, 0]], rot: [[0, 0], [0.3, 4], [0.4, -6, 'out'], [0.8, 0]] },
        cape: { rot: [[0, 0], [0.3, -4], [0.4, 10, 'out'], [0.8, 0]] },
        armB: { rot: [[0, 0], [0.3, -10], [0.4, 8], [0.8, 0]] },
        legF: { rot: [[0, 0], [0.4, 12, 'out'], [0.8, 0]] },
        legB: { rot: [[0, 0], [0.4, -10, 'out'], [0.8, 0]] }
    },
    events: impact(0.4, '120, 200, 255')
};

function enemy(id, name, { arms = 'two', cape = false, tail = false, walkOpt, clips, hitBone = 'armF', shadow }) {
    return {
        id, name, assetDir: dir(id),
        bones: bones({ arms, cape, tail }),
        springs: [{ bone: 'head', channel: 'y', axis: 1, gain: 0.3, k: 260, damping: 12, limit: 6 }],
        clips: { idle: idle(arms === 'two' ? 'armF' : 'arms'), walk: walk(walkOpt), ...clips },
        arms: null,
        attack: 'attack',
        hitSocket: ['tip', hitBone],
        debugSockets: [['tip', hitBone], ['footF', 'legF'], ['footB', 'legB']],
        shadow: shadow || { rx: 180, ry: 18 }
    };
}

const SOLDIER_WALK = { dur: 0.7, leg: 22, lift: 22, bob: 10 };

// 합성괴인 졸개(아군): 가시 곤봉 내려치기 + 꼬리를 치켜들었다 휘두름
const MINION_SWING = {
    ...BATON_SWING,
    tracks: { ...BATON_SWING.tracks, tail: { rot: [[0, 0], [0.3, -14, 'in'], [0.4, 12, 'out'], [0.8, 0]] } }
};

export const ENEMY_RIGS = {
    guard: enemy('guard', '경비병', { walkOpt: { ...SOLDIER_WALK, armF: 12, armB: 12 }, clips: { attack: BATON_SWING } }),
    shield: enemy('shield', '방패병', { walkOpt: { ...SOLDIER_WALK, dur: 0.8, leg: 18, armF: 2, armB: 10 }, clips: { attack: SHIELD_BASH } }),
    tranq: enemy('tranq', '마취총 사수', { arms: 'one', walkOpt: { ...SOLDIER_WALK, arms: 2 }, clips: { attack: RIFLE_SHOT }, hitBone: 'arms' }),
    shock: enemy('shock', '전기 충격병', { walkOpt: { ...SOLDIER_WALK, armF: 8, armB: 12 }, clips: { attack: SPEAR_THRUST } }),
    medic: enemy('medic', '의무병', { walkOpt: { ...SOLDIER_WALK, armF: 8, armB: 12 }, clips: { attack: HEAL_SPRAY } }),
    guardian: enemy('guardian', '정의의 수호자', {
        cape: true, walkOpt: { dur: 0.9, leg: 18, lift: 20, bob: 12, armF: 3, armB: 8, cape: 4 },
        clips: { attack: SWORD_SLASH, bash: GUARDIAN_BASH }, shadow: { rx: 260, ry: 22 }
    }),
    // 아군 (오른쪽을 보는 그림을 뒤집어 잘랐으므로 적처럼 왼쪽을 봄 — 게임에선 아군이라 다시 뒤집어 그림)
    minion: enemy('minion', '합성괴인 졸개', { tail: true, walkOpt: { ...SOLDIER_WALK, dur: 0.75, armF: 10, armB: 6, tail: 8 }, clips: { attack: MINION_SWING } })
};
