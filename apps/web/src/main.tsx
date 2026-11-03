import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import './styles/index.css';
import { BrowserRouter } from 'react-router';
import { ErrorBoundary } from './components/ErrorBoundary';

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </ErrorBoundary>,
);
