import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BarChart3 } from "lucide-react";

export function PublicStockNavbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <BarChart3 className="h-7 w-7 text-primary" />
          <span className="text-xl font-bold text-foreground">MONIITOR</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          <Link 
            to="/" 
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Início
          </Link>
          <Link 
            to="/ticker" 
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Ticker
          </Link>
          <Link 
            to="/about" 
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Sobre
          </Link>
          <Link 
            to="/plans" 
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Planos
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link to="/auth">
            <Button variant="ghost" size="sm">
              Entrar
            </Button>
          </Link>
          <Link to="/plans">
            <Button size="sm">
              Começar Grátis
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
