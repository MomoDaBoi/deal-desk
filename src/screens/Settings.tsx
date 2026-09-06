import { useRef, useState } from 'react'
import { useNav } from '../store/nav'
import { useProgress } from '../store/progress'
import { looksLikeAnthropicKey, useSettings, type MentorModel } from '../store/settings'
import { useUsage } from '../store/usage'
import { formatComp } from '../engine/scoring'
import { Button, Eyebrow, Page, Panel } from '../components/ui'
import { Px } from '../pixel/Px'
import { ICON_KEY, ICON_SOUND_ON, ICON_DOWNLOAD } from '../pixel/sprites/icons'
import { MODELS } from '../lib/pricing'
import { loadMentor } from '../lib/mentor'
import { PRICES, PRICING_CHECKED_ON, estimateCallCost, formatUsd } from '../lib/pricing'

export function Settings() {
  const go = useNav((s) => s.go)
  const { apiKey, mentorEnabled, model, soundOn, musicOn, setApiKey, setMentorEnabled, setModel, setSoundOn, setMusicOn } = useSettings()
  const progress = useProgress()
  const usage = useUsage()
  const [draftKey, setDraftKey] = useState(apiKey)
  const [showKey, setShowKey] = useState(false)
  const [msg, setMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const [keyTest, setKeyTest] = useState<{ state: 'idle' | 'testing' | 'ok' | 'err'; text: string }>({ state: 'idle', text: '' })
  const fileRef = useRef<HTMLInputElement>(null)

  const hasKey = apiKey.length > 0
  const totalComp = Object.values(progress.best).reduce((a, b) => a + b, 0)

  async function testKey() {
    setKeyTest({ state: 'testing', text: '' })
    const mentor = await loadMentor()
    if (!mentor) {
      setKeyTest({ state: 'err', text: 'No key saved yet.' })
      return
    }
    const r = await mentor.testKey()
    setKeyTest(r.ok ? { state: 'ok', text: 'Key works.' } : { state: 'err', text: r.error })
  }

  function saveKey() {
    const k = draftKey.trim()
    if (k && !looksLikeAnthropicKey(k)) {
      setMsg({ tone: 'err', text: 'That does not look like an Anthropic key (they start with sk-ant-). Saved anyway, but check it.' })
    } else {
      setMsg({ tone: 'ok', text: k ? 'Key saved to this browser only.' : 'Key removed. Mentor mode hidden.' })
    }
    setApiKey(k)
  }

  function doExport() {
    const json = progress.exportJSON()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `deal-desk-save-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    setMsg({ tone: 'ok', text: 'Save file downloaded.' })
  }

  async function copyExport() {
    try {
      await navigator.clipboard.writeText(progress.exportJSON())
      setMsg({ tone: 'ok', text: 'Save copied to clipboard.' })
    } catch {
      setMsg({ tone: 'err', text: 'Clipboard blocked. Use the download button.' })
    }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    const r = progress.importJSON(await f.text())
    setMsg(r.ok ? { tone: 'ok', text: 'Progress imported.' } : { tone: 'err', text: r.error })
    e.target.value = ''
  }

  async function pasteImport() {
    try {
      const text = await navigator.clipboard.readText()
      const r = progress.importJSON(text)
      setMsg(r.ok ? { tone: 'ok', text: 'Progress imported from clipboard.' } : { tone: 'err', text: r.error })
    } catch {
      setMsg({ tone: 'err', text: 'Clipboard blocked. Use the file button.' })
    }
  }

  return (
    <Page title="Settings" onBack={() => go({ name: 'ladder' })}>
      {msg && (
        <div className={`mb-4 px-box p-3 font-pixel text-[9px] ${msg.tone === 'ok' ? 'text-revenue' : 'text-cost'}`}>
          {msg.text}
        </div>
      )}

      <Panel>
        <Eyebrow className="flex items-center gap-2">
          <Px sprite={ICON_KEY} scale={2} />
          Mentor mode
        </Eyebrow>
        <p className="mt-2 text-sm text-muted">
          Paste your own Anthropic API key to unlock written-answer missions and a sarcastic MD who grades them. The key is stored only in this
          browser's localStorage and is only ever sent to api.anthropic.com. It is never included in a progress export. Leave blank for the free,
          no-AI game.
        </p>
        <label className="block mt-3 text-sm font-semibold" htmlFor="apikey">
          Anthropic API key
        </label>
        <div className="mt-1 flex gap-2">
          <input
            id="apikey"
            type={showKey ? 'text' : 'password'}
            autoComplete="off"
            spellCheck={false}
            value={draftKey}
            onChange={(e) => setDraftKey(e.target.value)}
            placeholder="sk-ant-..."
            className="px-input flex-1 min-w-0 font-mono"
          />
          <Button variant="ghost" className="shrink-0" onClick={() => setShowKey((v) => !v)} aria-label={showKey ? 'Hide key' : 'Show key'}>
            {showKey ? 'Hide' : 'Show'}
          </Button>
        </div>
        <div className="mt-3 flex gap-2">
          <Button onClick={saveKey} disabled={draftKey.trim() === apiKey}>
            Save key
          </Button>
          {hasKey && (
            <Button
              variant="danger"
              onClick={() => {
                setDraftKey('')
                setApiKey('')
                setMsg({ tone: 'ok', text: 'Key removed. Mentor mode hidden.' })
              }}
            >
              Remove
            </Button>
          )}
        </div>

        {hasKey && (
          <div className="mt-4 flex items-center justify-between gap-3">
            <span>
              <span className="font-semibold">Mentor mode</span>
              <span className="block text-xs text-muted">Show written missions and the Ask the MD button.</span>
            </span>
            <Toggle checked={mentorEnabled} onChange={setMentorEnabled} />
          </div>
        )}
        {hasKey && (
          <p className="mt-3 text-xs text-muted">
            Mentor mode adds written-answer missions the MD grades, plus an Ask the MD button on result screens.
          </p>
        )}

        {hasKey && (
          <div className="mt-4 border-t-[3px] border-line pt-4">
            <div className="text-sm font-semibold">Which MD grades you</div>
            <div className="mt-2 flex flex-col gap-2">
              {MODELS.map((m) => {
                const price = PRICES[m.id]
                const selected = model === m.id
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setModel(m.id as MentorModel)}
                    className={`px-chip text-left px-3 py-2 ${selected ? 'bg-revenue text-bg' : 'bg-panel-2 text-ink'}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-pixel text-[10px]">{m.label}</span>
                      <span className="text-xs opacity-80">
                        ${price.inputPerM.toFixed(0)} in / ${price.outputPerM.toFixed(0)} out per M tok
                      </span>
                    </div>
                    <div className="text-xs opacity-80">{m.blurb}</div>
                  </button>
                )
              })}
            </div>

            <div className="mt-3 px-box px-box-dark p-2 font-pixel text-[9px] leading-relaxed">
              About {formatUsd(estimateCallCost(model, 900, 700))} per graded answer, {formatUsd(estimateCallCost(model, 600, 500))} per Ask the MD,
              at prices checked on {PRICING_CHECKED_ON}.
            </div>

            <div className="mt-3 flex items-center gap-3 flex-wrap">
              <Button variant="ghost" onClick={testKey} disabled={keyTest.state === 'testing'}>
                {keyTest.state === 'testing' ? 'Testing…' : 'Test key'}
              </Button>
              {keyTest.state === 'ok' && <span className="text-sm text-revenue">Key works</span>}
              {keyTest.state === 'err' && <span className="text-sm text-cost">{keyTest.text}</span>}
            </div>

            <div className="mt-3 px-box px-box-dark p-2 font-pixel text-[9px] leading-relaxed">
              {usage.calls} calls this session, about {formatUsd(usage.cost)} total.{' '}
              <button type="button" onClick={() => useUsage.getState().reset()} className="underline hover:text-ink">
                Reset
              </button>
            </div>
          </div>
        )}
      </Panel>

      <Panel className="mt-4">
        <Eyebrow className="flex items-center gap-2">
          <Px sprite={ICON_DOWNLOAD} scale={2} />
          Progress
        </Eyebrow>
        <p className="mt-2 text-sm text-muted">
          Lifetime comp {formatComp(totalComp)} · {progress.attempts.length} attempts. Export to move between phone and PC. The export never contains
          your API key.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button variant="ghost" onClick={doExport}>
            Download save
          </Button>
          <Button variant="ghost" onClick={copyExport}>
            Copy save
          </Button>
          <Button variant="ghost" onClick={() => fileRef.current?.click()}>
            Import file
          </Button>
          <Button variant="ghost" onClick={pasteImport}>
            Paste save
          </Button>
        </div>
        <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={onFile} />

        <div className="mt-4 border-t-[3px] border-line pt-4">
          {!confirmReset ? (
            <Button variant="danger" onClick={() => setConfirmReset(true)}>
              Reset progress
            </Button>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-cost">Wipe everything except the key?</span>
              <Button
                variant="danger"
                onClick={() => {
                  progress.reset()
                  setConfirmReset(false)
                  setMsg({ tone: 'ok', text: 'Back to intern. Fresh start.' })
                }}
              >
                Yes, wipe it
              </Button>
              <Button variant="ghost" onClick={() => setConfirmReset(false)}>
                Cancel
              </Button>
            </div>
          )}
        </div>
      </Panel>

      <Panel className="mt-4">
        <Eyebrow className="flex items-center gap-2">
          <Px sprite={ICON_SOUND_ON} scale={2} />
          Audio
        </Eyebrow>
        <div className="mt-2 flex items-center justify-between gap-3">
          <span>
            <span className="font-semibold">Sounds</span>
            <span className="block text-xs text-muted">Synth blips for results and taps.</span>
          </span>
          <Toggle checked={soundOn} onChange={setSoundOn} />
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <span>
            <span className="font-semibold">Music</span>
            <span className="block text-xs text-muted">A chiptune loop for the office. Off by default.</span>
          </span>
          <Toggle checked={musicOn} onChange={setMusicOn} />
        </div>
      </Panel>

      <p className="mt-6 text-xs text-muted/70 text-center">Deal Desk · a game, not investment advice.</p>
    </Page>
  )
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`px-btn min-w-[64px] ${checked ? 'px-btn-primary' : ''}`}
    >
      {checked ? 'ON' : 'OFF'}
    </button>
  )
}
