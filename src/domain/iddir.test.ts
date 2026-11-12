import { describe, expect, it } from 'vitest';
import {
  addMember,
  addPayout,
  arrears,
  balance,
  createIddir,
  monthsBetween,
  removePayout,
  togglePayment,
  unpaidMonths,
} from './iddir';
import { parseNames } from './common';

const make = () =>
  createIddir({ name: 'Sefer Iddir', monthlyFee: 100, startMonth: '2026-11', memberNames: ['Abebe', 'Sara'] });

describe('iddir', () => {
  it('lists months across a year boundary', () => {
    expect(monthsBetween('2026-11', '2027-02')).toEqual(['2026-11', '2026-12', '2027-01', '2027-02']);
    expect(monthsBetween('2027-02', '2026-11')).toEqual([]);
  });

  it('tracks contributions, payouts and balance', () => {
    let i = make();
    const [a, s] = i.members;
    i = togglePayment(i, a.id, '2026-11');
    i = togglePayment(i, s.id, '2026-11');
    i = togglePayment(i, a.id, '2026-12');
    expect(balance(i)).toBe(300);
    i = addPayout(i, { memberId: s.id, date: '2026-12-05', amount: 250, reason: 'Bereavement' });
    expect(balance(i)).toBe(50);
    i = removePayout(i, i.payouts[0].id);
    expect(balance(i)).toBe(300);
    i = togglePayment(i, a.id, '2026-12');
    expect(balance(i)).toBe(200);
    expect(() => addPayout(i, { memberId: 'nope', date: '2026-12-05', amount: 10, reason: '' })).toThrow();
  });

  it('computes arrears from the month a member joined', () => {
    let i = make();
    const [a] = i.members;
    i = togglePayment(i, a.id, '2026-12');
    expect(unpaidMonths(i, a.id, '2027-01')).toEqual(['2026-11', '2027-01']);
    expect(arrears(i, a.id, '2027-01')).toBe(200);
    i = addMember(i, 'Hana', '2027-01');
    const hana = i.members[2];
    expect(arrears(i, hana.id, '2027-01')).toBe(100);
    expect(arrears(i, hana.id, '2026-12')).toBe(0);
  });

  it('keeps the fee that was charged when it later changes', () => {
    let i = make();
    i = togglePayment(i, i.members[0].id, '2026-11');
    i = { ...i, monthlyFee: 150 };
    i = togglePayment(i, i.members[1].id, '2026-11');
    expect(balance(i)).toBe(250);
  });
});

describe('parseNames', () => {
  it('splits, trims and de-duplicates', () => {
    expect(parseNames(' Abebe,Sara\n\nabebe \nKebede')).toEqual(['Abebe', 'Sara', 'Kebede']);
  });
});
