"""구역 2 (하부 쓰레기 폐기 정착지, D-040): 구역 탭·해금, 배경, 거점 그림, 새 적 행동(바리케이드·늪·그물·수리), 보스 고철왕·유독 가스"""

CLEAR_CH1 = "['1-1','1-2','1-3','1-4','1-5','1-B'].forEach(id => progress.stages[id] = { stars: [true,true,true], cleared: true, bestTime: 60 });"
CLEAN = "b.spawnInterval = 999; b.enemies.forEach(e => e.dom && e.dom.remove()); b.enemies = []; b.playerSpeed = 0;"


def battle_at(g, stage, build='kaiju'):   # 감속 면역이 없는 다리 (히어로 반중력 부양은 감속 무시)
    g.js(f"progress.selectStage('{stage}');")
    g.battle(build, wait_ms=2900)
    g.wait(2900)
    g.js(CLEAN)


def run(ctx):
    g = ctx.game(fresh=True)
    g.enter_v2()

    # 구역 탭: 처음엔 구역 2 잠김
    st = g.js("""const tabs = [...document.querySelectorAll('#menu-zones-v2 .v2-zonetab')];
        const z2 = tabs.find(t => t.dataset.zone === 'ch2'); z2.click();
        return { n: tabs.length, locked: z2.classList.contains('is-locked'), foot: document.getElementById('menu-map-foot-v2').textContent };""")
    ctx.check(st['n'] == 2 and st['locked'] and '잠김' in st['foot'], '구역 탭: 구역 2는 1-B 전까지 잠김', str(st))

    # 1-B를 깨면 구역 2가 열리고, 누르면 2-1
    g.js(CLEAR_CH1 + "window.madOverlordGameV2.menuController.renderStages();")
    st = g.js("""document.querySelector('#menu-zones-v2 .v2-zonetab[data-zone="ch2"]').click();
        return { sel: progress.selectedStage, name: document.getElementById('menu-map-name-v2').textContent,
                 foot: document.getElementById('menu-map-foot-v2').textContent };""")
    ctx.check(st['sel'] == '2-1' and '구역 2' in st['name'] and '2-1' in st['foot'], '1-B 클리어 → 구역 2 열림, 2-1 선택', str(st))
    ctx.check(g.js("return (await import('/js/engine_v2/stages_v2.js')).nextStageOf('1-B').id;") == '2-1', '1-B 다음 스테이지 = 2-1')
    g.shot('zone2_menu', '#screen-menu-v2')

    # 2-1 전투: 구역 2 배경, 고철 관문 그림, 약탈자 그림
    battle_at(g, '2-1')
    st = g.js("""const bg = k => getComputedStyle(document.getElementById(`bg-${k}-v2`)).backgroundImage;
        return { zone: document.getElementById('screen-battle-v2').classList.contains('v2-zone-2'), sky: bg('sky'), city: bg('city'), ground: bg('ground') };""")
    ctx.check(st['zone'] and 'bg2/dump.png' in st['sky'] and 'bg2/shanty.png' in st['city'] and 'bg2/ground.png' in st['ground'],
              '구역 2 배경 3층 = 폐기장·판잣집·고철판', str(st))
    g.js("b.distanceTraveled = b.stage.midAt - 0.5; b.playerSpeed = 100;")
    g.wait(1500)
    st = g.js("const mb = b.enemies.find(e => e.isBuilding); return mb && { art: mb.art, img: mb.dom.style.backgroundImage };")
    ctx.check(st and st['art'] == 'gate' and 'gate_1' in st['img'], '구역 2 중간 요새 = 고철 관문 그림', str(st))
    g.js(CLEAN + "b.spawnMinion('raider', { x: b.monsterX + 300 });")
    g.wait(300)
    img = g.js("const e = b.enemies.find(e => e.type === 'raider'); return getComputedStyle(e.dom.querySelector('.v2-enemy__sprite')).backgroundImage;")
    ctx.check('raider_walk' in img, '고철 약탈자 그림', img)

    # 방벽병: 사거리에 들어오면 바리케이드를 세움 → 파손 그림 → 부수면 사라짐(처치 수 그대로)
    g.js(CLEAN + "const e = b.spawnMinion('builder', { x: b.monsterX + 100 + 260 }); e.speed = 0; e.cd.build = 99;")
    g.wait(1600)
    st = g.js("""const br = b.enemies.find(e => e.isBarricade);
        return br && { x: br.x, img: br.dom.style.backgroundImage, hp: br.hp };""")
    ctx.check(st and 'barricade_1' in st['img'], '방벽병: 바리케이드를 세움', str(st))
    g.shot('zone2_barricade', '#screen-battle-v2')
    g.js("const br = b.enemies.find(e => e.isBarricade); br.hp = br.maxHp * 0.4; b.dealDamageToEnemy(br, 1, false);")
    g.wait(300)
    st = g.js("const br = b.enemies.find(e => e.isBarricade); return br && br.dom.style.backgroundImage;")
    ctx.check(st and 'barricade_2' in st, '바리케이드 체력 절반 → 파손 그림', str(st))
    kills = g.js("return b.stats.kills;")
    g.js("const br = b.enemies.find(e => e.isBarricade); br.hp = 1; b.dealDamageToEnemy(br, 50, false, { knock: 0 });")
    g.wait(300)
    st = g.js(f"return {{ left: b.enemies.some(e => e.isBarricade), kills: b.stats.kills, before: {kills} }};")
    ctx.check(not st['left'] and st['kills'] == st['before'], '바리케이드를 부수면 사라짐 (처치 수에는 안 셈)', str(st))

    # 오물 투척병: 주인공 발밑에 늪 → 위에 있으면 감속
    g.js(CLEAN + "b.pSlowT = 0; const e = b.spawnMinion('sludge', { x: b.monsterX + 100 + 230 }); e.speed = 0; e.cd.skill = 99;")
    g.wait(1500)
    st = g.js("return { puddles: b.hazards.length, slow: b.pSlowT > 0, dom: !!document.querySelector('.v2-puddle') };")
    ctx.check(st['puddles'] >= 1 and st['dom'] and st['slow'], '오물 투척병: 늪 장판 → 주인공 감속', str(st))
    g.shot('zone2_puddle', '#screen-battle-v2')

    # 그물총 사수: 맞으면 속박 (진격 0, 공격 가능)
    g.js(CLEAN + "b.hazards.forEach(h => h.dom.remove()); b.hazards = []; b.pSlowT = 0; b.pRootT = 0;"
         "const e = b.spawnMinion('netter', { x: b.monsterX + 100 + 220 }); e.speed = 0; e.cd.skill = 99;")
    g.wait(1200)
    st = g.js("return { root: b.pRootT > 0, move: b.moveMul(), stunned: b.playerStunned(), icon: !!document.querySelector('#hud-pstatus-v2 .is-net') };")
    ctx.check(st['root'] and st['move'] == 0 and not st['stunned'] and st['icon'], '그물총 사수: 속박 (진격 0, 기절 아님, HUD 아이콘)', str(st))

    # 수리공: 바리케이드·거점을 고침
    g.js(CLEAN + "b.pRootT = 0; const br = b.spawnBarricade(b.monsterX + 400, 1000); br.hp = 300;"
         "const e = b.spawnMinion('mechanic', { x: b.monsterX + 100 + 300 }); e.speed = 0; e.cd.skill = 99;")
    g.wait(800)
    hp = g.js("const br = b.enemies.find(e => e.isBarricade); return br && br.hp;")
    ctx.check(hp and hp > 300, '수리공: 바리케이드를 고침', str(hp))

    # 보스전 2-B: 소각탑 그림, 고철왕, 자석(밀려남), 고철 낙하, 유독 가스
    battle_at(g, '2-B')
    g.js("b.midBaseSpawned = true; b.midBaseDestroyed = true; b.distanceTraveled = b.stage.finalAt - 0.5; b.playerSpeed = 100;")
    g.wait(2600)
    st = g.js("""const f = b.enemies.find(e => e.isFinal); const sky = getComputedStyle(document.getElementById('bg-sky-v2')).backgroundImage;
        return { art: f && f.art, boss: b.boss && b.boss.type, sky };""")
    ctx.check(st['art'] == 'furnace' and st['boss'] == 'scrapking' and 'dump_fire' in st['sky'], '2-B: 소각탑 · 고철왕 · 불길 배경', str(st))
    g.js("b.enemies.filter(e => !e.isBuilding && !e.boss).forEach(e => e.dom.remove()); b.enemies = b.enemies.filter(e => e.isBuilding || e.boss); b.spawnInterval = 999;"
         "b.monsterX = 420; m.setMonsterPosition(420); b.boss.x = 560; b.boss.dom.style.left = '560px'; b.boss.speed = 0; b.boss.cd.magnet = 99; b.playerSpeed = 0;")
    g.wait(1400)
    st = g.js("return { x: b.monsterX, cls: b.boss.dom.className };")
    ctx.check(st['x'] < 400, '고철왕 자석: 주인공이 뒤로 밀려남', str(st))
    hp0 = g.js("b.playerHp = b.maxPlayerHp; b.boss.cd.drop = 99; return b.playerHp;")
    g.wait(1800)
    hp1 = g.js("return b.playerHp;")
    ctx.check(hp1 < hp0, '고철왕 고철 낙하: 예고 뒤 큰 피해', f'{hp0} → {hp1}')
    g.shot('zone2_boss', '#screen-battle-v2')
    g.js("b.pSlowT = 0; b.gasTimer = b.stage.boss.gas.every - 0.05;")
    g.wait(400)
    st = g.js("return { gas: document.querySelector('.v2-battle').classList.contains('v2-gas'), slow: b.pSlowT > 0, bossSlow: b.boss && b.boss.slowT > 0, silence: b.spawnSilence > 0 };")
    ctx.check(st['gas'] and st['slow'] and st['bossSlow'] and st['silence'], '유독 가스: 전장 안개 + 주인공·적 모두 감속 + 증원 멈춤', str(st))
    g.shot('zone2_gas', '#screen-battle-v2')
