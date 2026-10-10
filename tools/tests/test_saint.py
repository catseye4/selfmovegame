"""봉합 성녀 (새 캐릭터 2, D-046): 파츠 8개·연구소, 리그 연결(기본·강화 그림 바꿔 끼우기),
봉합 주사(표식 → 시체), 3연발, 생명 봉인, 억지 부활(시체·약한 적 → 아군), 자가 봉합"""

BASIC = ('head_saint', 'body_saint', 'arm_saint', 'leg_saint')
UP = ('head_saint_up', 'body_saint_up', 'arm_saint_up', 'leg_saint_up')
CLEAN = ("b.spawnInterval = 999; b.enemies.forEach(e => e.dom && e.dom.remove()); b.enemies = []; b.playerSpeed = 0;"
         "b.allies.forEach(a => a.dom && a.dom.remove()); b.allies = []; b.corpses.forEach(c => c.dom && c.dom.remove()); b.corpses = [];")


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
        const ids = ['head', 'body', 'arm', 'leg'].flatMap(s => PARTS_DB[s].filter(p => String(p.faction).includes('봉합 성녀')).map(p => p.id));
        const sk = skillsForParts({ head: get('head', 'head_saint_up'), body: get('body', 'body_saint'), arm: get('arm', 'arm_saint') });
        return { ids, sk: [sk.arm && sk.arm.name, sk.body && sk.body.name, sk.head && sk.head.name],
                 leg: legPassiveOf(get('leg', 'leg_saint')).name, needle: get('arm', 'arm_saint_up').attackType };""")
    ctx.check(len(st['ids']) == 8 and st['needle'] == 'needle', '파츠 8개 (머리·몸통·팔·다리 × 기본·강화), 팔은 바늘 공격', str(st))
    ctx.check(st['sk'] == ['봉합 주사 3연발', '생명 봉인', '억지 부활'] and st['leg'] == '자가 봉합',
              '스킬: 팔 봉합 주사 3연발 · 몸통 생명 봉인 · 머리 억지 부활 · 다리 자가 봉합', str(st))

    # 연구소: 강화 카드 그림 + 미리보기는 강화 몸통·다리만 바뀜
    g.js(f"gameState.cartParts = {{ head: '{BASIC[0]}', body: '{UP[1]}', arm: '{BASIC[2]}', leg: '{UP[3]}' }};"
         "window.madOverlordGameV2.switchScreen('lab');")
    g.wait(1500)
    st = g.js("""const lab = window.madOverlordGameV2.labController;
        document.querySelector('.tab-btn-v2[data-slot="body"]').click();
        const card = [...document.querySelectorAll('#parts-grid-v2 .v2-partcard')].find(c => c.textContent.includes('수혈 부적 갑옷'));
        const sk = lab.rig && lab.rig.skeleton;
        return { name: document.getElementById('lab-unit-name-v2').textContent, img: card && card.querySelector('img').getAttribute('src'),
                 parts: sk && ['head', 'torso', 'armF', 'legF', 'legB'].map(k => sk.byName[k].part) };""")
    ctx.check(st['name'] == '봉합 성녀' and st['img'] and st['img'].endswith('torso_up.png')
              and st['parts'] == ['head', 'torso_up', 'armF', 'legF_up', 'legB_up'],
              '연구소: 강화 카드 그림 + 미리보기는 강화 몸통·다리만 바뀜', str(st))
    g.shot('saint_lab', '#screen-lab-v2')

    # 전투: 기본 파츠 → 리그 saint
    fresh_battle(g, BASIC)
    st = g.js("""const sk = m.rigBattle.skeleton;
        return { id: m.getCharacterId(), type: b.attackType, arm: sk.byName.armF.part,
                 skills: [b.skills.arm.name, b.skills.body.name, b.skills.head.name] };""")
    ctx.check(st['id'] == 'saint' and st['type'] == 'needle' and st['arm'] == 'armF', '전투: 봉합 성녀 리그, 기본 그림, 바늘 공격', str(st))

    # 봉합 주사: 꽂히면 봉합 표식 → 표식이 남은 채 쓰러지면 시체
    g.js(spawn('guard', 60, hp=400))
    g.wait(2500)
    st = g.js("""const e = b.enemies.find(e => e.type === 'guard');
        return { alive: !!e, mark: e ? e.stitchT > 0 : null, icon: e ? !!e.dom.querySelector('.is-stitch') : null,
                 corpses: b.corpses.length, dom: document.querySelectorAll('.v2-corpse').length };""")
    ctx.check(st['corpses'] >= 1 and st['dom'] >= 1 or (st['alive'] and st['mark'] and st['icon']),
              '봉합 주사: 바늘에 봉합 표식, 표식이 남은 채 쓰러지면 시체', str(st))
    if st['alive']:
        g.js("const e = b.enemies.find(e => e.type === 'guard'); e.hp = 1; b.dealDamageToEnemy(e, 10, false);")
        g.wait(300)
        st = g.js("return { corpses: b.corpses.length, dom: document.querySelectorAll('.v2-corpse').length };")
        ctx.check(st['corpses'] >= 1 and st['dom'] >= 1, '봉합된 적이 쓰러지면 시체가 남음', str(st))
    g.shot('saint_corpse', '#screen-battle-v2')

    # 3연발: 가까운 셋에게 바늘 → 묶임(기절) + 표식
    g.js(CLEAN + spawn('guard', 40) + spawn('raider', 110) + spawn('tranq', 180))
    ok = g.js("return b.useSkill('arm');")
    g.wait(900)   # 첫 발 0.2초 + 0.18초 간격 + 바늘 비행
    st = g.js("return b.enemies.map(e => ({ held: e.stunT > 0, mark: e.stitchT > 0, hurt: e.hp < e.maxHp }));")
    ctx.check(ok and len(st) == 3 and all(s['held'] and s['mark'] and s['hurt'] for s in st),
              '봉합 주사 3연발: 셋에게 피해 + 묶음 + 표식', str(st))

    # 생명 봉인: 장판 안 적은 묶이고 계속 피해, 장판 밖은 그대로
    g.js(CLEAN + spawn('guard', 60) + spawn('raider', 160) + spawn('guard', 420))
    hp0 = g.js("return b.enemies.map(e => e.hp);")
    ok = g.js("return b.useSkill('body');")
    g.wait(1600)
    st = g.js("return { seal: !!b.seal, e: b.enemies.map(e => ({ sealed: !!e.sealed, held: e.stunT > 0, hp: Math.round(e.hp) })) };")
    g.shot('saint_seal', '#screen-battle-v2')
    inside, outside = st['e'][:2], st['e'][2]
    ctx.check(ok and st['seal'] and all(s['sealed'] and s['held'] and s['hp'] < h for s, h in zip(inside, hp0[:2]))
              and not outside['sealed'], '생명 봉인: 장판 안 적을 묶고 계속 피해 (밖은 그대로)', f'{hp0} → {st}')
    g.wait(3500)
    ctx.check(g.js("return !b.seal;"), '생명 봉인: 4초 뒤 장판이 사라짐')

    # 억지 부활: 시체 둘 + 약한 적 하나 → 아군 셋 (적 그림 그대로)
    g.js(CLEAN + "b.addCorpse({ x: b.frontX() + 40, type: 'guard', maxHp: 400, dps: 30 });"
         "b.addCorpse({ x: b.frontX() + 90, type: 'shield', maxHp: 600, dps: 30 });"
         + spawn('raider', 200, hp=900) + spawn('guard', 260, hp=3000) + "b.enemies.find(e => e.type === 'raider').hp = 100; b.ultGauge = 1;")
    ok = g.js("return b.useSkill('head');")
    g.wait(2600)   # 필살기 컷인 슬로모션(1초) + 시전 + 일어남
    st = g.js("""return { allies: b.allies.map(a => ({ kind: a.kind, cls: a.dom.className })), corpses: b.corpses.length,
                     enemies: b.enemies.map(e => e.type) };""")
    kinds = [a['cls'] for a in st['allies']]
    ctx.check(ok and len(st['allies']) == 3 and all(a['kind'] == 'stitch' for a in st['allies']) and st['corpses'] == 0
              and any('v2-stitch-shield' in c for c in kinds) and any('v2-stitch-raider' in c for c in kinds)
              and st['enemies'] == ['guard'],
              '억지 부활: 시체 둘 + 체력 낮은 적 하나를 꿰매 아군 셋', str(st))
    g.wait(800)
    g.shot('saint_revive', '#screen-battle-v2')

    # 자가 봉합: 다칠수록 빨리 회복
    g.js(CLEAN + "b.playerHp = b.maxPlayerHp * 0.3;")
    g.wait(1000)
    st = g.js("return { hp: b.playerHp / b.maxPlayerHp };")
    ctx.check(st['hp'] > 0.31, '자가 봉합: 내구도가 낮으면 회복', str(st))

    # 강화 파츠: 부위 그림이 강화로, 총구 = 이중 주사기 가운데
    g.js("b.stopBattle();")
    fresh_battle(g, UP)
    st = g.js("""const sk = m.rigBattle.skeleton;
        return { parts: ['head', 'torso', 'armF', 'armB', 'legF', 'legB'].map(k => sk.byName[k].part), alias: sk.socketAlias };""")
    ctx.check(st['parts'] == ['head_up', 'torso_up', 'armF_up', 'armB_up', 'legF_up', 'legB_up']
              and st['alias'].get('muzzle') == 'muzzleUp', '강화 파츠: 모든 부위 강화 그림, 총구 = 이중 주사기', str(st))
    g.js(spawn('guard', 60) + spawn('guard', 150))
    g.wait(1500)
    g.shot('saint_up_battle', '#screen-battle-v2')
    g.js("b.stopBattle();")
