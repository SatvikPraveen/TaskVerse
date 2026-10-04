// apps/web/src/App.tsx
import { useEffect } from 'react';

import LoadingScreen from '@/components/LoadingScreen';
import { useSocket } from '@/hooks/useSocket';
import AppRoutes from '@/routes';
import { useAuthStore } from '@/store/auth.store';

export default function App() {
  const { user, initialize, isInitializing } = useAuthStore();

  useEffect(() => {
    void initialize();
  }, [initialize]);

  useSocket(user?._id);

  if (isInitializing) return <LoadingScreen />;

  return <AppRoutes isAuthenticated={!!user} />;
}
