import type { Household, Storage } from './types';

/** 새 가정의 기본 칸 구성. 위 칸·중앙 칸·아래 칸·도어 */
export function defaultStorages(): Storage[] {
  return [
    {
      id: 'st_fridge', name: '냉장실', kind: 'fridge',
      compartments: [
        { id: 'c_top', name: '위 칸', hint: 'top' },
        { id: 'c_mid', name: '중앙 칸', hint: 'middle' },
        { id: 'c_bot', name: '아래 칸', hint: 'bottom' },
        { id: 'c_door', name: '도어', hint: 'door', side: true },
      ],
    },
    {
      id: 'st_freezer', name: '냉동실', kind: 'freezer',
      compartments: [
        { id: 'c_z1', name: '위 칸', hint: 'frz' },
        { id: 'c_z2', name: '아래 칸', hint: 'frz2' },
        { id: 'c_zd', name: '도어', hint: 'frzd', side: true },
      ],
    },
    {
      id: 'st_kimchi', name: '김치냉장고', kind: 'kimchi',
      compartments: [
        { id: 'c_k1', name: '왼쪽 칸', hint: 'kim' },
        { id: 'c_k2', name: '오른쪽 칸', hint: 'kim2' },
      ],
    },
    {
      id: 'st_pantry', name: '실온', kind: 'pantry',
      compartments: [
        { id: 'c_p1', name: '선반', hint: 'top' },
        { id: 'c_p2', name: '바구니', hint: 'bottom' },
      ],
    },
  ];
}

/** 앱이 처음 켜질 때의 상태. 품목·장보기·덮어쓰기 모두 비어 있다 */
export function defaultHouseholds(): Household[] {
  return [
    {
      id: 'hh_home',
      name: '우리집',
      timezone: 'Asia/Seoul',
      showEater: true,
      members: [{ id: 'm_me', name: '나', role: 'owner' }],
      storages: defaultStorages(),
      items: [],
      shopping: [],
      overrides: {},
      recentPresetKeys: [],
      notifications: { morningAt: '07:30', perItem: false, quietHours: true, target: 'all' },
    },
  ];
}
