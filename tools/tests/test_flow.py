"""전투 흐름: 인트로 → 요새 경고·파괴 → 최종 기지 → 승리 결과 → 다시 출격 → 패배 결과 → 연구소 이동"""


def destroy_base(g):
    g.js("const bd = b.enemies.find(e => e.isBuilding); if (bd) { bd.hp = 1; b.dealDamageToEnemy(bd, 50, true, { knock: 0 }); }")


def run(ctx):
    g = ctx.game(fresh=True)
    g.enter_v2()
    g.page.click('#btn-to-battle-v2')
    g.wait(400)
    ctx.check(g.js("return !!document.querySelector('.v2-opcard');"), '출격 인트로 표시')
    g.wait(2800)
    ctx.check(g.js("return !document.querySelector('.v2-battle').classList.contains('v2-intro');"), '인트로 후 HUD 표시')

    # 요새 → 경고 → 파괴
    g.js("b.spawnInterval = 999; b.distanceTraveled = b.stage ? b.stage.midAt - 0.5 : 449.5;")
    g.wait(700)
    ctx.check(g.js("return !!document.querySelector('.v2-warning');"), '요새 출현 경고')
    g.wait(1800)
    destroy_base(g)
    g.wait(2500)
    ctx.check(g.js('return b.midBaseDestroyed && b.stars >= 1;'), '요새 파괴 → 별 1')

    # 최종 기지 → 승리 → 결과
    g.js("b.enemies.filter(e => !e.isBuilding).forEach(e => e.dom.remove()); b.enemies = b.enemies.filter(e => e.isBuilding); b.distanceTraveled = b.stage ? b.stage.finalAt - 0.5 : 899.5;")
    g.wait(2600)
    ctx.check(g.js('return b.finalBaseSpawned;'), '최종 기지 출현')
    destroy_base(g)
    g.wait(7000)
    st = g.js("return { result: !!document.querySelector('.v2-result.is-win'), active: b.isActive };")
    ctx.check(st['result'] and not st['active'], '승리 결과 화면', str(st))
    g.shot('flow_result_win', '#screen-battle-v2')

    # 다시 출격 → 패배
    g.page.click('.v2-result [data-act="retry"]')
    g.wait(3200)
    ctx.check(g.js("return b.isActive && !document.querySelector('.v2-result');"), '다시 출격 (이전 결과 화면 정리)')
    g.js('b.playerHp = 0;')
    g.wait(3000)
    ctx.check(g.js("return !!document.querySelector('.v2-result.is-lose');"), '패배 결과 화면')
    g.page.click('.v2-result [data-act="lab"]')
    g.wait(700)
    ctx.check(g.js("return document.getElementById('screen-lab-v2').classList.contains('active');"), '결과 화면 → 연구소 이동')
