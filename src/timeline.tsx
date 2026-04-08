import { motion } from 'framer-motion'

/**
 * 스텝 기반 연속 타임라인.
 *
 * 규칙:
 *  - 전역 `step` 값 하나가 현재 진행도를 결정함
 *  - 각 요소는 `step >= N` 같은 조건으로 자기 상태를 파생
 *  - 스텝 간 전환은 Framer Motion이 자동 트위닝 (animate prop)
 *  - 화면 전체가 "한 장"임. 슬라이드처럼 갈아끼우지 않음.
 *
 * 스텝 추가/제거는 `TOTAL_STEPS` 와 각 motion 요소의 조건만 수정하면 됨.
 */

export const TOTAL_STEPS = 6 // 0부터 5까지 — 필요에 따라 늘리면 됨

type StageProps = {
  step: number
}

/**
 * 스텝에 따라 값 고르는 헬퍼.
 * pickByStep(step, [ [0, 'a'], [2, 'b'], [4, 'c'] ])
 *   → step 0~1: 'a', 2~3: 'b', 4+: 'c'
 */
function pickByStep<T>(step: number, entries: [number, T][]): T {
  let current = entries[0][1]
  for (const [threshold, value] of entries) {
    if (step >= threshold) current = value
  }
  return current
}

export function Stage({ step }: StageProps) {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* 배경 색상이 스텝에 따라 천천히 변함 */}
      <motion.div
        className="absolute inset-0"
        animate={{
          backgroundColor: pickByStep(step, [
            [0, '#0b0b0f'],
            [2, '#0f0820'],
            [4, '#1a0820'],
            [5, '#000000'],
          ]),
        }}
        transition={{ duration: 1.2, ease: 'easeInOut' }}
      />

      {/* 타이틀 — 0에서 등장, 2에서 위로 이동+축소, 4에서 사라짐 */}
      <motion.h1
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap font-semibold tracking-tight text-white"
        initial={false}
        animate={{
          opacity: step >= 0 && step < 4 ? 1 : 0,
          scale: step >= 2 ? 0.5 : 1,
          y: step >= 2 ? -220 : 0,
          fontSize: step >= 2 ? '3rem' : '6rem',
        }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      >
        Web Presentation
      </motion.h1>

      {/* 서브카피 — 1에서 등장, 2에서 사라짐 */}
      <motion.p
        className="absolute left-1/2 top-1/2 w-full -translate-x-1/2 translate-y-16 text-center text-2xl text-zinc-400"
        initial={false}
        animate={{
          opacity: step >= 1 && step < 2 ? 1 : 0,
          y: step >= 1 ? 64 : 80,
        }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        Tailwind v4 · React 19 · Framer Motion
      </motion.p>

      {/* 본문 블록 — 2에서 등장 */}
      <motion.div
        className="absolute left-1/2 top-1/2 w-[72%] -translate-x-1/2 -translate-y-1/4 space-y-4 text-left text-3xl text-zinc-200"
        initial={false}
        animate={{
          opacity: step >= 2 && step < 4 ? 1 : 0,
          y: step >= 2 ? 0 : 40,
        }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        {[
          '자유로운 모션 — AE 처럼 능동적으로',
          '진짜 컴포넌트 — 차트, 데모까지',
          '스텝 단위로 멈추고 이동',
        ].map((text, i) => (
          <motion.div
            key={i}
            initial={false}
            animate={{
              opacity: step >= 2 + i * 0 ? 1 : 0, // 모두 같이 나옴
              x: step >= 2 ? 0 : -20,
            }}
            transition={{ duration: 0.6, delay: i * 0.08 }}
          >
            • {text}
          </motion.div>
        ))}
      </motion.div>

      {/* 강조 카드 — 4에서 등장 */}
      <motion.div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-white/10 bg-white/5 px-16 py-20 text-center backdrop-blur"
        initial={false}
        animate={{
          opacity: step == 4 ? 1 : 0,
          scale: step == 4 ? 1 : 0.9,
          y: step == 4 ? 0 : 20,
        }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <p className="text-2xl text-zinc-400">Tip</p>
        <p className="mt-4 text-6xl font-semibold text-fuchsia-300">
          src/timeline.tsx 편집
        </p>
      </motion.div>

      {/* 엔딩 — 5에서 등장 */}
      <motion.div
        className="absolute inset-0 flex flex-col items-center justify-center"
        initial={false}
        animate={{
          opacity: step >= 5 ? 1 : 0,
        }}
        transition={{ duration: 0.9 }}
      >
        <motion.h2
          className="text-7xl font-semibold text-white"
          initial={false}
          animate={{
            scale: step >= 5 ? 1 : 0.95,
            letterSpacing: step >= 5 ? '-0.02em' : '0.05em',
          }}
          transition={{ duration: 1 }}
        >
          Thanks.
        </motion.h2>
      </motion.div>
    </div>
  )
}
