"""협력 확장: 목록 자동 구성, 4부위 자격, 10초·궁극기 2회·연출 수명, 40초·계정 연구."""
from test_support import setup, SEED


def run(ctx):
    g = ctx.game(fresh=True)
    g.enter_v2()
    g.js(SEED)
    g.page.click('#btn-menu-coop-v2')
    ctx.check(g.page.locator('.v2-coop-card').count() == 10,
              '현재 캐릭터 10종 모두 협력 목록 표시 (주인공은 비활성)')
    st = g.js("""const { ROSTER, SLOTS, partsOfCharacter } = await import('/js/engine_v2/roster_v2.js');
        const all = ROSTER.filter(c => c.id !== progress.character).every(c => !progress.supportReason(c.id));
        const missing = SLOTS.map(slot => {
            const ids = partsOfCharacter('architect', slot).filter(p => progress.isOwned(p.id)).map(p => p.id);
            ids.forEach(id => progress.owned.delete(id));
            const rejected = !progress.selectSupport('architect');
            ids.forEach(id => progress.owned.add(id));
            return rejected;
        });
        return { all, missing, main: progress.selectSupport(progress.character) };""")
    ctx.check(st['all'] and all(st['missing']) and not st['main'],
              '4부위 보유 시 모든 캐릭터 편성 가능, 어느 한 부위라도 없으면 거부', str(st))
    st = g.js("""const { ROSTER, SLOTS, partsOfCharacter } = await import('/js/engine_v2/roster_v2.js');
        const { RIG_CHARACTERS } = await import('/js/engine_v2/rig/characters.js');
        const { PARTS_DB } = await import('/js/data/parts.js');
        const { PART_SKILL } = await import('/js/engine_v2/skills_v2.js');
        const { supportUnitOf, SUPPORT_UNITS } = await import('/js/engine_v2/support_v2.js');
        const { supportHtml } = await import('/js/ui_v2/supportUi_v2.js');
        const id = 'support_future_test', previous = progress.supportCharacter;
        const originals = SLOTS.map(slot => partsOfCharacter('architect', slot)[0]);
        ROSTER.push({ id, faction: '추가 캐릭터 검사', color: '#ff9a2e' });
        RIG_CHARACTERS[id] = RIG_CHARACTERS.architect;
        const ids = [];
        try {
            SLOTS.forEach((slot, i) => {
                const p = { ...originals[i], id: `${slot}_${id}`, faction: '추가 캐릭터 검사' };
                PARTS_DB[slot].push(p); ids.push(p.id); progress.owned.add(p.id);
                if (PART_SKILL[originals[i].id]) PART_SKILL[p.id] = PART_SKILL[originals[i].id];
            });
            const card = supportHtml().includes(`data-id="${id}"`);
            const candidate = progress.supportCandidates().some(c => c.id === id);
            const selected = progress.selectSupport(id), snapshot = progress.supportSnapshot();
            return { card, candidate, selected, snapshot: snapshot?.id === id,
                noDefinition: !SUPPORT_UNITS[id], name: supportUnitOf(id).ult };
        } finally {
            ROSTER.pop(); delete RIG_CHARACTERS[id];
            SLOTS.forEach(slot => { const at = PARTS_DB[slot].findIndex(p => ids.includes(p.id)); if (at >= 0) PARTS_DB[slot].splice(at, 1); });
            ids.forEach(part => { progress.owned.delete(part); delete PART_SKILL[part]; });
            progress.selectSupport(previous);
        }""")
    ctx.check(all(st[k] for k in ('card', 'candidate', 'selected', 'snapshot', 'noDefinition')) and st['name'] == '철거 명령',
              '미래 캐릭터를 ROSTER·리그·파츠에 추가하면 협력 전용 등록 없이 목록·후보·편성·스냅샷 자동 인식', str(st))
    # 별도 협력 정의를 빼도 ROSTER·기본 머리 기술에서 자동 구성한다.
    st = g.js("""const { SUPPORT_UNITS, supportUnitOf } = await import('/js/engine_v2/support_v2.js');
        window.savedArchitectSupport = SUPPORT_UNITS.architect;
        delete SUPPORT_UNITS.architect;
        const def = supportUnitOf('architect');
        const { supportHtml } = await import('/js/ui_v2/supportUi_v2.js');
        return { name: def.ult, vfx: !!def.vfx?.layers.length, eligible: !progress.supportReason('architect'),
            card: supportHtml().includes('data-id="architect"'), volley: def.volley };""")
    ctx.check(st['name'] == '철거 명령' and st['vfx'] and st['eligible'] and st['card'] and st['volley'] == 1,
              '추가 캐릭터: 별도 협력 정의 없이 기본 머리 기술·연출·카드 자동 구성', str(st))
    g.key('Escape')
    setup(g, 'architect', enemies=1)
    st = g.js("""const called = b.callSupport(); b.tickSupport(.5);
        return { called, casts: b.support.active.casts, damage: b.stats.supportDamage,
            fx: b.fx.vfx.items.some(it => it.owner === b.support.active.owner) };""")
    ctx.check(st['called'] and st['casts'] == 1 and st['damage'] > 0 and st['fx'],
              '자동 구성 캐릭터도 실제 전투에서 협력 강타·이펙트 발동', str(st))
    g.js("""const { SUPPORT_UNITS } = await import('/js/engine_v2/support_v2.js');
        SUPPORT_UNITS.architect = window.savedArchitectSupport;""")

    units = ('mech', 'kaiju', 'hero', 'chimera', 'diver', 'saint', 'frost', 'doll', 'architect', 'broadcaster')
    for unit in units:
        setup(g, unit, main='hero' if unit == 'mech' else 'mech', enemies=6)
        g.js('b.enemies.forEach(e => { e.hp = e.maxHp = 500000; }); b.callSupport();')
        g.wait(100)  # 비동기 리그 생성도 끝낸 뒤 시전 동작을 확인
        g.js('b.tickSupport(.5); b.fx._resize(); b.fx._update(.12); b.fx._draw();')
        g.shot(f'support_ultimate_{unit}', '#screen-battle-v2')
        st = g.js("""const a = b.support.active, original = JSON.stringify(gameState.equippedParts);
            b.fx.play({ layers: [{ type: 'flash', dur: 30, r: 4, color: '255,255,255' }] }, 10, 10);
            const first = a.casts, fx = b.fx.vfx.items.filter(it => it.owner === a.owner).length;
            const casting = a.avatar.onceClip != null && a.castUntil > a.elapsed;
            b.tickSupport(1);
            const protectedCast = a.avatar.onceClip != null;
            b.tickSupport(4);
            const second = a.casts, total = b.stats.supportUltimates;
            const summons = b.allies.filter(x => x.supportOwner === a.owner).length;
            b.fx.vfx.update(.1);
            const particles = b.fx.vfx.parts.filter(p => p.owner === a.owner).length;
            b.tickSupport(4.49); const stillHere = !!b.support.active;
            b.tickSupport(.02);
            return { first, fx, casting, protectedCast, second, total, summons, particles, stillHere,
                cleared: !b.support.active && !b.fx.vfx.items.some(it => it.owner === a.owner) &&
                    !b.fx.vfx.parts.some(p => p.owner === a.owner) && !b.fx.drones.some(d => d.owner === a.owner),
                ownFx: b.fx.vfx.items.some(it => !it.owner), unchanged: original === JSON.stringify(gameState.equippedParts) };""")
        ctx.check(st['first'] == 1 and st['second'] == 2 and st['total'] == 2 and st['fx'] > 0 and st['casting'] and st['protectedCast'],
                  f'{unit}: 궁극기 연출·시전 동작, 일반 공격에 덮이지 않고 2회 발동', str(st))
        ctx.check(st['stillHere'] and st['cleared'] and st['ownFx'] and st['unchanged'],
                  f'{unit}: 9.99초 유지·10초 철수, 소유 연출만 제거·주인공 보존', str(st))
        if unit in ('hero', 'saint'):
            ctx.check(st['summons'] <= (2 if unit == 'hero' else 3), f'{unit}: 두 번째 궁극기도 임시 아군 상한 유지')

    setup(g, 'broadcaster', enemies=1)
    st = g.js("""const e = b.enemies[0]; e.kitSilenceT = 7; b.callSupport(); b.tickSupport(.5);
        const active = b.supportSilenced(e), icon = b.kitStates(e).includes('silence');
        b.clearSupport();
        return { active, icon, clean: !b.supportSilenced(e), own: e.kitSilenceT };""")
    ctx.check(st['active'] and st['icon'] and st['clean'] and st['own'] == 7,
              '방송자 침묵은 협력 소유, 철수 시 주인공의 기존 침묵 상태 보존', str(st))

    setup(g, 'architect', enemies=1)
    st = g.js("""const { supportUnitOf } = await import('/js/engine_v2/support_v2.js');
        const e = b.enemies[0], wall = b.spawnBase('mid');
        wall.x = e.x; wall.hp = wall.maxHp = 500000; e.hp = e.maxHp = 500000; e.armor = 0;
        b.callSupport(); b.tickSupport(.5);
        const a = b.support.active, u = a.snapshot.stats.dps * .55 * 1.6;
        const unitDamage = e.maxHp - e.hp, wallDamage = wall.maxHp - wall.hp;
        return { unitDamage, wallDamage, wantUnit: u / 3, wantWall: u / 3 * 3 * .65,
            architectSheet: supportUnitOf('architect').vfx.layers.some(l => l.sheet === 'crane_ball'),
            broadcastSheet: supportUnitOf('broadcaster').vfx.layers.some(l => l.sheet === 'emergency_broadcast') };""")
    ctx.check(abs(st['unitDamage'] - st['wantUnit']) < .01 and abs(st['wallDamage'] - st['wantWall']) < .01
              and st['architectSheet'] and st['broadcastSheet'],
              '신규 2종: 대표 궁극기 그림 시트 사용, 설계자 거점 배수 실제 피해에 적용', str(st))

    setup(g, 'frost', enemies=1, charged=False)
    st = g.js("""const { STAGES } = await import('/js/engine_v2/stages_v2.js');
        const { RESEARCH } = await import('/js/engine_v2/growth_v2.js');
        const poor = progress.buyResearch('supportCooldown');
        STAGES.forEach(s => progress.stages[s.id] = { cleared: true, stars: [true,true,true], bestTime: 60 });
        progress.spentStars = 0;
        const before = progress.availableStars(), times = [progress.supportCooldown()];
        const purchases = [];
        for (let i = 0; i < 3; i++) { purchases.push(progress.buyResearch('supportCooldown').success); times.push(progress.supportCooldown()); }
        const max = progress.buyResearch('supportCooldown');
        return { poor: poor.success, times, purchases, spent: before - progress.availableStars(), max: max.success,
            cost: RESEARCH.supportCooldown.stars, currentBattle: b.support.interval };""")
    ctx.check(not st['poor'] and st['times'] == [40, 37, 34, 31] and all(st['purchases']) and st['spent'] == 23 and not st['max'],
              '계정 연구: 별 5·8·10 소모, 3단계 최대 31초·부족/최대 거부', str(st))
    ctx.check(st['currentBattle'] == 40, '전투 중 연구 변경은 진행 중 충전 간격을 바꾸지 않음')
    st = g.js("""b.startBattle(); cancelAnimationFrame(b.loopId); b.director.clear(); b.cinematic = false;
        b.spawnInterval = 999; b.midBaseSpawned = true;
        b.spawnMinion('guard', { x: b.monsterX + 180, elite: false });
        const initial = b.supportStatus(); b.tickSupport(30.9); const early = b.callSupport();
        b.tickSupport(.1); const ready = b.supportStatus(); const called = b.callSupport();
        return { initial, early, ready, called, recharge: b.support.cooldown };""")
    ctx.check(st['initial']['cooldown'] == 31 and not st['early'] and st['ready']['ready'] and st['called'] and st['recharge'] == 31,
              '연구 적용: 다음 전투 첫 충전·반복 재충전·게이지 모두 31초', str(st))
    g.js('b.stopBattle(); progress.save();')
    g.reload_v2()
    ctx.check(g.js("return progress.researchLevel('supportCooldown') === 3 && progress.supportCooldown() === 31;"),
              '연구 3단계·단축 시간이 저장 후 다시 열어도 유지')
