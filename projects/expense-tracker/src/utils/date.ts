export type BillingFrequency = 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';

export interface CalendarDayCell {
  dateIso: string;
  dayOfMonth: number;
  inCurrentMonth: boolean;
  isWeekend: boolean;
}

export function isValidIsoDate(dateStr: string): boolean {
  if (!/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(dateStr)) {
    return false;
  }
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export function isValidYearMonth(monthStr: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(monthStr);
}

export function getMonthBoundaries(monthStr: string): { startDate: string; endDate: string; daysInMonth: number } {
  if (!isValidYearMonth(monthStr)) {
    throw new RangeError(`Invalid YYYY-MM month string: "${monthStr}"`);
  }
  const [y, m] = monthStr.split('-').map(Number);
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const dd = String(lastDay).padStart(2, '0');
  return {
    startDate: `${monthStr}-01`,
    endDate: `${monthStr}-${dd}`,
    daysInMonth: lastDay,
  };
}

export function getPreviousYearMonth(monthStr: string): string {
  if (!isValidYearMonth(monthStr)) {
    throw new RangeError(`Invalid YYYY-MM month string: "${monthStr}"`);
  }
  const [y, m] = monthStr.split('-').map(Number);
  if (m === 1) {
    return `${y - 1}-12`;
  }
  return `${y}-${String(m - 1).padStart(2, '0')}`;
}

export function getTrailingYearMonths(endMonthStr: string, count: number): string[] {
  if (!isValidYearMonth(endMonthStr) || count <= 0) {
    return [];
  }
  const result: string[] = [];
  let cursor = endMonthStr;
  for (let i = 0; i < count; i++) {
    result.unshift(cursor);
    cursor = getPreviousYearMonth(cursor);
  }
  return result;
}

export function advanceDueDate(
  currentDateIso: string,
  frequency: BillingFrequency,
  preferredDayOfMonth?: number
): string {
  if (!isValidIsoDate(currentDateIso)) {
    throw new RangeError(`Invalid ISO date: "${currentDateIso}"`);
  }
  const [y, m, d] = currentDateIso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));

  if (frequency === 'WEEKLY') {
    dt.setUTCDate(dt.getUTCDate() + 7);
  } else if (frequency === 'BIWEEKLY') {
    dt.setUTCDate(dt.getUTCDate() + 14);
  } else {
    const monthDelta = frequency === 'MONTHLY' ? 1 : frequency === 'QUARTERLY' ? 3 : 12;
    const targetYear = y + Math.floor((m - 1 + monthDelta) / 12);
    const targetMonthIndex = (((m - 1 + monthDelta) % 12) + 12) % 12;
    const maxDayInTarget = new Date(Date.UTC(targetYear, targetMonthIndex + 1, 0)).getUTCDate();
    const desiredDay = preferredDayOfMonth && preferredDayOfMonth >= 1 ? preferredDayOfMonth : d;
    const clampedDay = Math.min(desiredDay, maxDayInTarget);
    const nextDt = new Date(Date.UTC(targetYear, targetMonthIndex, clampedDay));
    return formatUtcDateIso(nextDt);
  }

  return formatUtcDateIso(dt);
}

export function formatUtcDateIso(dt: Date): string {
  const yyyy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function formatHumanDate(dateIso: string): string {
  if (!isValidIsoDate(dateIso)) return dateIso;
  const [y, m, d] = dateIso.split('-').map(Number);
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${monthNames[m - 1]} ${String(d).padStart(2, '0')}, ${y}`;
}

export function buildMonthlyCalendarGrid(monthStr: string): CalendarDayCell[] {
  const { daysInMonth } = getMonthBoundaries(monthStr);
  const [y, m] = monthStr.split('-').map(Number);
  const firstDayDow = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const mondayOffset = (firstDayDow + 6) % 7;

  const cells: CalendarDayCell[] = [];
  const prevMonthDate = new Date(Date.UTC(y, m - 1, 0));
  const prevMonthDays = prevMonthDate.getUTCDate();
  const prevMonthStr = getPreviousYearMonth(monthStr);

  for (let i = mondayOffset - 1; i >= 0; i--) {
    const dayNum = prevMonthDays - i;
    const iso = `${prevMonthStr}-${String(dayNum).padStart(2, '0')}`;
    const dow = new Date(Date.UTC(prevMonthDate.getUTCFullYear(), prevMonthDate.getUTCMonth(), dayNum)).getUTCDay();
    cells.push({
      dateIso: iso,
      dayOfMonth: dayNum,
      inCurrentMonth: false,
      isWeekend: dow === 0 || dow === 6,
    });
  }

  for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
    const iso = `${monthStr}-${String(dayNum).padStart(2, '0')}`;
    const dow = new Date(Date.UTC(y, m - 1, dayNum)).getUTCDay();
    cells.push({
      dateIso: iso,
      dayOfMonth: dayNum,
      inCurrentMonth: true,
      isWeekend: dow === 0 || dow === 6,
    });
  }

  const nextYear = m === 12 ? y + 1 : y;
  const nextMonth = m === 12 ? 1 : m + 1;
  const nextMonthStr = `${nextYear}-${String(nextMonth).padStart(2, '0')}`;
  let trailingDay = 1;
  while (cells.length % 7 !== 0 || cells.length < 35) {
    const iso = `${nextMonthStr}-${String(trailingDay).padStart(2, '0')}`;
    const dow = new Date(Date.UTC(nextYear, nextMonth - 1, trailingDay)).getUTCDay();
    cells.push({
      dateIso: iso,
      dayOfMonth: trailingDay,
      inCurrentMonth: false,
      isWeekend: dow === 0 || dow === 6,
    });
    trailingDay++;
  }

  return cells;
}
