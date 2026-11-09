import { describe, expect, it } from 'vitest';
import * as A from './actions';
import { applyEvents, type KanEvent } from './events';
import { seedHouseholds } from './seed';

const TODAY = '2026-11-09';
let n = 0;
const env = (hid: string) => (body: A.ActionResult['events'][number], i: number): KanEvent => ({ ...body, id: `e${++n}_${i}`, householdId: hid, txn: 't', at: new Date().toISOString(), by: 'm_mom' });

function setup() {
  const [h] = seedHouseholds(TODAY);
  const ctx: A.ActionContext = { today: TODAY, overrides: h.overrides, household: h, me: 'm_mom', newId: () => `id${++n}` };
  return { h, ctx };
}

describe('이벤트 기반 상태', () => {
  it('두 사람이 동시에 먹어도 증감이 합산된다', () => {
    const { h, ctx } = setup();
    const egg = h.items.find((i) => i.presetKey === 'egg')!;
    const a = A.eat(egg, 'one', ctx);
    const b = A.eat(egg, 'one', ctx); // 같은 스냅샷에서 출발한 다른 기기의 동작
    const next = applyEvents(h, [...a.events, ...b.events].map(env(h.id)));
    expect(next.items.find((i) => i.id === egg.id)!.qty).toBe(egg.qty - 2);
  });
  it('다 먹으면 품목이 사라지고 장보기에 자동 추가되며, 되돌리면 둘 다 복구된다', () => {
    const { h, ctx } = setup();
    const milk = h.items.find((i) => i.presetKey === 'milk')!;
    const r = A.eat(milk, 'all', ctx);
    const after = applyEvents(h, r.events.map(env(h.id)));
    expect(after.items.some((i) => i.id === milk.id)).toBe(false);
    expect(after.shopping.filter((s) => s.presetKey === 'milk')).toHaveLength(1); // 시드에 이미 '우유'가 있어 중복 추가 안 됨
    const undone = applyEvents(after, r.inverse.map(env(h.id)));
    expect(undone.items.some((i) => i.id === milk.id)).toBe(true);
    expect(undone.shopping).toHaveLength(h.shopping.length);
  });
  it('1팩짜리 용량형의 절반 먹음은 수량 대신 절반 남음 표시가 된다', () => {
    const { h, ctx } = setup();
    const milk = h.items.find((i) => i.presetKey === 'milk')!;
    const after = applyEvents(h, A.eat(milk, 'half', ctx).events.map(env(h.id)));
    const m = after.items.find((i) => i.id === milk.id)!;
    expect(m.qty).toBe(1);
    expect(m.half).toBe(true);
  });
  it('냉동 이동은 상태와 냉동 시작일을 바꾸고 되돌리기가 원래 칸으로 복구한다', () => {
    const { h, ctx } = setup();
    const pork = h.items.find((i) => i.presetKey === 'pork')!;
    const r = A.freeze(pork, ctx);
    const after = applyEvents(h, r.events.map(env(h.id)));
    const p = after.items.find((i) => i.id === pork.id)!;
    expect(p.status).toBe('frozen');
    expect(p.frozenAt).toBe(TODAY);
    expect(p.storageId).toBe('st_freezer');
    const back = applyEvents(after, r.inverse.map(env(h.id)));
    expect(back.items.find((i) => i.id === pork.id)!.storageId).toBe(pork.storageId);
  });
  it('해동한 것을 재냉동하면 기한이 7일로 잡힌다', () => {
    const { h, ctx } = setup();
    const chicken = h.items.find((i) => i.presetKey === 'chicken')!;
    const thawed = applyEvents(h, A.thaw(chicken, ctx).events.map(env(h.id)));
    const c1 = thawed.items.find((i) => i.id === chicken.id)!;
    expect(c1.status).toBe('thawed');
    const refrozen = applyEvents(thawed, A.freeze(c1, { ...ctx, household: thawed }).events.map(env(h.id)));
    expect(refrozen.items.find((i) => i.id === chicken.id)!.manualExpiry).toBe('2026-11-16');
  });
  it('같은 보관소의 같은 품목은 중복으로 잡힌다', () => {
    const { h } = setup();
    expect(A.findDuplicate({ presetKey: 'egg', storageId: 'st_fridge' }, h)).toBeDefined();
    expect(A.findDuplicate({ presetKey: 'egg', storageId: 'st_freezer' }, h)).toBeUndefined();
  });
  it('다른 가정의 이벤트는 적용되지 않는다', () => {
    const [a, b] = seedHouseholds(TODAY);
    const ctx: A.ActionContext = { today: TODAY, overrides: {}, household: b, me: 'm_jiwoo', newId: () => `id${++n}` };
    const r = A.eat(b.items[0], 'all', ctx);
    const aAfter = applyEvents(a, r.events.map(env(b.id)));
    expect(aAfter).toEqual(a);
  });
  it('3일 넘게 지난 품목만 정리한다', () => {
    const { h, ctx } = setup();
    const r = A.clearStale(h, ctx);
    const removed = r.events.filter((e) => e.type === 'ITEM_REMOVE');
    expect(removed).toHaveLength(1); // 상추(D+4)만. 돼지고기(D+1)는 남는다
  });
});
