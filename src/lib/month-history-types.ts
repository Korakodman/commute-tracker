export interface MonthlyHistoryItem {
  year: number;
  month: number;
  totalDays: number;
  workDays: number;
  offDays: number;
  totalCost: number;
  hasCalendar: boolean;
}
