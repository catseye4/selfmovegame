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
            name: initialData.head?.name || '기본 머리',
            src: initialData.head?.src !== undefined ? initialData.head.src : 'assets/sprites/parts/robot/red_head.png',
            animType: initialData.head?.animType || 'pivot'
        };

        // 가슴/몸통 (body)
        this.body = {
            id: initialData.body?.id || 'body_red_robot',
            name: initialData.body?.name || '기본 가슴',
            src: initialData.body?.src !== undefined ? initialData.body.src : 'assets/sprites/parts/robot/red_body.png',
            animType: initialData.body?.animType || 'pivot'
        };

        // 팔 (arm) 세트 -> 오른쪽, 왼쪽 묶음 관리
        this.arm = {
            id: initialData.arm?.id || 'arm_red_robot',
            name: initialData.arm?.name || '기본 팔',
            animType: initialData.arm?.animType || 'pivot',
            right: {
                src: initialData.arm?.right?.src !== undefined ? initialData.arm.right.src : 'assets/sprites/parts/robot/red_arm_l.png',
                pivotX: initialData.arm?.right?.pivotX ?? 30,
                pivotY: initialData.arm?.right?.pivotY ?? 20
            },
            left: {
                src: initialData.arm?.left?.src !== undefined ? initialData.arm.left.src : 'assets/sprites/parts/robot/red_arm_r.png',
                pivotX: initialData.arm?.left?.pivotX ?? 30,
                pivotY: initialData.arm?.left?.pivotY ?? 20
            }
        };

        // 다리 (leg) 세트 -> 오른쪽, 왼쪽 묶음 관리
        this.leg = {
            id: initialData.leg?.id || 'leg_red_robot',
            name: initialData.leg?.name || '기본 다리',
            animType: initialData.leg?.animType || 'pivot',
            right: { src: initialData.leg?.right?.src !== undefined ? initialData.leg.right.src : 'assets/sprites/parts/robot/red_leg.png' },
            left:  { src: initialData.leg?.left?.src  !== undefined ? initialData.leg.left.src  : 'assets/sprites/parts/robot/red_leg.png' }
        };
    }

    setHead(headData) {
        if (!headData) return;
        this.head.id = headData.id || this.head.id;
        this.head.name = headData.name || this.head.name;
        this.head.src = headData.src !== undefined ? headData.src : '';
        this.head.animType = headData.animType || 'pivot';
    }

    setBody(bodyData) {
        if (!bodyData) return;
        this.body.id = bodyData.id || this.body.id;
        this.body.name = bodyData.name || this.body.name;
        this.body.src = bodyData.src !== undefined ? bodyData.src : '';
        this.body.animType = bodyData.animType || 'pivot';
    }

    setArmSet(armData) {
        if (!armData) return;
        this.arm.id = armData.id || this.arm.id;
        this.arm.name = armData.name || this.arm.name;
        this.arm.animType = armData.animType || 'pivot';

        const rSrc = armData.right?.src !== undefined ? armData.right.src : (armData.src !== undefined ? armData.src : '');
        const lSrc = armData.left?.src !== undefined ? armData.left.src : (armData.src !== undefined ? armData.src : '');
        this.arm.right = { src: rSrc, pivot: armData.right?.pivot };
        this.arm.left  = { src: lSrc, pivot: armData.left?.pivot };
    }

    setLegSet(legData) {
        if (!legData) return;
        this.leg.id = legData.id || this.leg.id;
        this.leg.name = legData.name || this.leg.name;
        this.leg.animType = legData.animType || 'pivot';

        const rSrc = legData.right?.src !== undefined ? legData.right.src : (legData.src !== undefined ? legData.src : '');
        const lSrc = legData.left?.src !== undefined ? legData.left.src : (legData.src !== undefined ? legData.src : '');
        this.leg.right = { src: rSrc };
        this.leg.left  = { src: lSrc };
    }
}
