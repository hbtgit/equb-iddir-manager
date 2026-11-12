import { describe, expect, it } from 'vitest';
import {
  addMember,
  createEqub,
  currentRound,
  drawWinner,
  eligibleMembers,
  isComplete,
  markAllPaid,
  pot,
  roundDate,
  setWinner,
  togglePayment,
  totalCollected,
  unpaidMembers,
  winnerIds,
} from './equb';

const make = (frequency: 'daily' | 'weekly' | 'monthly' = 'weekly', startDate = '2026-01-31') =>
  createEqub({ name: 'Family', amount: 500, frequency, startDate, memberNames: ['Abebe', 'Sara', 'Kebede'] });

describe('equb', () => {
  it('validates input', () => {
    expect(() => createEqub({ name: 'x', amount: 0, frequency: 'weekly', startDate: '2026-01-01', memberNames: ['a', 'b'] })).toThrow();
    expect(() => createEqub({ name: 'x', amount: 10, frequency: 'weekly', startDate: '2026-01-01', memberNames: ['a'] })).toThrow();
  });

  it('computes the pot and tracks payments', () => {
    let e = make();
    expect(pot(e)).toBe(1500);
    e = togglePayment(e, e.members[0].id);
    expect(unpaidMembers(e).map((m) => m.name)).toEqual(['Sara', 'Kebede']);
    e = togglePayment(e, e.members[0].id);
    expect(unpaidMembers(e)).toHaveLength(3);
    e = markAllPaid(e);
    expect(totalCollected(e)).toBe(1500);
  });

  it('every member wins exactly once and the cycle completes', () => {
    let e = make();
    while (!isComplete(e)) e = drawWinner(markAllPaid(e), () => 0.99);
    expect(e.rounds).toHaveLength(3);
    expect(new Set(winnerIds(e)).size).toBe(3);
    expect(currentRound(e)).toBeNull();
    expect(totalCollected(e)).toBe(4500);
    expect(() => drawWinner(e)).toThrow();
  });

  it('never lets a member win twice', () => {
    let e = make();
    const first = e.members[0].id;
    e = setWinner(e, first);
    expect(eligibleMembers(e).map((m) => m.id)).not.toContain(first);
    expect(() => setWinner(e, first)).toThrow();
    expect(currentRound(e)?.number).toBe(2);
  });

  it('locks membership once started', () => {
    let e = addMember(make(), 'Hana');
    expect(e.members).toHaveLength(4);
    e = togglePayment(e, e.members[0].id);
    expect(() => addMember(e, 'Late')).toThrow();
  });

  it('computes round dates', () => {
    expect(roundDate(make('daily'), 2)).toBe('2026-02-01');
    expect(roundDate(make('weekly'), 3)).toBe('2026-02-14');
    expect(roundDate(make('monthly'), 2)).toBe('2026-02-28');
    expect(roundDate(make('monthly'), 3)).toBe('2026-03-31');
    expect(roundDate(make('monthly', '2026-12-15'), 2)).toBe('2027-01-15');
  });
});
