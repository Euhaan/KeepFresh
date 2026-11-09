import { describe, expect, it } from 'vitest';
import { PRESET_MAP } from './presets';
import { RECIPES, recommend } from './recipes';
import { seedHouseholds } from './seed';

const TODAY = '2026-11-09';

describe('레시피 추천', () => {
  it('모든 레시피 재료가 식품 사전에 있다', () => {
    for (const r of RECIPES) for (const i of r.ingredients) expect(PRESET_MAP[i.key], `${r.name}의 ${i.key}`).toBeDefined();
  });
  it('임박 재료를 쓰는 요리가 위로 온다', () => {
    const [h] = seedHouseholds(TODAY);
    const top = recommend(h, { today: TODAY, overrides: h.overrides }, 5);
    expect(top.length).toBeGreaterThan(0);
    expect(top[0].urgentCount).toBeGreaterThan(0);
    // 김씨네는 두부(D-1)·김치·돼지고기를 모두 가지고 있어 김치찌개가 상위권이어야 한다
    expect(top.slice(0, 3).map((m) => m.recipe.id)).toContain('kimchi-jjigae');
  });
  it('보유 재료가 하나도 없는 요리는 제외된다', () => {
    const [, solo] = seedHouseholds(TODAY);
    const res = recommend(solo, { today: TODAY, overrides: {} }, 50);
    expect(res.every((m) => m.have.length > 0)).toBe(true);
    expect(res.some((m) => m.recipe.id === 'salmon-steak')).toBe(false);
  });
  it('부족 재료를 필수와 선택으로 구분한다', () => {
    const [h] = seedHouseholds(TODAY);
    const r = recommend(h, { today: TODAY, overrides: {} }, 50).find((m) => m.recipe.id === 'tteokbokki')!;
    expect(r.missing.find((m) => m.key === 'ricecake')?.optional).toBe(false);
    expect(r.missing.find((m) => m.key === 'cabbage')?.optional).toBe(true);
  });
});
