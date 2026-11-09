import type { ActionContext, ActionResult } from '../domain/actions';
import type { Expiry, Household, Item } from '../domain/types';

export type Tab = 'home' | 'fridge' | 'add' | 'recipes' | 'shop' | 'family';

export interface AddPrefill {
  presetKey?: string;
  name?: string;
  batch?: boolean;
}

/** 탭 전환 시 함께 전달되는 의도. key가 바뀔 때만 화면이 반영한다 */
export interface Nav {
  key: number;
  storageId?: string;
  compartmentId?: string;
  filter?: 'over' | 'soon';
  prefill?: AddPrefill;
}

export interface AppApi {
  households: Household[];
  hh: Household;
  me: string;
  meName: string;
  today: string;
  ctx: ActionContext;
  exp: (it: Item) => Expiry;
  nameOf: (it: Item) => string;
  locOf: (it: Item) => string;
  run: (r: ActionResult) => void;
  openItem: (id: string) => void;
  go: (tab: Tab, nav?: Omit<Nav, 'key'>) => void;
  nav: Nav;
  tab: Tab;
}
