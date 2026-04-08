import {
  setEditMode,
  clearSelection,
  setMeta,
  useScene,
  useDuration,
  useEase,
  createElement,
  setSelection,
} from '../scene/store'

const EASE_PRESETS: Record<string, [number, number, number, number]> = {
  'out-quart': [0.22, 1, 0.36, 1],
  linear: [0, 0, 1, 1],
  ease: [0.25, 0.1, 0.25, 1],
  'in-out-cubic': [0.65, 0, 0.35, 1],
  'spring-ish': [0.34, 1.56, 0.64, 1],
  'in-quart': [0.5, 0, 0.75, 0],
}

interface TopbarProps {
  step: number
  total: number
  setStep: (n: number) => void
}

export function Topbar({ step, total, setStep }: TopbarProps) {
  const scene = useScene()
  const duration = useDuration()
  const ease = useEase()

  // 현재 ease가 어느 preset과 일치하는지 찾기
  const easeName =
    Object.entries(EASE_PRESETS).find(
      ([, v]) => JSON.stringify(v) === JSON.stringify(ease),
    )?.[0] ?? 'custom'

  const addStep = () => {
    setMeta('total_steps', String(total + 1))
  }

  const removeStep = () => {
    if (total <= 1) return
    setMeta('total_steps', String(total - 1))
    if (step >= total - 1) setStep(total - 2)
  }

  const addNode = async (type: 'frame' | 'text' | 'image') => {
    const id = await createElement({ type })
    setSelection([id])
  }

  return (
    <div className="flex h-12 shrink-0 items-center justify-between border-b border-white/10 bg-zinc-900 px-4 text-sm">
      <div className="flex items-center gap-3">
        <span className="font-semibold tracking-tight text-zinc-100">PPT/EZ</span>
        <span className="text-zinc-500">Editor</span>
        <div className="ml-2 flex items-center gap-1">
          <button
            onClick={() => addNode('frame')}
            className="rounded bg-white/5 px-2 py-1 text-xs text-zinc-300 hover:bg-white/10"
            title="Add Frame (R)"
          >
            ▢ Frame
          </button>
          <button
            onClick={() => addNode('text')}
            className="rounded bg-white/5 px-2 py-1 text-xs text-zinc-300 hover:bg-white/10"
            title="Add Text (T)"
          >
            T Text
          </button>
          <button
            onClick={() => addNode('image')}
            className="rounded bg-white/5 px-2 py-1 text-xs text-zinc-300 hover:bg-white/10"
            title="Add Image (I)"
          >
            🖼 Image
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => setStep(step - 1)}
          className="rounded px-2 py-1 text-zinc-400 hover:bg-white/5 hover:text-zinc-100"
        >
          ←
        </button>
        <span className="tabular-nums text-zinc-400">
          Step {step + 1} / {total}
        </span>
        <button
          onClick={() => setStep(step + 1)}
          className="rounded px-2 py-1 text-zinc-400 hover:bg-white/5 hover:text-zinc-100"
        >
          →
        </button>
        <div className="mx-2 h-6 w-px bg-white/10" />
        <button
          onClick={addStep}
          className="rounded bg-white/5 px-2 py-1 text-xs text-zinc-300 hover:bg-white/10"
        >
          + Step
        </button>
        <button
          onClick={removeStep}
          className="rounded bg-white/5 px-2 py-1 text-xs text-zinc-300 hover:bg-white/10"
          disabled={total <= 1}
        >
          − Step
        </button>
        <div className="mx-2 h-6 w-px bg-white/10" />
        <label className="flex items-center gap-1 text-[10px] text-zinc-500">
          dur
          <input
            type="number"
            min={0.05}
            max={3}
            step={0.05}
            value={duration}
            onChange={(e) => setMeta('duration', e.target.value)}
            className="w-14 rounded border border-white/10 bg-zinc-950 px-1 py-0.5 text-xs text-zinc-200"
          />
          s
        </label>
        <label className="flex items-center gap-1 text-[10px] text-zinc-500">
          ease
          <select
            value={easeName === 'custom' ? '' : easeName}
            onChange={(e) => {
              const v = EASE_PRESETS[e.target.value]
              if (v) setMeta('ease', JSON.stringify(v))
            }}
            className="rounded border border-white/10 bg-zinc-950 px-1 py-0.5 text-xs text-zinc-200"
          >
            {easeName === 'custom' ? <option value="">custom</option> : null}
            {Object.keys(EASE_PRESETS).map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xs text-zinc-600">
          {scene ? `${scene.elements.length} els · ${scene.assets.length} assets` : ''}
        </span>
        <button
          onClick={() => {
            setEditMode(false)
            clearSelection()
          }}
          className="rounded bg-sky-500/20 px-3 py-1 text-xs text-sky-300 hover:bg-sky-500/30"
        >
          Done (E)
        </button>
      </div>
    </div>
  )
}
