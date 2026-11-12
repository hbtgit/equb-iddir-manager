import { useState } from 'react';
import { formatMoney } from './domain/common';
import {
  addMember,
  currentRound,
  drawWinner,
  eligibleMembers,
  Equb,
  hasStarted,
  markAllPaid,
  pot,
  removeMember,
  roundDate,
  setWinner,
  togglePayment,
  totalCollected,
  unpaidMembers,
  winnerIds,
} from './domain/equb';
import type { T } from './i18n';
import { update, updateEqub } from './store';

export function EqubPage({ equb, t }: { equb: Equb; t: T }) {
  const [newName, setNewName] = useState('');
  const round = currentRound(equb);
  const started = hasStarted(equb);
  const won = new Set(winnerIds(equb));
  const nameOf = (id?: string) => equb.members.find((m) => m.id === id)?.name ?? '—';
  const apply = (fn: (e: Equb) => Equb) => {
    try {
      updateEqub(equb.id, fn);
    } catch (err) {
      window.alert((err as Error).message);
    }
  };

  const draw = () => {
    const unpaid = unpaidMembers(equb).length;
    if (unpaid > 0 && !window.confirm(`${unpaid} ${t('drawAnyway')}`)) return;
    apply((e) => drawWinner(e));
  };

  const remove = () => {
    if (!window.confirm(t('confirmDelete'))) return;
    update((s) => ({ ...s, equbs: s.equbs.filter((e) => e.id !== equb.id) }));
    window.location.hash = '#/';
  };

  const finished = equb.rounds.filter((r) => r.winnerId);

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
      <h1>{equb.name}</h1>
      <div className="stats">
        <div className="card">
          <span className="muted">{t('pot')}</span>
          <span className="big">{formatMoney(pot(equb))}</span>
        </div>
        <div className="card">
          <span className="muted">{t('collected')}</span>
          <span className="big">{formatMoney(totalCollected(equb))}</span>
        </div>
        <div className="card">
          <span className="muted">{t('round')}</span>
          <span className="big">
            {round ? round.number : equb.members.length} {t('of')} {equb.members.length}
          </span>
        </div>
      </div>

      {round ? (
        <section className="card">
          <div className="section-head">
            <h2>
              {t('round')} {round.number}
            </h2>
            <span className="muted">
              {t('due')}: {roundDate(equb, round.number)}
            </span>
          </div>
          <ul className="list">
            {equb.members.map((m) => {
              const paid = round.paidMemberIds.includes(m.id);
              return (
                <li key={m.id}>
                  <label className="check">
                    <input type="checkbox" checked={paid} onChange={() => apply((e) => togglePayment(e, m.id))} />
                    <span>{m.name}</span>
                  </label>
                  <span className="row">
                    <span className={`pill ${won.has(m.id) ? 'ok' : ''}`}>{won.has(m.id) ? t('won') : t('waiting')}</span>
                    <span className={`pill ${paid ? 'ok' : 'warn'}`}>{paid ? t('paid') : t('unpaid')}</span>
                    {!started && (
                      <button className="ghost danger small" onClick={() => apply((e) => removeMember(e, m.id))}>
                        {t('remove')}
                      </button>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
          <div className="row wrap">
            <button className="ghost" onClick={() => apply(markAllPaid)}>
              {t('markAllPaid')}
            </button>
            <button onClick={draw}>🎲 {t('drawLot')}</button>
            <select value="" onChange={(e) => e.target.value && apply((eq) => setWinner(eq, e.target.value))}>
              <option value="">{t('pickWinner')}</option>
              {eligibleMembers(equb).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
          {started ? (
            <p className="muted">{t('membersLocked')}</p>
          ) : (
            <form
              className="row"
              onSubmit={(ev) => {
                ev.preventDefault();
                apply((e) => addMember(e, newName));
                setNewName('');
              }}
            >
              <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={t('name')} required />
              <button type="submit" className="ghost">
                + {t('addMember')}
              </button>
            </form>
          )}
        </section>
      ) : (
        <p className="card success">{t('complete')}</p>
      )}

      {finished.length > 0 && (
        <section className="card">
          <h2>{t('history')}</h2>
          <table>
            <thead>
              <tr>
                <th>{t('round')}</th>
                <th>{t('date')}</th>
                <th>{t('winner')}</th>
                <th>{t('paid')}</th>
              </tr>
            </thead>
            <tbody>
              {finished.map((r) => (
                <tr key={r.number}>
                  <td>{r.number}</td>
                  <td>{roundDate(equb, r.number)}</td>
                  <td>{nameOf(r.winnerId)}</td>
                  <td>
                    {r.paidMemberIds.length}/{equb.members.length}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </>
  );
}
