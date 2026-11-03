import type { RootOptions } from 'react-dom/client';
import { reportRenderFailure } from '../lib/error-reporting';

// Override React's default console handlers: never forward raw messages/stacks.
export const rootErrorHandlers: RootOptions = {
  onCaughtError: reportRenderFailure,
  onUncaughtError: reportRenderFailure,
  onRecoverableError: reportRenderFailure,
};
