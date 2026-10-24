"""
전투 성능 측정 (Q-008 퀄리티업 확인 — 큰 화면·고해상도 캔버스·2배 적 그림·이펙트가 프레임을 떨어뜨리는지)

실행: 프로젝트 루트에서  python tools/tests/perf_battle.py          (결과 표를 찍고 tools/tests/_out/perf_battle.json에 저장)
      python tools/tests/perf_battle.py --quick  (조건 둘만)

조건마다: 구역 3 스테이지에서 적 N명 + 엘리트 몇 + 스킬을 쿨다운마다 계속 써서 이펙트를 많이 띄운 채 몇 초 잼
  - fps: 실제 화면 갱신 수(requestAnimationFrame), p95·최대 프레임 간격(ms) — 60fps면 16.7ms
  - js: 프레임마다 전투 계산(loop) · 캐릭터 리그 그리기(render) · 이펙트 그리기(_draw)에 쓴 시간(ms, 평균)
  - CPU 느리게(throttle): Chrome 개발자 도구의 CPU 느리게와 같음 (4 = 4배 느림 — 태블릿·오래된 노트북 대략)
검사 PC 그래픽 카드가 좋으면 실제보다 좋게 나오므로 CPU 4배 느림 조건을 함께 본다. run_all.py에는 넣지 않음 (판정 없는 측정)
"""
import json
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import Game, start_server, ROOT  # noqa: E402
from playwright.sync_api import sync_playwright  # noqa: E402

BUILD = ('head_frost', 'body_frost', 'arm_frost', 'leg_frost')   # 이펙트·냉기 표시가 많은 캐릭터
STAGE = '3-4'
ENEMIES = 18
SECONDS = 6
WARM_MS = 800   # --warm 이면 4000 (스킬 그림·적 그림을 다 쓴 뒤 재기)

CASES = [
    # 이름, 창 크기, 선명한 그림, CPU 느리게
    ('보통 창 · 선명 끔', (1300, 740), False, 1),
    ('큰 창(1080p) · 선명 켬', (1940, 1100), True, 1),
    ('큰 창(1080p) · 선명 끔', (1940, 1100), False, 1),
    ('큰 창 · 선명 켬 · CPU 4배 느림', (1940, 1100), True, 4),
    ('큰 창 · 선명 끔 · CPU 4배 느림', (1940, 1100), False, 4),
]

MEASURE = """
const { STAGES } = await import('/js/engine_v2/stages_v2.js');
progress.stages = {}; for (const s of STAGES) progress.stages[s.id] = { stars: [true,true,true], cleared: true, bestTime: 60 };
progress.selectStage('%(stage)s');
gameState.equippedParts = { head: '%(h)s', body: '%(b)s', arm: '%(a)s', leg: '%(l)s' };
window.madOverlordGameV2.switchScreen('battle');
await new Promise(r => setTimeout(r, 3500));
b.spawnInterval = 999;
for (let i = 0; i < %(n)d; i++) {
    const e = b.spawnMinion(null, { x: b.frontX() + 120 + i * 45, elite: i %% 5 === 0 });
    e.hp = e.maxHp = 1e7;
}
// 계산·그리기 시간 재기 (원래 함수를 감쌈)
const acc = { loop: 0, rig: 0, fx: 0, n: 0 };
const wrap = (obj, key, slot) => { const f = obj[key].bind(obj); obj[key] = (...a) => { const t = performance.now(); const r = f(...a); acc[slot] += performance.now() - t; return r; }; };
wrap(b, 'loop', 'loop'); wrap(m.rigBattle, 'render', 'rig'); wrap(b.fx, '_draw', 'fx');
// 스킬을 계속 써서 이펙트를 띄움
const spam = setInterval(() => { ['arm', 'body', 'head'].forEach(s => { b.skillCd[s] = 0; }); b.ultGauge = 1; ['arm', 'body', 'head'].forEach(s => b.useSkill(s)); }, 1200);
await new Promise(r => setTimeout(r, %(warm)d));   // 데우기: 스킬·적 그림을 한 번씩 쓴 뒤부터 잼 (처음 쓰는 그림의 압축 풀기 멈칫을 따로 보려면 짧게)
const gaps = []; let last = performance.now(); let run = true;
const tick = t => { gaps.push(t - last); last = t; acc.n++; if (run) requestAnimationFrame(tick); };
requestAnimationFrame(t => { last = t; requestAnimationFrame(tick); });
await new Promise(r => setTimeout(r, %(sec)d * 1000));
run = false; clearInterval(spam);
gaps.sort((p, q) => p - q);
const n = gaps.length, avg = gaps.reduce((s, v) => s + v, 0) / n;
const res = { fps: +(1000 / avg).toFixed(1), p95: +gaps[Math.floor(n * 0.95)].toFixed(1), max: +gaps[n - 1].toFixed(1),
    loopMs: +(acc.loop / acc.n).toFixed(2), rigMs: +(acc.rig / acc.n).toFixed(2), fxMs: +(acc.fx / acc.n).toFixed(2),
    enemies: b.enemies.filter(e => !e.isBuilding).length, res: m.rigBattle.res,
    heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null };
b.stopBattle();
return res;
"""


def main(quick=False):
    global WARM
    WARM = 4000 if '--warm' in sys.argv else WARM_MS
    httpd, base = start_server()
    rows = []
    with sync_playwright() as pw:
        for name, vp, sharp, throttle in (CASES[:2] if quick else CASES):
            g = Game(pw, base, fresh=True, viewport=vp)
            g.enter_v2()
            g.js(f"settings.set('sharp', {str(sharp).lower()});")
            cdp = None
            if throttle > 1:
                cdp = g.page.context.new_cdp_session(g.page)
                cdp.send('Emulation.setCPUThrottlingRate', {'rate': throttle})
            r = g.js(MEASURE % {'stage': STAGE, 'h': BUILD[0], 'b': BUILD[1], 'a': BUILD[2], 'l': BUILD[3], 'n': ENEMIES, 'sec': SECONDS, 'warm': WARM})
            r['name'] = name
            rows.append(r)
            print(f"{name:28s} fps {r['fps']:5.1f} · p95 {r['p95']:5.1f}ms · 최대 {r['max']:6.1f}ms · 계산 {r['loopMs']:.2f} · 리그 {r['rigMs']:.2f} · 이펙트 {r['fxMs']:.2f}ms · 배율 {r['res']} · 적 {r['enemies']}", flush=True)
            if g.errors:
                print('  오류:', g.errors[:2])
            g.close()
    httpd.shutdown()
    out = os.path.join(ROOT, 'tools', 'tests', '_out', 'perf_battle.json')
    os.makedirs(os.path.dirname(out), exist_ok=True)
    json.dump({'time': time.strftime('%Y-%m-%d %H:%M'), 'rows': rows}, open(out, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
    print('→', out)


if __name__ == '__main__':
    main('--quick' in sys.argv)
