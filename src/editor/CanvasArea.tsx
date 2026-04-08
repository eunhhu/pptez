import { useRef } from 'react'
import { Stage } from '../scene/Stage'
import { useCanvasScale } from '../scene/useCanvasScale'
import { useSelection, setSelection, clearSelection } from '../scene/store'
import { SelectionOverlay } from './SelectionOverlay'

interface CanvasAreaProps {
  step: number
}

export function CanvasArea({ step }: CanvasAreaProps) {
  const selection = useSelection()
  const frameRef = useCanvasScale<HTMLDivElement>()
  const wrapRef = useRef<HTMLDivElement | null>(null)

  // useCanvasScale 훅이 ref를 들고 있고, 우리도 같은 노드를 SelectionOverlay에
  // 넘겨야 하니 wrapper를 한 번 씌운다.
  // 사실 동일 ref를 두 곳에서 쓰면 되므로 frameRef를 그대로 SelectionOverlay에 전달.

  return (
    <main
      className="relative flex min-w-0 flex-1 items-center justify-center bg-zinc-950 p-6"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) clearSelection()
      }}
    >
      {/* 16:9 캔버스 프레임 */}
      <div
        ref={wrapRef}
        className="relative max-h-full max-w-full bg-black shadow-2xl ring-1 ring-white/10"
        style={{ aspectRatio: '16 / 9', width: '100%' }}
      >
        <div ref={frameRef} className="absolute inset-0 overflow-hidden">
          <Stage
            step={step}
            selectedIds={selection}
            onNodeClick={(id, e) => {
              if (e.shiftKey) {
                const next = new Set(selection)
                if (next.has(id)) next.delete(id)
                else next.add(id)
                setSelection(next)
              } else {
                setSelection([id])
              }
            }}
          />
          <SelectionOverlay step={step} frameRef={frameRef} />
        </div>
      </div>
    </main>
  )
}
