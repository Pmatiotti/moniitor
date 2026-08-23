import { createContext, useContext, useState, ReactNode } from "react";

interface SidebarContextType {
  isLocked: boolean;
  lockSidebar: () => void;
  unlockSidebar: () => void;
  forceExpand: boolean;
  setForceExpand: (value: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export const SidebarProvider = ({ children }: { children: ReactNode }) => {
  const [isLocked, setIsLocked] = useState(false);
  const [forceExpand, setForceExpand] = useState(false);

  const lockSidebar = () => {
    setIsLocked(true);
    setForceExpand(true);
  };

  const unlockSidebar = () => {
    setIsLocked(false);
    setForceExpand(false);
  };

  return (
    <SidebarContext.Provider value={{ isLocked, lockSidebar, unlockSidebar, forceExpand, setForceExpand }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const useSidebarContext = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebarContext must be used within a SidebarProvider");
  }
  return context;
};
