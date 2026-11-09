import { useState } from 'react';
import { PRESET_MAP } from '../../domain/presets';
import type { NotificationSettings } from '../../domain/types';
import { buildSummary, permission, requestPermission, show, type Permission } from '../../notify/notifications';
import { store } from '../../store/store';
import { useStoreState } from '../../store/useStore';
import type { AppApi } from '../api';
import { Switch, Toggle } from '../components';

const ROLE_LABEL = { owner: '관리자', member: '구성원', viewer: '보기 전용' } as const;

export function Family({ app }: { app: AppApi }) {
  const { hh, households } = app;
  const { syncStatus } = useStoreState();
  const [resetArmed, setResetArmed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [perm, setPerm] = useState<Permission>(permission());
  const n = hh.notifications;
  const inviteCode = 'KX7-4P2';

  const patchNotif = (patch: Partial<NotificationSettings>) =>
    app.run({ events: [{ type: 'SETTINGS_PATCH', patch: { notifications: { ...n, ...patch } } }], inverse: [{ type: 'SETTINGS_PATCH', patch: { notifications: n } }], message: '알림 설정을 바꿨어요' });

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const permLabel = perm === 'granted' ? '켜짐' : perm === 'denied' ? '차단됨 · 브라우저 설정에서 허용' : perm === 'unsupported' ? '이 브라우저는 지원 안 함' : '꺼짐';

  return (
    <>
      <div className="card">
        <div className="card-title">내 가정</div>
        <div className="seg">
          {households.map((h) => (
            <button key={h.id} className={h.id === hh.id ? 'on' : ''} onClick={() => store.switchHousehold(h.id)}>
              {h.name}
            </button>
          ))}
        </div>
        <p className="hint" style={{ marginTop: 8 }}>
          가정을 바꾸면 품목, 칸, 장보기, 설정이 모두 그 가정 것으로 바뀝니다. 다른 가정의 데이터는 서버 정책으로 차단되어 조회 자체가 안 됩니다.
        </p>
      </div>

      <div className="card">
        <div className="card-title">
          구성원 {hh.members.length}명 <span className="hint">이 기기에서 나는 {app.meName}</span>
        </div>
        {hh.members.map((m) => (
          <div key={m.id} className="member">
            <div className="avatar">{m.name[0]}</div>
            <span>{m.name}</span>
            {m.id === app.me ? (
              <span className="hint">나</span>
            ) : (
              <button className="link" onClick={() => store.setMe(hh.id, m.id)}>
                나로 설정
              </button>
            )}
            <span className="role">{ROLE_LABEL[m.role]}</span>
          </div>
        ))}
        <div style={{ marginTop: 12, display: 'grid', gap: 6 }}>
          <span className="hint">초대 코드 · 24시간 뒤 만료 (서버 연결 전에는 예시)</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span className="code">{inviteCode}</span>
            <button className="btn sm" onClick={copy}>
              {copied ? '복사했어요' : '코드 복사'}
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">알림</div>
        <Toggle title="브라우저 알림" desc={permLabel}>
          {perm === 'default' && (
            <button className="btn sm pri" onClick={async () => setPerm(await requestPermission())}>
              켜기
            </button>
          )}
          {perm === 'granted' && (
            <button className="btn sm" onClick={() => void show(buildSummary(hh, app.ctx), 'kankan-preview')}>
              미리보기
            </button>
          )}
        </Toggle>
        <Toggle title="아침 요약" desc="하루 한 번, 임박·지남을 묶어서">
          <select className="inp" style={{ width: 'auto', minHeight: 40, padding: '6px 10px' }} value={n.morningAt} onChange={(e) => patchNotif({ morningAt: e.target.value })} aria-label="아침 요약 시간">
            {['06:30', '07:00', '07:30', '08:00', '08:30', '09:00'].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </Toggle>
        <Toggle title="품목별 개별 알림" desc="켜도 하루 최대 2건 · 서버 연결 후 동작">
          <Switch on={n.perItem} onChange={(v) => patchNotif({ perItem: v })} label="품목별 알림" />
        </Toggle>
        <Toggle title="조용한 시간" desc="22:00부터 07:00까지 알림 없음">
          <Switch on={n.quietHours} onChange={(v) => patchNotif({ quietHours: v })} label="조용한 시간" />
        </Toggle>
        <Toggle title="먹은 사람 표시" desc='끄면 "누군가 먹음"으로만 보여요'>
          <Switch
            on={hh.showEater}
            onChange={(v) => app.run({ events: [{ type: 'SETTINGS_PATCH', patch: { showEater: v } }], inverse: [{ type: 'SETTINGS_PATCH', patch: { showEater: hh.showEater } }], message: v ? '먹은 사람을 표시해요' : '먹은 사람을 숨겼어요' })}
            label="먹은 사람 표시"
          />
        </Toggle>
        <p className="hint" style={{ marginTop: 8 }}>
          아침 요약은 앱이 열려 있거나 백그라운드 탭일 때 이 기기에서 보냅니다. 앱을 완전히 닫은 상태의 푸시는 서버 연결 후 켜집니다.
        </p>
      </div>

      <div className="card">
        <div className="card-title">
          식품 사전 덮어쓰기 <span className="hint">이 가정만</span>
        </div>
        {Object.entries(hh.overrides).map(([k, o]) => {
          const p = PRESET_MAP[k];
          if (!p) return null;
          const cur = o.fridgeDays ?? p.fridgeDays ?? 0;
          const setDays = (d: number) =>
            app.run({
              events: [{ type: 'OVERRIDE_SET', presetKey: k, override: { ...o, fridgeDays: Math.max(1, cur + d) } }],
              inverse: [{ type: 'OVERRIDE_SET', presetKey: k, override: o }],
              message: `${p.name} 기준을 ${Math.max(1, cur + d)}일로 바꿨어요. 이 가정에만 적용`,
            });
          return (
            <Toggle key={k} title={p.name} desc={`공용 ${p.fridgeDays}일 → 우리집 ${cur}일 (냉장)`}>
              <div className="stepper" style={{ transform: 'scale(.85)', transformOrigin: 'right' }}>
                <button aria-label="5일 줄이기" onClick={() => setDays(-5)}>
                  −
                </button>
                <span className="num">{cur}일</span>
                <button aria-label="5일 늘리기" onClick={() => setDays(5)}>
                  +
                </button>
              </div>
            </Toggle>
          );
        })}
        <p className="hint" style={{ marginTop: 8 }}>
          값을 바꾸면 이 가정의 해당 품목 기한이 즉시 다시 계산됩니다. 공용 사전은 바뀌지 않습니다.
        </p>
      </div>

      <div className="card">
        <div className="card-title">칸 구성</div>
        {hh.storages.map((s) => (
          <Toggle key={s.id} title={s.name} desc={s.compartments.map((c) => c.name).join(' · ')}>
            <span className="hint">관리자만 편집</span>
          </Toggle>
        ))}
      </div>

      <div className="card">
        <div className="card-title">데이터</div>
        <Toggle title="동기화" desc={syncStatus === 'off' ? 'Supabase 미연결 · 이 기기에만 저장' : syncStatus === 'online' ? '연결됨' : syncStatus === 'connecting' ? '연결 중' : '연결 오류 · 변경은 기기에 쌓였다가 다시 보냅니다'}>
          <span className={`sync ${syncStatus}`}>
            <i />
          </span>
        </Toggle>
        <Toggle title="데모 데이터로 초기화" desc="이 기기의 모든 변경 기록을 지웁니다">
          {resetArmed ? (
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn sm" onClick={() => setResetArmed(false)}>
                취소
              </button>
              <button
                className="btn sm danger"
                onClick={() => {
                  store.resetDemo();
                  setResetArmed(false);
                }}
              >
                지우기
              </button>
            </div>
          ) : (
            <button className="btn sm" onClick={() => setResetArmed(true)}>
              초기화
            </button>
          )}
        </Toggle>
      </div>
    </>
  );
}
