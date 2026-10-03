/* ==========================================================================
   PROJECT: MAD OVERLORD // 스테이지 데이터 (v2)
   챕터 1 = 구역 1 "지하 비밀 연구소" 1-1 ~ 1-5 + 보스전 (결정 D-018, D-021)
   챕터 2 = 구역 2 "하부 쓰레기 폐기 정착지" 2-1 ~ 2-5 + 보스전 (D-040) — 1-B를 깨면 열림

   챕터 항목: id, name, art { mid, final } (거점 그림 이름, bases_v2.js), stages
   스테이지는 앞에서부터 한 줄로 이어짐(1-1 … 1-B, 2-1 … 2-B): 앞 스테이지를 깨면 다음이 열리고, 결과 화면 "다음"도 이 순서

   스테이지 항목
     distance / midAt / finalAt : 전체 거리, 중간 요새·최종 기지가 나오는 거리(m)
     timeLimit : 제한 시간(초, 전투 시간). 이 안에 최종 기지를 못 부수면 패배 (D-028)
     starTime  : 세 번째 별 목표 시간(초). 이 안에 클리어하면 별 (D-029)
     enemy : { hp, dps (적 능력치 배율), spawn (소환 간격 초), max (동시 최대 수), mix (적 종류별 비중) }
     elite : 엘리트로 나올 확률
     base  : 거점 체력 { mid, final }
     reward: DM { kill (기본 보병 1기, 종류별 배율은 enemies_v2.js), mid, final }
     boss  : 보스전 설정 { unit (보스 적 종류), artillery: { every, warn, stun, silence } (구역 1 EMP 포격)
                          또는 gas: { every, warn, sec (감속 시간), silence (증원 중단 초) } (구역 2 유독 가스) }  — 기획서 2-⑥ 광역 기믹
     map   : 메인 레이더에 찍을 위치 (레이더 중심 기준 -1~1)
   난이도 곡선은 tools/tests/balance_sim.py 결과(MD/밸런스_기록.md)를 보고 조정한다.
   ========================================================================== */

export const CHAPTER1 = {
    id: 'ch1',
    zone: 1,
    name: '구역 1 · 지하 비밀 연구소',
    art: { mid: 'bunker', final: 'tower' },
    stages: [
        {
            id: '1-1', timeLimit: 150, starTime: 100, name: '격리 구역 탈출', desc: '오버로드가 깨어난 격리실. 경비병만 막아선다.',
            distance: 800, midAt: 320, finalAt: 700,
            enemy: { hp: 1, dps: 1, spawn: 2.6, max: 5, mix: { guard: 1 } }, elite: 0,
            base: { mid: 2400, final: 4600 }, reward: { kill: 12, mid: 500, final: 1500 },
            map: [-0.72, 0.52]
        },
        {
            id: '1-2', timeLimit: 180, starTime: 110, name: '보안 복도', desc: '진압 방패병이 복도를 틀어막는다.',
            distance: 900, midAt: 380, finalAt: 800,
            enemy: { hp: 1.1, dps: 1.1, spawn: 2.5, max: 6, mix: { guard: 3, shield: 1 } }, elite: 0.04,
            base: { mid: 2600, final: 4800 }, reward: { kill: 14, mid: 650, final: 1900 },
            map: [-0.38, 0.3]
        },
        {
            id: '1-3', timeLimit: 180, starTime: 110, name: '실험동 B', desc: '마취총 사수가 멀리서 진격을 늦춘다.',
            distance: 950, midAt: 420, finalAt: 850,
            enemy: { hp: 1.4, dps: 1.3, spawn: 2.2, max: 7, mix: { guard: 3, shield: 1, tranq: 2 } }, elite: 0.07,
            base: { mid: 3500, final: 6400 }, reward: { kill: 16, mid: 800, final: 2300 },
            map: [-0.02, 0.08]
        },
        {
            id: '1-4', timeLimit: 200, starTime: 120, name: '전력 제어실', desc: '전기 충격병과 의무병이 합류한다.',
            distance: 1000, midAt: 450, finalAt: 900,
            enemy: { hp: 1.85, dps: 1.55, spawn: 1.9, max: 8, mix: { guard: 2, shield: 1, tranq: 1, shock: 2, medic: 1 } }, elite: 0.1,
            base: { mid: 4400, final: 8000 }, reward: { kill: 18, mid: 950, final: 2700 },
            map: [0.3, -0.16]
        },
        {
            id: '1-5', timeLimit: 230, starTime: 140, name: '격리 게이트 전초', desc: '보안대 전 병력이 게이트 앞을 지킨다.',
            distance: 1100, midAt: 500, finalAt: 1000,
            enemy: { hp: 2.1, dps: 1.7, spawn: 1.85, max: 8, mix: { guard: 2, shield: 2, tranq: 2, shock: 2, medic: 1 } }, elite: 0.14,
            base: { mid: 5000, final: 9000 }, reward: { kill: 20, mid: 1100, final: 3100 },
            map: [0.56, -0.42]
        },
        {
            id: '1-B', timeLimit: 225, starTime: 150, name: '정의의 수호자', desc: '격리 게이트. EMP 포격과 영웅 "정의의 수호자"가 기다린다.', boss: true,
            distance: 1000, midAt: 450, finalAt: 900,
            enemy: { hp: 2.3, dps: 1.85, spawn: 2.0, max: 8, mix: { guard: 2, shield: 2, tranq: 2, shock: 2, medic: 1 } }, elite: 0.12,
            base: { mid: 5600, final: 12500 }, reward: { kill: 22, mid: 1300, final: 4500 },
            boss: { unit: 'guardian', artillery: { every: 15, warn: 2.2, stun: 2.2, silence: 5 } },
            map: [0.74, -0.74]
        }
    ]
};

// 구역 2: 고철 약탈단 (적 능력은 enemies_v2.js). 보스전 기지 기믹 = 소각탑 유독 가스 (경보 → 전장 전체 감속, 적도 같이)
export const CHAPTER2 = {
    id: 'ch2',
    zone: 2,
    name: '구역 2 · 하부 쓰레기 폐기 정착지',
    art: { mid: 'gate', final: 'furnace' },
    stages: [
        {
            id: '2-1', timeLimit: 200, starTime: 130, name: '폐기장 입구', desc: '쓰레기 산 아래, 고철 약탈자들이 현상금을 노린다.',
            distance: 1000, midAt: 450, finalAt: 900,
            enemy: { hp: 2.4, dps: 1.9, spawn: 2.2, max: 6, mix: { raider: 1 } }, elite: 0.06,
            base: { mid: 6000, final: 11000 }, reward: { kill: 24, mid: 1400, final: 4000 },
            map: [-0.72, 0.52]
        },
        {
            id: '2-2', timeLimit: 210, starTime: 135, name: '판잣집 골목', desc: '고철 방벽병이 바리케이드로 골목을 막는다.',
            distance: 1050, midAt: 470, finalAt: 950,
            enemy: { hp: 2.6, dps: 2.0, spawn: 2.1, max: 7, mix: { raider: 3, builder: 1 } }, elite: 0.08,
            base: { mid: 6600, final: 12000 }, reward: { kill: 26, mid: 1500, final: 4300 },
            map: [-0.38, 0.3]
        },
        {
            id: '2-3', timeLimit: 220, starTime: 140, name: '오물 수로', desc: '오물 투척병이 바닥을 독성 늪으로 덮는다.',
            distance: 1100, midAt: 500, finalAt: 1000,
            enemy: { hp: 2.8, dps: 2.1, spawn: 2.0, max: 7, mix: { raider: 3, builder: 1, sludge: 2 } }, elite: 0.1,
            base: { mid: 7200, final: 13000 }, reward: { kill: 28, mid: 1600, final: 4600 },
            map: [-0.02, 0.08]
        },
        {
            id: '2-4', timeLimit: 230, starTime: 145, name: '자석 집하장', desc: '그물총 사수와 수리공이 합류한다.',
            distance: 1150, midAt: 520, finalAt: 1050,
            enemy: { hp: 3.0, dps: 2.2, spawn: 1.9, max: 8, mix: { raider: 2, builder: 1, sludge: 1, netter: 2, mechanic: 1 } }, elite: 0.12,
            base: { mid: 7800, final: 14000 }, reward: { kill: 30, mid: 1700, final: 4900 },
            map: [0.3, -0.16]
        },
        {
            id: '2-5', timeLimit: 240, starTime: 150, name: '소각장 외곽', desc: '약탈단 전 병력이 소각탑으로 가는 길을 막는다.',
            distance: 1200, midAt: 550, finalAt: 1100,
            enemy: { hp: 3.2, dps: 2.3, spawn: 1.85, max: 8, mix: { raider: 2, builder: 2, sludge: 2, netter: 2, mechanic: 1 } }, elite: 0.14,
            base: { mid: 8400, final: 15000 }, reward: { kill: 32, mid: 1800, final: 5200 },
            map: [0.56, -0.42]
        },
        {
            id: '2-B', timeLimit: 240, starTime: 160, name: '고철왕의 소각탑', desc: '소각탑의 유독 가스와 약탈단 두목 "고철왕"이 기다린다.',
            distance: 1050, midAt: 470, finalAt: 950,
            enemy: { hp: 3.4, dps: 2.4, spawn: 2.0, max: 8, mix: { raider: 2, builder: 2, sludge: 2, netter: 2, mechanic: 1 } }, elite: 0.12,
            base: { mid: 8000, final: 15000 }, reward: { kill: 34, mid: 2000, final: 6500 },
            boss: { unit: 'scrapking', gas: { every: 14, warn: 2.2, sec: 3.5, silence: 5 } },
            map: [0.74, -0.74]
        }
    ]
};

export const CHAPTERS = [CHAPTER1, CHAPTER2];
// 스테이지마다 챕터 정보(거점 그림 art, chapter id)를 붙여 둠 — 전투·메뉴가 stage.art / stage.chapter로 씀
CHAPTERS.forEach(ch => ch.stages.forEach(st => { st.chapter = ch.id; st.art = ch.art; }));
export const STAGES = CHAPTERS.flatMap(ch => ch.stages);

export function chapterOf(stageOrId) {
    const id = typeof stageOrId === 'string' ? stageOrId : stageOrId && stageOrId.id;
    return CHAPTERS.find(ch => ch.stages.some(s => s.id === id)) || CHAPTER1;
}

/** 챕터가 열렸는지: 첫 스테이지가 열렸으면 */
export function chapterUnlocked(ch, progress) {
    return isUnlocked(ch.stages[0].id, progress);
}

/** 챕터 안에서 기본으로 고를 스테이지: 아직 못 깬 첫 스테이지 (전부 깼으면 마지막) */
export function defaultStageIn(ch, progress) {
    return ch.stages.find(s => !progress.stage(s.id).cleared) || ch.stages[ch.stages.length - 1];
}

export function stageById(id) {
    return STAGES.find(s => s.id === id) || STAGES[0];
}

export function nextStageOf(id) {
    const i = STAGES.findIndex(s => s.id === id);
    return i >= 0 && i < STAGES.length - 1 ? STAGES[i + 1] : null;
}

/** 열린 스테이지: 첫 스테이지 + 바로 앞 스테이지를 클리어한 스테이지 */
export function isUnlocked(id, progress) {
    const i = STAGES.findIndex(s => s.id === id);
    return i === 0 || (i > 0 && progress.stage(STAGES[i - 1].id).cleared);
}

/** 기본으로 고를 스테이지: 아직 클리어하지 않은 가장 앞 스테이지 (전부 클리어면 마지막) */
export function defaultStage(progress) {
    return STAGES.find(s => !progress.stage(s.id).cleared) || STAGES[STAGES.length - 1];
}
