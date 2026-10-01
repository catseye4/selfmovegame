// 자동 생성 파일: python tools/rig/bake_enemies.py (손으로 고치지 말 것)
// 적 그림 (로드맵 C단계, D-035): 리그를 구운 동작별 스프라이트. 같은 틀·배율이라 바꿔 끼워도 발 위치가 같음
// frameWidth·frameHeight = 프레임 크기(px), anchorX = 프레임 안 발 사이 x, 동작 = { src, frames, duration }
export const ENEMY_ART = {
    guard: { frameWidth: 70, frameHeight: 92, anchorX: 38.0, walk: { src: 'assets/sprites/rig/guard/guard_walk.png', frames: 12, duration: 0.7 }, attack: { src: 'assets/sprites/rig/guard/guard_attack.png', frames: 10, duration: 0.8 } },
    shield: { frameWidth: 95, frameHeight: 103, anchorX: 47.4, walk: { src: 'assets/sprites/rig/shield/shield_walk.png', frames: 12, duration: 0.8 }, attack: { src: 'assets/sprites/rig/shield/shield_attack.png', frames: 10, duration: 0.9 } },
    tranq: { frameWidth: 75, frameHeight: 92, anchorX: 51.7, walk: { src: 'assets/sprites/rig/tranq/tranq_walk.png', frames: 12, duration: 0.7 }, attack: { src: 'assets/sprites/rig/tranq/tranq_attack.png', frames: 8, duration: 0.6 } },
    shock: { frameWidth: 83, frameHeight: 92, anchorX: 52.9, walk: { src: 'assets/sprites/rig/shock/shock_walk.png', frames: 12, duration: 0.7 }, attack: { src: 'assets/sprites/rig/shock/shock_attack.png', frames: 10, duration: 0.8 } },
    medic: { frameWidth: 76, frameHeight: 92, anchorX: 41.5, walk: { src: 'assets/sprites/rig/medic/medic_walk.png', frames: 12, duration: 0.7 }, attack: { src: 'assets/sprites/rig/medic/medic_attack.png', frames: 10, duration: 0.8 } },
    guardian: { frameWidth: 260, frameHeight: 224, anchorX: 91.2, walk: { src: 'assets/sprites/rig/guardian/guardian_walk.png', frames: 12, duration: 0.9 }, attack: { src: 'assets/sprites/rig/guardian/guardian_attack.png', frames: 12, duration: 0.9 }, bash: { src: 'assets/sprites/rig/guardian/guardian_bash.png', frames: 10, duration: 0.8 } },
};
