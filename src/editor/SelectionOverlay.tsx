/**
 * 캔버스 위에 떠 있는 선택/드래그/리사이즈 오버레이.
 *
 * - 선택된 element들의 현재 step에서의 effective rect를 계산
 * - 그 위에 핸들(드래그용 박스 + 8개 리사이즈 핸들) 표시
 * - 드래그 시 step에 키프레임 upsert (현재 step에 키가 없으면 새로 만들고 그렇지 않으면 갱신)
 *
 * 좌표계 변환:
 *   캔버스 가상 좌표(1920x1080) ↔ 화면 좌표
 *   배율은 매번 frameRef의 boundingClientRect로 계산
 */

import { useEffect, useRef, useState } from 'react'
import {
  useScene,
  useSelection,
  upsertKeyframe,
  getScene,
  setSelection,
} from '../scene/store'
import { computeValuesAt } from '../scene/interpolate'
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../scene/Stage'
import type { ElementRow, KeyframeRow } from '../scene/types'

interface Rect {
  x: number
  y: number
  width: number
  height: number
}

interface SelectionOverlayProps {
  step: number
  /** 캔버스 프레임 (transform: scale 적용된 1920x1080 컨테이너의 부모) */
  frameRef: React.RefObject<HTMLDivElement | null>
}

type DragMode =
  | { kind: 'none' }
  | { kind: 'move'; startX: number; startY: number; rects: Map<string, Rect> }
  | {
      kind: 'resize'
      handle: HandleId
      startX: number
      startY: number
      rects: Map<string, Rect>
    }
  | {
      kind: 'marquee'
      startX: number
      startY: number
      currentX: number
      currentY: number
    }

type HandleId = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'

export function SelectionOverlay({ step, frameRef }: SelectionOverlayProps) {
  const scene = useScene()
  const selection = useSelection()
  const overlayRef = useRef<HTMLDivElement | null>(null)
  const [drag, setDrag] = useState<DragMode>({ kind: 'none' })

  // 캔버스 → 화면 배율
  const getScale = (): number => {
    const node = frameRef.current
    if (!node) return 1
    const rect = node.getBoundingClientRect()
    return rect.width / CANVAS_WIDTH
  }

  // 화면 좌표 → 캔버스 가상 좌표 (좌상단 기준)
  const screenToCanvas = (clientX: number, clientY: number): { x: number; y: number } => {
    const node = frameRef.current
    if (!node) return { x: 0, y: 0 }
    const rect = node.getBoundingClientRect()
    const s = rect.width / CANVAS_WIDTH
    return {
      x: (clientX - rect.left) / s,
      y: (clientY - rect.top) / s,
    }
  }

  // 선택된 요소들의 현재 effective rect 계산
  const getRect = (el: ElementRow): Rect => {
    const kfs = scene?.keyframes.filter((k) => k.element_id === el.id) ?? []
    const v = computeValuesAt(kfs, step)
    return {
      x: typeof v.x === 'number' ? v.x : 0,
      y: typeof v.y === 'number' ? v.y : 0,
      width: typeof v.width === 'number' ? v.width : 200,
      height: typeof v.height === 'number' ? v.height : 80,
    }
  }

  // ────────────────────────────────────────────────────────────────────────
  // 드래그 이벤트 핸들링 (window 레벨 listener)
  // ────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (drag.kind === 'none') return

    const onMove = (e: MouseEvent) => {
      e.preventDefault()
      const cur = screenToCanvas(e.clientX, e.clientY)

      if (drag.kind === 'move') {
        const dx = cur.x - drag.startX
        const dy = cur.y - drag.startY
        // 시각적으로만 미리 보기 — 실제 commit은 mouseup
        const s = getScale()
        for (const [id] of drag.rects) {
          const el = overlayRef.current?.querySelector(
            `[data-sel-id="${id}"]`,
          ) as HTMLElement | null
          if (el) {
            el.style.transform = `translate(${dx * s}px, ${dy * s}px)`
          }
        }
        // 캔버스의 실제 노드도 옮겨 보여줌(미리 보기)
        for (const [id, r] of drag.rects) {
          const node = document.querySelector(
            `[data-stage-id="${id}"]`,
          ) as HTMLElement | null
          if (node) {
            node.style.left = `${r.x + dx}px`
            node.style.top = `${r.y + dy}px`
          }
        }
      } else if (drag.kind === 'resize') {
        const dx = cur.x - drag.startX
        const dy = cur.y - drag.startY
        for (const [id, r] of drag.rects) {
          const next = applyResize(r, drag.handle, dx, dy)
          const node = document.querySelector(
            `[data-stage-id="${id}"]`,
          ) as HTMLElement | null
          if (node) {
            node.style.left = `${next.x}px`
            node.style.top = `${next.y}px`
            node.style.width = `${next.width}px`
            node.style.height = `${next.height}px`
          }
        }
      } else if (drag.kind === 'marquee') {
        setDrag({
          ...drag,
          currentX: cur.x,
          currentY: cur.y,
        })
      }
    }

    const onUp = async (e: MouseEvent) => {
      e.preventDefault()
      const cur = screenToCanvas(e.clientX, e.clientY)

      if (drag.kind === 'move') {
        const dx = cur.x - drag.startX
        const dy = cur.y - drag.startY
        // 미리 보기 transform 정리
        for (const [id] of drag.rects) {
          const el = overlayRef.current?.querySelector(
            `[data-sel-id="${id}"]`,
          ) as HTMLElement | null
          if (el) el.style.transform = ''
        }
        // commit
        if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
          for (const [id, r] of drag.rects) {
            await commitRect(id, step, { ...r, x: r.x + dx, y: r.y + dy })
          }
        }
      } else if (drag.kind === 'resize') {
        const dx = cur.x - drag.startX
        const dy = cur.y - drag.startY
        for (const [id, r] of drag.rects) {
          const next = applyResize(r, drag.handle, dx, dy)
          await commitRect(id, step, next)
        }
      } else if (drag.kind === 'marquee') {
        // marquee 박스에 들어오는 element를 선택
        const x1 = Math.min(drag.startX, drag.currentX)
        const y1 = Math.min(drag.startY, drag.currentY)
        const x2 = Math.max(drag.startX, drag.currentX)
        const y2 = Math.max(drag.startY, drag.currentY)
        const sc = getScene()
        if (sc) {
          const hits: string[] = []
          for (const el of sc.elements) {
            const r = getRect(el)
            const cx = r.x + r.width / 2
            const cy = r.y + r.height / 2
            if (cx >= x1 && cx <= x2 && cy >= y1 && cy <= y2) {
              hits.push(el.id)
            }
          }
          if (hits.length > 0) setSelection(hits)
        }
      }

      setDrag({ kind: 'none' })
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [drag, step])

  if (!scene) return null

  const selected: ElementRow[] = []
  for (const id of selection) {
    const el = scene.elements.find((e) => e.id === id)
    if (el) selected.push(el)
  }

  // 드래그 시작 핸들러
  const startMove = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    const cur = screenToCanvas(e.clientX, e.clientY)
    const rects = new Map<string, Rect>()
    for (const el of selected) rects.set(el.id, getRect(el))
    setDrag({ kind: 'move', startX: cur.x, startY: cur.y, rects })
  }

  const startResize = (handle: HandleId) => (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    const cur = screenToCanvas(e.clientX, e.clientY)
    const rects = new Map<string, Rect>()
    for (const el of selected) rects.set(el.id, getRect(el))
    setDrag({ kind: 'resize', handle, startX: cur.x, startY: cur.y, rects })
  }

  // 빈 캔버스 클릭 → marquee
  const onBackgroundMouseDown = (e: React.MouseEvent) => {
    if (e.target !== e.currentTarget) return
    const cur = screenToCanvas(e.clientX, e.clientY)
    setDrag({
      kind: 'marquee',
      startX: cur.x,
      startY: cur.y,
      currentX: cur.x,
      currentY: cur.y,
    })
  }

  return (
    <div
      ref={overlayRef}
      className="pointer-events-none absolute inset-0"
      style={{
        // 1920x1080 가상 좌표를 그대로 사용 (Stage와 동일한 transform)
        transformOrigin: 'top left',
      }}
    >
      <div
        className="pointer-events-auto absolute inset-0"
        onMouseDown={onBackgroundMouseDown}
        style={{ background: 'transparent' }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          width: CANVAS_WIDTH,
          height: CANVAS_HEIGHT,
          transformOrigin: 'top left',
          transform: 'scale(var(--canvas-scale, 1))',
          pointerEvents: 'none',
        }}
      >
        {selected.map((el) => {
          const r = getRect(el)
          return (
            <div
              key={el.id}
              data-sel-id={el.id}
              className="absolute"
              style={{
                left: r.x,
                top: r.y,
                width: r.width,
                height: r.height,
                pointerEvents: 'none',
              }}
            >
              <div
                className="pointer-events-auto absolute inset-0 cursor-move ring-2 ring-sky-400"
                onMouseDown={startMove}
              />
              {(['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as HandleId[]).map(
                (h) => (
                  <Handle key={h} id={h} onMouseDown={startResize(h)} />
                ),
              )}
            </div>
          )
        })}

        {drag.kind === 'marquee' ? (
          <div
            className="pointer-events-none absolute border border-sky-400/60 bg-sky-400/10"
            style={{
              left: Math.min(drag.startX, drag.currentX),
              top: Math.min(drag.startY, drag.currentY),
              width: Math.abs(drag.currentX - drag.startX),
              height: Math.abs(drag.currentY - drag.startY),
            }}
          />
        ) : null}
      </div>
    </div>
  )
}

function Handle({
  id,
  onMouseDown,
}: {
  id: HandleId
  onMouseDown: (e: React.MouseEvent) => void
}) {
  const size = 12
  const half = size / 2
  const positions: Record<HandleId, React.CSSProperties> = {
    nw: { left: -half, top: -half, cursor: 'nwse-resize' },
    n: { left: '50%', top: -half, marginLeft: -half, cursor: 'ns-resize' },
    ne: { right: -half, top: -half, cursor: 'nesw-resize' },
    e: { right: -half, top: '50%', marginTop: -half, cursor: 'ew-resize' },
    se: { right: -half, bottom: -half, cursor: 'nwse-resize' },
    s: { left: '50%', bottom: -half, marginLeft: -half, cursor: 'ns-resize' },
    sw: { left: -half, bottom: -half, cursor: 'nesw-resize' },
    w: { left: -half, top: '50%', marginTop: -half, cursor: 'ew-resize' },
  }
  return (
    <div
      onMouseDown={onMouseDown}
      className="pointer-events-auto absolute rounded-sm border border-sky-400 bg-zinc-900"
      style={{
        width: size,
        height: size,
        ...positions[id],
      }}
    />
  )
}

function applyResize(r: Rect, handle: HandleId, dx: number, dy: number): Rect {
  let { x, y, width, height } = r
  const minSize = 4
  if (handle.includes('e')) width = Math.max(minSize, width + dx)
  if (handle.includes('w')) {
    width = Math.max(minSize, width - dx)
    x = x + (r.width - width)
  }
  if (handle.includes('s')) height = Math.max(minSize, height + dy)
  if (handle.includes('n')) {
    height = Math.max(minSize, height - dy)
    y = y + (r.height - height)
  }
  return { x, y, width, height }
}

async function commitRect(id: string, step: number, r: Rect): Promise<void> {
  // 현재 element의 키프레임 중 해당 step에 이미 row가 있으면 그걸 update,
  // 없으면 새로 만든다.
  const scene = getScene()
  if (!scene) return
  const existing = scene.keyframes.find(
    (k: KeyframeRow) => k.element_id === id && k.step === step,
  )
  await upsertKeyframe({
    element_id: id,
    step,
    x: r.x,
    y: r.y,
    width: r.width,
    height: r.height,
    // 이미 있는 다른 키들은 upsert에서 머지되므로 그대로 둠
    opacity: existing?.opacity ?? null,
    rotate: existing?.rotate ?? null,
    scale: existing?.scale ?? null,
    bg_color: existing?.bg_color ?? null,
    fg_color: existing?.fg_color ?? null,
    border_radius: existing?.border_radius ?? null,
    font_size: existing?.font_size ?? null,
  })
}
