import { FormEvent, useState } from 'react';
import { formatMoney, todayISO } from './domain/common';
import {
  addMember,
  addPayout,
  arrears,
  balance,
  hasPaid,
  Iddir,
  monthsBetween,
  removeMember,
  removePayout,
  togglePayment,
  totalContributions,
  totalPayouts,
} from './domain/iddir';
import type { T } from './i18n';
import { update, updateIddir } from './store';

export function IddirPage({ iddir, t }: { iddir: Iddir; t: T }) {
  const thisMonth = todayISO().slice(0, 7);
  const lastMonth = thisMonth < iddir.startMonth ? iddir.startMonth : thisMonth;
  const months = monthsBetween(iddir.startMonth, lastMonth);
  const [month, setMonth] = useState(lastMonth);
  const [newName, setNewName] = useState('');
  const nameOf = (id: string) => iddir.members.find((m) => m.id === id)?.name ?? '—';
  const apply = (fn: (i: Iddir) => Iddir) => {
    try {
      updateIddir(iddir.id, fn);
      return true;
    } catch (err) {
      window.alert((err as Error).message);
      return false;
    }
  };

  const remove = () => {
    if (!window.confirm(t('confirmDelete'))) return;
    update((s) => ({ ...s, iddirs: s.iddirs.filter((i) => i.id !== iddir.id) }));
    window.location.hash = '#/';
  };

  const bal = balance(iddir);

  return (
    <>
      <div className="section-head">
        <a href="#/" className="ghost button">
          ← {t('back')}
        </a>
        <button className="ghost danger" onClick={remove}>
          {t('delete')}
        </button>
      </div>
      <h1>{iddir.name}</h1>
      <div className="stats">
        <div className="card">
          <span className="muted">{t('balance')}</span>
          <span className={`big ${bal < 0 ? 'bad' : ''}`}>{formatMoney(bal)}</span>
        </div>
        <div className="card">
          <span className="muted">{t('contributions')}</span>
          <span className="big">{formatMoney(totalContributions(iddir))}</span>
        </div>
        <div className="card">
          <span className="muted">{t('payouts')}</span>
          <span className="big">{formatMoney(totalPayouts(iddir))}</span>
        </div>
      </div>

      <section className="card">
        <div className="section-head">
          <h2>{t('contributions')}</h2>
          <label className="row">
            <span className="muted">{t('month')}</span>
            <select value={month} onChange={(e) => setMonth(e.target.value)}>
              {months.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
        </div>
        <ul className="list">
          {iddir.members.map((m) => {
            const owes = m.joinedMonth <= month;
            const paid = hasPaid(iddir, m.id, month);
            const due = arrears(iddir, m.id, lastMonth);
            return (
              <li key={m.id}>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={paid}
                    disabled={!owes}
                    onChange={() => apply((i) => togglePayment(i, m.id, month))}
                  />
                  <span>{m.name}</span>
                </label>
                <span className="row">
                  {due > 0 && (
                    <span className="pill warn">
                      {t('arrears')}: {formatMoney(due)}
                    </span>
                  )}
                  {owes && <span className={`pill ${paid ? 'ok' : 'warn'}`}>{paid ? t('paid') : t('unpaid')}</span>}
                  <button
                    className="ghost danger small"
                    onClick={() => window.confirm(t('confirmDelete')) && apply((i) => removeMember(i, m.id))}
                  >
                    {t('remove')}
                  </button>
                </span>
              </li>
            );
          })}
        </ul>
        <form
          className="row"
          onSubmit={(ev) => {
            ev.preventDefault();
            apply((i) => addMember(i, newName, month));
            setNewName('');
          }}
        >
          <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={t('name')} required />
          <button type="submit" className="ghost">
            + {t('addMember')}
          </button>
        </form>
      </section>

      <section className="card">
        <h2>{t('payouts')}</h2>
        {iddir.payouts.length === 0 ? (
          <p className="muted">{t('noPayouts')}</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>{t('date')}</th>
                <th>{t('member')}</th>
                <th>{t('reason')}</th>
                <th>{t('amount')}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {iddir.payouts.map((p) => (
                <tr key={p.id}>
                  <td>{p.date}</td>
                  <td>{nameOf(p.memberId)}</td>
                  <td>{p.reason}</td>
                  <td>{formatMoney(p.amount)}</td>
                  <td>
                    <button
                      className="ghost danger small"
                      onClick={() => window.confirm(t('confirmDelete')) && apply((i) => removePayout(i, p.id))}
                    >
                      {t('remove')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {iddir.members.length > 0 && <PayoutForm iddir={iddir} t={t} onAdd={(input) => apply((i) => addPayout(i, input))} />}
      </section>
    </>
  );
}

function PayoutForm({
  iddir,
  t,
  onAdd,
}: {
  iddir: Iddir;
  t: T;
  onAdd: (input: { memberId: string; date: string; amount: number; reason: string }) => boolean;
}) {
  const [memberId, setMemberId] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayISO());
  const [reason, setReason] = useState('');

  const submit = (ev: FormEvent) => {
    ev.preventDefault();
    if (onAdd({ memberId, date, amount: Number(amount), reason })) {
      setMemberId('');
      setAmount('');
      setReason('');
    }
  };

  return (
    <form className="form" onSubmit={submit}>
      <h3>{t('recordPayout')}</h3>
      <div className="grid2">
        <label>
          {t('member')}
          <select value={memberId} onChange={(e) => setMemberId(e.target.value)} required>
            <option value="" />
            {iddir.members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t('amount')}
          <input type="number" min="1" step="any" value={amount} onChange={(e) => setAmount(e.target.value)} required />
        </label>
        <label>
          {t('date')}
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </label>
        <label>
          {t('reason')}
          <input value={reason} onChange={(e) => setReason(e.target.value)} />
        </label>
      </div>
      <div className="row">
        <button type="submit">{t('recordPayout')}</button>
      </div>
    </form>
  );
}
