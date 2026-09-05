import { useRef, useState } from 'react'
import { useNav } from '../store/nav'
import { useProgress } from '../store/progress'
import { looksLikeAnthropicKey, useSettings } from '../store/settings'
import { formatComp } from '../engine/scoring'
import { Button, Eyebrow, Page, Panel } from '../components/ui'

export function Settings() {
  const go = useNav((s) => s.go)
  const { apiKey, mentorEnabled, soundOn, setApiKey, setMentorEnabled, setSoundOn } = useSettings()
  const progress = useProgress()
  const [draftKey, setDraftKey] = useState(apiKey)
  const [showKey, setShowKey] = useState(false)
  const [msg, setMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const hasKey = apiKey.length > 0
  const totalComp = Object.values(progress.best).reduce((a, b) => a + b, 0)

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
        <div className={`mb-4 rounded-xl border px-4 py-3 text-sm ${msg.tone === 'ok' ? 'border-revenue/40 bg-revenue/10 text-revenue' : 'border-cost/40 bg-cost/10 text-cost'}`}>
          {msg.text}
        </div>
      )}

      <Panel>
        <Eyebrow>Mentor mode</Eyebrow>
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
            className="flex-1 min-h-11 rounded-xl bg-panel-2 border border-line px-3 font-mono text-sm outline-none focus:border-muted"
          />
          <Button variant="ghost" onClick={() => setShowKey((v) => !v)} aria-label={showKey ? 'Hide key' : 'Show key'}>
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
          <label className="mt-4 flex items-center justify-between gap-3 cursor-pointer">
            <span>
              <span className="font-semibold">Mentor mode</span>
              <span className="block text-xs text-muted">Show written missions and the Ask the MD button.</span>
            </span>
            <Toggle checked={mentorEnabled} onChange={setMentorEnabled} />
          </label>
        )}
        {hasKey && <p className="mt-3 text-xs text-debt">Mentor features ship in Milestone 4. For now the key just sits here, unused.</p>}
      </Panel>

      <Panel className="mt-4">
        <Eyebrow>Progress</Eyebrow>
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

        <div className="mt-4 border-t border-line pt-4">
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
        <Eyebrow>Other</Eyebrow>
        <label className="mt-2 flex items-center justify-between gap-3 cursor-pointer">
          <span>
            <span className="font-semibold">Sounds</span>
            <span className="block text-xs text-muted">Off by default. Also not built yet.</span>
          </span>
          <Toggle checked={soundOn} onChange={setSoundOn} />
        </label>
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
      className={`relative h-7 w-12 shrink-0 rounded-full transition ${checked ? 'bg-revenue' : 'bg-line'}`}
    >
      <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-ink transition ${checked ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  )
}
