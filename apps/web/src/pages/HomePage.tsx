import { Link } from 'react-router';

export default function HomePage() {
  return (
    <section className="home-page">
      <div className="hero-copy">
        <p className="eyebrow">By the water</p>
        <h1>Every story starts<br />with a little pond.</h1>
        <p className="intro">A world for slow afternoons, curious discoveries, and the catch you remember. Our adventure is taking shape.</p>
        <div className="actions">
          <Link className="button" to="/play">Visit the pond <span aria-hidden="true">↗</span></Link>
          <span className="quiet-note">A first glimpse of what’s to come</span>
        </div>
      </div>
      <aside className="welcome-note" aria-labelledby="welcome-heading">
        <span className="note-number" aria-hidden="true">01 /</span>
        <h2 id="welcome-heading">Take your time.</h2>
        <p>There’s no rush by the water. Pondbound is just beginning, and there’s a whole world left to discover.</p>
        <span className="note-signature">See you at the pond.</span>
      </aside>
    </section>
  );
}
