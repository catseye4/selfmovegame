"""뒤틀린 인형사 (새 캐릭터 4, D-049): 파츠 8개·연구소, 리그 연결(기본·강화 그림),
가위 참격(방어 일부 무시), X자, 인형 가족(토끼 인형: 붙잡기·터짐), 인형 실(꼭두각시), 실 걸음"""

BASIC = ('head_doll', 'body_doll', 'arm_doll', 'leg_doll')
UP = ('head_doll_up', 'body_doll_up', 'arm_doll_up', 'leg_doll_up')
CLEAN = ("b.spawnInterval = 999; b.enemies.forEach(e => e.dom && e.dom.remove()); b.enemies = []; b.playerSpeed = 0;"
         "b.allies.forEach(a => a.dom && a.dom.remove()); b.allies = [];")


def spawn(typ, dx, hp=3000, dps=0):
    """적 하나를 주인공 앞면 + dx에 세움 (움직이지 않음)"""
    return (f"(() => {{ const e = b.spawnMinion('{typ}', {{ x: b.frontX() + {dx}, elite: false }});"
            f" e.speed = 0; e.hp = e.maxHp = {hp}; e.dps = {dps}; e.dom.style.left = e.x + 'px'; return e; }})();")


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
        const ids = ['head', 'body', 'arm', 'leg'].flatMap(s => PARTS_DB[s].filter(p => String(p.faction).includes('뒤틀린 인형사')).map(p => p.id));
        const sk = skillsForParts({ head: get('head', 'head_doll'), body: get('body', 'body_doll_up'), arm: get('arm', 'arm_doll') });
        return { ids, sk: [sk.arm && sk.arm.name, sk.body && sk.body.name, sk.head && sk.head.name],
                 leg: legPassiveOf(get('leg', 'leg_doll')).name, type: get('arm', 'arm_doll_up').attackType };""")
    ctx.check(len(st['ids']) == 8 and st['type'] == 'scissors', '파츠 8개 (머리·몸통·팔·다리 × 기본·강화), 팔은 가위 공격', str(st))
    ctx.check(st['sk'] == ['가위 참격 X자', '인형 가족', '인형 실'] and st['leg'] == '실 걸음',
              '스킬: 팔 가위 참격 X자 · 몸통 인형 가족 · 머리 인형 실 · 다리 실 걸음', str(st))

    # 연구소: 강화 팔 → 팔 두 조각이 강화 그림
    g.js(f"gameState.cartParts = {{ head: '{BASIC[0]}', body: '{BASIC[1]}', arm: '{UP[2]}', leg: '{BASIC[3]}' }};"
         "window.madOverlordGameV2.switchScreen('lab');")
    g.wait(1500)
    st = g.js("""const lab = window.madOverlordGameV2.labController;
        document.querySelector('.tab-btn-v2[data-slot="arm"]').click();
        const card = [...document.querySelectorAll('#parts-grid-v2 .v2-partcard')].find(c => c.textContent.includes('가위 집게·대포 팔'));
        const sk = lab.rig && lab.rig.skeleton;
        return { name: document.getElementById('lab-unit-name-v2').textContent, img: card && card.querySelector('img').getAttribute('src'),
                 parts: sk && ['head', 'torso', 'armF', 'armB', 'legF'].map(k => sk.byName[k].part) };""")
    ctx.check(st['name'] == '뒤틀린 인형사' and st['img'] and st['img'].endswith('armF_up.png')
              and st['parts'] == ['head', 'torso', 'armF_up', 'armB_up', 'legF'],
              '연구소: 강화 카드 그림 + 미리보기는 강화 팔만 바뀜', str(st))
    g.shot('doll_lab', '#screen-lab-v2')

    # 전투: 기본 파츠 → 리그 doll
    fresh_battle(g, BASIC)
    st = g.js("return { id: m.getCharacterId(), type: b.attackType, skills: [b.skills.arm.name, b.skills.body.name, b.skills.head.name] };")
    ctx.check(st['id'] == 'doll' and st['type'] == 'scissors', '전투: 뒤틀린 인형사 리그, 가위 공격', str(st))

    # 가위 참격: 방패병(방어)에게도 피해가 더 들어감 (방어 절반 무시)
    st = g.js(spawn('shield', 60, hp=9000) + """const e = b.enemies[0]; const h0 = e.hp;
        b.dealDamageToEnemy(e, 100, false, { pierce: 0.5 }); const pierced = h0 - e.hp;
        const h1 = e.hp; b.dealDamageToEnemy(e, 100, false); return { pierced, normal: h1 - e.hp, armor: e.armor };""")
    ctx.check(st['pierced'] > st['normal'] > 0, '가위: 방패병 방어를 일부 무시', str(st))
    g.js(CLEAN + spawn('guard', 50) + spawn('raider', 90))
    g.wait(2500)
    st = g.js("return b.enemies.map(e => e.hp < e.maxHp);")
    ctx.check(len(st) == 2 and all(st), '가위 참격: 앞의 적 + 뒤에 붙은 적 휩쓸기', str(st))

    # 가위 참격 X자: 앞의 적 모두 큰 피해
    g.js(CLEAN + spawn('guard', 30) + spawn('shield', 110) + spawn('raider', 600))
    ok = g.js("return b.useSkill('arm');")
    g.wait(1200)
    st = g.js("return b.enemies.map(e => Math.round(e.maxHp - e.hp));")
    ctx.check(ok and st[0] > 300 and st[1] > 300 and st[2] == 0, '가위 참격 X자: 앞의 적 모두 큰 피해 (먼 적은 그대로)', str(st))
    g.shot('doll_xcut', '#screen-battle-v2')

    # 인형 가족: 토끼 인형 3기 → 적을 붙잡음(멈춤) → 쓰러지면 터져 둘레 피해
    g.js(CLEAN + spawn('guard', 240, hp=9000, dps=0))
    ok = g.js("return b.useSkill('body');")
    g.wait(1500)
    st = g.js("return { n: b.allies.filter(a => a.kind === 'rabbit').length, cls: b.allies[0] && b.allies[0].dom.className };")
    ctx.check(ok and st['n'] == 3 and 'doll-rabbit-v2' in (st['cls'] or ''), '인형 가족: 토끼 인형 3기 소환 (토끼 그림)', str(st))
    g.wait(2500)
    st = g.js("const e = b.enemies[0]; return { held: e.stunT > 0, grab: b.allies.some(a => a.attacking) };")
    ctx.check(st['held'] and st['grab'], '토끼 인형이 적을 붙잡음 (적 멈춤)', str(st))
    g.shot('doll_family', '#screen-battle-v2')
    st = g.js("""const e = b.enemies[0]; const h0 = e.hp; const r = b.allies.find(a => a.kind === 'rabbit');
        b.damageAlly(r, 99999); return { burst: Math.round(h0 - e.hp), left: b.allies.length };""")
    ctx.check(st['burst'] > 0 and st['left'] == 2, '토끼 인형이 쓰러지면 터져 둘레 피해', str(st))

    # 실 걸음: 토끼 인형 2기 → 진격 속도 +10%
    st = g.js("b.pStunT = 0; b.pRootT = 0; b.pSlowT = 0; return b.moveMul();")
    ctx.check(abs(st - 1.1) < 0.001, '실 걸음: 토끼 인형 둘 → 진격 속도 ×1.1', str(st))

    # 인형 실: 적이 꼭두각시가 되어 멈춘 채 다른 적을 때림
    g.js(CLEAN + spawn('guard', 40, hp=5000, dps=40) + spawn('raider', 110, hp=5000, dps=40) + "b.ultGauge = 1;")
    ok = g.js("return b.useSkill('head');")
    g.wait(2000)   # 필살기 컷인 슬로모션(1초) + 시전
    hp0 = g.js("return b.enemies.map(e => e.hp);")
    g.wait(1500)
    st = g.js("""return b.enemies.map((e, i) => ({ puppet: e.puppetT > 0, held: e.stunT > 0, icon: !!e.dom.querySelector('.is-puppet'),
                  hurt: Math.round(e.hp) }));""")
    g.shot('doll_puppet', '#screen-battle-v2')
    ctx.check(ok and all(s['puppet'] and s['held'] and s['icon'] for s in st) and all(s['hurt'] < h for s, h in zip(st, hp0)),
              '인형 실: 적들이 꼭두각시가 되어 멈추고 서로 때림', f'{hp0} → {st}')

    # 강화 파츠: 부위 그림이 강화로, 가위·뒷손 소켓 바꿈
    g.js("b.stopBattle();")
    fresh_battle(g, UP)
    st = g.js("""const sk = m.rigBattle.skeleton;
        return { parts: ['head', 'torso', 'armF', 'armB', 'legF', 'legB'].map(k => sk.byName[k].part), alias: sk.socketAlias };""")
    ctx.check(st['parts'] == ['head_up', 'torso_up', 'armF_up', 'armB_up', 'legF_up', 'legB_up']
              and st['alias'].get('blade') == 'bladeUp' and st['alias'].get('hand') == 'cannon',
              '강화 파츠: 모든 부위 강화 그림, 가위 끝·대포 소켓', str(st))
    g.js(spawn('guard', 60) + spawn('guard', 150))
    g.wait(1500)
    g.shot('doll_up_battle', '#screen-battle-v2')
    g.js("b.stopBattle();")
