import { FormEvent, useEffect, useRef, useState } from 'react';
import { formatMoney, parseNames, todayISO } from './domain/common';
import { createEqub, currentRound, Frequency, isComplete, pot } from './domain/equb';
import { balance, createIddir } from './domain/iddir';
import { EqubPage } from './EqubPage';
import { IddirPage } from './IddirPage';
import { T, translator } from './i18n';
import { exportJSON, importJSON, update, useStore } from './store';

function useHash(): string {
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => {
    const onChange = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return hash;
}

export function App() {
  const state = useStore();
  const t = translator(state.lang);
  const [, kind, id] = useHash().split('/');
  const equb = kind === 'equb' ? state.equbs.find((e) => e.id === id) : undefined;
  const iddir = kind === 'iddir' ? state.iddirs.find((i) => i.id === id) : undefined;

  return (
    <div className="app">
      <header className="topbar">
        <a href="#/" className="brand">
          {t('appTitle')}
        </a>
        <button
          className="ghost"
          onClick={() => update((s) => ({ ...s, lang: s.lang === 'en' ? 'am' : 'en' }))}
          aria-label="Switch language"
        >
          {state.lang === 'en' ? 'አማርኛ' : 'English'}
        </button>
      </header>
      <main>
        {equb ? <EqubPage equb={equb} t={t} /> : iddir ? <IddirPage iddir={iddir} t={t} /> : <Home t={t} />}
      </main>
    </div>
  );
}

function Home({ t }: { t: T }) {
  const { equbs, iddirs } = useStore();
  const [form, setForm] = useState<'equb' | 'iddir' | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const download = () => {
    const url = URL.createObjectURL(new Blob([exportJSON()], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `equb-iddir-backup-${todayISO()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const restore = async (file: File | undefined) => {
    if (!file || !window.confirm(t('restoreConfirm'))) return;
    try {
      importJSON(await file.text());
    } catch (err) {
      window.alert((err as Error).message);
    }
  };

  return (
    <>
      <section>
        <div className="section-head">
          <h2>{t('equbs')}</h2>
          <button onClick={() => setForm(form === 'equb' ? null : 'equb')}>+ {t('newEqub')}</button>
        </div>
        {form === 'equb' && <EqubForm t={t} onDone={() => setForm(null)} />}
        {equbs.length === 0 && form !== 'equb' && <p className="empty">{t('noEqubs')}</p>}
        <div className="cards">
          {equbs.map((e) => {
            const round = currentRound(e);
            return (
              <a key={e.id} className="card link" href={`#/equb/${e.id}`}>
                <strong>{e.name}</strong>
                <span className="big">{formatMoney(pot(e))}</span>
                <span className="muted">
                  {e.members.length} {t('members')} · {t(e.frequency)}
                </span>
                <span className={`pill ${isComplete(e) ? 'ok' : ''}`}>
                  {round ? `${t('round')} ${round.number} ${t('of')} ${e.members.length}` : '✓'}
                </span>
              </a>
            );
          })}
        </div>
      </section>

      <section>
        <div className="section-head">
          <h2>{t('iddirs')}</h2>
          <button onClick={() => setForm(form === 'iddir' ? null : 'iddir')}>+ {t('newIddir')}</button>
        </div>
        {form === 'iddir' && <IddirForm t={t} onDone={() => setForm(null)} />}
        {iddirs.length === 0 && form !== 'iddir' && <p className="empty">{t('noIddirs')}</p>}
        <div className="cards">
          {iddirs.map((i) => (
            <a key={i.id} className="card link" href={`#/iddir/${i.id}`}>
              <strong>{i.name}</strong>
              <span className={`big ${balance(i) < 0 ? 'bad' : ''}`}>{formatMoney(balance(i))}</span>
              <span className="muted">
                {i.members.length} {t('members')} · {formatMoney(i.monthlyFee)} / {t('month')}
              </span>
            </a>
          ))}
        </div>
      </section>

      <footer>
        <p className="muted">{t('storedLocally')}</p>
        <div className="row">
          <button className="ghost" onClick={download}>
            {t('backup')}
          </button>
          <button className="ghost" onClick={() => fileRef.current?.click()}>
            {t('restore')}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              void restore(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </div>
      </footer>
    </>
  );
}

function EqubForm({ t, onDone }: { t: T; onDone: () => void }) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState<Frequency>('weekly');
  const [startDate, setStartDate] = useState(todayISO());
  const [members, setMembers] = useState('');
  const [error, setError] = useState('');

  const submit = (ev: FormEvent) => {
    ev.preventDefault();
    try {
      const equb = createEqub({ name, amount: Number(amount), frequency, startDate, memberNames: parseNames(members) });
      update((s) => ({ ...s, equbs: [...s.equbs, equb] }));
      onDone();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <form className="card form" onSubmit={submit}>
      <label>
        {t('name')}
        <input value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
      </label>
      <div className="grid2">
        <label>
          {t('contribution')}
          <input type="number" min="1" step="any" value={amount} onChange={(e) => setAmount(e.target.value)} required />
        </label>
        <label>
          {t('frequency')}
          <select value={frequency} onChange={(e) => setFrequency(e.target.value as Frequency)}>
            <option value="daily">{t('daily')}</option>
            <option value="weekly">{t('weekly')}</option>
            <option value="monthly">{t('monthly')}</option>
          </select>
        </label>
      </div>
      <label>
        {t('startDate')}
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
      </label>
      <label>
        {t('members')} <span className="muted">— {t('membersHint')}</span>
        <textarea rows={5} value={members} onChange={(e) => setMembers(e.target.value)} required />
      </label>
      {error && <p className="error">{error}</p>}
      <div className="row">
        <button type="submit">{t('create')}</button>
        <button type="button" className="ghost" onClick={onDone}>
          {t('cancel')}
        </button>
      </div>
    </form>
  );
}

function IddirForm({ t, onDone }: { t: T; onDone: () => void }) {
  const [name, setName] = useState('');
  const [fee, setFee] = useState('');
  const [startMonth, setStartMonth] = useState(todayISO().slice(0, 7));
  const [members, setMembers] = useState('');
  const [error, setError] = useState('');

  const submit = (ev: FormEvent) => {
    ev.preventDefault();
    try {
      const iddir = createIddir({ name, monthlyFee: Number(fee), startMonth, memberNames: parseNames(members) });
      update((s) => ({ ...s, iddirs: [...s.iddirs, iddir] }));
      onDone();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <form className="card form" onSubmit={submit}>
      <label>
        {t('name')}
        <input value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
      </label>
      <div className="grid2">
        <label>
          {t('monthlyFee')}
          <input type="number" min="1" step="any" value={fee} onChange={(e) => setFee(e.target.value)} required />
        </label>
        <label>
          {t('startMonth')}
          <input type="month" value={startMonth} onChange={(e) => setStartMonth(e.target.value)} required />
        </label>
      </div>
      <label>
        {t('members')} <span className="muted">— {t('membersHint')}</span>
        <textarea rows={5} value={members} onChange={(e) => setMembers(e.target.value)} />
      </label>
      {error && <p className="error">{error}</p>}
      <div className="row">
        <button type="submit">{t('create')}</button>
        <button type="button" className="ghost" onClick={onDone}>
          {t('cancel')}
        </button>
      </div>
    </form>
  );
}
