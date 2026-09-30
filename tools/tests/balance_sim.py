"""
밸런스 자동 전투 (로드맵 B): 파츠 조합 × 스테이지를 자동 스킬로 끝까지 싸워 결과를 모은다.

  python tools/tests/balance_sim.py <조합이름> [레벨] [배속]     # 조합 하나 → tools/tests/_out/balance_<이름>_Lv<레벨>.json
  python tools/tests/balance_sim.py report                       # 모은 결과 → MD/밸런스_기록.md 표
  python tools/tests/balance_sim.py batch hero:1 mech_free:3 ...  # 여러 조합을 동시 2개씩(각 20분 제한) 돌리고 표까지

※ 한 번에 Chrome을 많이 띄우면 느려져 시작에 실패할 수 있다 → batch는 동시 실행 수를 제한하고,
  실패·시간 초과도 결과 파일(error)로 남겨 기다림이 끝나지 않는 일이 없게 한다.

조합은 BUILDS (머리, 몸통, 팔, 다리). 레벨은 네 파츠 모두 같은 강화 레벨.
전투는 실제 게임 루프 그대로 (배속만 올림), 스킬은 자동 사용, 시간 제한 240초(게임 시간).
"""
import glob
import json
import os
import subprocess
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import Game, start_server, OUT, ROOT  # noqa: E402
from playwright.sync_api import sync_playwright  # noqa: E402

BUILDS = {
    'mech_free': ('head_red_robot', 'body_red_robot', 'arm_red_robot', 'leg_red_robot'),
    'chimera_free': ('head_chimera', 'body_chimera', 'arm_chimera', 'leg_chimera'),
    'mech_laser': ('head_mech', 'body_mech', 'arm_mech_laser', 'leg_mech_wheel'),
    'kaiju': ('head_mutant', 'body_mutant', 'arm_mutant', 'leg_mutant'),
    'hero': ('head_hero', 'body_hero', 'arm_hero_wave', 'leg_hero_hover'),
}
STAGE_IDS = ['1-1', '1-2', '1-3', '1-4', '1-5', '1-B']
MARK = '<!-- 아래는 손으로 쓰는 부분: report가 지우지 않음 -->'
LIMIT = 300   # 안전장치(게임 시간, 초). 실제 패배는 스테이지 제한 시간(TIME OVER)


def save(build, level, results, errors):
    """결과 저장. 일부 스테이지만 쟀으면 기존 파일의 다른 스테이지 결과와 합침"""
    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, f'balance_{build}_Lv{level}.json')
    if os.path.exists(path):
        old = {r['stage']: r for r in json.load(open(path, encoding='utf-8')).get('results', [])}
        old.update({r['stage']: r for r in results})
        results = [old[sid] for sid in STAGE_IDS if sid in old]
    with open(path, 'w', encoding='utf-8') as f:
        json.dump({'build': build, 'level': level, 'results': results, 'errors': errors}, f, ensure_ascii=False, indent=1)


def sim(build, level, speed, stages=None):
    results = []
    try:
        _sim(build, level, speed, results, stages or STAGE_IDS)
    except Exception as e:   # 실패해도 결과 파일은 남김 (기다리는 쪽이 끝날 수 있게)
        save(build, level, results, [f'{type(e).__name__}: {str(e)[:300]}'])
        raise


def _sim(build, level, speed, results, stages):
    httpd, base = start_server()
    with sync_playwright() as pw:
        g = Game(pw, base, fresh=True, viewport=(1300, 740))
        try:
            g.enter_v2()
        except Exception:   # 시작이 늦으면 한 번 더
            g.reload_v2()
        head, body, arm, leg = BUILDS[build]
        for sid in stages:
            g.js(f"""['1-1','1-2','1-3','1-4','1-5'].forEach(id => progress.stages[id] = {{ stars: [true,true,true], cleared: true, bestTime: 1 }});
                ['{head}','{body}','{arm}','{leg}'].forEach(id => {{ progress.owned.add(id); progress.levels[id] = {level}; }});
                gameState.equippedParts = {{ head: '{head}', body: '{body}', arm: '{arm}', leg: '{leg}' }};
                progress.selectStage('{sid}');
                window.madOverlordGameV2.switchScreen('battle');""")
            g.wait(300)
            g.js(f"b.setAutoSkills(true); gameTime.speed = {speed};")
            t0 = time.time()
            res = None
            while time.time() - t0 < LIMIT / speed + 30:
                g.wait(1000)
                st = g.js("""const r = document.querySelector('.v2-result');
                    return { done: !!r, win: !!document.querySelector('.v2-result.is-win'), t: b.stats.time, active: b.isActive,
                             hp: b.playerHp / b.maxPlayerHp, flags: b.starFlags, dist: b.distanceTraveled, kills: b.stats.kills,
                             over: b.stats.overloads || 0, limit: b.stage.timeLimit };""")
                if st['done'] or st['t'] >= LIMIT:
                    res = st
                    break
                g.js(f"gameTime.speed = {speed};")   # 연출이 1배속으로 되돌리면 다시 올림
            res = res or st
            results.append({'stage': sid, 'win': res['win'], 'time': round(res['t']), 'hp': round(max(0, res['hp']) * 100),
                            'over': res.get('over', 0), 'limit': res.get('limit'),
                            'stars': sum(bool(f) for f in res['flags']), 'dist': round(res['dist']), 'kills': res['kills'],
                            'timeout': not res['done']})
            print(build, level, results[-1], flush=True)
            g.js("b.stopBattle(); window.madOverlordGameV2.switchScreen('menu');")
            g.wait(300)
        errors = g.errors[:3]
        g.close()
    httpd.shutdown()
    save(build, level, results, errors)


def batch(specs, parallel=2, limit_sec=1200, stages=None):
    """specs: ['hero:1', ...] — 동시 parallel개, 각 limit_sec초 제한. 끝나면 표 작성"""
    queue = [s.split(':') for s in specs]
    running = []
    here = os.path.abspath(__file__)
    while queue or running:
        while queue and len(running) < parallel:
            b, lv = queue.pop(0)
            log = open(os.path.join(OUT, f'sim_{b}_{lv}.log'), 'w', encoding='utf-8')
            cmd = [sys.executable, here, b, lv, '3'] + ([f"--stages={','.join(stages)}"] if stages else [])
            proc = subprocess.Popen(cmd, stdout=log, stderr=subprocess.STDOUT,
                                    env={**os.environ, 'PYTHONIOENCODING': 'utf-8'})
            running.append((proc, b, lv, time.time(), log))
            print(f'시작 {b} Lv{lv}', flush=True)
        for item in running[:]:
            proc, b, lv, t0, log = item
            if proc.poll() is not None or time.time() - t0 > limit_sec:
                if proc.poll() is None:
                    proc.kill()
                    save(b, int(lv), [], [f'시간 제한 {limit_sec}초 초과로 중단'])
                log.close()
                running.remove(item)
                print(f'끝 {b} Lv{lv} (코드 {proc.poll()})', flush=True)
        time.sleep(2)
    report()


def report():
    rows = []
    for path in sorted(glob.glob(os.path.join(OUT, 'balance_*.json'))):
        d = json.load(open(path, encoding='utf-8'))
        by_stage = {r['stage']: r for r in d['results']}
        cells = []
        for sid in STAGE_IDS:
            r = by_stage.get(sid)
            if not r:
                cells.append('—')
                continue
            mark = '✅' if r['win'] else ('⚠' if r['timeout'] else '⌛')
            over = f" · 과부하{r['over']}" if r.get('over') else ''
            cells.append(f"{mark} {r['time']}s · ★{r['stars']}{over}")
        if d.get('errors') and '—' in cells:
            cells[cells.index('—')] = '⚠ ' + d['errors'][0][:40]
        rows.append((f"{d['build']} Lv{d['level']}", cells))
    lines = ['# 밸런스 기록', '',
             '`python tools/tests/balance_sim.py <조합> <레벨>`로 자동 전투(자동 스킬, 실제 게임 루프)한 결과.',
             '✅ 승리 / ⌛ 제한 시간 초과 패배 / ⚠ 측정 중단. 칸: 걸린 시간 · 별 · 과부하(내구도 0 → 4초 정지) 횟수.',
             '제한 시간·별 목표 시간: 1-1 150/100, 1-2 180/110, 1-3 180/110, 1-4 200/120, 1-5 230/140, 1-B 225/150 (초).', '',
             f"측정: {time.strftime('%Y-%m-%d %H:%M')}", '',
             '| 조합 | ' + ' | '.join(STAGE_IDS) + ' |', '|---|' + '---|' * len(STAGE_IDS)]
    for name, cells in rows:
        lines.append(f'| {name} | ' + ' | '.join(cells) + ' |')
    out = os.path.join(ROOT, 'MD', '밸런스_기록.md')
    # 표 아래의 손으로 쓴 부분(목표·조정 이력·남은 문제)은 그대로 둔다
    manual = ''
    if os.path.exists(out):
        old = open(out, encoding='utf-8').read()
        if MARK in old:
            manual = old[old.index(MARK):]
    open(out, 'w', encoding='utf-8').write('\n'.join(lines) + '\n\n' + (manual or MARK + '\n'))
    print('\n'.join(lines))


if __name__ == '__main__':
    if sys.argv[1] == 'report':
        report()
    elif sys.argv[1] == 'batch':
        args = [a for a in sys.argv[2:] if not a.startswith('--parallel=')]
        par = next((int(a.split('=')[1]) for a in sys.argv[2:] if a.startswith('--parallel=')), 2)
        stg = next((a.split('=')[1].split(',') for a in sys.argv[2:] if a.startswith('--stages=')), None)
        batch([a for a in args if not a.startswith('--stages=')], parallel=par, stages=stg)
    else:
        stg = next((a.split('=')[1].split(',') for a in sys.argv[1:] if a.startswith('--stages=')), None)
        pos = [a for a in sys.argv[1:] if not a.startswith('--')]
        sim(pos[0], int(pos[1]) if len(pos) > 1 else 1, float(pos[2]) if len(pos) > 2 else 4, stg)
