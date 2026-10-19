"""리그 테스트 화면: 8캐릭터 모든 파츠 미리보기, 적 기술·구역·엘리트 속성, 세트 그림."""

from urllib.parse import urlparse


CHARACTERS = ('mech', 'kaiju', 'hero', 'chimera', 'diver', 'saint', 'frost', 'doll')
ENEMIES = ('guardian', 'scrapking', 'archbishop', 'oculus', 'mage', 'sporer', 'slime')
AFFIXES = ('swift', 'shielded', 'thorns', 'regen', 'frost', 'toxic', 'volatile', 'iron')


def advance(page, sec=10):
    # 예약 콜백·투사체 도착·소멸까지 실행하고 중간 프레임도 그린다 (내부 물리는 1/120초).
    page.evaluate("""sec => {
        for (let t = 0; t < sec; t += 0.1) rigTest.step(0.1);
    }""", sec)
    page.wait_for_timeout(50)


def run(ctx):
    # ctx.game()은 index.html 전용이므로 같은 서버에 테스트 화면을 직접 연다.
    browser = ctx.pw.chromium.launch(channel='chrome', args=['--autoplay-policy=no-user-gesture-required'])
    page = browser.new_page(viewport={'width': 1440, 'height': 1000})
    errors, current = [], ['초기화']

    def console_error(msg):
        if msg.type != 'error':
            return
        source = msg.location.get('url', '')
        host = urlparse(source).hostname
        external = host and host != urlparse(ctx.base).hostname
        resource_error = 'Failed to load resource' in msg.text or 'net::ERR_' in msg.text
        if resource_error and (external or urlparse(source).path == '/favicon.ico'):
            return   # Google Fonts 등 외부 리소스 접근 실패만 무시 (로컬 파일 오류는 잡음)
        errors.append(f'{current[0]} console: {msg.text[:300]} ({source})')

    page.on('pageerror', lambda e: errors.append(f'{current[0]} pageerror: {(e.stack or str(e))[:500]}'))
    page.on('console', console_error)
    try:
        page.goto(ctx.base + '/rig_test.html', wait_until='domcontentloaded')
        page.wait_for_function('window.rigTest && window.rigTest.ready')
        page.evaluate('async () => { await rigTest.ready; rigTest.pause(); }')
        ctx.check(True, 'rig_test.html 초기화 완료')

        for character in CHARACTERS:
            current[0] = character
            page.evaluate('id => rigTest.setCharacter(id)', character)
            skills = page.evaluate('rigTest.skills()')
            missing = [s['id'] for s in skills if not s['preview']]
            ctx.check(bool(skills) and not missing, f'{character}: 모든 파츠에 미리보기 ({len(skills)}개)', str(missing))
            for skill in skills:
                current[0] = f"{character}/{skill['id']}"
                # 지속 장판·버프와 이전 예약을 비워 각 파츠를 독립적으로 검증한다.
                page.evaluate('id => rigTest.setCharacter(id)', character)
                played = page.evaluate('id => { const ok = rigTest.playSkill(id); rigTest.step(1 / 60); return ok; }', skill['id'])
                ctx.check(played, f"{current[0]} 재생")
                advance(page)

        current[0] = '세트 장착'
        page.evaluate("async () => { await rigTest.setCharacter('mech'); rigTest.equip('head_mech_a'); }")
        alias = page.evaluate('rigTest.info.alias.head')
        ctx.check(alias == 'head_a', '거대로봇 A 머리 세트 그림 = head_a', str(alias))

        page.evaluate("rigTest.setTab('enemy')")
        for enemy in ENEMIES:
            current[0] = enemy
            page.evaluate('id => rigTest.setEnemy(id)', enemy)
            skills = page.evaluate('rigTest.enemySkills()')
            ctx.check(bool(skills), f'{enemy}: 적 기술 목록 있음')
            for i, name in enumerate(skills):
                current[0] = f'{enemy}/{name}'
                played = page.evaluate('i => { const ok = rigTest.playEnemySkill(i); rigTest.step(1 / 60); return ok; }', i)
                ctx.check(played, f'{current[0]} 재생')
                advance(page, 4)

        for i in range(5):
            current[0] = f'구역 이펙트 {i}'
            played = page.evaluate('i => { const ok = rigTest.playZoneFx(i); rigTest.step(1 / 60); return ok; }', i)
            ctx.check(played, f'{current[0]} 재생')
            advance(page, 4)

        page.evaluate("rigTest.setEnemy('guard')")
        for affix in AFFIXES:
            current[0] = f'엘리트 속성 {affix}'
            page.evaluate('id => { rigTest.toggleAffix(id); rigTest.step(1 / 60); }', affix)
            ctx.check(affix in page.evaluate('rigTest.info.affixes'), f'{current[0]} 켜기')
            advance(page, 3)
            page.evaluate('id => rigTest.toggleAffix(id)', affix)
            ctx.check(affix not in page.evaluate('rigTest.info.affixes'), f'{current[0]} 끄기')
    finally:
        ctx.check(not errors, '페이지·콘솔 오류 없음 (외부 리소스 실패 제외)', '; '.join(errors[:8]))
        browser.close()
