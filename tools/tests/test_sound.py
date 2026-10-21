"""사운드: 효과음 로드, 배경음 전환(메뉴 → 전투 → 보스), 저체력 심장 박동, 설정 저장"""


def run(ctx):
    g = ctx.game(fresh=True)
    g.enter_v2()
    st = g.js("return { state: sound.ctx && sound.ctx.state, loaded: sound.buffers.size, total: Object.keys(SFX).length, bgm: sound.bgm && sound.bgm.name };")
    ctx.check(st['state'] == 'running', '소리 켜짐 (AudioContext running)', str(st['state']))
    ctx.check(st['loaded'] == st['total'], '효과음 전부 로드', f"{st['loaded']}/{st['total']}")
    ctx.check(st['bgm'] == 'menu', '메인 화면 배경음 = menu', str(st['bgm']))

    g.battle('mech', wait_ms=1500)
    ctx.check(g.js('return sound.bgm && sound.bgm.name;') == 'battle', '전투 배경음 = battle')
    g.js('b.playerHp = b.maxPlayerHp * 0.2;')
    g.wait(400)
    ctx.check(g.js("return sound.loops.has('low_hp');"), '저체력: 심장 박동 반복')
    g.js('b.playerHp = b.maxPlayerHp;')
    g.wait(400)
    ctx.check(not g.js("return sound.loops.has('low_hp');"), '체력 회복: 심장 박동 멈춤')
    g.js("b.spawnInterval = 999; b.enemies.forEach(e => e.dom && e.dom.remove()); b.enemies = []; b.midBaseSpawned = true; b.midBaseDestroyed = true; b.distanceTraveled = b.stage ? b.stage.finalAt - 0.5 : 899.5;")
    g.wait(1500)
    ctx.check(g.js('return sound.bgm && sound.bgm.name;') == 'boss', '최종 기지 배경음 = boss')

    # 설정 저장
    g.js("settings.set('bgm', 0.3); settings.set('shake', false);")
    g.reload_v2()
    st = g.js("return { bgm: settings.get('bgm'), shake: settings.get('shake') };")
    ctx.check(st['bgm'] == 0.3 and st['shake'] is False, '설정 저장 (새로고침 후 유지)', str(st))
    g.js('settings.reset();')
