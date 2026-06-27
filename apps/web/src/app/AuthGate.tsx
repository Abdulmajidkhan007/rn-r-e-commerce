import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import { useAuth, useAuthBootstrap } from '@kidswear/auth';
import { useNotificationBootstrap } from '@/lib/useNotificationBootstrap';

/**
 * Installs the single app-root auth subscription and shows a splash until the
 * initial auth state is known (status leaves 'idle'). Also bootstraps FCM web
 * push registration once the user is authenticated.
 */
export function AuthGate({ children }: { children: ReactNode }): ReactNode {
  useAuthBootstrap();
  useNotificationBootstrap();
  const { status } = useAuth();

  if (status === 'idle') {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return children;
}
