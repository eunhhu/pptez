/**
 * 스파스 키프레임 → 현재 step의 effective 값 계산.
 *
 * 룰 (AE 표준):
 *  - 첫 키프레임 이전에는 첫 키프레임 값을 유지
 *  - 마지막 키프레임 이후에는 마지막 키프레임 값을 유지
 *  - 각 속성은 독립적으로 평가됨 (key가 잡힌 스텝만 고려)
 *  - 트랜지션은 Framer Motion의 `animate` prop이 자동 보간
 *
 * 우리는 "현재 step에서의 목표값"만 계산하면 되므로, 보간식은 필요 없음.
 * (Framer가 자기가 들고 있는 이전 값에서 다음 값으로 트윈해줌)
 */

import type { KeyframeRow, AnimatableKey } from './types'
import { ANIMATABLE_KEYS } from './types'

export type AnimatedValues = Partial<Record<AnimatableKey, number | string>>

/**
 * 한 요소의 키프레임들 중에서, 주어진 step에 적용할 값들을 계산.
 *
 * 각 속성마다:
 *  - step에 정확히 키가 있으면 그 값
 *  - 없으면, step 이전의 가장 가까운 키 값 (없으면 step 이후의 가장 가까운 키 값)
 *
 * 호출자가 keyframes를 step 오름차순으로 정렬해서 넘기면 재정렬을 생략한다.
 * (Stage에서 keyframesByElement Map을 만들 때 한 번만 정렬하면 됨)
 */
export function computeValuesAt(
  keyframes: KeyframeRow[],
  step: number,
  presorted = false,
): AnimatedValues {
  const n = keyframes.length
  if (n === 0) return {}

  const sorted = presorted
    ? keyframes
    : [...keyframes].sort((a, b) => a.step - b.step)

  // single-sweep: 한 번 순회하면서 17개 키를 동시에 채운다.
  //  - "step ≤ current"인 동안 모든 키의 best 후보를 갱신
  //  - 그 이후에는 값이 비어 있는 키만 처음으로 만난 값으로 채워 (fallback)
  const result: AnimatedValues = {}
  const cutoffEnd = (() => {
    // step ≤ 인 마지막 인덱스 + 1 (bin search는 N 작아 의미없음)
    let i = 0
    while (i < n && sorted[i].step <= step) i++
    return i
  })()

  // 1) step ≤ : 뒤에서 앞으로 훑되, 처음 만난 non-null만 채택 (≡ 가장 마지막 키 값)
  for (let i = cutoffEnd - 1; i >= 0; i--) {
    const kf = sorted[i]
    for (let k = 0; k < ANIMATABLE_KEYS.length; k++) {
      const key = ANIMATABLE_KEYS[k]
      if (result[key] !== undefined) continue
      const v = kf[key]
      if (v !== null && v !== undefined) {
        result[key] = v as number | string
      }
    }
  }

  // 2) step > : 앞에서 뒤로 훑으며 아직 못 채워진 키만 채움 (post-step fallback)
  for (let i = cutoffEnd; i < n; i++) {
    const kf = sorted[i]
    for (let k = 0; k < ANIMATABLE_KEYS.length; k++) {
      const key = ANIMATABLE_KEYS[k]
      if (result[key] !== undefined) continue
      const v = kf[key]
      if (v !== null && v !== undefined) {
        result[key] = v as number | string
      }
    }
  }

  return result
}

/**
 * 텍스트 컨텐츠 트랙. 보간 없이 step ≤ current 마지막 값.
 * 키프레임에 text_content가 하나도 없으면 null.
 */
export function computeTextAt(
  keyframes: KeyframeRow[],
  step: number,
  presorted = false,
): string | null {
  const sorted = presorted
    ? keyframes
    : [...keyframes].sort((a, b) => a.step - b.step)
  let chosen: KeyframeRow | null = null
  for (let i = 0; i < sorted.length; i++) {
    const kf = sorted[i]
    if (kf.text_content === null || kf.text_content === undefined) continue
    if (kf.step <= step) chosen = kf
    else break
  }
  return chosen?.text_content ?? null
}

/**
 * 현재 step의 트랜지션을 결정할 키프레임을 찾는다.
 * 즉 "이 step으로 들어오는 transition"을 정의하는 키프레임.
 *
 * - step에 정확히 키가 있으면 그것
 * - 없으면, step 이전의 가장 가까운 키
 * - duration/ease 컬럼이 NULL이 아닌 키만 고려
 */
export function findTransitionKeyframe(
  keyframes: KeyframeRow[],
  step: number,
  presorted = false,
): KeyframeRow | null {
  const sorted = presorted
    ? keyframes
    : [...keyframes].sort((a, b) => a.step - b.step)
  let chosen: KeyframeRow | null = null
  for (let i = 0; i < sorted.length; i++) {
    const kf = sorted[i]
    if (kf.step <= step) chosen = kf
    else break
  }
  return chosen
}

/**
 * 어떤 속성들에 키프레임이 하나라도 잡혀있는지.
 * (인스펙터에 "이 속성은 애니메이션 됨" 표시용)
 */
export function getAnimatedKeys(keyframes: KeyframeRow[]): Set<AnimatableKey> {
  const result = new Set<AnimatableKey>()
  for (const kf of keyframes) {
    for (const key of ANIMATABLE_KEYS) {
      if (kf[key] !== null && kf[key] !== undefined) {
        result.add(key)
      }
    }
  }
  return result
}
