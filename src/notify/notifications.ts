import { computeExpiry, presetForItem, type ExpiryContext } from '../domain/expiry';
import type { Household } from '../domain/types';

/**
 * 브라우저 알림. 앱이 열려 있거나 백그라운드 탭일 때 설정한 아침 시간에 요약 한 건을 띄운다.
 * 앱이 완전히 닫힌 상태의 푸시는 서버(웹 푸시)가 필요하며 이 모듈의 범위 밖이다.
 */
export type Permission = NotificationPermission | 'unsupported';

export function permission(): Permission {
  if (typeof Notification === 'undefined') return 'unsupported';
  return Notification.permission;
}

export async function requestPermission(): Promise<Permission> {
  if (typeof Notification === 'undefined') return 'unsupported';
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

export interface Summary {
  title: string;
  body: string;
  over: number;
  soon: number;
  today: number;
  lines: string[];
}

export function buildSummary(hh: Household, ctx: ExpiryContext): Summary {
  const dated = hh.items.map((it) => ({ it, e: computeExpiry(it, ctx) })).filter((x) => x.e.days != null);
  const over = dated.filter((x) => x.e.days! < 0);
  const todayList = dated.filter((x) => x.e.days === 0);
  const soon = dated.filter((x) => x.e.days! > 0 && x.e.days! <= 3);
  const lines: string[] = [];
  if (todayList.length) lines.push(`오늘까지: ${todayList.map((x) => presetForItem(x.it).name).join(', ')}`);
  if (soon.length) lines.push(`3일 이내: ${soon.map((x) => `${presetForItem(x.it).name}(D-${x.e.days})`).join(', ')}`);
  if (over.length) lines.push(`지남: ${over.map((x) => presetForItem(x.it).name).join(', ')}`);
  const total = over.length + todayList.length + soon.length;
  const title = total ? `${hh.name} 냉장고 · 챙길 것 ${total}건` : `${hh.name} 냉장고 · 오늘은 여유로워요`;
  return { title, body: lines.join('\n') || '임박하거나 지난 품목이 없습니다.', over: over.length, soon: soon.length, today: todayList.length, lines };
}

export async function show(summary: Summary, tag = 'kankan-morning'): Promise<boolean> {
  if (permission() !== 'granted') return false;
  const opts: NotificationOptions = { body: summary.body, tag, icon: '/icon.svg', badge: '/icon.svg', lang: 'ko' };
  try {
    const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
    if (reg) await reg.showNotification(summary.title, opts);
    else new Notification(summary.title, opts);
    return true;
  } catch {
    return false;
  }
}

function inQuietHours(d: Date): boolean {
  const h = d.getHours();
  return h >= 22 || h < 7;
}

const lastKey = (hhId: string) => `kankan.notif.last.${hhId}`;

/**
 * 1분마다 확인해서 아침 요약 시간이 지났고 오늘 아직 안 보냈으면 한 번 보낸다.
 * 탭이 숨겨져 있어도 동작하고, 앱을 다시 열었을 때도 바로 확인한다.
 */
export function startScheduler(get: () => { hh: Household; ctx: ExpiryContext }): () => void {
  const tick = async () => {
    const { hh, ctx } = get();
    if (permission() !== 'granted') return;
    const now = new Date();
    const [hh24, mm] = hh.notifications.morningAt.split(':').map(Number);
    const due = now.getHours() > hh24 || (now.getHours() === hh24 && now.getMinutes() >= mm);
    if (!due) return;
    if (hh.notifications.quietHours && inQuietHours(now)) return;
    let last: string | null = null;
    try {
      last = localStorage.getItem(lastKey(hh.id));
    } catch {
      /* ignore */
    }
    if (last === ctx.today) return;
    const ok = await show(buildSummary(hh, ctx));
    if (ok) {
      try {
        localStorage.setItem(lastKey(hh.id), ctx.today);
      } catch {
        /* ignore */
      }
    }
  };
  void tick();
  const t = window.setInterval(() => void tick(), 60_000);
  const onVis = () => {
    if (document.visibilityState === 'visible') void tick();
  };
  document.addEventListener('visibilitychange', onVis);
  return () => {
    window.clearInterval(t);
    document.removeEventListener('visibilitychange', onVis);
  };
}
