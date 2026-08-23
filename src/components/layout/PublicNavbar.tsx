import { Button } from "@/components/ui/button";
import { BarChart3 } from "lucide-react";
import { useNavigate, useLocation, Link } from "react-router-dom";

const PublicNavbar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navLinks = [
    { label: "Início", path: "/" },
    { label: "Ticker", path: "/ticker" },
    { label: "Sobre", path: "/about" },
    { label: "Planos", path: "/plans" },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link
            to="/"
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <BarChart3 className="h-7 w-7 text-primary" />
            <span className="text-xl font-bold text-foreground">MONIITOR</span>
          </Link>

          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <button
                key={link.path}
                onClick={() => navigate(link.path)}
                className={`text-sm font-medium transition-colors hover:text-foreground ${
                  location.pathname === link.path
                    ? "text-foreground"
                    : "text-muted-foreground"
                }`}
              >
                {link.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/auth")}>
            Entrar
          </Button>
          <Button size="sm" onClick={() => navigate("/plans")}>
            Começar Grátis
          </Button>
        </div>
      </div>
    </nav>
  );
};

export default PublicNavbar;
