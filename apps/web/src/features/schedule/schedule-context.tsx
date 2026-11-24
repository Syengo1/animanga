// C:\Projects\animanga-platform\apps\web\src\features\schedule\schedule-context.tsx
"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";

interface ScheduleContextValue {
  isOpen: boolean;
  openSchedule: () => void;
  closeSchedule: () => void;
  toggleSchedule: () => void;
}

const ScheduleContext = createContext<ScheduleContextValue | undefined>(
  undefined,
);

export function ScheduleProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const openSchedule = useCallback(() => setIsOpen(true), []);
  const closeSchedule = useCallback(() => setIsOpen(false), []);
  const toggleSchedule = useCallback(() => setIsOpen((prev) => !prev), []);

  return (
    <ScheduleContext.Provider
      value={{ isOpen, openSchedule, closeSchedule, toggleSchedule }}
    >
      {children}
    </ScheduleContext.Provider>
  );
}

export function useScheduleDrawer() {
  const ctx = useContext(ScheduleContext);
  if (!ctx) {
    throw new Error(
      "useScheduleDrawer must be used inside a <ScheduleProvider>",
    );
  }
  return ctx;
}
