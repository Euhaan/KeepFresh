import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import type { ActionContext, ActionResult } from './domain/actions';
import { computeExpiry, presetForItem } from './domain/expiry';
import type { Item } from './domain/types';
import { startScheduler } from './notify/notifications';
import { newId, store, type UndoEntry } from './store/store';
import { useStoreState } from './store/useStore';
import type { AppApi, Nav, Tab } from './ui/api';
import { Icon } from './ui/components';
import { ItemSheet } from './ui/ItemSheet';
import { NotifSheet } from './ui/NotifSheet';
import { Add } from './ui/screens/Add';
import { Family } from './ui/screens/Family';
import { Fridge } from './ui/screens/Fridge';
import { Home } from './ui/screens/Home';
import { Dishes } from './ui/screens/Dishes';
import { Onboarding } from './ui/screens/Onboarding';
import { Shopping } from './ui/screens/Shopping';

const TABS: { id: Tab; label: string; icon: () => ReactElement }[] = [
  { id: 'home', label: '홈', icon: Icon.home },
  { id: 'fridge', label: '냉장고', icon: Icon.fridge },
  { id: 'add', label: '등록', icon: Icon.plus },
  { id: 'dishes', label: '요리', icon: Icon.recipe },
  { id: 'shop', label: '장보기', icon: Icon.cart },
];

export default function App() {
  const state = useStoreState();
  const [tab, setTab] = useState<Tab>('home');
  const [nav, setNav] = useState<Nav>({ key: 0 });
  const [sheetItemId, setSheetItemId] = useState<string | null>(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [snack, setSnack] = useState<{ message: string; undo: UndoEntry | null } | null>(null);
  const snackTimer = useRef<number | undefined>(undefined);
  const [today, setToday] = useState(store.today);

  // 자정이 지나면 D-day를 다시 계산한다
  useEffect(() => {
    const t = window.setInterval(() => {
      const d = store.today;
      if (d !== today) setToday(d);
    }, 60_000);
    return () => window.clearInterval(t);
  }, [today]);

  const hh = state.households.find((h) => h.id === state.currentHouseholdId) ?? state.households[0];
  const me = state.meByHousehold[hh.id] ?? hh.members[0].id;
  const meName = hh.members.find((m) => m.id === me)?.name ?? '나';

  const ctx: ActionContext = useMemo(() => ({ today, overrides: hh.overrides, household: hh, me, newId: () => newId('it') }), [today, hh, me]);

  // 아침 요약 알림 스케줄러. 항상 최신 상태를 읽도록 ref를 쓴다
  const latest = useRef({ hh, ctx });
  latest.current = { hh, ctx };
  useEffect(() => startScheduler(() => latest.current), []);

  const showSnack = useCallback((message: string, undo: UndoEntry | null) => {
    if (!message) return;
    setSnack({ message, undo });
    window.clearTimeout(snackTimer.current);
    snackTimer.current = window.setTimeout(() => setSnack(null), 5000);
  }, []);

  const run = useCallback(
    (r: ActionResult) => {
      const entry = store.dispatch(r, hh.id);
      showSnack(r.message, entry && r.inverse.length ? entry : null);
    },
    [hh.id, showSnack],
  );

  const go = useCallback((t: Tab, n?: Omit<Nav, 'key'>) => {
    setTab(t);
    setNav((prev) => ({ key: prev.key + 1, ...n }));
  }, []);

  const api: AppApi = useMemo(
    () => ({
      households: state.households,
      hh,
      me,
      meName,
      today,
      ctx,
      exp: (it: Item) => computeExpiry(it, ctx),
      nameOf: (it: Item) => presetForItem(it).name,
      locOf: (it: Item) => {
        const st = hh.storages.find((s) => s.id === it.storageId);
        const c = st?.compartments.find((x) => x.id === it.compartmentId);
        return st ? `${st.name} · ${c?.name ?? ''}` : '';
      },
      run,
      openItem: setSheetItemId,
      go,
      nav,
      tab,
    }),
    [state.households, hh, me, meName, today, ctx, run, go, nav, tab],
  );

  const attention = hh.items.map((it) => computeExpiry(it, ctx)).filter((e) => e.days != null && e.days <= 3).length;

  const sheetItem = sheetItemId ? hh.items.find((i) => i.id === sheetItemId) : undefined;
  useEffect(() => {
    if (sheetItemId && !sheetItem) setSheetItemId(null);
  }, [sheetItemId, sheetItem]);

  const Screen = { home: Home, fridge: Fridge, add: Add, dishes: Dishes, shop: Shopping, family: Family }[tab];

  if (!state.onboarded) return <Onboarding />;

  return (
    <div className="app">
      <header className="appbar">
        <button className="hh" onClick={() => go('family')} aria-label="가정 전환과 설정">
          {hh.name}
          <Icon.chevron />
        </button>
        <div className="right">
          <span className={`sync ${state.syncStatus}`}>
            <i />
            {state.syncStatus === 'off' ? '이 기기' : state.syncStatus === 'online' ? '동기화됨' : state.syncStatus === 'connecting' ? '연결 중' : '오프라인'}
          </span>
          <button className="iconbtn" onClick={() => setNotifOpen(true)} aria-label={`알림함, 챙길 것 ${attention}건`}>
            <Icon.bell />
            {attention > 0 && <span className="badge">{attention}</span>}
          </button>
          <button className="iconbtn" onClick={() => go('family')} aria-label="가족과 설정">
            <Icon.users />
          </button>
        </div>
      </header>

      <main className="screen" key={`${tab}-${hh.id}`}>
        <Screen app={api} />
      </main>

      <nav className="tabbar" aria-label="하단 탭">
        {TABS.map((t) => (
          <button key={t.id} className={`${t.id === 'add' ? 'add' : ''} ${tab === t.id && t.id !== 'add' ? 'on' : ''}`} onClick={() => go(t.id)} aria-label={t.label} aria-current={tab === t.id ? 'page' : undefined}>
            {t.id === 'add' ? (
              <span className="ic">
                <t.icon />
              </span>
            ) : (
              <t.icon />
            )}
            {t.label}
          </button>
        ))}
      </nav>

      {sheetItem && <ItemSheet item={sheetItem} app={api} onClose={() => setSheetItemId(null)} />}
      {notifOpen && !sheetItem && <NotifSheet app={api} onClose={() => setNotifOpen(false)} />}

      {snack && (
        <div className="snack" role="status">
          {snack.message}
          {snack.undo && (
            <button
              onClick={() => {
                store.undo(snack.undo!);
                setSnack(null);
              }}
            >
              되돌리기
            </button>
          )}
        </div>
      )}
    </div>
  );
}
