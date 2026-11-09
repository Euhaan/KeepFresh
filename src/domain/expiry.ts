import { addDays, daysBetween, parseDate } from './dates';
import { findPreset } from './presets';
import type { DateStr, Expiry, ExpiryBasis, Item, Preset, PresetOverride } from './types';

export interface ExpiryContext {
  today: DateStr;
  overrides: Record<string, PresetOverride>;
}

function daysOf(preset: Preset, ov: PresetOverride | undefined, field: 'fridgeDays' | 'freezerDays' | 'openedDays'): number | null {
  const v = ov?.[field];
  return v != null ? v : preset[field];
}

/** 품목의 기본값을 모르는 커스텀 품목용 가짜 사전 */
export function presetForItem(item: Pick<Item, 'presetKey' | 'customName'>): Preset {
  return (
    findPreset(item.presetKey) ?? {
      key: item.presetKey,
      name: item.customName ?? item.presetKey,
      cat: '기타',
      unit: '개',
      defaultQty: 1,
      qtyType: 'count',
      fridgeDays: 7,
      freezerDays: 90,
      openedDays: null,
      defaultStorage: 'fridge',
      hint: 'top',
    }
  );
}

/**
 * 기한 계산 우선순위.
 * 1. 직접 입력한 기한
 * 2. 해동된 품목은 해동일 + 1일
 * 3. 냉동 품목: 냉동 시작일 + 냉동 통상 일수 (냉동 전 표기 기한이 있고 냉동 시작일이 없으면 표기 기한)
 * 4. 냉장 품목: 표기 기한, 개봉일 + 개봉 후 일수 중 더 이른 날짜. 표기 기한이 없으면 기준일(산란일) > 구매일 > 등록일 순 폴백에 통상 일수를 더한다.
 */
export function computeExpiry(item: Item, ctx: ExpiryContext): Expiry {
  const preset = presetForItem(item);
  const ov = ctx.overrides[item.presetKey];
  if (preset.noExpiry) return { date: null, basis: '관리 안 함', cls: 'none', label: '관리 안 함', days: null };
  if (item.manualExpiry) return finish(item.manualExpiry, '직접', item, ctx.today);
  if (item.status === 'thawed' && item.thawedAt) return finish(addDays(item.thawedAt, 1), '해동', item, ctx.today);

  const cands: { date: DateStr; basis: ExpiryBasis }[] = [];
  if (item.status === 'frozen') {
    const fd = daysOf(preset, ov, 'freezerDays');
    const base = item.frozenAt ?? item.purchasedAt ?? item.createdAt;
    if (fd != null) cands.push({ date: addDays(base, fd), basis: '냉동 통상' });
    if (item.printedExpiry && !item.frozenAt) cands.push({ date: item.printedExpiry, basis: '표기' });
  } else {
    if (item.printedExpiry) cands.push({ date: item.printedExpiry, basis: '표기' });
    const od = daysOf(preset, ov, 'openedDays');
    if (item.openedAt && od != null) cands.push({ date: addDays(item.openedAt, od), basis: '개봉' });
    if (!item.printedExpiry) {
      const fd = daysOf(preset, ov, 'fridgeDays');
      const base = item.baseAt ?? item.purchasedAt ?? item.createdAt;
      const basis: ExpiryBasis = item.baseAt || item.purchasedAt ? '통상' : '등록일 기준';
      if (fd != null) cands.push({ date: addDays(base, fd), basis });
    }
  }
  if (!cands.length) return { date: null, basis: '기준 없음', cls: 'none', label: '기한 없음', days: null };
  cands.sort((a, b) => parseDate(a.date).getTime() - parseDate(b.date).getTime());
  return finish(cands[0].date, cands[0].basis, item, ctx.today);
}

function finish(date: DateStr, basis: ExpiryBasis, item: Item, today: DateStr): Expiry {
  const days = daysBetween(today, date);
  const frozen = item.status === 'frozen';
  if (days < 0) return { date, basis, cls: 'over', label: `D+${-days} 지남`, days };
  if (days === 0) return { date, basis, cls: 'soon', label: 'D-day', days };
  if (days <= 3) return { date, basis, cls: 'soon', label: `D-${days}`, days };
  return { date, basis, cls: frozen ? 'frozen' : 'fresh', label: `${frozen ? '냉동 ' : ''}D-${days}`, days };
}

export function isUrgent(e: Expiry): boolean {
  return e.days != null && e.days <= 3;
}
