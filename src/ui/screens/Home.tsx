import { useState } from 'react';
import { clearStale } from '../../domain/actions';
import { addDays, parseDate } from '../../domain/dates';
import { presetForItem } from '../../domain/expiry';
import { matchDishes } from '../../domain/dishes';
import { useStoreState } from '../../store/useStore';
import type { AppApi } from '../api';
import { Empty, ItemRow } from '../components';
import { EmptyArt } from '../icons';

const DAYS = ['일', '월', '화', '수', '목', '금', '토'];

export function Home({ app }: { app: AppApi }) {
  const { hh, exp } = app;
  const { events } = useStoreState();
  const [feedOpen, setFeedOpen] = useState(false);

  const dated = hh.items.map((it) => ({ it, e: exp(it) })).filter((x) => x.e.days != null);
  const over = dated.filter((x) => x.e.days! < 0).sort((a, b) => a.e.days! - b.e.days!);
  const soon = dated.filter((x) => x.e.days! >= 0 && x.e.days! <= 3).sort((a, b) => a.e.days! - b.e.days!);
  const stale = over.filter((x) => x.e.days! <= -3);
  const urgentDishes = matchDishes(hh, app.ctx).filter((m) => m.readiness === 'ready' && m.urgentCount > 0).slice(0, 3);

  // 인사말과 날짜
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 11 ? '좋은 아침이에요' : hour < 17 ? '좋은 오후예요' : '좋은 저녁이에요';
  const d = parseDate(app.today);
  const dateLabel = `${d.getMonth() + 1}월 ${d.getDate()}일 ${DAYS[d.getDay()]}요일`;

  // 7일 타임라인: 지남 + 오늘부터 6일
  const cols = [
    { label: '지남', n: over.length, cls: 'over', filter: 'over' as const },
    ...Array.from({ length: 7 }, (_, i) => {
      const date = addDays(app.today, i);
      const n = dated.filter((x) => x.e.date === date).length;
      const wd = DAYS[parseDate(date).getDay()];
      return { label: i === 0 ? '오늘' : i === 1 ? '내일' : wd, n, cls: i <= 3 ? 'soon' : 'fresh', filter: i <= 3 ? ('soon' as const) : undefined };
    }),
  ];
  const max = Math.max(1, ...cols.map((c) => c.n));

  // 오늘 활동 요약: 구성원별 등록·먹음·버림 개수
  const summary = new Map<string, { add: number; eat: number; waste: number }>();
  for (const ev of events) {
    if (ev.householdId !== hh.id) continue;
    const t = new Date(ev.at);
    const local = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
    if (local !== app.today) continue;
    const who = hh.members.find((m) => m.id === ev.by)?.name ?? '누군가';
    const s = summary.get(who) ?? { add: 0, eat: 0, waste: 0 };
    if (ev.type === 'ITEM_ADD') s.add++;
    else if (ev.type === 'ITEM_QTY' && ev.delta < 0) s.eat++;
    else if (ev.type === 'ITEM_REMOVE' && ev.reason === 'eaten') s.eat++;
    else if (ev.type === 'ITEM_REMOVE' && ev.reason === 'wasted') s.waste++;
    summary.set(who, s);
  }

  return (
    <>
      <div className="greet">
        <h1>{app.meName === '나' ? greeting : `${app.meName}, ${greeting}`}</h1>
        <span className="date">{dateLabel}</span>
      </div>

      <div className="stats">
        <button className="stat over" onClick={() => app.go('fridge', { filter: 'over' })}>
          <b className="num">{over.length}</b>
          <span>지남</span>
        </button>
        <button className="stat soon" onClick={() => app.go('fridge', { filter: 'soon' })}>
          <b className="num">{soon.length}</b>
          <span>3일 이내</span>
        </button>
        <button className="stat" onClick={() => app.go('fridge')}>
          <b className="num">{hh.items.length}</b>
          <span>전체 품목</span>
        </button>
      </div>

      <div className="card">
        <div className="card-title">
          이번 주 기한 <span className="hint">날짜별 품목 수</span>
        </div>
        <div className="timeline" role="list">
          {cols.map((c, i) => (
            <button key={i} role="listitem" className={i === 1 ? 'today' : ''} onClick={() => (c.filter ? app.go('fridge', { filter: c.filter }) : app.go('fridge'))} aria-label={`${c.label} ${c.n}개`}>
              <span className="bar">
                {c.n > 0 && <i className={c.cls} style={{ height: `${Math.max(18, (c.n / max) * 100)}%` }} />}
                {c.n > 0 && <b className="num">{c.n}</b>}
              </span>
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {stale.length > 0 && (
        <div className="card danger">
          <div className="card-title" style={{ color: 'inherit' }}>
            아직 있나요? <span className="hint" style={{ color: 'inherit' }}>3일 넘게 지남 {stale.length}건</span>
          </div>
          <div style={{ fontSize: 13.5 }}>{stale.map((x) => presetForItem(x.it).name).join(', ')}</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button className="btn sm" onClick={() => app.run(clearStale(hh, app.ctx))}>
              모두 버림으로 정리
            </button>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-title">
          오늘 먹어야 해요 <span className="hint">{soon.length}건</span>
        </div>
        {soon.length ? soon.map((x) => <ItemRow key={x.it.id} item={x.it} app={app} />) : <Empty title="임박한 품목이 없어요" desc="3일 안에 기한이 오는 것이 없습니다." art={<EmptyArt />} />}
      </div>

      {urgentDishes.length > 0 && (
        <div className="hero-card">
          <div className="hero-eyebrow">임박 재료로 바로 만들 수 있어요</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--font-head)', fontSize: 20, fontWeight: 600 }}>{urgentDishes.map((m) => m.dish.name).join(' · ')}</div>
              <div className="hint">{[...new Set(urgentDishes.flatMap((m) => m.have.filter((h) => h.urgent).map((h) => h.name)))].join(', ')} 사용</div>
            </div>
            <button className="btn sm pri" onClick={() => app.go('dishes')}>
              요리 보기
            </button>
          </div>
        </div>
      )}

      {over.length > 0 && (
        <div className="card">
          <div className="card-title">
            기한이 지났어요 <span className="hint">{over.length}건</span>
          </div>
          {over.map((x) => (
            <ItemRow key={x.it.id} item={x.it} app={app} />
          ))}
        </div>
      )}

      <div className="card">
        <div className="card-title">
          가족 활동
          <button className="link" onClick={() => setFeedOpen((v) => !v)}>
            {feedOpen ? '접기' : '오늘 요약 보기'}
          </button>
        </div>
        {feedOpen ? (
          <div className="feed">
            {summary.size ? (
              [...summary.entries()].map(([who, s]) => (
                <span key={who}>
                  <b>{who}</b> · {[s.add && `${s.add}개 등록`, s.eat && `${s.eat}번 먹음`, s.waste && `${s.waste}개 버림`].filter(Boolean).join(', ')}
                </span>
              ))
            ) : (
              <span>오늘 기록된 활동이 아직 없어요.</span>
            )}
          </div>
        ) : (
          <div className="hint">하루 단위로 요약해서 보여줍니다. 품목마다 알림을 보내지 않습니다.</div>
        )}
      </div>
    </>
  );
}
