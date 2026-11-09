import { useState } from 'react';
import { store } from '../../store/store';

/** 첫 실행 화면. 가정 이름, 내 이름, 함께 쓰는 가족을 정하고 시작한다 */
export function Onboarding() {
  const [household, setHousehold] = useState('');
  const [me, setMe] = useState('');
  const [members, setMembers] = useState<string[]>([]);
  const [draft, setDraft] = useState('');

  const addMember = () => {
    const v = draft.trim();
    if (!v || members.includes(v) || v === me.trim()) return;
    setMembers([...members, v]);
    setDraft('');
  };

  return (
    <div className="onb">
      <div className="onb-logo" aria-hidden="true">
        <svg viewBox="0 0 128 128" width="64" height="64">
          <rect width="128" height="128" rx="28" fill="var(--accent)" />
          <rect x="34" y="18" width="60" height="92" rx="10" fill="#F6F8F7" />
          <rect x="42" y="26" width="44" height="30" rx="4" fill="#D9EFF1" />
          <rect x="42" y="62" width="44" height="40" rx="4" fill="#D9EFF1" />
          <path d="M66 94c0-11 8-18 20-18 0 11-8 18-20 18z" fill="#2E7D4F" />
        </svg>
      </div>
      <h1>킵프레시</h1>
      <p className="onb-sub">가족이 함께 쓰는 냉장고 관리. 몇 가지만 정하고 바로 시작해요.</p>

      <div className="field">
        <label htmlFor="onbHh">가정 이름</label>
        <input id="onbHh" className="inp" placeholder="예: 우리집, 김씨네, 자취방" value={household} onChange={(e) => setHousehold(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="onbMe">내 이름</label>
        <input id="onbMe" className="inp" placeholder="예: 엄마, 지우" value={me} onChange={(e) => setMe(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="onbMem">
          함께 쓰는 가족 <span className="hint">선택 · 나중에 추가해도 돼요</span>
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input id="onbMem" className="inp" placeholder="이름 입력 후 추가" value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addMember()} />
          <button className="btn" onClick={addMember}>
            추가
          </button>
        </div>
        {members.length > 0 && (
          <div className="chips">
            {members.map((m) => (
              <button key={m} className="on" onClick={() => setMembers(members.filter((x) => x !== m))} aria-label={`${m} 제거`}>
                {m} ✕
              </button>
            ))}
          </div>
        )}
      </div>

      <button className="btn pri block" onClick={() => store.completeOnboarding({ householdName: household, meName: me, memberNames: members })}>
        시작하기
      </button>
      <p className="hint" style={{ textAlign: 'center' }}>입력하지 않으면 "우리집"과 "나"로 시작합니다. 가족 탭에서 언제든 바꿀 수 있어요.</p>
    </div>
  );
}
