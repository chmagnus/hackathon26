/**
 * Lesson page for moons without a hand-built story: the text comes from the backend (StoryLayout), and the scene is
 * the moon's own (./scenes, one file per moon): a picture that follows the story part by part, plus a "Try it" box
 * inside each part. Moons without a scene show Algo with the part's title.
 */
import { useEffect, useRef, useState } from 'react'
import Algo from '../Algo'
import StoryLayout, { type LessonProps } from '../StoryLayout'
import { SCENES, nextUp } from './scenes'
import type { MoonScene } from './scenes/kit'
import '../story.css'

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

export default function GenericLesson(props: LessonProps) {
  const { planetId, moon } = props
  const make = planetId === 'blockchain' ? SCENES[moon.id] : undefined
  const steps = moon.dialogue_steps

  const [active, setActive] = useState(0)

  const stageRef = useRef<HTMLDivElement>(null)
  const capRef = useRef<HTMLParagraphElement>(null)
  const slots = useRef<(HTMLDivElement | null)[]>([])
  const scene = useRef<MoonScene | null>(null)
  const activeRef = useRef(0)

  // Mount the moon's scene once, fill every part's "Try it" box, and show the part in view
  useEffect(() => {
    const stage = stageRef.current
    if (!make || !stage) return
    const s = make(stage, { motion: !reducedMotion() })
    scene.current = s
    const boxes = slots.current
    boxes.forEach((el, k) => el && s.tryIt(k, el))
    s.show(activeRef.current)
    if (capRef.current) capRef.current.textContent = s.caption(activeRef.current)
    return () => {
      s.stop()
      scene.current = null
      stage.innerHTML = ''
      boxes.forEach((el) => el && (el.innerHTML = ''))
    }
  }, [make, moon.id])

  const onStepChange = (k: number) => {
    activeRef.current = k
    setActive(k)
    scene.current?.show(k)
    if (scene.current && capRef.current) capRef.current.textContent = scene.current.caption(k)
  }

  const stage = make
    ? <><div ref={stageRef} className="scene gs-host" /><p ref={capRef} className="i1-cap" aria-live="polite" /></>
    : (
      <>
        <div className="scene gs-host">
          <div className="gs gs-plain"><div className="gs-algo"><Algo /></div><p className="gs-big"><b>{steps[active]?.title ?? moon.title}</b></p></div>
        </div>
        <p className="i1-cap">{moon.summary}</p>
      </>
    )

  return (
    <StoryLayout
      {...props}
      stage={stage}
      renderExtra={make ? (k) => <div ref={(el) => { slots.current[k] = el }} /> : undefined}
      onStepChange={onStepChange}
      nextUp={nextUp(planetId, moon.id)}
    />
  )
}
