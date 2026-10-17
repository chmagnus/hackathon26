/**
 * Hashing: a real SHA-256 fingerprint (via the browser's Web Crypto).
 * Scene: text going into the hash machine, two fingerprints compared, and a ledger line checked against its trusted fingerprint.
 * Try it: type anything, make two inputs match or differ, edit the ledger line.
 */
import { useEffect, useState } from 'react'
import StoryLayout, { TryIt, type LessonProps } from '../StoryLayout'

const ORIGINAL = 'Alice pays Bob 5 tokens'

async function sha256(text: string) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** Returns the SHA-256 of `text`, or null while it's being worked out. */
function useSha256(text: string) {
  const [result, setResult] = useState<{ text: string; hash: string } | null>(null)
  useEffect(() => {
    let cancelled = false
    sha256(text).then((hash) => !cancelled && setResult({ text, hash }))
    return () => { cancelled = true }
  }, [text])
  return result?.text === text ? result.hash : null
}

export default function HashingLesson(props: LessonProps) {
  const [a, setA] = useState('Hello Nova')
  const [b, setB] = useState('Hello Nova')
  const [entry, setEntry] = useState(ORIGINAL)

  const hashA = useSha256(a)
  const hashB = useSha256(b)
  const trusted = useSha256(ORIGINAL)
  const hashEntry = useSha256(entry)

  const renderStage = (active: number) => {
    if (active === 0) {
      return (
        <Stage>
          <Label>Input</Label>
          <Box>{a || <i className="text-muted">(empty)</i>}</Box>
          <Machine />
          <Label>Fingerprint (SHA-256)</Label>
          <Hash value={hashA} />
          <p className="text-center text-xs text-muted">Always 64 characters, whatever you type.</p>
        </Stage>
      )
    }
    if (active === 1) {
      const same = hashA !== null && hashA === hashB
      return (
        <Stage>
          <Label>Input A</Label>
          <Box>{a}</Box>
          <Hash value={hashA} small />
          <Label>Input B</Label>
          <Box>{b}</Box>
          <Hash value={hashB} small />
          <Verdict ok={same} yes="Same input, same fingerprint" no="Different input, totally different fingerprint" />
        </Stage>
      )
    }
    const matches = hashEntry !== null && hashEntry === trusted
    return (
      <Stage>
        <Label>Ledger line now</Label>
        <Box>{entry}</Box>
        <Label>Trusted fingerprint (saved when it was written)</Label>
        <Hash value={trusted} small />
        <Label>Fingerprint of the line now</Label>
        <Hash value={hashEntry} small />
        <Verdict ok={matches} yes="Match: the line hasn't been changed" no="Mismatch: someone changed this line!" />
      </Stage>
    )
  }

  const caption = (active: number) =>
    [
      'Any text goes in, a fixed-length fingerprint comes out.',
      'Compare fingerprints instead of comparing the whole text.',
      'Re-hash the line and compare it with the trusted fingerprint.',
      'Same input, same hash. Change it and the hash changes.',
    ][Math.min(active, 3)]

  const input = (value: string, set: (v: string) => void, label: string) => (
    <input
      value={value}
      onChange={(e) => set(e.target.value)}
      aria-label={label}
      className="min-w-0 flex-1 rounded-lg border border-white/15 bg-void px-3 py-1.5 font-mono text-sm text-ink focus:border-gold focus:outline-none"
    />
  )

  const renderExtra = (step: number) => {
    if (step === 0) return <TryIt>{input(a, setA, 'Text to hash')}</TryIt>
    if (step === 1) {
      return (
        <TryIt>
          <span className="w-6 text-muted">A</span>{input(a, setA, 'Input A')}
          <span className="w-full" />
          <span className="w-6 text-muted">B</span>{input(b, setB, 'Input B')}
          <span className="w-full text-muted">Change one letter in B, then change it back.</span>
        </TryIt>
      )
    }
    if (step === 2) {
      return (
        <TryIt>
          {input(entry, setEntry, 'Ledger line')}
          <button onClick={() => setEntry(ORIGINAL)} className="text-sm text-muted underline cursor-pointer">Reset</button>
          <span className="w-full text-muted">Try changing the 5 to 50.</span>
        </TryIt>
      )
    }
    return null
  }

  const algoSays = (active: number) =>
    [
      'A hash is like a fingerprint for data. Type something and watch yours appear!',
      'Make A and B identical, then change just one letter. Watch the whole fingerprint flip!',
      'This is how you catch a sneaky edit: re-hash it and compare with the trusted fingerprint.',
      'Quick check time. Same input in… what comes out?',
    ][Math.min(active, 3)]

  return <StoryLayout {...props} renderStage={renderStage} caption={caption} renderExtra={renderExtra} algoSays={algoSays} />
}

/* ---------- small pieces ---------- */

const Stage = ({ children }: { children: React.ReactNode }) => <div className="flex h-full flex-col justify-center gap-2 overflow-y-auto p-4">{children}</div>
const Label = ({ children }: { children: React.ReactNode }) => <p className="font-mono text-[11px] uppercase tracking-widest text-muted">{children}</p>
const Box = ({ children }: { children: React.ReactNode }) => <div className="rounded-lg bg-white/5 px-3 py-2 font-mono text-sm break-all">{children}</div>

function Machine() {
  return (
    <div className="my-1 flex items-center justify-center gap-2 text-gold">
      <span>↓</span>
      <span className="rounded-full border border-gold/50 px-3 py-0.5 font-mono text-xs">SHA-256</span>
      <span>↓</span>
    </div>
  )
}

function Hash({ value, small }: { value: string | null; small?: boolean }) {
  return (
    <div className={`rounded-lg border border-sky/30 bg-sky/5 px-3 py-2 font-mono break-all text-sky ${small ? 'text-[11px]' : 'text-[13px]'}`}>
      {value ?? '…'}
    </div>
  )
}

function Verdict({ ok, yes, no }: { ok: boolean; yes: string; no: string }) {
  return (
    <p className={`mt-1 rounded-lg px-3 py-2 text-center text-sm font-bold ${ok ? 'bg-mint/10 text-mint' : 'bg-coral/10 text-coral'}`}>
      {ok ? `✓ ${yes}` : `✗ ${no}`}
    </p>
  )
}
