/* ==========================================================================
   PROJECT: MAD OVERLORD // ENCAPSULATED VIEW RENDERER (v2)
   Encapsulates all Canvas drawing and styles to decouple Logic from View.
   Supports 6-Subpart Red Robot Skeletal Layered Pivot Paper-Doll Rendering.
   ========================================================================== */

export class Renderer {
    constructor() {
        this.contexts = new Map(); // canvas -> CanvasRenderingContext2D

        // 6부위 레드 메카 로봇 페이퍼돌 레이어 정밀 좌표 바인딩 (zIndex 순서대로 그리기)
        this.layers = {
            leftArm: {
                x: 140, y: 116, pivotX: 20, pivotY: 12, zIndex: 0,
                img: null, src: 'assets/sprites/parts/robot/red_arm.png', animType: 'pivot',
                renderWidth: 42, renderHeight: 84, frameCount: 1, fps: 10, defaultColor: '#ff9900'
            },
            leftLeg: {
                x: 148, y: 158, pivotX: 25, pivotY: 15, zIndex: 1,
                img: null, src: 'assets/sprites/parts/robot/red_leg.png', animType: 'pivot',
                renderWidth: 52, renderHeight: 82, frameCount: 1, fps: 10, defaultColor: '#00cc55'
            },
            body: {
                x: 165, y: 118, pivotX: 36, pivotY: 48, zIndex: 2,
                img: null, src: 'assets/sprites/parts/robot/red_body.png', animType: 'pivot',
                renderWidth: 72, renderHeight: 96, frameCount: 1, fps: 10, defaultColor: '#ff0055'
            },
            rightLeg: {
                x: 182, y: 158, pivotX: 25, pivotY: 15, zIndex: 3,
                img: null, src: 'assets/sprites/parts/robot/red_leg.png', animType: 'pivot',
                renderWidth: 52, renderHeight: 82, frameCount: 1, fps: 10, defaultColor: '#00ff66'
            },
            head: {
                x: 165, y: 86, pivotX: 26, pivotY: 48, zIndex: 4,
                img: null, src: 'assets/sprites/parts/robot/red_head.png', animType: 'pivot',
                renderWidth: 52, renderHeight: 52, frameCount: 1, fps: 10, defaultColor: '#00ffcc'
            },
            rightArm: {
                x: 190, y: 116, pivotX: 20, pivotY: 12, zIndex: 5,
                img: null, src: 'assets/sprites/parts/robot/red_arm.png', animType: 'pivot',
                renderWidth: 42, renderHeight: 84, frameCount: 1, fps: 10, defaultColor: '#ffcc00'
            }
        };

        // 초기 레드 메카 파츠 자산 선로드
        this.changePart('head', 'assets/sprites/parts/robot/red_head.png', 'pivot');
        this.changePart('body', 'assets/sprites/parts/robot/red_body.png', 'pivot');
        this.changePart('arm', 'assets/sprites/parts/robot/red_arm.png', 'pivot');
        this.changePart('leg', 'assets/sprites/parts/robot/red_leg.png', 'pivot');
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

    // 단일 레이어 이미지 바인딩 내부 헬퍼
    _bindSingleLayer(layerKey, src, animType = 'pivot', frameCount = 1, fps = 10) {
        const layer = this.layers[layerKey];
        if (!layer) return;

        layer.animType = animType;
        layer.frameCount = frameCount;
        layer.fps = fps;

        if (!src) {
            layer.img = null;
            layer.src = '';
            return;
        }

        const img = new Image();
        img.src = src;
        img.onload = () => {
            layer.img = img;
            layer.src = src;
        };
        img.onerror = () => {
            layer.img = null;
        };
    }

    /**
     * 파츠 스왑 인터페이스
     */
    changePart(slotName, imageSrc, animType = 'pivot', frameCount = 1, fps = 10) {
        if (slotName === 'arm') {
            const rightSrc = (typeof imageSrc === 'object' && imageSrc.right) ? imageSrc.right : imageSrc;
            const leftSrc = (typeof imageSrc === 'object' && imageSrc.left) ? imageSrc.left : imageSrc;
            this._bindSingleLayer('rightArm', rightSrc, animType, frameCount, fps);
            this._bindSingleLayer('leftArm', leftSrc, animType, frameCount, fps);
        } else if (slotName === 'leg') {
            const rightSrc = (typeof imageSrc === 'object' && imageSrc.right) ? imageSrc.right : imageSrc;
            const leftSrc = (typeof imageSrc === 'object' && imageSrc.left) ? imageSrc.left : imageSrc;
            this._bindSingleLayer('rightLeg', rightSrc, animType, frameCount, fps);
            this._bindSingleLayer('leftLeg', leftSrc, animType, frameCount, fps);
        } else if (slotName === 'head' || slotName === 'body') {
            const src = (typeof imageSrc === 'object' && imageSrc.src) ? imageSrc.src : imageSrc;
            this._bindSingleLayer(slotName, src, animType, frameCount, fps);
        } else if (this.layers[slotName]) {
            this._bindSingleLayer(slotName, imageSrc, animType, frameCount, fps);
        }
    }

    /**
     * 로봇 구조체(RobotPartsStructure) 데이터를 받아 일괄 렌더링 레이어 스왑
     */
    setRobotStructure(robotStruct) {
        if (!robotStruct) return;
        const layersMap = robotStruct.toRendererLayers ? robotStruct.toRendererLayers() : robotStruct;

        if (layersMap.head) {
            this.changePart('head', layersMap.head.src, layersMap.head.animType);
        }
        if (layersMap.body) {
            this.changePart('body', layersMap.body.src, layersMap.body.animType);
        }
        if (layersMap.arm) {
            this.changePart('arm', {
                right: layersMap.arm.right?.src || layersMap.arm.src,
                left: layersMap.arm.left?.src || layersMap.arm.src
            }, layersMap.arm.animType);
        }
        if (layersMap.leg) {
            this.changePart('leg', {
                right: layersMap.leg.right?.src || layersMap.leg.src,
                left: layersMap.leg.left?.src || layersMap.leg.src
            }, layersMap.leg.animType);
        }
    }

    // 하이브리드 6-부위 관절식 로봇 페이퍼돌 드로잉 인터페이스
    drawPaperDoll(canvas, x, y, stateName, timeSec) {
        const ctx = this.initCanvas(canvas);
        if (!ctx) return;

        // 레이어 그리기 순서 정렬 (zIndex 기준: leftArm -> leftLeg -> body -> rightLeg -> head -> rightArm)
        const sortedLayers = Object.entries(this.layers)
            .sort((a, b) => a[1].zIndex - b[1].zIndex);

        sortedLayers.forEach(([name, layer]) => {
            ctx.save();

            // 1. 관절(Pivot) 결합부 좌표로 이동
            const drawX = x + (layer.x - 165); // 중앙 기준 보정
            const drawY = y + (layer.y - 124);
            ctx.translate(drawX, drawY);

            // 2. 애니메이션에 따른 변형 각도/위프 계산
            let angle = 0;
            let offsetOffsetY = 0;
            let offsetOffsetX = 0;

            if (stateName === 'walk') {
                if (name === 'rightArm') {
                    angle = Math.sin(timeSec * 8) * 0.5;
                } else if (name === 'leftArm') {
                    angle = -Math.sin(timeSec * 8) * 0.5;
                } else if (name === 'rightLeg') {
                    if (layer.animType === 'pivot') {
                        angle = -Math.sin(timeSec * 8) * 0.4;
                    }
                } else if (name === 'leftLeg') {
                    if (layer.animType === 'pivot') {
                        angle = Math.sin(timeSec * 8) * 0.4;
                    }
                } else if (name === 'body') {
                    offsetOffsetY = Math.abs(Math.sin(timeSec * 8)) * 3;
                } else if (name === 'head') {
                    offsetOffsetY = Math.abs(Math.sin(timeSec * 8)) * 2;
                }
            } else if (stateName === 'attack') {
                if (name === 'rightArm') {
                    angle = -Math.PI / 4 + Math.abs(Math.sin(timeSec * 12)) * 0.8;
                    offsetOffsetX = Math.sin(timeSec * 12) * 10;
                } else if (name === 'leftArm') {
                    angle = Math.sin(timeSec * 6) * 0.2;
                } else if (name === 'body') {
                    offsetOffsetX = Math.sin(timeSec * 12) * 4;
                }
            } else { // 'idle'
                if (name === 'body') {
                    offsetOffsetY = Math.sin(timeSec * 2.5) * 2;
                } else if (name === 'head') {
                    offsetOffsetY = Math.sin(timeSec * 2.5) * 3;
                }
            }

            ctx.translate(offsetOffsetX, offsetOffsetY);

            // pivot 타입인 경우에만 각도 회전 적용
            if (layer.animType === 'pivot') {
                ctx.rotate(angle);
            }

            // 피벗 중심으로 드로잉 영역 밀어내기
            ctx.translate(-layer.pivotX, -layer.pivotY);

            // 3. 실체 그리기
            if (layer.img && layer.img.complete && layer.img.naturalWidth > 0) {
                const targetW = layer.renderWidth || layer.img.naturalWidth;
                const targetH = layer.renderHeight || layer.img.naturalHeight;

                if (layer.animType === 'sprite') {
                    const frameWidth = layer.img.naturalWidth / layer.frameCount;
                    const frameIndex = Math.floor(timeSec * layer.fps) % layer.frameCount;
                    ctx.drawImage(
                        layer.img,
                        frameIndex * frameWidth, 0, frameWidth, layer.img.naturalHeight,
                        0, 0, targetW, targetH
                    );
                } else {
                    ctx.drawImage(layer.img, 0, 0, targetW, targetH);
                }
            } else {
                this.drawFallbackPart(ctx, name, layer, timeSec);
            }

            ctx.restore();
        });
    }

    drawFallbackPart(ctx, name, layer, timeSec) {
        ctx.strokeStyle = layer.defaultColor;
        ctx.lineWidth = 3;
        ctx.fillStyle = '#050512';
        ctx.shadowColor = layer.defaultColor;
        ctx.shadowBlur = 12;

        if (name === 'head') {
            ctx.beginPath();
            ctx.arc(20, 20, 18, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            ctx.strokeStyle = '#00ffff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(10, 15);
            ctx.lineTo(30, 15);
            ctx.stroke();

        } else if (name === 'body') {
            ctx.beginPath();
            ctx.moveTo(5, 5);
            ctx.lineTo(55, 5);
            ctx.lineTo(45, 55);
            ctx.lineTo(15, 55);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#ff0055';
            ctx.beginPath();
            ctx.arc(30, 25, 6, 0, Math.PI * 2);
            ctx.fill();

        } else if (name === 'rightArm' || name === 'leftArm') {
            ctx.beginPath();
            ctx.rect(5, 5, 10, 30);
            ctx.fill();
            ctx.stroke();

            ctx.strokeStyle = (name === 'rightArm') ? '#ffaa00' : '#ff7700';
            ctx.beginPath();
            ctx.moveTo(10, 35);
            ctx.lineTo(10, 75);
            ctx.stroke();

        } else if (name === 'rightLeg' || name === 'leftLeg') {
            if (layer.animType === 'sprite') {
                ctx.beginPath();
                ctx.arc(15, 15, 12, 0, Math.PI * 2);
                ctx.arc(45, 15, 12, 0, Math.PI * 2);
                ctx.stroke();

                ctx.beginPath();
                ctx.rect(3, 3, 54, 24);
                ctx.stroke();

                const trackOffset = (timeSec * 100) % 20;
                ctx.strokeStyle = '#ff00ff';
                ctx.setLineDash([4, 4]);
                ctx.lineDashOffset = -trackOffset;
                ctx.beginPath();
                ctx.rect(3, 3, 54, 24);
                ctx.stroke();
                ctx.setLineDash([]);
            } else {
                ctx.beginPath();
                ctx.moveTo(25, 5);
                ctx.lineTo(10, 30);
                ctx.lineTo(25, 55);
                ctx.stroke();
                
                ctx.beginPath();
                ctx.arc(25, 55, 6, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            }
        }

        ctx.shadowBlur = 0;
    }

    applyFilter(canvas, filterString) {
        const ctx = this.initCanvas(canvas);
        if (ctx) {
            ctx.filter = filterString || 'none';
        }
    }

    applyStyle(element, styleObj) {
        if (!element || !styleObj) return;
        for (const prop in styleObj) {
            element.style[prop] = styleObj[prop];
        }
    }
}

export const renderer = new Renderer();
