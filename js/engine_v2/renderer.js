/* ==========================================================================
   PROJECT: MAD OVERLORD // ENCAPSULATED VIEW RENDERER (v2)
   Encapsulates all Canvas drawing and styles to decouple Logic from View.
   Supports Skeletal Layered Pivot Paper-Doll Rendering.
   ========================================================================== */

export class Renderer {
    constructor() {
        this.contexts = new Map(); // canvas -> CanvasRenderingContext2D

        // 페이퍼돌 레이어 기본 설정
        this.layers = {
            leg: {
                x: 165, y: 170, pivotX: 25, pivotY: 15, zIndex: 1,
                img: null, src: '', animType: 'pivot',
                frameCount: 1, fps: 10, defaultColor: '#00ff66'
            },
            body: {
                x: 165, y: 125, pivotX: 30, pivotY: 35, zIndex: 2,
                img: null, src: '', animType: 'pivot',
                frameCount: 1, fps: 10, defaultColor: '#ff0055'
            },
            head: {
                x: 165, y: 70, pivotX: 20, pivotY: 25, zIndex: 3,
                img: null, src: '', animType: 'pivot',
                frameCount: 1, fps: 10, defaultColor: '#00ffcc'
            },
            arm: {
                x: 145, y: 110, pivotX: 15, pivotY: 15, zIndex: 4,
                img: null, src: '', animType: 'pivot',
                frameCount: 1, fps: 10, defaultColor: '#ffcc00'
            }
        };

        // 초기 프리셋 파츠 모크 이미지 선로드 처리
        this.changePart('head', 'assets/sprites/parts/head_mock.png', 'pivot');
        this.changePart('body', 'assets/sprites/parts/body_mock.png', 'pivot');
        this.changePart('arm', 'assets/sprites/parts/arm_mock.png', 'pivot');
        this.changePart('leg', 'assets/sprites/parts/leg_mock.png', 'pivot');
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

    // 파츠 스왑 인터페이스
    changePart(layerName, imageSrc, animType = 'pivot', frameCount = 1, fps = 10) {
        const layer = this.layers[layerName];
        if (!layer) return;

        layer.animType = animType;
        layer.frameCount = frameCount;
        layer.fps = fps;

        if (!imageSrc) {
            layer.img = null;
            layer.src = '';
            return;
        }

        const img = new Image();
        img.src = imageSrc;
        img.onload = () => {
            layer.img = img;
            layer.src = imageSrc;
        };
        img.onerror = () => {
            // 로드 실패 시에도 fallbacks를 그리기 위해 null 처리 유지
            layer.img = null;
        };
    }

    // 하이브리드 관절식 페이퍼돌 드로잉 인터페이스
    drawPaperDoll(canvas, x, y, stateName, timeSec) {
        const ctx = this.initCanvas(canvas);
        if (!ctx) return;

        // 레이어 그리기 순서 정렬 (zIndex 기준)
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
                if (name === 'arm') {
                    // 팔은 Math.sin()으로 앞뒤 왕복
                    angle = Math.sin(timeSec * 8) * 0.5;
                } else if (name === 'leg') {
                    if (layer.animType === 'pivot') {
                        // 다리는 팔과 반대 위상으로 왕복
                        angle = -Math.sin(timeSec * 8) * 0.4;
                    }
                } else if (name === 'body') {
                    // 몸통은 진격 방향으로 미세하게 바운싱
                    offsetOffsetY = Math.abs(Math.sin(timeSec * 8)) * 3;
                }
            } else if (stateName === 'attack') {
                if (name === 'arm') {
                    // 공격 시 팔이 칼날치기 모션으로 튀어나감
                    angle = -Math.PI / 4 + Math.abs(Math.sin(timeSec * 12)) * 0.8;
                    offsetOffsetX = Math.sin(timeSec * 12) * 10;
                } else if (name === 'body') {
                    offsetOffsetX = Math.sin(timeSec * 12) * 4;
                }
            } else { // 'idle'
                // 대기 시 호흡 모션
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

            // 3. 실체 그리기 (이미지 로드 완료 시 이미지 그림, 없으면 사이버네틱 벡터 폴백 드로잉)
            if (layer.img && layer.img.complete && layer.img.naturalWidth > 0) {
                if (layer.animType === 'sprite') {
                    // 가로 스프라이트 시트 크롭 이동
                    const frameWidth = layer.img.naturalWidth / layer.frameCount;
                    const frameIndex = Math.floor(timeSec * layer.fps) % layer.frameCount;
                    ctx.drawImage(
                        layer.img,
                        frameIndex * frameWidth, 0, frameWidth, layer.img.naturalHeight,
                        0, 0, frameWidth, layer.img.naturalHeight
                    );
                } else {
                    ctx.drawImage(layer.img, 0, 0);
                }
            } else {
                // 이미지 없을 시 폴백 벡터 그래픽 렌더링
                this.drawFallbackPart(ctx, name, layer, timeSec);
            }

            ctx.restore();
        });
    }

    // 네온 광선 스타일의 기하학적 도형으로 파츠를 그리는 절차적 벡터 드로잉 폴백
    drawFallbackPart(ctx, name, layer, timeSec) {
        ctx.strokeStyle = layer.defaultColor;
        ctx.lineWidth = 3;
        ctx.fillStyle = '#050512';
        ctx.shadowColor = layer.defaultColor;
        ctx.shadowBlur = 12;

        if (name === 'head') {
            // 미래형 바이저 헬멧
            ctx.beginPath();
            ctx.arc(20, 20, 18, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // 바이저 네온 라인
            ctx.strokeStyle = '#00ffff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(10, 15);
            ctx.lineTo(30, 15);
            ctx.stroke();

        } else if (name === 'body') {
            // 중장갑 흉갑 플레이트 및 네온 코어
            ctx.beginPath();
            ctx.moveTo(5, 5);
            ctx.lineTo(55, 5);
            ctx.lineTo(45, 55);
            ctx.lineTo(15, 55);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // 가슴 앰프 핵심 코어
            ctx.fillStyle = '#ff0055';
            ctx.beginPath();
            ctx.arc(30, 25, 6, 0, Math.PI * 2);
            ctx.fill();

        } else if (name === 'arm') {
            // 네온 광선 블레이드 무장
            ctx.beginPath();
            ctx.rect(5, 5, 10, 30);
            ctx.fill();
            ctx.stroke();

            ctx.strokeStyle = '#ffaa00';
            ctx.beginPath();
            ctx.moveTo(10, 35);
            ctx.lineTo(10, 75); // 거대한 레이저 빔 소드 연출
            ctx.stroke();

        } else if (name === 'leg') {
            if (layer.animType === 'sprite') {
                // 전차 무한궤도 롤러 휠 트랙 시뮬레이션
                ctx.beginPath();
                ctx.arc(15, 15, 12, 0, Math.PI * 2);
                ctx.arc(45, 15, 12, 0, Math.PI * 2);
                ctx.stroke();

                ctx.beginPath();
                ctx.rect(3, 3, 54, 24);
                ctx.stroke();

                // 실시간으로 흐르는 기어 체인 핀
                const trackOffset = (timeSec * 100) % 20;
                ctx.strokeStyle = '#ff00ff';
                ctx.setLineDash([4, 4]);
                ctx.lineDashOffset = -trackOffset;
                ctx.beginPath();
                ctx.rect(3, 3, 54, 24);
                ctx.stroke();
                ctx.setLineDash([]); // 대시 리셋
            } else {
                // 역관절 고기동 로봇 기계 다리
                ctx.beginPath();
                ctx.moveTo(25, 5);
                ctx.lineTo(10, 30);
                ctx.lineTo(25, 55);
                ctx.stroke();
                
                // 관절 발판
                ctx.beginPath();
                ctx.arc(25, 55, 6, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            }
        }

        // 쉐도우 효과 리셋
        ctx.shadowBlur = 0;
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
