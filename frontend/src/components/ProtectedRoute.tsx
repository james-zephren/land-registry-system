import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/index.js';

interface ProtectedRouteProps {
  requiredRoles?: string[];
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  requiredRoles = [], 
  children 
}) => {
  const { user, accessToken } = useAuthStore();

  console.log('🔐 ProtectedRoute Check:', { 
    hasToken: !!accessToken, 
    hasUser: !!user, 
    userRole: user?.role,
    requiredRoles 
  });

  // Check if user is authenticated
  if (!accessToken || !user) {
    console.log('❌ Not authenticated, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  // Check if user has required role
  if (requiredRoles.length > 0 && !requiredRoles.includes(user.role)) {
    console.log(`❌ Role ${user.role} not in ${requiredRoles}, redirecting to unauthorized`);
    return <Navigate to="/unauthorized" replace />;
  }

  console.log('✅ Access granted');
  return <>{children}</>;
};