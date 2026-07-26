/* ==========================================================================
   PROJECT: MAD OVERLORD // ROBOT PARTS STRUCTURE DATA DEFINITION (v2)
   Manages robot part data (head, body, arm [right+left], leg [right+left]) for item/stat management.
   This data structure is purely for inventory/part logic and does NOT control rendering Z-indices or positions.
   ========================================================================== */

export class RobotPartsStructure {
    constructor(initialData = {}) {
        // 머리 (head)
        this.head = {
            id: initialData.head?.id || 'head_red_robot',
            name: initialData.head?.name || '레드 바이저 다안 헬멧',
            src: initialData.head?.src || 'assets/sprites/parts/robot/red_head.png',
            animType: initialData.head?.animType || 'pivot'
        };

        // 가슴/몸통 (body)
        this.body = {
            id: initialData.body?.id || 'body_red_robot',
            name: initialData.body?.name || '중장갑 엑시온 코어 흉갑',
            src: initialData.body?.src || 'assets/sprites/parts/robot/red_body.png',
            animType: initialData.body?.animType || 'pivot'
        };

        // 팔 (arm) 세트 -> 오른쪽, 왼쪽 묶음 관리
        this.arm = {
            id: initialData.arm?.id || 'arm_red_robot',
            name: initialData.arm?.name || '더블 메카 바주카 암 세트',
            animType: initialData.arm?.animType || 'pivot',
            right: { src: initialData.arm?.right?.src || 'assets/sprites/parts/robot/red_arm_r.png' },
            left:  { src: initialData.arm?.left?.src  || 'assets/sprites/parts/robot/red_arm_l.png' }
        };

        // 다리 (leg) 세트 -> 오른쪽, 왼쪽 묶음 관리
        this.leg = {
            id: initialData.leg?.id || 'leg_red_robot',
            name: initialData.leg?.name || '서스펜션 발목 레그 세트',
            animType: initialData.leg?.animType || 'pivot',
            right: { src: initialData.leg?.right?.src || 'assets/sprites/parts/robot/red_leg.png' },
            left:  { src: initialData.leg?.left?.src  || 'assets/sprites/parts/robot/red_leg.png' }
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

        const rSrc = armData.right?.src || armData.src || this.arm.right.src;
        const lSrc = armData.left?.src  || armData.src || this.arm.left.src;
        this.arm.right.src = rSrc;
        this.arm.left.src  = lSrc;
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

        const rSrc = legData.right?.src || legData.src || this.leg.right.src;
        const lSrc = legData.left?.src  || legData.src || this.leg.left.src;
        this.leg.right.src = rSrc;
        this.leg.left.src  = lSrc;
    }

    /**
     * 머리(head) 파츠 변경
     */
    setHead(headData) {
        if (!headData) return;
        this.head.id = headData.id || this.head.id;
        this.head.name = headData.name || this.head.name;
        this.head.src = headData.src || this.head.src;
        this.head.animType = headData.animType || this.head.animType;
    }

    /**
     * 가슴(body) 파츠 변경
     */
    setBody(bodyData) {
        if (!bodyData) return;
        this.body = bodyData.id || this.body.id;
        this.body.name = bodyData.name || this.body.name;
        this.body.src = bodyData.src || this.body.src;
        this.body.animType = bodyData.animType || this.body.animType;
    }
}
