/* ==========================================================================
   PROJECT: MAD OVERLORD // ENCAPSULATED VIEW RENDERER (v2)
   Encapsulates all Canvas drawing and styles to decouple Logic from View.
   Chest-Centric Anchor System with Dynamic Mobility Type Branching.
   Dual-Arm 1 O'clock Counter-Clockwise High Arc & Return Attack Motion.
   Image Asset Caching & Dynamic Part Pivot/Size/Offset Support.
   Top-Most Z-Index Muzzle Flash & Laser Projectile Particle Rendering Pipeline.
   Z-Index View Order: leftArm(0) -> leftLeg(1) -> body(2) -> head(3) -> rightLeg(4) -> rightArm(5)
   ========================================================================== */

import { BODY_ANCHORS_DB } from '../data/parts.js';

export class Renderer {
    constructor() {
        this.contexts = new Map(); // canvas -> CanvasRenderingContext2D
        this.imageCache = new Map(); // src -> HTMLImageElement (자산 캐싱 시스템)

        // 가슴(body) 파츠를 기준 앵커(x: 165, y: 98)로 설정하고, 상하/좌우 오프셋으로 연동되는 6개 독립 레이어 구조체
        // 1. 왼팔(leftArm, 0) -> 2. 왼쪽다리(leftLeg, 1) -> 3. 몸통(body, 2) -> 4. 얼굴(head, 3) -> 5. 오른쪽다리(rightLeg, 4) -> 6. 오른팔(rightArm, 5)
        this.screenLayers = {
            leftArm: {
                zIndex: 0, // 가장 뒤쪽 최하단 뒤 팔 (가슴 기준 오프셋: +33, -12)
                x: 198, y: 86, pivotX: 20, pivotY: 18,
                renderWidth: 42, renderHeight: 84, defaultColor: '#ff9900',
                img: null, src: 'assets/sprites/parts/robot/red_arm_r.png', animType: 'pivot', frameCount: 1, fps: 10
            },
            leftLeg: {
                zIndex: 1, // 뒤쪽 다리 (가슴 기준 오프셋: +27, +42)
                x: 192, y: 140, pivotX: 25, pivotY: 15,
                renderWidth: 52, renderHeight: 82, defaultColor: '#00cc55',
                img: null, src: 'assets/sprites/parts/robot/red_leg.png', animType: 'pivot', frameCount: 1, fps: 10
            },
            body: {
                zIndex: 2, // 메인 코어 흉갑 (앵커 기준 Origin: x 165, y 98)
                x: 165, y: 98, pivotX: 36, pivotY: 48,
                renderWidth: 72, renderHeight: 96, defaultColor: '#ff0055',
                img: null, src: 'assets/sprites/parts/robot/red_body.png', animType: 'pivot', frameCount: 1, fps: 10
            },
            head: {
                zIndex: 3, // 얼굴/머리 (가슴 기준 오프셋: 0, -33)
                x: 165, y: 65, pivotX: 26, pivotY: 48,
                renderWidth: 52, renderHeight: 52, defaultColor: '#00ffcc',
                img: null, src: 'assets/sprites/parts/robot/red_head.png', animType: 'pivot', frameCount: 1, fps: 10
            },
            rightLeg: {
                zIndex: 4, // 전면 앞쪽 다리 (가슴 기준 오프셋: +1, +46)
                x: 166, y: 144, pivotX: 25, pivotY: 15,
                renderWidth: 52, renderHeight: 82, defaultColor: '#00ff66',
                img: null, src: 'assets/sprites/parts/robot/red_leg.png', animType: 'pivot', frameCount: 1, fps: 10
            },
            rightArm: {
                zIndex: 5, // 모든 이미지의 가장 앞쪽 최상단 전면 팔 (가슴 기준 오프셋: -22, -13)
                x: 143, y: 85, pivotX: 22, pivotY: 18,
                renderWidth: 44, renderHeight: 86, defaultColor: '#ffcc00',
                img: null, src: 'assets/sprites/parts/robot/red_arm_l.png', animType: 'pivot', frameCount: 1, fps: 10
            }
        };

        this.currentBodyId = 'body_red_robot';

        // 초기 레드 메카 파츠 자산 선로드 및 앵커 동기화
        this.changePart('head', 'assets/sprites/parts/robot/red_head.png', 'pivot');
        this.changePart('body', 'assets/sprites/parts/robot/red_body.png', 'pivot');
        this.changePart('arm', {
            right: 'assets/sprites/parts/robot/red_arm_l.png',
            left: 'assets/sprites/parts/robot/red_arm_r.png'
        }, 'pivot');
        this.changePart('leg', 'assets/sprites/parts/robot/red_leg.png', 'pivot');
    }

    /**
     * 가슴(body) 파츠 기준 앵커 동적 재계산 및 기동 방식 타입별 분기 처리 함수
     */
    recalculateAnchors(bodyPartId = this.currentBodyId, customAnimType = null) {
        this.currentBodyId = bodyPartId || this.currentBodyId;
        const anchorConfig = BODY_ANCHORS_DB[this.currentBodyId] || BODY_ANCHORS_DB['body_red_robot'];
        const bodyLayer = this.screenLayers.body;
        if (!bodyLayer || !anchorConfig) return;

        const anchors = anchorConfig.anchors;
        const mobilityType = anchorConfig.type;

        if (mobilityType === 'track_vehicle' || customAnimType === 'sprite') {
            if (anchors.headAnchor) {
                this.screenLayers.head.x = bodyLayer.x + anchors.headAnchor.offsetX;
                this.screenLayers.head.y = bodyLayer.y + anchors.headAnchor.offsetY;
            }
            if (anchors.leftArmAnchor) {
                this.screenLayers.leftArm.x = bodyLayer.x + anchors.leftArmAnchor.offsetX;
                this.screenLayers.leftArm.y = bodyLayer.y + anchors.leftArmAnchor.offsetY;
            }
            if (anchors.rightArmAnchor) {
                this.screenLayers.rightArm.x = bodyLayer.x + anchors.rightArmAnchor.offsetX;
                this.screenLayers.rightArm.y = bodyLayer.y + anchors.rightArmAnchor.offsetY;
            }

            const trackY = bodyLayer.y + (anchors.trackAnchor?.offsetY || 46);
            this.screenLayers.leftLeg.x = bodyLayer.x;
            this.screenLayers.leftLeg.y = trackY;
            this.screenLayers.leftLeg.animType = 'sprite';

            this.screenLayers.rightLeg.x = bodyLayer.x;
            this.screenLayers.rightLeg.y = trackY;
            this.screenLayers.rightLeg.animType = 'sprite';

        } else {
            if (anchors.headAnchor) {
                this.screenLayers.head.x = bodyLayer.x + anchors.headAnchor.offsetX;
                this.screenLayers.head.y = bodyLayer.y + anchors.headAnchor.offsetY;
            }
            if (anchors.leftArmAnchor) {
                this.screenLayers.leftArm.x = bodyLayer.x + anchors.leftArmAnchor.offsetX;
                this.screenLayers.leftArm.y = bodyLayer.y + anchors.leftArmAnchor.offsetY;
            }
            if (anchors.rightArmAnchor) {
                this.screenLayers.rightArm.x = bodyLayer.x + anchors.rightArmAnchor.offsetX;
                this.screenLayers.rightArm.y = bodyLayer.y + anchors.rightArmAnchor.offsetY;
            }
            if (anchors.leftLegAnchor) {
                this.screenLayers.leftLeg.x = bodyLayer.x + anchors.leftLegAnchor.offsetX;
                this.screenLayers.leftLeg.y = bodyLayer.y + anchors.leftLegAnchor.offsetY;
            }
            if (anchors.rightLegAnchor) {
                this.screenLayers.rightLeg.x = bodyLayer.x + anchors.rightLegAnchor.offsetX;
                this.screenLayers.rightLeg.y = bodyLayer.y + anchors.rightLegAnchor.offsetY;
            }
        }
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

    // 단일 화면 레이어 이미지 캐싱 및 동기 전환 바인딩 내부 헬퍼 (customSize & 개별 오프셋 지원)
    _bindSingleLayer(layerKey, src, animType = 'pivot', frameCount = 1, fps = 10, customSize = null) {
        const layer = this.screenLayers[layerKey];
        if (!layer) return;

        layer.animType = animType;
        layer.frameCount = frameCount;
        layer.fps = fps;

        if (customSize) {
            if (customSize.renderWidth) layer.renderWidth = customSize.renderWidth;
            if (customSize.renderHeight) layer.renderHeight = customSize.renderHeight;
            if (customSize.pivotX !== undefined) layer.pivotX = customSize.pivotX;
            if (customSize.pivotY !== undefined) layer.pivotY = customSize.pivotY;
            layer.offsetX = customSize.offsetX || 0;
            layer.offsetY = customSize.offsetY || 0;
        } else {
            layer.offsetX = 0;
            layer.offsetY = 0;
        }

        if (!src) {
            layer.img = null;
            layer.src = '';
            return;
        }

        if (this.imageCache.has(src)) {
            const cachedImg = this.imageCache.get(src);
            layer.img = cachedImg;
            layer.src = src;
            return;
        }

        const img = new Image();
        img.src = src;
        img.onload = () => {
            this.imageCache.set(src, img);
            layer.img = img;
            layer.src = src;
        };
        img.onerror = () => {
            console.warn(`[Renderer] Failed to load image asset: ${src}`);
        };
    }

    changePart(slotName, imageSrc, animType = 'pivot', frameCount = 1, fps = 10, bodyPartId = null, customSize = null) {
        if (slotName === 'arm') {
            const rightSrc = (typeof imageSrc === 'object' && imageSrc.right) ? imageSrc.right : imageSrc;
            const leftSrc = (typeof imageSrc === 'object' && imageSrc.left) ? imageSrc.left : imageSrc;
            const rSize = customSize?.right || null;
            const lSize = customSize?.left || null;
            this._bindSingleLayer('rightArm', rightSrc, animType, frameCount, fps, rSize);
            this._bindSingleLayer('leftArm', leftSrc, animType, frameCount, fps, lSize);
        } else if (slotName === 'leg') {
            const rightSrc = (typeof imageSrc === 'object' && imageSrc.right) ? imageSrc.right : imageSrc;
            const leftSrc = (typeof imageSrc === 'object' && imageSrc.left) ? imageSrc.left : imageSrc;
            const rSize = customSize?.right || null;
            const lSize = customSize?.left || null;
            this._bindSingleLayer('rightLeg', rightSrc, animType, frameCount, fps, rSize);
            this._bindSingleLayer('leftLeg', leftSrc, animType, frameCount, fps, lSize);
        } else if (slotName === 'head' || slotName === 'body') {
            const src = (typeof imageSrc === 'object' && imageSrc.src) ? imageSrc.src : imageSrc;
            this._bindSingleLayer(slotName, src, animType, frameCount, fps, customSize);
        } else if (this.screenLayers[slotName]) {
            this._bindSingleLayer(slotName, imageSrc, animType, frameCount, fps, customSize);
        }

        this.recalculateAnchors(bodyPartId || this.currentBodyId, animType);
    }

    setRobotStructure(robotStruct) {
        if (!robotStruct) return;

        if (robotStruct.body) {
            this.currentBodyId = robotStruct.body.id || this.currentBodyId;
            const bSrc = robotStruct.body.src !== undefined ? robotStruct.body.src : '';
            this._bindSingleLayer('body', bSrc, robotStruct.body.animType);
        }
        if (robotStruct.head) {
            const hSrc = robotStruct.head.src !== undefined ? robotStruct.head.src : '';
            this._bindSingleLayer('head', hSrc, robotStruct.head.animType);
        }
        if (robotStruct.arm) {
            const rSrc = robotStruct.arm.right?.src !== undefined ? robotStruct.arm.right.src : (robotStruct.arm.src !== undefined ? robotStruct.arm.src : '');
            const lSrc = robotStruct.arm.left?.src  !== undefined ? robotStruct.arm.left.src  : (robotStruct.arm.src !== undefined ? robotStruct.arm.src : '');
            const rSize = robotStruct.arm.right?.pivot ? robotStruct.arm.right.pivot : null;
            const lSize = robotStruct.arm.left?.pivot  ? robotStruct.arm.left.pivot  : null;
            this._bindSingleLayer('rightArm', rSrc, robotStruct.arm.animType, 1, 10, rSize);
            this._bindSingleLayer('leftArm', lSrc, robotStruct.arm.animType, 1, 10, lSize);
        }
        if (robotStruct.leg) {
            const rSrc = robotStruct.leg.right?.src !== undefined ? robotStruct.leg.right.src : (robotStruct.leg.src !== undefined ? robotStruct.leg.src : '');
            const lSrc = robotStruct.leg.left?.src  !== undefined ? robotStruct.leg.left.src  : (robotStruct.leg.src !== undefined ? robotStruct.leg.src : '');
            this._bindSingleLayer('rightLeg', rSrc, robotStruct.leg.animType);
            this._bindSingleLayer('leftLeg', lSrc, robotStruct.leg.animType);
        }

        this.recalculateAnchors(this.currentBodyId, robotStruct.leg?.animType);
    }

    // 독립된 6-부위 화면 배치 레이어(screenLayers) 순서대로 관절식 로봇 페이퍼돌 드로잉
    drawPaperDoll(canvas, x, y, stateName, timeSec) {
        const ctx = this.initCanvas(canvas);
        if (!ctx) return;

        const sortedLayers = Object.entries(this.screenLayers)
            .sort((a, b) => a[1].zIndex - b[1].zIndex);

        sortedLayers.forEach(([name, layer]) => {
            ctx.save();

            // 1. 관절(Pivot) 결합부 좌표로 이동 (개별 파츠 전용 오프셋 offsetX/offsetY 반영)
            const drawX = x + (layer.x - 165) + (layer.offsetX || 0);
            const drawY = y + (layer.y - 124) + (layer.offsetY || 0);
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
                if (!this.attackStartTime) {
                    this.attackStartTime = timeSec;
                }

                offsetOffsetX = 0;
                offsetOffsetY = 0;

                const isLaserArm = this.screenLayers.rightArm.src.includes('arm_laser_r.png');

                if (isLaserArm) {
                    if (name === 'leftArm') {
                        angle = 0; // 1. 왼팔 0도 고정!
                    } else if (name === 'rightArm') {
                        const attackElapsed = timeSec - this.attackStartTime;
                        const targetRad = - (30 * Math.PI / 180); // 반시계 30도 고정!

                        // Step 1: 0 ~ 0.35초 내 팔 먼저 30도 들어올리고 고정
                        const raiseRatio = Math.min(1, attackElapsed / 0.35);
                        angle = targetRad * Math.sin(raiseRatio * Math.PI * 0.5);
                    }
                } else {
                    if (name === 'rightArm' || name === 'leftArm') {
                        const attackProgress = (timeSec * 6) % (Math.PI * 2);
                        if (attackProgress < Math.PI) {
                            const upRatio = attackProgress / Math.PI;
                            const easeUp = Math.sin(upRatio * Math.PI * 0.5);
                            angle = -easeUp * (Math.PI * 0.85);
                        } else {
                            const downRatio = (attackProgress - Math.PI) / Math.PI;
                            const easeDown = Math.cos(downRatio * Math.PI * 0.5);
                            angle = -easeDown * (Math.PI * 0.85);
                        }
                    }
                }
            } else { // 'idle' 대기 상태
                this.attackStartTime = null;
                const bodyBounceY = Math.sin(timeSec * 2.5) * 2.5;

                if (name === 'body') {
                    offsetOffsetY = bodyBounceY;
                } else if (name === 'head') {
                    offsetOffsetY = bodyBounceY + Math.sin(timeSec * 2.5) * 0.8;
                } else if (name === 'rightArm' || name === 'leftArm') {
                    offsetOffsetY = bodyBounceY;
                    angle = Math.sin(timeSec * 2.5) * 0.04;
                } else if (name === 'rightLeg' || name === 'leftLeg') {
                    offsetOffsetY = bodyBounceY * 0.3;
                }
            }

            ctx.translate(offsetOffsetX, offsetOffsetY);

            if (layer.animType === 'pivot') {
                ctx.rotate(angle);
            }

            ctx.translate(-layer.pivotX, -layer.pivotY);

            // 3. 부위별 실체 이미지 드로잉
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

            // 4. [레이저 포대 전용 최상단 Z-Index 덮어쓰기 순차 파티클 렌더링]
            // 시퀀스: [Step 1: 팔 들어올리기 (0~0.35s)] -> [Step 2: 25px 차징 원 생성 (0.35s~)] -> [Step 3: 15px 레이저구체 연사 (0.65s~)]
            if (stateName === 'attack' && name === 'rightArm' && this.screenLayers.rightArm.src.includes('arm_laser_r.png')) {
                const attackElapsed = this.attackStartTime ? (timeSec - this.attackStartTime) : 0;

                // Step 2 & 3: 0.35초 이후부터 차징 원 생성!
                if (attackElapsed >= 0.35) {
                    const chargeT = attackElapsed - 0.35;
                    const chargeScale = Math.min(1, chargeT / 0.3); // 0.3초간 차징 원 생성

                    // 포구 노즐 팁 좌표 (이미지 드로잉 로컬 좌표계 기준: 왼쪽 -7px -> 19, 위쪽 -4px -> 64)
                    const tipX = layer.pivotX + 19;
                    const tipY = layer.pivotY + 64;

                    // Step 2: 포구 입구 직경 25px 무한 펄스 원 차징 생성 (Charging Pulse)
                    const pulse = (Math.sin(timeSec * 16.0) + 1) / 2;
                    const flashRadius = (25 / 2) * chargeScale * (0.65 + 0.35 * pulse); // 직경 25px

                    ctx.save();
                    ctx.translate(tipX, tipY);

                    // 외곽 청록빛 글로우 (직경 25px)
                    ctx.fillStyle = `rgba(0, 255, 204, ${0.85 * chargeScale * (0.7 + 0.3 * pulse)})`;
                    ctx.shadowColor = '#00ffcc';
                    ctx.shadowBlur = 22;
                    ctx.beginPath();
                    ctx.arc(0, 0, Math.max(1, flashRadius), 0, Math.PI * 2);
                    ctx.fill();

                    // 중심 고광도 화이트 코어
                    ctx.fillStyle = `rgba(255, 255, 255, ${0.95 * chargeScale * pulse})`;
                    ctx.shadowColor = '#ffffff';
                    ctx.shadowBlur = 14;
                    ctx.beginPath();
                    ctx.arc(0, 0, Math.max(1, flashRadius - 4), 0, Math.PI * 2);
                    ctx.fill();

                    // Step 3: 0.65초 이후부터 비로소 직경 15px 레이저 구체 +45도 사격 각도 무한 연사 발사!
                    if (attackElapsed >= 0.65) {
                        const fireT = attackElapsed - 0.65;
                        const numBullets = 3;
                        const fireAngle = (45 * Math.PI / 180);

                        for (let i = 0; i < numBullets; i++) {
                            const bulletPhase = (fireT * 4.5 + i * (Math.PI * 2 / numBullets)) % (Math.PI * 2);
                            const travelDist = (bulletPhase / (Math.PI * 2)) * 220;
                            const fadeAlpha = 1 - (travelDist / 220);
                            const projRadius = (15 / 2);

                            if (travelDist > 5) {
                                ctx.save();
                                ctx.rotate(fireAngle);
                                ctx.translate(travelDist, 0);

                                // 레이저 잔상 꼬리 (Laser Trail)
                                ctx.strokeStyle = `rgba(0, 255, 204, ${0.6 * fadeAlpha})`;
                                ctx.lineWidth = projRadius * 1.5;
                                ctx.beginPath();
                                ctx.moveTo(-18, 0);
                                ctx.lineTo(0, 0);
                                ctx.stroke();

                                // 발사체 외곽 글로우 (직경 15px)
                                ctx.fillStyle = `rgba(0, 255, 204, ${0.9 * fadeAlpha})`;
                                ctx.shadowColor = '#00ffcc';
                                ctx.shadowBlur = 15;
                                ctx.beginPath();
                                ctx.arc(0, 0, projRadius, 0, Math.PI * 2);
                                ctx.fill();

                                // 발사체 화이트 구체 코어
                                ctx.fillStyle = `rgba(255, 255, 255, ${1.0 * fadeAlpha})`;
                                ctx.shadowColor = '#ffffff';
                                ctx.shadowBlur = 8;
                                ctx.beginPath();
                                ctx.arc(0, 0, Math.max(1, projRadius - 2.5), 0, Math.PI * 2);
                                ctx.fill();

                                ctx.restore();
                            }
                        }
                    }

                    ctx.restore();
                }
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
