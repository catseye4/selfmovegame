/* 조작을 가리지 않는 진행 줄. 표시를 미뤄도 실제 행동 기록은 계속된다. */
import { progress } from '../engine_v2/progress_v2.js';
import { TUTORIAL_STEPS } from '../engine_v2/tutorial_v2.js';
import { coach } from './coach_v2.js';

const GOALS = {
    sortie: '알아서 걷고 싸워요. 먼저 출격해 보세요.',
    combat: '스킬 단추를 누르거나 AUTO에 맡기세요.',
    result: '얻은 DM으로 다음 전투를 준비해요.',
    lab: '연구소에서 파츠를 바꿔 보세요.',
    compare: '새 파츠를 골라 바뀌는 능력치를 확인하세요. 레이저 팔을 추천해요.',
    equip: '개조 확정으로 구매와 장착을 마쳐요.',
    resortie: '새 파츠로 다음 열린 판에 도전하세요. 패배했다면 같은 판 재도전도 좋아요.'
};
const ANCHORS = { offline: '#btn-menu-offline-v2', pet: '#btn-menu-support-v2', shop: '#btn-menu-shop-v2' };

export function tutorialBlocked() {
    return document.hidden || !!document.querySelector('.v2-loading, .v2-settings, .v2-mobile-web__portrait:not([hidden]), .v2-mobile-web__banner:not([hidden])');
}

export class TutorialUi {
    constructor(router) {
        this.router = router;
        this.row = document.createElement('div');
        this.row.id = 'tutorial-progress-v2';
        this.row.className = 'v2-tutorial';
        this.row.hidden = true;
        this.row.innerHTML = '<span role="status"></span><button data-tutorial="skip">건너뛰기</button><button data-tutorial="claim">200 DM 받기</button>';
        this.row.querySelector('[data-tutorial="skip"]').addEventListener('click', () => { progress.skipTutorial(); this.update(); });
        this.row.querySelector('[data-tutorial="claim"]').addEventListener('click', () => { progress.claimTutorialReward(); this.update(); });
        this.timer = setInterval(() => this.update(), 250);
        this.update();
    }

    update() {
        const screen = document.querySelector(`#screen-${this.router.currentScreen}-v2.active`);
        const blocked = tutorialBlocked() || window.madOverlordGameMode !== 'v2';
        if (blocked || !screen) {
            this.row.hidden = true;
            if (this.intro) { this.intro.remove(); this.intro = null; }
            return;
        }
        if (this.row.parentElement !== screen) screen.appendChild(this.row);
        const t = progress.tutorialState(), step = progress.tutorialStep();
        const reward = !progress._tutorialReplay && t.status === 'complete' && !t.rewardClaimed;
        this.row.hidden = !step && !reward;
        this.row.querySelector('[data-tutorial="skip"]').hidden = !step;
        this.row.querySelector('[data-tutorial="claim"]').hidden = !reward;
        if (step) {
            let goal = GOALS[step];
            if (['compare', 'equip'].includes(step) && !progress.tutorialCanBuy()) {
                goal = 'DM이 부족하면 보유 파츠 장착·강화 뒤 재도전할 수 있어요.';
            }
            this.row.querySelector('span').textContent = `첫 성장 안내 ${TUTORIAL_STEPS.indexOf(step) + 1}/7 · ${goal}`;
            progress.tutorialShown();
        } else if (reward) this.row.querySelector('span').textContent = '첫 성장 완료';
        if (step || this.router.currentScreen !== 'menu' || document.querySelector('.v2-coach, [role="dialog"]')) return;
        const id = progress.nextTutorialIntro();
        if (id) {
            const el = coach(`${id}_intro`, ANCHORS[id], { remember: false });
            if (el) { this.intro = el; progress.markTutorialIntro(id); }
        }
    }
}
