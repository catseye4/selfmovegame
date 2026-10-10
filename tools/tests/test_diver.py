"""심연의 길잡이 (새 캐릭터 1, D-044): 파츠 8개·연구소, 리그 연결(기본·강화 그림 바꿔 끼우기),
고압 방수포 관통, 앵커 견인, 고압 분사, 심연의 손, 잠수화"""

BASIC = ('head_diver', 'body_diver', 'arm_diver', 'leg_diver')
UP = ('head_diver_up', 'body_diver_up', 'arm_diver_up', 'leg_diver_up')
CLEAN = "b.spawnInterval = 999; b.enemies.forEach(e => e.dom && e.dom.remove()); b.enemies = []; b.playerSpeed = 0;"


def spawn(typ, dx, hp=3000):
    """적 하나를 주인공 앞면 + dx에 세움 (움직이지 않고 공격도 안 함)"""
    return (f"(() => {{ const e = b.spawnMinion('{typ}', {{ x: b.frontX() + {dx}, elite: false }});"
            f" e.speed = 0; e.hp = e.maxHp = {hp}; e.dps = 0; e.dom.style.left = e.x + 'px'; return e; }})();")


def fresh_battle(g, build):
    g.battle(build, wait_ms=2900)
    g.wait(2900)   # 출격 인트로가 끝날 때까지
    g.js(CLEAN + "b.ultGauge = 0; b.skillCd = { arm: 0, body: 0 };")


def run(ctx):
    g = ctx.game(fresh=True)
    g.enter_v2()

    # 파츠 8개 + 스킬 구성
    st = g.js("""const { PARTS_DB } = await import('/js/data/parts.js');
        const { skillsForParts, legPassiveOf } = await import('/js/engine_v2/skills_v2.js');
        const get = (s, id) => PARTS_DB[s].find(p => p.id === id);
        const ids = ['head', 'body', 'arm', 'leg'].flatMap(s => PARTS_DB[s].filter(p => String(p.faction).includes('심연의 길잡이')).map(p => p.id));
        const sk = skillsForParts({ head: get('head', 'head_diver_up'), body: get('body', 'body_diver'), arm: get('arm', 'arm_diver') });
        return { ids, sk: [sk.arm && sk.arm.name, sk.body && sk.body.name, sk.head && sk.head.name],
                 leg: legPassiveOf(get('leg', 'leg_diver')).name, water: get('arm', 'arm_diver_up').attackType };""")
    ctx.check(len(st['ids']) == 8 and st['water'] == 'water', '파츠 8개 (머리·몸통·팔·다리 × 기본·강화), 팔은 물줄기 공격', str(st))
    ctx.check(st['sk'] == ['앵커 견인', '고압 분사', '심연의 손'] and st['leg'] == '잠수화',
              '스킬: 팔 앵커 견인 · 몸통 고압 분사 · 머리 심연의 손 · 다리 잠수화', str(st))

    # 연구소: 강화 파츠 카드는 강화 그림, 미리보기는 길잡이 + 강화 부위만 바뀜
    g.js(f"gameState.cartParts = {{ head: '{UP[0]}', body: '{BASIC[1]}', arm: '{UP[2]}', leg: '{BASIC[3]}' }};"
         "window.madOverlordGameV2.switchScreen('lab');")
    g.wait(1500)
    st = g.js("""const lab = window.madOverlordGameV2.labController;
        const card = [...document.querySelectorAll('#parts-grid-v2 .v2-partcard')].find(c => c.textContent.includes('심해 등불 잠수모'));
        const sk = lab.rig && lab.rig.skeleton;
        return { name: document.getElementById('lab-unit-name-v2').textContent, img: card && card.querySelector('img').getAttribute('src'),
                 parts: sk && ['head', 'torso', 'armF', 'armB', 'legF'].map(k => sk.byName[k].part) };""")
    ctx.check(st['name'] == '심연의 길잡이' and st['img'] and st['img'].endswith('head_up.png')
              and st['parts'] == ['head_up', 'torso', 'armF_up', 'armB_up', 'legF'],
              '연구소: 강화 카드 그림 + 미리보기는 강화 머리·팔만 바뀜', str(st))
    g.shot('diver_lab', '#screen-lab-v2')

    # 전투: 기본 파츠 → 리그 diver, 기본 그림
    fresh_battle(g, BASIC)
    st = g.js("""const sk = m.rigBattle.skeleton;
        return { id: m.getCharacterId(), type: b.attackType, arm: sk.byName.armF.part, alias: sk.socketAlias,
                 skills: [b.skills.arm.name, b.skills.body.name, b.skills.head.name] };""")
    ctx.check(st['id'] == 'diver' and st['type'] == 'water' and st['arm'] == 'armF' and not (st['alias'] or {}).get('muzzle'),
              '전투: 길잡이 리그, 기본 그림, 물줄기 공격', str(st))

    # 고압 방수포: 사거리 안 셋을 꿰뚫음
    g.js(spawn('guard', 40) + spawn('guard', 110) + spawn('guard', 180))
    g.wait(2500)
    st = g.js("return b.enemies.filter(e => !e.isBuilding).map(e => Math.round(e.maxHp - e.hp));")
    ctx.check(len(st) == 3 and all(d > 0 for d in st), '고압 방수포: 앞의 적 셋을 모두 꿰뚫음', str(st))
    g.shot('diver_jet', '#screen-battle-v2')

    # 앵커 견인: 가까운 경비병보다 멀리 있는 의무병을 끌어와 기절
    g.js(CLEAN + spawn('guard', 60) + spawn('medic', 520))
    x0 = g.js("return b.enemies.find(e => e.type === 'medic').x;")
    ok = g.js("return b.useSkill('arm');")
    g.wait(2000)   # 던지는 순간 0.45초 + 날아감 0.28초 + 감기 0.35초 (느린 컴퓨터에서 프레임이 밀려도 여유)
    st = g.js("const e = b.enemies.find(e => e.type === 'medic'); return e && { x: e.x, front: b.frontX(), stun: e.stunT > 0, hurt: e.hp < e.maxHp };")
    ctx.check(ok and st and st['x'] < x0 - 300 and st['x'] < st['front'] + 80 and st['stun'] and st['hurt'],
              '앵커 견인: 멀리 있는 의무병을 발 앞으로 끌어와 기절', f'x0={x0} {st}')
    g.shot('diver_anchor', '#screen-battle-v2')

    # 고압 분사: 앞의 적을 밀어내고 감속
    g.js(CLEAN + spawn('guard', 30) + spawn('raider', 90))
    xs = g.js("return b.enemies.map(e => e.x);")
    ok = g.js("return b.useSkill('body');")
    g.wait(1800)   # 시전 0.42초 + 물결이 사거리 끝까지 약 0.7초
    st = g.js("return b.enemies.map(e => ({ x: e.x, slow: e.slowT > 0 }));")
    ctx.check(ok and len(st) == 2 and all(s['x'] > x + 40 and s['slow'] for s, x in zip(st, xs)),
              '고압 분사: 앞의 적을 밀어내고 감속', f'{xs} → {st}')

    # 심연의 손: 범위 안 적을 붙잡아(기절) 지속 피해
    g.js(CLEAN + spawn('guard', 40) + spawn('shield', 150) + spawn('tranq', 260) + "b.ultGauge = 1;")
    ok = g.js("return b.useSkill('head');")
    g.wait(2000)   # 필살기 컷인 슬로모션(1초) 뒤
    st = g.js("return b.enemies.map(e => ({ held: e.stunT > 0, abyss: e.abyssT > 0, hp: Math.round(e.hp) }));")
    g.shot('diver_hands', '#screen-battle-v2')
    g.wait(1000)
    hp2 = g.js("return b.enemies.map(e => Math.round(e.hp));")
    ctx.check(ok and len(st) == 3 and all(s['held'] and s['abyss'] for s in st) and all(h < s['hp'] for h, s in zip(hp2, st)),
              '심연의 손: 범위 안 적을 붙잡고 계속 피해', f'{st} → {hp2}')

    # 잠수화: 감속 시간 절반, 밀려남 60% 감소
    # 위치를 정하고 바로 같은 호출에서 밀어냄 (호출 사이에 한 프레임이 지나면 주인공이 제자리 x 150으로 걸어 돌아감)
    g.js(CLEAN + "b.pSlowT = 0;")
    st = g.js("b.monsterX = 400; b.applyPlayerSlow(4, true); const slow = b.pSlowT; b.knockPlayerBack(100); return { slow, x: b.monsterX };")
    ctx.check(abs(st['slow'] - 2) < 0.05 and abs(st['x'] - 360) < 0.5, '잠수화: 감속 시간 절반, 밀려남 60% 감소', str(st))

    # 강화 파츠: 부위 그림이 강화로, 총구는 더 긴 강화 물대포 끝
    g.js("b.stopBattle();")
    fresh_battle(g, UP)
    st = g.js("""const sk = m.rigBattle.skeleton;
        return { parts: ['head', 'torso', 'armF', 'armB', 'legF', 'legB'].map(k => sk.byName[k].part), alias: sk.socketAlias };""")
    ctx.check(st['parts'] == ['head_up', 'torso_up', 'armF_up', 'armB_up', 'legF_up', 'legB_up'] and st['alias'].get('muzzle') == 'muzzleUp',
              '강화 파츠: 모든 부위 강화 그림, 총구 = 강화 물대포 끝', str(st))
    g.js(spawn('guard', 60) + spawn('guard', 150))
    g.wait(1500)
    g.shot('diver_up_battle', '#screen-battle-v2')
    g.js("b.stopBattle();")
