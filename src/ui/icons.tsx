/**
 * 분류별 선 아이콘. 24×24 격자, stroke 기반이라 색은 부모의 currentColor를 따른다.
 * SVG 안(냉장고 그림)과 HTML 타일 양쪽에서 같은 경로를 쓴다.
 */
export const CAT_PATHS: Record<string, string[]> = {
  계란: ['M12 3c-3.5 0-6 4.6-6 9.2a6 6 0 0 0 12 0C18 7.6 15.5 3 12 3z'],
  유제품: ['M8 3h8l2 4v14H6V7z', 'M6 7h14', 'M8 3l2 4v14', 'M12 12h4'],
  '두부/콩': ['M4 9l8-4 8 4v8l-8 4-8-4z', 'M4 9l8 4 8-4', 'M12 13v8'],
  육류: ['M14.5 3a6 6 0 0 1 4.2 10.2l-5 5-1.4-1.4-2.3 2.3a2 2 0 1 1-2.8-2.8l2.3-2.3-1.4-1.4 5-5A6 6 0 0 1 14.5 3z'],
  가공육: ['M4 9h16v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z', 'M4 9c0-2.2 3.6-4 8-4s8 1.8 8 4', 'M8 14h8'],
  생선: ['M2.5 12c3-5 8-7 12-6 2 .8 4 2.8 5 6-1 3.2-3 5.2-5 6-4 1-9-1-12-6z', 'M19.5 12l2.5-4-5 4 5 4z', 'M8 11h.01'],
  해산물: ['M6 13a6 6 0 0 1 12 0c0 3-2 5-5 5H9', 'M18 13l3-3', 'M18 13l3 3', 'M9 18v3', 'M13 18v3'],
  통조림: ['M5 6v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6', 'M5 6a7 2.2 0 0 0 14 0 7 2.2 0 0 0-14 0', 'M8 12h8'],
  채소: ['M5 19C5 10 11 5 20 5c0 9-5 15-14 15z', 'M5 19l9-9'],
  과일: ['M12 7.5c-4-3-9 .5-8 6 .9 5 4 8 8 8s7.1-3 8-8c1-5.5-4-9-8-6z', 'M12 7.5V4', 'M12 4c1.5-.3 3 .5 4 2'],
  김치: ['M8 3.5h8V6H8z', 'M7 6h10l1 3v9a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3V9z', 'M9.5 12.5h5'],
  반찬: ['M3 13h18a9 9 0 0 1-18 0z', 'M6.5 13a5.5 3.5 0 0 1 11 0', 'M12 7.5v2'],
  곡물: ['M3 12h18a9 6.5 0 0 1-18 0z', 'M7.5 12c0-3 2-5 4.5-5s4.5 2 4.5 5', 'M12 4v3'],
  면: ['M4 10h16', 'M4 14h16', 'M4 18h16', 'M8 10V5', 'M12 10V4', 'M16 10V5'],
  냉동식품: ['M12 2v20', 'M2 12h20', 'M5 5l14 14', 'M19 5L5 19'],
  가루: ['M7 4h10l2 4v12H5V8z', 'M9 4v4', 'M15 4v4', 'M9 14h6'],
  소스: ['M10 2h4v4l2 2v12a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2V8l2-2z', 'M8 12h8'],
  장류: ['M5 9h14v8a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4z', 'M3 9h18', 'M8 5h8v4H8z'],
  기름: ['M11 2h2v5l3 3v10a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2V10l3-3z'],
  음료: ['M7 4h10v16a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2z', 'M7 4a5 1.5 0 0 0 10 0', 'M9.5 9h5'],
  기타: ['M4 7h16v12H4z', 'M4 7l2-3h12l2 3'],
};

export type Tint = 'green' | 'blue' | 'rose' | 'sand' | 'violet' | 'ice' | 'plain';

export function tintOf(cat: string, frozen = false): Tint {
  if (frozen) return 'ice';
  if (['채소', '과일'].includes(cat)) return 'green';
  if (['유제품', '계란', '두부/콩'].includes(cat)) return 'blue';
  if (['육류', '가공육', '생선', '해산물'].includes(cat)) return 'rose';
  if (['곡물', '면', '가루', '통조림', '반찬'].includes(cat)) return 'sand';
  if (['김치', '소스', '장류', '기름', '음료'].includes(cat)) return 'violet';
  if (cat === '냉동식품') return 'ice';
  return 'plain';
}

export function CatIcon({ cat, size = 20 }: { cat: string; size?: number }) {
  const paths = CAT_PATHS[cat] ?? CAT_PATHS['기타'];
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}

/** SVG 내부에서 쓰는 경로 그룹 */
export function CatGlyph({ cat, x, y, scale = 0.75, color }: { cat: string; x: number; y: number; scale?: number; color: string }) {
  const paths = CAT_PATHS[cat] ?? CAT_PATHS['기타'];
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} fill="none" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
      {paths.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </g>
  );
}

/** 빈 상태용 작은 삽화: 열린 냉장고 */
export function EmptyArt() {
  return (
    <svg viewBox="0 0 120 90" width="120" height="90" fill="none" stroke="var(--fg-3)" strokeWidth={1.6} strokeLinecap="round" aria-hidden="true">
      <rect x="22" y="6" width="56" height="78" rx="8" fill="var(--surface-2)" />
      <path d="M22 34h56" />
      <path d="M30 20v8M30 44v10" />
      <path d="M78 10l24 6v62l-24 6" fill="var(--surface)" />
      <path d="M94 36v8" />
      <ellipse cx="50" cy="60" rx="10" ry="3" stroke="var(--accent)" />
    </svg>
  );
}
