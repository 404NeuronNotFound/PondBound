import { Link } from 'react-router';

export function NotFoundPage() {
  return (
    <section className="message-panel" aria-labelledby="not-found-heading">
      <p className="eyebrow">Off the beaten path · 404</p>
      <h1 id="not-found-heading">This trail ends here.</h1>
      <p>We couldn’t find that page. Head back to the start and take another path.</p>
      <Link className="button" to="/">
        Back to the start
      </Link>
    </section>
  );
}
