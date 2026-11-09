/** 날짜는 항상 'YYYY-MM-DD' 문자열(시간 없음). D-day는 기기의 지역 날짜로 계산한다. */
export type DateStr = string;

export type StorageKind = 'fridge' | 'freezer' | 'kimchi' | 'pantry';
export type Role = 'owner' | 'member' | 'viewer';
export type ItemStatus = 'cold' | 'frozen' | 'thawed';
export type QtyType = 'count' | 'amount';

/** 공용 식품 사전 항목. 일수는 모두 '통상 보관기간'이며 가정이 덮어쓸 수 있다. */
export interface Preset {
  key: string;
  name: string;
  cat: string;
  unit: string;
  defaultQty: number;
  qtyType: QtyType;
  fridgeDays: number | null;
  freezerDays: number | null;
  openedDays: number | null;
  /** 산란일처럼 구매일보다 우선하는 기준일의 이름 */
  baseLabel?: string;
  /** 소금, 간장처럼 기한 관리가 무의미한 품목 */
  noExpiry?: boolean;
  defaultStorage: StorageKind;
  /** 칸 추천용 힌트 (칸의 hint와 맞으면 그 칸을 기본으로) */
  hint: string;
  /** 레시피 매칭용 별칭 */
  aliases?: string[];
}

export interface PresetOverride {
  fridgeDays?: number;
  freezerDays?: number;
  openedDays?: number;
}

export interface Compartment {
  id: string;
  name: string;
  hint: string;
  /** 도어 포켓 등 측면 칸 */
  side?: boolean;
}

export interface Storage {
  id: string;
  name: string;
  kind: StorageKind;
  compartments: Compartment[];
}

export interface Member {
  id: string;
  name: string;
  role: Role;
}

export interface Item {
  id: string;
  presetKey: string;
  /** 사전에 없는 품목은 이름을 직접 가진다 */
  customName?: string;
  qty: number;
  half?: boolean;
  storageId: string;
  compartmentId: string;
  status: ItemStatus;
  purchasedAt: DateStr | null;
  /** 산란일 등 기준일 */
  baseAt: DateStr | null;
  openedAt: DateStr | null;
  frozenAt: DateStr | null;
  thawedAt: DateStr | null;
  /** 포장에 인쇄된 소비기한 */
  printedExpiry: DateStr | null;
  /** 사용자가 직접 정한 기한. 가장 우선한다 */
  manualExpiry: DateStr | null;
  note?: string;
  createdBy: string;
  createdAt: DateStr;
}

export interface ShoppingItem {
  id: string;
  name: string;
  presetKey?: string;
  checked: boolean;
  addedBy: string;
  /** 다 먹거나 버려서 자동으로 올라온 항목 */
  auto: boolean;
}

export interface NotificationSettings {
  morningAt: string;
  perItem: boolean;
  quietHours: boolean;
  target: 'all' | 'creator';
}

export interface Household {
  id: string;
  name: string;
  timezone: string;
  showEater: boolean;
  members: Member[];
  storages: Storage[];
  items: Item[];
  shopping: ShoppingItem[];
  overrides: Record<string, PresetOverride>;
  recentPresetKeys: string[];
  notifications: NotificationSettings;
}

export type ExpiryBasis =
  | '직접'
  | '표기'
  | '개봉'
  | '통상'
  | '냉동 통상'
  | '해동'
  | '등록일 기준'
  | '관리 안 함'
  | '기준 없음';

export type ExpiryClass = 'fresh' | 'soon' | 'over' | 'frozen' | 'none';

export interface Expiry {
  date: DateStr | null;
  basis: ExpiryBasis;
  cls: ExpiryClass;
  label: string;
  /** 오늘까지 남은 일수. 음수면 지남. date가 없으면 null */
  days: number | null;
}
