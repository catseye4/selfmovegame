# 🚀 MAD OVERLORD // AI 대화 맥락 인계 문서 (Context Handover)

**생성 일시**: 2026년 9월 10일  
**프로젝트**: MAD OVERLORD (Decoupled Engine v2)  
**깃 저장소**: `https://github.com/catseye4/selfmovegame.git` (`main` 브랜치)  
**Conversation ID**: `42a9cb88-c549-4562-8c7f-0ec857744d01`

---

## 📌 1. 다른 PC에서 AI에게 대화를 이어서 요청하는 방법

다른 PC의 AI(Antigravity / Claude / ChatGPT / Gemini 등)를 켜고, 아래 **[2. AI 프롬프트 복사용 텍스트]** 구역 전체를 복사하여 첫 번째 메시지로 전달하면 다른 PC에서도 100% 동일한 대화 맥락과 설계 지식을 유지한 채 개발을 이어서 진행할 수 있습니다.

또한 프로젝트 코드는 Git으로 최신 반영되어 있으므로, 타 PC에서 `git pull origin main`을 수행하시면 소스 코드도 100% 동기화됩니다.

---

## 📝 2. AI 대화 복사용 핸드오버 프롬프트 (복사하여 다른 PC AI에게 전달)

```markdown
안녕하세요 AI assistant! 이전 PC에서 진행하던 'MAD OVERLORD' 게임 프로젝트의 개발 대화 맥락을 이어서 진행하려고 합니다.
아래 명세된 현재 시스템 상태와 아키텍처 규칙을 바탕으로 개발을 이어서 계속 보조해 주세요.

### ⚠️ 최중요 개발 규칙 (Critical Constraints)
- 사용자가 명시적으로 구버전 수정을 요청하지 않는 한, **모든 구현 및 수정은 오직 v2 모듈군 (`js/engine_v2/`, `js/ui_v2/`, `js/main_v2.js`, `*-v2` 요소, `playground.html`)**에 한해서만 수행해야 합니다.

### 🛠️ 현재까지 완료된 핵심 구현 내역
1. **v2 디커플드 엔진 & 가슴 기준 마운트 앵커 (`BODY_ANCHORS_DB`)**:
   - 가슴(body)을 Origin (0,0)으로 두고 머리, 양팔, 양다리의 소켓 위치를 앵커 DB로 동기화.
   - 파츠별 독립 피벗 및 오프셋 (`rightPivot`, `leftPivot`, `offsetX`, `offsetY`) 지원.

2. **신규 무기 '레이저 포대' (`arm_mech_laser`) & 3단계 순차 시퀀스 공격 애니메이션**:
   - **Step 1 (0s ~ 0.35s)**: 왼팔 0도 고정, 오른쪽 레이저 포대만 반시계 30도(-30°) 상승 조준.
   - **Step 2 (0.35s ~ 0.65s)**: 포구 노즐 팁 정중앙에서 직경 25px 네온 차징 원 펄스 생성.
   - **Step 3 (0.65s ~ 지속)**: 45도 대각선 아래 방향으로 직경 15px 레이저 플라즈마 구체 무한 연사 사격.

3. **최상단 Z-Index 이펙트 덮어쓰기 (Post-Image Rendering)**:
   - 파츠 이미지 드로잉(`ctx.drawImage`) 완료 직후 차징 원과 레이저 구체를 덮어써서 파츠 이미지 전면 최상단에 100% 선명하게 표출.

4. **플레이그라운드 Kiosk 시스템 (`playground.html` & `js/ui/playground.js`)**:
   - 각 파츠 드롭다운 1번에 `[파츠제거]` (`id: 'none'`) 탑재 (선택 시 뼈대 와이어프레임 모드).
   - 실시간 터미널 스타일 로그 콘솔 (`#debug-log-console`) 수록.
   - 자산 파일 누락/404 로드 에러 시 붉은색 글씨(`color: #ff0055`)로 실시간 로깅.
   - 드롭다운 변경 시 4줄 중복 방지 ➔ **조작한 슬롯 파츠의 로그 1줄만 단독 출력**.
   - 몬스터/기체 선택 드롭다운 (`select-monster-type`): `거대로봇 (메카닉)` 중심 출력. 뼈대 미존재 몬스터 (`거대괴수`, `타락영웅`) 선택 시 붉은색 에러 출력 및 자동 선택 취소 원복.
   - `populatePartSelectors`: '거대로봇' 팩션 파츠만 드롭다운에 출력하는 동적 필터 파이프라인 수립.

### 📂 핵심 파일 지도
- `js/engine_v2/renderer.js`: 캔버스 2D 페이퍼돌 렌더러, 앵커 연동, Z-Index 최상단 이펙트 및 공격 시퀀스
- `js/engine_v2/robotStructure.js`: 로봇 파츠 구조체 및 뼈대 관리
- `js/data/parts.js`: 파츠 데이터베이스 및 `BODY_ANCHORS_DB`
- `js/ui/playground.js`: 플레이그라운드 Kiosk 컨트롤러 및 디버그 로거
- `playground.html`: 플레이그라운드 뷰포트 마크다운

위 맥락을 이해하셨다면 준비되었다고 답변하고 다음 지시를 기다려주세요!
```

---

## 📁 3. Antigravity 원본 대화 로그 파일 위치 (참고용)

현재 PC의 Antigravity 대화 시스템 파일 전체 로그 원본 경로입니다:
- **전체 로그 경로**: `C:\Users\divel\.gemini\antigravity\brain\42a9cb88-c549-4562-8c7f-0ec857744d01\.system_generated\logs\transcript.jsonl`
- **프로젝트 명세 문서**:
  - [20260726_작업내용.md](file:///e:/Project/SelfMovingGame/20260726_작업내용.md)
  - [디자인_엔진_적용사항.md](file:///e:/Project/SelfMovingGame/디자인_엔진_적용사항.md)
