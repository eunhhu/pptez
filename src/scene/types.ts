/**
 * Scene 데이터 타입.
 *
 * 서버(server/db.ts)와 클라이언트가 공유하는 형태.
 * 서버에서 직접 import하면 vite가 brower 번들에 포함시켜 bun:sqlite를 끌어와서 깨지므로
 * 타입은 클라이언트에 별도 정의하고, 동일 shape을 유지함.
 */

export type ElementType = 'frame' | 'text' | 'image'
export type TextSplit = 'none' | 'char' | 'word' | 'line'
export type LayoutMode = 'none' | 'row' | 'column'
export type LayoutAlign = 'start' | 'center' | 'end' | 'stretch'
export type LayoutJustify = 'start' | 'center' | 'end' | 'between' | 'around'
export type FrameSubtype = 'rect' | 'ellipse'
export type ChildMotionPreset =
  | 'none'
  | 'fade'
  | 'slide-up'
  | 'slide-down'
  | 'slide-left'
  | 'slide-right'
  | 'scale'
  | 'pop'
  | 'blur'

export interface ElementRow {
  id: string
  parent_id: string | null
  type: ElementType
  name: string | null
  z_index: number
  subtype: string | null
  text_content: string | null
  text_split: TextSplit | null
  font_weight: number | null
  text_align: string | null
  image_src: string | null
  layout_mode: string | null
  layout_gap: number | null
  layout_padding: number | null
  layout_align: string | null
  layout_justify: string | null
  child_stagger: number | null
  child_stagger_order: string | null
  child_motion_preset: string | null
  created_at: number
}

export interface KeyframeRow {
  element_id: string
  step: number
  x: number | null
  y: number | null
  width: number | null
  height: number | null
  opacity: number | null
  rotate: number | null
  scale: number | null
  skew_x: number | null
  skew_y: number | null
  bg_color: string | null
  fg_color: string | null
  border_radius: number | null
  font_size: number | null
  blur: number | null
  shadow: string | null
  border_width: number | null
  border_color: string | null
  text_content: string | null
  duration: number | null
  ease: string | null
}

export interface AssetRow {
  id: string
  filename: string
  mime_type: string
  size: number
  width: number | null
  height: number | null
  storage_path: string
  created_at: number
}

export interface Scene {
  meta: Record<string, string>
  elements: ElementRow[]
  keyframes: KeyframeRow[]
  assets: AssetRow[]
}

// 키프레임의 애니메이션 가능한 속성 키
// text_content는 별도 트랙(보간 없음)
export type AnimatableKey =
  | 'x'
  | 'y'
  | 'width'
  | 'height'
  | 'opacity'
  | 'rotate'
  | 'scale'
  | 'skew_x'
  | 'skew_y'
  | 'bg_color'
  | 'fg_color'
  | 'border_radius'
  | 'font_size'
  | 'blur'
  | 'shadow'
  | 'border_width'
  | 'border_color'

export const ANIMATABLE_KEYS: AnimatableKey[] = [
  'x',
  'y',
  'width',
  'height',
  'opacity',
  'rotate',
  'scale',
  'skew_x',
  'skew_y',
  'bg_color',
  'fg_color',
  'border_radius',
  'font_size',
  'blur',
  'shadow',
  'border_width',
  'border_color',
]
