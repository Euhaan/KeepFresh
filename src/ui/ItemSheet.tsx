import { useState } from 'react';
import * as A from '../domain/actions';
import { formatShort } from '../domain/dates';
import { presetForItem } from '../domain/expiry';
import type { Item } from '../domain/types';
import type { AppApi } from './api';
import { Chip, Sheet } from './components';

export function ItemSheet({ item, app, onClose }: { item: Item; app: AppApi; onClose: () => void }) {
  const p = presetForItem(item);
  const e = app.exp(item);
  const [mode, setMode] = useState<'main' | 'refreeze' | 'move' | 'date'>('main');
  const [moveTo, setMoveTo] = useState({ storageId: item.storageId, compartmentId: item.compartmentId });
  const [dateVal, setDateVal] = useState(item.manualExpiry ?? e.date ?? app.today);

  const ov = app.hh.overrides[item.presetKey];
  const freezerDays = ov?.freezerDays ?? p.freezerDays;
  const openedDays = ov?.openedDays ?? p.openedDays;
  const hasFreezer = app.hh.storages.some((s) => s.kind === 'freezer');
  const isFrozen = item.status === 'frozen';
  const done = (r: A.ActionResult) => {
    app.run(r);
    onClose();
  };

  const rows: [string, string][] = [
    ['위치', app.locOf(item)],
    ['수량', `${item.qty}${p.unit}${item.half ? ' · 절반 남음' : ''}`],
    ['구매', item.purchasedAt ? formatShort(item.purchasedAt) : '-'],
  ];
  if (item.baseAt) rows.push([p.baseLabel ?? '기준일', formatShort(item.baseAt)]);
  if (item.openedAt) rows.push(['개봉', formatShort(item.openedAt)]);
  if (item.frozenAt) rows.push(['냉동 시작', formatShort(item.frozenAt)]);
  if (item.printedExpiry) rows.push(['표기 기한', formatShort(item.printedExpiry)]);
  if (e.date) rows.push(['계산된 기한', `${formatShort(e.date)} · ${e.basis}`]);
  if (app.hh.showEater) rows.push(['등록', app.hh.members.find((m) => m.id === item.createdBy)?.name ?? '-']);

  if (mode === 'refreeze')
    return (
      <Sheet label="재냉동 경고" onClose={onClose} title={<span style={{ color: 'var(--over)' }}>해동한 식품을 다시 얼리나요?</span>}>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--fg-2)' }}>
          {p.name}은(는) 해동된 상태입니다. 재냉동하면 품질과 안전이 떨어집니다. 그래도 옮기면 기한을 7일로 짧게 잡습니다.
        </p>
        <div className="actions">
          <button className="btn" onClick={() => setMode('main')}>
            취소
          </button>
          <button className="btn danger" onClick={() => done(A.freeze(item, app.ctx))}>
            그래도 냉동
          </button>
        </div>
      </Sheet>
    );

  if (mode === 'move') {
    const st = app.hh.storages.find((s) => s.id === moveTo.storageId) ?? app.hh.storages[0];
    return (
      <Sheet label="칸 이동" onClose={onClose} title={`${p.name} 옮기기`}>
        <div className="seg">
          {app.hh.storages.map((s) => (
            <button key={s.id} className={s.id === moveTo.storageId ? 'on' : ''} onClick={() => setMoveTo({ storageId: s.id, compartmentId: s.compartments[0].id })}>
              {s.name}
            </button>
          ))}
        </div>
        <div className="chips">
          {st.compartments.map((c) => (
            <button key={c.id} className={c.id === moveTo.compartmentId ? 'on' : ''} onClick={() => setMoveTo({ storageId: st.id, compartmentId: c.id })}>
              {c.name}
            </button>
          ))}
        </div>
        {st.kind === 'freezer' && !isFrozen && <p className="hint">냉동실로 옮기면 오늘부터 냉동 보관기간으로 다시 계산됩니다.</p>}
        {st.kind !== 'freezer' && isFrozen && <p className="hint">냉장으로 꺼내면 해동 상태가 되어 24시간 기한이 적용됩니다.</p>}
        <div className="actions">
          <button className="btn" onClick={() => setMode('main')}>
            취소
          </button>
          <button className="btn pri" onClick={() => done(A.move(item, moveTo.storageId, moveTo.compartmentId, app.ctx))}>
            옮기기
          </button>
        </div>
      </Sheet>
    );
  }

  if (mode === 'date')
    return (
      <Sheet label="기한 직접 입력" onClose={onClose} title={`${p.name} 기한`}>
        <input className="inp" type="date" value={dateVal} onChange={(ev) => setDateVal(ev.target.value)} aria-label="기한" />
        <p className="hint">직접 정한 기한은 표기·통상 기한보다 우선합니다. 자동 계산으로 되돌릴 수도 있어요.</p>
        <div className="actions">
          <button className="btn" onClick={() => done(A.setManualExpiry(item, null))} disabled={!item.manualExpiry}>
            자동 계산으로
          </button>
          <button className="btn pri" onClick={() => dateVal && done(A.setManualExpiry(item, dateVal))}>
            저장
          </button>
        </div>
      </Sheet>
    );

  const halfOnly = p.qtyType === 'amount' && item.half && item.qty <= 1 && p.unit !== 'g';
  return (
    <Sheet
      label={`${p.name} 상세`}
      onClose={onClose}
      title={
        <>
          {p.name} <Chip e={e} basis />
        </>
      }
    >
      {item.status === 'thawed' && <div className="hint" style={{ color: 'var(--over)' }}>해동된 식품입니다. 24시간 안에 드시고 다시 냉동하지 마세요.</div>}
      <dl className="kv">
        {rows.map(([k, v]) => (
          <div key={k} style={{ display: 'contents' }}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      <div className="actions">
        {p.qtyType === 'count' ? (
          <button className="btn pri" onClick={() => done(A.eat(item, 'one', app.ctx))}>
            1{p.unit} 먹음
          </button>
        ) : halfOnly ? (
          <button className="btn pri" onClick={() => done(A.eat(item, 'all', app.ctx))}>
            다 먹음
          </button>
        ) : (
          <button className="btn pri" onClick={() => done(A.eat(item, 'half', app.ctx))}>
            절반 먹음
          </button>
        )}
        {!halfOnly && (
          <button className="btn" onClick={() => done(A.eat(item, 'all', app.ctx))}>
            다 먹음
          </button>
        )}
        {!p.noExpiry && (
          <button className="btn" onClick={() => done(A.extend(item, 3, app.ctx))}>
            기한 +3일
          </button>
        )}
        {!p.noExpiry && (
          <button className="btn" onClick={() => setMode('date')}>
            기한 직접 입력
          </button>
        )}
        {!item.openedAt && openedDays != null && !isFrozen && (
          <button className="btn" onClick={() => done(A.openIt(item, app.ctx))}>
            오늘 개봉함
          </button>
        )}
        {hasFreezer && !isFrozen && freezerDays != null && (
          <button className="btn" onClick={() => (item.status === 'thawed' ? setMode('refreeze') : done(A.freeze(item, app.ctx)))}>
            냉동으로 이동
          </button>
        )}
        {isFrozen && (
          <button className="btn" onClick={() => done(A.thaw(item, app.ctx))}>
            냉장으로 꺼냄(해동)
          </button>
        )}
        <button className="btn" onClick={() => setMode('move')}>
          칸 이동
        </button>
        <button className="btn danger" onClick={() => done(A.waste(item, app.ctx))}>
          버림
        </button>
        <button className="btn" onClick={onClose}>
          닫기
        </button>
      </div>
    </Sheet>
  );
}
