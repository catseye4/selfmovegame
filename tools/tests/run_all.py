"""
v2 브라우저 자동 검사 한 번에 실행

  python tools/tests/run_all.py            # 전부
  python tools/tests/run_all.py battle     # 이름에 'battle'이 들어간 검사만

필요: Python playwright (설치된 Chrome 사용). 서버는 검사가 직접 띄운다.
결과: 항목마다 PASS/FAIL, 실패가 있으면 종료 코드 1. 스크린샷은 tools/tests/_out/
"""
import importlib
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import run_tests  # noqa: E402

NAMES = ['test_menu_lab', 'test_battle', 'test_flow', 'test_sound', 'test_stages', 'test_bases', 'test_zone2']


def main():
    only = sys.argv[1] if len(sys.argv) > 1 else ''
    mods = []
    for n in NAMES:
        if only and only not in n:
            continue
        if not os.path.exists(os.path.join(os.path.dirname(os.path.abspath(__file__)), f'{n}.py')):
            continue
        mods.append(importlib.import_module(n))
    npass, nfail, lines = run_tests(mods)
    print('\n'.join(lines))
    print(f'\n== 통과 {npass} / 실패 {nfail} ==')
    sys.exit(1 if nfail else 0)


if __name__ == '__main__':
    main()
