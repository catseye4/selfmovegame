"""
출시용 APK 만들기 (D-074) — GitHub 릴리스에 올릴 파일을 app/dist/ 에 만든다.

실행: app 폴더에서  python release.py

1. js/version_v2.js 의 VERSION·BUILD를 읽고, GitHub 최신 릴리스보다 높은지 확인 (같거나 낮으면 멈춤 — 버전부터 올릴 것)
2. build_www.py (게임 파일 모으기 + Android 버전 맞추기) → npx cap sync android
3. gradlew assembleRelease (서명 키: <사용자 폴더>/.android/madoverlord-release.properties — 없으면 멈춤)
4. app/dist/MadOverlord-<VERSION>-b<BUILD>.apk 와 릴리스 설명 틀(release_notes.md)을 만든다

올리기: GitHub 저장소 → Releases → Draft a new release → 태그 v<VERSION> → 제목·설명 → APK 첨부 → Publish.
앱은 "최신 릴리스"(Latest)의 태그와 APK를 읽는다. 제목이나 설명에 [필수]를 넣으면 앱에서 [나중에]가 없어진다.
"""
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
JBR = r'C:\Program Files\Android\Android Studio\jbr'
PROPS = os.path.join(os.path.expanduser('~'), '.android', 'madoverlord-release.properties')
REPO = 'catseye4/selfmovegame'


def read_version():
    src = open(os.path.join(ROOT, 'js', 'version_v2.js'), encoding='utf-8').read()
    return re.search(r"VERSION = '([^']+)'", src).group(1), int(re.search(r'BUILD = (\d+)', src).group(1))


def ver_tuple(v):
    return tuple(int(x) for x in re.findall(r'\d+', v.split('-')[0])[:3])


def latest_release():
    try:
        with urllib.request.urlopen(f'https://api.github.com/repos/{REPO}/releases/latest', timeout=10) as r:
            return json.load(r).get('tag_name', '').lstrip('v')
    except Exception:
        return None   # 릴리스가 아직 없거나 인터넷 없음


def run(cmd, **kw):
    print('>', ' '.join(cmd) if isinstance(cmd, list) else cmd, flush=True)
    subprocess.run(cmd, check=True, **kw)


def main():
    version, build = read_version()
    latest = latest_release()
    print(f'버전 {version} (빌드 {build}) · GitHub 최신 릴리스: {latest or "없음"}')
    if latest and ver_tuple(version) <= ver_tuple(latest):
        sys.exit(f'js/version_v2.js의 VERSION({version})이 최신 릴리스({latest})보다 높아야 합니다. BUILD도 1 올리세요.')
    if not os.path.exists(PROPS):
        sys.exit(f'서명 설정이 없습니다: {PROPS}')
    run([sys.executable, 'build_www.py'], cwd=HERE)
    run('npx cap sync android', cwd=HERE, shell=True)
    env = dict(os.environ, JAVA_HOME=JBR)
    run([os.path.join(HERE, 'android', 'gradlew.bat'), 'assembleRelease', '--console=plain'], cwd=os.path.join(HERE, 'android'), env=env)
    src = os.path.join(HERE, 'android', 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk')
    os.makedirs(os.path.join(HERE, 'dist'), exist_ok=True)
    dst = os.path.join(HERE, 'dist', f'MadOverlord-{version}-b{build}.apk')
    shutil.copy2(src, dst)
    sha = hashlib.sha256(open(dst, 'rb').read()).hexdigest()
    notes = os.path.join(HERE, 'dist', 'release_notes.md')
    open(notes, 'w', encoding='utf-8').write(
        f'## 매드 오버로드 {version} (빌드 {build})\n\n- (바뀐 점을 적기)\n\n'
        f'APK: MadOverlord-{version}-b{build}.apk · SHA-256 {sha}\n')
    print(f'\n완료: {dst} ({os.path.getsize(dst) / 1048576:.1f} MB)\n태그: v{version}\n설명 틀: {notes}')


if __name__ == '__main__':
    main()
