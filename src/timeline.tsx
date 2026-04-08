import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'

/**
 * "Jo조" 숫자 맞추기 발표 타임라인.
 *
 * 스텝 구성 (TOTAL_STEPS = 18)
 *  0  검은 화면 + `$` 커서만
 *  1  `$ ./숫자_맞추기.c` 한 글자씩 타이핑
 *  2  "Jo조" 중앙 등장 + 인사
 *  3  Jo조 좌상단 축소 + 의사코드 타이핑
 *     → 다음 스텝으로 넘어갈 때 글자가 흔들리며 낙하
 *  4  C 코드 flash 등장 — #include 포커스
 *  5  const 포커스
 *  6  int main(void) 포커스
 *  7  srand / rand 포커스
 *  8  chance / answer 초기화 포커스
 *  9  while 루프 포커스
 *  10 scanf_s 포커스 + 터미널 등장 ("100" 입력)
 *  11 "100" → UP! (if random > answer)
 *  12 "150" → DOWN! (else if random < answer)
 *  13 "137" → 정답! (else if random == answer, return 0)
 *  14 chance-- 포커스 (루프 후행)
 *  15 else 방어적 코딩 포커스
 *  16 실패 케이스 (루프 소진)
 *  17 마무리 — "$ 이상 Jo조였습니다. 감사합니다."
 */

export const TOTAL_STEPS = 18

type StageProps = {
  step: number
}

/* ------------------------------------------------------------------ */
/* 프리미티브                                                          */
/* ------------------------------------------------------------------ */

/** 깜빡이는 커서 ▊ */
function Caret({ className = '' }: { className?: string }) {
  return (
    <motion.span
      aria-hidden
      className={`inline-block w-[0.55em] translate-y-[2px] bg-zinc-100 align-baseline ${className}`}
      style={{ height: '1em' }}
      animate={{ opacity: [1, 1, 0, 0] }}
      transition={{ duration: 1, repeat: Infinity, ease: 'linear', times: [0, 0.5, 0.5, 1] }}
    />
  )
}

/**
 * 실시간 타이핑 — active가 true일 때부터 글자를 한 자씩 찍음.
 * 이전 글자들은 유지되고, 다 찍으면 멈춘 상태로 보임.
 */
function TypedLive({
  text,
  active,
  speedMs = 45,
  className = '',
  showCaret = true,
  onDone,
}: {
  text: string
  active: boolean
  speedMs?: number
  className?: string
  showCaret?: boolean
  onDone?: () => void
}) {
  const [n, setN] = useState(0)

  useEffect(() => {
    if (!active) {
      setN(0)
      return
    }
    if (n >= text.length) {
      onDone?.()
      return
    }
    const t = setTimeout(() => setN((v) => Math.min(v + 1, text.length)), speedMs)
    return () => clearTimeout(t)
  }, [active, n, text, speedMs, onDone])

  const done = n >= text.length
  return (
    <span className={className}>
      {text.slice(0, n)}
      {showCaret && active && !done && <Caret />}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/* Scene 1: 인트로                                                     */
/* ------------------------------------------------------------------ */

function IntroScene({ step }: { step: number }) {
  const showIntro = step < 2
  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center bg-black"
      animate={{ opacity: showIntro ? 1 : 0 }}
      transition={{ duration: 0.6 }}
      style={{ pointerEvents: showIntro ? 'auto' : 'none' }}
    >
      <div className="font-mono text-[3rem] text-zinc-100">
        <span className="text-emerald-400">$ </span>
        <TypedLive text="./숫자_맞추기.c" active={step >= 1} speedMs={70} />
        {step < 1 && <Caret />}
      </div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/* Scene 2: Jo조 라벨                                                   */
/* ------------------------------------------------------------------ */

function JoLabel({ step }: { step: number }) {
  if (step < 2 || step >= 17) return null
  const pinned = step >= 3
  return (
    <motion.div
      className="absolute font-mono font-bold text-white"
      initial={false}
      animate={
        pinned
          ? { top: '4%', left: '4%', x: 0, y: 0, fontSize: '1.25rem', opacity: 0.9 }
          : { top: '50%', left: '50%', x: '-50%', y: '-50%', fontSize: '7rem', opacity: 1 }
      }
      transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
    >
      Jo조
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/* Scene 2~5: 의사코드                                                   */
/* ------------------------------------------------------------------ */

const PSEUDO_LINES = [
  '빌드타임에 정의되는 상수 MAX_CHANCE, MAX_RANGE를 각각 7, 200으로 정의',
  '난수를 초기화하여 매번 다른 난수가 나오도록 설정',
  '',
  '업다운 게임에 필요한 integer 변수들 선언',
  '  random  — 사용자가 맞춰야 하는 값',
  '  answer  — 사용자가 입력한 값',
  '  chance  — 남은 기회',
  '',
  'random은 rand() 결과를 MAX_RANGE로 나눈 나머지에 +1',
  'chance는 미리 정의된 MAX_CHANCE 값으로 저장',
  '',
  'chance가 0보다 큰 동안 while 반복문 실행',
  '  남은 기회와 입력 안내를 출력',
  '  입력을 받아 answer에 저장',
  '  random > answer → "UP!" 출력',
  '  random < answer → "DOWN!" 출력',
  '  random == answer → "정답입니다" 출력 후 return 0',
  '  그 외 예외 → "알 수 없는 오류" 출력 후 return 1',
  '  사이클 끝에 chance를 1 감소',
  '',
  'chance가 0이 되어 while을 벗어나면 실패 메시지와 정답 출력 후 return 0',
]

/**
 * 의사코드 섹션.
 *  step 3 : 전체 텍스트를 한 글자씩 타이핑
 *  step 4 : 글자별 span으로 흔들리며 낙하 (1.1초). 그 위로 C 코드가 flash-in.
 *  step 5+: Stage의 AnimatePresence가 컴포넌트를 unmount.
 */
const PSEUDO_TEXT = PSEUDO_LINES.join('\n')

function PseudoScene({ step }: { step: number }) {
  const shaking = step >= 4
  return (
    <motion.div
      className="pointer-events-none absolute left-[6%] right-[6%] top-[12%] bottom-[6%] overflow-hidden font-mono text-[0.85rem] leading-[1.65] text-zinc-300"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        className="mb-3 text-[0.7rem] uppercase tracking-[0.3em] text-zinc-500"
        animate={
          shaking
            ? { y: [0, -2, 2, -1, 40], opacity: [1, 1, 1, 0.7, 0], rotate: [0, -3, 4, -2, 8] }
            : { y: 0, opacity: 1, rotate: 0 }
        }
        transition={{ duration: 1.1, ease: [0.5, 0, 0.75, 0] }}
      >
        // pseudo code
      </motion.div>
      {shaking ? (
        <ShakingPseudo text={PSEUDO_TEXT} />
      ) : (
        <div className="whitespace-pre-wrap">
          <TypedLive text={PSEUDO_TEXT} active speedMs={22} showCaret />
        </div>
      )}
    </motion.div>
  )
}

/** step 5 — 모든 글자를 개별 span으로 흔들고 떨어뜨림 */
function ShakingPseudo({ text }: { text: string }) {
  return (
    <div className="whitespace-pre-wrap">
      {text.split('').map((ch, i) => (
        <motion.span
          key={i}
          initial={{ y: 0, opacity: 1, rotate: 0 }}
          animate={{
            y: [0, -2, 2, -1, 40],
            opacity: [1, 1, 1, 0.7, 0],
            rotate: [0, -4, 5, -2, 10],
          }}
          transition={{
            duration: 1.1,
            delay: i * 0.004,
            ease: [0.5, 0, 0.75, 0],
          }}
          className="inline-block"
        >
          {ch === ' ' ? '\u00A0' : ch === '\n' ? '\n' : ch}
        </motion.span>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Scene 6~: 코드 패널                                                  */
/* ------------------------------------------------------------------ */

type Tag =
  | 'none'
  | 'include'
  | 'main'
  | 'const'
  | 'rand'
  | 'init'
  | 'while'
  | 'scanf'
  | 'up'
  | 'down'
  | 'eq'
  | 'else'
  | 'loop'
  | 'fail'
  | 'close'

type CodeLine = {
  text: string
  tag: Tag
  /** 이 줄에 대한 설명 (line-by-line) */
  desc?: string
}

/**
 * 최종 C 코드. 각 줄마다 의미 태그와 설명을 함께 보관.
 */
const CODE: CodeLine[] = [
  { text: '#include <stdio.h>', tag: 'include', desc: '표준 입출력 함수(printf, scanf_s 등)를 쓰기 위해 포함.' },
  { text: '#include <stdlib.h>', tag: 'include', desc: 'rand(), srand() 등 난수 관련 함수가 들어있는 헤더.' },
  { text: '#include <time.h>', tag: 'include', desc: 'time() 함수를 써서 현재 시각을 srand의 시드로 쓰기 위함.' },
  { text: '', tag: 'none' },
  { text: 'const int MAX_CHANCE = 7;', tag: 'const', desc: '기회 횟수를 상수로 분리. 규칙 바꾸려면 여기 숫자만 바꾸면 끝.' },
  { text: 'const int MAX_RANGE = 200;', tag: 'const', desc: '정답 범위의 상한. 1~MAX_RANGE 사이에서 난수를 뽑게 된다.' },
  { text: '', tag: 'none' },
  { text: 'int main(void) {', tag: 'main', desc: 'C 프로그램의 진입점. 인자가 없는 main 시그니처로 선언.' },
  { text: '    srand(time(NULL));', tag: 'rand', desc: '현재 시각을 시드로 심어, 실행할 때마다 다른 난수가 나오게 한다.' },
  { text: '', tag: 'none' },
  { text: '    int random = rand() % MAX_RANGE + 1; // 1 ~ MAX_RANGE 까지', tag: 'rand', desc: 'rand() % MAX_RANGE 는 0~199 이므로 +1 해서 1~200 범위로 맞춰준다.' },
  { text: '    int answer;', tag: 'init', desc: '사용자가 입력할 값을 담을 변수.' },
  { text: '    int chance = MAX_CHANCE;', tag: 'init', desc: '남은 기회 카운터. 매 루프마다 1씩 줄어든다.' },
  { text: '    ', tag: 'none' },
  { text: '    while (chance > 0) {', tag: 'while', desc: '기회가 남아있는 동안 계속 반복한다.' },
  { text: '        printf("기회가 %d번 남았습니다.\\n값을 입력하세요 : ", chance);', tag: 'while', desc: '남은 기회와 입력 안내를 한 번에 출력.' },
  { text: '        scanf_s("%d", &answer);', tag: 'scanf', desc: '사용자가 추측한 숫자를 읽어온다. (Windows용 안전 버전)' },
  { text: '        ', tag: 'none' },
  { text: '        printf("\\n");', tag: 'scanf', desc: '입력 후 가독성을 위해 빈 줄.' },
  { text: '        if (random > answer) {', tag: 'up', desc: '정답이 입력보다 크면 → 더 큰 값을 불러야 한다.' },
  { text: '            printf("UP!\\n");', tag: 'up', desc: '"UP!" 출력.' },
  { text: '        } else if (random < answer) {', tag: 'down', desc: '정답이 입력보다 작으면 → 더 작은 값을 불러야 한다.' },
  { text: '            printf("DOWN!\\n");', tag: 'down', desc: '"DOWN!" 출력.' },
  { text: '        } else if (random == answer) {', tag: 'eq', desc: '정확히 일치하면 → 정답.' },
  { text: '            printf("정답입니다! : %d\\n", random);', tag: 'eq', desc: '정답 메시지와 정답값을 함께 출력.' },
  { text: '            return 0;', tag: 'eq', desc: '정상 종료 코드 0을 돌려주고 즉시 끝낸다.' },
  { text: '        } else {', tag: 'else', desc: '논리적으론 여기 올 일이 없음 — 방어적 코딩.' },
  { text: '            printf("알 수 없는 오류가 발생했어요.\\n");', tag: 'else', desc: '혹시 모를 예외 상황 안내.' },
  { text: '            return 1;', tag: 'else', desc: '비정상 종료 코드 1을 돌려준다.' },
  { text: '        }', tag: 'none' },
  { text: '        chance--;', tag: 'loop', desc: '기회를 하나 소진한다.' },
  { text: '        printf("\\n");', tag: 'loop', desc: '다음 턴 전에 빈 줄로 분리.' },
  { text: '    }', tag: 'loop', desc: 'while 루프의 닫는 괄호.' },
  { text: '    printf("정답을 맞추지 못하였습니다.\\n정답 : %d\\n", random);', tag: 'fail', desc: '루프를 다 소진했으면 실패 메시지와 정답을 한 번에 출력.' },
  { text: '    ', tag: 'none' },
  { text: '    return 0;', tag: 'fail', desc: '실패해도 정상 종료 코드 0 반환.' },
  { text: '}', tag: 'close', desc: 'main 함수의 닫는 괄호 — 프로그램 종료.' },
]

function focusTag(step: number): Tag | null {
  switch (step) {
    case 4:
      return 'include'
    case 5:
      return 'const'
    case 6:
      return 'main'
    case 7:
      return 'rand'
    case 8:
      return 'init'
    case 9:
      return 'while'
    case 10:
      return 'scanf' // 터미널 등장 + 100 입력
    case 11:
      return 'up' // 100 → UP
    case 12:
      return 'down' // 150 → DOWN
    case 13:
      return 'eq' // 137 → 정답
    case 14:
      return 'loop' // chance--
    case 15:
      return 'else'
    case 16:
      return 'fail'
    default:
      return null
  }
}

/** 최소 C 토큰 컬러링 */
function colorize(text: string) {
  const parts: Array<{ t: string; c?: string }> = []
  const regex =
    /(\/\/[^\n]*|"(?:[^"\\]|\\.)*"|\b(?:const|int|void|while|if|else|return|for|NULL)\b|\b(?:srand|rand|time|scanf_s|scanf|printf|main)\b|\b\d+\b|#include\s*<[^>]+>|[{}();,%])/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) parts.push({ t: text.slice(last, m.index) })
    const token = m[0]
    let c: string | undefined
    if (token.startsWith('//')) c = 'text-zinc-500'
    else if (token.startsWith('"')) c = 'text-amber-300'
    else if (token.startsWith('#include')) c = 'text-fuchsia-400'
    else if (/^(const|int|void|while|if|else|return|for|NULL)$/.test(token)) c = 'text-sky-400'
    else if (/^(srand|rand|time|scanf_s|scanf|printf|main)$/.test(token)) c = 'text-emerald-300'
    else if (/^\d+$/.test(token)) c = 'text-orange-300'
    else if (/^[{}();,%]$/.test(token)) c = 'text-zinc-500'
    parts.push({ t: token, c })
    last = m.index + token.length
  }
  if (last < text.length) parts.push({ t: text.slice(last) })
  return parts.map((p, i) => (
    <span key={i} className={p.c}>
      {p.t}
    </span>
  ))
}

function CodePanel({ step }: { step: number }) {
  // step 4부터 등장, 10~16은 좌측으로 줄어듦 (터미널이 우측에)
  const visible = step >= 4 && step < 17
  const split = step >= 10 && step <= 16
  const focus = focusTag(step)
  const flashIn = step === 4 // 최초 등장 시 번쩍

  // 자동 스크롤 — focus 변경 시 첫 매칭 줄을 컨테이너 중앙으로
  const scrollRef = useRef<HTMLDivElement>(null)
  const rowRefs = useRef<Array<HTMLDivElement | null>>([])

  useEffect(() => {
    const container = scrollRef.current
    if (!container) return

    // focus가 없으면 맨 위로
    if (!focus) {
      container.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    const firstIdx = CODE.findIndex((l) => l.tag === focus)
    if (firstIdx < 0) return
    const target = rowRefs.current[firstIdx]
    if (!target) return

    const targetTop = target.offsetTop
    const targetHeight = target.offsetHeight
    const containerHeight = container.clientHeight
    const desired = targetTop - containerHeight / 2 + targetHeight / 2

    container.scrollTo({
      top: Math.max(0, desired),
      behavior: 'smooth',
    })
  }, [focus, split, visible])

  // 사용자 스크롤 차단 — React의 onWheel은 passive로 등록돼서 막히지 않음.
  // 직접 passive: false로 등록해야 preventDefault가 먹힌다.
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const block = (e: Event) => e.preventDefault()
    el.addEventListener('wheel', block, { passive: false })
    el.addEventListener('touchmove', block, { passive: false })
    return () => {
      el.removeEventListener('wheel', block)
      el.removeEventListener('touchmove', block)
    }
  }, [])

  return (
    <motion.div
      className="absolute flex flex-col font-mono"
      initial={false}
      animate={{
        opacity: visible ? 1 : 0,
        top: '13%',
        bottom: split ? '8%' : '24%',
        left: '4%',
        right: split ? '51%' : '4%',
      }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="flex min-h-0 flex-1 overflow-hidden rounded-lg border border-white/10 bg-zinc-950/85 shadow-2xl backdrop-blur">
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex items-center gap-2 border-b border-white/5 px-4 py-2">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-green-500/70" />
            <span className="ml-3 text-[0.7rem] text-zinc-500">숫자_맞추기.c</span>
          </div>

          {/*
            JS scrollTo가 동작하려면 overflow가 hidden이 아니어야 한다.
            overflow-y-scroll + 스크롤바 숨김 + wheel/touch 차단으로
            자동 스크롤만 허용하는 효과를 낸다.
          */}
          <div
            ref={scrollRef}
            className="code-scroll-hidden min-h-0 flex-1 overflow-y-scroll px-4 py-2 text-[0.72rem] leading-[1.55]"
          >
            {/*
              위/아래에 컨테이너 절반 높이만큼의 spacer를 둬서
              첫 줄부터 마지막 줄까지 모든 줄이 컨테이너 정중앙에 위치할 수 있게 한다.
            */}
            <div aria-hidden style={{ height: '50%' }} />
            {CODE.map((line, i) => (
              <CodeRow
                key={i}
                line={line}
                index={i}
                focus={focus}
                flashIn={flashIn}
                rowRef={(el) => {
                  rowRefs.current[i] = el
                }}
              />
            ))}
            <div aria-hidden style={{ height: '50%' }} />
          </div>
        </div>
      </div>

      {/* 방어적 코딩 태그 — scene 15에서만 */}
      <AnimatePresence>
        {step === 15 && (
          <motion.div
            initial={{ opacity: 0, x: -10, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -10, scale: 0.9 }}
            transition={{ duration: 0.35 }}
            className="absolute right-4 top-2 rounded-full border border-fuchsia-400/40 bg-fuchsia-500/10 px-3 py-1 text-[0.65rem] font-semibold text-fuchsia-200 shadow-lg"
          >
            방어적 코딩 ✦
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function CodeRow({
  line,
  index,
  focus,
  flashIn,
  rowRef,
}: {
  line: CodeLine
  index: number
  focus: Tag | null
  flashIn: boolean
  rowRef?: (el: HTMLDivElement | null) => void
}) {
  const isFocused = focus !== null && line.tag === focus
  const dim = focus !== null && !isFocused && line.tag !== 'none'
  const targetOpacity = dim ? 0.22 : 1

  return (
    <motion.div
      ref={rowRef}
      className="whitespace-pre rounded-sm px-2"
      initial={flashIn ? { opacity: 0, x: -8 } : false}
      animate={{
        opacity: targetOpacity,
        x: 0,
        backgroundColor: isFocused ? 'rgba(56,189,248,0.14)' : 'rgba(0,0,0,0)',
      }}
      transition={{
        duration: 0.4,
        delay: flashIn ? Math.min(index * 0.018, 0.8) : 0,
        ease: 'easeOut',
      }}
    >
      <span className="mr-3 inline-block w-5 text-right text-[0.62rem] text-zinc-600">
        {line.text ? index + 1 : ''}
      </span>
      {line.text ? colorize(line.text) : '\u00A0'}
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/* Line-by-line 설명 패널 (하단)                                        */
/* ------------------------------------------------------------------ */

function ExplainPanel({ step }: { step: number }) {
  // step 4~16 구간에서 현재 focus tag에 해당하는 줄들의 desc를 모아 보여줌
  const visible = step >= 4 && step <= 16
  const focus = focusTag(step)
  const split = step >= 10 && step <= 16

  const rows = focus ? CODE.filter((l) => l.tag === focus && l.desc) : []

  const title: Record<Tag, string> = {
    none: '',
    include: '전처리 지시문',
    main: 'main 함수 선언',
    const: '상수 정의',
    rand: '난수 초기화',
    init: '상태 초기화',
    while: 'while 루프',
    scanf: '입력 받기',
    up: 'UP — 정답이 더 크다',
    down: 'DOWN — 정답이 더 작다',
    eq: '정답!',
    else: 'else — 방어적 코딩',
    loop: '루프 유지',
    fail: '실패 처리',
    close: '프로그램 종료',
  }

  return (
    <motion.div
      className="absolute font-sans"
      initial={false}
      animate={{
        opacity: visible ? 1 : 0,
        bottom: '4%',
        left: '4%',
        right: split ? '51%' : '4%',
        top: split ? 'auto' : '78%',
      }}
      transition={{ duration: 0.5 }}
    >
      <div className="h-full rounded-lg border border-sky-400/20 bg-sky-500/5 px-5 py-3 backdrop-blur-sm">
        <div className="mb-2 text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-sky-300">
          {focus ? title[focus] : ''}
        </div>
        <AnimatePresence mode="wait">
          <motion.ul
            key={step}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.3 }}
            className="space-y-1 text-[0.78rem] leading-relaxed text-zinc-200"
          >
            {rows.map((r, i) => (
              <li key={i} className="flex gap-2">
                <span className="shrink-0 font-mono text-[0.7rem] text-sky-400">
                  L{CODE.indexOf(r) + 1}
                </span>
                <span className="font-mono text-[0.7rem] text-zinc-400">
                  {r.text.trim()}
                </span>
                <span className="text-zinc-100">→ {r.desc}</span>
              </li>
            ))}
          </motion.ul>
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/* 터미널 시뮬레이션                                                     */
/* ------------------------------------------------------------------ */

type TermKind = 'input' | 'up' | 'down' | 'ok' | 'fail' | 'info'
type TermLine = {
  /** 라인을 스텝이 바뀌어도 유지하기 위한 안정 ID */
  id: string
  text: string
  kind: TermKind
  bump?: 'up' | 'down'
}

/**
 * 누적되는 성공 시나리오 라인들.
 * 각 라인에 고유 id를 주어 스텝이 넘어가도 재마운트되지 않도록 한다.
 */
const SUCCESS_LINES: { line: TermLine; since: number }[] = [
  // step 10: scanf 포커스 — 첫 프롬프트와 입력만
  { since: 10, line: { id: 'c7', text: '기회가 7번 남았습니다.', kind: 'info' } },
  { since: 10, line: { id: 'in100', text: '값을 입력하세요 : 100', kind: 'input' } },
  // step 11: UP! 출력
  { since: 11, line: { id: 'up1', text: 'UP!', kind: 'up', bump: 'up' } },
  { since: 11, line: { id: 'sp1', text: '', kind: 'info' } },
  { since: 11, line: { id: 'c6', text: '기회가 6번 남았습니다.', kind: 'info' } },
  // step 12: 150 → DOWN
  { since: 12, line: { id: 'in150', text: '값을 입력하세요 : 150', kind: 'input' } },
  { since: 12, line: { id: 'dn1', text: 'DOWN!', kind: 'down', bump: 'down' } },
  { since: 12, line: { id: 'sp2', text: '', kind: 'info' } },
  { since: 12, line: { id: 'c5', text: '기회가 5번 남았습니다.', kind: 'info' } },
  // step 13: 137 → 정답
  { since: 13, line: { id: 'in137', text: '값을 입력하세요 : 137', kind: 'input' } },
  { since: 13, line: { id: 'sp3', text: '', kind: 'info' } },
  { since: 13, line: { id: 'ok', text: '정답입니다! : 137', kind: 'ok' } },
]

/**
 * step 17 — else 방어적 코딩 시나리오.
 * 논리적으론 올 일이 없지만, 만약 예외가 발생하면 이렇게 찍힌다.
 */
const ERROR_LINES: TermLine[] = [
  { id: 'e7', text: '기회가 7번 남았습니다.', kind: 'info' },
  { id: 'ein', text: '값을 입력하세요 : ???', kind: 'input' },
  { id: 'esp', text: '', kind: 'info' },
  { id: 'emsg', text: '알 수 없는 오류가 발생했어요.', kind: 'fail' },
  { id: 'ecode', text: '[프로세스가 코드 1(으)로 종료되었습니다]', kind: 'info' },
]

const FAIL_LINES: TermLine[] = [
  { id: 'f7', text: '기회가 7번 남았습니다.', kind: 'info' },
  { id: 'f50', text: '값을 입력하세요 : 50', kind: 'input' },
  { id: 'fup1', text: 'UP!', kind: 'up' },
  { id: 'f6', text: '기회가 6번 남았습니다.', kind: 'info' },
  { id: 'f180', text: '값을 입력하세요 : 180', kind: 'input' },
  { id: 'fdn1', text: 'DOWN!', kind: 'down' },
  { id: 'f5', text: '기회가 5번 남았습니다.', kind: 'info' },
  { id: 'f90', text: '값을 입력하세요 : 90', kind: 'input' },
  { id: 'fup2', text: 'UP!', kind: 'up' },
  { id: 'fmid', text: '... (중략) ...', kind: 'info' },
  { id: 'f1', text: '기회가 1번 남았습니다.', kind: 'info' },
  { id: 'f140', text: '값을 입력하세요 : 140', kind: 'input' },
  { id: 'fdn2', text: 'DOWN!', kind: 'down' },
  { id: 'fsp', text: '', kind: 'info' },
  { id: 'ffail', text: '정답을 맞추지 못하였습니다.', kind: 'fail' },
  { id: 'fans', text: '정답 : 137', kind: 'fail' },
]

function termLinesForStep(step: number): TermLine[] {
  if (step === 15) return ERROR_LINES
  if (step === 16) return FAIL_LINES
  return SUCCESS_LINES.filter((r) => step >= r.since).map((r) => r.line)
}

function termLineClass(kind: TermKind): string {
  switch (kind) {
    case 'up':
      return 'text-sky-300 font-bold'
    case 'down':
      return 'text-amber-300 font-bold'
    case 'ok':
      return 'text-emerald-300 font-bold'
    case 'fail':
      return 'text-rose-300 font-bold'
    case 'input':
      return 'text-zinc-100'
    default:
      return 'text-zinc-400'
  }
}

function TerminalPanel({ step }: { step: number }) {
  const visible = step >= 10 && step <= 16
  const lines = termLinesForStep(step)

  return (
    <motion.div
      className="absolute font-mono"
      initial={false}
      animate={{
        opacity: visible ? 1 : 0,
        top: '13%',
        right: '4%',
        left: '52%',
        bottom: '8%',
      }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="flex h-full flex-col overflow-hidden rounded-lg border border-white/10 bg-black/90 shadow-2xl">
        <div className="flex items-center gap-2 border-b border-white/5 px-4 py-2">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-green-500/70" />
          <span className="ml-3 text-[0.7rem] text-zinc-500">Terminal — ./숫자_맞추기</span>
        </div>
        {/*
          안정 key 사용으로 스텝 전환 시 기존 라인은 DOM에 그대로 유지되고,
          새 라인만 fade/slide-in. exit 애니메이션을 쓰지 않아 layout jump가 없다.
          실패 케이스(step 16)는 별도 스크롤 컨테이너로 들어가서 SUCCESS와 분리.
        */}
        <div className="code-scroll min-h-0 flex-1 overflow-y-auto px-5 py-3 text-[0.85rem] leading-relaxed">
          {/* 성공 시나리오 (10~14): 안정 key로 누적. 기존 라인 재마운트 없음. */}
          {step >= 10 && step <= 14 &&
            lines.map((line) => (
              <motion.div
                key={line.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{
                  opacity: 1,
                  y: line.bump === 'up' ? -4 : line.bump === 'down' ? 4 : 0,
                }}
                transition={{ duration: 0.35 }}
                className={`whitespace-pre ${termLineClass(line.kind)}`}
              >
                {line.text || '\u00A0'}
              </motion.div>
            ))}
          {/* 예외 시나리오 (15): 순차 등장 */}
          {step === 15 &&
            lines.map((line, i) => (
              <motion.div
                key={`err-${line.id}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: Math.min(i * 0.15, 1) }}
                className={`whitespace-pre ${termLineClass(line.kind)}`}
              >
                {line.text || '\u00A0'}
              </motion.div>
            ))}
          {/* 실패 시나리오 (16): 순차 등장 */}
          {step === 16 &&
            lines.map((line, i) => (
              <motion.div
                key={`fail-${line.id}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: Math.min(i * 0.05, 0.8) }}
                className={`whitespace-pre ${termLineClass(line.kind)}`}
              >
                {line.text || '\u00A0'}
              </motion.div>
            ))}
        </div>
      </div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/* Scene 8: 마무리                                                      */
/* ------------------------------------------------------------------ */

function OutroScene({ step }: { step: number }) {
  const visible = step >= 17
  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center bg-black"
      initial={false}
      animate={{ opacity: visible ? 1 : 0 }}
      transition={{ duration: 0.8 }}
      style={{ pointerEvents: visible ? 'auto' : 'none' }}
    >
      <div className="font-mono text-[2.5rem] text-zinc-100">
        <span className="text-emerald-400">$ </span>
        <TypedLive
          text="이상 Jo조였습니다. 감사합니다."
          active={visible}
          speedMs={55}
        />
      </div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/* Stage                                                                */
/* ------------------------------------------------------------------ */

export function Stage({ step }: StageProps) {
  return (
    <div className="absolute inset-0 overflow-hidden bg-black">
      <IntroScene step={step} />
      <JoLabel step={step} />
      <AnimatePresence>
        {step >= 3 && step <= 4 && <PseudoScene step={step} />}
      </AnimatePresence>
      <CodePanel step={step} />
      <ExplainPanel step={step} />
      <TerminalPanel step={step} />
      <OutroScene step={step} />
    </div>
  )
}
