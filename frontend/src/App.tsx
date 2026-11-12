import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/index.js';

// Public Pages
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { UnauthorizedPage } from './pages/UnauthorizedPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { PublicVerificationPage } from './pages/PublicVerificationPage';

// Dashboard Pages
import { CitizenDashboard } from './pages/CitizenDashboard';
import { OfficerDashboard } from './pages/OfficerDashboard';
import { AuditorDashboard } from './pages/AuditorDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { LandDetailsPage } from './pages/LandDetailsPage';

// Components
import { ProtectedRoute } from './components/ProtectedRoute';

function App() {
  const { user, accessToken } = useAuthStore();

  const getDashboardRoute = () => {
    if (!user) return '/login';
    switch (user.role) {
      case 'CITIZEN':
        return '/citizen';
      case 'OFFICER':
        return '/officer';
      case 'AUDITOR':
        return '/auditor';
      case 'ADMIN':
        return '/admin';
      default:
        return '/login';
    }
  };

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<HomePage />} />
      <Route path="/home" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      <Route path="/verify" element={<PublicVerificationPage />} />

      {/* Citizen Routes */}
      <Route
        path="/citizen/*"
        element={
          <ProtectedRoute requiredRoles={['CITIZEN']}>
            <CitizenDashboard />
          </ProtectedRoute>
        }
      />

      {/* Officer Routes */}
      <Route
  path="/officer/*"
  element={
    <ProtectedRoute requiredRoles={['REGISTRAR', 'OFFICER', 'SURVEYOR']}>
      <OfficerDashboard />
    </ProtectedRoute>
  }
/>

      {/* Auditor Routes */}
      <Route
        path="/auditor/*"
        element={
          <ProtectedRoute requiredRoles={['AUDITOR']}>
            <AuditorDashboard />
          </ProtectedRoute>
        }
      />

      {/* Admin Routes */}
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute requiredRoles={['ADMIN']}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      {/* Land Details - Accessible by all authenticated users */}
      <Route
        path="/land/:parcelId"
        element={
          <ProtectedRoute requiredRoles={['CITIZEN','REGISTRAR', 'SURVEYOR', 'OFFICER', 'AUDITOR', 'ADMIN']}>
            <LandDetailsPage />
          </ProtectedRoute>
        }
      />

      {/* Dashboard Redirect */}
      <Route
        path="/dashboard"
        element={<Navigate to={getDashboardRoute()} replace />}
      />
      <Route
        path="/dashboard/*"
        element={<Navigate to={getDashboardRoute()} replace />}
      />

      {/* 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;