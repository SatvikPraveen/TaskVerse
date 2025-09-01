// apps/web/src/components/Toaster.tsx
import { Toaster as HotToaster } from 'react-hot-toast';

export default function Toaster() {
  return (
    <HotToaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: '#363636',
          color: '#fff',
          borderRadius: '8px',
          fontSize: '14px',
          maxWidth: '400px',
        },
        success: {
          duration: 3000,
          iconTheme: {
            primary: '#10b981',
            secondary: '#fff',
          },
          style: {
            background: '#065f46',
            color: '#fff',
          },
        },
        error: {
          duration: 5000,
          iconTheme: {
            primary: '#ef4444',
            secondary: '#fff',
          },
          style: {
            background: '#991b1b',
            color: '#fff',
          },
        },
        loading: {
          iconTheme: {
            primary: '#6366f1',
            secondary: '#fff',
          },
        },
      }}
      containerStyle={{
        top: 80, // Account for the header height
      }}
    />
  );
}