/**
 * 데이터 기반 렌더러.
 *
 * - useScene으로 받은 데이터를 트리로 빌드
 * - 각 노드를 motion.div로 그림
 * - 키프레임 보간 → animate prop
 * - child_stagger → 자식 transition delay
 * - text 노드 + text_split → 글자/단어/줄로 분해
 *
 * 캔버스 좌표계: 1920×1080 가상 좌표 (CSS px로 그대로 사용).
 * 상위 slide-frame이 16:9 비율을 강제하고, 이 안에서 1920×1080을 transform: scale로 맞춤.
 */

import { motion, type Easing, type TargetAndTransition } from 'framer-motion'
import type { CSSProperties } from 'react'
import { useScene, useDuration, useEase } from './store'
import { buildTree, type TreeNode } from './tree'
import { computeValuesAt, type AnimatedValues } from './interpolate'
import type { ElementRow, KeyframeRow, TextSplit } from './types'

export const CANVAS_WIDTH = 1920
export const CANVAS_HEIGHT = 1080

interface StageProps {
  step: number
  /** 편집 모드일 때 선택된 요소 id (외곽선 표시) */
  selectedIds?: Set<string>
  /** 노드 클릭 콜백 (편집 모드) */
  onNodeClick?: (id: string, e: React.MouseEvent) => void
}

function asEasing(arr: number[]): Easing {
  // cubic-bezier 4-tuple
  return [arr[0] ?? 0.22, arr[1] ?? 1, arr[2] ?? 0.36, arr[3] ?? 1] as unknown as Easing
}

export function Stage({ step, selectedIds, onNodeClick }: StageProps) {
  const scene = useScene()
  const duration = useDuration()
  const easeArr = useEase()
  const ease = asEasing(easeArr)

  if (!scene) {
    return <div className="absolute inset-0 grid place-items-center text-zinc-600">Loading…</div>
  }

  const tree = buildTree(scene.elements)

  // element_id → keyframes 빠른 lookup
  const keyframesByElement = new Map<string, KeyframeRow[]>()
  for (const kf of scene.keyframes) {
    const arr = keyframesByElement.get(kf.element_id) ?? []
    arr.push(kf)
    keyframesByElement.set(kf.element_id, arr)
  }

  return (
    <div
      className="absolute inset-0"
      style={{
        // 1920×1080 가상 캔버스를 16:9 프레임에 fit
        // slide-frame이 부모 — 가로/세로 비율은 이미 잡혀있음
        // 그 안에서 1920×1080을 width/height에 그대로 두고 scale로 맞춤
      }}
    >
      <div
        className="relative"
        style={{
          width: CANVAS_WIDTH,
          height: CANVAS_HEIGHT,
          transformOrigin: 'top left',
          transform: 'scale(var(--canvas-scale, 1))',
        }}
      >
        {tree.map((node) => (
          <NodeView
            key={node.el.id}
            node={node}
            step={step}
            duration={duration}
            ease={ease}
            keyframesByElement={keyframesByElement}
            selectedIds={selectedIds}
            onNodeClick={onNodeClick}
            stagDelay={0}
          />
        ))}
      </div>
    </div>
  )
}

interface NodeViewProps {
  node: TreeNode
  step: number
  duration: number
  ease: Easing
  keyframesByElement: Map<string, KeyframeRow[]>
  selectedIds?: Set<string>
  onNodeClick?: (id: string, e: React.MouseEvent) => void
  /** 부모로부터 받은 누적 stagger delay */
  stagDelay: number
}

function NodeView({
  node,
  step,
  duration,
  ease,
  keyframesByElement,
  selectedIds,
  onNodeClick,
  stagDelay,
}: NodeViewProps) {
  const { el, children } = node
  const kfs = keyframesByElement.get(el.id) ?? []
  const values = computeValuesAt(kfs, step)

  const isSelected = selectedIds?.has(el.id) ?? false
  const hasKeyframes = kfs.length > 0
  const interactive = !!onNodeClick

  // child_stagger 계산: 부모가 stagger를 가지면 자식들에게 분배
  const myStagger = el.child_stagger ?? 0
  const order = el.child_stagger_order ?? 'forward'
  const childCount = children.length

  const getChildDelay = (i: number): number => {
    if (myStagger <= 0 || childCount <= 1) return 0
    let idx: number
    switch (order) {
      case 'reverse':
        idx = childCount - 1 - i
        break
      case 'center': {
        const mid = (childCount - 1) / 2
        idx = Math.abs(i - mid)
        break
      }
      case 'random':
        idx = pseudoRandomIdx(el.id, i, childCount)
        break
      default:
        idx = i
    }
    return idx * myStagger
  }

  const style: CSSProperties = {
    position: 'absolute',
    pointerEvents: interactive ? 'auto' : 'none',
    cursor: interactive ? 'pointer' : 'default',
  }

  // 정적 속성 (애니메이션 안 됨) — 키프레임이 잡혀있지 않은 경우의 기본값
  const initial = computeStaticInitial(el)

  // 키프레임 값과 정적 기본값을 머지
  const effective = { ...initial, ...values }

  // outline (선택 표시) — 별도 div로
  const outlineDiv = isSelected ? (
    <div
      className="pointer-events-none absolute inset-0 ring-2 ring-sky-400 ring-offset-0"
      style={{ zIndex: 10000 }}
    />
  ) : null

  // motion.div의 animate prop을 위한 객체
  const animateObj = buildAnimateObj(effective) as TargetAndTransition

  // 텍스트 처리: text 노드이고 split이 설정되어 있으면 분해
  const textChildren = el.type === 'text' ? renderTextSplit(el, hasKeyframes, stagDelay) : null

  return (
    <motion.div
      key={el.id}
      data-stage-id={el.id}
      style={style}
      initial={false}
      animate={animateObj}
      transition={{
        duration,
        ease,
        delay: stagDelay,
      }}
      onClick={
        interactive
          ? (e) => {
              e.stopPropagation()
              onNodeClick!(el.id, e)
            }
          : undefined
      }
    >
      {textChildren}
      {el.type === 'image' && el.image_src ? (
        <img
          src={el.image_src}
          alt=""
          draggable={false}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            pointerEvents: 'none',
          }}
        />
      ) : null}
      {children.map((child, i) => (
        <NodeView
          key={child.el.id}
          node={child}
          step={step}
          duration={duration}
          ease={ease}
          keyframesByElement={keyframesByElement}
          selectedIds={selectedIds}
          onNodeClick={onNodeClick}
          stagDelay={stagDelay + getChildDelay(i)}
        />
      ))}
      {outlineDiv}
    </motion.div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

interface StaticInitial extends AnimatedValues {
  // text/font 정적 속성도 여기에 머지될 수 있음 (애니메이션 안 됨)
  fontWeight?: number
  textAlign?: string
}

function computeStaticInitial(el: ElementRow): StaticInitial {
  return {
    x: 0,
    y: 0,
    width: 200,
    height: 80,
    opacity: 1,
    rotate: 0,
    scale: 1,
    bg_color: el.type === 'frame' ? 'transparent' : undefined,
    fg_color: el.type === 'text' ? '#ffffff' : undefined,
    border_radius: 0,
    font_size: el.type === 'text' ? 48 : undefined,
    fontWeight: el.font_weight ?? 500,
    textAlign: el.text_align ?? 'left',
  }
}

/**
 * effective 값 → motion.div의 animate prop 객체로 변환.
 * left/top/width/height 등은 px 단위로.
 */
function buildAnimateObj(values: StaticInitial): Record<string, unknown> {
  const obj: Record<string, unknown> = {}
  if (values.x !== undefined) obj.left = values.x
  if (values.y !== undefined) obj.top = values.y
  if (values.width !== undefined) obj.width = values.width
  if (values.height !== undefined) obj.height = values.height
  if (values.opacity !== undefined) obj.opacity = values.opacity
  if (values.rotate !== undefined) obj.rotate = values.rotate
  if (values.scale !== undefined) obj.scale = values.scale
  if (values.bg_color !== undefined) obj.backgroundColor = values.bg_color
  if (values.fg_color !== undefined) obj.color = values.fg_color
  if (values.border_radius !== undefined) obj.borderRadius = values.border_radius
  if (values.font_size !== undefined) obj.fontSize = values.font_size
  return obj
}

/**
 * text 노드의 콘텐츠를 split 모드에 따라 motion span으로 분해.
 * 부모(text 노드 자체)가 받는 키프레임을 자식에게 stagger로 분배하지 않고,
 * 자식들은 등장만 동기화 — 글자별 stagger는 부모의 child_stagger를 사용.
 *
 * 단, text 노드는 자식 노드를 가질 일이 거의 없고 (실제 자식 element_row가 아닌 가상 split이라)
 * 가상 split 자식들에게 child_stagger를 그대로 적용한다.
 */
function renderTextSplit(el: ElementRow, _hasKeys: boolean, _parentDelay: number) {
  const text = el.text_content ?? ''
  const split: TextSplit = el.text_split ?? 'none'

  if (split === 'none' || !text) {
    return (
      <span
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          whiteSpace: 'pre-wrap',
          fontWeight: el.font_weight ?? 500,
          textAlign: (el.text_align as CSSProperties['textAlign']) ?? 'left',
        }}
      >
        {text}
      </span>
    )
  }

  // 분해
  let pieces: string[]
  if (split === 'char') {
    pieces = Array.from(text)
  } else if (split === 'word') {
    pieces = text.split(/(\s+)/) // 공백 보존
  } else {
    pieces = text.split('\n')
  }

  const stagger = el.child_stagger ?? 0.04

  return (
    <span
      style={{
        display: 'block',
        width: '100%',
        height: '100%',
        whiteSpace: 'pre-wrap',
        fontWeight: el.font_weight ?? 500,
        textAlign: (el.text_align as CSSProperties['textAlign']) ?? 'left',
      }}
    >
      {pieces.map((p, i) => (
        <motion.span
          key={i}
          style={{
            display: split === 'line' ? 'block' : 'inline-block',
            whiteSpace: 'pre',
          }}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: i * stagger,
            duration: 0.5,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          {p}
        </motion.span>
      ))}
    </span>
  )
}

// 결정적 의사 난수 — 같은 노드/index면 항상 같은 값
function pseudoRandomIdx(seed: string, i: number, mod: number): number {
  let h = 2166136261
  for (let k = 0; k < seed.length; k++) {
    h ^= seed.charCodeAt(k)
    h = Math.imul(h, 16777619)
  }
  h ^= i
  h = Math.imul(h, 16777619)
  return Math.abs(h) % mod
}
