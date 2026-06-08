// A seamless, CSS-animated signal trace. We render one period of the wave as
// an inline SVG, use it as a repeating background, and scroll the background
// position by exactly one tile width for a perfectly looping animation.

function buildWave(variant, color, w, h) {
  const mid = h / 2
  let d, join, cap, sw

  if (variant === 'square') {
    const amp = h * 0.3
    const top = (mid - amp).toFixed(1)
    const bot = (mid + amp).toFixed(1)
    const half = (w / 2).toFixed(1)
    // rising edge at x=0, high to half, falling edge, low to end -> seamless tile
    d = `M0 ${bot} L0 ${top} L${half} ${top} L${half} ${bot} L${w} ${bot}`
    join = 'miter'
    cap = 'butt'
    sw = 2
  } else {
    const amp = h * 0.3
    const steps = 64
    let pts = `M0 ${mid.toFixed(1)}`
    for (let i = 1; i <= steps; i++) {
      const x = ((w * i) / steps).toFixed(2)
      const y = (mid - amp * Math.sin((i / steps) * Math.PI * 2)).toFixed(2)
      pts += ` L${x} ${y}`
    }
    d = pts
    join = 'round'
    cap = 'round'
    sw = 2.4
  }

  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}' viewBox='0 0 ${w} ${h}'>` +
    `<path d='${d}' fill='none' stroke='${color}' stroke-width='${sw}' ` +
    `stroke-linejoin='${join}' stroke-linecap='${cap}'/></svg>`

  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
}

export default function Waveform({
  variant = 'sine',
  color = '#5ad1ff',
  dur = '7s',
  height = 88,
  glow = true,
  className = '',
}) {
  const w = variant === 'sine' ? 280 : 260
  const bg = buildWave(variant, color, w, height)

  return (
    <div
      className={`wave-strip ${className}`}
      aria-hidden="true"
      style={{
        height,
        backgroundImage: bg,
        backgroundSize: `${w}px ${height}px`,
        '--tile-neg': `-${w}px`,
        '--wave-dur': dur,
        filter: glow ? `drop-shadow(0 0 6px ${color}) drop-shadow(0 0 16px ${color}55)` : 'none',
      }}
    />
  )
}
