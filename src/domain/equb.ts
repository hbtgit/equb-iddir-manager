import { Member, uid } from './common';

export type Frequency = 'daily' | 'weekly' | 'monthly';

export interface EqubRound {
  number: number;
  paidMemberIds: string[];
  winnerId?: string;
}

export interface Equb {
  id: string;
  name: string;
  /** Contribution each member pays every round. */
  amount: number;
  frequency: Frequency;
  /** ISO date (YYYY-MM-DD) of the first round. */
  startDate: string;
  members: Member[];
  /** One round per member; the last entry is the open round until the cycle completes. */
  rounds: EqubRound[];
}

export interface NewEqub {
  name: string;
  amount: number;
  frequency: Frequency;
  startDate: string;
  memberNames: string[];
}

export function createEqub(input: NewEqub): Equb {
  if (!input.name.trim()) throw new Error('Name is required');
  if (!(input.amount > 0)) throw new Error('Contribution must be greater than zero');
  if (input.memberNames.length < 2) throw new Error('An equb needs at least 2 members');
  return {
    id: uid(),
    name: input.name.trim(),
    amount: input.amount,
    frequency: input.frequency,
    startDate: input.startDate,
    members: input.memberNames.map((name) => ({ id: uid(), name })),
    rounds: [{ number: 1, paidMemberIds: [] }],
  };
}

/** The pot paid out to each round's winner. */
export function pot(equb: Equb): number {
  return equb.amount * equb.members.length;
}

export function isComplete(equb: Equb): boolean {
  return equb.rounds.filter((r) => r.winnerId).length >= equb.members.length;
}

/** The round still collecting / awaiting a draw, or null when the cycle is done. */
export function currentRound(equb: Equb): EqubRound | null {
  const last = equb.rounds[equb.rounds.length - 1];
  return last && !last.winnerId ? last : null;
}

export function hasStarted(equb: Equb): boolean {
  return equb.rounds.some((r) => r.winnerId || r.paidMemberIds.length > 0);
}

export function winnerIds(equb: Equb): string[] {
  return equb.rounds.flatMap((r) => (r.winnerId ? [r.winnerId] : []));
}

/** Members who have not yet received the pot. */
export function eligibleMembers(equb: Equb): Member[] {
  const won = new Set(winnerIds(equb));
  return equb.members.filter((m) => !won.has(m.id));
}

export function unpaidMembers(equb: Equb): Member[] {
  const round = currentRound(equb);
  if (!round) return [];
  return equb.members.filter((m) => !round.paidMemberIds.includes(m.id));
}

export function togglePayment(equb: Equb, memberId: string): Equb {
  const round = currentRound(equb);
  if (!round) return equb;
  const paid = round.paidMemberIds.includes(memberId)
    ? round.paidMemberIds.filter((id) => id !== memberId)
    : [...round.paidMemberIds, memberId];
  return replaceRound(equb, { ...round, paidMemberIds: paid });
}

export function markAllPaid(equb: Equb): Equb {
  const round = currentRound(equb);
  if (!round) return equb;
  return replaceRound(equb, { ...round, paidMemberIds: equb.members.map((m) => m.id) });
}

/** Give the current round's pot to a specific member and open the next round. */
export function setWinner(equb: Equb, memberId: string): Equb {
  const round = currentRound(equb);
  if (!round) throw new Error('This equb cycle is already complete');
  if (!eligibleMembers(equb).some((m) => m.id === memberId)) {
    throw new Error('This member has already received the pot');
  }
  const closed = replaceRound(equb, { ...round, winnerId: memberId });
  if (isComplete(closed)) return closed;
  return { ...closed, rounds: [...closed.rounds, { number: round.number + 1, paidMemberIds: [] }] };
}

/** Draw the lot (ዕጣ) among members who have not won yet. */
export function drawWinner(equb: Equb, random: () => number = Math.random): Equb {
  const eligible = eligibleMembers(equb);
  if (eligible.length === 0) throw new Error('This equb cycle is already complete');
  const pick = eligible[Math.min(eligible.length - 1, Math.floor(random() * eligible.length))];
  return setWinner(equb, pick.id);
}

/** Membership can only change before any money has moved. */
export function addMember(equb: Equb, name: string): Equb {
  if (hasStarted(equb)) throw new Error('Members cannot change after the equb has started');
  const trimmed = name.trim();
  if (!trimmed) return equb;
  return { ...equb, members: [...equb.members, { id: uid(), name: trimmed }] };
}

export function removeMember(equb: Equb, memberId: string): Equb {
  if (hasStarted(equb)) throw new Error('Members cannot change after the equb has started');
  if (equb.members.length <= 2) throw new Error('An equb needs at least 2 members');
  return { ...equb, members: equb.members.filter((m) => m.id !== memberId) };
}

/** Due date of a 1-based round number. */
export function roundDate(equb: Equb, roundNumber: number): string {
  const [y, m, d] = equb.startDate.split('-').map(Number);
  const n = roundNumber - 1;
  let date: Date;
  if (equb.frequency === 'monthly') {
    const first = new Date(Date.UTC(y, m - 1 + n, 1));
    const lastDay = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
    date = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), Math.min(d, lastDay)));
  } else {
    date = new Date(Date.UTC(y, m - 1, d + n * (equb.frequency === 'weekly' ? 7 : 1)));
  }
  return date.toISOString().slice(0, 10);
}

export function totalCollected(equb: Equb): number {
  return equb.rounds.reduce((sum, r) => sum + r.paidMemberIds.length * equb.amount, 0);
}

function replaceRound(equb: Equb, round: EqubRound): Equb {
  return { ...equb, rounds: equb.rounds.map((r) => (r.number === round.number ? round : r)) };
}
