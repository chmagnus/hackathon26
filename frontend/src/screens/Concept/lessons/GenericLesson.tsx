/**
 * Fallback for moons that don't have their own scene yet:
 * the story still scrolls, and the scene shows Algo with the current part's title.
 */
import Algo from '../Algo'
import StoryLayout, { type LessonProps } from '../StoryLayout'

export default function GenericLesson(props: LessonProps) {
  const steps = props.moon.dialogue_steps
  const renderStage = (active: number) => (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="h-24 w-24"><Algo /></div>
      <p className="font-display text-lg">{steps[active]?.title ?? 'Quick check'}</p>
    </div>
  )
  return <StoryLayout {...props} renderStage={renderStage} />
}
