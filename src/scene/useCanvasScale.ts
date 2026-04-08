/**
 * 1920×1080 가상 캔버스를 부모 요소의 실제 크기에 맞춰 scale 변환.
 *
 * - ResizeObserver로 부모 크기 추적
 * - --canvas-scale CSS 변수에 scale 값 셋팅
 * - 정수 비율 X — 항상 fit
 */

import { useEffect, useRef } from 'react'
import { CANVAS_WIDTH, CANVAS_HEIGHT } from './Stage'

export function useCanvasScale<T extends HTMLElement>() {
  const ref = useRef<T | null>(null)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    const apply = () => {
      const rect = node.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return
      const sx = rect.width / CANVAS_WIDTH
      const sy = rect.height / CANVAS_HEIGHT
      const s = Math.min(sx, sy)
      node.style.setProperty('--canvas-scale', String(s))
    }

    apply()
    const ro = new ResizeObserver(apply)
    ro.observe(node)
    return () => ro.disconnect()
  }, [])

  return ref
}
