import ForceGraph3D from 'react-force-graph-3d'
import SpriteText from 'three-spritetext'

const GROUP_COLORS = {
  power_timing: '#ef9f27',
  comms: '#5ad1ff',
  safety: '#e24b4a',
  core: '#1d9e75',
}

export default function ConstellationView({ graphData }) {
  const data = graphData || { nodes: [], links: [] }
  const empty = data.nodes.length === 0

  return (
    <div className="constellation">
      {empty && (
        <div className="constellation-empty">
          <p>No concepts yet</p>
          <span>Keywords appear here and connect as you chat.</span>
        </div>
      )}
      <ForceGraph3D
        graphData={data}
        backgroundColor="#06061a"
        nodeColor={(n) => GROUP_COLORS[n.group] || '#888888'}
        nodeVal={(n) => (n.val || 4) * 0.3}
        nodeOpacity={0.95}
        linkColor={() => '#ffd23f'}
        linkWidth={1.2}
        linkOpacity={0.9}
        nodeThreeObjectExtend={true}
        nodeThreeObject={(node) => {
          const sprite = new SpriteText(node.id)
          sprite.color = '#ffffff'
          sprite.textHeight = 6
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
