/**
 * 편집 모드 루트.
 *
 * 레이아웃:
 *   ┌──────────────────────────────────────┐
 *   │ Topbar                               │
 *   ├────────┬──────────────────┬──────────┤
 *   │ Layers │   16:9 Canvas    │ Inspect. │
 *   │   +    │                  │          │
 *   │ Assets │                  │          │
 *   └────────┴──────────────────┴──────────┘
 */

import { useEffect } from 'react'
import { LeftPanel } from './LeftPanel'
import { RightPanel } from './RightPanel'
import { CanvasArea } from './CanvasArea'
import { Topbar } from './Topbar'
import { Timeline } from './Timeline'
import {
  useStep,
  useTotalSteps,
  setEditMode,
  clearSelection,
  getSelection,
  setSelection,
  deleteElement,
  duplicateElement,
  groupElements,
  ungroupElement,
  bringToFront,
  sendToBack,
  moveForward,
  moveBackward,
  createElement,
  getScene,
  toggleKeyframeAtStep,
  copyKeyframe,
  pasteKeyframe,
} from '../scene/store'

export function EditorRoot() {
  const total = useTotalSteps()
  const [step, setStep] = useStep()

  // 키보드 핸들러 — 편집 모드용
  useEffect(() => {
    const onKey = async (e: KeyboardEvent) => {
      // input/textarea 안에서는 무시
      const target = e.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return
      }

      const meta = e.metaKey || e.ctrlKey
      const sel = Array.from(getSelection())

      // Cmd/Ctrl 조합
      if (meta) {
        switch (e.key.toLowerCase()) {
          case 'd':
            // 복제
            e.preventDefault()
            if (sel.length > 0) {
              const newIds: string[] = []
              for (const id of sel) {
                const newId = await duplicateElement(id)
                if (newId) newIds.push(newId)
              }
              if (newIds.length) setSelection(newIds)
            }
            return
          case 'g':
            e.preventDefault()
            if (e.shiftKey) {
              // 그룹 해제
              for (const id of sel) await ungroupElement(id)
            } else if (sel.length >= 1) {
              // 그룹화
              const groupId = await groupElements(sel)
              if (groupId) setSelection([groupId])
            }
            return
          case ']':
            e.preventDefault()
            if (e.shiftKey) {
              for (const id of sel) await bringToFront(id)
            } else {
              for (const id of sel) await moveForward(id)
            }
            return
          case '[':
            e.preventDefault()
            if (e.shiftKey) {
              for (const id of sel) await sendToBack(id)
            } else {
              for (const id of sel) await moveBackward(id)
            }
            return
          case 'a': {
            // 전체 선택 (현재 scene의 최상위 elements만)
            e.preventDefault()
            const scene = getScene()
            if (scene) {
              setSelection(scene.elements.map((el) => el.id))
            }
            return
          }
          case 'c': {
            if (!e.shiftKey) return
            // Cmd+Shift+C: 키프레임 복사 (현재 step, 첫 선택)
            e.preventDefault()
            if (sel.length > 0) copyKeyframe(sel[0], step)
            return
          }
          case 'v': {
            if (!e.shiftKey) return
            // Cmd+Shift+V: 키프레임 붙여넣기 (현재 step, 모든 선택)
            e.preventDefault()
            for (const id of sel) await pasteKeyframe(id, step)
            return
          }
        }
      }

      switch (e.key) {
        case 'e':
        case 'E':
          // 편집 종료
          e.preventDefault()
          setEditMode(false)
          clearSelection()
          break
        case 'ArrowRight':
        case 'PageDown':
          e.preventDefault()
          setStep(step + 1)
          break
        case 'ArrowLeft':
        case 'PageUp':
          e.preventDefault()
          setStep(step - 1)
          break
        case 'Home':
          e.preventDefault()
          setStep(0)
          break
        case 'End':
          e.preventDefault()
          setStep(total - 1)
          break
        case 'Escape':
          e.preventDefault()
          clearSelection()
          break
        case 'Backspace':
        case 'Delete':
          e.preventDefault()
          for (const id of sel) await deleteElement(id)
          clearSelection()
          break
        case 'r':
        case 'R': {
          e.preventDefault()
          const id = await createElement({ type: 'frame' })
          setSelection([id])
          break
        }
        case 't':
        case 'T': {
          e.preventDefault()
          const id = await createElement({ type: 'text' })
          setSelection([id])
          break
        }
        case 'i':
        case 'I': {
          e.preventDefault()
          const id = await createElement({ type: 'image' })
          setSelection([id])
          break
        }
        case 'k':
        case 'K': {
          e.preventDefault()
          for (const id of sel) await toggleKeyframeAtStep(id, step)
          break
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [step, setStep, total])

  return (
    <div className="fixed inset-0 flex flex-col bg-zinc-950 text-zinc-200">
      <Topbar step={step} total={total} setStep={setStep} />
      <div className="flex min-h-0 flex-1">
        <LeftPanel />
        <div className="flex min-w-0 flex-1 flex-col">
          <CanvasArea step={step} />
          <Timeline step={step} total={total} setStep={setStep} />
        </div>
        <RightPanel step={step} />
      </div>
    </div>
  )
}
