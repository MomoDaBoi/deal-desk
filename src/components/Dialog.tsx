import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Px } from '../pixel/Px'
import type { PortraitSet } from '../pixel/sprites/portraits'

export type Expression = keyof Omit<PortraitSet, 'name'>

/**
 * RPG-style dialog box: a talking portrait, a name tag, and typewriter
 * text. The portrait's mouth flaps while text is still typing. Tap the box
 * to finish the text at once. `children` renders under the text (e.g. a
 * lesson visual) once typing is done.
 */
export function Dialog({
  portrait,
  expression = 'neutral',
  name,
  text,
  speed = 14,
  children,
  className = '',
  onDone,
}: {
  portrait: PortraitSet
  expression?: Expression
  name: string
  text: string
  /** ms per character. */
  speed?: number
  children?: ReactNode
  className?: string
  onDone?: () => void
}) {
  const [shown, setShown] = useState(0)
  const [mouth, setMouth] = useState(0)
  const doneRef = useRef(false)
  const typing = shown < text.length

  useEffect(() => {
    setShown(0)
    doneRef.current = false
  }, [text])

  useEffect(() => {
    if (!typing) {
      setMouth(0)
      // Guard against the render where `text` just changed but `shown`
      // still holds the previous text's count.
      if (!doneRef.current && shown >= text.length && shown > 0) {
        doneRef.current = true
        onDone?.()
      }
      return
    }
    const id = setInterval(() => {
      setShown((n) => Math.min(text.length, n + 1))
      setMouth((m) => (m ? 0 : 1))
    }, speed)
    return () => clearInterval(id)
  }, [typing, shown, text.length, speed, onDone])

  return (
    <div
      className={`px-box px-box-paper p-3 ${className}`}
      onClick={() => typing && setShown(text.length)}
      role={typing ? 'button' : undefined}
      aria-live="polite"
    >
      <div className="flex gap-3 items-start">
        <div className="shrink-0 px-box px-box-dark p-1">
          <Px sprite={portrait[expression]} scale={2} frame={typing ? mouth : 0} title={name} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="px-eyebrow text-[#5b5670]">{name}</div>
          <p className={`mt-1 leading-relaxed min-h-[3.5rem] ${typing ? 'px-caret' : ''}`}>{text.slice(0, shown)}</p>
        </div>
      </div>
      {!typing && children}
    </div>
  )
}

/** Small speech bubble without a portrait, for one-liners. */
export function Bubble({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`px-box px-box-paper px-3 py-2 text-sm inline-block ${className}`}>{children}</div>
}
