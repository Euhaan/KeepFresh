import { describe, expect, it } from 'vitest';
import { DISHES, matchDishes } from './dishes';
import { PRESET_MAP } from './presets';
import { seedHouseholds } from './seed';

const TODAY = '2026-11-09';

describe('만들 수 있는 요리', () => {
  it('모든 요리 재료가 식품 사전에 있다', () => {
    for (const d of DISHES) for (const i of d.ingredients) expect(PRESET_MAP[i.key], `${d.name}의 ${i.key}`).toBeDefined();
  });
  it('필수 재료가 다 있으면 ready, 하나 부족하면 almost로 구분한다', () => {
    const [h] = seedHouseholds(TODAY);
    const res = matchDishes(h, { today: TODAY, overrides: h.overrides });
    const kimchi = res.find((m) => m.dish.id === 'kimchi-jjigae')!;
    expect(kimchi.readiness).toBe('ready');
    const tteok = res.find((m) => m.dish.id === 'tteokbokki')!;
    expect(tteok.readiness).toBe('almost'); // 떡국떡만 없음
  });
  it('임박 재료를 쓰는 요리가 위로 온다', () => {
    const [h] = seedHouseholds(TODAY);
    const res = matchDishes(h, { today: TODAY, overrides: h.overrides });
    expect(res[0].urgentCount).toBeGreaterThan(0);
  });
  it('보유 재료가 하나도 없는 요리는 제외된다', () => {
    const [, solo] = seedHouseholds(TODAY);
    const res = matchDishes(solo, { today: TODAY, overrides: {} });
    expect(res.every((m) => m.have.length > 0)).toBe(true);
    expect(res.some((m) => m.dish.id === 'salmon-steak')).toBe(false);
  });
});
