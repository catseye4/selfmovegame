/* ==========================================================================
   PROJECT: MAD OVERLORD // SPRITE FRAME ANIMATOR
   Devwin Character Engine(Unity)에서 Recorder로 추출한 PNG 시퀀스를
   캔버스에 순차 재생한다.
   ========================================================================== */

const ANIMATIONS = {
    walk: { path: 'assets/sprites/player/walk/', frameCount: 38, fps: 30, loop: true },
    attack: { path: 'assets/sprites/player/attack/', frameCount: 31, fps: 30, loop: true },
    idle: { path: 'assets/sprites/player/idle/', frameCount: 61, fps: 30, loop: true }
};

// 원본은 512x512 캔버스에 캐릭터가 작게(약 55%) 들어있어 그대로 그리면 컨테이너 안에서 너무 작아 보인다.
// walk/attack/idle 130프레임 전체를 스캔해 실제 캐릭터가 차지하는 영역(X:110~390, Y:136~352)에
// 여유 마진을 더한 고정 크롭 사각형으로 잘라서 확대해 그린다. (프레임마다 다르게 자르면 흔들려 보이므로 전체 공통 고정값)
// 하단 마진은 최소화(약 6px)해서 캔버스 바닥 = 캐릭터 발바닥에 가깝게 맞춘다 (공중부양 방지).
const SOURCE_CROP = { x: 90, y: 110, w: 330, h: 248 };

function frameSrc(def, index) {
    const idx = String(index).padStart(2, '0');
    return `${def.path}frame_${idx}.png`;
}

export class SpriteAnimator {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.cache = {}; // animName -> HTMLImageElement[]
        this.currentName = null;
        this.frameIndex = 0;
        this.elapsedMs = 0;
        this.lastTime = 0;
        this.running = false;
        this._boundTick = this._tick.bind(this);

        for (const name in ANIMATIONS) {
            this._loadFrames(name);
        }
    }

    _loadFrames(name) {
        if (this.cache[name]) return this.cache[name];
        const def = ANIMATIONS[name];
        const images = [];
        for (let i = 0; i < def.frameCount; i++) {
            const img = new Image();
            img.src = frameSrc(def, i);
            images.push(img);
        }
        this.cache[name] = images;
        return images;
    }

    // 애니메이션 전환 (이미 재생 중이면 무시)
    play(name) {
        if (!ANIMATIONS[name] || this.currentName === name) return;
        this.currentName = name;
        this.frameIndex = 0;
        this.elapsedMs = 0;

        if (!this.running) {
            this.running = true;
            this.lastTime = performance.now();
            requestAnimationFrame(this._boundTick);
        }
    }

    // 현재 프레임에서 정지 (victory 등, CSS 트랜스폼 연출과 함께 사용)
    pause() {
        this.running = false;
    }

    _tick(now) {
        if (!this.running) return;

        const dt = now - this.lastTime;
        this.lastTime = now;

        const def = ANIMATIONS[this.currentName];
        const frames = this.cache[this.currentName];
        if (def && frames) {
            this.elapsedMs += dt;
            const frameDuration = 1000 / def.fps;
            while (this.elapsedMs >= frameDuration) {
                this.elapsedMs -= frameDuration;
                this.frameIndex++;
                if (this.frameIndex >= def.frameCount) {
                    this.frameIndex = def.loop ? 0 : def.frameCount - 1;
                }
            }
            this._draw(frames[this.frameIndex]);
        }

        requestAnimationFrame(this._boundTick);
    }

    _draw(img) {
        if (!img || !img.complete || img.naturalWidth === 0) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.drawImage(
            img,
            SOURCE_CROP.x, SOURCE_CROP.y, SOURCE_CROP.w, SOURCE_CROP.h,
            0, 0, this.canvas.width, this.canvas.height
        );
    }
}
