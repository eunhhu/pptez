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
      text_content: input.text_content ?? null,
      text_split: input.text_split ?? null,
      font_weight: input.font_weight ?? null,
      text_align: input.text_align ?? null,
      image_src: input.image_src ?? null,
      child_stagger: input.child_stagger ?? null,
      child_stagger_order: input.child_stagger_order ?? null,
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
      bg_color: input.bg_color ?? null,
      fg_color: input.fg_color ?? null,
      border_radius: input.border_radius ?? null,
      font_size: input.font_size ?? null,
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
  return crypto.randomUUID().replace(/-/g, '').slice(0, 12)
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
    text_content: opts.type === 'text' ? (opts.text_content ?? 'Text') : null,
    text_split: opts.type === 'text' ? 'none' : null,
    font_weight: opts.type === 'text' ? 500 : null,
    text_align: opts.type === 'text' ? 'left' : null,
    image_src: opts.type === 'image' ? (opts.image_src ?? null) : null,
    child_stagger: null,
    child_stagger_order: null,
  })

  // step 0에 기본 위치/크기 키프레임 하나
  await upsertKeyframe({
    element_id: id,
    step: 0,
    x: opts.x ?? 100,
    y: opts.y ?? 100,
    width: opts.width ?? (opts.type === 'text' ? 400 : 200),
    height: opts.height ?? (opts.type === 'text' ? 80 : 200),
    opacity: 1,
    bg_color: opts.bg_color ?? (opts.type === 'frame' ? '#1f2937' : null),
    fg_color: opts.fg_color ?? (opts.type === 'text' ? '#f4f4f5' : null),
    font_size: opts.font_size ?? (opts.type === 'text' ? 48 : null),
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

  const groupId = await createElement({
    type: 'frame',
    parent_id: parentId,
    name: 'Group',
  })

  // 자식들의 parent_id 변경
  for (const t of targets) {
    await upsertElement({ id: t.id, parent_id: groupId })
  }

  return groupId
}

/** 그룹 해제 — frame 안의 자식들을 frame의 부모로 끌어올리고 frame 제거. */
export async function ungroupElement(id: string): Promise<void> {
  if (!_scene) return
  const frame = _scene.elements.find((e) => e.id === id)
  if (!frame || frame.type !== 'frame') return
  const children = _scene.elements.filter((e) => e.parent_id === id)
  for (const c of children) {
    await upsertElement({ id: c.id, parent_id: frame.parent_id })
  }
  await deleteElement(id)
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
  await upsertElement({
    id,
    parent_id: newParentId,
    z_index: nextZIndex(newParentId),
  })
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
    bg_color: typeof v.bg_color === 'string' ? v.bg_color : null,
    fg_color: typeof v.fg_color === 'string' ? v.fg_color : null,
    border_radius: typeof v.border_radius === 'number' ? v.border_radius : null,
    font_size: typeof v.font_size === 'number' ? v.font_size : null,
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

export function useEase(): number[] {
  const scene = useScene()
  if (!scene) return [0.22, 1, 0.36, 1]
  try {
    return JSON.parse(scene.meta.ease ?? '[0.22,1,0.36,1]')
  } catch {
    return [0.22, 1, 0.36, 1]
  }
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
