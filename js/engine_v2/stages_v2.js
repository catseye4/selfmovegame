/* ==========================================================================
   PROJECT: MAD OVERLORD // 스테이지 데이터 (v2)
   챕터 1 = 구역 1 "지하 비밀 연구소" 1-1 ~ 1-5 + 보스전 (결정 D-018, D-021)
   챕터 2 = 구역 2 "하부 쓰레기 폐기 정착지" 2-1 ~ 2-5 + 보스전 (D-040) — 1-B를 깨면 열림
   챕터 3·4 = 구역 3 "성왕국 수도" · 구역 4 "진화의 심연" 3-1 ~ 3-6 + 보스전, 4-1 ~ 4-6 + 보스전 (D-056)
   챕터 6 = 구역 6 "성왕국 변두리" 6-1 ~ 6-6 + 보스전 (D-076·D-078) — 구역 5가 생기기 전까지 4-B 다음

   챕터 항목: id, zone, name, art { mid, final } (거점 그림 이름, bases_v2.js),
             defense { mid|final: { range, every, dmg, color, label, puddle? } } (다가오면 거점이 쏨, 구역 3·4),
             midHeal (요새를 부수면 주인공 최대 내구도의 이 비율만큼 회복, 구역 6), stages
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
                          afterBase: true → 최종 기지를 부수면 보스가 나오고, 보스를 쓰러뜨려야 승리 (구역 3)
                          knights: { every, warn, unit } → 보스가 나온 뒤 every초마다 엘리트 소환 (구역 3 심연의 문 개방)
     fonts : 축복 성수대가 나오는 거리(m) 목록 (구역 6) — 부술 때까지 근처 적 받는 피해 감소
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

// 레이더 위 7판(6 + 보스) 자리 — 구역 3·4
const MAP7 = [[-0.74, 0.56], [-0.48, 0.38], [-0.22, 0.2], [0.04, 0.0], [0.3, -0.2], [0.54, -0.44], [0.76, -0.74]];

// 구역 3: 성왕국 이단심문소 & 타락 기사단 (D-056, MD/구역3_설계안.md) — 7판(6 + 보스).
// 요새(심문소 통제탑)는 다가오면 화살·마법을 쏨(defense.mid), 3-B는 정문(최종 기지)을 부수면 대주교가 나오고 대주교를 쓰러뜨려야 승리(afterBase),
// 보스전 기믹 = 심연의 문 개방: 정문을 부순 뒤 knights.every초마다 악마기사(엘리트)
// 그림 (2026-10-24 Gemini): 심문소 통제탑 · 대성당 정문 · 방패 장벽 (stageArt_v2.js), 배경 ui_v2.css .v2-zone-3
export const CHAPTER3 = {
    id: 'ch3',
    zone: 3,
    name: '구역 3 · 성왕국 수도: 진홍의 순례길',
    art: { mid: 'inqtower', final: 'cathedral', barricade: 'shieldwall' },
    defense: { mid: { range: 420, every: 2.2, dmg: 24, color: '255, 214, 120', label: '🏹 화살·마법', hitFx: 'arrowHit' } },
    stages: [
        {
            id: '3-1', timeLimit: 210, starTime: 135, name: '무너진 처형대', desc: '처형대를 부수고 몰려드는 경비병들을 쓰러뜨리며 진격을 시작한다.',
            distance: 1000, midAt: 450, finalAt: 900,
            enemy: { hp: 2.9, dps: 2.1, spawn: 1.9, max: 8, mix: { soldier: 1 } }, elite: 0.06,
            base: { mid: 7000, final: 12500 }, reward: { kill: 36, mid: 2100, final: 6000 }
        },
        {
            id: '3-2', timeLimit: 220, starTime: 140, name: '배신자의 거리', desc: '돌을 던지던 시가지를 돌파한다. 정예 기사들이 막아선다.',
            distance: 1050, midAt: 470, finalAt: 950,
            enemy: { hp: 3.05, dps: 2.2, spawn: 2.0, max: 8, mix: { soldier: 3, inquisitor: 1 } }, elite: 0.08,
            base: { mid: 7400, final: 13200 }, reward: { kill: 38, mid: 2200, final: 6300 }
        },
        {
            id: '3-3', timeLimit: 230, starTime: 145, name: '굳건한 위선', desc: '방패로 겹겹이 장벽을 친 기사단과 정면으로 부딪친다.',
            distance: 1100, midAt: 500, finalAt: 1000,
            enemy: { hp: 3.2, dps: 2.3, spawn: 2.0, max: 8, mix: { soldier: 3, inquisitor: 1, holyshield: 1 } }, elite: 0.1,
            base: { mid: 7800, final: 13900 }, reward: { kill: 40, mid: 2300, final: 6600 }
        },
        {
            id: '3-4', timeLimit: 235, starTime: 150, name: '눈먼 맹신의 순례길', desc: '쓰러진 병사들을 끊임없이 치유하며 버티는 적진을 분쇄한다.',
            distance: 1100, midAt: 500, finalAt: 1000,
            enemy: { hp: 3.35, dps: 2.4, spawn: 1.95, max: 9, mix: { soldier: 3, inquisitor: 1, holyshield: 1, priest: 1 } }, elite: 0.11,
            base: { mid: 8200, final: 14600 }, reward: { kill: 42, mid: 2400, final: 6900 }
        },
        {
            id: '3-5', timeLimit: 240, starTime: 155, name: '빛과 불꽃의 세례', desc: '쉴 새 없이 쏟아지는 원소 마법을 뚫고 성문으로 전진한다.',
            distance: 1150, midAt: 520, finalAt: 1050,
            enemy: { hp: 3.5, dps: 2.45, spawn: 1.9, max: 9, mix: { soldier: 2, inquisitor: 1, holyshield: 1, priest: 1, mage: 2 } }, elite: 0.12,
            base: { mid: 8600, final: 15300 }, reward: { kill: 44, mid: 2500, final: 7200 }
        },
        {
            id: '3-6', timeLimit: 250, starTime: 160, name: '대성당의 계단', desc: '성문 앞 최후의 저지선. 성왕국의 모든 병력이 쏟아져 나온다.',
            distance: 1200, midAt: 550, finalAt: 1100,
            enemy: { hp: 3.65, dps: 2.5, spawn: 1.85, max: 9, mix: { soldier: 4, inquisitor: 1, holyshield: 1, priest: 1, mage: 2 } }, elite: 0.14,
            base: { mid: 9000, final: 16000 }, reward: { kill: 46, mid: 2600, final: 7500 }
        },
        {
            id: '3-B', timeLimit: 270, starTime: 185, name: '심판자의 성문', desc: '성문을 부수면 추악한 본성을 드러낸 대주교 베네딕트가 기다린다.',
            distance: 1050, midAt: 470, finalAt: 950,
            enemy: { hp: 3.8, dps: 2.6, spawn: 2.0, max: 9, mix: { soldier: 3, inquisitor: 2, holyshield: 1, priest: 1, mage: 2 } }, elite: 0.12,
            base: { mid: 8800, final: 14000 }, reward: { kill: 50, mid: 2800, final: 8500 },
            boss: { unit: 'archbishop', afterBase: true, knights: { every: 22, warn: 2, unit: 'demonknight' } }
        }
    ]
};

// 구역 4: 별의 사도들과 실패한 진화체들 (D-056, MD/구역4_설계안.md) — 7판(6 + 보스).
// 요새(박동하는 유기질 벽)는 다가오면 독액(피해 + 독 웅덩이), 4-B 보스 오큘러스는 체력 50%에서 2페이즈(enemies_v2.js rage)
// 그림 (2026-10-24 Gemini, 노랑 배경): 유기질 벽 · 우주적 고치 · 갑각 장벽 (stageArt_v2.js), 배경 ui_v2.css .v2-zone-4
export const CHAPTER4 = {
    id: 'ch4',
    zone: 4,
    name: '구역 4 · 진화의 심연: 꿈틀대는 요람',
    art: { mid: 'fleshwall', final: 'cocoon', barricade: 'chitin' },   // 그림 2026-10-24: 박동하는 유기질 벽 · 우주적 고치 · 갑각 장벽
    defense: { mid: { range: 300, every: 3.2, dmg: 16, color: '150, 255, 90', label: '☣ 독액', puddle: { sec: 3, width: 110 }, hitFx: 'venomSplash' } },
    stages: [
        {
            id: '4-1', timeLimit: 220, starTime: 140, name: '찢어진 고치', desc: '깨어나자마자 몰려드는 광신도들을 밀어내며 탈주를 시작한다.',
            distance: 1000, midAt: 450, finalAt: 900,
            enemy: { hp: 3.2, dps: 2.3, spawn: 1.9, max: 8, mix: { cultist: 1 } }, elite: 0.06,
            base: { mid: 7600, final: 13400 }, reward: { kill: 52, mid: 2900, final: 8000 }
        },
        {
            id: '4-2', timeLimit: 225, starTime: 145, name: '변이의 복도', desc: '촉수를 휘두르는 짐승들과 근접 난전을 벌인다.',
            distance: 1050, midAt: 470, finalAt: 950,
            enemy: { hp: 3.3, dps: 2.35, spawn: 2.0, max: 8, mix: { cultist: 3, tentacle: 1 } }, elite: 0.08,
            base: { mid: 8000, final: 14000 }, reward: { kill: 54, mid: 3000, final: 8300 }
        },
        {
            id: '4-3', timeLimit: 230, starTime: 150, name: '갑각의 장벽', desc: '갑각으로 길을 막은 방패수들을 분쇄하며 돌파한다.',
            distance: 1100, midAt: 500, finalAt: 1000,
            enemy: { hp: 3.4, dps: 2.4, spawn: 2.0, max: 8, mix: { cultist: 3, tentacle: 1, carapace: 1 } }, elite: 0.1,
            base: { mid: 8300, final: 14600 }, reward: { kill: 56, mid: 3100, final: 8600 }
        },
        {
            id: '4-4', timeLimit: 240, starTime: 155, name: '끝없는 증식', desc: '쓰러뜨려도 다시 갈라지며 달라붙는 점액질들과 소모전을 벌인다.',
            distance: 1100, midAt: 500, finalAt: 1000,
            enemy: { hp: 3.5, dps: 2.45, spawn: 1.95, max: 9, mix: { cultist: 2, tentacle: 1, carapace: 1, slime: 2 } }, elite: 0.11,
            base: { mid: 8600, final: 15200 }, reward: { kill: 58, mid: 3200, final: 8900 }
        },
        {
            id: '4-5', timeLimit: 245, starTime: 160, name: '맹독의 정원', desc: '사방에서 날아오는 독 포자를 뚫고 진격한다.',
            distance: 1150, midAt: 520, finalAt: 1050,
            enemy: { hp: 3.6, dps: 2.5, spawn: 1.9, max: 9, mix: { cultist: 2, tentacle: 1, carapace: 1, slime: 1, sporer: 2 } }, elite: 0.12,
            base: { mid: 9000, final: 15800 }, reward: { kill: 60, mid: 3300, final: 9200 }
        },
        {
            id: '4-6', timeLimit: 255, starTime: 165, name: '제단의 입구', desc: '우주적 고치를 지키려 쏟아져 나오는 생명체들의 총공세.',
            distance: 1200, midAt: 550, finalAt: 1100,
            enemy: { hp: 3.7, dps: 2.55, spawn: 1.85, max: 9, mix: { cultist: 4, tentacle: 1, carapace: 1, slime: 2, sporer: 2 } }, elite: 0.14,
            base: { mid: 9300, final: 16400 }, reward: { kill: 62, mid: 3400, final: 9500 }
        },
        {
            id: '4-B', timeLimit: 260, starTime: 175, name: '설계자의 최후', desc: '관장자 오큘러스와의 전투. 체력이 절반이 되면 외눈 괴수로 변이한다.',
            distance: 1050, midAt: 470, finalAt: 950,
            enemy: { hp: 3.85, dps: 2.6, spawn: 2.0, max: 9, mix: { cultist: 3, tentacle: 2, carapace: 1, slime: 2, sporer: 2 } }, elite: 0.12,
            base: { mid: 9000, final: 15600 }, reward: { kill: 66, mid: 3600, final: 11000 },
            boss: { unit: 'oculus' }
        }
    ]
};
// 구역 6: 성왕국 변두리 — 교단 의료원 & 이단심문소 (D-076·D-078, MD/구역6_설계안.md) — 7판(6 + 보스).
// 구역 3과 같은 교단: 구역 3 적 5종 + 병동 간수(사슬 속박)·그림자 집행자(은신)·헌금 기사(축복 오라).
// 요새(봉인된 약창고)는 쏘지 않는 대신 부수면 주인공 체력 midHeal만큼 회복(잠긴 약이 풀림),
// fonts = 축복 성수대가 나오는 거리(m) — 서 있는 동안 근처 적 받는 피해 감소 (battle/enemyField.js),
// 6-B는 정문(대성당 의료원)을 부수면 대사제 오르비안 (생명의 저울·헌금 소집·파문의 종, enemies_v2.js)
// 그림은 Gemini 전까지 임시(구역 1 벙커 · 구역 2 관문 + 색조, ui_v2.css .v2-zone-6).
// 구역 5(어비스)가 생기기 전까지는 4-B를 깨면 열림 — 구역 5를 넣으면 CHAPTERS에서 이 앞에 (D-078 임의 결정)
export const CHAPTER6 = {
    id: 'ch6',
    zone: 6,
    name: '구역 6 · 성왕국 변두리: 잠긴 병동',
    art: { mid: 'bunker', final: 'gate' },
    midHeal: 0.15,
    stages: [
        {
            id: '6-1', timeLimit: 225, starTime: 145, name: '성벽 밖 잿빛 거리', desc: '버려진 사람들이 모여 사는 성벽 밖. 교단 순찰대가 길을 막는다.',
            distance: 1000, midAt: 450, finalAt: 900,
            enemy: { hp: 3.9, dps: 2.6, spawn: 1.9, max: 8, mix: { soldier: 1 } }, elite: 0.07,
            base: { mid: 9000, final: 15800 }, reward: { kill: 70, mid: 3800, final: 10000 }
        },
        {
            id: '6-2', timeLimit: 230, starTime: 150, name: '잠긴 약창고', desc: '약과 병상을 잠가 둔 창고 거리. 사슬을 든 간수들이 지킨다.',
            distance: 1050, midAt: 470, finalAt: 950,
            enemy: { hp: 3.95, dps: 2.65, spawn: 2.0, max: 8, mix: { soldier: 3, warden: 1 } }, elite: 0.09,
            base: { mid: 9200, final: 16200 }, reward: { kill: 72, mid: 3900, final: 10300 }
        },
        {
            id: '6-3', timeLimit: 240, starTime: 155, name: '헌금 광장', desc: '헌금을 낸 자만 축복받는 광장. 금빛 성수대가 적을 지킨다.',
            distance: 1100, midAt: 500, finalAt: 1000, fonts: [240, 680],
            enemy: { hp: 4.0, dps: 2.7, spawn: 2.0, max: 8, mix: { soldier: 3, warden: 1, priest: 1 } }, elite: 0.1,
            base: { mid: 9400, final: 16600 }, reward: { kill: 74, mid: 4000, final: 10600 }
        },
        {
            id: '6-4', timeLimit: 245, starTime: 160, name: '사라진 사람들의 골목', desc: '살려 낸 사람들이 하나둘 사라지던 골목. 보이지 않는 집행자가 노린다.',
            distance: 1100, midAt: 500, finalAt: 1000,
            enemy: { hp: 4.05, dps: 2.7, spawn: 1.95, max: 9, mix: { soldier: 3, warden: 1, shade: 1 } }, elite: 0.11,
            base: { mid: 9600, final: 17000 }, reward: { kill: 76, mid: 4100, final: 10900 }
        },
        {
            id: '6-5', timeLimit: 250, starTime: 165, name: '이단 심판소', desc: '성녀를 마녀로 낙인찍던 심판대. 심문관과 마법사가 몰려든다.',
            distance: 1150, midAt: 520, finalAt: 1050,
            enemy: { hp: 4.1, dps: 2.75, spawn: 1.9, max: 9, mix: { soldier: 2, inquisitor: 2, mage: 2, warden: 1, shade: 1 } }, elite: 0.12,
            base: { mid: 9800, final: 17400 }, reward: { kill: 78, mid: 4200, final: 11200 }
        },
        {
            id: '6-6', timeLimit: 260, starTime: 170, name: '백색 병동 회랑', desc: '돈을 낸 자만 눕던 침상이 늘어선 회랑. 교단의 마지막 저지선.',
            distance: 1200, midAt: 550, finalAt: 1100, fonts: [720],
            enemy: { hp: 4.2, dps: 2.8, spawn: 1.95, max: 9,
                mix: { soldier: 3, inquisitor: 1, holyshield: 1, priest: 1, mage: 1, warden: 1, shade: 1, tithe: 1 } }, elite: 0.14,
            base: { mid: 10000, final: 17800 }, reward: { kill: 80, mid: 4300, final: 11500 }
        },
        {
            id: '6-B', timeLimit: 275, starTime: 190, name: '대성당 의료원', desc: '의료원 정문을 부수면, 생명을 저울질하던 대사제가 기다린다.',
            distance: 1050, midAt: 470, finalAt: 950, fonts: [260],
            enemy: { hp: 4.3, dps: 2.8, spawn: 2.0, max: 9, mix: { soldier: 3, inquisitor: 1, holyshield: 1, priest: 1, warden: 1, shade: 1 } }, elite: 0.12,
            base: { mid: 9800, final: 15200 }, reward: { kill: 86, mid: 4500, final: 13500 },
            boss: { unit: 'orbian', afterBase: true }
        }
    ]
};
[CHAPTER3, CHAPTER4, CHAPTER6].forEach(ch => ch.stages.forEach((st, i) => { st.map = MAP7[i]; }));

export const CHAPTERS = [CHAPTER1, CHAPTER2, CHAPTER3, CHAPTER4, CHAPTER6];
// 스테이지마다 챕터 정보(거점 그림 art, 요새 사격 defense, 요새 회복 midHeal, chapter id, 구역 번호)를 붙여 둠 — 전투·메뉴가 stage.art / stage.chapter / stage.zone으로 씀
CHAPTERS.forEach(ch => ch.stages.forEach(st => {
    st.chapter = ch.id; st.zone = ch.zone; st.art = ch.art; st.defense = ch.defense || null; st.midHeal = ch.midHeal || 0;
}));
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
