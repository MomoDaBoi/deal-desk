#!/usr/bin/env node
/**
 * Headless screenshot + interaction helper over the DevTools protocol, for
 * checking the game on phone-sized viewports without a browser extension.
 * No dependencies: uses Node's built-in WebSocket (Node 22+).
 *
 * Usage:
 *   node scripts/shot.mjs <url> <out.png> [--w=360 --h=740 --scale=2 --wait=2500]
 *                         [--click=x,y ...] [--eval="js" ...] [--tap=x,y ...]
 * Actions run in the order given after the page has loaded and `--wait` ms
 * have passed. Each click/tap waits 900ms afterwards. `--full` captures
 * the whole page height instead of the viewport.
 *
 * Needs Edge or Chrome installed. Set BROWSER_EXE to override the path.
 */
import { spawn } from 'node:child_process'
import { existsSync, writeFileSync } from 'node:fs'

const [url, out, ...rest] = process.argv.slice(2)
if (!url || !out) {
  console.error('usage: node scripts/shot.mjs <url> <out.png> [--w=360 --h=740 --scale=2 --wait=2500 --click=x,y --tap=x,y --eval=js --full]')
  process.exit(1)
}
const opts = { w: 360, h: 740, scale: 2, wait: 2500, full: false }
const actions = []
for (const a of rest) {
  const m = a.match(/^--(\w+)(?:=(.*))?$/)
  if (!m) continue
  const [, k, v] = m
  if (k === 'click' || k === 'tap' || k === 'eval' || k === 'key' || k === 'type') actions.push({ k, v })
  else if (k === 'full') opts.full = true
  else opts[k] = Number(v)
}

const candidates = [
  process.env.BROWSER_EXE,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean)
const exe = candidates.find((p) => existsSync(p))
if (!exe) {
  console.error('No Chrome/Edge found; set BROWSER_EXE')
  process.exit(1)
}

const port = 9222 + Math.floor(Math.random() * 500)
const profile = `${process.env.TEMP || '/tmp'}/deal-desk-shot-${port}`
const browser = spawn(exe, [
  '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--no-default-browser-check',
  `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--window-size=1280,900', 'about:blank',
], { stdio: 'ignore' })

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function getTarget() {
  for (let i = 0; i < 50; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/json`)
      const list = await r.json()
      const page = list.find((t) => t.type === 'page')
      if (page) return page
    } catch {
      // not up yet
    }
    await sleep(200)
  }
  throw new Error('browser did not start')
}

let seq = 0
const pending = new Map()
function connect(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl)
    ws.onopen = () => resolve(ws)
    ws.onerror = (e) => reject(e)
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data)
      if (msg.id && pending.has(msg.id)) {
        const { res, rej } = pending.get(msg.id)
        pending.delete(msg.id)
        msg.error ? rej(new Error(JSON.stringify(msg.error))) : res(msg.result)
      }
    }
  })
}
function send(ws, method, params = {}) {
  const id = ++seq
  return new Promise((res, rej) => {
    pending.set(id, { res, rej })
    ws.send(JSON.stringify({ id, method, params }))
  })
}

try {
  const target = await getTarget()
  const ws = await connect(target.webSocketDebuggerUrl)
  await send(ws, 'Page.enable')
  await send(ws, 'Runtime.enable')
  await send(ws, 'Emulation.setDeviceMetricsOverride', {
    width: opts.w, height: opts.h, deviceScaleFactor: opts.scale, mobile: true, screenWidth: opts.w, screenHeight: opts.h,
  })
  await send(ws, 'Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 })
  await send(ws, 'Page.navigate', { url })
  await sleep(opts.wait)
  const errors = []
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data)
    if (msg.method === 'Runtime.exceptionThrown') errors.push(msg.params.exceptionDetails?.exception?.description ?? 'exception')
  })
  for (const a of actions) {
    if (a.k === 'click' || a.k === 'tap') {
      const [x, y] = a.v.split(',').map(Number)
      if (a.k === 'tap') {
        await send(ws, 'Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
        await send(ws, 'Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
      } else {
        await send(ws, 'Input.dispatchMouseEvent', { type: 'mouseMoved', x, y })
        await send(ws, 'Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 })
        await send(ws, 'Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 })
      }
      await sleep(900)
    } else if (a.k === 'eval') {
      const r = await send(ws, 'Runtime.evaluate', { expression: a.v, awaitPromise: true, returnByValue: true })
      console.log('eval:', JSON.stringify(r.result?.value ?? r.result?.description ?? null))
      await sleep(300)
    } else if (a.k === 'key') {
      await send(ws, 'Input.dispatchKeyEvent', { type: 'keyDown', key: a.v, code: a.v })
      await send(ws, 'Input.dispatchKeyEvent', { type: 'keyUp', key: a.v, code: a.v })
      await sleep(400)
    } else if (a.k === 'type') {
      await send(ws, 'Input.insertText', { text: a.v })
      await sleep(200)
    }
  }
  const shot = await send(ws, 'Page.captureScreenshot', { format: 'png', captureBeyondViewport: opts.full, ...(opts.full ? { clip: undefined } : {}) })
  writeFileSync(out, Buffer.from(shot.data, 'base64'))
  console.log(`wrote ${out}`)
  if (errors.length) console.log('page errors:', errors.join('\n'))
  ws.close()
} finally {
  browser.kill()
}
