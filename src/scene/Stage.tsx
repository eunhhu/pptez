/**
 * 데이터 기반 렌더러.
 *
 * - useScene으로 받은 데이터를 트리로 빌드
 * - 각 노드를 motion.div로 그림
 * - 키프레임 보간 → animate prop
 * - per-keyframe duration/ease 지원 (없으면 글로벌)
 * - child_stagger → 자식 transition delay
 * - child_motion_preset → 자식 등장 모션 (group each motion)
 * - layout_mode → frame을 flex로 (auto layout)
 * - subtype='ellipse' → border-radius 50%
 * - text 노드 + text_split → 글자/단어/줄로 분해
 * - text_content 키프레임 (per-step 텍스트)
 *
 * 캔버스 좌표계: 1920×1080 가상 좌표 (CSS px로 그대로 사용).
 */

import { motion, type TargetAndTransition, type Transition } from 'framer-motion'
import { memo, useMemo, type CSSProperties } from 'react'
import { useScene, useDuration, useEase } from './store'
import { buildTree, type TreeNode } from './tree'
import {
  computeValuesAt,
  computeTextAt,
  findTransitionKeyframe,
  type AnimatedValues,
} from './interpolate'
import type { ElementRow, KeyframeRow, TextSplit } from './types'
import { parseEase, easeToTransitionPart, type EaseValue } from './easing'

export const CANVAS_WIDTH = 1920
export const CANVAS_HEIGHT = 1080

interface StageProps {
  step: number
  selectedIds?: Set<string>
  onNodeClick?: (id: string, e: React.MouseEvent) => void
}

// 캔버스 wrapper의 style을 한 번만 만들어 매 렌더마다 새 객체가 되지 않게 함.
const CANVAS_STYLE: CSSProperties = {
  width: CANVAS_WIDTH,
  height: CANVAS_HEIGHT,
  transformOrigin: 'top left',
  transform: 'scale(var(--canvas-scale, 1))',
}

export function Stage({ step, selectedIds, onNodeClick }: StageProps) {
  const scene = useScene()
  const duration = useDuration()
  const easeRaw = useEase()

  // ease 문자열이 바뀔 때만 파싱 (named preset / JSON cubic / spring 셋 다 stable)
  const globalEase = useMemo(() => parseEase(easeRaw), [easeRaw])

  // 트리는 elements 배열이 갱신될 때만 다시 빌드
  const tree = useMemo(
    () => (scene ? buildTree(scene.elements) : []),
    [scene?.elements],
  )

  // 키프레임 인덱스를 step에 무관하게 한 번만 빌드 + element별로 정렬해 둔다.
  // 이래야 computeValuesAt/findTransitionKeyframe/computeTextAt이 매번 sort하지 않고
  // presorted 모드로 빠르게 동작.
  const keyframesByElement = useMemo(() => {
    const map = new Map<string, KeyframeRow[]>()
    if (!scene) return map
    for (const kf of scene.keyframes) {
      const arr = map.get(kf.element_id)
      if (arr) arr.push(kf)
      else map.set(kf.element_id, [kf])
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => a.step - b.step)
    }
    return map
  }, [scene?.keyframes])

  if (!scene) {
    return <div className="absolute inset-0 grid place-items-center text-zinc-600">Loading…</div>
  }

  return (
    <div className="absolute inset-0">
      <div className="relative" style={CANVAS_STYLE}>
        {tree.map((node) => (
          <NodeView
            key={node.el.id}
            node={node}
            step={step}
            globalDuration={duration}
            globalEase={globalEase}
            keyframesByElement={keyframesByElement}
            selectedIds={selectedIds}
            onNodeClick={onNodeClick}
            stagDelay={0}
            parentMotionPreset={null}
            inAutoLayout={false}
          />
        ))}
      </div>
    </div>
  )
}

interface NodeViewProps {
  node: TreeNode
  step: number
  globalDuration: number
  globalEase: EaseValue
  keyframesByElement: Map<string, KeyframeRow[]>
  selectedIds?: Set<string>
  onNodeClick?: (id: string, e: React.MouseEvent) => void
  /** 부모로부터 받은 누적 stagger delay */
  stagDelay: number
  /** 부모가 설정한 child_motion_preset (group each motion) */
  parentMotionPreset: string | null
  /** 부모가 auto layout인지 — 자식의 x/y는 무시되고 flex가 잡음 */
  inAutoLayout: boolean
}

// 이미지 inner style: 매 렌더마다 새 객체가 되지 않게 모듈 상수.
const IMAGE_STYLE: CSSProperties = {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  pointerEvents: 'none',
  borderRadius: 'inherit',
}
const OUTLINE_STYLE: CSSProperties = { zIndex: 10000 }

const NodeView = memo(function NodeView({
  node,
  step,
  globalDuration,
  globalEase,
  keyframesByElement,
  selectedIds,
  onNodeClick,
  stagDelay,
  parentMotionPreset,
  inAutoLayout,
}: NodeViewProps) {
  const { el, children } = node
  const kfs = keyframesByElement.get(el.id) ?? EMPTY_KFS

  // step/kfs가 같으면 보간/텍스트/transition kf를 다시 계산하지 않는다.
  // (step 변경 시에만 invalidate되도록 deps를 좁게 잡음)
  const values = useMemo(
    () => computeValuesAt(kfs, step, true),
    [kfs, step],
  )
  const textOverride = useMemo(
    () => computeTextAt(kfs, step, true),
    [kfs, step],
  )
  const transitionKf = useMemo(
    () => findTransitionKeyframe(kfs, step, true),
    [kfs, step],
  )

  const isSelected = selectedIds?.has(el.id) ?? false
  const interactive = !!onNodeClick

  // ───── auto layout
  const layoutMode = el.layout_mode
  const isAutoLayout = layoutMode === 'row' || layoutMode === 'column'

  // ───── effective values (initial 기본값 + 보간 결과)
  // initialStatic은 el에 직접 의존, values는 위에서 메모.
  const effective = useMemo(
    () => ({ ...computeStaticInitial(el), ...values }),
    [el, values],
  )

  // 도형: ellipse면 border-radius 50% 강제
  const isEllipse = el.type === 'frame' && el.subtype === 'ellipse'

  // ───── style 합성 (el 정적값과 isAutoLayout/inAutoLayout이 같으면 동일 객체)
  const style = useMemo<CSSProperties>(() => {
    const s: CSSProperties = {
      position: inAutoLayout ? 'relative' : 'absolute',
      pointerEvents: interactive ? 'auto' : 'none',
      cursor: interactive ? 'pointer' : 'default',
      boxSizing: 'border-box',
    }
    if (isAutoLayout) {
      s.display = 'flex'
      s.flexDirection = layoutMode === 'row' ? 'row' : 'column'
      s.gap = el.layout_gap ?? 0
      s.padding = el.layout_padding ?? 0
      s.alignItems = mapAlign(el.layout_align)
      s.justifyContent = mapJustify(el.layout_justify)
    }
    return s
    // el이 안 바뀌면 layout 관련 서브필드도 안 바뀜
  }, [el, inAutoLayout, isAutoLayout, layoutMode, interactive])

  // ───── animate / transition (effective/transitionKf 의존)
  const animateObj = useMemo(
    () => buildAnimateObj(effective, isEllipse) as TargetAndTransition,
    [effective, isEllipse],
  )

  const transition = useMemo<Transition>(() => {
    if (interactive) return INTERACTIVE_TRANSITION
    const kfDuration = transitionKf?.duration ?? null
    const kfEase = transitionKf?.ease ? parseEase(transitionKf.ease) : null
    const effectiveDuration = kfDuration ?? globalDuration
    const effectiveEase = kfEase ?? globalEase
    return {
      ...easeToTransitionPart(effectiveEase, effectiveDuration),
      delay: stagDelay,
    }
  }, [interactive, transitionKf, globalDuration, globalEase, stagDelay])

  // ───── group each motion (parentMotionPreset 적용)
  const groupMotion = useMemo(
    () => (parentMotionPreset ? motionPresetProps(parentMotionPreset) : null),
    [parentMotionPreset],
  )

  // ───── 최종 animate (group motion과 머지)
  const combinedAnimate = useMemo<TargetAndTransition>(
    () =>
      groupMotion
        ? ({ ...groupMotion.animate, ...animateObj } as TargetAndTransition)
        : animateObj,
    [groupMotion, animateObj],
  )

  // ───── 텍스트 (override 우선)
  const textChildren =
    el.type === 'text'
      ? renderTextSplit(el, textOverride ?? el.text_content ?? '')
      : null

  // ───── selection outline
  const outlineDiv = isSelected ? (
    <div
      className="pointer-events-none absolute inset-0 ring-2 ring-sky-400 ring-offset-0"
      style={OUTLINE_STYLE}
    />
  ) : null

  // ───── child stagger (자식 delay 계산)
  const myStagger = el.child_stagger ?? 0
  const order = el.child_stagger_order ?? 'forward'
  const childCount = children.length
  const childPreset = el.child_motion_preset ?? null

  return (
    <motion.div
      data-stage-id={el.id}
      style={style}
      initial={groupMotion ? groupMotion.initial : false}
      animate={combinedAnimate}
      transition={transition}
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
        <img src={el.image_src} alt="" draggable={false} style={IMAGE_STYLE} />
      ) : null}
      {children.map((child, i) => (
        <NodeView
          key={child.el.id}
          node={child}
          step={step}
          globalDuration={globalDuration}
          globalEase={globalEase}
          keyframesByElement={keyframesByElement}
          selectedIds={selectedIds}
          onNodeClick={onNodeClick}
          stagDelay={
            stagDelay +
            getChildDelayFor(myStagger, order, childCount, i, el.id)
          }
          parentMotionPreset={childPreset}
          inAutoLayout={isAutoLayout}
        />
      ))}
      {outlineDiv}
    </motion.div>
  )
})

// stable 빈 배열 — keyframesByElement.get이 undefined일 때 매번 새 [] 만들지 않게.
const EMPTY_KFS: KeyframeRow[] = []

// editing 모드 transition도 모듈 상수.
const INTERACTIVE_TRANSITION: Transition = { duration: 0, delay: 0 }

/** child stagger delay 계산을 클로저 캡쳐 없는 순수 함수로 분리. */
function getChildDelayFor(
  myStagger: number,
  order: string,
  childCount: number,
  i: number,
  parentId: string,
): number {
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
      idx = pseudoRandomIdx(parentId, i, childCount)
      break
    default:
      idx = i
  }
  return idx * myStagger
}

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

interface StaticInitial extends AnimatedValues {
  fontWeight?: number
  textAlign?: string
}

function computeStaticInitial(el: ElementRow): StaticInitial {
  // 색/stroke/shadow/blur는 절대 강제하지 않는다.
  // (키프레임에서 명시적으로 설정한 값만 effective에 들어오게 두고, 없으면 미적용)
  // — 사용자가 "fill 없음 / stroke 없음 / blur 없음" 상태를 만들 수 있어야 함.
  return {
    x: 0,
    y: 0,
    width: 200,
    height: 80,
    opacity: 1,
    rotate: 0,
    scale: 1,
    skew_x: 0,
    skew_y: 0,
    border_radius: 0,
    font_size: el.type === 'text' ? 48 : undefined,
    fontWeight: el.font_weight ?? 500,
    textAlign: el.text_align ?? 'left',
  }
}

/**
 * effective 값 → motion.div의 animate prop 객체.
 * left/top/width/height는 px, transform 계열은 framer가 알아서.
 *
 * 원칙: "값이 셋팅된 속성만 박는다." 색/stroke/blur/shadow는 effective에 없으면
 * 아예 animate에 등장하지 않으므로, 사용자가 fill 없는 frame을 만들 수 있다.
 */
function buildAnimateObj(
  values: StaticInitial,
  isEllipse: boolean,
): Record<string, unknown> {
  const obj: Record<string, unknown> = {}
  if (values.x !== undefined) obj.left = values.x
  if (values.y !== undefined) obj.top = values.y
  if (values.width !== undefined) obj.width = values.width
  if (values.height !== undefined) obj.height = values.height
  if (values.opacity !== undefined) obj.opacity = values.opacity
  if (values.rotate !== undefined) obj.rotate = values.rotate
  if (values.scale !== undefined) obj.scale = values.scale
  if (values.skew_x !== undefined) obj.skewX = values.skew_x
  if (values.skew_y !== undefined) obj.skewY = values.skew_y

  // fill: 값이 있을 때만. null이면 transparent로 명시 (사용자가 색을 지운 경우)
  if (values.bg_color !== undefined) {
    obj.backgroundColor = values.bg_color === null ? 'transparent' : values.bg_color
  }
  if (values.fg_color !== undefined) {
    obj.color = values.fg_color
  }

  // border-radius: ellipse는 강제 50%, 그 외엔 값 있을 때만
  if (isEllipse) {
    obj.borderRadius = '50%'
  } else if (values.border_radius !== undefined) {
    obj.borderRadius = values.border_radius
  }

  if (values.font_size !== undefined) obj.fontSize = values.font_size

  // blur: 0보다 클 때만 filter 박음 (불필요한 GPU 레이어 방지).
  // 단 사용자가 한 번 blur를 줬다 빼면 effective.blur===0이 들어올 수 있는데,
  // framer에서 이전 frame의 filter가 살아있을 수 있으니 0일 때는 명시적으로 'none'.
  if (values.blur !== undefined) {
    const b = Number(values.blur)
    obj.filter = b > 0 ? `blur(${b}px)` : 'none'
  }

  // shadow: 값이 있을 때만. null이면 명시적 'none' 으로 지움.
  if (values.shadow !== undefined) {
    obj.boxShadow = values.shadow === null ? 'none' : values.shadow
  }

  // border: width가 셋팅되어 있을 때만. 0이면 박지 않음 (Framer에서 잔존 가능성 있어 명시적 0)
  if (values.border_width !== undefined) {
    const bw = Number(values.border_width)
    if (bw > 0) {
      obj.borderWidth = bw
      obj.borderStyle = 'solid'
    } else {
      obj.borderWidth = 0
    }
  }
  if (values.border_color !== undefined) {
    obj.borderColor = values.border_color
  }

  return obj
}

function mapAlign(v: string | null): CSSProperties['alignItems'] {
  switch (v) {
    case 'center':
      return 'center'
    case 'end':
      return 'flex-end'
    case 'stretch':
      return 'stretch'
    case 'start':
    default:
      return 'flex-start'
  }
}

function mapJustify(v: string | null): CSSProperties['justifyContent'] {
  switch (v) {
    case 'center':
      return 'center'
    case 'end':
      return 'flex-end'
    case 'between':
      return 'space-between'
    case 'around':
      return 'space-around'
    case 'start':
    default:
      return 'flex-start'
  }
}

/**
 * Group each motion 프리셋: initial → animate 한 쌍 반환.
 * 자식 motion.div의 initial/animate에 머지해서 등장 효과를 만든다.
 */
function motionPresetProps(
  preset: string,
): { initial: TargetAndTransition; animate: TargetAndTransition } | null {
  switch (preset) {
    case 'fade':
      return { initial: { opacity: 0 }, animate: { opacity: 1 } }
    case 'slide-up':
      return { initial: { opacity: 0, y: 24 }, animate: { opacity: 1, y: 0 } }
    case 'slide-down':
      return { initial: { opacity: 0, y: -24 }, animate: { opacity: 1, y: 0 } }
    case 'slide-left':
      return { initial: { opacity: 0, x: 24 }, animate: { opacity: 1, x: 0 } }
    case 'slide-right':
      return { initial: { opacity: 0, x: -24 }, animate: { opacity: 1, x: 0 } }
    case 'scale':
      return { initial: { opacity: 0, scale: 0.85 }, animate: { opacity: 1, scale: 1 } }
    case 'pop':
      return {
        initial: { opacity: 0, scale: 0.5 },
        animate: { opacity: 1, scale: [0.5, 1.08, 1] },
      }
    case 'blur':
      return {
        initial: { opacity: 0, filter: 'blur(12px)' },
        animate: { opacity: 1, filter: 'blur(0px)' },
      }
    case 'none':
    default:
      return null
  }
}

function renderTextSplit(el: ElementRow, text: string) {
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

  let pieces: string[]
  if (split === 'char') {
    pieces = Array.from(text)
  } else if (split === 'word') {
    pieces = text.split(/(\s+)/)
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
