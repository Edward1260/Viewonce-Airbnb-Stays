import { useEffect } from 'react';

const ROLE_DASHBOARD: Record<string, string> = {
  super_admin: 'platform-master-hub/login.html',
  platform_master_hub: 'platform-master-hub/login.html',
  platform_master: 'platform-master-hub/login.html',
  admin: 'admin-dashboard.html',
  superadmin: 'admin-dashboard.html',
  host: 'host-dashboard-upgraded.html',
  support: 'support-dashboard-upgraded.html',
  customer: 'customer-dashboard.html',
};

export default function Dashboard() {
  useEffect(() => {
    let cancelled = false;
    const redirectByServerRole = async () => {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) {
        window.location.replace(`${import.meta.env.BASE_URL}auth.html`);
        return;
      }

      try {
        const apiBase = (window as any).config?.API_BASE_URL || `${import.meta.env.BASE_URL}api`;
        const response = await fetch(`${apiBase}/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error('Your session could not be verified');
        const user = await response.json();
        if (cancelled) return;

        const role = String(user.role || '').toLowerCase();
        const master = ['platform_master_hub', 'platform_master', 'super_admin'].includes(role);
        if (master) {
          // Never persist an owner token in the shared customer storage.
          sessionStorage.setItem('platformMasterToken', token);
          sessionStorage.setItem('platformMasterUser', JSON.stringify(user));
          sessionStorage.setItem('platformMasterIsLoggedIn', 'true');
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          localStorage.removeItem('isLoggedIn');
          window.location.replace(`${import.meta.env.BASE_URL}platform-master-hub/dashboard.html`);
          return;
        }

        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('isLoggedIn', 'true');
        const destination = ROLE_DASHBOARD[role];
        if (!destination) throw new Error('This account does not have an assigned dashboard');
        window.location.replace(`${import.meta.env.BASE_URL}${destination}`);
      } catch {
        if (cancelled) return;
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        localStorage.removeItem('isLoggedIn');
        window.location.replace(`${import.meta.env.BASE_URL}auth.html`);
      }
    };

    void redirectByServerRole();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-navy-deep">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-white text-lg font-medium">Redirecting to your dashboard…</p>
      </div>
    </div>
  );
}
