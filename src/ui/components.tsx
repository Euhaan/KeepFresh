import type { ReactNode } from 'react';
import { formatShort } from '../domain/dates';
import { presetForItem } from '../domain/expiry';
import type { Expiry, Item } from '../domain/types';
import type { AppApi } from './api';
import { CatIcon, tintOf } from './icons';

export function Chip({ e, basis }: { e: Expiry; basis?: boolean }) {
  return (
    <>
      <span className={`chip ${e.cls}`}>
        <i className="dot" />
        {e.label}
      </span>
      {basis && e.date && <span className="basis">{e.basis}</span>}
    </>
  );
}

export function CatTile({ cat, frozen, size = 20 }: { cat: string; frozen?: boolean; size?: number }) {
  return (
    <div className={`cat tint-${tintOf(cat, frozen)}`} aria-hidden="true">
      <CatIcon cat={cat} size={size} />
    </div>
  );
}

export function ItemRow({ item, app }: { item: Item; app: AppApi }) {
  const p = presetForItem(item);
  const e = app.exp(item);
  const sub: string[] = [app.locOf(item)];
  if (item.baseAt) sub.push(`${p.baseLabel ?? '기준일'} ${formatShort(item.baseAt)}`);
  else if (item.openedAt) sub.push(`개봉 ${formatShort(item.openedAt)}`);
  else if (item.frozenAt) sub.push(`${formatShort(item.frozenAt)} 냉동`);
  if (item.status === 'thawed') sub.push('해동됨');
  const who = app.hh.showEater ? app.hh.members.find((m) => m.id === item.createdBy)?.name : undefined;
  return (
    <button className="row" onClick={() => app.openItem(item.id)}>
      <CatTile cat={p.cat} frozen={item.status === 'frozen'} />
      <div className="txt">
        <div className="nm">
          {p.name}
          <small>
            {item.qty}
            {p.unit}
            {item.half ? ' · 절반 남음' : ''}
          </small>
          {who && <small>· {who} 등록</small>}
        </div>
        <div className="loc">{sub.join(' · ')}</div>
      </div>
      <Chip e={e} />
    </button>
  );
}

export function Sheet({ title, onClose, children, label }: { title?: ReactNode; onClose: () => void; children: ReactNode; label: string }) {
  return (
    <div className="scrim" onClick={onClose}>
      <div className="sheet" role="dialog" aria-label={label} onClick={(ev) => ev.stopPropagation()}>
        <div className="grab" />
        {title && <h4>{title}</h4>}
        {children}
      </div>
    </div>
  );
}

export function Empty({ title, desc, action, art }: { title: string; desc?: string; action?: ReactNode; art?: ReactNode }) {
  return (
    <div className="empty">
      {art}
      <b>{title}</b>
      {desc && <span>{desc}</span>}
      {action}
    </div>
  );
}

export function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return <button className={`switch ${on ? 'on' : ''}`} role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} />;
}

export function Toggle({ title, desc, children }: { title: string; desc?: string; children: ReactNode }) {
  return (
    <div className="toggle">
      <span>
        {title}
        {desc && <small>{desc}</small>}
      </span>
      {children}
    </div>
  );
}

export const Icon = {
  home: () => (
    <svg viewBox="0 0 24 24">
      <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />
    </svg>
  ),
  fridge: () => (
    <svg viewBox="0 0 24 24">
      <rect x="6" y="3" width="12" height="18" rx="2" />
      <path d="M6 10h12M9 6v2M9 13v3" />
    </svg>
  ),
  plus: () => (
    <svg viewBox="0 0 24 24">
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  recipe: () => (
    <svg viewBox="0 0 24 24">
      <path d="M4 20h16M6 20V9a6 6 0 0 1 12 0v11M9 13h6" />
    </svg>
  ),
  cart: () => (
    <svg viewBox="0 0 24 24">
      <path d="M3 4h2l2.4 11.2a1 1 0 0 0 1 .8h8.6a1 1 0 0 0 1-.8L20 8H6" />
      <circle cx="9" cy="20" r="1" />
      <circle cx="17" cy="20" r="1" />
    </svg>
  ),
  users: () => (
    <svg viewBox="0 0 24 24">
      <circle cx="9" cy="8" r="3" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M3 19a6 6 0 0 1 12 0M15 19a4.5 4.5 0 0 1 6-3.5" />
    </svg>
  ),
  bell: () => (
    <svg viewBox="0 0 24 24">
      <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </svg>
  ),
  search: () => (
    <svg viewBox="0 0 24 24">
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  ),
  chevron: () => (
    <svg viewBox="0 0 24 24">
      <path d="M6 9l6 6 6-6" />
    </svg>
  ),
};
