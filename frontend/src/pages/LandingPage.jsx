import OscilloscopeBG from '../components/OscilloscopeBG'

export default function LandingPage({ onLogin, onRegister }) {
  return (
    <div className="scene">
      <OscilloscopeBG />
      <div className="landing">
        <p className="eyebrow">Embedded automotive intelligence</p>
        <h1 className="logo">Text2Graph</h1>
        <p className="tagline">Architect of tomorrow&rsquo;s embedded systems.</p>
        <div className="landing-actions">
          <button className="btn-primary" onClick={onRegister}>
            Want to join? Register your account
          </button>
          <button className="btn-ghost" onClick={onLogin}>
            Already a member? Log in to your account
          </button>
        </div>
      </div>
    </div>
  )
}
