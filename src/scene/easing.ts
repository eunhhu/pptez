/**
 * Easing 시스템.
 *
 * DB에 저장되는 형식: JSON 문자열.
 *  - "easeOut"  → named (string)
 *  - "[0.22,1,0.36,1]"  → cubic-bezier 4-tuple (number[])
 *  - '{"type":"spring","stiffness":300,"damping":20,"mass":1}' → spring object
 *
 * parseEase()는 위 셋 중 어느 것이든 받아 Framer Motion의 transition prop 일부로
 * 합쳐쓸 수 있는 형태로 돌려준다.
 */

import type { Easing, Transition } from 'framer-motion'

export type SpringSpec = {
  type: 'spring'
  stiffness?: number
  damping?: number
  mass?: number
  bounce?: number
  velocity?: number
  restDelta?: number
}

export type EaseValue = Easing | number[] | SpringSpec | string

/**
 * Named easing 프리셋.
 *  - cubic-bezier 기반 함수들은 4-tuple 또는 framer 내장 named로 반환
 *  - spring 프리셋은 SpringSpec 반환
 */
export const EASE_PRESETS: Record<string, EaseValue> = {
  // framer 내장
  linear: 'linear',
  easeIn: 'easeIn',
  easeOut: 'easeOut',
  easeInOut: 'easeInOut',
  circIn: 'circIn',
  circOut: 'circOut',
  circInOut: 'circInOut',
  backIn: 'backIn',
  backOut: 'backOut',
  backInOut: 'backInOut',
  anticipate: 'anticipate',

  // cubic-bezier 커브 (Penner 표준)
  'sine-in': [0.12, 0, 0.39, 0],
  'sine-out': [0.61, 1, 0.88, 1],
  'sine-in-out': [0.37, 0, 0.63, 1],
  'quad-in': [0.11, 0, 0.5, 0],
  'quad-out': [0.5, 1, 0.89, 1],
  'quad-in-out': [0.45, 0, 0.55, 1],
  'cubic-in': [0.32, 0, 0.67, 0],
  'cubic-out': [0.33, 1, 0.68, 1],
  'cubic-in-out': [0.65, 0, 0.35, 1],
  'quart-in': [0.5, 0, 0.75, 0],
  'quart-out': [0.25, 1, 0.5, 1],
  'quart-in-out': [0.76, 0, 0.24, 1],
  'quint-in': [0.64, 0, 0.78, 0],
  'quint-out': [0.22, 1, 0.36, 1],
  'quint-in-out': [0.83, 0, 0.17, 1],
  'expo-in': [0.7, 0, 0.84, 0],
  'expo-out': [0.16, 1, 0.3, 1],
  'expo-in-out': [0.87, 0, 0.13, 1],

  // 우리 기본
  'out-quart': [0.22, 1, 0.36, 1],

  // spring 프리셋
  'spring-gentle': { type: 'spring', stiffness: 100, damping: 14, mass: 1 },
  'spring-wobbly': { type: 'spring', stiffness: 180, damping: 12, mass: 1 },
  'spring-stiff': { type: 'spring', stiffness: 400, damping: 30, mass: 1 },
  'spring-slow': { type: 'spring', stiffness: 60, damping: 20, mass: 1 },
  'spring-molasses': { type: 'spring', stiffness: 40, damping: 25, mass: 1.5 },
  'spring-bouncy': { type: 'spring', stiffness: 300, damping: 10, mass: 1 },
}

export const EASE_PRESET_NAMES = Object.keys(EASE_PRESETS)

/** DB 값(JSON 문자열)을 EaseValue로 파싱. */
export function parseEase(raw: string | null | undefined): EaseValue {
  if (!raw) return 'easeOut'
  // 1) 그대로 named이거나 JSON 안 깨진 단순 문자열
  if (raw[0] !== '[' && raw[0] !== '{' && raw[0] !== '"') {
    // 키 자체가 named인지
    if (raw in EASE_PRESETS) return EASE_PRESETS[raw]
    return raw as Easing
  }
  try {
    const parsed = JSON.parse(raw)
    // 1) "easeOut" 같은 string named
    if (typeof parsed === 'string') {
      if (parsed in EASE_PRESETS) return EASE_PRESETS[parsed]
      return parsed as Easing
    }
    // 2) [.22,1,.36,1]
    if (Array.isArray(parsed)) return parsed as number[]
    // 3) spring
    if (parsed && typeof parsed === 'object' && parsed.type === 'spring') {
      return parsed as SpringSpec
    }
  } catch {
    // fallthrough
  }
  return 'easeOut'
}

/**
 * EaseValue를 framer transition prop의 일부로 머지.
 * spring일 경우 type:'spring' + 파라미터를 반환 (duration 무시),
 * 그 외엔 { ease } 객체.
 */
export function easeToTransitionPart(
  ease: EaseValue,
  duration: number,
): Partial<Transition> {
  if (typeof ease === 'object' && !Array.isArray(ease) && (ease as SpringSpec).type === 'spring') {
    const s = ease as SpringSpec
    return {
      type: 'spring',
      stiffness: s.stiffness,
      damping: s.damping,
      mass: s.mass,
      bounce: s.bounce,
      velocity: s.velocity,
      restDelta: s.restDelta,
    }
  }
  if (Array.isArray(ease)) {
    return {
      type: 'tween',
      duration,
      ease: ease as unknown as Easing,
    }
  }
  return {
    type: 'tween',
    duration,
    ease: ease as Easing,
  }
}

/** UI에서 글로벌 ease 저장 시 — preset name이면 그대로, 아니면 JSON. */
export function serializeEase(value: EaseValue | string): string {
  if (typeof value === 'string') {
    if (value in EASE_PRESETS) return value
    return JSON.stringify(value)
  }
  return JSON.stringify(value)
}
