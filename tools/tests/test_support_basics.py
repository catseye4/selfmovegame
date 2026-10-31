"""협력 일반 공격: 시전자 소켓·타격/발사 연출·실제 적중·사거리 접근·투사체 수명."""
from test_support import setup


def run(ctx):
    g = ctx.game(fresh=True)
    g.enter_v2()
    cases = [(c, None) for c in ('mech', 'kaiju', 'hero', 'chimera', 'diver', 'saint', 'frost', 'doll', 'architect', 'broadcaster')]
    cases += [('mech', 'laser'), ('mech', 'missile')]
    for char, attack in cases:
        setup(g, char, main='hero' if char == 'mech' else 'mech', enemies=1)
        if attack:
            g.js(f"""const {{ partsOfCharacter }} = await import('/js/engine_v2/roster_v2.js');
                b.support.snapshot.parts.arm = {{ ...partsOfCharacter('mech', 'arm').find(p => p.attackType === '{attack}') }};""")
        g.js('b.enemies[0].boss = true; b.enemies[0].hp = b.enemies[0].maxHp = 500000; b.callSupport();')
        g.wait(80)
        st = g.js("""const a = b.support.active, e = b.enemies[0]; b.tickSupport(.5);
            // 궁극기 예약/드론 연출과 분리하여 일반 공격 하나만 검증한다.
            a.tasks = []; b.fx.drones = b.fx.drones.filter(d => d.owner !== a.owner);
            b.fx.vfx.removeOwner(a.owner);
            const hp = e.hp; b.tickSupport(1.6);
            const source = b.fx.vfx.items.some(it => it.owner === a.owner && it.type === 'flash' &&
                it.x >= a.x - 160 && it.x <= a.x + 200);
            const shots = b.fx.vfx.projectiles.filter(pr => pr.owner === a.owner).length;
            const beams = b.fx.vfx.items.some(it => it.owner === a.owner && it.to);
            const motion = !!a.avatar.onceClip;
            const { SUPPORT } = await import('/js/engine_v2/support_v2.js');
            const scale = SUPPORT.basicFxScale;
            const visualSize = b.fx.vfx.items.some(it => it.owner === a.owner && it.type === 'flash' && it.s === scale);
            const geometry = b.fx.vfx.projectiles.filter(pr => pr.owner === a.owner).every(pr =>
                pr.kind === 'wave' ? pr.scale === 1 && pr.speed === 650 && pr.h === (a.snapshot.parts.arm.attackType === 'frost' ? 34 : 48) * scale
                : pr.kind === 'missile' ? Math.abs(pr.scale - .8 * scale) < .001 && pr.dur === .3 && Math.abs(pr.apex * pr.scale - 32) < .001
                : Math.abs(pr.scale - 1.2 * scale) < .001 && pr.dur === .22);
            b.fx._resize(); b.fx._update(.08); b.fx._draw();
            return { attacks: a.basicAttacks, source, shots, beams, motion, melee: a.melee, hp, visualSize, geometry };""")
        label = f'{char}_{attack or "base"}'
        ctx.check(st['attacks'] == 1 and st['source'] and st['motion'] and (st['melee'] or st['shots'] or st['beams']),
                  f'{label}: 일반 공격 동작·시전자 발사 효과와 타격/궤적 표시', str(st))
        ctx.check(st['visualSize'] and st['geometry'], f'{label}: 발사/투사체 시각 크기 확대, 파동 속도/사거리 배율·도착 시간 유지', str(st))
        g.shot(f'support_basic_{label}', '#screen-battle-v2')
        if attack == 'missile':
            g.page.set_viewport_size({'width': 900, 'height': 520})
            g.js('b.fx._resize(); b.fx._draw();')
            g.shot('support_basic_large_small_viewport', '#screen-battle-v2')
            g.page.set_viewport_size({'width': 1300, 'height': 740})
        hit = g.js('const hp = b.enemies[0].hp; b.fx._update(1); return b.enemies[0].hp;')
        ctx.check(hit < st['hp'], f'{label}: 일반 공격 적중 시 실제 피해 적용', str([st['hp'], hit]))
        st = g.js("""const a = b.support.active, e = b.enemies[0];
            // 다음 일반 공격을 쏜 직후 철수시킨다.
            b.tickSupport(.66); const pending = b.fx.vfx.projectiles.filter(pr => pr.owner === a.owner);
            b.clearSupport(); const hp = e.hp;
            b.fx._update(1);
            pending.forEach(pr => pr.onArrive?.());
            return { clean: !b.fx.vfx.projectiles.some(pr => pr.owner === a.owner) &&
                !b.fx.vfx.items.some(it => it.owner === a.owner) && !b.fx.vfx.parts.some(p => p.owner === a.owner), sameHp: hp === e.hp };""")
        ctx.check(st['clean'] and st['sameHp'], f'{label}: 철수 후 투사체·꼬리·이전 적중 콜백 무효', str(st))

    setup(g, 'saint', enemies=1)
    st = g.js("""const e = b.enemies[0]; e.boss = true; e.x = b.frontX() + 480;
        e.hp = e.maxHp = 500000; b.callSupport(); b.tickSupport(.5);
        const a = b.support.active;
        for (let i = 0; i < 70; i++) b.tickSupport(.1);
        return { attacks: a.basicAttacks, moved: a.x > b.monsterX + 180, inRange: b.supportInRange(a, e) };""")
    ctx.check(st['attacks'] > 0 and st['moved'] and st['inRange'],
              '원거리 지원: 먼 대상에게 실제 사거리까지 접근해 일반 공격 (주인공 앞 180px에 막히지 않음)', str(st))

