import { computeExpiry, type ExpiryContext } from './expiry';
import { PRESET_MAP } from './presets';
import type { Household, Item } from './types';

/**
 * 레시피 추천은 외부 호출 없이 기기 안에서 계산한다.
 * 점수 = 보유 재료 비율 + 임박 재료 가중치 - 부족 재료 벌점.
 * 임박한 재료를 쓰는 요리가 위로 올라오게 해서 버리는 것을 줄이는 것이 목적이다.
 * 분량은 모두 1인분 기준이고 화면에서 인분 수를 곱한다.
 */
export interface RecipeIngredient {
  key: string;
  /** 1인분 분량 */
  amount: number;
  unit: string;
  optional?: boolean;
}

export interface RecipeStep {
  text: string;
  /** 이 단계에 걸리는 시간(분). 기다리는 시간 포함 */
  minutes?: number;
}

export interface Recipe {
  id: string;
  name: string;
  /** 단계 시간 합계 */
  minutes: number;
  tags: string[];
  ingredients: RecipeIngredient[];
  /** 소금, 후추처럼 집에 늘 있다고 가정하는 것. 매칭에 쓰지 않는다 */
  staples: string[];
  steps: RecipeStep[];
}

const I = (key: string, amount: number, unit: string, optional = false): RecipeIngredient => ({ key, amount, unit, optional });
const S = (text: string, minutes?: number): RecipeStep => ({ text, minutes });
const R = (id: string, name: string, tags: string[], ingredients: RecipeIngredient[], staples: string[], steps: RecipeStep[]): Recipe => ({
  id,
  name,
  minutes: steps.reduce((n, s) => n + (s.minutes ?? 0), 0),
  tags,
  ingredients,
  staples,
  steps,
});

export const RECIPES: Recipe[] = [
  R('kimchi-jjigae', '김치찌개', ['국·찌개', '한식'], [I('kimchi', 150, 'g'), I('pork', 100, 'g'), I('tofu', 0.5, '모'), I('greenonion', 0.3, '대'), I('onion', 0.25, '개', true)], ['고춧가루 1작은술', '물 400ml'],
    [S('돼지고기를 기름 없이 볶아 겉을 익힌다.', 3), S('김치를 넣고 함께 볶는다.', 3), S('물을 붓고 중불에서 끓인다.', 15), S('두부와 대파를 넣고 더 끓인다.', 5)]),
  R('kimchi-bokkeumbap', '김치볶음밥', ['밥', '한식', '한 그릇'], [I('kimchi', 100, 'g'), I('rice', 1, '공기'), I('egg', 1, '개'), I('greenonion', 0.3, '대'), I('spam', 50, 'g', true)], ['식용유 1큰술', '참기름 약간'],
    [S('김치를 잘게 썰어 기름에 볶는다.', 2), S('밥을 넣고 고루 섞어 볶는다.', 3), S('계란 프라이를 부쳐 올리고 대파를 뿌린다.', 2)]),
  R('doenjang-jjigae', '된장찌개', ['국·찌개', '한식'], [I('doenjang', 1, '큰술'), I('tofu', 0.5, '모'), I('zucchini', 0.25, '개'), I('potato', 0.5, '개'), I('onion', 0.25, '개'), I('greenonion', 0.3, '대'), I('mushroom', 30, 'g', true), I('chili', 0.5, '개', true)], ['멸치육수 또는 물 350ml'],
    [S('물에 된장을 풀고 감자부터 끓인다.', 5), S('애호박과 양파를 넣고 끓인다.', 7), S('두부와 고추를 넣고 마저 끓인다.', 3)]),
  R('gyeran-mari', '계란말이', ['반찬', '한식'], [I('egg', 2, '개'), I('greenonion', 0.2, '대'), I('carrot', 0.1, '개', true)], ['소금 한 꼬집', '식용유 1큰술'],
    [S('계란을 풀고 다진 채소와 소금을 섞는다.', 1), S('약불에 얇게 부어 말아가며 익힌다.', 5), S('한 김 식혀 1.5cm로 썬다.', 2)]),
  R('egg-fried-rice', '계란볶음밥', ['밥', '한 그릇'], [I('rice', 1, '공기'), I('egg', 1, '개'), I('greenonion', 0.3, '대'), I('onion', 0.25, '개'), I('carrot', 0.1, '개', true)], ['식용유 1큰술', '간장 1작은술'],
    [S('파와 양파를 기름에 볶아 향을 낸다.', 2), S('계란을 스크램블하고 밥을 넣어 볶는다.', 3), S('간장을 팬 가장자리에 둘러 마무리한다.', 1)]),
  R('jeyuk', '제육볶음', ['메인', '한식'], [I('pork', 150, 'g'), I('gochujang', 1, '큰술'), I('onion', 0.5, '개'), I('greenonion', 0.5, '대'), I('garlic', 0.5, '큰술')], ['설탕 1작은술', '간장 1작은술', '고춧가루 1작은술'],
    [S('고추장 양념에 고기를 버무려 재운다.', 10), S('센 불에 고기를 볶다가 양파를 넣는다.', 6), S('대파를 넣고 1분 더 볶는다.', 1)]),
  R('bulgogi', '불고기', ['메인', '한식'], [I('beef', 150, 'g'), I('onion', 0.5, '개'), I('greenonion', 0.3, '대'), I('soy', 1.5, '큰술'), I('garlic', 0.5, '큰술'), I('mushroom', 30, 'g', true)], ['설탕 1작은술', '참기름 1작은술', '후추'],
    [S('간장 양념에 소고기를 재운다.', 20), S('양파, 버섯과 함께 센 불에 볶는다.', 7), S('대파를 올려 마무리한다.', 1)]),
  R('dakbokkeumtang', '닭볶음탕', ['메인', '한식'], [I('chicken', 300, 'g'), I('potato', 1, '개'), I('carrot', 0.5, '개'), I('onion', 0.5, '개'), I('gochujang', 1, '큰술'), I('greenonion', 0.5, '대')], ['간장 1큰술', '설탕 1작은술', '고춧가루 1큰술', '물 500ml'],
    [S('닭을 끓는 물에 데쳐 불순물을 뺀다.', 3), S('양념과 감자, 당근을 넣고 끓인다.', 25), S('양파와 대파를 넣고 졸인다.', 10)]),
  R('tofu-jorim', '두부조림', ['반찬', '한식'], [I('tofu', 0.5, '모'), I('soy', 1, '큰술'), I('greenonion', 0.2, '대'), I('chili', 0.5, '개', true)], ['고춧가루 1작은술', '설탕 반 작은술', '식용유'],
    [S('두부를 1.5cm로 썰어 노릇하게 굽는다.', 6), S('양념장을 끼얹고 약불에 졸인다.', 5), S('대파를 뿌린다.')]),
  R('kongnamul-guk', '콩나물국', ['국·찌개', '한식', '해장'], [I('beansprout', 100, 'g'), I('greenonion', 0.3, '대'), I('garlic', 0.5, '작은술')], ['소금', '새우젓 반 작은술', '물 400ml'],
    [S('물에 콩나물과 마늘을 넣고 뚜껑을 덮어 끓인다.', 7), S('소금으로 간하고 대파를 넣는다.', 1)]),
  R('sigeumchi-namul', '시금치나물', ['반찬', '한식'], [I('spinach', 100, 'g'), I('garlic', 0.5, '작은술'), I('soy', 0.5, '큰술')], ['참기름 1작은술', '깨'],
    [S('시금치를 30초 데쳐 찬물에 헹군다.', 1), S('물기를 짜고 양념에 무친다.', 2)]),
  R('hobak-bokkeum', '애호박볶음', ['반찬', '한식'], [I('zucchini', 0.5, '개'), I('onion', 0.25, '개'), I('greenonion', 0.2, '대')], ['새우젓 또는 소금', '식용유'],
    [S('애호박을 반달 모양으로 썬다.', 3), S('양파와 함께 볶다가 간한다.', 5)]),
  R('gamja-bokkeum', '감자볶음', ['반찬', '한식'], [I('potato', 1, '개'), I('onion', 0.25, '개'), I('carrot', 0.1, '개', true)], ['소금', '식용유'],
    [S('감자를 채 썰어 물에 헹궈 전분을 뺀다.', 5), S('양파, 당근과 함께 볶아 소금 간을 한다.', 7)]),
  R('tuna-kimchi-jjigae', '참치김치찌개', ['국·찌개', '한식'], [I('tuna', 0.5, '캔'), I('kimchi', 150, 'g'), I('tofu', 0.5, '모'), I('greenonion', 0.3, '대')], ['고춧가루 1작은술', '물 400ml'],
    [S('김치를 볶다가 물을 붓고 끓인다.', 3), S('참치와 두부를 넣고 끓인다.', 10), S('대파로 마무리한다.', 1)]),
  R('spam-kimchi', '스팸김치볶음', ['반찬', '한 그릇'], [I('spam', 0.5, '캔'), I('kimchi', 120, 'g'), I('onion', 0.25, '개')], ['식용유', '설탕 반 작은술'],
    [S('스팸을 노릇하게 굽는다.', 3), S('김치와 양파를 넣고 볶는다.', 4)]),
  R('tteokbokki', '떡볶이', ['분식'], [I('ricecake', 150, 'g'), I('gochujang', 1, '큰술'), I('greenonion', 0.3, '대'), I('egg', 1, '개', true), I('cabbage', 50, 'g', true)], ['설탕 1큰술', '고춧가루 1작은술', '간장 1작은술', '물 300ml'],
    [S('물에 양념을 풀고 끓인다.', 3), S('떡과 양배추를 넣고 졸인다.', 10), S('삶은 계란과 대파를 올린다.', 1)]),
  R('mandu-guk', '만둣국', ['국·찌개', '한 그릇'], [I('dumpling', 6, '개'), I('egg', 1, '개'), I('greenonion', 0.3, '대'), I('ricecake', 50, 'g', true)], ['국간장 1작은술', '소금', '물 500ml'],
    [S('육수를 끓인다.', 5), S('만두를 넣고 떠오를 때까지 끓인다.', 6), S('계란을 풀어 넣고 대파로 마무리한다.', 1)]),
  R('ramen', '라면', ['면', '한 그릇'], [I('ramen', 1, '개'), I('egg', 1, '개'), I('greenonion', 0.2, '대'), I('kimchi', 50, 'g', true)], ['물 550ml'],
    [S('물을 끓인다.', 4), S('면과 스프를 넣고 끓인다.', 3), S('계란과 대파를 넣고 1분 더 끓인다.', 1)]),
  R('bacon-fried-rice', '베이컨볶음밥', ['밥', '한 그릇'], [I('bacon', 50, 'g'), I('rice', 1, '공기'), I('egg', 1, '개'), I('onion', 0.25, '개')], ['소금', '후추'],
    [S('베이컨을 바삭하게 굽는다.', 3), S('양파와 밥을 넣고 볶는다.', 3), S('계란을 섞어 마무리한다.', 1)]),
  R('tomato-egg', '토마토계란볶음', ['반찬', '중식'], [I('tomato', 1, '개'), I('egg', 2, '개'), I('greenonion', 0.2, '대')], ['소금', '설탕 반 작은술', '식용유'],
    [S('계란을 부드럽게 스크램블해 덜어 둔다.', 2), S('토마토를 볶다가 계란을 합친다.', 3)]),
  R('oi-muchim', '오이무침', ['반찬', '한식'], [I('cucumber', 1, '개'), I('gochujang', 0.5, '큰술'), I('garlic', 0.3, '작은술')], ['식초 1작은술', '설탕 1작은술', '깨'],
    [S('오이를 어슷하게 썬다.', 3), S('양념에 가볍게 무친다.', 2)]),
  R('salmon-steak', '연어 버터구이', ['메인', '양식'], [I('salmon', 150, 'g'), I('butter', 10, 'g'), I('onion', 0.25, '개', true)], ['소금', '후추'],
    [S('연어에 소금, 후추를 뿌려 둔다.', 2), S('버터에 양면을 3분씩 굽는다.', 6)]),
  R('godeungeo-gui', '고등어구이', ['메인', '한식'], [I('mackerel', 1, '마리')], ['소금', '식용유'],
    [S('고등어의 물기를 닦고 소금을 뿌린다.', 3), S('팬이나 에어프라이어에 노릇하게 굽는다.', 12)]),
  R('shrimp-fried-rice', '새우볶음밥', ['밥', '한 그릇'], [I('shrimp', 80, 'g'), I('rice', 1, '공기'), I('egg', 1, '개'), I('greenonion', 0.3, '대')], ['식용유', '소금', '굴소스 1작은술'],
    [S('새우를 먼저 볶아 덜어 둔다.', 2), S('계란과 밥을 볶고 새우를 합친다.', 4)]),
  R('mushroom-bokkeum', '버섯볶음', ['반찬'], [I('mushroom', 100, 'g'), I('onion', 0.25, '개'), I('greenonion', 0.2, '대'), I('soy', 0.5, '큰술')], ['식용유', '참기름'],
    [S('버섯을 찢어 센 불에 볶는다.', 4), S('양파와 간장을 넣고 마무리한다.', 1)]),
  R('cabbage-bokkeum', '양배추볶음', ['반찬'], [I('cabbage', 150, 'g'), I('onion', 0.25, '개'), I('bacon', 30, 'g', true)], ['소금', '굴소스 1작은술'],
    [S('양배추를 채 썬다.', 3), S('베이컨, 양파와 함께 볶는다.', 5)]),
  R('yogurt-bowl', '요거트 과일볼', ['간식', '아침'], [I('yogurt', 1, '개'), I('berry', 50, 'g'), I('banana', 0.5, '개', true), I('apple', 0.25, '개', true)], ['꿀 1작은술'],
    [S('요거트에 과일을 올리고 꿀을 두른다.', 2)]),
  R('janchi-guksu', '잔치국수', ['면', '한 그릇'], [I('noodle', 100, 'g'), I('egg', 1, '개'), I('greenonion', 0.3, '대'), I('zucchini', 0.25, '개', true)], ['멸치육수 500ml', '국간장 1작은술'],
    [S('육수를 끓인다.', 10), S('소면을 삶아 찬물에 헹군다.', 4), S('고명을 올리고 육수를 붓는다.', 2)]),
];

/** 1인분 분량 × 인분. 0.5 → ½ 같은 읽기 쉬운 표기 */
export function formatAmount(amount: number, servings: number, unit: string): string {
  const v = Math.round(amount * servings * 100) / 100;
  if (unit === 'g' || unit === 'ml') return `${Math.round(v / 5) * 5}${unit}`;
  const whole = Math.floor(v);
  const frac = Math.round((v - whole) * 4) / 4;
  const fracStr = frac === 0.25 ? '¼' : frac === 0.5 ? '½' : frac === 0.75 ? '¾' : '';
  const wholeStr = whole === 0 && fracStr ? '' : `${whole}`;
  if (!wholeStr && !fracStr) return `약간`;
  return `${wholeStr}${fracStr}${unit}`;
}

export interface RecipeMatch {
  recipe: Recipe;
  score: number;
  have: { key: string; name: string; item: Item; urgent: boolean; ingredient: RecipeIngredient }[];
  missing: { key: string; name: string; optional: boolean; ingredient: RecipeIngredient }[];
  /** 필수 재료 중 보유 비율 0..1 */
  coverage: number;
  urgentCount: number;
}

export function recommend(h: Household, ctx: ExpiryContext, limit = 10): RecipeMatch[] {
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

  const matches: RecipeMatch[] = RECIPES.map((recipe) => {
    const have: RecipeMatch['have'] = [];
    const missing: RecipeMatch['missing'] = [];
    for (const ing of recipe.ingredients) {
      const items = byKey.get(ing.key);
      const name = PRESET_MAP[ing.key]?.name ?? ing.key;
      if (items?.length) {
        // 임박한 것을 우선 사용
        const pick = [...items].sort((a, b) => (urgentOf(b) ? 1 : 0) - (urgentOf(a) ? 1 : 0))[0];
        have.push({ key: ing.key, name, item: pick, urgent: urgentOf(pick), ingredient: ing });
      } else missing.push({ key: ing.key, name, optional: !!ing.optional, ingredient: ing });
    }
    const required = recipe.ingredients.filter((i) => !i.optional).length || 1;
    const haveRequired = have.filter((x) => !x.ingredient.optional).length;
    const coverage = haveRequired / required;
    const urgentCount = have.filter((x) => x.urgent).length;
    const missingRequired = missing.filter((m) => !m.optional).length;
    const score = coverage * 100 + urgentCount * 25 - missingRequired * 15;
    return { recipe, score, have, missing, coverage, urgentCount };
  });

  return matches
    .filter((m) => m.have.length > 0)
    .sort((a, b) => b.score - a.score || a.recipe.minutes - b.recipe.minutes)
    .slice(0, limit);
}
