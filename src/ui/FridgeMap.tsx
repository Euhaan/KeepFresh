import { presetForItem } from '../domain/expiry';
import type { Compartment, Expiry, Item, Storage } from '../domain/types';
import { CatGlyph } from './icons';

interface Props {
  storage: Storage;
  items: Item[];
  exp: (it: Item) => Expiry;
  selected: string | null;
  onSelect: (id: string | null) => void;
}

/**
 * 보관소를 냉장고 단면 그림으로 그린다. 선반마다 담긴 재료 아이콘이 보이고, 임박·지남은 점으로 표시된다.
 * 도어 포켓은 오른쪽에 열린 문으로 그린다. 선반을 누르면 그 칸만 필터된다.
 */
export function FridgeMap({ storage, items, exp, selected, onSelect }: Props) {
  const main = storage.compartments.filter((c) => !c.side);
  const door = storage.compartments.filter((c) => c.side);
  const W = 340;
  const H = Math.max(200, 64 * Math.max(main.length, 2) + 24);
  const hasDoor = door.length > 0;
  const bodyX = 6;
  const bodyY = 6;
  const bodyW = hasDoor ? 236 : W - 12;
  const bodyH = H - 12;
  const pad = 10;
  const doorX = bodyX + bodyW + 10;
  const doorW = W - 6 - doorX;

  const statOf = (c: Compartment) => {
    const its = items.filter((it) => it.compartmentId === c.id);
    const es = its.map(exp).filter((e) => e.days != null);
    return { its, over: es.some((e) => e.days! < 0), soon: es.some((e) => e.days! >= 0 && e.days! <= 3) };
  };

  const glyphColor = (it: Item) => (it.status === 'frozen' ? 'var(--frozen)' : 'var(--fg-2)');

  const Region = ({ c, x, y, w, h, vertical }: { c: Compartment; x: number; y: number; w: number; h: number; vertical?: boolean }) => {
    const s = statOf(c);
    const on = selected === c.id;
    const maxIcons = vertical ? Math.max(1, Math.floor((h - 34) / 26)) : Math.max(1, Math.floor((w - 20) / 26));
    const shown = s.its.slice(0, maxIcons);
    const more = s.its.length - shown.length;
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
        <rect className="fm-bg" x={x} y={y} width={w} height={h} rx={10} />
        {/* 유리 선반 */}
        <rect className="fm-shelf" x={x + 4} y={y + h - 5} width={w - 8} height={3} rx={1.5} />
        <text className="fm-label" x={x + 10} y={y + 18}>
          {c.name}
        </text>
        <g>
          {s.over && <circle cx={x + w - (s.soon ? 34 : 24)} cy={y + 13.5} r={3} fill="var(--over)" />}
          {s.soon && <circle cx={x + w - 24} cy={y + 13.5} r={3} fill="var(--soon)" />}
          <text className="fm-count" x={x + w - 10} y={y + 18} textAnchor="end">
            {s.its.length}
          </text>
        </g>
        {vertical
          ? shown.map((it, i) => <CatGlyph key={it.id} cat={presetForItem(it).cat} x={x + w / 2 - 9} y={y + 26 + i * 26} color={glyphColor(it)} />)
          : shown.map((it, i) => <CatGlyph key={it.id} cat={presetForItem(it).cat} x={x + 10 + i * 26} y={y + h - 32} color={glyphColor(it)} />)}
        {more > 0 && (
          <text className="fm-more" x={vertical ? x + w / 2 : x + 10 + shown.length * 26 + 2} y={vertical ? y + 26 + shown.length * 26 + 14 : y + h - 18} textAnchor={vertical ? 'middle' : 'start'}>
            +{more}
          </text>
        )}
        <rect x={x} y={y} width={w} height={h} rx={10} fill="transparent" />
      </g>
    );
  };

  const shelfH = (bodyH - pad * 2) / Math.max(main.length, 1);
  const pocketH = (bodyH - pad * 2) / Math.max(door.length, 1);

  return (
    <svg className="fm" viewBox={`0 0 ${W} ${H}`} role="group" aria-label={`${storage.name} 칸 배치`}>
      {/* 본체 */}
      <rect className="fm-body" x={bodyX} y={bodyY} width={bodyW} height={bodyH} rx={16} />
      <rect className="fm-inner" x={bodyX + 5} y={bodyY + 5} width={bodyW - 10} height={bodyH - 10} rx={12} />
      {/* 내부 조명 */}
      <rect x={bodyX + 20} y={bodyY + 6} width={bodyW - 40} height={6} rx={3} fill="var(--accent-soft)" opacity={0.9} />
      {main.map((c, i) => (
        <Region key={c.id} c={c} x={bodyX + pad} y={bodyY + pad + i * shelfH + 2} w={bodyW - pad * 2} h={shelfH - 4} />
      ))}
      {hasDoor && (
        <>
          <rect className="fm-body" x={doorX} y={bodyY} width={doorW} height={bodyH} rx={14} />
          <rect className="fm-hinge" x={doorX - 7} y={bodyY + 20} width={4} height={bodyH - 40} rx={2} />
          {door.map((c, i) => (
            <Region key={c.id} c={c} x={doorX + 6} y={bodyY + pad + i * pocketH + 2} w={doorW - 12} h={pocketH - 4} vertical />
          ))}
        </>
      )}
    </svg>
  );
}
