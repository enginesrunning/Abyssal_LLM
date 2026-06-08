// Interim concept extractor: detects embedded-automotive terms in the chat
// text and builds a {nodes, links} graph from them. On Day 5 this gets
// replaced by real embedding similarity, but the shape it returns is the same.

const TERMS = [
  { id: 'PWM', group: 'power_timing', pats: [/\bpwm\b/i] },
  { id: 'Timer', group: 'power_timing', pats: [/\btimers?\b/i] },
  { id: 'LED', group: 'power_timing', pats: [/\bleds?\b/i] },
  { id: 'Actuator', group: 'power_timing', pats: [/\bactuators?\b/i] },
  { id: 'Motor', group: 'power_timing', pats: [/\bmotors?\b/i] },
  { id: 'GPIO', group: 'core', pats: [/\bgpio\b/i] },
  { id: 'ADC', group: 'core', pats: [/\badc\b/i] },
  { id: 'DAC', group: 'core', pats: [/\bdac\b/i] },
  { id: 'DMA', group: 'core', pats: [/\bdma\b/i] },
  { id: 'Sensor', group: 'core', pats: [/\bsensors?\b/i] },
  { id: 'ISR', group: 'core', pats: [/\bisr\b/i, /\binterrupts?\b/i] },
  { id: 'RTOS', group: 'core', pats: [/\brtos\b/i, /\bfreertos\b/i] },
  { id: 'MCU', group: 'core', pats: [/\bmcu\b/i, /\bmicrocontrollers?\b/i] },
  { id: 'CAN', group: 'comms', pats: [/\bCAN\b/, /\bcan ?bus\b/i] }, // uppercase only -> avoids the verb "can"
  { id: 'LIN', group: 'comms', pats: [/\bLIN\b/] },
  { id: 'UART', group: 'comms', pats: [/\buart\b/i] },
  { id: 'SPI', group: 'comms', pats: [/\bspi\b/i] },
  { id: 'I2C', group: 'comms', pats: [/\bi2c\b/i] },
  { id: 'ECU', group: 'comms', pats: [/\becu\b/i] },
  { id: 'Watchdog', group: 'safety', pats: [/\bwatchdog\b/i] },
  { id: 'MISRA-C', group: 'safety', pats: [/\bmisra\b/i] },
  { id: 'ISO 26262', group: 'safety', pats: [/\biso ?26262\b/i, /\b26262\b/, /\bfunctional safety\b/i] },
  { id: 'ASIL', group: 'safety', pats: [/\basil\b/i] },
]

const EDGES = [
  ['PWM', 'Timer'], ['PWM', 'LED'], ['PWM', 'Actuator'], ['PWM', 'Motor'], ['PWM', 'GPIO'],
  ['Timer', 'ISR'],
  ['ADC', 'Sensor'], ['ADC', 'DMA'], ['ADC', 'GPIO'], ['DAC', 'ADC'],
  ['GPIO', 'LED'],
  ['ISR', 'Watchdog'], ['ISR', 'RTOS'], ['ISR', 'CAN'],
  ['RTOS', 'Watchdog'], ['RTOS', 'MCU'],
  ['MCU', 'GPIO'], ['MCU', 'CAN'],
  ['CAN', 'ECU'], ['CAN', 'LIN'], ['CAN', 'UART'],
  ['UART', 'SPI'], ['SPI', 'I2C'], ['UART', 'I2C'],
  ['ECU', 'ISO 26262'], ['ISO 26262', 'MISRA-C'], ['ISO 26262', 'ASIL'], ['ISO 26262', 'Watchdog'],
  ['Sensor', 'Actuator'], ['Sensor', 'Motor'],
]

export function extractGraph(messages) {
  const text = (messages || []).map((m) => m.text || '').join('\n')
  const counts = {}
  for (const t of TERMS) {
    let c = 0
    for (const p of t.pats) {
      const g = new RegExp(p.source, p.flags.includes('g') ? p.flags : p.flags + 'g')
      const found = text.match(g)
      if (found) c += found.length
    }
    if (c > 0) counts[t.id] = { group: t.group, val: c }
  }
  const nodes = Object.entries(counts).map(([id, d]) => ({
    id,
    group: d.group,
    val: 4 + Math.min(d.val * 2, 10),
  }))
  const present = new Set(nodes.map((n) => n.id))
  const links = EDGES.filter(([a, b]) => present.has(a) && present.has(b)).map(([a, b]) => ({ source: a, target: b }))
  return { nodes, links }
}
