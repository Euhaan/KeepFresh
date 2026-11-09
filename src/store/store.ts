import type { ActionResult } from '../domain/actions';
import { today as todayOf } from '../domain/dates';
import { applyEvents, type EventBody, type KanEvent } from '../domain/events';
import { defaultHouseholds, defaultStorages } from '../domain/seed';
import type { Household } from '../domain/types';
import { createSync, type Sync } from './sync';

const KEY = 'keepfresh.v2';

interface HouseholdMeta {
  id: string;
  name: string;
  meId: string;
  meName: string;
}

interface Persisted {
  version: 2;
  /** 이 기기가 아는 가정 목록. 서버 연결 후에는 memberships에서 받아온다 */
  households: HouseholdMeta[];
  events: KanEvent[];
  currentHouseholdId: string;
  meByHousehold: Record<string, string>;
  deviceId: string;
  /** 첫 실행 온보딩(이름 설정)을 마쳤는지 */
  onboarded: boolean;
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
  onboarded: boolean;
}

type Listener = () => void;

export function newId(prefix = 'id'): string {
  const rnd = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now().toString(36)}_${rnd}`;
}

function fresh(): Persisted {
  const [h] = defaultHouseholds();
  return {
    version: 2,
    households: [{ id: h.id, name: h.name, meId: h.members[0].id, meName: h.members[0].name }],
    events: [],
    currentHouseholdId: h.id,
    meByHousehold: { [h.id]: h.members[0].id },
    deviceId: newId('dev'),
    onboarded: false,
  };
}

function load(): Persisted {
  const f = fresh();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return f;
    const p = JSON.parse(raw) as Persisted;
    if (p.version !== 2 || !Array.isArray(p.events) || !Array.isArray(p.households) || !p.households.length) return f;
    return { ...f, ...p };
  } catch {
    return f;
  }
}

/** 메타데이터로 빈 가정을 만든다. 모든 내용은 이벤트로 채워진다 */
function emptyHousehold(meta: HouseholdMeta): Household {
  const [tpl] = defaultHouseholds();
  return { ...tpl, id: meta.id, name: meta.name, storages: defaultStorages(), members: [{ id: meta.meId, name: meta.meName, role: 'owner' }] };
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
    const households = this.persisted.households.map((m) => applyEvents(emptyHousehold(m), this.persisted.events));
    return { households, currentHouseholdId: this.persisted.currentHouseholdId, meByHousehold: this.persisted.meByHousehold, events: this.persisted.events, syncStatus, onboarded: this.persisted.onboarded };
  }

  /** 첫 실행: 가정 이름, 내 이름, 함께 쓰는 가족을 정하고 시작한다 */
  completeOnboarding(input: { householdName: string; meName: string; memberNames: string[] }) {
    const hid = this.persisted.currentHouseholdId;
    const meta = this.persisted.households.find((h) => h.id === hid);
    if (!meta) return;
    meta.name = input.householdName.trim() || '우리집';
    meta.meName = input.meName.trim() || '나';
    const events: EventBody[] = input.memberNames
      .map((n) => n.trim())
      .filter(Boolean)
      .map((name) => ({ type: 'MEMBER_ADD', member: { id: newId('m'), name, role: 'member' } }) as EventBody);
    this.persisted.onboarded = true;
    if (events.length) this.dispatch({ events, inverse: [], message: '' }, hid);
    else this.commit();
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
    // 가정 이름 변경은 메타데이터에도 반영해 재생 없이도 목록에 보이게 한다
    for (const e of events) {
      if (e.type === 'SETTINGS_PATCH' && e.patch.name) this.persisted.households = this.persisted.households.map((m) => (m.id === householdId ? { ...m, name: e.patch.name! } : m));
      // 내 이름 변경(ITEM이 아닌 구성원 패치)은 메타에도 반영
      if (e.type === 'MEMBER_RENAME') this.persisted.households = this.persisted.households.map((m) => (m.id === householdId && m.meId === e.memberId ? { ...m, meName: e.name } : m));
    }
    this.commit();
    void this.sync?.push(events);
    return { txn, inverse: result.inverse, message: result.message, householdId };
  }

  undo(entry: UndoEntry) {
    this.dispatch({ events: entry.inverse, inverse: [], message: '되돌렸어요' }, entry.householdId);
  }

  switchHousehold(id: string) {
    if (!this.persisted.households.some((h) => h.id === id)) return;
    this.persisted.currentHouseholdId = id;
    this.commit();
  }

  /** 새 가정을 만들고 그 가정으로 전환한다. 내 이름은 현재 가정의 내 이름을 이어 쓴다 */
  addHousehold(name: string): string {
    const cur = this.state.households.find((h) => h.id === this.state.currentHouseholdId);
    const meName = cur?.members.find((m) => m.id === this.persisted.meByHousehold[cur.id])?.name ?? '나';
    const id = newId('hh');
    const meId = newId('m');
    this.persisted.households.push({ id, name: name.trim() || '새 가정', meId, meName });
    this.persisted.meByHousehold[id] = meId;
    this.persisted.currentHouseholdId = id;
    this.commit();
    return id;
  }

  /** 가정을 삭제한다. 마지막 하나는 지울 수 없다 */
  removeHousehold(id: string) {
    if (this.persisted.households.length <= 1) return;
    this.persisted.households = this.persisted.households.filter((h) => h.id !== id);
    this.persisted.events = this.persisted.events.filter((e) => e.householdId !== id);
    delete this.persisted.meByHousehold[id];
    if (this.persisted.currentHouseholdId === id) this.persisted.currentHouseholdId = this.persisted.households[0].id;
    this.commit();
  }

  setMe(householdId: string, memberId: string) {
    this.persisted.meByHousehold[householdId] = memberId;
    this.commit();
  }

  /** 이 기기의 모든 데이터를 지우고 빈 상태로 돌아간다 */
  resetAll() {
    this.persisted = fresh();
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
