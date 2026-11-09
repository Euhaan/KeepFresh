import type { ActionResult } from '../domain/actions';
import { today as todayOf } from '../domain/dates';
import { applyEvents, type EventBody, type KanEvent } from '../domain/events';
import { seedHouseholds } from '../domain/seed';
import type { Household } from '../domain/types';
import { createSync, type Sync } from './sync';

const KEY = 'kankan.v1';

interface Persisted {
  version: 1;
  events: KanEvent[];
  currentHouseholdId: string;
  meByHousehold: Record<string, string>;
  deviceId: string;
}

export interface UndoEntry {
  txn: string;
  inverse: EventBody[];
  message: string;
  householdId: string;
}

export interface StoreState {
  households: Household[];
  currentHouseholdId: string;
  meByHousehold: Record<string, string>;
  events: KanEvent[];
  syncStatus: 'off' | 'connecting' | 'online' | 'error';
}

type Listener = () => void;

export function newId(prefix = 'id'): string {
  const rnd = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now().toString(36)}_${rnd}`;
}

function load(): Persisted {
  const fresh: Persisted = { version: 1, events: [], currentHouseholdId: 'hh_kim', meByHousehold: { hh_kim: 'm_mom', hh_solo: 'm_jiwoo' }, deviceId: newId('dev') };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fresh;
    const p = JSON.parse(raw) as Persisted;
    if (p.version !== 1 || !Array.isArray(p.events)) return fresh;
    return { ...fresh, ...p };
  } catch {
    return fresh;
  }
}

export class Store {
  private persisted: Persisted;
  private state: StoreState;
  private listeners = new Set<Listener>();
  private sync: Sync | null;
  private seen = new Set<string>();

  constructor() {
    this.persisted = load();
    this.persisted.events.forEach((e) => this.seen.add(e.id));
    this.sync = createSync();
    this.state = this.derive(this.sync ? 'connecting' : 'off');
    if (this.sync) this.startSync();
  }

  get today(): string {
    return todayOf();
  }

  subscribe = (fn: Listener) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  getState = (): StoreState => this.state;

  private derive(syncStatus: StoreState['syncStatus']): StoreState {
    const base = seedHouseholds(this.today);
    const households = base.map((h) => applyEvents(h, this.persisted.events));
    return { households, currentHouseholdId: this.persisted.currentHouseholdId, meByHousehold: this.persisted.meByHousehold, events: this.persisted.events, syncStatus };
  }

  private commit(syncStatus = this.state.syncStatus) {
    this.state = this.derive(syncStatus);
    try {
      localStorage.setItem(KEY, JSON.stringify(this.persisted));
    } catch {
      /* 저장소를 못 써도 메모리에서는 동작한다 */
    }
    this.listeners.forEach((l) => l());
  }

  /** 사용자 동작 한 번 = 트랜잭션 하나. 되돌리기 정보를 돌려준다 */
  dispatch(result: ActionResult, householdId = this.state.currentHouseholdId): UndoEntry | null {
    if (!result.events.length) return null;
    const txn = newId('tx');
    const by = this.persisted.meByHousehold[householdId] ?? 'unknown';
    const at = new Date().toISOString();
    const events: KanEvent[] = result.events.map((e) => ({ ...e, id: newId('ev'), householdId, txn, at, by }));
    events.forEach((e) => this.seen.add(e.id));
    this.persisted.events.push(...events);
    this.commit();
    void this.sync?.push(events);
    return { txn, inverse: result.inverse, message: result.message, householdId };
  }

  undo(entry: UndoEntry) {
    this.dispatch({ events: entry.inverse, inverse: [], message: '되돌렸어요' }, entry.householdId);
  }

  switchHousehold(id: string) {
    if (!this.state.households.some((h) => h.id === id)) return;
    this.persisted.currentHouseholdId = id;
    this.commit();
  }

  setMe(householdId: string, memberId: string) {
    this.persisted.meByHousehold[householdId] = memberId;
    this.commit();
  }

  /** 데모 데이터로 되돌린다 (이벤트 전체 삭제) */
  resetDemo() {
    this.persisted.events = [];
    this.seen.clear();
    this.commit();
  }

  private startSync() {
    const s = this.sync!;
    s.subscribe(
      this.state.households.map((h) => h.id),
      (remote) => {
        const fresh = remote.filter((e) => !this.seen.has(e.id));
        if (!fresh.length) return;
        fresh.forEach((e) => this.seen.add(e.id));
        this.persisted.events.push(...fresh);
        this.persisted.events.sort((a, b) => a.at.localeCompare(b.at));
        this.commit('online');
      },
      (status) => this.commit(status),
    );
  }
}

export const store = new Store();
