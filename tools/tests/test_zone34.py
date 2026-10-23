"""구역 3 (성왕국 수도)·구역 4 (진화의 심연), D-056: 구역 탭·해금, 임시 배경, 빌린 그림, 새 적 행동(마법·치유·장벽·분열·포자),
요새 사격·독액, 3-B 정문 → 대주교 → 승리·심연의 문 개방, 4-B 오큘러스 기술·극한의 변이·돌진"""

CLEAR = ("(await import('/js/engine_v2/stages_v2.js')).STAGES.filter(s => IDS.includes(s.zone))"
         ".forEach(s => progress.stages[s.id] = { stars: [true,true,true], cleared: true, bestTime: 60 });")
# 소환 멈춤, 적 치움(거점·보스는 남김), 주인공 제자리·공격력 0 (적이 죽지 않게), 받은 피해 합계 b._hurt
CLEAN = ("b.spawnInterval = 999; b.enemies.filter(e => !e.isBuilding && !e.boss).forEach(e => e.dom && e.dom.remove());"
         "b.enemies = b.enemies.filter(e => e.isBuilding || e.boss); b.playerSpeed = 0; b.playerDps = 0;"
         "if (!b._spy) { b._spy = true; const f = b.damagePlayer; b.damagePlayer = function (a, ...r) { b._hurt = (b._hurt || 0) + a; return f.call(this, a, ...r); }; }"
         "b._hurt = 0;")


def battle_at(g, stage):
    g.js(f"progress.selectStage('{stage}');")
    g.battle('mech', wait_ms=2900)
    g.wait(2900)
    g.js(CLEAN)


def place(g, typ, dx, extra=''):
    """주인공 앞 dx px에 적 하나 (움직이지 않음)"""
    g.js(CLEAN + f"const e = b.spawnMinion('{typ}', {{ x: b.frontX() + {dx}, elite: false }}); e.speed = 0; {extra}")


def run(ctx):
    g = ctx.game(fresh=True)
    g.enter_v2()

    # 구역 탭 5개(1~4 + 6, D-078), 구역 3은 2-B 전까지 잠김 → 구역 1·2를 깨면 열리고 누르면 3-1
    st = g.js("""const tabs = [...document.querySelectorAll('#menu-zones-v2 .v2-zonetab')];
        const z3 = tabs.find(t => t.dataset.zone === 'ch3'); z3.click();
        return { n: tabs.length, locked: z3.classList.contains('is-locked'), foot: document.getElementById('menu-map-foot-v2').textContent };""")
    ctx.check(st['n'] == 5 and st['locked'] and '2-B' in st['foot'], '구역 탭 5개: 구역 3은 2-B 전까지 잠김', str(st))
    g.js(CLEAR.replace('IDS', '[1, 2]') + "window.madOverlordGameV2.menuController.renderStages();")
    st = g.js("""document.querySelector('#menu-zones-v2 .v2-zonetab[data-zone="ch3"]').click();
        const S = await import('/js/engine_v2/stages_v2.js');
        return { sel: progress.selectedStage, name: document.getElementById('menu-map-name-v2').textContent,
                 n3: S.CHAPTER3.stages.length, n4: S.CHAPTER4.stages.length, after2: S.nextStageOf('2-B').id, after3: S.nextStageOf('3-B').id,
                 z4: document.querySelector('#menu-zones-v2 .v2-zonetab[data-zone="ch4"]').classList.contains('is-locked') };""")
    ctx.check(st['sel'] == '3-1' and '구역 3' in st['name'] and st['n3'] == 7 and st['n4'] == 7 and st['after2'] == '3-1'
              and st['after3'] == '4-1' and st['z4'], '2-B 클리어 → 구역 3 열림(3-1), 구역마다 7판, 3-B 다음 = 4-1, 구역 4는 잠김', str(st))
    g.shot('zone3_menu', '#screen-menu-v2')

    # 3-1: 구역 3 배경(임시 색조), 왕국보병 = 경비병 그림 + 색조
    battle_at(g, '3-1')
    place(g, 'soldier', 300)
    st = g.js("""const sc = document.getElementById('screen-battle-v2'); const e = b.enemies.find(e => e.type === 'soldier');
        return { zone: sc.classList.contains('v2-zone-3'), z2: sc.classList.contains('v2-zone-2'),
                 sky: getComputedStyle(document.getElementById('bg-sky-v2')).filter,
                 img: getComputedStyle(e.dom.querySelector('.v2-enemy__sprite')).backgroundImage, tint: e.dom.style.filter };""")
    ctx.check(st['zone'] and not st['z2'] and 'sepia' in st['sky'] and 'soldier_walk' in st['img'] and 'sepia' not in st['tint'],
              '구역 3 배경 색조 + 왕국보병(자기 그림, 색조 없음 — Gemini 그림 10-19)', str(st))

    # 심문소 통제탑: 420px 안이면 화살·마법
    g.js(CLEAN + "b.distanceTraveled = b.stage.midAt - 0.5; b.playerSpeed = 100;")
    g.wait(1200)
    g.js(CLEAN + "const t = b.enemies.find(e => e.isBuilding); b.monsterX = t.x - 100 - 380; m.setMonsterPosition(b.monsterX);")
    g.wait(2600)
    st = g.js("const t = b.enemies.find(e => e.isBuilding); return { art: t && t.art, hurt: b._hurt };")
    ctx.check(st['art'] == 'tower' and st['hurt'] > 0, '심문소 통제탑(임시 통제탑 그림): 다가가면 화살·마법', str(st))
    g.shot('zone3_tower', '#screen-battle-v2')

    # 신성 방패병: 방패 장벽 / 신관: 병사만 치유 (거점은 안 고침) / 마법사: 원소탄
    g.js("const t = b.enemies.find(e => e.isBuilding); if (t) { t.dom.remove(); b.enemies = b.enemies.filter(e => e !== t); } b.monsterX = 150; m.setMonsterPosition(150);")
    place(g, 'holyshield', 260, 'e.cd.build = 99;')
    g.wait(1600)
    ctx.check(g.js("return b.enemies.some(e => e.isBarricade);"), '신성 방패병: 방패 장벽을 세움')
    place(g, 'priest', 300, "e.cd.skill = 2.5;"
          "const s = b.spawnMinion('soldier', { x: b.frontX() + 240, elite: false }); s.speed = 0; s.hp = s.maxHp * 0.3;"
          "const br = b.spawnBarricade(b.frontX() + 200, 1000); br.hp = 300;")
    g.wait(1200)
    st = g.js("""const s = b.enemies.find(e => e.type === 'soldier'), br = b.enemies.find(e => e.isBarricade);
        return { soldier: s.hp / s.maxHp, bar: br.hp };""")
    ctx.check(st['soldier'] > 0.3 and st['bar'] == 300, '신관: 병사만 치유 (장벽은 안 고침)', str(st))
    place(g, 'mage', 240, 'e.cd.skill = 99; e.cd.next = 0.1;')
    g.wait(900)
    ctx.check(g.js("return b._hurt;") > 0, '마법사: 원소탄 피해')

    # 3-B: 정문(관문 그림)이 나와도 보스는 아직 → 정문을 부수면 대주교 → 별 2개째, 전투 계속
    battle_at(g, '3-B')
    g.js("b.midBaseSpawned = true; b.midBaseDestroyed = true; b.distanceTraveled = b.stage.finalAt - 0.5; b.playerSpeed = 100;")
    g.wait(1500)
    st = g.js("const f = b.enemies.find(e => e.isFinal); return { art: f && f.art, boss: !!b.boss };")
    ctx.check(st['art'] == 'gate' and not st['boss'], '3-B: 대성당 정문(임시 관문 그림), 보스는 아직 없음', str(st))
    g.js(CLEAN + "const f = b.enemies.find(e => e.isFinal); b.dealDamageToEnemy(f, f.hp + 10, false);")
    g.wait(3400)
    st = g.js("""return { phase: b.bossPhase, boss: b.boss && b.boss.type, star: b.starFlags[1], over: b.finalBaseDestroyed, active: b.isActive,
        hud: !document.getElementById('hud-boss-v2').hidden };""")
    ctx.check(st['phase'] and st['boss'] == 'archbishop' and st['star'] and not st['over'] and st['active'] and st['hud'],
              '정문을 부수면 대주교 베네딕트 출현 (별 2개째, 전투 계속, 보스 체력 막대)', str(st))
    g.shot('zone3_boss', '#screen-battle-v2')

    # 천상의 심판 / 악마병 소환(체력 50% 아래) / 심연의 문 개방(악마기사 엘리트 + 진홍 점멸)
    g.js(CLEAN + "b.boss.speed = 0; b.boss.cd.judgment = 99;")
    g.wait(1900)
    ctx.check(g.js("return b._hurt;") > 0, '천상의 심판: 예고 뒤 빛의 기둥 피해')
    g.js("b.boss.hp = b.boss.maxHp * 0.4; b.boss.cd.summon = 99;")
    g.wait(300)
    ctx.check(g.js("return b.enemies.filter(e => e.type === 'demon').length;") >= 2, '대주교 체력 50% 아래: 악마병 2기 소환')
    g.js("b.knightTimer = b.stage.boss.knights.every - 0.05;")
    g.wait(300)
    st = g.js("""const k = b.enemies.find(e => e.type === 'demonknight');
        return { knight: !!k, elite: k && k.elite, crimson: document.getElementById('screen-battle-v2').classList.contains('v2-crimson') };""")
    ctx.check(st['knight'] and st['elite'] and st['crimson'], '심연의 문 개방: 악마기사(엘리트) + 배경 진홍 점멸', str(st))
    g.shot('zone3_knight', '#screen-battle-v2')

    # 대주교를 쓰러뜨리면 승리
    g.js("b.boss.hp = 1; b.dealDamageToEnemy(b.boss, 1000, false);")   # 피해 감소 30%가 있어 넉넉히
    g.wait(6500)
    st = g.js("return { win: !!document.querySelector('.v2-result.is-win'), stage: progress.stage('3-B').cleared };")
    ctx.check(st['win'] and st['stage'], '대주교 격파 → 승리 (3-B 클리어)', str(st))
    g.js("b.stopBattle(); window.madOverlordGameV2.switchScreen('menu');")
    g.wait(400)

    # 구역 4: 4-1 배경(보랏빛), 슬라임 분열, 포자 술사, 생체 방패수, 유기질 벽 독액
    g.js(CLEAR.replace('IDS', '[1, 2, 3]'))
    battle_at(g, '4-1')
    st = g.js("""const sc = document.getElementById('screen-battle-v2');
        return { zone: sc.classList.contains('v2-zone-4'), z3: sc.classList.contains('v2-zone-3'),
                 sky: getComputedStyle(document.getElementById('bg-sky-v2')).filter };""")
    ctx.check(st['zone'] and not st['z3'] and 'hue-rotate' in st['sky'], '구역 4 배경 (보랏빛 임시)', str(st))
    place(g, 'slime', 300)
    g.js("const s = b.enemies.find(e => e.type === 'slime'); b.dealDamageToEnemy(s, s.hp + 10, false);")
    g.wait(200)
    st = g.js("return { small: b.enemies.filter(e => e.type === 'slimelet').length, scale: b.enemies.find(e => e.type === 'slimelet')?.dom.style.transform };")
    ctx.check(st['small'] == 2 and '0.6' in (st['scale'] or ''), '키메라 슬라임: 쓰러지면 작은 슬라임 2기', str(st))
    g.js("b.enemies.filter(e => e.type === 'slimelet').forEach(s => b.dealDamageToEnemy(s, s.hp + 10, false));")
    g.wait(200)
    ctx.check(g.js("return b.enemies.filter(e => e.type.startsWith('slime')).length;") == 0, '작은 슬라임은 다시 갈라지지 않음')
    place(g, 'sporer', 260, 'e.cd.skill = 99; e.cd.next = 0.1;')
    g.wait(1500)
    ctx.check(g.js("return b._hurt;") > 0, '포자 술사: 곡사 포자 피해')
    place(g, 'carapace', 260, 'e.cd.build = 99;')
    g.wait(1600)
    ctx.check(g.js("return b.enemies.some(e => e.isBarricade);"), '생체 방패수: 갑각 장벽을 세움')
    g.js(CLEAN + "b.distanceTraveled = b.stage.midAt - 0.5; b.playerSpeed = 100;")
    g.wait(1200)
    g.js(CLEAN + "b.enemies.filter(e => e.isBarricade).forEach(e => e.dom.remove()); b.enemies = b.enemies.filter(e => !e.isBarricade);"
         "b.hazards.forEach(h => h.dom.remove()); b.hazards = [];"
         "const t = b.enemies.find(e => e.isBuilding); b.monsterX = t.x - 100 - 260; m.setMonsterPosition(b.monsterX);")
    g.wait(3500)
    st = g.js("const t = b.enemies.find(e => e.isBuilding); return { art: t && t.art, hurt: b._hurt, puddles: b.hazards.length };")
    ctx.check(st['art'] == 'bunker' and st['hurt'] > 0 and st['puddles'] >= 1, '박동하는 유기질 벽: 다가가면 독액 + 독 웅덩이', str(st))
    g.shot('zone4_wall', '#screen-battle-v2')

    # 4-B: 고치(임시 소각탑) 앞에 오큘러스 → 유전자 붕괴(감속) · 심연의 파동 · 극한의 변이 · 돌진
    battle_at(g, '4-B')
    g.js("b.midBaseSpawned = true; b.midBaseDestroyed = true; b.distanceTraveled = b.stage.finalAt - 0.5; b.playerSpeed = 100;")
    g.wait(2600)
    st = g.js("const f = b.enemies.find(e => e.isFinal); return { art: f && f.art, boss: b.boss && b.boss.type };")
    ctx.check(st['art'] == 'furnace' and st['boss'] == 'oculus', '4-B: 우주적 고치(임시 소각탑) · 관장자 오큘러스', str(st))
    g.js(CLEAN + "b.monsterX = 420; m.setMonsterPosition(420); b.boss.x = 700; b.boss.dom.style.left = '700px'; b.boss.speed = 0;"
         "b.pSlowT = 0; b.boss.cd.goo = 99; b.boss.cd.wave = 0;")
    g.wait(900)
    ctx.check(g.js("return b.pSlowT;") > 2, '유전자 붕괴: 맞으면 긴 감속')
    g.js("b._hurt = 0; b.boss.cd.wave = 99;")
    g.wait(1500)
    ctx.check(g.js("return b._hurt;") > 0, '심연의 파동: 예고 뒤 촉수 피해')
    g.js("b.boss.hp = b.boss.maxHp * 0.45; b.dealDamageToEnemy(b.boss, 1, false);")
    g.wait(400)
    st = g.js("""return { raged: !!b.boss.raged, rage: document.getElementById('screen-battle-v2').classList.contains('v2-boss-rage'),
        tf: b.boss.dom.style.transform, art2: b.boss.dom.classList.contains('v2-art-oculus2') && b.boss.artKey === 'oculus2' };""")
    # 2페이즈 그림(oculus2)이 있으면 그림을 바꿔 끼우고, 없으면 임시로 색조·크기(1.15배)만
    ctx.check(st['raged'] and st['rage'] and (st['art2'] or '1.15' in st['tf']), '극한의 변이: 체력 50% → 2페이즈 (진홍 배경, 2페이즈 그림 또는 커짐)', str(st))
    g.shot('zone4_rage', '#screen-battle-v2')
    g.js("b._hurt = 0; b.boss.speed = 0; b.boss.x = 760; b.boss.dom.style.left = '760px'; b.boss.cd.charge = 99;")
    g.wait(1400)
    st = g.js("return { hurt: b._hurt, x: b.boss.x, front: b.frontX(), me: b.monsterX };")
    ctx.check(st['hurt'] > 0 and st['x'] < 700 and st['me'] < 420, '돌진: 주인공에게 달려들어 피해 + 밀어냄', str(st))
