import { ReactNode } from "react";
import { Header } from "./Header";
import { BottomTabBar } from "./BottomTabBar";
import { SaveSheet } from "./SaveSheet";

interface AppShellProps {
  children: ReactNode;
  isAdmin?: boolean;
  isSuperAdmin?: boolean;
  onViewAsChange?: (userId: string | null) => void;
}

export function AppShell({
  children,
  isAdmin = false,
  isSuperAdmin = false,
  onViewAsChange,
}: AppShellProps) {
  return (
    <div className="wf-shell-container">
      <Header
        isAdmin={isAdmin}
        isSuperAdmin={isSuperAdmin}
        onViewAsChange={onViewAsChange}
      />
      <div className="wf-main-content">
        {children}
      </div>
      <BottomTabBar />
      <SaveSheet />
    </div>
  );
}
