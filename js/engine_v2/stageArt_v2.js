// 자동 생성 파일: python tools/images/build_bases.py (손으로 고치지 말 것)
// 거점·장애물 그림 (그림 이름별, 구역마다 쓰는 그림은 stages_v2.js 챕터의 art). w·h = 게임 크기(px, 그림 파일은 2배),
// sink = 바닥선 아래로 묻히는 px(붕괴 잔해), src = [온전, 파손, (붕괴)], muzzle = [왼쪽에서 x, 화면 바닥에서 b] 포구·굴뚝
export const BASE_ART = {
    bunker: { w: 217, h: 227, sink: 5, src: ['assets/sprites/stage/bunker_1.png', 'assets/sprites/stage/bunker_2.png', 'assets/sprites/stage/bunker_3.png'] },
    tower: { w: 219, h: 280, sink: 0, src: ['assets/sprites/stage/tower_1.png', 'assets/sprites/stage/tower_2.png', 'assets/sprites/stage/tower_3.png'], muzzle: [25, 302] },
    gate: { w: 200, h: 227, sink: 7, src: ['assets/sprites/stage/gate_1.png', 'assets/sprites/stage/gate_2.png', 'assets/sprites/stage/gate_3.png'] },
    furnace: { w: 254, h: 315, sink: 0, src: ['assets/sprites/stage/furnace_1.png', 'assets/sprites/stage/furnace_2.png', 'assets/sprites/stage/furnace_3.png'], muzzle: [146, 340] },
    barricade: { w: 103, h: 80, sink: 0, src: ['assets/sprites/stage/barricade_1.png', 'assets/sprites/stage/barricade_2.png'] },
};
