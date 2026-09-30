"""메인 화면·연구소·저장: 로딩 화면, 화면 크기 맞춤, 파츠 구매(소유)·재장착 무료·강화, 새로고침 후 유지"""


def run(ctx):
    g = ctx.game(fresh=True)
    g.enter_v2()

    # 로딩이 끝나고 메인 화면이 보임
    st = g.js("""return { name: document.getElementById('menu-unit-name-v2').textContent,
        callouts: document.querySelectorAll('#menu-callouts-v2 li').length,
        scale: getComputedStyle(document.documentElement).getPropertyValue('--v2-scale').trim(),
        loaded: sound.buffers.size, dm: gameState.darkMatter };""")
    ctx.check(st['name'] == '거대로봇', '메인: 기본 캐릭터 표시 (거대로봇)', st['name'])
    ctx.check(st['callouts'] == 4, '메인: 부위 설명 4칸')
    ctx.check(st['scale'] not in ('', '0'), '화면 크기 맞춤 배율 적용', st['scale'])
    ctx.check(st['loaded'] >= 60, '로딩: 효과음 미리 받기', str(st['loaded']))
    g.shot('menu_main', '#screen-menu-v2')

    # 연구소: 타락 히어로 몸통 구매 (800 DM)
    g.page.click('#btn-to-lab-v2')
    g.wait(900)
    g.page.click('.v2-slottab[data-slot="body"]')
    g.page.locator('.v2-partcard', has_text='흑마법 룬 갑옷').click()
    g.wait(300)
    before = g.js('return gameState.darkMatter;')
    g.page.click('#btn-equip-confirm-v2')
    g.wait(300)
    st = g.js("return { dm: gameState.darkMatter, body: gameState.equippedParts.body, owned: progress.isOwned('body_hero') };")
    ctx.check(st['body'] == 'body_hero' and st['owned'], '연구소: 파츠 구매 후 장착·보유')
    ctx.check(before - st['dm'] == 800, '연구소: 구매 비용 800 DM 차감', f"{before} → {st['dm']}")

    # 기본 몸통으로 바꿨다가 다시 히어로 몸통 → 보유 중이라 무료
    g.page.locator('.v2-partcard', has_text='기본 가슴').click()
    g.page.click('#btn-equip-confirm-v2')
    g.wait(200)
    g.page.locator('.v2-partcard', has_text='흑마법 룬 갑옷').click()
    cost = g.js('return progress.cartCost();')
    ctx.check(cost == 0, '보유 파츠 다시 장착은 무료', str(cost))
    g.page.click('#btn-equip-confirm-v2')
    g.wait(200)

    # 강화: Lv1 → Lv2, 비용 차감, 능력치 상승
    hp1 = g.js('return progress.equippedStats().hp;')
    dm1 = g.js('return gameState.darkMatter;')
    up_cost = g.js("return progress.upgradeCost('body_hero');")
    g.page.click('#btn-upgrade-v2')
    g.wait(300)
    st = g.js("return { lv: progress.levelOf('body_hero'), hp: progress.equippedStats().hp, dm: gameState.darkMatter };")
    ctx.check(st['lv'] == 2, '강화: Lv1 → Lv2', str(st['lv']))
    ctx.check(dm1 - st['dm'] == up_cost, '강화: 비용 차감', f'{up_cost}')
    ctx.check(st['hp'] > hp1, '강화: 능력치 상승 (HP)', f"{hp1} → {st['hp']}")
    g.shot('lab_upgrade', '#screen-lab-v2')

    # 새로고침 후에도 유지
    saved = g.js('return { dm: gameState.darkMatter };')
    g.reload_v2()
    st = g.js("return { dm: gameState.darkMatter, body: gameState.equippedParts.body, owned: progress.isOwned('body_hero'), lv: progress.levelOf('body_hero') };")
    ctx.check(st['dm'] == saved['dm'], '저장: DM 유지', f"{saved['dm']} / {st['dm']}")
    ctx.check(st['body'] == 'body_hero' and st['owned'] and st['lv'] == 2, '저장: 장착·보유·강화 레벨 유지', str(st))
    name = g.js("return document.getElementById('menu-unit-name-v2').textContent;")
    ctx.check(name == '타락 히어로', '저장: 새로고침 후 메인 캐릭터 = 타락 히어로', name)

    # 전투 능력치에 강화 반영
    g.battle(None, wait_ms=500)
    hp = g.js('return b.maxPlayerHp;')
    ctx.check(hp == g.js('return progress.equippedStats().hp;'), '전투 최대 체력 = 강화 반영 능력치', str(hp))

    # 화면 크기 맞춤: 창이 크면 확대
    g.page.set_viewport_size({'width': 1920, 'height': 1080})
    g.wait(300)
    k = float(g.js("return getComputedStyle(document.documentElement).getPropertyValue('--v2-scale');"))
    ctx.check(1.4 < k < 1.5, '창 1920x1080 → 약 1.48배 확대', f'{k:.3f}')
