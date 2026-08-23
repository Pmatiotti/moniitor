import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, TrendingUp, DollarSign, Users, Menu, Bell, BarChart3, BookOpen, Target, Scale, Calculator, Shield, Wallet, GraduationCap, Building2, Lock, LineChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState, useEffect, useRef } from "react";
import { useIsAdmin, useIsAdvisor, useIsManager } from "@/hooks/useUserRole";
import { GoalsSidebarWidget } from "@/components/sidebar/GoalsSidebarWidget";
import { useSidebarContext } from "@/contexts/SidebarContext";
import { useFeatureAccess, FeatureKey } from "@/hooks/useFeatureAccess";
import { UpgradeDialog } from "@/components/subscription/UpgradeDialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PLAN_INFO } from "@/config/plan-features";

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  feature?: FeatureKey;
}

const navigation: NavigationItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Carteira", href: "/portfolio", icon: TrendingUp, feature: 'portfolio' },
  { name: "Patrimônio", href: "/patrimony", icon: Building2, feature: 'patrimony' },
  { name: "Proventos", href: "/dividends", icon: DollarSign, feature: 'dividends' },
  { name: "Finanças", href: "/finances", icon: Wallet, feature: 'finances' },
  { name: "Metas", href: "/goals", icon: Target, feature: 'goals' },
  { name: "Rebalanceamento", href: "/rebalancing", icon: Scale, feature: 'auto_rebalancing' },
  { name: "Planejamento", href: "/planning", icon: Calculator, feature: 'planning' },
  { name: "Alertas", href: "/alerts", icon: Bell, feature: 'alerts' },
  { name: "Performance", href: "/performance", icon: BarChart3, feature: 'performance' },
  { name: "MONIITOR Ticker", href: "/ticker", icon: LineChart },
  { name: "Educação", href: "/education", icon: BookOpen, feature: 'education' },
  { name: "CRM", href: "/crm", icon: Users, feature: 'crm' },
];

export const Sidebar = () => {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const { isAdmin } = useIsAdmin();
  const { isAdvisor } = useIsAdvisor();
  const { isManager } = useIsManager();
  const { canAccess, getRequiredPlan, isLoading: isLoadingAccess } = useFeatureAccess();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  
  // State for upgrade dialog
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState<FeatureKey | null>(null);
  
  // Get sidebar context - use try/catch to handle cases where context might not be available
  let sidebarContext: { isLocked: boolean; forceExpand: boolean } | null = null;
  try {
    sidebarContext = useSidebarContext();
  } catch {
    // Context not available, use default behavior
  }

  const isLocked = sidebarContext?.isLocked ?? false;
  const forceExpand = sidebarContext?.forceExpand ?? false;

  // Force expand when tour is running
  useEffect(() => {
    if (forceExpand && collapsed) {
      setCollapsed(false);
    }
  }, [forceExpand]);

  // Auto-collapse após 3 segundos de inatividade
  const startCollapseTimer = () => {
    // Don't start timer if sidebar is locked (tour running)
    if (isLocked) return;
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      if (!isLocked) {
        setCollapsed(true);
      }
    }, 3000);
  };

  const cancelCollapseTimer = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  useEffect(() => {
    // Iniciar timer quando componente monta (apenas se não estiver collapsed e não estiver locked)
    if (!collapsed && !isLocked) {
      startCollapseTimer();
    }

    return () => {
      cancelCollapseTimer();
    };
  }, [isLocked]);

  const handleMouseEnter = () => {
    cancelCollapseTimer();
    setCollapsed(false);
  };

  const handleMouseLeave = () => {
    if (!isLocked) {
      startCollapseTimer();
    }
  };

  const handleNavigationClick = (e: React.MouseEvent, item: NavigationItem) => {
    // Skip check if no feature restriction or still loading
    if (!item.feature || isLoadingAccess) return;
    
    const hasAccess = canAccess(item.feature);
    
    if (!hasAccess) {
      e.preventDefault();
      setSelectedFeature(item.feature);
      setUpgradeDialogOpen(true);
    }
  };

  const renderNavigationItem = (item: NavigationItem) => {
    // Hide CRM for non-advisors
    if (item.href === '/crm' && !isAdvisor) {
      return null;
    }
    
    const isActive = location.pathname === item.href;
    const hasAccess = item.feature ? (isLoadingAccess || canAccess(item.feature)) : true;
    const requiredPlan = item.feature ? getRequiredPlan(item.feature) : null;
    
    const linkContent = (
      <Link
        key={item.name}
        to={hasAccess ? item.href : '#'}
        onClick={(e) => handleNavigationClick(e, item)}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors group relative",
          isActive
            ? "bg-primary text-primary-foreground"
            : hasAccess
              ? "text-muted-foreground hover:bg-muted hover:text-foreground"
              : "text-muted-foreground/50 hover:bg-muted/50 cursor-pointer"
        )}
      >
        <item.icon className="h-5 w-5 flex-shrink-0" />
        {!collapsed && (
          <>
            <span className={cn(!hasAccess && "opacity-60")}>{item.name}</span>
            {!hasAccess && (
              <Lock className="h-3.5 w-3.5 ml-auto text-muted-foreground/50" />
            )}
          </>
        )}
      </Link>
    );

    // Show tooltip for collapsed sidebar with locked features
    if (collapsed && !hasAccess && requiredPlan) {
      return (
        <Tooltip key={item.name}>
          <TooltipTrigger asChild>
            {linkContent}
          </TooltipTrigger>
          <TooltipContent side="right" className="flex items-center gap-2">
            <Lock className="h-3 w-3" />
            <span>Plano {PLAN_INFO[requiredPlan]?.name}</span>
          </TooltipContent>
        </Tooltip>
      );
    }

    return linkContent;
  };

  return (
    <>
      <div 
        ref={sidebarRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={cn(
        "flex flex-col border-r border-border bg-card transition-all duration-300",
        collapsed ? "w-20" : "w-64",
        isLocked && "z-[10001]"
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-border px-6">
          {!collapsed && (
            <h1 className="text-2xl font-bold text-primary">MONIITOR</h1>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="ml-auto"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
        
        {!collapsed && <GoalsSidebarWidget />}
        
        <nav className="flex-1 space-y-1 p-4">
          {navigation.map(renderNavigationItem)}
          
          {/* Admin link - only visible to admins */}
          {isAdmin && (
            <>
              <Link
                to="/admin"
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  location.pathname === '/admin'
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Shield className="h-5 w-5 flex-shrink-0" />
                {!collapsed && <span>Admin</span>}
              </Link>
              <Link
                to="/education-admin"
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  location.pathname === '/education-admin'
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <GraduationCap className="h-5 w-5 flex-shrink-0" />
                {!collapsed && <span>Gestão Educação</span>}
              </Link>
            </>
          )}

          {/* Management link - only visible to managers */}
          {isManager && (
            <Link
              to="/management"
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                location.pathname === '/management'
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Building2 className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span>Gestão Escritório</span>}
            </Link>
          )}
        </nav>

      </div>

      {/* Upgrade Dialog */}
      {selectedFeature && (
        <UpgradeDialog
          open={upgradeDialogOpen}
          onOpenChange={setUpgradeDialogOpen}
          feature={selectedFeature}
        />
      )}
    </>
  );
};
