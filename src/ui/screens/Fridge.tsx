import { useEffect, useState } from 'react';
import { shopAdd } from '../../domain/actions';
import { presetForItem } from '../../domain/expiry';
import type { AppApi } from '../api';
import { Empty, Icon, ItemRow } from '../components';
import { FridgeMap } from '../FridgeMap';
import { EmptyArt } from '../icons';

export function Fridge({ app }: { app: AppApi }) {
  const { hh, exp, nav } = app;
  const [storageId, setStorageId] = useState(nav.storageId ?? hh.storages[0]?.id);
  const [compId, setCompId] = useState<string | null>(nav.compartmentId ?? null);
  const [filter, setFilter] = useState<'over' | 'soon' | null>(nav.filter ?? null);
  const [q, setQ] = useState('');

  useEffect(() => {
    if (nav.storageId) setStorageId(nav.storageId);
    setCompId(nav.compartmentId ?? null);
    setFilter(nav.filter ?? null);
    setQ('');
  }, [nav.key, nav.storageId, nav.compartmentId, nav.filter]);

  // 가정이 바뀌어 보관소가 없어졌으면 첫 보관소로
  useEffect(() => {
    if (!hh.storages.some((s) => s.id === storageId)) {
      setStorageId(hh.storages[0]?.id);
      setCompId(null);
    }
  }, [hh.id, hh.storages, storageId]);

  const st = hh.storages.find((s) => s.id === storageId) ?? hh.storages[0];
  const query = q.trim();

  let body;
  if (query) {
    const res = hh.items.filter((it) => {
      const p = presetForItem(it);
      return p.name.includes(query) || p.cat.includes(query) || p.aliases?.some((a) => a.includes(query));
    });
    body = (
      <div className="card">
        <div className="card-title">
          "{query}" 검색 결과 <span className="hint">{res.length}건 · 모든 보관소</span>
        </div>
        {res.length ? (
          res.map((it) => <ItemRow key={it.id} item={it} app={app} />)
        ) : (
          <Empty
            title="없어요"
            desc="장보기 목록에 추가할까요?"
            art={<EmptyArt />}
            action={
              <button
                className="btn sm"
                onClick={() => {
                  app.run(shopAdd(query, undefined, app.ctx));
                  setQ('');
                  app.go('shop');
                }}
              >
                장보기에 추가
              </button>
            }
          />
        )}
      </div>
    );
  } else if (filter) {
    const res = hh.items
      .map((it) => ({ it, e: exp(it) }))
      .filter((x) => x.e.days != null && (filter === 'over' ? x.e.days < 0 : x.e.days >= 0 && x.e.days <= 3))
      .sort((a, b) => a.e.days! - b.e.days!);
    body = (
      <div className="card">
        <div className="card-title">
          {filter === 'over' ? '기한 지남' : '3일 이내'}
          <button className="link" onClick={() => setFilter(null)}>
            전체 보기
          </button>
        </div>
        {res.length ? res.map((x) => <ItemRow key={x.it.id} item={x.it} app={app} />) : <Empty title="없어요" />}
      </div>
    );
  } else if (st) {
    const sel = compId ? st.compartments.find((c) => c.id === compId) : undefined;
    const storageItems = hh.items.filter((it) => it.storageId === st.id);
    const its = storageItems
      .filter((it) => !sel || it.compartmentId === sel.id)
      .map((it) => ({ it, e: exp(it) }))
      .sort((a, b) => (a.e.days ?? 9999) - (b.e.days ?? 9999));
    body = (
      <>
        <div className="seg" role="tablist">
          {hh.storages.map((s) => (
            <button
              key={s.id}
              role="tab"
              aria-selected={s.id === st.id}
              className={s.id === st.id ? 'on' : ''}
              onClick={() => {
                setStorageId(s.id);
                setCompId(null);
              }}
            >
              {s.name}
            </button>
          ))}
        </div>
        <FridgeMap storage={st} items={storageItems} exp={exp} selected={compId} onSelect={setCompId} />
        <div className="card">
          <div className="card-title">
            {sel ? sel.name : `${st.name} 전체`}
            <span className="hint">
              {its.length}개
              {sel && (
                <>
                  {' · '}
                  <button className="link" onClick={() => setCompId(null)}>
                    전체
                  </button>
                </>
              )}
            </span>
          </div>
          {its.length ? (
            its.map((x) => <ItemRow key={x.it.id} item={x.it} app={app} />)
          ) : (
            <Empty
              title={`${sel ? sel.name : st.name}이(가) 비었어요`}
              desc="등록 탭에서 추가하거나 다른 칸에서 옮겨 오세요."
              art={<EmptyArt />}
              action={
                <button className="btn sm" onClick={() => app.go('add')}>
                  등록하기
                </button>
              }
            />
          )}
        </div>
      </>
    );
  }

  return (
    <>
      <div className="search">
        <Icon.search />
        <input type="search" placeholder="어디 있지? 이름이나 분류로 찾기" value={q} onChange={(e) => setQ(e.target.value)} aria-label="품목 검색" />
      </div>
      {body}
    </>
  );
}
