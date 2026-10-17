/** An editable ledger scene accompanying the API-authored lesson and checkpoint. */
import { useState } from 'react'
import StoryLayout, { TryIt, type LessonProps } from '../StoryLayout'

export default function SharedLedgerStory(props: LessonProps) {
  const [edited, setEdited] = useState(false)
  const firstPayment = edited ? 8 : 3
  const total = firstPayment + 2

  const renderStage = () => (
    <div className="flex h-full flex-col justify-center gap-4 overflow-y-auto p-5">
      <p className="font-mono text-xs uppercase tracking-widest text-mint">The shared notebook</p>
      <table className="w-full border-collapse text-left text-sm">
        <caption className="mb-3 text-left text-muted">Starting balances: Alice 10, Bob 0</caption>
        <thead><tr className="border-b border-white/20"><th className="py-2">Entry</th><th>Payment</th></tr></thead>
        <tbody>
          <tr className={`border-b border-white/10 ${edited ? 'text-coral' : ''}`}><td className="py-3">Alice → Bob</td><td>{firstPayment} tokens {edited && '(edited)'}</td></tr>
          <tr><td className="py-3">Alice → Bob</td><td>2 tokens</td></tr>
        </tbody>
      </table>
      <div className="grid grid-cols-2 gap-3"><div className="rounded-xl border border-alice/30 p-3">Alice <strong className="block text-2xl text-alice">{10 - total}</strong></div><div className="rounded-xl border border-bob/30 p-3">Bob <strong className="block text-2xl text-bob">{total}</strong></div></div>
      <p role="status" className={`text-sm ${edited ? 'text-coral' : 'text-muted'}`}>{edited ? 'An old amount changed. The plain notebook recalculated the balances without keeping proof of the original.' : 'Both original entries are present. What would reveal a quiet rewrite?'}</p>
    </div>
  )

  const renderExtra = (step: number) => step === 2 ? <TryIt>
    <button onClick={() => setEdited((value) => !value)} className="rounded-lg border border-gold/50 px-3 py-2 font-bold text-gold">{edited ? 'Restore the original entry' : 'Change the first payment from 3 to 8'}</button>
    <span>Compare the resulting balances. The list alone does not prove which version was approved.</span>
  </TryIt> : null

  return <StoryLayout {...props} renderStage={renderStage} renderExtra={renderExtra}
    caption={(active) => props.moon.dialogue_steps[active]?.title ?? 'Check your understanding'}
    algoSays={() => 'Try the notebook edit, then explain the difference between recording a payment and proving it was approved.'} />
}
