/**
 * Layers 패널 — figma 스타일 트리 + drag & drop 으로 reparent/reorder.
 *
 *  - 트리는 z_index 내림차순으로 표시 (위가 더 큼, figma와 동일)
 *  - 행 클릭 = select, shift = multi
 *  - frame 행 → chevron으로 펼침/접힘
 *  - drag: 노드 행을 잡으면 dragstart로 id를 dataTransfer에 박음
 *      multi-select 상태로 드래그하면 선택된 모두를 옮김
 *  - drop target:
 *      - frame 행 hover → "그 frame 자식 끝(=가장 위)에 append" — 행 전체 highlight
 *      - 행의 위/아래 4px → "그 위치에 형제로 끼움" — 가는 sky 라인
 *      - 빈 영역 → 루트로
 *  - Group / Ungroup 헤더 버튼
 */

import { useMemo, useState, type DragEvent } from 'react'
import {
  useScene,
  useSelection,
  setSelection,
  reorderSibling,
  groupElements,
  ungroupElement,
  upsertElement,
  toggleSelection,
  getScene,
} from '../scene/store'
import { buildTree, type TreeNode } from '../scene/tree'
import type { ElementRow } from '../scene/types'
import { AssetsPanel } from './AssetsPanel'

// dnd state — 컴포넌트 트리 바깥에서 단일 인스턴스로 들고 있는 게 가장 단순.
// (drag image, dataTransfer text 둘 다 직렬화 부담 있어서 모듈 변수 사용)
type DragSource = { ids: string[] } | null
let _dragSource: DragSource = null

// ────────────────────────────────────────────────────────────────────────────

export function LeftPanel() {
  const scene = useScene()
  const selection = useSelection()

  // 펼침 상태 (frame id → 펼쳐졌나). 기본 펼쳐짐.
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set())
  const toggleCollapse = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // figma처럼 트리는 z 큰 게 위. buildTree는 오름차순이라 reverse.
  const tree = useMemo(() => {
    if (!scene) return []
    const t = buildTree(scene.elements)
    const reverseAll = (nodes: TreeNode[]) => {
      nodes.reverse()
      for (const n of nodes) reverseAll(n.children)
    }
    reverseAll(t)
    return t
  }, [scene?.elements])

  if (!scene) {
    return <aside className="w-64 shrink-0 border-r border-white/10 bg-zinc-900" />
  }

  const selArr = Array.from(selection)
  const canGroup = selArr.length >= 1
  const canUngroup =
    selArr.length === 1 &&
    scene.elements.find((e) => e.id === selArr[0])?.type === 'frame'

  const handleGroup = async () => {
    if (selArr.length === 0) return
    const groupId = await groupElements(selArr)
    if (groupId) setSelection([groupId])
  }
  const handleUngroup = async () => {
    if (selArr.length !== 1) return
    await ungroupElement(selArr[0])
  }

  // 빈 영역 drop → 루트로
  const handleRootDrop = async (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const src = _dragSource
    _dragSource = null
    if (!src) return
    await reorderSibling(src.ids, null, null)
  }

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-white/10 bg-zinc-900">
      {/* Layers */}
      <div className="flex min-h-0 flex-1 flex-col">
        <header className="flex items-center justify-between px-3 py-2 text-[11px] uppercase tracking-wider text-zinc-500">
          <span>Layers</span>
          <span className="flex items-center gap-1">
            <button
              onClick={handleGroup}
              disabled={!canGroup}
              title="Group selection (⌘G)"
              className="rounded px-1.5 py-0.5 text-[10px] text-zinc-400 hover:bg-white/5 hover:text-zinc-100 disabled:opacity-30 disabled:hover:bg-transparent"
            >
              group
            </button>
            <button
              onClick={handleUngroup}
              disabled={!canUngroup}
              title="Ungroup frame (⇧⌘G)"
              className="rounded px-1.5 py-0.5 text-[10px] text-zinc-400 hover:bg-white/5 hover:text-zinc-100 disabled:opacity-30 disabled:hover:bg-transparent"
            >
              ungroup
            </button>
          </span>
        </header>
        <div
          className="min-h-0 flex-1 overflow-auto px-1 pb-2 text-sm"
          onDragOver={(e) => {
            // 빈 영역 hover — 루트로 drop 가능
            if (_dragSource) {
              e.preventDefault()
              e.dataTransfer.dropEffect = 'move'
            }
          }}
          onDrop={handleRootDrop}
        >
          {tree.length === 0 ? (
            <div className="px-3 py-4 text-xs text-zinc-600">No elements yet.</div>
          ) : (
            <Tree
              nodes={tree}
              depth={0}
              selection={selection}
              collapsed={collapsed}
              onToggleCollapse={toggleCollapse}
            />
          )}
        </div>
      </div>

      {/* Assets */}
      <div className="border-t border-white/10">
        <AssetsPanel />
      </div>
    </aside>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Tree
// ────────────────────────────────────────────────────────────────────────────

function Tree({
  nodes,
  depth,
  selection,
  collapsed,
  onToggleCollapse,
}: {
  nodes: TreeNode[]
  depth: number
  selection: Set<string>
  collapsed: Set<string>
  onToggleCollapse: (id: string) => void
}) {
  return (
    <ul>
      {nodes.map((n) => (
        <Row
          key={n.el.id}
          node={n}
          depth={depth}
          selection={selection}
          collapsed={collapsed}
          onToggleCollapse={onToggleCollapse}
        />
      ))}
    </ul>
  )
}

type DropZone = 'before' | 'inside' | 'after' | null

function Row({
  node,
  depth,
  selection,
  collapsed,
  onToggleCollapse,
}: {
  node: TreeNode
  depth: number
  selection: Set<string>
  collapsed: Set<string>
  onToggleCollapse: (id: string) => void
}) {
  const { el, children } = node
  const isSelected = selection.has(el.id)
  const isFrame = el.type === 'frame'
  const isOpen = !collapsed.has(el.id)
  const hasChildren = children.length > 0

  const [drop, setDrop] = useState<DropZone>(null)

  const onDragStart = (e: DragEvent) => {
    // multi-select에 끼어있으면 선택 전체를 옮김. 아니면 자기 혼자.
    const ids = isSelected && selection.size > 1 ? Array.from(selection) : [el.id]
    _dragSource = { ids }
    e.dataTransfer.effectAllowed = 'move'
    // 일부 브라우저는 dataTransfer가 비면 dragstart 이벤트를 무시함
    e.dataTransfer.setData('text/plain', el.id)
  }

  const onDragEnd = () => {
    _dragSource = null
    setDrop(null)
  }

  const onDragOver = (e: DragEvent) => {
    if (!_dragSource) return
    // 자기 자신이나 선택된 자기 그룹 안으로 드롭 금지
    if (_dragSource.ids.includes(el.id)) return
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const y = e.clientY - rect.top
    const h = rect.height
    let zone: DropZone
    if (isFrame) {
      // frame: 위 25% / 가운데 / 아래 25%
      if (y < h * 0.25) zone = 'before'
      else if (y > h * 0.75) zone = 'after'
      else zone = 'inside'
    } else {
      // 일반: 위 50% / 아래 50%
      zone = y < h / 2 ? 'before' : 'after'
    }
    setDrop(zone)
  }

  const onDragLeave = () => setDrop(null)

  const onDrop = async (e: DragEvent) => {
    if (!_dragSource) return
    e.preventDefault()
    e.stopPropagation()
    const src = _dragSource
    _dragSource = null
    const zone = drop
    setDrop(null)
    if (!zone) return

    if (zone === 'inside' && isFrame) {
      // frame 자식의 가장 앞(=가장 위, z 큰 쪽)에 append.
      // reorderSibling에서 beforeId=null이면 끝(z 가장 큰 쪽)에 들어감.
      await reorderSibling(src.ids, el.id, null)
    } else if (zone === 'before') {
      // figma 트리(z 내림차순) 시점의 "before(위)" = z가 더 큰 쪽 = 형제 끝쪽
      // 즉 자기보다 z가 한 단계 위에 끼움. reorderSibling은 z 오름차순 기준이므로
      // 자기 다음 형제 (z+1) 위치에 끼우면 됨 = 자기 바로 앞 sibling을 beforeId로.
      // 단순화: 자기 위에 띄우려면 자기 부모의 자식 z 정렬 후 자기 + 1번째 sibling
      // 이걸 계산하기 귀찮으니 store에서 해석. 여기선 "after of (자기 위 형제)" 대신
      // 직접 z+1로 splice하기 위해 별도 신호:
      //   beforeId = 자기 위(z 큰 쪽) 형제의 id, 없으면 null(맨 위)
      const above = findSiblingAbove(el)
      await reorderSibling(src.ids, el.parent_id, above?.id ?? null)
    } else if (zone === 'after') {
      // 자기 바로 아래 = z 작은 쪽. reorderSibling beforeId=el.id 로 자기 위 splice
      // = z 오름차순 기준 자기 직전. 결과적으로 figma 시점 "자기 아래"에 들어감.
      await reorderSibling(src.ids, el.parent_id, el.id)
    }
  }

  const labelBg = isSelected
    ? 'bg-sky-500/20 text-sky-200'
    : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-100'

  const insideHighlight =
    drop === 'inside' ? 'outline outline-1 outline-sky-400/60 bg-sky-500/10' : ''

  return (
    <li className="relative">
      {/* 위 인디케이터 */}
      {drop === 'before' ? (
        <div
          className="pointer-events-none absolute left-0 right-0 top-0 h-px bg-sky-400"
          style={{ marginLeft: 8 + depth * 12 }}
        />
      ) : null}
      <div
        draggable
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={(e) => {
          if (e.shiftKey || e.metaKey || e.ctrlKey) {
            toggleSelection(el.id)
          } else {
            setSelection([el.id])
          }
        }}
        onDoubleClick={(e) => {
          // 더블클릭 = inline rename. 단순화: prompt
          e.stopPropagation()
          const next = window.prompt('rename', el.name ?? el.type)
          if (next !== null) upsertElement({ id: el.id, name: next || null })
        }}
        className={`flex w-full cursor-default items-center gap-1 rounded px-2 py-1 text-left text-xs ${labelBg} ${insideHighlight}`}
        style={{ paddingLeft: 8 + depth * 12 }}
      >
        {/* chevron */}
        {isFrame && hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onToggleCollapse(el.id)
            }}
            className="-mr-0.5 w-3 text-[9px] text-zinc-500 hover:text-zinc-200"
          >
            {isOpen ? '▾' : '▸'}
          </button>
        ) : (
          <span className="w-3" />
        )}
        <TypeIcon type={el.type} />
        <span className="flex-1 truncate">
          {el.name ?? `${el.type} ${el.id.slice(0, 4)}`}
        </span>
        {isFrame && (el.layout_mode === 'row' || el.layout_mode === 'column') ? (
          <span
            className="rounded bg-white/5 px-1 text-[9px] text-zinc-500"
            title={`auto layout: ${el.layout_mode}`}
          >
            {el.layout_mode === 'row' ? '↦' : '↧'}
          </span>
        ) : null}
        {isFrame && el.child_motion_preset ? (
          <span
            className="rounded bg-white/5 px-1 text-[9px] text-emerald-400/80"
            title={`group motion: ${el.child_motion_preset}`}
          >
            ✦
          </span>
        ) : null}
      </div>
      {/* 아래 인디케이터 */}
      {drop === 'after' ? (
        <div
          className="pointer-events-none absolute left-0 right-0 bottom-0 h-px bg-sky-400"
          style={{ marginLeft: 8 + depth * 12 }}
        />
      ) : null}
      {hasChildren && isOpen ? (
        <Tree
          nodes={children}
          depth={depth + 1}
          selection={selection}
          collapsed={collapsed}
          onToggleCollapse={onToggleCollapse}
        />
      ) : null}
    </li>
  )
}

/**
 * figma 시점에서 자기 "바로 위(z 더 큰)" 형제 element.
 * 같은 parent의 자식들을 z 오름차순으로 정렬했을 때 자기 다음 element.
 */
function findSiblingAbove(el: ElementRow): ElementRow | null {
  const s = getScene()
  if (!s) return null
  const siblings = s.elements
    .filter((e) => e.parent_id === el.parent_id)
    .sort((a, b) => a.z_index - b.z_index)
  const idx = siblings.findIndex((e) => e.id === el.id)
  if (idx < 0) return null
  return siblings[idx + 1] ?? null
}

// ────────────────────────────────────────────────────────────────────────────

function TypeIcon({ type }: { type: string }) {
  const c =
    type === 'frame'
      ? 'text-zinc-500'
      : type === 'text'
        ? 'text-emerald-400'
        : 'text-amber-400'
  const ch = type === 'frame' ? '▢' : type === 'text' ? 'T' : '🖼'
  return <span className={`w-3 text-center ${c}`}>{ch}</span>
}
