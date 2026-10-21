"""
Codex에게 작은 코딩 작업을 맡긴다 (Claude가 브리프를 쓰고, 끝나면 Claude가 diff·검사로 검증)

Codex 앱에 들어 있는 CLI(codex exec)를 비대화형으로 돌린다. 로그인은 Codex 앱과 같다(~/.codex).
- 브리프 앞에 공통 규칙(아래 RULES)을 붙여 보낸다
- 시간 제한(기본 20분)을 넘기면 프로세스를 끝내고 실패로 남긴다
- 실행 전후 git 상태를 비교해 Codex가 바꾼 파일만 골라 보여 준다 (커밋은 하지 않음)
- 기록: tools/ai/_runs/<시각>_<이름>/ 에 prompt.md · log.txt · result.md(마지막 보고) · changes.txt · diff.patch

실행: python tools/ai/codex_task.py <브리프.md> [--name 이름] [--read-only] [--timeout 분]
                                    [--model 모델] [--effort low|medium|high] [--image 그림 ...]
끝 코드: 0 성공 / 1 Codex 오류 / 124 시간 초과
"""
import argparse
import glob
import hashlib
import os
import shutil
import subprocess
import sys
import time

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
RUNS = os.path.join(ROOT, 'tools', 'ai', '_runs')

RULES = """너는 이 저장소(MAD OVERLORD, 바닐라 JS 브라우저 게임)에서 Claude가 맡긴 작은 작업을 한다.
결과는 Claude가 diff와 자동 검사로 검증한다. 규칙:
1. 먼저 `.agents/AGENTS.md`를 읽고 따른다. 게임 코드는 v2 모듈(js/engine_v2/, js/ui_v2/, js/main_v2.js, *-v2 요소)만 고친다
   (구버전 js/engine/, js/ui/, js/main.js 금지). 도구(tools/)는 [작업]에 적혀 있으면 고쳐도 된다.
2. 아래 [작업]에 적힌 파일만 고친다. 다른 파일도 고쳐야 할 것 같으면 고치지 말고 마지막 보고에 적는다.
3. 하지 말 것: git commit·push·checkout·reset·stash·브랜치 만들기, MD/ 문서 수정(기록은 Claude가 한다),
   패키지 설치, 파일 이동·삭제, 포맷터로 파일 전체 다시 쓰기.
4. 주변 코드의 이름·주석 양·스타일을 따른다. 요청 범위 밖의 리팩터링은 하지 않는다.
5. 확인할 수 있는 건 직접 확인한다 (예: `node --check <파일>`).
6. 끝나면 한국어로 짧게 보고한다: 바꾼 파일과 내용 / 실행한 확인과 결과 / 확인 못 한 것 / Claude가 봐야 할 곳.
"""
READ_ONLY_RULE = "\n이번 작업은 읽기 전용이다. 파일을 고치지 말고 조사해서 답만 한다.\n"


def find_codex():
    """Codex 앱 CLI → PATH의 codex → VS Code 확장 순서로 찾는다 (앱 업데이트로 폴더 이름이 바뀌어도 최신을 고름)"""
    if os.environ.get('CODEX_EXE'):
        return os.environ['CODEX_EXE']
    local = os.environ.get('LOCALAPPDATA', '')
    cands = glob.glob(os.path.join(local, 'OpenAI', 'Codex', 'bin', '*', 'codex.exe'))
    if cands:
        return max(cands, key=os.path.getmtime)
    if shutil.which('codex'):
        return shutil.which('codex')
    cands = glob.glob(os.path.expanduser('~/.vscode/extensions/openai.chatgpt-*/bin/*/codex.exe'))
    if cands:
        return max(cands, key=os.path.getmtime)
    sys.exit('codex를 찾지 못함: Codex 앱을 설치하거나 CODEX_EXE 환경 변수에 codex.exe 경로를 넣는다')


def git(*args):
    return subprocess.run(['git', *args], cwd=ROOT, capture_output=True).stdout


def dirty_files():
    """지금 바뀐(또는 새) 파일 → 내용 해시. 실행 전후를 비교해 Codex가 건드린 파일만 고른다"""
    out = git('status', '--porcelain', '-uall', '-z').decode('utf-8', 'replace').split('\0')
    files, i = {}, 0
    while i < len(out):
        entry = out[i]
        i += 1
        if len(entry) < 4:
            continue
        status, path = entry[:2], entry[3:]
        if 'R' in status or 'C' in status:
            i += 1   # 이름 바뀜: 다음 칸은 옛 이름
        full = os.path.join(ROOT, path)
        if os.path.isfile(full):
            with open(full, 'rb') as f:
                files[path] = hashlib.sha1(f.read()).hexdigest()
        else:
            files[path] = 'deleted'
    return files


def kill_tree(proc):
    if os.name == 'nt':
        subprocess.run(['taskkill', '/PID', str(proc.pid), '/T', '/F'], capture_output=True)
    else:
        proc.kill()


def main():
    ap = argparse.ArgumentParser(description='Codex에게 작업 맡기기')
    ap.add_argument('brief', help='작업 내용을 적은 파일 (UTF-8)')
    ap.add_argument('--name', help='기록 폴더 이름 (기본: 브리프 파일 이름)')
    ap.add_argument('--read-only', action='store_true', help='조사·답만, 파일 수정 금지')
    ap.add_argument('--timeout', type=float, default=20, help='시간 제한(분), 기본 20')
    ap.add_argument('--model', help='모델 (기본: ~/.codex/config.toml)')
    ap.add_argument('--effort', choices=['low', 'medium', 'high'], help='생각 깊이')
    ap.add_argument('--image', nargs='+', default=[], help='함께 보낼 그림')
    args = ap.parse_args()
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')

    with open(args.brief, encoding='utf-8') as f:
        brief = f.read().strip()
    prompt = RULES + (READ_ONLY_RULE if args.read_only else '') + '\n[작업]\n' + brief + '\n'

    name = args.name or os.path.splitext(os.path.basename(args.brief))[0]
    run_dir = os.path.join(RUNS, time.strftime('%Y%m%d_%H%M%S') + '_' + name)
    os.makedirs(run_dir)
    with open(os.path.join(run_dir, 'prompt.md'), 'w', encoding='utf-8') as f:
        f.write(prompt)
    result_path = os.path.join(run_dir, 'result.md')

    exe = find_codex()
    cmd = [exe, 'exec']
    if args.image:
        cmd += ['-i', *[os.path.abspath(p) for p in args.image]]
    cmd += ['-s', 'read-only' if args.read_only else 'workspace-write', '-C', ROOT,
            '--color', 'never', '-o', result_path]
    if args.model:
        cmd += ['-m', args.model]
    if args.effort:
        cmd += ['-c', f'model_reasoning_effort="{args.effort}"']
    cmd.append('-')   # 브리프는 stdin으로 (한글·긴 글을 명령줄에 넣지 않음)

    before = dirty_files()
    print(f'Codex 시작: {name} (제한 {args.timeout:g}분, {"읽기 전용" if args.read_only else "쓰기"})', flush=True)
    t0 = time.time()
    with open(os.path.join(run_dir, 'log.txt'), 'wb') as log:
        proc = subprocess.Popen(cmd, cwd=ROOT, stdin=subprocess.PIPE, stdout=log, stderr=subprocess.STDOUT)
        proc.stdin.write(prompt.encode('utf-8'))
        proc.stdin.close()
        try:
            code = proc.wait(timeout=args.timeout * 60)
        except subprocess.TimeoutExpired:
            kill_tree(proc)
            proc.wait()
            code = 124
    secs = time.time() - t0

    after = dirty_files()
    changed = sorted(p for p in set(before) | set(after) if before.get(p) != after.get(p))
    tracked = [p for p in changed if git('ls-files', '--', p).strip()]
    new = [p for p in changed if p not in tracked]
    with open(os.path.join(run_dir, 'changes.txt'), 'w', encoding='utf-8') as f:
        for p in changed:
            mark = '새 파일' if p in new else ('지움' if after.get(p, 'clean') == 'deleted' else '고침')
            mark += ' (실행 전부터 바뀌어 있던 파일)' if p in before else ''
            f.write(f'{mark}\t{p}\n')
    if tracked:
        with open(os.path.join(run_dir, 'diff.patch'), 'wb') as f:
            f.write(git('diff', '--', *tracked))

    status = '성공' if code == 0 else ('시간 초과' if code == 124 else f'오류 (끝 코드 {code})')
    print(f'Codex 끝: {status}, {secs / 60:.1f}분, 기록 {os.path.relpath(run_dir, ROOT)}')
    print('\n[바뀐 파일]')
    print('\n'.join(f'  {p}' + ('  (새 파일)' if p in new else '') for p in changed) or '  없음')
    if [p for p in changed if p in before]:
        print('  ※ 실행 전부터 바뀌어 있던 파일이 섞여 있음: diff.patch에 그 전 변경도 들어 있다')
    print('\n[Codex 보고]')
    if os.path.isfile(result_path):
        with open(result_path, encoding='utf-8', errors='replace') as f:
            print(f.read().strip())
    else:
        print('  (보고 없음 — log.txt 확인)')
    sys.exit(0 if code == 0 else (124 if code == 124 else 1))


if __name__ == '__main__':
    main()
