"""메인 협력 초상화·효과 안내 및 편성 카드 선택 표시의 실제 화면 검사."""
from test_support import SEED


def run(ctx):
    g = ctx.game(fresh=True)
    g.enter_v2()
    button = g.page.locator('#btn-menu-coop-v2')
    ctx.check('needs-selection' not in button.get_attribute('class')
              and not button.locator('img').is_visible(), '후보 없는 새 저장은 강조 없이 해금·파츠 조건 안내')
    g.js(SEED + "window.madOverlordGameV2.switchScreen('menu');")
    ctx.check('needs-selection' in button.get_attribute('class') and '편성하세요' in button.inner_text(),
              '편성 가능한 미선택 상태만 선택 유도 강조')
    g.page.emulate_media(reduced_motion='reduce')
    ctx.check(button.evaluate('(e) => getComputedStyle(e).animationName') == 'none', '동작 줄이기 설정에서는 유도 애니메이션 중지')
    g.page.emulate_media(reduced_motion='no-preference')
    g.page.click('#btn-menu-coop-v2')
    g.page.click('[data-act="close"]')
    ctx.check('needs-selection' in button.get_attribute('class'), '선택 없이 창을 닫아도 편성 유도 유지')
    g.page.click('#btn-menu-coop-v2')
    g.page.click('.v2-coop-card[data-id="diver"]')
    ctx.check(g.page.locator('.v2-coop-card.is-selected[aria-pressed="true"]').count() == 1
              and g.page.locator('.v2-coop-card[data-id="diver"] .v2-coop-card__selected').is_visible()
              and not g.page.locator('.v2-coop-card[data-id="frost"] .v2-coop-card__selected').is_visible(),
              '선택 카드에만 선택됨 배지·눌림 상태 표시')
    g.page.locator('.v2-coop-card[data-id="diver"]').scroll_into_view_if_needed()
    g.shot('support_menu_selected_card', '.v2-growth')
    for width, height in [(900, 520), (700, 1000)]:
        g.page.set_viewport_size({'width': width, 'height': height})
        g.wait(200)  # 화면 맞춤 resize RAF가 적용된 뒤 경계 확인
        fits = g.page.locator('.v2-coop-card.is-selected').evaluate('''e => {
            const badge = e.querySelector('.v2-coop-card__selected').getBoundingClientRect(), box = e.getBoundingClientRect();
            return e.scrollWidth <= e.clientWidth + 1 && badge.left >= box.left && badge.right <= box.right;
        }''')
        ctx.check(fits, f'{width}×{height}: 선택 카드의 이름·선택됨 배지 넘침 없음')
    g.page.set_viewport_size({'width': 1300, 'height': 740})
    g.wait(200)
    g.page.click('.v2-coop-card[data-id="frost"]')
    ctx.check(g.page.locator('.v2-coop-card.is-selected').get_attribute('data-id') == 'frost'
              and not g.page.locator('.v2-coop-card[data-id="diver"] .v2-coop-card__selected').is_visible(),
              '다른 캐릭터 선택 시 기존 선택 강조·배지 해제')
    g.page.click('[data-act="close"]')
    g.page.wait_for_function("document.querySelector('#btn-menu-coop-v2 img').naturalWidth > 0")
    ctx.check('서리의 무희' in button.inner_text() and '빙결' in button.inner_text()
              and '수동 Q' not in button.inner_text() and 'needs-selection' not in button.get_attribute('class')
              and '/frost/' in button.locator('img').get_attribute('src'),
              '메인에 선택한 얼굴·이름·효과 표시, 수동 Q와 유도 강조 해제')
    g.wait(400)
    g.shot('support_menu_portrait', '#screen-menu-v2')
    for width, height in [(1300, 740), (900, 520), (700, 1000)]:
        g.page.set_viewport_size({'width': width, 'height': height})
        g.wait(200)
        result = g.js("""const { ROSTER } = await import('/js/engine_v2/roster_v2.js');
            const { updateSupportMenu, supportPortrait } = await import('/js/ui_v2/supportUi_v2.js');
            const { supportUnitOf } = await import('/js/engine_v2/support_v2.js');
            const btn = document.querySelector('#btn-menu-coop-v2');
            return ROSTER.filter(c => c.id !== progress.character).every(c => {
                progress.selectSupport(c.id); updateSupportMenu(btn);
                const text = btn.querySelector('.v2-coop-menu__text'), bounds = btn.getBoundingClientRect();
                const attack = document.querySelector('#btn-to-battle-v2').getBoundingClientRect();
                return btn.querySelector('strong').textContent === c.faction
                    && btn.querySelector('small').textContent === supportUnitOf(c.id).brief
                    && btn.querySelector('img').getAttribute('src') === supportPortrait(c.id)
                    && text.scrollWidth <= text.clientWidth + 1 && btn.scrollHeight <= btn.clientHeight + 1
                    && bounds.right <= attack.left && bounds.bottom <= innerHeight;
            });""")
        ctx.check(result, f'{width}×{height}: 모든 편성 후보 이름·효과·초상화 표시 및 버튼 겹침/넘침 없음')
    g.page.set_viewport_size({'width': 1300, 'height': 740})
    g.js("""progress.selectSupport('diver'); progress.dispatch = [{character: 'diver'}];
        window.madOverlordGameV2.switchScreen('menu');""")
    ctx.check('다시 편성' in button.inner_text() and 'is-warn' in button.get_attribute('class'),
              '편성 자격이 바뀌면 효과 대신 재편성 사유 표시')
    g.js("""progress.dispatch = []; progress.selectSupport(null);
        window.madOverlordGameV2.switchScreen('menu');""")
    ctx.check(not button.locator('img').is_visible() and 'needs-selection' in button.get_attribute('class')
              and '심연의 길잡이' not in button.inner_text(), '지원 없음으로 바꾸면 이전 얼굴·이름 제거하고 편성 유도 복구')
