/**
 * Checks the learner's lesson edits against a chain planet's hash chain (POST /api/systems/{id}/verify).
 * Without edits nothing is sent: every moon matches its record. Planets the backend hasn't sealed
 * (no chain, or the offline mock planet) aren't checked.
 */
import { useEffect, useMemo, useState } from 'react'
import { verifyChain, type VerifyResult } from '../../api/content'
import type { Planet } from './types'

export interface ChainCheck {
  /** the planet's lessons form a hash chain sealed by the backend */
  sealed: boolean
  /** the latest answer, kept while a newer check runs so the moons don't flicker; null if there is none or it failed */
  result: VerifyResult | null
  checking: boolean
  failed: boolean
}

export function useChainCheck(planet: Planet, edits: Record<string, string>): ChainCheck {
  const sealed = planet.chain && !!planet.star.hash
  const key = JSON.stringify(edits)
  const unedited = key === '{}'
  // the chain as sealed: every moon matches its record
  const records = useMemo<VerifyResult>(() => ({
    first_broken: null,
    moons: planet.orbits.flatMap((orbit) => orbit.moons).map((moon) => ({ id: moon.id, hash: moon.hash ?? '', valid: true })),
  }), [planet])
  const [checked, setChecked] = useState<{ key: string; result: VerifyResult | null } | null>(null)

  useEffect(() => {
    if (!sealed || unedited) return
    const controller = new AbortController()
    verifyChain(planet.id, JSON.parse(key), controller.signal).then(
      (result) => setChecked({ key, result }),
      () => { if (!controller.signal.aborted) setChecked({ key, result: null }) },
    )
    return () => controller.abort()
  }, [sealed, unedited, planet.id, key])

  if (!sealed) return { sealed, result: null, checking: false, failed: false }
  if (unedited) return { sealed, result: records, checking: false, failed: false }
  const current = checked?.key === key
  return { sealed, result: checked?.result ?? null, checking: !current, failed: current && !checked.result }
}
