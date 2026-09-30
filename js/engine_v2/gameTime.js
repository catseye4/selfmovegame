/* ==========================================================================
   PROJECT: MAD OVERLORD // GAME TIME (v2)
   히트스톱: 강한 타격 순간 전투 전체(전투 로직, 캐릭터 리그, 전장 이펙트)를 아주 잠깐 멈춰 타격감을 준다.
   각 루프는 frozen(now)이 true인 동안 경과 시간을 0으로 처리한다 (루프마다 따로 시간을 빼지 않도록 절대 시각 사용).
   ========================================================================== */

export const gameTime = {
    freezeUntil: 0,
    cooldownUntil: 0,

    /** sec초 동안 멈춤. 연타로 계속 멈추지 않도록 멈춤이 끝난 뒤 짧은 재사용 대기 */
    hitStop(sec = 0.05, cooldown = 0.12) {
        const now = performance.now();
        if (now < this.cooldownUntil) return;
        this.freezeUntil = now + sec * 1000;
        this.cooldownUntil = this.freezeUntil + cooldown * 1000;
    },

    frozen(now = performance.now()) {
        return now < this.freezeUntil;
    }
};
