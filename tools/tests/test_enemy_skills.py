"""마법사 원소별 효과·보스 새 기술 4종 (적_스킬_확장안 2·3장): 피해·상태 이상·결계·방벽·사슬·진홍 시선"""

from test_zone34 import CLEAR, CLEAN, battle_at, place


def cast(g, key, leg='leg_red_robot'):
    """원소를 고정해서 한 발만 발사 (일반 발사 주기는 place에서 멈춤)"""
    g.js(f"""const {{ castSpell }} = await import('/js/engine_v2/enemies_v2.js');
        b._hurt = 0; b.pStunT = 0; b.pSlowT = 0; b.equippedLegId = '{leg}';
        castSpell(b, b.enemies.find(e => e.type === 'mage'), '{key}');""")


def run(ctx):
    g = ctx.game(fresh=True)
    g.enter_v2()
    g.js(CLEAR.replace('IDS', '[1, 2, 3, 4]'))

    # 3-B 마법사: 불은 초기 피해 + 1초마다 3번 화상 (일반 공격이 섞이지 않게)
    battle_at(g, '3-B')
    place(g, 'mage', 240, 'e.cd.skill = -999; e.cd.next = 999;')
    base = g.js("return (await import('/js/engine_v2/enemies_v2.js')).ENEMY_TYPES.mage.spell.dmg * b.stage.enemy.dps;")
    cast(g, 'fire')
    g.wait(500)
    hurt = g.js("return b._hurt;")
    ctx.check(abs(hurt - base) < 0.001, '불: 초기 피해 ×1', str(hurt))
    for i in range(1, 4):
        g.wait(1100)
        hurt = g.js("return b._hurt;")
        ctx.check(abs(hurt - base * (1 + 0.25 * i)) < 0.001, f'불: 화상 {i}초째 피해 ×0.25 추가', str(hurt))
    g.wait(1100)
    ctx.check(abs(g.js("return b._hurt;") - base * 1.75) < 0.001, '불: 화상은 3번 뒤 종료')

    cast(g, 'bolt')
    g.wait(450)
    st = g.js("return { hurt: b._hurt, stun: b.pStunT, slow: b.pSlowT };")
    ctx.check(abs(st['hurt'] - base * 0.8) < 0.001 and 0 < st['stun'] <= 0.4 and st['slow'] == 0,
              '번개: 피해 ×0.8 + 기절 0.4초', str(st))
    g.wait(500)
    ctx.check(g.js("return b.pStunT <= 0;"), '번개: 짧은 기절이 풀림')
    cast(g, 'ice')
    g.wait(450)
    st = g.js("return { hurt: b._hurt, slow: b.pSlowT, stun: b.pStunT, move: b.moveMul() };")
    ctx.check(abs(st['hurt'] - base * 0.9) < 0.001 and 1 < st['slow'] <= 1.5 and st['stun'] <= 0 and st['move'] == 0.5,
              '얼음: 피해 ×0.9 + 감속 1.5초', str(st))

    # 자기장 방벽: 원소 피해·효과 절반 / 반중력 부양: 감속 면역
    cast(g, 'bolt', 'leg_mech_b')
    g.wait(450)
    st = g.js("return { hurt: b._hurt, stun: b.pStunT };")
    ctx.check(abs(st['hurt'] - base * 0.4) < 0.001 and 0 < st['stun'] <= 0.2,
              '자기장 방벽: 번개 피해·기절 절반', str(st))
    cast(g, 'ice', 'leg_mech_b')
    g.wait(450)
    st = g.js("return { hurt: b._hurt, slow: b.pSlowT };")
    ctx.check(abs(st['hurt'] - base * 0.45) < 0.001 and 0 < st['slow'] <= 0.75,
              '자기장 방벽: 얼음 피해·감속 절반', str(st))
    cast(g, 'fire', 'leg_mech_b')
    g.wait(3800)
    hurt = g.js("return b._hurt;")
    ctx.check(abs(hurt - base * 1.75 * 0.5) < 0.001, '자기장 방벽: 불 초기 피해·화상 모두 절반', str(hurt))
    cast(g, 'ice', 'leg_hero_hover')
    g.wait(450)
    ctx.check(g.js("return b.pSlowT <= 0;"), '반중력 부양: 얼음 감속 면역')

    # 전투 종료 상태에서는 예약된 화상이 피해를 주지 않음
    cast(g, 'fire')
    g.wait(500)
    st = g.js("""const before = b._hurt; b.finalBaseDestroyed = true; b.tickTimers(4);
        b.finalBaseDestroyed = false; return { before, after: b._hurt };""")
    ctx.check(st['before'] == st['after'], '전투 종료 뒤 예약된 화상 피해 없음', str(st))

    # 1-B 수호자: 멀리서도 결계 발동, 방어 계산 뒤 70% 감소, 3초 뒤 원래 색·피해로
    battle_at(g, '1-B')
    place(g, 'guardian', 600, "b.boss = e; b._baseFilter = e.baseFilter;"
          "const hp = e.hp; b.dealDamageToEnemy(e, 100, false); b._normalDamage = hp - e.hp;"
          "e.cd.barrier = e.t.barrier.every - 0.05;")
    g.wait(250)
    st = g.js("""const e = b.boss, hp = e.hp; b.dealDamageToEnemy(e, 100, false);
        return { normal: b._normalDamage, damage: hp - e.hp, sec: e.barrierT, filter: e.baseFilter };""")
    ctx.check(st['sec'] > 2.5 and 'rgba(255, 220, 120, 0.95)' in st['filter'], '수호의 결계: 거리와 무관하게 발동 + 금빛 테두리', str(st))
    ctx.check(abs(st['damage'] - st['normal'] * 0.3) < 0.001, '수호의 결계: 방어 계산 뒤 받는 피해 70% 감소', str(st))
    g.wait(3100)
    st = g.js("""const e = b.boss, hp = e.hp; b.dealDamageToEnemy(e, 100, false);
        return { damage: hp - e.hp, normal: b._normalDamage, sec: e.barrierT, restored: e.baseFilter === b._baseFilter };""")
    ctx.check(st['sec'] == 0 and st['restored'] and abs(st['damage'] - st['normal']) < 0.001,
              '수호의 결계: 3초 뒤 피해·원래 색조 복원', str(st))

    # 2-B 고철왕: 자기 앞에 520 × 체력 배율의 방벽, 근처에 있으면 중복 투하하지 않음
    battle_at(g, '2-B')
    place(g, 'scrapking', 600, 'b.boss = e; e.cd.magnet = 0; e.cd.drop = 0; e.cd.scrapWall = e.t.scrapWall.every - 0.05;')
    g.wait(250)
    st = g.js("""const wall = b.enemies.find(e => e.isBarricade);
        return wall && { hp: wall.hp, expected: 520 * b.stage.enemy.hp, x: wall.x, expectedX: b.boss.x - 90 };""")
    ctx.check(st and st['hp'] == st['expected'] and st['x'] == st['expectedX'], '고철 방벽 투하: 보스 앞 90px, 체력 520 × 배율', str(st))
    g.js("b.boss.cd.scrapWall = 99;")
    g.wait(250)
    ctx.check(g.js("return b.enemies.filter(e => e.isBarricade).length;") == 1, '고철 방벽 투하: gap 안에 방벽이 있으면 생략')
    g.js("const wall = b.enemies.find(e => e.isBarricade); b.dealDamageToEnemy(wall, wall.hp + 1, false); b.boss.cd.scrapWall = 99;")
    g.wait(250)
    ctx.check(g.js("return b.enemies.filter(e => e.isBarricade).length;") == 1, '고철 방벽 투하: 방벽이 부서지면 다시 투하 가능')

    # 3-B 대주교: 0.8초 예고 → 실제 금빛 사슬 비행 → 3% 피해·속박 (공격 가능)
    battle_at(g, '3-B')
    place(g, 'archbishop', 600, 'b.boss = e; e.cd.judgment = -999; e.cd.chain = e.t.chain.every - 0.05;')
    g.wait(450)
    ctx.check(g.js("return b._hurt == 0 && b.pRootT <= 0;"), '속죄의 사슬: 예고 중에는 피해·속박 없음')
    g.wait(850)
    st = g.js("return { hurt: b._hurt, expected: b.maxPlayerHp * 0.03, root: b.pRootT, move: b.moveMul(), stun: b.playerStunned() };")
    ctx.check(abs(st['hurt'] - st['expected']) < 0.001 and 0 < st['root'] <= 1.6 and st['move'] == 0 and not st['stun'],
              '속죄의 사슬: 최대 내구도 3% 피해 + 속박 1.6초 (기절 아님)', str(st))
    g.js("b._hurt = 0; b.pRootT = 0; b.equippedLegId = 'leg_mech_b'; b.boss.cd.chain = 99;")
    g.wait(1300)
    st = g.js("return { hurt: b._hurt, expected: b.maxPlayerHp * 0.03, root: b.pRootT };")
    ctx.check(abs(st['hurt'] - st['expected']) < 0.001 and 0 < st['root'] <= 0.8,
              '속죄의 사슬: 자기장 방벽이면 속박 절반', str(st))

    # 4-B 오큘러스: 1페이즈에서는 시선 없음 → 실제 광폭화 → 조준선 1초 → 광선 피해·기절
    battle_at(g, '4-B')
    place(g, 'oculus', 600, 'b.boss = e; e.cd.wave = -999; e.cd.goo = -999; e.cd.gaze = 99;')
    g.wait(250)
    ctx.check(g.js("return !b.boss.raged && b._hurt == 0 && !b.fx.vfx.items.some(i => i.type === 'beam');"), '진홍 시선: 1페이즈에서는 발동 안 함')
    g.js("b.boss.hp = b.boss.maxHp * 0.45; b.boss.cd.gaze = 0; b.boss.cd.charge = -999;")
    g.wait(250)
    ctx.check(g.js("return b.boss.raged;"), '오큘러스: 체력 50% 아래에서 2페이즈 진입')
    g.js(CLEAN + "b.boss.speed = 0; b.boss.cd.gaze = b.boss.t.rage.gaze.every - 0.05;")
    g.wait(300)
    st = g.js("return { hurt: b._hurt, stun: b.pStunT, aim: b.fx.vfx.items.some(i => i.type === 'beam' && i.w === 2 && i.to) };")
    ctx.check(st['aim'] and st['hurt'] == 0 and st['stun'] <= 0, '진홍 시선: beam + to 조준선, 예고 중 피해·기절 없음', str(st))
    g.wait(850)
    st = g.js("""return { hurt: b._hurt, expected: b.maxPlayerHp * 0.06, stun: b.pStunT,
        beam: b.fx.vfx.items.some(i => i.type === 'beam' && i.w === 26 && i.to),
        hit: b.fx.vfx.items.some(i => ['flash', 'sprite'].includes(i.type) && i.pos === 'to') };""")  # 그림 D는 목표 섬광이 sprite
    ctx.check(abs(st['hurt'] - st['expected']) < 0.001 and 0 < st['stun'] <= 0.5 and st['beam'] and st['hit'],
              '진홍 시선: 최대 내구도 6% 피해 + 기절 0.5초, 굵은 광선·목표 섬광', str(st))
