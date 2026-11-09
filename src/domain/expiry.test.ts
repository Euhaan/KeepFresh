import { describe, expect, it } from 'vitest';
import { addDays } from './dates';
import { computeExpiry } from './expiry';
import type { Item } from './types';

const TODAY = '2026-11-09';
const ctx = { today: TODAY, overrides: {} };
const base = (o: Partial<Item>): Item => ({
  id: 'x',
  presetKey: 'milk',
  qty: 1,
  storageId: 'st_fridge',
  compartmentId: 'c',
  status: 'cold',
  purchasedAt: TODAY,
  baseAt: null,
  openedAt: null,
  frozenAt: null,
  thawedAt: null,
  printedExpiry: null,
  manualExpiry: null,
  createdBy: 'm',
  createdAt: TODAY,
  ...o,
});

describe('기한 우선순위', () => {
  it('직접 입력한 기한이 가장 우선한다', () => {
    const e = computeExpiry(base({ manualExpiry: addDays(TODAY, 2), printedExpiry: addDays(TODAY, 10) }), ctx);
    expect(e.basis).toBe('직접');
    expect(e.days).toBe(2);
  });
  it('표기 기한과 개봉 후 기한 중 더 이른 것을 쓴다', () => {
    // 우유: 개봉 후 7일. 6일 전 개봉 → 내일. 표기는 10일 뒤
    const e = computeExpiry(base({ openedAt: addDays(TODAY, -6), printedExpiry: addDays(TODAY, 10) }), ctx);
    expect(e.basis).toBe('개봉');
    expect(e.days).toBe(1);
  });
  it('표기 기한이 없으면 기준일 > 구매일 순으로 통상 일수를 더한다', () => {
    // 계란 45일, 산란일 8일 전
    const e = computeExpiry(base({ presetKey: 'egg', baseAt: addDays(TODAY, -8), purchasedAt: addDays(TODAY, -6) }), ctx);
    expect(e.basis).toBe('통상');
    expect(e.days).toBe(37);
  });
  it('가정 덮어쓰기가 공용 사전보다 우선한다', () => {
    const e = computeExpiry(base({ presetKey: 'egg', baseAt: addDays(TODAY, -8) }), { today: TODAY, overrides: { egg: { fridgeDays: 30 } } });
    expect(e.days).toBe(22);
  });
  it('냉동 품목은 냉동 시작일 기준으로 냉동 일수를 쓴다', () => {
    const e = computeExpiry(base({ presetKey: 'chicken', status: 'frozen', frozenAt: addDays(TODAY, -20), printedExpiry: addDays(TODAY, -5) }), ctx);
    expect(e.basis).toBe('냉동 통상');
    expect(e.cls).toBe('frozen');
    expect(e.days).toBe(160);
  });
  it('해동된 품목은 해동일 + 1일', () => {
    const e = computeExpiry(base({ presetKey: 'chicken', status: 'thawed', thawedAt: TODAY, frozenAt: addDays(TODAY, -20) }), ctx);
    expect(e.basis).toBe('해동');
    expect(e.days).toBe(1);
    expect(e.cls).toBe('soon');
  });
  it('기한 관리 안 함 품목은 집계에서 빠진다', () => {
    const e = computeExpiry(base({ presetKey: 'soy' }), ctx);
    expect(e.cls).toBe('none');
    expect(e.days).toBeNull();
  });
  it('구매일도 기준일도 없으면 등록일 기준으로 폴백하고 그렇게 표기한다', () => {
    const e = computeExpiry(base({ presetKey: 'tofu', purchasedAt: null, createdAt: addDays(TODAY, -2) }), ctx);
    expect(e.basis).toBe('등록일 기준');
    expect(e.days).toBe(5);
  });
  it('지남, D-day, 3일 이내, 신선을 구분한다', () => {
    expect(computeExpiry(base({ manualExpiry: addDays(TODAY, -2) }), ctx).label).toBe('D+2 지남');
    expect(computeExpiry(base({ manualExpiry: TODAY }), ctx).label).toBe('D-day');
    expect(computeExpiry(base({ manualExpiry: addDays(TODAY, 3) }), ctx).cls).toBe('soon');
    expect(computeExpiry(base({ manualExpiry: addDays(TODAY, 4) }), ctx).cls).toBe('fresh');
  });
});
