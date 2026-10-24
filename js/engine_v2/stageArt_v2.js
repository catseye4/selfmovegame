// 자동 생성 파일: python tools/images/build_bases.py (손으로 고치지 말 것)
// 거점·장애물 그림 (그림 이름별, 구역마다 쓰는 그림은 stages_v2.js 챕터의 art). w·h = 게임 크기(px, 그림 파일은 2배),
// sink = 바닥선 아래로 묻히는 px(붕괴 잔해), src = [온전, 파손, (붕괴)], muzzle = [왼쪽에서 x, 화면 바닥에서 b] 포구·굴뚝
export const BASE_ART = {
    bunker: { w: 217, h: 227, sink: 5, src: ['assets/sprites/stage/bunker_1.webp', 'assets/sprites/stage/bunker_2.webp', 'assets/sprites/stage/bunker_3.webp'] },
    tower: { w: 219, h: 280, sink: 0, src: ['assets/sprites/stage/tower_1.webp', 'assets/sprites/stage/tower_2.webp', 'assets/sprites/stage/tower_3.webp'], muzzle: [25, 302] },
    gate: { w: 200, h: 227, sink: 7, src: ['assets/sprites/stage/gate_1.webp', 'assets/sprites/stage/gate_2.webp', 'assets/sprites/stage/gate_3.webp'] },
    furnace: { w: 254, h: 315, sink: 0, src: ['assets/sprites/stage/furnace_1.webp', 'assets/sprites/stage/furnace_2.webp', 'assets/sprites/stage/furnace_3.webp'], muzzle: [146, 340] },
    barricade: { w: 103, h: 80, sink: 0, src: ['assets/sprites/stage/barricade_1.webp', 'assets/sprites/stage/barricade_2.webp'] },
    inqtower: { w: 208, h: 255, sink: 0, src: ['assets/sprites/stage/inqtower_1.webp', 'assets/sprites/stage/inqtower_2.webp', 'assets/sprites/stage/inqtower_3.webp'], muzzle: [107, 291] },
    cathedral: { w: 287, h: 240, sink: 0, src: ['assets/sprites/stage/cathedral_1.webp', 'assets/sprites/stage/cathedral_2.webp', 'assets/sprites/stage/cathedral_3.webp'] },
    shieldwall: { w: 150, h: 82, sink: 15, src: ['assets/sprites/stage/shieldwall_1.webp', 'assets/sprites/stage/shieldwall_2.webp'] },
    fleshwall: { w: 224, h: 231, sink: 1, src: ['assets/sprites/stage/fleshwall_1.webp', 'assets/sprites/stage/fleshwall_2.webp', 'assets/sprites/stage/fleshwall_3.webp'], muzzle: [73, 263] },
    cocoon: { w: 252, h: 307, sink: 0, src: ['assets/sprites/stage/cocoon_1.webp', 'assets/sprites/stage/cocoon_2.webp', 'assets/sprites/stage/cocoon_3.webp'] },
    chitin: { w: 172, h: 80, sink: 12, src: ['assets/sprites/stage/chitin_1.webp', 'assets/sprites/stage/chitin_2.webp'] },
};
