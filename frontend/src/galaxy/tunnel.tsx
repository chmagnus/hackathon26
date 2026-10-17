/**
 * Lets any screen put 3D content into the one shared <Canvas> (Universe) while keeping its own React state.
 * <InUniverse> sits in the screen's normal tree; <UniverseContents> (inside the Canvas) renders whatever was sent.
 * Same idea as pmndrs' tunnel-rat, built on zustand (already a dependency).
 */
import { Fragment, useId, useLayoutEffect, type ReactNode } from 'react'
import { create } from 'zustand'

interface TunnelState {
  nodes: Record<string, ReactNode>
  put: (id: string, node: ReactNode) => void
  remove: (id: string) => void
}

const useTunnel = create<TunnelState>((set) => ({
  nodes: {},
  put: (id, node) => set((s) => ({ nodes: { ...s.nodes, [id]: node } })),
  remove: (id) => set((s) => {
    const nodes = { ...s.nodes }
    delete nodes[id]
    return { nodes }
  }),
}))

/** Renders `children` inside the Universe canvas instead of here. */
export function InUniverse({ children }: { children: ReactNode }) {
  const id = useId()
  const put = useTunnel((s) => s.put)
  const remove = useTunnel((s) => s.remove)
  useLayoutEffect(() => { put(id, children) }, [id, children, put])
  useLayoutEffect(() => () => remove(id), [id, remove])
  return null
}

/** Mounted once inside the Universe canvas: everything sent with <InUniverse>. */
export function UniverseContents() {
  const nodes = useTunnel((s) => s.nodes)
  return <>{Object.entries(nodes).map(([id, node]) => <Fragment key={id}>{node}</Fragment>)}</>
}
