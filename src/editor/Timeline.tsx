/**
 * 하단 타임라인 — 선택된 element들의 키프레임을 step 격자에 점으로 표시.
 *
 * - 가로축: step (0 ~ total-1)
 * - 세로축: 선택된 element 한 줄씩
 * - 점: 그 step에 키프레임이 있음
 * - 점 클릭: 해당 step으로 이동
 * - + 버튼 (현재 step의 빈 셀): 키프레임 snapshot
 * - 점 우클릭/× 핀: 키프레임 삭제
 */

import {
  useScene,
  useSelection,
  snapshotKeyframe,
  deleteKeyframe,
  toggleKeyframeAtStep,
} from '../scene/store'

interface TimelineProps {
  step: number
  total: number
  setStep: (n: number) => void
}

export function Timeline({ step, total, setStep }: TimelineProps) {
  const scene = useScene()
  const selection = useSelection()
  if (!scene) return null

  const selected =
    selection.size > 0
      ? scene.elements.filter((e) => selection.has(e.id))
      : []

  const cells = Array.from({ length: total }, (_, i) => i)

  return (
    <div className="flex h-44 shrink-0 flex-col border-t border-white/10 bg-zinc-900">
      <header className="flex items-center justify-between border-b border-white/10 px-3 py-1 text-[11px] uppercase tracking-wider text-zinc-500">
        <span>Timeline</span>
        <span className="text-zinc-600">
          K = toggle keyframe · ⌘⇧C / ⌘⇧V copy/paste
        </span>
      </header>

      {/* Step ruler */}
      <div className="flex items-center gap-px px-3 pt-1">
        <div className="w-32 shrink-0" />
        {cells.map((s) => (
          <button
            key={s}
            onClick={() => setStep(s)}
            className={`flex h-5 flex-1 items-center justify-center text-[10px] tabular-nums ${
              s === step
                ? 'bg-sky-500/20 text-sky-200'
                : 'text-zinc-600 hover:bg-white/5'
            }`}
          >
            {s + 1}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-2">
        {selected.length === 0 ? (
          <div className="py-4 text-center text-xs text-zinc-600">
            Select an element to see its keyframes.
          </div>
        ) : (
          selected.map((el) => {
            const kfs = scene.keyframes.filter((k) => k.element_id === el.id)
            const stepsWithKf = new Set(kfs.map((k) => k.step))
            return (
              <div
                key={el.id}
                className="flex items-center gap-px border-b border-white/5 py-1"
              >
                <div className="flex w-32 shrink-0 items-center gap-1 truncate text-xs text-zinc-300">
                  <span className="truncate">
                    {el.name ?? `${el.type} ${el.id.slice(0, 4)}`}
                  </span>
                </div>
                {cells.map((s) => {
                  const has = stepsWithKf.has(s)
                  return (
                    <button
                      key={s}
                      onClick={() => setStep(s)}
                      onDoubleClick={() => {
                        if (has) deleteKeyframe(el.id, s)
                        else snapshotKeyframe(el.id, s)
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault()
                        if (has) deleteKeyframe(el.id, s)
                      }}
                      title={
                        has
                          ? `Step ${s + 1} keyframe — dbl-click or right-click to delete`
                          : `Step ${s + 1} — dbl-click to add`
                      }
                      className={`flex h-6 flex-1 items-center justify-center rounded-sm ${
                        s === step
                          ? 'bg-sky-500/10'
                          : 'hover:bg-white/5'
                      }`}
                    >
                      {has ? (
                        <span className="block h-2.5 w-2.5 rotate-45 bg-amber-400" />
                      ) : (
                        <span className="block h-1 w-1 rounded-full bg-white/10" />
                      )}
                    </button>
                  )
                })}
              </div>
            )
          })
        )}
      </div>

      <footer className="flex items-center justify-between border-t border-white/10 px-3 py-1 text-[10px] text-zinc-600">
        <span>{selected.length} selected · step {step + 1} / {total}</span>
        <button
          onClick={() => {
            for (const el of selected) toggleKeyframeAtStep(el.id, step)
          }}
          disabled={selected.length === 0}
          className="rounded bg-white/5 px-2 py-0.5 text-zinc-300 hover:bg-white/10 disabled:opacity-30"
        >
          Toggle KF (K)
        </button>
      </footer>
    </div>
  )
}
