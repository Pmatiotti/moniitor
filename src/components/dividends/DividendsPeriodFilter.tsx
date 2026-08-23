import { useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { PeriodFilterOptions, getAvailableYears, MONTHS_PT } from "@/lib/dividend-filter";
import { Dividend } from "@/pages/Dividends";

interface DividendsPeriodFilterProps {
  dividends: Dividend[];
  filter: PeriodFilterOptions;
  onFilterChange: (filter: PeriodFilterOptions) => void;
}

export const DividendsPeriodFilter = ({ 
  dividends, 
  filter, 
  onFilterChange 
}: DividendsPeriodFilterProps) => {
  const availableYears = useMemo(() => {
    const years = getAvailableYears(dividends);
    // Add current year if not present
    const currentYear = new Date().getFullYear();
    if (!years.includes(currentYear)) {
      years.unshift(currentYear);
    }
    return years;
  }, [dividends]);

  const handleTypeChange = (type: PeriodFilterOptions['type']) => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    
    onFilterChange({
      type,
      year: type === 'custom_year' || type === 'custom_month' ? currentYear : undefined,
      month: type === 'custom_month' ? currentMonth : undefined,
      date: type === 'custom_date' ? new Date() : undefined,
    });
  };

  const handleYearChange = (year: string) => {
    onFilterChange({
      ...filter,
      year: parseInt(year),
    });
  };

  const handleMonthChange = (month: string) => {
    onFilterChange({
      ...filter,
      month: parseInt(month),
    });
  };

  const handleDateChange = (date: Date | undefined) => {
    onFilterChange({
      ...filter,
      date,
    });
  };

  const handleClearFilter = () => {
    onFilterChange({ type: 'all' });
  };

  const showClearButton = filter.type !== 'all';

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <Select value={filter.type} onValueChange={(v) => handleTypeChange(v as PeriodFilterOptions['type'])}>
        <SelectTrigger className="w-40 bg-background">
          <SelectValue placeholder="Período" />
        </SelectTrigger>
        <SelectContent className="bg-background z-50">
          <SelectItem value="all">Todos</SelectItem>
          <SelectItem value="day">Hoje</SelectItem>
          <SelectItem value="month">Este mês</SelectItem>
          <SelectItem value="year">Este ano</SelectItem>
          <SelectItem value="custom_year">Ano específico</SelectItem>
          <SelectItem value="custom_month">Mês específico</SelectItem>
          <SelectItem value="custom_date">Data específica</SelectItem>
        </SelectContent>
      </Select>

      {(filter.type === 'custom_year' || filter.type === 'custom_month') && (
        <Select value={filter.year?.toString()} onValueChange={handleYearChange}>
          <SelectTrigger className="w-28 bg-background">
            <SelectValue placeholder="Ano" />
          </SelectTrigger>
          <SelectContent className="bg-background z-50">
            {availableYears.map((year) => (
              <SelectItem key={year} value={year.toString()}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {filter.type === 'custom_month' && (
        <Select value={filter.month?.toString()} onValueChange={handleMonthChange}>
          <SelectTrigger className="w-32 bg-background">
            <SelectValue placeholder="Mês" />
          </SelectTrigger>
          <SelectContent className="bg-background z-50">
            {MONTHS_PT.map((month, index) => (
              <SelectItem key={index} value={index.toString()}>
                {month}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {filter.type === 'custom_date' && (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-[180px] justify-start text-left font-normal",
                !filter.date && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {filter.date ? format(filter.date, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar data"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 bg-background z-50" align="start">
            <Calendar
              mode="single"
              selected={filter.date}
              onSelect={handleDateChange}
              initialFocus
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      )}

      {showClearButton && (
        <Button variant="outline" size="sm" onClick={handleClearFilter}>
          <X className="mr-2 h-4 w-4" />
          Limpar
        </Button>
      )}
    </div>
  );
};
