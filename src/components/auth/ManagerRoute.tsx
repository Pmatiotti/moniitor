import { ReactNode, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useIsManager } from "@/hooks/useUserRole";

interface ManagerRouteProps {
  children: ReactNode;
}

export const ManagerRoute = ({ children }: ManagerRouteProps) => {
  const { isManager, isLoading } = useIsManager();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!isLoading) {
      setChecking(false);
    }
  }, [isLoading]);

  if (checking || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isManager) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};
