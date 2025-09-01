// apps/web/src/routes/index.tsx
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';

// Feature pages
import DashboardPage from '@/features/dashboard/DashboardPage';
import TasksPage from '@/features/tasks/TasksPage';
import CategoriesPage from '@/features/categories/CategoriesPage';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<ProtectedRoute />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="tasks" element={<TasksPage />} />
        <Route path="categories" element={<CategoriesPage />} />
      </Route>
    </Routes>
  );
}