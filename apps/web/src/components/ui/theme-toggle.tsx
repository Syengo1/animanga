"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // Prevents hydration mismatch by ensuring the component only renders the icon after mounting
  React.useEffect(() => setMounted(true), []);

  if (!mounted)
    return (
      <Button variant="ghost" size="icon" className="w-9 h-9 rounded-full" />
    );

  return (
    <Button
      variant="ghost"
      size="icon"
      className="rounded-full w-9 h-9 transition-colors"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      aria-label="Toggle theme"
    >
      {theme === "dark" ? (
        <Moon className="h-4 w-4" />
      ) : (
        <Sun className="h-4 w-4" />
      )}
    </Button>
  );
}
