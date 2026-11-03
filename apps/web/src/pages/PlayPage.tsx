import { GameCanvas } from '../game/GameCanvas';

export default function PlayPage() {
  return (
    <section className="play-page" aria-labelledby="pond-heading">
      <div className="page-heading">
        <div><p className="eyebrow">A first glimpse</p><h1 id="pond-heading">The pond is waiting.</h1></div>
        <span className="preview-badge">Foundation preview</span>
      </div>
      <GameCanvas />
      <p className="quiet-note">The world is still taking shape. Exploring and fishing will arrive in a future update.</p>
    </section>
  );
}
