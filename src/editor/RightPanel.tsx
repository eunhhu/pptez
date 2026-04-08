/**
 * 인스펙터 — 선택된 element의 모든 정적/애니메이션 속성을 편집한다.
 *
 * - 정적 속성: name, parent, text content, font_weight, text_align, text_split,
 *              image_src, child_stagger, child_stagger_order
 * - 키프레임 속성: x, y, width, height, opacity, rotate, scale,
 *                  bg_color, fg_color, border_radius, font_size
 *
 * 키프레임 속성은 "현재 step의 effective 값"을 보여주고, 사용자가 수정하면
 * 그 step에 키프레임을 upsert한다.
 */

import {
  useScene,
  useSelection,
  upsertElement,
  upsertKeyframe,
  deleteKeyframe,
  useDuration,
  setLayoutMode,
} from '../scene/store'
import { computeValuesAt } from '../scene/interpolate'
import type { ElementRow, KeyframeRow, AnimatableKey } from '../scene/types'
import { EASE_PRESET_NAMES } from '../scene/easing'

interface RightPanelProps {
  step: number
}

export function RightPanel({ step }: RightPanelProps) {
  const scene = useScene()
  const selection = useSelection()

  return (
    <aside className="w-72 shrink-0 overflow-y-auto border-l border-white/10 bg-zinc-900 text-sm">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-zinc-900 px-3 py-2 text-[11px] uppercase tracking-wider text-zinc-500">
        Inspector
      </header>
      <div className="px-3 pb-6 pt-2">
        {!scene || selection.size === 0 ? (
          <div className="text-xs text-zinc-600">
            Select an element to edit its properties.
          </div>
        ) : selection.size > 1 ? (
          <MultiInspector ids={Array.from(selection)} step={step} />
        ) : (
          <SingleInspector id={Array.from(selection)[0]} step={step} />
        )}
      </div>
    </aside>
  )
}

function MultiInspector({ ids, step }: { ids: string[]; step: number }) {
  return (
    <div className="space-y-2 text-xs text-zinc-400">
      <div>{ids.length} elements selected.</div>
      <div className="text-zinc-600">
        Multi-edit: 위치/크기는 캔버스 드래그로, 개별 속성은 단일 선택으로 편집하세요.
      </div>
      <div className="text-zinc-600">Current step: {step + 1}</div>
    </div>
  )
}

function SingleInspector({ id, step }: { id: string; step: number }) {
  const scene = useScene()
  if (!scene) return null
  const el = scene.elements.find((e) => e.id === id)
  if (!el) return <div className="text-xs text-zinc-600">Not found.</div>

  const kfs = scene.keyframes.filter((k) => k.element_id === id)
  const effective = computeValuesAt(kfs, step)
  const kfAtStep = kfs.find((k) => k.step === step)

  return (
    <div className="space-y-4 text-xs">
      {/* 헤더 */}
      <div>
        <div className="text-[11px] uppercase tracking-wider text-zinc-500">
          {el.type} · {el.id}
        </div>
        <input
          className="mt-1 w-full rounded border border-white/10 bg-zinc-950 px-2 py-1 text-zinc-100"
          value={el.name ?? ''}
          placeholder={el.type}
          onChange={(e) => upsertElement({ id, name: e.target.value || null })}
        />
      </div>

      {/* type별 정적 속성 */}
      {el.type === 'text' ? <TextStaticFields el={el} /> : null}
      {el.type === 'image' ? <ImageStaticFields el={el} /> : null}
      {el.type === 'frame' ? <FrameStaticFields el={el} /> : null}

      {/* Frame 전용: Shape, Auto layout, Group each motion */}
      {el.type === 'frame' ? <ShapeFields el={el} /> : null}
      {el.type === 'frame' ? <LayoutFields el={el} /> : null}
      {el.type === 'frame' ? <GroupMotionFields el={el} /> : null}

      {/* child_stagger — 모든 type에서 가능 */}
      <StaggerFields el={el} />

      <div className="border-t border-white/10 pt-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-[11px] uppercase tracking-wider text-zinc-500">
            Step {step + 1} keyframe
          </div>
          {kfAtStep ? (
            <button
              onClick={() => deleteKeyframe(id, step)}
              className="rounded px-2 py-0.5 text-[10px] text-red-400 hover:bg-red-500/10"
            >
              clear
            </button>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <NumberField
            label="x"
            value={effective.x as number | undefined}
            onChange={(v) => commitKf(id, step, kfAtStep, 'x', v)}
          />
          <NumberField
            label="y"
            value={effective.y as number | undefined}
            onChange={(v) => commitKf(id, step, kfAtStep, 'y', v)}
          />
          <NumberField
            label="width"
            value={effective.width as number | undefined}
            onChange={(v) => commitKf(id, step, kfAtStep, 'width', v)}
          />
          <NumberField
            label="height"
            value={effective.height as number | undefined}
            onChange={(v) => commitKf(id, step, kfAtStep, 'height', v)}
          />
          <NumberField
            label="opacity"
            step={0.05}
            value={effective.opacity as number | undefined}
            onChange={(v) => commitKf(id, step, kfAtStep, 'opacity', v)}
          />
          <NumberField
            label="rotate"
            value={effective.rotate as number | undefined}
            onChange={(v) => commitKf(id, step, kfAtStep, 'rotate', v)}
          />
          <NumberField
            label="scale"
            step={0.05}
            value={effective.scale as number | undefined}
            onChange={(v) => commitKf(id, step, kfAtStep, 'scale', v)}
          />
          <NumberField
            label="radius"
            value={effective.border_radius as number | undefined}
            onChange={(v) => commitKf(id, step, kfAtStep, 'border_radius', v)}
          />
          <NumberField
            label="font sz"
            value={effective.font_size as number | undefined}
            onChange={(v) => commitKf(id, step, kfAtStep, 'font_size', v)}
          />
        </div>

        <div className="mt-2 grid grid-cols-2 gap-2">
          <NumberField
            label="skew x"
            value={effective.skew_x as number | undefined}
            onChange={(v) => commitKf(id, step, kfAtStep, 'skew_x', v)}
          />
          <NumberField
            label="skew y"
            value={effective.skew_y as number | undefined}
            onChange={(v) => commitKf(id, step, kfAtStep, 'skew_y', v)}
          />
          <NumberField
            label="blur"
            step={0.5}
            value={effective.blur as number | undefined}
            onChange={(v) => commitKf(id, step, kfAtStep, 'blur', v)}
          />
          <NumberField
            label="border w"
            value={effective.border_width as number | undefined}
            onChange={(v) => commitKf(id, step, kfAtStep, 'border_width', v)}
          />
        </div>

        <div className="mt-2 grid grid-cols-2 gap-2">
          <ColorField
            label="bg"
            value={(effective.bg_color as string | undefined) ?? ''}
            onChange={(v) => commitKf(id, step, kfAtStep, 'bg_color', v)}
          />
          <ColorField
            label="fg"
            value={(effective.fg_color as string | undefined) ?? ''}
            onChange={(v) => commitKf(id, step, kfAtStep, 'fg_color', v)}
          />
          <ColorField
            label="border"
            value={(effective.border_color as string | undefined) ?? ''}
            onChange={(v) => commitKf(id, step, kfAtStep, 'border_color', v)}
          />
        </div>

        <div className="mt-2 space-y-1">
          <div className="text-[10px] text-zinc-500">shadow (CSS)</div>
          <input
            type="text"
            value={(effective.shadow as string | undefined) ?? ''}
            placeholder="0 4px 24px rgba(0,0,0,0.25)"
            className="w-full rounded border border-white/10 bg-zinc-950 px-2 py-1 text-zinc-100"
            onChange={(e) =>
              commitKf(id, step, kfAtStep, 'shadow', e.target.value || null)
            }
          />
        </div>

        {/* text_content keyframe (text 노드만) */}
        {el.type === 'text' ? (
          <div className="mt-2 space-y-1">
            <div className="text-[10px] text-zinc-500">
              text @ this step (overrides static)
            </div>
            <textarea
              rows={2}
              value={kfAtStep?.text_content ?? ''}
              placeholder="(use static text)"
              className="w-full rounded border border-white/10 bg-zinc-950 px-2 py-1 text-zinc-100"
              onChange={(e) =>
                commitKfRaw(id, step, kfAtStep, 'text_content', e.target.value || null)
              }
            />
          </div>
        ) : null}

        {/* per-keyframe transition override */}
        <TransitionOverrideFields
          id={id}
          step={step}
          kfAtStep={kfAtStep}
        />
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Static field groups by type
// ────────────────────────────────────────────────────────────────────────────

function FrameStaticFields({ el }: { el: ElementRow }) {
  return (
    <div className="space-y-2">
      <div className="text-[10px] uppercase text-zinc-600">Frame</div>
      <div className="text-[10px] text-zinc-600">
        z-index: {el.z_index}
      </div>
    </div>
  )
}

function ShapeFields({ el }: { el: ElementRow }) {
  return (
    <div className="border-t border-white/10 pt-3">
      <div className="mb-2 text-[10px] uppercase text-zinc-600">Shape</div>
      <label className="block space-y-1">
        <div className="text-[10px] text-zinc-500">subtype</div>
        <select
          className="w-full rounded border border-white/10 bg-zinc-950 px-1 py-1 text-zinc-100"
          value={el.subtype ?? 'rect'}
          onChange={(e) =>
            upsertElement({ id: el.id, subtype: e.target.value })
          }
        >
          {['rect', 'ellipse'].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}

function LayoutFields({ el }: { el: ElementRow }) {
  const mode = el.layout_mode ?? 'none'
  const isAuto = mode === 'row' || mode === 'column'
  return (
    <div className="border-t border-white/10 pt-3">
      <div className="mb-2 text-[10px] uppercase text-zinc-600">Auto layout</div>
      <label className="block space-y-1">
        <div className="text-[10px] text-zinc-500">mode</div>
        <select
          className="w-full rounded border border-white/10 bg-zinc-950 px-1 py-1 text-zinc-100"
          value={mode}
          onChange={(e) => setLayoutMode(el.id, e.target.value as 'none' | 'row' | 'column')}
        >
          {['none', 'row', 'column'].map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </label>
      {isAuto ? (
        <>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <NumberField
              label="gap"
              value={el.layout_gap ?? undefined}
              onChange={(v) => upsertElement({ id: el.id, layout_gap: v })}
            />
            <NumberField
              label="padding"
              value={el.layout_padding ?? undefined}
              onChange={(v) =>
                upsertElement({ id: el.id, layout_padding: v })
              }
            />
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <label className="space-y-1">
              <div className="text-[10px] text-zinc-500">align</div>
              <select
                className="w-full rounded border border-white/10 bg-zinc-950 px-1 py-1 text-zinc-100"
                value={el.layout_align ?? 'start'}
                onChange={(e) =>
                  upsertElement({ id: el.id, layout_align: e.target.value })
                }
              >
                {['start', 'center', 'end', 'stretch'].map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <div className="text-[10px] text-zinc-500">justify</div>
              <select
                className="w-full rounded border border-white/10 bg-zinc-950 px-1 py-1 text-zinc-100"
                value={el.layout_justify ?? 'start'}
                onChange={(e) =>
                  upsertElement({ id: el.id, layout_justify: e.target.value })
                }
              >
                {['start', 'center', 'end', 'between', 'around'].map((j) => (
                  <option key={j} value={j}>
                    {j}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </>
      ) : null}
    </div>
  )
}

const GROUP_MOTION_PRESETS = [
  'none',
  'fade',
  'slide-up',
  'slide-down',
  'slide-left',
  'slide-right',
  'scale',
  'pop',
  'blur',
] as const

function GroupMotionFields({ el }: { el: ElementRow }) {
  return (
    <div className="border-t border-white/10 pt-3">
      <div className="mb-2 text-[10px] uppercase text-zinc-600">
        Group each motion
      </div>
      <label className="block space-y-1">
        <div className="text-[10px] text-zinc-500">child preset</div>
        <select
          className="w-full rounded border border-white/10 bg-zinc-950 px-1 py-1 text-zinc-100"
          value={el.child_motion_preset ?? 'none'}
          onChange={(e) =>
            upsertElement({
              id: el.id,
              child_motion_preset:
                e.target.value === 'none' ? null : e.target.value,
            })
          }
        >
          {GROUP_MOTION_PRESETS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}

function TextStaticFields({ el }: { el: ElementRow }) {
  return (
    <div className="space-y-2">
      <div className="text-[10px] uppercase text-zinc-600">Text</div>
      <textarea
        rows={3}
        className="w-full rounded border border-white/10 bg-zinc-950 px-2 py-1 text-zinc-100"
        value={el.text_content ?? ''}
        onChange={(e) =>
          upsertElement({ id: el.id, text_content: e.target.value })
        }
      />
      <div className="grid grid-cols-2 gap-2">
        <label className="space-y-1">
          <div className="text-[10px] text-zinc-500">weight</div>
          <select
            className="w-full rounded border border-white/10 bg-zinc-950 px-1 py-1 text-zinc-100"
            value={el.font_weight ?? 500}
            onChange={(e) =>
              upsertElement({
                id: el.id,
                font_weight: Number(e.target.value),
              })
            }
          >
            {[300, 400, 500, 600, 700, 900].map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <div className="text-[10px] text-zinc-500">align</div>
          <select
            className="w-full rounded border border-white/10 bg-zinc-950 px-1 py-1 text-zinc-100"
            value={el.text_align ?? 'left'}
            onChange={(e) =>
              upsertElement({ id: el.id, text_align: e.target.value })
            }
          >
            {['left', 'center', 'right', 'justify'].map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="block space-y-1">
        <div className="text-[10px] text-zinc-500">split</div>
        <select
          className="w-full rounded border border-white/10 bg-zinc-950 px-1 py-1 text-zinc-100"
          value={el.text_split ?? 'none'}
          onChange={(e) =>
            upsertElement({
              id: el.id,
              text_split: e.target.value as ElementRow['text_split'],
            })
          }
        >
          {['none', 'char', 'word', 'line'].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}

function ImageStaticFields({ el }: { el: ElementRow }) {
  return (
    <div className="space-y-2">
      <div className="text-[10px] uppercase text-zinc-600">Image</div>
      <input
        className="w-full rounded border border-white/10 bg-zinc-950 px-2 py-1 text-zinc-100"
        value={el.image_src ?? ''}
        placeholder="/assets/<hash>.png"
        onChange={(e) =>
          upsertElement({ id: el.id, image_src: e.target.value || null })
        }
      />
      {el.image_src ? (
        <img
          src={el.image_src}
          alt=""
          className="max-h-24 w-full rounded border border-white/10 object-contain"
        />
      ) : null}
    </div>
  )
}

function StaggerFields({ el }: { el: ElementRow }) {
  return (
    <div className="border-t border-white/10 pt-3">
      <div className="mb-2 text-[10px] uppercase text-zinc-600">Child stagger</div>
      <div className="grid grid-cols-2 gap-2">
        <NumberField
          label="delay"
          step={0.02}
          value={el.child_stagger ?? undefined}
          onChange={(v) =>
            upsertElement({ id: el.id, child_stagger: v })
          }
        />
        <label className="space-y-1">
          <div className="text-[10px] text-zinc-500">order</div>
          <select
            className="w-full rounded border border-white/10 bg-zinc-950 px-1 py-1 text-zinc-100"
            value={el.child_stagger_order ?? 'forward'}
            onChange={(e) =>
              upsertElement({
                id: el.id,
                child_stagger_order: e.target.value,
              })
            }
          >
            {['forward', 'reverse', 'center', 'random'].map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Per-keyframe transition override
// ────────────────────────────────────────────────────────────────────────────

/**
 * 현재 step의 키프레임에 대해 duration/ease를 글로벌 따라갈지 직접 지정할지
 * 토글로 선택하게 한다.
 *  - off: kfAtStep.duration / .ease = null → 글로벌 사용
 *  - on : 입력 박스 활성화, 즉시 키프레임 upsert
 */
function TransitionOverrideFields({
  id,
  step,
  kfAtStep,
}: {
  id: string
  step: number
  kfAtStep: KeyframeRow | undefined
}) {
  const globalDuration = useDuration()
  const durationOverridden =
    kfAtStep?.duration !== null && kfAtStep?.duration !== undefined
  const easeOverridden =
    kfAtStep?.ease !== null && kfAtStep?.ease !== undefined

  return (
    <div className="mt-3 space-y-2 rounded border border-white/5 bg-white/[0.02] p-2">
      <div className="text-[10px] uppercase tracking-wider text-zinc-500">
        transition into this step
      </div>

      {/* duration */}
      <div className="space-y-1">
        <label className="flex items-center justify-between text-[10px] text-zinc-500">
          <span>duration</span>
          <span className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={durationOverridden}
              onChange={(e) => {
                if (e.target.checked) {
                  // 켜면 글로벌 값을 시드로 박는다 (사용자가 곧장 미세조정)
                  commitKfRaw(id, step, kfAtStep, 'duration', globalDuration)
                } else {
                  commitKfRaw(id, step, kfAtStep, 'duration', null)
                }
              }}
              className="h-3 w-3 accent-sky-500"
            />
            <span className="text-zinc-600">override</span>
          </span>
        </label>
        {durationOverridden ? (
          <input
            type="number"
            min={0.01}
            step={0.05}
            value={kfAtStep?.duration ?? 0}
            className="w-full rounded border border-white/10 bg-zinc-950 px-2 py-1 text-zinc-100"
            onChange={(e) => {
              const v = e.target.value
              commitKfRaw(
                id,
                step,
                kfAtStep,
                'duration',
                v === '' ? null : Number(v),
              )
            }}
          />
        ) : (
          <div className="rounded border border-dashed border-white/5 px-2 py-1 text-[11px] text-zinc-600">
            global · {globalDuration}s
          </div>
        )}
      </div>

      {/* ease */}
      <div className="space-y-1">
        <label className="flex items-center justify-between text-[10px] text-zinc-500">
          <span>ease</span>
          <span className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={easeOverridden}
              onChange={(e) => {
                if (e.target.checked) {
                  commitKfRaw(id, step, kfAtStep, 'ease', 'easeOut')
                } else {
                  commitKfRaw(id, step, kfAtStep, 'ease', null)
                }
              }}
              className="h-3 w-3 accent-sky-500"
            />
            <span className="text-zinc-600">override</span>
          </span>
        </label>
        {easeOverridden ? (
          <select
            value={kfAtStep?.ease ?? ''}
            className="w-full rounded border border-white/10 bg-zinc-950 px-1 py-1 text-zinc-100"
            onChange={(e) =>
              commitKfRaw(id, step, kfAtStep, 'ease', e.target.value || null)
            }
          >
            {EASE_PRESET_NAMES.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        ) : (
          <div className="rounded border border-dashed border-white/5 px-2 py-1 text-[11px] text-zinc-600">
            global ease
          </div>
        )}
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Field components
// ────────────────────────────────────────────────────────────────────────────

function NumberField({
  label,
  value,
  step = 1,
  onChange,
}: {
  label: string
  value: number | undefined
  step?: number
  onChange: (v: number | null) => void
}) {
  const v = value ?? ''
  return (
    <label className="space-y-1">
      <div className="text-[10px] text-zinc-500">{label}</div>
      <input
        type="number"
        step={step}
        value={v}
        className="w-full rounded border border-white/10 bg-zinc-950 px-2 py-1 text-zinc-100"
        onChange={(e) => {
          const s = e.target.value
          if (s === '') onChange(null)
          else onChange(Number(s))
        }}
      />
    </label>
  )
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string | null) => void
}) {
  const isEmpty = !value
  return (
    <label className="space-y-1">
      <div className="text-[10px] text-zinc-500">{label}</div>
      <div className="flex items-center gap-1">
        <div className="relative h-7 w-7 shrink-0">
          <input
            type="color"
            value={value || '#000000'}
            onChange={(e) => onChange(e.target.value)}
            className="h-7 w-7 rounded border border-white/10 bg-zinc-950"
          />
          {isEmpty ? (
            // 빈 상태(=fill 없음) 시각화: 빨간 사선
            <div className="pointer-events-none absolute inset-0 rounded border border-white/10">
              <svg
                viewBox="0 0 28 28"
                className="h-full w-full"
                preserveAspectRatio="none"
              >
                <line
                  x1="2"
                  y1="26"
                  x2="26"
                  y2="2"
                  stroke="#f87171"
                  strokeWidth="2"
                />
              </svg>
            </div>
          ) : null}
        </div>
        <input
          type="text"
          value={value}
          placeholder="(none)"
          onChange={(e) => onChange(e.target.value || null)}
          className="min-w-0 flex-1 rounded border border-white/10 bg-zinc-950 px-2 py-1 text-zinc-100"
        />
        {!isEmpty ? (
          <button
            type="button"
            onClick={() => onChange(null)}
            title="clear (no fill)"
            className="rounded px-1 text-[11px] text-zinc-500 hover:bg-white/5 hover:text-zinc-200"
          >
            ✕
          </button>
        ) : null}
      </div>
    </label>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

function commitKf(
  elementId: string,
  step: number,
  existing: KeyframeRow | undefined,
  key: AnimatableKey,
  value: number | string | null,
) {
  commitKfRaw(elementId, step, existing, key, value)
}

/**
 * AnimatableKey로 좁혀지지 않는 컬럼 (text_content, duration, ease)도 받을 수 있는
 * 일반화 버전. 키프레임 행을 머지해서 upsert한다.
 */
function commitKfRaw(
  elementId: string,
  step: number,
  existing: KeyframeRow | undefined,
  key: keyof KeyframeRow,
  value: number | string | null,
) {
  const base: Partial<KeyframeRow> = {
    element_id: elementId,
    step,
  }
  if (existing) {
    Object.assign(base, existing)
  }
  ;(base as Record<string, unknown>)[key] = value
  upsertKeyframe(base as KeyframeRow)
}
