"""앱 업데이트 (D-074 · NAS D-081): NAS latest.json 읽기·새 버전 판단·GitHub 모양 호환, release.py의 NAS 올리기·되돌리기,
build_www.py의 업데이트 주소 설정. 앱(Android) 자체는 에뮬레이터에서 따로 확인 (MD/앱_빌드_가이드.md 6장)."""
import json
import os
import shutil
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, os.path.join(ROOT, 'app'))
import build_www  # noqa: E402
import release  # noqa: E402

NAS = os.path.join(HERE, '_out', 'feed_nas')          # 가짜 NAS 폴더 (시험 서버가 /tools/tests/_out/feed_nas/ 로 내줌)
FEED = '/tools/tests/_out/feed_nas/latest.json'
MOD = "const U = await import('/js/ui_v2/appUpdate_v2.js');"


def run(ctx):
    # ---- release.py: 가짜 NAS 폴더에 두 번 올리고 되돌리기 ----
    shutil.rmtree(NAS, ignore_errors=True)
    os.makedirs(NAS)
    apk = os.path.join(NAS, '_build.apk')
    open(apk, 'wb').write(b'PK fake apk ' * 100)
    e1 = release.publish(apk, NAS, '0.2.1', 3, '- 첫 NAS 업데이트', today='2026-10-23')
    e2 = release.publish(apk, NAS, '0.2.1', 4, '- 빌드만 올림', required=True, today='2026-10-24')
    hist = json.load(open(os.path.join(NAS, 'releases.json'), encoding='utf-8'))
    latest = json.load(open(os.path.join(NAS, 'latest.json'), encoding='utf-8'))
    ok = (os.path.exists(os.path.join(NAS, 'releases', '0.2.1-b3', 'MadOverlord-0.2.1-b3.apk'))
          and [h['build'] for h in hist] == [4, 3] and latest['build'] == 4 and latest['required'] is True
          and e1['file'] == 'releases/0.2.1-b3/MadOverlord-0.2.1-b3.apk' and len(e2['sha256']) == 64
          and not [f for f in os.listdir(NAS) if f.endswith('.tmp')])
    ctx.check(ok, 'release.py: NAS에 APK 복사 · releases.json(새것이 위) · latest.json · 임시 파일 안 남음', str(hist))
    page = open(os.path.join(NAS, 'index.html'), encoding='utf-8').read()
    ctx.check('href="releases/0.2.1-b4/MadOverlord-0.2.1-b4.apk" download' in page and '필수 업데이트' in page
              and page.count('<tr>') == 2 and '- 빌드만 올림' in page,
              '내려받기 페이지 index.html: 최신 APK 단추 · 필수 표시 · 바뀐 점 · 올린 버전 2줄', page[:200])
    back = release.set_latest(NAS, '0.2.1-b3')
    latest = json.load(open(os.path.join(NAS, 'latest.json'), encoding='utf-8'))
    page = open(os.path.join(NAS, 'index.html'), encoding='utf-8').read()
    ctx.check(back['build'] == 3 and latest['build'] == 3 and len(json.load(open(os.path.join(NAS, 'releases.json'), encoding='utf-8'))) == 2
              and 'href="releases/0.2.1-b3/MadOverlord-0.2.1-b3.apk" download' in page,
              'release.py latest 0.2.1-b3: 최신을 되돌려도 기록은 그대로, 내려받기 페이지도 b3으로', str(latest))
    stops = []
    for v, b in [('0.2.1', 3), ('0.2.0', 2), ('0.2.0', 9)]:
        try:
            release.check_newer(v, b, latest)
            stops.append(False)
        except SystemExit:
            stops.append(True)
    try:
        release.check_newer('0.2.2', 4, latest)
        passes = True
    except SystemExit:
        passes = False
    ctx.check(stops == [True, True, True] and passes, '빌드가 NAS 최신 이하이거나 버전이 낮으면 멈춤, 더 높으면 진행', str(stops))
    os.remove(apk)

    # ---- build_www.py: 설정 파일의 feed를 앱에 넣음 ----
    cfg = os.path.join(NAS, '_cfg.json')
    json.dump({'feed': 'https://nas.example/mo/latest.json', 'nas_dir': NAS}, open(cfg, 'w', encoding='utf-8'))
    argv = sys.argv
    try:
        sys.argv = ['build_www.py', '--config', cfg]
        a = build_www.update_feed()
        sys.argv = ['build_www.py', '--config', cfg, '--feed', 'http://localhost:8765/x.json']
        b = build_www.update_feed()
        sys.argv = ['build_www.py', '--config', os.path.join(NAS, '_none.json')]
        c = build_www.update_feed()
    finally:
        sys.argv = argv
    os.remove(cfg)
    ctx.check(a == 'https://nas.example/mo/latest.json' and b == 'http://localhost:8765/x.json' and c is None,
              'build_www.py: 설정 파일 feed → 앱에, --feed가 먼저, 설정 없으면 넣지 않음(GitHub)', f'{a} / {b} / {c}')

    # ---- 앱 쪽 (appUpdate_v2.js) ----
    g = ctx.game(fresh=True)
    g.enter_v2()
    st = g.js(MOD + """
        const n = U.parseFeed({ version: '0.2.1', build: 3, notes: '- 새것', file: 'releases/0.2.1-b3/MadOverlord-0.2.1-b3.apk', size: 100 },
            'https://nas.example/madoverlord/latest.json');
        const gh = U.parseFeed({ tag_name: 'v0.3.0', name: '0.3.0 [필수]', body: '바뀐 점',
            assets: [{ name: 'MadOverlord-0.3.0-b5.apk', browser_download_url: 'https://github.com/x.apk', size: 9 }] }, 'https://api.github.com/');
        return { n, gh, bad: [U.parseFeed(null), U.parseFeed({ version: '1.0.0' }), U.parseFeed({ tag_name: 'v1', assets: [] })] };""")
    n, gh = st['n'], st['gh']
    ctx.check(n['url'] == 'https://nas.example/madoverlord/releases/0.2.1-b3/MadOverlord-0.2.1-b3.apk' and n['build'] == 3
              and n['fileName'] == 'MadOverlord-0.2.1-b3.apk' and n['required'] is False and n['notes'] == '- 새것',
              'NAS latest.json: APK 상대 주소 → latest.json 기준 전체 주소, 빌드·파일 이름', str(n))
    ctx.check(gh['version'] == '0.3.0' and gh['required'] is True and gh['url'] == 'https://github.com/x.apk' and st['bad'] == [None, None, None],
              'GitHub 릴리스 모양도 그대로 읽음 ([필수]), APK 없는 정보는 무시', str(st))
    st = g.js(MOD + """
        const v = (version, build) => U.isNewer({ version, build }, '0.2.0', 2);
        return [v('0.2.1', 3), v('0.2.0', 3), v('0.2.0', 2), v('0.1.9', 9), v('0.2.0', 0), v('0.10.0', 1)];""")
    ctx.check(st == [True, True, False, False, False, True], '새 버전 판단: 버전이 높거나, 같은 버전에 빌드가 높으면 새것', str(st))

    st = g.js(MOD + f"""
        window.madOverlordUpdateFeed = location.origin + '{FEED}';
        const a = await U.fetchLatest();
        const apk = a && await fetch(a.url).then(r => r.status);
        window.madOverlordUpdateFeed = location.origin + '/tools/tests/_out/feed_nas/none.json';
        const missing = await U.fetchLatest();
        window.madOverlordUpdateFeed = location.origin + '/index.css';
        const broken = await U.fetchLatest();
        delete window.madOverlordUpdateFeed;
        return {{ a, apk, missing, broken }};""")
    a = st['a'] or {}
    ctx.check(a.get('version') == '0.2.1' and a.get('build') == 3 and st['apk'] == 200 and st['missing'] is None and st['broken'] is None,
              '웹: 설정한 주소의 latest.json을 읽고 APK 주소가 열림, 파일이 없거나 JSON이 아니면 조용히 null', str(st))

    st = g.js(MOD + """
        const calls = [];
        window.madOverlordApp = true;
        window.Capacitor = { Plugins: { AppUpdate: { fetchText: async o => { calls.push(o);
            return { status: 200, text: JSON.stringify({ version: '9.0.0', build: 99, file: 'r/a.apk', required: true }) }; } } } };
        window.madOverlordUpdateFeed = 'https://nas.example/mo/latest.json';
        const a = await U.fetchLatest();
        window.Capacitor.Plugins.AppUpdate.fetchText = async () => { throw new Error('offline'); };
        const off = await U.fetchLatest();
        delete window.madOverlordUpdateFeed; delete window.madOverlordApp; delete window.Capacitor;
        return { a, off, url: calls[0] && calls[0].url, timeout: calls[0] && calls[0].timeout };""")
    a = st['a'] or {}
    ctx.check(a.get('url') == 'https://nas.example/mo/r/a.apk' and a.get('required') is True and st['off'] is None
              and st['url'].startswith('https://nas.example/mo/latest.json?t=') and st['timeout'] == 8000,
              '앱: 네이티브 AppUpdate.fetchText로 읽음(캐시 피하기 ?t=, 8초 제한), 실패하면 null', str(st))
    shutil.rmtree(NAS, ignore_errors=True)
