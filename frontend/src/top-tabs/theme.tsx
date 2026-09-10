import { createContext, useContext, type ReactNode } from "react";

import { TOP_TABS_BASE } from "./paths";

type LabThemeValue = { basePath: string };

const LabThemeContext = createContext<LabThemeValue>({ basePath: TOP_TABS_BASE });

export function LabThemeProvider({
  basePath,
  children,
}: {
  basePath: string;
  children: ReactNode;
}) {
  return <LabThemeContext.Provider value={{ basePath }}>{children}</LabThemeContext.Provider>;
}

export function useLabTheme() {
  return useContext(LabThemeContext);
}
