import { createBrowserRouter } from 'react-router-dom';

import { ROUTES } from '@shared/index';

import { AdminAuditPage } from '@/routes/admin/admin-audit-page';
import { AdminCategoriesPage } from '@/routes/admin/admin-categories-page';
import { AdminDashboardPage } from '@/routes/admin/admin-dashboard-page';
import { AdminLayout } from '@/routes/admin/admin-layout';
import { AdminSettingsPage } from '@/routes/admin/admin-settings-page';
import { AdminTransactionsPage } from '@/routes/admin/admin-transactions-page';
import { AdminUsersPage } from '@/routes/admin/admin-users-page';
import { LoginPage } from '@/routes/auth/login-page';
import { AppLayout } from '@/routes/app-layout';
import { GuestOnly, RequireAdmin, RequireAuth } from '@/routes/guards';
import { RootLayout } from '@/routes/root-layout';
import { DashboardPage } from '@/routes/user/dashboard-page';
import { FixedExpensesPage } from '@/routes/user/fixed-expenses-page';
import { NewExpensePage } from '@/routes/user/new-expense-page';
import { NewIncomePage } from '@/routes/user/new-income-page';
import { NewTransferPage } from '@/routes/user/new-transfer-page';
import { NotificationsListPage } from '@/routes/user/notifications-list-page';
import { NotificationSettingsPage } from '@/routes/user/notifications-page';
import { ProfilePage } from '@/routes/user/profile-page';
import { StatsPage } from '@/routes/user/stats-page';
import { TransactionDetailPage } from '@/routes/user/transaction-detail-page';
import { TransactionsPage } from '@/routes/user/transactions-page';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      {
        element: <GuestOnly />,
        children: [
          {
            path: ROUTES.login,
            element: <LoginPage />,
          },
        ],
      },
      {
        element: <RequireAuth />,
        children: [
          {
            element: <AppLayout />,
            children: [
              { index: true, element: <DashboardPage /> },
              { path: ROUTES.transactions.slice(1), element: <TransactionsPage /> },
              { path: ROUTES.fixedExpenses.slice(1), element: <FixedExpensesPage /> },
              { path: 'transactions/:id', element: <TransactionDetailPage /> },
              { path: ROUTES.transactionNewIncome.slice(1), element: <NewIncomePage /> },
              { path: ROUTES.transactionNewExpense.slice(1), element: <NewExpensePage /> },
              { path: ROUTES.transactionNewTransfer.slice(1), element: <NewTransferPage /> },
              { path: ROUTES.stats.slice(1), element: <StatsPage /> },
              { path: ROUTES.notifications.slice(1), element: <NotificationsListPage /> },
              { path: ROUTES.notificationSettings.slice(1), element: <NotificationSettingsPage /> },
              { path: ROUTES.profile.slice(1), element: <ProfilePage /> },
            ],
          },
        ],
      },
      {
        element: <RequireAdmin />,
        children: [
          {
            path: ROUTES.admin.slice(1),
            element: <AdminLayout />,
            children: [
              { index: true, element: <AdminDashboardPage /> },
              { path: 'users', element: <AdminUsersPage /> },
              { path: 'categories', element: <AdminCategoriesPage /> },
              { path: 'transactions', element: <AdminTransactionsPage /> },
              { path: 'audit', element: <AdminAuditPage /> },
              { path: 'settings', element: <AdminSettingsPage /> },
            ],
          },
        ],
      },
    ],
  },
]);
