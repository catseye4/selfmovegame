"""주인공으로 전환한 협력 캐릭터는 편성·메인 안내·저장에서도 자동 해제한다."""
from test_support import SEED


def run(ctx):
    g = ctx.game(fresh=True)
    g.enter_v2()
    g.js(SEED)
    g.page.click('#btn-menu-coop-v2')
    g.page.click('.v2-coop-card[data-id="diver"]')
    g.page.click('[data-act="supportAuto"]')
    g.page.click('[data-act="close"]')
    ctx.check('심연의 길잡이' in g.page.locator('#btn-menu-coop-v2').inner_text(), '변경 전 메인에 선택한 협력 캐릭터 표시')
    g.page.click('#btn-to-select-v2')
    g.page.click('.v2-charcard[data-char="diver"]')
    g.page.click('#btn-select-confirm-v2')
    st = g.js("""const btn = document.querySelector('#btn-menu-coop-v2');
        progress.save(); const data = JSON.parse(localStorage.getItem('mo_v2_save'));
        return { main: progress.character, support: progress.supportCharacter, random: progress.supportRandom,
            auto: progress.supportAuto, text: btn.innerText, warn: btn.classList.contains('is-warn'),
            savedMain: data.character, savedSupport: data.supportCharacter, savedRandom: data.supportRandom,
            snapshot: progress.supportSnapshot() };""")
    ctx.check(st['main'] == 'diver' and st['support'] is None and not st['random'] and st['auto'] and st['snapshot'] is None,
              '협력 캐릭터를 주인공으로 선택: 편성·랜덤 해제, 자동 호출 취향 유지', str(st))
    ctx.check('심연의 길잡이' not in st['text'] and '편성하세요' in st['text'] and not st['warn']
              and st['savedMain'] == 'diver' and st['savedSupport'] is None and not st['savedRandom'],
              '메인 협력 버튼에 이전 이름/경고가 남지 않으며 해제 상태 저장', str(st))
    g.wait(500)  # 메뉴 전환 페이드 이후 확인
    g.shot('support_main_conflict_cleared', '#screen-menu-v2')
    g.page.click('#btn-menu-coop-v2')
    ctx.check(g.page.locator('.v2-coop-card.is-selected').count() == 0
              and g.page.locator('.v2-coop-card[data-id="diver"]').is_disabled(),
              '협력 창도 지원 없음 상태, 현재 주인공 카드는 선택 불가')
    g.page.click('.v2-coop-card[data-id="frost"]')
    g.page.click('[data-act="close"]')
    g.page.click('#btn-to-select-v2')
    g.page.click('.v2-charcard[data-char="hero"]')
    g.page.click('#btn-select-confirm-v2')
    st = g.js("""const unchanged = progress.supportCharacter;
        progress.selectCharacter('hero'); const invalid = progress.selectCharacter('no-such-character');
        progress.save(); return { support: progress.supportCharacter, unchanged, invalid, auto: progress.supportAuto };""")
    ctx.check(st['support'] == 'frost' and st['unchanged'] == 'frost' and not st['invalid'] and st['auto'],
              '다른 주인공·동일 주인공·잘못된 선택은 유효한 기존 협력 편성을 보존', str(st))
    g.reload_v2()
    ctx.check(g.js("return progress.character === 'hero' && progress.supportCharacter === 'frost' && progress.supportAuto;"),
              '유효한 주인공/협력 조합은 다시 열어도 유지')
    # 이미 저장된 중복 편성도 시작 시 정리한다.
    g.js("""const data = JSON.parse(localStorage.getItem('mo_v2_save'));
        data.supportCharacter = data.character; data.supportRandom = true;
        localStorage.setItem('mo_v2_save', JSON.stringify(data));""")
    g.reload_v2()
    st = g.js("""const data = JSON.parse(localStorage.getItem('mo_v2_save'));
        return { main: progress.character, support: progress.supportCharacter, random: progress.supportRandom,
            auto: progress.supportAuto, savedSupport: data.supportCharacter, savedRandom: data.supportRandom,
            text: document.querySelector('#btn-menu-coop-v2').innerText };""")
    ctx.check(st['main'] == 'hero' and st['support'] is None and not st['random'] and st['auto']
              and st['savedSupport'] is None and not st['savedRandom'] and '타락 히어로' not in st['text'],
              '예전 중복 저장 복구: 주인공 보존·협력/랜덤 해제·메인 안내와 저장 정리', str(st))

