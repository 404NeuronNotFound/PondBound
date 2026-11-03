import { useEffect, useState } from 'react';
import { GameCanvas } from '../game/GameCanvas';
import { getHealth } from '../lib/api';

export function App() {
  const [status, setStatus] = useState('Connecting');
  useEffect(() => {
    const controller = new AbortController();
    void getHealth(controller.signal).then(() => setStatus('Connected')).catch(() => {
      if (!controller.signal.aborted) setStatus('Offline');
    });
    return () => controller.abort();
  }, []);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10 md:py-16">
      <header className="mb-10 flex flex-wrap items-center justify-between gap-4">
        <a href="/" className="text-xl font-semibold tracking-widest text-emerald-100">PONDBOUND</a>
        <span className="rounded-full border border-emerald-200/20 px-4 py-2 text-xs uppercase tracking-widest text-emerald-200/70">A quiet beginning</span>
      </header>
      <section className="mb-8 max-w-2xl">
        <p className="mb-3 text-sm uppercase tracking-[0.25em] text-amber-200/80">By the water</p>
        <h1 className="mb-4 text-4xl font-medium leading-tight text-emerald-50 md:text-6xl">Every story starts<br />with a little pond.</h1>
        <p className="max-w-lg leading-relaxed text-emerald-100/60">A world for slow afternoons, curious discoveries, and the catch you remember. Our adventure is taking shape.</p>
      </section>
      <GameCanvas />
      <footer className="mt-5 flex flex-wrap justify-between gap-3 text-sm text-emerald-100/50">
        <span>Foundation preview · The world is still growing.</span>
        <span role="status">Server: {status}</span>
      </footer>
    </main>
  );
}
