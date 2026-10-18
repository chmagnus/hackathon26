import { useEffect, useRef } from 'react'

export function ResetProgressDialog({ onCancel, onReset }: { onCancel: () => void; onReset: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const element = dialog.current!
    element.showModal()
    return () => element.close()
  }, [])
  return <dialog ref={dialog} aria-labelledby="reset-title" onCancel={(event) => { event.preventDefault(); onCancel() }} className="pointer-events-auto fixed inset-0 m-auto max-w-[min(400px,calc(100vw-32px))] space-y-5 rounded-3xl border border-white/20 bg-void p-6 text-ink backdrop:bg-black/70">
    <h2 id="reset-title" className="text-xl font-bold">Reset your learning progress?</h2>
    <p>This clears completed lessons and lesson edits in this browser and returns captured planets to the universe.</p>
    <div className="flex gap-3"><button autoFocus onClick={onCancel} className="rounded-xl border border-white/20 px-4 py-2">Keep progress</button><button onClick={onReset} className="rounded-xl bg-coral px-4 py-2 font-bold text-void">Reset progress</button></div>
  </dialog>
}
