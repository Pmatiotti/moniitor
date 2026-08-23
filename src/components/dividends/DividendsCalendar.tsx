import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, CalendarDays, ChevronDown, ChevronUp } from "lucide-react";
import { Dividend, UpcomingDividend } from "@/pages/Dividends";

interface SelectedDayData {
  day: number;
  paid: Dividend[];
  upcoming: UpcomingDividend[];
}

interface DividendsCalendarProps {
  dividends: Dividend[];
  upcomingDividends: UpcomingDividend[];
}

export function DividendsCalendar({ dividends, upcomingDividends }: DividendsCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedDay, setSelectedDay] = useState<SelectedDayData | null>(null);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  // Group dividends by date
  const getDividendsForDate = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    // Paid dividends
    const paid = dividends.filter(d => d.payment_date === dateStr);
    
    // Upcoming dividends
    const upcoming = upcomingDividends.filter(d => d.payment_date === dateStr);
    
    return { paid, upcoming };
  };

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const today = new Date();
  const isCurrentMonth = today.getMonth() === currentDate.getMonth() && 
                         today.getFullYear() === currentDate.getFullYear();

  const days = [];
  
  // Empty cells for days before the first day of the month
  for (let i = 0; i < firstDay; i++) {
    days.push(<div key={`empty-${i}`} className="h-16 sm:h-20" />);
  }

  // Days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const { paid, upcoming } = getDividendsForDate(day);
    const isToday = isCurrentMonth && day === today.getDate();
    const hasDividends = paid.length > 0 || upcoming.length > 0;
    const isPast = new Date(currentDate.getFullYear(), currentDate.getMonth(), day) < new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    const totalPaid = paid.reduce((sum, d) => sum + d.amount, 0);
    const totalUpcoming = upcoming.reduce((sum, d) => sum + (d.expected_total || d.expected_amount || 0), 0);

    const handleDayClick = () => {
      if (hasDividends) {
        setSelectedDay({ day, paid, upcoming });
      }
    };

    days.push(
      <div
        key={day}
        onClick={handleDayClick}
        className={`h-16 sm:h-20 p-1 border border-border/50 rounded-md relative transition-colors ${
          isToday ? 'bg-primary/10 border-primary' : 
          hasDividends ? 'bg-muted/50 hover:bg-muted' : 'hover:bg-muted/30'
        } ${hasDividends ? 'cursor-pointer' : ''}`}
      >
        <span className={`text-xs font-medium ${
          isToday ? 'text-primary' : 'text-muted-foreground'
        }`}>
          {day}
        </span>
        
        {paid.length > 0 && (
          <div className="mt-1">
            <Badge 
              variant="secondary" 
              className="text-[10px] px-1 py-0 bg-green-500/20 text-green-600 truncate max-w-full"
            >
              ✓ {formatCurrency(totalPaid)}
            </Badge>
          </div>
        )}
        
        {upcoming.length > 0 && (
          <div className="mt-0.5">
            <Badge 
              variant="secondary" 
              className={`text-[10px] px-1 py-0 truncate max-w-full ${
                isPast 
                  ? 'bg-orange-500/20 text-orange-600' 
                  : 'bg-blue-500/20 text-blue-600'
              }`}
            >
              {isPast ? '⏳' : '📅'} {formatCurrency(totalUpcoming)}
            </Badge>
          </div>
        )}
        
        {hasDividends && (paid.length + upcoming.length) > 0 && (
          <div className="absolute bottom-1 right-1">
            <span className="text-[10px] text-muted-foreground">
              {paid.length + upcoming.length} {paid.length + upcoming.length === 1 ? 'ativo' : 'ativos'}
            </span>
          </div>
        )}
      </div>
    );
  }

  // Calculate monthly summary
  const monthlyPaid = dividends
    .filter(d => {
      const date = new Date(d.payment_date);
      return date.getMonth() === currentDate.getMonth() && 
             date.getFullYear() === currentDate.getFullYear();
    })
    .reduce((sum, d) => sum + d.amount, 0);

  const monthlyUpcoming = upcomingDividends
    .filter(d => {
      const date = new Date(d.payment_date);
      return date.getMonth() === currentDate.getMonth() && 
             date.getFullYear() === currentDate.getFullYear();
    })
    .reduce((sum, d) => sum + (d.expected_total || d.expected_amount || 0), 0);

  return (
    <Card>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="h-5 w-5 text-primary" />
              Calendário de Proventos
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={previousMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="font-medium text-sm min-w-[140px] text-center">
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </span>
              <Button variant="ghost" size="icon" onClick={nextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {/* Monthly summary - always visible */}
          <div className="flex items-center justify-between mt-2">
            <div className="flex gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                <span className="text-xs text-muted-foreground">
                  Recebido: <span className="font-medium text-green-600">{formatCurrency(monthlyPaid)}</span>
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span className="text-xs text-muted-foreground">
                  Previsto: <span className="font-medium text-blue-600">{formatCurrency(monthlyUpcoming)}</span>
                </span>
              </div>
            </div>
            
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1">
                {isExpanded ? (
                  <>
                    <ChevronUp className="h-4 w-4" />
                    <span className="text-xs">Recolher</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4" />
                    <span className="text-xs">Expandir</span>
                  </>
                )}
              </Button>
            </CollapsibleTrigger>
          </div>
        </CardHeader>
        
        <CollapsibleContent>
          <CardContent>
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {dayNames.map((day) => (
                <div key={day} className="text-center text-xs font-medium text-muted-foreground py-1">
                  {day}
                </div>
              ))}
            </div>
            
            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {days}
            </div>
            
            {/* Legend */}
            <div className="flex items-center justify-center gap-4 mt-4 pt-3 border-t">
              <div className="flex items-center gap-1.5">
                <Badge variant="secondary" className="text-[10px] px-1 py-0 bg-green-500/20 text-green-600">
                  ✓
                </Badge>
                <span className="text-xs text-muted-foreground">Pago</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Badge variant="secondary" className="text-[10px] px-1 py-0 bg-blue-500/20 text-blue-600">
                  📅
                </Badge>
                <span className="text-xs text-muted-foreground">Previsto</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Badge variant="secondary" className="text-[10px] px-1 py-0 bg-orange-500/20 text-orange-600">
                  ⏳
                </Badge>
                <span className="text-xs text-muted-foreground">Atrasado</span>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>

      {/* Day Details Dialog */}
      <Dialog open={!!selectedDay} onOpenChange={() => setSelectedDay(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Proventos em {selectedDay?.day} de {monthNames[currentDate.getMonth()]}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Paid dividends */}
            {selectedDay?.paid && selectedDay.paid.length > 0 && (
              <div>
                <h4 className="font-medium text-green-600 mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  Recebidos
                </h4>
                <div className="space-y-2">
                  {selectedDay.paid.map(d => (
                    <div key={d.id} className="flex justify-between items-center py-2 px-3 bg-muted/50 rounded-lg">
                      <div>
                        <span className="font-medium">{d.ticker}</span>
                        <span className="text-sm text-muted-foreground ml-2 capitalize">
                          {d.dividend_type}
                        </span>
                      </div>
                      <span className="font-medium text-green-600">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(d.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Upcoming dividends */}
            {selectedDay?.upcoming && selectedDay.upcoming.length > 0 && (
              <div>
                <h4 className="font-medium text-blue-600 mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  Previstos
                </h4>
                <div className="space-y-2">
                  {selectedDay.upcoming.map((d, i) => (
                    <div key={i} className="flex justify-between items-center py-2 px-3 bg-muted/50 rounded-lg">
                      <div>
                        <span className="font-medium">{d.ticker}</span>
                        <span className="text-sm text-muted-foreground ml-2 capitalize">
                          {d.dividend_type}
                        </span>
                        <span className="text-xs text-muted-foreground block">
                          {d.quantity} cotas
                        </span>
                      </div>
                      <span className="font-medium text-blue-600">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(d.expected_total || d.expected_amount || 0)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Daily total */}
            {selectedDay && (
              <div className="pt-4 border-t flex justify-between items-center">
                <span className="font-medium">Total do dia</span>
                <span className="font-bold text-lg">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                    (selectedDay.paid?.reduce((sum, d) => sum + d.amount, 0) || 0) +
                    (selectedDay.upcoming?.reduce((sum, d) => sum + (d.expected_total || d.expected_amount || 0), 0) || 0)
                  )}
                </span>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
