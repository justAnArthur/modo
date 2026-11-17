/*
 * Mock: a busy minute on a laptop for the System widget, readings with
 * memory pressure, the battery, the disk, the uptime and the busiest
 * processes. Nothing here ships in the barrel.
 */

import type { StatsBattery, StatsDisk, StatsProcess, StatsSample } from '../blocks/system/system-stats'

const wave = (i: number, base: number, swing: number) =>
  base + swing * Math.sin(i / 2.4) + swing * 0.4 * Math.sin(i * 1.7)

const clamp = (v: number) => Math.min(1, Math.max(0.02, v))

/** Forty readings a second apart, oldest first, CPU climbing toward the end. */
export const READINGS: StatsSample[] = Array.from({ length: 40 }, (_, i) => ({
  cpu: clamp(wave(i, 0.3 + i * 0.006, 0.12)),
  memoryUsed: wave(i, 11.4e9, 0.2e9),
  memoryTotal: 16e9,
  memoryPressure: clamp(wave(i, 0.46, 0.04)),
  netIn: Math.max(0, wave(i, 2.4e6, 1.6e6)),
  netOut: Math.max(0, wave(i + 5, 0.4e6, 0.3e6)),
}))

/** Readings with memory nearly full: pressure is the telling figure. */
export const PRESSURE_READINGS: StatsSample[] = READINGS.map((sample, i) => ({
  ...sample,
  memoryUsed: 15.1e9 + 0.2e9 * Math.sin(i / 3),
  memoryPressure: clamp(0.82 + 0.06 * Math.sin(i / 3)),
}))

export const BATTERY: StatsBattery = { level: 64, charging: false, minutesLeft: 3 * 60 + 40 }

export const CHARGING: StatsBattery = { level: 82, charging: true, minutesLeft: 38 }

export const DISK: StatsDisk = { free: 212e9, total: 494e9 }

/** Three days, four hours. */
export const UPTIME = (3 * 24 + 4) * 3600 + 17 * 60

export const PROCESSES: StatsProcess[] = [
  { id: '812', name: 'Xcode', cpu: 0.214, memory: 3.2e9 },
  { id: '233', name: 'Safari', cpu: 0.087, memory: 1.9e9 },
  { id: '1043', name: 'WindowServer', cpu: 0.052, memory: 0.6e9 },
  { id: '97', name: 'Figma', cpu: 0.031, memory: 1.1e9 },
  { id: '1520', name: 'Music', cpu: 0.012, memory: 0.3e9 },
]
