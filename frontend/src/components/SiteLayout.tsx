import type { ReactNode } from "react";

import { useBrandVersion } from "../hooks/useBrandVersion";
import { readBrandMode } from "../themeColor";
import "../site-chrome.css";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";
import { ThemeColorPicker } from "./ThemeColorPicker";

export interface SiteLayoutProps {
  isAdmin?: boolean;
  postCount?: number;
  placeCount?: number;
  onOpenSearch?: () => void;
  hideFooter?: boolean;
  children: ReactNode;
}

/** Single dark chrome shell — every route shares home’s ground and copy colors. */
export function SiteLayout({
  isAdmin = false,
  postCount,
  placeCount,
  onOpenSearch,
  hideFooter = false,
  children,
}: SiteLayoutProps) {
  useBrandVersion();
  const tone = readBrandMode();
  return (
    <div className="wf-site" data-tone={tone}>
      <SiteHeader isAdmin={isAdmin} onOpenSearch={onOpenSearch} />
      <main className="wf-main">{children}</main>
      {hideFooter ? null : (
        <SiteFooter isAdmin={isAdmin} postCount={postCount} placeCount={placeCount} />
      )}
      <ThemeColorPicker />
    </div>
  );
}
