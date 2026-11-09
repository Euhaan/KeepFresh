import { useState } from 'react';
import { clearStale, eat, extend } from '../domain/actions';
import { presetForItem } from '../domain/expiry';
import { buildSummary, permission, requestPermission, show, type Permission } from '../notify/notifications';
import type { AppApi } from './api';
import { Chip, Sheet } from './components';
import { CatIcon, tintOf } from './icons';

export function NotifSheet({ app, onClose }: { app: AppApi; onClose: () => void }) {
  const { hh } = app;
  const [perm, setPerm] = useState<Permission>(permission());
  const [sent, setSent] = useState<null | boolean>(null);
  const summary = buildSummary(hh, app.ctx);
  const list = hh.items
    .map((it) => ({ it, e: app.exp(it) }))
    .filter((x) => x.e.days != null && x.e.days <= 3)
    .sort((a, b) => a.e.days! - b.e.days!);
  const stale = list.filter((x) => x.e.days! <= -3).length;

  const ask = async () => {
    const p = await requestPermission();
    setPerm(p);
  };
  const preview = async () => setSent(await show(summary, 'kankan-preview'));

  return (
    <Sheet label="알림함" onClose={onClose} title={<>알림함 <span className="hint" style={{ fontWeight: 400 }}>{hh.notifications.morningAt} 아침 요약</span></>}>
      <div className="notif-head">
        <div className="notif-title">{summary.title}</div>
        <div className="hint">{summary.lines.length ? summary.lines.map((l, i) => <div key={i}>{l}</div>) : summary.body}</div>
      </div>

      {stale > 0 && (
        <button className="btn sm danger" onClick={() => { app.run(clearStale(hh, app.ctx)); onClose(); }}>
          3일 넘게 지난 {stale}개 한 번에 정리
        </button>
      )}

      <div className="notif-list">
        {list.map(({ it, e }) => {
          const p = presetForItem(it);
          return (
            <div key={it.id} className="notif-row">
              <button className={`cat tint-${tintOf(p.cat, it.status === 'frozen')}`} onClick={() => { app.openItem(it.id); onClose(); }} aria-label={`${p.name} 상세`}>
                <CatIcon cat={p.cat} />
              </button>
              <div className="txt">
                <div className="nm">
                  {p.name} <small>{it.qty}{p.unit}</small>
                </div>
                <div className="loc">{app.locOf(it)}</div>
              </div>
              <Chip e={e} />
              <div className="quick">
                <button className="btn sm" onClick={() => app.run(eat(it, p.qtyType === 'count' ? 'one' : 'half', app.ctx))} aria-label={`${p.name} 먹음`}>먹음</button>
                {!p.noExpiry && <button className="btn sm" onClick={() => app.run(extend(it, 3, app.ctx))} aria-label={`${p.name} 3일 연장`}>+3일</button>}
              </div>
            </div>
          );
        })}
        {!list.length && <div className="hint" style={{ textAlign: 'center', padding: 12 }}>챙길 품목이 없어요.</div>}
      </div>

      <div className="notif-perm">
        {perm === 'unsupported' && <span className="hint">이 브라우저는 알림을 지원하지 않아요.</span>}
        {perm === 'denied' && <span className="hint">알림이 차단되어 있어요. 브라우저 사이트 설정에서 허용해 주세요.</span>}
        {perm === 'default' && (
          <>
            <span className="hint">아침 {hh.notifications.morningAt}에 이 요약을 알림으로 받으려면 허용이 필요해요.</span>
            <button className="btn pri sm" onClick={ask}>브라우저 알림 켜기</button>
          </>
        )}
        {perm === 'granted' && (
          <>
            <span className="hint">알림 켜짐 · 앱이 열려 있거나 백그라운드일 때 보냅니다. 완전히 닫힌 상태의 푸시는 서버 연결 후 켜져요.</span>
            <button className="btn sm" onClick={preview}>{sent === true ? '보냈어요' : sent === false ? '보내지 못했어요' : '지금 미리보기 보내기'}</button>
          </>
        )}
      </div>
    </Sheet>
  );
}
