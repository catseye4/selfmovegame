@echo off
chcp 65001 >nul
setlocal
rem ===================================================================
rem  MAD OVERLORD v2 받기 (브랜치 feature/rig-characters-vfx)
rem  - 기존에 clone한 저장소(main): git pull 로 이 파일을 받은 뒤 더블클릭
rem      -> v2 브랜치로 전환하고 최신 내용을 받음 (main으로 돌아가기: git checkout main)
rem  - 저장소가 없으면: 빈 폴더에 이 파일만 두고 더블클릭 -> selfmovegame\ 에 받고 v2로 전환
rem  - 다시 실행하면 v2 최신 내용으로 업데이트
rem  ※ 이 파일은 main과 v2 브랜치에 똑같은 내용으로 둔다 (실행 중 브랜치를 바꿔도 파일이 그대로이도록)
rem  필요: Git (https://git-scm.com) / 게임 실행에는 Python 3
rem ===================================================================
set "REPO=https://github.com/catseye4/selfmovegame.git"
set "BRANCH=feature/rig-characters-vfx"
set "HERE=%~dp0"

where git >nul 2>nul
if errorlevel 1 goto :nogit

if exist "%HERE%.git" (
    set "DIR=%HERE%"
) else (
    set "DIR=%HERE%selfmovegame"
)

if not exist "%DIR%\.git" (
    echo [1/3] 저장소 받는 중... %REPO%
    git clone "%REPO%" "%DIR%"
    if errorlevel 1 goto :fail
)

cd /d "%DIR%"
echo [2/3] 브랜치 전환: %BRANCH%
git fetch origin
if errorlevel 1 goto :fail
git checkout "%BRANCH%"
if errorlevel 1 goto :fail
echo [3/3] 최신 내용 받기
git pull --ff-only origin "%BRANCH%"
if errorlevel 1 goto :fail

echo.
echo 완료: %CD%
echo 게임 실행: python serve.py  -^>  http://localhost:8099  -^>  "디커플드 엔진 모드 (v2)"
echo 변경점 한눈에: MD\v2_변경점.html
echo 원래(main)로 돌아가기: git checkout main
echo.
set "RUN="
set /p RUN=지금 게임을 실행할까요? [y/N] 
if /i not "%RUN%"=="y" goto :end
where python >nul 2>nul
if errorlevel 1 goto :nopython
start "MAD OVERLORD server" cmd /k python serve.py
timeout /t 2 /nobreak >nul
start "" http://localhost:8099
goto :end

:nogit
echo [오류] Git이 없습니다. https://git-scm.com 에서 설치한 뒤 다시 실행하세요.
goto :end

:nopython
echo [오류] Python이 없습니다. https://www.python.org 에서 설치한 뒤 python serve.py 를 실행하세요.
goto :end

:fail
echo.
echo [오류] 위 메시지를 확인하세요. 작업 폴더에 고친 파일이 있으면 브랜치 전환이 막힐 수 있습니다 (git status 로 확인).

:end
echo.
pause
endlocal
