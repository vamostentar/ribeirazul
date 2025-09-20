import { lazy, Suspense } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { AuthProvider } from '@/context/AuthContext';

// Eager load critical pages
import Home from '@/pages/Home';
import Login from '@/pages/Login';

// Lazy load non-critical pages
const PropertyDetails = lazy(() => import('@/pages/PropertyDetails'));
const NotFound = lazy(() => import('@/pages/NotFound'));

// Lazy load all admin pages
const Analytics = lazy(() => import('@/pages/admin/Analytics'));
const Approvals = lazy(() => import('@/pages/admin/Approvals'));
const Dashboard = lazy(() => import('@/pages/admin/Dashboard'));
const PropertiesList = lazy(() => import('@/pages/admin/PropertiesList'));
const PropertiesManagement = lazy(() => import('@/pages/admin/PropertiesManagement'));
const PropertyImages = lazy(() => import('@/pages/admin/PropertyImages'));
const Settings = lazy(() => import('@/pages/admin/Settings'));
const UsersManagement = lazy(() => import('@/pages/admin/UsersManagement'));
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import './index.css';

const queryClient = new QueryClient();

// Loading component for Suspense
import Loading from '@/components/Loading';

// Wrapper component to provide Auth context with Suspense
function AppWrapper({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <Suspense fallback={<Loading fullScreen />}>
        {children}
      </Suspense>
    </AuthProvider>
  );
}

const router = createBrowserRouter([
  { 
    path: '/', 
    element: (
      <AppWrapper>
        <Home />
      </AppWrapper>
    ) 
  },
  { 
    path: '/login', 
    element: (
      <AppWrapper>
        <Login />
      </AppWrapper>
    ) 
  },
  { 
    path: '/property/:id', 
    element: (
      <AppWrapper>
        <PropertyDetails />
      </AppWrapper>
    ) 
  },
  // Admin routes
  { 
    path: '/admin', 
    element: (
      <AppWrapper>
        <Navigate to="/admin/dashboard" replace />
      </AppWrapper>
    ) 
  },
  {
    path: '/admin/dashboard',
    element: (
      <AppWrapper>
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      </AppWrapper>
    )
  },
  {
    path: '/admin/properties',
    element: (
      <AppWrapper>
        <ProtectedRoute>
          <PropertiesManagement />
        </ProtectedRoute>
      </AppWrapper>
    )
  },
  {
    path: '/admin/properties/:id/images',
    element: (
      <AppWrapper>
        <ProtectedRoute>
          <PropertyImages />
        </ProtectedRoute>
      </AppWrapper>
    )
  },
  {
    path: '/admin/users',
    element: (
      <AppWrapper>
        <ProtectedRoute>
          <UsersManagement />
        </ProtectedRoute>
      </AppWrapper>
    )
  },
  {
    path: '/admin/analytics',
    element: (
      <AppWrapper>
        <ProtectedRoute>
          <Analytics />
        </ProtectedRoute>
      </AppWrapper>
    )
  },
  {
    path: '/admin/settings',
    element: (
      <AppWrapper>
        <ProtectedRoute>
          <Settings />
        </ProtectedRoute>
      </AppWrapper>
    )
  },
  {
    path: '/admin/approvals',
    element: (
      <AppWrapper>
        <ProtectedRoute>
          <Approvals />
        </ProtectedRoute>
      </AppWrapper>
    )
  },
  // Legacy route for backward compatibility
  {
    path: '/admin/properties-old',
    element: (
      <AppWrapper>
        <ProtectedRoute>
          <PropertiesList />
        </ProtectedRoute>
      </AppWrapper>
    )
  },
  { 
    path: '*', 
    element: (
      <AppWrapper>
        <NotFound />
      </AppWrapper>
    ) 
  },
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </React.StrictMode>
);