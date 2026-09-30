/* ==========================================================================
   PROJECT: MAD OVERLORD // GAME TIME (v2)
   전투 시간 흐름을 한곳에서 관리한다. 전투 로직(battle_v2), 캐릭터 리그(rigAvatar), 전장 이펙트(battleFx)
   루프가 모두 scale(now)를 곱해 경과 시간을 계산한다.
   - 히트스톱: 강한 타격 순간 아주 잠깐 멈춰 타격감을 줌 (절대 시각 기준이라 루프마다 따로 빼지 않음)
   - 일시정지 / 배속(1x, 2x): 전투 HUD 버튼
   ========================================================================== */

export const gameTime = {
    freezeUntil: 0,
    cooldownUntil: 0,
    paused: false,
    speed: 1,

    /** sec초 동안 멈춤. 연타로 계속 멈추지 않도록 멈춤이 끝난 뒤 짧은 재사용 대기 */
    hitStop(sec = 0.05, cooldown = 0.12) {
        const now = performance.now();
        if (now < this.cooldownUntil) return;
        this.freezeUntil = now + sec * 1000;
        this.cooldownUntil = this.freezeUntil + cooldown * 1000;
    },

    frozen(now = performance.now()) {
        return this.paused || now < this.freezeUntil;
    },

    /** 경과 시간 배율: 멈춤(히트스톱/일시정지)이면 0, 아니면 배속 */
    scale(now = performance.now()) {
        return this.frozen(now) ? 0 : this.speed;
    },

    /** 전투 시작/종료 시 초기화 (메뉴 화면 캐릭터가 멈춘 채 남지 않도록) */
    reset() {
        this.paused = false;
        this.speed = 1;
        this.freezeUntil = 0;
        this.cooldownUntil = 0;
    }
};
