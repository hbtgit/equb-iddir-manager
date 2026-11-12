import { Member, uid } from './common';

export interface IddirMember extends Member {
  /** First month (YYYY-MM) this member owes the fee. */
  joinedMonth: string;
}

export interface IddirPayment {
  memberId: string;
  month: string;
  amount: number;
}

export interface IddirPayout {
  id: string;
  memberId: string;
  date: string;
  amount: number;
  reason: string;
}

export interface Iddir {
  id: string;
  name: string;
  monthlyFee: number;
  /** First month (YYYY-MM) fees are collected. */
  startMonth: string;
  members: IddirMember[];
  payments: IddirPayment[];
  payouts: IddirPayout[];
}

export interface NewIddir {
  name: string;
  monthlyFee: number;
  startMonth: string;
  memberNames: string[];
}

export function createIddir(input: NewIddir): Iddir {
  if (!input.name.trim()) throw new Error('Name is required');
  if (!(input.monthlyFee > 0)) throw new Error('Monthly fee must be greater than zero');
  if (!/^\d{4}-\d{2}$/.test(input.startMonth)) throw new Error('Start month is required');
  return {
    id: uid(),
    name: input.name.trim(),
    monthlyFee: input.monthlyFee,
    startMonth: input.startMonth,
    members: input.memberNames.map((name) => ({ id: uid(), name, joinedMonth: input.startMonth })),
    payments: [],
    payouts: [],
  };
}

/** Inclusive list of YYYY-MM months from `from` to `to`. */
export function monthsBetween(from: string, to: string): string[] {
  const out: string[] = [];
  let [y, m] = from.split('-').map(Number);
  const [ty, tm] = to.split('-').map(Number);
  while (y < ty || (y === ty && m <= tm)) {
    out.push(`${y}-${String(m).padStart(2, '0')}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return out;
}

export function hasPaid(iddir: Iddir, memberId: string, month: string): boolean {
  return iddir.payments.some((p) => p.memberId === memberId && p.month === month);
}

export function togglePayment(iddir: Iddir, memberId: string, month: string): Iddir {
  if (hasPaid(iddir, memberId, month)) {
    return {
      ...iddir,
      payments: iddir.payments.filter((p) => !(p.memberId === memberId && p.month === month)),
    };
  }
  return { ...iddir, payments: [...iddir.payments, { memberId, month, amount: iddir.monthlyFee }] };
}

export function addMember(iddir: Iddir, name: string, joinedMonth: string): Iddir {
  const trimmed = name.trim();
  if (!trimmed) return iddir;
  const month = joinedMonth < iddir.startMonth ? iddir.startMonth : joinedMonth;
  return { ...iddir, members: [...iddir.members, { id: uid(), name: trimmed, joinedMonth: month }] };
}

/** Removes a member; their past payments stay in the fund. */
export function removeMember(iddir: Iddir, memberId: string): Iddir {
  return { ...iddir, members: iddir.members.filter((m) => m.id !== memberId) };
}

export function addPayout(
  iddir: Iddir,
  input: { memberId: string; date: string; amount: number; reason: string },
): Iddir {
  if (!(input.amount > 0)) throw new Error('Payout must be greater than zero');
  if (!iddir.members.some((m) => m.id === input.memberId)) throw new Error('Choose a member');
  return { ...iddir, payouts: [...iddir.payouts, { id: uid(), ...input, reason: input.reason.trim() }] };
}

export function removePayout(iddir: Iddir, payoutId: string): Iddir {
  return { ...iddir, payouts: iddir.payouts.filter((p) => p.id !== payoutId) };
}

export function totalContributions(iddir: Iddir): number {
  return iddir.payments.reduce((sum, p) => sum + p.amount, 0);
}

export function totalPayouts(iddir: Iddir): number {
  return iddir.payouts.reduce((sum, p) => sum + p.amount, 0);
}

export function balance(iddir: Iddir): number {
  return totalContributions(iddir) - totalPayouts(iddir);
}

/** Months a member owes but has not paid, up to and including `asOfMonth`. */
export function unpaidMonths(iddir: Iddir, memberId: string, asOfMonth: string): string[] {
  const member = iddir.members.find((m) => m.id === memberId);
  if (!member) return [];
  return monthsBetween(member.joinedMonth, asOfMonth).filter((month) => !hasPaid(iddir, memberId, month));
}

export function arrears(iddir: Iddir, memberId: string, asOfMonth: string): number {
  return unpaidMonths(iddir, memberId, asOfMonth).length * iddir.monthlyFee;
}
