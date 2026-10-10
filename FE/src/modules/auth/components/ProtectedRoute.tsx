import React from 'react';
import { Navigate } from 'react-router-dom';
import { LoadingState } from '@/shared/components/loading-state';
import { useCurrentUser } from '../hooks/use-current-user';
import { tokenStore } from '../store/token.store';
import type { UserRole } from '../types/auth.types';

interface ProtectedRouteProps {
  children: React.ReactElement;
  /** When set, only these roles may see the page; others are sent home. */
  roles?: UserRole[];
}

const RoleGate = ({ children, roles }: Required<ProtectedRouteProps>) => {
  const { data: user, isPending } = useCurrentUser();
  if (isPending) return <LoadingState />;
  if (!user || !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
};

export const ProtectedRoute = ({ children, roles }: ProtectedRouteProps) => {
  const token = tokenStore.get();
  if (!token) return <Navigate to="/login" replace />;
  if (roles) return <RoleGate roles={roles}>{children}</RoleGate>;
  return children;
};
