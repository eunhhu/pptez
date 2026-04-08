/**
 * 클라이언트 사이드 scene store.
 *
 * - fetch로 초기 로드
 * - 모든 mutation은 optimistic update (로컬 즉시 반영) + API 호출
 * - 단순 React 상태 + 구독 모델 (zustand 같은 거 안 써도 충분)
 */

import { useEffect, useState, useCallback } from 'react'
import type {
  Scene,
  ElementRow,
  ElementType,
  KeyframeRow,
  AssetRow,
} from './types'
import * as api from './api'

// 단일 인스턴스 — 전역 store
let _scene: Scene | null = null
const _listeners = new Set<() => void>()

function notify() {
  for (const l of _listeners) l()
}

/** _scene을 새 객체로 교체해서 React가 변화를 감지하게 함. */
function setScene(next: Scene | null) {
  _scene = next
  notify()
}

/** 부분 업데이트 — _scene을 새 객체로 갈아끼우면서 들어온 패치만 머지. */
function patchScene(patch: Partial<Scene>) {
  if (!_scene) return
  _scene = { ..._scene, ...patch }
  notify()
}

export function getScene(): Scene | null {
  return _scene
}

async function loadInitial() {
  setScene(await api.fetchScene())
}

let _loadPromise: Promise<void> | null = null
function ensureLoaded() {
  if (!_loadPromise) _loadPromise = loadInitial()
  return _loadPromise
}

/** React 훅: scene 데이터 구독. 첫 호출 시 자동으로 로드. */
export function useScene(): Scene | null {
  const [scene, setScene] = useState<Scene | null>(_scene)
  useEffect(() => {
    ensureLoaded()
    const listener = () => setScene(_scene)
    _listeners.add(listener)
    listener() // 즉시 한 번
    return () => {
      _listeners.delete(listener)
    }
  }, [])
  return scene
}

/** 강제 리프레시 */
export async function reloadScene() {
  setScene(await api.fetchScene())
}

// ────────────────────────────────────────────────────────────────────────────
// Mutations (optimistic)
// ────────────────────────────────────────────────────────────────────────────

export async function upsertElement(input: Partial<ElementRow> & { id: string }) {
  if (!_scene) await ensureLoaded()
  if (!_scene) return
  const idx = _scene.elements.findIndex((e) => e.id === input.id)
  let nextElements: ElementRow[]
  if (idx >= 0) {
    nextElements = _scene.elements.slice()
    nextElements[idx] = { ...nextElements[idx], ...input } as ElementRow
  } else {
    const row: ElementRow = {
      id: input.id,
      parent_id: input.parent_id ?? null,
      type: input.type ?? 'frame',
      name: input.name ?? null,
      z_index: input.z_index ?? 0,
      subtype: input.subtype ?? null,
      text_content: input.text_content ?? null,
      text_split: input.text_split ?? null,
      font_weight: input.font_weight ?? null,
      text_align: input.text_align ?? null,
      image_src: input.image_src ?? null,
      layout_mode: input.layout_mode ?? null,
      layout_gap: input.layout_gap ?? null,
      layout_padding: input.layout_padding ?? null,
      layout_align: input.layout_align ?? null,
      layout_justify: input.layout_justify ?? null,
      child_stagger: input.child_stagger ?? null,
      child_stagger_order: input.child_stagger_order ?? null,
      child_motion_preset: input.child_motion_preset ?? null,
      created_at: Date.now(),
    }
    nextElements = [..._scene.elements, row]
  }
  patchScene({ elements: nextElements })
  try {
    const fresh = await api.upsertElement(input)
    if (_scene) {
      const i = _scene.elements.findIndex((e) => e.id === fresh.id)
      if (i >= 0) {
        const updated = _scene.elements.slice()
        updated[i] = fresh
        patchScene({ elements: updated })
      }
    }
  } catch (e) {
    console.error(e)
  }
}

export async function deleteElement(id: string) {
  if (!_scene) return
  // 자식 cascade 처리: 모든 후손 id 수집
  const toDelete = new Set<string>([id])
  let changed = true
  while (changed) {
    changed = false
    for (const el of _scene.elements) {
      if (el.parent_id && toDelete.has(el.parent_id) && !toDelete.has(el.id)) {
        toDelete.add(el.id)
        changed = true
      }
    }
  }
  patchScene({
    elements: _scene.elements.filter((e) => !toDelete.has(e.id)),
    keyframes: _scene.keyframes.filter((k) => !toDelete.has(k.element_id)),
  })
  try {
    await api.deleteElement(id)
  } catch (e) {
    console.error(e)
  }
}

export async function upsertKeyframe(input: Partial<KeyframeRow> & { element_id: string; step: number }) {
  if (!_scene) return
  const idx = _scene.keyframes.findIndex(
    (k) => k.element_id === input.element_id && k.step === input.step,
  )
  let nextKeyframes: KeyframeRow[]
  if (idx >= 0) {
    nextKeyframes = _scene.keyframes.slice()
    nextKeyframes[idx] = { ...nextKeyframes[idx], ...input } as KeyframeRow
  } else {
    const row: KeyframeRow = {
      element_id: input.element_id,
      step: input.step,
      x: input.x ?? null,
      y: input.y ?? null,
      width: input.width ?? null,
      height: input.height ?? null,
      opacity: input.opacity ?? null,
      rotate: input.rotate ?? null,
      scale: input.scale ?? null,
      skew_x: input.skew_x ?? null,
      skew_y: input.skew_y ?? null,
      bg_color: input.bg_color ?? null,
      fg_color: input.fg_color ?? null,
      border_radius: input.border_radius ?? null,
      font_size: input.font_size ?? null,
      blur: input.blur ?? null,
      shadow: input.shadow ?? null,
      border_width: input.border_width ?? null,
      border_color: input.border_color ?? null,
      text_content: input.text_content ?? null,
      duration: input.duration ?? null,
      ease: input.ease ?? null,
    }
    nextKeyframes = [..._scene.keyframes, row]
  }
  patchScene({ keyframes: nextKeyframes })
  try {
    await api.upsertKeyframe(input)
  } catch (e) {
    console.error(e)
  }
}

export async function deleteKeyframe(elementId: string, step: number) {
  if (!_scene) return
  patchScene({
    keyframes: _scene.keyframes.filter(
      (k) => !(k.element_id === elementId && k.step === step),
    ),
  })
  try {
    await api.deleteKeyframe(elementId, step)
  } catch (e) {
    console.error(e)
  }
}

export async function setMeta(key: string, value: string) {
  if (!_scene) return
  patchScene({ meta: { ..._scene.meta, [key]: value } })
  try {
    await api.setMeta(key, value)
  } catch (e) {
    console.error(e)
  }
}

export async function uploadAsset(file: File): Promise<AssetRow | null> {
  if (!_scene) return null
  try {
    const row = await api.uploadAsset(file)
    if (_scene && !_scene.assets.find((a) => a.id === row.id)) {
      patchScene({ assets: [row, ..._scene.assets] })
    }
    return row
  } catch (e) {
    console.error(e)
    return null
  }
}

export async function deleteAsset(id: string) {
  if (!_scene) return
  patchScene({ assets: _scene.assets.filter((a) => a.id !== id) })
  try {
    await api.deleteAsset(id)
  } catch (e) {
    console.error(e)
  }
}

/** 새 element id 생성 */
export function newElementId(): string {
  const cryptoApi = globalThis.crypto
  if (typeof cryptoApi?.randomUUID === 'function') {
    return cryptoApi.randomUUID().replace(/-/g, '').slice(0, 12)
  }
  const bytes =
    typeof cryptoApi?.getRandomValues === 'function'
      ? cryptoApi.getRandomValues(new Uint8Array(12))
      : Uint8Array.from({ length: 12 }, () => Math.floor(Math.random() * 256))
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

// ────────────────────────────────────────────────────────────────────────────
// Higher-level node operations
// ────────────────────────────────────────────────────────────────────────────

function nextZIndex(parentId: string | null): number {
  if (!_scene) return 0
  const siblings = _scene.elements.filter((e) => e.parent_id === parentId)
  if (siblings.length === 0) return 0
  return Math.max(...siblings.map((s) => s.z_index)) + 1
}

interface Rect {
  x: number
  y: number
  width: number
  height: number
}

const ROOT_PARENT = '__root__'

interface GeometryContext {
  scene: Scene
  elementsById: Map<string, ElementRow>
  keyframesByElement: Map<string, KeyframeRow[]>
  childIdsByParent: Map<string, string[]>
}

function parentKey(parentId: string | null): string {
  return parentId ?? ROOT_PARENT
}

function buildGeometryContext(scene: Scene): GeometryContext {
  const elementsById = new Map<string, ElementRow>()
  for (const el of scene.elements) elementsById.set(el.id, el)

  const keyframesByElement = new Map<string, KeyframeRow[]>()
  for (const kf of scene.keyframes) {
    const arr = keyframesByElement.get(kf.element_id)
    if (arr) arr.push(kf)
    else keyframesByElement.set(kf.element_id, [kf])
  }
  for (const arr of keyframesByElement.values()) {
    arr.sort((a, b) => a.step - b.step)
  }

  const childIdsByParent = new Map<string, string[]>()
  for (const el of scene.elements) {
    const key = parentKey(el.parent_id)
    const arr = childIdsByParent.get(key)
    if (arr) arr.push(el.id)
    else childIdsByParent.set(key, [el.id])
  }
  for (const arr of childIdsByParent.values()) {
    arr.sort((a, b) => {
      const ea = elementsById.get(a)
      const eb = elementsById.get(b)
      return (ea?.z_index ?? 0) - (eb?.z_index ?? 0)
    })
  }

  return { scene, elementsById, keyframesByElement, childIdsByParent }
}

function getTotalStepsFromScene(scene: Scene): number {
  return Math.max(1, Number(scene.meta.total_steps ?? '1'))
}

function getLocalRectAt(
  ctx: GeometryContext,
  elementId: string,
  step: number,
): Rect {
  const el = ctx.elementsById.get(elementId)
  if (!el) return { x: 0, y: 0, width: 200, height: 80 }
  const v = computeValuesAt(ctx.keyframesByElement.get(elementId) ?? [], step, true)
  return {
    x: typeof v.x === 'number' ? v.x : 0,
    y: typeof v.y === 'number' ? v.y : 0,
    width: typeof v.width === 'number' ? v.width : 200,
    height: typeof v.height === 'number' ? v.height : 80,
  }
}

function getChildIds(
  ctx: GeometryContext,
  parentId: string | null,
  orderOverrides?: Map<string, string[]>,
): string[] {
  const key = parentKey(parentId)
  const override = orderOverrides?.get(key)
  if (override) return override
  return ctx.childIdsByParent.get(key) ?? []
}

function getFlowSlotAt(
  ctx: GeometryContext,
  parentId: string,
  childId: string,
  step: number,
  orderOverrides?: Map<string, string[]>,
): { x: number; y: number } {
  const parent = ctx.elementsById.get(parentId)
  if (!parent) return { x: 0, y: 0 }

  const parentRect = getLocalRectAt(ctx, parentId, step)
  const childIds = getChildIds(ctx, parentId, orderOverrides)
  if (childIds.length === 0) return { x: 0, y: 0 }

  const sizes = childIds.map((id) => getLocalRectAt(ctx, id, step))
  const padding = parent.layout_padding ?? 0
  const baseGap = parent.layout_gap ?? 0
  const innerWidth = parentRect.width - padding * 2
  const innerHeight = parentRect.height - padding * 2
  const isRow = parent.layout_mode === 'row'
  const mainSizes = sizes.map((r) => (isRow ? r.width : r.height))
  const crossSizes = sizes.map((r) => (isRow ? r.height : r.width))
  const sumMain = mainSizes.reduce((a, b) => a + b, 0)
  let gap = baseGap
  let start = padding

  if (isRow) {
    const packed = sumMain + baseGap * Math.max(0, childIds.length - 1)
    switch (parent.layout_justify) {
      case 'center':
        start = padding + (innerWidth - packed) / 2
        break
      case 'end':
        start = padding + innerWidth - packed
        break
      case 'between':
        gap = childIds.length > 1 ? (innerWidth - sumMain) / (childIds.length - 1) : 0
        break
      case 'around':
        gap = childIds.length > 0 ? (innerWidth - sumMain) / childIds.length : 0
        start = padding + gap / 2
        break
      default:
        start = padding
    }
  } else {
    const packed = sumMain + baseGap * Math.max(0, childIds.length - 1)
    switch (parent.layout_justify) {
      case 'center':
        start = padding + (innerHeight - packed) / 2
        break
      case 'end':
        start = padding + innerHeight - packed
        break
      case 'between':
        gap = childIds.length > 1 ? (innerHeight - sumMain) / (childIds.length - 1) : 0
        break
      case 'around':
        gap = childIds.length > 0 ? (innerHeight - sumMain) / childIds.length : 0
        start = padding + gap / 2
        break
      default:
        start = padding
    }
  }

  let cursor = start
  for (let i = 0; i < childIds.length; i++) {
    const id = childIds[i]
    const cross =
      parent.layout_align === 'center'
        ? padding + ((isRow ? innerHeight : innerWidth) - crossSizes[i]) / 2
        : parent.layout_align === 'end'
          ? padding + (isRow ? innerHeight : innerWidth) - crossSizes[i]
          : padding
    const slot = isRow ? { x: cursor, y: cross } : { x: cross, y: cursor }
    if (id === childId) return slot
    cursor += mainSizes[i] + gap
  }

  return { x: padding, y: padding }
}

function getCanvasRectAt(
  ctx: GeometryContext,
  elementId: string,
  step: number,
  orderOverrides?: Map<string, string[]>,
  memo?: Map<string, Rect>,
): Rect {
  const key = `${elementId}@${step}`
  const cached = memo?.get(key)
  if (cached) return cached

  const el = ctx.elementsById.get(elementId)
  const local = getLocalRectAt(ctx, elementId, step)
  if (!el || !el.parent_id) {
    memo?.set(key, local)
    return local
  }

  const parentRect = getCanvasRectAt(ctx, el.parent_id, step, orderOverrides, memo)
  const parent = ctx.elementsById.get(el.parent_id)
  let resolved: Rect
  if (parent?.layout_mode === 'row' || parent?.layout_mode === 'column') {
    const slot = getFlowSlotAt(ctx, parent.id, elementId, step, orderOverrides)
    resolved = {
      ...local,
      x: parentRect.x + slot.x + local.x,
      y: parentRect.y + slot.y + local.y,
    }
  } else {
    resolved = {
      ...local,
      x: parentRect.x + local.x,
      y: parentRect.y + local.y,
    }
  }
  memo?.set(key, resolved)
  return resolved
}

function captureReparentLocalPositions(
  scene: Scene,
  movingIds: string[],
  newParentId: string | null,
  orderOverrides?: Map<string, string[]>,
): Map<string, Array<{ step: number; x: number; y: number }>> {
  const ctx = buildGeometryContext(scene)
  const total = getTotalStepsFromScene(scene)
  const out = new Map<string, Array<{ step: number; x: number; y: number }>>()

  for (const id of movingIds) {
    const el = ctx.elementsById.get(id)
    if (!el || el.parent_id === newParentId) continue
    const rows: Array<{ step: number; x: number; y: number }> = []
    for (let step = 0; step < total; step++) {
      const memo = new Map<string, Rect>()
      const absolute = getCanvasRectAt(ctx, id, step, undefined, memo)
      let x = absolute.x
      let y = absolute.y
      if (newParentId) {
        const parentRect = getCanvasRectAt(ctx, newParentId, step, undefined, memo)
        const parent = ctx.elementsById.get(newParentId)
        if (parent?.layout_mode === 'row' || parent?.layout_mode === 'column') {
          const slot = getFlowSlotAt(ctx, newParentId, id, step, orderOverrides)
          x = absolute.x - parentRect.x - slot.x
          y = absolute.y - parentRect.y - slot.y
        } else {
          x = absolute.x - parentRect.x
          y = absolute.y - parentRect.y
        }
      }
      rows.push({ step, x, y })
    }
    out.set(id, rows)
  }

  return out
}

async function applyLocalPositions(
  positions: Map<string, Array<{ step: number; x: number; y: number }>>,
) {
  for (const [id, rows] of positions) {
    for (const row of rows) {
      await upsertKeyframe({
        element_id: id,
        step: row.step,
        x: row.x,
        y: row.y,
      })
    }
  }
}

async function normalizeChildrenForAutoLayout(frameId: string) {
  if (!_scene) return
  const total = getTotalStepsFromScene(_scene)
  const children = _scene.elements
    .filter((e) => e.parent_id === frameId)
    .sort((a, b) => a.z_index - b.z_index)
  for (const child of children) {
    for (let step = 0; step < total; step++) {
      await upsertKeyframe({
        element_id: child.id,
        step,
        x: 0,
        y: 0,
      })
    }
  }
}

async function freezeChildrenFromAutoLayout(frameId: string) {
  if (!_scene) return
  const scene = _scene
  const ctx = buildGeometryContext(scene)
  const total = getTotalStepsFromScene(scene)
  const children = scene.elements
    .filter((e) => e.parent_id === frameId)
    .sort((a, b) => a.z_index - b.z_index)
  const positions = new Map<string, Array<{ step: number; x: number; y: number }>>()
  for (const child of children) {
    const rows: Array<{ step: number; x: number; y: number }> = []
    for (let step = 0; step < total; step++) {
      const memo = new Map<string, Rect>()
      const absolute = getCanvasRectAt(ctx, child.id, step, undefined, memo)
      const parentRect = getCanvasRectAt(ctx, frameId, step, undefined, memo)
      rows.push({
        step,
        x: absolute.x - parentRect.x,
        y: absolute.y - parentRect.y,
      })
    }
    positions.set(child.id, rows)
  }
  await applyLocalPositions(positions)
}

/**
 * 새 element 생성. 기본값으로 frame 100x100을 step 0에 만들어줌.
 * 반환: 만들어진 element id
 */
export async function createElement(opts: {
  type: ElementType
  parent_id?: string | null
  name?: string
  text_content?: string
  image_src?: string
  x?: number
  y?: number
  width?: number
  height?: number
  bg_color?: string
  fg_color?: string
  font_size?: number
}): Promise<string> {
  const id = newElementId()
  const parent_id = opts.parent_id ?? null
  const z_index = nextZIndex(parent_id)
  const defaultName =
    opts.name ??
    (opts.type === 'frame'
      ? 'Frame'
      : opts.type === 'text'
        ? 'Text'
        : 'Image')

  await upsertElement({
    id,
    parent_id,
    type: opts.type,
    name: defaultName,
    z_index,
    subtype: opts.type === 'frame' ? 'rect' : null,
    text_content: opts.type === 'text' ? (opts.text_content ?? 'Text') : null,
    text_split: opts.type === 'text' ? 'none' : null,
    font_weight: opts.type === 'text' ? 500 : null,
    text_align: opts.type === 'text' ? 'left' : null,
    image_src: opts.type === 'image' ? (opts.image_src ?? null) : null,
    layout_mode: opts.type === 'frame' ? 'none' : null,
    layout_gap: null,
    layout_padding: null,
    layout_align: null,
    layout_justify: null,
    child_stagger: null,
    child_stagger_order: null,
    child_motion_preset: null,
  })

  // step 0에 transform/geometry 기본값을 박아둔다.
  // (이래야 인스펙터에서 step>0에서 값을 바꿔도 step 0이 비어있지 않아 보간 base가 잡힘)
  //
  // ⚠ fill/stroke/색 관련 속성은 명시적으로 opts에 들어왔을 때만 박는다.
  //    - 사용자가 "아무 fill 없는 frame"을 만들 수 있어야 함 (투명 컨테이너 등)
  //    - text는 fg_color 기본만 시드 (가독성을 위해 한 번은 필요), 사용자가 곧 바꿀 수 있음
  await upsertKeyframe({
    element_id: id,
    step: 0,
    x: opts.x ?? 100,
    y: opts.y ?? 100,
    width: opts.width ?? (opts.type === 'text' ? 400 : 200),
    height: opts.height ?? (opts.type === 'text' ? 80 : 200),
    opacity: 1,
    rotate: 0,
    scale: 1,
    skew_x: 0,
    skew_y: 0,
    bg_color: opts.bg_color ?? null,
    fg_color: opts.fg_color ?? (opts.type === 'text' ? '#f4f4f5' : null),
    border_radius: 0,
    font_size: opts.font_size ?? (opts.type === 'text' ? 48 : null),
    blur: 0,
    shadow: null,
    border_width: null,
    border_color: null,
  })

  return id
}

/** element 복제 (자식까지 deep clone), 키프레임도 복사. 새 root id 반환. */
export async function duplicateElement(id: string): Promise<string | null> {
  if (!_scene) return null
  const root = _scene.elements.find((e) => e.id === id)
  if (!root) return null

  // 후손 수집
  const all: ElementRow[] = [root]
  const queue = [id]
  while (queue.length > 0) {
    const pid = queue.shift()!
    for (const el of _scene.elements) {
      if (el.parent_id === pid) {
        all.push(el)
        queue.push(el.id)
      }
    }
  }

  // 새 id 매핑
  const idMap = new Map<string, string>()
  for (const el of all) idMap.set(el.id, newElementId())

  const newRootId = idMap.get(id)!

  // 새 element들 생성
  for (const el of all) {
    const newId = idMap.get(el.id)!
    const newParent =
      el.id === id
        ? el.parent_id
        : (idMap.get(el.parent_id ?? '') ?? el.parent_id)
    await upsertElement({
      ...el,
      id: newId,
      parent_id: newParent,
      z_index: el.id === id ? nextZIndex(el.parent_id) : el.z_index,
      name: el.id === id ? `${el.name ?? el.type} copy` : el.name,
    })
    // 키프레임 복사
    const kfs = _scene.keyframes.filter((k) => k.element_id === el.id)
    for (const kf of kfs) {
      await upsertKeyframe({ ...kf, element_id: newId })
    }
  }

  return newRootId
}

/**
 * 선택된 element들을 새 frame으로 그룹화.
 * 모두 같은 parent여야 함. frame은 첫 element 위치에 생성됨.
 */
export async function groupElements(ids: string[]): Promise<string | null> {
  if (!_scene || ids.length === 0) return null
  const targets = ids
    .map((id) => _scene!.elements.find((e) => e.id === id))
    .filter((e): e is ElementRow => !!e)
  if (targets.length === 0) return null

  // 같은 부모만 허용
  const parentId = targets[0].parent_id
  if (!targets.every((t) => t.parent_id === parentId)) {
    console.warn('Cannot group elements with different parents')
    return null
  }

  const scene = _scene
  const ctx = buildGeometryContext(scene)
  const step = getStep()
  const rects = targets.map((t) => getCanvasRectAt(ctx, t.id, step))
  const bounds = rects.reduce(
    (acc, r) => ({
      x: Math.min(acc.x, r.x),
      y: Math.min(acc.y, r.y),
      width: Math.max(acc.width, r.x + r.width),
      height: Math.max(acc.height, r.y + r.height),
    }),
    {
      x: Number.POSITIVE_INFINITY,
      y: Number.POSITIVE_INFINITY,
      width: Number.NEGATIVE_INFINITY,
      height: Number.NEGATIVE_INFINITY,
    },
  )

  const groupId = await createElement({
    type: 'frame',
    parent_id: parentId,
    name: 'Group',
    x: bounds.x,
    y: bounds.y,
    width: bounds.width - bounds.x,
    height: bounds.height - bounds.y,
  })

  await reorderSibling(ids, groupId, null)

  return groupId
}

/** 그룹 해제 — frame 안의 자식들을 frame의 부모로 끌어올리고 frame 제거. */
export async function ungroupElement(id: string): Promise<void> {
  if (!_scene) return
  const frame = _scene.elements.find((e) => e.id === id)
  if (!frame || frame.type !== 'frame') return
  const children = _scene.elements
    .filter((e) => e.parent_id === id)
    .sort((a, b) => a.z_index - b.z_index)
  if (children.length > 0) {
    await reorderSibling(
      children.map((c) => c.id),
      frame.parent_id,
      null,
    )
  }
  await deleteElement(id)
}

/**
 * 여러 노드를 한 번에 새 부모로 이동 + 위치 지정 (drag & drop의 핵심).
 *
 *  - ids: 이동할 element들 (트리 순서대로 들어왔다고 가정 — 호출자가 정렬해서 넘김)
 *  - newParentId: 새 부모. null이면 루트로.
 *  - beforeId: 이 형제 "위에" 끼움 (z 더 큰 쪽). null이면 끝(가장 위)에.
 *
 * 사이클(자기/후손을 부모로) 방지. 새 부모 자식 z_index를 재할당해 안정 정렬.
 */
export async function reorderSibling(
  ids: string[],
  newParentId: string | null,
  beforeId: string | null,
): Promise<void> {
  if (!_scene || ids.length === 0) return
  const scene = _scene

  // 사이클 검사: 어떤 id의 후손에 newParentId가 있으면 안 됨.
  if (newParentId) {
    const isDescendantOfMoving = (cursor: string | null): boolean => {
      while (cursor) {
        if (ids.includes(cursor)) return true
        const p = scene.elements.find((e) => e.id === cursor)
        cursor = p?.parent_id ?? null
      }
      return false
    }
    if (isDescendantOfMoving(newParentId)) return
    if (ids.includes(newParentId)) return
  }

  // 새 부모의 현재 자식들 (이동 대상은 제외)
  const siblings = scene.elements
    .filter((e) => e.parent_id === newParentId && !ids.includes(e.id))
    .sort((a, b) => a.z_index - b.z_index)

  // 이동 대상도 트리 순서(=낮은 z 먼저)로
  const moving = ids
    .map((id) => scene.elements.find((e) => e.id === id))
    .filter((e): e is ElementRow => !!e)
    .sort((a, b) => a.z_index - b.z_index)

  // beforeId 위치 찾기 (없으면 맨 끝)
  let insertIdx = siblings.length
  if (beforeId) {
    const idx = siblings.findIndex((s) => s.id === beforeId)
    if (idx >= 0) insertIdx = idx
  }

  // 새 순서 빌드
  const next = [
    ...siblings.slice(0, insertIdx),
    ...moving,
    ...siblings.slice(insertIdx),
  ]

  const reparentIds = moving
    .filter((el) => el.parent_id !== newParentId)
    .map((el) => el.id)
  if (reparentIds.length > 0) {
    const orderOverrides = new Map<string, string[]>([
      [parentKey(newParentId), next.map((el) => el.id)],
    ])
    const positions = captureReparentLocalPositions(
      scene,
      reparentIds,
      newParentId,
      orderOverrides,
    )
    await applyLocalPositions(positions)
  }

  // z_index 재할당 (0..N-1)
  for (let i = 0; i < next.length; i++) {
    const el = next[i]
    const needsParentChange = el.parent_id !== newParentId
    if (el.z_index !== i || needsParentChange) {
      await upsertElement({
        id: el.id,
        parent_id: newParentId,
        z_index: i,
      })
    }
  }
}

/** 부모 변경 */
export async function reparentElement(
  id: string,
  newParentId: string | null,
): Promise<void> {
  if (!_scene) return
  // 자기 자신 또는 후손을 부모로 지정 못하게
  if (newParentId === id) return
  if (newParentId) {
    let cursor: string | null = newParentId
    while (cursor) {
      if (cursor === id) return
      const parent: ElementRow | undefined = _scene.elements.find(
        (e) => e.id === cursor,
      )
      cursor = parent?.parent_id ?? null
    }
  }
  await reorderSibling([id], newParentId, null)
}

export async function setLayoutMode(
  id: string,
  nextMode: 'none' | 'row' | 'column',
): Promise<void> {
  if (!_scene) return
  const frame = _scene.elements.find((e) => e.id === id)
  if (!frame || frame.type !== 'frame') return
  const prevMode = frame.layout_mode ?? 'none'
  if (prevMode === nextMode) return

  if ((prevMode === 'row' || prevMode === 'column') && nextMode === 'none') {
    await freezeChildrenFromAutoLayout(id)
    await upsertElement({ id, layout_mode: null })
    return
  }

  await upsertElement({ id, layout_mode: nextMode === 'none' ? null : nextMode })
  if (prevMode === 'none' && (nextMode === 'row' || nextMode === 'column')) {
    await normalizeChildrenForAutoLayout(id)
  }
}

/** z-index 변경: 형제 중 가장 위로 */
export async function bringToFront(id: string): Promise<void> {
  if (!_scene) return
  const el = _scene.elements.find((e) => e.id === id)
  if (!el) return
  const z = nextZIndex(el.parent_id)
  await upsertElement({ id, z_index: z })
}

/** z-index 변경: 형제 중 가장 아래로 */
export async function sendToBack(id: string): Promise<void> {
  if (!_scene) return
  const el = _scene.elements.find((e) => e.id === id)
  if (!el) return
  const siblings = _scene.elements.filter((e) => e.parent_id === el.parent_id)
  const minZ = Math.min(...siblings.map((s) => s.z_index))
  await upsertElement({ id, z_index: minZ - 1 })
}

/** z-index 한 단계 위로 */
export async function moveForward(id: string): Promise<void> {
  if (!_scene) return
  const el = _scene.elements.find((e) => e.id === id)
  if (!el) return
  const siblings = _scene.elements
    .filter((e) => e.parent_id === el.parent_id)
    .sort((a, b) => a.z_index - b.z_index)
  const idx = siblings.findIndex((s) => s.id === id)
  if (idx < 0 || idx >= siblings.length - 1) return
  const above = siblings[idx + 1]
  await upsertElement({ id, z_index: above.z_index + 1 })
}

// ────────────────────────────────────────────────────────────────────────────
// Keyframe higher-level helpers
// ────────────────────────────────────────────────────────────────────────────

import { computeValuesAt } from './interpolate'
import { ANIMATABLE_KEYS } from './types'

/**
 * 현재 step에 element의 effective 값을 그대로 키프레임으로 굳힌다.
 * (effective = 보간 결과 — 즉 화면에 보이고 있는 그 값)
 */
export async function snapshotKeyframe(elementId: string, step: number): Promise<void> {
  if (!_scene) return
  const kfs = _scene.keyframes.filter((k) => k.element_id === elementId)
  const v = computeValuesAt(kfs, step)
  const row: KeyframeRow = {
    element_id: elementId,
    step,
    x: typeof v.x === 'number' ? v.x : null,
    y: typeof v.y === 'number' ? v.y : null,
    width: typeof v.width === 'number' ? v.width : null,
    height: typeof v.height === 'number' ? v.height : null,
    opacity: typeof v.opacity === 'number' ? v.opacity : null,
    rotate: typeof v.rotate === 'number' ? v.rotate : null,
    scale: typeof v.scale === 'number' ? v.scale : null,
    skew_x: typeof v.skew_x === 'number' ? v.skew_x : null,
    skew_y: typeof v.skew_y === 'number' ? v.skew_y : null,
    bg_color: typeof v.bg_color === 'string' ? v.bg_color : null,
    fg_color: typeof v.fg_color === 'string' ? v.fg_color : null,
    border_radius: typeof v.border_radius === 'number' ? v.border_radius : null,
    font_size: typeof v.font_size === 'number' ? v.font_size : null,
    blur: typeof v.blur === 'number' ? v.blur : null,
    shadow: typeof v.shadow === 'string' ? v.shadow : null,
    border_width: typeof v.border_width === 'number' ? v.border_width : null,
    border_color: typeof v.border_color === 'string' ? v.border_color : null,
    text_content: null,
    duration: null,
    ease: null,
  }
  await upsertKeyframe(row)
}

/** K 단축키: 현재 step에 키가 있으면 제거, 없으면 snapshot. */
export async function toggleKeyframeAtStep(elementId: string, step: number): Promise<void> {
  if (!_scene) return
  const existing = _scene.keyframes.find(
    (k) => k.element_id === elementId && k.step === step,
  )
  if (existing) {
    await deleteKeyframe(elementId, step)
  } else {
    await snapshotKeyframe(elementId, step)
  }
}

// 키프레임 클립보드 (in-memory)
let _kfClipboard: KeyframeRow | null = null

export function copyKeyframe(elementId: string, step: number): boolean {
  if (!_scene) return false
  const row = _scene.keyframes.find(
    (k) => k.element_id === elementId && k.step === step,
  )
  if (!row) return false
  _kfClipboard = { ...row }
  return true
}

export async function pasteKeyframe(elementId: string, step: number): Promise<boolean> {
  if (!_kfClipboard) return false
  const row: Partial<KeyframeRow> = { ..._kfClipboard, element_id: elementId, step }
  await upsertKeyframe(row as KeyframeRow)
  return true
}

/** 어떤 step에 어떤 element의 키프레임이 있는지 반환. */
export function listKeyframeStepsFor(elementId: string): number[] {
  if (!_scene) return []
  return _scene.keyframes
    .filter((k) => k.element_id === elementId)
    .map((k) => k.step)
    .sort((a, b) => a - b)
}

/** 모든 animatable key 중에 키가 잡힌 키들 (인스펙터에 점 찍기용) */
export function getAnimatedKeysFor(elementId: string): Set<string> {
  if (!_scene) return new Set()
  const set = new Set<string>()
  for (const kf of _scene.keyframes) {
    if (kf.element_id !== elementId) continue
    for (const key of ANIMATABLE_KEYS) {
      if (kf[key] !== null && kf[key] !== undefined) set.add(key)
    }
  }
  return set
}

/** z-index 한 단계 아래로 */
export async function moveBackward(id: string): Promise<void> {
  if (!_scene) return
  const el = _scene.elements.find((e) => e.id === id)
  if (!el) return
  const siblings = _scene.elements
    .filter((e) => e.parent_id === el.parent_id)
    .sort((a, b) => a.z_index - b.z_index)
  const idx = siblings.findIndex((s) => s.id === id)
  if (idx <= 0) return
  const below = siblings[idx - 1]
  await upsertElement({ id, z_index: below.z_index - 1 })
}

// ────────────────────────────────────────────────────────────────────────────
// Editor mode + selection (전역 상태)
// ────────────────────────────────────────────────────────────────────────────

let _editMode = false
const _editListeners = new Set<() => void>()

export function isEditMode() {
  return _editMode
}

export function setEditMode(v: boolean) {
  if (_editMode === v) return
  _editMode = v
  for (const l of _editListeners) l()
}

export function toggleEditMode() {
  setEditMode(!_editMode)
}

export function useEditMode(): [boolean, (v: boolean) => void] {
  const [v, setV] = useState(_editMode)
  useEffect(() => {
    const listener = () => setV(_editMode)
    _editListeners.add(listener)
    return () => {
      _editListeners.delete(listener)
    }
  }, [])
  return [v, setEditMode]
}

// 선택 상태
let _selection = new Set<string>()
const _selectionListeners = new Set<() => void>()

export function getSelection(): Set<string> {
  return _selection
}

export function setSelection(ids: Iterable<string>) {
  _selection = new Set(ids)
  for (const l of _selectionListeners) l()
}

export function toggleSelection(id: string) {
  const next = new Set(_selection)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  setSelection(next)
}

export function clearSelection() {
  setSelection([])
}

export function useSelection(): Set<string> {
  const [sel, setSel] = useState(_selection)
  useEffect(() => {
    const listener = () => setSel(_selection)
    _selectionListeners.add(listener)
    return () => {
      _selectionListeners.delete(listener)
    }
  }, [])
  return sel
}

// ────────────────────────────────────────────────────────────────────────────
// Convenience: scene meta accessors
// ────────────────────────────────────────────────────────────────────────────

export function useTotalSteps(): number {
  const scene = useScene()
  return scene ? Math.max(1, Number(scene.meta.total_steps ?? '1')) : 1
}

export function useDuration(): number {
  const scene = useScene()
  return scene ? Number(scene.meta.duration ?? '0.6') : 0.6
}

/**
 * 글로벌 ease meta의 raw 문자열을 그대로 반환.
 * named preset ('out-quart' 등), JSON cubic bezier, JSON spring 모두 통과.
 * 호출자는 parseEase()로 EaseValue로 변환해 사용.
 */
export function useEase(): string {
  const scene = useScene()
  return scene?.meta.ease ?? '[0.22,1,0.36,1]'
}

// ────────────────────────────────────────────────────────────────────────────
// 전역 step state (편집/뷰 모드 전환 시 유지)
// ────────────────────────────────────────────────────────────────────────────

let _step = 0
const _stepListeners = new Set<() => void>()

export function getStep(): number {
  return _step
}

export function setStepGlobal(n: number) {
  if (_step === n) return
  _step = n
  for (const l of _stepListeners) l()
}

/** 현재 step state. UI 컴포넌트에서 사용. */
export function useStep(): [number, (n: number) => void] {
  const total = useTotalSteps()
  const [step, setStep] = useState(_step)
  useEffect(() => {
    const listener = () => setStep(_step)
    _stepListeners.add(listener)
    listener()
    return () => {
      _stepListeners.delete(listener)
    }
  }, [])
  const safeSet = useCallback(
    (n: number) => setStepGlobal(Math.max(0, Math.min(total - 1, n))),
    [total],
  )
  // total이 줄어들면 step도 클램프
  useEffect(() => {
    if (_step >= total) setStepGlobal(Math.max(0, total - 1))
  }, [total])
  return [step, safeSet]
}
