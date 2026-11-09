import { useState } from 'react';
import { shopAdd, shopRemove, shopToggle } from '../../domain/actions';
import { searchPresets } from '../../domain/presets';
import type { AppApi } from '../api';
import { Empty } from '../components';

export function Shopping({ app }: { app: AppApi }) {
  const { hh } = app;
  const [text, setText] = useState('');
  const list = hh.shopping;
  const checked = list.filter((s) => s.checked);

  const add = () => {
    const v = text.trim();
    if (!v) return;
    const p = searchPresets(v, 1)[0];
    app.run(shopAdd(p && p.name === v ? p.name : v, p && p.name === v ? p.key : undefined, app.ctx));
    setText('');
  };

  const putIn = () => {
    const first = checked[0];
    if (!first) return;
    // 첫 항목은 목록에서 빼고 등록 폼으로, 나머지가 있으면 장본 날 모드
    app.run(shopRemove(first));
    app.go('add', { prefill: { presetKey: first.presetKey, name: first.name, batch: checked.length > 1 } });
  };

  return (
    <>
      <div className="card">
        <div className="card-title">
          장보기 <span className="hint">{list.length}개 · 가족 공유</span>
        </div>
        {list.length ? (
          list.map((s) => (
            <div key={s.id} className={`check ${s.checked ? 'on' : ''}`} style={{ display: 'flex' }}>
              <button className="box" aria-label={s.checked ? '체크 해제' : '체크'} role="checkbox" aria-checked={s.checked} onClick={() => app.run(shopToggle(s))} style={{ background: s.checked ? 'var(--accent)' : 'transparent' }}>
                {s.checked ? '✓' : ''}
              </button>
              <span className="label" style={{ flex: 1 }}>
                {s.name}
                <small>{s.auto ? '다 먹어서 자동 추가' : `${hh.members.find((m) => m.id === s.addedBy)?.name ?? '누군가'} 추가`}</small>
              </span>
              <button className="x" aria-label="목록에서 빼기" onClick={() => app.run(shopRemove(s))}>
                ✕
              </button>
            </div>
          ))
        ) : (
          <Empty title="장보기 목록이 비었어요" desc="품목을 다 먹거나 버리면 자동으로 올라옵니다." />
        )}
      </div>
      {checked.length > 0 && (
        <button className="btn pri block" onClick={putIn}>
          체크한 {checked.length}개 냉장고에 넣기
        </button>
      )}
      <div className="field">
        <label htmlFor="shopInp">직접 추가</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input id="shopInp" className="inp" placeholder="예: 참기름" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
          <button className="btn" onClick={add}>
            추가
          </button>
        </div>
      </div>
    </>
  );
}
