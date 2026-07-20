/* ==========================================================================
   PROJECT: MAD OVERLORD // ENCAPSULATED VIEW RENDERER (v2)
   Encapsulates all Canvas drawing and styles to decouple Logic from View.
   ========================================================================== */

export class Renderer {
    constructor() {
        this.contexts = new Map(); // canvas -> CanvasRenderingContext2D
    }

    // 캔버스 초기화 및 컨텍스트 바인딩
    initCanvas(canvas) {
        if (!canvas) return null;
        if (this.contexts.has(canvas)) {
            return this.contexts.get(canvas);
        }
        const ctx = canvas.getContext('2d');
        this.contexts.set(canvas, ctx);
        return ctx;
    }

    // 화면 지우기
    clear(canvas) {
        const ctx = this.initCanvas(canvas);
        if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }

    // 캐릭터 스프라이트 프레임 그리기
    drawSprite(canvas, img, crop, destWidth, destHeight) {
        const ctx = this.initCanvas(canvas);
        if (!ctx || !img || !img.complete || img.naturalWidth === 0) return;

        ctx.drawImage(
            img,
            crop.x, crop.y, crop.w, crop.h,
            0, 0, destWidth || canvas.width, destHeight || canvas.height
        );
    }

    // 세뇌 징집 등 특수 필터 효과 렌더링 적용 (CSS 필터를 캔버스 렌더러단에서 추상화)
    applyFilter(canvas, filterString) {
        const ctx = this.initCanvas(canvas);
        if (ctx) {
            ctx.filter = filterString || 'none';
        }
    }

    // 픽셀 스타일 맵 적용
    applyStyle(element, styleObj) {
        if (!element || !styleObj) return;
        for (const prop in styleObj) {
            element.style[prop] = styleObj[prop];
        }
    }
}

export const renderer = new Renderer();
