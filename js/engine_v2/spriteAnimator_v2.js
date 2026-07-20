/* ==========================================================================
   PROJECT: MAD OVERLORD // SPRITE FRAME & PAPER-DOLL ANIMATOR (v2)
   Calculates frame/timing logic only, delegating draw commands to Renderer.
   Supports Paper-Doll pivot skeletal rendering and baked sequence.
   ========================================================================== */

import { renderer } from './renderer.js';

const ANIMATIONS = {
    walk: { path: 'assets/sprites/player/walk/', frameCount: 38, fps: 30, loop: true },
    attack: { path: 'assets/sprites/player/attack/', frameCount: 31, fps: 30, loop: true },
    idle: { path: 'assets/sprites/player/idle/', frameCount: 61, fps: 30, loop: true }
};

const SOURCE_CROP = { x: 90, y: 110, w: 330, h: 248 };

function frameSrc(def, index) {
    const idx = String(index).padStart(2, '0');
    return `${def.path}frame_${idx}.png`;
}

export class SpriteAnimator {
    constructor(canvas) {
        this.canvas = canvas;
        this.cache = {}; // animName -> HTMLImageElement[]
        this.currentName = null;
        this.frameIndex = 0;
        this.elapsedMs = 0;
        this.lastTime = 0;
        this.running = false;
        this.mode = 'paperdoll'; // 'paperdoll' (순수 관절형) | 'sequence' (기본 베이킹)
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

    pause() {
        this.running = false;
    }

    _tick(now) {
        if (!this.running) return;

        const dt = now - this.lastTime;
        this.lastTime = now;

        if (this.mode === 'paperdoll') {
            this.elapsedMs += dt;
            const timeSec = this.elapsedMs / 1000;
            renderer.clear(this.canvas);
            renderer.drawPaperDoll(this.canvas, 165, 124, this.currentName, timeSec);
        } else {
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
        }

        requestAnimationFrame(this._boundTick);
    }

    _draw(img) {
        if (!img) return;
        renderer.clear(this.canvas);
        renderer.drawSprite(this.canvas, img, SOURCE_CROP);
    }
}
