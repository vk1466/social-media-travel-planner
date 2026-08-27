import type { ReactNode } from "react";

import { useBrandVersion } from "../hooks/useBrandVersion";
import { readBrandMode } from "../themeColor";
import "../site-chrome.css";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";
import { BentoMotionPicker } from "./BentoMotionPicker";
import { ThemeColorPicker } from "./ThemeColorPicker";

export interface SiteLayoutProps {
  isAdmin?: boolean;
  isSuperAdmin?: boolean;
  postCount?: number;
  placeCount?: number;
  hideFooter?: boolean;
  onViewAsChange?: (userId: string | null) => void;
  children: ReactNode;
}

/** Site chrome shell — tone follows brand mode (Midnight Reel defaults to dark). */
export function SiteLayout({
  isAdmin = false,
  isSuperAdmin = false,
  postCount,
  placeCount,
  hideFooter = false,
  onViewAsChange,
  children,
}: SiteLayoutProps) {
  useBrandVersion();
  const tone = readBrandMode();
  return (
    <div className="wf-site" data-tone={tone}>
      <SiteHeader
        isAdmin={isAdmin}
        isSuperAdmin={isSuperAdmin}
        onViewAsChange={onViewAsChange}
      />
      <main className="wf-main">{children}</main>
      {hideFooter ? null : (
        <SiteFooter isAdmin={isAdmin} postCount={postCount} placeCount={placeCount} />
      )}
      <BentoMotionPicker />
      <ThemeColorPicker />
    </div>
  );
}
