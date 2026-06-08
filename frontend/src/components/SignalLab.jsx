import { useEffect, useState } from 'react'

const TAU = Math.PI * 2
const rand = (a, b) => a + Math.random() * (b - a)
const clamp = (v, a, b) => Math.min(b, Math.max(a, v))

// Each generator turns the live signal params into a scribbled measurement.
// Notation is deliberately ASCII-ish ("sqrt2", "pi", "us", "deg") so it reads
// like real hand notes and stays inside the handwriting font's glyph set.
const GENERATORS = [
  (p) => ({ text: `f = ${p.f.toFixed(2)} kHz`, tone: 'analog' }),
  (p) => ({ text: `T = 1/f = ${(1 / p.f).toFixed(3)} ms`, tone: 'analog' }),
  (p) => ({ text: `w = 2pi*f = ${(TAU * p.f).toFixed(2)} krad/s`, tone: 'analog' }),
  (p) => ({ text: `Vrms = Vp/sqrt2 = ${(p.vp / Math.SQRT2).toFixed(2)} V`, tone: 'analog' }),
  (p) => ({ text: `Vpp = ${(2 * p.vp).toFixed(2)} V`, tone: 'analog' }),
  (p) => ({ text: `phi = ${p.phase >= 0 ? '+' : ''}${p.phase.toFixed(1)} deg`, tone: 'analog' }),
  (p) => ({ text: `v(t) = ${p.vp.toFixed(1)} sin(wt + phi)`, tone: 'analog' }),
  (p) => ({ text: `slew = ${p.slew.toFixed(2)} V/us`, tone: 'analog' }),
  (p) => ({ text: `D = ton/T = ${p.duty.toFixed(1)} %`, tone: 'digital' }),
  (p) => ({ text: `ton = ${((p.duty / 100) / p.f).toFixed(3)} ms`, tone: 'digital' }),
  (p) => ({ text: `sq = sum (1/n) sin(nwt), n odd`, tone: 'digital' }),
  (p) => ({ text: `CAN ${p.baud} kbps -> tbit = ${(1000 / p.baud).toFixed(2)} us`, tone: 'digital' }),
  (p) => ({ text: `tr = 0.35/BW = ${p.tr.toFixed(0)} ns`, tone: 'digital' }),
  (p) => ({ text: `fs = ${p.fs.toFixed(2)} MHz`, tone: 'neutral' }),
  (p) => ({ text: `Nyquist = fs/2 = ${(p.fs / 2).toFixed(2)} MHz`, tone: 'neutral' }),
  (p) => ({ text: `q = Vref/2^12 = ${((3.3 / 4096) * 1000).toFixed(3)} mV`, tone: 'neutral' }),
  (p) => ({ text: `SNR = 6.02N+1.76 = ${p.snr.toFixed(1)} dB`, tone: 'neutral' }),
]

const BAUDS = [125, 250, 500]

function freshParams() {
  return { f: rand(1.0, 1.4), vp: rand(2.4, 3.3), duty: rand(40, 60), phase: rand(-20, 20), fs: rand(1.0, 2.0), snr: rand(70, 78), tr: rand(50, 100), slew: rand(2, 4), baud: 500 }
}

// random walk so every reading slowly drifts and "re-measures"
function drift(p) {
  return {
    f: clamp(p.f + rand(-0.012, 0.012), 0.9, 1.6),
    vp: clamp(p.vp + rand(-0.03, 0.03), 2.2, 3.5),
    duty: clamp(p.duty + rand(-0.5, 0.5), 35, 65),
    phase: clamp(p.phase + rand(-0.8, 0.8), -45, 45),
    fs: clamp(p.fs + rand(-0.015, 0.015), 1.0, 2.2),
    snr: clamp(p.snr + rand(-0.25, 0.25), 68, 80),
    tr: clamp(p.tr + rand(-2.5, 2.5), 40, 120),
    slew: clamp(p.slew + rand(-0.06, 0.06), 1.5, 4.6),
    baud: p.baud,
  }
}

// notes live in the left/right margins so they never sit over the chat column
function makeNote() {
  const left = Math.random() < 0.5
  return {
    id: Math.random().toString(36).slice(2),
    gi: Math.floor(Math.random() * GENERATORS.length),
    x: left ? rand(6, 20) : rand(72, 93),
    y: rand(9, 82),
    rot: rand(-5, 5),
    peak: rand(0.24, 0.34),
    life: rand(9000, 15000),
    born: Date.now(),
  }
}

export default function SignalLab() {
  const [params, setParams] = useState(freshParams)
  const [notes, setNotes] = useState(() => Array.from({ length: 7 }, makeNote))
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const tick = setInterval(() => {
      setParams(drift)
      setNow(Date.now())
    }, 130)
    const churn = setInterval(() => {
      setNotes((ns) => ns.map((n) => (Date.now() - n.born > n.life ? makeNote() : n)))
      if (Math.random() < 0.15) {
        setParams((p) => ({ ...p, baud: BAUDS[Math.floor(Math.random() * BAUDS.length)] }))
      }
    }, 800)
    return () => {
      clearInterval(tick)
      clearInterval(churn)
    }
  }, [])

  return (
    <div className="lab-layer" aria-hidden="true">
      {notes.map((n) => {
        const { text, tone } = GENERATORS[n.gi](params)
        const reveal = 750
        const vis = clamp(Math.round(((now - n.born) / reveal) * text.length), 0, text.length)
        const writing = vis < text.length
        return (
          <span
            key={n.id}
            className={`lab-note ${tone}`}
            style={{ left: `${n.x}%`, top: `${n.y}%`, '--rot': `${n.rot}deg`, '--peak': n.peak, '--life': `${n.life}ms` }}
          >
            {text.slice(0, vis)}
            {writing && <span className="lab-caret">|</span>}
          </span>
        )
      })}
    </div>
  )
}
