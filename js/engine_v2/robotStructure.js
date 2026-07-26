/* ==========================================================================
   PROJECT: MAD OVERLORD // ROBOT PARTS STRUCTURE DATA DEFINITION (v2)
   Manages robot sub-assemblies (head, body, arm [right+left], leg [right+left])
   Changing arm or leg updates both right & left side assets simultaneously.
   ========================================================================== */

export class RobotPartsStructure {
    constructor(initialData = {}) {
        // 머리 (head)
        this.head = {
            id: initialData.head?.id || 'head_red_robot',
            name: initialData.head?.name || '레드 바이저 다안 헬멧',
            src: initialData.head?.src || 'assets/sprites/parts/robot/red_head.png',
            animType: initialData.head?.animType || 'pivot',
            pivotX: initialData.head?.pivotX ?? 26,
            pivotY: initialData.head?.pivotY ?? 48
        };

        // 가슴/몸통 (body)
        this.body = {
            id: initialData.body?.id || 'body_red_robot',
            name: initialData.body?.name || '중장갑 엑시온 코어 흉갑',
            src: initialData.body?.src || 'assets/sprites/parts/robot/red_body.png',
            animType: initialData.body?.animType || 'pivot',
            pivotX: initialData.body?.pivotX ?? 36,
            pivotY: initialData.body?.pivotY ?? 48
        };

        // 팔 (arm) 세트 -> 오른쪽, 왼쪽 묶음 관리
        this.arm = {
            id: initialData.arm?.id || 'arm_red_robot',
            name: initialData.arm?.name || '더블 메카 바주카 암 세트',
            animType: initialData.arm?.animType || 'pivot',
            right: {
                src: initialData.arm?.right?.src || 'assets/sprites/parts/robot/red_arm_r.png',
                pivotX: initialData.arm?.right?.pivotX ?? 30,
                pivotY: initialData.arm?.right?.pivotY ?? 20
            },
            left: {
                src: initialData.arm?.left?.src || 'assets/sprites/parts/robot/red_arm_l.png',
                pivotX: initialData.arm?.left?.pivotX ?? 30,
                pivotY: initialData.arm?.left?.pivotY ?? 20
            }
        };

        // 다리 (leg) 세트 -> 오른쪽, 왼쪽 묶음 관리
        this.leg = {
            id: initialData.leg?.id || 'leg_red_robot',
            name: initialData.leg?.name || '서스펜션 발목 레그 세트',
            animType: initialData.leg?.animType || 'pivot',
            right: {
                src: initialData.leg?.right?.src || 'assets/sprites/parts/robot/red_leg.png',
                pivotX: initialData.leg?.right?.pivotX ?? 25,
                pivotY: initialData.leg?.right?.pivotY ?? 15
            },
            left: {
                src: initialData.leg?.left?.src || 'assets/sprites/parts/robot/red_leg.png',
                pivotX: initialData.leg?.left?.pivotX ?? 25,
                pivotY: initialData.leg?.left?.pivotY ?? 15
            }
        };
    }

    /**
     * 팔(arm) 파츠 세트 변경
     * 팔 파츠 교체 시 오른쪽(right)과 왼쪽(left) 이미지가 동시에 일괄 갱신됩니다.
     */
    setArmSet(armData) {
        if (!armData) return;
        this.arm.id = armData.id || this.arm.id;
        this.arm.name = armData.name || this.arm.name;
        this.arm.animType = armData.animType || 'pivot';

        if (armData.right) {
            this.arm.right = { ...this.arm.right, ...armData.right };
        }
        if (armData.left) {
            this.arm.left = { ...this.arm.left, ...armData.left };
        }
    }

    /**
     * 다리(leg) 파츠 세트 변경
     * 다리 파츠 교체 시 오른쪽(right)과 왼쪽(left) 이미지가 동시에 일괄 갱신됩니다.
     */
    setLegSet(legData) {
        if (!legData) return;
        this.leg.id = legData.id || this.leg.id;
        this.leg.name = legData.name || this.leg.name;
        this.leg.animType = legData.animType || 'pivot';

        if (legData.right) {
            this.leg.right = { ...this.leg.right, ...legData.right };
        }
        if (legData.left) {
            this.leg.left = { ...this.leg.left, ...legData.left };
        }
    }

    /**
     * 머리(head) 파츠 변경
     */
    setHead(headData) {
        if (!headData) return;
        this.head = { ...this.head, ...headData };
    }

    /**
     * 가슴(body) 파츠 변경
     */
    setBody(bodyData) {
        if (!bodyData) return;
        this.body = { ...this.body, ...bodyData };
    }

    /**
     * 렌더러(Renderer)로 넘길 통합 레이어 맵 추출
     */
    toRendererLayers() {
        return {
            head: {
                src: this.head.src,
                animType: this.head.animType,
                pivotX: this.head.pivotX,
                pivotY: this.head.pivotY
            },
            body: {
                src: this.body.src,
                animType: this.body.animType,
                pivotX: this.body.pivotX,
                pivotY: this.body.pivotY
            },
            arm: {
                animType: this.arm.animType,
                right: { ...this.arm.right },
                left: { ...this.arm.left }
            },
            leg: {
                animType: this.leg.animType,
                right: { ...this.leg.right },
                left: { ...this.leg.left }
            }
        };
    }
}
