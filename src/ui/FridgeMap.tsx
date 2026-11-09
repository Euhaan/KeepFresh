import type { ReactNode } from 'react';
import { presetForItem } from '../domain/expiry';
import type { Compartment, Expiry, Item, Storage } from '../domain/types';
import { CatGlyph, tintOf } from './icons';

interface Props {
  storage: Storage;
  items: Item[];
  exp: (it: Item) => Expiry;
  selected: string | null;
  onSelect: (id: string | null) => void;
}

/**
 * 보관소를 냉장고 단면으로 그린다.
 * 외벽 안에 내부 공간이 있고, 칸 사이에는 두께 있는 유리 선반, 맨 아래 칸은 손잡이 달린 서랍,
 * 오른쪽에는 원근감 있게 열린 문과 포켓 바구니. 칸을 누르면 그 칸만 필터된다.
 */
export function FridgeMap({ storage, items, exp, selected, onSelect }: Props) {
  const main = storage.compartments.filter((c) => !c.side);
  const door = storage.compartments.filter((c) => c.side);
  const hasDoor = door.length > 0;
  const W = 340;
  const shelfH = 66;
  const bodyY = 10;
  const wall = 9;
  const bodyH = Math.max(3, main.length) * shelfH + wall * 2 + 6;
  const H = bodyY + bodyH + 14;
  const bodyX = 10;
  const bodyW = hasDoor ? 232 : W - 20;
  const inX = bodyX + wall;
  const inY = bodyY + wall;
  const inW = bodyW - wall * 2;
  const inH = bodyH - wall * 2;
  const rowH = inH / Math.max(main.length, 1);

  const doorX = bodyX + bodyW + 14;
  const doorW = W - 8 - doorX;
  const perspective = 10;

  const statOf = (c: Compartment) => {
    const its = items.filter((it) => it.compartmentId === c.id);
    const es = its.map(exp).filter((e) => e.days != null);
    return { its, over: es.some((e) => e.days! < 0), soon: es.some((e) => e.days! >= 0 && e.days! <= 3) };
  };

  const Glyph = ({ it, cx, cy }: { it: Item; cx: number; cy: number }) => {
    const cat = presetForItem(it).cat;
    const t = tintOf(cat, it.status === 'frozen');
    return (
      <g>
        <circle cx={cx} cy={cy} r={12} fill={`var(--tint-${t})`} stroke="var(--surface)" strokeWidth={1.5} />
        <CatGlyph cat={cat} x={cx - 8.4} y={cy - 8.4} scale={0.7} color={`var(--tint-${t}-fg)`} />
      </g>
    );
  };

  const Hit = ({ c, x, y, w, h, children }: { c: Compartment; x: number; y: number; w: number; h: number; children: ReactNode }) => {
    const s = statOf(c);
    const on = selected === c.id;
    return (
      <g
        className={`fm-region ${on ? 'on' : ''}`}
        role="button"
        tabIndex={0}
        aria-pressed={on}
        aria-label={`${c.name} ${s.its.length}개${s.over ? ', 지난 품목 있음' : s.soon ? ', 임박 품목 있음' : ''}`}
        onClick={() => onSelect(on ? null : c.id)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelect(on ? null : c.id);
          }
        }}
      >
        <rect className="fm-bg" x={x} y={y} width={w} height={h} rx={8} />
        {children}
        <rect x={x} y={y} width={w} height={h} rx={8} fill="transparent" />
      </g>
    );
  };

  const Badge = ({ c, x, y }: { c: Compartment; x: number; y: number }) => {
    const s = statOf(c);
    return (
      <g>
        {s.over && <circle cx={x - (s.soon ? 24 : 14)} cy={y - 4} r={3} fill="var(--over)" />}
        {s.soon && <circle cx={x - 14} cy={y - 4} r={3} fill="var(--soon)" />}
        <text className="fm-count" x={x} y={y} textAnchor="end">
          {s.its.length}
        </text>
      </g>
    );
  };

  return (
    <div className="fm-wrap" style={{ paddingBottom: `${((H / W) * 100).toFixed(3)}%` }}>
    <svg className="fm" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" role="group" aria-label={`${storage.name} 칸 배치`}>
      <defs>
        <linearGradient id="fm-cavity" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: 'var(--surface-2)', stopOpacity: 1 }} />
          <stop offset="1" style={{ stopColor: 'var(--surface-2)', stopOpacity: 0.6 }} />
        </linearGradient>
        <linearGradient id="fm-shell" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" style={{ stopColor: 'var(--surface)', stopOpacity: 1 }} />
          <stop offset="1" style={{ stopColor: 'var(--line)', stopOpacity: 1 }} />
        </linearGradient>
        <linearGradient id="fm-glass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: 'var(--surface)', stopOpacity: 0.95 }} />
          <stop offset="1" style={{ stopColor: 'var(--line-2)', stopOpacity: 0.9 }} />
        </linearGradient>
        <radialGradient id="fm-light" cx="0.5" cy="0" r="0.8">
          <stop offset="0" style={{ stopColor: 'var(--accent-soft)', stopOpacity: 0.95 }} />
          <stop offset="1" style={{ stopColor: 'var(--accent-soft)', stopOpacity: 0 }} />
        </radialGradient>
      </defs>

      {/* 발 */}
      <rect x={bodyX + 18} y={bodyY + bodyH - 2} width={16} height={8} rx={2} fill="var(--line-2)" />
      <rect x={bodyX + bodyW - 34} y={bodyY + bodyH - 2} width={16} height={8} rx={2} fill="var(--line-2)" />

      {/* 외벽과 내부 */}
      <rect x={bodyX} y={bodyY} width={bodyW} height={bodyH} rx={20} fill="url(#fm-shell)" stroke="var(--line-2)" strokeWidth={1.2} />
      <rect x={inX} y={inY} width={inW} height={inH} rx={12} fill="url(#fm-cavity)" />
      <rect x={inX} y={inY} width={inW} height={inH} rx={12} fill="none" stroke="var(--line)" strokeWidth={1} />
      {/* 조명 */}
      <rect x={inX} y={inY} width={inW} height={rowH * 0.9} rx={12} fill="url(#fm-light)" pointerEvents="none" />
      <rect x={inX + inW / 2 - 28} y={inY + 3} width={56} height={4} rx={2} fill="var(--accent-soft)" />

      {/* 선반 칸 */}
      {main.map((c, i) => {
        const y = inY + i * rowH;
        const last = i === main.length - 1;
        const padX = 6;
        const s = statOf(c);
        const maxIcons = Math.max(1, Math.floor((inW - 24) / 30));
        const shown = s.its.slice(0, maxIcons);
        const more = s.its.length - shown.length;
        return (
          <Hit key={c.id} c={c} x={inX + 3} y={y + 3} w={inW - 6} h={rowH - 6}>
            {last && (
              <g pointerEvents="none">
                {/* 야채 서랍: 반투명 앞판 + 손잡이 */}
                <rect x={inX + padX} y={y + 10} width={inW - padX * 2} height={rowH - 16} rx={8} fill="var(--surface)" fillOpacity={0.55} stroke="var(--line-2)" strokeWidth={1} />
                <rect x={inX + inW / 2 - 22} y={y + 15} width={44} height={5} rx={2.5} fill="var(--line-2)" />
              </g>
            )}
            <text className="fm-label" x={inX + 14} y={y + 20}>
              {c.name}
            </text>
            <Badge c={c} x={inX + inW - 14} y={y + 20} />
            {shown.map((it, k) => (
              <Glyph key={it.id} it={it} cx={inX + 26 + k * 30} cy={y + rowH - 24} />
            ))}
            {more > 0 && (
              <text className="fm-more" x={inX + 26 + shown.length * 30 - 6} y={y + rowH - 20}>
                +{more}
              </text>
            )}
            {!last && (
              <g pointerEvents="none">
                {/* 유리 선반: 윗면 하이라이트 + 두께 + 아래 그림자 */}
                <rect x={inX + padX} y={y + rowH - 4} width={inW - padX * 2} height={5} rx={2} fill="url(#fm-glass)" />
                <rect x={inX + padX} y={y + rowH + 1} width={inW - padX * 2} height={6} rx={3} fill="var(--fg)" fillOpacity={0.06} />
              </g>
            )}
          </Hit>
        );
      })}

      {hasDoor && (
        <g>
          {/* 경첩 */}
          <circle cx={doorX - 7} cy={bodyY + 26} r={3} fill="var(--line-2)" />
          <circle cx={doorX - 7} cy={bodyY + bodyH - 26} r={3} fill="var(--line-2)" />
          {/* 열린 문: 안쪽이 보이도록 원근 */}
          <polygon
            points={`${doorX},${bodyY + 2} ${doorX + doorW},${bodyY + perspective} ${doorX + doorW},${bodyY + bodyH - perspective} ${doorX},${bodyY + bodyH - 2}`}
            fill="url(#fm-shell)"
            stroke="var(--line-2)"
            strokeWidth={1.2}
            strokeLinejoin="round"
          />
          <polygon
            points={`${doorX + 6},${bodyY + 10} ${doorX + doorW - 6},${bodyY + perspective + 7} ${doorX + doorW - 6},${bodyY + bodyH - perspective - 7} ${doorX + 6},${bodyY + bodyH - 10}`}
            fill="url(#fm-cavity)"
            strokeLinejoin="round"
          />
          {/* 손잡이 */}
          <rect x={doorX + doorW - 4} y={bodyY + bodyH / 2 - 26} width={4} height={52} rx={2} fill="var(--line-2)" />
          {door.map((c, i) => {
            const pocketH = (bodyH - 36) / door.length;
            const y = bodyY + 18 + i * pocketH;
            const px = doorX + 10;
            const pw = doorW - 20;
            const s = statOf(c);
            const maxIcons = Math.max(1, Math.floor((pocketH - 34) / 28));
            const shown = s.its.slice(0, maxIcons);
            const more = s.its.length - shown.length;
            return (
              <Hit key={c.id} c={c} x={px - 3} y={y} w={pw + 6} h={pocketH - 6}>
                <text className="fm-label" x={px + 4} y={y + 16}>
                  {c.name}
                </text>
                <Badge c={c} x={px + pw - 2} y={y + 16} />
                {shown.map((it, k) => (
                  <Glyph key={it.id} it={it} cx={px + pw / 2} cy={y + 36 + k * 28} />
                ))}
                {more > 0 && (
                  <text className="fm-more" x={px + pw / 2} y={y + 36 + shown.length * 28 + 4} textAnchor="middle">
                    +{more}
                  </text>
                )}
                {/* 포켓 바구니 테두리 */}
                <g pointerEvents="none">
                  <rect x={px} y={y + pocketH - 18} width={pw} height={12} rx={4} fill="var(--surface)" fillOpacity={0.7} stroke="var(--line-2)" strokeWidth={1} />
                  <rect x={px} y={y + pocketH - 18} width={pw} height={3} rx={1.5} fill="var(--line-2)" />
                </g>
              </Hit>
            );
          })}
        </g>
      )}
    </svg>
    </div>
  );
}
