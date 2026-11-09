import { useMemo, useState } from 'react';
import { eat, shopAdd, type ActionResult } from '../../domain/actions';
import { presetForItem } from '../../domain/expiry';
import { PRESET_MAP } from '../../domain/presets';
import { formatAmount, recommend, type RecipeMatch } from '../../domain/recipes';
import type { AppApi } from '../api';
import { Empty } from '../components';
import { CatIcon, EmptyArt, tintOf } from '../icons';

export function Recipes({ app }: { app: AppApi }) {
  const { hh } = app;
  const [tag, setTag] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [servings, setServings] = useState(2);
  const matches = useMemo(() => recommend(hh, app.ctx, 30), [hh, app.ctx]);
  const tags = useMemo(() => [...new Set(matches.flatMap((m) => m.recipe.tags))], [matches]);
  const shown = matches.filter((m) => !tag || m.recipe.tags.includes(tag)).slice(0, 12);
  const urgentTotal = matches.filter((m) => m.urgentCount > 0).length;

  const cook = (m: RecipeMatch) => {
    // 보유 재료를 한 번에 차감: 개수형은 1개, 용량형은 절반. 양념류(기한 관리 안 함)는 건너뛴다
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
    app.run({ events, inverse, message: `${m.recipe.name} ${servings}인분 · 재료 ${n}가지를 사용으로 기록했어요` });
    setOpen(null);
  };

  return (
    <>
      <section className="hero-card">
        <div className="hero-eyebrow">지금 있는 재료로</div>
        <div className="hero-title">
          {matches.length}가지 요리
          <span className="hero-sub">그중 {urgentTotal}가지는 3일 안에 먹어야 할 재료를 써요</span>
        </div>
        <div className="serv">
          <span className="hint">인분</span>
          {[1, 2, 3, 4].map((n) => (
            <button key={n} className={servings === n ? 'on' : ''} onClick={() => setServings(n)} aria-pressed={servings === n}>
              {n}
            </button>
          ))}
        </div>
      </section>

      <div className="seg">
        <button className={!tag ? 'on' : ''} onClick={() => setTag(null)}>
          전체
        </button>
        {tags.map((t) => (
          <button key={t} className={tag === t ? 'on' : ''} onClick={() => setTag(tag === t ? null : t)}>
            {t}
          </button>
        ))}
      </div>

      {shown.length === 0 && <Empty title="추천할 요리가 없어요" desc="재료를 몇 가지 등록하면 여기에 요리가 나타납니다." art={<EmptyArt />} />}

      {shown.map((m) => {
        const isOpen = open === m.recipe.id;
        const requiredMissing = m.missing.filter((x) => !x.optional);
        const pct = Math.round(m.coverage * 100);
        return (
          <article key={m.recipe.id} className={`card recipe ${isOpen ? 'open' : ''}`}>
            <button className="recipe-head" onClick={() => setOpen(isOpen ? null : m.recipe.id)} aria-expanded={isOpen}>
              <div className="recipe-icons" aria-hidden="true">
                {m.have.slice(0, 3).map((h) => (
                  <span key={h.key} className={`mini tint-${tintOf(PRESET_MAP[h.key]?.cat ?? '기타')}`}>
                    <CatIcon cat={PRESET_MAP[h.key]?.cat ?? '기타'} size={16} />
                  </span>
                ))}
              </div>
              <div className="recipe-txt">
                <h3>{m.recipe.name}</h3>
                <div className="recipe-meta num">
                  <span>⏱ {m.recipe.minutes}분</span>
                  <span>재료 {m.have.length}/{m.recipe.ingredients.length}</span>
                  {m.urgentCount > 0 && <span className="urgent-tag">임박 재료 {m.urgentCount}</span>}
                </div>
              </div>
              <div className="ring num" style={{ ['--pct' as string]: `${pct}%` }} aria-label={`필수 재료 ${pct}% 보유`}>
                <span>{pct}%</span>
              </div>
            </button>

            <div className="ing">
              {m.have.map((h) => (
                <span key={h.key} className={h.urgent ? 'urgent' : ''}>
                  {h.name} <b className="num">{formatAmount(h.ingredient.amount, servings, h.ingredient.unit)}</b>
                  {h.urgent ? ' · 임박' : ''}
                </span>
              ))}
              {m.missing.map((x) => (
                <span key={x.key} className={`miss ${x.optional ? 'opt' : ''}`}>
                  {x.name} <b className="num">{formatAmount(x.ingredient.amount, servings, x.ingredient.unit)}</b>
                  {x.optional ? ' (선택)' : ''}
                </span>
              ))}
            </div>

            {isOpen && (
              <>
                {m.recipe.staples.length > 0 && <div className="hint">기본 양념 (1인분): {m.recipe.staples.join(', ')}</div>}
                <ol className="steps">
                  {m.recipe.steps.map((s, i) => (
                    <li key={i}>
                      <span>{s.text}</span>
                      {s.minutes != null && <em className="num">{s.minutes}분</em>}
                    </li>
                  ))}
                </ol>
                <div className="hint num">총 {m.recipe.minutes}분 · {servings}인분 기준. 분량은 1인분 레시피에 인분 수를 곱한 값이에요.</div>
                {requiredMissing.length > 0 && (
                  <div className="ing">
                    {requiredMissing.map((x) => {
                      const already = hh.shopping.some((s) => s.presetKey === x.key && !s.checked);
                      return (
                        <button key={x.key} disabled={already} onClick={() => app.run(shopAdd(PRESET_MAP[x.key]?.name ?? x.name, x.key, app.ctx))}>
                          {already ? `${x.name} 장보기에 있음` : `+ ${x.name} 장보기에 추가`}
                        </button>
                      );
                    })}
                  </div>
                )}
                <div className="actions">
                  <button className="btn" onClick={() => setOpen(null)}>
                    닫기
                  </button>
                  <button className="btn pri" onClick={() => cook(m)}>
                    만들었어요 · 재료 차감
                  </button>
                </div>
              </>
            )}
          </article>
        );
      })}
    </>
  );
}
