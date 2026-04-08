/**
 * Flat element list → 트리 구조로 빌드.
 */

import type { ElementRow } from './types'

export interface TreeNode {
  el: ElementRow
  children: TreeNode[]
}

export function buildTree(elements: ElementRow[]): TreeNode[] {
  const byId = new Map<string, TreeNode>()
  for (const el of elements) {
    byId.set(el.id, { el, children: [] })
  }

  const roots: TreeNode[] = []
  for (const node of byId.values()) {
    const parentId = node.el.parent_id
    if (parentId && byId.has(parentId)) {
      byId.get(parentId)!.children.push(node)
    } else {
      roots.push(node)
    }
  }

  // 형제 정렬 (z_index 오름차순)
  const sortChildren = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => a.el.z_index - b.el.z_index)
    for (const n of nodes) sortChildren(n.children)
  }
  sortChildren(roots)

  return roots
}

/** 트리에서 id로 노드 찾기 */
export function findNode(roots: TreeNode[], id: string): TreeNode | null {
  for (const node of roots) {
    if (node.el.id === id) return node
    const found = findNode(node.children, id)
    if (found) return found
  }
  return null
}

/** 평탄화 (top-down 순회 순서로 - 그리는 순서 = z-index 순서) */
export function flatten(roots: TreeNode[]): ElementRow[] {
  const out: ElementRow[] = []
  const walk = (nodes: TreeNode[]) => {
    for (const n of nodes) {
      out.push(n.el)
      walk(n.children)
    }
  }
  walk(roots)
  return out
}
