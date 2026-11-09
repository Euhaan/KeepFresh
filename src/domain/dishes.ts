import { computeExpiry, type ExpiryContext } from './expiry';
import { PRESET_MAP } from './presets';
import type { Household, Item } from './types';

/**
 * "지금 있는 재료로 만들 수 있는 요리" 목록. 레시피(분량·단계·시간)는 다루지 않는다.
 * 요리마다 재료 키만 가지며, 점수 = 필수 재료 보유 비율 + 임박 재료 가중치 - 부족 재료 벌점.
 */
export interface DishIngredient {
  key: string;
  optional?: boolean;
}

export interface Dish {
  id: string;
  name: string;
  tags: string[];
  ingredients: DishIngredient[];
}

const D = (id: string, name: string, tags: string[], ing: (string | [string, 'opt'])[]): Dish => ({
  id,
  name,
  tags,
  ingredients: ing.map((i) => (typeof i === 'string' ? { key: i } : { key: i[0], optional: true })),
});

export const DISHES: Dish[] = [
  D('kimchi-jjigae', '김치찌개', ['국·찌개'], ['kimchi', 'pork', 'tofu', 'greenonion', ['onion', 'opt']]),
  D('kimchi-bokkeumbap', '김치볶음밥', ['밥'], ['kimchi', 'rice', 'egg', 'greenonion', ['spam', 'opt']]),
  D('doenjang-jjigae', '된장찌개', ['국·찌개'], ['doenjang', 'tofu', 'zucchini', 'potato', 'onion', 'greenonion', ['mushroom', 'opt']]),
  D('gyeran-mari', '계란말이', ['반찬'], ['egg', 'greenonion', ['carrot', 'opt']]),
  D('egg-fried-rice', '계란볶음밥', ['밥'], ['rice', 'egg', 'greenonion', 'onion', ['carrot', 'opt']]),
  D('jeyuk', '제육볶음', ['메인'], ['pork', 'gochujang', 'onion', 'greenonion', 'garlic']),
  D('bulgogi', '불고기', ['메인'], ['beef', 'onion', 'greenonion', 'soy', 'garlic', ['mushroom', 'opt']]),
  D('dakbokkeumtang', '닭볶음탕', ['메인'], ['chicken', 'potato', 'carrot', 'onion', 'gochujang', 'greenonion']),
  D('tofu-jorim', '두부조림', ['반찬'], ['tofu', 'soy', 'greenonion', ['chili', 'opt']]),
  D('kongnamul-guk', '콩나물국', ['국·찌개'], ['beansprout', 'greenonion', 'garlic']),
  D('sigeumchi-namul', '시금치나물', ['반찬'], ['spinach', 'garlic', 'soy']),
  D('hobak-bokkeum', '애호박볶음', ['반찬'], ['zucchini', 'onion', 'greenonion']),
  D('gamja-bokkeum', '감자볶음', ['반찬'], ['potato', 'onion', ['carrot', 'opt']]),
  D('tuna-kimchi-jjigae', '참치김치찌개', ['국·찌개'], ['tuna', 'kimchi', 'tofu', 'greenonion']),
  D('spam-kimchi', '스팸김치볶음', ['반찬'], ['spam', 'kimchi', 'onion']),
  D('tteokbokki', '떡볶이', ['분식'], ['ricecake', 'gochujang', 'greenonion', ['egg', 'opt'], ['cabbage', 'opt']]),
  D('mandu-guk', '만둣국', ['국·찌개'], ['dumpling', 'egg', 'greenonion', ['ricecake', 'opt']]),
  D('ramen', '라면', ['면'], ['ramen', 'egg', 'greenonion', ['kimchi', 'opt']]),
  D('bacon-fried-rice', '베이컨볶음밥', ['밥'], ['bacon', 'rice', 'egg', 'onion']),
  D('tomato-egg', '토마토계란볶음', ['반찬'], ['tomato', 'egg', 'greenonion']),
  D('oi-muchim', '오이무침', ['반찬'], ['cucumber', 'gochujang', 'garlic']),
  D('salmon-steak', '연어 버터구이', ['메인'], ['salmon', 'butter', ['onion', 'opt']]),
  D('godeungeo-gui', '고등어구이', ['메인'], ['mackerel']),
  D('shrimp-fried-rice', '새우볶음밥', ['밥'], ['shrimp', 'rice', 'egg', 'greenonion']),
  D('mushroom-bokkeum', '버섯볶음', ['반찬'], ['mushroom', 'onion', 'greenonion', 'soy']),
  D('cabbage-bokkeum', '양배추볶음', ['반찬'], ['cabbage', 'onion', ['bacon', 'opt']]),
  D('yogurt-bowl', '요거트 과일볼', ['간식'], ['yogurt', 'berry', ['banana', 'opt'], ['apple', 'opt']]),
  D('janchi-guksu', '잔치국수', ['면'], ['noodle', 'egg', 'greenonion', ['zucchini', 'opt']]),
  D('gyeran-guk', '계란국', ['국·찌개'], ['egg', 'greenonion', ['onion', 'opt']]),
  D('gyeran-fry', '계란 프라이', ['간단'], ['egg']),
  D('apple-salad', '사과 샐러드', ['간식'], ['apple', 'lettuce', ['yogurt', 'opt']]),
  D('cheese-egg-toast', '치즈 스크램블', ['간단'], ['egg', 'cheese', ['butter', 'opt']]),
];

export type Readiness = 'ready' | 'almost' | 'partial';

export interface DishMatch {
  dish: Dish;
  score: number;
  readiness: Readiness;
  have: { key: string; name: string; item: Item; urgent: boolean; optional: boolean }[];
  missing: { key: string; name: string; optional: boolean }[];
  urgentCount: number;
}

export function matchDishes(h: Household, ctx: ExpiryContext): DishMatch[] {
  const byKey = new Map<string, Item[]>();
  for (const it of h.items) {
    if (it.qty <= 0) continue;
    const list = byKey.get(it.presetKey) ?? [];
    list.push(it);
    byKey.set(it.presetKey, list);
  }
  const urgentOf = (it: Item) => {
    const e = computeExpiry(it, ctx);
    return e.days != null && e.days <= 3;
  };

  return DISHES.map((dish) => {
    const have: DishMatch['have'] = [];
    const missing: DishMatch['missing'] = [];
    for (const ing of dish.ingredients) {
      const items = byKey.get(ing.key);
      const name = PRESET_MAP[ing.key]?.name ?? ing.key;
      if (items?.length) {
        const pick = [...items].sort((a, b) => (urgentOf(b) ? 1 : 0) - (urgentOf(a) ? 1 : 0))[0];
        have.push({ key: ing.key, name, item: pick, urgent: urgentOf(pick), optional: !!ing.optional });
      } else missing.push({ key: ing.key, name, optional: !!ing.optional });
    }
    const required = dish.ingredients.filter((i) => !i.optional).length || 1;
    const haveRequired = have.filter((x) => !x.optional).length;
    const missingRequired = missing.filter((m) => !m.optional).length;
    const urgentCount = have.filter((x) => x.urgent).length;
    const readiness: Readiness = missingRequired === 0 ? 'ready' : missingRequired === 1 ? 'almost' : 'partial';
    const score = (haveRequired / required) * 100 + urgentCount * 25 - missingRequired * 15;
    return { dish, score, readiness, have, missing, urgentCount };
  })
    .filter((m) => m.have.length > 0)
    .sort((a, b) => b.score - a.score || a.dish.name.localeCompare(b.dish.name, 'ko'));
}
