import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import './styles/index.css';
import { BrowserRouter } from 'react-router';
import { ErrorBoundary } from './components/ErrorBoundary';
import { rootErrorHandlers } from './app/root-error-handlers';

createRoot(document.getElementById('root')!, rootErrorHandlers).render(
  <ErrorBoundary>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </ErrorBoundary>,
);
