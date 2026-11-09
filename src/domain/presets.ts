import type { Preset } from './types';

/**
 * 공용 식품 사전. 일수는 통상 보관기간의 예시 값이며, 출시 전에 식약처 소비기한 참고값과 대조해야 한다.
 * 가정은 overrides로 이 값을 덮어쓴다. 공용 값은 앱 업데이트로만 바뀐다.
 */
const P = (
  key: string,
  name: string,
  cat: string,
  unit: string,
  defaultQty: number,
  qtyType: 'count' | 'amount',
  fridgeDays: number | null,
  freezerDays: number | null,
  openedDays: number | null,
  defaultStorage: Preset['defaultStorage'],
  hint: string,
  extra: Partial<Preset> = {},
): Preset => ({ key, name, cat, unit, defaultQty, qtyType, fridgeDays, freezerDays, openedDays, defaultStorage, hint, ...extra });

export const PRESETS: Preset[] = [
  // 계란·유제품
  P('egg', '계란', '계란', '구', 30, 'count', 45, null, null, 'fridge', 'door', { baseLabel: '산란일', aliases: ['달걀'] }),
  P('milk', '우유', '유제품', '팩', 1, 'amount', 10, null, 7, 'fridge', 'door'),
  P('yogurt', '요거트', '유제품', '개', 4, 'count', 14, null, 3, 'fridge', 'top'),
  P('cheese', '슬라이스치즈', '유제품', '장', 10, 'count', 60, 180, 14, 'fridge', 'top', { aliases: ['치즈'] }),
  P('butter', '버터', '유제품', '개', 1, 'amount', 90, 365, 30, 'fridge', 'top'),
  P('tofu', '두부', '두부/콩', '모', 1, 'count', 7, null, 3, 'fridge', 'top'),
  // 육류·해산물
  P('pork', '돼지고기', '육류', 'g', 600, 'amount', 3, 90, null, 'fridge', 'middle', { aliases: ['삼겹살', '앞다리살', '목살'] }),
  P('beef', '소고기', '육류', 'g', 400, 'amount', 3, 120, null, 'fridge', 'middle', { aliases: ['불고기감', '국거리'] }),
  P('chicken', '닭고기', '육류', '팩', 1, 'count', 2, 180, null, 'fridge', 'middle', { aliases: ['닭가슴살', '닭다리'] }),
  P('bacon', '베이컨', '육류', '팩', 1, 'amount', 7, 30, 5, 'fridge', 'middle'),
  P('spam', '스팸', '가공육', '캔', 1, 'amount', 365, null, 3, 'pantry', 'door', { aliases: ['햄'] }),
  P('sausage', '소시지', '가공육', '팩', 1, 'amount', 14, 60, 5, 'fridge', 'middle', { aliases: ['비엔나'] }),
  P('salmon', '연어', '생선', '팩', 1, 'count', 2, 60, null, 'fridge', 'middle'),
  P('mackerel', '고등어', '생선', '마리', 2, 'count', 2, 60, null, 'fridge', 'middle'),
  P('tuna', '참치캔', '통조림', '캔', 2, 'count', 730, null, 2, 'pantry', 'door'),
  P('shrimp', '새우', '해산물', 'g', 300, 'amount', 1, 90, null, 'freezer', 'frz'),
  // 채소·과일
  P('lettuce', '상추', '채소', '봉', 1, 'amount', 5, null, null, 'fridge', 'bottom'),
  P('onion', '양파', '채소', '개', 5, 'count', 30, null, null, 'fridge', 'bottom'),
  P('greenonion', '대파', '채소', '단', 1, 'amount', 10, 60, null, 'fridge', 'bottom', { aliases: ['파'] }),
  P('garlic', '다진마늘', '채소', '통', 1, 'amount', 14, 180, null, 'fridge', 'door', { aliases: ['마늘'] }),
  P('carrot', '당근', '채소', '개', 3, 'count', 21, null, null, 'fridge', 'bottom'),
  P('potato', '감자', '채소', '개', 5, 'count', 21, null, null, 'pantry', 'bottom'),
  P('zucchini', '애호박', '채소', '개', 1, 'count', 7, null, null, 'fridge', 'bottom', { aliases: ['호박'] }),
  P('mushroom', '버섯', '채소', '팩', 1, 'amount', 5, 30, null, 'fridge', 'bottom', { aliases: ['느타리', '팽이', '표고'] }),
  P('cabbage', '양배추', '채소', '통', 1, 'amount', 14, null, null, 'fridge', 'bottom'),
  P('beansprout', '콩나물', '채소', '봉', 1, 'amount', 3, null, null, 'fridge', 'bottom'),
  P('spinach', '시금치', '채소', '단', 1, 'amount', 4, 30, null, 'fridge', 'bottom'),
  P('chili', '청양고추', '채소', '봉', 1, 'amount', 10, 60, null, 'fridge', 'bottom', { aliases: ['고추'] }),
  P('cucumber', '오이', '채소', '개', 3, 'count', 7, null, null, 'fridge', 'bottom'),
  P('tomato', '토마토', '채소', '개', 4, 'count', 7, null, null, 'fridge', 'bottom'),
  P('apple', '사과', '과일', '개', 6, 'count', 30, null, null, 'fridge', 'bottom'),
  P('berry', '블루베리', '과일', '팩', 1, 'amount', 5, 180, null, 'fridge', 'bottom'),
  P('banana', '바나나', '과일', '송이', 1, 'amount', 5, 60, null, 'pantry', 'bottom'),
  // 김치·반찬
  P('kimchi', '배추김치', '김치', '통', 1, 'amount', 90, null, null, 'kimchi', 'kim', { aliases: ['김치', '신김치'] }),
  P('anchovy', '멸치볶음', '반찬', '통', 1, 'amount', 7, 30, null, 'fridge', 'top'),
  P('eggroll', '계란말이', '반찬', '통', 1, 'amount', 3, null, null, 'fridge', 'top'),
  // 곡물·면·냉동
  P('rice', '냉동밥', '곡물', '개', 6, 'count', 2, 30, null, 'freezer', 'frz', { aliases: ['밥'] }),
  P('instantrice', '즉석밥', '곡물', '개', 6, 'count', 365, null, null, 'pantry', 'top', { aliases: ['밥'] }),
  P('ricecake', '떡국떡', '곡물', '봉', 1, 'amount', 7, 90, null, 'fridge', 'top', { aliases: ['떡', '떡볶이떡'] }),
  P('noodle', '소면', '면', '봉', 1, 'amount', 365, null, 90, 'pantry', 'door', { aliases: ['국수'] }),
  P('ramen', '라면', '면', '개', 5, 'count', 180, null, null, 'pantry', 'door'),
  P('dumpling', '만두', '냉동식품', '봉', 1, 'amount', 3, 270, null, 'freezer', 'frz'),
  P('icecream', '아이스크림', '냉동식품', '개', 4, 'count', null, 180, null, 'freezer', 'frz'),
  P('flour', '밀가루', '가루', '봉', 1, 'amount', 365, null, 180, 'pantry', 'door', { aliases: ['부침가루'] }),
  // 소스·장류·음료
  P('ketchup', '케첩', '소스', '개', 1, 'amount', 365, null, 180, 'fridge', 'door'),
  P('mayo', '마요네즈', '소스', '개', 1, 'amount', 365, null, 60, 'fridge', 'door'),
  P('gochujang', '고추장', '장류', '통', 1, 'amount', 365, null, 365, 'fridge', 'door'),
  P('doenjang', '된장', '장류', '통', 1, 'amount', 365, null, 365, 'fridge', 'door'),
  P('soy', '간장', '장류', '병', 1, 'amount', null, null, null, 'fridge', 'door', { noExpiry: true }),
  P('oil', '식용유', '기름', '병', 1, 'amount', null, null, null, 'pantry', 'door', { noExpiry: true }),
  P('cola', '콜라', '음료', '캔', 6, 'count', 365, null, 1, 'fridge', 'door'),
];

export const PRESET_MAP: Record<string, Preset> = Object.fromEntries(PRESETS.map((p) => [p.key, p]));

export function findPreset(key: string): Preset | undefined {
  return PRESET_MAP[key];
}

/** 이름·분류·별칭으로 사전 검색 (두 글자 자동완성용) */
export function searchPresets(q: string, limit = 6): Preset[] {
  const s = q.trim();
  if (!s) return [];
  const score = (p: Preset) => {
    if (p.name === s) return 0;
    if (p.name.startsWith(s)) return 1;
    if (p.name.includes(s)) return 2;
    if (p.aliases?.some((a) => a.includes(s))) return 3;
    if (p.cat.includes(s)) return 4;
    return 99;
  };
  return PRESETS.map((p) => [score(p), p] as const)
    .filter(([sc]) => sc < 99)
    .sort((a, b) => a[0] - b[0])
    .slice(0, limit)
    .map(([, p]) => p);
}

/** 레시피 재료명 → 사전 키. 이름, 별칭을 모두 본다 */
export function presetKeyForIngredient(name: string): string | undefined {
  const exact = PRESETS.find((p) => p.name === name || p.key === name);
  if (exact) return exact.key;
  const alias = PRESETS.find((p) => p.aliases?.includes(name));
  if (alias) return alias.key;
  const partial = PRESETS.find((p) => name.includes(p.name) || p.name.includes(name));
  return partial?.key;
}
