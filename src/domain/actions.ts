import { addDays } from './dates';
import { computeExpiry, presetForItem, type ExpiryContext } from './expiry';
import type { EventBody } from './events';
import type { DateStr, Household, Item, ShoppingItem } from './types';

/**
 * 사용자 동작 → (적용할 이벤트, 되돌리기 이벤트, 안내 문구).
 * 되돌리기는 이벤트 삭제가 아니라 보상 이벤트로 처리한다. 이미 서버에 보낸 이벤트도 같은 방식으로 되돌릴 수 있다.
 */
export interface ActionResult {
  events: EventBody[];
  inverse: EventBody[];
  message: string;
}

export interface ActionContext extends ExpiryContext {
  household: Household;
  me: string;
  newId: () => string;
}

const name = (it: Item) => presetForItem(it).name;

function autoShop(it: Item, ctx: ActionContext): { events: EventBody[]; inverse: EventBody[] } {
  const exists = ctx.household.shopping.some((s) => s.presetKey === it.presetKey && !s.checked);
  if (exists) return { events: [], inverse: [] };
  const s: ShoppingItem = { id: ctx.newId(), name: name(it), presetKey: it.presetKey, checked: false, addedBy: ctx.me, auto: true };
  return { events: [{ type: 'SHOP_ADD', item: s }], inverse: [{ type: 'SHOP_REMOVE', shopId: s.id }] };
}

export type EatMode = 'one' | 'half' | 'all';

export function eat(it: Item, mode: EatMode, ctx: ActionContext): ActionResult {
  const p = presetForItem(it);
  let delta: number;
  if (mode === 'all') delta = -it.qty;
  else if (mode === 'half') {
    if (p.qtyType === 'amount' && p.unit !== 'g' && it.qty <= 1) {
      // 1팩짜리 용량형은 수량 대신 '절반 남음' 표시
      return {
        events: [{ type: 'ITEM_PATCH', itemId: it.id, patch: { half: true } }],
        inverse: [{ type: 'ITEM_PATCH', itemId: it.id, patch: { half: it.half ?? false } }],
        message: `${p.name}을(를) 절반 남음으로 표시했어요`,
      };
    }
    delta = -Math.floor(it.qty / 2);
  } else delta = -1;

  if (it.qty + delta <= 0) {
    const shop = autoShop(it, ctx);
    return {
      events: [{ type: 'ITEM_REMOVE', itemId: it.id, reason: 'eaten' }, ...shop.events],
      inverse: [{ type: 'ITEM_RESTORE', item: it }, ...shop.inverse],
      message: `${p.name}을(를) 다 먹었어요. 장보기에 추가됨`,
    };
  }
  return {
    events: [{ type: 'ITEM_QTY', itemId: it.id, delta }],
    inverse: [{ type: 'ITEM_QTY', itemId: it.id, delta: -delta }],
    message: `${p.name} ${-delta}${p.qtyType === 'count' ? p.unit : p.unit} 먹음으로 기록했어요`,
  };
}

export function waste(it: Item, ctx: ActionContext): ActionResult {
  const shop = autoShop(it, ctx);
  return {
    events: [{ type: 'ITEM_REMOVE', itemId: it.id, reason: 'wasted' }, ...shop.events],
    inverse: [{ type: 'ITEM_RESTORE', item: it }, ...shop.inverse],
    message: `${name(it)}을(를) 버림으로 기록했어요`,
  };
}

export function extend(it: Item, days: number, ctx: ActionContext): ActionResult {
  const e = computeExpiry(it, ctx);
  const base: DateStr = e.date ?? ctx.today;
  const to = addDays(base, days);
  return {
    events: [{ type: 'ITEM_PATCH', itemId: it.id, patch: { manualExpiry: to } }],
    inverse: [{ type: 'ITEM_PATCH', itemId: it.id, patch: { manualExpiry: it.manualExpiry } }],
    message: `${name(it)} 기한을 ${to.slice(5).replace('-', '.')}까지로 바꿨어요`,
  };
}

export function setManualExpiry(it: Item, to: DateStr | null): ActionResult {
  return {
    events: [{ type: 'ITEM_PATCH', itemId: it.id, patch: { manualExpiry: to } }],
    inverse: [{ type: 'ITEM_PATCH', itemId: it.id, patch: { manualExpiry: it.manualExpiry } }],
    message: to ? `${name(it)} 기한을 직접 정했어요` : `${name(it)} 기한을 자동 계산으로 되돌렸어요`,
  };
}

export function openIt(it: Item, ctx: ActionContext): ActionResult {
  return {
    events: [{ type: 'ITEM_PATCH', itemId: it.id, patch: { openedAt: ctx.today } }],
    inverse: [{ type: 'ITEM_PATCH', itemId: it.id, patch: { openedAt: it.openedAt } }],
    message: `${name(it)} 개봉일을 오늘로 기록했어요`,
  };
}

function prevOf(it: Item): Partial<Item> {
  return {
    storageId: it.storageId,
    compartmentId: it.compartmentId,
    status: it.status,
    frozenAt: it.frozenAt,
    thawedAt: it.thawedAt,
    manualExpiry: it.manualExpiry,
  };
}

/** 해동된 것을 다시 얼리면 기한을 7일로 짧게 잡는다. 호출 전에 UI가 경고를 띄운다 */
export function freeze(it: Item, ctx: ActionContext): ActionResult {
  const fz = ctx.household.storages.find((s) => s.kind === 'freezer');
  if (!fz) return { events: [], inverse: [], message: '냉동실이 없어요. 가족 탭에서 보관소를 추가하세요' };
  const refreeze = it.status === 'thawed';
  const patch: Partial<Item> = {
    storageId: fz.id,
    compartmentId: fz.compartments[0].id,
    status: 'frozen',
    frozenAt: ctx.today,
    thawedAt: null,
    manualExpiry: refreeze ? addDays(ctx.today, 7) : null,
  };
  return {
    events: [{ type: 'ITEM_PATCH', itemId: it.id, patch }],
    inverse: [{ type: 'ITEM_PATCH', itemId: it.id, patch: prevOf(it) }],
    message: refreeze ? `${name(it)} 재냉동. 기한을 7일로 잡았어요` : `${name(it)}을(를) 냉동실로 옮겼어요`,
  };
}

export function thaw(it: Item, ctx: ActionContext): ActionResult {
  const fr = ctx.household.storages.find((s) => s.kind === 'fridge');
  if (!fr) return { events: [], inverse: [], message: '냉장실이 없어요' };
  const hint = presetForItem(it).hint;
  const comp = fr.compartments.find((c) => c.hint === hint) ?? fr.compartments[0];
  const patch: Partial<Item> = { storageId: fr.id, compartmentId: comp.id, status: 'thawed', thawedAt: ctx.today, manualExpiry: null };
  return {
    events: [{ type: 'ITEM_PATCH', itemId: it.id, patch }],
    inverse: [{ type: 'ITEM_PATCH', itemId: it.id, patch: prevOf(it) }],
    message: `${name(it)}을(를) 냉장으로 꺼냈어요. 24시간 안에 드세요`,
  };
}

export function move(it: Item, storageId: string, compartmentId: string, ctx: ActionContext): ActionResult {
  const st = ctx.household.storages.find((s) => s.id === storageId);
  if (!st) return { events: [], inverse: [], message: '보관소를 찾을 수 없어요' };
  if (st.kind === 'freezer' && it.status !== 'frozen') return freeze(it, ctx);
  const patch: Partial<Item> = { storageId, compartmentId };
  if (st.kind !== 'freezer' && it.status === 'frozen') Object.assign(patch, { status: 'thawed', thawedAt: ctx.today, manualExpiry: null });
  const comp = st.compartments.find((c) => c.id === compartmentId);
  return {
    events: [{ type: 'ITEM_PATCH', itemId: it.id, patch }],
    inverse: [{ type: 'ITEM_PATCH', itemId: it.id, patch: prevOf(it) }],
    message: `${name(it)}을(를) ${st.name} · ${comp?.name ?? ''}(으)로 옮겼어요`,
  };
}

export interface AddInput {
  presetKey: string;
  customName?: string;
  qty: number;
  storageId: string;
  compartmentId: string;
  purchasedAt: DateStr;
  baseAt?: DateStr | null;
  printedExpiry?: DateStr | null;
  manualExpiry?: DateStr | null;
  opened?: boolean;
}

export function buildItem(input: AddInput, ctx: ActionContext): Item {
  const st = ctx.household.storages.find((s) => s.id === input.storageId);
  const frozen = st?.kind === 'freezer';
  return {
    id: ctx.newId(),
    presetKey: input.presetKey,
    customName: input.customName,
    qty: input.qty,
    storageId: input.storageId,
    compartmentId: input.compartmentId,
    status: frozen ? 'frozen' : 'cold',
    purchasedAt: input.purchasedAt,
    baseAt: input.baseAt ?? null,
    openedAt: input.opened ? ctx.today : null,
    frozenAt: frozen ? input.purchasedAt : null,
    thawedAt: null,
    printedExpiry: input.printedExpiry ?? null,
    manualExpiry: input.manualExpiry ?? null,
    createdBy: ctx.me,
    createdAt: ctx.today,
  };
}

/** 같은 보관소에 같은 품목이 이미 있으면 합칠 후보를 돌려준다 */
export function findDuplicate(input: Pick<AddInput, 'presetKey' | 'storageId'>, h: Household): Item | undefined {
  return h.items.find((i) => i.presetKey === input.presetKey && i.storageId === input.storageId && i.status !== 'thawed');
}

export function addItem(input: AddInput, ctx: ActionContext): ActionResult {
  const item = buildItem(input, ctx);
  const p = presetForItem(item);
  return {
    events: [{ type: 'ITEM_ADD', item }, { type: 'RECENT_TOUCH', presetKey: item.presetKey }],
    inverse: [{ type: 'ITEM_REMOVE', itemId: item.id, reason: 'undo' }],
    message: `${p.name} ${input.qty}${p.unit} 등록했어요`,
  };
}

export function mergeInto(existing: Item, qty: number): ActionResult {
  const p = presetForItem(existing);
  return {
    events: [{ type: 'ITEM_QTY', itemId: existing.id, delta: qty }, { type: 'RECENT_TOUCH', presetKey: existing.presetKey }],
    inverse: [{ type: 'ITEM_QTY', itemId: existing.id, delta: -qty }],
    message: `${p.name} 수량을 합쳤어요 (${existing.qty + qty}${p.unit})`,
  };
}

export function shopAdd(nameText: string, presetKey: string | undefined, ctx: ActionContext): ActionResult {
  const s: ShoppingItem = { id: ctx.newId(), name: nameText, presetKey, checked: false, addedBy: ctx.me, auto: false };
  return { events: [{ type: 'SHOP_ADD', item: s }], inverse: [{ type: 'SHOP_REMOVE', shopId: s.id }], message: `${nameText}을(를) 장보기에 추가했어요` };
}

export function shopToggle(s: ShoppingItem): ActionResult {
  return {
    events: [{ type: 'SHOP_PATCH', shopId: s.id, patch: { checked: !s.checked } }],
    inverse: [{ type: 'SHOP_PATCH', shopId: s.id, patch: { checked: s.checked } }],
    message: '',
  };
}

export function shopRemove(s: ShoppingItem): ActionResult {
  return { events: [{ type: 'SHOP_REMOVE', shopId: s.id }], inverse: [{ type: 'SHOP_RESTORE', item: s }], message: `${s.name}을(를) 목록에서 뺐어요` };
}

/** 3일 넘게 지난 품목을 한 번에 버림 처리 */
export function clearStale(h: Household, ctx: ActionContext): ActionResult {
  const stale = h.items.filter((i) => {
    const e = computeExpiry(i, ctx);
    return e.days != null && e.days <= -3;
  });
  const events: EventBody[] = [];
  const inverse: EventBody[] = [];
  for (const it of stale) {
    const r = waste(it, { ...ctx, household: applyShopPreview(ctx.household, events) });
    events.push(...r.events);
    inverse.push(...r.inverse);
  }
  return { events, inverse, message: `${stale.length}개를 버림으로 정리했어요` };
}

// clearStale 안에서 같은 품목이 장보기에 두 번 올라가지 않도록 임시 적용
function applyShopPreview(h: Household, events: EventBody[]): Household {
  const shopping = [...h.shopping];
  for (const e of events) if (e.type === 'SHOP_ADD') shopping.push(e.item);
  return { ...h, shopping };
}
