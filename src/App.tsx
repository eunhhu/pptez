import { useEffect, useCallback } from 'react'
import { Stage } from './scene/Stage'
import {
  useScene,
  useTotalSteps,
  useStep,
  useEditMode,
  setEditMode,
} from './scene/store'
import { useCanvasScale } from './scene/useCanvasScale'
import { EditorRoot } from './editor/EditorRoot'

function App() {
  const [editMode] = useEditMode()

  if (editMode) {
    return <EditorRoot />
  }
  return <PlayView />
}

function PlayView() {
  const scene = useScene()
  const total = useTotalSteps()
  const [step, setStep] = useStep()
  const frameRef = useCanvasScale<HTMLDivElement>()

  const next = useCallback(() => setStep(step + 1), [step, setStep])
  const prev = useCallback(() => setStep(step - 1), [step, setStep])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // input/textarea 안에서는 무시
      const target = e.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return
      }

      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
        case 'PageDown':
        case ' ':
          e.preventDefault()
          next()
          break
        case 'ArrowLeft':
        case 'ArrowUp':
        case 'PageUp':
          e.preventDefault()
          prev()
          break
        case 'Home':
          e.preventDefault()
          setStep(0)
          break
        case 'End':
          e.preventDefault()
          setStep(total - 1)
          break
        case 'e':
        case 'E':
          // 편집 모드 진입 (dev에서만 가능 — prod에서도 진입은 되지만 mutation은 401)
          e.preventDefault()
          setEditMode(true)
          break
        case 'f':
        case 'F':
          if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen?.()
          } else {
            document.exitFullscreen?.()
          }
          break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [next, prev, setStep, total])

  return (
    <div className="slide-stage">
      <div ref={frameRef} className="slide-frame">
        <Stage step={step} />
      </div>

      <div className="pointer-events-none fixed bottom-4 left-1/2 z-50 -translate-x-1/2 text-xs text-zinc-500 tabular-nums">
        {scene ? `${step + 1} / ${total}` : '…'}
      </div>

      <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-50 h-0.5 bg-white/5">
        <div
          className="h-full bg-sky-500 transition-[width] duration-500 ease-out"
          style={{ width: `${((step + 1) / total) * 100}%` }}
        />
      </div>
    </div>
  )
}

export default App
