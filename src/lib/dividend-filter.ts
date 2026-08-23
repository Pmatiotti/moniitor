import { Dividend } from "@/pages/Dividends";

export interface PeriodFilterOptions {
  type: 'all' | 'day' | 'month' | 'year' | 'custom_year' | 'custom_month' | 'custom_date';
  year?: number;
  month?: number;
  date?: Date;
}

export const filterDividends = (dividends: Dividend[], filter: PeriodFilterOptions): Dividend[] => {
  return dividends.filter(div => {
    const paymentDate = new Date(div.payment_date);
    const now = new Date();
    
    switch (filter.type) {
      case 'all':
        return true;
      case 'day':
        return paymentDate.toDateString() === now.toDateString();
      case 'month':
        return paymentDate.getMonth() === now.getMonth() && 
               paymentDate.getFullYear() === now.getFullYear();
      case 'year':
        return paymentDate.getFullYear() === now.getFullYear();
      case 'custom_year':
        return paymentDate.getFullYear() === filter.year;
      case 'custom_month':
        return paymentDate.getMonth() === filter.month && 
               paymentDate.getFullYear() === filter.year;
      case 'custom_date':
        return filter.date ? paymentDate.toDateString() === filter.date.toDateString() : true;
      default:
        return true;
    }
  });
};

export const getAvailableYears = (dividends: Dividend[]): number[] => {
  const years = dividends.map(d => new Date(d.payment_date).getFullYear());
  return [...new Set(years)].sort((a, b) => b - a);
};

export const MONTHS_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];
