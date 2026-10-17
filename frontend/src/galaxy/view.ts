/**
 * Shared view state for the Universe: which mode the camera is in, plus live per-frame values.
 */
import type * as THREE from 'three'
import { create } from 'zustand'
import type { PlanetId } from '../screens/Home/planets'

export type View = { mode: 'universe' } | { mode: 'planet'; id: PlanetId }

interface ViewState {
  view: View
  /** true once the camera has reached the planet (planet mode only); reset on every view change */
  arrived: boolean
  /** chapter (orbit number) the camera is focused on in planet mode, or null for the planet view */
  chapter: number | null
  /** true once the camera has reached the focused chapter's moon; reset whenever `chapter` changes */
  chapterArrived: boolean
  /**
   * Threshold flags derived from live.zoom by the camera rig, updated only when they flip (so React only
   * re-renders at those points). zoomStarted: the camera has started closing in on a planet (Home's overlay and
   * labels fade out). zoomedIn: it's essentially at the planet (moon labels, Moon HUD, moon clicks).
   */
  zoomStarted: boolean
  zoomedIn: boolean
  setView: (view: View) => void
  setArrived: () => void
  setChapter: (chapter: number | null) => void
  setChapterArrived: () => void
  setZoomFlags: (flags: { zoomStarted: boolean; zoomedIn: boolean }) => void
}

export const useView = create<ViewState>((set) => ({
  view: { mode: 'universe' },
  arrived: false,
  chapter: null,
  chapterArrived: false,
  zoomStarted: false,
  zoomedIn: false,
  setView: (view) => set({ view, arrived: false, chapter: null, chapterArrived: false }),
  setArrived: () => set({ arrived: true }),
  setChapter: (chapter) => set({ chapter, chapterArrived: false }),
  setChapterArrived: () => set({ chapterArrived: true }),
  setZoomFlags: (flags) => set(flags),
}))

/** Where each planet is right now. Written every frame by Home's planets, read by the camera (not React state). */
export const planetPositions: Partial<Record<PlanetId, THREE.Vector3>> = {}

/** Where each chapter moon is right now (world space, keyed by orbit number). Written every frame by the moon system. */
export const chapterPositions: Record<number, THREE.Vector3> = {}

/**
 * Live values updated every frame by the camera rig (not React state).
 * `zoom`: 0 = far from the planet being visited (beyond ~60 units), 1 = at it (within ~25), smoothstepped.
 */
export const live = { zoom: 0 }

export const REDUCED_MOTION = typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
