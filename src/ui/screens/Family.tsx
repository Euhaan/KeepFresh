import { useState } from 'react';
import { PRESET_MAP } from '../../domain/presets';
import type { NotificationSettings } from '../../domain/types';
import { buildSummary, permission, requestPermission, show, type Permission } from '../../notify/notifications';
import { newId, store } from '../../store/store';
import { useStoreState } from '../../store/useStore';
import type { AppApi } from '../api';
import { Switch, Toggle } from '../components';

const ROLE_LABEL = { owner: '관리자', member: '구성원', viewer: '보기 전용' } as const;

export function Family({ app }: { app: AppApi }) {
  const { hh, households } = app;
  const { syncStatus } = useStoreState();
  const [resetArmed, setResetArmed] = useState(false);
  const [removeArmed, setRemoveArmed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [perm, setPerm] = useState<Permission>(permission());
  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState(hh.name);
  const [newHh, setNewHh] = useState('');
  const [addingHh, setAddingHh] = useState(false);
  const [memberDraft, setMemberDraft] = useState('');
  const [editingMe, setEditingMe] = useState(false);
  const [meDraft, setMeDraft] = useState(app.meName);
  const n = hh.notifications;
  const inviteCode = 'KX7-4P2';

  const patchNotif = (patch: Partial<NotificationSettings>) =>
    app.run({ events: [{ type: 'SETTINGS_PATCH', patch: { notifications: { ...n, ...patch } } }], inverse: [{ type: 'SETTINGS_PATCH', patch: { notifications: n } }], message: '알림 설정을 바꿨어요' });

  const rename = () => {
    const v = nameDraft.trim();
    if (v && v !== hh.name) app.run({ events: [{ type: 'SETTINGS_PATCH', patch: { name: v } }], inverse: [{ type: 'SETTINGS_PATCH', patch: { name: hh.name } }], message: `가정 이름을 ${v}(으)로 바꿨어요` });
    setRenaming(false);
  };

  const renameMe = () => {
    const v = meDraft.trim();
    if (v && v !== app.meName) app.run({ events: [{ type: 'MEMBER_RENAME', memberId: app.me, name: v }], inverse: [{ type: 'MEMBER_RENAME', memberId: app.me, name: app.meName }], message: `내 이름을 ${v}(으)로 바꿨어요` });
    setEditingMe(false);
  };

  const addMember = () => {
    const v = memberDraft.trim();
    if (!v) return;
    if (hh.members.some((m) => m.name === v)) return setMemberDraft('');
    const member = { id: newId('m'), name: v, role: 'member' as const };
    app.run({ events: [{ type: 'MEMBER_ADD', member }], inverse: [{ type: 'MEMBER_REMOVE', memberId: member.id }], message: `${v}을(를) 가족에 추가했어요` });
    setMemberDraft('');
  };

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
        <div className="card-title">
          내 가정
          <button className="link" onClick={() => setAddingHh((v) => !v)}>
            {addingHh ? '취소' : '+ 가정 추가'}
          </button>
        </div>
        <div className="seg">
          {households.map((h) => (
            <button key={h.id} className={h.id === hh.id ? 'on' : ''} onClick={() => store.switchHousehold(h.id)}>
              {h.name}
            </button>
          ))}
        </div>
        {addingHh && (
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <input className="inp" placeholder="예: 본가, 자취방" value={newHh} onChange={(e) => setNewHh(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && newHh.trim() && (store.addHousehold(newHh), setNewHh(''), setAddingHh(false))} aria-label="새 가정 이름" />
            <button
              className="btn pri"
              disabled={!newHh.trim()}
              onClick={() => {
                store.addHousehold(newHh);
                setNewHh('');
                setAddingHh(false);
              }}
            >
              만들기
            </button>
          </div>
        )}
        <Toggle title={hh.name} desc="현재 가정 이름">
          {renaming ? (
            <div style={{ display: 'flex', gap: 6 }}>
              <input className="inp" style={{ minHeight: 40, width: 140 }} value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && rename()} aria-label="가정 이름" autoFocus />
              <button className="btn sm pri" onClick={rename}>
                저장
              </button>
            </div>
          ) : (
            <button
              className="btn sm"
              onClick={() => {
                setNameDraft(hh.name);
                setRenaming(true);
              }}
            >
              이름 바꾸기
            </button>
          )}
        </Toggle>
        {households.length > 1 && (
          <Toggle title="이 가정 삭제" desc="이 기기에서 가정과 기록을 지웁니다">
            {removeArmed ? (
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn sm" onClick={() => setRemoveArmed(false)}>
                  취소
                </button>
                <button
                  className="btn sm danger"
                  onClick={() => {
                    store.removeHousehold(hh.id);
                    setRemoveArmed(false);
                  }}
                >
                  삭제
                </button>
              </div>
            ) : (
              <button className="btn sm danger" onClick={() => setRemoveArmed(true)}>
                삭제
              </button>
            )}
          </Toggle>
        )}
        <p className="hint" style={{ marginTop: 8 }}>
          가정을 바꾸면 품목, 칸, 장보기, 설정이 모두 그 가정 것으로 바뀝니다. 가정끼리 데이터는 완전히 분리됩니다.
        </p>
      </div>

      <div className="card">
        <div className="card-title">
          구성원 {hh.members.length}명 <span className="hint">이 기기에서 나는 {app.meName}</span>
        </div>
        {hh.members.map((m) => (
          <div key={m.id} className="member">
            <div className="avatar">{m.name[0]}</div>
            {m.id === app.me && editingMe ? (
              <input className="inp" style={{ minHeight: 38, flex: 1 }} value={meDraft} onChange={(e) => setMeDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && renameMe()} onBlur={renameMe} aria-label="내 이름" autoFocus />
            ) : (
              <span>{m.name}</span>
            )}
            {m.id === app.me ? (
              <button
                className="link"
                onClick={() => {
                  setMeDraft(m.name);
                  setEditingMe(true);
                }}
              >
                나 · 이름 바꾸기
              </button>
            ) : (
              <>
                <button className="link" onClick={() => store.setMe(hh.id, m.id)}>
                  나로 설정
                </button>
                <button className="link" style={{ color: 'var(--over)' }} onClick={() => app.run({ events: [{ type: 'MEMBER_REMOVE', memberId: m.id }], inverse: [{ type: 'MEMBER_ADD', member: m }], message: `${m.name}을(를) 가족에서 뺐어요` })} aria-label={`${m.name} 삭제`}>
                  삭제
                </button>
              </>
            )}
            <span className="role">{ROLE_LABEL[m.role]}</span>
          </div>
        ))}
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <input className="inp" placeholder="가족 이름 추가" value={memberDraft} onChange={(e) => setMemberDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addMember()} aria-label="가족 이름" />
          <button className="btn" onClick={addMember} disabled={!memberDraft.trim()}>
            추가
          </button>
        </div>
        <div style={{ marginTop: 12, display: 'grid', gap: 6 }}>
          <span className="hint">초대 코드 · 서버 연결 후 실제로 동작하는 예시입니다</span>
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
            <button className="btn sm" onClick={() => void show(buildSummary(hh, app.ctx), 'keepfresh-preview')}>
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

      {Object.keys(hh.overrides).length > 0 && (
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
        </div>
      )}

      <div className="card">
        <div className="card-title">칸 구성</div>
        {hh.storages.map((s) => (
          <Toggle key={s.id} title={s.name} desc={s.compartments.map((c) => c.name).join(' · ')}>
            <span className="hint">편집은 다음 버전</span>
          </Toggle>
        ))}
      </div>

      <div className="card">
        <div className="card-title">데이터</div>
        <Toggle title="동기화" desc={syncStatus === 'off' ? '서버 미연결 · 이 기기에만 저장' : syncStatus === 'online' ? '연결됨' : syncStatus === 'connecting' ? '연결 중' : '연결 오류 · 변경은 기기에 쌓였다가 다시 보냅니다'}>
          <span className={`sync ${syncStatus}`}>
            <i />
          </span>
        </Toggle>
        <Toggle title="모든 데이터 지우기" desc="이 기기의 가정, 품목, 기록을 모두 지우고 처음 화면으로 돌아갑니다">
          {resetArmed ? (
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn sm" onClick={() => setResetArmed(false)}>
                취소
              </button>
              <button
                className="btn sm danger"
                onClick={() => {
                  store.resetAll();
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
