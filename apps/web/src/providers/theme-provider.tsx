// C:\Projects\animanga-platform\apps\web\src\providers\theme-provider.tsx
"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({
  children,
  scriptProps,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  // Keep `type` unset during SSR so the pre-hydration theme script executes normally (zero FOUC).
  // On the client, mark it as `application/json` so React 19 skips its false-positive script warning.
  const resolvedScriptProps =
    typeof window === "undefined"
      ? scriptProps
      : { ...scriptProps, type: "application/json" };

  return (
    <NextThemesProvider {...props} scriptProps={resolvedScriptProps}>
      {children}
    </NextThemesProvider>
  );
}
