/* ==========================================================================
   PROJECT: MAD OVERLORD // 적 리그 데이터 (v2) — 경비병·방패병·마취총 사수·전기 충격병·의무병·보스
   파츠: tools/rig/cut_enemy_parts.py 가 Gemini 이미지(전신 + 팔 없는 몸)에서 분리 (원본 1024px 좌표).
   rot은 도(°), 화면 기준 +는 시계 방향. 모두 왼쪽을 보는 3/4 측면.

   전투에서는 리그를 직접 그리지 않고, 걷기·공격을 스프라이트로 구워 쓴다 (tools/rig/bake_sprite.py, D-017·D-035).
   다리 뼈는 엉덩이에서 아래를 향하므로 rot +는 발이 앞(왼쪽)으로, -는 뒤로.
   팔도 어깨에서 아래를 향하므로 rot +는 손이 앞으로 올라감 (+140이면 머리 위 뒤쪽).
   ========================================================================== */

const dir = id => `assets/sprites/rig/${id}/`;

/** 뼈대: 망토(있으면) → 다리 → 몸통 → 뒷팔 → 머리 → 앞팔(또는 두 팔 한 조각) 순으로 앞에 그림
 *  arms 'none' = 팔·머리 없는 한 덩어리(슬라임), legs false = 다리 없이 떠 있음(가마에 탄 대주교) */
function bones({ arms = 'two', cape = false, tail = false, legs = true } = {}) {
    const list = [{ name: 'root', parent: null }];
    if (legs) list.push({ name: 'legB', parent: 'root', part: 'legB', z: 1 }, { name: 'legF', parent: 'root', part: 'legF', z: 2 });
    list.push({ name: 'body', parent: 'root', part: 'torso', z: 3 });
    if (arms === 'none') return list;
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

// ---- 구역 2: 고철 약탈단 (D-040) ----
// 방벽병 망치 내리찍기(바리케이드를 박을 때도 같은 동작): 몸을 크게 젖혀 망치를 머리 위로 → 내리찍음
const HAMMER_SLAM = {
    duration: 1.0, loop: true,
    tracks: {
        armF: { rot: [[0, 0], [0.4, 150, 'in'], [0.52, -20, 'out'], [0.7, -14], [1.0, 0]] },
        armB: { rot: [[0, 0], [0.4, -20], [0.52, 24, 'out'], [1.0, 0]] },
        body: { x: [[0, 0], [0.4, 12, 'in'], [0.52, -24, 'out'], [0.75, -18], [1.0, 0]],
                rot: [[0, 0], [0.4, 7, 'in'], [0.52, -9, 'out'], [0.75, -6], [1.0, 0]], y: [[0, 0], [0.4, -8], [0.52, 10], [1.0, 0]] },
        head: { rot: [[0, 0], [0.4, 4], [0.52, -5], [1.0, 0]] },
        legF: { rot: [[0, 0], [0.52, 10, 'out'], [1.0, 0]] },
        legB: { rot: [[0, 0], [0.52, -8, 'out'], [1.0, 0]] }
    },
    events: impact(0.52, '255, 210, 120')
};

// 오물 투척(한 번): 국자를 뒤로 당겼다가 머리 위로 휘둘러 던짐
const LADLE_THROW = {
    duration: 0.8, loop: true,
    tracks: {
        armF: { rot: [[0, 0], [0.25, -40, 'in'], [0.45, 120, 'out'], [0.6, 100], [0.8, 0]] },
        armB: { rot: [[0, 0], [0.25, 15], [0.45, -15], [0.8, 0]] },
        body: { x: [[0, 0], [0.25, 10, 'in'], [0.45, -14, 'out'], [0.8, 0]], rot: [[0, 0], [0.25, 5], [0.45, -6], [0.8, 0]] },
        head: { rot: [[0, 0], [0.25, 3], [0.45, -4], [0.8, 0]] }
    },
    events: impact(0.45, '200, 230, 60')
};

// 고철왕: 걷기는 무거운 보행 기계, 공격 = 뒤쪽 집게 팔 휘둘러 내려치기
const CLAW_SMASH = {
    duration: 1.1, loop: true,
    tracks: {
        armB: { rot: [[0, 0], [0.4, -28, 'in'], [0.55, 70, 'out'], [0.75, 60], [1.1, 0]] },
        armF: { rot: [[0, 0], [0.4, 6], [0.55, -4], [1.1, 0]] },
        body: { x: [[0, 0], [0.4, 14, 'in'], [0.55, -26, 'out'], [0.8, -18], [1.1, 0]], rot: [[0, 0], [0.4, 4], [0.55, -5, 'out'], [1.1, 0]] },
        head: { rot: [[0, 0], [0.4, 3], [0.55, -4], [1.1, 0]] },
        legF: { rot: [[0, 0], [0.55, 8, 'out'], [1.1, 0]] },
        legB: { rot: [[0, 0], [0.55, -6, 'out'], [1.1, 0]] }
    },
    events: [[0.55, 'impact', { socket: 'tip', bone: 'armB', color: '255, 200, 120' }]]
};
// 자석 끌어당기기(한 번): 크레인 팔을 앞으로 낮춰 자석을 겨누고 버팀 (주인공을 뒤로 끌어당김)
const MAGNET_PULL = {
    duration: 1.6, loop: true,
    tracks: {
        armF: { rot: [[0, 0], [0.35, -16, 'out'], [0.45, -14], [0.55, -16], [0.65, -14], [0.75, -16], [0.85, -14], [1.25, -16], [1.6, 0]] },
        body: { x: [[0, 0], [0.35, 10], [1.25, 10], [1.6, 0]], rot: [[0, 0], [0.35, 3], [1.25, 3], [1.6, 0]] },
        legF: { rot: [[0, 0], [0.35, -6], [1.25, -6], [1.6, 0]] }
    },
    events: [[0.35, 'impact', { socket: 'tip', bone: 'armF', color: '120, 200, 255' }]]
};
// 고철 낙하(한 번): 크레인을 높이 들어 올렸다가 내리찍음 (예고 원 자리에 고철이 떨어짐)
const SCRAP_DROP = {
    duration: 1.2, loop: true,
    tracks: {
        armF: { rot: [[0, 0], [0.5, 24, 'in'], [0.65, -12, 'out'], [0.85, -8], [1.2, 0]] },
        body: { y: [[0, 0], [0.5, -8], [0.65, 6], [1.2, 0]], rot: [[0, 0], [0.5, -3], [0.65, 2], [1.2, 0]] }
    },
    events: [[0.65, 'impact', { socket: 'tip', bone: 'armF', color: '255, 200, 120' }]]
};

function enemy(id, name, { arms = 'two', cape = false, tail = false, legs = true, walkOpt, walkClip, clips, hitBone = 'armF', shadow }) {
    return {
        id, name, assetDir: dir(id),
        bones: bones({ arms, cape, tail, legs }),
        springs: arms === 'none' ? [] : [{ bone: 'head', channel: 'y', axis: 1, gain: 0.3, k: 260, damping: 12, limit: 6 }],
        clips: { idle: idle(arms === 'two' ? 'armF' : arms === 'none' ? 'body' : 'arms'), walk: walkClip || walk(walkOpt), ...clips },
        arms: null,
        attack: 'attack',
        hitSocket: ['tip', hitBone],
        debugSockets: legs ? [['tip', hitBone], ['footF', 'legF'], ['footB', 'legB']] : [['tip', hitBone]],
        shadow: shadow || { rx: 180, ry: 18 }
    };
}

const SOLDIER_WALK = { dur: 0.7, leg: 22, lift: 22, bob: 10 };

// 합성괴인 졸개(아군): 가시 곤봉 내려치기 + 꼬리를 치켜들었다 휘두름
const MINION_SWING = {
    ...BATON_SWING,
    tracks: { ...BATON_SWING.tracks, tail: { rot: [[0, 0], [0.3, -14, 'in'], [0.4, 12, 'out'], [0.8, 0]] } }
};

// 뒤틀린 인형사의 토끼 인형(아군): 두 팔을 앞으로 뻗어 끌어안듯 붙잡고 꽉 조임 (적을 붙잡아 둠), 귀·몸이 출렁
const RABBIT_GRAB = {
    duration: 0.8, loop: true,
    tracks: {
        arms: { rot: [[0, 0], [0.2, 18, 'out'], [0.35, -6, 'in'], [0.45, 2], [0.55, -6], [0.8, 0]],
                x: [[0, 0], [0.2, -12, 'out'], [0.35, 4, 'in'], [0.8, 0]] },
        body: { x: [[0, 0], [0.2, -8, 'out'], [0.35, 4], [0.8, 0]], rot: [[0, 0], [0.2, -6], [0.35, 3], [0.8, 0]],
                y: [[0, 0], [0.35, 6], [0.8, 0]] },
        head: { rot: [[0, 0], [0.2, -5], [0.35, 4], [0.5, -2], [0.8, 0]] },
        legF: { rot: [[0, 0], [0.2, 10, 'out'], [0.8, 0]] },
        legB: { rot: [[0, 0], [0.2, -8, 'out'], [0.8, 0]] }
    },
    events: [[0.35, 'impact', { socket: 'tip', bone: 'arms', color: '120, 230, 240' }]]
};

// ---- 구역 3·4 (D-056) ----
// 지팡이 시전(마법사·대주교): 지팡이를 앞으로 치켜들었다가 겨누며 내뻗음
const STAFF_CAST = {
    duration: 0.9, loop: true,
    tracks: {
        armF: { rot: [[0, 0], [0.3, 38, 'in'], [0.42, 14, 'out'], [0.7, 12], [0.9, 0]], x: [[0, 0], [0.3, 6], [0.42, -16, 'out'], [0.7, -10], [0.9, 0]] },
        armB: { rot: [[0, 0], [0.3, -14], [0.42, 6], [0.9, 0]] },
        body: { x: [[0, 0], [0.3, 8, 'in'], [0.42, -10, 'out'], [0.9, 0]], rot: [[0, 0], [0.3, 4], [0.42, -4], [0.9, 0]] },
        head: { rot: [[0, 0], [0.3, 3], [0.42, -3], [0.9, 0]] }
    },
    events: impact(0.42, '200, 220, 255')
};
// 대주교 '천상의 심판'(한 번): 두 팔을 하늘로 들어 올려 빛을 부름
const HOLY_RAISE = {
    duration: 1.1, loop: true,
    tracks: {
        armF: { rot: [[0, 0], [0.4, 28, 'in'], [0.9, 32], [1.1, 0]], y: [[0, 0], [0.4, -14], [0.9, -16], [1.1, 0]] },
        armB: { rot: [[0, 0], [0.4, -24, 'in'], [0.9, -28], [1.1, 0]] },
        body: { y: [[0, 0], [0.4, -16, 'out'], [0.9, -18], [1.1, 0]], rot: [[0, 0], [0.4, 3], [0.9, 3], [1.1, 0]] },
        head: { rot: [[0, 0], [0.4, 6], [0.9, 6], [1.1, 0]] }
    },
    events: impact(0.45, '255, 236, 170')
};
// 촉수 후려치기: 촉수를 뒤로 감았다가 앞으로 채찍처럼
const TENTACLE_LASH = {
    duration: 0.85, loop: true,
    tracks: {
        armF: { rot: [[0, 0], [0.3, -36, 'in'], [0.42, 58, 'out'], [0.58, 42], [0.85, 0]] },
        armB: { rot: [[0, 0], [0.3, 22], [0.42, -18, 'out'], [0.85, 0]] },
        body: { x: [[0, 0], [0.3, 10, 'in'], [0.42, -20, 'out'], [0.6, -14], [0.85, 0]], rot: [[0, 0], [0.3, 4], [0.42, -6, 'out'], [0.85, 0]] },
        head: { rot: [[0, 0], [0.3, 4], [0.42, -5], [0.85, 0]] },
        legF: { rot: [[0, 0], [0.42, 10, 'out'], [0.85, 0]] },
        legB: { rot: [[0, 0], [0.42, -8, 'out'], [0.85, 0]] }
    },
    events: impact(0.42, '170, 90, 255')
};
// 악마기사 도끼 내려찍기 = 망치 내리찍기 + 망토 펄럭
const AXE_CLEAVE = {
    ...HAMMER_SLAM,
    tracks: { ...HAMMER_SLAM.tracks, cape: { rot: [[0, 0], [0.4, -5], [0.52, 9, 'out'], [1.0, 0]] } },
    events: impact(0.52, '255, 90, 60')
};
// 이단심문관 철퇴 = 진압봉 내려치기 + 망토 펄럭
const MACE_SWING = {
    ...BATON_SWING,
    tracks: { ...BATON_SWING.tracks, cape: { rot: [[0, 0], [0.3, -4], [0.4, 8, 'out'], [0.8, 0]] } },
    events: impact(0.4, '255, 210, 120')
};
// 대주교(다리 없음): 가마째 떠서 천천히 출렁이며 나아감
const FLOAT_WALK = {
    duration: 1.4, loop: true,
    tracks: {
        body: { y: [[0, 0], [0.7, -12], [1.4, 0]], rot: [[0, -1], [0.7, 1], [1.4, -1]] },
        head: { rot: [[0, 1.5], [0.7, -1.5], [1.4, 1.5]] },
        armF: { rot: [[0, -3], [0.7, 3], [1.4, -3]] },
        armB: { rot: [[0, 2], [0.7, -4], [1.4, 2]] }
    }
};
// 슬라임: 눌렸다 늘어나며 꿈틀꿈틀 (몸통 피벗 = 바닥 가운데)
const SLIME_WALK = {
    duration: 0.8, loop: true,
    tracks: {
        body: { sy: [[0, 1], [0.2, 0.86, 'out'], [0.4, 1.08, 'in'], [0.6, 0.96], [0.8, 1]],
                sx: [[0, 1], [0.2, 1.1, 'out'], [0.4, 0.94, 'in'], [0.6, 1.03], [0.8, 1]],
                x: [[0, 0], [0.4, -8], [0.8, 0]] }
    }
};
// 슬라임 덮치기: 뒤로 웅크렸다가 앞으로 길게 늘어나며 덮침
const SLIME_LUNGE = {
    duration: 0.8, loop: true,
    tracks: {
        body: { sy: [[0, 1], [0.28, 0.78, 'in'], [0.4, 1.12, 'out'], [0.55, 0.92], [0.8, 1]],
                sx: [[0, 1], [0.28, 1.16, 'in'], [0.4, 0.9, 'out'], [0.55, 1.06], [0.8, 1]],
                x: [[0, 0], [0.28, 14, 'in'], [0.4, -34, 'out'], [0.6, -24], [0.8, 0]],
                rot: [[0, 0], [0.28, 4], [0.4, -8, 'out'], [0.8, 0]] }
    },
    events: [[0.4, 'impact', { socket: 'tip', bone: 'body', color: '150, 255, 90' }]]
};

// 오큘러스(벌레 몸, 다리 없음): 몸이 천천히 들썩이며 미끄러지듯 나아감, 팔은 마법진을 그리듯 출렁
const SERPENT_WALK = {
    duration: 1.3, loop: true,
    tracks: {
        body: { y: [[0, 0], [0.65, -8], [1.3, 0]], sy: [[0, 1], [0.65, 1.02], [1.3, 1]], sx: [[0, 1], [0.65, 0.985], [1.3, 1]] },
        head: { rot: [[0, 2], [0.65, -2.5], [1.3, 2]] },
        armF: { rot: [[0, -4], [0.65, 6], [1.3, -4]] },
        armB: { rot: [[0, 5], [0.65, -5], [1.3, 5]] }
    }
};
// 2페이즈 톱날 팔 내려찍기: 톱날을 더 치켜들었다가 앞으로 내려침 (+ 뒷팔 반대로)
const SAW_CHOP = {
    duration: 0.9, loop: true,
    tracks: {
        armF: { rot: [[0, 0], [0.3, 26, 'in'], [0.42, -42, 'out'], [0.6, -32], [0.9, 0]] },
        armB: { rot: [[0, 0], [0.3, -18], [0.42, 30, 'out'], [0.9, 0]] },
        body: { x: [[0, 0], [0.3, 12, 'in'], [0.42, -28, 'out'], [0.65, -20], [0.9, 0]], rot: [[0, 0], [0.3, 2], [0.42, -3, 'out'], [0.9, 0]] },
        head: { rot: [[0, 0], [0.3, 4], [0.42, -6], [0.9, 0]] }
    },
    events: impact(0.42, '255, 60, 80')
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
    minion: enemy('minion', '합성괴인 졸개', { tail: true, walkOpt: { ...SOLDIER_WALK, dur: 0.75, armF: 10, armB: 6, tail: 8 }, clips: { attack: MINION_SWING } }),
    // 뒤틀린 인형사의 토끼 인형 (새 캐릭터 D-049): 짧은 다리로 통통 뛰듯 걷는 인형
    rabbit: enemy('rabbit', '토끼 인형', { arms: 'one', walkOpt: { dur: 0.55, leg: 26, lift: 30, bob: 16, arms: 6 }, clips: { attack: RABBIT_GRAB }, hitBone: 'arms' }),
    // ---- 구역 2: 고철 약탈단 ----
    raider: enemy('raider', '고철 약탈자', { walkOpt: { ...SOLDIER_WALK, armF: 12, armB: 12 }, clips: { attack: BATON_SWING } }),
    builder: enemy('builder', '고철 방벽병', { walkOpt: { ...SOLDIER_WALK, dur: 0.85, leg: 18, armF: 6, armB: 8 }, clips: { attack: HAMMER_SLAM } }),
    sludge: enemy('sludge', '오물 투척병', { walkOpt: { ...SOLDIER_WALK, armF: 10, armB: 8 }, clips: { attack: LADLE_THROW } }),
    netter: enemy('netter', '그물총 사수', { arms: 'one', walkOpt: { ...SOLDIER_WALK, arms: 2 }, clips: { attack: RIFLE_SHOT }, hitBone: 'arms' }),
    mechanic: enemy('mechanic', '수리공', { walkOpt: { ...SOLDIER_WALK, armF: 8, armB: 12 }, clips: { attack: HEAL_SPRAY } }),
    scrapking: enemy('scrapking', '고철왕', {
        walkOpt: { dur: 1.0, leg: 14, lift: 22, bob: 12, armF: 3, armB: 6 },
        clips: { attack: CLAW_SMASH, magnet: MAGNET_PULL, drop: SCRAP_DROP }, shadow: { rx: 300, ry: 24 }
    }),
    // ---- 구역 3: 성왕국 이단심문소 & 타락 기사단 ----
    soldier: enemy('soldier', '왕국보병', { walkOpt: { ...SOLDIER_WALK, armF: 8, armB: 12 }, clips: { attack: SPEAR_THRUST } }),
    inquisitor: enemy('inquisitor', '이단심문관', {
        cape: true, walkOpt: { ...SOLDIER_WALK, dur: 0.8, leg: 20, armF: 6, armB: 10, cape: 4 }, clips: { attack: MACE_SWING }
    }),
    holyshield: enemy('holyshield', '신성 방패병', { walkOpt: { ...SOLDIER_WALK, dur: 0.85, leg: 18, armF: 2, armB: 10 }, clips: { attack: SHIELD_BASH } }),
    priest: enemy('priest', '신관', { walkOpt: { ...SOLDIER_WALK, armF: 6, armB: 10 }, clips: { attack: HEAL_SPRAY } }),
    mage: enemy('mage', '마법사', { walkOpt: { ...SOLDIER_WALK, armF: 4, armB: 10 }, clips: { attack: STAFF_CAST } }),
    demon: enemy('demon', '악마병', { walkOpt: { ...SOLDIER_WALK, dur: 0.65, armF: 3, armB: 12 }, clips: { attack: SHIELD_BASH } }),
    demonknight: enemy('demonknight', '악마기사', {
        cape: true, walkOpt: { dur: 0.9, leg: 18, lift: 20, bob: 12, armF: 3, armB: 8, cape: 4 }, clips: { attack: AXE_CLEAVE },
        shadow: { rx: 220, ry: 20 }
    }),
    archbishop: enemy('archbishop', '대주교 베네딕트', {
        legs: false, walkClip: FLOAT_WALK, clips: { attack: STAFF_CAST, bash: HOLY_RAISE }, shadow: { rx: 280, ry: 22 }
    }),
    // ---- 구역 4: 별의 사도들과 실패한 진화체들 ----
    cultist: enemy('cultist', '진화의 광신도', { walkOpt: { dur: 0.6, leg: 24, lift: 24, bob: 12, armF: 10, armB: 14 }, clips: { attack: BATON_SWING } }),
    tentacle: enemy('tentacle', '심연 촉수귀', { walkOpt: { ...SOLDIER_WALK, dur: 0.8, leg: 20, armF: 14, armB: 14 }, clips: { attack: TENTACLE_LASH } }),
    carapace: enemy('carapace', '생체 방패수', {
        walkOpt: { dur: 0.95, leg: 16, lift: 18, bob: 12, armF: 2, armB: 10 }, clips: { attack: SHIELD_BASH }, shadow: { rx: 210, ry: 20 }
    }),
    sporer: enemy('sporer', '포자 술사', { walkOpt: { ...SOLDIER_WALK, armF: 8, armB: 8 }, clips: { attack: LADLE_THROW } }),
    // 보스 관장자 오큘러스: 1페이즈 마법사형(지팡이 대신 손끝 마법진 — 시전·점액 던지기·두 팔 들어 파동), 2페이즈 외눈 괴수(톱날 내려찍기)
    oculus: enemy('oculus', '관장자 오큘러스', {
        legs: false, walkClip: SERPENT_WALK, clips: { attack: STAFF_CAST, magnet: LADLE_THROW, drop: HOLY_RAISE }, shadow: { rx: 300, ry: 24 }
    }),
    oculus2: enemy('oculus2', '관장자 오큘러스 (2페이즈)', {
        legs: false, walkClip: SERPENT_WALK, clips: { attack: SAW_CHOP, magnet: SAW_CHOP, drop: HOLY_RAISE }, shadow: { rx: 300, ry: 24 }
    }),
    slime: enemy('slime', '키메라 슬라임', {
        arms: 'none', legs: false, walkClip: SLIME_WALK, clips: { attack: SLIME_LUNGE }, hitBone: 'body', shadow: { rx: 200, ry: 20 }
    })
};
