import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Search, Filter, X, SlidersHorizontal } from "lucide-react";
import { Client } from "@/pages/CRM";

interface ClientSearchFiltersProps {
  clients: Client[];
  onFilter: (filtered: Client[]) => void;
}

export const ClientSearchFilters = ({ clients, onFilter }: ClientSearchFiltersProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [riskFilter, setRiskFilter] = useState<string>("all");
  const [minPortfolio, setMinPortfolio] = useState<string>("");
  const [maxPortfolio, setMaxPortfolio] = useState<string>("");

  const applyFilters = () => {
    let filtered = [...clients];

    // Busca por texto
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.name.toLowerCase().includes(term) ||
          c.email?.toLowerCase().includes(term) ||
          c.phone?.toLowerCase().includes(term)
      );
    }

    // Filtro de status
    if (statusFilter !== "all") {
      filtered = filtered.filter((c) => c.status === statusFilter);
    }

    // Filtro de perfil de risco
    if (riskFilter !== "all") {
      filtered = filtered.filter(
        (c) => c.risk_profile?.toLowerCase() === riskFilter.toLowerCase()
      );
    }

    // Filtro de patrimônio mínimo
    if (minPortfolio) {
      const min = parseFloat(minPortfolio);
      filtered = filtered.filter((c) => Number(c.portfolio_value || 0) >= min);
    }

    // Filtro de patrimônio máximo
    if (maxPortfolio) {
      const max = parseFloat(maxPortfolio);
      filtered = filtered.filter((c) => Number(c.portfolio_value || 0) <= max);
    }

    onFilter(filtered);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setRiskFilter("all");
    setMinPortfolio("");
    setMaxPortfolio("");
    onFilter(clients);
  };

  const hasActiveFilters =
    searchTerm ||
    statusFilter !== "all" ||
    riskFilter !== "all" ||
    minPortfolio ||
    maxPortfolio;

  const activeFiltersCount = [
    searchTerm,
    statusFilter !== "all",
    riskFilter !== "all",
    minPortfolio,
    maxPortfolio,
  ].filter(Boolean).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Busca */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar cliente por nome, email ou telefone..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              // Auto-apply em busca de texto
              const newTerm = e.target.value;
              let filtered = [...clients];
              if (newTerm) {
                const term = newTerm.toLowerCase();
                filtered = filtered.filter(
                  (c) =>
                    c.name.toLowerCase().includes(term) ||
                    c.email?.toLowerCase().includes(term) ||
                    c.phone?.toLowerCase().includes(term)
                );
              }
              onFilter(filtered);
            }}
            className="pl-10"
          />
        </div>

        {/* Filtros Avançados */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              Filtros
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-sm mb-3">Filtros Avançados</h4>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="novo">Novo</SelectItem>
                    <SelectItem value="inactive">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Perfil de Risco</label>
                <Select value={riskFilter} onValueChange={setRiskFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="conservador">Conservador</SelectItem>
                    <SelectItem value="moderado">Moderado</SelectItem>
                    <SelectItem value="arrojado">Arrojado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Patrimônio</label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Mínimo"
                    value={minPortfolio}
                    onChange={(e) => setMinPortfolio(e.target.value)}
                  />
                  <Input
                    type="number"
                    placeholder="Máximo"
                    value={maxPortfolio}
                    onChange={(e) => setMaxPortfolio(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button onClick={applyFilters} className="flex-1">
                  <Filter className="mr-2 h-4 w-4" />
                  Aplicar
                </Button>
                <Button
                  onClick={clearFilters}
                  variant="outline"
                  disabled={!hasActiveFilters}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Filtros Ativos */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">Filtros ativos:</span>
          {statusFilter !== "all" && (
            <Badge variant="secondary" className="gap-1">
              Status: {statusFilter}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => {
                  setStatusFilter("all");
                  applyFilters();
                }}
              />
            </Badge>
          )}
          {riskFilter !== "all" && (
            <Badge variant="secondary" className="gap-1">
              Risco: {riskFilter}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => {
                  setRiskFilter("all");
                  applyFilters();
                }}
              />
            </Badge>
          )}
          {minPortfolio && (
            <Badge variant="secondary" className="gap-1">
              Min: R$ {Number(minPortfolio).toLocaleString("pt-BR")}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => {
                  setMinPortfolio("");
                  applyFilters();
                }}
              />
            </Badge>
          )}
          {maxPortfolio && (
            <Badge variant="secondary" className="gap-1">
              Max: R$ {Number(maxPortfolio).toLocaleString("pt-BR")}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => {
                  setMaxPortfolio("");
                  applyFilters();
                }}
              />
            </Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-7 text-xs"
          >
            Limpar todos
          </Button>
        </div>
      )}
    </div>
  );
};
