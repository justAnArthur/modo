/*!
 * Local addition: the time side of the mock profiles' limits, for the usage
 * concepts. Keyed `<profile id>:<limit label>` so mock.ts stays untouched.
 * Made up, like the rest of the mock: a Sunday afternoon, the weekly windows
 * reset Monday (jobiflow), Thursday (work) and Friday (work-personal).
 */

export interface LimitWindow {
  /** The rolling window's length. */
  windowHours: number
  /** Time until it resets. */
  resetsInHours: number
}

export const WINDOWS: Record<string, LimitWindow> = {
  'jobiflow:Session (5h)': { windowHours: 5, resetsInHours: 2.3 },
  'jobiflow:Weekly, all models': { windowHours: 168, resetsInHours: 20 },
  'jobiflow:Weekly, Opus': { windowHours: 168, resetsInHours: 20 },

  'work:Session (5h)': { windowHours: 5, resetsInHours: 1.2 },
  'work:Weekly, all models': { windowHours: 168, resetsInHours: 100 },

  'work-personal:Session (5h)': { windowHours: 5, resetsInHours: 4.4 },
  'work-personal:Weekly, all models': { windowHours: 168, resetsInHours: 110 },

  'zcode:Prompts (5h)': { windowHours: 5, resetsInHours: 3 },
}
