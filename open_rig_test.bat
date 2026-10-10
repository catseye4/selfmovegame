@echo off
chcp 65001 >nul
setlocal
rem ===================================================================
rem  MAD OVERLORD 리그 테스트 화면 열기 (rig_test.html)
rem  rig_test.html은 파일을 바로 열면(file://) 브라우저 보안 규칙 때문에 코드·그림을 못 불러와 멈춘다.
rem  이 파일을 더블클릭하면 로컬 서버(python serve.py, 포트 8099)를 켜고 http://localhost:8099/rig_test.html 을 연다.
rem  이미 서버가 켜져 있으면 브라우저만 연다. 서버 창을 닫으면 서버가 꺼진다.
rem  필요: Python 3
rem ===================================================================
cd /d "%~dp0"
set "URL=http://localhost:8099/rig_test.html"

powershell -NoProfile -Command "try { Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8099/serve.py -TimeoutSec 2 | Out-Null; exit 0 } catch { exit 1 }" >nul 2>nul
if not errorlevel 1 goto :open

where python >nul 2>nul
if errorlevel 1 goto :nopython
echo 로컬 서버를 켭니다 (창 "MAD OVERLORD server" — 닫으면 꺼짐)
start "MAD OVERLORD server" /min cmd /k python serve.py
timeout /t 2 /nobreak >nul

:open
start "" "%URL%"
goto :end

:nopython
echo [오류] Python이 없습니다. https://www.python.org 에서 설치한 뒤 다시 실행하세요.
pause

:end
