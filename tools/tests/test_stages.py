"""스테이지(B단계): 선택·잠금, 별 3개·보너스·다음 스테이지, 적 5종 능력, 보스·EMP 포격, 파츠 색, 소환 유닛 외형"""


def clear_stage_fast(g, keep_hp=True):
    """지금 전투를 빠르게 이김: 요새 → 최종 기지 파괴 (체력 유지)"""
    g.js("b.spawnInterval = 999; b.distanceTraveled = b.stage.midAt - 0.5;")
    g.wait(900)
    g.js("const bd = b.enemies.find(e => e.isBuilding); if (bd) { bd.hp = 1; b.dealDamageToEnemy(bd, 50, true, { knock: 0 }); }")
    g.wait(2200)
    g.js("b.enemies.filter(e => !e.isBuilding).forEach(e => e.dom.remove()); b.enemies = b.enemies.filter(e => e.isBuilding);"
         f"{'b.playerHp = b.maxPlayerHp;' if keep_hp else 'b.playerHp = b.maxPlayerHp * 0.3;'} b.distanceTraveled = b.stage.finalAt - 0.5;")
    g.wait(1500)
    g.js("b.enemies.filter(e => !e.isBuilding).forEach(e => e.dom.remove()); b.enemies = b.enemies.filter(e => e.isBuilding);"
         "const bd = b.enemies.find(e => e.isBuilding && e.isFinal); if (bd) { bd.hp = 1; b.dealDamageToEnemy(bd, 50, true, { knock: 0 }); }")
    g.wait(7200)


def run(ctx):
    g = ctx.game(fresh=True)
    g.enter_v2()

    # 선택·잠금
    st = g.js("""const menu = window.madOverlordGameV2.menuController;
        const before = progress.selectedStage;
        menu.selectStage('1-2');
        return { before, after: progress.selectedStage, foot: document.getElementById('menu-map-foot-v2').textContent };""")
    ctx.check(st['before'] == '1-1', '처음 선택 스테이지 = 1-1', str(st['before']))
    ctx.check(st['after'] == '1-1' and '잠김' in st['foot'], '잠긴 1-2는 선택 안 됨', st['foot'])
    g.shot('stage_menu', '#screen-menu-v2')

    # 1-1: 경비병만, 거리 800
    g.page.click('#btn-to-battle-v2')
    g.wait(2900)
    st = g.js("b.spawnInterval = 0.2; return { id: b.stage.id, max: b.maxDistance };")
    g.wait(1200)
    types = g.js("return [...new Set(b.enemies.filter(e => !e.isBuilding).map(e => e.type))];")
    ctx.check(st['id'] == '1-1' and st['max'] == 800, '1-1 스테이지 데이터로 전투', str(st))
    ctx.check(types == ['guard'], '1-1 적 = 경비병만', str(types))

    # 체력 유지 클리어 → 별 3개 + 새 별 보너스 900 + 다음 스테이지 버튼
    dm0 = g.js('return gameState.darkMatter;')
    clear_stage_fast(g, keep_hp=True)
    st = g.js("""return { stars: progress.stage('1-1').stars, cleared: progress.stage('1-1').cleared,
        next: !!document.querySelector('.v2-result [data-act="next"]'), news: document.querySelectorAll('.v2-result__star em').length };""")
    ctx.check(st['stars'] == [True, True, True] and st['cleared'], '1-1 별 3개 기록', str(st['stars']))
    ctx.check(st['news'] == 3, '결과 화면: NEW 별 3개')
    ctx.check(st['next'], '결과 화면: 다음 스테이지 버튼')
    gained = g.js('return gameState.darkMatter;') - dm0
    ctx.check(gained >= 500 + 1500 + 900, '보상: 요새 + 기지 + 새 별 보너스 900', str(gained))
    g.shot('stage_result', '#screen-battle-v2')
    g.page.click('.v2-result [data-act="next"]')
    g.wait(1500)
    ctx.check(g.js('return b.stage.id;') == '1-2', '다음 스테이지 버튼 → 1-2 출격')

    # 적 종류 능력 (1-4 설정으로 직접 소환)
    g.js("progress.selectStage('1-4'); progress.stages['1-3'] = { stars: [true,true,false], cleared: true, bestTime: 60 };")
    g.battle('mech', wait_ms=2900)
    ctx.check(g.js('return b.stage.id;') == '1-4', '1-4 스테이지 열림·출격')
    g.js("b.spawnInterval = 999; b.enemies.filter(e => !e.isBuilding).forEach(e => e.dom.remove()); b.enemies = b.enemies.filter(e => e.isBuilding);")
    hp = g.js("const e = b.spawnMinion('shield', { x: b.monsterX + 600, elite: false }); const h0 = e.hp; b.dealDamageToEnemy(e, 100, false, null); return [h0, e.hp, e.knockResist];")
    ctx.check(abs((hp[0] - hp[1]) - 60) < 0.01 and hp[2], '방패병: 받는 피해 40% 감소 + 밀리지 않음', str(hp))
    g.js("b.enemies.forEach(e => e.dom && e.dom.remove()); b.enemies = []; const e = b.spawnMinion('tranq', { x: b.monsterX + 330, elite: false }); e.cd.skill = 99;")
    g.wait(1500)
    ctx.check(g.js('return b.pSlowT > 0 || b.pStatusShown === "slow";'), '마취총 사수: 주인공 감속')
    g.js("b.enemies.forEach(e => e.dom && e.dom.remove()); b.enemies = []; b.pSlowT = 0;"
         "window.__stun = 0; const orig = b.applyPlayerStun.bind(b); b.applyPlayerStun = (sec, l) => { window.__stun += 1; return orig(sec, l); };"
         "const e = b.spawnMinion('shock', { x: b.monsterX + 130, elite: false }); e.cd.skill = 99; e.hp = e.maxHp = 99999;")
    g.wait(1200)
    ctx.check(g.js('return window.__stun > 0;'), '전기 충격병: 주인공 기절')
    g.js('delete b.applyPlayerStun;')
    g.js("b.pStunT = 0; b.enemies.forEach(e => e.dom && e.dom.remove()); b.enemies = [];"
         "const hurt = b.spawnMinion('guard', { x: b.monsterX + 520 }); hurt.hp = 50; hurt.speed = 0;"
         "const med = b.spawnMinion('medic', { x: b.monsterX + 600 }); med.speed = 0; med.cd.skill = 99; window.__hurt = hurt;")
    g.wait(600)
    ctx.check(g.js('return window.__hurt.hp > 50;'), '의무병: 다친 적 치유')
    g.shot('stage_enemies', '#screen-battle-v2')

    # 보스전: 보스 등장 + EMP 포격
    g.js("progress.selectStage('1-B'); progress.stages['1-5'] = { stars: [true,true,true], cleared: true, bestTime: 60 };")
    g.battle('kaiju', wait_ms=2900)
    g.js("b.spawnInterval = 999; b.midBaseSpawned = true; b.midBaseDestroyed = true; b.enemies.forEach(e => e.dom && e.dom.remove()); b.enemies = []; b.distanceTraveled = b.stage.finalAt - 0.5;")
    g.wait(1500)
    st = g.js("return { boss: !!b.boss && b.boss.type, bar: !document.getElementById('hud-boss-v2').hidden };")
    ctx.check(st['boss'] == 'guardian' and st['bar'], '보스전: 정의의 수호자 등장 + 보스 체력 바', str(st))
    g.js("for (let i = 0; i < 3; i++) b.spawnMinion('guard'); b.artTimer = b.stage.boss.artillery.every - 0.05;")
    g.wait(500)
    st = g.js("return { stun: b.pStunT > 0, minions: b.enemies.filter(e => !e.isBuilding && !e.boss).length, silence: b.spawnSilence > 0 };")
    ctx.check(st['stun'] and st['minions'] == 0 and st['silence'], 'EMP 포격: 주인공 기절 + 적 보병 전멸 + 소환 중단', str(st))
    g.shot('stage_boss', '#screen-battle-v2')

    # 파츠 색: 같은 팩션 변형 / 다른 팩션 파츠 / 소환 유닛 외형
    g.battle(('head_chimera', 'body_mech', 'arm_mech_laser', 'leg_mech_wheel'), wait_ms=1200)
    f = g.js("return m.rigBattle.partFilters || {};")
    ctx.check('body' in f and 'armR_cannon' in f, '파츠 색: 아다만티움 몸통·레이저 팔 변형 색', str(list(f)))
    ctx.check('drop-shadow' in f.get('head', ''), '파츠 색: 다른 팩션 머리(합성괴인) 테두리 빛', f.get('head', ''))
    g.js("b.spawnAllyMinion(b.monsterX + 60, 'chimera'); b.spawnAllyMinion(b.monsterX + 90, 'mind');")
    cls = g.js("return b.allies.map(a => a.dom.className);")
    ctx.check(any('chimera-minion-v2' in c for c in cls) and any('v2-mind' in c for c in cls), '소환 유닛: 미니 괴인 / 세뇌 보병 외형', str(cls))
    g.shot('stage_parts', '#screen-battle-v2')
