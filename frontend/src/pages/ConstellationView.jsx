import ForceGraph3D from 'react-force-graph-3d'
import SpriteText from 'three-spritetext'
import { useRef, useEffect } from 'react'

const PALETTE = ['#5ad1ff', '#b08cff', '#ffd23f', '#4ade80', '#f472b6', '#fb923c', '#7dd3fc', '#c4b5fd']

const GROUP_COLORS = {
  power_timing: '#ef9f27',
  comms: '#5ad1ff',
  safety: '#e24b4a',
  core: '#1d9e75',
}

export default function ConstellationView({ graphData }) {
  const data = graphData || { nodes: [], links: [] }
  const empty = data.nodes.length === 0

const fgRef = useRef()

function groupClusterForce(strength) {
  let nodes = []
  const centers = {}
  function force(alpha) {
    for (const n of nodes) {
      const c = centers[n.group]
      if (!c) continue
      n.vx += (c.x - n.x) * strength * alpha
      n.vy += (c.y - n.y) * strength * alpha
      n.vz += (c.z - n.z) * strength * alpha
    }
  }
  force.initialize = (n) => {
    nodes = n
    const groups = [...new Set(nodes.map((d) => d.group))]
    const R = 320
    groups.forEach((g, i) => {
      const a = (i / Math.max(groups.length, 1)) * Math.PI * 2
      centers[g] = {
        x: Math.cos(a) * R,
        y: Math.sin(a) * R,
        z: (i % 2 === 0 ? 1 : -1) * 90,
      }
    })
  }
  return force
}

useEffect(() => {
  if (!graphData?.nodes?.length) return
  const id = setTimeout(() => {
    const fg = fgRef.current
    if (!fg) return
    const charge = fg.d3Force('charge')
    if (charge) charge.strength(-250)
    const link = fg.d3Force('link')
    if (link) link.distance(90)
    fg.d3Force('cluster', groupClusterForce(0.2))
    fg.d3ReheatSimulation()
  }, 0)
  return () => clearTimeout(id)
}, [graphData])

  return (
    <div className="constellation">
      {empty && (
        <div className="constellation-empty">
          <p>No concepts yet</p>
          <span>Keywords appear here and connect as you chat.</span>
        </div>
      )}
      <ForceGraph3D
        ref={fgRef}
        graphData={graphData}
        backgroundColor="#06061a"
        nodeColor={(n) => PALETTE[(n.group ?? 0) % PALETTE.length]}
        nodeVal={(n) => (n.val || 4) * 0.3}
        nodeResolution={18}
        linkColor={() => 'rgba(160,175,255,0.28)'}
        linkWidth={(l) => 0.4 + (l.weight || 0) * 2.5}
        linkDirectionalParticles={2}
        linkDirectionalParticleWidth={1.4}
        linkDirectionalParticleSpeed={0.006}
        linkOpacity={0.9}
        nodeThreeObjectExtend={true}
        nodeThreeObject={(node) => {
          const sprite = new SpriteText(node.id)
          sprite.color = '#ffffff'
          sprite.textHeight = node.isHub ? 13 : 5
          sprite.fontFace = 'Manrope, sans-serif'
          sprite.fontWeight = 600
          sprite.backgroundColor = 'rgba(0,0,0,0.45)'
          sprite.padding = 2
          sprite.borderRadius = 3
          sprite.position.set(0, 0, 0)
          sprite.material.depthTest = false
          sprite.material.depthWrite = false
          sprite.renderOrder = 999
          return sprite
        }}
      />
    </div>
  )
}
