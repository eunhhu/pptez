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
 */
export function computeValuesAt(
  keyframes: KeyframeRow[],
  step: number,
): AnimatedValues {
  if (keyframes.length === 0) return {}

  // 시간순 정렬
  const sorted = [...keyframes].sort((a, b) => a.step - b.step)

  const result: AnimatedValues = {}

  for (const key of ANIMATABLE_KEYS) {
    // 해당 속성에 키가 잡힌 키프레임만 추출
    const withKey = sorted.filter((kf) => kf[key] !== null && kf[key] !== undefined)
    if (withKey.length === 0) continue

    // step 이하의 마지막 키프레임
    let chosen = withKey[0]
    for (const kf of withKey) {
      if (kf.step <= step) chosen = kf
      else break
    }
    const v = chosen[key]
    if (v !== null && v !== undefined) {
      result[key] = v as number | string
    }
  }

  return result
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
