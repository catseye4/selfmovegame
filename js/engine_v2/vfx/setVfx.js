/* ==========================================================================
   PROJECT: MAD OVERLORD // 기존 4종 A·B 세트 스킬 이펙트 정의 (v2, D-050 파츠 확장 1차)
   기획안(MD/기존캐릭터_파츠확장_기획안.md 4장)의 "이펙트" 칸을 기존 레이어(vfxPlayer.js)로 조합.
   색: 거대로봇 보라·청록 / 거대괴수 산성 초록·뼈 / 타락 히어로 보라·붉은 피 / 합성괴인 주황·불
   ========================================================================== */

import { BEAM, CYAN, BLAST } from './mechVfx.js';
import { ACID, MOSS } from './kaijuVfx.js';

const SMOKE = '70, 60, 80';
const METAL = '60, 60, 75';
const STEAM = '200, 190, 230';
const BONE = '235, 225, 195';
const BLOOD = '210, 30, 55';
const EARTH = '120, 95, 60';
const VENOM = '150, 240, 40';
const DARK = '200, 110, 255';
const SHADOW = '90, 40, 150';
const ORANGE = '255, 150, 40';
const FIRE = '255, 110, 30';
const HEAL = '120, 255, 140';

export const SET_VFX = {
    // ======== 거대로봇 A 「포격 사령부」 ========
    // 궤도 폭격 예고 (착탄 자리 마법진) → 위성 레이저 기둥 + 착탄 균열
    orbitalWarn: {
        layers: [
            { type: 'rune', at: 0, dur: 0.45, r: 46, color: BEAM, spin: 4 },
            { type: 'glow', at: 0, dur: 0.45, r: 40, color: BEAM }
        ]
    },
    orbitalHit: {
        sfx: 'mech_laser_big',
        layers: [
            { type: 'pillar', at: 0, dur: 0.55, h: 520, w: 44, color: BEAM },
            { type: 'flash', at: 0, dur: 0.2, r: 60, color: BEAM, dy: -30 },
            { type: 'ring', at: 0.02, dur: 0.45, r: 110, ground: true, color: CYAN, width: 6 },
            { type: 'cracks', at: 0.03, dur: 1.0, count: 6, len: 80, color: BEAM },
            { type: 'sparks', at: 0.02, count: 16, speed: 360, color: BEAM },
            { type: 'smoke', at: 0.08, count: 5, spread: 30, spreadY: 14, size: 20, life: [0.6, 1.0], rise: 30, color: SMOKE }
        ]
    },
    // 자동 포탑 연사 (어깨 위 총구 → 적)
    turretShot: {
        layers: [
            { type: 'beam', at: 0, dur: 0.08, w: 2.5, color: CYAN },
            { type: 'flash', at: 0, dur: 0.06, r: 8, color: CYAN },
            { type: 'flash', at: 0.01, dur: 0.08, r: 10, color: BLAST, pos: 'to' },
            { type: 'sparks', at: 0.01, count: 4, speed: 180, color: BLAST, pos: 'to' }
        ]
    },
    turretOn: {
        sfx: 'mech_drone_launch',
        layers: [
            { type: 'flash', at: 0, dur: 0.2, r: 26, color: CYAN },
            { type: 'ring', at: 0, dur: 0.35, r: 34, color: CYAN, width: 3 }
        ]
    },
    // 레일건 기본 공격: 청록 직선 탄도 + 꿰뚫린 자리 스파크
    railShot: {
        sfx: 'mech_laser',
        layers: [
            { type: 'beam', at: 0, dur: 0.14, w: 4, color: CYAN },
            { type: 'flash', at: 0, dur: 0.08, r: 14, color: CYAN },
            { type: 'sparks', at: 0.01, count: 6, speed: 260, color: CYAN, pos: 'to' }
        ]
    },
    railHit: {
        layers: [
            { type: 'flash', at: 0, dur: 0.1, r: 16, color: CYAN },
            { type: 'sparks', at: 0, count: 6, speed: 220, angle: 0, cone: 1.4, color: CYAN }
        ]
    },
    // 충전 레일 사격: 코일 충전 빛 → 굵은 청록 광선이 전장 끝까지
    railCharge: {
        sfx: 'charge_up',
        layers: [
            { type: 'swirl', at: 0, dur: 1.0, r: 34, arms: 4, spin: 14, color: CYAN, layer: 'front' },
            { type: 'glow', at: 0, dur: 1.0, r: 30, color: CYAN }
        ]
    },
    railBig: {
        sfx: 'mech_laser_big',
        layers: [
            { type: 'beam', at: 0, dur: 0.5, w: 13, color: CYAN },
            { type: 'beam', at: 0, dur: 0.35, w: 5, color: '230, 255, 255' },
            { type: 'fireball', at: 0, dur: 0.3, r: 26, color: CYAN },
            { type: 'ring', at: 0, dur: 0.3, r: 40, color: CYAN, width: 4 },
            { type: 'sparks', at: 0, count: 14, speed: 300, angle: 0, cone: 1.0, color: CYAN }
        ]
    },
    // 포격 고정: 공격 중 발밑 앵커 + 작은 먼지
    anchor: {
        layers: [
            { type: 'cracks', at: 0, dur: 0.8, count: 4, len: 34, color: CYAN },
            { type: 'smoke', at: 0, count: 3, spread: 30, spreadY: 4, size: 12, life: [0.4, 0.7], rise: 10, color: SMOKE }
        ]
    },

    // ======== 거대로봇 B 「돌격 강습대」 ========
    // 오버드라이브: 몸에서 피어오르는 보라 증기 + 눈 빛줄기
    overdrive: {
        sfx: 'charge_up',
        layers: [
            { type: 'flash', at: 0, dur: 0.25, r: 80, color: BEAM, dy: -60 },
            { type: 'ring', at: 0, dur: 0.5, r: 120, ground: true, color: BEAM, width: 6 },
            { type: 'smoke', at: 0, count: 10, spread: 50, spreadY: 40, size: 22, life: [0.8, 1.2], rise: 60, color: STEAM, dy: -40 },
            { type: 'motes', at: 0, count: 14, spread: 50, rise: [60, 140], life: [0.6, 1.0], size: 3, color: BEAM, dy: -40 }
        ]
    },
    overdriveTick: {
        layers: [
            { type: 'smoke', at: 0, count: 2, spread: 30, spreadY: 30, size: 14, life: [0.5, 0.8], rise: 50, color: STEAM, dy: -60 },
            { type: 'motes', at: 0, count: 3, spread: 30, rise: [40, 90], life: [0.4, 0.7], size: 2.4, color: BEAM, dy: -60 }
        ]
    },
    // 로켓 돌진: 추진 화염 꼬리 + 충돌 충격파
    rocketTrail: {
        layers: [
            { type: 'fireball', at: 0, dur: 0.25, r: 22, color: '150, 110, 255' },
            { type: 'smoke', at: 0, count: 2, spread: 10, spreadY: 10, size: 14, life: [0.4, 0.7], rise: 15, color: SMOKE }
        ]
    },
    rocketHit: {
        sfx: 'mech_fist_hit',
        layers: [
            { type: 'flash', at: 0, dur: 0.15, r: 40, color: CYAN },
            { type: 'ring', at: 0, dur: 0.35, r: 70, color: CYAN, width: 6 },
            { type: 'sparks', at: 0, count: 14, speed: 320, angle: 0, cone: 1.8, color: CYAN },
            { type: 'debris', at: 0, count: 6, speed: 240, size: 3, color: METAL }
        ]
    },
    // 파일 벙커: 말뚝이 튀어나오는 섬광 + 큰 충격 고리
    pileHit: {
        sfx: 'mech_fist_hit',
        layers: [
            { type: 'flash', at: 0, dur: 0.16, r: 50, color: '230, 255, 255' },
            { type: 'beam', at: 0, dur: 0.12, w: 10, color: CYAN },
            { type: 'ring', at: 0, dur: 0.4, r: 90, color: CYAN, width: 8 },
            { type: 'ring', at: 0.05, dur: 0.4, r: 60, color: BEAM, width: 4 },
            { type: 'sparks', at: 0, count: 20, speed: 420, angle: 0, cone: 1.2, color: CYAN },
            { type: 'debris', at: 0, count: 8, speed: 300, size: 3.5, color: METAL }
        ]
    },
    // 자기장 방벽: 원거리 공격을 맞을 때 청록 육각 막
    magField: {
        layers: [
            { type: 'ring', at: 0, dur: 0.3, r: 46, color: CYAN, width: 4 },
            { type: 'flash', at: 0, dur: 0.12, r: 30, color: CYAN }
        ]
    },

    // ======== 거대괴수 A 「가시 갑각」 ========
    // 가시 폭풍: 사방으로 날아가는 뼈 가시 + 붉은 출혈 방울
    spikeStorm: {
        sfx: 'kaiju_roar',
        layers: [
            { type: 'debris', at: 0, count: 28, speed: 560, size: 4, color: BONE, dy: -60 },
            { type: 'sparks', at: 0, count: 24, speed: 480, color: BONE, dy: -60 },
            { type: 'ring', at: 0, dur: 0.55, r: 260, ground: true, color: ACID, width: 7 },
            { type: 'flash', at: 0, dur: 0.2, r: 70, color: BONE, dy: -60 },
            { type: 'glow', at: 0, dur: 1.0, r: 120, color: ACID }
        ]
    },
    bleedTick: {
        layers: [
            { type: 'motes', at: 0, count: 3, spread: 10, rise: [-30, -10], life: [0.4, 0.6], size: 2.4, color: BLOOD, dy: -30 },
            { type: 'flash', at: 0, dur: 0.08, r: 8, color: BLOOD, dy: -30 }
        ]
    },
    // 가시 갑옷: 몸에 돋는 가시 + 맞을 때 가시 튐
    thornOn: {
        sfx: 'shield_on',
        layers: [
            { type: 'ring', at: 0, dur: 0.4, r: 90, color: BONE, width: 5, dy: -60 },
            { type: 'sparks', at: 0, count: 18, speed: 260, color: BONE, dy: -60 },
            { type: 'glow', at: 0, dur: 0.8, r: 80, color: ACID }
        ]
    },
    thornReflect: {
        layers: [
            { type: 'sparks', at: 0, count: 5, speed: 220, angle: 0, cone: 1.4, color: BONE },
            { type: 'flash', at: 0, dur: 0.08, r: 12, color: BONE }
        ]
    },
    // 지면 내려찍기: 바닥 균열 + 흙먼지 파도
    groundSlam: {
        sfx: 'chimera_slam',
        layers: [
            { type: 'cracks', at: 0, dur: 1.1, count: 8, len: 140, color: ACID },
            { type: 'ring', at: 0, dur: 0.5, r: 180, ground: true, color: EARTH, width: 8 },
            { type: 'smoke', at: 0, count: 12, spread: 120, spreadY: 10, size: 24, life: [0.6, 1.0], rise: 25, color: EARTH },
            { type: 'debris', at: 0, count: 12, speed: 320, size: 4, color: EARTH }
        ]
    },
    // 단단한 껍질: 맞을 때 초록 껍질 조각
    shellChip: {
        layers: [
            { type: 'debris', at: 0, count: 4, speed: 180, size: 2.6, color: '120, 170, 60' },
            { type: 'flash', at: 0, dur: 0.06, r: 12, color: ACID }
        ]
    },

    // ======== 거대괴수 B 「독안개」 ========
    // 독안개 숨결 / 산성 웅덩이: 구름 퍼프 (구역 안 여러 곳에서 계속)
    toxicPuff: {
        layers: [
            { type: 'smoke', at: 0, count: 3, spread: 30, spreadY: 18, size: 30, life: [0.9, 1.4], rise: 12, color: VENOM },
            { type: 'motes', at: 0, count: 3, spread: 30, rise: [20, 60], life: [0.6, 1.0], size: 2.6, color: ACID }
        ]
    },
    toxicBreath: {
        sfx: 'kaiju_spore',
        layers: [
            { type: 'smoke', at: 0, count: 14, spread: 120, spreadY: 30, size: 34, life: [1.0, 1.6], rise: 15, color: VENOM },
            { type: 'glow', at: 0, dur: 1.2, r: 120, color: ACID }
        ]
    },
    // 독 포자 폭발: 터지는 독주머니 + 포자 구름
    sporeBurst: {
        sfx: 'kaiju_egg_hatch',
        layers: [
            { type: 'fireball', at: 0, dur: 0.45, r: 60, color: VENOM, dy: -50 },
            { type: 'ring', at: 0, dur: 0.45, r: 150, ground: true, color: ACID, width: 7 },
            { type: 'smoke', at: 0.05, count: 12, spread: 90, spreadY: 40, size: 26, life: [0.8, 1.3], rise: 30, color: VENOM },
            { type: 'motes', at: 0.05, count: 16, spread: 100, rise: [40, 110], life: [0.6, 1.1], size: 3, color: ACID }
        ]
    },
    // 산성 침: 포물선 방울이 떨어진 자리
    spitSplash: {
        sfx: 'kaiju_bite',
        layers: [
            { type: 'flash', at: 0, dur: 0.12, r: 18, color: ACID },
            { type: 'ring', at: 0, dur: 0.35, r: 40, ground: true, color: ACID, width: 4 },
            { type: 'sparks', at: 0, count: 8, speed: 180, angle: -Math.PI / 2, cone: 2.4, color: ACID },
            { type: 'glow', at: 0, dur: 1.6, r: 30, color: ACID }
        ]
    },
    // 질주 본능: 달릴 때 뒤로 날리는 초록 잔상
    sprintTrail: {
        layers: [
            { type: 'motes', at: 0, count: 4, spread: 30, rise: [5, 25], life: [0.3, 0.5], size: 2.4, color: ACID, dy: -40 },
            { type: 'smoke', at: 0, count: 1, spread: 20, spreadY: 8, size: 14, life: [0.3, 0.5], rise: 5, color: MOSS }
        ]
    },

    // ======== 타락 히어로 A 「타락 기사」 ========
    // 심판의 일격: 떨어지는 보라 대검 + 충격파
    judgmentWarn: {
        layers: [
            { type: 'rune', at: 0, dur: 0.5, r: 100, color: DARK, spin: 3 },
            { type: 'glow', at: 0, dur: 0.5, r: 90, color: DARK }
        ]
    },
    judgmentHit: {
        sfx: 'hero_curse_nova',
        layers: [
            { type: 'pillar', at: 0, dur: 0.6, h: 560, w: 34, color: DARK },
            { type: 'pillar', at: 0, dur: 0.35, h: 560, w: 12, color: '255, 240, 255' },
            { type: 'flash', at: 0, dur: 0.25, r: 110, color: DARK, dy: -60 },
            { type: 'ring', at: 0.02, dur: 0.5, r: 200, ground: true, color: DARK, width: 9 },
            { type: 'cracks', at: 0.02, dur: 1.3, count: 9, len: 150, color: DARK },
            { type: 'sparks', at: 0.02, count: 26, speed: 460, color: DARK },
            { type: 'smoke', at: 0.1, count: 8, spread: 80, spreadY: 20, size: 26, life: [0.8, 1.2], rise: 25, color: SHADOW }
        ]
    },
    // 피의 서약: 몸 둘레 붉은 기운
    bloodOn: {
        sfx: 'shield_on',
        layers: [
            { type: 'ring', at: 0, dur: 0.45, r: 80, color: BLOOD, width: 5, dy: -60 },
            { type: 'motes', at: 0, count: 18, spread: 50, rise: [50, 120], life: [0.7, 1.1], size: 3, color: BLOOD, dy: -40 },
            { type: 'glow', at: 0, dur: 0.8, r: 70, color: BLOOD }
        ]
    },
    bloodDrain: {
        layers: [
            { type: 'motes', at: 0, count: 4, spread: 16, rise: [40, 80], life: [0.4, 0.6], size: 2.4, color: BLOOD }
        ]
    },
    // 회전 베기: 원형 보라 칼자국 (한 바퀴마다)
    whirl: {
        sfx: 'hero_slash_hit',
        layers: [
            { type: 'claw', at: 0, dur: 0.3, count: 2, len: 150, gap: 40, angle: 0.3, color: DARK, width: 10, bend: 0.6 },
            { type: 'claw', at: 0.05, dur: 0.3, count: 2, len: 150, gap: 40, angle: 3.4, color: DARK, width: 10, bend: 0.6 },
            { type: 'ring', at: 0, dur: 0.3, r: 130, color: DARK, width: 4, dy: -50 },
            { type: 'sparks', at: 0.03, count: 10, speed: 300, color: DARK, dy: -50 }
        ]
    },
    // 불굴: 발동 중 몸 주변 보라 방패 빛
    indomitable: {
        layers: [
            { type: 'ring', at: 0, dur: 0.45, r: 70, color: DARK, width: 5, dy: -70 },
            { type: 'glow', at: 0, dur: 0.6, r: 60, color: DARK }
        ]
    },

    // ======== 타락 히어로 B 「그림자 마도사」 ========
    clonePoof: {
        layers: [
            { type: 'smoke', at: 0, count: 8, spread: 30, spreadY: 50, size: 22, life: [0.6, 1.0], rise: 30, color: SHADOW, dy: -60 },
            { type: 'flash', at: 0, dur: 0.15, r: 40, color: DARK, dy: -60 }
        ]
    },
    // 저주의 사슬: 땅에서 솟는 보라 사슬 (대상마다)
    chainBind: {
        sfx: 'hero_curse_tick',
        layers: [
            { type: 'pillar', at: 0, dur: 0.5, h: 120, w: 10, color: DARK },
            { type: 'rune', at: 0, dur: 0.6, r: 30, color: DARK, spin: 6 },
            { type: 'ring', at: 0, dur: 0.4, r: 34, ground: true, color: DARK, width: 3 }
        ]
    },
    chainTick: {
        layers: [
            { type: 'chevrons', at: 0, count: 2, spread: 10, fall: 20, life: [0.4, 0.6], size: 5, color: DARK, dy: -60 }
        ]
    },
    // 암흑 구체 기본 공격 폭발 (작은 범위)
    orbBlast: {
        sfx: 'hero_wave_hit',
        layers: [
            { type: 'fireball', at: 0, dur: 0.35, r: 26, color: SHADOW },
            { type: 'ring', at: 0, dur: 0.3, r: 46, color: DARK, width: 4 },
            { type: 'sparks', at: 0, count: 8, speed: 220, color: DARK }
        ]
    },
    // 블랙홀: 빨려드는 소용돌이 (0.5초마다 다시 그림)
    blackHole: {
        layers: [
            { type: 'swirl', at: 0, dur: 0.6, r: 90, arms: 5, spin: 10, color: DARK },
            { type: 'glow', at: 0, dur: 0.6, r: 50, color: SHADOW },
            { type: 'flash', at: 0, dur: 0.6, r: 22, color: '20, 0, 40' }
        ]
    },
    blackHoleEnd: {
        sfx: 'hero_curse_nova',
        layers: [
            { type: 'flash', at: 0, dur: 0.2, r: 70, color: DARK },
            { type: 'ring', at: 0, dur: 0.4, r: 120, color: DARK, width: 6 },
            { type: 'sparks', at: 0, count: 16, speed: 340, color: DARK }
        ]
    },
    // 그림자 회피: 몸이 흐려지며 잔상
    dodge: {
        layers: [
            { type: 'smoke', at: 0, count: 3, spread: 20, spreadY: 30, size: 16, life: [0.3, 0.5], rise: 20, color: SHADOW, dy: -60 }
        ]
    },

    // ======== 합성괴인 A 「광폭 실험체」 ========
    // 광견 돌진: 주황 돌진 궤적
    maulTrail: {
        layers: [
            { type: 'smoke', at: 0, count: 2, spread: 14, spreadY: 10, size: 16, life: [0.3, 0.5], rise: 10, color: EARTH },
            { type: 'sparks', at: 0, count: 3, speed: 160, angle: Math.PI, cone: 1, color: ORANGE }
        ]
    },
    maulHit: {
        sfx: 'chimera_slam',
        layers: [
            { type: 'flash', at: 0, dur: 0.12, r: 34, color: ORANGE },
            { type: 'ring', at: 0, dur: 0.3, r: 54, color: ORANGE, width: 5 },
            { type: 'sparks', at: 0, count: 10, speed: 300, angle: -0.3, cone: 1.6, color: ORANGE }
        ]
    },
    // 아드레날린: 혈관에 흐르는 주황 빛 + 김
    adrenaline: {
        sfx: 'chimera_phase2',
        layers: [
            { type: 'ring', at: 0, dur: 0.45, r: 90, color: ORANGE, width: 5, dy: -60 },
            { type: 'smoke', at: 0, count: 10, spread: 40, spreadY: 40, size: 20, life: [0.8, 1.2], rise: 60, color: STEAM, dy: -40 },
            { type: 'motes', at: 0, count: 14, spread: 40, rise: [50, 120], life: [0.6, 1.0], size: 3, color: ORANGE, dy: -40 }
        ]
    },
    // 대지 강타: 큰 균열 + 바위 파편
    earthSmash: {
        sfx: 'chimera_slam',
        layers: [
            { type: 'cracks', at: 0, dur: 1.3, count: 10, len: 200, color: ORANGE },
            { type: 'ring', at: 0, dur: 0.55, r: 240, ground: true, color: ORANGE, width: 9 },
            { type: 'flash', at: 0, dur: 0.2, r: 60, color: ORANGE, dy: -20 },
            { type: 'debris', at: 0, count: 18, speed: 420, size: 5, color: EARTH },
            { type: 'smoke', at: 0.05, count: 12, spread: 140, spreadY: 14, size: 26, life: [0.7, 1.2], rise: 25, color: EARTH }
        ]
    },
    // 짓밟기: 발밑 주황 충격 고리
    stomp: {
        layers: [
            { type: 'ring', at: 0, dur: 0.35, r: 70, ground: true, color: ORANGE, width: 4 },
            { type: 'debris', at: 0, count: 3, speed: 160, size: 2.6, color: EARTH }
        ]
    },

    // ======== 합성괴인 B 「조직 사령관」 ========
    // 총동원령: 소환진 (졸개마다는 CHIMERA_VFX.summon)
    mobilize: {
        sfx: 'chimera_summon',
        layers: [
            { type: 'rune', at: 0, dur: 0.8, r: 120, color: ORANGE, spin: 3 },
            { type: 'ring', at: 0, dur: 0.6, r: 200, ground: true, color: ORANGE, width: 6 },
            { type: 'glow', at: 0, dur: 1.0, r: 110, color: ORANGE }
        ]
    },
    // 강화 주사: 졸개마다 초록 회복 빛
    boostShot: {
        sfx: 'kaiju_regen',
        layers: [
            { type: 'motes', at: 0, count: 8, spread: 18, rise: [40, 90], life: [0.6, 0.9], size: 2.8, color: HEAL, dy: -20 },
            { type: 'ring', at: 0, dur: 0.4, r: 30, ground: true, color: HEAL, width: 3 }
        ]
    },
    // 산탄: 총구의 부채꼴 섬광 / 맞은 적
    shotgunBlast: {
        sfx: 'mech_missile_blast',
        layers: [
            { type: 'flash', at: 0, dur: 0.1, r: 22, color: FIRE },
            { type: 'sparks', at: 0, count: 14, speed: 420, angle: 0, cone: 0.7, color: '255, 200, 120' },
            { type: 'smoke', at: 0.02, count: 2, spread: 8, spreadY: 8, size: 12, life: [0.3, 0.6], rise: 20, color: SMOKE }
        ]
    },
    pellet: {
        layers: [
            { type: 'flash', at: 0, dur: 0.08, r: 12, color: FIRE },
            { type: 'sparks', at: 0, count: 4, speed: 160, color: '255, 200, 120' }
        ]
    },
    // 화염 방사: 앞쪽 화염 줄기 (0.12초마다)
    flame: {
        layers: [
            { type: 'sparks', at: 0, count: 10, speed: 520, angle: 0, cone: 0.45, color: FIRE },
            { type: 'fireball', at: 0, dur: 0.25, r: 22, color: FIRE },
            { type: 'smoke', at: 0.05, count: 2, spread: 20, spreadY: 10, size: 16, life: [0.4, 0.7], rise: 30, color: SMOKE }
        ]
    },
    flameTick: {
        layers: [
            { type: 'fireball', at: 0, dur: 0.3, r: 18, color: FIRE },
            { type: 'motes', at: 0, count: 3, spread: 16, rise: [30, 70], life: [0.3, 0.6], size: 2.4, color: '255, 200, 120' }
        ]
    }
};
