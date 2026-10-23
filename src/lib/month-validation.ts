export function isValidDateString(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return false;
  }

  const [year, month, day] = date.split("-").map(Number);
  const testDate = new Date(Date.UTC(year, month - 1, day));

  return (
    testDate.getUTCFullYear() === year &&
    testDate.getUTCMonth() === month - 1 &&
    testDate.getUTCDate() === day
  );
}

export function isDateInMonth(
  date: string,
  year: number,
  month: number
): boolean {
  if (!isValidDateString(date)) {
    return false;
  }

  const [dateYear, dateMonth] = date.split("-").map(Number);
  return dateYear === year && dateMonth === month;
}

export function findInvalidOffDate(
  offDates: string[],
  year: number,
  month: number
): string | undefined {
  return offDates.find((date) => !isDateInMonth(date, year, month));
}
