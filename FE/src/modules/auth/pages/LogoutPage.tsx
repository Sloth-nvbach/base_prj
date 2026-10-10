import { useEffect } from 'react';
import { useLogout } from '../hooks/use-current-user';

/** Signs out (token and cached data) and redirects to the login page. */
export const LogoutPage = () => {
  const logout = useLogout();

  useEffect(() => {
    logout();
  }, [logout]);

  return null;
};
