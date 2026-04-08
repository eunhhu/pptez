import { useScene, useSelection, setSelection } from '../scene/store'
import { buildTree, type TreeNode } from '../scene/tree'
import { AssetsPanel } from './AssetsPanel'

export function LeftPanel() {
  const scene = useScene()
  const selection = useSelection()

  if (!scene) return <aside className="w-64 shrink-0 border-r border-white/10 bg-zinc-900" />

  const tree = buildTree(scene.elements)

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-white/10 bg-zinc-900">
      {/* Layers */}
      <div className="flex min-h-0 flex-1 flex-col">
        <header className="flex items-center justify-between px-3 py-2 text-[11px] uppercase tracking-wider text-zinc-500">
          Layers
        </header>
        <div className="min-h-0 flex-1 overflow-auto px-1 pb-2 text-sm">
          {tree.length === 0 ? (
            <div className="px-3 py-4 text-xs text-zinc-600">No elements yet.</div>
          ) : (
            <Tree nodes={tree} depth={0} selection={selection} />
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

function Tree({
  nodes,
  depth,
  selection,
}: {
  nodes: TreeNode[]
  depth: number
  selection: Set<string>
}) {
  return (
    <ul>
      {nodes.map((n) => {
        const isSelected = selection.has(n.el.id)
        return (
          <li key={n.el.id}>
            <button
              onClick={(e) => {
                if (e.shiftKey) {
                  const next = new Set(selection)
                  if (next.has(n.el.id)) next.delete(n.el.id)
                  else next.add(n.el.id)
                  setSelection(next)
                } else {
                  setSelection([n.el.id])
                }
              }}
              className={`flex w-full items-center gap-1 rounded px-2 py-1 text-left text-xs ${
                isSelected
                  ? 'bg-sky-500/20 text-sky-200'
                  : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-100'
              }`}
              style={{ paddingLeft: 8 + depth * 12 }}
            >
              <TypeIcon type={n.el.type} />
              <span className="truncate">
                {n.el.name ?? `${n.el.type} ${n.el.id.slice(0, 4)}`}
              </span>
            </button>
            {n.children.length > 0 ? (
              <Tree nodes={n.children} depth={depth + 1} selection={selection} />
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}

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
