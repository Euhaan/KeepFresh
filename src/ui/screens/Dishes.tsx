import { useMemo, useState } from 'react';
import { eat, shopAdd, type ActionResult } from '../../domain/actions';
import { matchDishes, type DishMatch, type Readiness } from '../../domain/dishes';
import { presetForItem } from '../../domain/expiry';
import { PRESET_MAP } from '../../domain/presets';
import type { AppApi } from '../api';
import { Empty, Sheet } from '../components';
import { CatIcon, EmptyArt, tintOf } from '../icons';

const GROUPS: { key: Readiness; title: string; desc: string }[] = [
  { key: 'ready', title: '지금 바로 가능', desc: '필수 재료가 다 있어요' },
  { key: 'almost', title: '하나만 더 있으면', desc: '필수 재료 한 가지가 없어요' },
  { key: 'partial', title: '재료를 더 사면', desc: '두 가지 이상 부족해요' },
];

export function Dishes({ app }: { app: AppApi }) {
  const { hh } = app;
  const [open, setOpen] = useState<DishMatch | null>(null);
  const matches = useMemo(() => matchDishes(hh, app.ctx), [hh, app.ctx]);
  const ready = matches.filter((m) => m.readiness === 'ready');
  const urgentReady = ready.filter((m) => m.urgentCount > 0).length;

  const cook = (m: DishMatch) => {
    const events: ActionResult['events'] = [];
    const inverse: ActionResult['inverse'] = [];
    let n = 0;
    for (const h of m.have) {
      const p = presetForItem(h.item);
      if (p.noExpiry) continue;
      const r = eat(h.item, p.qtyType === 'count' ? 'one' : 'half', app.ctx);
      events.push(...r.events);
      inverse.push(...r.inverse);
      n++;
    }
    app.run({ events, inverse, message: `${m.dish.name} 재료 ${n}가지를 사용으로 기록했어요` });
    setOpen(null);
  };

  const addMissing = (m: DishMatch) => {
    const events: ActionResult['events'] = [];
    const inverse: ActionResult['inverse'] = [];
    for (const x of m.missing.filter((x) => !x.optional)) {
      if (hh.shopping.some((s) => s.presetKey === x.key && !s.checked)) continue;
      const r = shopAdd(PRESET_MAP[x.key]?.name ?? x.name, x.key, app.ctx);
      events.push(...r.events);
      inverse.push(...r.inverse);
    }
    app.run({ events, inverse, message: events.length ? `${m.dish.name} 재료 ${events.length}가지를 장보기에 추가했어요` : '이미 장보기에 있어요' });
  };

  return (
    <>
      <section className="hero-card">
        <div className="hero-eyebrow">지금 있는 재료로</div>
        <div className="hero-title">
          {ready.length}가지 바로 가능
          <span className="hero-sub">{urgentReady > 0 ? `그중 ${urgentReady}가지는 3일 안에 먹어야 할 재료를 써요` : '임박한 재료는 없어요'}</span>
        </div>
      </section>

      {matches.length === 0 && <Empty title="만들 수 있는 요리가 없어요" desc="재료를 몇 가지 등록하면 여기에 요리가 나타나요." art={<EmptyArt />} />}

      {GROUPS.map((g) => {
        const list = matches.filter((m) => m.readiness === g.key);
        if (!list.length) return null;
        return (
          <div className="card" key={g.key}>
            <div className="card-title">
              {g.title} <span className="hint">{list.length}가지 · {g.desc}</span>
            </div>
            {list.map((m) => (
              <button key={m.dish.id} className="dish" onClick={() => setOpen(m)}>
                <div className="dish-icons" aria-hidden="true">
                  {m.have.slice(0, 3).map((h) => (
                    <span key={h.key} className={`mini tint-${tintOf(PRESET_MAP[h.key]?.cat ?? '기타')}`}>
                      <CatIcon cat={PRESET_MAP[h.key]?.cat ?? '기타'} size={15} />
                    </span>
                  ))}
                </div>
                <div className="dish-txt">
                  <div className="dish-name">
                    {m.dish.name}
                    {m.urgentCount > 0 && <span className="urgent-tag">임박 재료</span>}
                  </div>
                  <div className="dish-sub">
                    {m.readiness === 'ready'
                      ? m.have.map((h) => h.name).join(', ')
                      : `없는 것: ${m.missing.filter((x) => !x.optional).map((x) => x.name).join(', ')}`}
                  </div>
                </div>
                <span className="dish-chev" aria-hidden="true">›</span>
              </button>
            ))}
          </div>
        );
      })}

      {open && (
        <Sheet label={`${open.dish.name} 재료`} onClose={() => setOpen(null)} title={open.dish.name}>
          <div className="ing">
            {open.have.map((h) => (
              <span key={h.key} className={h.urgent ? 'urgent' : ''}>
                {h.name}
                {h.urgent ? ' · 임박' : ''}
                {h.optional ? ' (선택)' : ''}
              </span>
            ))}
            {open.missing.map((x) => (
              <span key={x.key} className={`miss ${x.optional ? 'opt' : ''}`}>
                {x.name}
                {x.optional ? ' (선택)' : ''}
              </span>
            ))}
          </div>
          <p className="hint" style={{ margin: 0 }}>
            소금, 식용유 같은 기본 양념은 있다고 보고 계산해요. 조리법은 다루지 않아요.
          </p>
          <div className="actions">
            {open.missing.some((x) => !x.optional) ? (
              <button className="btn" onClick={() => addMissing(open)}>
                없는 재료 장보기에
              </button>
            ) : (
              <button className="btn" onClick={() => setOpen(null)}>
                닫기
              </button>
            )}
            <button className="btn pri" onClick={() => cook(open)}>
              만들었어요 · 재료 차감
            </button>
          </div>
        </Sheet>
      )}
    </>
  );
}
