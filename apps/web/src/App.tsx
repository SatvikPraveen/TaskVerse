// apps/web/src/App.tsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { useEffect } from 'react';
import { useSocket } from '@/hooks/useSocket';

// Route components
import AppRoutes from '@/routes/index';
import ProtectedRoute from '@/routes/ProtectedRoute';

// Auth pages
import LoginPage from '@/features/auth/LoginPage';
import RegisterPage from '@/features/auth/RegisterPage';

// Main app pages  
import DashboardPage from '@/features/dashboard/DashboardPage';
import TasksPage from '@/features/tasks/TasksPage';
import CategoriesPage from '@/features/categories/CategoriesPage';

function App() {
  const { user, initializeAuth, isLoading } = useAuthStore();
  
  // Initialize auth on app start
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // Initialize socket connection when user is authenticated
  useSocket(user?.id);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        {/* Public routes */}
        <Route 
          path="/login" 
          element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} 
        />
        <Route 
          path="/register" 
          element={user ? <Navigate to="/dashboard" replace /> : <RegisterPage />} 
        />

        {/* Protected routes */}
        <Route path="/" element={<ProtectedRoute />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="categories" element={<CategoriesPage />} />
        </Route>

        {/* Catch all redirect */}
        <Route path="*" element={<Navigate to={user ? "/dashboard" : "/login"} replace />} />
      </Routes>
    </div>
  );
}

export default App;