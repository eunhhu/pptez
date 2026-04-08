import { useCallback, useEffect, useState } from 'react'
import { Stage, TOTAL_STEPS } from './timeline'

function App() {
  const [step, setStep] = useState(0)

  const next = useCallback(() => {
    setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1))
  }, [])

  const prev = useCallback(() => {
    setStep((s) => Math.max(s - 1, 0))
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
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
          setStep(TOTAL_STEPS - 1)
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
  }, [next, prev])

  return (
    <div className="slide-stage">
      {/* 16:9 콘텐츠 프레임 — 여긴 오직 프레젠테이션 화면 */}
      <div className="slide-frame">
        <Stage step={step} />
      </div>

      {/* UI 오버레이 — 프레임 바깥, 뷰포트 기준 고정 */}
      <div className="pointer-events-none fixed bottom-4 left-1/2 z-50 -translate-x-1/2 text-xs text-zinc-500 tabular-nums">
        {step + 1} / {TOTAL_STEPS}
      </div>

      <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-50 h-0.5 bg-white/5">
        <div
          className="h-full bg-sky-500 transition-[width] duration-500 ease-out"
          style={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
        />
      </div>
    </div>
  )
}

export default App
