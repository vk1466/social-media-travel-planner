import { ReactNode } from "react";
import { Header } from "./Header";
import { DesktopSidebar } from "./DesktopSidebar";
import { DesktopTopBar } from "./DesktopTopBar";
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
    <div
      className="wf-shell-container"
      style={{
        display: "flex",
        flexDirection: "row",
        minHeight: "100dvh",
        width: "100%",
        maxWidth: "100vw",
        overflowX: "hidden",
      }}
    >
      {/* 240px Left Sidebar for Desktop */}
      <DesktopSidebar
        isAdmin={isAdmin}
        isSuperAdmin={isSuperAdmin}
        onViewAsChange={onViewAsChange}
      />

      {/* Main Content Column */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          maxWidth: "100%",
        }}
      >
        {/* Mobile top header (< 1024px) */}
        <div className="wf-mobile-only" style={{ width: "100%" }}>
          <Header
            isAdmin={isAdmin}
            isSuperAdmin={isSuperAdmin}
            onViewAsChange={onViewAsChange}
          />
        </div>

        {/* Desktop TopBar (>= 1024px) with ⌘K search */}
        <DesktopTopBar
          isSuperAdmin={isSuperAdmin}
          onViewAsChange={onViewAsChange}
        />

        {/* Primary Page Content */}
        <div className="wf-main-content">
          {children}
        </div>
      </div>

      {/* Bottom Tab Bar for Mobile with central Save FAB */}
      <BottomTabBar />

      {/* Save Sheet / Modal */}
      <SaveSheet />
    </div>
  );
}
