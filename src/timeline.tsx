import { motion, useReducedMotion } from 'framer-motion'

/**
 * 하네스 엔지니어링 발표용 연속 타임라인.
 *
 * 규칙:
 *  - 전역 `step` 하나가 현재 발표 장면을 결정함
 *  - 각 장면은 같은 16:9 무대 위에서 opacity/scale/position만 전환함
 *  - 실제 SCRIPT.md의 네 파트 흐름을 16개의 몰입형 장면으로 압축함
 */

export const TOTAL_STEPS = 16

type StageProps = {
  step: number
}

type Slide = {
  eyebrow: string
  title: string
  body: string
  caption: string
  bullets?: string[]
  accent: 'blue' | 'emerald' | 'amber' | 'rose'
  visual:
    | 'hook'
    | 'vibe'
    | 'fracture'
    | 'genius'
    | 'equation'
    | 'prompt'
    | 'components'
    | 'question'
    | 'compare'
    | 'architecture'
    | 'dashboard'
    | 'decision'
    | 'boundary'
    | 'difference'
    | 'future'
    | 'thanks'
}

const slides: Slide[] = [
  {
    eyebrow: 'Part 1 · 배경',
    title: '왜 똑똑한 AI는 복잡한 일에서 흔들릴까?',
    body: '과제 초안, 요약, 번역, 간단한 코딩은 놀랍도록 잘합니다. 하지만 일이 길어지고 규칙이 늘어나면 앞의 조건을 놓치고 엉뚱한 결정을 내립니다.',
    caption: '오늘의 질문: 모델의 지능이 아니라, 모델이 일하는 환경을 보자.',
    bullets: ['ChatGPT · Claude · Codex', '긴 대화에서 조건 망각', '파일·권한·승인·기록의 부재'],
    accent: 'blue',
    visual: 'hook',
  },
  {
    eyebrow: 'Vibe Coding',
    title: '“이런 느낌으로 만들어줘”의 시대',
    body: '2025년 안드레이 카파시가 말한 바이브 코딩은 문법보다 지시와 피드백이 중요해진 개발 방식을 보여줬습니다.',
    caption: '말 몇 번으로 앱이 생기는 마법 같은 경험.',
    bullets: ['작은 일기장 앱', '투두리스트', '개인 웹페이지', '반복 코딩 시간 단축'],
    accent: 'emerald',
    visual: 'vibe',
  },
  {
    eyebrow: '균열',
    title: '작은 프로젝트는 마법, 큰 프로젝트는 흔들림',
    body: '파일이 많아지고 규칙이 복잡해지면 AI는 어떤 문서를 봐야 하는지, 무엇을 실행해도 되는지, 언제 멈춰야 하는지 알기 어렵습니다.',
    caption: '문제는 “멍청함”이 아니라 업무 환경의 결핍입니다.',
    bullets: ['맥락 손실', '금지 조건 반복', '엉뚱한 파일 수정', '검증 없는 완료 선언'],
    accent: 'amber',
    visual: 'fracture',
  },
  {
    eyebrow: '비유',
    title: '아이비리그 수석 신입에게 책상만 준다면?',
    body: '회사 규칙, 보고 체계, 결재 권한, 문서 접근 범위를 알려주지 않고 “매출 두 배”를 맡기면 아무리 천재라도 제대로 일하기 어렵습니다.',
    caption: 'AI도 좋은 회사 시스템이 있어야 성과를 냅니다.',
    bullets: ['규칙', '보고', '권한', '기록', '결재'],
    accent: 'rose',
    visual: 'genius',
  },
  {
    eyebrow: 'Part 2 · 본론',
    title: '자율형 AI 에이전트 = 두뇌 + 하네스',
    body: '모델은 두뇌에 가깝습니다. 하네스는 그 두뇌가 실제 파일을 읽고, 도구를 쓰고, 결과를 검증하며, 위험한 순간에는 사람에게 묻도록 묶어주는 구조입니다.',
    caption: '힘을 없애는 장치가 아니라, 힘을 원하는 방향으로 쓰게 하는 장치.',
    bullets: ['AI 모델이라는 두뇌', '업무 환경과 통제 장치', '도구·권한·피드백 루프'],
    accent: 'blue',
    visual: 'equation',
  },
  {
    eyebrow: '구분',
    title: '프롬프트 엔지니어링을 넘어 하네스 엔지니어링으로',
    body: '프롬프트 엔지니어링이 “AI에게 어떻게 말할 것인가”라면, 하네스 엔지니어링은 “AI가 어떤 환경에서 일하게 만들 것인가”입니다.',
    caption: '말 잘하기에서, 일터 설계로.',
    bullets: ['Prompt: 지시의 문장', 'Harness: 실행 환경', 'Loop: 관찰과 피드백'],
    accent: 'emerald',
    visual: 'prompt',
  },
  {
    eyebrow: '하네스의 구성요소',
    title: '복잡한 일을 안정화하는 제어 평면',
    body: '프로젝트 문서, 실행 가능한 도구, 파일 수정 권한, 테스트 절차, 진행 기록, 승인 요청, 실패 복구 규칙이 하나의 업무 시스템을 만듭니다.',
    caption: '똑똑한 모델보다 중요한 질문: 어떤 시스템 안에서 일하게 할 것인가?',
    bullets: ['Context', 'Tools', 'Permissions', 'Tests', 'Memory', 'Approvals'],
    accent: 'amber',
    visual: 'components',
  },
  {
    eyebrow: 'Part 3 · 프로젝트',
    title: 'AI가 무엇을 하는지, 사람은 보고 있는가?',
    body: '코딩 에이전트는 터미널에서 명령을 실행하고 파일을 고치고 로그를 남깁니다. 하지만 사람은 전체 흐름과 위험 지점을 한눈에 보기 어렵습니다.',
    caption: '그래서 Ardex를 만들었습니다.',
    bullets: ['현재 작업', '막힌 지점', '산출물', '승인 대기 결정'],
    accent: 'rose',
    visual: 'question',
  },
  {
    eyebrow: 'OMX와 Ardex',
    title: '더 세게 돌리는 도구와 더 잘 보이게 하는 도구',
    body: 'OMX가 Codex를 더 체계적으로 시작하고 워크플로우를 붙이는 도구라면, Ardex는 진행 중인 작업의 상태와 위험 지점을 사람이 이해하도록 보여주는 로컬 컨트롤 플레인입니다.',
    caption: 'AI 작업반 운영 도구 vs 상황판과 결재 시스템.',
    bullets: ['OMX: 워크플로우·팀 실행', 'Ardex: 가시성·승인권', '공통점: Codex 작업을 더 구조화'],
    accent: 'blue',
    visual: 'compare',
  },
  {
    eyebrow: 'Ardex Architecture',
    title: '내 컴퓨터 안의 로컬 자율성 컨트롤 플레인',
    body: 'Ardex는 로컬 CLI, Codex skill, hooks, SQLite state, 그리고 127.0.0.1 대시보드로 Codex 작업의 상태를 기록하고 보여줍니다.',
    caption: '클라우드가 아니라, 내 로컬에서 보이는 하네스 상태.',
    bullets: ['Local CLI', 'Codex skill', 'Hooks', 'SQLite state', '127.0.0.1 dashboard'],
    accent: 'emerald',
    visual: 'architecture',
  },
  {
    eyebrow: 'Dashboard',
    title: '로그가 아니라 프로젝트 상태를 본다',
    body: '대시보드는 project review, current focus, readiness, visible outputs, open asks, scale risk를 우선적으로 보여줍니다.',
    caption: '텍스트 로그에서, 조종석으로.',
    bullets: ['Visible outputs', 'Open asks', 'Scale risk', 'Readiness'],
    accent: 'amber',
    visual: 'dashboard',
  },
  {
    eyebrow: 'Decision Queue',
    title: '사람이 개입해야 하는 순간을 분리한다',
    body: 'AI가 “이 산출물을 채택할까요?”, “시각적 결과를 승인할까요?”라고 묻는 순간, 사람은 로그를 뒤지지 않고 승인하거나 반려합니다.',
    caption: '자율성은 주되, 승인권은 회수할 수 있어야 합니다.',
    bullets: ['ask answer', 'evidence accept / reject', 'visual scenario approve / reject'],
    accent: 'emerald',
    visual: 'decision',
  },
  {
    eyebrow: '정확한 경계',
    title: 'Ardex는 무인 AI 군단이 아니다',
    body: 'Ardex의 Phase A autonomy primitives는 visibility record, 즉 가시성 기록을 제공하는 단계입니다. subagent 실행, worktree 생성, patch merge를 데몬이 직접 하는 도구는 아닙니다.',
    caption: '차별점은 자동 실행의 양이 아니라, 이해 가능한 통제입니다.',
    bullets: ['Visibility record', 'Not auto-subagent runner', 'Not auto-worktree merger'],
    accent: 'rose',
    visual: 'boundary',
  },
  {
    eyebrow: '차별점',
    title: 'AI 작업반의 상황판과 결재 시스템',
    body: 'Ardex는 AI가 일하는 과정을 사람이 이해할 수 있게 만들고, 필요한 순간에 통제권을 회수할 수 있게 만드는 도구입니다.',
    caption: 'AI를 방치하지도, 손으로 하나하나 감시하지도 않는 중간지대.',
    bullets: ['진행 상황', '위험 지점', '승인 대기', '보이는 산출물'],
    accent: 'blue',
    visual: 'difference',
  },
  {
    eyebrow: 'Part 4 · 결론',
    title: 'AI에게는 자율성을, 사람에게는 가시성과 승인권을',
    body: '바이브 코딩은 가능성을 보여줬습니다. 하지만 책임 있는 프로젝트에는 규칙, 기록, 도구, 권한, 승인 절차가 필요합니다.',
    caption: 'AI는 위험한 자동화 도구가 아니라, 함께 일할 수 있는 파트너가 될 수 있습니다.',
    bullets: ['Autonomy', 'Visibility', 'Approval', 'Recovery'],
    accent: 'amber',
    visual: 'future',
  },
  {
    eyebrow: 'Thank you',
    title: '좋은 AI도 좋은 시스템이 있어야 성과를 냅니다',
    body: '앞으로 AI를 사용할 때 “질문을 어떻게 던질까?”뿐 아니라 “이 AI가 제대로 일하려면 어떤 환경과 규칙이 필요할까?”를 함께 고민해보면 좋겠습니다.',
    caption: '이상으로 발표를 마치겠습니다. 들어주셔서 감사합니다.',
    bullets: ['Harness Engineering', 'Ardex', 'Human-in-the-loop control plane'],
    accent: 'emerald',
    visual: 'thanks',
  },
]

const accentClasses: Record<Slide['accent'], string> = {
  blue: 'text-sky-300 border-sky-300/35 bg-sky-400/10 shadow-sky-500/20',
  emerald: 'text-emerald-300 border-emerald-300/35 bg-emerald-400/10 shadow-emerald-500/20',
  amber: 'text-amber-300 border-amber-300/35 bg-amber-400/10 shadow-amber-500/20',
  rose: 'text-rose-300 border-rose-300/35 bg-rose-400/10 shadow-rose-500/20',
}

const accentTextClasses: Record<Slide['accent'], string> = {
  blue: 'text-sky-300',
  emerald: 'text-emerald-300',
  amber: 'text-amber-300',
  rose: 'text-rose-300',
}

const accentGlow: Record<Slide['accent'], string> = {
  blue: 'rgba(56, 189, 248, 0.32)',
  emerald: 'rgba(52, 211, 153, 0.28)',
  amber: 'rgba(251, 191, 36, 0.28)',
  rose: 'rgba(251, 113, 133, 0.26)',
}

function pickByStep<T>(step: number, entries: [number, T][]): T {
  let current = entries[0][1]
  for (const [threshold, value] of entries) {
    if (step >= threshold) current = value
  }
  return current
}

function normalizeStep(step: number): number {
  return Math.min(Math.max(step, 0), TOTAL_STEPS - 1)
}

function StageBackground({ step, reducedMotion }: { step: number; reducedMotion: boolean }) {
  const activeSlide = slides[normalizeStep(step)]

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#05070a]">
      <motion.div
        className="absolute inset-0"
        animate={{
          backgroundColor: pickByStep(step, [
            [0, '#05070a'],
            [4, '#061018'],
            [7, '#090c12'],
            [10, '#0b0a08'],
            [12, '#0b0709'],
            [14, '#050b09'],
          ]),
        }}
        transition={{ duration: reducedMotion ? 0 : 1.2, ease: 'easeInOut' }}
      />

      <div
        className="absolute inset-0 opacity-[0.11]"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(148,163,184,0.34) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.3) 1px, transparent 1px)',
          backgroundSize: '54px 54px',
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
            'linear-gradient(135deg, rgba(255,255,255,0.35) 1px, transparent 1px)',
          backgroundSize: '112px 112px',
        }}
      />

      <motion.div
        className="absolute left-[7%] top-[10%] h-64 w-64 rounded-full blur-3xl"
        animate={{
          backgroundColor: accentGlow[activeSlide.accent],
          scale: reducedMotion ? 1 : [1, 1.08, 1],
          x: reducedMotion ? 0 : pickByStep(step, [[0, 0], [4, 90], [8, 240], [12, 120]]),
        }}
        transition={{ duration: reducedMotion ? 0 : 7, repeat: reducedMotion ? 0 : Infinity }}
      />
      <motion.div
        className="absolute bottom-[-18%] right-[-5%] h-[34rem] w-[34rem] rounded-full blur-3xl"
        animate={{
          backgroundColor: accentGlow[activeSlide.accent],
          opacity: 0.55,
          scale: reducedMotion ? 1 : [1, 0.94, 1.06, 1],
        }}
        transition={{ duration: reducedMotion ? 0 : 10, repeat: reducedMotion ? 0 : Infinity }}
      />

      <SignalNetwork step={step} reducedMotion={reducedMotion} />

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(5,7,10,0.28)_52%,rgba(5,7,10,0.92)_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.04),transparent_13%,transparent_78%,rgba(0,0,0,0.55))]" />
    </div>
  )
}

function SignalNetwork({ step, reducedMotion }: { step: number; reducedMotion: boolean }) {
  const activeSlide = slides[normalizeStep(step)]
  const pulseOpacity = step >= 4 ? 0.7 : 0.36

  return (
    <div className="absolute inset-0">
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1600 900" role="presentation">
        <defs>
          <linearGradient id="signalGradient" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(56,189,248,0.05)" />
            <stop offset="48%" stopColor="rgba(148,163,184,0.42)" />
            <stop offset="100%" stopColor="rgba(52,211,153,0.08)" />
          </linearGradient>
        </defs>
        {[
          'M110 188 H470 V388 H820 V610 H1480',
          'M1450 166 H1030 V318 H720 V505 H185',
          'M255 750 H612 V214 H1038 V700 H1370',
          'M82 455 H360 V590 H690 V308 H1510',
        ].map((path, index) => (
          <motion.path
            key={path}
            d={path}
            fill="none"
            stroke="url(#signalGradient)"
            strokeLinecap="round"
            strokeWidth={index === 0 ? 3 : 2}
            initial={false}
            animate={{ pathLength: step >= 4 ? 1 : 0.42, opacity: pulseOpacity }}
            transition={{ duration: reducedMotion ? 0 : 1.4, delay: index * 0.08 }}
          />
        ))}
      </svg>

      {[0, 1, 2].map((index) => (
        <motion.div
          key={index}
          className={`absolute h-2.5 w-2.5 rounded-full ${accentTextClasses[activeSlide.accent]} shadow-[0_0_24px_currentColor]`}
          style={{ backgroundColor: 'currentColor' }}
          animate={
            reducedMotion
              ? { opacity: 0.55 }
              : {
                  opacity: [0, 1, 0],
                  left: ['10%', '36%', '64%', '88%'],
                  top: index === 0 ? ['20%', '20%', '45%', '67%'] : index === 1 ? ['50%', '62%', '36%', '36%'] : ['82%', '24%', '24%', '76%'],
                }
          }
          transition={{ duration: reducedMotion ? 0 : 6 + index, delay: reducedMotion ? 0 : index * 0.9, repeat: reducedMotion ? 0 : Infinity }}
        />
      ))}
    </div>
  )
}

export function Stage({ step }: StageProps) {
  const shouldReduceMotion = useReducedMotion()
  const reducedMotion = Boolean(shouldReduceMotion)
  const activeStep = normalizeStep(step)

  return (
    <div className="absolute inset-0 overflow-hidden font-sans text-white">
      <StageBackground step={activeStep} reducedMotion={reducedMotion} />

      <div className="absolute left-8 top-7 z-20 flex items-center gap-3 text-[0.7rem] uppercase tracking-[0.28em] text-white/45">
        <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_18px_rgba(52,211,153,0.9)]" />
        Harness Engineering · Ardex Control Plane
      </div>

      <div className="absolute right-8 top-7 z-20 rounded-full border border-white/10 bg-black/25 px-4 py-2 font-mono text-[0.68rem] uppercase tracking-[0.22em] text-white/45 backdrop-blur-md">
        step {String(activeStep + 1).padStart(2, '0')} / {String(TOTAL_STEPS).padStart(2, '0')}
      </div>

      {slides.map((slide, index) => (
        <SlideScene
          key={slide.title}
          index={index}
          reducedMotion={reducedMotion}
          slide={slide}
          step={activeStep}
        />
      ))}

      <TimelineRail step={activeStep} />
    </div>
  )
}

function SlideScene({
  index,
  reducedMotion,
  slide,
  step,
}: {
  index: number
  reducedMotion: boolean
  slide: Slide
  step: number
}) {
  const active = step === index
  const distance = index - step

  return (
    <motion.section
      aria-hidden={!active}
      className="absolute inset-0 z-10 grid grid-cols-[0.95fr_1.05fr] gap-9 px-20 py-20 [word-break:keep-all]"
      initial={false}
      animate={{
        opacity: active ? 1 : 0,
        scale: active ? 1 : 0.985,
        x: reducedMotion ? 0 : distance * 34,
        filter: active ? 'blur(0px)' : 'blur(8px)',
      }}
      transition={{ duration: reducedMotion ? 0.08 : 0.75, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="relative z-10 flex min-w-0 flex-col justify-center">
        <motion.div
          className={`mb-8 w-fit rounded-full border px-4 py-2 font-mono text-[0.72rem] uppercase tracking-[0.24em] shadow-2xl backdrop-blur-md ${accentClasses[slide.accent]}`}
          initial={false}
          animate={{ opacity: active ? 1 : 0, y: active ? 0 : 12 }}
          transition={{ duration: reducedMotion ? 0 : 0.55, delay: reducedMotion ? 0 : 0.05 }}
        >
          {slide.eyebrow}
        </motion.div>
        <motion.h1
          className="max-w-[11ch] font-serif text-[4.7rem] font-black leading-[1.05] tracking-[-0.08em] text-white drop-shadow-[0_24px_70px_rgba(0,0,0,0.65)]"
          initial={false}
          animate={{ opacity: active ? 1 : 0, y: active ? 0 : 26 }}
          transition={{ duration: reducedMotion ? 0 : 0.65, delay: reducedMotion ? 0 : 0.11 }}
        >
          {slide.title}
        </motion.h1>
        <motion.p
          className="mt-7 max-w-[35rem] text-[1.34rem] font-medium leading-[1.72] tracking-[-0.045em] text-slate-200/86"
          initial={false}
          animate={{ opacity: active ? 1 : 0, y: active ? 0 : 24 }}
          transition={{ duration: reducedMotion ? 0 : 0.62, delay: reducedMotion ? 0 : 0.18 }}
        >
          {slide.body}
        </motion.p>
        <motion.p
          className={`mt-7 max-w-[34rem] border-l-2 pl-5 text-[1.05rem] font-semibold leading-[1.6] tracking-[-0.035em] ${accentTextClasses[slide.accent]}`}
          initial={false}
          animate={{ opacity: active ? 1 : 0, y: active ? 0 : 18 }}
          transition={{ duration: reducedMotion ? 0 : 0.52, delay: reducedMotion ? 0 : 0.25 }}
        >
          {slide.caption}
        </motion.p>
      </div>

      <div className="relative z-10 flex items-center justify-center">
        <VisualPanel active={active} reducedMotion={reducedMotion} slide={slide} step={step} />
      </div>
    </motion.section>
  )
}

function VisualPanel({
  active,
  reducedMotion,
  slide,
  step,
}: {
  active: boolean
  reducedMotion: boolean
  slide: Slide
  step: number
}) {
  const visual = (() => {
    switch (slide.visual) {
      case 'hook':
        return <HookVisual reducedMotion={reducedMotion} slide={slide} />
      case 'vibe':
        return <VibeVisual reducedMotion={reducedMotion} slide={slide} />
      case 'fracture':
        return <FractureVisual reducedMotion={reducedMotion} slide={slide} />
      case 'genius':
        return <GeniusVisual reducedMotion={reducedMotion} slide={slide} />
      case 'equation':
        return <EquationVisual slide={slide} />
      case 'prompt':
        return <PromptHarnessVisual slide={slide} />
      case 'components':
        return <ComponentsVisual reducedMotion={reducedMotion} slide={slide} />
      case 'question':
        return <VisibilityQuestionVisual slide={slide} />
      case 'compare':
        return <CompareVisual />
      case 'architecture':
        return <ArchitectureVisual reducedMotion={reducedMotion} slide={slide} />
      case 'dashboard':
        return <DashboardVisual />
      case 'decision':
        return <DecisionVisual reducedMotion={reducedMotion} slide={slide} />
      case 'boundary':
        return <BoundaryVisual slide={slide} />
      case 'difference':
        return <DifferenceVisual slide={slide} />
      case 'future':
        return <FutureVisual reducedMotion={reducedMotion} slide={slide} />
      case 'thanks':
        return <ThanksVisual slide={slide} />
    }
  })()

  return (
    <motion.div
      className="relative w-full"
      initial={false}
      animate={{ opacity: active ? 1 : 0, y: active ? 0 : 28, rotateX: active || reducedMotion ? 0 : 6 }}
      transition={{ duration: reducedMotion ? 0.08 : 0.68, ease: [0.22, 1, 0.36, 1], delay: reducedMotion ? 0 : 0.14 }}
    >
      <div className="absolute -inset-10 rounded-[3rem] bg-white/[0.025] blur-2xl" />
      {visual}
      <MiniBullets bullets={slide.bullets ?? []} accent={slide.accent} reducedMotion={reducedMotion} step={step} />
    </motion.div>
  )
}

function Chrome({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-white/12 bg-[#071017]/82 p-5 shadow-[0_30px_120px_rgba(0,0,0,0.58)] backdrop-blur-xl">
      <div className="mb-5 flex items-center justify-between border-b border-white/8 pb-4 font-mono text-[0.68rem] uppercase tracking-[0.22em] text-white/42">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-400/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-300/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-300/80" />
        </div>
        <span>{label}</span>
      </div>
      {children}
    </div>
  )
}

function HookVisual({ reducedMotion, slide }: { reducedMotion: boolean; slide: Slide }) {
  return (
    <Chrome label="question loop">
      <div className="grid gap-4">
        {['과제 초안', '레포트 요약', '번역', '간단한 코딩'].map((item, index) => (
          <motion.div
            key={item}
            className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.04] px-5 py-4"
            animate={reducedMotion ? { x: 0 } : { x: [0, index % 2 === 0 ? 8 : -8, 0] }}
            transition={{ duration: reducedMotion ? 0 : 4 + index, repeat: reducedMotion ? 0 : Infinity }}
          >
            <span className="text-lg font-semibold tracking-[-0.04em] text-white/88">{item}</span>
            <span className={`font-mono text-xs ${accentTextClasses[slide.accent]}`}>AI 처리 완료</span>
          </motion.div>
        ))}
        <div className="mt-2 rounded-3xl border border-sky-300/20 bg-sky-300/10 p-6 text-center">
          <p className="font-serif text-4xl font-black tracking-[-0.08em] text-white">그런데 복잡해지면?</p>
        </div>
      </div>
    </Chrome>
  )
}

function VibeVisual({ reducedMotion, slide }: { reducedMotion: boolean; slide: Slide }) {
  return (
    <Chrome label="vibe coding">
      <div className="space-y-4 font-mono text-sm">
        {[
          ['user', '이런 느낌으로 앱 만들어줘'],
          ['ai', 'UI 생성 · 상태 관리 · 오류 수정'],
          ['user', '버튼 조금 작게, 분위기는 더 밝게'],
          ['ai', '변경 적용 완료'],
        ].map(([role, text], index) => (
          <motion.div
            key={text}
            className="rounded-2xl border border-white/8 bg-black/25 p-4"
            animate={reducedMotion ? { opacity: 1 } : { opacity: [0.58, 1, 0.58] }}
            transition={{ duration: reducedMotion ? 0 : 3.2, delay: reducedMotion ? 0 : index * 0.35, repeat: reducedMotion ? 0 : Infinity }}
          >
            <span className={role === 'user' ? 'text-white/45' : accentTextClasses[slide.accent]}>{role}</span>
            <p className="mt-2 text-lg tracking-[-0.04em] text-white/90">{text}</p>
          </motion.div>
        ))}
      </div>
    </Chrome>
  )
}

function FractureVisual({ reducedMotion, slide }: { reducedMotion: boolean; slide: Slide }) {
  return (
    <Chrome label="context drift">
      <div className="relative h-[27rem] overflow-hidden rounded-3xl border border-white/8 bg-black/25 p-6">
        {['조건 A 기억', '금지 파일 보호', '테스트 실행', '승인 요청'].map((item, index) => (
          <motion.div
            key={item}
            className="absolute left-6 right-6 rounded-2xl border border-white/10 bg-white/[0.045] px-5 py-4"
            style={{ top: `${index * 24 + 8}%` }}
            animate={reducedMotion ? { x: 0, opacity: 1 } : { x: index % 2 === 0 ? [0, 42, -18, 0] : [0, -48, 16, 0], opacity: [1, 0.58, 0.82, 1] }}
            transition={{ duration: reducedMotion ? 0 : 5, delay: reducedMotion ? 0 : index * 0.2, repeat: reducedMotion ? 0 : Infinity }}
          >
            <span className="font-mono text-xs text-white/35">lost constraint #{index + 1}</span>
            <p className="mt-1 text-xl font-bold tracking-[-0.05em] text-white">{item}</p>
          </motion.div>
        ))}
        <div className={`absolute bottom-6 left-6 right-6 rounded-2xl border p-5 text-center ${accentClasses[slide.accent]}`}>
          <p className="font-serif text-3xl font-black tracking-[-0.08em]">환경이 없으면 지능도 흔들립니다</p>
        </div>
      </div>
    </Chrome>
  )
}

function GeniusVisual({ reducedMotion, slide }: { reducedMotion: boolean; slide: Slide }) {
  return (
    <Chrome label="company system">
      <div className="grid grid-cols-[0.9fr_1.1fr] gap-5">
        <div className="rounded-[1.7rem] border border-white/10 bg-white/[0.04] p-6 text-center">
          <div className="mx-auto grid h-36 w-36 place-items-center rounded-full border border-white/12 bg-white/[0.045] text-6xl shadow-[0_0_60px_rgba(255,255,255,0.08)]">🧠</div>
          <p className="mt-6 font-serif text-3xl font-black tracking-[-0.07em] text-white">천재 신입</p>
          <p className="mt-2 text-sm leading-6 text-white/52">능력은 크지만 업무 시스템은 모름</p>
        </div>
        <div className="grid gap-3">
          {slide.bullets?.map((item, index) => (
            <motion.div
              key={item}
              className="rounded-2xl border border-white/8 bg-black/25 px-5 py-4"
              animate={reducedMotion ? { borderColor: 'rgba(255,255,255,0.08)' } : { borderColor: ['rgba(255,255,255,0.08)', accentGlow[slide.accent], 'rgba(255,255,255,0.08)'] }}
              transition={{ duration: reducedMotion ? 0 : 4, delay: reducedMotion ? 0 : index * 0.25, repeat: reducedMotion ? 0 : Infinity }}
            >
              <span className={`font-mono text-xs ${accentTextClasses[slide.accent]}`}>system/{index + 1}</span>
              <p className="mt-1 text-xl font-bold tracking-[-0.05em] text-white">{item}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </Chrome>
  )
}

function EquationVisual({ slide }: { slide: Slide }) {
  return (
    <Chrome label="agent equation">
      <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-4 text-center">
        <EquationNode icon="🧠" label="AI 모델" sub="두뇌" accent={slide.accent} />
        <span className="font-serif text-5xl font-black text-white/35">+</span>
        <EquationNode icon="🧷" label="하네스" sub="업무 환경" accent={slide.accent} />
        <span className="font-serif text-5xl font-black text-white/35">=</span>
        <EquationNode icon="⚙️" label="에이전트" sub="실행 루프" accent={slide.accent} />
      </div>
      <div className="mt-7 rounded-3xl border border-white/8 bg-black/25 p-6">
        <p className="text-center font-serif text-4xl font-black tracking-[-0.08em] text-white">의도를 안전한 행동으로 바꾸는 장치</p>
      </div>
    </Chrome>
  )
}

function EquationNode({
  accent,
  icon,
  label,
  sub,
}: {
  accent: Slide['accent']
  icon: string
  label: string
  sub: string
}) {
  return (
    <div className="rounded-[1.6rem] border border-white/10 bg-white/[0.04] p-5">
      <div className="text-5xl">{icon}</div>
      <p className="mt-4 text-xl font-black tracking-[-0.06em] text-white">{label}</p>
      <p className={`mt-1 font-mono text-xs uppercase tracking-[0.18em] ${accentTextClasses[accent]}`}>{sub}</p>
    </div>
  )
}

function PromptHarnessVisual({ slide }: { slide: Slide }) {
  return (
    <Chrome label="prompt vs harness">
      <div className="grid grid-cols-2 gap-5">
        <ContrastCard title="Prompt" subtitle="어떻게 말할 것인가" items={['문장', '역할', '예시', '톤']} tone="muted" />
        <ContrastCard title="Harness" subtitle="어떤 환경에서 일하게 할 것인가" items={['도구', '권한', '검증', '승인']} tone={slide.accent} />
      </div>
    </Chrome>
  )
}

function ContrastCard({
  items,
  subtitle,
  title,
  tone,
}: {
  items: string[]
  subtitle: string
  title: string
  tone: Slide['accent'] | 'muted'
}) {
  const color = tone === 'muted' ? 'text-white/45 border-white/10 bg-white/[0.035]' : accentClasses[tone]

  return (
    <div className={`rounded-[1.8rem] border p-6 ${color}`}>
      <p className="font-serif text-4xl font-black tracking-[-0.08em] text-white">{title}</p>
      <p className="mt-2 text-sm font-semibold leading-6 tracking-[-0.035em] text-white/58">{subtitle}</p>
      <div className="mt-6 grid gap-3">
        {items.map((item) => (
          <div key={item} className="rounded-xl border border-white/8 bg-black/20 px-4 py-3 text-lg font-bold tracking-[-0.05em] text-white/86">
            {item}
          </div>
        ))}
      </div>
    </div>
  )
}

function ComponentsVisual({ reducedMotion, slide }: { reducedMotion: boolean; slide: Slide }) {
  return (
    <Chrome label="control plane modules">
      <div className="grid grid-cols-2 gap-4">
        {slide.bullets?.map((item, index) => (
          <motion.div
            key={item}
            className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"
            animate={reducedMotion ? { y: 0, borderColor: 'rgba(255,255,255,0.1)' } : { y: [0, -8, 0], borderColor: ['rgba(255,255,255,0.1)', accentGlow[slide.accent], 'rgba(255,255,255,0.1)'] }}
            transition={{ duration: reducedMotion ? 0 : 4.2, delay: reducedMotion ? 0 : index * 0.22, repeat: reducedMotion ? 0 : Infinity }}
          >
            <span className={`font-mono text-[0.68rem] uppercase tracking-[0.22em] ${accentTextClasses[slide.accent]}`}>module {index + 1}</span>
            <p className="mt-4 text-2xl font-black tracking-[-0.07em] text-white">{item}</p>
          </motion.div>
        ))}
      </div>
    </Chrome>
  )
}

function VisibilityQuestionVisual({ slide }: { slide: Slide }) {
  return (
    <Chrome label="operator visibility">
      <div className="relative h-[27rem] rounded-3xl border border-white/8 bg-black/30 p-6">
        <div className="absolute left-8 top-8 w-60 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <p className="font-mono text-xs text-white/40">terminal stream</p>
          <div className="mt-4 space-y-2 font-mono text-xs text-white/58">
            <p>$ codex run</p>
            <p>patching files...</p>
            <p>checking output...</p>
            <p className={accentTextClasses[slide.accent]}>waiting for approval</p>
          </div>
        </div>
        <div className="absolute bottom-8 right-8 w-72 rounded-[1.7rem] border border-rose-300/25 bg-rose-400/10 p-6 shadow-[0_0_70px_rgba(251,113,133,0.16)]">
          <p className="font-serif text-4xl font-black tracking-[-0.08em] text-white">사람은 어디를 봐야 할까?</p>
          <p className="mt-4 text-sm leading-6 text-white/60">로그는 많지만, 결정과 위험은 흩어져 있습니다.</p>
        </div>
      </div>
    </Chrome>
  )
}

function CompareVisual() {
  return (
    <Chrome label="positioning">
      <div className="grid grid-cols-2 gap-5">
        <ProductCard name="OMX" role="AI 작업반을 더 잘 굴리는 도구" details={['워크플로우 레이어', '$deep-interview · $team · $ralph', '.omx 계획·로그·메모리']} />
        <ProductCard name="Ardex" role="작업반이 무엇을 하는지 보는 상황판" details={['로컬 컨트롤 플레인', '가시성 기록', '승인·반려 결정 큐']} active />
      </div>
    </Chrome>
  )
}

function ProductCard({ active = false, details, name, role }: { active?: boolean; details: string[]; name: string; role: string }) {
  return (
    <div className={`rounded-[1.8rem] border p-6 ${active ? 'border-sky-300/30 bg-sky-400/10' : 'border-white/10 bg-white/[0.035]'}`}>
      <p className="font-mono text-xs uppercase tracking-[0.25em] text-white/42">{active ? 'visibility' : 'workflow'}</p>
      <p className="mt-3 font-serif text-5xl font-black tracking-[-0.08em] text-white">{name}</p>
      <p className="mt-4 min-h-[3.5rem] text-lg font-bold leading-7 tracking-[-0.05em] text-white/82">{role}</p>
      <div className="mt-6 space-y-3">
        {details.map((detail) => (
          <div key={detail} className="rounded-xl border border-white/8 bg-black/20 px-4 py-3 text-sm font-semibold tracking-[-0.035em] text-white/62">
            {detail}
          </div>
        ))}
      </div>
    </div>
  )
}

function ArchitectureVisual({ reducedMotion, slide }: { reducedMotion: boolean; slide: Slide }) {
  const items = slide.bullets ?? []

  return (
    <Chrome label="127.0.0.1 control plane">
      <div className="relative grid grid-cols-5 gap-3">
        {items.map((item, index) => (
          <motion.div
            key={item}
            className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-center"
            animate={reducedMotion ? { y: 0 } : { y: [0, index % 2 === 0 ? -8 : 8, 0] }}
            transition={{ duration: reducedMotion ? 0 : 4.8, delay: reducedMotion ? 0 : index * 0.18, repeat: reducedMotion ? 0 : Infinity }}
          >
            <div className={`mx-auto grid h-12 w-12 place-items-center rounded-2xl border ${accentClasses[slide.accent]}`}>{index + 1}</div>
            <p className="mt-4 text-sm font-black leading-5 tracking-[-0.04em] text-white">{item}</p>
          </motion.div>
        ))}
      </div>
      <div className="mt-7 rounded-3xl border border-emerald-300/20 bg-emerald-400/10 p-6 text-center">
        <p className="font-mono text-sm uppercase tracking-[0.24em] text-emerald-300">localhost</p>
        <p className="mt-2 font-serif text-4xl font-black tracking-[-0.08em] text-white">127.0.0.1에서 열리는 대시보드</p>
      </div>
    </Chrome>
  )
}

function DashboardVisual() {
  return (
    <Chrome label="ardex dashboard">
      <div className="relative overflow-hidden rounded-[1.6rem] border border-white/10 bg-black/35">
        <img
          alt="Ardex 대시보드의 roadmap, visible outputs, approval 영역이 보이는 스크린샷"
          className="h-[27rem] w-full object-cover object-left-top opacity-88 saturate-[0.92]"
          src="/ardex/visible-outputs-rich-folded.png"
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_35%,transparent_0%,rgba(0,0,0,0.12)_30%,rgba(0,0,0,0.72)_100%)]" />
        <Annotation className="right-7 top-10" label="Visible outputs" />
        <Annotation className="bottom-8 left-8" label="Project review" />
        <Annotation className="bottom-8 right-10" label="Approve / Reject" />
      </div>
    </Chrome>
  )
}

function Annotation({ className, label }: { className: string; label: string }) {
  return (
    <div className={`absolute rounded-full border border-amber-300/35 bg-amber-300/12 px-4 py-2 font-mono text-[0.68rem] uppercase tracking-[0.2em] text-amber-200 shadow-[0_0_30px_rgba(251,191,36,0.22)] backdrop-blur-md ${className}`}>
      {label}
    </div>
  )
}

function DecisionVisual({ reducedMotion, slide }: { reducedMotion: boolean; slide: Slide }) {
  return (
    <Chrome label="decision queue">
      <div className="grid grid-cols-[1fr_0.9fr] gap-5">
        <div className="overflow-hidden rounded-[1.6rem] border border-white/10 bg-black/30">
          <img
            alt="Ardex visible output approval 패널과 커맨드 팔레트가 보이는 스크린샷"
            className="h-[25rem] w-full object-cover object-right-top opacity-86"
            src="/ardex/cleanup-crud-release-onboarding.png"
          />
        </div>
        <div className="grid gap-3">
          {['Approve', 'Reject', 'Comment'].map((action, index) => (
            <motion.div
              key={action}
              className={`rounded-2xl border p-5 ${index === 0 ? accentClasses[slide.accent] : 'border-white/10 bg-white/[0.04] text-white/74'}`}
              animate={reducedMotion ? { scale: 1 } : { scale: index === 0 ? [1, 1.03, 1] : 1 }}
              transition={{ duration: reducedMotion ? 0 : 3, repeat: reducedMotion ? 0 : Infinity }}
            >
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/45">human gate</p>
              <p className="mt-2 text-2xl font-black tracking-[-0.07em] text-white">{action}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </Chrome>
  )
}

function BoundaryVisual({ slide }: { slide: Slide }) {
  return (
    <Chrome label="phase a primitives">
      <div className="grid gap-4">
        <div className={`rounded-[1.8rem] border p-6 ${accentClasses[slide.accent]}`}>
          <p className="font-serif text-4xl font-black tracking-[-0.08em] text-white">하는 일</p>
          <p className="mt-3 text-2xl font-bold tracking-[-0.06em] text-white/90">Visibility record · 가시성 기록</p>
        </div>
        {['Codex subagent를 마구 실행', 'worktree를 자동 생성', 'patch를 자동 merge'].map((item) => (
          <div key={item} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.035] px-5 py-4">
            <span className="text-lg font-bold tracking-[-0.05em] text-white/70">{item}</span>
            <span className="rounded-full border border-rose-300/25 bg-rose-400/10 px-3 py-1 font-mono text-xs uppercase tracking-[0.18em] text-rose-200">not daemon</span>
          </div>
        ))}
      </div>
    </Chrome>
  )
}

function DifferenceVisual({ slide }: { slide: Slide }) {
  return (
    <Chrome label="situation board">
      <div className="grid grid-cols-2 gap-4">
        {slide.bullets?.map((item, index) => (
          <div key={item} className="rounded-[1.7rem] border border-white/10 bg-white/[0.04] p-6">
            <p className={`font-mono text-xs uppercase tracking-[0.24em] ${accentTextClasses[slide.accent]}`}>panel {index + 1}</p>
            <p className="mt-4 min-h-16 text-3xl font-black leading-[1.08] tracking-[-0.08em] text-white">{item}</p>
          </div>
        ))}
      </div>
    </Chrome>
  )
}

function FutureVisual({ reducedMotion, slide }: { reducedMotion: boolean; slide: Slide }) {
  return (
    <Chrome label="coexistence protocol">
      <div className="relative grid h-[26rem] place-items-center rounded-[2rem] border border-white/8 bg-black/25">
        <div className="absolute inset-10 rounded-full border border-white/8" />
        <div className="absolute inset-20 rounded-full border border-white/10" />
        <motion.div
          className={`grid h-48 w-48 place-items-center rounded-full border text-center shadow-[0_0_80px_currentColor] ${accentClasses[slide.accent]}`}
          animate={reducedMotion ? { scale: 1 } : { scale: [1, 1.05, 1] }}
          transition={{ duration: reducedMotion ? 0 : 5, repeat: reducedMotion ? 0 : Infinity }}
        >
          <p className="font-serif text-4xl font-black tracking-[-0.08em] text-white">AI + Human</p>
        </motion.div>
        {slide.bullets?.map((item, index) => (
          <div
            key={item}
            className="absolute rounded-full border border-white/10 bg-white/[0.055] px-5 py-3 text-sm font-black tracking-[-0.04em] text-white/82 backdrop-blur-md"
            style={{
              left: index === 0 ? '10%' : index === 1 ? '68%' : index === 2 ? '14%' : '70%',
              top: index === 0 ? '18%' : index === 1 ? '22%' : index === 2 ? '72%' : '70%',
            }}
          >
            {item}
          </div>
        ))}
      </div>
    </Chrome>
  )
}

function ThanksVisual({ slide }: { slide: Slide }) {
  return (
    <Chrome label="closing">
      <div className="grid min-h-[28rem] place-items-center rounded-[2rem] border border-emerald-300/20 bg-emerald-400/10 p-10 text-center">
        <p className="font-mono text-sm uppercase tracking-[0.28em] text-emerald-200">Harness Engineering</p>
        <p className="mt-6 max-w-[9ch] font-serif text-7xl font-black leading-[1.02] tracking-[-0.09em] text-white">질문보다 시스템</p>
        <p className="mt-7 max-w-lg text-lg font-semibold leading-8 tracking-[-0.04em] text-white/68">{slide.caption}</p>
      </div>
    </Chrome>
  )
}

function MiniBullets({ bullets, accent, reducedMotion, step }: { bullets: string[]; accent: Slide['accent']; reducedMotion: boolean; step: number }) {
  if (bullets.length === 0) return null

  return (
    <div className="mt-5 flex flex-wrap gap-2">
      {bullets.slice(0, 5).map((bullet, index) => (
        <motion.span
          key={`${step}-${bullet}`}
          className={`rounded-full border px-3 py-1.5 font-mono text-[0.66rem] uppercase tracking-[0.16em] ${accentClasses[accent]}`}
          initial={reducedMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.35, delay: reducedMotion ? 0 : index * 0.04 }}
        >
          {bullet}
        </motion.span>
      ))}
    </div>
  )
}

function TimelineRail({ step }: { step: number }) {
  return (
    <div className="absolute bottom-6 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/10 bg-black/34 px-4 py-3 backdrop-blur-xl">
      {slides.map((slide, index) => (
        <div key={slide.title} className="relative">
          <motion.div
            className={`h-1.5 rounded-full ${index <= step ? 'bg-white' : 'bg-white/20'}`}
            animate={{ width: index === step ? 28 : 7, opacity: index <= step ? 0.95 : 0.36 }}
            transition={{ duration: 0.28 }}
          />
        </div>
      ))}
    </div>
  )
}
