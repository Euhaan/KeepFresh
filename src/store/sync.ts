import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { KanEvent } from '../domain/events';

/**
 * Supabase 동기화 어댑터. 환경변수가 없으면 null을 돌려주고 앱은 기기 안에서만 동작한다.
 * 서버의 events 표는 추가 전용이다. 기기는 자기 이벤트를 올리고 남의 이벤트를 받아 재생한다.
 * RLS 정책은 supabase/migrations 참고. 아직 실제 프로젝트에 대고 검증하지 않았다.
 */
export interface Sync {
  push(events: KanEvent[]): Promise<void>;
  subscribe(householdIds: string[], onEvents: (events: KanEvent[]) => void, onStatus: (s: 'connecting' | 'online' | 'error') => void): void;
}

interface Row {
  id: string;
  household_id: string;
  txn: string;
  at: string;
  by_member: string;
  type: string;
  body: Record<string, unknown>;
}

function toRow(e: KanEvent): Row {
  const { id, householdId, txn, at, by, type, ...body } = e;
  return { id, household_id: householdId, txn, at, by_member: by, type, body };
}

function fromRow(r: Row): KanEvent {
  return { id: r.id, householdId: r.household_id, txn: r.txn, at: r.at, by: r.by_member, type: r.type, ...r.body } as KanEvent;
}

export function createSync(): Sync | null {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (!url || !key) return null;
  const client: SupabaseClient = createClient(url, key);
  const pending: KanEvent[] = [];
  let flushing = false;

  async function flush() {
    if (flushing || !pending.length) return;
    flushing = true;
    try {
      const batch = pending.splice(0, pending.length);
      const { error } = await client.from('events').upsert(batch.map(toRow), { onConflict: 'id' });
      if (error) {
        pending.unshift(...batch);
        setTimeout(flush, 5000);
      }
    } finally {
      flushing = false;
    }
  }

  return {
    async push(events) {
      pending.push(...events);
      await flush();
    },
    subscribe(householdIds, onEvents, onStatus) {
      onStatus('connecting');
      void (async () => {
        const { data, error } = await client.from('events').select('*').in('household_id', householdIds).order('at');
        if (error) return onStatus('error');
        onEvents((data as Row[]).map(fromRow));
        onStatus('online');
      })();
      for (const hid of householdIds) {
        client
          .channel(`events:${hid}`)
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'events', filter: `household_id=eq.${hid}` }, (payload) => {
            onEvents([fromRow(payload.new as Row)]);
          })
          .subscribe((status) => {
            if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') onStatus('error');
          });
      }
    },
  };
}
