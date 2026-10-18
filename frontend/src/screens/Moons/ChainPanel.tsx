/**
 * The planet's lessons as a hash chain: the star's introduction is the genesis record, then every lesson in order.
 * "Tamper" rewrites a lesson's text. Its hash changes, and so does every later one, because each hash covers the
 * one before: those records stop matching and their chapters turn red on the ring. "Restore" puts the original back.
 * The backend recomputes the chain (POST /api/systems/{id}/verify); edits are only kept in this browser.
 * Side panel on wide screens (left, under the HUD), bottom sheet on phones.
 */
import { useState, type FormEvent } from 'react'
import type { VerifyResult } from '../../api/content'
import type { Moon, Planet } from './types'

const EDGE = 'border border-[rgba(140,170,255,.17)]'
const short = (hash?: string | null) => (hash ? hash.slice(0, 10) : '…')

export interface ChainPanelProps {
  planet: Planet
  /** moon id -> the learner's text */
  edits: Record<string, string>
  result: VerifyResult | null
  checking: boolean
  failed: boolean
  /** null restores the original text */
  onEdit: (moonId: string, body: string | null) => void
  onClose: () => void
}

export function ChainPanel({ planet, edits, result, checking, failed, onEdit, onClose }: ChainPanelProps) {
  const moons = planet.orbits.flatMap((orbit) => orbit.moons)
  const status = new Map(result?.moons.map((m) => [m.id, m]))
  const brokenCount = result?.moons.filter((m) => !m.valid).length ?? 0
  const firstBroken = moons.find((m) => m.id === result?.first_broken)
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState('')

  function startEditing(moon: Moon) {
    setEditing(moon.id)
    setDraft(edits[moon.id] ?? moon.body)
  }
  function save(e: FormEvent, moon: Moon) {
    e.preventDefault()
    onEdit(moon.id, draft === moon.body ? null : draft)
    setEditing(null)
  }

  const summary = failed ? "Can't reach the chain checker right now. Check that the backend is running."
    : checking ? 'Checking the chain…'
    : firstBroken ? `${brokenCount} of ${moons.length} records no longer match, from ${firstBroken.title} onwards.`
    : `All ${moons.length} records match their hashes.`

  return (
    <aside
      aria-label="Hash chain"
      className={`${EDGE} pointer-events-auto absolute z-30 flex flex-col overflow-hidden bg-glass backdrop-blur-lg max-sm:inset-x-0 max-sm:bottom-0 max-sm:max-h-[60%] max-sm:rounded-t-[20px] max-sm:border-b-0 sm:bottom-4 sm:left-4 sm:top-[112px] sm:w-[380px] sm:rounded-[20px]`}
    >
      <header className="flex items-start justify-between gap-3 border-b border-[rgba(140,170,255,.17)] px-[18px] pb-3 pt-3.5">
        <div>
          <div className="font-mono text-[11.5px] uppercase tracking-[.16em] text-mint">Hash chain</div>
          <p role="status" className={`mt-1 text-sm ${(firstBroken && !checking) || failed ? 'text-coral' : 'text-[#cdd5ea]'}`}>{summary}</p>
        </div>
        <button type="button" onClick={onClose} className={`${EDGE} shrink-0 rounded-[10px] bg-white/5 px-3 py-[7px] text-[13.5px] font-bold hover:brightness-125`}>
          Close
        </button>
      </header>
      <ol className="flex flex-col gap-2 overflow-auto p-[18px]">
        <li className={`${EDGE} rounded-xl bg-white/[.03] px-3 py-2`}>
          <b className="text-[14px]">0. {planet.title} introduction</b>
          <span className="mt-0.5 block font-mono text-[11.5px] text-muted">genesis · {short(planet.star.hash)}</span>
        </li>
        {moons.map((moon, i) => {
          const now = status.get(moon.id)
          const valid = now?.valid ?? true
          const edited = moon.id in edits
          return (
            <li key={moon.id} className={`${EDGE} rounded-xl px-3 py-2 transition-colors duration-300 ${valid ? 'bg-white/[.03]' : 'border-coral/40! bg-coral/[.07]'}`}>
              <span className="flex items-center justify-between gap-2">
                <b className="text-[14px]">{i + 1}. {moon.title}</b>
                <span className={`shrink-0 font-mono text-[11px] uppercase tracking-widest ${edited ? 'text-gold' : valid ? 'text-mint' : 'text-coral'}`}>
                  {edited ? '✎ edited' : valid ? '✓ match' : '✗ broken'}
                </span>
              </span>
              <span className="mt-0.5 block font-mono text-[11.5px] text-muted">
                {valid ? <>hash {short(moon.hash)}</> : <>record {short(moon.hash)} · now <span className="text-coral">{short(now?.hash)}</span></>}
              </span>
              {editing === moon.id ? (
                <form onSubmit={(e) => save(e, moon)} className="mt-2 flex flex-col gap-2">
                  <textarea
                    aria-label={`${moon.title} lesson text`}
                    autoFocus
                    rows={6}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    className="rounded-lg border border-white/15 bg-white/5 p-2 text-[13px] text-ink outline-none focus:border-gold"
                  />
                  <span className="flex gap-2">
                    <button type="submit" className="rounded-lg bg-gold px-3 py-1.5 text-[13px] font-bold text-[#1c1300]">Save edit</button>
                    <button type="button" onClick={() => setEditing(null)} className={`${EDGE} rounded-lg bg-white/5 px-3 py-1.5 text-[13px] font-bold`}>Cancel</button>
                  </span>
                </form>
              ) : (
                <span className="mt-2 flex gap-2">
                  <button type="button" onClick={() => startEditing(moon)} className={`${EDGE} rounded-lg bg-white/5 px-2.5 py-1 text-[12.5px] font-bold hover:brightness-125`}>
                    {edited ? 'Edit again' : 'Tamper'}
                  </button>
                  {edited && (
                    <button type="button" onClick={() => onEdit(moon.id, null)} className="rounded-lg border border-mint/40 px-2.5 py-1 text-[12.5px] font-bold text-mint hover:bg-mint/10">
                      Restore
                    </button>
                  )}
                </span>
              )}
            </li>
          )
        })}
      </ol>
      {Object.keys(edits).length > 0 && (
        <footer className="border-t border-[rgba(140,170,255,.17)] px-[18px] py-3">
          <button type="button" onClick={() => Object.keys(edits).forEach((id) => onEdit(id, null))} className="w-full rounded-xl border border-mint/40 px-3 py-2 text-sm font-bold text-mint hover:bg-mint/10">
            Restore every lesson
          </button>
        </footer>
      )}
    </aside>
  )
}
