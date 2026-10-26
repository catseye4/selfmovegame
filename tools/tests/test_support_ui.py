"""D-071~D-073: 첫 충전, 상단 간략 효과 HUD, 효과 상세와 캐릭터 가림 방지."""
from test_support import setup


def hud(g):
    return g.js("""b.hud.updateSupport();
        const box = document.querySelector('.v2-support-hud'), call = box.querySelector('.v2-support-call');
        const gauge = box.querySelector('.v2-support-gauge');
        return { ...b.supportStatus(), disabled: call.disabled, pct: +gauge.getAttribute('aria-valuenow'),
            label: gauge.getAttribute('aria-valuetext'), cd: +call.style.getPropertyValue('--cd'),
            num: box.querySelector('.v2-skill__num').textContent,
            text: box.querySelector('.v2-support-state').textContent,
            expanded: box.querySelector('.v2-support-info').getAttribute('aria-expanded'),
            hidden: box.querySelector('.v2-support-detail').hidden, calls: b.stats.supportCalls };
    """)


def run(ctx):
    g = ctx.game(fresh=True)
    g.enter_v2()
    setup(g, 'frost', enemies=1, charged=False)
    st = hud(g)
    ctx.check(st['cooldown'] == 40 and st['charge'] == 0 and st['disabled'] and st['pct'] == 0 and st['num'] == '40',
              '전투 시작: 첫 호출 40초 충전·빈 게이지·버튼 사용 불가', str(st))
    ctx.check(g.page.locator('#v2-support-brief').is_visible()
              and g.page.locator('.v2-support-summary').is_visible()
              and g.page.locator('.v2-support-auto').is_visible(),
              '평상시 초상화·이름·충전·자동 상태와 효과 한 줄 표시')
    g.key('q')
    ctx.check(g.js('return b.stats.supportCalls === 0 && !b.support.active && b.support.cooldown === 40;'),
              '전투 시작 직후 Q로도 호출할 수 없음')
    g.shot('support_ui_initial', '#screen-battle-v2')

    g.page.click('.v2-support-info')
    st = hud(g)
    detail = g.page.locator('.v2-support-detail').inner_text()
    ctx.check(not st['hidden'] and st['expanded'] == 'true' and '영원한 안식' in detail and '보스·거점' in detail
              and '첫 호출 40초 충전' in detail and st['calls'] == 0 and st['cooldown'] == 40,
              '충전 중에도 효과 상세 열기: 필살기·시너지·보스 예외·충전 규칙 표시, 호출하지 않음', detail)
    ctx.check(g.page.locator('.v2-support-detail .v2-support-brief').is_visible()
              and not g.page.locator('.v2-support-summary').is_visible()
              and g.js("return document.activeElement.matches('.v2-support-close');"),
              '상세는 같은 상단 자리에서 펼침, 가려진 호출 조작은 숨기고 닫기로 포커스 이동')
    g.shot('support_ui_detail', '#screen-battle-v2')
    g.key('Escape')
    ctx.check(hud(g)['hidden'] and g.js("return !gameTime.paused && document.activeElement.matches('.v2-support-info');"),
              '상세창 Escape: 설명만 닫고 버튼으로 포커스 복귀')
    g.key('Enter')
    ctx.check(not hud(g)['hidden'], '효과 상세 버튼을 키보드 Enter로 열 수 있음')
    g.page.click('.v2-support-close')
    ctx.check(hud(g)['hidden'], '상세창 닫기 버튼 동작')
    g.page.click('.v2-support-info')
    g.page.locator('#screen-battle-v2').click(position={'x': 620, 'y': 400})
    ctx.check(hud(g)['hidden'], '전장 바깥 클릭 입력으로 효과 상세 닫기')

    g.js('b.tickSupport(20);')
    st = hud(g)
    ctx.check(st['disabled'] and st['pct'] == 50 and st['cd'] == .5 and st['num'] == '20',
              '첫 충전 절반: 부채꼴 게이지 50%·남은 20초 표시', str(st))
    ctx.check(st['text'] == '첫 충전' and '20초' in st['label'],
              '초 카운트는 버튼에만 표시, 상태는 간략 문구·접근성 설명은 남은 시간 유지', str(st))
    g.shot('support_ui_half', '#screen-battle-v2')
    g.js('gameTime.paused = true; b.tickSupport(10);')
    ctx.check(hud(g)['cooldown'] == 20, '첫 충전도 일시정지 중에는 흐르지 않음')
    g.js('gameTime.paused = false; b.tickSupport(19.9);')
    g.key('q')
    ctx.check(hud(g)['disabled'] and hud(g)['calls'] == 0, '첫 충전 39.9초에는 호출 거부')
    g.js('b.tickSupport(.1);')
    st = hud(g)
    ctx.check(st['ready'] and not st['disabled'] and st['pct'] == 100 and st['cd'] == 0 and st['num'] == '',
              '첫 충전 40초: 남은 시간 제거·게이지 완료·호출 활성화', str(st))
    g.shot('support_ui_ready', '#screen-battle-v2')
    g.page.click('.v2-support-call')
    st = hud(g)
    ctx.check(st['time'] == 10 and st['calls'] == 1 and st['disabled'] and st['pct'] == 0 and st['num'] == '40'
              and '지원 중' in st['text'], '충전 후 초상화 클릭: 실제 출격·지원 시간·재충전 동시 표시', str(st))
    g.shot('support_ui_active', '#screen-battle-v2')
    g.js('b.tickSupport(10);')
    ctx.check(hud(g)['text'] == '재충전' and hud(g)['num'] == '30', '10초 철수 후 재충전 30초 남음, 초는 버튼 안에 표시')

    setup(g, 'diver', enemies=1, charged=False)
    st = g.js("""b.support.auto = true; b.enemies[0].boss = true; b.stats.time = 30;
        b.tickSupport(39.9); const early = b.stats.supportCalls;
        b.tickSupport(.1); return { early, calls: b.stats.supportCalls, active: !!b.support.active };
    """)
    ctx.check(st['early'] == 0 and st['calls'] == 1 and st['active'],
              '지원 AUTO도 첫 충전 완료까지 기다리고, 완료 후 보스를 보고 호출', str(st))

    for char in ('mech', 'kaiju', 'hero', 'chimera', 'diver', 'saint', 'frost', 'doll', 'architect', 'broadcaster'):
        setup(g, char, main='hero' if char == 'mech' else 'mech', enemies=1, charged=False)
        st = g.js("""const brief = document.querySelector('.v2-support-preview');
            const { SUPPORT_UNITS } = await import('/js/engine_v2/support_v2.js');
            return brief.textContent === SUPPORT_UNITS[b.support.snapshot.id].brief &&
                brief.scrollWidth <= brief.clientWidth && getComputedStyle(brief).whiteSpace === 'nowrap';
        """)
        ctx.check(st and g.page.locator('.v2-support-preview').is_visible(), f'{char}: 평상시 간략 효과가 한 줄로 잘림 없이 표시')
        g.page.click('.v2-support-info')
        st = g.js("""const box = document.querySelector('.v2-support-hud');
            const { SUPPORT_UNITS } = await import('/js/engine_v2/support_v2.js');
            const def = SUPPORT_UNITS[b.support.snapshot.id];
            const brief = box.querySelector('.v2-support-detail .v2-support-brief'), detail = box.querySelector('.v2-support-detail');
            const rect = brief.getBoundingClientRect(), parent = box.getBoundingClientRect();
            return { summary: brief.textContent === def.brief, full: detail.textContent.includes(def.effect),
                fits: rect.right <= parent.right + 1 && brief.scrollWidth <= brief.clientWidth,
                visible: !detail.hidden, calls: b.stats.supportCalls };
        """)
        ctx.check(st['summary'] and st['full'] and st['fits'] and st['visible'] and st['calls'] == 0,
                  f'{char}: 상세에서 효과 요약·전체 효과 확인, 요약 줄넘침 없음', str(st))

    # 정보창을 열어둔 상태에서 전투 종료/재시작해도 이전 창·입력이 남지 않는다.
    g.js('b.stopBattle(); b.startBattle(); cancelAnimationFrame(b.loopId); b.director.clear(); b.cinematic = false;')
    st = hud(g)
    ctx.check(st['hidden'] and st['expanded'] == 'false' and st['cooldown'] == 40 and st['pct'] == 0
              and g.page.locator('.v2-support-hud').count() == 1, '재시작: 빈 게이지·상세창 닫힘·HUD 1개', str(st))
    g.key('Escape')
    ctx.check(g.js('return gameTime.paused;'), '상세창이 닫힌 뒤 Escape 일시정지 유지')
    g.key('Escape')

    # 16:9 축소 화면에서도 정보창과 기존 스킬 도크를 각각 사용할 수 있다.
    g.page.set_viewport_size({'width': 900, 'height': 520})
    g.wait(100)
    g.page.click('.v2-support-info')
    st = g.js("""const support = document.querySelector('.v2-support-hud').getBoundingClientRect();
        const dock = document.querySelector('#skill-dock-v2').getBoundingClientRect();
        const detail = document.querySelector('.v2-support-detail').getBoundingClientRect();
        return support.right < dock.left && detail.left >= 0 && detail.top >= 0 && detail.right <= innerWidth;
    """)
    ctx.check(st, '축소 화면: 지원 HUD·스킬 도크 겹침 없음, 상세창 화면 안 배치')
    g.shot('support_ui_small', '#screen-battle-v2')
    check_layout(ctx, g)
    g.js('b.stopBattle();')


def check_layout(ctx, g):
    # 캐릭터 캔버스 전체(그림 외 투명 여백 포함)를 보호한다. HP·거점/보스 바도 동시에 검사.
    measure = """const box = document.querySelector('.v2-support-hud');
        const rect = box.getBoundingClientRect(), unit = document.querySelector('.v2-unit').getBoundingClientRect();
        const player = m.spriteCanvas.getBoundingClientRect();
        const panel = box.querySelector('.v2-support-detail');
        const shown = !panel.hidden, detail = panel.getBoundingClientRect();
        const overlap = (a, c) => a.left < c.right && a.right > c.left && a.top < c.bottom && a.bottom > c.top;
        const bars = ['#hud-target-v2', '#hud-boss-v2', '.v2-progress', '.v2-topright', '#skill-dock-v2']
            .map(s => document.querySelector(s)).filter(e => !e.hidden).map(e => e.getBoundingClientRect());
        const scale = document.querySelector('#screen-battle-v2').getBoundingClientRect().width / 1280;
        return { belowUnit: rect.top >= unit.bottom + 4 * scale && Math.abs(rect.left - unit.left) < scale,
            compact: rect.height / scale <= 96,
            clearPlayer: !overlap(rect, player) && (!shown || !overlap(detail, player)),
            clearHud: !overlap(rect, unit) && bars.every(r => !overlap(rect, r) && (!shown || !overlap(detail, r))),
            fits: rect.left >= 0 && rect.right <= innerWidth && (!shown ||
                (detail.top >= 0 && detail.bottom <= innerHeight && detail.right <= innerWidth)) };
    """
    for width, height in ((1564, 873), (1300, 740), (900, 520), (700, 1000)):
        g.page.set_viewport_size({'width': width, 'height': height})
        g.wait(100)
        setup(g, 'doll', enemies=1, charged=False)
        g.js("""b.spawnBase('mid'); b.boss = b.enemies.find(e => !e.isBuilding); b.boss.boss = true;
            b.hud.update();""")
        st = g.js(measure)
        ctx.check(all(st.values()), f'{width}×{height}: 상단 카드 정렬·최소 높이·캐릭터/HP/보스/스킬 가림 없음', str(st))
        g.shot(f'support_layout_{width}', '#screen-battle-v2')
        g.page.click('.v2-support-info')
        st = g.js(measure)
        ctx.check(all(st.values()), f'{width}×{height}: 상세를 펼쳐도 주인공·기존 HUD 가림 없음', str(st))
        if width in (1564, 900):
            g.shot(f'support_layout_detail_{width}', '#screen-battle-v2')

    g.page.set_viewport_size({'width': 1300, 'height': 740})
    g.wait(100)
    for main in ('mech', 'kaiju', 'hero', 'chimera'):
        setup(g, 'frost', main=main, enemies=1, charged=False)
        g.page.click('.v2-support-info')
        st = g.js(measure)
        ctx.check(all(st.values()), f'{main}: 지원 상세 패널이 주인공 캔버스 영역에 들어오지 않음', str(st))
