"""기존 4종 A·B 세트 (D-050 파츠 확장 1차): 파츠 32개 데이터, 세트마다 기본 공격·스킬 1·2·필살기, 다리 패시브 8종,
부위 그림 바꿔 끼우기(거대괴수 세트 그림 / 다른 캐릭터 세트 색), 연구소 카드"""

CHARS = ('mech', 'kaiju', 'hero', 'chimera')
SETS = {f'{c}_{v}': tuple(f'{s}_{c}_{v}' for s in ('head', 'body', 'arm', 'leg')) for c in CHARS for v in ('a', 'b')}

# 세트마다 스킬을 쓴 뒤 남아 있어야 하는 효과 (JS 식, b = 전투 엔진, m = 캐릭터 화면)
EFFECT = {
    'mech_a': ('자동 포탑 연사 중', 'b.turretT > 0'),
    'mech_b': ('오버드라이브 (공격 동작 1.5배)', "!!b.buffs.overdrive && Math.abs(m.rigBattle.timeScale - 1.5) < 0.01"),
    'kaiju_a': ('가시 갑옷 + 출혈', '!!b.buffs.thornArmor && b.enemies.some(e => e.bleedT > 0)'),
    'kaiju_b': ('독안개 구역', 'b.zones.length > 0'),
    'hero_a': ('피의 서약', '!!b.buffs.bloodOath'),
    'hero_b': ('분신 2명 + 블랙홀 + 사슬 속박', "document.querySelectorAll('.v2-clone').length === 2 && !!b.blackHole && b.enemies.some(e => e.rootT > 0)"),
    'chimera_a': ('아드레날린', '!!b.buffs.adrenaline'),
    'chimera_b': ('총동원령 졸개 4기 + 졸개 강화', 'b.allies.length >= 4 && !!b.buffs.mobilize && !!b.buffs.boost')
}


def run(ctx):
    g = ctx.game(fresh=True)
    g.enter_v2()

    # ---- 데이터: 파츠 32개 · 스킬 · 패시브 · 아이콘 ----
    st = g.js("""const { PARTS_DB } = await import('/js/data/parts.js');
        const { PART_SKILL, SKILLS, LEG_PASSIVES } = await import('/js/engine_v2/skills_v2.js');
        const { characterOfPart } = await import('/js/engine_v2/roster_v2.js');
        const { icon } = await import('/js/ui_v2/icons.js');
        const all = Object.values(PARTS_DB).flat().filter(p => /_(a|b)$/.test(p.id) && p.rigVariant);
        const noSkill = all.filter(p => (p.id.startsWith('leg_') ? !LEG_PASSIVES[p.id] : !SKILLS[PART_SKILL[p.id]])).map(p => p.id);
        const wrongChar = all.filter(p => !p.id.includes('_' + characterOfPart(p) + '_')).map(p => p.id);
        const star = icon('star');
        const noIcon = Object.values(SKILLS).filter(s => icon(s.icon) === star).map(s => s.name);
        return { n: all.length, noSkill, wrongChar, noIcon };""")
    ctx.check(st['n'] == 32, f"세트 파츠 32개 ({st['n']})")
    ctx.check(not st['noSkill'], '세트 파츠마다 스킬·패시브가 있음', str(st['noSkill']))
    ctx.check(not st['wrongChar'], '세트 파츠의 캐릭터 판정이 맞음 (팩션 문자열)', str(st['wrongChar']))
    ctx.check(not st['noIcon'], '스킬마다 아이콘이 있음 (없으면 별 모양)', str(st['noIcon']))

    # ---- 세트마다 전투: 기본 공격 → 스킬 1·2·필살기 → 효과 ----
    for name, parts in SETS.items():
        g.battle(parts, wait_ms=1500)
        g.place_enemies(n=4, gap=45, first=110, hp=6000, speed=8, dps=8)
        g.wait(1800)
        hp0 = g.js("return b.enemies.filter(e => !e.isBuilding).map(e => e.hp);")
        ctx.check(any(h < 6000 for h in hp0), f'{name}: 기본 공격({parts[2]})이 적에게 피해', str([round(h) for h in hp0]))
        used = g.js("""b.skillCd.arm = 0; b.skillCd.body = 0; b.ultGauge = 1;
            return ['arm', 'body', 'head'].map(s => b.useSkill(s));""")
        ctx.check(all(used), f'{name}: 스킬 1·2·필살기 사용', str(used))
        g.wait(1800)
        desc, expr = EFFECT[name]
        ctx.check(g.js(f'return {expr};'), f'{name}: {desc}', str(g.js(
            "return { buffs: Object.keys(b.buffs), zones: b.zones.length, turret: b.turretT, allies: b.allies.length };")))
        hp1 = g.js("return b.enemies.filter(e => !e.isBuilding).reduce((s, e) => s + e.hp, 0) + (6000 * (4 - b.enemies.filter(e => !e.isBuilding).length));")
        ctx.check(hp1 < sum(hp0), f'{name}: 스킬이 적에게 피해', f'{round(sum(hp0))} → {round(hp1)}')
        if name.startswith('kaiju'):
            v = name[-1]
            alias = g.js("return m.rigBattle.skeleton && m.rigBattle.skeleton.partAlias;") or {}
            ctx.check(alias.get('head') == f'head_{v}' and alias.get('armF') == f'armF_{v}', f'{name}: 세트 부위 그림으로 바꿔 그림', str(alias))
        else:
            f = g.js("return m.rigBattle.partFilters || {};")
            ctx.check(len(f) > 0, f'{name}: 세트 그림이 아직 없어 세트 색으로 구분', str(list(f)[:4]))
        g.shot(f'set_{name}', '#screen-battle-v2')

    # ---- 다리 패시브 8종 ----
    def leg(build, setup, expr):
        g.battle(build, wait_ms=500)
        g.js(f"b.enemies.filter(e => !e.isBuilding).forEach(e => {{ e.dom && e.dom.remove(); }}); b.enemies = b.enemies.filter(e => e.isBuilding); {setup}")
        return g.js(f'return {expr};')

    ctx.check(leg(SETS['mech_a'], 'b.isAttacking = true;', 'Math.abs(b.dmgMul() - 1.2) < 1e-6'), '포격 고정: 멈춰 공격하는 동안 피해 +20%')
    ctx.check(leg(SETS['mech_b'], '', 'b.rangedMul() === 0.5'), '자기장 방벽: 원거리 피해·효과 50%')
    st = leg(SETS['kaiju_a'], 'b.monsterX = 300; b.knockPlayerBack(130);', '[b.incomingMul(), b.monsterX]')
    ctx.check(abs(st[0] - 0.85) < 1e-6 and st[1] == 300, '단단한 껍질: 받는 피해 -15%, 자석에 밀려나지 않음', str(st))
    ctx.check(leg(SETS['kaiju_b'], '', 'Math.abs(b.moveBuffMul() - 1.3) < 1e-6'), '질주 본능: 앞에 적이 없으면 진격 +30%')
    ctx.check(leg(SETS['hero_a'], 'b.playerHp = b.maxPlayerHp * 0.2;', 'Math.abs(b.incomingMul() - 0.6) < 1e-6'), '불굴: 내구도 30% 아래에서 받는 피해 -40%')
    ctx.check(leg(SETS['hero_b'], '', 'Math.abs(b.setIncoming(100, 0.016, null) - 75) < 1e-6'), '그림자 회피: 계속 맞는 피해 25% 무시')
    st = leg(SETS['chimera_a'], "b.spawnMinion('guard', { x: b.frontX() + 40 }); const e = b.enemies.find(o => !o.isBuilding); e.hp = e.maxHp = 5000; b.onFootstep();",
             "b.enemies.find(o => !o.isBuilding).hp")
    ctx.check(st < 5000, '짓밟기: 걸음마다 앞쪽 충격파', str(st))
    st = leg(SETS['chimera_b'], "for (let i = 0; i < 4; i++) b.spawnAllyMinion(b.monsterX + 60 + i * 30, 'chimera');", 'b.dmgMul()')
    ctx.check(abs(st - 1.2) < 1e-6, '졸개 지휘: 졸개 4기 → 주는 피해 +20%', str(st))

    # ---- 연구소: 거대괴수는 부위마다 기본 + A + B, 세트 카드는 세트 그림 ----
    g.js("b.stopBattle(); progress.selectCharacter('kaiju'); window.madOverlordGameV2.switchScreen('menu');")
    g.wait(500)
    g.page.click('#btn-to-lab-v2')
    g.wait(600)
    g.page.click('.v2-slottab[data-slot="head"]')
    st = g.js("""return [...document.querySelectorAll('#parts-grid-v2 .v2-partcard')].map(c => ({
        name: c.querySelector('.v2-partcard__name').textContent, img: (c.querySelector('img') || {}).getAttribute?.('src') || '' }));""")
    ctx.check(len(st) == 3 and st[1]['img'].endswith('head_a.png') and st[2]['img'].endswith('head_b.png'),
              '연구소: 거대괴수 머리 3장 (기본·A·B), 세트 카드는 세트 그림', str(st))
    g.shot('set_lab_kaiju', '#screen-lab-v2')
