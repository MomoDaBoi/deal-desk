import type { ReactNode, ButtonHTMLAttributes } from 'react'
import { Px } from '../pixel/Px'
import { DEAL_DESK_LOGO, ICON_BACK, ICON_COG } from '../pixel/sprites/icons'

export function Button({
  variant = 'primary',
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'danger' | 'gold' | 'paper' }) {
  const look = {
    primary: 'px-btn-primary',
    ghost: '',
    danger: 'px-btn-danger',
    gold: 'px-btn-gold',
    paper: 'px-btn-paper',
  }[variant]
  return <button className={`px-btn ${look} ${className}`} {...rest} />
}

export function Panel({
  children,
  className = '',
  tone = 'default',
}: {
  children: ReactNode
  className?: string
  tone?: 'default' | 'dark' | 'paper'
}) {
  const t = tone === 'dark' ? 'px-box-dark' : tone === 'paper' ? 'px-box-paper' : ''
  return <div className={`px-box ${t} p-4 ${className}`}>{children}</div>
}

export function Eyebrow({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`px-eyebrow text-muted ${className}`}>{children}</div>
}

/** Segmented pixel progress bar. `fraction` 0..1; `cells` how many segments. */
export function PixelBar({ fraction, cells = 20, gold = false, className = '' }: { fraction: number; cells?: number; gold?: boolean; className?: string }) {
  const on = Math.round(Math.max(0, Math.min(1, fraction)) * cells)
  return (
    <div className={`px-bar ${className}`} role="progressbar" aria-valuenow={Math.round(fraction * 100)} aria-valuemin={0} aria-valuemax={100}>
      {Array.from({ length: cells }, (_, i) => (
        <i key={i} className={i < on ? (gold ? 'gold' : 'on') : ''} />
      ))}
    </div>
  )
}

/** Sticky bottom action bar, thumb-reachable on phones. */
export function BottomBar({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 bg-bg/95 border-t-[3px] border-line-hi">
      <div className="mx-auto max-w-xl px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex gap-3">{children}</div>
    </div>
  )
}

export function Page({ children, title, onBack, right }: { children: ReactNode; title?: string; onBack?: () => void; right?: ReactNode }) {
  return (
    <div className="min-h-full flex flex-col">
      <header className="sticky top-0 z-10 bg-bg/95 border-b-[3px] border-line-hi">
        <div className="mx-auto max-w-xl px-3 h-14 flex items-center gap-3">
          {onBack ? (
            <button onClick={onBack} aria-label="Back" className="px-btn min-w-11 px-2">
              <Px sprite={ICON_BACK} scale={2} title="Back" />
            </button>
          ) : (
            <Px sprite={DEAL_DESK_LOGO} scale={2} title="Deal Desk" />
          )}
          {title && <span className="px-h2 truncate">{title}</span>}
          <div className="ml-auto flex items-center gap-2">{right}</div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-xl px-4 py-5 pb-28 flex-1">{children}</main>
    </div>
  )
}

export function SettingsButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} aria-label="Settings" className="px-btn min-w-11 px-2">
      <Px sprite={ICON_COG} scale={2} title="Settings" />
    </button>
  )
}

export const ROLE_BG: Record<string, string> = {
  revenue: 'bg-revenue/20 border-l-revenue text-revenue',
  cost: 'bg-cost/20 border-l-cost text-cost',
  debt: 'bg-debt/20 border-l-debt text-debt',
  equity: 'bg-equity/20 border-l-equity text-equity',
  cash: 'bg-cash/20 border-l-cash text-cash',
  neutral: 'bg-panel-2 border-l-line-hi text-ink',
}
