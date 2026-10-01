// 자동 생성 파일: python tools/images/build_bases.py (손으로 고치지 말 것)
// 거점 그림 (로드맵 C단계). w·h = 게임 크기(px, 그림 파일은 2배), sink = 바닥선 아래로 묻히는 px(붕괴 잔해),
// src = [온전, 파손, 붕괴], muzzle = [왼쪽에서 x, 화면 바닥에서 b] 포구 위치
export const BASE_ART = {
    mid: { w: 217, h: 227, sink: 5, src: ['assets/sprites/stage/bunker_1.png', 'assets/sprites/stage/bunker_2.png', 'assets/sprites/stage/bunker_3.png'] },
    final: { w: 219, h: 280, sink: 0, src: ['assets/sprites/stage/tower_1.png', 'assets/sprites/stage/tower_2.png', 'assets/sprites/stage/tower_3.png'], muzzle: [25, 302] },
};
