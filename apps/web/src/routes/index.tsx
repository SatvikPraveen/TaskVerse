// apps/web/src/routes/index.tsx
import { Navigate, Route, Routes } from 'react-router-dom';

import AnalyticsPage from '@/features/analytics/AnalyticsPage';
import LoginPage from '@/features/auth/LoginPage';
import RegisterPage from '@/features/auth/RegisterPage';
import CategoriesPage from '@/features/categories/CategoriesPage';
import DashboardPage from '@/features/dashboard/DashboardPage';
import PlannerPage from '@/features/planning/PlannerPage';
import TasksPage from '@/features/tasks/TasksPage';

import ProtectedRoute from './ProtectedRoute';

interface AppRoutesProps {
  isAuthenticated: boolean;
}

/** The complete route table. Public routes bounce signed-in users to the dashboard. */
export default function AppRoutes({ isAuthenticated }: AppRoutesProps) {
  const home = <Navigate to="/dashboard" replace />;

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? home : <LoginPage />} />
      <Route path="/register" element={isAuthenticated ? home : <RegisterPage />} />

      <Route path="/" element={<ProtectedRoute />}>
        <Route index element={home} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="tasks" element={<TasksPage />} />
        <Route path="categories" element={<CategoriesPage />} />
        <Route path="planner" element={<PlannerPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
      </Route>

      <Route path="*" element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />} />
    </Routes>
  );
}
