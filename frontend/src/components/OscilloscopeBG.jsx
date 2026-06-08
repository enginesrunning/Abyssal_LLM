import { useEffect, useRef } from 'react'

const rand = (a, b) => a + Math.random() * (b - a)
const pick = (a) => a[(Math.random() * a.length) | 0]
const TYPES = ['sine', 'square', 'triangle', 'saw', 'pulse', 'damped', 'noisy', 'chirp', 'am', 'dual']

// Returns f(x) for x in [0,1] across the screen -> value in roughly [-1,1].
function makeWave() {
  const type = pick(TYPES)
  const f = rand(2, 6)
  const phi = rand(0, Math.PI * 2)
  const f2 = rand(3, 9)
  const k = rand(1.6, 4)
  const duty = rand(0.12, 0.4)
  return (x) => {
    const ph = 2 * Math.PI * f * x + phi
    switch (type) {
      case 'square': return Math.sign(Math.sin(ph)) * 0.9
      case 'triangle': return (2 / Math.PI) * Math.asin(Math.sin(ph))
      case 'saw': return 2 * ((f * x + phi / (2 * Math.PI)) % 1) - 1
      case 'pulse': return ((f * x) % 1) < duty ? 0.9 : -0.9
      case 'damped': return Math.exp(-k * x) * Math.sin(2 * Math.PI * f2 * x)
      case 'noisy': return Math.sin(ph) * 0.8 + (Math.random() * 2 - 1) * 0.18
      case 'chirp': return Math.sin(2 * Math.PI * (f + (f2 - f) * x) * x + phi)
      case 'am': return Math.sin(ph) * (0.45 + 0.55 * Math.sin(2 * Math.PI * x))
      case 'dual': return 0.6 * Math.sin(ph) + 0.4 * Math.sin(2 * Math.PI * f2 * x + phi)
      default: return Math.sin(ph)
    }
  }
}

const TRACES = [
  { color: '#5ad1ff', cy: 0.4, speed: 0.45, amp: 0.15 },
  { color: '#b08cff', cy: 0.68, speed: 0.32, amp: 0.15 },
]

export default function OscilloscopeBG() {
  const ref = useRef(null)

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas.getContext('2d')
    let W = 0
    let H = 0
    const traces = TRACES.map((t) => ({ ...t, x: 0, wave: makeWave() }))

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      W = canvas.clientWidth
      H = canvas.clientHeight
      canvas.width = W * dpr
      canvas.height = H * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    function grid() {
      ctx.strokeStyle = 'rgba(120,140,220,0.06)'
      ctx.lineWidth = 1
      ctx.beginPath()
      const step = 48
      for (let x = 0; x <= W; x += step) { ctx.moveTo(x, 0); ctx.lineTo(x, H) }
      for (let y = 0; y <= H; y += step) { ctx.moveTo(0, y); ctx.lineTo(W, y) }
      ctx.stroke()
    }

    function drawTrace(tr, headT) {
      ctx.beginPath()
      for (let px = 0; px <= headT * W; px += 2) {
        const y = tr.cy * H - tr.wave(px / W) * tr.amp * H
        if (px === 0) ctx.moveTo(px, y)
        else ctx.lineTo(px, y)
      }
      ctx.strokeStyle = tr.color
      ctx.lineWidth = 2
      ctx.shadowBlur = 12
      ctx.shadowColor = tr.color
      ctx.globalAlpha = 0.19
      ctx.stroke()
      ctx.shadowBlur = 0
      ctx.globalAlpha = 1
    }

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let raf
    let last = performance.now()

    function frame(now) {
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      ctx.clearRect(0, 0, W, H)
      grid()
      for (const tr of traces) {
        tr.x += tr.speed * dt
        if (tr.x >= 1) {
          tr.x = 0
          tr.wave = makeWave() // new shape each completed sweep
        }
        drawTrace(tr, tr.x)
        const hy = tr.cy * H - tr.wave(tr.x) * tr.amp * H
        ctx.beginPath()
        ctx.arc(tr.x * W, hy, 3, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(255,255,255,0.5)'
        ctx.fill()
      }
      raf = requestAnimationFrame(frame)
    }

    if (reduce) {
      ctx.clearRect(0, 0, W, H)
      grid()
      traces.forEach((tr) => drawTrace(tr, 1))
    } else {
      raf = requestAnimationFrame(frame)
    }

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [])

  return <canvas ref={ref} className="scope-bg" aria-hidden="true" />
}
