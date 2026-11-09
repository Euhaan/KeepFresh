import { useEffect, useMemo, useState } from 'react';
import * as A from '../../domain/actions';
import { addDays, formatShort } from '../../domain/dates';
import { computeExpiry } from '../../domain/expiry';
import { findPreset, searchPresets } from '../../domain/presets';
import type { Item, Preset } from '../../domain/types';
import type { AppApi } from '../api';
import { Chip, Sheet, Switch, Toggle } from '../components';
import { CatIcon, tintOf } from '../icons';

type ExpiryMode = 'auto' | '+3' | '+7' | '+14' | '+30' | 'manual';

interface Form {
  name: string;
  preset: Preset | null;
  custom: boolean;
  qty: number;
  storageId: string;
  compartmentId: string;
  purchasedAt: string;
  purchasedCustom: boolean;
  expiryMode: ExpiryMode;
  manual: string;
  printed: string;
  base: string;
  opened: boolean;
}

export function Add({ app }: { app: AppApi }) {
  const { hh, today, nav } = app;
  const first = hh.storages[0];

  const empty = (): Form => ({
    name: '',
    preset: null,
    custom: false,
    qty: 1,
    storageId: first.id,
    compartmentId: first.compartments[0].id,
    purchasedAt: today,
    purchasedCustom: false,
    expiryMode: 'auto',
    manual: '',
    printed: '',
    base: '',
    opened: false,
  });

  const [f, setF] = useState<Form>(empty);
  const [batch, setBatch] = useState(false);
  const [batchCount, setBatchCount] = useState(0);
  const [dup, setDup] = useState<{ existing: Item } | null>(null);
  const set = (patch: Partial<Form>) => setF((prev) => ({ ...prev, ...patch }));

  const applyPreset = (p: Preset, base?: Form) => {
    const b = base ?? f;
    const prev = hh.items.find((it) => it.presetKey === p.key);
    const storage = prev ? hh.storages.find((s) => s.id === prev.storageId) : hh.storages.find((s) => s.kind === p.defaultStorage);
    const st = storage ?? first;
    const comp = prev ? st.compartments.find((c) => c.id === prev.compartmentId) : st.compartments.find((c) => c.hint === p.hint);
    setF({
      ...b,
      name: p.name,
      preset: p,
      custom: false,
      qty: p.defaultQty,
      storageId: st.id,
      compartmentId: (comp ?? st.compartments[0]).id,
      expiryMode: 'auto',
      manual: '',
      printed: '',
      base: '',
      opened: false,
    });
  };

  // 장보기에서 넘어온 경우 등 미리 채우기
  useEffect(() => {
    const pre = nav.prefill;
    if (!pre) return;
    const base = empty();
    if (pre.batch) setBatch(true);
    const p = pre.presetKey ? findPreset(pre.presetKey) : undefined;
    if (p) applyPreset(p, base);
    else setF({ ...base, name: pre.name ?? '', custom: !!pre.name });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nav.key]);

  const st = hh.storages.find((s) => s.id === f.storageId) ?? first;
  const q = f.name.trim();
  const sugg = useMemo(() => (q && !f.preset && !f.custom ? searchPresets(q) : []), [q, f.preset, f.custom]);
  const presetKey = f.preset?.key ?? (f.custom && q ? `custom_${q}` : '');

  const manualFor = () => (f.expiryMode === 'manual' ? f.manual || null : f.expiryMode === 'auto' ? null : addDays(today, parseInt(f.expiryMode.slice(1), 10)));

  const preview = useMemo(() => {
    if (!presetKey) return null;
    const draft: Item = A.buildItem(
      {
        presetKey,
        customName: f.custom ? q : undefined,
        qty: f.qty,
        storageId: f.storageId,
        compartmentId: f.compartmentId,
        purchasedAt: f.purchasedAt,
        baseAt: f.base || null,
        printedExpiry: f.printed || null,
        manualExpiry: manualFor(),
        opened: f.opened,
      },
      { ...app.ctx, newId: () => 'draft' },
    );
    return computeExpiry(draft, app.ctx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetKey, f, q, today, app.ctx]);

  const unit = f.preset?.unit ?? '개';
  const step = f.preset?.qtyType === 'amount' && unit === 'g' ? 100 : 1;

  const save = (force = false) => {
    if (!presetKey) return;
    const input: A.AddInput = {
      presetKey,
      customName: f.custom ? q : undefined,
      qty: f.qty,
      storageId: f.storageId,
      compartmentId: f.compartmentId,
      purchasedAt: f.purchasedAt,
      baseAt: f.base || null,
      printedExpiry: f.printed || null,
      manualExpiry: manualFor(),
      opened: f.opened,
    };
    if (!force) {
      const existing = A.findDuplicate(input, hh);
      if (existing) return setDup({ existing });
    }
    finish(A.addItem(input, app.ctx));
  };

  const finish = (r: A.ActionResult) => {
    app.run(r);
    setDup(null);
    if (batch) {
      setBatchCount((n) => n + 1);
      setF({ ...empty(), storageId: f.storageId, compartmentId: f.compartmentId });
    } else {
      setF(empty());
      app.go('fridge', { storageId: f.storageId, compartmentId: f.compartmentId });
    }
  };

  return (
    <>
      <section className="card form-sec">
        <div className="sec-label">무엇을</div>
        <div className="chips">
          {hh.recentPresetKeys.map((k) => {
            const p = findPreset(k);
            if (!p) return null;
            return (
              <button key={k} className={f.preset?.key === k ? 'on' : ''} onClick={() => applyPreset(p)}>
                {p.name} 다시 샀어요
              </button>
            );
          })}
        </div>
        <div className="field">
          <label htmlFor="nameInp">이름</label>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {f.preset && (
              <div className={`cat tint-${tintOf(f.preset.cat)}`} aria-hidden="true">
                <CatIcon cat={f.preset.cat} />
              </div>
            )}
            <input id="nameInp" className="inp" value={f.name} placeholder="두 글자만 쳐도 찾아요" autoComplete="off" onChange={(e) => set({ name: e.target.value, preset: null, custom: false })} />
          </div>
          {(sugg.length > 0 || (q && !f.preset && !f.custom)) && (
            <div className="sug">
              {sugg.map((p) => (
                <button key={p.key} onClick={() => applyPreset(p)}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className={`cat tint-${tintOf(p.cat)}`} style={{ width: 28, height: 28, borderRadius: 9 }}>
                      <CatIcon cat={p.cat} size={15} />
                    </span>
                    {p.name}
                  </span>
                  <small>{p.noExpiry ? '기한 관리 안 함' : p.defaultStorage === 'freezer' ? `냉동 ${p.freezerDays}일` : `냉장 ${hh.overrides[p.key]?.fridgeDays ?? p.fridgeDays}일`}</small>
                </button>
              ))}
              <button onClick={() => set({ custom: true })}>
                <span>"{q}" 새 품목으로 등록</span>
                <small>사전에 없음 · 냉장 7일 기본</small>
              </button>
            </div>
          )}
        </div>
        <div className="field">
          <label>수량</label>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="stepper">
              <button aria-label="줄이기" onClick={() => set({ qty: Math.max(step, f.qty - step) })}>
                −
              </button>
              <span className="num">
                {f.qty}
                {unit}
              </span>
              <button aria-label="늘리기" onClick={() => set({ qty: f.qty + step })}>
                +
              </button>
            </div>
            {f.preset?.qtyType === 'amount' && <span className="hint">용량형 · 절반/다 먹음으로 차감</span>}
          </div>
        </div>
      </section>

      <section className="card form-sec">
        <div className="sec-label">어디에</div>
        <div className="seg">
          {hh.storages.map((s) => (
            <button key={s.id} className={s.id === f.storageId ? 'on' : ''} onClick={() => set({ storageId: s.id, compartmentId: s.compartments[0].id })}>
              {s.name}
            </button>
          ))}
        </div>
        <div className="chips">
          {st.compartments.map((c) => (
            <button key={c.id} className={c.id === f.compartmentId ? 'on' : ''} onClick={() => set({ compartmentId: c.id })}>
              {c.name}
            </button>
          ))}
        </div>
        <span className="hint">마지막에 둔 칸이 기본으로 선택돼요.</span>
      </section>

      <section className="card form-sec">
        <div className="sec-label">언제까지</div>
        <div className="field">
          <label>구매일</label>
          <div className="chips">
            {[0, 1, 2].map((n) => (
              <button key={n} className={!f.purchasedCustom && f.purchasedAt === addDays(today, -n) ? 'on' : ''} onClick={() => set({ purchasedAt: addDays(today, -n), purchasedCustom: false })}>
                {['오늘', '어제', '그제'][n]}
              </button>
            ))}
            <button className={f.purchasedCustom ? 'on' : ''} onClick={() => set({ purchasedCustom: !f.purchasedCustom })}>
              직접 입력
            </button>
          </div>
          {f.purchasedCustom && <input className="inp" type="date" value={f.purchasedAt} onChange={(e) => set({ purchasedAt: e.target.value || today })} aria-label="구매일" />}
        </div>
        <div className="field">
          <label>기한</label>
          <div className="chips">
            {(
              [
                ['auto', '자동'],
                ['+3', '+3일'],
                ['+7', '+1주'],
                ['+14', '+2주'],
                ['+30', '+1달'],
                ['manual', '직접'],
              ] as [ExpiryMode, string][]
            ).map(([k, l]) => (
              <button key={k} className={f.expiryMode === k ? 'on' : ''} onClick={() => set({ expiryMode: k })}>
                {l}
              </button>
            ))}
          </div>
          {f.expiryMode === 'manual' && <input className="inp" type="date" value={f.manual} onChange={(e) => set({ manual: e.target.value })} aria-label="기한 직접 입력" />}
        </div>
        {f.preset && !f.preset.noExpiry && (
          <Toggle title="개봉한 상태로 등록" desc="개봉 후 보관기간이 있으면 더 이른 날짜를 씁니다">
            <Switch on={f.opened} onChange={(v) => set({ opened: v })} label="개봉 상태" />
          </Toggle>
        )}
        {f.preset?.baseLabel && (
          <div className="field">
            <label htmlFor="baseInp">
              {f.preset.baseLabel} <span className="hint">있으면 이 날짜 기준으로 계산</span>
            </label>
            <input id="baseInp" className="inp" type="date" value={f.base} onChange={(e) => set({ base: e.target.value })} />
          </div>
        )}
        {f.preset && !f.preset.noExpiry && f.expiryMode === 'auto' && (
          <div className="field">
            <label htmlFor="prInp">
              포장에 적힌 소비기한 <span className="hint">선택</span>
            </label>
            <input id="prInp" className="inp" type="date" value={f.printed} onChange={(e) => set({ printed: e.target.value })} />
          </div>
        )}
        {preview && (
          <div className="preview">
            <span className="hint">계산된 기한</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <b>{preview.date ? `${formatShort(preview.date)}까지` : preview.label}</b>
              <Chip e={preview} basis />
            </div>
          </div>
        )}
      </section>

      <Toggle title="장본 날 모드" desc={`저장 후 바로 다음 품목 등록${batch && batchCount ? ` · 오늘 ${batchCount}개 등록` : ''}`}>
        <Switch
          on={batch}
          onChange={(v) => {
            setBatch(v);
            if (!v) setBatchCount(0);
          }}
          label="장본 날 모드"
        />
      </Toggle>

      <div className="sticky-cta">
        <button className="btn pri block" disabled={!presetKey} onClick={() => save()}>
          {presetKey ? `${f.preset?.name ?? q} 저장` : '품목을 골라 주세요'}
        </button>
      </div>

      {dup && (
        <Sheet label="중복 확인" onClose={() => setDup(null)} title={`${f.preset?.name ?? q}이(가) 이미 있어요`}>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--fg-2)' }}>
            {app.locOf(dup.existing)}에 {dup.existing.qty}
            {unit} 남아 있습니다. 수량을 합칠까요, 따로 등록할까요?
          </p>
          <div className="actions">
            <button className="btn pri" onClick={() => finish(A.mergeInto(dup.existing, f.qty))}>
              수량 합치기
            </button>
            <button className="btn" onClick={() => save(true)}>
              따로 등록
            </button>
          </div>
        </Sheet>
      )}
    </>
  );
}
