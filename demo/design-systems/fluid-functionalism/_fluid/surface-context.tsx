/*
 * Vendored from the Fluid Functionalism registry (@fluid namespace,
 * fluidfunctionalism.com — MIT License © 2026 Micka Touillaud), pulled with
 * `bunx shadcn@latest add @fluid/surface-context` (shadcn CLI 4.21.0) into a scratch
 * scaffold. Local modifications: `@/…` imports rewritten to relative paths for the modo layout; `framer-motion` imports rewritten to `motion/react`; `"use client"` directives dropped (non-RSC).
 */

import { createContext, useContext, type ReactNode } from "react";

const SurfaceContext = createContext<number>(1);

export function useSurface(): number {
  return useContext(SurfaceContext);
}

export function SurfaceProvider({
  value,
  children,
}: {
  value: number;
  children: ReactNode;
}) {
  return (
    <SurfaceContext.Provider value={Math.max(1, Math.min(8, value))}>
      {children}
    </SurfaceContext.Provider>
  );
}
