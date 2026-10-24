"""구역 6 (성왕국 변두리 : 잠긴 병동), D-078: 구역 탭·해금(4-B 다음, 난이도는 4-B 그대로), 임시 배경, 새 적
(병동 간수 사슬 속박 · 그림자 집행자 은신·기습 · 헌금 기사 축복 오라), 축복 성수대, 봉인된 약창고 회복,
6-B 정문 → 대사제 오르비안 (단죄의 빛 · 생명의 저울 · 파문의 종 · 헌금 소집) → 승리, 파견 구역 6"""

from test_zone34 import CLEAR, CLEAN, battle_at, place

# CLEAN과 같되 축복 성수대는 남김
KEEP_FONT = (CLEAN.replace('!e.isBuilding && !e.boss)', '!e.isBuilding && !e.boss && !e.isFont)')
             .replace('e.isBuilding || e.boss)', 'e.isBuilding || e.boss || e.isFont)'))
assert KEEP_FONT != CLEAN


def run(ctx):
    g = ctx.game(fresh=True)
    g.enter_v2()

    # 구역 탭 5개(1~4 + 6), 구역 6은 4-B 전까지 잠김 → 구역 1~4를 깨면 열리고 누르면 6-1
    g.js(CLEAR.replace('IDS', '[1, 2, 3]') + "window.madOverlordGameV2.menuController.renderStages();")
    st = g.js("""const tabs = [...document.querySelectorAll('#menu-zones-v2 .v2-zonetab')];
        const z6 = tabs.find(t => t.dataset.zone === 'ch6'); z6.click();
        return { n: tabs.length, label: z6.textContent.trim(), locked: z6.classList.contains('is-locked'),
                 foot: document.getElementById('menu-map-foot-v2').textContent };""")
    ctx.check(st['n'] == 5 and st['label'] == '구역 6' and st['locked'] and '4-B' in st['foot'],
              '구역 탭 5개: 구역 6은 4-B 전까지 잠김', str(st))
    g.js(CLEAR.replace('IDS', '[1, 2, 3, 4]') + "window.madOverlordGameV2.menuController.renderStages();")
    st = g.js("""document.querySelector('#menu-zones-v2 .v2-zonetab[data-zone="ch6"]').click();
        const S = await import('/js/engine_v2/stages_v2.js'), D = await import('/js/engine_v2/difficulty_v2.js');
        return { sel: progress.selectedStage, name: document.getElementById('menu-map-name-v2').textContent,
                 n: S.CHAPTER6.stages.length, after4: S.nextStageOf('4-B').id, last: S.STAGES[S.STAGES.length - 1].id,
                 final: D.FINAL_STAGE_ID, hard: D.difficultyUnlocked('hard', progress),
                 heal: S.stageById('6-2').midHeal, fonts: S.stageById('6-3').fonts.length };""")
    ctx.check(st['sel'] == '6-1' and '성왕국 변두리' in st['name'] and st['n'] == 7 and st['after4'] == '6-1' and st['last'] == '6-B'
              and st['final'] == '4-B' and st['hard'] and st['heal'] == 0.15 and st['fonts'] == 2,
              '4-B 클리어 → 구역 6 열림(6-1), 7판, 4-B 다음 = 6-1, 난이도 해금은 4-B 그대로', str(st))
    g.shot('zone6_menu', '#screen-menu-v2')

    # 6-1: 구역 6 배경(임시 잿빛), 다른 구역 색조 없음
    battle_at(g, '6-1')
    st = g.js("""const sc = document.getElementById('screen-battle-v2');
        return { zone: sc.classList.contains('v2-zone-6'), z3: sc.classList.contains('v2-zone-3'), z4: sc.classList.contains('v2-zone-4'),
                 sky: getComputedStyle(document.getElementById('bg-sky-v2')).filter };""")
    ctx.check(st['zone'] and not st['z3'] and not st['z4'] and 'grayscale' in st['sky'], '구역 6 배경 (잿빛 임시)', str(st))

    # 병동 간수: 사슬 → 피해 + 속박
    place(g, 'warden', 250, 'e.cd.skill = 99;')
    g.wait(1100)
    st = g.js("return { hurt: b._hurt, root: b.pRootT };")
    ctx.check(st['hurt'] > 0 and st['root'] > 0, '병동 간수: 사슬 투척 → 피해 + 속박', str(st))
    g.js("b.pRootT = 0; b.updatePlayerStatus && b.updatePlayerStatus();")

    # 그림자 집행자: 멀리서는 숨음(반투명, 받는 피해 50% 감소) → 가까우면 드러나 두 번 기습 → 드러난 채 → 다시 숨어 물러남
    place(g, 'shade', 420)
    g.wait(200)
    st = g.js("""const e = b.enemies.find(e => e.type === 'shade'); const hp = e.hp; b.dealDamageToEnemy(e, 100, false);
        return { hidden: e.hidden, cls: e.dom.classList.contains('is-stealth'), lost: Math.round(hp - e.hp),
                 op: getComputedStyle(e.dom.querySelector('.v2-enemy__sprite')).opacity };""")
    ctx.check(st['hidden'] and st['cls'] and st['lost'] == 50 and float(st['op']) < 0.5,
              '그림자 집행자: 숨어 있는 동안 반투명 + 받는 피해 50% 감소', str(st))
    g.js("b._hurt = 0; const e = b.enemies.find(e => e.type === 'shade'); e.x = b.frontX() + 100; e.dom.style.left = e.x + 'px';")
    g.wait(800)
    st = g.js("""const e = b.enemies.find(e => e.type === 'shade'); const hp = e.hp; b.dealDamageToEnemy(e, 100, false);
        return { hidden: e.hidden, state: e.sState, hurt: Math.round(b._hurt), lost: Math.round(hp - e.hp) };""")
    ctx.check(not st['hidden'] and st['state'] in ('strike', 'open') and st['hurt'] > 0 and st['lost'] == 100,
              '가까이 오면 드러나 기습 (피해) — 드러난 동안은 피해 그대로', str(st))
    g.js("const e = b.enemies.find(e => e.type === 'shade'); e.sState = 'open'; e.sT = 0; e.speed = 100;")
    g.wait(300)
    st = g.js("const e = b.enemies.find(e => e.type === 'shade'); return { hidden: e.hidden, state: e.sState, dx: Math.round(e.x - b.frontX()) };")
    ctx.check(st['hidden'] and st['state'] in ('back', 'hidden') and st['dx'] > 100, '드러난 시간이 끝나면 다시 숨어 물러남', str(st))
    g.shot('zone6_shade', '#screen-battle-v2')

    # 헌금 기사: 주변 적 받는 피해 20% 감소 (자기는 아님), 금빛 축복 표시
    place(g, 'tithe', 300, "const s = b.spawnMinion('soldier', { x: b.frontX() + 360, elite: false }); s.speed = 0;")
    g.wait(400)
    st = g.js("""const s = b.enemies.find(e => e.type === 'soldier'), k = b.enemies.find(e => e.type === 'tithe');
        const hp = s.hp; b.dealDamageToEnemy(s, 100, false);
        return { blessed: !!s.blessed, lost: Math.round(hp - s.hp), self: !!k.blessed,
                 icon: !!s.dom.querySelector('.v2-status__icon.is-bless') };""")
    ctx.check(st['blessed'] and st['lost'] == 80 and not st['self'] and st['icon'], '헌금 기사: 주변 적 받는 피해 20% 감소 + 축복 표시 (자기는 아님)', str(st))
    g.js("const k = b.enemies.find(e => e.type === 'tithe'); b.dealDamageToEnemy(k, k.hp * 10, false);")
    g.wait(400)
    ctx.check(g.js("return !b.enemies.find(e => e.type === 'soldier').blessed;"), '헌금 기사가 쓰러지면 축복이 꺼짐')
    g.js("b.stopBattle(); window.madOverlordGameV2.switchScreen('menu');")
    g.wait(300)

    # 6-2 봉인된 약창고: 부수면 주인공 체력 15% 회복
    battle_at(g, '6-2')
    g.js("b.distanceTraveled = b.stage.midAt - 0.5; b.playerSpeed = 100;")
    g.wait(1200)
    st = g.js("""const t = b.enemies.find(e => e.isBuilding); b.playerHp = b.maxPlayerHp * 0.5; const before = b.playerHp;
        b.dealDamageToEnemy(t, t.hp + 10, false);
        return { art: t.art, gain: (b.playerHp - before) / b.maxPlayerHp, star: b.starFlags[0] };""")
    ctx.check(st['art'] == 'bunker' and abs(st['gain'] - 0.15) < 0.01 and st['star'], '봉인된 약창고(임시 벙커 그림): 부수면 체력 15% 회복', str(st))
    g.js("b.stopBattle(); window.madOverlordGameV2.switchScreen('menu');")
    g.wait(300)

    # 6-3 축복 성수대: 그 거리에서 나와 걸을 때 다가오고, 근처 적 받는 피해 25% 감소 → 부수면 꺼짐
    battle_at(g, '6-3')
    g.js("b.distanceTraveled = b.stage.fonts[0] - 0.5; b.playerSpeed = 100;")
    g.wait(400)
    st = g.js("const f = b.enemies.find(e => e.isFont); return f ? { x: f.x, n: b.enemies.filter(e => e.isFont).length } : null;")
    ctx.check(bool(st) and st['n'] == 1, '6-3: 거리에 오면 축복 성수대가 나옴', str(st))
    g.wait(500)
    st2 = g.js("""const { FONT } = await import('/js/engine_v2/battle/enemyField.js'); const f = b.enemies.find(e => e.isFont);
        return { x: f.x, aura: !!f.dom.querySelector('.v2-font__aura'), hp: f.maxHp, want: Math.round(FONT.hp * b.stage.enemy.hp) };""")
    ctx.check(st2['x'] < st['x'] and st2['aura'] and st2['hp'] == st2['want'],
              '성수대는 걸을 때 바닥과 함께 다가옴 (금빛 축복 띠, 체력 FONT.hp × 적 체력 배율)', f'{st} → {st2}')
    g.js(KEEP_FONT + "const f = b.enemies.find(e => e.isFont); f.x = b.frontX() + 520; f.dom.style.left = f.x + 'px';"
         "const s = b.spawnMinion('soldier', { x: f.x + 60, elite: false }); s.speed = 0;"
         "const far = b.spawnMinion('soldier', { x: b.frontX() + 20, elite: false }); far.speed = 0; far._far = true;")
    g.wait(400)
    st = g.js("""const s = b.enemies.find(e => e.type === 'soldier' && !e._far), far = b.enemies.find(e => e._far);
        const hp = s.hp; b.dealDamageToEnemy(s, 100, false); const hp2 = far.hp; b.dealDamageToEnemy(far, 100, false);
        return { blessed: !!s.blessed, lost: Math.round(hp - s.hp), farLost: Math.round(hp2 - far.hp) };""")
    ctx.check(st['blessed'] and st['lost'] == 75 and st['farLost'] == 100, '성수대 근처(400px) 적만 받는 피해 25% 감소', str(st))
    g.shot('zone6_font', '#screen-battle-v2')
    g.js("const f = b.enemies.find(e => e.isFont); b.dealDamageToEnemy(f, f.hp + 10, false);")
    g.wait(400)
    st = g.js("const s = b.enemies.find(e => e.type === 'soldier' && !e._far); return { font: b.enemies.some(e => e.isFont), blessed: !!s.blessed };")
    ctx.check(not st['font'] and not st['blessed'], '성수대를 부수면 축복이 꺼짐', str(st))
    g.js("b.stopBattle(); window.madOverlordGameV2.switchScreen('menu');")
    g.wait(300)

    # 6-B: 정문(관문 그림)을 부수면 대사제 오르비안 → 기술 넷 → 쓰러뜨리면 승리
    battle_at(g, '6-B')
    g.js("b.midBaseSpawned = true; b.midBaseDestroyed = true; b.fontsSpawned = 9; b.distanceTraveled = b.stage.finalAt - 0.5; b.playerSpeed = 100;")
    g.wait(1500)
    st = g.js("const f = b.enemies.find(e => e.isFinal); return { art: f && f.art, boss: !!b.boss };")
    ctx.check(st['art'] == 'gate' and not st['boss'], '6-B: 대성당 의료원 정문(임시 관문 그림), 보스는 아직 없음', str(st))
    g.js(CLEAN + "const f = b.enemies.find(e => e.isFinal); b.dealDamageToEnemy(f, f.hp + 10, false);")
    g.wait(3400)
    st = g.js("return { phase: b.bossPhase, boss: b.boss && b.boss.type, star: b.starFlags[1], active: b.isActive };")
    ctx.check(st['phase'] and st['boss'] == 'orbian' and st['star'] and st['active'], '정문을 부수면 대사제 오르비안 출현 (별 2개째, 전투 계속)', str(st))
    g.shot('zone6_boss', '#screen-battle-v2')

    g.js(CLEAN + "b.boss.speed = 0; b.boss.cd.bell = -99; b.boss.cd.scales = -99; b.boss.cd.judgment = 99;")
    g.wait(1800)
    ctx.check(g.js("return b._hurt;") > 0, '단죄의 빛: 예고 뒤 빛의 기둥 피해')

    # 생명의 저울: 보스가 나온 뒤 회복한 양의 절반을 보스가 회복
    g.js("""b.boss.hp = b.boss.maxHp * 0.6; b.playerHp = b.maxPlayerHp * 0.4; window.__got = b.healPlayer(b.maxPlayerHp * 0.2);
        window.__bossHp = b.boss.hp; b.boss.cd.scales = 99;""")
    g.wait(300)
    st = g.js("return { got: Math.round(window.__got), gain: Math.round(b.boss.hp - window.__bossHp) };")
    ctx.check(st['got'] > 0 and abs(st['gain'] - st['got'] / 2) <= 2, '생명의 저울: 보스가 나온 뒤 주인공이 회복한 양의 절반을 보스가 회복', str(st))

    # 파문의 종: 예고 1.2초 → 팔·몸통 스킬 쿨다운 +2초
    g.js("b.skillCd.arm = 0; b.skillCd.body = 0; b.boss.cd.bell = 99;")
    g.wait(1700)
    st = g.js("return { arm: b.skillCd.arm, body: b.skillCd.body };")
    ctx.check(st['arm'] > 1 and st['body'] > 1, '파문의 종: 팔·몸통 스킬 쿨다운 +2초', str(st))

    # 헌금 소집: 체력 50% 아래에서 헌금 기사
    g.js("b.boss.hp = b.boss.maxHp * 0.4; b.boss.cd.summon = 99;")
    g.wait(300)
    ctx.check(g.js("return b.enemies.filter(e => e.type === 'tithe').length;") >= 1, '오르비안 체력 50% 아래: 헌금 소집 (헌금 기사)')

    g.js("b.boss.hp = 1; b.dealDamageToEnemy(b.boss, 1000, false);")
    g.wait(6500)
    st = g.js("return { win: !!document.querySelector('.v2-result.is-win'), stage: progress.stage('6-B').cleared };")
    ctx.check(st['win'] and st['stage'], '오르비안 격파 → 승리 (6-B 클리어)', str(st))
    g.js("b.stopBattle(); window.madOverlordGameV2.switchScreen('menu');")
    g.wait(400)

    # 파견: 6-B를 깨면 구역 6 파견이 열림, 기록은 구역 6 이름·적 (파견 그림은 아직 없음 → 전투 배경)
    st = g.js("""const D = await import('/js/ui_v2/dispatchUi_v2.js'), { ENEMY_TYPES } = await import('/js/engine_v2/enemies_v2.js');
        const z = D.DISPATCH_ZONES[6], log = D.dispatchLog({ character: 'saint', zone: 6, start: 1 });
        return { zones: progress.dispatchZones(), first: log[0].text, enemies: z.enemies.every(id => ENEMY_TYPES[id]), trek: z.trek };""")
    ctx.check(6 in st['zones'] and '성왕국 변두리' in st['first'] and st['enemies'] and st['trek'] is None,
              '파견: 6-B 클리어 → 구역 6 열림, 기록에 "성왕국 변두리"', str(st))
    g.js("""progress.unlockedChars = ['kaiju', 'hero', 'chimera', 'diver', 'saint', 'frost', 'doll']; progress.selectCharacter('mech');""")
    g.page.click('#btn-menu-support-v2')
    g.wait(300)
    g.page.click('.v2-growth__tabs [data-tab="dispatch"]')
    g.wait(1500)
    st = g.js("""const c = document.querySelector('.v2-dsp-zone[data-zone="6"]');
        return c ? { open: !c.disabled, text: c.textContent.replace(/\\s+/g, ' ').trim(), imgs: c.querySelectorAll('i').length } : null;""")
    ctx.check(bool(st) and st['open'] and '성왕국 변두리' in st['text'] and st['imgs'] == 1,
              '파견 화면: 구역 6 카드 (파견 그림 없이 전투 배경 썸네일)', str(st))
    g.shot('zone6_dispatch', '.v2-growth__box')
