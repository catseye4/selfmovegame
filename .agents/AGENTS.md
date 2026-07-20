# PROJECT: MAD OVERLORD // 개발 및 수정 행동 규칙 (Behavioral Constraints)

이 프로젝트는 기존의 바닐라 버전 소스 코드의 무오류 상태를 보존하고, 신규 디커플드 엔진 v2 아키텍처를 독립적으로 고도화하기 위한 특별 개발 규칙을 적용합니다.

---

## ⚠️ 최중요 행동 제약 사항 (Critical Constraints)

1. **v2 엔진 및 모듈 한정 개발**:
   - 사용자가 명시적으로 구버전의 수정을 직접 오더하지 않는 한, **모든 기능 구현, 버그 수정, 스타일 변경 및 레이아웃 수정 명령은 오직 v2 모듈군(`js/engine_v2/`, `js/ui_v2/`, `js/main_v2.js`, `*-v2` 마크업 요소)에 한해서만 수행**해야 합니다.
   - 구버전 모듈(`js/engine/`, `js/ui/`, `js/main.js` 등)의 코드는 절대 임의로 수정하거나 간섭해서는 안 됩니다.

2. **v2 타겟 식별 명세**:
   - 수정 대상 파일:
     - [js/engine_v2/](file:///e:/Project/SelfMovingGame/js/engine_v2/) 하위의 모든 모듈 (renderer.js, spriteAnimator_v2.js, monster_v2.js, battle_v2.js)
     - [js/ui_v2/](file:///e:/Project/SelfMovingGame/js/ui_v2/) 하위의 모든 UI 모듈 (menu_v2.js, lab_v2.js)
     - [js/main_v2.js](file:///e:/Project/SelfMovingGame/js/main_v2.js) 전용 메인 진입 스크립트
     - [index.html](file:///e:/Project/SelfMovingGame/index.html) 및 [index.css](file:///e:/Project/SelfMovingGame/index.css) 내의 `*-v2` 관련 뷰포트 레이아웃 및 스타일 클래스
     - [playground.html](file:///e:/Project/SelfMovingGame/playground.html) 플레이그라운드 관련 리소스
