import { addDays } from './dates';
import type { DateStr, Household, Item, Storage } from './types';

/** 데모용 초기 데이터. 실제 서비스에서는 '가정 만들기' 온보딩이 이 역할을 한다 */
export function seedHouseholds(today: DateStr): Household[] {
  const ago = (n: number) => addDays(today, -n);
  const ahead = (n: number) => addDays(today, n);
  let n = 0;
  const id = (prefix: string) => `${prefix}_${(++n).toString(36)}`;

  const item = (presetKey: string, o: Partial<Item> & Pick<Item, 'qty' | 'storageId' | 'compartmentId'>): Item => ({
    id: id('it'),
    presetKey,
    status: 'cold',
    purchasedAt: today,
    baseAt: null,
    openedAt: null,
    frozenAt: null,
    thawedAt: null,
    printedExpiry: null,
    manualExpiry: null,
    createdBy: 'm_mom',
    createdAt: today,
    ...o,
  });

  const storagesA: Storage[] = [
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

  const A: Household = {
    id: 'hh_kim',
    name: '김씨네',
    timezone: 'Asia/Seoul',
    showEater: true,
    members: [
      { id: 'm_dad', name: '아빠', role: 'owner' },
      { id: 'm_mom', name: '엄마', role: 'member' },
      { id: 'm_jiwoo', name: '지우', role: 'member' },
      { id: 'm_minjun', name: '민준', role: 'viewer' },
    ],
    storages: storagesA,
    items: [
      item('milk', { qty: 1, storageId: 'st_fridge', compartmentId: 'c_door', purchasedAt: ago(8), printedExpiry: ahead(0), openedAt: ago(6), createdBy: 'm_dad' }),
      item('tofu', { qty: 1, storageId: 'st_fridge', compartmentId: 'c_top', purchasedAt: ago(5), printedExpiry: ahead(1) }),
      item('eggroll', { qty: 1, storageId: 'st_fridge', compartmentId: 'c_top', purchasedAt: ago(2) }),
      item('yogurt', { qty: 3, storageId: 'st_fridge', compartmentId: 'c_top', purchasedAt: ago(12), printedExpiry: ahead(2), createdBy: 'm_jiwoo' }),
      item('carrot', { qty: 2, storageId: 'st_fridge', compartmentId: 'c_bot', purchasedAt: ago(18) }),
      item('pork', { qty: 600, storageId: 'st_fridge', compartmentId: 'c_mid', purchasedAt: ago(4), createdBy: 'm_dad' }),
      item('lettuce', { qty: 1, storageId: 'st_fridge', compartmentId: 'c_bot', purchasedAt: ago(9) }),
      item('egg', { qty: 14, storageId: 'st_fridge', compartmentId: 'c_door', purchasedAt: ago(6), baseAt: ago(8) }),
      item('onion', { qty: 4, storageId: 'st_fridge', compartmentId: 'c_bot', purchasedAt: ago(9) }),
      item('greenonion', { qty: 1, storageId: 'st_fridge', compartmentId: 'c_bot', purchasedAt: ago(3) }),
      item('garlic', { qty: 1, storageId: 'st_fridge', compartmentId: 'c_door', purchasedAt: ago(5) }),
      item('apple', { qty: 5, storageId: 'st_fridge', compartmentId: 'c_bot', purchasedAt: ago(6), createdBy: 'm_minjun' }),
      item('cheese', { qty: 8, storageId: 'st_fridge', compartmentId: 'c_top', purchasedAt: ago(20), printedExpiry: ahead(40), openedAt: ago(4) }),
      item('anchovy', { qty: 1, storageId: 'st_fridge', compartmentId: 'c_top', purchasedAt: ago(2) }),
      item('ketchup', { qty: 1, storageId: 'st_fridge', compartmentId: 'c_door', purchasedAt: ago(120), printedExpiry: ahead(200), openedAt: ago(100) }),
      item('gochujang', { qty: 1, storageId: 'st_fridge', compartmentId: 'c_door', purchasedAt: ago(60), openedAt: ago(60) }),
      item('doenjang', { qty: 1, storageId: 'st_fridge', compartmentId: 'c_door', purchasedAt: ago(60), openedAt: ago(60) }),
      item('soy', { qty: 1, storageId: 'st_fridge', compartmentId: 'c_door', purchasedAt: ago(200) }),
      item('cola', { qty: 4, storageId: 'st_fridge', compartmentId: 'c_door', purchasedAt: ago(10), printedExpiry: ahead(300) }),
      item('chicken', { qty: 2, storageId: 'st_freezer', compartmentId: 'c_z1', purchasedAt: ago(21), frozenAt: ago(20), status: 'frozen', createdBy: 'm_dad' }),
      item('rice', { qty: 5, storageId: 'st_freezer', compartmentId: 'c_z1', purchasedAt: ago(10), frozenAt: ago(10), status: 'frozen' }),
      item('dumpling', { qty: 1, storageId: 'st_freezer', compartmentId: 'c_z2', purchasedAt: ago(30), frozenAt: ago(30), status: 'frozen', printedExpiry: ahead(200) }),
      item('icecream', { qty: 3, storageId: 'st_freezer', compartmentId: 'c_zd', purchasedAt: ago(15), frozenAt: ago(15), status: 'frozen', createdBy: 'm_jiwoo' }),
      item('berry', { qty: 1, storageId: 'st_freezer', compartmentId: 'c_z2', purchasedAt: ago(40), frozenAt: ago(39), status: 'frozen' }),
      item('kimchi', { qty: 1, storageId: 'st_kimchi', compartmentId: 'c_k1', purchasedAt: ago(25) }),
      item('kimchi', { qty: 1, storageId: 'st_kimchi', compartmentId: 'c_k2', purchasedAt: ago(70), manualExpiry: ahead(5), createdBy: 'm_dad' }),
      item('potato', { qty: 4, storageId: 'st_pantry', compartmentId: 'c_p1', purchasedAt: ago(7) }),
      item('ramen', { qty: 3, storageId: 'st_pantry', compartmentId: 'c_p1', purchasedAt: ago(20) }),
      item('tuna', { qty: 2, storageId: 'st_pantry', compartmentId: 'c_p1', purchasedAt: ago(40) }),
    ],
    shopping: [
      { id: id('sh'), name: '두부', presetKey: 'tofu', checked: false, addedBy: 'm_mom', auto: false },
      { id: id('sh'), name: '상추', presetKey: 'lettuce', checked: false, addedBy: 'm_mom', auto: true },
      { id: id('sh'), name: '우유', presetKey: 'milk', checked: false, addedBy: 'm_jiwoo', auto: false },
    ],
    overrides: { egg: { fridgeDays: 45 } },
    recentPresetKeys: ['egg', 'milk', 'tofu'],
    notifications: { morningAt: '07:30', perItem: false, quietHours: true, target: 'all' },
  };

  const B: Household = {
    id: 'hh_solo',
    name: '자취방',
    timezone: 'Asia/Seoul',
    showEater: false,
    members: [{ id: 'm_jiwoo', name: '지우', role: 'owner' }],
    storages: [
      {
        id: 'st_fridge', name: '냉장실', kind: 'fridge',
        compartments: [
          { id: 'c_top', name: '위 칸', hint: 'top' },
          { id: 'c_mid', name: '중앙 칸', hint: 'middle' },
          { id: 'c_bot', name: '아래 칸', hint: 'bottom' },
          { id: 'c_door', name: '도어', hint: 'door', side: true },
        ],
      },
      { id: 'st_freezer', name: '냉동실', kind: 'freezer', compartments: [{ id: 'c_z1', name: '한 칸', hint: 'frz' }] },
    ],
    items: [
      item('milk', { qty: 1, storageId: 'st_fridge', compartmentId: 'c_door', purchasedAt: ago(3), printedExpiry: ahead(4), createdBy: 'm_jiwoo' }),
      item('egg', { qty: 10, storageId: 'st_fridge', compartmentId: 'c_door', purchasedAt: ago(2), createdBy: 'm_jiwoo' }),
      item('instantrice', { qty: 4, storageId: 'st_fridge', compartmentId: 'c_top', purchasedAt: ago(30), printedExpiry: ahead(150), createdBy: 'm_jiwoo' }),
      item('dumpling', { qty: 1, storageId: 'st_freezer', compartmentId: 'c_z1', purchasedAt: ago(12), frozenAt: ago(12), status: 'frozen', printedExpiry: ahead(240), createdBy: 'm_jiwoo' }),
      item('cola', { qty: 2, storageId: 'st_fridge', compartmentId: 'c_door', purchasedAt: ago(5), printedExpiry: ahead(280), createdBy: 'm_jiwoo' }),
      item('kimchi', { qty: 1, storageId: 'st_fridge', compartmentId: 'c_top', purchasedAt: ago(14), createdBy: 'm_jiwoo' }),
      item('ramen', { qty: 2, storageId: 'st_fridge', compartmentId: 'c_top', purchasedAt: ago(10), createdBy: 'm_jiwoo' }),
    ],
    shopping: [{ id: id('sh'), name: '계란', presetKey: 'egg', checked: false, addedBy: 'm_jiwoo', auto: false }],
    overrides: { egg: { fridgeDays: 30 } },
    recentPresetKeys: ['milk', 'egg', 'instantrice'],
    notifications: { morningAt: '08:30', perItem: false, quietHours: true, target: 'all' },
  };

  return [A, B];
}
