import type { ReactNode, ButtonHTMLAttributes } from 'react'

export function Button({
  variant = 'primary',
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'danger' }) {
  const base =
    'inline-flex items-center justify-center min-h-11 px-5 rounded-xl font-semibold text-base transition active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100 select-none'
  const look = {
    primary: 'bg-revenue text-bg hover:brightness-110',
    ghost: 'bg-panel-2 text-ink border border-line hover:bg-line/60',
    danger: 'bg-cost/15 text-cost border border-cost/40 hover:bg-cost/25',
  }[variant]
  return <button className={`${base} ${look} ${className}`} {...rest} />
}

export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`bg-panel border border-line rounded-2xl p-4 ${className}`}>{children}</div>
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <div className="text-xs uppercase tracking-[0.18em] text-muted font-semibold">{children}</div>
}

/** Sticky bottom action bar, thumb-reachable on phones. */
export function BottomBar({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 bg-bg/90 backdrop-blur border-t border-line">
      <div className="mx-auto max-w-xl px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex gap-3">{children}</div>
    </div>
  )
}

export function Page({ children, title, onBack, right }: { children: ReactNode; title?: string; onBack?: () => void; right?: ReactNode }) {
  return (
    <div className="min-h-full flex flex-col">
      <header className="sticky top-0 z-10 bg-bg/90 backdrop-blur border-b border-line">
        <div className="mx-auto max-w-xl px-4 h-14 flex items-center gap-3">
          {onBack ? (
            <button onClick={onBack} aria-label="Back" className="min-h-11 min-w-11 -ml-2 rounded-lg text-muted hover:text-ink text-xl">
              ←
            </button>
          ) : (
            <span className="font-black tracking-tight text-lg">
              Deal<span className="text-revenue">Desk</span>
            </span>
          )}
          {title && <span className="font-semibold truncate">{title}</span>}
          <div className="ml-auto flex items-center gap-2">{right}</div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-xl px-4 py-5 pb-28 flex-1">{children}</main>
    </div>
  )
}

export const ROLE_BG: Record<string, string> = {
  revenue: 'bg-revenue/15 border-revenue/50 text-revenue',
  cost: 'bg-cost/15 border-cost/50 text-cost',
  debt: 'bg-debt/15 border-debt/50 text-debt',
  equity: 'bg-equity/15 border-equity/50 text-equity',
  cash: 'bg-cash/15 border-cash/50 text-cash',
  neutral: 'bg-panel-2 border-line text-ink',
}
