import { ReactNode } from "react";
import { Header } from "./Header";
import { BottomTabBar } from "./BottomTabBar";
import { SaveSheet } from "./SaveSheet";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="wf-shell-container">
      <Header />
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {children}
      </div>
      <BottomTabBar />
      <SaveSheet />
    </div>
  );
}
