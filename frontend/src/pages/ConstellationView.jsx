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
        nodeVal="val"
        nodeOpacity={0.95}
        linkColor={() => 'rgba(170,180,255,0.22)'}
        linkWidth={0.6}
        nodeThreeObjectExtend={true}
        nodeThreeObject={(node) => {
          const sprite = new SpriteText(node.id)
          sprite.color = GROUP_COLORS[node.group] || '#ffffff'
          sprite.textHeight = 4
          sprite.fontFace = 'Manrope, sans-serif'
          sprite.position.set(0, 7, 0)
          return sprite
        }}
      />
    </div>
  )
}
