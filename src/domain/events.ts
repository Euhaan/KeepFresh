import type { Household, Item, NotificationSettings, PresetOverride, ShoppingItem, Storage } from './types';

/**
 * 모든 변경은 이벤트다. 수량은 절대값이 아니라 증감(delta)으로 기록하므로
 * 두 사람이 동시에 먹어도 합산되고, 오프라인에서 쌓인 이벤트도 순서대로 재생하면 같은 결과가 된다.
 */
export type EventBody =
  | { type: 'ITEM_ADD'; item: Item }
  | { type: 'ITEM_QTY'; itemId: string; delta: number }
  | { type: 'ITEM_PATCH'; itemId: string; patch: Partial<Item> }
  | { type: 'ITEM_REMOVE'; itemId: string; reason: 'eaten' | 'wasted' | 'undo' | 'merged' }
  | { type: 'ITEM_RESTORE'; item: Item }
  | { type: 'SHOP_ADD'; item: ShoppingItem }
  | { type: 'SHOP_PATCH'; shopId: string; patch: Partial<ShoppingItem> }
  | { type: 'SHOP_REMOVE'; shopId: string }
  | { type: 'SHOP_RESTORE'; item: ShoppingItem }
  | { type: 'OVERRIDE_SET'; presetKey: string; override: PresetOverride | null }
  | { type: 'SETTINGS_PATCH'; patch: Partial<{ name: string; showEater: boolean; notifications: NotificationSettings }> }
  | { type: 'RECENT_TOUCH'; presetKey: string }
  | { type: 'STORAGES_SET'; storages: Storage[] };

export type KanEvent = EventBody & {
  id: string;
  householdId: string;
  /** 같은 사용자 동작으로 묶인 이벤트의 트랜잭션 ID. 되돌리기 단위 */
  txn: string;
  at: string;
  by: string;
};

export function applyEvent(h: Household, ev: KanEvent): Household {
  if (ev.householdId !== h.id) return h;
  switch (ev.type) {
    case 'ITEM_ADD':
      if (h.items.some((i) => i.id === ev.item.id)) return h;
      return { ...h, items: [ev.item, ...h.items] };
    case 'ITEM_QTY':
      return {
        ...h,
        items: h.items.map((i) => (i.id === ev.itemId ? { ...i, qty: Math.max(0, round(i.qty + ev.delta)) } : i)),
      };
    case 'ITEM_PATCH':
      return { ...h, items: h.items.map((i) => (i.id === ev.itemId ? { ...i, ...ev.patch } : i)) };
    case 'ITEM_REMOVE':
      return { ...h, items: h.items.filter((i) => i.id !== ev.itemId) };
    case 'ITEM_RESTORE':
      if (h.items.some((i) => i.id === ev.item.id)) return h;
      return { ...h, items: [ev.item, ...h.items] };
    case 'SHOP_ADD':
      if (h.shopping.some((s) => s.id === ev.item.id)) return h;
      return { ...h, shopping: [...h.shopping, ev.item] };
    case 'SHOP_PATCH':
      return { ...h, shopping: h.shopping.map((s) => (s.id === ev.shopId ? { ...s, ...ev.patch } : s)) };
    case 'SHOP_REMOVE':
      return { ...h, shopping: h.shopping.filter((s) => s.id !== ev.shopId) };
    case 'SHOP_RESTORE':
      if (h.shopping.some((s) => s.id === ev.item.id)) return h;
      return { ...h, shopping: [...h.shopping, ev.item] };
    case 'OVERRIDE_SET': {
      const overrides = { ...h.overrides };
      if (ev.override) overrides[ev.presetKey] = ev.override;
      else delete overrides[ev.presetKey];
      return { ...h, overrides };
    }
    case 'SETTINGS_PATCH':
      return { ...h, ...ev.patch };
    case 'RECENT_TOUCH':
      return { ...h, recentPresetKeys: [ev.presetKey, ...h.recentPresetKeys.filter((k) => k !== ev.presetKey)].slice(0, 3) };
    case 'STORAGES_SET':
      return { ...h, storages: ev.storages };
  }
}

export function applyEvents(h: Household, events: KanEvent[]): Household {
  return events.reduce(applyEvent, h);
}

/** 부동소수 잔재 제거 (0.1 + 0.2 문제) */
function round(n: number): number {
  return Math.round(n * 100) / 100;
}
