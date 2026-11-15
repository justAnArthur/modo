/*
 * Local addition (not part of Fluid Functionalism): a layout effect that
 * server-renders.
 */

'use client'

import { useEffect, useLayoutEffect } from 'react'

/**
 * `useLayoutEffect` in the browser, `useEffect` on the server, where
 * `useLayoutEffect` warns (RSC hosts server-render client components).
 */
export const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect
