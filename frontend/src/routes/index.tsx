import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AuthLayout } from '../layouts/AuthLayout'
import { MainLayout } from '../layouts/MainLayout'
import { LoginPage } from '../pages/LoginPage'
import { RegisterPage } from '../pages/RegisterPage'
import { Dashboard } from '../pages/Dashboard'
import { AccountsPage } from '../pages/AccountsPage'
import { TransactionsPage } from '../pages/TransactionsPage'
import { CategoriesPage } from '../pages/CategoriesPage'
import { TasksPage } from '../pages/TasksPage'
import { GoalsPage } from '../pages/GoalsPage'
import { PurchaseAdvisor } from '../pages/PurchaseAdvisor'
import { HistoryPage } from '../pages/HistoryPage'
import { ProfilePage } from '../pages/ProfilePage'
import { FixedExpensesPage } from '../pages/FixedExpensesPage'

export const router = createBrowserRouter([
  {
    element: <AuthLayout />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
    ],
  },
  {
    element: <MainLayout />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: '/dashboard', element: <Dashboard /> },
      { path: '/accounts', element: <AccountsPage /> },
      { path: '/transactions', element: <TransactionsPage /> },
      { path: '/categories', element: <CategoriesPage /> },
      { path: '/fixed-expenses', element: <FixedExpensesPage /> },
      { path: '/tasks', element: <TasksPage /> },
      { path: '/goals', element: <GoalsPage /> },
      { path: '/purchase-advisor', element: <PurchaseAdvisor /> },
      { path: '/history', element: <HistoryPage /> },
      { path: '/profile', element: <ProfilePage /> },
    ],
  },
  { path: '*', element: <Navigate to="/dashboard" replace /> },
])
