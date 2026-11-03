import { lazy } from 'react';
import { Route, Routes } from 'react-router';
import { AppShell } from './AppShell';
import { NotFoundPage } from '../pages/NotFoundPage';

const HomePage = lazy(() => import('../pages/HomePage'));
const PlayPage = lazy(() => import('../pages/PlayPage'));
const AccountPage = lazy(() => import('../pages/AccountPage'));

export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<HomePage />} />
        <Route path="play" element={<PlayPage />} />
        <Route path="account" element={<AccountPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
