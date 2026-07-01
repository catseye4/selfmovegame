/* ==========================================================================
   PROJECT: MAD OVERLORD // PARTS DATABASE (DUAL GRAPHIC DATA)
   ========================================================================== */

export const PARTS_DB = {
    head: [
        {
            id: 'head_chimera',
            name: '바이오 키메라 헤드',
            faction: '합성괴인 (키메라)',
            cost: 0, // 기본 제공
            stats: { hp: 500, dps: 50, range: 0, speed: 10 },
            skillDesc: '체력 50% 이하 시 자동 거대화 및 실드 전개 기믹 작동',
            live2dStyle: {
                background: 'linear-gradient(135deg, #00ffcc, #9900ff)',
                clipPath: 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)',
                boxShadow: '0 0 15px #00ffcc'
            },
            pixelStyle: {
                background: '#00ffcc',
                borderColor: '#004433',
                boxShadow: 'inset -4px -4px 0 #00aa88, 0 0 10px rgba(0, 255, 204, 0.6)'
            }
        },
        {
            id: 'head_mutant',
            name: '돌연변이 포자 뿔',
            faction: '거대괴수 (돌연변이)',
            cost: 300,
            stats: { hp: 900, dps: 30, range: 0, speed: 0 },
            skillDesc: '전투 중 초당 최대 체력의 2%씩 지속 재생',
            live2dStyle: {
                background: 'linear-gradient(135deg, #00ff66, #225500)',
                clipPath: 'polygon(50% 0%, 90% 20%, 100% 80%, 70% 100%, 30% 100%, 0% 80%, 10% 20%)',
                boxShadow: '0 0 15px #00ff66'
            },
            pixelStyle: {
                background: '#00ff66',
                borderColor: '#003311',
                boxShadow: 'inset -4px -4px 0 #008833, 0 0 10px rgba(0, 255, 102, 0.6)'
            }
        },
        {
            id: 'head_mech',
            name: '타겟팅 레이저 바이저',
            faction: '거대로봇 (메카닉)',
            cost: 500,
            stats: { hp: 400, dps: 120, range: 50, speed: 5 },
            skillDesc: '적의 대공망 교란 및 치명타 확률 15% 증가',
            live2dStyle: {
                background: 'linear-gradient(135deg, #ffcc00, #ff0055)',
                clipPath: 'polygon(20% 0%, 80% 0%, 100% 50%, 80% 100%, 20% 100%, 0% 50%)',
                boxShadow: '0 0 15px #ffcc00'
            },
            pixelStyle: {
                background: '#ffcc00',
                borderColor: '#554400',
                boxShadow: 'inset -4px -4px 0 #aa8800, 0 0 10px rgba(255, 204, 0, 0.8)'
            }
        },
        {
            id: 'head_hero',
            name: '세뇌 스마트 구속구',
            faction: '타락 히어로 (세뇌)',
            cost: 700,
            stats: { hp: 600, dps: 90, range: 30, speed: 15 },
            skillDesc: '적 보병 소멸 시 25% 확률로 즉시 아군 미니언 징집',
            live2dStyle: {
                background: 'linear-gradient(135deg, #ff0055, #330011)',
                clipPath: 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)',
                boxShadow: '0 0 15px #ff0055'
            },
            pixelStyle: {
                background: '#ff0055',
                borderColor: '#440011',
                boxShadow: 'inset -4px -4px 0 #aa0033, 0 0 10px rgba(255, 0, 85, 0.8)'
            }
        }
    ],
    body: [
        {
            id: 'body_chimera',
            name: '강화 생체 코어',
            faction: '합성괴인 (키메라)',
            cost: 0,
            stats: { hp: 1200, dps: 50, range: 0, speed: 10 },
            skillDesc: '기본 데미지 감소 10% 및 출격 시 졸개 미니언 2기 소환',
            live2dStyle: {
                background: 'linear-gradient(180deg, #2a2a4e, #111122)',
                borderColor: '#00ffcc'
            },
            pixelStyle: {
                background: '#332255',
                borderColor: '#110022',
                boxShadow: 'inset -6px -6px 0 #221133, 4px 4px 0 #00ffcc'
            }
        },
        {
            id: 'body_mutant',
            name: '재생 세포 외피',
            faction: '거대괴수 (돌연변이)',
            cost: 400,
            stats: { hp: 2000, dps: 30, range: 0, speed: -10 },
            skillDesc: '압도적인 최대 체력 보강 및 적 포화 돌파 시 경직 저항',
            live2dStyle: {
                background: 'linear-gradient(180deg, #1f3a1f, #081108)',
                borderColor: '#00ff66'
            },
            pixelStyle: {
                background: '#224422',
                borderColor: '#051105',
                boxShadow: 'inset -6px -6px 0 #112211, 4px 4px 0 #00ff66'
            }
        },
        {
            id: 'body_mech',
            name: '아다만티움 장갑 코어',
            faction: '거대로봇 (메카닉)',
            cost: 600,
            stats: { hp: 1500, dps: 80, range: 0, speed: 0 },
            skillDesc: '물리 방어력 극대화 및 피격 시 에너지 반사 실드 가동',
            live2dStyle: {
                background: 'linear-gradient(180deg, #444455, #111122)',
                borderColor: '#ffcc00'
            },
            pixelStyle: {
                background: '#444455',
                borderColor: '#111122',
                boxShadow: 'inset -6px -6px 0 #222233, 4px 4px 0 #ffcc00'
            }
        },
        {
            id: 'body_hero',
            name: '흑마법 룬 갑옷',
            faction: '타락 히어로 (세뇌)',
            cost: 800,
            stats: { hp: 1300, dps: 120, range: 0, speed: 20 },
            skillDesc: '주변 150px 내 적 전체에게 매초 흑마법 저주 지속 데미지',
            live2dStyle: {
                background: 'linear-gradient(180deg, #330022, #110008)',
                borderColor: '#ff0055'
            },
            pixelStyle: {
                background: '#440022',
                borderColor: '#110005',
                boxShadow: 'inset -6px -6px 0 #220011, 4px 4px 0 #ff0055'
            }
        }
    ],
    arm: [
        {
            id: 'arm_chimera',
            name: '플라즈마 커터 팔',
            faction: '합성괴인 (키메라)',
            cost: 0,
            stats: { hp: 300, dps: 200, range: 180, speed: 10 },
            skillDesc: '단일 대상 고속 참격 (공격 모션 시 전방 클로 이펙트 생성)',
            attackType: 'melee',
            live2dStyle: {
                background: 'linear-gradient(180deg, #ff0055, #330011)',
                borderColor: '#ff0055'
            },
            pixelStyle: {
                background: '#ff0055',
                borderColor: '#550011',
                boxShadow: 'inset -4px -4px 0 #aa0033, 0 0 12px rgba(255, 0, 85, 0.8)'
            }
        },
        {
            id: 'arm_mech_laser',
            name: '레이저 포대 (Laser Cannon)',
            faction: '거대로봇 (메카닉)',
            cost: 500,
            stats: { hp: 200, dps: 350, range: 350, speed: 0 },
            skillDesc: '단일 보스급 영웅 타겟 방어력 관통 지속 레이저 파동 딜링',
            attackType: 'laser',
            live2dStyle: {
                background: 'linear-gradient(180deg, #00ccff, #002244)',
                borderColor: '#00ccff'
            },
            pixelStyle: {
                background: '#00ccff',
                borderColor: '#003366',
                boxShadow: 'inset -4px -4px 0 #006699, 0 0 15px rgba(0, 204, 255, 0.8)'
            }
        },
        {
            id: 'arm_mech_missile',
            name: '미사일 포드 (Missile Pod)',
            faction: '거대로봇 (메카닉)',
            cost: 650,
            stats: { hp: 250, dps: 280, range: 400, speed: -5 },
            skillDesc: '적 쫄몹 웨이브를 지우기 위한 광역 폭발형 유도 미사일 동시 3발 사출',
            attackType: 'missile',
            live2dStyle: {
                background: 'linear-gradient(180deg, #ffcc00, #332200)',
                borderColor: '#ffcc00'
            },
            pixelStyle: {
                background: '#ffcc00',
                borderColor: '#554400',
                boxShadow: 'inset -4px -4px 0 #aa8800, 0 0 15px rgba(255, 204, 0, 0.8)'
            }
        },
        {
            id: 'arm_hero_wave',
            name: '세뇌 파동 지팡이',
            faction: '타락 히어로 (세뇌)',
            cost: 850,
            stats: { hp: 400, dps: 300, range: 280, speed: 15 },
            skillDesc: '전방 광역 어둠 파동 방출 및 피격 적군 속도 50% 감속 CC',
            attackType: 'wave',
            live2dStyle: {
                background: 'linear-gradient(180deg, #9900ff, #220033)',
                borderColor: '#9900ff'
            },
            pixelStyle: {
                background: '#9900ff',
                borderColor: '#330055',
                boxShadow: 'inset -4px -4px 0 #6600aa, 0 0 15px rgba(153, 0, 255, 0.8)'
            }
        }
    ],
    leg: [
        {
            id: 'leg_chimera',
            name: '지진 분쇄 다리',
            faction: '합성괴인 (키메라)',
            cost: 0,
            stats: { hp: 500, dps: 80, range: 0, speed: 80 },
            skillDesc: '전진 시 주변 지면에 지속적인 광역 충동 및 지진 이펙트 발동',
            live2dStyle: {
                background: 'linear-gradient(180deg, #1f1f3a, #080811)',
                borderColor: '#00ccff'
            },
            pixelStyle: {
                background: '#112244',
                borderColor: '#000811',
                boxShadow: 'inset -4px -4px 0 #081122'
            }
        },
        {
            id: 'leg_mutant',
            name: '점액질 기동 포자',
            faction: '거대괴수 (돌연변이)',
            cost: 350,
            stats: { hp: 1000, dps: 30, range: 0, speed: 70 },
            skillDesc: '이동 중 지나간 길에 유독성 점액을 남겨 적의 접근 봉쇄',
            live2dStyle: {
                background: 'linear-gradient(180deg, #1f3a1f, #081108)',
                borderColor: '#00ff66'
            },
            pixelStyle: {
                background: '#113311',
                borderColor: '#051105',
                boxShadow: 'inset -4px -4px 0 #082208'
            }
        },
        {
            id: 'leg_mech_wheel',
            name: '대전차 무한궤도 바퀴',
            faction: '거대로봇 (메카닉)',
            cost: 600,
            stats: { hp: 700, dps: 150, range: 0, speed: 150 },
            skillDesc: '이동 속도가 기하급수적으로 증가하며 적 바리케이드 충돌 무시 및 돌진 데미지',
            live2dStyle: {
                background: 'linear-gradient(180deg, #443300, #110800)',
                borderColor: '#ffcc00'
            },
            pixelStyle: {
                background: '#554400',
                borderColor: '#110800',
                boxShadow: 'inset -4px -4px 0 #332200'
            }
        },
        {
            id: 'leg_hero_hover',
            name: '반중력 부양 장치',
            faction: '타락 히어로 (세뇌)',
            cost: 800,
            stats: { hp: 600, dps: 100, range: 0, speed: 130 },
            skillDesc: '공중에 부양하여 전진함으로써 지상 지뢰 및 덫 기믹 완벽 무시',
            live2dStyle: {
                background: 'linear-gradient(180deg, #330055, #0a0011)',
                borderColor: '#9900ff'
            },
            pixelStyle: {
                background: '#440066',
                borderColor: '#110022',
                boxShadow: 'inset -4px -4px 0 #220033'
            }
        }
    ]
};
